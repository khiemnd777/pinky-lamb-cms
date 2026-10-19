import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {ApiError,validationError} from '../contracts/errors.mjs';
import {resourceIdSchema,hashSchema,revisionSchema,assertEnvelopeSize,MAX_BODY_BYTES} from '../contracts/hero.mjs';
import {canonicalJson} from '../contracts/draft.mjs';
import {strictSiteObject,plainText} from '../contracts/site-settings.mjs';
import {SITE_SCHEMA_VERSION,SITE_TEMPLATE_VERSION} from '../contracts/site.mjs';
import {createSiteDraftSchemas,createSiteMediaManifest,siteMediaManifestSchema,siteSnapshotSummarySchema,siteImportLineageSchema,siteReviewStateSchema,siteReviewSchema,assertSiteBudget,encodeSiteStoredContent,decodeSiteStoredContent} from '../contracts/site-draft.mjs';

export {createSiteMediaManifest};
export const SITE_SUBMIT_OPERATION='POST /api/cms/snapshots home-v2';
const sha=value=>createHash('sha256').update(value).digest('hex');
const same=(a,b)=>canonicalJson(a)===canonicalJson(b);
const timestamp=z.string().datetime().length(24);
function wellFormedMessage(value){
 for(let index=0;index<value.length;index++){
  const unit=value.charCodeAt(index);
  if(unit>=0xd800 && unit<=0xdbff){const next=value.charCodeAt(++index);if(!(next>=0xdc00 && next<=0xdfff))return false;}
  else if(unit>=0xdc00 && unit<=0xdfff)return false;
 }
 return true;
}
// Firestore scalar metadata must preserve the exact submission intent.
const messageSchema=plainText(500,{multiline:true}).refine(wellFormedMessage);
export const siteSubmitRequestSchema=strictSiteObject({draftId:z.literal('home-v2'),draftRevision:revisionSchema,message:messageSchema.optional()});
const completedSchema=z.strictObject({requestHash:hashSchema,state:z.literal('COMPLETED'),statusCode:z.literal(201),response:siteSnapshotSummarySchema,createdAt:timestamp,eventId:resourceIdSchema});
const auditSchema=z.strictObject({id:resourceIdSchema,action:z.literal('SITE_SNAPSHOT_SUBMITTED'),actorUid:resourceIdSchema,resourceId:resourceIdSchema,draftId:z.literal('home-v2'),fromRevision:revisionSchema,contentHash:hashSchema,mediaManifestHash:hashSchema,importLineage:siteImportLineageSchema,at:timestamp,correlationId:resourceIdSchema,requestHash:hashSchema});
function checked(schema,value){try{assertEnvelopeSize(value);return schema.parse(value);}catch{throw new ApiError('INTERNAL_ERROR');}}
export function siteSnapshotHashes(content,mediaManifest){
 const mediaManifestHash=sha(canonicalJson(mediaManifest));
 return {mediaManifestHash,contentHash:sha(canonicalJson({content,mediaManifestHash,schemaVersion:SITE_SCHEMA_VERSION,templateVersion:SITE_TEMPLATE_VERSION}))};
}
/** Raw-reference string identity is lineage only, never evidence verification. */
export function projectSiteSourceReferences(manifest){
 siteMediaManifestSchema.parse(manifest);
 return [...new Set(manifest.flatMap(asset=>asset.sourceRefs))].sort().map(reference=>{const digest=sha(reference);return {id:`source-${digest}`,kind:'SUPPLIED_FILE',privateDocumentId:`legacy-source-${digest}`,claimBindings:[],verification:'UNVERIFIED'};});
}
export function siteSnapshotSummary(snapshot){return siteSnapshotSummarySchema.parse(Object.fromEntries(['id','draftId','draftRevision','contentHash','mediaManifestHash','schemaVersion','templateVersion','submittedBy','submittedAt'].map(key=>[key,snapshot[key]])));}
export function validateSiteSnapshot(value,context){
 try{
  assertEnvelopeSize(value);const snapshot=createSiteDraftSchemas(context).snapshotSchema.parse(value);
  if(snapshot.message!==undefined)messageSchema.parse(snapshot.message);
  const manifest=createSiteMediaManifest(snapshot.content,context),hashes=siteSnapshotHashes(snapshot.content,manifest);
  if(!same(snapshot.importLineage,context.importLineage) || !same(snapshot.mediaManifest,manifest) || !same(snapshot.sourceRefs,projectSiteSourceReferences(manifest)) || hashes.contentHash!==snapshot.contentHash || hashes.mediaManifestHash!==snapshot.mediaManifestHash)throw new Error('Snapshot relation');
  assertSiteBudget(snapshot.content,context);return snapshot;
 }catch{throw new ApiError('INTERNAL_ERROR');}
}
export function encodeStoredSiteSnapshot(value,context){
 const snapshot=validateSiteSnapshot(value,context),{content,...metadata}=snapshot;
 const stored={...metadata,contentJson:encodeSiteStoredContent(content,context)};
 assertEnvelopeSize(stored);return createSiteDraftSchemas(context).storedSnapshotSchema.parse(stored);
}
export function decodeStoredSiteSnapshot(value,context){
 try{assertEnvelopeSize(value);const {contentJson,...metadata}=createSiteDraftSchemas(context).storedSnapshotSchema.parse(value);return validateSiteSnapshot({...metadata,content:decodeSiteStoredContent(contentJson,context)},context);}catch{throw new ApiError('INTERNAL_ERROR');}
}
/** Future source/review services supply the pure relation validator after
 * loading immutable proof records. Unknown proof states fail closed meanwhile. */
