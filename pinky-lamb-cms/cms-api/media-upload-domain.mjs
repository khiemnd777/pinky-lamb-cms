import {z} from 'zod';
import {createHash} from 'node:crypto';
import {ApiError} from '../contracts/errors.mjs';
import {canonicalMediaV2Json as canonicalJson} from '../contracts/media-v3-contract-v2.mjs';
import {frozenInputV2Schema,uploadMetadataFactV2Schema} from '../contracts/media-v3-authority-v2.mjs';
import {MAX_REVISION,resourceIdSchema,idempotencyKeySchema,hashSchema,revisionSchema} from '../contracts/hero.mjs';
import {UPLOAD_LIMITS,MEDIA_UPLOAD_CAPS,mediaAssetIdSchema,uploadCoreSchema,partReceiptSchema,trustedUploadActorsSchema,metadataBindingSchema,privateReceiptSchema,intentSnapshotSchema,assertUploadJsonSize,mediaV2DocumentKeySchema,expectedUploadSchema} from '../contracts/media-upload.mjs';

/** Canonical Option A contract revision2. All outputs are joint atomic postconditions.
 * Opaque facts describe trusted adapter assertions; tags and proof IDs do not establish
 * current Auth, byte custody, physical quiescence or persistence. Q1/J1 are never called.
 * SAFE_HOLD is bounded: no unlock, refund, automatic retry or terminal recovery here.
 */
// Exact full scalar bounds supplement the shared browser-safe upload validators.
const identifier=(schema,max)=>schema.refine(v=>v.length<=max&&!/[^A-Za-z0-9_-]/.test(v));
const id=identifier(resourceIdSchema,128),asset=identifier(mediaAssetIdSchema,100),key=identifier(idempotencyKeySchema,128),sha=hashSchema.refine(v=>v.length===64),rev=revisionSchema;
const coreSchema=uploadCoreSchema.refine(v=>key.safeParse(v.requestId).success);
const partSchema=partReceiptSchema.refine(v=>sha.safeParse(v.sha256).success);
const actorsSchema=trustedUploadActorsSchema;
const metadataSchema=metadataBindingSchema.refine(v=>sha.safeParse(v.metadataDigest).success);
const exact=fields=>z.strictObject(fields),lit=z.literal;
const owned=fields=>exact({contractRevision:lit(2),...fields});
const integer=max=>z.number().int().min(0).max(max);
const time=integer(Number.MAX_SAFE_INTEGER-UPLOAD_LIMITS.intentExpiryMs),kind=z.enum(['IMAGE','PDF','VIDEO']);
const count=integer(32),index=integer(31),positiveBytes=integer(MEDIA_UPLOAD_CAPS.VIDEO.inputBytes).min(1);
const gen=z.string().regex(/^[1-9][0-9]{0,127}$/).refine(v=>v.length<=128&&!/[^0-9]/.test(v));
const hash=value=>createHash('sha256').update(canonicalJson(value),'utf8').digest('hex');
const same=(a,b)=>canonicalJson(a)===canonicalJson(b);
const fail=(code='REVISION_CONFLICT')=>{throw new ApiError(code);};
const demand=(condition,code='REVISION_CONFLICT')=>{if(!condition)fail(code);};
const copy=value=>structuredClone(value);
function plus(value,amount=1){demand(Number.isSafeInteger(value)&&Number.isSafeInteger(amount)&&amount>=0&&value<=MAX_REVISION-amount);return value+amount;}
function partsCount(core){return Math.ceil(core.inputBytes/UPLOAD_LIMITS.partBytes);}
function partFits(part,core){return part.index<partsCount(core)&&part.offsetBytes===part.index*UPLOAD_LIMITS.partBytes&&part.sizeBytes===Math.min(UPLOAD_LIMITS.partBytes,core.inputBytes-part.offsetBytes);}

/** C0 owns descriptor-safe JSON, including rejecting null-prototype objects. */
function safeJson(value){assertUploadJsonSize(value);}
function parse(schema,value,code='VALIDATION_ERROR'){
 const result=schema.safeParse(value);if(!result.success)fail(code);return result.data;
}
/** Delegate strict validation inside the public gate so schema errors use safe ApiError422.
 * The output stage receives only the already parsed strict value, never unchecked JSON. */
function publicSchema(schema){return z.preprocess(value=>{safeJson(value);return parse(schema,value);},z.unknown());}
const identityFor=operation=>exact({actorUid:id,operation:lit(operation),resourceId:operation==='UPLOAD_CREATE'?lit('MEDIA_UPLOADS'):asset,requestId:key,...(operation==='UPLOAD_PART'?{partIndex:index}:{})});
const createIdentity=identityFor('UPLOAD_CREATE'),partIdentity=identityFor('UPLOAD_PART'),completeIdentity=identityFor('UPLOAD_COMPLETE'),cancelIdentity=identityFor('UPLOAD_CANCEL');
const identitySchema=z.union([createIdentity,partIdentity,completeIdentity,cancelIdentity]);
const headerSchema=owned({intentId:id,assetId:asset,actors:actorsSchema,core:coreSchema,metadataBinding:metadataSchema,state:z.enum(['UPLOADING','QUEUED','CANCELLED']),revision:rev,createdAtMs:time,expiresAtMs:time}).refine(h=>h.expiresAtMs-h.createdAtMs===UPLOAD_LIMITS.intentExpiryMs);
const descriptorSchema=exact({id,assetId:asset,uploaderUid:id,kind,purpose:lit('UPLOAD'),attempt:lit(0),inputBytes:positiveBytes,jobId:lit(null)}).refine(d=>d.inputBytes<=MEDIA_UPLOAD_CAPS[d.kind].inputBytes);
const contentSchema=exact({sizeBytes:positiveBytes,sha256:sha});
const declarationSchema=exact({effectId:id,writerId:id,budgetBytes:positiveBytes,content:contentSchema}).refine(d=>d.budgetBytes===d.content.sizeBytes);
const tupleSchema=exact({reservationId:id,assetId:asset,uploaderUid:id,kind,attempt:lit(0),effectId:id,writerId:id,fingerprint:sha});
const effectSchema=exact({effectId:id,writerId:id,fingerprint:sha,phase:z.enum(['RESERVED','UNCERTAIN','RETAINED','ABSENT']),generation:gen.nullable(),proofId:id.nullable(),unknownProofId:id.nullable()}).refine(e=>{
 if(e.phase==='RESERVED')return e.generation===null&&e.proofId===null&&e.unknownProofId===null;
 if(e.phase==='UNCERTAIN')return e.generation===null&&e.proofId===null&&e.unknownProofId!==null;
 if(e.phase==='RETAINED')return e.generation!==null&&e.proofId!==null;
 return e.generation===null&&e.proofId!==null;
});
const partRowSchema=exact({partId:id,part:partSchema,writer:exact({actorUid:id,requestId:key}),effect:effectSchema,acceptedAtRevision:rev.nullable()});
const frozenInputSchema=frozenInputV2Schema;
const completionSchema=exact({identity:completeIdentity,requestHash:sha,orderedPartsSha256:sha,input:frozenInputSchema,allocatedJobId:id,originalId:id,originalBytesProofId:id,processingProofId:id,effect:effectSchema,queuedAtRevision:rev.nullable()});
const rawRecord=owned({intentHeader:headerSchema,metadataProofId:id,reservationDescriptor:descriptorSchema,reservationFingerprint:sha,parts:z.array(partRowSchema).max(32),completion:completionSchema.nullable()}).refine(recordRelations);
const createAllocation=exact({assetId:asset,intentId:id,reservationId:id,createdAtMs:time});
const partAllocation=exact({partId:id,effectId:id,writerId:id});
const originalAllocation=exact({originalId:id,effectId:id,writerId:id,allocatedJobId:id,inputFingerprint:sha,orderedPartsSha256:sha});
const createRequest=exact({identity:createIdentity,core:coreSchema,metadataDigest:sha,actors:actorsSchema});
const partRequest=exact({identity:partIdentity,expectedIntentRevision:rev,part:partSchema});
const completeRequest=exact({identity:completeIdentity,expectedIntentRevision:rev});
const cancelRequest=exact({identity:cancelIdentity,expectedIntentRevision:rev});
// Select the identity operation before parsing guarded nested fields. Trying the
// CREATE parser against PART/COMPLETE would throw on absent core/actors and abort the union.
const requestVariant=(operation,schema)=>z.unknown().refine(value=>value?.identity?.operation===operation).pipe(schema);
const requestSchema=z.union([requestVariant('UPLOAD_CREATE',createRequest),requestVariant('UPLOAD_PART',partRequest),requestVariant('UPLOAD_COMPLETE',completeRequest),requestVariant('UPLOAD_CANCEL',cancelRequest)]);
const receiptSchema=privateReceiptSchema.refine(asciiTypedStrings);
const rawOperation=owned({receipt:receiptSchema,request:requestSchema,allocation:z.union([createAllocation,partAllocation,originalAllocation,lit(null)]),allocationHash:sha}).refine(operationRelations);

