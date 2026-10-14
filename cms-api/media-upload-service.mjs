import {randomUUID,createHash} from 'node:crypto';
import {z} from 'zod';
import {ApiError,validationError} from '../contracts/errors.mjs';
import {canonicalMediaV2Json as canonicalJson} from '../contracts/media-v3-contract-v2.mjs';
import {resourceIdSchema,idempotencyKeySchema,revisionSchema} from '../contracts/hero.mjs';
import {parseMediaMetadataV2,hashMediaMetadataV2} from '../contracts/media-v3-metadata-v2.mjs';
import {uploadCoreSchema,UPLOAD_LIMITS,MEDIA_UPLOAD_CAPS} from '../contracts/media-upload.mjs';
import {mediaV2DocumentId,uploadRecordSchema,operationRecordSchema,expectedUploadFromRecord,planCreateUpload,planBeginPart,planRecordPartOutcome,planBeginComplete,planRecordOriginalOutcome,planCompleteUpload,planCancelUpload} from './media-upload-domain.mjs';
import {parseQuotaView,parseReservation,planReserveUpload,planReserveRetry,planClaimWrite,planMarkUncertain,planSettleWrite,planReleaseUnused,planCloseActiveSlot} from './media-quota-domain.mjs';
import {parseJobRecord,parseGlobalSlot,planQueueJob,planRetryJob} from './media-jobs-domain.mjs';
import {createLocalMediaUploadStorage} from './media-upload-storage.mjs';

const hash=value=>createHash('sha256').update(canonicalJson(value),'utf8').digest('hex');
const byteHash=bytes=>createHash('sha256').update(bytes).digest('hex');
const proof=()=>randomUUID();
const requireValue=(condition,code='INTERNAL_ERROR')=>{if(!condition)throw new ApiError(code);};
const createBody=z.strictObject({name:z.string(),requestId:idempotencyKeySchema,kind:z.enum(['IMAGE','PDF','VIDEO']),declaredMime:z.string(),inputBytes:z.number().int().positive()});
const revisionBody=z.strictObject({expectedIntentRevision:revisionSchema});
const retryBody=z.strictObject({expectedJobRevision:revisionSchema});
const parse=(schema,value)=>{try{return schema.parse(value);}catch(error){throw validationError(error);}};
const stored=(schema,value)=>{try{return schema.parse(value);}catch{throw new ApiError('INTERNAL_ERROR');}};
const identity=(actor,operation,resourceId,key,partIndex)=>({actorUid:actor.uid,operation,resourceId,requestId:parse(idempotencyKeySchema,key),...(partIndex===undefined?{}:{partIndex})});
const initialQuota={revision:0,retainedBytes:0,reservedBytes:0,uncertainBytes:0,versionCount:0,activeProjectIntents:0};

/** SDK loading stays behind the existing demo/local guard in authorization.
 * Dependencies are server capabilities; none are accepted from HTTP bodies. */
