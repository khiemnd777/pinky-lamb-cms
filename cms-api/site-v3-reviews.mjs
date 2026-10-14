import {randomUUID} from 'node:crypto';
import {ApiError} from '../contracts/errors.mjs';
import {parseSiteReviewRequest} from './site-reviews.mjs';
import {reviewV3Schema,reviewStateV3Schema,attestationDigestProjection,validateSourceAttestationsV3} from '../contracts/media-v3-attestations.mjs';
import {mutationIdentity} from './drafts.mjs';
import {createSiteV3ContextService,hashCanonical,sameV3,assertV3Bytes} from './site-v3-context.mjs';
import {createSiteV3SnapshotService} from './site-v3-snapshots.mjs';
export async function createSiteV3ReviewService(options={}){
 const {db,authorize}=await createSiteV3ContextService(options),snapshots=await createSiteV3SnapshotService(options);
 async function submitReview({request,actor,body,key,correlationId}){
  const parsed=parseSiteReviewRequest(body),identity=mutationIdentity(actor.uid,'POST /api/cms/media-site/reviews',key,parsed),reviewId=randomUUID(),eventId=randomUUID(),at=new Date().toISOString();
  return db.runTransaction(async tx=>{
   if((await authorize(request,'SNAPSHOT_REVIEW',tx)).uid!==actor.uid)throw new ApiError('FORBIDDEN');const result=await snapshots.readTrustedSnapshot({transaction:tx,snapshotDoc:await tx.get(db.collection('cmsSnapshotsV3').doc(parsed.snapshotId))}),{snapshot,reviewState:state}=result.response;
   if(snapshot.submittedBy===actor.uid)throw new ApiError('SELF_REVIEW_FORBIDDEN');if(snapshot.contentHash!==parsed.contentHash)throw new ApiError('SNAPSHOT_HASH_MISMATCH');const keyRef=db.collection('cmsIdempotency').doc(identity.id),prior=await tx.get(keyRef);
   if(prior.exists){const r=assertV3Bytes(prior.data());if(r.requestHash!==identity.requestHash)throw new ApiError('IDEMPOTENCY_PAYLOAD_MISMATCH');const saved=result.response.review,audit=await tx.get(db.collection('cmsAudit').doc(r.eventId));if(!saved||saved.id!==r.response.reviewId||saved.reviewedBy!==actor.uid||saved.outcome!==parsed.outcome||saved.note!==parsed.note||saved.creativeCopyDeclaration!==parsed.creativeCopyDeclaration||saved.sourceRevision!==parsed.expectedSourceRevision||!audit.exists||audit.data().actorUid!==actor.uid||audit.data().requestHash!==identity.requestHash||!sameV3(audit.data().receipt,r.response))throw new ApiError('INTERNAL_ERROR');return r.response;}
   if(state.status!=='IN_REVIEW')throw new ApiError('REVIEW_STATE_CONFLICT');if(state.revision!==parsed.expectedReviewRevision)throw new ApiError('REVIEW_REVISION_CONFLICT');if(state.sourceRevision!==parsed.expectedSourceRevision)throw new ApiError('REVISION_CONFLICT');
   const baseline=new Map(result.claimContext.baselineClaimGroups.map(g=>[g.claimPath,g.value]));
   const required=parsed.outcome==='CHANGES_REQUESTED'?[]:result.claimContext.currentClaimGroups.filter(g=>g.claimPath==='creative-copy'?parsed.creativeCopyDeclaration==='SOURCE_CHECKED':!baseline.has(g.claimPath)||!sameV3(baseline.get(g.claimPath),g.value));
   const selected=required.map(g=>{const id=state.activeSourceCheckIds[g.claimPath],record=result.sourceChecks.find(r=>r.id===id&&r.claimPath===g.claimPath);if(!record)throw new ApiError('VALIDATION_ERROR');return record;});
   const attestationSetHash=hashCanonical(attestationDigestProjection(selected)),review=reviewV3Schema.parse({id:reviewId,snapshotId:snapshot.id,outcome:parsed.outcome,contentHash:snapshot.contentHash,reviewedBy:actor.uid,reviewedAt:at,sourceRevision:state.sourceRevision,sourceCheckIds:selected.map(r=>r.id).sort(),attestationSetHash,...(parsed.note!==undefined?{note:parsed.note}:{}),...(parsed.creativeCopyDeclaration!==undefined?{creativeCopyDeclaration:parsed.creativeCopyDeclaration}:{})}),next=reviewStateV3Schema.parse({...state,status:parsed.outcome,revision:1,activeReviewId:reviewId,updatedAt:at});
   validateSourceAttestationsV3({reviewState:next,review,sourceChecks:result.sourceChecks},result.claimContext,{proofView:'ALL'});const receipt={snapshotId:snapshot.id,contentHash:snapshot.contentHash,reviewId,status:parsed.outcome,revision:1,sourceRevision:state.sourceRevision,attestationSetHash};
   if((await authorize(request,'SNAPSHOT_REVIEW',tx)).uid!==actor.uid)throw new ApiError('FORBIDDEN');tx.create(db.collection('cmsReviewsV3').doc(reviewId),assertV3Bytes(review));tx.set(db.collection('cmsReviewStatesV3').doc(snapshot.id),next);tx.create(db.collection('cmsAudit').doc(eventId),{id:eventId,action:parsed.outcome==='APPROVED'?'SITE_V3_SNAPSHOT_APPROVED':'SITE_V3_SNAPSHOT_CHANGES_REQUESTED',actorUid:actor.uid,at,correlationId,requestHash:identity.requestHash,receipt});tx.create(keyRef,{contractRevision:2,requestHash:identity.requestHash,state:'COMPLETED',response:receipt,eventId});return receipt;
  });
 }
 return {submitReview};
}
