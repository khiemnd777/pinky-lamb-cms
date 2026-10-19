// Setup only. API: https://github.com/openpgpjs/openpgpjs#verify-detached-signatures
import {constants, lstatSync, realpathSync, openSync, fstatSync, readFileSync, closeSync, readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, resolve, relative, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';

const APP = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TOOL = resolve(APP, '.local/tools/m3/source-verifier');
const SCRATCH = resolve(APP, '.local/media-scratch/m3/source-verification');
const INVENTORY = resolve(APP, '.local/cache/m3/verifier-setup/installed-package-inventory.json');
export const TRUSTED_INVENTORY_SHA256 = 'd7bf54e896c7935fe176899bd68d592bc27bf689c824462e2077efe3209962e1';
export const EXPECTED_FINGERPRINT = 'FCF986EA15E6E293A5644F10B4322F04D67658D8';
export const LIMITS = Object.freeze({source: 32 * 1024 * 1024, auxiliary: 65536, timeout: 30000, logs: 65536, heapMiB: 256});
export const OFFICIAL_INPUTS = Object.freeze({
 source: resolve(APP, '.local/cache/m3/task01-downloads/ffmpeg-9.0.2.tar.xz'),
 signature: resolve(APP, '.local/cache/m3/task01-downloads/ffmpeg-9.0.2.tar.xz.asc'),
 key: resolve(APP, '.local/cache/m3/task01-downloads/ffmpeg-devel.asc')
});
const INPUT_PINS = {
 source: '8c3850283eb25fa026482078a04051e0be17347b09ef81a0849bec15a96e002e',
 signature: 'd617fd94ea354dadd2a8bb16243d37c44e1e9729b06b6ad58fe30bfb0fa943f2',
 key: '397b3becedcd5a98769967ff1ff8501ddc89f8368b8f766e4701377d7dbaabe5'
};
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = code => {throw Object.assign(new Error(code), {code});};
function inside(path, root) {const r = relative(root, path); return r === '' || (!r.startsWith('..') && !r.startsWith('/'));}
function ancestors(path) {
 let p = resolve(path);
 while (true) {
  const s = lstatSync(p); if (s.isSymbolicLink()) fail('SYMLINK_REFUSED');
  const parent = dirname(p); if (parent === p) break; p = parent;
 }
 if (realpathSync(path) !== resolve(path)) fail('REALPATH_REFUSED');
}
export function readBoundedInput(path, cap) {
 const p = resolve(path);
 if (!inside(p, resolve(APP, '.local/cache/m3/task01-downloads')) && !inside(p, SCRATCH) && p !== INVENTORY && !inside(p, TOOL)) fail('PATH_REFUSED');
 ancestors(p);
 const s = lstatSync(p); if (!s.isFile() || s.nlink !== 1) fail('REGULAR_FILE_REQUIRED');
 if (s.size > cap) fail('INPUT_TOO_LARGE');
 const fd = openSync(p, constants.O_RDONLY | constants.O_NOFOLLOW);
 try {
  const actual = fstatSync(fd);
  if (!actual.isFile() || actual.nlink !== 1 || actual.dev !== s.dev || actual.ino !== s.ino || actual.size !== s.size) fail('INPUT_CHANGED');
  const bytes = readFileSync(fd); if (bytes.length > cap || bytes.length !== s.size) fail('INPUT_CHANGED'); return bytes;
 } finally {closeSync(fd);}
}
export function verifyInstalledInventory(verifierRoot = TOOL) {
 const root = resolve(verifierRoot);
 if (root !== TOOL && !inside(root, SCRATCH)) fail('VERIFIER_PATH_REFUSED');
 ancestors(root);
 for (const [name, expected] of [['package.json', '0b0a1a92c25f2608a26e278cbcb6de004d0fb3b71e206e39b9d1d66a7990a7fa'], ['package-lock.json', '208735b7ea6875b47ef8282ba342b1a947433be7168a6e0573a7515508213c52']]) {
  const path = join(root, name); ancestors(path); const s = lstatSync(path);
  if (!s.isFile() || s.nlink !== 1 || s.size > 65536 || sha(readFileSync(path)) !== expected) fail('VERIFIER_MANIFEST_CHANGED');
 }
 ancestors(join(root, 'node_modules'));
 const bytes = readBoundedInput(INVENTORY, 65536);
 if (sha(bytes) !== TRUSTED_INVENTORY_SHA256) fail('TRUSTED_INVENTORY_CHANGED');
 const inventory = JSON.parse(bytes.toString('utf8'));
 const actualFiles = [], actualDirectories = [];
 function visit(dir) {
  for (const name of readdirSync(dir).sort()) {
   const path = join(dir, name), s = lstatSync(path), rel = relative(root, path);
   if (s.isSymbolicLink()) fail('VERIFIER_LINK_REFUSED');
   if (s.isDirectory()) {actualDirectories.push(rel); visit(path);}
   else if (s.isFile() && s.nlink === 1) actualFiles.push(rel);
   else fail('VERIFIER_SPECIAL_FILE_REFUSED');
  }
 }
 visit(join(root, 'node_modules'));
 const expectedFiles = inventory.files.map(x => x.path).sort();
 if (JSON.stringify(actualFiles.sort()) !== JSON.stringify(expectedFiles) || JSON.stringify(actualDirectories.sort()) !== JSON.stringify(inventory.directories)) fail('VERIFIER_TREE_CHANGED');
 for (const item of inventory.files) {
  const path = join(root, item.path); ancestors(path);
  const s = lstatSync(path); if (!s.isFile() || s.nlink !== 1 || s.size !== item.bytes || sha(readFileSync(path)) !== item.sha256) fail('VERIFIER_BYTES_CHANGED');
 }
 return {root, inventorySha256: TRUSTED_INVENTORY_SHA256, files: inventory.files.length};
}
export async function loadTrustedVerifier(verifierRoot = TOOL) {
 const checked = verifyInstalledInventory(verifierRoot);
 // This exact prior-stage inventory is checked on every call, including cached imports.
 return import(pathToFileURL(join(checked.root, 'node_modules/openpgp/dist/node/openpgp.mjs')).href);
}
export async function verifyDetachedBytes({sourceBytes, signatureBytes, keyBytes, expectedFingerprint = EXPECTED_FINGERPRINT, verifierRoot = TOOL}) {
 for (const [bytes, cap] of [[sourceBytes, LIMITS.source], [signatureBytes, LIMITS.auxiliary], [keyBytes, LIMITS.auxiliary]]) {
  if (!(bytes instanceof Uint8Array) || bytes.length === 0 || bytes.length > cap) fail('INVALID_BOUNDED_BYTES');
 }
 const openpgp = await loadTrustedVerifier(verifierRoot);
 const decode = bytes => new TextDecoder('utf-8', {fatal: true}).decode(bytes);
 const key = await openpgp.readKey({armoredKey: decode(keyBytes)});
 const fingerprint = key.getFingerprint().toUpperCase();
 if (fingerprint !== EXPECTED_FINGERPRINT || fingerprint !== expectedFingerprint) fail('FINGERPRINT_MISMATCH');
 const signature = await openpgp.readSignature({armoredSignature: decode(signatureBytes)});
 const message = await openpgp.createMessage({binary: sourceBytes});
 // No config/date overrides: library default cryptographic policy remains authoritative.
 const result = await openpgp.verify({message, signature, verificationKeys: key, format: 'binary'});
 // Consume all promises even if an unexpected extra signature is present.
 const signatures = await Promise.allSettled(result.signatures.map(x => x.verified));
 if (signatures.length !== 1 || signatures.some(x => x.status !== 'fulfilled' || x.value !== true)) fail('DETACHED_SIGNATURE_INVALID');
 const signerKeyId = result.signatures[0].keyID.toHex();
 if (!key.getKeyIDs().some(id => id.toHex() === signerKeyId)) fail('SIGNER_NOT_IN_PINNED_KEY');
 return {verified: true, fingerprint, signerKeyId, signatureCount: 1, sourceSha256: sha(sourceBytes), signatureSha256: sha(signatureBytes), keySha256: sha(keyBytes), verifierInventorySha256: TRUSTED_INVENTORY_SHA256};
}
export async function verifyOfficialFFmpegSource() {
 const bytes = {};
 for (const name of ['source', 'signature', 'key']) {
  bytes[name] = readBoundedInput(OFFICIAL_INPUTS[name], name === 'source' ? LIMITS.source : LIMITS.auxiliary);
  if (sha(bytes[name]) !== INPUT_PINS[name]) fail('OFFICIAL_INPUT_PIN_MISMATCH');
 }
 return verifyDetachedBytes({sourceBytes: bytes.source, signatureBytes: bytes.signature, keyBytes: bytes.key});
}
function boundedChild() {
 return new Promise((accept, reject) => {
  const child = spawn(process.execPath, ['--max-old-space-size=256', fileURLToPath(import.meta.url), '--internal-fixed-verification'], {cwd: APP, env: {PATH: `${dirname(process.execPath)}:/usr/bin:/bin`}, stdio: ['ignore', 'pipe', 'pipe', 'ipc']});
  const chunks = {stdout: [], stderr: []}, sizes = {stdout: 0, stderr: 0}; let refusal;
  const stop = code => {refusal = code; child.kill('SIGTERM');};
  const timer = setTimeout(() => stop('VERIFICATION_TIMEOUT'), LIMITS.timeout);
  for (const name of ['stdout', 'stderr']) child[name].on('data', chunk => {
   sizes[name] += chunk.length;
   if (sizes[name] > LIMITS.logs) stop('VERIFICATION_LOG_LIMIT'); else chunks[name].push(chunk);
  });
  child.on('error', error => {clearTimeout(timer); reject(error);});
  child.on('close', code => {
   clearTimeout(timer);
   if (refusal || code !== 0) return reject(Object.assign(new Error(refusal || 'VERIFICATION_CHILD_FAILED'), {code: refusal || 'VERIFICATION_CHILD_FAILED', childError: Buffer.concat(chunks.stderr).toString('utf8')}));
   try {accept(JSON.parse(Buffer.concat(chunks.stdout).toString('utf8')));} catch {reject(new Error('VERIFICATION_OUTPUT_INVALID'));}
  });
 });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
 try {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== '--internal-fixed-verification')) fail('UNKNOWN_ARGUMENT');
  if (args.length === 1 && (typeof process.send !== 'function' || !process.connected || !process.execArgv.includes('--max-old-space-size=256'))) fail('INTERNAL_WORKER_REQUIRED');
  const result = args.length === 1 ? await verifyOfficialFFmpegSource() : await boundedChild();
  process.stdout.write(`${JSON.stringify(result)}\n`);
 } catch (error) {process.stderr.write(`${error.code || 'VERIFICATION_FAILED'}${error.childError ? `: ${error.childError.trim()}` : ''}\n`); process.exitCode = 1;}
}
