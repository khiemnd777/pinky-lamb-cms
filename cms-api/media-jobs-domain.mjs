import {z} from 'zod';
import {createHash} from 'node:crypto';
import {ApiError} from '../contracts/errors.mjs';
import {canonicalJson} from '../contracts/draft.mjs';
import {UPLOAD_LIMITS,MEDIA_UPLOAD_CAPS,jobSnapshotSchema,intentSnapshotSchema,publicReceiptSchema} from '../contracts/media-upload.mjs';
import {frozenInputV2Schema,attemptTupleV2Schema,quiescenceFactV2Schema,readyFactV2Schema,uploadMetadataFactV2Schema} from '../contracts/media-v3-authority-v2.mjs';

/** Canonical v2 advisory plans. Storage/cache/quiescence facts remain trusted adapter
 * inputs. Global quota and processing slot are shared across contract versions. */
export const J1_LIMITS=Object.freeze({jsonBytes:65536,maxRevision:Number.MAX_SAFE_INTEGER-1,maxTimeMs:Number.MAX_SAFE_INTEGER-86400000,leaseMs:30000,heartbeatMs:5000,attempts:2});
const id=z.string().regex(/^[A-Za-z0-9_-]{1,128}$(?![\s\S])/),asset=z.string().regex(/^[A-Za-z0-9_-]{1,100}$(?![\s\S])/),key=z.string().regex(/^[A-Za-z0-9_-]{8,128}$(?![\s\S])/),sha=z.string().regex(/^[a-f0-9]{64}$(?![\s\S])/);
const rev=z.number().int().min(0).max(J1_LIMITS.maxRevision),positiveRev=rev.min(1),time=z.number().int().min(0).max(J1_LIMITS.maxTimeMs),kind=z.enum(['IMAGE','PDF','VIDEO']),attempt=z.union([z.literal(1),z.literal(2)]);
const bytes=z.number().int().min(1).max(UPLOAD_LIMITS.retainedBytes);
const exact=fields=>z.strictObject(fields);
const hash=value=>createHash('sha256').update(canonicalJson(value),'utf8').digest('hex');
const same=(a,b)=>canonicalJson(a)===canonicalJson(b);
const fail=(code='REVISION_CONFLICT')=>{throw new ApiError(code);};
const requireRelation=(condition,code)=>{if(!condition)fail(code);};

/** Inspect descriptors before serialization or Zod: accessors are never invoked. */
function safeJson(value,code){
 const ancestors=new Set();
 function inspect(v,depth){
  if(depth>128)fail(code);
  if(v===null || typeof v==='string' || typeof v==='boolean')return;
  if(typeof v==='number' && Number.isFinite(v))return;
  if(typeof v!=='object' || ancestors.has(v))fail(code);
  const array=Array.isArray(v),prototype=Object.getPrototypeOf(v);
  if(array?prototype!==Array.prototype:prototype!==Object.prototype && prototype!==null)fail(code);
  ancestors.add(v);
  const names=Reflect.ownKeys(v);
  if(array && (v.length>65536 || names.length!==v.length+1))fail(code);
  for(const name of names){
   if(array && name==='length')continue;
   if(typeof name!=='string')fail(code);
   if(array && (!/^(0|[1-9][0-9]*)$/.test(name) || Number(name)>=v.length))fail(code);
   const descriptor=Object.getOwnPropertyDescriptor(v,name);
   if(!descriptor.enumerable || !Object.hasOwn(descriptor,'value'))fail(code);
   inspect(descriptor.value,depth+1);
  }
  ancestors.delete(v);
 }
 try{inspect(value,0);if(Buffer.byteLength(JSON.stringify(value),'utf8')>J1_LIMITS.jsonBytes)fail('PAYLOAD_TOO_LARGE');}
 catch(error){if(error instanceof ApiError)throw error;fail(code);}
}
function parse(schema,value,code='VALIDATION_ERROR'){
 safeJson(value,code);
 try{const parsed=schema.safeParse(value);if(!parsed.success)fail(code);return parsed.data;}
 catch(error){if(error instanceof ApiError)throw error;fail(code);}
}
function publicSchema(schema){return z.preprocess(value=>{safeJson(value,'VALIDATION_ERROR');return value;},schema);}
function increment(value){if(value>=J1_LIMITS.maxRevision)fail();return value+1;}

