import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {ApiError,validationError} from '../contracts/errors.mjs';
import {revisionSchema,resourceIdSchema} from '../contracts/hero.mjs';
import {plainText} from '../contracts/site-settings.mjs';
import {strictMediaV2JsonSchema} from '../contracts/media-v3-metadata-v2.mjs';
import {contentDigestProjectionV2,encodeStoredSnapshotV2,validateSnapshotReadV2,validateQaV2} from '../contracts/media-v3-records-v2.mjs';
import {reviewStateV3Schema,reviewV3Schema,sourceCheckV3Schema} from '../contracts/media-v3-attestations.mjs';
import {mutationIdentity} from './drafts.mjs';
import {createSiteV3ContextService,hashCanonical,sameV3,assertV3Bytes,siteV3Summary} from './site-v3-context.mjs';
const bodySchema=strictMediaV2JsonSchema.pipe(z.strictObject({draftId:z.literal('home-v3'),draftRevision:revisionSchema,message:plainText(500,{multiline:true}).optional()}));
export async function createSiteV3SnapshotService(options={}){
 const trusted=await createSiteV3ContextService(options),{db,authorize}=trusted;
 async function readTrustedSnapshot({transaction,snapshotDoc}){
  const {context,snapshot,claimContext,record}=await trusted.readTrustedSnapshotContext({transaction,snapshotDoc});
  const stateDoc=await transaction.get(db.collection('cmsReviewStatesV3').doc(snapshot.id));if(!stateDoc.exists)throw new ApiError('INTERNAL_ERROR');const state=reviewStateV3Schema.parse(stateDoc.data());
  let review=null;if(state.activeReviewId){const doc=await transaction.get(db.collection('cmsReviewsV3').doc(state.activeReviewId));if(!doc.exists||doc.id!==doc.data()?.id)throw new ApiError('INTERNAL_ERROR');review=reviewV3Schema.parse(doc.data());}
  const ids=[...new Set([...Object.values(state.activeSourceCheckIds),...(review?.sourceCheckIds??[])])];if(ids.length>61)throw new ApiError('INTERNAL_ERROR');const sourceChecks=[];
  for(const id of ids){const doc=await transaction.get(db.collection('cmsSourceChecksV3').doc(id));if(!doc.exists||doc.data()?.id!==id)throw new ApiError('INTERNAL_ERROR');sourceChecks.push(sourceCheckV3Schema.parse(assertV3Bytes(doc.data(),8192)));}
  const sourceAttestations={sourceChecks,claimContext},response=assertV3Bytes(validateSnapshotReadV2({summary:siteV3Summary(snapshot),snapshot,reviewState:state,review,sourceCatalog:context.contentContext.sourceCatalog},{...context,expectedSourceCatalog:context.contentContext.sourceCatalog,sourceAttestations}));
  return {context,response,claimContext,sourceChecks,record};
 }
 async function readSnapshot({request,id}){resourceIdSchema.parse(id);return db.runTransaction(async tx=>{await authorize(request,'MEMBER_READ',tx);return (await readTrustedSnapshot({transaction:tx,snapshotDoc:await tx.get(db.collection('cmsSnapshotsV3').doc(id))})).response;});}
 async function readQa({request,id}){
  resourceIdSchema.parse(id);return db.runTransaction(async tx=>{
   await authorize(request,'MEMBER_READ',tx);const {response,context,claimContext,sourceChecks}=await readTrustedSnapshot({transaction:tx,snapshotDoc:await tx.get(db.collection('cmsSnapshotsV3').doc(id))});
   if(response.reviewState.status!=='APPROVED')throw new ApiError('REVIEW_STATE_CONFLICT');const pinned=sourceChecks.filter(c=>response.review.sourceCheckIds.includes(c.id)),sourceAttestations={sourceChecks:pinned,claimContext};
   const qa=validateQaV2({snapshot:response.snapshot,reviewState:response.reviewState,review:response.review,sourceChecks:pinned},{...context,sourceAttestations});
   const {hashCanonical:omitHash,...dataContext}=context,{hashCanonical:omitClaimHash,...dataClaims}=claimContext;
   const validationContext={...dataContext,sourceAttestations:{sourceChecks:pinned,claimContext:dataClaims}};
   return assertV3Bytes({qaEnvelopeVersion:3,contractRevision:2,qa,validationContext},2097152);
  });
 }
 async function submitSnapshot({request,actor,body,key,correlationId}){
  let parsed;try{parsed=bodySchema.parse(assertV3Bytes(body));}catch(e){throw validationError(e);}const identity=mutationIdentity(actor.uid,'POST /api/cms/media-site/snapshots',key,parsed),id=randomUUID(),eventId=randomUUID(),at=new Date().toISOString();
  return db.runTransaction(async tx=>{
   if((await authorize(request,'SNAPSHOT_SUBMIT',tx)).uid!==actor.uid)throw new ApiError('FORBIDDEN');const keyRef=db.collection('cmsIdempotency').doc(identity.id),prior=await tx.get(keyRef);
   if(prior.exists){const r=assertV3Bytes(prior.data());if(r.requestHash!==identity.requestHash)throw new ApiError('IDEMPOTENCY_PAYLOAD_MISMATCH');const saved=await readTrustedSnapshot({transaction:tx,snapshotDoc:await tx.get(db.collection('cmsSnapshotsV3').doc(r.response.id))}),s=saved.response.snapshot,a=await tx.get(db.collection('cmsAudit').doc(r.eventId));if(s.submittedBy!==actor.uid||s.draftRevision!==parsed.draftRevision||s.message!==parsed.message||!sameV3(saved.response.summary,r.response)||!a.exists||a.data().requestHash!==identity.requestHash||a.data().actorUid!==actor.uid||a.data().snapshotId!==s.id)throw new ApiError('INTERNAL_ERROR');return r.response;}
   const {context:base,current,record}=await trusted.readTrustedDraftContext({transaction:tx,target:await tx.get(db.collection('cmsDrafts').doc('home-v3'))});if(current.revision!==parsed.draftRevision)throw new ApiError('REVISION_CONFLICT');const {safeCatalog,...relations}=await trusted.selection(tx,current.content,record),context={...base,...relations};if(context.expectedMediaVersions.some(v=>v.archived))throw new ApiError('VALIDATION_ERROR');
   const mediaManifest=context.orderedManifest,mediaManifestHash=hashCanonical(mediaManifest),snapshot={id,draftId:'home-v3',draftRevision:current.revision,schemaVersion:3,templateVersion:'m3-site-media-v1',contractRevision:2,content:current.content,mediaManifest,mediaManifestHash,contentHash:hashCanonical(contentDigestProjectionV2(current.content,mediaManifestHash)),submittedBy:actor.uid,submittedAt:at,sourceRefs:context.expectedSourceRefs,importLineage:current.importLineage,...(parsed.message!==undefined?{message:parsed.message}:{})};
   const stored=assertV3Bytes(encodeStoredSnapshotV2(snapshot,context)),receipt=siteV3Summary(snapshot),state=reviewStateV3Schema.parse({snapshotId:id,status:'IN_REVIEW',revision:0,activeReviewId:null,sourceRevision:0,activeSourceCheckIds:{},updatedAt:at});
   if((await authorize(request,'SNAPSHOT_SUBMIT',tx)).uid!==actor.uid)throw new ApiError('FORBIDDEN');tx.create(db.collection('cmsSnapshotsV3').doc(id),stored);tx.create(db.collection('cmsReviewStatesV3').doc(id),state);tx.create(db.collection('cmsAudit').doc(eventId),{id:eventId,action:'SITE_V3_SNAPSHOT_SUBMITTED',actorUid:actor.uid,snapshotId:id,at,correlationId,requestHash:identity.requestHash,contentHash:snapshot.contentHash,mediaManifestHash});tx.create(keyRef,{contractRevision:2,requestHash:identity.requestHash,state:'COMPLETED',response:receipt,eventId});return receipt;
  });
 }
 return {submitSnapshot,readSnapshot,readTrustedSnapshot,readQa};
}
