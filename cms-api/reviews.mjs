import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {ApiError,validationError} from '../contracts/errors.mjs';
import {resourceIdSchema,hashSchema,revisionSchema,reviewNoteSchema,assertEnvelopeSize} from '../contracts/hero.mjs';
import {canonicalJson,utcTimestampSchema} from '../contracts/draft.mjs';
import {decodeStoredSnapshot,validateReviewState,reviewSchema,validateReviewRelation} from './snapshots.mjs';
import {strictSiteObject} from '../contracts/site-settings.mjs';
import {TEMPLATE_VERSION} from '../preview/hero-renderer.mjs';
import {SITE_TEMPLATE_VERSION} from '../contracts/site.mjs';
export const reviewRequestSchema=z.strictObject({snapshotId:resourceIdSchema,contentHash:hashSchema,expectedReviewRevision:revisionSchema,outcome:z.enum(['APPROVED','CHANGES_REQUESTED']),note:reviewNoteSchema.optional()});
export {reviewSchema} from './snapshots.mjs';
const completedSchema=z.strictObject({requestHash:hashSchema,state:z.literal('COMPLETED'),statusCode:z.literal(201),response:reviewSchema,createdAt:utcTimestampSchema,eventId:resourceIdSchema});
export async function createReviewService(options={}){
  const runtime=options.db && options.authorize?options:await import('./authorization.mjs');
  const db=options.db??runtime.db,authorize=options.authorize??runtime.authorize;
  const catalogProvider=options.catalogProvider??(async()=>{const {loadTrustedCatalog}=await import('./drafts.mjs');return loadTrustedCatalog();});
  async function submitReview({request,actor,body,key,correlationId}){
    const authorized=await authorize(request,'SNAPSHOT_REVIEW');if(authorized.uid!==actor.uid)throw new ApiError('FORBIDDEN');
    let selectedId;
    try{
      const plain=strictSiteObject({snapshotId:z.unknown(),contentHash:z.unknown(),expectedReviewRevision:z.unknown(),outcome:z.unknown(),note:z.unknown().optional(),expectedSourceRevision:z.unknown().optional(),creativeCopyDeclaration:z.unknown().optional()}).parse(body);
      selectedId=resourceIdSchema.parse(plain.snapshotId);
    }catch(error){throw validationError(error);}
    const descriptor=await db.runTransaction(async transaction=>{
      await authorize(request,'SNAPSHOT_REVIEW',transaction);
      const doc=await transaction.get(db.collection('cmsSnapshots').doc(selectedId));if(!doc.exists)throw new ApiError('NOT_FOUND');
      const value=doc.data();return {schemaVersion:value.schemaVersion,templateVersion:value.templateVersion};
    });
    if(descriptor.schemaVersion===2 && descriptor.templateVersion===SITE_TEMPLATE_VERSION){
      const {createSiteReviewService}=await import('./site-reviews.mjs');
      return (await createSiteReviewService({...options,db,authorize,catalogProvider})).submitReview({request,actor,body,key,correlationId});
    }
    if(descriptor.schemaVersion!==1 || descriptor.templateVersion!==TEMPLATE_VERSION)throw new ApiError('INTERNAL_ERROR');
    let parsed;try{parsed=reviewRequestSchema.parse(body);}catch(error){throw validationError(error);}
    const {mutationIdentity}=await import('./drafts.mjs');const identity=mutationIdentity(actor.uid,'POST /api/cms/reviews',key,parsed);
    const catalog=await catalogProvider();const reviewId=randomUUID(),eventId=randomUUID(),at=new Date().toISOString();
    const snapshotRef=db.collection('cmsSnapshots').doc(parsed.snapshotId),stateRef=db.collection('cmsReviewStates').doc(parsed.snapshotId),keyRef=db.collection('cmsIdempotency').doc(identity.id);
    try{return await db.runTransaction(async transaction=>{
      const currentActor=await authorize(request,'SNAPSHOT_REVIEW',transaction);if(currentActor.uid!==actor.uid)throw new ApiError('FORBIDDEN');
      const keyDoc=await transaction.get(keyRef),snapshotDoc=await transaction.get(snapshotRef),stateDoc=await transaction.get(stateRef);
      if(!snapshotDoc.exists)throw new ApiError('NOT_FOUND');if(!stateDoc.exists)throw new ApiError('INTERNAL_ERROR');
      const snapshot=decodeStoredSnapshot(snapshotDoc.data(),{catalog});if(snapshot.id!==parsed.snapshotId)throw new ApiError('INTERNAL_ERROR');
      const state=validateReviewState(stateDoc.data(),snapshot.id);
      if(state.activeReviewId){const terminal=await transaction.get(db.collection('cmsReviews').doc(state.activeReviewId));validateReviewRelation(snapshot,state,terminal.data());}
      // Resource-specific denial applies to both outcomes and completed-key replay.
      if(currentActor.uid===snapshot.submittedBy)throw new ApiError('SELF_REVIEW_FORBIDDEN');
      if(keyDoc.exists){
        let record;try{record=completedSchema.parse(keyDoc.data());}catch{throw new ApiError('INTERNAL_ERROR');}
        if(record.requestHash!==identity.requestHash)throw new ApiError('IDEMPOTENCY_PAYLOAD_MISMATCH');
        if(state.activeReviewId===null)throw new ApiError('INTERNAL_ERROR');const reviewDoc=await transaction.get(db.collection('cmsReviews').doc(state.activeReviewId));
        const saved=validateReviewRelation(snapshot,state,reviewDoc.data());
        if(parsed.expectedReviewRevision!==0 || saved.outcome!==parsed.outcome || saved.note!==parsed.note || saved.contentHash!==parsed.contentHash || record.createdAt!==saved.reviewedAt || saved.reviewedBy!==currentActor.uid || saved.snapshotId!==snapshot.id || saved.contentHash!==snapshot.contentHash || state.status!==saved.outcome || canonicalJson(saved)!==canonicalJson(record.response))throw new ApiError('INTERNAL_ERROR');return record.response;
      }
      if(parsed.contentHash!==snapshot.contentHash)throw new ApiError('SNAPSHOT_HASH_MISMATCH');
      if(parsed.expectedReviewRevision!==state.revision)throw new ApiError('REVIEW_REVISION_CONFLICT');
      if(state.status!=='IN_REVIEW')throw new ApiError('REVIEW_STATE_CONFLICT');
      const response={snapshotId:snapshot.id,outcome:parsed.outcome,contentHash:snapshot.contentHash,reviewedBy:currentActor.uid,reviewedAt:at,...(parsed.note!==undefined?{note:parsed.note}:{})};assertEnvelopeSize(response);
      transaction.create(db.collection('cmsReviews').doc(reviewId),response);
      transaction.set(stateRef,{snapshotId:snapshot.id,status:parsed.outcome,revision:state.revision+1,activeReviewId:reviewId,updatedAt:at});
      transaction.create(db.collection('cmsAudit').doc(eventId),{id:eventId,action:parsed.outcome==='APPROVED'?'SNAPSHOT_APPROVED':'SNAPSHOT_CHANGES_REQUESTED',actorUid:currentActor.uid,resourceId:snapshot.id,fromRevision:state.revision,toRevision:state.revision+1,contentHash:snapshot.contentHash,at,correlationId});
      transaction.create(keyRef,{requestHash:identity.requestHash,state:'COMPLETED',statusCode:201,response,createdAt:at,eventId});return response;
    },{maxAttempts:5});}catch(error){if(error.code===10)throw new ApiError('IDEMPOTENCY_IN_PROGRESS');throw error;}
  }
  return {submitReview};
}
export async function submitReview(context){return (await createReviewService()).submitReview(context);}