const createAuth=owned({verification:lit('MEDIA_UPLOAD_CREATE_AUTHORIZED'),actorUid:id,role:z.enum(['OWNER','UPLOADER']),uploaderUid:id,proofId:id});
const intentAuth=owned({verification:lit('MEDIA_UPLOAD_MUTATION_AUTHORIZED'),operation:z.enum(['UPLOAD_PART','UPLOAD_CANCEL']),actorUid:id,role:z.enum(['OWNER','UPLOADER']),uploaderUid:id,assetId:asset,intentId:id,proofId:id});
const completeAuth=owned({verification:lit('MEDIA_UPLOAD_COMPLETE_AUTHORIZED'),actorUid:id,role:z.enum(['OWNER','UPLOADER']),uploaderUid:id,assetId:asset,intentId:id,proofId:id});
const metadataFactSchema=uploadMetadataFactV2Schema;
const partBytesSchema=owned({verification:lit('PART_BYTES_HASHED'),assetId:asset,intentId:id,part:partSchema,proofId:id});
const originalBytesSchema=owned({verification:lit('ORDERED_ORIGINAL_BYTES_HASHED'),assetId:asset,intentId:id,inputBytes:positiveBytes,orderedPartsSha256:sha,originalSha256:sha,proofId:id});
const processingFactSchema=owned({verification:lit('PROCESSING_INPUT_BOUND'),assetId:asset,intentId:id,actors:actorsSchema,input:frozenInputSchema,metadataDigest:sha,proofId:id});
const mappingSchema=exact({assetId:asset,intentId:id});
const createQGuard=exact({type:lit('CREATE'),quotaRevision:rev,reservationTupleAbsent:exact({assetId:asset,purpose:lit('UPLOAD'),attempt:lit(0)}),reservationIdAbsent:id});
const updateQGuard=exact({type:lit('UPDATE'),quotaRevision:rev,reservationId:id,reservationRevision:rev});
const quotaCreateSchema=owned({verification:lit('QUOTA_UPLOAD_PLANNED'),operation:lit('RESERVE_UPLOAD'),action:lit('APPLY'),guards:createQGuard,descriptor:descriptorSchema,fingerprint:sha,nextQuotaRevision:rev,reservationRevision:lit(0),state:lit('OPEN'),freeReservedBytes:integer(UPLOAD_LIMITS.retainedBytes),holdsActiveSlot:lit(true),proofId:id});
const quotaWriteSchema=owned({verification:lit('QUOTA_WRITE_PLANNED'),operation:lit('CLAIM_WRITE'),action:lit('APPLY'),guards:updateQGuard,reservation:descriptorSchema,declaration:declarationSchema,fingerprint:sha,nextQuotaRevision:rev,nextReservationRevision:rev,proofId:id});
const targetSchema=exact({identity:identitySchema,assetId:asset,intentId:id,objectId:id,partIndex:index.nullable()});
const retainedResult=exact({verification:lit('WRITE_RETAINED_AND_QUIESCENT'),tuple:tupleSchema,content:exact({sizeBytes:positiveBytes,sha256:sha,generation:gen}),proofId:id});
const absentResult=exact({verification:lit('WRITE_ABSENT_AND_QUIESCENT'),tuple:tupleSchema,proofId:id});
const unknownResult=exact({verification:lit('UPLOAD_WRITE_OUTCOME_UNKNOWN'),tuple:tupleSchema,proofId:id});
const knownResult=z.union([retainedResult,absentResult]);
const outcomeSchema=owned({target:targetSchema,result:z.union([retainedResult,absentResult,unknownResult])});
const queueBindingSchema=owned({identity:completeIdentity,assetId:asset,intentId:id,actors:actorsSchema,uploaderUid:id,expectedPostIntentRevision:rev,allocatedJobId:id,input:frozenInputSchema,metadataDigest:sha});
const contextSchema=exact({record:z.unknown().nullable(),operation:z.unknown().nullable(),nowMs:time,quotaObservation:exact({quotaRevision:rev,reservationRevision:rev.nullable()}).nullable()});

