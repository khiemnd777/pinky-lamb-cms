import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {attemptTupleSchema,frozenInputSchema,storageFactSchema,cacheFactSchema,quiescenceFactSchema,readyFactSchema,mediaRightsProofV3Schema,authorityEnvelopeSchema,readyDetailSchema,validateAuthorityEnvelope,validateTerminalRightsProofV3,validateReadyDetail} from '../contracts/media-v3-authority.mjs';
import {bindingFromReadyVersion} from '../contracts/media-v3-contract.mjs';

const fixture=JSON.parse(readFileSync(new URL('./fixtures/media-v3-authority.json',import.meta.url),'utf8'));
const sample=fixture.cases[0],clone=value=>structuredClone(value);
function canonical(value){
  if(value===null || typeof value!=='object')return JSON.stringify(value);
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';
}
const hash=value=>createHash('sha256').update(canonical(value),'utf8').digest('hex');
const manifest=row=>fixture.manifests.find(value=>value.value.kind===row.authorityEnvelope.readyVersion.kind).value;
const context=(row=sample)=>({expectedUpload:{intent:row.U0Intent,referenceAllowlist:fixture.referenceAllowlist},expectedJob:{record:row.J1Job,toolSetManifest:manifest(row),processingRecipe:row.processingRecipe,originalMetadata:row.originalMetadata},profileId:`M3-${row.authorityEnvelope.readyVersion.kind}-R0-1`,hashCanonical:hash});
const rightsContext=(row=sample)=>({binding:row.rightsProof.binding,actors:row.authorityEnvelope.actors,originalCheckerUid:row.rightsProof.checkedBy,hashCanonical:hash});
const detailContext=(row=sample)=>({authorityEnvelope:row.authorityEnvelope,rightsState:row.readyDetail.rights,hashCanonical:hash});
const fail=(run,code='INTERNAL_ERROR')=>assert.throws(run,error=>error.code===code);
const badEnvelope=mutate=>{const value=clone(sample.authorityEnvelope);mutate(value);fail(()=>validateAuthorityEnvelope(value,context()));};
const badContext=mutate=>{const c=clone({...context(),hashCanonical:null});c.hashCanonical=hash;mutate(c);fail(()=>validateAuthorityEnvelope(sample.authorityEnvelope,c));};
const resign=proof=>{const {proofDigest:ignored,...unsigned}=proof;void ignored;proof.proofDigest=hash(unsigned);return proof;};

