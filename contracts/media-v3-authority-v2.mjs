import {z} from 'zod';
import {ApiError} from './errors.mjs';
import {resourceIdSchema,hashSchema,revisionSchema,idempotencyKeySchema} from './hero.mjs';
import {strictMediaV2JsonSchema,mediaMetadataV2Schema,uploadActorsV2Schema,hashMediaMetadataV2} from './media-v3-metadata-v2.mjs';
import {registeredToolSetManifestSchema,processingProgramV2Schema,validateToolSetManifest,validateProcessingProgram,validateProcessingExecution} from './media-v3-toolset-v2.mjs';
import {readyVersionV2Schema,mediaBindingV2Schema,bindingFromReadyVersionV2,safeMetadataFromReadyVersionV2,normalizedDerivativeProjectionV2,canonicalMediaV2Json,V2_MEDIA_LIMITS} from './media-v3-contract-v2.mjs';

const digestSchema=hashSchema.refine(value=>value.length===64);
const exact=shape=>strictMediaV2JsonSchema.pipe(z.strictObject(shape));
const kind=z.enum(['IMAGE','PDF','VIDEO']);
const asset=z.string().regex(/^[A-Za-z0-9_-]{1,100}$(?![\s\S])/);
const integer=max=>z.number().int().min(0).max(max);
const positive=max=>integer(max).min(1);
const time=integer(Number.MAX_SAFE_INTEGER-86400000);
const generation=z.string().regex(/^[1-9][0-9]{0,127}$(?![\s\S])/);
const attempt=z.union([z.literal(1),z.literal(2)]);
const same=(a,b)=>canonicalMediaV2Json(a)===canonicalMediaV2Json(b);
const requireRelation=value=>{if(!value)throw new ApiError('INTERNAL_ERROR');};
const capture=value=>{strictMediaV2JsonSchema.parse(value);return structuredClone(value);};
const sha=(hash,value)=>digestSchema.parse(hash(capture(value)));
export const attemptTupleV2Schema=exact({jobId:resourceIdSchema,intentId:resourceIdSchema,assetId:asset,kind,attempt,leaseEpoch:revisionSchema.refine(value=>value>0),workerId:resourceIdSchema});
export const frozenInputV2Schema=exact({assetId:asset,kind,originalSha256:digestSchema,inputBytes:positive(128*1024**2),processingRecipeSha256:digestSchema,toolSetSha256:digestSchema}).refine(value=>value.inputBytes<=V2_MEDIA_LIMITS[value.kind].inputBytes);
export const storageFactV2Schema=exact({contractRevision:z.literal(2),verification:z.literal('MEDIA_STORAGE_FULL_NORMALIZED_SET'),tuple:attemptTupleV2Schema,binding:mediaBindingV2Schema,metadataDigest:digestSchema,originalGeneration:generation,generationBoundDerivativeSetSha256:digestSchema,manifestReceiptId:resourceIdSchema});
export const cacheFactV2Schema=exact({contractRevision:z.literal(2),verification:z.literal('MEDIA_CACHE_VERIFIED'),tuple:attemptTupleV2Schema,binding:mediaBindingV2Schema,metadataDigest:digestSchema,manifestReceiptId:resourceIdSchema,inspectionId:resourceIdSchema});
export const quiescenceFactV2Schema=exact({contractRevision:z.literal(2),verification:z.literal('LOCAL_ATTEMPT_QUIESCENT'),tuple:attemptTupleV2Schema,proofId:resourceIdSchema});
export const readyFactV2Schema=exact({contractRevision:z.literal(2),verification:z.literal('MEDIA_READY_ATTEMPT'),tuple:attemptTupleV2Schema,binding:mediaBindingV2Schema,metadataDigest:digestSchema,storage:storageFactV2Schema,cache:cacheFactV2Schema,quiescence:quiescenceFactV2Schema,proofId:resourceIdSchema}).refine(value=>value.tuple.assetId===value.binding.assetId && value.tuple.kind===value.binding.kind && same(value.tuple,value.storage.tuple) && same(value.tuple,value.cache.tuple) && same(value.tuple,value.quiescence.tuple) && same(value.binding,value.storage.binding) && same(value.binding,value.cache.binding) && value.metadataDigest===value.storage.metadataDigest && value.metadataDigest===value.cache.metadataDigest && value.storage.manifestReceiptId===value.cache.manifestReceiptId && value.storage.generationBoundDerivativeSetSha256===value.binding.derivativeSetSha256);
export const authorityEnvelopeV2Schema=exact({readyVersion:readyVersionV2Schema,actors:uploadActorsV2Schema,metadata:mediaMetadataV2Schema,readyFact:readyFactV2Schema});

