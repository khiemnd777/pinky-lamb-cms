import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {strictSiteObject} from '../contracts/site-settings.mjs';
import {ApiError,validationError} from '../contracts/errors.mjs';
import {validateContent,revisionSchema,resourceIdSchema,hashSchema,submitMessageSchema,reviewNoteSchema,assertEnvelopeSize} from '../contracts/hero.mjs';
import {canonicalJson,utcTimestampSchema,decodeStoredDraft,encodeStoredContent,decodeStoredContent} from '../contracts/draft.mjs';
import {TEMPLATE_VERSION} from '../preview/hero-renderer.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const referenceSchema=z.string().min(1).max(240).refine(value=>!/[\u0000-\u001f\u007f]/.test(value));
export const mediaEntrySchema=z.strictObject({id:resourceIdSchema,kind:z.enum(['IMAGE','VIDEO','PDF']),legacyPath:z.string().regex(/^assets\/[A-Za-z0-9][A-Za-z0-9._-]*$/),mimeType:z.string().min(1).max(80),sizeBytes:z.number().int().positive(),sha256:hashSchema,width:z.number().int().positive().optional(),height:z.number().int().positive().optional(),durationSeconds:z.number().finite().positive().optional(),rights:z.strictObject({basis:z.literal('CLIENT_SUPPLIED'),evidenceRef:referenceSchema}),sourceRefs:z.array(referenceSchema).min(1).max(20)});
export const mediaManifestSchema=z.array(mediaEntrySchema).min(1).max(6);
export const sourceReferenceSchema=z.strictObject({id:z.string().regex(/^source-[a-f0-9]{64}$/),kind:z.literal('SUPPLIED_FILE'),privateDocumentId:z.string().regex(/^legacy-source-[a-f0-9]{64}$/),claimBindings:z.array(z.unknown()).max(0),verification:z.literal('UNVERIFIED')});
const summaryFields={id:resourceIdSchema,draftRevision:revisionSchema,contentHash:hashSchema,mediaManifestHash:hashSchema,schemaVersion:z.literal(1),templateVersion:z.literal(TEMPLATE_VERSION),submittedBy:resourceIdSchema,submittedAt:utcTimestampSchema};
export const snapshotSummarySchema=z.strictObject(summaryFields);
const fullFields={...summaryFields,mediaManifest:mediaManifestSchema,sourceRefs:z.array(sourceReferenceSchema).min(1).max(120),message:submitMessageSchema.optional()};
export const snapshotSchema=z.strictObject({...fullFields,content:z.unknown()});
export const storedSnapshotSchema=z.strictObject({...fullFields,contentJson:z.string()});
export const reviewStateSchema=z.strictObject({snapshotId:resourceIdSchema,status:z.enum(['IN_REVIEW','APPROVED','CHANGES_REQUESTED']),revision:z.number().int().min(0).max(1),activeReviewId:resourceIdSchema.nullable(),updatedAt:utcTimestampSchema}).refine(value=>value.status==='IN_REVIEW'?value.revision===0 && value.activeReviewId===null:value.revision===1 && value.activeReviewId!==null);
export const reviewSchema=z.strictObject({snapshotId:resourceIdSchema,outcome:z.enum(['APPROVED','CHANGES_REQUESTED']),contentHash:hashSchema,reviewedBy:resourceIdSchema,reviewedAt:utcTimestampSchema,note:reviewNoteSchema.optional()});
export function validateReviewRelation(snapshot,state,data){
 try{assertEnvelopeSize(data);const review=reviewSchema.parse(data);
  if(state.status==='IN_REVIEW' || review.snapshotId!==snapshot.id || review.contentHash!==snapshot.contentHash || review.outcome!==state.status || review.reviewedAt!==state.updatedAt || review.reviewedBy===snapshot.submittedBy)throw new Error();return review;
 }catch{throw new ApiError('INTERNAL_ERROR');}
}
export const submitRequestSchema=z.strictObject({draftRevision:revisionSchema,message:submitMessageSchema.optional()});
const completedSchema=z.strictObject({requestHash:hashSchema,state:z.literal('COMPLETED'),statusCode:z.literal(201),response:snapshotSummarySchema,createdAt:utcTimestampSchema,eventId:resourceIdSchema});

