import {randomUUID} from 'node:crypto';
import {readFileSync,lstatSync,realpathSync} from 'node:fs';
import path from 'node:path';
import {z} from 'zod';
import {ROOT} from '../scripts/local-guard.mjs';
import {validateCmsServerRuntime} from '../scripts/local-data-guard.mjs';
import {strictSiteObject} from '../contracts/site-settings.mjs';
import {ApiError} from '../contracts/errors.mjs';
import {revisionSchema,hashSchema,resourceIdSchema,assertEnvelopeSize} from '../contracts/hero.mjs';
import {canonicalJson,decodeStoredDraft,decodeStoredContent} from '../contracts/draft.mjs';
import {validateSiteContent,SITE_TEMPLATE_VERSION} from '../contracts/site.mjs';
import {siteSourceCatalogSchema,encodeSiteStoredDraft,decodeSiteStoredDraft,createSiteDraftSchemas} from '../contracts/site-draft.mjs';
import {loadBaselineInputs,mapBaselineSite} from '../scripts/map-baseline-site.mjs';
import {snapshotHashes,createMediaManifest} from './snapshots.mjs';
import {mutationIdentity,sha256,loadTrustedCatalog,projectCatalog} from './drafts.mjs';

export const IMPORT_OPERATION='POST /api/cms/drafts/home-v2/import';
const atSchema=z.string().datetime().length(24);
export const importReceiptSchema=z.strictObject({draftId:z.literal('home-v2'),revision:z.literal(0),importId:resourceIdSchema,importedM1Revision:revisionSchema,importedM1ContentHash:hashSchema,baselineManifestHash:hashSchema,importReportHash:hashSchema});
const bodySchema=strictSiteObject({expectedM1Revision:revisionSchema,baselineManifestHash:hashSchema});
const completedSchema=z.strictObject({requestHash:hashSchema,state:z.literal('COMPLETED'),statusCode:z.literal(201),response:importReceiptSchema,createdAt:atSchema,eventId:resourceIdSchema});
const importRecordSchema=z.strictObject({id:resourceIdSchema,receipt:importReceiptSchema,originalM1ContentJson:z.string(),initialDraft:z.unknown(),sourceCatalog:siteSourceCatalogSchema,reportHash:hashSchema,baselineContentHash:hashSchema,createdBy:resourceIdSchema,createdAt:atSchema,eventId:resourceIdSchema});
const reportRecordSchema=z.strictObject({id:resourceIdSchema,reportHash:hashSchema,reportJson:z.string(),baselineManifestHash:hashSchema});
const sourceRecordSchema=z.strictObject({summary:z.unknown(),baselineManifestHash:hashSchema,importReportHash:hashSchema,verification:z.literal('UNVERIFIED')});
const auditSchema=z.strictObject({id:resourceIdSchema,action:z.literal('SITE_IMPORTED'),actorUid:resourceIdSchema,resourceId:z.literal('home-v2'),importId:resourceIdSchema,fromRevision:revisionSchema,toRevision:z.literal(0),at:atSchema,correlationId:resourceIdSchema});
const same=(a,b)=>canonicalJson(a)===canonicalJson(b);
const internal=()=>{throw new ApiError('INTERNAL_ERROR');};
const digest=value=>sha256(canonicalJson(value));
export function parseImportRequest(value){
 try{return bodySchema.parse(value);}catch(error){
  const safe=new ApiError('VALIDATION_ERROR');
  safe.siteValidationPaths=[...new Set((error.issues??[]).map(issue=>issue.path.join('.')).filter(field=>['expectedM1Revision','baselineManifestHash'].includes(field)))].slice(0,32);
  throw safe;
 }
}
/** Rebuild from pinned inputs, then compare both generated private artifacts. */
export function loadTrustedBaseline(){
 validateCmsServerRuntime();
 try{
  const result=mapBaselineSite(loadBaselineInputs());
  for(const [filename,value] of [['baseline-site.json',result.content],['baseline-provenance.json',result.provenance]]){
   const absolute=path.join(ROOT,'contracts',filename);
   if(lstatSync(absolute).isSymbolicLink() || realpathSync(absolute)!==absolute || !lstatSync(absolute).isFile() || !same(JSON.parse(readFileSync(absolute,'utf8')),value))internal();
  }
  return result;
 }catch{internal();}
}
export function importedContext(baseline,lineage,catalog=baseline.context.catalog){return {...baseline.context,catalog,importLineage:lineage,currentYear:new Date().getUTCFullYear()};}
function lineageOf(receipt){const {importId,importedM1Revision,importedM1ContentHash,baselineManifestHash,importReportHash}=receipt;return {importId,importedM1Revision,importedM1ContentHash,baselineManifestHash,importReportHash};}
function sourceRecord(summary,receipt){return {summary,baselineManifestHash:receipt.baselineManifestHash,importReportHash:receipt.importReportHash,verification:'UNVERIFIED'};}
function checked(schema,value){try{assertEnvelopeSize(value);return schema.parse(value);}catch{internal();}}