function writerIdentity(r,row){return {actorUid:row.writer.actorUid,operation:'UPLOAD_PART',resourceId:r.intentHeader.assetId,requestId:row.writer.requestId,partIndex:row.part.index};}
function acceptedReference(r,row){return {partId:row.partId,assetId:r.intentHeader.assetId,intentId:r.intentHeader.intentId,part:row.part,writerIdentity:writerIdentity(r,row)};}
function sortedRows(r){return [...r.parts].sort((a,b)=>a.part.index-b.part.index);}
function orderedPartsHash(r){const h=r.intentHeader;return hash({assetId:h.assetId,intentId:h.intentId,parts:sortedRows(r).map(row=>({partId:row.partId,...row.part,generation:row.effect.generation,writerIdentity:writerIdentity(r,row)}))});}
function declarationFor(r,row,original=false){return {effectId:row.effect.effectId,writerId:row.effect.writerId,budgetBytes:original?r.intentHeader.core.inputBytes:row.part.sizeBytes,content:{sizeBytes:original?r.intentHeader.core.inputBytes:row.part.sizeBytes,sha256:original?row.input.originalSha256:row.part.sha256}};}
function tupleFor(r,row){const d=r.reservationDescriptor,e=row.effect;return {reservationId:d.id,assetId:d.assetId,uploaderUid:d.uploaderUid,kind:d.kind,attempt:0,effectId:e.effectId,writerId:e.writerId,fingerprint:e.fingerprint};}
function targetFor(r,row,original=false){return {identity:original?row.identity:writerIdentity(r,row),assetId:r.intentHeader.assetId,intentId:r.intentHeader.intentId,objectId:original?row.originalId:row.partId,partIndex:original?null:row.part.index};}
function storedOutcome(r,row,original=false,unknown=false){
 const e=row.effect,target=targetFor(r,row,original),tuple=tupleFor(r,row);
 if(unknown||e.phase==='UNCERTAIN')return {contractRevision:2,target,result:{verification:'UPLOAD_WRITE_OUTCOME_UNKNOWN',tuple,proofId:e.unknownProofId}};
 if(e.phase==='ABSENT')return {contractRevision:2,target,result:{verification:'WRITE_ABSENT_AND_QUIESCENT',tuple,proofId:e.proofId}};
 return {contractRevision:2,target,result:{verification:'WRITE_RETAINED_AND_QUIESCENT',tuple,content:{...declarationFor(r,row,original).content,generation:e.generation},proofId:e.proofId}};
}
function allAccepted(r){return r.parts.length===partsCount(r.intentHeader.core)&&sortedRows(r).every((p,n)=>p.part.index===n&&p.acceptedAtRevision!==null&&p.effect.phase==='RETAINED');}
function inputAllocationHash(c){return hash({input:c.input,originalBytesProofId:c.originalBytesProofId,processingProofId:c.processingProofId});}
function recordRelations(r){
 const h=r.intentHeader,d=r.reservationDescriptor,c=r.completion;
 if(d.assetId!==h.assetId||d.uploaderUid!==h.actors.uploaderUid||d.kind!==h.core.kind||d.inputBytes!==h.core.inputBytes||r.reservationFingerprint!==hash(d))return false;
 if(r.parts.length>partsCount(h.core))return false;
 const indices=new Set(),objects=new Set(),effects=new Set();
 for(const row of r.parts){
  if(!partFits(row.part,h.core)||indices.has(row.part.index)||objects.has(row.partId)||effects.has(row.effect.effectId))return false;
  indices.add(row.part.index);objects.add(row.partId);effects.add(row.effect.effectId);
  if(row.effect.fingerprint!==hash({reservation:d,declaration:declarationFor(r,row)}))return false;
  if(row.acceptedAtRevision!==null&&(row.effect.phase!=='RETAINED'||row.acceptedAtRevision>h.revision))return false;
 }
 if(c!==null){
  if(!allAccepted(r)||objects.has(c.originalId)||effects.has(c.effect.effectId)||c.identity.resourceId!==h.assetId)return false;
  if(c.input.assetId!==h.assetId||c.input.kind!==h.core.kind||c.input.inputBytes!==h.core.inputBytes||c.orderedPartsSha256!==orderedPartsHash(r))return false;
  if(c.effect.fingerprint!==hash({reservation:d,declaration:declarationFor(r,c,true)}))return false;
 }
 if(h.state==='QUEUED')return c!==null&&allAccepted(r)&&c.effect.phase==='RETAINED'&&c.queuedAtRevision===h.revision;
 return c===null||c.queuedAtRevision===null;
}
function asciiTypedStrings(value){
 if(typeof value==='string')return !/[^\x20-\x7e]/.test(value);
 if(Array.isArray(value))return value.every(asciiTypedStrings);
 if(value!==null&&typeof value==='object')return Object.values(value).every(asciiTypedStrings);
 return true;
}
function operationRelations(o){
 const i=o.request.identity,a=o.allocation,p=o.receipt.publicReceipt;
 // Zod can continue parent refinements after nullable child relation failures.
 if(o.receipt.status==='SETTLED'&&p===null)return false;
 if(o.receipt.status==='IN_FLIGHT'&&(p!==null||o.receipt.acceptedPart!==null))return false;
 if(p!==null&&(p.operation!==i.operation||p.requestId!==i.requestId))return false;
 if(i.operation==='UPLOAD_PART'&&o.receipt.status==='SETTLED'&&o.receipt.acceptedPart===null)return false;
 if(i.operation!=='UPLOAD_PART'&&o.receipt.acceptedPart!==null)return false;
 if(!same(o.receipt.identity,i)||o.receipt.retryRequest!==null||o.receipt.fingerprint!==hash(o.request)||o.allocationHash!==hash(a))return false;
 if(i.operation==='UPLOAD_CREATE')return a!==null&&createAllocation.safeParse(a).success&&o.request.core.requestId===i.requestId&&o.request.actors.uploaderUid===i.actorUid&&(p===null||(p.assetId===a.assetId&&p.intentId===a.intentId));
 if(i.operation==='UPLOAD_PART')return a!==null&&partAllocation.safeParse(a).success&&o.request.part.index===i.partIndex&&(p===null||(o.receipt.acceptedPart!==null&&p.acceptedPartId===a.partId&&same(o.receipt.acceptedPart.part,o.request.part)));
 if(i.operation==='UPLOAD_COMPLETE')return a!==null&&originalAllocation.safeParse(a).success&&(p===null||p.jobId===a.allocatedJobId);
 return a===null;
}
function operationMatchesRecord(o,r){
 if(!operationRelations(o))return false;
 const h=r.intentHeader,i=o.request.identity,a=o.allocation,p=o.receipt.publicReceipt;
 if(p!==null&&(p.assetId!==h.assetId||p.intentId!==h.intentId||p.revision>h.revision||p.partCount!==partsCount(h.core)||p.acceptedParts>r.parts.filter(row=>row.acceptedAtRevision!==null).length))return false;
 if(i.operation==='UPLOAD_CREATE')return same(o.request.core,h.core)&&same(o.request.actors,h.actors)&&o.request.metadataDigest===h.metadataBinding.metadataDigest&&same(a,{assetId:h.assetId,intentId:h.intentId,reservationId:r.reservationDescriptor.id,createdAtMs:h.createdAtMs});
 if(i.resourceId!==h.assetId||o.request.expectedIntentRevision>h.revision)return false;
 if(i.operation==='UPLOAD_PART'){
  const row=r.parts.find(v=>v.part.index===i.partIndex);if(!row||!same(o.request.part,row.part)||!same(a,{partId:row.partId,effectId:row.effect.effectId,writerId:row.effect.writerId}))return false;
  if(o.receipt.status==='IN_FLIGHT')return o.request.expectedIntentRevision<h.revision&&row.acceptedAtRevision===null&&same(i,writerIdentity(r,row));
  return row.acceptedAtRevision!==null&&p!==null&&o.receipt.acceptedPart!==null&&p.revision>=row.acceptedAtRevision&&same(o.receipt.acceptedPart,acceptedReference(r,row));
 }
 if(i.operation==='UPLOAD_COMPLETE'){
  const c=r.completion;if(!c||o.request.expectedIntentRevision>=h.revision||!same(i,c.identity)||o.receipt.fingerprint!==c.requestHash)return false;
  if(!same(a,{originalId:c.originalId,effectId:c.effect.effectId,writerId:c.effect.writerId,allocatedJobId:c.allocatedJobId,inputFingerprint:inputAllocationHash(c),orderedPartsSha256:c.orderedPartsSha256}))return false;
  return o.receipt.status==='SETTLED'?h.state==='QUEUED'&&p!==null&&p.revision===c.queuedAtRevision:h.state!=='QUEUED';
 }
 return o.request.expectedIntentRevision<h.revision&&o.receipt.status==='SETTLED'&&h.state==='CANCELLED';
}

export const uploadRecordSchema=publicSchema(rawRecord);
export const operationRecordSchema=publicSchema(rawOperation);
/** Accepted parts only; never turn a header or opaque facts into current authorization. */
export function projectIntentSnapshot(value){safeJson(value);const r=parse(rawRecord,value);return parse(intentSnapshotSchema,project(r));}
function project(r){return {...r.intentHeader,parts:sortedRows(r).filter(row=>row.acceptedAtRevision!==null).map(row=>row.part)};}