export const frozenInputSchema=publicSchema(frozenInputV2Schema);
export const attemptTupleSchema=publicSchema(attemptTupleV2Schema);
export const quiescenceFactSchema=publicSchema(quiescenceFactV2Schema);
const authorizationSchema=exact({contractRevision:z.literal(2),verification:z.literal('MEDIA_MUTATION_AUTHORIZED'),actorUid:id,role:z.enum(['OWNER','UPLOADER']),uploaderUid:id,assetId:asset,jobId:id,proofId:id});
const queueAuthorizationSchema=exact({contractRevision:z.literal(2),verification:z.literal('MEDIA_UPLOAD_COMPLETE_AUTHORIZED'),actorUid:id,role:z.enum(['OWNER','UPLOADER']),uploaderUid:id,assetId:asset,intentId:id,proofId:id});
export const readyFactSchema=publicSchema(readyFactV2Schema);
const failureSchema=exact({contractRevision:z.literal(2),verification:z.literal('MEDIA_ATTEMPT_FAILED'),tuple:attemptTupleSchema,failureClass:z.enum(['VALIDATION','INFRASTRUCTURE','UNKNOWN']),proofId:id,quiescence:quiescenceFactSchema.nullable()}).refine(v=>(v.failureClass!=='VALIDATION' || v.quiescence!==null) && (v.quiescence===null || same(v.tuple,v.quiescence.tuple)));
const outcomeSchema=z.union([readyFactSchema,failureSchema]);
const originalSchema=exact({contractRevision:z.literal(2),verification:z.literal('UPLOAD_ORIGINAL_COMPLETE'),assetId:asset,intentId:id,intentRevision:rev,uploaderUid:id,kind,originalSha256:sha,inputBytes:bytes,metadataDigest:sha,proofId:id}).refine(v=>v.inputBytes<=MEDIA_UPLOAD_CAPS[v.kind].inputBytes);
function reservationDescriptor(f){return {id:f.reservationId,assetId:f.assetId,uploaderUid:f.uploaderUid,kind:f.kind,purpose:f.purpose,attempt:f.attempt,inputBytes:null,jobId:f.jobId};}
export const retryReservationFactSchema=publicSchema(exact({contractRevision:z.literal(2),verification:z.literal('QUOTA_RETRY_RESERVED'),reservationId:id,assetId:asset,uploaderUid:id,kind,jobId:id,purpose:z.literal('RETRY'),attempt,fingerprint:sha,quotaRevision:rev,reservationRevision:z.literal(0),state:z.literal('OPEN'),freeReservedBytes:z.number().int().min(0).max(UPLOAD_LIMITS.retainedBytes),holdsActiveSlot:z.literal(false),proofId:id}).refine(v=>v.freeReservedBytes===MEDIA_UPLOAD_CAPS[v.kind].derivativeBytes && v.fingerprint===hash(reservationDescriptor(v))));
const queueIdentitySchema=exact({actorUid:id,operation:z.literal('UPLOAD_COMPLETE'),resourceId:asset,requestId:key});
const retryIdentitySchema=exact({actorUid:id,operation:z.literal('JOB_RETRY'),resourceId:asset,requestId:key});
const queueRequestSchema=exact({expectedIntentRevision:rev,input:frozenInputSchema,metadataDigest:sha});
const queueResponseSchema=exact({contractRevision:z.literal(2),jobId:id,intentId:id,assetId:asset,state:z.literal('QUEUED'),jobRevision:z.literal(0)});
const queueRecordSchema=exact({identity:queueIdentitySchema,requestHash:sha,request:queueRequestSchema,response:queueResponseSchema}).refine(v=>v.requestHash===hash(v.request) && v.identity.resourceId===v.response.assetId && v.response.assetId===v.request.input.assetId);
const retryRequestSchema=exact({jobId:id,expectedJobRevision:rev});
const retryResponseSchema=publicReceiptSchema.refine(v=>v.operation==='JOB_RETRY' && v.jobRevision===v.revision);
const retryRecordSchema=exact({identity:retryIdentitySchema,requestHash:sha,request:retryRequestSchema,reservationId:id,quiescence:quiescenceFactSchema,response:retryResponseSchema}).refine(v=>v.requestHash===hash(v.request) && v.response.requestId===v.identity.requestId && v.response.assetId===v.identity.resourceId && v.response.jobId===v.request.jobId && v.response.revision===v.request.expectedJobRevision+1);

