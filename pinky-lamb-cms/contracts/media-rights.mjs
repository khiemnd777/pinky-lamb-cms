import {z} from 'zod';
import {ApiError} from './errors.mjs';
import {resourceIdSchema,hashSchema,idempotencyKeySchema} from './hero.mjs';
import {canonicalJson} from './draft.mjs';
import {plainText,strictSiteObject} from './site-settings.mjs';
import {mediaBindingSchema} from './media-v3-contract.mjs';

/** Retained contract descriptor. This core does not establish producer custody or Auth. */
export const ProposedMediaRightsPreparation = {
  phase: 'BOUNDED_STRUCTURAL_CORE',
  bindingFreeze: 'M3-PURE-RIGHTS-BINDING-01 v1; STRUCTURAL_CORE_FROZEN_PRODUCER_INTEGRATION_HOLD',
  idempotencyClarification: 'M3-IDEMPOTENCY-DECISION-01 v1; RESOLVED_TRANSPORT_RULE_ONLY',
  plannedExports: {
    parseMediaRightsRequest: '(input) -> strict request; throws existing ApiError',
    validateMediaRightsProof: '(proof, {context:strict4fieldAuthority, hashCanonical}) -> validated proof',
    evaluateMediaRightsDecision: '({request, context, hashCanonical}) -> decision plan',
  },
  limitsBytes: {request: 65536, provenanceEvidence: 4096, detailIncludingProof: 8192},
  measurement: 'UTF-8 bytes of serialized whole record, including JSON escaping',
  strings: 'Well-formed Unicode; no trim, case-fold or silent normalization',
  binding: {
    assetId: 'Exact immutable MediaVersion.id; ASCII [A-Za-z0-9_-]{1,100}; never latest',
    kind: 'IMAGE | VIDEO | PDF',
    originalSha256: 'hashSchema',
    derivativeSetSha256: 'hashSchema; full immutable processed output set of exact MediaVersion, distinct from selected site references; normalized projection M3-DERIVATIVE-PROJECTION-01; opaque trusted supplied digest',
    processingRecipeSha256: 'hashSchema',
    toolSetSha256: 'hashSchema; opaque trusted supplied digest; producer closure proof remains integration HOLD',
    evidenceSha256: 'hashSchema; opaque trusted supplied digest; producer provenance proof remains integration HOLD',
  },
  proofAuthority: 'Strict {binding, actorUid, uploaderUid, rightsEvidenceSubmittedBy}; evaluator derives it from its strict10field context, never accepts both shapes',
  request: {
    expectedBinding: 'Strict binding object above',
    expectedRightsRevision: 'Literal 0',
    decision: 'APPROVED | REJECTED',
    note: 'Optional well-formed multiline string, at most 1000 UTF-16 units',
  },
  context: {
    binding: 'Current server-trusted strict binding',
    mediaStatus: 'Server-trusted current media state; new decision requires READY',
    actorUid: 'Authenticated current actor UID; resourceIdSchema',
    uploaderUid: 'Server-trusted uploader UID; resourceIdSchema',
    rightsEvidenceSubmittedBy: 'Server-trusted CMS evidence submitter UID; persisted authority, no fallback uploader',
    rights: '{status:PENDING|APPROVED|REJECTED, revision:0|1, proof:terminal proof|null}',
    operation: 'POST /api/cms/media/{exact immutable assetId}/rights-checks',
    requestId: 'Normalized operation key from validated M2 Idempotency-Key header; distinct from immutable asset/version ID',
    requestHash: 'SHA256 of existing canonicalJson(request), computed by server',
    replay: 'Trusted completed receipt record|null; exact identity below',
  },
  proof: {
    id: 'resourceIdSchema', verification: 'Literal MEDIA_RIGHTS_CHECK',
    binding: 'Strict exact binding', uploaderUid: 'resourceIdSchema',
    rightsEvidenceSubmittedBy: 'resourceIdSchema; persisted authority, no fallback uploader', checkedBy: 'resourceIdSchema',
    decision: 'APPROVED | REJECTED', checkedAt: 'Actual valid UTC ISO timestamp, exact 24-character serialization',
    rightsRevision: 'Literal 1', eventId: 'resourceIdSchema',
    note: 'Optional same exact request note',
    proofDigest: 'SHA256 canonicalJson(proof without proofDigest)',
  },
  receipt: {assetId: 'ASCII [A-Za-z0-9_-]{1,100}', rightsRevision: 'Literal 1', proofId: 'resourceIdSchema', proofDigest: 'hashSchema'},
  replay: {
    identity: '{actorUid, operation, assetId, requestId}',
    record: '{identity, requestHash, state:COMPLETED, statusCode:201, response:receipt, eventId, createdAt}',
    invariant: 'Validate identity, payload hash, proof, receipt, event/time and decision/note relations before returning original receipt',
  },
  decisionPlans: {
    create: '{action:CREATE_TERMINAL, decision:APPROVED|REJECTED, fromRevision:0, toRevision:1}',
    replay: '{action:REPLAY, receipt:validated original receipt}',
  },
  proposedErrors: {
    malformed: 'VALIDATION_ERROR / 422', oversized: 'PAYLOAD_TOO_LARGE / 413',
    self: 'SELF_REVIEW_FORBIDDEN / 403', staleBinding: 'REVISION_CONFLICT / 409',
    notReadyOrTerminal: 'REVIEW_STATE_CONFLICT / 409',
    changedReplayPayload: 'IDEMPOTENCY_PAYLOAD_MISMATCH / 422',
    corruptTrustedContextOrReplay: 'INTERNAL_ERROR / 500',
  },
};

