import {z} from 'zod';
import {ApiError,validationError} from './errors.mjs';
import {revisionSchema,resourceIdSchema,hashSchema,idempotencyKeySchema} from './hero.mjs';
import {strictMediaV2JsonSchema,uploadActorsV2Schema,mediaMetadataV2Schema,parseMediaMetadataV2,hashMediaMetadataV2} from './media-v3-metadata-v2.mjs';
import {mediaBindingV2Schema,V2_MEDIA_LIMITS} from './media-v3-contract-v2.mjs';
import {frozenInputV2Schema,uploadMetadataFactV2Schema} from './media-v3-authority-v2.mjs';

/** Canonical Option A v2. Browser-safe validation/constants, no storage or Auth.
 * Name240 belongs to C0; no media-rights/submitter/EV workflow in this contract.
 * Version is server-owned: client core/identity/FrozenInput have no selector.
 */
export const UPLOAD_CONTRACT_REVISION=2;
const MiB=1024**2;
export const UPLOAD_LIMITS=Object.freeze({jsonBytes:65536,partBytes:4*MiB,retainedBytes:2*1024*MiB,libraryVersions:200,activePerUploader:2,activeProject:4,intentExpiryMs:86400000,processingAttempts:2,leaseMs:30000,heartbeatMs:5000});
export const MEDIA_UPLOAD_CAPS=Object.freeze(Object.fromEntries(Object.entries(V2_MEDIA_LIMITS).map(([kind,c])=>[kind,Object.freeze({inputBytes:c.inputBytes,maxParts:Math.ceil(c.inputBytes/UPLOAD_LIMITS.partBytes),derivativeBytes:c.outputBytes})])));
export const UPLOAD_STATES=Object.freeze(['UPLOADING','QUEUED','CANCELLED']);
export const PROCESSING_STATES=Object.freeze(['QUEUED','PROCESSING','READY','REJECTED','RECOVERY_REQUIRED']);
export const CREATE_RESOURCE='MEDIA_UPLOADS';
export const DECLARED_MIME=Object.freeze({IMAGE:Object.freeze(['image/jpeg','image/png','image/webp']),PDF:Object.freeze(['application/pdf']),VIDEO:Object.freeze(['video/mp4'])});
const integer=(max=Number.MAX_SAFE_INTEGER-1)=>z.number().int().min(0).max(max),time=integer(Number.MAX_SAFE_INTEGER-UPLOAD_LIMITS.intentExpiryMs),kind=z.enum(['IMAGE','PDF','VIDEO']);
const id=resourceIdSchema,key=idempotencyKeySchema.refine(v=>v.length<=128&&!/[^A-Za-z0-9_-]/.test(v)),sha=hashSchema.refine(v=>v.length===64);
export const mediaAssetIdSchema=z.string().regex(/^[A-Za-z0-9_-]{1,100}$(?![\s\S])/);
function parse(schema,value){assertUploadJsonSize(value);try{return schema.parse(value);}catch(error){throw validationError(error);}}
export function assertUploadJsonSize(value){
 if(!strictMediaV2JsonSchema.safeParse(value).success)throw new ApiError('VALIDATION_ERROR');
 const bytes=new TextEncoder().encode(JSON.stringify(value)).length;if(bytes>UPLOAD_LIMITS.jsonBytes)throw new ApiError('PAYLOAD_TOO_LARGE');return bytes;
}
const gated=schema=>z.preprocess(value=>{assertUploadJsonSize(value);return value;},schema);
const exact=fields=>z.strictObject(fields),owned=fields=>exact({contractRevision:z.literal(2),...fields});
export {mediaMetadataV2Schema,parseMediaMetadataV2,hashMediaMetadataV2,frozenInputV2Schema,uploadMetadataFactV2Schema};
export const uploadCoreSchema=gated(exact({requestId:key,kind,declaredMime:z.string(),inputBytes:integer(128*MiB).min(1)}).refine(v=>v.inputBytes<=MEDIA_UPLOAD_CAPS[v.kind].inputBytes&&DECLARED_MIME[v.kind].includes(v.declaredMime)));
export const metadataBindingSchema=gated(exact({metadataDigest:sha}));
export const trustedUploadActorsSchema=gated(uploadActorsV2Schema);
export const mediaBindingSchema=gated(mediaBindingV2Schema);
export const outputBindingSchema=mediaBindingSchema;
export const partReceiptSchema=gated(exact({index:integer(31),offsetBytes:integer(128*MiB),sizeBytes:integer(UPLOAD_LIMITS.partBytes).min(1),sha256:sha}));
// Untagged scalar snapshot nested in owner records; global counters remain shared across versions.
export const quotaSnapshotSchema=gated(exact({revision:revisionSchema,retainedBytes:integer(UPLOAD_LIMITS.retainedBytes),reservedBytes:integer(UPLOAD_LIMITS.retainedBytes),uncertainBytes:integer(UPLOAD_LIMITS.retainedBytes),versionCount:integer(200),activeUploaderIntents:integer(2),activeProjectIntents:integer(4)}).refine(v=>v.retainedBytes+v.reservedBytes+v.uncertainBytes<=UPLOAD_LIMITS.retainedBytes&&v.activeUploaderIntents<=v.activeProjectIntents));
export const leaseSchema=gated(exact({epoch:integer().min(1),workerId:id,claimedAtMs:time,heartbeatAtMs:time,expiresAtMs:time}).refine(v=>v.claimedAtMs<=v.heartbeatAtMs&&v.expiresAtMs-v.heartbeatAtMs===UPLOAD_LIMITS.leaseMs));
export const jobSnapshotSchema=gated(owned({jobId:id,intentId:id,assetId:mediaAssetIdSchema,kind,state:z.enum(PROCESSING_STATES),revision:revisionSchema,attempt:integer(2),lease:leaseSchema.nullable(),outputBinding:outputBindingSchema.nullable()}).refine(v=>{
 if(v.state==='PROCESSING')return v.attempt>=1&&v.lease!==null&&v.outputBinding===null;
 if(v.lease!==null)return false;
 if(v.state==='READY')return v.attempt>=1&&v.outputBinding!==null&&v.outputBinding.assetId===v.assetId&&v.outputBinding.kind===v.kind;
 return v.outputBinding===null&&(v.state==='QUEUED'?v.attempt<2:v.attempt>=1);
}));
export function partCount(inputBytes){if(!Number.isSafeInteger(inputBytes)||inputBytes<1||inputBytes>128*MiB)throw new ApiError('VALIDATION_ERROR');return Math.ceil(inputBytes/UPLOAD_LIMITS.partBytes);}
function validPart(p,core){return p.index<partCount(core.inputBytes)&&p.offsetBytes===p.index*UPLOAD_LIMITS.partBytes&&p.sizeBytes===Math.min(UPLOAD_LIMITS.partBytes,core.inputBytes-p.offsetBytes);}
export const intentSnapshotSchema=gated(owned({intentId:id,assetId:mediaAssetIdSchema,actors:trustedUploadActorsSchema,core:uploadCoreSchema,metadataBinding:metadataBindingSchema,state:z.enum(UPLOAD_STATES),revision:revisionSchema,createdAtMs:time,expiresAtMs:time,parts:z.array(partReceiptSchema).max(32)}).refine(v=>v.expiresAtMs-v.createdAtMs===UPLOAD_LIMITS.intentExpiryMs&&new Set(v.parts.map(p=>p.index)).size===v.parts.length&&v.parts.every(p=>validPart(p,v.core))&&(v.state!=='QUEUED'||v.parts.length===partCount(v.core.inputBytes))));
const identityFields={actorUid:id,requestId:key};
export const idempotencyIdentitySchema=gated(z.discriminatedUnion('operation',[
 exact({...identityFields,operation:z.literal('UPLOAD_CREATE'),resourceId:z.literal(CREATE_RESOURCE)}),
 exact({...identityFields,operation:z.literal('UPLOAD_PART'),resourceId:mediaAssetIdSchema,partIndex:integer(31)}),
 ...['UPLOAD_COMPLETE','UPLOAD_CANCEL','JOB_RETRY'].map(operation=>exact({...identityFields,operation:z.literal(operation),resourceId:mediaAssetIdSchema}))
]));
const receiptFields={contractRevision:z.literal(2),assetId:mediaAssetIdSchema,intentId:id,requestId:key,revision:revisionSchema},counts={acceptedParts:integer(32),partCount:integer(32).min(1)};
export const publicReceiptSchema=gated(z.discriminatedUnion('operation',[
 exact({...receiptFields,...counts,operation:z.literal('UPLOAD_CREATE'),state:z.literal('UPLOADING'),acceptedParts:z.literal(0)}),
 exact({...receiptFields,...counts,operation:z.literal('UPLOAD_PART'),state:z.literal('UPLOADING'),partIndex:integer(31),acceptedPartId:id}),
 exact({...receiptFields,...counts,operation:z.literal('UPLOAD_COMPLETE'),state:z.literal('QUEUED'),jobId:id}),
 exact({...receiptFields,...counts,operation:z.literal('UPLOAD_CANCEL'),state:z.literal('CANCELLED')}),
 exact({...receiptFields,operation:z.literal('JOB_RETRY'),state:z.literal('QUEUED'),jobId:id,jobRevision:revisionSchema})
]).refine(v=>v.operation==='JOB_RETRY'||(v.acceptedParts<=v.partCount&&(v.operation!=='UPLOAD_PART'||(v.partIndex<v.partCount&&v.acceptedParts>=1))&&(v.operation!=='UPLOAD_COMPLETE'||v.acceptedParts===v.partCount))));
export const acceptedPartReferenceSchema=gated(exact({partId:id,assetId:mediaAssetIdSchema,intentId:id,part:partReceiptSchema,writerIdentity:idempotencyIdentitySchema}).refine(v=>v.part.offsetBytes===v.part.index*UPLOAD_LIMITS.partBytes&&v.writerIdentity.operation==='UPLOAD_PART'&&v.writerIdentity.resourceId===v.assetId&&v.writerIdentity.partIndex===v.part.index));
export const retryRequestSchema=gated(exact({requestId:key,jobId:id,expectedJobRevision:revisionSchema}));
export const privateReceiptSchema=gated(owned({identity:idempotencyIdentitySchema,fingerprint:sha,status:z.enum(['IN_FLIGHT','SETTLED']),publicReceipt:publicReceiptSchema.nullable(),acceptedPart:acceptedPartReferenceSchema.nullable(),retryRequest:retryRequestSchema.nullable()}).refine(v=>{
 const {identity:i,publicReceipt:p,acceptedPart:a,retryRequest:r}=v;
 if(v.status==='IN_FLIGHT')return p===null&&a===null&&r===null;
 if(p===null||p.operation!==i.operation||p.requestId!==i.requestId||(i.operation!=='UPLOAD_CREATE'&&p.assetId!==i.resourceId))return false;
 if(i.operation==='UPLOAD_PART')return a!==null&&r===null&&p.partIndex===i.partIndex&&p.acceptedPartId===a.partId&&a.assetId===p.assetId&&a.intentId===p.intentId&&a.part.index===i.partIndex;
 if(a!==null)return false;
 return i.operation==='JOB_RETRY'?r!==null&&r.jobId===p.jobId&&r.requestId===i.requestId:r===null;
}));
export const expectedUploadSchema=gated(exact({intent:intentSnapshotSchema,metadataFact:uploadMetadataFactV2Schema}).refine(v=>v.metadataFact.kind===v.intent.core.kind&&v.metadataFact.uploaderUid===v.intent.actors.uploaderUid&&v.metadataFact.metadataDigest===v.intent.metadataBinding.metadataDigest));
/** Kinded, version-scoped server keys. Backend mediaV2DocumentId is the sole SHA builder. */
export const mediaV2DocumentKeySchema=gated(z.discriminatedUnion('kind',[
 exact({kind:z.literal('INTENT'),intentId:id}),exact({kind:z.literal('ASSET_INTENT'),assetId:mediaAssetIdSchema}),
 exact({kind:z.literal('JOB'),jobId:id}),exact({kind:z.literal('ASSET_JOB'),assetId:mediaAssetIdSchema}),
 exact({kind:z.literal('OPERATION'),identity:idempotencyIdentitySchema}),exact({kind:z.literal('RECEIPT_CACHE'),identity:idempotencyIdentitySchema})
]));
export function parseUploadCore(v){return parse(uploadCoreSchema,v);}
export function parseMetadataBinding(v){return parse(metadataBindingSchema,v);}
export function parseMediaBinding(v){return parse(mediaBindingSchema,v);}
export function parseTrustedUploadActors(v){return parse(trustedUploadActorsSchema,v);}
export function parsePartReceipt(v,core){const c=parseUploadCore(core),p=parse(partReceiptSchema,v);if(!validPart(p,c))throw new ApiError('VALIDATION_ERROR');return p;}
export function parseQuotaSnapshot(v){return parse(quotaSnapshotSchema,v);}
export function parseLease(v){return parse(leaseSchema,v);}
export function parseJobSnapshot(v){return parse(jobSnapshotSchema,v);}
export function parseIntentSnapshot(v){return parse(intentSnapshotSchema,v);}
export function parseIdempotencyIdentity(v){return parse(idempotencyIdentitySchema,v);}
export function parsePublicReceipt(v){return parse(publicReceiptSchema,v);}
export function parsePrivateReceipt(v){return parse(privateReceiptSchema,v);}
export function parseAcceptedPartReference(v){return parse(acceptedPartReferenceSchema,v);}
export function parseRetryRequest(v){return parse(retryRequestSchema,v);}
export function parseExpectedUpload(v){return parse(expectedUploadSchema,v);}
export function assertMediaBindingMatches(expected,actual){const a=parseMediaBinding(expected),b=parseMediaBinding(actual);if(Object.keys(a).some(k=>a[k]!==b[k]))throw new ApiError('REVISION_CONFLICT');return b;}
export function assertTransportOperationKey(headerKey,bodyMirror){const normalized=parse(key,headerKey);if(bodyMirror!==undefined&&bodyMirror!==normalized)throw new ApiError('VALIDATION_ERROR');return normalized;}
export function uploadContractError(reason){const codes={PART_BYTES_MISMATCH:'REVISION_CONFLICT',PAYLOAD_MISMATCH:'IDEMPOTENCY_PAYLOAD_MISMATCH',IN_FLIGHT:'IDEMPOTENCY_IN_PROGRESS',STALE_REVISION:'REVISION_CONFLICT',INVALID:'VALIDATION_ERROR',TOO_LARGE:'PAYLOAD_TOO_LARGE'};return new ApiError(typeof reason==='string'&&Object.hasOwn(codes,reason)?codes[reason]:'INTERNAL_ERROR');}
