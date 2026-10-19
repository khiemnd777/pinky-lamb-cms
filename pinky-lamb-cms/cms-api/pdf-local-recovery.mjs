import {promisify} from 'node:util';
import {execFile} from 'node:child_process';
import {lstat,readdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID,createHash} from 'node:crypto';
import {ApiError} from '../contracts/errors.mjs';
import {canonicalJson} from '../contracts/draft.mjs';
import {readRegularFile} from '../scripts/media-tool-audit.mjs';
import {PROJECT} from '../scripts/local-guard.mjs';
import {validateCmsServerRuntime} from '../scripts/local-data-guard.mjs';
import {parseJobRecord,parseGlobalSlot,planReleaseRecoveredSlot} from './media-jobs-domain.mjs';
import {uploadRecordSchema,mediaV2DocumentId} from './media-upload-domain.mjs';
import {parseQuotaView,parseReservation,planReleaseUnused,planCloseActiveSlot} from './media-quota-domain.mjs';
import {PDF_RECOVERY_CUSTODY,PDF_OUTPUT_RECOVERY_CUSTODY,PDF_COMBINED_RECOVERY_CUSTODY,PDF_SCRATCH_RECOVERY_CUSTODY,PDF_EMPTY_ANNOTATIONS_RECOVERY_CUSTODY} from './pdf-recovery-custody.mjs';
import {expectedProcessingProgram} from '../contracts/media-v3-toolset-v2.mjs';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..'),SCRATCH=resolve(ROOT,'.local/media-scratch/m3'),execute=promisify(execFile);
const sha=b=>createHash('sha256').update(b).digest('hex'),same=(a,b)=>canonicalJson(a)===canonicalJson(b);
const demand=v=>{if(!v){console.warn('PDF_RECOVERY_REFUSED',new Error('PDF recovery guard').stack);throw new ApiError('REVIEW_STATE_CONFLICT');}};
async function pinnedCustody(){const pin=PDF_RECOVERY_CUSTODY,bytes=await readRegularFile(resolve(ROOT,pin.path),pin.bytes);demand(bytes.length===pin.bytes&&sha(bytes)===pin.sha256);return JSON.parse(bytes);}
async function quiescence(custody,record){
 const historical=await readRegularFile(resolve(ROOT,'.local/p7-v3/pdf-recovery/historical-media-pdf.mjs'),1048576),source=historical.toString();
 demand(sha(historical)===custody.historicalProcessorSha256&&sha(historical)===expectedProcessingProgram('PDF').processorSha256&&source.indexOf("await verifyMediaTools('PDF')")<source.indexOf('await mkdir(attemptDirectory'));
 const root=await lstat(SCRATCH);demand(root.isDirectory()&&!root.isSymbolicLink()&&root.uid===process.getuid()&&(root.mode&0o777)===0o700);
 const entries=await readdir(SCRATCH);demand(entries.length<=4096);const names=entries.filter(n=>/^worker-[a-f0-9-]{36}$/.test(n));demand(names.length<=300);const matches=[];
 for(const name of names){const dir=resolve(SCRATCH,name),st=await lstat(dir);demand(st.isDirectory()&&!st.isSymbolicLink()&&st.uid===process.getuid()&&(st.mode&0o777)===0o700);const original=resolve(dir,'originals/original.pdf');let file;try{file=await lstat(original);}catch(error){if(error.code==='ENOENT')continue;throw error;}if(file.size!==record.input.inputBytes)continue;const bytes=await readRegularFile(original,record.input.inputBytes);if(sha(bytes)===record.input.originalSha256){demand(file.uid===process.getuid()&&(file.mode&0o777)===0o600);const contents=await readdir(dir);demand(contents.length===1&&contents[0]==='originals'&&(await readdir(resolve(dir,'originals'))).join(',')==='original.pdf');matches.push({directory:dir,originalSha256:sha(bytes),ino:file.ino,dev:file.dev,bytes:file.size});}}
 demand(matches.length===1);
 const result=await execute('/bin/ps',['-axo','pid=,ppid=,lstart=,command='],{env:{PATH:'/usr/bin:/bin',LANG:'C'},timeout:3000,maxBuffer:2*1048576});demand(!result.stderr);
 const rows=result.stdout.split('\n').filter(Boolean);demand(rows.length>0);
 // No attempt directory was ever allocated by the pinned historical producer.
 // Parent termination plus two actual process observations is required in addition.
 demand(!rows.some(line=>Number(line.trim().split(/\s+/)[0])===custody.ownerPid||line.includes(matches[0].directory)||line.includes('/cms-api/media-pdf-runtime.mjs')||line.includes('/poppler-26.10.0-cairo/bin/pdf')));
 return {observedAt:new Date().toISOString(),oldOwnerAbsent:true,noNativeAttemptProcesses:true,unallocatedAttempt:matches[0],historicalProcessorSha256:sha(historical),processSnapshotSha256:sha(result.stdout)};
}
/** Approved one-job local recovery. No public PID/path/profile, quota reset or job-state rewrite. */
export function createPdfLocalRecovery({db,authorize,storage}){
 const ref=(collection,id)=>db.collection(collection).doc(id),slotRef=ref('cmsMediaProcessingSlots','global'),quotaRef=ref('cmsMediaQuota','global');
 const guard=()=>{validateCmsServerRuntime();demand(db.projectId===PROJECT);};
 async function owner(request,actor,tx){guard();demand(request.headers.host==='127.0.0.1:5273');const current=await authorize(request,'DRAFT_PUBLISH',tx);demand(current.role==='OWNER'&&current.uid===actor.uid);}
 async function retire({request,actor,custody,observed,upload,original,fact,custodyPin,evidence,action}){
  const proofId=fact.proofId,terminalProofId=randomUUID(),auditRef=ref('cmsMediaRecoveries',custody.jobId),jobRef=ref('cmsMediaJobs',mediaV2DocumentId({kind:'JOB',jobId:custody.jobId})),uploadRef=ref('cmsMediaUploads',mediaV2DocumentId({kind:'INTENT',intentId:custody.intentId}));
  return db.runTransaction(async tx=>{
   await owner(request,actor,tx);const [js,us,ss,gs,qs,rs,as]=await Promise.all([tx.get(jobRef),tx.get(uploadRef),tx.get(slotRef),tx.get(quotaRef),tx.get(ref('cmsMediaUploaderQuota',actor.uid)),tx.get(ref('cmsMediaReservations',upload.reservationDescriptor.id)),tx.get(auditRef)]);
   if(as.exists){demand(as.data().actorUid===actor.uid);return as.data().receipt;}
   demand([js,us,ss,gs,qs,rs].every(s=>s.exists)&&same(js.data(),observed)&&same(us.data(),upload));const record=parseJobRecord(js.data()),slot=parseGlobalSlot(ss.data()),reservation=parseReservation(rs.data()),quota=parseQuotaView({uploaderUid:actor.uid,quota:{...gs.data(),activeUploaderIntents:qs.data().activeIntents}});
   demand(same(reservation.descriptor,upload.reservationDescriptor)&&reservation.state==='OPEN'&&reservation.effects.length===upload.parts.length+1&&reservation.effects.every(e=>e.status==='RETAINED'));
   const release=planReleaseRecoveredSlot({context:{record,slot},command:{tuple:record.lastAttempt,expectedJobRevision:record.job.revision,expectedSlotRevision:slot.revision},quiescence:fact});
   const unused=planReleaseUnused({context:{quota,reservation},command:{reservation:reservation.descriptor,expectedQuotaRevision:quota.quota.revision,expectedReservationRevision:reservation.revision}}),close=planCloseActiveSlot({context:{quota:unused.nextQuota,reservation:unused.nextReservation},command:{reservation:reservation.descriptor,expectedQuotaRevision:unused.nextQuota.quota.revision,expectedReservationRevision:unused.nextReservation.revision},fact:{verification:'RESERVATION_TERMINAL_AND_QUIESCENT',reservation:reservation.descriptor,disposition:'CANCELLED',jobId:custody.jobId,completedAttempt:1,terminalProofId,writersProofId:proofId}});
   demand(close.nextQuota.quota.retainedBytes===quota.quota.retainedBytes&&close.nextQuota.quota.uncertainBytes===quota.quota.uncertainBytes&&close.nextQuota.quota.versionCount===quota.quota.versionCount);
   await owner(request,actor,tx);const receipt={jobId:custody.jobId,assetId:custody.assetId,retired:true,state:'RECOVERY_REQUIRED',slot:'FREE',retainedBytes:close.nextQuota.quota.retainedBytes,proofId};
   const {activeUploaderIntents,...global}=close.nextQuota.quota;tx.set(slotRef,release.nextSlot);tx.set(quotaRef,global);tx.set(ref('cmsMediaUploaderQuota',actor.uid),{activeIntents:activeUploaderIntents});tx.set(ref('cmsMediaReservations',reservation.descriptor.id),close.nextReservation);
   tx.create(auditRef,{contractRevision:1,action,actorUid:actor.uid,at:new Date().toISOString(),custodyPin,quiescence:fact,evidence:{...evidence,originalGeneration:upload.completion.effect.generation,originalSha256:sha(original)},before:{record,slot,quota,reservation},after:{slot:release.nextSlot,quota:close.nextQuota,reservation:close.nextReservation},receipt});return receipt;
  },{maxAttempts:3});
 }
 return {async recover({request,actor}){
  await owner(request,actor);const custody=await pinnedCustody(),auditRef=ref('cmsMediaRecoveries',custody.jobId),jobRef=ref('cmsMediaJobs',mediaV2DocumentId({kind:'JOB',jobId:custody.jobId})),uploadRef=ref('cmsMediaUploads',mediaV2DocumentId({kind:'INTENT',intentId:custody.intentId}));
  const previous=await auditRef.get();if(previous.exists){demand(previous.data().actorUid===actor.uid);return previous.data().receipt;}
  const observed=parseJobRecord((await jobRef.get()).data()),upload=uploadRecordSchema.parse((await uploadRef.get()).data());
  demand(observed.job.jobId===custody.jobId&&observed.job.assetId===custody.assetId&&observed.job.intentId===custody.intentId&&observed.job.kind==='PDF'&&observed.job.attempt===1&&observed.job.state==='RECOVERY_REQUIRED'&&observed.failureClass==='UNKNOWN'&&observed.uploaderUid===actor.uid&&upload.intentHeader.state==='QUEUED'&&upload.completion.allocatedJobId===custody.jobId&&same(upload.completion.input,observed.input));
  const original=await storage.readOriginal({assetId:custody.assetId,originalId:upload.completion.originalId,generation:upload.completion.effect.generation,sizeBytes:observed.input.inputBytes,sha256:observed.input.originalSha256});demand(sha(original)===observed.input.originalSha256);
  const before=await quiescence(custody,observed),after=await quiescence(custody,observed);demand(same(before.unallocatedAttempt,after.unallocatedAttempt));const proofId=randomUUID();
  const fact={contractRevision:2,verification:'LOCAL_ATTEMPT_QUIESCENT',tuple:observed.lastAttempt,proofId};return retire({request,actor,custody,observed,upload,original,fact,custodyPin:PDF_RECOVERY_CUSTODY,evidence:{before,after},action:'PDF_PREFLIGHT_RETIRED_WITH_QUIESCENCE'});

 },async retireClosed({request,actor,jobId}){
  await owner(request,actor);const custody=[PDF_OUTPUT_RECOVERY_CUSTODY,PDF_COMBINED_RECOVERY_CUSTODY,PDF_SCRATCH_RECOVERY_CUSTODY,PDF_EMPTY_ANNOTATIONS_RECOVERY_CUSTODY].find(c=>c.jobId===jobId);demand(custody);const auditRef=ref('cmsMediaRecoveries',custody.jobId),previous=await auditRef.get();if(previous.exists){demand(previous.data().actorUid===actor.uid);return previous.data().receipt;}
  const observed=parseJobRecord((await ref('cmsMediaJobs',mediaV2DocumentId({kind:'JOB',jobId:custody.jobId})).get()).data()),upload=uploadRecordSchema.parse((await ref('cmsMediaUploads',mediaV2DocumentId({kind:'INTENT',intentId:custody.intentId})).get()).data());
  demand(observed.job.jobId===custody.jobId&&observed.job.assetId===custody.assetId&&observed.job.intentId===custody.intentId&&observed.job.kind==='PDF'&&observed.job.attempt===1&&observed.job.state==='RECOVERY_REQUIRED'&&observed.uploaderUid===actor.uid&&observed.failureClass==='INFRASTRUCTURE'&&observed.completion?.quiescence&&same(observed.completion.quiescence.tuple,observed.lastAttempt)&&same(upload.completion.input,observed.input)&&upload.completion.allocatedJobId===custody.jobId);
  const pin=custody.receipt,bytes=await readRegularFile(resolve(ROOT,pin.path),pin.bytes);demand(bytes.length===pin.bytes&&sha(bytes)===pin.sha256);const receipt=JSON.parse(bytes),runtime=receipt.runtime;demand(receipt.status==='FAILED'&&receipt.code===(custody.expectedError??'PDF_WEBP_LIMIT')&&receipt.originalSha256===observed.input.originalSha256&&runtime.close===true&&runtime.reaped===true&&runtime.exit===(Object.hasOwn(custody,'expectedExit')?custody.expectedExit:1)&&(!custody.expectedSignal||runtime.signal===custody.expectedSignal)&&runtime.remainingPids.length===0);
  const snapshot=await execute('/bin/ps',['-axo','pid=,ppid=,lstart=,command='],{env:{PATH:'/usr/bin:/bin',LANG:'C'},timeout:3000,maxBuffer:2*1048576});demand(!snapshot.stderr&&!snapshot.stdout.split('\n').some(line=>Number(line.trim().split(/\s+/)[0])===runtime.pid||line.includes(dirname(resolve(ROOT,pin.path)))));
  const original=await storage.readOriginal({assetId:custody.assetId,originalId:upload.completion.originalId,generation:upload.completion.effect.generation,sizeBytes:observed.input.inputBytes,sha256:observed.input.originalSha256});
  return retire({request,actor,custody,observed,upload,original,fact:observed.completion.quiescence,custodyPin:custody,evidence:{nativeReceipt:receipt,processSnapshotSha256:sha(snapshot.stdout)},action:'PDF_OUTPUT_LIMIT_RETIRED_WITH_QUIESCENCE'});
 }};
}