// Fixtures contain pure structural marker bytes, not real JPEG/PDF/MP4, native
// outputs, provider/Auth/Storage evidence or an executed READY transition.
test('five frozen families match full authority chain, MD/EV and original terminal/detail expectations',()=>{
  for(const row of fixture.cases){
    const value=validateAuthorityEnvelope(row.authorityEnvelope,context(row));assert.deepEqual(value,row.authorityEnvelope);
    const md=hash(value.metadata),ev=hash({rights:value.metadata.rights,rightsEvidenceSubmittedBy:value.actors.rightsEvidenceSubmittedBy});
    assert.equal(md,row.expectedMetadataDigest);assert.equal(ev,row.expectedEvidenceSha256);
    assert.deepEqual(validateTerminalRightsProofV3(row.rightsProof,rightsContext(row)),row.rightsProof);
    assert.deepEqual(validateReadyDetail(row.readyDetail,detailContext(row)),row.readyDetail);
  }
});
test('all nine public schemas retain exact frozen fact/envelope/detail shapes',()=>{
  const fact=sample.authorityEnvelope.readyFact;
  for(const [schema,value] of [[attemptTupleSchema,fact.tuple],[frozenInputSchema,sample.J1Job.input],[storageFactSchema,fact.storage],[cacheFactSchema,fact.cache],[quiescenceFactSchema,fact.quiescence],[readyFactSchema,fact],[mediaRightsProofV3Schema,sample.rightsProof],[authorityEnvelopeSchema,sample.authorityEnvelope],[readyDetailSchema,sample.readyDetail]])assert.deepEqual(schema.parse(value),value);
  badEnvelope(value=>{delete value.metadata;});badEnvelope(value=>{value.producer='client';});
});
test('strict descriptor guards refuse before getters or injected hash execution',()=>{
  let calls=0;const c=context();c.hashCanonical=()=>{calls++;return 'a'.repeat(64);};Object.defineProperty(c,'expectedUpload',{enumerable:true,get(){calls++;return {};}});fail(()=>validateAuthorityEnvelope(sample.authorityEnvelope,c));assert.equal(calls,0);
  const bad=clone(sample.authorityEnvelope);Object.defineProperty(bad.metadata,'name',{enumerable:true,get(){calls++;return 'x';}});fail(()=>validateAuthorityEnvelope(bad,context()));assert.equal(calls,0);
  const rights=rightsContext();Object.defineProperty(rights,'originalCheckerUid',{enumerable:true,get(){calls++;return 'x';}});fail(()=>validateTerminalRightsProofV3(sample.rightsProof,rights));assert.equal(calls,0);
});
test('contexts have exact named fields and deny missing even-empty declaration allowlist',()=>{
  badContext(c=>{delete c.expectedUpload.referenceAllowlist;});badContext(c=>{c.expectedUpload.referenceAllowlist={trust:true};});
  badContext(c=>{c.expectedUpload.referenceAllowlist.allowedSourceRefs=['z','a'];});
  badContext(c=>{c.trust=true;});badContext(c=>{c.expectedJob.record.jobOnly=c.expectedJob.record.job;});
  badContext(c=>{c.profileId='M3-IMAGE-R1';});
});
test('persisted metadata and actor equalities cannot fall back or accept uploader/current checker tags',()=>{
  badEnvelope(value=>{value.metadata.name+=' changed';});badEnvelope(value=>{value.metadata.rights.evidence.text+=' changed';});
  badEnvelope(value=>{value.actors.uploaderUid='other-uploader';});badEnvelope(value=>{value.actors.rightsEvidenceSubmittedBy='other-evidence';});
  badContext(c=>{c.expectedUpload.intent.actors.rightsEvidenceSubmittedBy='other-evidence';});
  badContext(c=>{c.expectedJob.record.uploaderUid='other-uploader';});badContext(c=>{c.expectedUpload.intent.metadataBinding.metadataDigest='a'.repeat(64);});
});
test('full U0 intent TTL, complete parts, MIME and revision identities remain required',()=>{
  badContext(c=>{c.expectedUpload.intent.expiresAtMs++;});badContext(c=>{c.expectedUpload.intent.parts=[];});
  badContext(c=>{c.expectedUpload.intent.parts[0].offsetBytes=1;});badContext(c=>{c.expectedUpload.intent.parts[0].sizeBytes--;});
  badContext(c=>{c.expectedUpload.intent.core.declaredMime='application/pdf';});badContext(c=>{c.expectedUpload.intent.state='UPLOADING';});
  badContext(c=>{c.expectedUpload.intent.revision++;});badContext(c=>{c.expectedUpload.intent.intentId='other-intent';});
});
test('multipart layout accepts coherent persisted records without inventing original SHA from part hashes',()=>{
  const row=clone(sample),size=4*1024**2+16;row.authorityEnvelope.readyVersion.originalSizeBytes=size;row.U0Intent.core.inputBytes=size;row.U0Intent.parts=[{index:0,offsetBytes:0,sizeBytes:4*1024**2,sha256:hash('part-zero')},{index:1,offsetBytes:4*1024**2,sizeBytes:16,sha256:hash('part-one')}];
  row.J1Job.input.inputBytes=size;row.J1Job.queueRecord.request.input.inputBytes=size;row.J1Job.queueRecord.requestHash=hash(row.J1Job.queueRecord.request);
  assert.deepEqual(validateAuthorityEnvelope(row.authorityEnvelope,context(row)),row.authorityEnvelope);
});
test('J1 queue fingerprint/input/metadata/revision and asset/intent/job references are exact',()=>{
  badContext(c=>{c.expectedJob.record.queueRecord.requestHash='a'.repeat(64);});
  badContext(c=>{c.expectedJob.record.queueRecord.response.jobId='other-job';});badContext(c=>{c.expectedJob.record.queueRecord.identity.resourceId='other-asset';});
  badContext(c=>{c.expectedJob.record.input.evidenceSha256='b'.repeat(64);});badContext(c=>{c.expectedJob.record.job.outputBinding.originalSha256='c'.repeat(64);});
  badContext(c=>{c.expectedJob.record.job.lease={epoch:1};});badContext(c=>{c.expectedJob.record.failureClass='UNKNOWN';});
});
test('complete attempt2 retry history is accepted; required historical tuple/revision/hash relations reject corruption',()=>{
  const row=clone(sample),record=row.J1Job,old=clone(record.lastAttempt),tuple={...old,attempt:2,leaseEpoch:2,workerId:'worker-second'};
  record.job.attempt=2;record.job.revision=5;record.lastAttempt=tuple;
  const fact=clone(record.completion);fact.tuple=clone(tuple);fact.storage.tuple=clone(tuple);fact.cache.tuple=clone(tuple);fact.quiescence.tuple=clone(tuple);record.completion=fact;row.authorityEnvelope.readyFact=clone(fact);
  const request={jobId:record.job.jobId,expectedJobRevision:2},key='retry-golden-key';
  record.retryRecord={identity:{actorUid:'owner-golden',operation:'JOB_RETRY',resourceId:record.job.assetId,requestId:key},requestHash:hash(request),request,reservationId:'reservation-retry',quiescence:{verification:'LOCAL_ATTEMPT_QUIESCENT',tuple:old,proofId:'quiescence-first'},response:{assetId:record.job.assetId,intentId:record.job.intentId,requestId:key,revision:3,operation:'JOB_RETRY',state:'QUEUED',jobId:record.job.jobId,jobRevision:3}};
  assert.deepEqual(validateAuthorityEnvelope(row.authorityEnvelope,context(row)),row.authorityEnvelope);
  const missing=clone(row);missing.J1Job.retryRecord=null;fail(()=>validateAuthorityEnvelope(missing.authorityEnvelope,context(missing)));
  for(const mutate of [r=>{r.requestHash='a'.repeat(64);},r=>{r.response.revision=6;},r=>{r.quiescence.tuple.leaseEpoch=2;},r=>{r.quiescence.tuple.attempt=2;}]){const bad=clone(row);mutate(bad.J1Job.retryRecord);fail(()=>validateAuthorityEnvelope(bad.authorityEnvelope,context(bad)));}
});
test('ReadyFact storage/cache/quiescence tuple, binding, MD and manifest-receipt relations reject mutation',()=>{
  badEnvelope(value=>{value.readyFact.storage.tuple.workerId='other-worker';});
  badEnvelope(value=>{value.readyFact.cache.binding.originalSha256='a'.repeat(64);});
  badEnvelope(value=>{value.readyFact.quiescence.tuple.leaseEpoch=2;});
  badEnvelope(value=>{value.readyFact.cache.metadataDigest='b'.repeat(64);});
  badEnvelope(value=>{value.readyFact.cache.manifestReceiptId='other-receipt';});
  badEnvelope(value=>{value.readyFact.storage.originalGeneration='9007199254740994';});
  badEnvelope(value=>{value.readyFact.storage.originalGeneration=9007199254740993;});
});
test('generation-bound normalized digest contains all IMAGE buckets and preserves opaque decimal generations',()=>{
  const value=validateAuthorityEnvelope(sample.authorityEnvelope,context());assert.equal(value.readyFact.storage.originalGeneration,'9007199254740993');assert.equal(value.readyVersion.derivatives[0].generation,'9007199254741001');
  badEnvelope(row=>{row.readyVersion.derivatives[0].generation='9007199254741004';});
  badEnvelope(row=>{row.readyVersion.derivatives.pop();});
  const tiny=fixture.cases.find(row=>row.family==='G_IMAGE_TINY'),parsed=validateAuthorityEnvelope(tiny.authorityEnvelope,context(tiny));assert.equal(parsed.readyVersion.derivatives.length,3);assert.equal(new Set(parsed.readyVersion.derivatives.map(value=>value.sha256)).size,1);
});
test('TOOLS owns exact closed R0 identity and canonical recipe wrapper validation',()=>{
  badContext(c=>{c.expectedJob.toolSetManifest.common.packageFiles[0].sha256='a'.repeat(64);});
  badContext(c=>{c.expectedJob.processingRecipe.toolSetSha256='b'.repeat(64);});
  badContext(c=>{c.expectedJob.processingRecipe.recipe.resize.widths=[320,960];});
  badContext(c=>{c.expectedJob.originalMetadata.width=1900;});
  badEnvelope(value=>{value.readyVersion.processingRecipeSha256='c'.repeat(64);});
});
test('strict terminal proof requires independent historical checker and complete seven-field binding',()=>{
  const proof=sample.rightsProof,c=rightsContext();assert.equal(Object.keys(bindingFromReadyVersion(sample.authorityEnvelope.readyVersion)).length,7);
  fail(()=>validateTerminalRightsProofV3({...proof,checkedBy:'current-actor'},c),'VALIDATION_ERROR');
  fail(()=>validateTerminalRightsProofV3(proof,{...c,originalCheckerUid:'current-actor'}),'VALIDATION_ERROR');
  const bad=clone(proof);bad.binding.evidenceSha256='a'.repeat(64);resign(bad);fail(()=>validateTerminalRightsProofV3(bad,c),'VALIDATION_ERROR');
  fail(()=>validateTerminalRightsProofV3({...proof,rightsRevision:0},c),'VALIDATION_ERROR');
});
test('invalid proofs retain Rights VALIDATION_ERROR while corrupt contexts retain INTERNAL_ERROR',()=>{
  const c=rightsContext();fail(()=>validateTerminalRightsProofV3({...sample.rightsProof,proofDigest:'a'.repeat(64)},c),'VALIDATION_ERROR');
  fail(()=>validateTerminalRightsProofV3({...sample.rightsProof,extra:true},c),'VALIDATION_ERROR');
  fail(()=>validateTerminalRightsProofV3(sample.rightsProof,{...c,currentActorUid:'caller'}));
  fail(()=>validateTerminalRightsProofV3(sample.rightsProof,{...c,hashCanonical:()=> 'invalid-digest'}));
});
test('terminal proof forbids uploader/evidence self-check and preserves exact raw notes',()=>{
  for(const checker of Object.values(sample.authorityEnvelope.actors)){const proof=resign({...clone(sample.rightsProof),checkedBy:checker});fail(()=>validateTerminalRightsProofV3(proof,{...rightsContext(),originalCheckerUid:checker}),'VALIDATION_ERROR');}
  const proof=resign({...clone(sample.rightsProof),note:'  Tiếng Việt 😀\nDòng hai  '});assert.equal(validateTerminalRightsProofV3(proof,rightsContext()).note,proof.note);
  const bad={...proof,note:'\uD800'};fail(()=>validateTerminalRightsProofV3(bad,rightsContext()),'VALIDATION_ERROR');
});
test('READY detail accepts exactly PENDING0/null, APPROVED1 and REJECTED1 original states',()=>{
  const pending={status:'PENDING',revision:0,proof:null},detail={...clone(sample.readyDetail),rights:pending};assert.deepEqual(validateReadyDetail(detail,{...detailContext(),rightsState:pending}),detail);
  const rejectedProof=resign({...clone(sample.rightsProof),decision:'REJECTED'}),rejected={status:'REJECTED',revision:1,proof:rejectedProof},rejectedDetail={...clone(sample.readyDetail),rights:rejected};assert.deepEqual(validateReadyDetail(rejectedDetail,{...detailContext(),rightsState:rejected}),rejectedDetail);
  for(const rights of [{status:'PENDING',revision:1,proof:null},{status:'APPROVED',revision:1,proof:null},{status:'REJECTED',revision:1,proof:sample.rightsProof}])fail(()=>validateReadyDetail({...detail,rights},{...detailContext(),rightsState:rights}));
});
test('READY detail cannot replace stored historical proof, actor, metadata, binding or safe summary',()=>{
  const detail=clone(sample.readyDetail);detail.rights.proof.checkedBy='new-checker';resign(detail.rights.proof);fail(()=>validateReadyDetail(detail,detailContext()));
  for(const mutate of [d=>{d.summary.width=320;},d=>{d.metadata.name+=' change';},d=>{d.binding.derivativeSetSha256='a'.repeat(64);},d=>{d.actors.uploaderUid='other';},d=>{d.summary.uploaderUid='private';},d=>{d.rawReadyFact=sample.authorityEnvelope.readyFact;}]){const value=clone(sample.readyDetail);mutate(value);fail(()=>validateReadyDetail(value,detailContext()));}
});
test('strict JSON and unsafe numeric/string shapes are refused across envelope and detail boundaries',()=>{
  badEnvelope(value=>{value.readyVersion.revision=Number.MAX_SAFE_INTEGER;});
  badEnvelope(value=>{value.metadata.name='\uD800';});badEnvelope(value=>{value.metadata.name=undefined;});
  badEnvelope(value=>{delete value.readyVersion.derivatives[0];});badEnvelope(value=>{value.metadata[Symbol('authority')]=true;});
  const detail=clone(sample.readyDetail);detail.metadata.self=detail.metadata;fail(()=>validateReadyDetail(detail,detailContext()));
});