const partBytes=4*1024**2;
const mimeByKind={IMAGE:['image/jpeg','image/png','image/webp'],PDF:['application/pdf'],VIDEO:['video/mp4']};
const uploadCoreSchema=exact({requestId:idempotencyKeySchema,kind,declaredMime:z.string(),inputBytes:positive(128*1024**2)}).refine(value=>value.inputBytes<=V2_MEDIA_LIMITS[value.kind].inputBytes && mimeByKind[value.kind].includes(value.declaredMime));
const partSchema=exact({index:integer(31),offsetBytes:integer(128*1024**2),sizeBytes:positive(partBytes),sha256:digestSchema});
const intentSchema=exact({contractRevision:z.literal(2),intentId:resourceIdSchema,assetId:asset,actors:uploadActorsV2Schema,core:uploadCoreSchema,metadataBinding:exact({metadataDigest:digestSchema}),state:z.enum(['UPLOADING','QUEUED','CANCELLED']),revision:revisionSchema,createdAtMs:time,expiresAtMs:time,parts:z.array(partSchema).max(32)}).refine(value=>{
  const count=Math.ceil(value.core.inputBytes/partBytes);
  return value.expiresAtMs-value.createdAtMs===86400000 && new Set(value.parts.map(part=>part.index)).size===value.parts.length && value.parts.every(part=>part.index<count && part.offsetBytes===part.index*partBytes && part.sizeBytes===Math.min(partBytes,value.core.inputBytes-part.offsetBytes)) && (value.state!=='QUEUED' || value.parts.length===count);
});
const queueIdentitySchema=exact({actorUid:resourceIdSchema,operation:z.literal('UPLOAD_COMPLETE'),resourceId:asset,requestId:idempotencyKeySchema});
const queueRequestSchema=exact({expectedIntentRevision:revisionSchema,input:frozenInputV2Schema,metadataDigest:digestSchema});
const queueResponseSchema=exact({contractRevision:z.literal(2),jobId:resourceIdSchema,intentId:resourceIdSchema,assetId:asset,state:z.literal('QUEUED'),jobRevision:z.literal(0)});
const queueRecordSchema=exact({identity:queueIdentitySchema,requestHash:digestSchema,request:queueRequestSchema,response:queueResponseSchema});
const retryResponseSchema=exact({contractRevision:z.literal(2),assetId:asset,intentId:resourceIdSchema,requestId:idempotencyKeySchema,revision:revisionSchema,operation:z.literal('JOB_RETRY'),state:z.literal('QUEUED'),jobId:resourceIdSchema,jobRevision:revisionSchema});
const retryRecordSchema=exact({identity:exact({actorUid:resourceIdSchema,operation:z.literal('JOB_RETRY'),resourceId:asset,requestId:idempotencyKeySchema}),requestHash:digestSchema,request:exact({jobId:resourceIdSchema,expectedJobRevision:revisionSchema}),reservationId:resourceIdSchema,quiescence:quiescenceFactV2Schema,response:retryResponseSchema});
const readyJobSchema=exact({contractRevision:z.literal(2),jobId:resourceIdSchema,intentId:resourceIdSchema,assetId:asset,kind,state:z.literal('READY'),revision:revisionSchema,attempt,lease:z.null(),outputBinding:mediaBindingV2Schema});
// Complete READY persisted record counterpart. It includes retry history for
// attempt2; never restrict authority to the one-attempt golden example.
const jobRecordSchema=exact({contractRevision:z.literal(2),job:readyJobSchema,input:frozenInputV2Schema,uploaderUid:resourceIdSchema,metadataDigest:digestSchema,lastAttempt:attemptTupleV2Schema,failureClass:z.null(),queueRecord:queueRecordSchema,retryRecord:retryRecordSchema.nullable(),completion:readyFactV2Schema});
export const uploadMetadataFactV2Schema=exact({contractRevision:z.literal(2),verification:z.literal('UPLOAD_METADATA_VALIDATED'),kind,metadataDigest:digestSchema,uploaderUid:resourceIdSchema,proofId:resourceIdSchema});
const expectedUploadSchema=exact({intent:intentSchema,metadataFact:uploadMetadataFactV2Schema});
const originalMetadataSchema=z.union([
  exact({width:positive(8192),height:positive(8192)}).refine(value=>value.width*value.height<=40000000),
  exact({pageCount:positive(48)}),
  exact({width:positive(1920),height:positive(1080),duration:z.number().finite().positive().max(300),fps:z.number().finite().positive().max(60),audio:z.boolean()})
]);
const expectedJobSchema=exact({record:jobRecordSchema,toolSetManifest:registeredToolSetManifestSchema,processingProgram:processingProgramV2Schema,originalMetadata:originalMetadataSchema,executionRecipe:strictMediaV2JsonSchema});
const summaryCommon={contractRevision:z.literal(2),assetId:asset,status:z.literal('READY'),archived:z.boolean(),revision:revisionSchema};
const summarySchema=z.union([
  exact({...summaryCommon,kind:z.literal('IMAGE'),width:positive(8192),height:positive(8192)}).refine(value=>value.width*value.height<=40000000),
  exact({...summaryCommon,kind:z.literal('PDF'),pageCount:positive(48)}),
  exact({...summaryCommon,kind:z.literal('VIDEO'),width:positive(1280),height:positive(720),durationSeconds:z.number().finite().positive().max(300)})
]);
export const readyDetailV2Schema=exact({summary:summarySchema,binding:mediaBindingV2Schema,metadata:mediaMetadataV2Schema,actors:uploadActorsV2Schema});

