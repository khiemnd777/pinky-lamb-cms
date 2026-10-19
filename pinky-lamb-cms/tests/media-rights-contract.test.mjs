// R0 frozen-core RED candidates; planned exports absent before observed RED.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {canonicalJson} from '../contracts/draft.mjs';
import * as rights from '../contracts/media-rights.mjs';

const hashCanonical = value => createHash('sha256').update(canonicalJson(value)).digest('hex');
const binding = () => ({assetId:'media_version_01', kind:'IMAGE', originalSha256:'1'.repeat(64),
  derivativeSetSha256:'2'.repeat(64), processingRecipeSha256:'3'.repeat(64),
  toolSetSha256:'4'.repeat(64), evidenceSha256:'5'.repeat(64)});
const request = () => ({expectedBinding:binding(), expectedRightsRevision:0, decision:'APPROVED', note:'  Có quyền sử dụng.  '});
// Standalone proof authority is a strict four-field projection, not evaluator context.
const context = () => ({binding:binding(), actorUid:'reviewer_01', uploaderUid:'editor_01', rightsEvidenceSubmittedBy:'evidence_01'});
function proof() {
  const value = {id:'proof_01', verification:'MEDIA_RIGHTS_CHECK', binding:binding(),
    uploaderUid:'editor_01', rightsEvidenceSubmittedBy:'evidence_01', checkedBy:'reviewer_01',
    decision:'APPROVED', checkedAt:'2026-10-13T16:00:00.000Z', rightsRevision:1,
    eventId:'audit_01', note:request().note};
  return {...value, proofDigest:hashCanonical(value)};
}
const validationOptions = () => ({context:context(), hashCanonical});

test('request preserves exact whitespace and binding', () => {
  const input = request();
  assert.deepEqual(rights.parseMediaRightsRequest(input), input);
});

for (const key of ['actorUid','checkedBy','checkedAt','status','proof','allowSelfReview','requestId']) {
  test(`request rejects server-owned or alias key ${key}`, () => {
    assert.throws(() => rights.parseMediaRightsRequest({...request(), [key]:'untrusted'}), {code:'VALIDATION_ERROR'});
  });
}
test('request rejects unknown nested binding keys', () => {
  const input=request(); input.expectedBinding.latest=true;
  assert.throws(() => rights.parseMediaRightsRequest(input), {code:'VALIDATION_ERROR'});
});
for (const decision of ['PENDING','SOURCE_CHECKED',null]) {
  test(`request rejects non-terminal decision ${decision}`, () => {
    assert.throws(() => rights.parseMediaRightsRequest({...request(),decision}), {code:'VALIDATION_ERROR'});
  });
}
test('request accepts REJECTED and disallows revision one', () => {
  assert.equal(rights.parseMediaRightsRequest({...request(),decision:'REJECTED'}).decision,'REJECTED');
  assert.throws(() => rights.parseMediaRightsRequest({...request(),expectedRightsRevision:1}), {code:'VALIDATION_ERROR'});
});
for (const value of ['A'.repeat(64),'a'.repeat(63),'sha256:abc',' a'.repeat(32)]) {
  test(`request rejects noncanonical SHA form ${value.length}`, () => {
    const input=request(); input.expectedBinding.originalSha256=value;
    assert.throws(() => rights.parseMediaRightsRequest(input), {code:'VALIDATION_ERROR'});
  });
}
test('request rejects malformed Unicode instead of replacing a lone surrogate', () => {
  assert.throws(() => rights.parseMediaRightsRequest({...request(),note:'\uD800'}), {code:'VALIDATION_ERROR'});
});
test('request rejects actual UTF-8 serialized overflow before accepting object keys', () => {
  const input={...request(),note:'😀'.repeat(17000)};
  assert.ok(Buffer.byteLength(JSON.stringify(input),'utf8')>65536);
  assert.throws(() => rights.parseMediaRightsRequest(input), {code:'PAYLOAD_TOO_LARGE'});
});
test('request preserves Unicode composition instead of silently normalizing it', () => {
  const input={...request(),note:'e\u0301'};
  assert.equal(rights.parseMediaRightsRequest(input).note,'e\u0301');
});
test('terminal proof validates exact digest and returns exact record', () => {
  const input=proof();
  assert.deepEqual(rights.validateMediaRightsProof(input,validationOptions()),input);
});
for (const field of Object.keys(binding())) {
  test(`proof rejects stale ${field} even with recomputed proof digest`, () => {
    const input=proof(); input.binding[field]=field==='assetId'?'media_version_02':field==='kind'?'VIDEO':'6'.repeat(64);
    const {proofDigest: _old,...unsigned}=input; void _old; input.proofDigest=hashCanonical(unsigned);
    assert.throws(() => rights.validateMediaRightsProof(input,validationOptions()), {code:'VALIDATION_ERROR'});
  });
}
test('proof rejects tampering without a new digest', () => {
  assert.throws(() => rights.validateMediaRightsProof({...proof(),note:'changed'},validationOptions()), {code:'VALIDATION_ERROR'});
});
for (const patch of [{verification:'SOURCE_CHECKED'},{decision:'PENDING'},{rightsRevision:0},{checkedBy:'editor_01'},{rightsEvidenceSubmittedBy:'other_01'}]) {
  test(`proof rejects incompatible ${Object.keys(patch)[0]}`, () => {
    const {proofDigest: _old,...unsigned}={...proof(),...patch}; void _old;
    assert.throws(() => rights.validateMediaRightsProof({...unsigned,proofDigest:hashCanonical(unsigned)},validationOptions()), {code:'VALIDATION_ERROR'});
  });
}
test('REJECTED is a terminal proof but does not become an APPROVED proof', () => {
  const {proofDigest: _old,...unsigned}={...proof(),decision:'REJECTED'}; void _old;
  const input={...unsigned,proofDigest:hashCanonical(unsigned)};
  const validated=rights.validateMediaRightsProof(input,validationOptions());
  assert.equal(validated.decision,'REJECTED');
});

