import test from 'node:test';
import assert from 'node:assert/strict';
import {attemptTupleV2Schema,frozenInputV2Schema,uploadMetadataFactV2Schema,
 readyFactV2Schema,readyDetailV2Schema,validateAuthorityEnvelopeV2} from '../contracts/media-v3-authority-v2.mjs';
const digest='a'.repeat(64);
const tuple={jobId:'job-a2',intentId:'intent-a2',assetId:'asset-a2',kind:'IMAGE',attempt:2,leaseEpoch:2,workerId:'worker-a2'};
const binding={assetId:'asset-a2',kind:'IMAGE',originalSha256:digest,derivativeSetSha256:digest,processingRecipeSha256:digest,toolSetSha256:digest};
// Structural literals only; no native/Storage/Auth proof is implied.
test('v2 MetadataFact is exact and excludes manual Rights/EV authority',()=>{
 const fact={contractRevision:2,verification:'UPLOAD_METADATA_VALIDATED',kind:'IMAGE',metadataDigest:digest,uploaderUid:'uploader-a2',proofId:'metadata-a2'};
 assert.deepEqual(uploadMetadataFactV2Schema.parse(fact),fact);
 assert.equal(uploadMetadataFactV2Schema.safeParse({...fact,evidenceSha256:digest}).success,false);
 assert.equal(uploadMetadataFactV2Schema.safeParse({...fact,contractRevision:1}).success,false);
});
test('v2 tuple and frozen input remain untagged and six-field input',()=>{
 assert.deepEqual(attemptTupleV2Schema.parse(tuple),tuple);
 const input={assetId:'asset-a2',kind:'IMAGE',originalSha256:digest,inputBytes:4,processingRecipeSha256:digest,toolSetSha256:digest};
 assert.deepEqual(frozenInputV2Schema.parse(input),input);
 assert.equal(frozenInputV2Schema.safeParse({...input,contractRevision:2}).success,false);
 assert.equal(attemptTupleV2Schema.safeParse({...tuple,contractRevision:2}).success,false);
});
test('v2 ReadyFact requires matching tuple/MD/receipt/generation-bound digest',()=>{
 const fact={contractRevision:2,verification:'MEDIA_READY_ATTEMPT',tuple,binding,metadataDigest:digest,
 storage:{contractRevision:2,verification:'MEDIA_STORAGE_FULL_NORMALIZED_SET',tuple,binding,metadataDigest:digest,originalGeneration:'9007199254740993',generationBoundDerivativeSetSha256:digest,manifestReceiptId:'manifest-a2'},
 cache:{contractRevision:2,verification:'MEDIA_CACHE_VERIFIED',tuple,binding,metadataDigest:digest,manifestReceiptId:'manifest-a2',inspectionId:'inspect-a2'},
 quiescence:{contractRevision:2,verification:'LOCAL_ATTEMPT_QUIESCENT',tuple,proofId:'quiet-a2'},proofId:'ready-a2'};
 assert.deepEqual(readyFactV2Schema.parse(fact),fact);
 assert.equal(readyFactV2Schema.safeParse({...fact,cache:{...fact.cache,metadataDigest:'b'.repeat(64)}}).success,false);
 assert.equal(readyFactV2Schema.safeParse({...fact,storage:{...fact.storage,originalGeneration:9007199254740993}}).success,false);
});
test('v2 private ReadyDetail has exactly four fields and no Rights state',()=>{
 const detail={summary:{contractRevision:2,assetId:'asset-a2',kind:'IMAGE',status:'READY',archived:false,revision:1,width:120,height:80},binding,metadata:{name:'Golden'},actors:{uploaderUid:'uploader-a2'}};
 assert.deepEqual(readyDetailV2Schema.parse(detail),detail);
 assert.equal(readyDetailV2Schema.safeParse({...detail,rights:{status:'APPROVED'}}).success,false);
});
test('v2 options reject hash accessor before invoking it or reading envelope',()=>{
 let calls=0;const context={expectedUpload:{},expectedJob:{},profileId:'M3-IMAGE-R0-1'};
 Object.defineProperty(context,'hashCanonical',{enumerable:true,get(){calls++;return ()=>digest;}});
 assert.throws(()=>validateAuthorityEnvelopeV2(null,context),error=>error.code==='INTERNAL_ERROR');assert.equal(calls,0);
});
