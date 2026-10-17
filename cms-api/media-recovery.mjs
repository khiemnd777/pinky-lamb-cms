import {ApiError} from '../contracts/errors.mjs';
import {PROJECT} from '../scripts/local-guard.mjs';
import {validateCmsServerRuntime,installCmsNetworkFence} from '../scripts/local-data-guard.mjs';
import {mediaV2DocumentId} from './media-upload-domain.mjs';
import {J1_LIMITS,parseJobRecord,parseGlobalSlot,planExpireLease} from './media-jobs-domain.mjs';

function data(value,required,optional=[]) {
  if(!value||typeof value!=='object'||Object.getPrototypeOf(value)!==Object.prototype) throw new ApiError('VALIDATION_ERROR');
  const d=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(d);
  if(required.some(key=>!Object.hasOwn(d,key))||keys.some(key=>typeof key!=='string'||![...required,...optional].includes(key)||!d[key].enumerable||!Object.hasOwn(d[key],'value'))) throw new ApiError('VALIDATION_ERROR');
  return Object.fromEntries(keys.map(key=>[key,d[key].value]));
}

/** Expiration is uncertainty, never quiescence. Only the canonical EXPIRE_LEASE
 * plan can be persisted; the held slot and all pending effects remain retained. */
export function createMediaRecovery(options) {
  const {db,clock=Date.now}=data(options,['db'],['clock']);
  if(!db||typeof db.collection!=='function'||typeof db.runTransaction!=='function'||typeof clock!=='function') throw new ApiError('VALIDATION_ERROR');
  const now=()=>{const time=clock();if(!Number.isSafeInteger(time)||time<0||time>J1_LIMITS.maxTimeMs) throw new ApiError('VALIDATION_ERROR');return time;};
  const guard=()=>{
    validateCmsServerRuntime();installCmsNetworkFence();
    if(db.projectId!==PROJECT) throw new ApiError('LOCAL_RUNTIME_UNAVAILABLE');
  };
  const jobs=db.collection('cmsMediaJobs'),slotRef=db.collection('cmsMediaProcessingSlots').doc('global');
  return {async recoverExpiredMediaJobs(options={}) {
    const {limit=20}=data(options,[],['limit']);
    if(!Number.isInteger(limit)||limit<1||limit>50) throw new ApiError('VALIDATION_ERROR');
    guard();const cutoff=now();
    // Actual J1 record paths, stable bounded index query; no synthetic top fields
    // and no collection scan fallback if the required index is unavailable.
    const candidates=await jobs.where('contractRevision','==',2).where('job.state','==','PROCESSING').where('job.lease.expiresAtMs','<=',cutoff).orderBy('job.lease.expiresAtMs','asc').orderBy('__name__','asc').limit(limit).get();
    const updatedJobIds=[];let unknownCount=0,skippedCount=0;
    for(const snapshot of candidates.docs) {
      try {
        const observed=parseJobRecord(snapshot.data());
        const jobId=observed.job.jobId,documentId=mediaV2DocumentId({kind:'JOB',jobId});
        if(snapshot.id!==documentId) throw new ApiError('INTERNAL_ERROR');
        const reference=jobs.doc(documentId);
        const status=await db.runTransaction(async tx=>{
          guard();
          const current=await tx.get(reference),slotSnapshot=await tx.get(slotRef);
          if(!current.exists) return 'SKIPPED';
          const record=parseJobRecord(current.data());
          if(record.job.jobId!==jobId||current.id!==documentId) throw new ApiError('INTERNAL_ERROR');
          const nowMs=now();
          if(record.job.state!=='PROCESSING'||record.job.lease.expiresAtMs>nowMs) return 'SKIPPED';
          if(!slotSnapshot.exists) throw new ApiError('LOCAL_RUNTIME_UNAVAILABLE');
          const slot=parseGlobalSlot(slotSnapshot.data());
          const plan=planExpireLease({context:{record,slot},command:{tuple:record.lastAttempt,expectedJobRevision:record.job.revision,expectedSlotRevision:slot.revision,nowMs}});
          // Preserve raw tagged J1 record shape. No retry/reservation/slot release.
          guard();tx.set(reference,plan.nextRecord);tx.set(slotRef,plan.nextSlot);
          return 'RECOVERY_REQUIRED';
        },{maxAttempts:5});
        if(status==='RECOVERY_REQUIRED') updatedJobIds.push(jobId);else skippedCount++;
      } catch {unknownCount++;} // Invalid/raced custody remains unknown; never repaired heuristically.
    }
    return {updatedJobIds,status:unknownCount?'PARTIAL_UNKNOWN':updatedJobIds.length?'RECOVERY_REQUIRED':'UNCHANGED',unknownCount,skippedCount};
  }};
}