const intentGuard=exact({assetId:asset,intentId:id,revision:rev,state:z.enum(['UPLOADING','CANCELLED'])});
const operationGuard=exact({identity:identitySchema,requestHash:sha,allocationHash:sha,status:lit('IN_FLIGHT')});
const guardSchema=z.union([
 exact({type:lit('CREATE_UPLOAD'),intentIdAbsent:id,assetIdAbsent:asset,assetIntentMappingAbsent:mappingSchema,operationAbsent:createIdentity,quota:createQGuard}),
 exact({type:lit('BEGIN_PART'),intent:intentGuard,operationAbsent:partIdentity,partIndexAbsent:index,allocatedPartIdAbsent:id,completionAbsent:lit(true),quota:updateQGuard}),
 exact({type:lit('REUSE_PART'),intent:intentGuard,operationAbsent:partIdentity,acceptedPartId:id,acceptedPartFingerprint:sha,completionAbsent:lit(true)}),
 exact({type:lit('OBSERVE_WRITE'),target:z.enum(['PART','ORIGINAL']),intent:intentGuard,operation:operationGuard,targetRef:targetSchema,previousPhase:z.enum(['RESERVED','UNCERTAIN']),tuple:tupleSchema,quota:updateQGuard}),
 exact({type:lit('BEGIN_COMPLETE'),intent:intentGuard,operationAbsent:completeIdentity,completionAbsent:lit(true),orderedPartsSha256:sha,allocatedOriginalIdAbsent:id,allocatedJobIdAbsent:id,jobMappingAbsent:mappingSchema,quota:updateQGuard}),
 exact({type:lit('COMPLETE_UPLOAD'),intent:intentGuard,operation:operationGuard,originalRetained:exact({effectId:id,fingerprint:sha,outcomeSha256:sha}),orderedPartsSha256:sha,jobMappingAbsent:mappingSchema,allocatedJobIdAbsent:id,queueReceiptAbsent:completeIdentity}),
 exact({type:lit('CANCEL_UPLOAD'),intent:intentGuard,operationAbsent:cancelIdentity}),
 exact({type:lit('REPLAY'),identity:identitySchema,requestHash:sha,allocationHash:sha,observedIntentRevision:rev}),
 exact({type:lit('REPLAY'),identity:identitySchema,requestHash:sha,allocationHash:sha,observedIntentRevision:rev,targetRef:targetSchema,outcomeSha256:sha,operationStatus:z.enum(['IN_FLIGHT','SETTLED'])})
]);
const qClaimCommand=exact({reservation:descriptorSchema,expectedQuotaRevision:rev,expectedReservationRevision:rev,declaration:declarationSchema,fingerprint:sha});
const qTupleCommand=exact({tuple:tupleSchema,expectedQuotaRevision:rev,expectedReservationRevision:rev});
const qReleaseCommand=exact({reservation:descriptorSchema,expectedQuotaRevision:rev,expectedReservationRevision:rev});
const quotaRequirementSchema=z.union([
 exact({operation:lit('RESERVE_UPLOAD'),command:exact({descriptor:descriptorSchema,fingerprint:sha,expectedQuotaRevision:rev}),guards:createQGuard}),
 exact({operation:lit('CLAIM_WRITE'),command:qClaimCommand,guards:updateQGuard}),
 exact({operation:lit('MARK_UNCERTAIN'),command:qTupleCommand,guards:updateQGuard}),
 exact({operation:lit('SETTLE_WRITE'),command:qTupleCommand,outcome:knownResult,guards:updateQGuard}),
 exact({operation:lit('RELEASE_UNUSED'),command:qReleaseCommand,guards:updateQGuard})
]);
const plannedWriteSchema=owned({verification:lit('WRITE_DECLARATION_PLANNED'),target:targetSchema,tuple:tupleSchema,declaration:declarationSchema});
const queuedHeader=headerSchema.refine(h=>h.state==='QUEUED');
const queueCommand=exact({identity:completeIdentity,expectedIntentRevision:rev,allocatedJobId:id,intentId:id,input:frozenInputSchema,uploaderUid:id,metadataDigest:sha});
const originalProjection=owned({verification:lit('UPLOAD_ORIGINAL_COMPLETE'),assetId:asset,intentId:id,intentRevision:rev,uploaderUid:id,kind,originalSha256:sha,inputBytes:positiveBytes,metadataDigest:sha,proofId:id});
const jCreateGuard=exact({type:lit('CREATE_JOB'),jobMappingAbsent:mappingSchema,allocatedJobIdAbsent:id,queueReceiptAbsent:completeIdentity,requestHash:sha,intent:exact({assetId:asset,intentId:id,revision:rev,state:lit('QUEUED')})});
const jointQueueSchema=owned({type:lit('JOINT_UPLOAD_COMPLETE_AND_QUEUE'),postIntent:exact({source:lit('U1_NEXT_RECORD'),header:queuedHeader,acceptedParts:count,partsSha256:sha,intentSha256:sha}),command:queueCommand,original:originalProjection,authorization:completeAuth,guard:jCreateGuard});
const rawPlan=owned({operation:z.enum(['CREATE','BEGIN_PART','RECORD_PART','BEGIN_COMPLETE','RECORD_ORIGINAL','COMPLETE','CANCEL']),action:z.enum(['APPLY','REUSE_PART','REPLAY','REPLAY_EFFECT']),guards:guardSchema,nextRecord:rawRecord,nextOperation:rawOperation,quotaRequirement:quotaRequirementSchema.nullable(),queueRequirement:jointQueueSchema.nullable(),afterCommitWrite:plannedWriteSchema.nullable(),requires:exact({atomicCommit:lit(true)})}).refine(planRelations);
export const uploadPlanSchema=publicSchema(rawPlan);

function intentGuardFor(r){const h=r.intentHeader;return {assetId:h.assetId,intentId:h.intentId,revision:h.revision,state:h.state};}
function operationGuardFor(o){return {identity:o.receipt.identity,requestHash:o.receipt.fingerprint,allocationHash:o.allocationHash,status:'IN_FLIGHT'};}
function mapping(r){return {assetId:r.intentHeader.assetId,intentId:r.intentHeader.intentId};}
function claimRequirement(r,row,original,g){const declaration=declarationFor(r,row,original);return {operation:'CLAIM_WRITE',command:{reservation:r.reservationDescriptor,expectedQuotaRevision:g.quotaRevision,expectedReservationRevision:g.reservationRevision,declaration,fingerprint:row.effect.fingerprint},guards:g};}
function observationRequirement(r,row,original,g){const result=storedOutcome(r,row,original).result;return {operation:row.effect.phase==='UNCERTAIN'?'MARK_UNCERTAIN':'SETTLE_WRITE',command:{tuple:tupleFor(r,row),expectedQuotaRevision:g.quotaRevision,expectedReservationRevision:g.reservationRevision},...(row.effect.phase==='UNCERTAIN'?{}:{outcome:result}),guards:g};}
function writeProjection(r,row,original=false){return {contractRevision:2,verification:'WRITE_DECLARATION_PLANNED',target:targetFor(r,row,original),tuple:tupleFor(r,row),declaration:declarationFor(r,row,original)};}
function jointQueue(r,authorization){
 const h=r.intentHeader,c=r.completion,post=project(r),m=mapping(r);
 return {contractRevision:2,type:'JOINT_UPLOAD_COMPLETE_AND_QUEUE',postIntent:{source:'U1_NEXT_RECORD',header:h,acceptedParts:post.parts.length,partsSha256:hash(post.parts),intentSha256:hash(post)},command:{identity:c.identity,expectedIntentRevision:h.revision,allocatedJobId:c.allocatedJobId,intentId:h.intentId,input:c.input,uploaderUid:h.actors.uploaderUid,metadataDigest:h.metadataBinding.metadataDigest},original:{contractRevision:2,verification:'UPLOAD_ORIGINAL_COMPLETE',assetId:h.assetId,intentId:h.intentId,intentRevision:h.revision,uploaderUid:h.actors.uploaderUid,kind:h.core.kind,originalSha256:c.input.originalSha256,inputBytes:h.core.inputBytes,metadataDigest:h.metadataBinding.metadataDigest,proofId:c.effect.proofId},authorization,guard:{type:'CREATE_JOB',jobMappingAbsent:m,allocatedJobIdAbsent:c.allocatedJobId,queueReceiptAbsent:c.identity,requestHash:hash({expectedIntentRevision:h.revision,input:c.input,metadataDigest:h.metadataBinding.metadataDigest}),intent:{...m,revision:h.revision,state:'QUEUED'}}};
}
function qGuardFits(g,r){return g.type==='UPDATE'&&g.reservationId===r.reservationDescriptor.id;}
function receiptAtCurrent(o,r){const p=o.receipt.publicReceipt,h=r.intentHeader;return p!==null&&p.revision===h.revision&&p.state===h.state&&p.acceptedParts===r.parts.filter(row=>row.acceptedAtRevision!==null).length;}
function liveOldGuard(g,r,increment=true){const h=r.intentHeader;return g.assetId===h.assetId&&g.intentId===h.intentId&&g.state==='UPLOADING'&&(increment?g.revision<MAX_REVISION&&g.revision+1===h.revision:g.revision===h.revision);}
function knownReplayHash(r,row,original,digest){return (row.effect.phase!=='RESERVED'&&digest===hash(storedOutcome(r,row,original)))||(row.effect.unknownProofId!==null&&digest===hash(storedOutcome(r,row,original,true)));}
/** Crosslinks are bounded structural predicates. Guards lack the full old snapshot;
 * these checks cannot prove historical preservation or actual compare-and-swap execution.
 */