function tupleBelongs(tuple,job){return tuple.jobId===job.jobId && tuple.intentId===job.intentId && tuple.assetId===job.assetId && tuple.kind===job.kind;}
function tupleFrom(job){return {jobId:job.jobId,intentId:job.intentId,assetId:job.assetId,kind:job.kind,attempt:job.attempt,leaseEpoch:job.lease.epoch,workerId:job.lease.workerId};}
function bindingMatches(binding,input){return ['assetId','kind','originalSha256','processingRecipeSha256','toolSetSha256'].every(k=>binding[k]===input[k]);}
function readyMatches(fact,record){return same(fact.tuple,record.lastAttempt) && bindingMatches(fact.binding,record.input) && fact.metadataDigest===record.metadataDigest;}
function recordRelations(r){
 const {job,input,lastAttempt,queueRecord:q,retryRecord:retry,completion,failureClass}=r;
 if(job.assetId!==input.assetId || job.kind!==input.kind || !same(q.request.input,input) || q.request.metadataDigest!==r.metadataDigest || q.response.jobId!==job.jobId || q.response.intentId!==job.intentId || q.response.assetId!==job.assetId)return false;
 if(lastAttempt!==null && (!tupleBelongs(lastAttempt,job) || lastAttempt.attempt!==job.attempt))return false;
 if(retry!==null){
  if(retry.response.jobId!==job.jobId || retry.response.intentId!==job.intentId || retry.response.assetId!==job.assetId || retry.response.revision>job.revision || !tupleBelongs(retry.quiescence.tuple,job) || retry.quiescence.tuple.attempt!==1 || retry.request.expectedJobRevision<2 || job.attempt<1)return false;
  if(lastAttempt!==null && ((job.attempt===2 && retry.quiescence.tuple.leaseEpoch>=lastAttempt.leaseEpoch) || retry.quiescence.tuple.leaseEpoch>lastAttempt.leaseEpoch || (job.attempt===1 && !same(retry.quiescence.tuple,lastAttempt))))return false;
 }
 if(job.attempt===2 && retry===null)return false;
 if(job.attempt===1 && job.state!=='QUEUED' && retry!==null)return false;
 if(job.state==='QUEUED')return job.attempt===0?job.revision===0 && lastAttempt===null && retry===null && failureClass===null && completion===null:lastAttempt!==null && retry!==null && failureClass===null && completion===null;
 if(lastAttempt===null)return false;
 if(job.state==='PROCESSING')return same(lastAttempt,tupleFrom(job)) && failureClass===null && completion===null;
 if(job.state==='READY')return completion?.verification==='MEDIA_READY_ATTEMPT' && failureClass===null && readyMatches(completion,r) && same(job.outputBinding,completion.binding);
 if(job.state==='REJECTED')return failureClass==='VALIDATION' && completion?.verification==='MEDIA_ATTEMPT_FAILED' && completion.failureClass==='VALIDATION' && same(completion.tuple,lastAttempt);
 if(job.state==='RECOVERY_REQUIRED')return failureClass==='LEASE_EXPIRED'?completion===null:['INFRASTRUCTURE','UNKNOWN'].includes(failureClass) && completion?.verification==='MEDIA_ATTEMPT_FAILED' && completion.failureClass===failureClass && same(completion.tuple,lastAttempt);
 return false;
}
export const jobRecordSchema=publicSchema(exact({contractRevision:z.literal(2),job:jobSnapshotSchema,input:frozenInputSchema,uploaderUid:id,metadataDigest:sha,lastAttempt:attemptTupleSchema.nullable(),failureClass:z.enum(['VALIDATION','INFRASTRUCTURE','LEASE_EXPIRED','UNKNOWN']).nullable(),queueRecord:queueRecordSchema,retryRecord:retryRecordSchema.nullable(),completion:outcomeSchema.nullable()}).refine(recordRelations));
export const globalSlotSchema=publicSchema(z.discriminatedUnion('phase',[
 exact({revision:rev,epoch:rev,phase:z.literal('FREE'),holder:z.null(),expiresAtMs:z.null()}),
 exact({revision:rev,epoch:positiveRev,phase:z.literal('LEASED'),holder:attemptTupleSchema,expiresAtMs:time}),
 exact({revision:rev,epoch:positiveRev,phase:z.literal('RECOVERY_REQUIRED'),holder:attemptTupleSchema,expiresAtMs:z.null()})
]).refine(v=>v.holder===null || v.holder.leaseEpoch===v.epoch));
export function parseJobRecord(value){return parse(jobRecordSchema,value,'INTERNAL_ERROR');}
export function parseGlobalSlot(value){return parse(globalSlotSchema,value,'INTERNAL_ERROR');}

