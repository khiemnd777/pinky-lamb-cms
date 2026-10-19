// R0 frozen-core RED candidates. Pure inputs are synthetic, never CMS evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {canonicalJson} from '../contracts/draft.mjs';
import * as rights from '../contracts/media-rights.mjs';

const hashCanonical=value=>createHash('sha256').update(canonicalJson(value)).digest('hex');
function scenario(decision='APPROVED') {
  const binding={assetId:'media_version_01',kind:'IMAGE',originalSha256:'1'.repeat(64),derivativeSetSha256:'2'.repeat(64),
    processingRecipeSha256:'3'.repeat(64),toolSetSha256:'4'.repeat(64),evidenceSha256:'5'.repeat(64)};
  const request={expectedBinding:{...binding},expectedRightsRevision:0,decision,note:'checked evidence'};
  const context={binding,mediaStatus:'READY',actorUid:'reviewer_01',uploaderUid:'editor_01',
    rightsEvidenceSubmittedBy:'evidence_01',rights:{status:'PENDING',revision:0,proof:null},
    operation:'POST /api/cms/media/media_version_01/rights-checks',requestId:'intent_0001',
    requestHash:hashCanonical(request),replay:null};
  return {request,context,hashCanonical};
}
function completed(decision='APPROVED') {
  const input=scenario(decision),{context,request}=input;
  const unsigned={id:'proof_01',verification:'MEDIA_RIGHTS_CHECK',binding:{...context.binding},
    uploaderUid:context.uploaderUid,rightsEvidenceSubmittedBy:context.rightsEvidenceSubmittedBy,checkedBy:context.actorUid,
    decision,checkedAt:'2026-10-13T16:00:00.000Z',rightsRevision:1,eventId:'audit_01',note:request.note};
  const proof={...unsigned,proofDigest:hashCanonical(unsigned)};
  context.rights={status:decision,revision:1,proof};
  context.replay={identity:{actorUid:context.actorUid,operation:context.operation,assetId:context.binding.assetId,requestId:context.requestId},
    requestHash:context.requestHash,state:'COMPLETED',statusCode:201,
    response:{assetId:context.binding.assetId,rightsRevision:1,proofId:proof.id,proofDigest:proof.proofDigest},
    eventId:proof.eventId,createdAt:proof.checkedAt};
  return input;
}
// Recompute real digest and receipt pin so relation tests cannot fail only on hash integrity.
function refreshReplayProofDigest(input) {
  const proof=input.context.rights.proof,unsigned={...proof}; delete unsigned.proofDigest;
  proof.proofDigest=hashCanonical(unsigned);
  input.context.replay.response.proofDigest=proof.proofDigest;
}
for (const decision of ['APPROVED','REJECTED']) {
  test(`non-self READY PENDING revision zero plans ${decision} revision one`, () => {
    assert.deepEqual(rights.evaluateMediaRightsDecision(scenario(decision)),
      {action:'CREATE_TERMINAL',decision,fromRevision:0,toRevision:1});
  });
  test(`${decision} terminal exact retry returns validated original receipt`, () => {
    const input=completed(decision);
    assert.deepEqual(rights.evaluateMediaRightsDecision(input),{action:'REPLAY',receipt:input.context.replay.response});
  });
  test(`${decision} terminal rejects a new intent`, () => {
    const input=completed(decision); input.context.replay=null; input.context.requestId='intent_0002';
    assert.throws(() => rights.evaluateMediaRightsDecision(input), {code:'REVIEW_STATE_CONFLICT',status:409});
  });
  test(`${decision} valid historical checker with a different current non-self reviewer conflicts409`, () => {
    const input=completed(decision); input.context.replay=null;
    input.context.actorUid='reviewer_02'; input.context.requestId='intent_0002';
    assert.throws(() => rights.evaluateMediaRightsDecision(input),{code:'REVIEW_STATE_CONFLICT',status:409});
  });
}
for (const field of ['uploaderUid','rightsEvidenceSubmittedBy']) {
  test(`actor equal to ${field} is denied including Owner; no override input`, () => {
    const input=scenario(); input.context.actorUid=input.context[field];
    assert.throws(() => rights.evaluateMediaRightsDecision(input),{code:'SELF_REVIEW_FORBIDDEN',status:403});
  });
  test(`missing trusted ${field} cannot establish non-self`, () => {
    const input=scenario(); delete input.context[field];
    assert.throws(() => rights.evaluateMediaRightsDecision(input),{code:'INTERNAL_ERROR'});
  });
}
for (const status of ['QUEUED','PROCESSING','FAILED','LEGACY_READY']) {
  test(`${status} does not authorize a new rights decision`, () => {
    const input=scenario(); input.context.mediaStatus=status;
    assert.throws(() => rights.evaluateMediaRightsDecision(input),{code:'REVIEW_STATE_CONFLICT',status:409});
  });
}
for (const field of Object.keys(scenario().context.binding)) {
  test(`changed current ${field} conflicts with exact expected binding`, () => {
    const input=scenario(); input.context.binding[field]=field==='assetId'?'media_version_02':field==='kind'?'VIDEO':'6'.repeat(64);
    if(field==='assetId')input.context.operation=`POST /api/cms/media/${input.context.binding.assetId}/rights-checks`;
    assert.throws(() => rights.evaluateMediaRightsDecision(input),{code:'REVISION_CONFLICT',status:409});
  });
}
test('same intent with changed payload is 422, not a second terminal decision', () => {
  const input=completed(); input.request.note='changed'; input.context.requestHash=hashCanonical(input.request);
  assert.throws(() => rights.evaluateMediaRightsDecision(input),{code:'IDEMPOTENCY_PAYLOAD_MISMATCH',status:422});
});
for (const field of ['actorUid','operation','assetId','requestId']) {
  test(`replay validates stored identity ${field}`, () => {
    const input=completed(); input.context.replay.identity[field]='other_value';
    assert.throws(() => rights.evaluateMediaRightsDecision(input),{code:'INTERNAL_ERROR'});
  });
}
for (const field of ['assetId','rightsRevision','proofId','proofDigest']) {
  test(`replay rejects receipt tampering in ${field}`, () => {
    const input=completed(); input.context.replay.response[field]=field==='rightsRevision'?0:'other_value';
    assert.throws(() => rights.evaluateMediaRightsDecision(input),{code:'INTERNAL_ERROR'});
  });
}
for (const field of ['eventId','createdAt']) {
  test(`replay validates ${field} against terminal proof`, () => {
    const input=completed(); input.context.replay[field]=field==='createdAt'?'2026-10-13T17:00:00.000Z':'audit_other';
    assert.throws(() => rights.evaluateMediaRightsDecision(input),{code:'INTERNAL_ERROR'});
  });
}
test('replay rejects a tampered proof even if receipt repeats its claimed digest', () => {
  const input=completed(); input.context.rights.proof.note='tampered';
  assert.throws(() => rights.evaluateMediaRightsDecision(input),{code:'INTERNAL_ERROR'});
});
test('new decision plan neither mutates inputs nor creates terminal proof', () => {
  const input=scenario(),before=structuredClone({request:input.request,context:input.context});
  const plan=rights.evaluateMediaRightsDecision(input);
  assert.deepEqual({request:input.request,context:input.context},before);
  assert.deepEqual(Object.keys(plan).sort(),['action','decision','fromRevision','toRevision']);
});
test('missing authenticated actor cannot establish non-self', () => {
  const input=scenario(); delete input.context.actorUid;
  assert.throws(() => rights.evaluateMediaRightsDecision(input),{code:'INTERNAL_ERROR'});
});
test('replay rejects proof note that diverges from intent even with recomputed digest and receipt', () => {
  const input=completed(),proof=input.context.rights.proof;
  proof.note='other evidence note';
  const unsigned={...proof}; delete unsigned.proofDigest;
  proof.proofDigest=hashCanonical(unsigned); input.context.replay.response.proofDigest=proof.proofDigest;
  assert.throws(() => rights.evaluateMediaRightsDecision(input),{code:'INTERNAL_ERROR'});
});
test('operation intent key is distinct from immutable media version identity', () => {
  const input=completed();
  assert.notEqual(input.context.requestId,input.context.binding.assetId);
  assert.deepEqual(rights.evaluateMediaRightsDecision(input),{action:'REPLAY',receipt:input.context.replay.response});
});