const REQUEST_BYTES=65536,PROOF_BYTES=8192;
const assetIdSchema=z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);
const decisionSchema=z.enum(['APPROVED','REJECTED']);
const noteSchema=plainText(1000,{multiline:true}).refine(value=>!/[\uD800-\uDFFF]/u.test(value));
const timestampSchema=z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/).refine(value=>{
  const milliseconds=Date.parse(value);
  return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString()===value;
});
const requestSchema=strictSiteObject({expectedBinding:mediaBindingSchema,expectedRightsRevision:z.literal(0),decision:decisionSchema,note:noteSchema.optional()});
const authoritySchema=strictSiteObject({binding:mediaBindingSchema,actorUid:resourceIdSchema,uploaderUid:resourceIdSchema,rightsEvidenceSubmittedBy:resourceIdSchema});
const proofSchema=strictSiteObject({id:resourceIdSchema,verification:z.literal('MEDIA_RIGHTS_CHECK'),binding:mediaBindingSchema,
  uploaderUid:resourceIdSchema,rightsEvidenceSubmittedBy:resourceIdSchema,checkedBy:resourceIdSchema,
  decision:decisionSchema,checkedAt:timestampSchema,rightsRevision:z.literal(1),eventId:resourceIdSchema,note:noteSchema.optional(),proofDigest:hashSchema});
const receiptSchema=strictSiteObject({assetId:assetIdSchema,rightsRevision:z.literal(1),proofId:resourceIdSchema,proofDigest:hashSchema});
const identitySchema=strictSiteObject({actorUid:resourceIdSchema,operation:plainText(240),assetId:assetIdSchema,requestId:idempotencyKeySchema});
const completedSchema=strictSiteObject({identity:identitySchema,requestHash:hashSchema,state:z.literal('COMPLETED'),statusCode:z.literal(201),response:receiptSchema,eventId:resourceIdSchema,createdAt:timestampSchema});
const contextSchema=strictSiteObject({binding:mediaBindingSchema,mediaStatus:plainText(64),actorUid:resourceIdSchema,
  uploaderUid:resourceIdSchema,rightsEvidenceSubmittedBy:resourceIdSchema,
  rights:strictSiteObject({status:z.enum(['PENDING','APPROVED','REJECTED']),revision:z.union([z.literal(0),z.literal(1)]),proof:proofSchema.nullable()}),
  operation:plainText(240),requestId:idempotencyKeySchema,requestHash:hashSchema,replay:completedSchema.nullable()});