function planRelations(p){
 const r=p.nextRecord,o=p.nextOperation,h=r.intentHeader,g=p.guards,q=p.quotaRequirement,w=p.afterCommitWrite,j=p.queueRequirement,i=o.receipt.identity;
 if(!recordRelations(r)||!operationMatchesRecord(o,r))return false;
 const operationMap={CREATE:'UPLOAD_CREATE',BEGIN_PART:'UPLOAD_PART',RECORD_PART:'UPLOAD_PART',BEGIN_COMPLETE:'UPLOAD_COMPLETE',RECORD_ORIGINAL:'UPLOAD_COMPLETE',COMPLETE:'UPLOAD_COMPLETE',CANCEL:'UPLOAD_CANCEL'};
 if(i.operation!==operationMap[p.operation])return false;
 if(p.action==='REPLAY'||p.action==='REPLAY_EFFECT'){
  if(g.type!=='REPLAY'||!same(g.identity,i)||g.requestHash!==o.receipt.fingerprint||g.allocationHash!==o.allocationHash||g.observedIntentRevision!==h.revision||q!==null||w!==null||j!==null)return false;
  if(p.action==='REPLAY')return o.receipt.status==='SETTLED'&&!Object.hasOwn(g,'targetRef')&&!['RECORD_PART','RECORD_ORIGINAL'].includes(p.operation);
  if(!['RECORD_PART','RECORD_ORIGINAL'].includes(p.operation)||!Object.hasOwn(g,'targetRef')||g.operationStatus!==o.receipt.status)return false;
  const original=p.operation==='RECORD_ORIGINAL',row=original?r.completion:r.parts.find(row=>row.part.index===i.partIndex);
  return row!=null&&same(g.targetRef,targetFor(r,row,original))&&knownReplayHash(r,row,original,g.outcomeSha256);
 }
 if(p.action==='REUSE_PART'){
  if(p.operation!=='BEGIN_PART'||g.type!=='REUSE_PART'||!liveOldGuard(g.intent,r,false)||!same(g.operationAbsent,i)||r.completion!==null||q!==null||w!==null||j!==null||!receiptAtCurrent(o,r))return false;
  return o.receipt.status==='SETTLED'&&o.receipt.acceptedPart!==null&&g.acceptedPartId===o.receipt.acceptedPart.partId&&g.acceptedPartFingerprint===hash(o.receipt.acceptedPart)&&o.request.expectedIntentRevision===g.intent.revision;
 }
 if(p.action!=='APPLY')return false;
 if(p.operation==='CREATE'){
  const d=r.reservationDescriptor;
  return g.type==='CREATE_UPLOAD'&&h.state==='UPLOADING'&&h.revision===0&&r.parts.length===0&&r.completion===null&&g.intentIdAbsent===h.intentId&&g.assetIdAbsent===h.assetId&&same(g.assetIntentMappingAbsent,mapping(r))&&same(g.operationAbsent,i)&&g.quota.reservationIdAbsent===d.id&&same(g.quota.reservationTupleAbsent,{assetId:h.assetId,purpose:'UPLOAD',attempt:0})&&g.quota.quotaRevision<MAX_REVISION&&o.receipt.status==='SETTLED'&&receiptAtCurrent(o,r)&&same(q,{operation:'RESERVE_UPLOAD',command:{descriptor:d,fingerprint:r.reservationFingerprint,expectedQuotaRevision:g.quota.quotaRevision},guards:g.quota})&&w===null&&j===null;
 }
 if(p.operation==='BEGIN_PART'){
  if(g.type!=='BEGIN_PART'||!liveOldGuard(g.intent,r)||h.state!=='UPLOADING'||r.completion!==null||!same(g.operationAbsent,i)||g.partIndexAbsent!==i.partIndex||!qGuardFits(g.quota,r)||g.quota.reservationRevision>=MAX_REVISION||o.request.expectedIntentRevision!==g.intent.revision||o.receipt.status!=='IN_FLIGHT'||j!==null)return false;
  const row=r.parts.find(v=>v.part.index===i.partIndex);
  return row!=null&&row.partId===g.allocatedPartIdAbsent&&row.effect.phase==='RESERVED'&&row.acceptedAtRevision===null&&same(i,writerIdentity(r,row))&&same(w,writeProjection(r,row))&&same(q,claimRequirement(r,row,false,g.quota));
 }
 if(p.operation==='BEGIN_COMPLETE'){
  const c=r.completion;
  return g.type==='BEGIN_COMPLETE'&&liveOldGuard(g.intent,r)&&h.state==='UPLOADING'&&c!==null&&c.effect.phase==='RESERVED'&&o.receipt.status==='IN_FLIGHT'&&same(g.operationAbsent,i)&&o.request.expectedIntentRevision===g.intent.revision&&g.orderedPartsSha256===c.orderedPartsSha256&&g.allocatedOriginalIdAbsent===c.originalId&&g.allocatedJobIdAbsent===c.allocatedJobId&&same(g.jobMappingAbsent,mapping(r))&&qGuardFits(g.quota,r)&&g.quota.reservationRevision<MAX_REVISION&&same(q,claimRequirement(r,c,true,g.quota))&&same(w,writeProjection(r,c,true))&&j===null;
 }
 if(p.operation==='RECORD_PART'||p.operation==='RECORD_ORIGINAL'){
  const original=p.operation==='RECORD_ORIGINAL',row=original?r.completion:r.parts.find(v=>v.part.index===i.partIndex);
  if(g.type!=='OBSERVE_WRITE'||row==null||g.target!==(original?'ORIGINAL':'PART')||g.intent.assetId!==h.assetId||g.intent.intentId!==h.intentId||g.intent.state!==h.state||g.intent.revision>=MAX_REVISION||g.intent.revision+1!==h.revision||!same(g.operation,operationGuardFor(o))||!same(g.targetRef,targetFor(r,row,original))||!same(g.tuple,tupleFor(r,row))||row.effect.phase==='RESERVED'||!qGuardFits(g.quota,r)||w!==null||j!==null)return false;
  if(g.previousPhase==='UNCERTAIN'&&(row.effect.unknownProofId===null||row.effect.phase==='UNCERTAIN'))return false;
  if(g.previousPhase==='RESERVED'&&row.effect.phase!=='UNCERTAIN'&&row.effect.unknownProofId!==null)return false;
  if(original&&o.receipt.status!=='IN_FLIGHT')return false;
  if(!original){
   if(row.acceptedAtRevision!==null){if(h.state!=='UPLOADING'||row.acceptedAtRevision!==h.revision||o.receipt.status!=='SETTLED'||!receiptAtCurrent(o,r))return false;}
   else if(o.receipt.status!=='IN_FLIGHT')return false;
  }
  return same(q,observationRequirement(r,row,original,g.quota));
 }
 if(p.operation==='COMPLETE'){
  const c=r.completion;
  if(g.type!=='COMPLETE_UPLOAD'||!liveOldGuard(g.intent,r)||h.state!=='QUEUED'||c===null||c.effect.phase!=='RETAINED'||!same(g.operation,operationGuardFor(o))||g.orderedPartsSha256!==c.orderedPartsSha256||!same(g.jobMappingAbsent,mapping(r))||g.allocatedJobIdAbsent!==c.allocatedJobId||!same(g.queueReceiptAbsent,i)||!same(g.originalRetained,{effectId:c.effect.effectId,fingerprint:c.effect.fingerprint,outcomeSha256:hash(storedOutcome(r,c,true))})||q!==null||w!==null||j===null||o.receipt.status!=='SETTLED'||!receiptAtCurrent(o,r))return false;
  const a=j.authorization;
  if(a.actorUid!==i.actorUid||a.uploaderUid!==h.actors.uploaderUid||a.assetId!==h.assetId||a.intentId!==h.intentId||(a.role==='UPLOADER'&&a.actorUid!==a.uploaderUid))return false;
  return same(j,jointQueue(r,a));
 }
 if(p.operation==='CANCEL'){
  if(g.type!=='CANCEL_UPLOAD'||!liveOldGuard(g.intent,r)||h.state!=='CANCELLED'||!same(g.operationAbsent,i)||o.request.expectedIntentRevision!==g.intent.revision||o.receipt.status!=='SETTLED'||!receiptAtCurrent(o,r)||q===null||q.operation!=='RELEASE_UNUSED'||!qGuardFits(q.guards,r)||w!==null||j!==null)return false;
  return same(q.command,{reservation:r.reservationDescriptor,expectedQuotaRevision:q.guards.quotaRevision,expectedReservationRevision:q.guards.reservationRevision});
 }
 return false;
}

