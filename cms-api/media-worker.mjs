import {randomUUID} from 'node:crypto';
import {constants} from 'node:fs';
import {lstat,mkdir,open} from 'node:fs/promises';
import {resolve,dirname,sep} from 'node:path';
import {ApiError} from '../contracts/errors.mjs';
import {resourceIdSchema} from '../contracts/hero.mjs';
import {MEDIA_UPLOAD_CAPS,mediaAssetIdSchema} from '../contracts/media-upload.mjs';
import {parseMediaMetadataV2,hashMediaMetadataV2} from '../contracts/media-v3-metadata-v2.mjs';
import {readyVersionV2Schema,normalizedDerivativeProjectionV2,bindingFromReadyVersionV2,canonicalMediaV2Json} from '../contracts/media-v3-contract-v2.mjs';
import {validateAuthorityEnvelopeV2,readyFactV2Schema,cacheFactV2Schema,quiescenceFactV2Schema} from '../contracts/media-v3-authority-v2.mjs';
import {uploadRecordSchema,expectedUploadFromRecord,mediaV2DocumentId} from './media-upload-domain.mjs';
import {J1_LIMITS,parseJobRecord,parseGlobalSlot,planClaimJob,planHeartbeat,planFinishJob} from './media-jobs-domain.mjs';
import {parseQuotaView,parseReservation,planClaimWrite,planMarkUncertain,planSettleWrite,planReleaseUnused,planCloseActiveSlot} from './media-quota-domain.mjs';
import {createLocalMediaUploadStorage} from './media-upload-storage.mjs';
import {readRegularFile} from '../scripts/media-tool-audit.mjs';
import {validateRuntime,PROJECT} from '../scripts/local-guard.mjs';
import {IMAGE_SCRATCH_ROOT,readImageFile,readImageManifestPair,validateImageContainer,processImage} from './media-images.mjs';
import {PDF_SCRATCH_ROOT,processPdf} from './media-pdf.mjs';
import {VIDEO_SCRATCH_ROOT,processVideo} from './media-video.mjs';
import {loadMediaProcessingProfile,validateMediaProcessingExecution,hashMediaProcessingValue as hash,hashMediaProcessingBytes as digest} from './media-processing-profile.mjs';

export {resolveMediaProcessingBindings} from './media-processing-profile.mjs';
const proof=()=>randomUUID();
const demand=(condition,code='REVISION_CONFLICT')=>{if(!condition)throw new ApiError(code);};
const same=(a,b)=>canonicalMediaV2Json(a)===canonicalMediaV2Json(b);
const storageGeneration=value=>typeof value==='string'&&/^[1-9][0-9]{0,127}$/.test(value);
const normalizedEmail=value=>typeof value==='string'?value.trim().toLowerCase():'';
const globalQuotaFields=['revision','retainedBytes','reservedBytes','uncertainBytes','versionCount','activeProjectIntents'];