const jContextSchema=exact({record:jobRecordSchema,slot:globalSlotSchema});
function parseContext(value){const c=parse(jContextSchema,value,'INTERNAL_ERROR');joint(c.record,c.slot);return c;}
function jointRelations(record,slot){
 const {job,lastAttempt}=record;
 if(slot.phase==='FREE')return (lastAttempt===null || slot.epoch>=lastAttempt.leaseEpoch) && job.state!=='PROCESSING';
 if(slot.holder.jobId!==job.jobId)return job.state!=='PROCESSING';
 if(!same(slot.holder,lastAttempt))return false;
 return slot.phase==='LEASED'?job.state==='PROCESSING' && slot.expiresAtMs===job.lease.expiresAtMs:job.state==='RECOVERY_REQUIRED';
}
function joint(record,slot){requireRelation(jointRelations(record,slot),'INTERNAL_ERROR');}
const jobSlotGuardSchema=exact({type:z.literal('JOB_SLOT'),jobId:id,jobRevision:rev,slotRevision:rev,slotEpoch:rev,holder:attemptTupleSchema.nullable()});
const retryGuardSchema=exact({type:z.literal('RETRY'),jobId:id,jobRevision:rev,slotRevision:rev,slotEpoch:rev,holder:attemptTupleSchema.nullable(),retryIdentity:retryIdentitySchema,requestHash:sha,retryReservation:exact({reservationId:id,reservationRevision:z.literal(0),quotaRevision:rev,fingerprint:sha})});
const replayGuardSchema=exact({type:z.literal('REPLAY'),jobId:id,observedJobRevision:rev,identity:z.union([queueIdentitySchema,retryIdentitySchema]),requestHash:sha});
/** Guard logical IDs are global collision checks, not v2-only absence. The
 * adapter uses mediaV2DocumentId for JOB/ASSET_JOB/OPERATION/RECEIPT_CACHE keys
 * and checks historical/global allocations before the atomic commit. */