/** Pure projection. Reference identity is not legal/source verification. */
export function projectSourceReferences(manifest){
  mediaManifestSchema.parse(manifest);
  return [...new Set(manifest.flatMap(asset=>asset.sourceRefs))].sort().map(reference=>{const digest=hash(reference);return {id:`source-${digest}`,kind:'SUPPLIED_FILE',privateDocumentId:`legacy-source-${digest}`,claimBindings:[],verification:'UNVERIFIED'};});
}
export function createMediaManifest(content,{catalog}){
  validateContent(content,catalog);
  const ids=new Set([content.hero.image.assetId,content.seo.ogImage.assetId]);
  for(const action of [content.hero.primaryAction,content.hero.secondaryAction].filter(Boolean)){
    if(action.kind==='CREDENTIAL')ids.add(action.assetId);
    if(action.kind==='SHOWREEL'){ids.add('showreel-2025');ids.add('showreel-poster');}
  }
  const manifest=[...ids].sort().map(id=>{
    const asset=catalog.find(asset=>asset.id===id);if(!asset)throw new ApiError('INTERNAL_ERROR');
    const {kind,legacyPath,mimeType,sizeBytes,sha256,rights,sourceRefs}=asset;
    return {id,kind,legacyPath,mimeType,sizeBytes,sha256,rights,sourceRefs,...Object.fromEntries(['width','height','durationSeconds'].filter(key=>asset[key]!==undefined).map(key=>[key,asset[key]]))};
  });
  return mediaManifestSchema.parse(manifest);
}
export function snapshotHashes(content,mediaManifest){
  const mediaManifestHash=hash(canonicalJson(mediaManifest));
  return {mediaManifestHash,contentHash:hash(canonicalJson({content,mediaManifestHash,schemaVersion:1,templateVersion:TEMPLATE_VERSION}))};
}
export function snapshotSummary(snapshot){return snapshotSummarySchema.parse(Object.fromEntries(Object.keys(summaryFields).map(key=>[key,snapshot[key]])));}
/** Importing these pure validators has no Firebase/environment/network side effect. */
export function validateSnapshot(value,{catalog}){
  try{
    assertEnvelopeSize(value);const snapshot=snapshotSchema.parse(value);snapshot.content=validateContent(snapshot.content,catalog);
    const expected=createMediaManifest(snapshot.content,{catalog});
    if(canonicalJson(expected)!==canonicalJson(snapshot.mediaManifest) || canonicalJson(projectSourceReferences(expected))!==canonicalJson(snapshot.sourceRefs))throw new Error('Manifest integrity');
    const hashes=snapshotHashes(snapshot.content,snapshot.mediaManifest);
    if(hashes.contentHash!==snapshot.contentHash || hashes.mediaManifestHash!==snapshot.mediaManifestHash)throw new Error('Snapshot integrity');
    assertEnvelopeSize(snapshot);return snapshot;
  }catch{throw new ApiError('INTERNAL_ERROR');}
}
export function encodeStoredSnapshot(snapshot,{catalog}){
  const validated=validateSnapshot(snapshot,{catalog});const {content,...metadata}=validated;
  const stored={...metadata,contentJson:encodeStoredContent(content,{catalog})};assertEnvelopeSize(stored);return storedSnapshotSchema.parse(stored);
}
export function decodeStoredSnapshot(value,{catalog}){
  try{assertEnvelopeSize(value);const {contentJson,...metadata}=storedSnapshotSchema.parse(value);return validateSnapshot({...metadata,content:decodeStoredContent(contentJson,{catalog})},{catalog});}catch{throw new ApiError('INTERNAL_ERROR');}
}
export function validateReviewState(value,snapshotId){
  try{assertEnvelopeSize(value);const state=reviewStateSchema.parse(value);if(state.snapshotId!==snapshotId)throw new Error('State identity');return state;}catch{throw new ApiError('INTERNAL_ERROR');}
}

