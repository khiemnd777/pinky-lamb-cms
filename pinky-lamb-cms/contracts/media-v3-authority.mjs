import {z} from 'zod';
import {ApiError} from './errors.mjs';
import {resourceIdSchema,hashSchema,revisionSchema,idempotencyKeySchema} from './hero.mjs';
import {plainText} from './site-settings.mjs';
import {canonicalJson} from './draft.mjs';
import {strictMediaV3JsonSchema,mediaMetadataSchema,uploadActorsSchema,rightsReferenceAllowlistSchema,hashMediaMetadata,metadataDigestProjection,evidenceDigestProjection} from './media-v3-metadata.mjs';
import {r0ToolSetManifestSchema,processingRecipeSchema,validateToolSetManifest,validateProcessingRecipe} from './media-v3-toolset.mjs';
import {readyVersionSchema,mediaBindingSchema,bindingFromReadyVersion,safeMetadataFromReadyVersion,V3_MEDIA_LIMITS} from './media-v3-contract.mjs';
import {validateMediaRightsProof} from './media-rights.mjs';

const exact=shape=>strictMediaV3JsonSchema.pipe(z.strictObject(shape));
const kind=z.enum(['IMAGE','PDF','VIDEO']);
const asset=z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);
const integer=max=>z.number().int().min(0).max(max);
const positive=max=>integer(max).min(1);
const time=integer(Number.MAX_SAFE_INTEGER-86400000);
const generation=z.string().regex(/^[1-9][0-9]{0,127}$/);
const attempt=z.union([z.literal(1),z.literal(2)]);
const same=(a,b)=>canonicalJson(a)===canonicalJson(b);
const requireRelation=value=>{if(!value)throw new ApiError('INTERNAL_ERROR');};
const sha=(hash,value)=>hashSchema.parse(hash(value));
const timestamp=z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/).refine(value=>{
  const ms=Date.parse(value);return Number.isFinite(ms) && new Date(ms).toISOString()===value;
});

export const attemptTupleSchema=exact({jobId:resourceIdSchema,intentId:resourceIdSchema,assetId:asset,kind,attempt,leaseEpoch:revisionSchema.refine(value=>value>0),workerId:resourceIdSchema});
export const frozenInputSchema=exact({assetId:asset,kind,originalSha256:hashSchema,inputBytes:positive(128*1024**2),processingRecipeSha256:hashSchema,toolSetSha256:hashSchema,evidenceSha256:hashSchema}).refine(value=>value.inputBytes<=V3_MEDIA_LIMITS[value.kind].inputBytes);
export const storageFactSchema=exact({verification:z.literal('MEDIA_STORAGE_FULL_NORMALIZED_SET'),tuple:attemptTupleSchema,binding:mediaBindingSchema,metadataDigest:hashSchema,originalGeneration:generation,generationBoundDerivativeSetSha256:hashSchema,manifestReceiptId:resourceIdSchema});
export const cacheFactSchema=exact({verification:z.literal('MEDIA_CACHE_VERIFIED'),tuple:attemptTupleSchema,binding:mediaBindingSchema,metadataDigest:hashSchema,manifestReceiptId:resourceIdSchema,inspectionId:resourceIdSchema});
export const quiescenceFactSchema=exact({verification:z.literal('LOCAL_ATTEMPT_QUIESCENT'),tuple:attemptTupleSchema,proofId:resourceIdSchema});
export const readyFactSchema=exact({verification:z.literal('MEDIA_READY_ATTEMPT'),tuple:attemptTupleSchema,binding:mediaBindingSchema,metadataDigest:hashSchema,storage:storageFactSchema,cache:cacheFactSchema,quiescence:quiescenceFactSchema,proofId:resourceIdSchema}).refine(value=>value.tuple.assetId===value.binding.assetId && value.tuple.kind===value.binding.kind && same(value.tuple,value.storage.tuple) && same(value.tuple,value.cache.tuple) && same(value.tuple,value.quiescence.tuple) && same(value.binding,value.storage.binding) && same(value.binding,value.cache.binding) && value.metadataDigest===value.storage.metadataDigest && value.metadataDigest===value.cache.metadataDigest && value.storage.manifestReceiptId===value.cache.manifestReceiptId && value.storage.generationBoundDerivativeSetSha256===value.binding.derivativeSetSha256);
export const mediaRightsProofV3Schema=exact({id:resourceIdSchema,verification:z.literal('MEDIA_RIGHTS_CHECK'),binding:mediaBindingSchema,uploaderUid:resourceIdSchema,rightsEvidenceSubmittedBy:resourceIdSchema,checkedBy:resourceIdSchema,decision:z.enum(['APPROVED','REJECTED']),checkedAt:timestamp,rightsRevision:z.literal(1),eventId:resourceIdSchema,note:plainText(1000,{multiline:true}).optional(),proofDigest:hashSchema});
export const authorityEnvelopeSchema=exact({readyVersion:readyVersionSchema,actors:uploadActorsSchema,metadata:mediaMetadataSchema,readyFact:readyFactSchema});