/** Exact descriptors checked before reading the injected hash capability. */
function options(input,keys){
  if(input===null || typeof input!=='object' || Object.getPrototypeOf(input)!==Object.prototype)throw new ApiError('INTERNAL_ERROR');
  const names=Reflect.ownKeys(input),descriptors=Object.getOwnPropertyDescriptors(input);
  if(names.length!==keys.length || names.some(key=>!keys.includes(key)))throw new ApiError('INTERNAL_ERROR');
  for(const key of keys){const d=descriptors[key];if(!d || !d.enumerable || !Object.hasOwn(d,'value'))throw new ApiError('INTERNAL_ERROR');}
  const result=Object.fromEntries(keys.map(key=>[key,descriptors[key].value]));
  if(typeof result.hashCanonical!=='function')throw new ApiError('INTERNAL_ERROR');return result;
}
function validateEnvelopeData(input,hashCanonical){
  const value=authorityEnvelopeV2Schema.parse(input),version=value.readyVersion,actors=value.actors,binding=bindingFromReadyVersionV2(version),fact=value.readyFact;
  const md=hashMediaMetadataV2(value.metadata,{hashCanonical:value=>sha(hashCanonical,value)}).metadataDigest;
  requireRelation(version.uploaderUid===actors.uploaderUid && same(binding,fact.binding));
  requireRelation(version.metadataDigest===md && fact.metadataDigest===md);
  requireRelation(binding.derivativeSetSha256===sha(hashCanonical,normalizedDerivativeProjectionV2(version.derivatives)));
  return value;
}
const tupleBelongs=(tuple,job)=>['jobId','intentId','assetId','kind','attempt'].every(key=>tuple[key]===job[key]);
// Retain actual operation actors. OWNER may complete/retry another uploader;
// action/resource authorization belongs to the Upload service transaction.
function validateJobRecord(record,hashCanonical){
  const {job,input,lastAttempt,queueRecord:q,retryRecord:retry,completion}=record;
  requireRelation(job.assetId===input.assetId && job.kind===input.kind && tupleBelongs(lastAttempt,job) && same(completion.tuple,lastAttempt) && same(job.outputBinding,completion.binding));
  requireRelation(['assetId','kind','originalSha256','processingRecipeSha256','toolSetSha256'].every(key=>completion.binding[key]===input[key]) && completion.metadataDigest===record.metadataDigest);
  requireRelation(same(q.request.input,input) && q.request.metadataDigest===record.metadataDigest && q.requestHash===sha(hashCanonical,q.request) && q.identity.resourceId===q.response.assetId && q.response.assetId===input.assetId && q.response.jobId===job.jobId && q.response.intentId===job.intentId);
  if(retry!==null){
    const r=retry.response;
    requireRelation(retry.requestHash===sha(hashCanonical,retry.request) && r.requestId===retry.identity.requestId && r.assetId===retry.identity.resourceId && r.jobId===retry.request.jobId && r.revision===retry.request.expectedJobRevision+1 && r.jobRevision===r.revision);
    requireRelation(r.jobId===job.jobId && r.intentId===job.intentId && r.assetId===job.assetId && r.revision<=job.revision && retry.request.expectedJobRevision>=2 && tupleBelongs({...retry.quiescence.tuple,attempt:job.attempt},job) && retry.quiescence.tuple.attempt===1 && retry.quiescence.tuple.leaseEpoch<lastAttempt.leaseEpoch);
  }
  requireRelation(job.attempt===2?retry!==null:retry===null);
}

