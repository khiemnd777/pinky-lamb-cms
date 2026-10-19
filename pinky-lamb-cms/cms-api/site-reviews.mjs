import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {ApiError} from '../contracts/errors.mjs';
import {resourceIdSchema,hashSchema,revisionSchema,MAX_BODY_BYTES,assertEnvelopeSize} from '../contracts/hero.mjs';
import {canonicalJson} from '../contracts/draft.mjs';
import {strictSiteObject} from '../contracts/site-settings.mjs';
import {siteReviewSchema,siteReviewStateSchema,siteImportLineageSchema} from '../contracts/site-draft.mjs';
import {siteReviewNoteSchema,selectReviewSourceChecks,validateSiteProofRelations} from '../contracts/source-checks.mjs';

export const SITE_REVIEW_OPERATION='POST /api/cms/reviews home-v2';
export const siteReviewRequestSchema=strictSiteObject({snapshotId:resourceIdSchema,contentHash:hashSchema,expectedReviewRevision:z.literal(0),expectedSourceRevision:revisionSchema,outcome:z.enum(['APPROVED','CHANGES_REQUESTED']),creativeCopyDeclaration:z.enum(['NO_FACTUAL_CLAIMS','SOURCE_CHECKED']).optional(),note:siteReviewNoteSchema.optional()}).superRefine((value,context)=>{
 if(value.outcome==='APPROVED' && value.creativeCopyDeclaration===undefined)context.addIssue({code:'custom',path:['creativeCopyDeclaration']});
 if(value.outcome==='CHANGES_REQUESTED' && value.note===undefined)context.addIssue({code:'custom',path:['note']});
});
export const siteReviewReceiptSchema=strictSiteObject({snapshotId:resourceIdSchema,contentHash:hashSchema,reviewId:resourceIdSchema,status:z.enum(['APPROVED','CHANGES_REQUESTED']),revision:z.literal(1),sourceRevision:revisionSchema,attestationSetHash:hashSchema});
const timestamp=z.string().datetime().length(24);
const auditSchema=strictSiteObject({id:resourceIdSchema,action:z.enum(['SITE_SNAPSHOT_APPROVED','SITE_SNAPSHOT_CHANGES_REQUESTED']),actorUid:resourceIdSchema,snapshotId:resourceIdSchema,reviewId:resourceIdSchema,contentHash:hashSchema,importLineage:siteImportLineageSchema,fromRevision:z.literal(0),toRevision:z.literal(1),sourceRevision:revisionSchema,attestationSetHash:hashSchema,at:timestamp,correlationId:resourceIdSchema,requestHash:hashSchema});
const completedSchema=strictSiteObject({requestHash:hashSchema,state:z.literal('COMPLETED'),statusCode:z.literal(201),response:siteReviewReceiptSchema,createdAt:timestamp,eventId:resourceIdSchema,importLineage:siteImportLineageSchema});
const same=(a,b)=>canonicalJson(a)===canonicalJson(b);
function checked(schema,value){try{assertEnvelopeSize(value);return schema.parse(value);}catch{throw new ApiError('INTERNAL_ERROR');}}
function sourceConflict(){const error=new ApiError('REVISION_CONFLICT');error.siteReason='SOURCE_REVISION_CONFLICT';return error;}
export function parseSiteReviewRequest(value){
 try{
  const plain=strictSiteObject({snapshotId:z.unknown(),contentHash:z.unknown(),expectedReviewRevision:z.unknown(),expectedSourceRevision:z.unknown(),outcome:z.unknown(),creativeCopyDeclaration:z.unknown().optional(),note:z.unknown().optional()}).parse(value);
  if(Buffer.byteLength(JSON.stringify(plain),'utf8')>MAX_BODY_BYTES)throw new ApiError('PAYLOAD_TOO_LARGE');
  return siteReviewRequestSchema.parse(plain);
 }catch(error){
  if(error instanceof ApiError)throw error;
  const safe=new ApiError('VALIDATION_ERROR');safe.siteValidationPaths=[...new Set((error.issues??[]).map(issue=>issue.path.join('.')).filter(path=>path.length>0 && path.length<=240 && path.split('.').length<=12))].slice(0,32);throw safe;
 }
}
/** SDK and pinned private providers are loaded only by the runtime factory. */
export async function createSiteReviewService(options={}){
 const runtime=options.db && options.authorize?options:await import('./authorization.mjs');
 const db=options.db??runtime.db,authorize=options.authorize??runtime.authorize;
 const {loadTrustedBaseline}=await import('./import-site.mjs');
 const {loadTrustedCatalog,mutationIdentity,sha256}=await import('./drafts.mjs');
 const {createSiteSnapshotService}=await import('./site-snapshots.mjs');
 const baselineProvider=options.baselineProvider??loadTrustedBaseline,catalogProvider=options.catalogProvider??loadTrustedCatalog;
 const snapshots=await createSiteSnapshotService({db,authorize,baselineProvider,catalogProvider});
 const hashCanonical=value=>sha256(canonicalJson(value));
 async function submitReview({request,actor,body,key,correlationId}){
  const parsed=parseSiteReviewRequest(body),identity=mutationIdentity(actor.uid,SITE_REVIEW_OPERATION,key,parsed);
  const baseline=await baselineProvider(),catalog=await catalogProvider(),reviewId=randomUUID(),eventId=randomUUID(),at=new Date().toISOString();
  try{return await db.runTransaction(async transaction=>{
   const currentActor=await authorize(request,'SNAPSHOT_REVIEW',transaction);if(currentActor.uid!==actor.uid)throw new ApiError('FORBIDDEN');
   const snapshotDoc=await transaction.get(db.collection('cmsSnapshots').doc(parsed.snapshotId));
   const {context,response}=await snapshots.readTrustedSnapshot({transaction,snapshotDoc,baseline,catalog});
   const {snapshot,reviewState:state}=response;
   if(snapshot.submittedBy===actor.uid)throw new ApiError('SELF_REVIEW_FORBIDDEN');
   if(snapshot.contentHash!==parsed.contentHash)throw new ApiError('SNAPSHOT_HASH_MISMATCH');
   const keyRef=db.collection('cmsIdempotency').doc(identity.id),keyDoc=await transaction.get(keyRef);
   if(keyDoc.exists){
    const completed=checked(completedSchema,keyDoc.data());if(completed.requestHash!==identity.requestHash)throw new ApiError('IDEMPOTENCY_PAYLOAD_MISMATCH');
    const saved=response.review,receipt=completed.response;
    const auditDoc=await transaction.get(db.collection('cmsAudit').doc(completed.eventId));if(!auditDoc.exists)throw new ApiError('INTERNAL_ERROR');
    const audit=checked(auditSchema,auditDoc.data());
    if(!saved || saved.id!==receipt.reviewId || saved.reviewedBy!==actor.uid || saved.outcome!==parsed.outcome || saved.note!==parsed.note || saved.creativeCopyDeclaration!==parsed.creativeCopyDeclaration || saved.sourceRevision!==parsed.expectedSourceRevision || saved.reviewedAt!==completed.createdAt || receipt.snapshotId!==snapshot.id || receipt.contentHash!==snapshot.contentHash || receipt.status!==saved.outcome || receipt.sourceRevision!==saved.sourceRevision || receipt.attestationSetHash!==saved.attestationSetHash || audit.id!==completed.eventId || audit.actorUid!==actor.uid || audit.snapshotId!==snapshot.id || audit.reviewId!==saved.id || audit.action!==(saved.outcome==='APPROVED'?'SITE_SNAPSHOT_APPROVED':'SITE_SNAPSHOT_CHANGES_REQUESTED') || audit.contentHash!==snapshot.contentHash || audit.sourceRevision!==saved.sourceRevision || audit.attestationSetHash!==saved.attestationSetHash || audit.at!==completed.createdAt || audit.requestHash!==identity.requestHash || !same(audit.importLineage,context.importLineage) || !same(completed.importLineage,context.importLineage))throw new ApiError('INTERNAL_ERROR');
    return receipt;
   }
   if(state.status!=='IN_REVIEW')throw new ApiError('REVIEW_STATE_CONFLICT');
   if(state.revision!==parsed.expectedReviewRevision)throw new ApiError('REVIEW_REVISION_CONFLICT');
   if(state.sourceRevision!==parsed.expectedSourceRevision)throw sourceConflict();
   const sourceChecks=[];
   for(const id of Object.values(state.activeSourceCheckIds)){
    const doc=await transaction.get(db.collection('cmsSourceChecks').doc(id));if(!doc.exists || doc.data()?.id!==id)throw new ApiError('INTERNAL_ERROR');sourceChecks.push(doc.data());
   }
   const selected=parsed.outcome==='CHANGES_REQUESTED'?[]:selectReviewSourceChecks({snapshot,reviewState:state,sourceChecks,creativeCopyDeclaration:parsed.creativeCopyDeclaration},context,hashCanonical);
   const attestationSetHash=hashCanonical(selected);
   const review=checked(siteReviewSchema,{id:reviewId,snapshotId:snapshot.id,outcome:parsed.outcome,contentHash:snapshot.contentHash,reviewedBy:actor.uid,reviewedAt:at,sourceRevision:state.sourceRevision,sourceCheckIds:selected.map(record=>record.id).sort(),attestationSetHash,...(parsed.note!==undefined?{note:parsed.note}:{}),...(parsed.creativeCopyDeclaration!==undefined?{creativeCopyDeclaration:parsed.creativeCopyDeclaration}:{})});
   const nextState=checked(siteReviewStateSchema,{...state,status:parsed.outcome,revision:1,activeReviewId:reviewId,updatedAt:at});
   validateSiteProofRelations({snapshot,reviewState:nextState,review,sourceChecks},context,hashCanonical);
   const receipt=checked(siteReviewReceiptSchema,{snapshotId:snapshot.id,contentHash:snapshot.contentHash,reviewId,status:parsed.outcome,revision:1,sourceRevision:state.sourceRevision,attestationSetHash});
   const audit=checked(auditSchema,{id:eventId,action:parsed.outcome==='APPROVED'?'SITE_SNAPSHOT_APPROVED':'SITE_SNAPSHOT_CHANGES_REQUESTED',actorUid:actor.uid,snapshotId:snapshot.id,reviewId,contentHash:snapshot.contentHash,importLineage:context.importLineage,fromRevision:0,toRevision:1,sourceRevision:state.sourceRevision,attestationSetHash,at,correlationId,requestHash:identity.requestHash});
   const completed=checked(completedSchema,{requestHash:identity.requestHash,state:'COMPLETED',statusCode:201,response:receipt,createdAt:at,eventId,importLineage:context.importLineage});
   const late=await authorize(request,'SNAPSHOT_REVIEW',transaction);if(late.uid!==actor.uid)throw new ApiError('FORBIDDEN');
   transaction.create(db.collection('cmsReviews').doc(reviewId),review);transaction.set(db.collection('cmsReviewStates').doc(snapshot.id),nextState);transaction.create(db.collection('cmsAudit').doc(eventId),audit);transaction.create(keyRef,completed);return receipt;
  },{maxAttempts:5});}catch(error){if(error.code===10)throw new ApiError('IDEMPOTENCY_IN_PROGRESS');throw error;}
 }
 return {submitReview};
}
export async function submitReview(context){return (await createSiteReviewService()).submitReview(context);}