const partBytes=4*1024**2;
const mimeByKind={IMAGE:['image/jpeg','image/png','image/webp'],PDF:['application/pdf'],VIDEO:['video/mp4']};
const uploadCoreSchema=exact({requestId:idempotencyKeySchema,kind,declaredMime:z.string(),inputBytes:positive(128*1024**2)}).refine(value=>value.inputBytes<=V3_MEDIA_LIMITS[value.kind].inputBytes && mimeByKind[value.kind].includes(value.declaredMime));
const partSchema=exact({index:integer(31),offsetBytes:integer(128*1024**2),sizeBytes:positive(partBytes),sha256:hashSchema});
const intentSchema=exact({intentId:resourceIdSchema,assetId:asset,actors:uploadActorsSchema,core:uploadCoreSchema,metadataBinding:exact({metadataDigest:hashSchema}),state:z.enum(['UPLOADING','QUEUED','CANCELLED']),revision:revisionSchema,createdAtMs:time,expiresAtMs:time,parts:z.array(partSchema).max(32)}).refine(value=>{
  const count=Math.ceil(value.core.inputBytes/partBytes);
  return value.expiresAtMs-value.createdAtMs===86400000 && new Set(value.parts.map(part=>part.index)).size===value.parts.length && value.parts.every(part=>part.index<count && part.offsetBytes===part.index*partBytes && part.sizeBytes===Math.min(partBytes,value.core.inputBytes-part.offsetBytes)) && (value.state!=='QUEUED' || value.parts.length===count);
});
const queueIdentitySchema=exact({actorUid:resourceIdSchema,operation:z.literal('UPLOAD_COMPLETE'),resourceId:asset,requestId:idempotencyKeySchema});
const queueRequestSchema=exact({expectedIntentRevision:revisionSchema,input:frozenInputSchema,metadataDigest:hashSchema});
const queueResponseSchema=exact({jobId:resourceIdSchema,intentId:resourceIdSchema,assetId:asset,state:z.literal('QUEUED'),jobRevision:z.literal(0)});
const queueRecordSchema=exact({identity:queueIdentitySchema,requestHash:hashSchema,request:queueRequestSchema,response:queueResponseSchema});
const retryResponseSchema=exact({assetId:asset,intentId:resourceIdSchema,requestId:idempotencyKeySchema,revision:revisionSchema,operation:z.literal('JOB_RETRY'),state:z.literal('QUEUED'),jobId:resourceIdSchema,jobRevision:revisionSchema});
const retryRecordSchema=exact({identity:exact({actorUid:resourceIdSchema,operation:z.literal('JOB_RETRY'),resourceId:asset,requestId:idempotencyKeySchema}),requestHash:hashSchema,request:exact({jobId:resourceIdSchema,expectedJobRevision:revisionSchema}),reservationId:resourceIdSchema,quiescence:quiescenceFactSchema,response:retryResponseSchema});
const readyJobSchema=exact({jobId:resourceIdSchema,intentId:resourceIdSchema,assetId:asset,kind,state:z.literal('READY'),revision:revisionSchema,attempt,lease:z.null(),outputBinding:mediaBindingSchema});
// Complete READY persisted record counterpart. It includes retry history for
// attempt2; never restrict authority to the one-attempt golden example.
const jobRecordSchema=exact({job:readyJobSchema,input:frozenInputSchema,uploaderUid:resourceIdSchema,metadataDigest:hashSchema,lastAttempt:attemptTupleSchema,failureClass:z.null(),queueRecord:queueRecordSchema,retryRecord:retryRecordSchema.nullable(),completion:readyFactSchema});
const expectedUploadSchema=exact({intent:intentSchema,referenceAllowlist:rightsReferenceAllowlistSchema});
const originalMetadataSchema=z.union([
  exact({width:positive(8192),height:positive(8192)}).refine(value=>value.width*value.height<=40000000),
  exact({pageCount:positive(48)}),
  exact({width:positive(1920),height:positive(1080),duration:z.number().finite().positive().max(300),fps:z.number().finite().positive().max(60),audio:z.boolean()})
]);
const expectedJobSchema=exact({record:jobRecordSchema,toolSetManifest:r0ToolSetManifestSchema,processingRecipe:processingRecipeSchema,originalMetadata:originalMetadataSchema});
const summaryCommon={assetId:asset,status:z.literal('READY'),archived:z.boolean(),revision:revisionSchema};
const summarySchema=z.union([
  exact({...summaryCommon,kind:z.literal('IMAGE'),width:positive(8192),height:positive(8192)}).refine(value=>value.width*value.height<=40000000),
  exact({...summaryCommon,kind:z.literal('PDF'),pageCount:positive(48)}),
  exact({...summaryCommon,kind:z.literal('VIDEO'),width:positive(1280),height:positive(720),durationSeconds:z.number().finite().positive().max(300)})
]);
const rightsStateSchema=exact({status:z.enum(['PENDING','APPROVED','REJECTED']),revision:z.union([z.literal(0),z.literal(1)]),proof:mediaRightsProofV3Schema.nullable()}).refine(value=>value.status==='PENDING'?value.revision===0 && value.proof===null:value.revision===1 && value.proof!==null && value.proof.decision===value.status);
export const readyDetailSchema=exact({summary:summarySchema,binding:mediaBindingSchema,metadata:mediaMetadataSchema,actors:uploadActorsSchema,rights:rightsStateSchema});