/** Full technical READY validation, not an Upload SETTLED-receipt validator.
 * Owners independently supply retained U0/J1 and U1 evidence. Parsing cannot
 * authenticate Auth/ACL, native bytes, fact provenance or fixed replay storage.
 * Upload CREATE fingerprint remains SHA({identity,core,metadataDigest,actors});
 * revision is server-owned record/key scope, never an injected request field.
 */
export function validateAuthorityEnvelopeV2(input,context){
  try{
    const c=options(context,['expectedUpload','expectedJob','profileId','hashCanonical']);
    // Capture every DATA input before a hash capability can mutate caller state.
    const data=capture({expectedUpload:c.expectedUpload,expectedJob:c.expectedJob,profileId:c.profileId,envelope:input});
    z.enum(['M3-IMAGE-R0-1','M3-PDF-R0-1','M3-VIDEO-R0-1','M3-PDF-LOCAL-1','M3-PDF-LOCAL-2','M3-PDF-LOCAL-3','M3-PDF-LOCAL-4','M3-PDF-LOCAL-5']).parse(data.profileId);
    const upload=expectedUploadSchema.parse(data.expectedUpload),expected=expectedJobSchema.parse(data.expectedJob);
    const value=validateEnvelopeData(data.envelope,c.hashCanonical),version=value.readyVersion,binding=bindingFromReadyVersionV2(version),{intent,metadataFact}=upload,{record}=expected,job=record.job;
    requireRelation(intent.state==='QUEUED' && same(intent.actors,value.actors) && intent.assetId===version.assetId && intent.core.kind===version.kind && intent.core.inputBytes===version.originalSizeBytes);
    requireRelation(metadataFact.kind===version.kind && metadataFact.uploaderUid===intent.actors.uploaderUid && metadataFact.metadataDigest===version.metadataDigest && intent.metadataBinding.metadataDigest===version.metadataDigest);
    validateJobRecord(record,c.hashCanonical);
    requireRelation(job.intentId===intent.intentId && job.assetId===intent.assetId && job.kind===intent.core.kind && record.uploaderUid===intent.actors.uploaderUid && record.metadataDigest===version.metadataDigest && record.queueRecord.request.expectedIntentRevision===intent.revision && same(record.completion,value.readyFact));
    requireRelation(record.input.inputBytes===version.originalSizeBytes && same(job.outputBinding,binding));
    const safeHash=value=>sha(c.hashCanonical,value);
    const manifest=validateToolSetManifest(expected.toolSetManifest,{profileId:data.profileId,hashCanonical:safeHash});
    const recipe=validateProcessingProgram(expected.processingProgram,{profileId:data.profileId,hashCanonical:safeHash});
    validateProcessingExecution(recipe,expected.executionRecipe,expected.originalMetadata);
    requireRelation(manifest.kind===version.kind && recipe.kind===version.kind && sha(c.hashCanonical,manifest)===binding.toolSetSha256 && recipe.toolSetSha256===binding.toolSetSha256 && sha(c.hashCanonical,recipe)===binding.processingRecipeSha256);
    if(version.kind==='IMAGE')requireRelation(version.width===expected.originalMetadata.width && version.height===expected.originalMetadata.height);
    if(version.kind==='PDF')requireRelation(version.pageCount===expected.originalMetadata.pageCount);
    // VIDEO output duration is independently evidenced; do not require equality
    // with input duration. Recipe validation binds input fps/audio/dimensions.
    return value;
  }catch{throw new ApiError('INTERNAL_ERROR');}
}
export function validateReadyDetailV2(input,context){
  try{
    const c=options(context,['authorityEnvelope','hashCanonical']);
    const data=capture({authorityEnvelope:c.authorityEnvelope,detail:input});
    const value=readyDetailV2Schema.parse(data.detail),envelope=validateEnvelopeData(data.authorityEnvelope,c.hashCanonical);
    requireRelation(same(value.summary,safeMetadataFromReadyVersionV2(envelope.readyVersion)) && same(value.binding,bindingFromReadyVersionV2(envelope.readyVersion)) && same(value.metadata,envelope.metadata) && same(value.actors,envelope.actors));
    requireRelation(new TextEncoder().encode(JSON.stringify(value)).length<=8192);
    return value;
  }catch{throw new ApiError('INTERNAL_ERROR');}
}