const createGuardSchema=exact({type:z.literal('CREATE_JOB'),jobMappingAbsent:exact({assetId:asset,intentId:id}),allocatedJobIdAbsent:id,queueReceiptAbsent:queueIdentitySchema,requestHash:sha,intent:exact({assetId:asset,intentId:id,revision:rev,state:z.literal('QUEUED')})});
const guardSchema=z.discriminatedUnion('type',[jobSlotGuardSchema,retryGuardSchema,replayGuardSchema,createGuardSchema]);
function planRelations(v){
 const g=v.guards,r=v.nextRecord,j=r.job,q=r.queueRecord,t=r.retryRecord,slot=v.nextSlot;
 if(slot!==null && !jointRelations(r,slot))return false;
 if(v.action==='REPLAY'){
  if(!['QUEUE','RETRY'].includes(v.operation) || g.type!=='REPLAY' || g.jobId!==j.jobId || g.observedJobRevision!==j.revision)return false;
  const receipt=v.operation==='QUEUE'?q:t;
  return receipt!==null && same(g.identity,receipt.identity) && g.requestHash===receipt.requestHash && same(v.replayReceipt,receipt.response) && (v.operation==='QUEUE'?slot===null:slot!==null);
 }
 if(v.operation==='QUEUE')return g.type==='CREATE_JOB' && slot===null && v.replayReceipt===null && g.jobMappingAbsent.assetId===j.assetId && g.jobMappingAbsent.intentId===j.intentId && g.allocatedJobIdAbsent===j.jobId && same(g.queueReceiptAbsent,q.identity) && g.requestHash===q.requestHash && g.intent.assetId===j.assetId && g.intent.intentId===j.intentId && g.intent.revision===q.request.expectedIntentRevision && j.state==='QUEUED' && j.attempt===0;
 if(g.jobId!==j.jobId || slot===null)return false;
 if(v.operation==='RETRY'){
  if(g.type!=='RETRY' || t===null || j.state!=='QUEUED' || j.attempt!==1 || slot.phase!=='FREE' || !same(v.replayReceipt,t.response) || !same(g.retryIdentity,t.identity) || g.requestHash!==t.requestHash || g.jobRevision!==t.request.expectedJobRevision || g.retryReservation.reservationId!==t.reservationId)return false;
  const descriptor={id:t.reservationId,assetId:j.assetId,uploaderUid:r.uploaderUid,kind:j.kind,purpose:'RETRY',attempt:2,inputBytes:null,jobId:j.jobId};
  if(g.retryReservation.fingerprint!==hash(descriptor) || slot.epoch!==g.slotEpoch)return false;
  return g.holder===null?slot.revision===g.slotRevision:g.slotRevision<J1_LIMITS.maxRevision && slot.revision===g.slotRevision+1 && same(g.holder,t.quiescence.tuple) && g.holder.leaseEpoch===g.slotEpoch;
 }
 if(g.type!=='JOB_SLOT' || v.replayReceipt!==null || g.slotRevision>=J1_LIMITS.maxRevision || slot.revision!==g.slotRevision+1)return false;
 if(v.operation==='RELEASE_RECOVERED_SLOT')return j.revision===g.jobRevision && j.state==='RECOVERY_REQUIRED' && slot.phase==='FREE' && slot.epoch===g.slotEpoch && same(g.holder,r.lastAttempt) && g.holder!==null && g.holder.leaseEpoch===g.slotEpoch;
 if(g.jobRevision>=J1_LIMITS.maxRevision || j.revision!==g.jobRevision+1)return false;
 if(v.operation==='CLAIM')return j.state==='PROCESSING' && slot.phase==='LEASED' && g.holder===null && g.slotEpoch<J1_LIMITS.maxRevision && slot.epoch===g.slotEpoch+1;
 if(g.holder===null || !same(g.holder,r.lastAttempt) || g.holder.leaseEpoch!==g.slotEpoch || slot.epoch!==g.slotEpoch)return false;
 if(v.operation==='HEARTBEAT')return j.state==='PROCESSING' && slot.phase==='LEASED';
 if(v.operation==='EXPIRE_LEASE')return j.state==='RECOVERY_REQUIRED' && r.failureClass==='LEASE_EXPIRED' && slot.phase==='RECOVERY_REQUIRED';
 if(v.operation==='FINISH')return r.completion!==null && (r.completion.verification==='MEDIA_READY_ATTEMPT' || r.completion.verification==='MEDIA_ATTEMPT_FAILED' && ['VALIDATION','INFRASTRUCTURE','UNKNOWN'].includes(r.completion.failureClass)) && ['READY','REJECTED','RECOVERY_REQUIRED'].includes(j.state) && (j.state==='RECOVERY_REQUIRED'?slot.phase==='RECOVERY_REQUIRED':slot.phase==='FREE');
 return false;
}
export const jobPlanSchema=publicSchema(exact({contractRevision:z.literal(2),operation:z.enum(['QUEUE','CLAIM','HEARTBEAT','EXPIRE_LEASE','FINISH','RELEASE_RECOVERED_SLOT','RETRY']),action:z.enum(['APPLY','REPLAY']),guards:guardSchema,nextRecord:jobRecordSchema,nextSlot:globalSlotSchema.nullable(),replayReceipt:z.union([queueResponseSchema,retryResponseSchema]).nullable(),requires:exact({atomicCommit:z.literal(true)})}).refine(planRelations));