export async function createSiteImportService(options={}){
 const runtime=options.db && options.authorize?options:await import('./authorization.mjs');
 const db=options.db??runtime.db,authorize=options.authorize??runtime.authorize;
 const baselineProvider=options.baselineProvider??loadTrustedBaseline,catalogProvider=options.catalogProvider??loadTrustedCatalog;
 async function evidence(transaction,record,baseline,catalog,target){
  const receipt=record.receipt,context=importedContext(baseline,lineageOf(receipt),catalog);
  const reportId=`report-${receipt.importReportHash}`;
  const reportDoc=await transaction.get(db.collection('cmsSiteImports').doc(reportId));
  const sources=[];for(const summary of baseline.provenance.sourceCatalog)sources.push(await transaction.get(db.collection('cmsSiteSources').doc(summary.id)));
  const auditDoc=await transaction.get(db.collection('cmsAudit').doc(record.eventId));
  if(!reportDoc.exists || !auditDoc.exists || sources.some(doc=>!doc.exists))internal();
  const report=checked(reportRecordSchema,reportDoc.data()),audit=checked(auditSchema,auditDoc.data());
  const original=decodeStoredContent(record.originalM1ContentJson,{catalog});
  const originalHash=snapshotHashes(original,createMediaManifest(original,{catalog})).contentHash;
  const initial=decodeSiteStoredDraft(record.initialDraft,context),current=decodeSiteStoredDraft(target.data(),context);
  const expectedContent=validateSiteContent({...baseline.content,hero:original.hero,seo:original.seo},context);
  if(record.id!==receipt.importId || record.reportHash!==receipt.importReportHash || record.baselineContentHash!==baseline.provenance.baselineContentHash || receipt.baselineManifestHash!==baseline.provenance.baselineManifestHash || receipt.importReportHash!==baseline.provenance.reportHash || originalHash!==receipt.importedM1ContentHash || !same(record.sourceCatalog,baseline.provenance.sourceCatalog) || initial.revision!==0 || initial.updatedBy!==record.createdBy || initial.updatedAt!==record.createdAt || initial.lastEventId!==record.eventId || !same(initial.content,expectedContent) || !same(initial.importLineage,current.importLineage) || report.id!==reportId || report.reportHash!==receipt.importReportHash || report.baselineManifestHash!==receipt.baselineManifestHash || digest(JSON.parse(report.reportJson))!==receipt.importReportHash || !same(JSON.parse(report.reportJson),baseline.report) || audit.id!==record.eventId || audit.importId!==record.id || audit.actorUid!==record.createdBy || audit.at!==record.createdAt || audit.fromRevision!==receipt.importedM1Revision)internal();
  sources.forEach((doc,index)=>{const source=checked(sourceRecordSchema,doc.data());if(!same(source,sourceRecord(baseline.provenance.sourceCatalog[index],receipt)))internal();});
  return {context,current};
 }
 /** Internal transaction reader. Mutation callers must authorize in this same
  * transaction before calling; this helper grants no actor permission. */
 async function readTrustedContext({transaction,target,baseline,catalog}){
  if(!target.exists)throw new ApiError('NOT_FOUND');
  const id=target.data()?.importLineage?.importId;try{resourceIdSchema.parse(id);}catch{internal();}
  const importDoc=await transaction.get(db.collection('cmsSiteImports').doc(id));if(!importDoc.exists)internal();
  const record=checked(importRecordSchema,importDoc.data());return evidence(transaction,record,baseline,catalog,target);
 }
 async function importSite({request,actor,body,key,correlationId}){
  const parsed=parseImportRequest(body),baseline=await baselineProvider(),catalog=await catalogProvider();
  if(parsed.baselineManifestHash!==baseline.provenance.baselineManifestHash)throw new ApiError('REVISION_CONFLICT');
  const identity=mutationIdentity(actor.uid,IMPORT_OPERATION,key,parsed),importId=randomUUID(),eventId=randomUUID(),at=new Date().toISOString();
  const draftRef=db.collection('cmsDrafts').doc('home-v2'),keyRef=db.collection('cmsIdempotency').doc(identity.id),reportRef=db.collection('cmsSiteImports').doc(`report-${baseline.provenance.reportHash}`);
  try{return await db.runTransaction(async transaction=>{
   const currentActor=await authorize(request,'SITE_IMPORT',transaction);if(currentActor.uid!==actor.uid)throw new ApiError('FORBIDDEN');
   const keyDoc=await transaction.get(keyRef),target=await transaction.get(draftRef),m1Doc=await transaction.get(db.collection('cmsDrafts').doc('home'));
   if(keyDoc.exists){
    const completed=checked(completedSchema,keyDoc.data());if(completed.requestHash!==identity.requestHash)throw new ApiError('IDEMPOTENCY_PAYLOAD_MISMATCH');
    const importDoc=await transaction.get(db.collection('cmsSiteImports').doc(completed.response.importId));if(!importDoc.exists || !target.exists)internal();
    const record=checked(importRecordSchema,importDoc.data());await evidence(transaction,record,baseline,catalog,target);
    if(!same(record.receipt,completed.response) || record.createdBy!==actor.uid || record.eventId!==completed.eventId || record.createdAt!==completed.createdAt || record.receipt.importedM1Revision!==parsed.expectedM1Revision)internal();
    return completed.response;
   }
   if(target.exists){
    await readTrustedContext({transaction,target,baseline,catalog});
    const error=new ApiError('REVISION_CONFLICT');error.siteReason='ALREADY_INITIALIZED';throw error;
   }
   if(!m1Doc.exists)throw new ApiError('NOT_FOUND');
   const m1=decodeStoredDraft(m1Doc.data(),{catalog});if(m1.revision!==parsed.expectedM1Revision)throw new ApiError('REVISION_CONFLICT');
   const receipt=importReceiptSchema.parse({draftId:'home-v2',revision:0,importId,importedM1Revision:m1.revision,importedM1ContentHash:snapshotHashes(m1.content,createMediaManifest(m1.content,{catalog})).contentHash,baselineManifestHash:baseline.provenance.baselineManifestHash,importReportHash:baseline.provenance.reportHash});
   const context=importedContext(baseline,lineageOf(receipt),catalog),content=validateSiteContent({...baseline.content,hero:m1.content.hero,seo:m1.content.seo},context);
   const initialDraft=encodeSiteStoredDraft({draftId:'home-v2',schemaVersion:2,templateVersion:SITE_TEMPLATE_VERSION,content,revision:0,updatedBy:actor.uid,updatedAt:at,lastEventId:eventId,importLineage:context.importLineage},context);
   const existingReport=await transaction.get(reportRef),sources=[];
   for(const summary of baseline.provenance.sourceCatalog)sources.push(await transaction.get(db.collection('cmsSiteSources').doc(summary.id)));
   const report={id:reportRef.id,reportHash:receipt.importReportHash,reportJson:JSON.stringify(baseline.report),baselineManifestHash:receipt.baselineManifestHash};
   if(existingReport.exists && !same(checked(reportRecordSchema,existingReport.data()),report))internal();
   sources.forEach((doc,index)=>{if(doc.exists && !same(checked(sourceRecordSchema,doc.data()),sourceRecord(baseline.provenance.sourceCatalog[index],receipt)))internal();});
   const record={id:importId,receipt,originalM1ContentJson:JSON.stringify(m1.content),initialDraft,sourceCatalog:baseline.provenance.sourceCatalog,reportHash:receipt.importReportHash,baselineContentHash:baseline.provenance.baselineContentHash,createdBy:actor.uid,createdAt:at,eventId};
   checked(importRecordSchema,record);assertEnvelopeSize(report);
   const lateActor=await authorize(request,'SITE_IMPORT',transaction);if(lateActor.uid!==actor.uid)throw new ApiError('FORBIDDEN');
   transaction.create(draftRef,initialDraft);transaction.create(db.collection('cmsSiteImports').doc(importId),record);
   if(!existingReport.exists)transaction.create(reportRef,report);
   sources.forEach((doc,index)=>{if(!doc.exists)transaction.create(db.collection('cmsSiteSources').doc(baseline.provenance.sourceCatalog[index].id),sourceRecord(baseline.provenance.sourceCatalog[index],receipt));});
   transaction.create(db.collection('cmsAudit').doc(eventId),{id:eventId,action:'SITE_IMPORTED',actorUid:actor.uid,resourceId:'home-v2',importId,fromRevision:m1.revision,toRevision:0,at,correlationId});
   transaction.create(keyRef,{requestHash:identity.requestHash,state:'COMPLETED',statusCode:201,response:receipt,createdAt:at,eventId});
   return receipt;
  },{maxAttempts:5});}catch(error){if(error.code===10)throw new ApiError('IDEMPOTENCY_IN_PROGRESS');throw error;}
 }
 async function readSiteDraft({request}){
  await authorize(request,'MEMBER_READ');const baseline=await baselineProvider(),catalog=await catalogProvider();
  return db.runTransaction(async transaction=>{
   const target=await transaction.get(db.collection('cmsDrafts').doc('home-v2'));if(!target.exists)throw new ApiError('NOT_FOUND');
   const {context,current}=await readTrustedContext({transaction,target,baseline,catalog});
   const result={...current,catalog:projectCatalog(catalog),sourceCatalog:context.sourceCatalog};assertEnvelopeSize(result);return createSiteDraftSchemas(context).draftReadSchema.parse(result);
  });
 }
 return {importSite,readSiteDraft,readTrustedContext};
}
