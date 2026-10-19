import {z} from 'zod';
import {createHash} from 'node:crypto';
import {ApiError} from '../contracts/errors.mjs';
import {canonicalJson} from '../contracts/draft.mjs';
import {resourceIdSchema,revisionSchema,hashSchema,MAX_REVISION} from '../contracts/hero.mjs';
import {quotaSnapshotSchema,mediaAssetIdSchema,MEDIA_UPLOAD_CAPS} from '../contracts/media-upload.mjs';

export const Q1_LIMITS=Object.freeze({jsonBytes:65536,effects:128,totalBytes:2147483648,libraryVersions:200,activeUploader:2,activeProject:4});
const bytes=z.number().int().min(0).max(Q1_LIMITS.totalBytes),positiveBytes=bytes.min(1);
const kind=z.enum(['IMAGE','PDF','VIDEO']),purpose=z.enum(['UPLOAD','RETRY']),attempt=z.union([z.literal(0),z.literal(1),z.literal(2)]);
const generation=z.string().regex(/^[1-9][0-9]{0,127}$/);
const fail=code=>{throw new ApiError(code);};
const equal=(a,b)=>canonicalJson(a)===canonicalJson(b);
const hash=value=>createHash('sha256').update(canonicalJson(value),'utf8').digest('hex');
/** Inspect data descriptors before traversal: no getters, aliases or coercions. */
function jsonTree(value,ancestors=new Set(),depth=0){
 if(value===null || typeof value==='string' || typeof value==='boolean')return;
 if(typeof value==='number' && Number.isFinite(value))return;
 if(typeof value!=='object' || depth>64 || ancestors.has(value))throw new Error('JSON');
 const array=Array.isArray(value);if(Object.getPrototypeOf(value)!==(array?Array.prototype:Object.prototype) || Object.getOwnPropertySymbols(value).length)throw new Error('JSON');
 const descriptors=Object.getOwnPropertyDescriptors(value);
 if(array && Object.keys(descriptors).length!==value.length+1)throw new Error('JSON');
 ancestors.add(value);
 for(const [key,d] of Object.entries(descriptors)){
  if(array && key==='length')continue;
  if(!Object.hasOwn(d,'value') || !d.enumerable || (array && (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key)>=value.length)))throw new Error('JSON');
  jsonTree(d.value,ancestors,depth+1);
 }
 ancestors.delete(value);
}
function checkJson(value){jsonTree(value);if(new TextEncoder().encode(JSON.stringify(value)).length>Q1_LIMITS.jsonBytes)throw new ApiError('PAYLOAD_TOO_LARGE');}
const guarded=schema=>z.unknown().superRefine((v,c)=>{try{checkJson(v);}catch{c.addIssue({code:'custom',message:'Invalid JSON'});}}).pipe(schema);
function parse(schema,value,code='VALIDATION_ERROR'){
 try{checkJson(value);}catch(e){if(e instanceof ApiError)throw e;fail(code);}
 const result=schema.safeParse(value);if(!result.success)fail(code);return result.data;
}
const descriptorSchema=z.strictObject({id:resourceIdSchema,assetId:mediaAssetIdSchema,uploaderUid:resourceIdSchema,kind,purpose,attempt,inputBytes:positiveBytes.nullable(),jobId:resourceIdSchema.nullable()}).refine(d=>d.purpose==='UPLOAD'?d.attempt===0 && d.jobId===null && d.inputBytes!==null && d.inputBytes<=MEDIA_UPLOAD_CAPS[d.kind].inputBytes:d.attempt>=1 && d.inputBytes===null && d.jobId!==null);
const declarationSchema=z.strictObject({effectId:resourceIdSchema,writerId:resourceIdSchema,budgetBytes:positiveBytes,content:z.strictObject({sizeBytes:positiveBytes,sha256:hashSchema})}).refine(d=>d.content.sizeBytes<=d.budgetBytes);
const tupleSchema=z.strictObject({reservationId:resourceIdSchema,assetId:mediaAssetIdSchema,uploaderUid:resourceIdSchema,kind,attempt,effectId:resourceIdSchema,writerId:resourceIdSchema,fingerprint:hashSchema});
const outcomeBase=z.discriminatedUnion('verification',[
 z.strictObject({verification:z.literal('WRITE_RETAINED_AND_QUIESCENT'),tuple:tupleSchema,content:z.strictObject({sizeBytes:positiveBytes,sha256:hashSchema,generation}),proofId:resourceIdSchema}),
 z.strictObject({verification:z.literal('WRITE_ABSENT_AND_QUIESCENT'),tuple:tupleSchema,proofId:resourceIdSchema})
]);
export const writeOutcomeSchema=guarded(outcomeBase);
const closeBase=z.strictObject({verification:z.literal('RESERVATION_TERMINAL_AND_QUIESCENT'),reservation:descriptorSchema,disposition:z.enum(['READY','REJECTED','CANCELLED','NO_RETRY_RECOVERY']),jobId:resourceIdSchema.nullable(),completedAttempt:attempt,terminalProofId:resourceIdSchema,writersProofId:resourceIdSchema}).refine(f=>{
 if(f.disposition==='NO_RETRY_RECOVERY' && f.completedAttempt!==2)return false;
 if(f.reservation.purpose==='RETRY')return f.jobId===f.reservation.jobId && f.completedAttempt===f.reservation.attempt;
 if(f.disposition==='CANCELLED')return f.completedAttempt===0?f.jobId===null:f.jobId!==null;
 return f.jobId!==null && f.completedAttempt>=1;
});
export const closeFactSchema=guarded(closeBase);
const effectSchema=z.strictObject({declaration:declarationSchema,fingerprint:hashSchema,status:z.enum(['RESERVED','UNCERTAIN','RETAINED','ABSENT']),outcome:outcomeBase.nullable()});
const reservationBase=z.strictObject({descriptor:descriptorSchema,fingerprint:hashSchema,revision:revisionSchema,state:z.enum(['OPEN','DRAINING','CLOSED']),holdsActiveSlot:z.boolean(),freeReservedBytes:bytes,effects:z.array(effectSchema).max(128),closure:closeBase.nullable()});
function allocation(d){return d.purpose==='UPLOAD'?2*d.inputBytes+MEDIA_UPLOAD_CAPS[d.kind].derivativeBytes:MEDIA_UPLOAD_CAPS[d.kind].derivativeBytes;}
function sum(a,b,code='INTERNAL_ERROR'){if(!Number.isSafeInteger(a) || !Number.isSafeInteger(b) || a<0 || b<0 || b>Q1_LIMITS.totalBytes-a)fail(code);return a+b;}
function contributions(r){let reserved=r.freeReservedBytes,uncertain=0,retained=0;for(const e of r.effects){if(e.status==='RESERVED')reserved=sum(reserved,e.declaration.budgetBytes);if(e.status==='UNCERTAIN')uncertain=sum(uncertain,e.declaration.budgetBytes);if(e.status==='RETAINED')retained=sum(retained,e.outcome.content.sizeBytes);}return {reserved,uncertain,retained};}
function effectTuple(r,e){const d=r.descriptor;return {reservationId:d.id,assetId:d.assetId,uploaderUid:d.uploaderUid,kind:d.kind,attempt:d.attempt,effectId:e.declaration.effectId,writerId:e.declaration.writerId,fingerprint:e.fingerprint};}
function outcomeMatches(r,e,o){return equal(o.tuple,effectTuple(r,e)) && (o.verification==='WRITE_ABSENT_AND_QUIESCENT' || (o.content.sizeBytes===e.declaration.content.sizeBytes && o.content.sha256===e.declaration.content.sha256 && o.content.sizeBytes<=e.declaration.budgetBytes));}
function reservationRelations(r){
 if(r.fingerprint!==hash(r.descriptor) || new Set(r.effects.map(e=>e.declaration.effectId)).size!==r.effects.length)fail('INTERNAL_ERROR');
 const limit=allocation(r.descriptor);
 if(r.holdsActiveSlot!==(r.descriptor.purpose==='UPLOAD' && r.state!=='CLOSED'))fail('INTERNAL_ERROR');
 if(r.state==='CLOSED'){
  if(r.freeReservedBytes!==0 || r.closure===null || !equal(r.closure.reservation,r.descriptor) || r.effects.some(e=>['RESERVED','UNCERTAIN'].includes(e.status)))fail('INTERNAL_ERROR');
 }else if(r.closure!==null || (r.state==='DRAINING' && r.freeReservedBytes!==0))fail('INTERNAL_ERROR');
 for(const e of r.effects){
  if(e.declaration.budgetBytes>limit || e.fingerprint!==hash({reservation:r.descriptor,declaration:e.declaration}))fail('INTERNAL_ERROR');
  if(['RESERVED','UNCERTAIN'].includes(e.status)){if(e.outcome!==null)fail('INTERNAL_ERROR');}
  else if(e.outcome===null || !outcomeMatches(r,e,e.outcome) || (e.status==='RETAINED')!==(e.outcome.verification==='WRITE_RETAINED_AND_QUIESCENT'))fail('INTERNAL_ERROR');
 }
 const c=contributions(r);if(sum(sum(c.reserved,c.uncertain),c.retained)>limit)fail('INTERNAL_ERROR');
}
const completeReservation=reservationBase.superRefine((r,c)=>{try{reservationRelations(r);}catch{c.addIssue({code:'custom',message:'Invalid reservation'});}});
export const reservationSchema=guarded(completeReservation);
const quotaBase=z.strictObject({uploaderUid:resourceIdSchema,quota:quotaSnapshotSchema});
export const quotaViewSchema=guarded(quotaBase);
export function parseQuotaView(value){return parse(quotaViewSchema,value,'INTERNAL_ERROR');}
export function parseReservation(value){return parse(reservationSchema,value,'INTERNAL_ERROR');}
function contextRelations(v,r){
 if(r===null)return;
 if(v.uploaderUid!==r.descriptor.uploaderUid)fail('INTERNAL_ERROR');
 const c=contributions(r),q=v.quota;
 if(c.reserved>q.reservedBytes || c.uncertain>q.uncertainBytes || c.retained>q.retainedBytes || (r.holdsActiveSlot && (q.activeUploaderIntents<1 || q.activeProjectIntents<1)))fail('INTERNAL_ERROR');
}
const tupleAbsent=z.strictObject({assetId:mediaAssetIdSchema,purpose,attempt});
const guardSchema=z.discriminatedUnion('type',[
 z.strictObject({type:z.literal('CREATE'),quotaRevision:revisionSchema,reservationTupleAbsent:tupleAbsent,reservationIdAbsent:resourceIdSchema}),
 z.strictObject({type:z.literal('UPDATE'),quotaRevision:revisionSchema,reservationId:resourceIdSchema,reservationRevision:revisionSchema}),
 z.strictObject({type:z.literal('REPLAY'),reservationId:resourceIdSchema,observedQuotaRevision:revisionSchema,observedReservationRevision:revisionSchema,fingerprint:hashSchema})
]);
function planRelations(p){
 contextRelations(p.nextQuota,p.nextReservation);
 const g=p.guards,r=p.nextReservation,d=r.descriptor,q=p.nextQuota.quota,op=p.operation;
 const reserve=op==='RESERVE_UPLOAD' || op==='RESERVE_RETRY';
 const sameOrNext=(before,after)=>after===before || (before<MAX_REVISION && after===before+1);
 const next=(before,after)=>before<MAX_REVISION && after===before+1;
 const invalid=()=>fail('INTERNAL_ERROR');
 if(reserve && d.purpose!==(op==='RESERVE_UPLOAD'?'UPLOAD':'RETRY'))invalid();
 if(p.action==='REPLAY'){
  if(g.type!=='REPLAY' || g.reservationId!==d.id || g.observedQuotaRevision!==q.revision || g.observedReservationRevision!==r.revision)invalid();
  if(reserve){if(g.fingerprint!==r.fingerprint)invalid();return;}
  if(['CLAIM_WRITE','MARK_UNCERTAIN','SETTLE_WRITE'].includes(op)){
   const e=r.effects.find(e=>e.fingerprint===g.fingerprint);if(!e)invalid();
   if(op==='MARK_UNCERTAIN' && e.status==='RESERVED')invalid();
   if(op==='SETTLE_WRITE' && !['RETAINED','ABSENT'].includes(e.status))invalid();
   return;
  }
  if(g.fingerprint!==r.fingerprint)invalid();
  if(op==='RELEASE_UNUSED' && !['DRAINING','CLOSED'].includes(r.state))invalid();
  if(op==='CLOSE_RESERVATION' && r.state!=='CLOSED')invalid();
  return;
 }
 if(g.type==='CREATE'){
  if(!reserve || g.reservationIdAbsent!==d.id || !equal(g.reservationTupleAbsent,{assetId:d.assetId,purpose:d.purpose,attempt:d.attempt}) || !next(g.quotaRevision,q.revision) || r.revision!==0 || r.state!=='OPEN' || r.effects.length!==0 || r.freeReservedBytes!==allocation(d))invalid();
  return;
 }
 if(g.type!=='UPDATE' || reserve || g.reservationId!==d.id || !next(g.reservationRevision,r.revision))invalid();
 // Only revision crosslinks are provable here: old full snapshots are not in QGuard.
 if(op==='CLAIM_WRITE'){
  if(q.revision!==g.quotaRevision || r.state!=='OPEN')invalid();
 }else if(op==='MARK_UNCERTAIN'){
  if(!next(g.quotaRevision,q.revision) || !['OPEN','DRAINING'].includes(r.state))invalid();
 }else if(op==='SETTLE_WRITE'){
  if(!sameOrNext(g.quotaRevision,q.revision) || !['OPEN','DRAINING'].includes(r.state))invalid();
 }else if(op==='RELEASE_UNUSED'){
  if(!sameOrNext(g.quotaRevision,q.revision) || r.state!=='DRAINING')invalid();
 }else if(op==='CLOSE_RESERVATION'){
  if(r.state!=='CLOSED' || (d.purpose==='UPLOAD'?!next(g.quotaRevision,q.revision):q.revision!==g.quotaRevision))invalid();
 }else invalid();
}
const planBase=z.strictObject({operation:z.enum(['RESERVE_UPLOAD','RESERVE_RETRY','CLAIM_WRITE','MARK_UNCERTAIN','SETTLE_WRITE','RELEASE_UNUSED','CLOSE_RESERVATION']),action:z.enum(['APPLY','REPLAY']),guards:guardSchema,nextQuota:quotaViewSchema,nextReservation:reservationSchema,requires:z.strictObject({atomicCommit:z.literal(true)})}).superRefine((p,c)=>{try{planRelations(p);}catch{c.addIssue({code:'custom',message:'Invalid plan'});}});
export const quotaPlanSchema=guarded(planBase);
const contextBase=z.strictObject({quota:quotaViewSchema,reservation:reservationSchema});
const reserveContext=z.strictObject({quota:quotaViewSchema,reservation:reservationSchema.nullable(),idAllocation:descriptorSchema.nullable()});
const revisions={expectedQuotaRevision:revisionSchema,expectedReservationRevision:revisionSchema};
const reserveCommand=z.strictObject({descriptor:descriptorSchema,fingerprint:hashSchema,expectedQuotaRevision:revisionSchema});
const descriptorCommand=z.strictObject({reservation:descriptorSchema,...revisions});
const claimCommand=z.strictObject({reservation:descriptorSchema,...revisions,declaration:declarationSchema,fingerprint:hashSchema});
const tupleCommand=z.strictObject({tuple:tupleSchema,...revisions});
/** Extract only explicit enumerable data fields; context is validated before command/replay. */
function envelope(value,keys){
 if(value===null || typeof value!=='object' || Object.getPrototypeOf(value)!==Object.prototype || Object.getOwnPropertySymbols(value).length)fail('VALIDATION_ERROR');
 const ds=Object.getOwnPropertyDescriptors(value);if(Object.keys(ds).length!==keys.length || keys.some(k=>!Object.hasOwn(ds,k) || !Object.hasOwn(ds[k],'value') || !ds[k].enumerable))fail('VALIDATION_ERROR');
 return Object.fromEntries(keys.map(k=>[k,ds[k].value]));
}
function prepare(value,commandSchema,extra=null,reserve=false){
 const a=envelope(value,extra?['context','command',extra]:['context','command']);
 const context=parse(reserve?reserveContext:contextBase,a.context,'INTERNAL_ERROR');contextRelations(context.quota,context.reservation);
 const command=parse(commandSchema,a.command);if(extra)a[extra]=parse(extra==='outcome'?writeOutcomeSchema:closeFactSchema,a[extra]);
 // Bound the entire envelope only after every branch has passed the no-getter guard.
 parse(z.unknown(),a);
 return {context,command,...(extra?{[extra]:a[extra]}:{})};
}
function authorize(v,d){if(v.uploaderUid!==d.uploaderUid)fail('FORBIDDEN');}
function increment(n){if(n>=MAX_REVISION)fail('REVISION_CONFLICT');return n+1;}
function fresh(c,q,r){if(c.expectedQuotaRevision!==q.quota.revision || (r && c.expectedReservationRevision!==r.revision))fail('REVISION_CONFLICT');}
function boundDescriptor(c,r,q){authorize(q,c.reservation);if(!equal(c.reservation,r.descriptor))fail('REVISION_CONFLICT');}
function replay(operation,q,r,fingerprint=r.fingerprint){return parse(quotaPlanSchema,{operation,action:'REPLAY',guards:{type:'REPLAY',reservationId:r.descriptor.id,observedQuotaRevision:q.quota.revision,observedReservationRevision:r.revision,fingerprint},nextQuota:q,nextReservation:r,requires:{atomicCommit:true}},'INTERNAL_ERROR');}
function apply(operation,q,r,nextQ,nextR){
 const changed=!equal(q.quota,nextQ.quota);nextQ.quota.revision=changed?increment(q.quota.revision):q.quota.revision;nextR.revision=increment(r.revision);
 return parse(quotaPlanSchema,{operation,action:'APPLY',guards:{type:'UPDATE',quotaRevision:q.quota.revision,reservationId:r.descriptor.id,reservationRevision:r.revision},nextQuota:nextQ,nextReservation:nextR,requires:{atomicCommit:true}},'INTERNAL_ERROR');
}
const clone=value=>JSON.parse(JSON.stringify(value));
function reserve(value,purposeRequired){
 const {context,command}=prepare(value,reserveCommand,null,true),q=context.quota,d=command.descriptor,r=context.reservation,allocated=context.idAllocation;
 if(d.purpose!==purposeRequired)fail('VALIDATION_ERROR');authorize(q,d);if(command.fingerprint!==hash(d))fail('IDEMPOTENCY_PAYLOAD_MISMATCH');
 if(allocated!==null && allocated.id!==d.id)fail('INTERNAL_ERROR');
 const operation=purposeRequired==='UPLOAD'?'RESERVE_UPLOAD':'RESERVE_RETRY';
 if(r!==null){
  if(!equal({assetId:r.descriptor.assetId,purpose:r.descriptor.purpose,attempt:r.descriptor.attempt},{assetId:d.assetId,purpose:d.purpose,attempt:d.attempt}))fail('INTERNAL_ERROR');
  if(!equal(r.descriptor,d) || r.fingerprint!==command.fingerprint)fail('IDEMPOTENCY_PAYLOAD_MISMATCH');
  if(allocated===null || !equal(allocated,r.descriptor))fail('INTERNAL_ERROR');return replay(operation,q,r);
 }
 if(allocated!==null)fail('IDEMPOTENCY_PAYLOAD_MISMATCH');fresh(command,q,null);
 const n=clone(q);n.quota.reservedBytes=sum(n.quota.reservedBytes,allocation(d),'REVISION_CONFLICT');
 if(sum(sum(n.quota.reservedBytes,n.quota.uncertainBytes,'REVISION_CONFLICT'),n.quota.retainedBytes,'REVISION_CONFLICT')>Q1_LIMITS.totalBytes)fail('REVISION_CONFLICT');
 if(purposeRequired==='UPLOAD'){
  if(n.quota.versionCount>=200 || n.quota.activeUploaderIntents>=2 || n.quota.activeProjectIntents>=4)fail('REVISION_CONFLICT');
  n.quota.versionCount++;n.quota.activeUploaderIntents++;n.quota.activeProjectIntents++;
 }
 n.quota.revision=increment(q.quota.revision);
 const next={descriptor:d,fingerprint:command.fingerprint,revision:0,state:'OPEN',holdsActiveSlot:purposeRequired==='UPLOAD',freeReservedBytes:allocation(d),effects:[],closure:null};
 return parse(quotaPlanSchema,{operation,action:'APPLY',guards:{type:'CREATE',quotaRevision:q.quota.revision,reservationTupleAbsent:{assetId:d.assetId,purpose:d.purpose,attempt:d.attempt},reservationIdAbsent:d.id},nextQuota:n,nextReservation:next,requires:{atomicCommit:true}},'INTERNAL_ERROR');
}
export function planReserveUpload(value){return reserve(value,'UPLOAD');}
export function planReserveRetry(value){return reserve(value,'RETRY');}
export function planClaimWrite(value){
 const {context,command:c}=prepare(value,claimCommand),q=context.quota,r=context.reservation;boundDescriptor(c,r,q);
 const fp=hash({reservation:r.descriptor,declaration:c.declaration});if(c.fingerprint!==fp)fail('IDEMPOTENCY_PAYLOAD_MISMATCH');
 const old=r.effects.find(e=>e.declaration.effectId===c.declaration.effectId);
 if(old){if(old.fingerprint!==fp || !equal(old.declaration,c.declaration))fail('IDEMPOTENCY_PAYLOAD_MISMATCH');return replay('CLAIM_WRITE',q,r,fp);}
 fresh(c,q,r);if(r.state!=='OPEN' || c.declaration.budgetBytes>r.freeReservedBytes || c.declaration.budgetBytes>allocation(r.descriptor) || r.effects.length>=128)fail('REVISION_CONFLICT');
 const n=clone(r);n.freeReservedBytes-=c.declaration.budgetBytes;n.effects.push({declaration:c.declaration,fingerprint:fp,status:'RESERVED',outcome:null});return apply('CLAIM_WRITE',q,r,clone(q),n);
}
function findEffect(c,r,q){
 authorize(q,c.tuple);const e=r.effects.find(e=>e.declaration.effectId===c.tuple.effectId);if(!e)fail('REVISION_CONFLICT');
 if(e.fingerprint!==c.tuple.fingerprint)fail('IDEMPOTENCY_PAYLOAD_MISMATCH');if(!equal(c.tuple,effectTuple(r,e)))fail('REVISION_CONFLICT');return e;
}
export function planMarkUncertain(value){
 const {context,command:c}=prepare(value,tupleCommand),q=context.quota,r=context.reservation,e=findEffect(c,r,q);
 if(e.status!=='RESERVED')return replay('MARK_UNCERTAIN',q,r,e.fingerprint);
 fresh(c,q,r);const n=clone(r),v=clone(q);n.effects.find(x=>x.declaration.effectId===e.declaration.effectId).status='UNCERTAIN';v.quota.reservedBytes-=e.declaration.budgetBytes;v.quota.uncertainBytes=sum(v.quota.uncertainBytes,e.declaration.budgetBytes);return apply('MARK_UNCERTAIN',q,r,v,n);
}
export function planSettleWrite(value){
 const {context,command:c,outcome}=prepare(value,tupleCommand,'outcome'),q=context.quota,r=context.reservation,e=findEffect(c,r,q);
 if(!outcomeMatches(r,e,outcome))fail('REVISION_CONFLICT');
 if(['RETAINED','ABSENT'].includes(e.status)){if(!equal(e.outcome,outcome))fail('REVISION_CONFLICT');return replay('SETTLE_WRITE',q,r,e.fingerprint);}
 fresh(c,q,r);const n=clone(r),v=clone(q),ne=n.effects.find(x=>x.declaration.effectId===e.declaration.effectId),budget=e.declaration.budgetBytes,used=outcome.verification==='WRITE_RETAINED_AND_QUIESCENT'?outcome.content.sizeBytes:0;
 v.quota[e.status==='RESERVED'?'reservedBytes':'uncertainBytes']-=budget;v.quota.retainedBytes=sum(v.quota.retainedBytes,used);
 if(r.state==='OPEN'){const remaining=budget-used;n.freeReservedBytes=sum(n.freeReservedBytes,remaining);v.quota.reservedBytes=sum(v.quota.reservedBytes,remaining);}
 ne.status=used?'RETAINED':'ABSENT';ne.outcome=outcome;return apply('SETTLE_WRITE',q,r,v,n);
}
export function planReleaseUnused(value){
 const {context,command:c}=prepare(value,descriptorCommand),q=context.quota,r=context.reservation;boundDescriptor(c,r,q);
 if(r.state!=='OPEN')return replay('RELEASE_UNUSED',q,r);
 fresh(c,q,r);const n=clone(r),v=clone(q);v.quota.reservedBytes-=r.freeReservedBytes;n.freeReservedBytes=0;n.state='DRAINING';return apply('RELEASE_UNUSED',q,r,v,n);
}
export function planCloseActiveSlot(value){
 const {context,command:c,fact}=prepare(value,descriptorCommand,'fact'),q=context.quota,r=context.reservation;boundDescriptor(c,r,q);
 if(!equal(fact.reservation,r.descriptor))fail('REVISION_CONFLICT');
 if(r.state==='CLOSED'){if(!equal(r.closure,fact))fail('REVISION_CONFLICT');return replay('CLOSE_RESERVATION',q,r);}
 fresh(c,q,r);if(r.state!=='DRAINING' || r.freeReservedBytes!==0 || r.effects.some(e=>['RESERVED','UNCERTAIN'].includes(e.status)))fail('REVISION_CONFLICT');
 const n=clone(r),v=clone(q);if(r.holdsActiveSlot){v.quota.activeUploaderIntents--;v.quota.activeProjectIntents--;}
 n.holdsActiveSlot=false;n.state='CLOSED';n.closure=fact;return apply('CLOSE_RESERVATION',q,r,v,n);
}