function plan(operation,guards,nextRecord,nextSlot,replayReceipt=null,action='APPLY'){
 if(nextSlot!==null)joint(nextRecord,nextSlot);
 return parse(jobPlanSchema,{contractRevision:2,operation,action,guards,nextRecord,nextSlot,replayReceipt,requires:{atomicCommit:true}},'INTERNAL_ERROR');
}
function guard(c){return {type:'JOB_SLOT',jobId:c.record.job.jobId,jobRevision:c.record.job.revision,slotRevision:c.slot.revision,slotEpoch:c.slot.epoch,holder:c.slot.holder};}
function cas(c,command){requireRelation(command.expectedJobRevision===c.record.job.revision && command.expectedSlotRevision===c.slot.revision);}
function currentOwner(c,tuple){requireRelation(c.record.job.state==='PROCESSING' && c.slot.phase==='LEASED' && same(tuple,c.record.lastAttempt) && same(tuple,c.slot.holder));}
function live(c,now){requireRelation(now>=c.record.job.lease.heartbeatAtMs && now<c.record.job.lease.expiresAtMs);}
function leaseTime(now){requireRelation(now<=J1_LIMITS.maxTimeMs-J1_LIMITS.leaseMs,'VALIDATION_ERROR');return now+J1_LIMITS.leaseMs;}
function freeSlot(c){return {revision:increment(c.slot.revision),epoch:c.slot.epoch,phase:'FREE',holder:null,expiresAtMs:null};}
function checkAuthorization(fact,identity,record,intentId=null){
 const job=record?.job;
 requireRelation(fact.actorUid===identity.actorUid && fact.assetId===identity.resourceId && (fact.role!=='UPLOADER' || fact.actorUid===fact.uploaderUid),'FORBIDDEN');
 if(record)requireRelation(fact.uploaderUid===record.uploaderUid && fact.assetId===job?.assetId && (intentId===null?fact.jobId===job?.jobId:fact.intentId===intentId),'FORBIDDEN');
}
function boundedEnvelope(value,fields){safeJson(value,'VALIDATION_ERROR');parse(exact(fields),value);}
const queueCommandSchema=exact({identity:queueIdentitySchema,expectedIntentRevision:rev,allocatedJobId:id,intentId:id,input:frozenInputSchema,uploaderUid:id,metadataDigest:sha});
export function planQueueJob(value){
 boundedEnvelope(value,{context:z.unknown(),command:z.unknown(),original:z.unknown(),authorization:z.unknown()});
 const command=parse(queueCommandSchema,value.command),auth=parse(queueAuthorizationSchema,value.authorization,'INTERNAL_ERROR');
 checkAuthorization(auth,command.identity,null,command.intentId);
 const observedIntent=value.context?.expectedUpload?.intent;
 requireRelation(auth.assetId===observedIntent?.assetId && auth.intentId===observedIntent?.intentId && auth.uploaderUid===observedIntent?.actors?.uploaderUid,'FORBIDDEN');
 const original=parse(originalSchema,value.original,'INTERNAL_ERROR');
 const c=parse(exact({record:jobRecordSchema.nullable(),expectedUpload:exact({intent:intentSnapshotSchema,metadataFact:uploadMetadataFactV2Schema})}),value.context,'INTERNAL_ERROR');
 const {intent,metadataFact}=c.expectedUpload;
 // Validate authoritative stored/current relations before inspecting a replay payload.
 const authoritativeInput=c.record===null?command.input:c.record.input;
 const authoritativeMetadata=c.record===null?command.metadataDigest:c.record.metadataDigest;
 const authoritativeUploader=c.record===null?command.uploaderUid:c.record.uploaderUid;
 requireRelation(intent.core.kind===authoritativeInput.kind && intent.core.inputBytes===authoritativeInput.inputBytes && intent.metadataBinding.metadataDigest===authoritativeMetadata && intent.assetId===authoritativeInput.assetId && intent.actors.uploaderUid===authoritativeUploader && metadataFact.kind===intent.core.kind && metadataFact.uploaderUid===intent.actors.uploaderUid && metadataFact.metadataDigest===intent.metadataBinding.metadataDigest,'INTERNAL_ERROR');
 requireRelation(original.assetId===intent.assetId && original.intentId===intent.intentId && original.intentRevision===intent.revision && original.uploaderUid===authoritativeUploader && original.kind===authoritativeInput.kind && original.originalSha256===authoritativeInput.originalSha256 && original.inputBytes===authoritativeInput.inputBytes && original.metadataDigest===authoritativeMetadata,'INTERNAL_ERROR');
 if(c.record!==null)requireRelation(c.record.job.assetId===intent.assetId && c.record.job.intentId===intent.intentId,'INTERNAL_ERROR');
 checkAuthorization(auth,command.identity,c.record,intent.intentId);
 requireRelation(auth.uploaderUid===intent.actors.uploaderUid && auth.assetId===intent.assetId && auth.intentId===intent.intentId,'FORBIDDEN');
 const request={expectedIntentRevision:command.expectedIntentRevision,input:command.input,metadataDigest:command.metadataDigest},requestHash=hash(request);
 if(c.record!==null){
  const record=c.record,q=record.queueRecord;
  requireRelation(same(q.identity,command.identity));
  requireRelation(q.requestHash===requestHash,'IDEMPOTENCY_PAYLOAD_MISMATCH');
  requireRelation(command.intentId===intent.intentId && command.uploaderUid===record.uploaderUid,'VALIDATION_ERROR');
  return plan('QUEUE',{type:'REPLAY',jobId:record.job.jobId,observedJobRevision:record.job.revision,identity:q.identity,requestHash},record,null,q.response,'REPLAY');
 }
 requireRelation(intent.assetId===command.identity.resourceId && intent.intentId===command.intentId,'VALIDATION_ERROR');
 requireRelation(intent.state==='QUEUED' && command.expectedIntentRevision===intent.revision);
 const job={contractRevision:2,jobId:command.allocatedJobId,intentId:intent.intentId,assetId:intent.assetId,kind:command.input.kind,state:'QUEUED',revision:0,attempt:0,lease:null,outputBinding:null};
 const response={contractRevision:2,jobId:job.jobId,intentId:job.intentId,assetId:job.assetId,state:'QUEUED',jobRevision:0};
 const record={contractRevision:2,job,input:command.input,uploaderUid:command.uploaderUid,metadataDigest:command.metadataDigest,lastAttempt:null,failureClass:null,queueRecord:{identity:command.identity,requestHash,request,response},retryRecord:null,completion:null};
 return plan('QUEUE',{type:'CREATE_JOB',jobMappingAbsent:{assetId:job.assetId,intentId:job.intentId},allocatedJobIdAbsent:job.jobId,queueReceiptAbsent:command.identity,requestHash,intent:{assetId:job.assetId,intentId:job.intentId,revision:intent.revision,state:'QUEUED'}},record,null);
}
const claimCommandSchema=exact({jobId:id,workerId:id,expectedJobRevision:rev,expectedSlotRevision:rev,nowMs:time});
const ownerCommandSchema=exact({tuple:attemptTupleSchema,expectedJobRevision:rev,expectedSlotRevision:rev,nowMs:time});
function mutation(value,commandSchema,extras={}){boundedEnvelope(value,{context:z.unknown(),command:z.unknown(),...extras});return {c:parseContext(value.context),command:parse(commandSchema,value.command)};}
export function planClaimJob(value){
 const {c,command}=mutation(value,claimCommandSchema);cas(c,command);
 requireRelation(command.jobId===c.record.job.jobId && c.record.job.state==='QUEUED' && c.record.job.attempt<2 && c.slot.phase==='FREE');
 const expiresAtMs=leaseTime(command.nowMs),epoch=increment(c.slot.epoch),record=structuredClone(c.record);
 record.job.revision=increment(record.job.revision);record.job.attempt++;record.job.state='PROCESSING';record.job.lease={epoch,workerId:command.workerId,claimedAtMs:command.nowMs,heartbeatAtMs:command.nowMs,expiresAtMs};record.lastAttempt=tupleFrom(record.job);
 return plan('CLAIM',guard(c),record,{revision:increment(c.slot.revision),epoch,phase:'LEASED',holder:record.lastAttempt,expiresAtMs});
}
export function planHeartbeat(value){
 const {c,command}=mutation(value,ownerCommandSchema);cas(c,command);currentOwner(c,command.tuple);live(c,command.nowMs);
 const expiresAtMs=leaseTime(command.nowMs),record=structuredClone(c.record);record.job.revision=increment(record.job.revision);record.job.lease.heartbeatAtMs=command.nowMs;record.job.lease.expiresAtMs=expiresAtMs;
 return plan('HEARTBEAT',guard(c),record,{...c.slot,revision:increment(c.slot.revision),expiresAtMs});
}
export function planExpireLease(value){
 const {c,command}=mutation(value,ownerCommandSchema);cas(c,command);currentOwner(c,command.tuple);requireRelation(command.nowMs>=c.record.job.lease.expiresAtMs && command.nowMs>=c.record.job.lease.heartbeatAtMs);
 const record=structuredClone(c.record);record.job.revision=increment(record.job.revision);record.job.state='RECOVERY_REQUIRED';record.job.lease=null;record.failureClass='LEASE_EXPIRED';record.completion=null;
 return plan('EXPIRE_LEASE',guard(c),record,{revision:increment(c.slot.revision),epoch:c.slot.epoch,phase:'RECOVERY_REQUIRED',holder:c.slot.holder,expiresAtMs:null});
}
export function planFinishJob(value){
 const {c,command}=mutation(value,ownerCommandSchema,{outcome:z.unknown()});const outcome=parse(outcomeSchema,value.outcome);cas(c,command);currentOwner(c,command.tuple);live(c,command.nowMs);
 requireRelation(same(outcome.tuple,command.tuple),'VALIDATION_ERROR');
 const record=structuredClone(c.record);record.job.revision=increment(record.job.revision);record.job.lease=null;record.completion=outcome;
 let slot;
 if(outcome.verification==='MEDIA_READY_ATTEMPT'){
  requireRelation(readyMatches(outcome,record),'VALIDATION_ERROR');record.job.state='READY';record.job.outputBinding=outcome.binding;record.failureClass=null;slot=freeSlot(c);
 }else{
  record.failureClass=outcome.failureClass;record.job.state=outcome.failureClass==='VALIDATION'?'REJECTED':'RECOVERY_REQUIRED';
  slot=outcome.failureClass==='VALIDATION'?freeSlot(c):{revision:increment(c.slot.revision),epoch:c.slot.epoch,phase:'RECOVERY_REQUIRED',holder:c.slot.holder,expiresAtMs:null};
 }
 return plan('FINISH',guard(c),record,slot);
}
const releaseCommandSchema=exact({tuple:attemptTupleSchema,expectedJobRevision:rev,expectedSlotRevision:rev});
export function planReleaseRecoveredSlot(value){
 const {c,command}=mutation(value,releaseCommandSchema,{quiescence:z.unknown()});const quiescence=parse(quiescenceFactSchema,value.quiescence,'INTERNAL_ERROR');cas(c,command);
 requireRelation(c.record.job.state==='RECOVERY_REQUIRED' && c.slot.phase==='RECOVERY_REQUIRED' && same(command.tuple,c.record.lastAttempt) && same(command.tuple,c.slot.holder));requireRelation(same(command.tuple,quiescence.tuple),'INTERNAL_ERROR');
 return plan('RELEASE_RECOVERED_SLOT',guard(c),c.record,freeSlot(c));
}
const retryCommandSchema=exact({identity:retryIdentitySchema,request:retryRequestSchema,expectedSlotRevision:rev});
export function planRetryJob(value){
 boundedEnvelope(value,{context:z.unknown(),command:z.unknown(),authorization:z.unknown(),quiescence:z.unknown(),reservation:z.unknown()});
 const command=parse(retryCommandSchema,value.command),auth=parse(authorizationSchema,value.authorization,'INTERNAL_ERROR');
 checkAuthorization(auth,command.identity,value.context?.record);
 const c=parseContext(value.context);
 // Replay validates the stored tagged record and immutable identity/hash first;
 // fresh quota/quiescence facts are not consumed again by an exact replay.
 const requestHash=hash(command.request),prior=c.record.retryRecord;
 if(prior!==null && same(prior.identity,command.identity)){
  requireRelation(prior.requestHash===requestHash,'IDEMPOTENCY_PAYLOAD_MISMATCH');
  return plan('RETRY',{type:'REPLAY',jobId:c.record.job.jobId,observedJobRevision:c.record.job.revision,identity:prior.identity,requestHash},c.record,c.slot,prior.response,'REPLAY');
 }
 const job=c.record.job;
 const quiescence=parse(quiescenceFactSchema.nullable(),value.quiescence,'INTERNAL_ERROR'),reservation=parse(retryReservationFactSchema.nullable(),value.reservation,'INTERNAL_ERROR');
 requireRelation(command.request.jobId===job.jobId,'VALIDATION_ERROR');
 requireRelation(prior===null && job.state==='RECOVERY_REQUIRED' && c.record.failureClass==='INFRASTRUCTURE' && job.attempt===1 && command.request.expectedJobRevision===job.revision && command.expectedSlotRevision===c.slot.revision);
 requireRelation(quiescence!==null && same(quiescence.tuple,c.record.lastAttempt),'INTERNAL_ERROR');
 requireRelation(reservation!==null && reservation.assetId===job.assetId && reservation.uploaderUid===c.record.uploaderUid && reservation.kind===job.kind && reservation.jobId===job.jobId && reservation.attempt===2,'INTERNAL_ERROR');
 requireRelation(c.slot.phase==='FREE' || c.slot.phase==='RECOVERY_REQUIRED' && same(c.slot.holder,c.record.lastAttempt));
 const record=structuredClone(c.record);record.job.revision=increment(record.job.revision);record.job.state='QUEUED';record.failureClass=null;record.completion=null;
 const response={contractRevision:2,operation:'JOB_RETRY',assetId:job.assetId,intentId:job.intentId,requestId:command.identity.requestId,revision:record.job.revision,state:'QUEUED',jobId:job.jobId,jobRevision:record.job.revision};
 record.retryRecord={identity:command.identity,requestHash,request:command.request,reservationId:reservation.reservationId,quiescence,response};
 const slot=c.slot.phase==='FREE'?c.slot:freeSlot(c);
 return plan('RETRY',{...guard(c),type:'RETRY',retryIdentity:command.identity,requestHash,retryReservation:{reservationId:reservation.reservationId,reservationRevision:0,quotaRevision:reservation.quotaRevision,fingerprint:reservation.fingerprint}},record,slot,response);
}
