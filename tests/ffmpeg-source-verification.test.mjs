import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, mkdirSync, writeFileSync, cpSync, symlinkSync, openSync, ftruncateSync, closeSync, existsSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {verifyOfficialFFmpegSource, verifyDetachedBytes, readBoundedInput, verifyInstalledInventory, loadTrustedVerifier, OFFICIAL_INPUTS, LIMITS, EXPECTED_FINGERPRINT} from '../scripts/verify-ffmpeg-source.mjs';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scratch = resolve(app, '.local/media-scratch/m3/source-verification', `test-${process.pid}`);
const tool = resolve(app, '.local/tools/m3/source-verifier');
let inputs;
before(() => {
 mkdirSync(scratch, {recursive: true, mode: 0o700});
 inputs = {sourceBytes: readFileSync(OFFICIAL_INPUTS.source), signatureBytes: readFileSync(OFFICIAL_INPUTS.signature), keyBytes: readFileSync(OFFICIAL_INPUTS.key)};
});

test('official exact detached signature passes default policy and expected primary fingerprint', async () => {
 const result = await verifyOfficialFFmpegSource();
 assert.equal(result.verified, true); assert.equal(result.fingerprint, EXPECTED_FINGERPRINT); assert.equal(result.signatureCount, 1);
 assert.equal(result.sourceSha256, '8c3850283eb25fa026482078a04051e0be17347b09ef81a0849bec15a96e002e');
});
test('altered binary source fails actual detached crypto with original signature and public key', async () => {
 const sourceBytes = Buffer.from(inputs.sourceBytes); sourceBytes[sourceBytes.length - 1] ^= 1;
 await assert.rejects(verifyDetachedBytes({...inputs, sourceBytes}), {code: 'DETACHED_SIGNATURE_INVALID'});
});
test('altered and truncated signatures reject; no extraction or permissive policy', async () => {
 const signatureBytes = Buffer.from(inputs.signatureBytes); const offset = signatureBytes.indexOf('\n\n') + 2; signatureBytes[offset + 50] = signatureBytes[offset + 50] === 65 ? 66 : 65;
 await assert.rejects(verifyDetachedBytes({...inputs, signatureBytes}));
 await assert.rejects(verifyDetachedBytes({...inputs, signatureBytes: inputs.signatureBytes.subarray(0, 80)}));
});
test('wrong key data and wrong expected primary fingerprint reject', async () => {
 await assert.rejects(verifyDetachedBytes({...inputs, keyBytes: inputs.signatureBytes}));
 const openpgp = await loadTrustedVerifier();
 const wrong = await openpgp.generateKey({type: 'ecc', curve: 'nistP256', userIDs: [{name: 'Owned negative public key fixture'}], format: 'armored'});
 await assert.rejects(verifyDetachedBytes({...inputs, keyBytes: Buffer.from(wrong.publicKey)}), {code: 'FINGERPRINT_MISMATCH'}); // Ephemeral key; no keyring/private key persisted.
 await assert.rejects(verifyDetachedBytes({...inputs, expectedFingerprint: '0000000000000000000000000000000000000000'}), {code: 'FINGERPRINT_MISMATCH'});
});
test('missing file, directory, outside path and oversized source/key/signature refuse before read/import', () => {
 assert.throws(() => readBoundedInput(resolve(scratch, 'missing'), LIMITS.source), {code: 'ENOENT'});
 assert.throws(() => readBoundedInput(scratch, LIMITS.source), {code: 'REGULAR_FILE_REQUIRED'});
 assert.throws(() => readBoundedInput('/etc/passwd', LIMITS.auxiliary), {code: 'PATH_REFUSED'});
 for (const [name, cap] of [['source', LIMITS.source], ['key', LIMITS.auxiliary], ['signature', LIMITS.auxiliary]]) {
  const p = resolve(scratch, `oversized-${name}`); const fd = openSync(p, 'wx', 0o600); ftruncateSync(fd, cap + 1); closeSync(fd);
  assert.throws(() => readBoundedInput(p, cap), {code: 'INPUT_TOO_LARGE'});
 }
});
test('symlink and dangling paths refuse, including an ancestor link', () => {
 const file = resolve(scratch, 'source-copy'); writeFileSync(file, inputs.sourceBytes, {mode: 0o600, flag: 'wx'});
 const link = resolve(scratch, 'source-link'); symlinkSync(file, link);
 assert.throws(() => readBoundedInput(link, LIMITS.source), {code: 'SYMLINK_REFUSED'});
 const dangling = resolve(scratch, 'dangling'); symlinkSync(resolve(scratch, 'absent'), dangling);
 assert.throws(() => readBoundedInput(dangling, LIMITS.source), {code: 'SYMLINK_REFUSED'});
 const parentLink = resolve(scratch, 'parent-link'); symlinkSync(scratch, parentLink);
 assert.throws(() => readBoundedInput(resolve(parentLink, 'source-copy'), LIMITS.source), {code: 'SYMLINK_REFUSED'});
});
test('tampered verifier copy with executable sentinel refuses before dynamic import; originals untouched', async () => {
 const copy = resolve(scratch, 'tampered-verifier'); cpSync(tool, copy, {recursive: true, dereference: false});
 const entry = resolve(copy, 'node_modules/openpgp/dist/node/openpgp.mjs');
 writeFileSync(entry, `${readFileSync(entry, 'utf8')}\nglobalThis.__m3UntrustedVerifierExecuted = true;\n`);
 assert.equal(globalThis.__m3UntrustedVerifierExecuted, undefined);
 await assert.rejects(verifyDetachedBytes({...inputs, verifierRoot: copy}), {code: 'VERIFIER_BYTES_CHANGED'});
 assert.equal(globalThis.__m3UntrustedVerifierExecuted, undefined);
 assert.equal(verifyInstalledInventory().files, 44);
 const extra = resolve(scratch, 'extra-verifier'); cpSync(tool, extra, {recursive: true, dereference: false}); writeFileSync(resolve(extra, 'node_modules/extra.mjs'), 'throw new Error("not executed");\n');
 assert.throws(() => verifyInstalledInventory(extra), {code: 'VERIFIER_TREE_CHANGED'});
});
test('standalone CLI has bounded fixed child, refuses args/direct internal bypass and verifies official inputs', () => {
 const script = resolve(app, 'scripts/verify-ffmpeg-source.mjs'); const env = {PATH: `${dirname(process.execPath)}:/usr/bin:/bin`};
 const valid = spawnSync(process.execPath, [script], {env, timeout: LIMITS.timeout + 2000, maxBuffer: LIMITS.logs});
 assert.equal(valid.status, 0, valid.stderr.toString()); assert.equal(JSON.parse(valid.stdout).verified, true);
 for (const arg of ['--source=/tmp/arbitrary', '--internal-fixed-verification']) {
  const result = spawnSync(process.execPath, [script, arg], {env, timeout: 2000, maxBuffer: LIMITS.logs}); assert.equal(result.status, 1);
 }
 assert.equal(existsSync(resolve(scratch, 'ffmpeg-built')), false);
});

test('two genuine detached signature packets reject exact-one policy after consuming both verification promises', async () => {
 const openpgp = await loadTrustedVerifier();
 const signature = await openpgp.readSignature({armoredSignature: inputs.signatureBytes.toString('utf8')});
 signature.packets.push(signature.packets[0]);
 await assert.rejects(verifyDetachedBytes({...inputs, signatureBytes: Buffer.from(signature.armor())}), {code: 'DETACHED_SIGNATURE_INVALID'});
});