function parseIdentity(value){
 demand(value!==null&&typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype,'VALIDATION_ERROR');
 const keys=['jobId','intentId','assetId'],ds=Object.getOwnPropertyDescriptors(value);
 demand(Reflect.ownKeys(value).length===keys.length&&keys.every(key=>ds[key]?.enumerable&&Object.hasOwn(ds[key],'value')),'VALIDATION_ERROR');
 return {jobId:resourceIdSchema.parse(value.jobId),intentId:resourceIdSchema.parse(value.intentId),assetId:mediaAssetIdSchema.parse(value.assetId)};
}
function dataObservation(value){
 if(!value||typeof value!=='object'||Object.getPrototypeOf(value)!==Object.prototype)return null;
 for(const key of Reflect.ownKeys(value))if(typeof key!=='string'||!Object.hasOwn(Object.getOwnPropertyDescriptor(value,key),'value'))return null;
 return value;
}
function currentObservation(result,error){
 const object=result??error,key=result?'runtime':'observation';
 const descriptor=object&&Object.getOwnPropertyDescriptor(object,key);
 return descriptor&&Object.hasOwn(descriptor,'value')?dataObservation(descriptor.value):null;
}
function closureReported(observation){
 return observation!==null&&!observation.controlError&&Number.isInteger(observation.pid)&&observation.pid>0&&(observation.closed===true||observation.close===true)&&observation.reaped===true&&Array.isArray(observation.remainingPids)&&observation.remainingPids.length===0&&Object.hasOwn(observation,'exit')&&Object.hasOwn(observation,'signal')&&(observation.exit!==null||observation.signal!==null);
}
function nativeSetClosed(kind,result){
 return kind==='IMAGE'||result?.nativeSummary?.allReaped===true&&Number.isSafeInteger(result.nativeSummary.count)&&result.nativeSummary.count>0;
}
async function privateDirectory(path,base){
 demand(path===base||path.startsWith(base+sep),'VALIDATION_ERROR');
 let cursor=sep;
 for(const part of path.split(sep).filter(Boolean)){
  cursor=resolve(cursor,part);const s=await lstat(cursor);
  demand(s.isDirectory()&&!s.isSymbolicLink(),'INTERNAL_ERROR');
  const privateBase=dirname(IMAGE_SCRATCH_ROOT);
  if(cursor===privateBase||cursor.startsWith(privateBase+sep))demand(s.uid===process.getuid()&&(s.mode&0o777)===0o700,'INTERNAL_ERROR');
 }
}
async function allocateWork(kind,bytes){
 const root=kind==='IMAGE'?IMAGE_SCRATCH_ROOT:kind==='PDF'?PDF_SCRATCH_ROOT:VIDEO_SCRATCH_ROOT;
 await privateDirectory(root,root);
 const parent=resolve(root,`worker-${proof()}`);await mkdir(parent,{mode:0o700});await privateDirectory(parent,root);
 let inputDirectory=parent;
 if(kind==='PDF'){inputDirectory=resolve(parent,'originals');await mkdir(inputDirectory,{mode:0o700});await privateDirectory(inputDirectory,root);}
 const input=resolve(inputDirectory,kind==='VIDEO'?'original.mp4':kind==='PDF'?'original.pdf':'original.bin');
 const fd=await open(input,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
 try{await fd.writeFile(bytes);await fd.sync();}finally{await fd.close();}
 return {input,attemptDirectory:resolve(parent,'attempt')};
}
function processorOutputs(kind,result){
 if(kind==='IMAGE')return result.outputs.map(output=>({file:output.file,key:`image-${output.targetWidth}`,role:'IMAGE',mimeType:'image/webp',sizeBytes:output.bytes,sha256:output.sha256,width:output.width,height:output.height,targetWidth:output.targetWidth}));
 if(kind==='PDF')return [...result.pages.map(page=>({file:page.webp.file,key:`page-${page.page}`,role:'PDF_PAGE',mimeType:'image/webp',sizeBytes:page.webp.bytes,sha256:page.webp.sha256,width:page.width,height:page.height,pageNumber:page.page})),{file:result.pdf.file,key:'pdf-download',role:'PDF_DOWNLOAD',mimeType:'application/pdf',sizeBytes:result.pdf.bytes,sha256:result.pdf.sha256}];
 throw new ApiError('VALIDATION_ERROR');
}

/** Dependencies are server-owned capabilities, not HTTP body values. Native work starts after CLAIM. */
export async function createMediaWorker({db,storage=createLocalMediaUploadStorage(),authorizeUploader,auth,cache,recovery,clock=Date.now,workerId=`worker_${proof()}`,onError=error=>console.error('media_worker_failure',{code:error.code??'INTERNAL_ERROR'})}){
 demand(db&&typeof db.runTransaction==='function'&&typeof storage.readOriginal==='function'&&typeof storage.writeDerivative==='function'&&typeof storage.readDerivative==='function','LOCAL_RUNTIME_UNAVAILABLE');
 resourceIdSchema.parse(workerId);
 const ownedCache=cache??(await import('./media-cache.mjs')).createMediaCache();
 const ownedRecovery=recovery??(await import('./media-recovery.mjs')).createMediaRecovery({db,clock});
 demand(ownedCache&&typeof ownedCache.verifyAttempt==='function'&&ownedRecovery&&typeof ownedRecovery.recoverExpiredMediaJobs==='function','LOCAL_RUNTIME_UNAVAILABLE');
 const ref=(collection,key)=>db.collection(collection).doc(key);
 const jobRef=id=>ref('cmsMediaJobs',mediaV2DocumentId({kind:'JOB',jobId:id}));
 const uploadRef=id=>ref('cmsMediaUploads',mediaV2DocumentId({kind:'INTENT',intentId:id}));
 const metadataRef=id=>ref('cmsMediaMetadata',mediaV2DocumentId({kind:'INTENT',intentId:id}));
 const slotRef=ref('cmsMediaProcessingSlots','global'),quotaRef=ref('cmsMediaQuota','global');
 const guard=()=>{validateRuntime(process.env,undefined,{server:true});demand(db.projectId===PROJECT,'LOCAL_RUNTIME_UNAVAILABLE');};
 const run=callback=>{guard();return db.runTransaction(async tx=>{guard();return callback(tx);},{maxAttempts:5});};
 const pending=new Map();let draining=false,retryTimer=null,retries=0;

 async function currentUploader(tx,uid){
  if(authorizeUploader){
   const actor=await authorizeUploader({transaction:tx,uploaderUid:uid});
   demand(actor?.uid===uid&&['OWNER','EDITOR'].includes(actor.role)&&Number.isSafeInteger(actor.authzVersion)&&actor.authzVersion>=1,'FORBIDDEN');
   return {uid:actor.uid,role:actor.role,authzVersion:actor.authzVersion};
  }
  const user=await (auth??(await import('./authorization.mjs')).auth).getUser(uid);
  const snapshot=await tx.get(ref('cmsMembers',uid)),member=snapshot.data();
  demand(user.uid===uid&&!user.disabled&&user.emailVerified===true&&member?.uid===uid&&member.isActive===true&&Number.isSafeInteger(member.authzVersion)&&member.authzVersion>0&&['OWNER','EDITOR'].includes(member.role)&&normalizedEmail(member.expectedEmail)&&normalizedEmail(member.expectedEmail)===normalizedEmail(user.email),'FORBIDDEN');
  return {uid,role:member.role,authzVersion:member.authzVersion};
 }
 async function context(tx,identity,{initializeSlot=false,authorize=false}={}){
  const js=await tx.get(jobRef(identity.jobId)),us=await tx.get(uploadRef(identity.intentId)),ms=await tx.get(metadataRef(identity.intentId)),ss=await tx.get(slotRef);
  demand(js.exists&&us.exists&&ms.exists,'NOT_FOUND');
  const record=parseJobRecord(js.data()),upload=uploadRecordSchema.parse(us.data()),metadataRow=ms.data(),metadata=parseMediaMetadataV2(metadataRow.metadata);
  const h=upload.intentHeader,c=upload.completion;
  demand(record.job.jobId===identity.jobId&&record.job.assetId===identity.assetId&&record.job.intentId===identity.intentId&&h.assetId===identity.assetId&&h.intentId===identity.intentId&&h.state==='QUEUED'&&c!==null&&c.allocatedJobId===identity.jobId&&c.effect.phase==='RETAINED');
  demand(same(record.input,c.input)&&record.uploaderUid===h.actors.uploaderUid&&record.job.kind===h.core.kind&&record.metadataDigest===h.metadataBinding.metadataDigest&&metadataRow.contractRevision===2&&metadataRow.assetId===identity.assetId&&metadataRow.intentId===identity.intentId&&hashMediaMetadataV2(metadata,{hashCanonical:hash}).metadataDigest===record.metadataDigest);
  let slot;
  if(ss.exists)slot=parseGlobalSlot(ss.data());
  else{
   demand(initializeSlot,'INTERNAL_ERROR');
   const old=await tx.get(db.collection('cmsMediaJobs').where('job.state','!=','QUEUED').limit(1));
   demand(old.empty,'LOCAL_RUNTIME_UNAVAILABLE');
   slot=parseGlobalSlot({revision:0,epoch:0,phase:'FREE',holder:null,expiresAtMs:null});
  }
  const authorization=authorize?await currentUploader(tx,record.uploaderUid):null;
  return {record,slot,upload,metadata,header:h,authorization};
 }
 function owner(c,tuple){
  demand(c.record.job.state==='PROCESSING'&&c.slot.phase==='LEASED'&&same(c.record.lastAttempt,tuple)&&same(c.slot.holder,tuple)&&c.record.job.lease.expiresAtMs>clock());
 }
 function saveJob(tx,plan){
  demand(plan.guards.type==='JOB_SLOT'&&plan.action==='APPLY');
  tx.set(jobRef(plan.nextRecord.job.jobId),plan.nextRecord);tx.set(slotRef,plan.nextSlot);
 }
 async function quota(tx,c,reservationId=c.record.job.attempt===2?c.record.retryRecord?.reservationId:c.upload.reservationDescriptor.id){
  demand(typeof reservationId==='string');
  const uploaderRef=ref('cmsMediaUploaderQuota',c.record.uploaderUid),reservationRef=ref('cmsMediaReservations',reservationId);
  const gs=await tx.get(quotaRef),us=await tx.get(uploaderRef),rs=await tx.get(reservationRef);
  demand(gs.exists&&us.exists&&rs.exists,'INTERNAL_ERROR');
  const q=parseQuotaView({uploaderUid:c.record.uploaderUid,quota:{...gs.data(),activeUploaderIntents:us.data().activeIntents}}),reservation=parseReservation(rs.data());
  const d=reservation.descriptor;
  demand(d.id===reservationId&&d.assetId===c.record.job.assetId&&d.kind===c.record.job.kind&&d.uploaderUid===c.record.uploaderUid);
  demand(reservationId===c.upload.reservationDescriptor.id?same(d,c.upload.reservationDescriptor):d.purpose==='RETRY'&&d.attempt===2&&d.jobId===c.record.job.jobId);
  return {quota:q,reservation,uploaderRef,reservationRef};
 }
 async function terminalReservations(tx,c){
  const current=await quota(tx,c);
  const original=c.record.job.attempt===2?await quota(tx,c,c.upload.reservationDescriptor.id):null;
  return {current,original};
 }
 function closeReservations(tx,reservations,{disposition,tuple,terminalProofId,writersProofId}){
  let q=reservations.current.quota;
  const changes=[];
  for(const record of [reservations.current,reservations.original].filter(Boolean)){
   const r=record.reservation;
   demand(r.effects.every(effect=>['RETAINED','ABSENT'].includes(effect.status)));
   const release=planReleaseUnused({context:{quota:q,reservation:r},command:{reservation:r.descriptor,expectedQuotaRevision:q.quota.revision,expectedReservationRevision:r.revision}});
   const close=planCloseActiveSlot({context:{quota:release.nextQuota,reservation:release.nextReservation},command:{reservation:release.nextReservation.descriptor,expectedQuotaRevision:release.nextQuota.quota.revision,expectedReservationRevision:release.nextReservation.revision},fact:{verification:'RESERVATION_TERMINAL_AND_QUIESCENT',reservation:r.descriptor,disposition,jobId:tuple.jobId,completedAttempt:tuple.attempt,terminalProofId,writersProofId}});
   q=close.nextQuota;changes.push({ref:record.reservationRef,value:close.nextReservation});
  }
  const {activeUploaderIntents,...global}=q.quota;
  tx.set(quotaRef,global);tx.set(reservations.current.uploaderRef,{activeIntents:activeUploaderIntents});
  for(const change of changes)tx.set(change.ref,change.value);
 }
 function saveQuota(tx,p,q){
  if(p.action==='REPLAY')return;
  demand(p.guards.type==='UPDATE'&&p.guards.quotaRevision===q.quota.quota.revision&&p.guards.reservationId===q.reservation.descriptor.id&&p.guards.reservationRevision===q.reservation.revision);
  const global=Object.fromEntries(globalQuotaFields.map(k=>[k,p.nextQuota.quota[k]]));
  tx.set(quotaRef,global);tx.set(q.uploaderRef,{activeIntents:p.nextQuota.quota.activeUploaderIntents});tx.set(q.reservationRef,p.nextReservation);
 }
 function ownerCommand(c,tuple){return {tuple,expectedJobRevision:c.record.job.revision,expectedSlotRevision:c.slot.revision,nowMs:clock()};}
 async function claim(identity){
  return run(async tx=>{
   const c=await context(tx,identity,{initializeSlot:true,authorize:true});
   if(c.record.job.state!=='QUEUED')return {notQueued:true,record:c.record};
   if(c.slot.phase!=='FREE')return {busy:true,recovery:c.slot.phase==='RECOVERY_REQUIRED'};
   const versionRef=ref('cmsMediaVersions',identity.assetId),version=await tx.get(versionRef);
   const previous=version.exists?version.data():{archived:false,revision:0};
   demand(!version.exists||previous.assetId===identity.assetId&&previous.kind===c.record.job.kind&&previous.actors?.uploaderUid===c.record.uploaderUid&&previous.status==='RECOVERY_REQUIRED'&&typeof previous.archived==='boolean'&&Number.isSafeInteger(previous.revision)&&previous.revision>=0);
   const q=await quota(tx,c);demand(q.reservation.state==='OPEN');
   const plan=planClaimJob({context:{record:c.record,slot:c.slot},command:{jobId:identity.jobId,workerId,expectedJobRevision:c.record.job.revision,expectedSlotRevision:c.slot.revision,nowMs:clock()}});
   saveJob(tx,plan);
   tx.set(versionRef,{contractRevision:2,assetId:identity.assetId,kind:c.record.job.kind,status:'PROCESSING',archived:previous.archived,revision:previous.revision,createdAtMs:c.header.createdAtMs,metadata:c.metadata,actors:c.header.actors});
   return {...c,record:plan.nextRecord,slot:plan.nextSlot};
  });
 }
 async function heartbeat(identity,tuple){
  return run(async tx=>{
   const c=await context(tx,identity);owner(c,tuple);
   const plan=planHeartbeat({context:{record:c.record,slot:c.slot},command:ownerCommand(c,tuple)});saveJob(tx,plan);
  });
 }
 async function claimDerivative(identity,tuple,descriptor){
  const allocation={effectId:proof(),writerId:proof(),objectId:proof()};
  return run(async tx=>{
   const c=await context(tx,identity);owner(c,tuple);const q=await quota(tx,c);
   const refs=Object.values(allocation).map(id=>ref('cmsMediaGlobalIds',id));
   for(const r of refs)demand(!(await tx.get(r)).exists);
   const declaration={effectId:allocation.effectId,writerId:allocation.writerId,budgetBytes:descriptor.sizeBytes,content:{sizeBytes:descriptor.sizeBytes,sha256:descriptor.sha256}};
   const fingerprint=hash({reservation:q.reservation.descriptor,declaration});
   const p=planClaimWrite({context:{quota:q.quota,reservation:q.reservation},command:{reservation:q.reservation.descriptor,expectedQuotaRevision:q.quota.quota.revision,expectedReservationRevision:q.reservation.revision,declaration,fingerprint}});
   saveQuota(tx,p,q);refs.forEach(r=>tx.create(r,{contractRevision:2,jobId:identity.jobId,assetId:identity.assetId}));
   const d=q.reservation.descriptor;
   return {objectId:allocation.objectId,tuple:{reservationId:d.id,assetId:d.assetId,uploaderUid:d.uploaderUid,kind:d.kind,attempt:d.attempt,effectId:allocation.effectId,writerId:allocation.writerId,fingerprint}};
  });
 }
 async function updateWrite(identity,tuple,effect,{outcome}={}){
  return run(async tx=>{
   const c=await context(tx,identity);owner(c,tuple);const q=await quota(tx,c);
   const command={tuple:effect.tuple,expectedQuotaRevision:q.quota.quota.revision,expectedReservationRevision:q.reservation.revision};
   const plan=outcome?planSettleWrite({context:{quota:q.quota,reservation:q.reservation},command,outcome}):planMarkUncertain({context:{quota:q.quota,reservation:q.reservation},command});saveQuota(tx,plan,q);
  });
 }
 async function executeClaimed(identity,claimed){
  const tuple=claimed.record.lastAttempt,abort=new AbortController();let heartbeatTask=null,heartbeatError=null;
  let result=null,nativeError=null,observation=null,activeWrite=false,localWritePending=false,processorCalled=false;const stored=[],uncertainWrites=new Set();
  const interval=setInterval(()=>{
   if(heartbeatTask)return;
   heartbeatTask=heartbeat(identity,tuple).catch(error=>{heartbeatError=error;abort.abort();}).finally(()=>{heartbeatTask=null;});
  },J1_LIMITS.heartbeatMs);
  try{
   const input=claimed.record.input,profile=loadMediaProcessingProfile(input.kind);
   demand(profile.processingRecipeSha256===input.processingRecipeSha256&&profile.toolSetSha256===input.toolSetSha256);
   const completed=claimed.upload.completion;
   const original=await storage.readOriginal({assetId:identity.assetId,originalId:completed.originalId,generation:completed.effect.generation,sizeBytes:input.inputBytes,sha256:input.originalSha256});
   demand(Buffer.isBuffer(original)&&original.length===input.inputBytes&&digest(original)===input.originalSha256);
   if(input.kind==='IMAGE')validateImageContainer(original,claimed.header.core.declaredMime);
   localWritePending=true;const work=await allocateWork(input.kind,original);localWritePending=false;
   if(abort.signal.aborted)throw heartbeatError??new ApiError('REVISION_CONFLICT');
   const request={...work,expectedSha256:input.originalSha256,signal:abort.signal,...(input.kind==='IMAGE'?{declaredMime:claimed.header.core.declaredMime}:{})};
   processorCalled=true;
   try{result=await {IMAGE:processImage,PDF:processPdf,VIDEO:processVideo}[input.kind](request);}
   catch(error){nativeError=error;throw error;}
   finally{observation=currentObservation(result,nativeError);}
   demand(closureReported(observation)&&observation.exit===0&&observation.signal===null&&nativeSetClosed(input.kind,result),'LOCAL_RUNTIME_UNAVAILABLE');
   if(heartbeatError)throw heartbeatError;
   const execution=validateMediaProcessingExecution(profile,result);
   let derivatives;
   if(input.kind==='VIDEO'){
    const {mapVideoJobResult}=await import('./media-video-job.mjs');
    const mapped=await mapVideoJobResult({result,tuple,toolSetManifest:profile.toolSetManifest,originalSha256:input.originalSha256,inputBytes:input.inputBytes});
    derivatives=mapped.outputs;
   }else derivatives=processorOutputs(input.kind,result);
   demand(derivatives.length>0&&derivatives.length<=256&&derivatives.reduce((n,d)=>n+d.sizeBytes,0)<=MEDIA_UPLOAD_CAPS[input.kind].derivativeBytes);
   if(input.kind==='IMAGE'){
    const encoded=Buffer.from(JSON.stringify(result));readImageManifestPair(work.attemptDirectory,{expectedSha256:digest(encoded),expectedBytes:encoded.length});
   }
   for(const descriptor of derivatives){
    if(heartbeatError||abort.signal.aborted)throw heartbeatError??new ApiError('REVISION_CONFLICT');
    demand(/^(image-(320|960|1920)\.webp|page-[1-9][0-9]*\.webp|raster-only\.pdf|safe\.mp4|poster\.webp)$/.test(descriptor.file));
    const path=resolve(work.attemptDirectory,descriptor.file),before=await lstat(path);
    demand(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&before.uid===process.getuid()&&(before.mode&0o777)===0o600);
    const bytes=input.kind==='IMAGE'?(await readImageFile(path,descriptor.sizeBytes)).bytes:await readRegularFile(path,descriptor.sizeBytes);
    const after=await lstat(path);demand(['dev','ino','uid','mode','nlink','size','mtimeMs','ctimeMs'].every(k=>before[k]===after[k])&&bytes.length===descriptor.sizeBytes&&digest(bytes)===descriptor.sha256);
    const effect=await claimDerivative(identity,tuple,descriptor);
    uncertainWrites.add(effect.tuple.effectId);
    // Uncertainty is committed before external IO, so a lost callback cannot refund or retry a write.
    await updateWrite(identity,tuple,effect);
    activeWrite=true;let object;
    try{
     object=await storage.writeDerivative({...tuple,objectId:effect.objectId,bytes,mimeType:descriptor.mimeType,sha256:descriptor.sha256});
     demand(storageGeneration(object.generation)&&object.sizeBytes===bytes.length&&object.mimeType===descriptor.mimeType&&object.sha256===descriptor.sha256&&object.key===`private/media/v2/${identity.assetId}/jobs/${identity.jobId}/${tuple.attempt}/${tuple.leaseEpoch}/${effect.objectId}`);
     const readBack=await storage.readDerivative(object);demand(Buffer.isBuffer(readBack)&&readBack.equals(bytes));
    }finally{activeWrite=false;}
    const outcome={verification:'WRITE_RETAINED_AND_QUIESCENT',tuple:effect.tuple,content:{sizeBytes:bytes.length,sha256:descriptor.sha256,generation:object.generation},proofId:proof()};
    await updateWrite(identity,tuple,effect,{outcome});
    uncertainWrites.delete(effect.tuple.effectId);
    const {file,...fields}=descriptor;
    stored.push({descriptor:{...fields,generation:object.generation},bytes,object});
   }
   const descriptors=normalizedDerivativeProjectionV2(stored.map(item=>item.descriptor)),derivativeSetSha256=hash(descriptors);
   const geometry=input.kind==='IMAGE'?{width:result.source.width,height:result.source.height}:input.kind==='PDF'?{pageCount:result.pageCount}:{width:result.video.width,height:result.video.height,durationSeconds:result.video.duration};
   const readyVersion=readyVersionV2Schema.parse({contractRevision:2,assetId:identity.assetId,kind:input.kind,originalSha256:input.originalSha256,originalSizeBytes:input.inputBytes,processingRecipeSha256:input.processingRecipeSha256,toolSetSha256:input.toolSetSha256,derivativeSetSha256,metadataDigest:claimed.record.metadataDigest,derivatives:descriptors,status:'READY',archived:false,revision:0,uploaderUid:claimed.record.uploaderUid,...geometry});
   const binding=bindingFromReadyVersionV2(readyVersion),manifestReceiptId=proof();
   localWritePending=true;
   const cached=await ownedCache.verifyAttempt({tuple,binding,metadataDigest:claimed.record.metadataDigest,manifestReceiptId,derivatives:stored.map(({descriptor,bytes})=>({descriptor,bytes}))});
   cacheFactV2Schema.parse(cached.fact);localWritePending=false;
   const quiescence=quiescenceFactV2Schema.parse({contractRevision:2,verification:'LOCAL_ATTEMPT_QUIESCENT',tuple,proofId:proof()});
   const readyFact=readyFactV2Schema.parse({contractRevision:2,verification:'MEDIA_READY_ATTEMPT',tuple,binding,metadataDigest:claimed.record.metadataDigest,storage:{contractRevision:2,verification:'MEDIA_STORAGE_FULL_NORMALIZED_SET',tuple,binding,metadataDigest:claimed.record.metadataDigest,originalGeneration:completed.effect.generation,generationBoundDerivativeSetSha256:derivativeSetSha256,manifestReceiptId},cache:cached.fact,quiescence,proofId:proof()});
   clearInterval(interval);if(heartbeatTask)await heartbeatTask;if(heartbeatError)throw heartbeatError;
   return await finishReady(identity,tuple,{readyVersion,readyFact,execution,profile,stored,authorization:claimed.authorization,originalId:completed.originalId,originalGeneration:completed.effect.generation});
  }catch(error){
   clearInterval(interval);if(heartbeatTask)await heartbeatTask;
   const noActorStarted=!processorCalled&&!activeWrite&&!localWritePending&&uncertainWrites.size===0;
   const controlUnknown=/PROCESS_CONTROL|CLEANUP_TIMEOUT|PIPE_HOLD|GROUP|ANCESTRY|ATTEMPT_CHANGED|CUSTODY_CHANGED/.test(nativeError?.code??'');
   const nativeClosed=!controlUnknown&&closureReported(observation)&&(result===null||nativeSetClosed(claimed.record.job.kind,result));
   return await finishFailure(identity,tuple,error,noActorStarted||nativeClosed&&!activeWrite&&!localWritePending&&uncertainWrites.size===0,claimed);
  }finally{clearInterval(interval);}
 }
 async function finishReady(identity,tuple,value){
  return run(async tx=>{
   const c=await context(tx,identity,{authorize:true});owner(c,tuple);const reservations=await terminalReservations(tx,c);
   demand(same(c.authorization,value.authorization),'FORBIDDEN');
   const versionRef=ref('cmsMediaVersions',identity.assetId),old=await tx.get(versionRef);
   demand(old.exists&&old.data().assetId===identity.assetId&&old.data().kind===c.record.job.kind&&old.data().status==='PROCESSING'&&old.data().actors?.uploaderUid===c.record.uploaderUid&&typeof old.data().archived==='boolean'&&Number.isSafeInteger(old.data().revision)&&old.data().revision>=0);
   const readyVersion=readyVersionV2Schema.parse({...value.readyVersion,archived:old.data().archived,revision:old.data().revision});
   demand(value.readyVersion.metadataDigest===c.record.metadataDigest&&value.originalId===c.upload.completion.originalId&&value.originalGeneration===c.upload.completion.effect.generation);
   const evidenceRef=ref('cmsMediaProcessingEvidence',value.readyFact.storage.manifestReceiptId),evidence=await tx.get(evidenceRef);
   demand(!evidence.exists);
   const plan=planFinishJob({context:{record:c.record,slot:c.slot},command:ownerCommand(c,tuple),outcome:value.readyFact});
   validateAuthorityEnvelopeV2({readyVersion,actors:c.header.actors,metadata:c.metadata,readyFact:value.readyFact},{expectedUpload:expectedUploadFromRecord(c.upload),expectedJob:{record:plan.nextRecord,toolSetManifest:value.profile.toolSetManifest,processingProgram:value.profile.program,originalMetadata:value.execution.originalMetadata,executionRecipe:value.execution.executionRecipe},profileId:value.profile.profileId,hashCanonical:hash});
   closeReservations(tx,reservations,{disposition:'READY',tuple,terminalProofId:value.readyFact.proofId,writersProofId:value.readyFact.quiescence.proofId});
   saveJob(tx,plan);
   tx.create(evidenceRef,{contractRevision:2,tuple,profileId:value.profile.profileId,processingProgram:value.profile.program,executionRecipe:value.execution.executionRecipe,executionRecipeSha256:value.execution.executionRecipeSha256,originalMetadata:value.execution.originalMetadata,toolSetSha256:c.record.input.toolSetSha256,processingRecipeSha256:c.record.input.processingRecipeSha256});
   tx.set(versionRef,{...old.data(),status:'READY',metadata:c.metadata,actors:c.header.actors,readyVersion,readyFact:value.readyFact,storage:{original:{key:`private/media/v2/${identity.assetId}/originals/${value.originalId}`,generation:value.originalGeneration,sizeBytes:c.record.input.inputBytes,sha256:c.record.input.originalSha256},derivatives:value.stored.map(item=>({key:item.descriptor.key,objectKey:item.object.key,generation:item.object.generation,sizeBytes:item.object.sizeBytes,mimeType:item.object.mimeType,sha256:item.object.sha256}))}});
   return {jobId:identity.jobId,state:'READY'};
  });
 }
 async function finishFailure(identity,tuple,error,closed,claimed){
  return run(async tx=>{
   const js=await tx.get(jobRef(identity.jobId)),ss=await tx.get(slotRef);
   demand(js.exists&&ss.exists);
   const c={...claimed,record:parseJobRecord(js.data()),slot:parseGlobalSlot(ss.data())};owner(c,tuple);
   const versionRef=ref('cmsMediaVersions',identity.assetId),version=await tx.get(versionRef),previous=version.data();
   demand(version.exists&&previous.assetId===identity.assetId&&previous.kind===c.record.job.kind&&previous.status==='PROCESSING'&&previous.actors?.uploaderUid===c.record.uploaderUid&&typeof previous.archived==='boolean'&&Number.isSafeInteger(previous.revision)&&previous.revision>=0);
   const reservations=await terminalReservations(tx,c),q=reservations.current;
   const unsettled=[q,reservations.original].filter(Boolean).some(value=>value.reservation.effects.some(effect=>['RESERVED','UNCERTAIN'].includes(effect.status)));
   closed=closed&&!unsettled;
   const code=typeof error.code==='string'?error.code:'INTERNAL_ERROR';
   const validation=closed&&/^(IMAGE|PDF|VIDEO)_(REQUEST|SIGNATURE|MIME|CONTAINER|ANIMATION|METADATA|INPUT_SIZE|PAGES|ENCRYPTED|FULL_DECODE|MANIFEST)/.test(code);
   const outcome={contractRevision:2,verification:'MEDIA_ATTEMPT_FAILED',tuple,failureClass:validation?'VALIDATION':closed?'INFRASTRUCTURE':'UNKNOWN',proofId:proof(),quiescence:closed?{contractRevision:2,verification:'LOCAL_ATTEMPT_QUIESCENT',tuple,proofId:proof()}:null};
   const plan=planFinishJob({context:{record:c.record,slot:c.slot},command:ownerCommand(c,tuple),outcome});
   if(validation){
    closeReservations(tx,reservations,{disposition:'REJECTED',tuple,terminalProofId:outcome.proofId,writersProofId:outcome.quiescence.proofId});
   }else{
    // A persisted claim is not an absence proof, even when external IO never returned.
    let state={quota:q.quota,reservation:q.reservation};
    for(const effect of q.reservation.effects.filter(e=>e.status==='RESERVED')){
     const d=state.reservation.descriptor;
     const p=planMarkUncertain({context:state,command:{tuple:{reservationId:d.id,assetId:d.assetId,uploaderUid:d.uploaderUid,kind:d.kind,attempt:d.attempt,effectId:effect.declaration.effectId,writerId:effect.declaration.writerId,fingerprint:effect.fingerprint},expectedQuotaRevision:state.quota.quota.revision,expectedReservationRevision:state.reservation.revision}});
     state={quota:p.nextQuota,reservation:p.nextReservation};
    }
    if(state.reservation!==q.reservation){
     const {activeUploaderIntents,...global}=state.quota.quota;
     tx.set(quotaRef,global);tx.set(q.uploaderRef,{activeIntents:activeUploaderIntents});tx.set(q.reservationRef,state.reservation);
    }
   }
   saveJob(tx,plan);
   tx.set(versionRef,{contractRevision:2,assetId:identity.assetId,kind:c.record.job.kind,status:plan.nextRecord.job.state,archived:previous.archived,revision:previous.revision,createdAtMs:c.header.createdAtMs,metadata:c.metadata,actors:c.header.actors});
   return {jobId:identity.jobId,state:plan.nextRecord.job.state};
  });
 }
 async function drain(){
  if(draining)return;draining=true;
  try{
   while(pending.size){
    const [key,identity]=pending.entries().next().value;
    try{
     const claimed=await claim(identity);
     if(claimed.busy){
      // LEASED contention gets a finite local retry. Recovery requires the durable consumer.
      if(!claimed.recovery&&retries<6&&!retryTimer){
       retries++;retryTimer=setTimeout(()=>{retryTimer=null;drain().catch(onError);},J1_LIMITS.heartbeatMs);retryTimer.unref?.();
      }
      return;
     }
     pending.delete(key);retries=0;
     if(!claimed.notQueued)await executeClaimed(identity,claimed);
    }catch(error){pending.delete(key);onError(error);}
   }
  }finally{draining=false;}
 }
 function enqueue(value){
  const identity=parseIdentity(value);demand(pending.size<200||pending.has(identity.jobId),'LOCAL_RUNTIME_UNAVAILABLE');
  pending.set(identity.jobId,identity);queueMicrotask(()=>{drain().catch(onError);});
  // This ACK is scheduling only. READY is written solely by the fenced terminal transaction.
  return Promise.resolve(identity);
 }
 async function start({limit=20}={}){
  demand(Number.isInteger(limit)&&limit>=1&&limit<=20,'VALIDATION_ERROR');
  guard();
  await ownedRecovery.recoverExpiredMediaJobs({limit});
  const slot=await slotRef.get();
  if(slot.exists&&parseGlobalSlot(slot.data()).phase==='RECOVERY_REQUIRED')return {scheduled:0,recoveryRequired:true};
  retries=0;
  const rows=await db.collection('cmsMediaJobs').where('contractRevision','==',2).where('job.state','==','QUEUED').orderBy('__name__').limit(limit).get();
  for(const row of rows.docs){const record=parseJobRecord(row.data());await enqueue({jobId:record.job.jobId,intentId:record.job.intentId,assetId:record.job.assetId});}
  return {scheduled:rows.docs.length};
 }
 function startPump(){
  let stopped=false,scan=null;
  const tick=()=>{if(stopped||scan)return;scan=start().catch(onError).finally(()=>{scan=null;});};
  const timer=setInterval(tick,J1_LIMITS.heartbeatMs);timer.unref?.();tick();
  return Object.freeze({stop(){stopped=true;clearInterval(timer);if(retryTimer){clearTimeout(retryTimer);retryTimer=null;}}});
 }
 return Object.freeze({enqueue,start,startPump,processQueuedJob:async value=>{
  const identity=parseIdentity(value),claimed=await claim(identity);
  if(claimed.busy)return {jobId:identity.jobId,state:'QUEUED',scheduled:false};
  if(claimed.notQueued)return {jobId:identity.jobId,state:claimed.record?.job.state??'NOT_QUEUED'};
  return executeClaimed(identity,claimed);
 }});
}

let defaultWorker;
function localWorker(){
 if(!defaultWorker)defaultWorker=(async()=>{const {db,auth}=await import('./authorization.mjs');return createMediaWorker({db,auth});})().catch(error=>{defaultWorker=null;throw error;});
 return defaultWorker;
}
export async function enqueueMediaJob(value){
 const identity=parseIdentity(value);
 return (await localWorker()).enqueue(identity);
}
export async function startMediaJobPump({db,storage,authorizeUploader,auth,cache,recovery,clock,workerId,onError}={}){
 const worker=db?await createMediaWorker({db,storage,authorizeUploader,auth,cache,recovery,clock,workerId,onError}):await localWorker();
 return worker.startPump();
}