/** Exact descriptors checked before reading the injected hash capability. */
function options(input,keys){
  if(input===null || typeof input!=='object' || Object.getPrototypeOf(input)!==Object.prototype)throw new ApiError('INTERNAL_ERROR');
  const names=Reflect.ownKeys(input),descriptors=Object.getOwnPropertyDescriptors(input);
  if(names.length!==keys.length || names.some(key=>!keys.includes(key)))throw new ApiError('INTERNAL_ERROR');
  for(const key of keys){const d=descriptors[key];if(!d || !d.enumerable || !Object.hasOwn(d,'value'))throw new ApiError('INTERNAL_ERROR');}
  const result=Object.fromEntries(keys.map(key=>[key,descriptors[key].value]));
  if(typeof result.hashCanonical!=='function')throw new ApiError('INTERNAL_ERROR');return result;
}
function normalizedDerivativeProjection(derivatives){
  // Full processed set, including each tiny IMAGE bucket. Generation stays a
  // trusted opaque string; it is included in the normalized digest, not coerced.
  const fields=['key','role','mimeType','sizeBytes','sha256','generation','targetWidth','width','height','durationSeconds','pageNumber'];
  const compare=(a,b)=>a.role<b.role?-1:a.role>b.role?1:(a.role==='IMAGE'?a.targetWidth-b.targetWidth:a.role==='PDF_PAGE'?a.pageNumber-b.pageNumber:0) || (a.key<b.key?-1:a.key>b.key?1:0);
  return derivatives.map(value=>Object.fromEntries(fields.filter(key=>Object.hasOwn(value,key)).map(key=>[key,value[key]]))).sort(compare);
}
function validateEnvelopeData(input,hashCanonical){
  const value=authorityEnvelopeSchema.parse(input),version=value.readyVersion,actors=value.actors,binding=bindingFromReadyVersion(version),fact=value.readyFact;
  requireRelation(version.uploaderUid===actors.uploaderUid && version.rightsEvidenceSubmittedBy===actors.rightsEvidenceSubmittedBy && same(binding,fact.binding));
  requireRelation(fact.metadataDigest===sha(hashCanonical,metadataDigestProjection(value.metadata)) && binding.evidenceSha256===sha(hashCanonical,evidenceDigestProjection(value.metadata,actors)));
  requireRelation(binding.derivativeSetSha256===sha(hashCanonical,normalizedDerivativeProjection(version.derivatives)));
  return value;
}
const tupleBelongs=(tuple,job)=>['jobId','intentId','assetId','kind','attempt'].every(key=>tuple[key]===job[key]);
function validateJobRecord(record,hashCanonical){
  const {job,input,lastAttempt,queueRecord:q,retryRecord:retry,completion}=record;
  requireRelation(job.assetId===input.assetId && job.kind===input.kind && tupleBelongs(lastAttempt,job) && same(completion.tuple,lastAttempt) && same(job.outputBinding,completion.binding));
  requireRelation(['assetId','kind','originalSha256','processingRecipeSha256','toolSetSha256','evidenceSha256'].every(key=>completion.binding[key]===input[key]) && completion.metadataDigest===record.metadataDigest);
  requireRelation(same(q.request.input,input) && q.request.metadataDigest===record.metadataDigest && q.requestHash===sha(hashCanonical,q.request) && q.identity.resourceId===q.response.assetId && q.response.assetId===input.assetId && q.response.jobId===job.jobId && q.response.intentId===job.intentId);
  if(retry!==null){
    const r=retry.response;
    requireRelation(retry.requestHash===sha(hashCanonical,retry.request) && r.requestId===retry.identity.requestId && r.assetId===retry.identity.resourceId && r.jobId===retry.request.jobId && r.revision===retry.request.expectedJobRevision+1 && r.jobRevision===r.revision);
    requireRelation(r.jobId===job.jobId && r.intentId===job.intentId && r.assetId===job.assetId && r.revision<=job.revision && retry.request.expectedJobRevision>=2 && tupleBelongs({...retry.quiescence.tuple,attempt:job.attempt},job) && retry.quiescence.tuple.attempt===1 && retry.quiescence.tuple.leaseEpoch<lastAttempt.leaseEpoch);
  }
  requireRelation(job.attempt===2?retry!==null:retry===null);
}