export async function createSnapshotService(options={}){
  const runtime=options.db && options.authorize?options:await import('./authorization.mjs');
  const db=options.db??runtime.db,authorize=options.authorize??runtime.authorize;
  const catalogProvider=options.catalogProvider??(async()=>{const {loadTrustedCatalog}=await import('./drafts.mjs');return loadTrustedCatalog();});
  async function readSnapshot({request,id}){
    await authorize(request,'MEMBER_READ');try{resourceIdSchema.parse(id);}catch(error){throw validationError(error);}
    const catalog=await catalogProvider();const snapshotDoc=await db.collection('cmsSnapshots').doc(id).get();if(!snapshotDoc.exists)throw new ApiError('NOT_FOUND');
    if(snapshotDoc.data()?.schemaVersion===2){const {createSiteSnapshotService}=await import('./site-snapshots.mjs');return (await createSiteSnapshotService({...options,db,authorize,catalogProvider})).readSnapshot({request,id});}
    const snapshot=decodeStoredSnapshot(snapshotDoc.data(),{catalog});if(snapshot.id!==id)throw new ApiError('INTERNAL_ERROR');
    const stateDoc=await db.collection('cmsReviewStates').doc(id).get();if(!stateDoc.exists)throw new ApiError('INTERNAL_ERROR');
    const reviewState=validateReviewState(stateDoc.data(),id);if(reviewState.activeReviewId){const reviewDoc=await db.collection('cmsReviews').doc(reviewState.activeReviewId).get();validateReviewRelation(snapshot,reviewState,reviewDoc.data());}
    const response={snapshot,reviewState};assertEnvelopeSize(response);return response;
  }
  async function submitSnapshot({request,actor,body,key,correlationId}){
    let selector;try{selector=strictSiteObject({draftId:z.unknown().optional(),draftRevision:z.unknown(),message:z.unknown().optional()}).parse(body);}catch(error){throw validationError(error);}
    if(Object.hasOwn(body,'draftId')){if(selector.draftId!=='home-v2')throw new ApiError('VALIDATION_ERROR');const {createSiteSnapshotService}=await import('./site-snapshots.mjs');return (await createSiteSnapshotService({...options,db,authorize,catalogProvider})).submitSnapshot({request,actor,body,key,correlationId});}
    let parsed;try{parsed=submitRequestSchema.parse(body);}catch(error){throw validationError(error);}
    const {mutationIdentity}=await import('./drafts.mjs');const identity=mutationIdentity(actor.uid,'POST /api/cms/snapshots',key,parsed);
    const catalog=await catalogProvider();const id=randomUUID(),eventId=randomUUID(),at=new Date().toISOString();
    const draftRef=db.collection('cmsDrafts').doc('home'),keyRef=db.collection('cmsIdempotency').doc(identity.id);
    try{return await db.runTransaction(async transaction=>{
      const currentActor=await authorize(request,'SNAPSHOT_SUBMIT',transaction);if(currentActor.uid!==actor.uid)throw new ApiError('FORBIDDEN');
      const keyDoc=await transaction.get(keyRef);const draftDoc=await transaction.get(draftRef);if(!draftDoc.exists)throw new ApiError('NOT_FOUND');
      const draft=decodeStoredDraft(draftDoc.data(),{catalog});
      if(keyDoc.exists){
        let record;try{record=completedSchema.parse(keyDoc.data());}catch{throw new ApiError('INTERNAL_ERROR');}
        if(record.requestHash!==identity.requestHash)throw new ApiError('IDEMPOTENCY_PAYLOAD_MISMATCH');
        const prior=await transaction.get(db.collection('cmsSnapshots').doc(record.response.id));if(!prior.exists)throw new ApiError('INTERNAL_ERROR');
        const snapshot=decodeStoredSnapshot(prior.data(),{catalog});
        const stateDoc=await transaction.get(db.collection('cmsReviewStates').doc(snapshot.id));
        if(!stateDoc.exists)throw new ApiError('INTERNAL_ERROR');const state=validateReviewState(stateDoc.data(),snapshot.id);
        if(state.activeReviewId){const reviewDoc=await transaction.get(db.collection('cmsReviews').doc(state.activeReviewId));validateReviewRelation(snapshot,state,reviewDoc.data());}
        if(snapshot.submittedBy!==currentActor.uid || snapshot.draftRevision!==parsed.draftRevision || snapshot.message!==parsed.message || record.createdAt!==snapshot.submittedAt || canonicalJson(snapshotSummary(snapshot))!==canonicalJson(record.response))throw new ApiError('INTERNAL_ERROR');return record.response;
      }
      if(draft.revision!==parsed.draftRevision)throw new ApiError('REVISION_CONFLICT');
      const mediaManifest=createMediaManifest(draft.content,{catalog});
      const snapshot={id,draftRevision:draft.revision,...snapshotHashes(draft.content,mediaManifest),schemaVersion:1,templateVersion:TEMPLATE_VERSION,submittedBy:currentActor.uid,submittedAt:at,content:draft.content,mediaManifest,sourceRefs:projectSourceReferences(mediaManifest),...(parsed.message!==undefined?{message:parsed.message}:{})};
      const stored=encodeStoredSnapshot(snapshot,{catalog});const response=snapshotSummary(snapshot);
      transaction.create(db.collection('cmsSnapshots').doc(id),stored);
      transaction.create(db.collection('cmsReviewStates').doc(id),{snapshotId:id,status:'IN_REVIEW',revision:0,activeReviewId:null,updatedAt:at});
      transaction.create(db.collection('cmsAudit').doc(eventId),{id:eventId,action:'SNAPSHOT_SUBMITTED',actorUid:currentActor.uid,resourceId:id,fromRevision:draft.revision,contentHash:snapshot.contentHash,at,correlationId});
      transaction.create(keyRef,{requestHash:identity.requestHash,state:'COMPLETED',statusCode:201,response,createdAt:at,eventId});return response;
    },{maxAttempts:5});}catch(error){if(error.code===10)throw new ApiError('IDEMPOTENCY_IN_PROGRESS');throw error;}
  }
  return {readSnapshot,submitSnapshot};
}
export async function readSnapshot(context){return (await createSnapshotService()).readSnapshot(context);}
export async function submitSnapshot(context){return (await createSnapshotService()).submitSnapshot(context);}