function envelope(value,fields){
 safeJson(value);
 if(value===null||Array.isArray(value)||typeof value!=='object')fail('VALIDATION_ERROR');
 for(const name of Object.keys(fields))if(name!=='authorization'&&!Object.hasOwn(value,name))fail('VALIDATION_ERROR');
 return parse(exact({...fields,authorization:z.unknown().optional()}),value);
}
function context(value){
 const c=parse(contextSchema,value);
 for(const field of ['record','operation','nowMs','quotaObservation'])if(!Object.hasOwn(value,field))fail('VALIDATION_ERROR');
 c.record=c.record===null?null:parse(rawRecord,c.record,'INTERNAL_ERROR');
 c.operation=c.operation===null?null:parse(rawOperation,c.operation,'INTERNAL_ERROR');
 if(c.operation!==null)demand(c.record!==null&&operationMatchesRecord(c.operation,c.record),'INTERNAL_ERROR');
 return c;
}
function currentAuthorization(i,value,schema){
 const a=parse(schema,value,'FORBIDDEN');
 demand(a.actorUid===i.actorUid&&(a.role!=='UPLOADER'||a.actorUid===a.uploaderUid),'FORBIDDEN');
 if(i.operation==='UPLOAD_CREATE')demand(a.actorUid===a.uploaderUid,'FORBIDDEN');
 else{demand(a.assetId===i.resourceId,'FORBIDDEN');if(schema===intentAuth)demand(a.operation===i.operation,'FORBIDDEN');}
 return a;
}
function authorizedContext(value,i,authorization,schema,internal=false){
 const a=currentAuthorization(i,authorization,schema),c=context(value);
 authorize(c,i,a,schema,internal);return {c,a};
}
function authorize(c,i,value,schema,internal=false){
 const a=parse(schema,value,'FORBIDDEN');
 demand(a.actorUid===i.actorUid&&(a.role!=='UPLOADER'||a.actorUid===a.uploaderUid),'FORBIDDEN');
 if(i.operation==='UPLOAD_CREATE')demand(a.actorUid===a.uploaderUid,'FORBIDDEN');
 else{
  demand(c.record!==null);
  const h=c.record.intentHeader;
  demand(a.uploaderUid===h.actors.uploaderUid&&a.assetId===h.assetId&&i.resourceId===h.assetId&&a.intentId===h.intentId,'FORBIDDEN');
  if(schema===intentAuth)demand(a.operation===i.operation,'FORBIDDEN');
 }
 if(internal){
  // The immutable row/fence owns the original actor even if receipt lookup is absent.
  const knownOriginal=i.operation==='UPLOAD_PART'?c.record.parts.find(row=>row.part.index===i.partIndex)?.writer.actorUid:c.record.completion?.identity.actorUid;
  if(knownOriginal!==undefined)demand(a.actorUid===knownOriginal,'FORBIDDEN');
  if(c.operation!==null)demand(a.actorUid===c.operation.receipt.identity.actorUid,'FORBIDDEN');
 }
 return a;
}
function existing(c,request,operation){
 if(c.operation===null)return null;
 demand(same(c.operation.receipt.identity,request.identity),'INTERNAL_ERROR');
 demand(c.operation.receipt.fingerprint===hash(request),'IDEMPOTENCY_PAYLOAD_MISMATCH');
 if(c.operation.receipt.status==='IN_FLIGHT'){
  fail('IDEMPOTENCY_IN_PROGRESS');
 }
 return replayPlan(c,operation,'REPLAY');
}
function replayPlan(c,operation,action,extra={}){
 return finish({contractRevision:2,operation,action,guards:{type:'REPLAY',identity:c.operation.receipt.identity,requestHash:c.operation.receipt.fingerprint,allocationHash:c.operation.allocationHash,observedIntentRevision:c.record.intentHeader.revision,...extra},nextRecord:c.record,nextOperation:c.operation,quotaRequirement:null,queueRequirement:null,afterCommitWrite:null,requires:{atomicCommit:true}});
}
function finish(value){safeJson(value);return parse(rawPlan,value,'INTERNAL_ERROR');}
function plan(operation,guards,r,o,{action='APPLY',quota=null,queue=null,write=null}={}){return finish({contractRevision:2,operation,action,guards,nextRecord:r,nextOperation:o,quotaRequirement:quota,queueRequirement:queue,afterCommitWrite:write,requires:{atomicCommit:true}});}
function receipt(r,i){const h=r.intentHeader;return {contractRevision:2,assetId:h.assetId,intentId:h.intentId,requestId:i.requestId,revision:h.revision,operation:i.operation,state:h.state,acceptedParts:r.parts.filter(row=>row.acceptedAtRevision!==null).length,partCount:partsCount(h.core)};}
function makeOperation(request,allocation,status='IN_FLIGHT',publicReceipt=null,acceptedPart=null){return {contractRevision:2,receipt:{contractRevision:2,identity:request.identity,fingerprint:hash(request),status,publicReceipt,acceptedPart,retryRequest:null},request,allocation,allocationHash:hash(allocation)};}
function checkFresh(c,expected,{cancel=false}={}){
 const h=c.record.intentHeader;
 demand(h.state==='UPLOADING'&&h.revision===expected&&c.nowMs>=h.createdAtMs&&(cancel||c.nowMs<h.expiresAtMs));
}
function qUpdate(c){demand(c.quotaObservation!==null&&c.quotaObservation.reservationRevision!==null);return {type:'UPDATE',quotaRevision:c.quotaObservation.quotaRevision,reservationId:c.record.reservationDescriptor.id,reservationRevision:c.quotaObservation.reservationRevision};}
function checkClaim(c,f,allocation,content){
 demand(f!==null);
 const d=c.record.reservationDescriptor,g=qUpdate(c),declaration={effectId:allocation.effectId,writerId:allocation.writerId,budgetBytes:content.sizeBytes,content};
 demand(same(f.reservation,d)&&same(f.guards,g)&&same(f.declaration,declaration)&&f.fingerprint===hash({reservation:d,declaration})&&f.nextQuotaRevision===g.quotaRevision&&f.nextReservationRevision===plus(g.reservationRevision));
 return g;
}
function objectUnused(r,objectId,effectId){return !r.parts.some(row=>row.partId===objectId||row.effect.effectId===effectId)&&(r.completion===null||(r.completion.originalId!==objectId&&r.completion.effect.effectId!==effectId));}

