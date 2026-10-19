import {createHash} from 'node:crypto';
import {ApiError} from '../contracts/errors.mjs';
import {canonicalJson} from '../contracts/draft.mjs';
import {strictMediaV2JsonSchema} from '../contracts/media-v3-metadata-v2.mjs';
import {v2ImportLineageSchema,decodeStoredDraftV2,decodeStoredSnapshotV2,safeCatalogV2Schema} from '../contracts/media-v3-records-v2.mjs';
import {projectClaimGroupsV3,parseMediaV3Content} from '../contracts/media-v3-content.mjs';
import {createSiteImportService,loadTrustedBaseline} from './import-site.mjs';
import {loadTrustedCatalog} from './drafts.mjs';
import {projectSiteSourceReferences} from './site-snapshots.mjs';
import {transactionValue} from './transaction-context.mjs';

export const hashCanonical=value=>createHash('sha256').update(canonicalJson(value)).digest('hex');
export const sameV3=(a,b)=>canonicalJson(a)===canonicalJson(b);
export function assertV3Bytes(value,limit=262144){strictMediaV2JsonSchema.parse(value);if(Buffer.byteLength(JSON.stringify(value),'utf8')>limit)throw new ApiError('PAYLOAD_TOO_LARGE');return value;}
export function selectedSiteV3AssetIds(content){const ids=new Set(['brand-diagonal','favicon']);function walk(value){if(!value||typeof value!=='object')return;if(Object.hasOwn(value,'assetId'))ids.add(value.assetId);Object.values(value).forEach(walk);}walk(content);return [...ids].sort();}
export function siteV3Summary(snapshot){return Object.fromEntries(['id','draftId','draftRevision','contentHash','mediaManifestHash','schemaVersion','templateVersion','contractRevision','submittedBy','submittedAt'].map(key=>[key,snapshot[key]]));}
export async function createSiteV3ContextService(options={}){
 const runtime=options.db&&options.authorize?options:await import('./authorization.mjs');
 const db=options.db??runtime.db,authorize=options.authorize??runtime.authorize;
 const baselineProvider=options.baselineProvider??loadTrustedBaseline,catalogProvider=options.catalogProvider??loadTrustedCatalog;
 if(typeof options.mediaProvider?.resolveSelection!=='function')throw new ApiError('INTERNAL_ERROR');
 const importer=await createSiteImportService({db,authorize,baselineProvider,catalogProvider});
 async function currentM2(transaction){const baseline=await baselineProvider(),catalog=await catalogProvider(),target=await transaction.get(db.collection('cmsDrafts').doc('home-v2'));return {...await importer.readTrustedContext({transaction,target,baseline,catalog}),baseline,catalog};}
 function contentContext(record){return {sourceCatalog:record.sourceCatalog,currentYear:new Date().getUTCFullYear(),...(record.allowedShowreelSourceUrl!==undefined?{allowedShowreelSourceUrl:record.allowedShowreelSourceUrl}:{})};}
 async function loadImport(transaction,lineage){
  return transactionValue(transaction,'site-import:'+hashCanonical(lineage),async()=>{
  const expectedImport=v2ImportLineageSchema.parse(lineage),doc=await transaction.get(db.collection('cmsSiteV3Imports').doc(expectedImport.importId));
  if(!doc.exists)throw new ApiError('INTERNAL_ERROR');const record=assertV3Bytes(doc.data(),1048576);
  if(record.contractRevision!==2||record.id!==doc.id||!sameV3(record.lineage,expectedImport)||hashCanonical(record.report)!==expectedImport.importReportHash||hashCanonical(record.sourceRefs)!==expectedImport.sourceRefsHash||Object.keys(record.report).some(key=>!sameV3(record.report[key],expectedImport[key])))throw new ApiError('INTERNAL_ERROR');
  const context={contentContext:contentContext(record),expectedImport,hashCanonical};
  const initial=decodeStoredDraftV2(record.initialDraft,context);
  if(initial.revision!==0||initial.updatedBy!==record.createdBy||initial.updatedAt!==record.createdAt||initial.lastEventId!==record.eventId)throw new ApiError('INTERNAL_ERROR');
  // Historical raw copies must agree; never repair divergent evidence silently.
  if(Object.hasOwn(record,'baselineContent')){
   try{parseMediaV3Content(record.baselineContent,context.contentContext);if(!sameV3(initial.content,record.baselineContent))throw new Error('Baseline mismatch');}
   catch{throw new ApiError('INTERNAL_ERROR');}
  }
  const audit=await transaction.get(db.collection('cmsAudit').doc(record.eventId));
  if(!audit.exists||audit.data()?.action!=='SITE_V3_IMPORTED'||audit.data()?.actorUid!==record.createdBy||audit.data()?.importId!==record.id||audit.data()?.at!==record.createdAt)throw new ApiError('INTERNAL_ERROR');
  return {record:{...record,baselineContent:initial.content},context};
  });
 }
 async function selection(transaction,content,record,pinnedManifest,existingAssetIds){
  const result=await options.mediaProvider.resolveSelection({transaction,content,legacyCatalog:record.legacyCatalog,...(pinnedManifest?{pinnedManifest}:{}),...(existingAssetIds?{existingAssetIds}:{})});
  strictMediaV2JsonSchema.parse(result);safeCatalogV2Schema.parse(result.safeCatalog);
  const selectedAssetIds=selectedSiteV3AssetIds(content);
  if(!Array.isArray(result.orderedManifest)||!Array.isArray(result.expectedMediaVersions))throw new ApiError('INTERNAL_ERROR');
  const expectedSourceRefs=projectSiteSourceReferences(result.orderedManifest.filter(entry=>entry.source==='LEGACY').map(entry=>entry.asset));
  return {selectedAssetIds,orderedManifest:result.orderedManifest,expectedMediaVersions:result.expectedMediaVersions,expectedSourceRefs,safeCatalog:result.safeCatalog};
 }
 async function readTrustedDraftContext({transaction,target}){
  return transactionValue(transaction,'site-draft:'+target.data()?.revision,async()=>{
  if(!target.exists)throw new ApiError('DRAFT_NOT_INITIALIZED');const {record,context}=await loadImport(transaction,target.data()?.importLineage);
  const current=decodeStoredDraftV2(assertV3Bytes(target.data()),context);if(current.draftId!=='home-v3')throw new ApiError('INTERNAL_ERROR');
  return {context,current,record};
  });
 }
 async function readTrustedSnapshotContext({transaction,snapshotDoc}){
  if(!snapshotDoc.exists)throw new ApiError('NOT_FOUND');const stored=assertV3Bytes(snapshotDoc.data()),{record,context:base}=await loadImport(transaction,stored.importLineage);
  let content;try{content=JSON.parse(stored.contentJson);}catch{throw new ApiError('INTERNAL_ERROR');}
  const resolved=await selection(transaction,content,record,stored.mediaManifest),relations={...resolved};delete relations.safeCatalog;
  const context={...base,...relations},snapshot=decodeStoredSnapshotV2(stored,context);if(snapshot.id!==snapshotDoc.id)throw new ApiError('INTERNAL_ERROR');
  const claimContext={snapshot:Object.fromEntries(['id','contentHash','schemaVersion','templateVersion','submittedBy','submittedAt'].map(key=>[key,snapshot[key]])),currentClaimGroups:projectClaimGroupsV3(snapshot.content),baselineClaimGroups:projectClaimGroupsV3(record.baselineContent),claimSources:snapshot.content.claimSources,sourceCatalog:base.contentContext.sourceCatalog,hashCanonical};
  return {context,snapshot,record,claimContext};
 }
 return {db,authorize,currentM2,selection,readTrustedDraftContext,readTrustedSnapshotContext};
}