export function validateSiteSnapshotRead(value,context,{validateSiteProofRelations,sourceChecks=[]}={}){
 try{
  assertEnvelopeSize(value);const response=createSiteDraftSchemas(context).snapshotReadSchema.parse(value);
  validateSiteSnapshot(response.snapshot,context);
  if(!same(response.sourceCatalog,context.sourceCatalog))throw new Error('Source projection');
  const state=response.reviewState;
  if(typeof validateSiteProofRelations==='function'){
   if(validateSiteProofRelations({snapshot:response.snapshot,reviewState:state,review:response.review,sourceChecks},context,value=>sha(canonicalJson(value)))!==true)throw new Error('Proof relation');
  }else if(state.status!=='IN_REVIEW' || state.revision!==0 || state.sourceRevision!==0 || Object.keys(state.activeSourceCheckIds).length || state.updatedAt!==response.snapshot.submittedAt || response.review!==null)throw new Error('Unresolved proof relation');
  return response;
 }catch{throw new ApiError('INTERNAL_ERROR');}
}

/** All runtime SDK/private-file dependencies are deferred to this factory. */
export async function createSiteSnapshotService(options={}){
 const runtime=options.db && options.authorize?options:await import('./authorization.mjs');
 const db=options.db??runtime.db,authorize=options.authorize??runtime.authorize;
 const {createSiteImportService,loadTrustedBaseline}=await import('./import-site.mjs');
 const {loadTrustedCatalog,mutationIdentity}=await import('./drafts.mjs');
 const baselineProvider=options.baselineProvider??loadTrustedBaseline,catalogProvider=options.catalogProvider??loadTrustedCatalog;
 const importer=await createSiteImportService({db,authorize,baselineProvider,catalogProvider});
 async function snapshotContext(transaction,lineage,baseline,catalog){
  const parsed=checked(siteImportLineageSchema,lineage);
  const importDoc=await transaction.get(db.collection('cmsSiteImports').doc(parsed.importId));if(!importDoc.exists)throw new ApiError('INTERNAL_ERROR');
  const initialDraft=importDoc.data()?.initialDraft;
  const {context}=await importer.readTrustedContext({transaction,target:{exists:true,data:()=>initialDraft},baseline,catalog});
  if(!same(context.importLineage,parsed))throw new ApiError('INTERNAL_ERROR');return {...context,baselineContent:baseline.content};
 }
 async function readSiteRelations(transaction,snapshot,stateData,context){
  const state=checked(siteReviewStateSchema,stateData);
  const initial=state.status==='IN_REVIEW' && state.revision===0 && state.sourceRevision===0 && Object.keys(state.activeSourceCheckIds).length===0;
  const response={summary:siteSnapshotSummary(snapshot),snapshot,reviewState:state,review:null,sourceCatalog:context.sourceCatalog};
  if(initial)return validateSiteSnapshotRead(response,context);
  let review=null;
  if(state.activeReviewId){
   const doc=await transaction.get(db.collection('cmsReviews').doc(state.activeReviewId));if(!doc.exists)throw new ApiError('INTERNAL_ERROR');
   review=checked(siteReviewSchema,doc.data());if(review.id!==state.activeReviewId)throw new ApiError('INTERNAL_ERROR');
  }
  const ids=[...new Set([...Object.values(state.activeSourceCheckIds),...(review?.sourceCheckIds??[])])];if(ids.length>61)throw new ApiError('INTERNAL_ERROR');
  const sourceChecks=[];
  for(const id of ids){
   const doc=await transaction.get(db.collection('cmsSourceChecks').doc(id));if(!doc.exists || doc.data()?.id!==id || Buffer.byteLength(JSON.stringify(doc.data()))>8192)throw new ApiError('INTERNAL_ERROR');
   sourceChecks.push(doc.data());
  }
  const module=await import('../contracts/source-checks.mjs').catch(()=>{throw new ApiError('INTERNAL_ERROR');});
  if(typeof module.validateSiteProofRelations!=='function')throw new ApiError('INTERNAL_ERROR');
  return validateSiteSnapshotRead({...response,review},context,{validateSiteProofRelations:module.validateSiteProofRelations,sourceChecks});
 }
 async function readSaved(transaction,doc,baseline,catalog){
  if(!doc.exists)throw new ApiError('NOT_FOUND');
  const context=await snapshotContext(transaction,doc.data()?.importLineage,baseline,catalog);
  const snapshot=decodeStoredSiteSnapshot(doc.data(),context);
  if(snapshot.id!==doc.id)throw new ApiError('INTERNAL_ERROR');
  const stateDoc=await transaction.get(db.collection('cmsReviewStates').doc(snapshot.id));if(!stateDoc.exists)throw new ApiError('INTERNAL_ERROR');
  return {context,response:await readSiteRelations(transaction,snapshot,stateDoc.data(),context)};
 }
 async function readSnapshot({request,id}){
  await authorize(request,'MEMBER_READ');try{resourceIdSchema.parse(id);}catch(error){throw validationError(error);}
  const baseline=await baselineProvider(),catalog=await catalogProvider();
  return db.runTransaction(async transaction=>{
   const doc=await transaction.get(db.collection('cmsSnapshots').doc(id)),{response}=await readSaved(transaction,doc,baseline,catalog);
   if(response.snapshot.id!==id)throw new ApiError('INTERNAL_ERROR');return response;
  });
 }
 async function submitSnapshot({request,actor,body,key,correlationId}){
  let parsed;try{parsed=siteSubmitRequestSchema.parse(body);if(Buffer.byteLength(JSON.stringify(parsed))>MAX_BODY_BYTES)throw new ApiError('PAYLOAD_TOO_LARGE');}catch(error){throw validationError(error);}
  const identity=mutationIdentity(actor.uid,SITE_SUBMIT_OPERATION,key,parsed),baseline=await baselineProvider(),catalog=await catalogProvider();
  const id=randomUUID(),eventId=randomUUID(),at=new Date().toISOString(),keyRef=db.collection('cmsIdempotency').doc(identity.id);
  try{return await db.runTransaction(async transaction=>{
   const currentActor=await authorize(request,'SNAPSHOT_SUBMIT',transaction);if(currentActor.uid!==actor.uid)throw new ApiError('FORBIDDEN');
   const keyDoc=await transaction.get(keyRef);
   if(keyDoc.exists){
    const record=checked(completedSchema,keyDoc.data());if(record.requestHash!==identity.requestHash)throw new ApiError('IDEMPOTENCY_PAYLOAD_MISMATCH');
    const prior=await transaction.get(db.collection('cmsSnapshots').doc(record.response.id));if(!prior.exists)throw new ApiError('INTERNAL_ERROR');
    const {response}=await readSaved(transaction,prior,baseline,catalog),snapshot=response.snapshot;
    const auditDoc=await transaction.get(db.collection('cmsAudit').doc(record.eventId));if(!auditDoc.exists)throw new ApiError('INTERNAL_ERROR');
    const audit=checked(auditSchema,auditDoc.data());
    if(snapshot.submittedBy!==actor.uid || snapshot.draftRevision!==parsed.draftRevision || snapshot.message!==parsed.message || !same(response.summary,record.response) || snapshot.submittedAt!==record.createdAt || audit.id!==record.eventId || audit.resourceId!==snapshot.id || audit.actorUid!==actor.uid || audit.fromRevision!==snapshot.draftRevision || audit.at!==snapshot.submittedAt || audit.contentHash!==snapshot.contentHash || audit.mediaManifestHash!==snapshot.mediaManifestHash || audit.requestHash!==identity.requestHash || !same(audit.importLineage,snapshot.importLineage))throw new ApiError('INTERNAL_ERROR');
    return record.response;
   }
   const draftDoc=await transaction.get(db.collection('cmsDrafts').doc('home-v2'));
   const {context,current}=await importer.readTrustedContext({transaction,target:draftDoc,baseline,catalog});
   if(current.revision!==parsed.draftRevision)throw new ApiError('REVISION_CONFLICT');
   const mediaManifest=createSiteMediaManifest(current.content,context);
   const snapshot={id,draftId:'home-v2',draftRevision:current.revision,...siteSnapshotHashes(current.content,mediaManifest),schemaVersion:SITE_SCHEMA_VERSION,templateVersion:SITE_TEMPLATE_VERSION,submittedBy:actor.uid,submittedAt:at,content:current.content,mediaManifest,sourceRefs:projectSiteSourceReferences(mediaManifest),importLineage:context.importLineage,...(parsed.message!==undefined?{message:parsed.message}:{})};
   const stored=encodeStoredSiteSnapshot(snapshot,context),response=siteSnapshotSummary(snapshot);
   const state={snapshotId:id,status:'IN_REVIEW',revision:0,activeReviewId:null,sourceRevision:0,activeSourceCheckIds:{},updatedAt:at};
   validateSiteSnapshotRead({summary:response,snapshot,reviewState:state,review:null,sourceCatalog:context.sourceCatalog},context);
   const audit={id:eventId,action:'SITE_SNAPSHOT_SUBMITTED',actorUid:actor.uid,resourceId:id,draftId:'home-v2',fromRevision:current.revision,contentHash:snapshot.contentHash,mediaManifestHash:snapshot.mediaManifestHash,importLineage:context.importLineage,at,correlationId,requestHash:identity.requestHash};checked(auditSchema,audit);
   const lateActor=await authorize(request,'SNAPSHOT_SUBMIT',transaction);if(lateActor.uid!==actor.uid)throw new ApiError('FORBIDDEN');
   transaction.create(db.collection('cmsSnapshots').doc(id),stored);transaction.create(db.collection('cmsReviewStates').doc(id),state);transaction.create(db.collection('cmsAudit').doc(eventId),audit);
   transaction.create(keyRef,{requestHash:identity.requestHash,state:'COMPLETED',statusCode:201,response,createdAt:at,eventId});return response;
  },{maxAttempts:5});}catch(error){if(error.code===10)throw new ApiError('IDEMPOTENCY_IN_PROGRESS');throw error;}
 }
 // Internal composition only: callers authorize in the same transaction and supply trusted providers.
 async function readTrustedSnapshot({transaction,snapshotDoc,baseline,catalog}){
  return readSaved(transaction,snapshotDoc,baseline,catalog);
 }
 return {readSnapshot,submitSnapshot,readTrustedSnapshot};
}
export async function readSnapshot(context){return (await createSiteSnapshotService()).readSnapshot(context);}
export async function submitSnapshot(context){return (await createSiteSnapshotService()).submitSnapshot(context);}