/** CREATE binds validated metadata and current create authorization; allocation is server-only. */
export function planCreateUpload(value){
 const v=envelope(value,{context:z.unknown(),command:exact({identity:createIdentity,core:coreSchema}),metadataFact:metadataFactSchema,allocation:exact({assetId:asset,intentId:id,reservationId:id}).nullable(),quotaFact:quotaCreateSchema.nullable()});
 const i=v.command.identity,{c,a}=authorizedContext(v.context,i,v.authorization,createAuth),m=v.metadataFact;
 demand(v.command.core.requestId===i.requestId,'VALIDATION_ERROR');
 demand(m.uploaderUid===a.uploaderUid,'FORBIDDEN');
 demand(m.kind===v.command.core.kind);
 const actors={uploaderUid:m.uploaderUid},request={identity:i,core:v.command.core,metadataDigest:m.metadataDigest,actors};
 const previous=existing(c,request,'CREATE');if(previous)return previous;
 demand(c.record===null&&c.operation===null&&v.allocation!==null&&v.quotaFact!==null&&c.quotaObservation!==null&&c.quotaObservation.reservationRevision===null);
 const allocation={...v.allocation,createdAtMs:c.nowMs},d={id:allocation.reservationId,assetId:allocation.assetId,uploaderUid:m.uploaderUid,kind:m.kind,purpose:'UPLOAD',attempt:0,inputBytes:v.command.core.inputBytes,jobId:null},q=v.quotaFact;
 const qg={type:'CREATE',quotaRevision:c.quotaObservation.quotaRevision,reservationTupleAbsent:{assetId:allocation.assetId,purpose:'UPLOAD',attempt:0},reservationIdAbsent:allocation.reservationId};
 demand(same(q.descriptor,d)&&same(q.guards,qg)&&q.fingerprint===hash(d)&&q.nextQuotaRevision===plus(qg.quotaRevision)&&q.freeReservedBytes===2*d.inputBytes+MEDIA_UPLOAD_CAPS[d.kind].derivativeBytes);
 demand(c.nowMs<=Number.MAX_SAFE_INTEGER-2*UPLOAD_LIMITS.intentExpiryMs);
 const r={contractRevision:2,intentHeader:{contractRevision:2,intentId:allocation.intentId,assetId:allocation.assetId,actors,core:v.command.core,metadataBinding:{metadataDigest:m.metadataDigest},state:'UPLOADING',revision:0,createdAtMs:c.nowMs,expiresAtMs:c.nowMs+UPLOAD_LIMITS.intentExpiryMs},metadataProofId:m.proofId,reservationDescriptor:d,reservationFingerprint:hash(d),parts:[],completion:null};
 const o=makeOperation(request,allocation,'SETTLED',receipt(r,i));
 return plan('CREATE',{type:'CREATE_UPLOAD',intentIdAbsent:allocation.intentId,assetIdAbsent:allocation.assetId,assetIntentMappingAbsent:mapping(r),operationAbsent:i,quota:qg},r,o,{quota:{operation:'RESERVE_UPLOAD',command:{descriptor:d,fingerprint:r.reservationFingerprint,expectedQuotaRevision:qg.quotaRevision},guards:qg}});
}

/** A held index never grants another writer, even after truthful absence. */
export function planBeginPart(value){
 const v=envelope(value,{context:z.unknown(),command:exact({identity:partIdentity,expectedIntentRevision:rev,partIndex:index}),byteFact:partBytesSchema,allocation:partAllocation.nullable(),quotaFact:quotaWriteSchema.nullable()});
 const i=v.command.identity,{c}=authorizedContext(v.context,i,v.authorization,intentAuth);
 const r=c.record,h=r.intentHeader,part=v.byteFact.part;
 demand(v.command.partIndex===i.partIndex&&part.index===i.partIndex&&partFits(part,h.core),'VALIDATION_ERROR');
 demand(v.byteFact.assetId===h.assetId&&v.byteFact.intentId===h.intentId);
 const request={identity:i,expectedIntentRevision:v.command.expectedIntentRevision,part};
 const previous=existing(c,request,'BEGIN_PART');if(previous)return previous;
 checkFresh(c,v.command.expectedIntentRevision);demand(r.completion===null);
 const row=r.parts.find(row=>row.part.index===i.partIndex);
 if(row){
  demand(same(row.part,part));
  if(row.acceptedAtRevision===null)fail('IDEMPOTENCY_IN_PROGRESS');
  const accepted=acceptedReference(r,row),pub={...receipt(r,i),partIndex:i.partIndex,acceptedPartId:row.partId};
  const o=makeOperation(request,{partId:row.partId,effectId:row.effect.effectId,writerId:row.effect.writerId},'SETTLED',pub,accepted);
  return plan('BEGIN_PART',{type:'REUSE_PART',intent:intentGuardFor(r),operationAbsent:i,acceptedPartId:row.partId,acceptedPartFingerprint:hash(accepted),completionAbsent:true},r,o,{action:'REUSE_PART'});
 }
 demand(v.allocation!==null&&objectUnused(r,v.allocation.partId,v.allocation.effectId));
 const qg=checkClaim(c,v.quotaFact,v.allocation,{sizeBytes:part.sizeBytes,sha256:part.sha256}),next=copy(r);
 const effect={effectId:v.allocation.effectId,writerId:v.allocation.writerId,fingerprint:v.quotaFact.fingerprint,phase:'RESERVED',generation:null,proofId:null,unknownProofId:null};
 const added={partId:v.allocation.partId,part,writer:{actorUid:i.actorUid,requestId:i.requestId},effect,acceptedAtRevision:null};
 next.parts.push(added);next.intentHeader.revision=plus(h.revision);
 const o=makeOperation(request,v.allocation);
 return plan('BEGIN_PART',{type:'BEGIN_PART',intent:intentGuardFor(r),operationAbsent:i,partIndexAbsent:i.partIndex,allocatedPartIdAbsent:added.partId,completionAbsent:true,quota:qg},next,o,{quota:claimRequirement(next,added,false,qg),write:writeProjection(next,added)});
}

/** Phase progress is original-caller-only, not an implicit service authority. */
function observe(value,original){
 const v=envelope(value,{context:z.unknown(),identity:original?completeIdentity:partIdentity,expectedIntentRevision:rev,outcome:outcomeSchema});
 const i=v.identity,{c}=authorizedContext(v.context,i,v.authorization,original?completeAuth:intentAuth,true);
 demand(c.operation!==null&&same(i,c.operation.receipt.identity));
 const r=c.record,h=r.intentHeader,row=original?r.completion:r.parts.find(row=>row.part.index===i.partIndex);
 demand(row!==null&&row!==undefined&&same(i,original?row.identity:writerIdentity(r,row)));
 demand(same(v.outcome.target,targetFor(r,row,original))&&same(v.outcome.result.tuple,tupleFor(r,row)));
 const e=row.effect,result=v.outcome.result,unknown=result.verification==='UPLOAD_WRITE_OUTCOME_UNKNOWN';
 if(result.verification==='WRITE_RETAINED_AND_QUIESCENT')demand(same({sizeBytes:result.content.sizeBytes,sha256:result.content.sha256},declarationFor(r,row,original).content));
 // A preserved earlier UNKNOWN may replay after resolution without regressing the known phase.
 if((unknown&&e.unknownProofId!==null&&same(v.outcome,storedOutcome(r,row,original,true)))||(!unknown&&['RETAINED','ABSENT'].includes(e.phase)&&same(v.outcome,storedOutcome(r,row,original)))){
  return replayPlan(c,original?'RECORD_ORIGINAL':'RECORD_PART','REPLAY_EFFECT',{targetRef:v.outcome.target,outcomeSha256:hash(v.outcome),operationStatus:c.operation.receipt.status});
 }
 demand(['RESERVED','UNCERTAIN'].includes(e.phase)&&(!unknown||e.phase==='RESERVED')&&c.operation.receipt.status==='IN_FLIGHT');
 demand(h.revision===v.expectedIntentRevision&&['UPLOADING','CANCELLED'].includes(h.state)&&c.nowMs>=h.createdAtMs);
 const qg=qUpdate(c),next=copy(r),nextRow=original?next.completion:next.parts.find(row=>row.part.index===i.partIndex),o=copy(c.operation),oldPhase=e.phase;
 next.intentHeader.revision=plus(h.revision);
 if(unknown){nextRow.effect.phase='UNCERTAIN';nextRow.effect.unknownProofId=result.proofId;}
 else{
  nextRow.effect.phase=result.verification==='WRITE_RETAINED_AND_QUIESCENT'?'RETAINED':'ABSENT';nextRow.effect.proofId=result.proofId;nextRow.effect.generation=result.verification==='WRITE_RETAINED_AND_QUIESCENT'?result.content.generation:null;
 }
 if(!original&&nextRow.effect.phase==='RETAINED'&&h.state==='UPLOADING'&&c.nowMs<h.expiresAtMs){
  nextRow.acceptedAtRevision=next.intentHeader.revision;o.receipt.status='SETTLED';o.receipt.publicReceipt={...receipt(next,i),partIndex:i.partIndex,acceptedPartId:nextRow.partId};o.receipt.acceptedPart=acceptedReference(next,nextRow);
 }
 return plan(original?'RECORD_ORIGINAL':'RECORD_PART',{type:'OBSERVE_WRITE',target:original?'ORIGINAL':'PART',intent:intentGuardFor(r),operation:operationGuardFor(c.operation),targetRef:targetFor(r,row,original),previousPhase:oldPhase,tuple:tupleFor(r,row),quota:qg},next,o,{quota:observationRequirement(next,nextRow,original,qg)});
}
export function planRecordPartOutcome(value){return observe(value,false);}
export function planRecordOriginalOutcome(value){return observe(value,true);}