// This transport-shaped core has no array fields. Inspect descriptors before JSON/Zod
// reads: accessors, symbols, cycles and undefined must never normalize into an intent.
function assertJson(value,seen=new Set(),depth=0) {
  if(value===null || typeof value==='boolean' || (typeof value==='number' && Number.isFinite(value)))return;
  if(typeof value==='string' && !/[\uD800-\uDFFF]/u.test(value))return;
  if(typeof value!=='object' || depth>64 || seen.has(value) || Object.getPrototypeOf(value)!==Object.prototype || Object.getOwnPropertySymbols(value).length)throw new Error('Non-JSON value');
  seen.add(value);
  for(const [key,descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if(!descriptor.enumerable || !Object.hasOwn(descriptor,'value') || /[\uD800-\uDFFF]/u.test(key))throw new Error('Non-JSON property');
    assertJson(descriptor.value,seen,depth+1);
  }
  seen.delete(value);
}
function checked(schema,value,cap,code) {
  try {
    assertJson(value);
    if(new TextEncoder().encode(canonicalJson(value)).length>cap)throw new ApiError('PAYLOAD_TOO_LARGE');
    return schema.parse(value);
  } catch(error) {
    if(code==='INTERNAL_ERROR')throw new ApiError(code);
    if(error instanceof ApiError && error.code==='PAYLOAD_TOO_LARGE')throw error;
    throw new ApiError(code);
  }
}
function digest(hashCanonical,value) {
  try {
    if(typeof hashCanonical!=='function')throw new Error('Missing hash capability');
    return hashSchema.parse(hashCanonical(value));
  } catch {throw new ApiError('INTERNAL_ERROR');}
}
const same=(left,right)=>canonicalJson(left)===canonicalJson(right);
const authorityFrom=context=>({binding:context.binding,actorUid:context.actorUid,uploaderUid:context.uploaderUid,rightsEvidenceSubmittedBy:context.rightsEvidenceSubmittedBy});

export function parseMediaRightsRequest(input) {
  return checked(requestSchema,input,REQUEST_BYTES,'VALIDATION_ERROR');
}
/** Strict four-field trusted projection only; no evaluator-state recursion. */
export function validateMediaRightsProof(input,{context,hashCanonical}={}) {
  const authority=checked(authoritySchema,context,REQUEST_BYTES,'INTERNAL_ERROR');
  const proof=checked(proofSchema,input,PROOF_BYTES,'VALIDATION_ERROR');
  const {proofDigest,...unsigned}=proof;
  const actual=digest(hashCanonical,unsigned);
  if(actual!==proofDigest || !same(proof.binding,authority.binding) || proof.uploaderUid!==authority.uploaderUid ||
    proof.rightsEvidenceSubmittedBy!==authority.rightsEvidenceSubmittedBy || proof.checkedBy!==authority.actorUid ||
    proof.checkedBy===authority.uploaderUid || proof.checkedBy===authority.rightsEvidenceSubmittedBy)throw new ApiError('VALIDATION_ERROR');
  return proof;
}
function terminalProof(context,hashCanonical,checkerUid=context.actorUid) {
  try {
    if(context.rights.revision!==1 || context.rights.proof===null || context.rights.status==='PENDING')throw new Error('Terminal state');
    const proof=validateMediaRightsProof(context.rights.proof,{context:{...authorityFrom(context),actorUid:checkerUid},hashCanonical});
    if(proof.decision!==context.rights.status)throw new Error('Terminal decision');
    return proof;
  } catch {throw new ApiError('INTERNAL_ERROR');}
}
/** Pure plan only. Caller must authorize current membership/ACL before invocation. */
export function evaluateMediaRightsDecision({request:input,context:trusted,hashCanonical}={}) {
  const request=parseMediaRightsRequest(input);
  const context=checked(contextSchema,trusted,REQUEST_BYTES,'INTERNAL_ERROR');
  const requestHash=digest(hashCanonical,request);
  if(context.requestHash!==requestHash)throw new ApiError('INTERNAL_ERROR');
  if(context.actorUid===context.uploaderUid || context.actorUid===context.rightsEvidenceSubmittedBy)throw new ApiError('SELF_REVIEW_FORBIDDEN');
  if(!same(request.expectedBinding,context.binding))throw new ApiError('REVISION_CONFLICT');
  if(context.operation!==`POST /api/cms/media/${context.binding.assetId}/rights-checks`)throw new ApiError('INTERNAL_ERROR');
  if(context.replay!==null) {
    const completed=checked(completedSchema,context.replay,PROOF_BYTES,'INTERNAL_ERROR');
    const identity={actorUid:context.actorUid,operation:context.operation,assetId:context.binding.assetId,requestId:context.requestId};
    if(!same(completed.identity,identity))throw new ApiError('INTERNAL_ERROR');
    // Exact-key changed payload has its stable422 before proof–request semantics.
    if(completed.requestHash!==requestHash)throw new ApiError('IDEMPOTENCY_PAYLOAD_MISMATCH');
    const proof=terminalProof(context,hashCanonical),receipt=completed.response;
    if(proof.decision!==request.decision || proof.note!==request.note || receipt.assetId!==proof.binding.assetId ||
      receipt.rightsRevision!==proof.rightsRevision || receipt.proofId!==proof.id || receipt.proofDigest!==proof.proofDigest ||
      completed.eventId!==proof.eventId || completed.createdAt!==proof.checkedAt)throw new ApiError('INTERNAL_ERROR');
    return {action:'REPLAY',receipt};
  }
  if(context.rights.status!=='PENDING') {
    // A fresh non-self actor gets409 after validating the stored historical checker.
    // Replay above still requires proof.checkedBy === current authenticated actor.
    terminalProof(context,hashCanonical,context.rights.proof?.checkedBy);
    throw new ApiError('REVIEW_STATE_CONFLICT');
  }
  if(context.rights.revision!==0 || context.rights.proof!==null)throw new ApiError('INTERNAL_ERROR');
  if(context.mediaStatus!=='READY')throw new ApiError('REVIEW_STATE_CONFLICT');
  return {action:'CREATE_TERMINAL',decision:request.decision,fromRevision:0,toRevision:1};
}
