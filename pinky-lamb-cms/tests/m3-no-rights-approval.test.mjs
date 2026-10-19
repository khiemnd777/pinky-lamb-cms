import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseMediaMetadataV2, metadataDigestProjectionV2, hashMediaMetadataV2, uploadActorsV2Schema } from '../contracts/media-v3-metadata-v2.mjs';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/m3-no-rights-approval.json', import.meta.url), 'utf8'));
// Independent one-key literal convention, not a product encoder or producer fixture.
const canonicalName = (value) => `{"name":${JSON.stringify(value.name)}}`;
const sha = (text) => createHash('sha256').update(text, 'utf8').digest('hex');
const hashCanonical = (value) => sha(canonicalName(value));
const validation = (fn) => assert.throws(fn, (error) => error.code === 'VALIDATION_ERROR');

test('no-rights name flows through parse/projection/MD with exact independent bytes', () => {
  for (const vector of fixture.vectors) {
    const parsed = parseMediaMetadataV2({ name: vector.name });
    assert.deepEqual(parsed, { name: vector.name });
    assert.deepEqual(metadataDigestProjectionV2(parsed), parsed);
    assert.equal(canonicalName(parsed), vector.canonicalJson);
    assert.equal(Buffer.byteLength(vector.canonicalJson, 'utf8'), vector.utf8Bytes);
    assert.equal(sha(vector.canonicalJson), vector.sha256);
    assert.deepEqual(hashMediaMetadataV2(parsed, { hashCanonical }), { metadataDigest: vector.sha256 });
  }
  assert.equal(parseMediaMetadataV2({ name: '😀'.repeat(120) }).name.length, 240);
  validation(() => parseMediaMetadataV2({ name: '😀'.repeat(120) + 'a' }));
});

test('syntactic uploader remains separate from name MD; exact name changes MD', () => {
  const outputs = ['qa-uploader-a', 'qa-uploader-b'].map((uploaderUid) => {
    assert.deepEqual(uploadActorsV2Schema.parse({ uploaderUid }), { uploaderUid });
    return hashMediaMetadataV2({ name: fixture.vectors[0].name }, { hashCanonical });
  });
  assert.deepEqual(outputs[0], outputs[1]);
  assert.equal(outputs[0].metadataDigest, fixture.vectors[0].sha256);
  const composed = fixture.vectors.find((vector) => vector.name === 'é');
  const decomposed = fixture.vectors.find((vector) => vector.name === 'e\u0301');
  assert.notEqual(hashMediaMetadataV2({ name: composed.name }, { hashCanonical }).metadataDigest,
    hashMediaMetadataV2({ name: decomposed.name }, { hashCanonical }).metadataDigest);
  assert.equal(uploadActorsV2Schema.safeParse({ uploaderUid: 'qa-uploader', rightsEvidenceSubmittedBy: 'old' }).success, false);
  // Syntactic parsing does not prove the server supplied this UID or current Auth/ACL.
});

test('legacy rights-gate fields and unsafe/invalid metadata fail before hash callback', () => {
  let hashCalls = 0;
  let getterCalls = 0;
  const capability = { hashCanonical(value) { hashCalls += 1; return hashCanonical(value); } };
  for (const field of fixture.removedFields) {
    validation(() => hashMediaMetadataV2({ name: 'QA asset', [field]: null }, capability));
  }
  for (const name of fixture.invalidNames) validation(() => hashMediaMetadataV2({ name }, capability));
  const accessor = {};
  Object.defineProperty(accessor, 'name', { enumerable: true, get() { getterCalls += 1; return 'QA asset'; } });
  validation(() => hashMediaMetadataV2(accessor, capability));
  validation(() => hashMediaMetadataV2({ name: 'QA asset', actors: { uploaderUid: 'qa-uploader' } }, capability));
  assert.equal(hashCalls, 0);
  assert.equal(getterCalls, 0);
  const options = {};
  Object.defineProperty(options, 'hashCanonical', { enumerable: true, get() { getterCalls += 1; return hashCanonical; } });
  assert.throws(() => hashMediaMetadataV2({ name: 'QA asset' }, options), (error) => error.code === 'INTERNAL_ERROR');
  assert.equal(getterCalls, 0);
});