/** expectedUpload/expectedJob are independent owner-validated persisted DATA.
 * Upload retains the full U0 intent and verified immutable CREATE ref identities;
 * Job retains full J1 READY record, R0 manifest, recipe and original metadata.
 * No config/native loader, Auth, Storage or producer authority is established.
 */
export function validateAuthorityEnvelope(input,context){
  try{
    const c=options(context,['expectedUpload','expectedJob','profileId','hashCanonical']);
    z.enum(['M3-IMAGE-R0-1','M3-PDF-R0-1','M3-VIDEO-R0-1']).parse(c.profileId);
    const upload=expectedUploadSchema.parse(c.expectedUpload),expected=expectedJobSchema.parse(c.expectedJob);
    const value=validateEnvelopeData(input,c.hashCanonical),version=value.readyVersion,binding=bindingFromReadyVersion(version),{intent}=upload,{record}=expected,job=record.job;
    const md=hashMediaMetadata(value.metadata,{actors:value.actors,referenceAllowlist:upload.referenceAllowlist,hashCanonical:c.hashCanonical});
    requireRelation(intent.state==='QUEUED' && same(intent.actors,value.actors) && intent.assetId===version.assetId && intent.core.kind===version.kind && intent.core.inputBytes===version.originalSizeBytes && intent.metadataBinding.metadataDigest===md.metadataDigest && binding.evidenceSha256===md.evidenceSha256);
    validateJobRecord(record,c.hashCanonical);
    requireRelation(job.intentId===intent.intentId && job.assetId===intent.assetId && job.kind===intent.core.kind && record.uploaderUid===intent.actors.uploaderUid && record.metadataDigest===intent.metadataBinding.metadataDigest && record.queueRecord.request.expectedIntentRevision===intent.revision && same(record.completion,value.readyFact));
    requireRelation(record.input.inputBytes===version.originalSizeBytes && same(job.outputBinding,binding));
    const manifest=validateToolSetManifest(expected.toolSetManifest,{profileId:c.profileId,hashCanonical:c.hashCanonical});
    const recipe=validateProcessingRecipe(expected.processingRecipe,{profileId:c.profileId,originalMetadata:expected.originalMetadata,hashCanonical:c.hashCanonical});
    requireRelation(manifest.kind===version.kind && recipe.kind===version.kind && sha(c.hashCanonical,manifest)===binding.toolSetSha256 && recipe.toolSetSha256===binding.toolSetSha256 && sha(c.hashCanonical,recipe)===binding.processingRecipeSha256);
    if(version.kind==='IMAGE')requireRelation(version.width===expected.originalMetadata.width && version.height===expected.originalMetadata.height);
    if(version.kind==='PDF')requireRelation(version.pageCount===expected.originalMetadata.pageCount);
    // VIDEO output dimensions/duration are full ReadyVersion derivative facts;
    // TOOLS separately binds the exact input metadata/transcode recipe. No raw
    // native receipt or recipe hash is reinterpreted as this authority envelope.
    return value;
  }catch{throw new ApiError('INTERNAL_ERROR');}
}
export function validateTerminalRightsProofV3(input,context){
  let c,authority;
  try{
    c=options(context,['binding','actors','originalCheckerUid','hashCanonical']);
    authority=exact({binding:mediaBindingSchema,actors:uploadActorsSchema,originalCheckerUid:resourceIdSchema}).parse({binding:c.binding,actors:c.actors,originalCheckerUid:c.originalCheckerUid});
  }catch{throw new ApiError('INTERNAL_ERROR');}
  let proof;try{proof=mediaRightsProofV3Schema.parse(input);}catch{throw new ApiError('VALIDATION_ERROR');}
  // The historical checker comes from independent persisted context, never a
  // current request actor or the proof input. Keep public Rights error behavior.
  return validateMediaRightsProof(proof,{context:{binding:authority.binding,actorUid:authority.originalCheckerUid,...authority.actors},hashCanonical:c.hashCanonical});
}
export function validateReadyDetail(input,context){
  try{
    const c=options(context,['authorityEnvelope','rightsState','hashCanonical']);
    // Already validated envelope DATA from validateAuthorityEnvelope; this stage
    // cannot re-establish U0/J1/native provenance without those owner contexts.
    const envelope=validateEnvelopeData(c.authorityEnvelope,c.hashCanonical),state=rightsStateSchema.parse(c.rightsState),value=readyDetailSchema.parse(input);
    const binding=bindingFromReadyVersion(envelope.readyVersion);
    requireRelation(same(value.summary,safeMetadataFromReadyVersion(envelope.readyVersion)) && same(value.binding,binding) && same(value.metadata,envelope.metadata) && same(value.actors,envelope.actors) && same(value.rights,state));
    if(state.proof!==null)validateTerminalRightsProofV3(state.proof,{binding,actors:envelope.actors,originalCheckerUid:state.proof.checkedBy,hashCanonical:c.hashCanonical});
    // Whole actual JSON detail/proof budgets are applied by C at composition.
    // This parser neither truncates fields nor promises simultaneous maxima fit.
    return value;
  }catch{throw new ApiError('INTERNAL_ERROR');}
}