/** Freeze server byte/profile facts once; the ordered projection digest is not a file hash. */
export function planBeginComplete(value){
 const v=envelope(value,{context:z.unknown(),command:exact({identity:completeIdentity,expectedIntentRevision:rev}),originalBytesFact:originalBytesSchema.nullable(),processingInputFact:processingFactSchema.nullable(),allocation:exact({originalId:id,effectId:id,writerId:id,allocatedJobId:id}).nullable(),quotaFact:quotaWriteSchema.nullable()});
 const i=v.command.identity,{c}=authorizedContext(v.context,i,v.authorization,completeAuth);
 const request={identity:i,expectedIntentRevision:v.command.expectedIntentRevision},previous=existing(c,request,'BEGIN_COMPLETE');if(previous)return previous;
 checkFresh(c,v.command.expectedIntentRevision);
 const r=c.record,h=r.intentHeader,b=v.originalBytesFact,f=v.processingInputFact,a=v.allocation;
 demand(r.completion===null&&allAccepted(r)&&b!==null&&f!==null&&a!==null&&objectUnused(r,a.originalId,a.effectId));
 const ordered=orderedPartsHash(r);
 demand(b.assetId===h.assetId&&b.intentId===h.intentId&&b.inputBytes===h.core.inputBytes&&b.orderedPartsSha256===ordered);
 demand(f.assetId===h.assetId&&f.intentId===h.intentId&&same(f.actors,h.actors)&&f.metadataDigest===h.metadataBinding.metadataDigest&&f.input.assetId===h.assetId&&f.input.kind===h.core.kind&&f.input.inputBytes===h.core.inputBytes&&f.input.originalSha256===b.originalSha256);
 const qg=checkClaim(c,v.quotaFact,a,{sizeBytes:h.core.inputBytes,sha256:b.originalSha256}),next=copy(r);
 const completion={identity:i,requestHash:hash(request),orderedPartsSha256:ordered,input:f.input,allocatedJobId:a.allocatedJobId,originalId:a.originalId,originalBytesProofId:b.proofId,processingProofId:f.proofId,effect:{effectId:a.effectId,writerId:a.writerId,fingerprint:v.quotaFact.fingerprint,phase:'RESERVED',generation:null,proofId:null,unknownProofId:null},queuedAtRevision:null};
 next.completion=completion;next.intentHeader.revision=plus(h.revision);
 const allocation={...a,inputFingerprint:inputAllocationHash(completion),orderedPartsSha256:ordered},o=makeOperation(request,allocation);
 return plan('BEGIN_COMPLETE',{type:'BEGIN_COMPLETE',intent:intentGuardFor(r),operationAbsent:i,completionAbsent:true,orderedPartsSha256:ordered,allocatedOriginalIdAbsent:a.originalId,allocatedJobIdAbsent:a.allocatedJobId,jobMappingAbsent:mapping(r),quota:qg},next,o,{quota:claimRequirement(next,completion,true,qg),write:writeProjection(next,completion,true)});
}

/** Propose a single old-U1-CAS + staged-J1-post-state requirement, never a blind J1 merge. */
export function planCompleteUpload(value){
 const v=envelope(value,{context:z.unknown(),identity:completeIdentity,expectedIntentRevision:rev,queueBinding:queueBindingSchema.nullable()});
 const i=v.identity,{c,a}=authorizedContext(v.context,i,v.authorization,completeAuth,true);
 demand(c.operation!==null&&same(i,c.operation.receipt.identity));
 if(c.operation.receipt.status==='SETTLED')return replayPlan(c,'COMPLETE','REPLAY');
 checkFresh(c,v.expectedIntentRevision);
 const r=c.record,h=r.intentHeader,completion=r.completion,b=v.queueBinding;
 demand(completion!==null&&same(i,completion.identity)&&allAccepted(r)&&completion.effect.phase==='RETAINED'&&b!==null);
 const postRevision=plus(h.revision);
 demand(same(b,{contractRevision:2,identity:i,assetId:h.assetId,intentId:h.intentId,actors:h.actors,uploaderUid:h.actors.uploaderUid,expectedPostIntentRevision:postRevision,allocatedJobId:completion.allocatedJobId,input:completion.input,metadataDigest:h.metadataBinding.metadataDigest}));
 const next=copy(r),o=copy(c.operation);next.intentHeader.state='QUEUED';next.intentHeader.revision=postRevision;next.completion.queuedAtRevision=postRevision;
 o.receipt.status='SETTLED';o.receipt.publicReceipt={...receipt(next,i),jobId:completion.allocatedJobId};
 return plan('COMPLETE',{type:'COMPLETE_UPLOAD',intent:intentGuardFor(r),operation:operationGuardFor(c.operation),originalRetained:{effectId:completion.effect.effectId,fingerprint:completion.effect.fingerprint,outcomeSha256:hash(storedOutcome(r,completion,true))},orderedPartsSha256:completion.orderedPartsSha256,jobMappingAbsent:mapping(r),allocatedJobIdAbsent:completion.allocatedJobId,queueReceiptAbsent:i},next,o,{queue:jointQueue(next,a)});
}

/** CANCEL keeps every fact, original fence and charge; release-unused is only a Q1 request. */
export function planCancelUpload(value){
 const v=envelope(value,{context:z.unknown(),command:exact({identity:cancelIdentity,expectedIntentRevision:rev})});
 const i=v.command.identity,{c}=authorizedContext(v.context,i,v.authorization,intentAuth);
 const request={identity:i,expectedIntentRevision:v.command.expectedIntentRevision},previous=existing(c,request,'CANCEL');if(previous)return previous;
 checkFresh(c,v.command.expectedIntentRevision,{cancel:true});
 const r=c.record,next=copy(r),g=qUpdate(c);next.intentHeader.state='CANCELLED';next.intentHeader.revision=plus(r.intentHeader.revision);
 const o=makeOperation(request,null,'SETTLED',receipt(next,i));
 return plan('CANCEL',{type:'CANCEL_UPLOAD',intent:intentGuardFor(r),operationAbsent:i},next,o,{quota:{operation:'RELEASE_UNUSED',command:{reservation:r.reservationDescriptor,expectedQuotaRevision:g.quotaRevision,expectedReservationRevision:g.reservationRevision},guards:g}});
}

/** Server-only stable document identity. No client version selector or v1 fallback.
 * Collection/namespace ownership remains the adapter's responsibility.
 */
export function mediaV2DocumentId(logicalKey){safeJson(logicalKey);const parsed=parse(mediaV2DocumentKeySchema,logicalKey);return `v2_${hash(parsed)}`;}
/** C0/J1 handoff derived from the persisted upload record, never client JSON claims. */
export function expectedUploadFromRecord(value){
 safeJson(value);const r=parse(rawRecord,value,'INTERNAL_ERROR'),h=r.intentHeader;
 return parse(expectedUploadSchema,{intent:project(r),metadataFact:{contractRevision:2,verification:'UPLOAD_METADATA_VALIDATED',kind:h.core.kind,metadataDigest:h.metadataBinding.metadataDigest,uploaderUid:h.actors.uploaderUid,proofId:r.metadataProofId}},'INTERNAL_ERROR');
}