export async function createMediaUploadService(options={}){
 const local=options.db && options.authorize?null:await import('./authorization.mjs');
 const db=options.db??local.db,authorize=options.authorize??local.authorize;
 const storage=options.storage??createLocalMediaUploadStorage();
 const processingBindings=options.processingBindings??(async value=>{
  const profile=await import('./media-processing-profile.mjs');
  if(typeof profile.resolveMediaProcessingBindings!=='function')throw new ApiError('LOCAL_RUNTIME_UNAVAILABLE');
  return profile.resolveMediaProcessingBindings(value);
 });
 const scheduleJob=options.scheduleJob??(async value=>{
  const worker=await import('./media-worker.mjs');
  if(typeof worker.enqueueMediaJob!=='function')throw new ApiError('LOCAL_RUNTIME_UNAVAILABLE');
  return worker.enqueueMediaJob(value);
 });
 async function notifyQueued(response){
  try{await scheduleJob({jobId:response.jobId,intentId:response.intentId,assetId:response.assetId});}
  catch{console.warn('MEDIA_QUEUE_SCHEDULER_UNAVAILABLE',{jobId:response.jobId});}
 }
 const ref=(collection,key)=>db.collection(collection).doc(key);
 const intentRef=intentId=>ref('cmsMediaUploads',mediaV2DocumentId({kind:'INTENT',intentId}));
 const operationRef=i=>ref('cmsMediaOperations',mediaV2DocumentId({kind:'OPERATION',identity:i}));
 const metadataRef=intentId=>ref('cmsMediaMetadata',mediaV2DocumentId({kind:'INTENT',intentId}));
 const assetIntentRef=assetId=>ref('cmsMediaIntentMappings',mediaV2DocumentId({kind:'ASSET_INTENT',assetId}));
 const jobRef=jobId=>ref('cmsMediaJobs',mediaV2DocumentId({kind:'JOB',jobId}));
 const assetJobRef=assetId=>ref('cmsMediaJobMappings',mediaV2DocumentId({kind:'ASSET_JOB',assetId}));
 const quotaRef=ref('cmsMediaQuota','global'),slotRef=ref('cmsMediaProcessingSlots','global');
 const run=callback=>db.runTransaction(callback,{maxAttempts:5}).catch(error=>{if(error.code===10)throw new ApiError('IDEMPOTENCY_IN_PROGRESS');throw error;});

 async function currentAuth(tx,request,actor,action='MEDIA_UPLOAD'){
  const current=await authorize(request,action,tx);
  requireValue(current.uid===actor.uid,'FORBIDDEN');return current;
 }
 function authorization(actor,record,operation){
  const base={contractRevision:2,actorUid:actor.uid,role:actor.role==='OWNER'?'OWNER':'UPLOADER',uploaderUid:record?.intentHeader.actors.uploaderUid??actor.uid,proofId:proof()};
  if(operation==='UPLOAD_CREATE')return {...base,verification:'MEDIA_UPLOAD_CREATE_AUTHORIZED'};
  requireValue(actor.role==='OWNER'||record.intentHeader.actors.uploaderUid===actor.uid,'FORBIDDEN');
  return {...base,verification:operation==='UPLOAD_COMPLETE'?'MEDIA_UPLOAD_COMPLETE_AUTHORIZED':'MEDIA_UPLOAD_MUTATION_AUTHORIZED',...(operation==='UPLOAD_COMPLETE'?{}:{operation}),assetId:record.intentHeader.assetId,intentId:record.intentHeader.intentId};
 }
 async function readRecord(tx,intentId){
  parse(resourceIdSchema,intentId);const snapshot=await tx.get(intentRef(intentId));
  if(!snapshot.exists)throw new ApiError('NOT_FOUND');
  const record=stored(uploadRecordSchema,snapshot.data());requireValue(record.intentHeader.intentId===intentId);return record;
 }
 async function readOperation(tx,i){const snapshot=await tx.get(operationRef(i));return snapshot.exists?stored(operationRecordSchema,snapshot.data()):null;}
 async function loadQuota(tx,uploaderUid,reservationId=null){
  const uploaderRef=ref('cmsMediaUploaderQuota',uploaderUid);
  const globalSnapshot=await tx.get(quotaRef),uploaderSnapshot=await tx.get(uploaderRef);
  // Never initialize a zero ledger over retained historical media. Existing
  // data without a ledger requires an explicit migration, not an implicit reset.
  if(!globalSnapshot.exists){
   for(const collection of ['cmsMediaVersions','cmsMediaUploads','cmsMediaJobs','cmsMediaReservations']){
    const existing=await tx.get(db.collection(collection).limit(1));
    if(!existing.empty)throw new ApiError('LOCAL_RUNTIME_UNAVAILABLE');
   }
  }
  const global=globalSnapshot.exists?globalSnapshot.data():initialQuota;
  if(!uploaderSnapshot.exists){
   const active=await tx.get(db.collection('cmsMediaReservations').where('descriptor.uploaderUid','==',uploaderUid).where('holdsActiveSlot','==',true).limit(1));
   if(!active.empty)throw new ApiError('LOCAL_RUNTIME_UNAVAILABLE');
  }
  const quota=parseQuotaView({uploaderUid,quota:{...global,activeUploaderIntents:uploaderSnapshot.exists?uploaderSnapshot.data().activeIntents:0}});
  const reservationSnapshot=reservationId?await tx.get(ref('cmsMediaReservations',reservationId)):null;
  const reservation=reservationSnapshot?.exists?parseReservation(reservationSnapshot.data()):null;
  return {quota,reservation,uploaderRef};
 }
 function saveQuota(tx,plan,uploaderRef){
  if(plan.action==='REPLAY')return;
  const {activeUploaderIntents,...global}=plan.nextQuota.quota;
  tx.set(quotaRef,global);tx.set(uploaderRef,{activeIntents:activeUploaderIntents});
  tx.set(ref('cmsMediaReservations',plan.nextReservation.descriptor.id),plan.nextReservation);
 }
 function context(record,operation,q=null){return {record,operation,nowMs:Date.now(),quotaObservation:q?{quotaRevision:q.quota.quota.revision,reservationRevision:q.reservation?.revision??null}:null};}
 async function allocate(tx,ids){
  requireValue(new Set(ids).size===ids.length);
  for(const id of ids){
   parse(resourceIdSchema,id);
   for(const collection of ['cmsMediaGlobalIds','cmsMediaVersions','cmsMediaUploads','cmsMediaJobs','cmsMediaReservations']){
    if((await tx.get(ref(collection,id))).exists)throw new ApiError('REVISION_CONFLICT');
   }
   for(const reference of [intentRef(id),jobRef(id),assetIntentRef(id),assetJobRef(id)]){
    if((await tx.get(reference)).exists)throw new ApiError('REVISION_CONFLICT');
   }
   // Historical documents can use another key format. Check their persisted
   // logical IDs as well as the new namespace and shared allocation ledger.
   for(const [collection,field] of [['cmsMediaVersions','assetId'],['cmsMediaUploads','intentHeader.intentId'],['cmsMediaUploads','intentHeader.assetId'],['cmsMediaJobs','job.jobId'],['cmsMediaJobs','job.assetId']]){
    if(!(await tx.get(db.collection(collection).where(field,'==',id).limit(1))).empty)throw new ApiError('REVISION_CONFLICT');
   }
  }
 }
 function saveAllocations(tx,ids){for(const id of ids)tx.create(ref('cmsMediaGlobalIds',id),{id,contractRevision:2});}
 function saveUpload(tx,plan){
  if(['REPLAY','REPLAY_EFFECT'].includes(plan.action))return;
  tx.set(intentRef(plan.nextRecord.intentHeader.intentId),plan.nextRecord);
  tx.set(operationRef(plan.nextOperation.receipt.identity),plan.nextOperation);
 }
 function quotaFact(plan){
  const r=plan.nextReservation;
  return {contractRevision:2,verification:'QUOTA_UPLOAD_PLANNED',operation:plan.operation,action:plan.action,guards:plan.guards,descriptor:r.descriptor,fingerprint:r.fingerprint,nextQuotaRevision:plan.nextQuota.quota.revision,reservationRevision:r.revision,state:r.state,freeReservedBytes:r.freeReservedBytes,holdsActiveSlot:r.holdsActiveSlot,proofId:proof()};
 }
 function claim(q,allocation,content){
  const declaration={effectId:allocation.effectId,writerId:allocation.writerId,budgetBytes:content.sizeBytes,content},reservation=q.reservation.descriptor;
  const plan=planClaimWrite({context:{quota:q.quota,reservation:q.reservation},command:{reservation,expectedQuotaRevision:q.quota.quota.revision,expectedReservationRevision:q.reservation.revision,declaration,fingerprint:hash({reservation,declaration})}});
  requireValue(plan.action==='APPLY','IDEMPOTENCY_IN_PROGRESS');
  return {plan,fact:{contractRevision:2,verification:'QUOTA_WRITE_PLANNED',operation:'CLAIM_WRITE',action:'APPLY',guards:plan.guards,reservation,declaration,fingerprint:hash({reservation,declaration}),nextQuotaRevision:plan.nextQuota.quota.revision,nextReservationRevision:plan.nextReservation.revision,proofId:proof()}};
 }
 function applyQuotaRequirement(q,requirement){
  const fn={MARK_UNCERTAIN:planMarkUncertain,SETTLE_WRITE:planSettleWrite,RELEASE_UNUSED:planReleaseUnused}[requirement.operation];
  requireValue(typeof fn==='function');return fn({context:{quota:q.quota,reservation:q.reservation},command:requirement.command,...(requirement.outcome?{outcome:requirement.outcome}:{})});
 }
 function closeCancelledQuota(plan,record){
  const reservation=plan.nextReservation;
  if(record.intentHeader.state!=='CANCELLED'||reservation.state!=='DRAINING'||!reservation.effects.every(effect=>['RETAINED','ABSENT'].includes(effect.status)))return plan;
  return planCloseActiveSlot({context:{quota:plan.nextQuota,reservation},command:{reservation:reservation.descriptor,expectedQuotaRevision:plan.nextQuota.quota.revision,expectedReservationRevision:reservation.revision},fact:{verification:'RESERVATION_TERMINAL_AND_QUIESCENT',reservation:reservation.descriptor,disposition:'CANCELLED',jobId:null,completedAttempt:0,terminalProofId:proof(),writersProofId:proof()}});
 }

 async function createUpload({request,actor,body,key}){
  const parsed=parse(createBody,body);let metadata;
  try{metadata=parseMediaMetadataV2({name:parsed.name});}catch(error){throw validationError(error);}
  requireValue(parsed.requestId===key,'VALIDATION_ERROR');
  const core=parse(uploadCoreSchema,{requestId:parsed.requestId,kind:parsed.kind,declaredMime:parsed.declaredMime,inputBytes:parsed.inputBytes});
  const {metadataDigest}=hashMediaMetadataV2(metadata,{hashCanonical:hash});
  const allocation={assetId:randomUUID(),intentId:randomUUID(),reservationId:randomUUID()};
  return run(async tx=>{
   const current=await currentAuth(tx,request,actor),i=identity(current,'UPLOAD_CREATE','MEDIA_UPLOADS',key),old=await readOperation(tx,i);
   const record=old?await readRecord(tx,old.allocation.intentId):null;
   const fact={contractRevision:2,verification:'UPLOAD_METADATA_VALIDATED',kind:core.kind,metadataDigest,uploaderUid:current.uid,proofId:record?.metadataProofId??proof()};
   if(old)return planCreateUpload({context:context(record,old),command:{identity:i,core},authorization:authorization(current,null,i.operation),metadataFact:fact,allocation:null,quotaFact:null}).nextOperation.receipt.publicReceipt;
   const q=await loadQuota(tx,current.uid),mapping=await tx.get(assetIntentRef(allocation.assetId));
   requireValue(!mapping.exists,'REVISION_CONFLICT');await allocate(tx,Object.values(allocation));
   const descriptor={id:allocation.reservationId,assetId:allocation.assetId,uploaderUid:current.uid,kind:core.kind,purpose:'UPLOAD',attempt:0,inputBytes:core.inputBytes,jobId:null};
   const qp=planReserveUpload({context:{quota:q.quota,reservation:null,idAllocation:null},command:{descriptor,fingerprint:hash(descriptor),expectedQuotaRevision:q.quota.quota.revision}});
   const plan=planCreateUpload({context:context(null,null,q),command:{identity:i,core},authorization:authorization(current,null,i.operation),metadataFact:fact,allocation,quotaFact:quotaFact(qp)});
   saveAllocations(tx,Object.values(allocation));saveQuota(tx,qp,q.uploaderRef);saveUpload(tx,plan);
   tx.create(assetIntentRef(allocation.assetId),{contractRevision:2,assetId:allocation.assetId,intentId:allocation.intentId});
   tx.create(metadataRef(allocation.intentId),{contractRevision:2,assetId:allocation.assetId,intentId:allocation.intentId,metadata});
   return plan.nextOperation.receipt.publicReceipt;
  });
 }

 async function recordWrite({request,actor,intentId,identity:i,write,bytes,original=false}){
  let result;
  try{
   const observed=await storage.writeUpload(write,bytes);
   result={verification:'WRITE_RETAINED_AND_QUIESCENT',tuple:write.tuple,content:{sizeBytes:observed.sizeBytes,sha256:observed.sha256,generation:observed.generation},proofId:proof()};
  }catch{result={verification:'UPLOAD_WRITE_OUTCOME_UNKNOWN',tuple:write.tuple,proofId:proof()};}
  const resultPlan=await run(async tx=>{
   const current=await currentAuth(tx,request,actor),record=await readRecord(tx,intentId),old=await readOperation(tx,i),q=await loadQuota(tx,record.intentHeader.actors.uploaderUid,record.reservationDescriptor.id);
   requireValue(q.reservation!==null);
   const plan=(original?planRecordOriginalOutcome:planRecordPartOutcome)({context:context(record,old,q),identity:i,authorization:authorization(current,record,i.operation),expectedIntentRevision:record.intentHeader.revision,outcome:{contractRevision:2,target:write.target,result}});
   if(plan.action==='REPLAY_EFFECT')return plan;
   const qp=closeCancelledQuota(applyQuotaRequirement(q,plan.quotaRequirement),plan.nextRecord);saveQuota(tx,qp,q.uploaderRef);saveUpload(tx,plan);return plan;
  });
  if(result.verification==='UPLOAD_WRITE_OUTCOME_UNKNOWN')throw new ApiError('IDEMPOTENCY_IN_PROGRESS');
  return resultPlan;
 }

 async function uploadPart({request,actor,intentId,partIndex,key,bytes,expectedIntentRevision,offsetBytes,sha256}){
  requireValue(Buffer.isBuffer(bytes)&&bytes.length>0&&bytes.length<=UPLOAD_LIMITS.partBytes,'PAYLOAD_TOO_LARGE');
  requireValue(Number.isSafeInteger(partIndex)&&partIndex>=0&&partIndex<=31&&Number.isSafeInteger(offsetBytes)&&offsetBytes>=0&&/^[a-f0-9]{64}$/.test(sha256)&&byteHash(bytes)===sha256,'VALIDATION_ERROR');
  parse(revisionSchema,expectedIntentRevision);
  const allocation={partId:randomUUID(),effectId:randomUUID(),writerId:randomUUID()};
  const staged=await run(async tx=>{
   const current=await currentAuth(tx,request,actor),record=await readRecord(tx,intentId),i=identity(current,'UPLOAD_PART',record.intentHeader.assetId,key,partIndex),old=await readOperation(tx,i);
   const byteFact={contractRevision:2,verification:'PART_BYTES_HASHED',assetId:record.intentHeader.assetId,intentId,part:{index:partIndex,offsetBytes,sizeBytes:bytes.length,sha256},proofId:proof()};
   const command={identity:i,expectedIntentRevision,partIndex},auth=authorization(current,record,i.operation);
   if(old)return planBeginPart({context:context(record,old),command,authorization:auth,byteFact,allocation:null,quotaFact:null});
   const q=await loadQuota(tx,record.intentHeader.actors.uploaderUid,record.reservationDescriptor.id);requireValue(q.reservation!==null);
   // A duplicate accepted index uses its original writer/object and no second charge.
   if(record.parts.some(row=>row.part.index===partIndex)){
    const plan=planBeginPart({context:context(record,null,q),command,authorization:auth,byteFact,allocation:null,quotaFact:null});saveUpload(tx,plan);return plan;
   }
   await allocate(tx,Object.values(allocation));const claimPlan=claim(q,allocation,{sizeBytes:bytes.length,sha256});
   const plan=planBeginPart({context:context(record,null,q),command,authorization:auth,byteFact,allocation,quotaFact:claimPlan.fact});
   saveAllocations(tx,Object.values(allocation));saveQuota(tx,claimPlan.plan,q.uploaderRef);saveUpload(tx,plan);return plan;
  });
  if(staged.nextOperation.receipt.status==='SETTLED')return staged.nextOperation.receipt.publicReceipt;
  const settled=await recordWrite({request,actor,intentId,identity:staged.nextOperation.receipt.identity,write:staged.afterCommitWrite,bytes});
  requireValue(settled.nextOperation.receipt.status==='SETTLED','IDEMPOTENCY_IN_PROGRESS');return settled.nextOperation.receipt.publicReceipt;
 }

 async function completeUpload({request,actor,intentId,body,key}){
  const {expectedIntentRevision}=parse(revisionBody,body);
  const allocation={originalId:randomUUID(),effectId:randomUUID(),writerId:randomUUID(),allocatedJobId:randomUUID()};
  const prepared=await run(async tx=>{
   const current=await currentAuth(tx,request,actor),record=await readRecord(tx,intentId),i=identity(current,'UPLOAD_COMPLETE',record.intentHeader.assetId,key),old=await readOperation(tx,i),auth=authorization(current,record,i.operation);
   if(old)return {replay:planBeginComplete({context:context(record,old),command:{identity:i,expectedIntentRevision},authorization:auth,originalBytesFact:null,processingInputFact:null,allocation:null,quotaFact:null})};
   requireValue(record.intentHeader.state==='UPLOADING'&&record.intentHeader.revision===expectedIntentRevision,'REVISION_CONFLICT');
   requireValue(record.parts.length===Math.ceil(record.intentHeader.core.inputBytes/UPLOAD_LIMITS.partBytes)&&record.parts.every(row=>row.acceptedAtRevision!==null),'REVISION_CONFLICT');
   return {record,identity:i};
  });
  if(prepared.replay){const response=prepared.replay.nextOperation.receipt.publicReceipt;await notifyQueued(response);return response;}
  const record=prepared.record,h=record.intentHeader,rows=[...record.parts].sort((a,b)=>a.part.index-b.part.index),chunks=[];
  const originalHash=createHash('sha256');let size=0;
  for(const row of rows){
   const bytes=await storage.readPart({assetId:h.assetId,partId:row.partId,generation:row.effect.generation,...row.part});
   size+=bytes.length;requireValue(size<=h.core.inputBytes);originalHash.update(bytes);chunks.push(bytes);
  }
  requireValue(size===h.core.inputBytes);let originalBytes=Buffer.concat(chunks,size);chunks.length=0;const originalSha256=originalHash.digest('hex');
  const bindings=await processingBindings({kind:h.core.kind,originalBytes,declaredMime:h.core.declaredMime,assetId:h.assetId,intentId});
  requireValue(bindings&&Object.keys(bindings).sort().join(',')==='processingRecipeSha256,toolSetSha256'&&Object.values(bindings).every(value=>/^[a-f0-9]{64}$/.test(value)));
  const input={assetId:h.assetId,kind:h.core.kind,originalSha256,inputBytes:size,...bindings};
  const orderedPartsSha256=hash({assetId:h.assetId,intentId,parts:rows.map(row=>({partId:row.partId,...row.part,generation:row.effect.generation,writerIdentity:{actorUid:row.writer.actorUid,operation:'UPLOAD_PART',resourceId:h.assetId,requestId:row.writer.requestId,partIndex:row.part.index}}))});
  const staged=await run(async tx=>{
   const current=await currentAuth(tx,request,actor),fresh=await readRecord(tx,intentId),old=await readOperation(tx,prepared.identity);
   const auth=authorization(current,fresh,'UPLOAD_COMPLETE');
   if(old)return planBeginComplete({context:context(fresh,old),command:{identity:prepared.identity,expectedIntentRevision},authorization:auth,originalBytesFact:null,processingInputFact:null,allocation:null,quotaFact:null});
   const q=await loadQuota(tx,fresh.intentHeader.actors.uploaderUid,fresh.reservationDescriptor.id);
   requireValue(q.reservation!==null);await allocate(tx,Object.values(allocation));
   const mapping=await tx.get(assetJobRef(h.assetId));requireValue(!mapping.exists,'REVISION_CONFLICT');
   const claimPlan=claim(q,allocation,{sizeBytes:size,sha256:originalSha256});
   const plan=planBeginComplete({context:context(fresh,null,q),command:{identity:prepared.identity,expectedIntentRevision},authorization:auth,originalBytesFact:{contractRevision:2,verification:'ORDERED_ORIGINAL_BYTES_HASHED',assetId:h.assetId,intentId,inputBytes:size,orderedPartsSha256,originalSha256,proofId:proof()},processingInputFact:{contractRevision:2,verification:'PROCESSING_INPUT_BOUND',assetId:h.assetId,intentId,actors:h.actors,input,metadataDigest:h.metadataBinding.metadataDigest,proofId:proof()},allocation,quotaFact:claimPlan.fact});
   saveAllocations(tx,Object.values(allocation));saveQuota(tx,claimPlan.plan,q.uploaderRef);saveUpload(tx,plan);return plan;
  });
  if(staged.nextOperation.receipt.status==='SETTLED'){originalBytes=null;const response=staged.nextOperation.receipt.publicReceipt;await notifyQueued(response);return response;}
  const observed=await recordWrite({request,actor,intentId,identity:prepared.identity,write:staged.afterCommitWrite,bytes:originalBytes,original:true});
  originalBytes=null;
  const response=await run(async tx=>{
   const current=await currentAuth(tx,request,actor),fresh=await readRecord(tx,intentId),old=await readOperation(tx,prepared.identity),metadataSnapshot=await tx.get(metadataRef(intentId));
   const jobSnapshot=await tx.get(jobRef(allocation.allocatedJobId)),mapping=await tx.get(assetJobRef(h.assetId));
   requireValue(metadataSnapshot.exists&&!jobSnapshot.exists&&!mapping.exists);
   const persisted=metadataSnapshot.data();let metadata;
   try{metadata=parseMediaMetadataV2(persisted.metadata);}catch{throw new ApiError('INTERNAL_ERROR');}
   requireValue(persisted.contractRevision===2&&persisted.assetId===h.assetId&&persisted.intentId===intentId&&hashMediaMetadataV2(metadata,{hashCanonical:hash}).metadataDigest===h.metadataBinding.metadataDigest);
   const auth=authorization(current,fresh,'UPLOAD_COMPLETE');
   const plan=planCompleteUpload({context:context(fresh,old),identity:prepared.identity,authorization:auth,expectedIntentRevision:observed.nextRecord.intentHeader.revision,queueBinding:{contractRevision:2,identity:prepared.identity,assetId:h.assetId,intentId,actors:h.actors,uploaderUid:h.actors.uploaderUid,expectedPostIntentRevision:fresh.intentHeader.revision+1,allocatedJobId:allocation.allocatedJobId,input,metadataDigest:h.metadataBinding.metadataDigest}});
   const queue=plan.queueRequirement;requireValue(queue!==null);
   const jp=planQueueJob({context:{record:null,expectedUpload:expectedUploadFromRecord(plan.nextRecord)},command:queue.command,original:queue.original,authorization:queue.authorization});
   requireValue(canonicalJson(jp.guards)===canonicalJson(queue.guard));
   saveUpload(tx,plan);tx.create(jobRef(allocation.allocatedJobId),jp.nextRecord);
   tx.create(assetJobRef(h.assetId),{contractRevision:2,assetId:h.assetId,intentId,jobId:allocation.allocatedJobId});
   return plan.nextOperation.receipt.publicReceipt;
  });
  // The durable queue is authoritative. A scheduler failure retains QUEUED;
  // replay must still return the settled receipt rather than allocate another job.
  await notifyQueued(response);
  return response;
 }

 async function cancelUpload({request,actor,intentId,body,key}){
  const commandBody=parse(revisionBody,body);
  return run(async tx=>{
   const current=await currentAuth(tx,request,actor),record=await readRecord(tx,intentId),i=identity(current,'UPLOAD_CANCEL',record.intentHeader.assetId,key),old=await readOperation(tx,i),auth=authorization(current,record,i.operation);
   if(old)return planCancelUpload({context:context(record,old),command:{identity:i,...commandBody},authorization:auth}).nextOperation.receipt.publicReceipt;
   const q=await loadQuota(tx,record.intentHeader.actors.uploaderUid,record.reservationDescriptor.id);requireValue(q.reservation!==null);
   const plan=planCancelUpload({context:context(record,null,q),command:{identity:i,...commandBody},authorization:auth}),release=applyQuotaRequirement(q,plan.quotaRequirement);
   // A late known outcome can also close this slot. UNKNOWN keeps it held.
   const qp=closeCancelledQuota(release,plan.nextRecord);
   saveQuota(tx,qp,q.uploaderRef);saveUpload(tx,plan);return plan.nextOperation.receipt.publicReceipt;
  });
 }

 async function retryJob({request,actor,jobId,body,key}){
  parse(resourceIdSchema,jobId);const parsed=parse(retryBody,body),reservationId=randomUUID();
  const response=await run(async tx=>{
   const current=await currentAuth(tx,request,actor,'MEDIA_RETRY'),snapshot=await tx.get(jobRef(jobId));
   if(!snapshot.exists)throw new ApiError('NOT_FOUND');const record=parseJobRecord(snapshot.data());
   requireValue(current.role==='OWNER'||current.uid===record.uploaderUid,'FORBIDDEN');
   requireValue(record.job.jobId===jobId);
   const i=identity(current,'JOB_RETRY',record.job.assetId,key),retryRequest={jobId,expectedJobRevision:parsed.expectedJobRevision};
   // parseJobRecord validates tagged historical receipt relationships. Do not
   // require a fresh slot, quota, lease or CAS for an already settled operation.
   if(record.retryRecord&&canonicalJson(record.retryRecord.identity)===canonicalJson(i)){
    requireValue(record.retryRecord.requestHash===hash(retryRequest),'IDEMPOTENCY_PAYLOAD_MISMATCH');return record.retryRecord.response;
   }
   const slotSnapshot=await tx.get(slotRef);requireValue(slotSnapshot.exists,'LOCAL_RUNTIME_UNAVAILABLE');const slot=parseGlobalSlot(slotSnapshot.data());
   const command={identity:i,request:retryRequest,expectedSlotRevision:slot.revision};
   const auth={contractRevision:2,verification:'MEDIA_MUTATION_AUTHORIZED',actorUid:current.uid,role:current.role==='OWNER'?'OWNER':'UPLOADER',uploaderUid:record.uploaderUid,assetId:record.job.assetId,jobId,proofId:proof()};
   const quiescence=record.completion?.quiescence??null;requireValue(quiescence!==null,'REVISION_CONFLICT');
   const q=await loadQuota(tx,record.uploaderUid);await allocate(tx,[reservationId]);
   const descriptor={id:reservationId,assetId:record.job.assetId,uploaderUid:record.uploaderUid,kind:record.job.kind,purpose:'RETRY',attempt:2,inputBytes:null,jobId};
   const qp=planReserveRetry({context:{quota:q.quota,reservation:null,idAllocation:null},command:{descriptor,fingerprint:hash(descriptor),expectedQuotaRevision:q.quota.quota.revision}});
   const reservation={contractRevision:2,verification:'QUOTA_RETRY_RESERVED',reservationId,assetId:record.job.assetId,uploaderUid:record.uploaderUid,kind:record.job.kind,jobId,purpose:'RETRY',attempt:2,fingerprint:hash(descriptor),quotaRevision:qp.nextQuota.quota.revision,reservationRevision:0,state:'OPEN',freeReservedBytes:MEDIA_UPLOAD_CAPS[record.job.kind].derivativeBytes,holdsActiveSlot:false,proofId:proof()};
   const jp=planRetryJob({context:{record,slot},command,authorization:auth,quiescence,reservation});
   saveAllocations(tx,[reservationId]);saveQuota(tx,qp,q.uploaderRef);tx.set(jobRef(jobId),jp.nextRecord);tx.set(slotRef,jp.nextSlot);return jp.replayReceipt;
  });
  await notifyQueued(response);return response;
 }
 async function readJobSummary({request,jobId}){
  parse(resourceIdSchema,jobId);
  const actor=await authorize(request,'MEMBER_READ');
  const snapshot=await jobRef(jobId).get();
  if(!snapshot.exists)throw new ApiError('NOT_FOUND');
  const record=parseJobRecord(snapshot.data()),job=record.job;
  requireValue(job.jobId===jobId);
  const current=await authorize(request,'MEMBER_READ');
  requireValue(current.uid===actor.uid&&current.role===actor.role&&current.authzVersion===actor.authzVersion,'FORBIDDEN');
  const mayRetry=current.role==='OWNER'||current.role==='EDITOR'&&current.uid===record.uploaderUid;
  const canRetry=mayRetry&&job.state==='RECOVERY_REQUIRED'&&record.failureClass==='INFRASTRUCTURE'&&job.attempt===1&&record.retryRecord===null&&record.completion?.quiescence!=null;
  return {contractRevision:2,jobId:job.jobId,intentId:job.intentId,assetId:job.assetId,kind:job.kind,state:job.state,jobRevision:job.revision,attempt:job.attempt,canRetry};
 }
 return Object.freeze({createUpload,uploadPart,completeUpload,cancelUpload,retryJob,readJobSummary});
}