test('request accepts assetId100 and rejects101 ASCII units', () => {
  const valid=request(); valid.expectedBinding.assetId='a'.repeat(100);
  assert.equal(rights.parseMediaRightsRequest(valid).expectedBinding.assetId.length,100);
  const invalid=request(); invalid.expectedBinding.assetId='a'.repeat(101);
  assert.throws(() => rights.parseMediaRightsRequest(invalid),{code:'VALIDATION_ERROR',status:422});
});
for (const kind of ['IMAGE','VIDEO','PDF']) {
  test(`request accepts frozen kind ${kind}`, () => {
    const input=request(); input.expectedBinding.kind=kind;
    assert.equal(rights.parseMediaRightsRequest(input).expectedBinding.kind,kind);
  });
}
for (const kind of [undefined,'image','SOURCE_CHECKED']) {
  test(`request rejects missing/invalid binding kind ${kind}`, () => {
    const input=request(); if(kind===undefined)delete input.expectedBinding.kind;else input.expectedBinding.kind=kind;
    assert.throws(() => rights.parseMediaRightsRequest(input),{code:'VALIDATION_ERROR',status:422});
  });
}
for (const field of ['originalSha256','derivativeSetSha256','processingRecipeSha256','toolSetSha256','evidenceSha256']) {
  test(`request rejects uppercase digest ${field}`, () => {
    const input=request(); input.expectedBinding[field]='A'.repeat(64);
    assert.throws(() => rights.parseMediaRightsRequest(input),{code:'VALIDATION_ERROR',status:422});
  });
}
test('note cap counts UTF16 units rather than code points', () => {
  const valid={...request(),note:'😀'.repeat(500)};
  assert.equal(rights.parseMediaRightsRequest(valid).note.length,1000);
  assert.throws(() => rights.parseMediaRightsRequest({...request(),note:'😀'.repeat(501)}),{code:'VALIDATION_ERROR',status:422});
});
test('request rejects symbol properties and accessors without reading getters', () => {
  const symbolInput=request(); symbolInput[Symbol('actorUid')]='other';
  assert.throws(() => rights.parseMediaRightsRequest(symbolInput),{code:'VALIDATION_ERROR',status:422});
  let read=false; const getterInput=request();
  Object.defineProperty(getterInput,'note',{enumerable:true,get(){read=true;return 'unexpected';}});
  assert.throws(() => rights.parseMediaRightsRequest(getterInput),{code:'VALIDATION_ERROR',status:422});
  assert.equal(read,false);
});
test('request rejects nonJSON explicit undefined rather than silently omitting payload data', () => {
  assert.throws(() => rights.parseMediaRightsRequest({...request(),note:undefined}),{code:'VALIDATION_ERROR',status:422});
});
for (const checkedAt of ['2026-02-30T16:00:00.000Z','2026-10-13T25:00:00.000Z','2026-10-13T16:00:00.000+00:00','2026-10-13T16:00:00Z','2026-10-13T16:00:00.0000Z']) {
  test(`proof rejects invalid or nonexact UTC time ${checkedAt}`, () => {
    const input={...proof(),checkedAt}; const unsigned={...input}; delete unsigned.proofDigest;
    input.proofDigest=hashCanonical(unsigned);
    assert.throws(() => rights.validateMediaRightsProof(input,validationOptions()),{code:'VALIDATION_ERROR',status:422});
  });
}
test('proof rejects legacy evidenceSubmittedBy alias rather than defaulting uploader', () => {
  const input=proof(); input.evidenceSubmittedBy=input.rightsEvidenceSubmittedBy; delete input.rightsEvidenceSubmittedBy;
  const unsigned={...input}; delete unsigned.proofDigest; input.proofDigest=hashCanonical(unsigned);
  assert.throws(() => rights.validateMediaRightsProof(input,validationOptions()),{code:'VALIDATION_ERROR',status:422});
});
test('note cap accepts1000 and rejects1001 UTF16 units', () => {
  assert.equal(rights.parseMediaRightsRequest({...request(),note:'a'.repeat(1000)}).note.length,1000);
  assert.throws(() => rights.parseMediaRightsRequest({...request(),note:'a'.repeat(1001)}),{code:'VALIDATION_ERROR',status:422});
});
test('nested binding getter is rejected before getter execution', () => {
  let getterCalls=0; const input=request();
  Object.defineProperty(input.expectedBinding,'assetId',{enumerable:true,get(){getterCalls++;return 'media_version_01';}});
  assert.throws(() => rights.parseMediaRightsRequest(input),{code:'VALIDATION_ERROR',status:422});
  assert.equal(getterCalls,0);
});
test('request rejects nonplain and cyclic objects', () => {
  const inherited=Object.assign(Object.create({trusted:true}),request());
  assert.throws(() => rights.parseMediaRightsRequest(inherited),{code:'VALIDATION_ERROR',status:422});
  const cycle=request(); cycle.expectedBinding.assetId=cycle;
  assert.throws(() => rights.parseMediaRightsRequest(cycle),{code:'VALIDATION_ERROR',status:422});
});
test('proof getter and symbol keys are rejected before getter execution', () => {
  let getterCalls=0; const input=proof();
  Object.defineProperty(input,'checkedBy',{enumerable:true,get(){getterCalls++;return 'reviewer_01';}});
  assert.throws(() => rights.validateMediaRightsProof(input,validationOptions()),{code:'VALIDATION_ERROR',status:422});
  assert.equal(getterCalls,0);
  const symbols=proof(); symbols[Symbol('checkedBy')]='other';
  assert.throws(() => rights.validateMediaRightsProof(symbols,validationOptions()),{code:'VALIDATION_ERROR',status:422});
});
test('proof accepts an actual valid leap date with exact UTC serialization', () => {
  const input={...proof(),checkedAt:'2024-02-29T16:00:00.000Z'};
  const unsigned={...input}; delete unsigned.proofDigest; input.proofDigest=hashCanonical(unsigned);
  assert.deepEqual(rights.validateMediaRightsProof(input,validationOptions()),input);
});
test('proof validation rejects malformed trusted context as500 rather than malformed proof422', () => {
  const options=validationOptions(); delete options.context.rightsEvidenceSubmittedBy;
  assert.throws(() => rights.validateMediaRightsProof(proof(),options),{code:'INTERNAL_ERROR',status:500});
});
for (const [label,hashCanonical] of [['absent',undefined],['throws',()=>{throw new Error('untrusted raw failure');}],['nonhash',()=> 'not-a-sha']]) {
  test(`proof validation requires trusted hash capability ${label}`, () => {
    const options={...validationOptions(),hashCanonical};
    assert.throws(() => rights.validateMediaRightsProof(proof(),options),{code:'INTERNAL_ERROR',status:500});
  });
}
test('proof enforces serialized byte budget including escaping', () => {
  const {proofDigest: _old,...unsigned}={...proof(),note:'\\'.repeat(9000)}; void _old;
  const input={...unsigned,proofDigest:hashCanonical(unsigned)};
  assert.ok(Buffer.byteLength(JSON.stringify(input),'utf8')>8192);
  assert.throws(() => rights.validateMediaRightsProof(input,validationOptions()), {code:'PAYLOAD_TOO_LARGE'});
});