for (const field of Object.keys(scenario().context.binding)) {
  test(`replay rejects changed current binding ${field} even when proof and digest match new binding`, () => {
    const input=completed(),changed=field==='assetId'?'media_version_02':field==='kind'?'VIDEO':'6'.repeat(64);
    input.context.binding[field]=changed; input.context.rights.proof.binding[field]=changed;
    if(field==='assetId')input.context.operation=`POST /api/cms/media/${input.context.binding.assetId}/rights-checks`;
    refreshReplayProofDigest(input);
    assert.throws(() => rights.evaluateMediaRightsDecision(input),{code:'REVISION_CONFLICT',status:409});
  });
  test(`replay rejects stale proof binding ${field} with recomputed proof digest and receipt pin`, () => {
    const input=completed();
    input.context.rights.proof.binding[field]=field==='assetId'?'media_version_02':field==='kind'?'VIDEO':'6'.repeat(64);
    refreshReplayProofDigest(input);
    assert.throws(() => rights.evaluateMediaRightsDecision(input),{code:'INTERNAL_ERROR',status:500});
  });
}
for (const field of ['actorUid','uploaderUid','rightsEvidenceSubmittedBy']) {
  test(`replay rejects missing current trusted ${field} instead of returning completed receipt`, () => {
    const input=completed(); delete input.context[field];
    assert.throws(() => rights.evaluateMediaRightsDecision(input),{code:'INTERNAL_ERROR',status:500});
  });
}
for (const field of ['uploaderUid','rightsEvidenceSubmittedBy']) {
  test(`replay rejects current actor changed to ${field} even with matching stored actor and digest`, () => {
    const input=completed(); input.context.actorUid=input.context[field];
    input.context.replay.identity.actorUid=input.context.actorUid;
    input.context.rights.proof.checkedBy=input.context.actorUid;
    refreshReplayProofDigest(input);
    assert.throws(() => rights.evaluateMediaRightsDecision(input),{code:'SELF_REVIEW_FORBIDDEN',status:403});
  });
  test(`replay enforces current non-self for ${field}, including Owner, before returning receipt`, () => {
    const input=completed();
    input.context[field]=input.context.actorUid;
    input.context.rights.proof[field]=input.context.actorUid;
    refreshReplayProofDigest(input);
    assert.throws(() => rights.evaluateMediaRightsDecision(input),{code:'SELF_REVIEW_FORBIDDEN',status:403});
  });
  test(`replay rejects proof ${field} unlike current trusted UID with recomputed digest`, () => {
    const input=completed(); input.context.rights.proof[field]='other_01';
    refreshReplayProofDigest(input);
    assert.throws(() => rights.evaluateMediaRightsDecision(input),{code:'INTERNAL_ERROR',status:500});
  });
}
test('replay rejects checkedBy unlike current actor despite a valid recomputed proof digest', () => {
  const input=completed(); input.context.rights.proof.checkedBy='other_reviewer';
  refreshReplayProofDigest(input);
  assert.throws(() => rights.evaluateMediaRightsDecision(input),{code:'INTERNAL_ERROR',status:500});
});
for (const decision of ['APPROVED','REJECTED']) {
  test(`replay rejects proof decision different from ${decision} intent with recomputed digest`, () => {
    const input=completed(decision); input.context.rights.proof.decision=decision==='APPROVED'?'REJECTED':'APPROVED';
    input.context.rights.status=input.context.rights.proof.decision;
    refreshReplayProofDigest(input);
    assert.throws(() => rights.evaluateMediaRightsDecision(input),{code:'INTERNAL_ERROR',status:500});
  });
  test(`replay rejects terminal state different from ${decision} proof and intent`, () => {
    const input=completed(decision); input.context.rights.status=decision==='APPROVED'?'REJECTED':'APPROVED';
    refreshReplayProofDigest(input);
    assert.throws(() => rights.evaluateMediaRightsDecision(input),{code:'INTERNAL_ERROR',status:500});
  });
}
test('replay rejects current rights revision zero with a completed terminal proof', () => {
  const input=completed(); input.context.rights.revision=0; refreshReplayProofDigest(input);
  assert.throws(() => rights.evaluateMediaRightsDecision(input),{code:'INTERNAL_ERROR',status:500});
});
test('replay rejects PENDING current state with a completed terminal receipt', () => {
  const input=completed(); input.context.rights.status='PENDING'; refreshReplayProofDigest(input);
  assert.throws(() => rights.evaluateMediaRightsDecision(input),{code:'INTERNAL_ERROR',status:500});
});
test('replay rejects proof rights revision zero despite recomputed digest', () => {
  const input=completed(); input.context.rights.proof.rightsRevision=0; refreshReplayProofDigest(input);
  assert.throws(() => rights.evaluateMediaRightsDecision(input),{code:'INTERNAL_ERROR',status:500});
});
for (const [field,value] of [['id','proof_other'],['checkedAt','2026-10-13T17:00:00.000Z'],['eventId','audit_other']]) {
  test(`replay rejects proof ${field} relationship mismatch despite recomputed digest`, () => {
    const input=completed(); input.context.rights.proof[field]=value; refreshReplayProofDigest(input);
    assert.throws(() => rights.evaluateMediaRightsDecision(input),{code:'INTERNAL_ERROR',status:500});
  });
}
test('trusted context rejects legacy evidenceSubmittedBy alias without uploader fallback', () => {
  const input=scenario(); input.context.evidenceSubmittedBy=input.context.rightsEvidenceSubmittedBy;
  delete input.context.rightsEvidenceSubmittedBy;
  assert.throws(() => rights.evaluateMediaRightsDecision(input),{code:'INTERNAL_ERROR',status:500});
});
test('completed record requires response and rejects speculative responseReceipt alias', () => {
  const input=completed(); input.context.replay.responseReceipt=input.context.replay.response;
  delete input.context.replay.response;
  assert.throws(() => rights.evaluateMediaRightsDecision(input),{code:'INTERNAL_ERROR',status:500});
});
for (const field of ['actorUid','uploaderUid','rightsEvidenceSubmittedBy']) {
  test(`trusted UID ${field} accepts128 and rejects129 ASCII units`, () => {
    const input=scenario(); input.context[field]='a'.repeat(128);
    assert.equal(rights.evaluateMediaRightsDecision(input).action,'CREATE_TERMINAL');
    input.context[field]='a'.repeat(129);
    assert.throws(() => rights.evaluateMediaRightsDecision(input),{code:'INTERNAL_ERROR',status:500});
  });
}
test('trusted operation is bound to exact current immutable version endpoint', () => {
  const input=scenario(); input.context.operation='POST /api/cms/media/latest/rights-checks';
  assert.throws(() => rights.evaluateMediaRightsDecision(input),{code:'INTERNAL_ERROR',status:500});
});
test('trusted request hash must match exact validated payload', () => {
  const input=scenario(); input.context.requestHash='a'.repeat(64);
  assert.throws(() => rights.evaluateMediaRightsDecision(input),{code:'INTERNAL_ERROR',status:500});
});
test('trusted context rejects unknown or symbol keys', () => {
  const input=scenario(); input.context.allowSelfReview=true;
  assert.throws(() => rights.evaluateMediaRightsDecision(input),{code:'INTERNAL_ERROR',status:500});
  delete input.context.allowSelfReview; input.context[Symbol('actorUid')]='forged';
  assert.throws(() => rights.evaluateMediaRightsDecision(input),{code:'INTERNAL_ERROR',status:500});
});
test('replay is not gated on READY for an otherwise valid terminal record', () => {
  const input=completed(); input.context.mediaStatus='FAILED';
  assert.deepEqual(rights.evaluateMediaRightsDecision(input),{action:'REPLAY',receipt:input.context.replay.response});
});
for (const [label,callback] of [['absent',undefined],['throws',()=>{throw new Error('untrusted raw failure');}],['nonhash',()=> 'not-a-sha']]) {
  test(`evaluator rejects ${label} trusted hash capability`, () => {
    const input=scenario(); input.hashCanonical=callback;
    assert.throws(() => rights.evaluateMediaRightsDecision(input),{code:'INTERNAL_ERROR',status:500});
  });
}
test('changed replay decision payload422 precedes proof-request semantic mismatch500', () => {
  const input=completed(); input.request.decision='REJECTED'; input.context.requestHash=hashCanonical(input.request);
  assert.throws(() => rights.evaluateMediaRightsDecision(input),{code:'IDEMPOTENCY_PAYLOAD_MISMATCH',status:422});
});
test('trusted nested accessor/cycle/undefined fail as500 without getter execution', () => {
  let getterCalls=0; const input=scenario();
  Object.defineProperty(input.context.binding,'assetId',{enumerable:true,get(){getterCalls++;return 'media_version_01';}});
  assert.throws(() => rights.evaluateMediaRightsDecision(input),{code:'INTERNAL_ERROR',status:500});
  assert.equal(getterCalls,0);
  const cycle=scenario(); cycle.context.rights.proof=cycle.context;
  assert.throws(() => rights.evaluateMediaRightsDecision(cycle),{code:'INTERNAL_ERROR',status:500});
  const undefinedInput=scenario(); undefinedInput.context.replay=undefined;
  assert.throws(() => rights.evaluateMediaRightsDecision(undefinedInput),{code:'INTERNAL_ERROR',status:500});
});
