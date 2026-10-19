import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {ApiError} from '../contracts/errors.mjs';
import {resourceIdSchema,hashSchema,revisionSchema,MAX_REVISION} from '../contracts/hero.mjs';
import {canonicalJson} from '../contracts/draft.mjs';
import {siteImportLineageSchema,siteReviewStateSchema} from '../contracts/site-draft.mjs';
import {strictSiteObject} from '../contracts/site-settings.mjs';
import {parseSourceCheckRequest,sourceCheckReceiptSchema,sourceCheckCursorSchema,sourceCheckQuerySchema,resolveClaimGroups,resolveSourceEvidence,validateSourceCheckRecord,validateSiteProofRelations,MAX_SOURCE_PAGE_BYTES} from '../contracts/source-checks.mjs';

export const SOURCE_CHECK_OPERATION='POST /api/cms/source-checks';
const timestamp=z.string().datetime().length(24);
const ids=z.array(resourceIdSchema).min(1).max(16).refine(values=>new Set(values).size===values.length);
const auditSchema=strictSiteObject({id:resourceIdSchema,action:z.literal('SITE_SOURCE_CHECKED'),actorUid:resourceIdSchema,snapshotId:resourceIdSchema,contentHash:hashSchema,importLineage:siteImportLineageSchema,fromSourceRevision:revisionSchema,toSourceRevision:revisionSchema,sourceCheckIds:ids,at:timestamp,correlationId:resourceIdSchema,requestHash:hashSchema});
const completedSchema=strictSiteObject({requestHash:hashSchema,state:z.literal('COMPLETED'),statusCode:z.literal(201),response:sourceCheckReceiptSchema,createdAt:timestamp,eventId:resourceIdSchema,importLineage:siteImportLineageSchema});
const same=(a,b)=>canonicalJson(a)===canonicalJson(b);
const compare=(a,b)=>a.claimPath<b.claimPath?-1:a.claimPath>b.claimPath?1:a.id<b.id?-1:a.id>b.id?1:0;
const checked=(schema,value)=>{try{return schema.parse(value);}catch{throw new ApiError('INTERNAL_ERROR');}};
function sourceConflict(){const error=new ApiError('REVISION_CONFLICT');error.siteReason='SOURCE_REVISION_CONFLICT';return error;}
function parseQuery(value){try{return sourceCheckQuerySchema.parse(value);}catch{throw new ApiError('VALIDATION_ERROR');}}
function decodeCursor(value){
 try{if(!/^[A-Za-z0-9_-]+$/.test(value))throw new Error('Encoding');const raw=Buffer.from(value,'base64url');if(raw.toString('base64url')!==value)throw new Error('Encoding');const text=new TextDecoder('utf-8',{fatal:true}).decode(raw),parsed=sourceCheckCursorSchema.parse(JSON.parse(text));if(JSON.stringify(parsed)!==text)throw new Error('Canonical cursor');return parsed;}catch{throw new ApiError('VALIDATION_ERROR');}
}
/** Same-transaction Snapshot/context reads retain immutable import evidence and grant no permission. */
export async function createSourceCheckService(options={}){
 const runtime=options.db && options.authorize?options:await import('./authorization.mjs');
 const db=options.db??runtime.db,authorize=options.authorize??runtime.authorize;
 const {loadTrustedBaseline}=await import('./import-site.mjs');
 const {createSiteSnapshotService}=await import('./site-snapshots.mjs');
 const {loadTrustedCatalog,mutationIdentity,sha256}=await import('./drafts.mjs');
 const baselineProvider=options.baselineProvider??loadTrustedBaseline,catalogProvider=options.catalogProvider??loadTrustedCatalog;
 const snapshots=await createSiteSnapshotService({db,authorize,baselineProvider,catalogProvider});
 const hashCanonical=value=>sha256(canonicalJson(value));
 async function trusted(transaction,id,baseline,catalog){
  const doc=await transaction.get(db.collection('cmsSnapshots').doc(id));
  return snapshots.readTrustedSnapshot({transaction,snapshotDoc:doc,baseline,catalog});
 }
 async function writeSourceChecks({request,actor,body,key,correlationId}){
  const parsed=parseSourceCheckRequest(body),identity=mutationIdentity(actor.uid,SOURCE_CHECK_OPERATION,key,parsed);
  const baseline=await baselineProvider(),catalog=await catalogProvider(),eventId=randomUUID(),at=new Date().toISOString();
  const ordered=[...parsed.checks].sort((a,b)=>a.claimPath<b.claimPath?-1:1),recordIds=ordered.map(()=>randomUUID());
  try{return await db.runTransaction(async transaction=>{
   const currentActor=await authorize(request,'SNAPSHOT_REVIEW',transaction);if(currentActor.uid!==actor.uid)throw new ApiError('FORBIDDEN');
   const {context,response}=await trusted(transaction,parsed.snapshotId,baseline,catalog),{snapshot,reviewState:state}=response;
   if(snapshot.submittedBy===actor.uid)throw new ApiError('SELF_REVIEW_FORBIDDEN');
   if(snapshot.contentHash!==parsed.contentHash)throw new ApiError('SNAPSHOT_HASH_MISMATCH');
   const keyRef=db.collection('cmsIdempotency').doc(identity.id),keyDoc=await transaction.get(keyRef);
   if(keyDoc.exists){
    const completed=checked(completedSchema,keyDoc.data());if(completed.requestHash!==identity.requestHash)throw new ApiError('IDEMPOTENCY_PAYLOAD_MISMATCH');
    const receipt=completed.response,auditDoc=await transaction.get(db.collection('cmsAudit').doc(completed.eventId));if(!auditDoc.exists)throw new ApiError('INTERNAL_ERROR');
    const audit=checked(auditSchema,auditDoc.data()),records=[];
    for(const id of receipt.sourceCheckIds){const doc=await transaction.get(db.collection('cmsSourceChecks').doc(id));if(!doc.exists || doc.data()?.id!==id)throw new ApiError('INTERNAL_ERROR');records.push(validateSourceCheckRecord(doc.data(),{snapshot,context,hashCanonical}));}
    if(receipt.snapshotId!==snapshot.id || receipt.contentHash!==snapshot.contentHash || receipt.sourceRevision!==parsed.expectedSourceRevision+1 || receipt.sourceRevision>state.sourceRevision || !same(audit.sourceCheckIds,receipt.sourceCheckIds) || audit.id!==completed.eventId || audit.actorUid!==actor.uid || audit.snapshotId!==snapshot.id || audit.contentHash!==snapshot.contentHash || audit.fromSourceRevision!==parsed.expectedSourceRevision || audit.toSourceRevision!==receipt.sourceRevision || audit.requestHash!==identity.requestHash || audit.at!==completed.createdAt || !same(audit.importLineage,context.importLineage) || !same(completed.importLineage,context.importLineage) || records.length!==ordered.length)throw new ApiError('INTERNAL_ERROR');
    records.forEach((record,index)=>{const intent=ordered[index];if(record.claimPath!==intent.claimPath || !same(record.evidence,resolveSourceEvidence(intent.evidence,intent.claimPath,context,snapshot)) || record.note!==parsed.note || record.checkedBy!==actor.uid || record.checkedAt!==completed.createdAt || record.eventId!==completed.eventId || record.sourceRevision!==receipt.sourceRevision)throw new ApiError('INTERNAL_ERROR');});
    return receipt;
   }
   if(state.status!=='IN_REVIEW')throw new ApiError('REVIEW_STATE_CONFLICT');
   if(state.revision!==parsed.expectedReviewRevision)throw new ApiError('REVIEW_REVISION_CONFLICT');
   if(state.sourceRevision!==parsed.expectedSourceRevision || state.sourceRevision>=MAX_REVISION)throw sourceConflict();
   const groups=resolveClaimGroups(snapshot,context,hashCanonical);
   const records=ordered.map((intent,index)=>{
    const group=groups.find(group=>group.claimPath===intent.claimPath);if(!group)throw new ApiError('VALIDATION_ERROR');
    const evidence=resolveSourceEvidence(intent.evidence,intent.claimPath,context,snapshot);
    return validateSourceCheckRecord({id:recordIds[index],snapshotId:snapshot.id,contentHash:snapshot.contentHash,schemaVersion:2,templateVersion:snapshot.templateVersion,claimPath:group.claimPath,claimHash:group.claimHash,evidence,verification:'SOURCE_CHECKED',checkedBy:actor.uid,checkedAt:at,sourceRevision:state.sourceRevision+1,eventId,...(parsed.note!==undefined?{note:parsed.note}:{})},{snapshot,context,hashCanonical});
   });
   const active={...state.activeSourceCheckIds};records.forEach(record=>{active[record.claimPath]=record.id;});
   const nextState=siteReviewStateSchema.parse({...state,activeSourceCheckIds:active,sourceRevision:state.sourceRevision+1,updatedAt:at});
   const priorRecords=[];for(const [path,id] of Object.entries(active)){if(records.some(record=>record.id===id))continue;const doc=await transaction.get(db.collection('cmsSourceChecks').doc(id));if(!doc.exists || doc.data()?.id!==id)throw new ApiError('INTERNAL_ERROR');const record=validateSourceCheckRecord(doc.data(),{snapshot,context,hashCanonical});if(record.claimPath!==path)throw new ApiError('INTERNAL_ERROR');priorRecords.push(record);}
   validateSiteProofRelations({snapshot,reviewState:nextState,review:null,sourceChecks:[...priorRecords,...records]},context,hashCanonical);
   const receipt=sourceCheckReceiptSchema.parse({snapshotId:snapshot.id,contentHash:snapshot.contentHash,sourceRevision:nextState.sourceRevision,sourceCheckIds:records.map(record=>record.id)});
   const audit=checked(auditSchema,{id:eventId,action:'SITE_SOURCE_CHECKED',actorUid:actor.uid,snapshotId:snapshot.id,contentHash:snapshot.contentHash,importLineage:context.importLineage,fromSourceRevision:state.sourceRevision,toSourceRevision:nextState.sourceRevision,sourceCheckIds:receipt.sourceCheckIds,at,correlationId,requestHash:identity.requestHash});
   const completed=checked(completedSchema,{requestHash:identity.requestHash,state:'COMPLETED',statusCode:201,response:receipt,createdAt:at,eventId,importLineage:context.importLineage});
   const late=await authorize(request,'SNAPSHOT_REVIEW',transaction);if(late.uid!==actor.uid)throw new ApiError('FORBIDDEN');
   records.forEach(record=>transaction.create(db.collection('cmsSourceChecks').doc(record.id),record));
   transaction.set(db.collection('cmsReviewStates').doc(snapshot.id),nextState);transaction.create(db.collection('cmsAudit').doc(eventId),audit);transaction.create(keyRef,completed);return receipt;
  },{maxAttempts:5});}catch(error){if(error.code===10)throw new ApiError('IDEMPOTENCY_IN_PROGRESS');throw error;}
 }
 async function readSources({request,id,query={}}){
  await authorize(request,'MEMBER_READ');let parsed;try{resourceIdSchema.parse(id);parsed=parseQuery(query);}catch(error){if(error instanceof ApiError)throw error;throw new ApiError('VALIDATION_ERROR');}
  const baseline=await baselineProvider(),catalog=await catalogProvider(),cursor=parsed.cursor?decodeCursor(parsed.cursor):null;
  return db.runTransaction(async transaction=>{
   await authorize(request,'MEMBER_READ',transaction);
   const {context,response}=await trusted(transaction,id,baseline,catalog),{snapshot,reviewState:state}=response;
   const view=state.status==='APPROVED'?'APPROVED':'ACTIVE';
   if(cursor && (cursor.snapshotId!==id || cursor.contentHash!==snapshot.contentHash || cursor.view!==view))throw new ApiError('VALIDATION_ERROR');
   if(cursor && cursor.sourceRevision!==state.sourceRevision)throw sourceConflict();
   // The trusted reader validates terminal pinning once the Review slice exists.
   const checkIds=view==='APPROVED'?response.review.sourceCheckIds:Object.values(state.activeSourceCheckIds);
   const records=[];for(const checkId of checkIds){const doc=await transaction.get(db.collection('cmsSourceChecks').doc(checkId));if(!doc.exists || doc.data()?.id!==checkId)throw new ApiError('INTERNAL_ERROR');records.push(validateSourceCheckRecord(doc.data(),{snapshot,context,hashCanonical}));}
   records.sort(compare);
   if(cursor && !records.some(record=>record.claimPath===cursor.lastClaimPath && record.id===cursor.lastId))throw new ApiError('VALIDATION_ERROR');
   const remaining=cursor?records.filter(record=>compare(record,{claimPath:cursor.lastClaimPath,id:cursor.lastId})>0):records;
   const page={snapshotId:id,contentHash:snapshot.contentHash,view,sourceRevision:state.sourceRevision,checks:[],nextCursor:null},limit=parsed.pageSize??20;
   for(const record of remaining){
    if(page.checks.length>=limit)break;
    const candidate=[...page.checks,record],hasMore=candidate.length<remaining.length;
    const nextCursor=hasMore?Buffer.from(JSON.stringify(sourceCheckCursorSchema.parse({snapshotId:id,contentHash:snapshot.contentHash,view,sourceRevision:state.sourceRevision,lastClaimPath:record.claimPath,lastId:record.id}))).toString('base64url'):null;
    if(Buffer.byteLength(JSON.stringify({...page,checks:candidate,nextCursor}),'utf8')>MAX_SOURCE_PAGE_BYTES)break;
    page.checks=candidate;page.nextCursor=nextCursor;
   }
   if(remaining.length && !page.checks.length)throw new ApiError('INTERNAL_ERROR');return page;
  });
 }
 return {writeSourceChecks,readSources};
}
