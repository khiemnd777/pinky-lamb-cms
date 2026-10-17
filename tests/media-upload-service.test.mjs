import {planClaimJob,planFinishJob} from '../cms-api/media-jobs-domain.mjs';
import {mediaV2DocumentId} from '../cms-api/media-upload-domain.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createMediaUploadService} from '../cms-api/media-upload-service.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function memoryDb(){
 const records=new Map(),snapshot=ref=>({exists:records.has(ref.key),id:ref.id,data:()=>structuredClone(records.get(ref.key))});
 const collection=prefix=>{const query={prefix,filters:[],count:Infinity,doc:id=>{const ref={id,key:prefix+'/'+id};ref.get=async()=>snapshot(ref);return ref;},where(field,op,value){assert.equal(op,'==');return {...this,filters:[...this.filters,[field,value]]};},limit(count){return {...this,count};}};return query;};
 return {records,collection,async runTransaction(fn){const writes=[],tx={async get(ref){if(ref.key)return snapshot(ref);const docs=[...records].filter(([key,value])=>key.startsWith(ref.prefix+'/')&&!key.slice(ref.prefix.length+1).includes('/')&&ref.filters.every(([field,expected])=>field.split('.').reduce((v,k)=>v?.[k],value)===expected)).slice(0,ref.count).map(([key,value])=>({id:key.split('/').at(-1),data:()=>structuredClone(value)}));return {docs,empty:docs.length===0,size:docs.length};},set(ref,value){writes.push([ref.key,structuredClone(value)]);},create(ref,value){assert.ok(!records.has(ref.key));writes.push([ref.key,structuredClone(value)]);}};const result=await fn(tx);for(const [key,value]of writes)records.set(key,value);return result;}};
}
test('real upload service accepts and replays a part, preserves quota, and queues the complete original',async()=>{
 Error.stackTraceLimit=60;
 const db=memoryDb(),bytes=Buffer.alloc(17434,1),objects=new Map(),actor={uid:'local-admin',role:'OWNER'},queued=[];
 const storage={async writeUpload(write,value){const key=write.target.objectId,old=objects.get(key);if(old)assert.deepEqual(old,value);objects.set(key,Buffer.from(value));return {sizeBytes:value.length,sha256:hash(value),generation:'1'};},async readPart(value){return Buffer.from(objects.get(value.partId));},async readOriginal(){throw Error('Unexpected original read');}};
 const upload=await createMediaUploadService({db,authorize:async()=>actor,storage,scheduleJob:async value=>queued.push(value)});
 const created=await upload.createUpload({request:{},actor,key:'seed-create-image',body:{requestId:'seed-create-image',name:'client-aqua.webp',kind:'IMAGE',declaredMime:'image/webp',inputBytes:bytes.length}});
 const partArgs={request:{},actor,key:'seed-part-image-0',intentId:created.intentId,partIndex:0,bytes,expectedIntentRevision:created.revision,offsetBytes:0,sha256:hash(bytes)};
 const receipt=await upload.uploadPart(partArgs);assert.equal(receipt.acceptedParts,1);assert.deepEqual(await upload.uploadPart(partArgs),receipt);assert.equal(objects.size,1);
 const completed=await upload.completeUpload({request:{},actor,key:'seed-complete-image',intentId:created.intentId,body:{expectedIntentRevision:receipt.revision}});assert.equal(completed.state,'QUEUED');assert.equal(queued.length,1);assert.equal(objects.size,2);
 const quota=db.records.get('cmsMediaQuota/global');assert.ok(quota.retainedBytes>=bytes.length*2);assert.equal(quota.uncertainBytes,0);
 const jobKey='cmsMediaJobs/'+mediaV2DocumentId({kind:'JOB',jobId:completed.jobId}),record=db.records.get(jobKey),nowMs=Date.now(),claim=planClaimJob({context:{record,slot:{revision:0,epoch:0,phase:'FREE',holder:null,expiresAtMs:null}},command:{jobId:completed.jobId,workerId:'test-worker',expectedJobRevision:record.job.revision,expectedSlotRevision:0,nowMs}}),tuple=claim.nextRecord.lastAttempt;
 const failure=planFinishJob({context:{record:claim.nextRecord,slot:claim.nextSlot},command:{tuple,expectedJobRevision:claim.nextRecord.job.revision,expectedSlotRevision:claim.nextSlot.revision,nowMs:nowMs+1},outcome:{contractRevision:2,verification:'MEDIA_ATTEMPT_FAILED',tuple,failureClass:'INFRASTRUCTURE',proofId:'test-terminal',quiescence:{contractRevision:2,verification:'LOCAL_ATTEMPT_QUIESCENT',tuple,proofId:'test-quiescence'}}});
 db.records.set(jobKey,failure.nextRecord);db.records.set('cmsMediaProcessingSlots/global',failure.nextSlot);assert.equal((await upload.readJobSummary({request:{},jobId:completed.jobId})).canRetry,true);
 db.records.set('cmsMediaRecoveries/'+completed.jobId,{receipt:{retired:true,jobId:completed.jobId}});assert.equal((await upload.readJobSummary({request:{},jobId:completed.jobId})).canRetry,false);
 const before=structuredClone([...db.records]);await assert.rejects(upload.retryJob({request:{},actor,jobId:completed.jobId,key:'retired-retry-proof',body:{expectedJobRevision:failure.nextRecord.job.revision}}),e=>e.code==='REVIEW_STATE_CONFLICT');assert.deepEqual([...db.records],before);assert.equal(queued.length,1);
});
