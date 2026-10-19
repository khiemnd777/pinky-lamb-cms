// PREPARED ONLY: run after the Coordinator admits the bounded pure runner and releases source A.
// Imports stay builtin-only through the helper/runtime graph. No eager Sharp/pdf-lib, fixtures or native calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import * as audit from '../scripts/media-tool-audit.mjs';
import {startPdfRuntime} from '../cms-api/media-pdf-runtime.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const absent=resolve(ROOT,'.local/media-scratch/m3/tool-recovery-01/prepared-absent');
const input=resolve(absent,'input.bin');
const mapping=Object.freeze({IMAGE:'IMAGE',PDF:'PDF',POSTER:'VIDEO',PROBE:'VIDEO',TRANSCODE:'VIDEO',DECODE:'VIDEO',EXTRACT_POSTER:'VIDEO',FIXTURE_VIDEO:'VIDEO',FIXTURE_VIDEO_NO_AUDIO:'VIDEO'});
const hash=b=>createHash('sha256').update(b).digest('hex');
async function helperSource(){return readFile(new URL('../scripts/media-tool-audit.mjs',import.meta.url),'utf8');}
function section(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert(a>=0,start);assert(b>a,end);return source.slice(a,b);}
function before(source,first,last){const a=source.indexOf(first),b=source.indexOf(last);assert(a>=0,first);assert(b>=0,last);assert(a<b,`${first} precedes ${last}`);}

test('scope: exact nine public recipe operations use fixed source mapping',()=>{
  assert.equal(typeof audit.verificationScopeForOperation,'function');
  assert.equal(Object.keys(mapping).length,9);
  for(const [operation,scope] of Object.entries(mapping)) assert.equal(audit.verificationScopeForOperation(operation),scope,operation);
});
test('scope: unknown, inherited object keys and internal entry names are not public recipes',()=>{
  for(const operation of ['constructor','toString','__proto__','ALL','VIDEO','auditExternalReferences','pdfRasterWorker','runPdfResourceProbe','runResourceProbe','--image-worker','',null,undefined,{},new String('IMAGE')]) {
    assert.throws(()=>audit.verificationScopeForOperation(operation),{code:'UNKNOWN_OPERATION'});
  }
});
test('scope: verifier rejects invalid enum before filesystem or tool-byte checks',async()=>{
  for(const scope of ['',null,{},[],1,'constructor','toString','__proto__','image','UNKNOWN']) {
    await assert.rejects(audit.verifyMediaTools(scope),e=>{assert.match(e.code??'',/SCOPE/);assert.notEqual(e.code,'TOOL_BYTES');assert.notEqual(e.code,'ENOENT');return true;});
  }
});
test('scope: unknown job is refused before verifier or nonexistent input access',async()=>{
  for(const operation of ['constructor','toString','__proto__','VIDEO','auditExternalReferences','pdfRasterWorker','runResourceProbe','unsupported']) {
    await assert.rejects(audit.runMediaJob({operation,directory:absent,input}),{code:'UNKNOWN_OPERATION'});
  }
});
test('scope: every recipe refuses caller scope, argv, caps and unknown options before filesystem',async()=>{
  for(const operation of Object.keys(mapping)) for(const options of [{verificationScope:'IMAGE'},{argv:['--version']},{caps:{}},{unexpected:true}]) {
    await assert.rejects(audit.runMediaJob({operation,directory:absent,input,...options}),{code:operation==='PDF'?'PDF_CALLER_OPTIONS':'MEDIA_CALLER_OPTIONS'});
  }
});
test('scope: inherited and symbol job options cannot bypass the closed request contract',async()=>{
  for(const operation of ['IMAGE','PDF']) {
    const inherited=Object.assign(Object.create({verificationScope:'IMAGE'}),{operation,directory:absent,input});
    const symbolic={operation,directory:absent,input,[Symbol('argv')]:[]};
    for(const request of [inherited,symbolic]) await assert.rejects(audit.runMediaJob(request),{code:operation==='PDF'?'PDF_CALLER_OPTIONS':'MEDIA_CALLER_OPTIONS'});
  }
});
test('scope: valid plain and null-prototype PDF requests pass request guards and reach pin refusal',async()=>{
  const plain={operation:'PDF',directory:absent,input},nullPrototype=Object.assign(Object.create(null),plain);
  for(const request of [plain,nullPrototype]) await assert.rejects(audit.runMediaJob(request),{code:'TOOL_BYTES'});
  // Both paths must reach the known PDF pin gate, never reject all requests as CALLER_OPTIONS.
});
test('scope: default ALL, explicit ALL and PDF retain current immutable drift refusal',async()=>{
  for(const scope of [undefined,'ALL','PDF']) await assert.rejects(audit.verifyMediaTools(scope),{code:'TOOL_BYTES'});
});
test('scope: IMAGE and VIDEO expose only verified kind capabilities after complete common pins',async()=>{
  const image=await audit.verifyMediaTools('IMAGE');
  assert.equal(image.node,'22.23.3');assert.equal(image.lockSha256,'2c049b8684ba07916855f009b1a52af77650a118e96090fadc45453f4eb18081');
  assert.equal(image.ffmpeg,undefined);assert.equal(image.ffprobe,undefined);assert.equal(image.poppler,undefined);
  const video=await audit.verifyMediaTools('VIDEO');
  assert.equal(video.node,'22.23.3');assert.equal(video.poppler,undefined);
  assert.equal(typeof video.ffmpeg,'string');assert.equal(typeof video.ffprobe,'string');
  // This is read-only verification of pinned bytes, not decoder or loader execution evidence.
});
test('scope: standalone PDF runtime refuses drift before touching an absent attempt or spawning',async()=>{
  await assert.rejects(startPdfRuntime({attemptDirectory:absent,deadline:Date.now()+120000}),{code:'TOOL_BYTES'});
});
test('scope: common pin checks remain before per-kind FFmpeg and Poppler branches',async()=>{
  const source=await helperSource(),verifier=section(source,'export async function verifyMediaTools(','// These receipts are anchored');
  for(const needle of ['NODE_IDENTITY','NODE_PIN','LOCK_SHA','PACKAGE_INVENTORY_SHA','AUX_INVENTORY_SHA','await exactPackageTree(']) assert(verifier.includes(needle),needle);
  before(verifier,'await exactPackageTree(','lock.ffmpeg');before(verifier,'await exactPackageTree(','await verifyPdfTools(');
  assert.match(verifier,/scope\s*=\s*['"]ALL['"]/);
});
test('scope: complete frozen Poppler verifier closure remains byte-identical',async()=>{
  const source=await helperSource(),body=section(source,'async function verifyPdfTools(','export async function createAuditScratch(');
  assert.equal(hash(Buffer.from(body)),'15c957dc594da3762fab69925210545a75edebf1291fbbd680d80fe7a2593c8b');
});
test('scope: private audit/resource/raster entries use their own fixed literal scope',async()=>{
  const source=await helperSource();
  for(const [start,end,scope] of [
    ['export async function auditExternalReferences(','const inputOptions=','VIDEO'],
    ['export async function runPdfResourceProbe(','// PDF-lib only constructs','PDF'],
    ['async function pdfRasterWorker(','// Audit-only fixed resource probes','PDF'],
    ['export async function runResourceProbe(','async function imageWorker(','ALL']
  ]) {
    const body=section(source,start,end);assert.match(body,new RegExp(`verifyMediaTools\\(['"]${scope}['"]\\)`));
  }
  const job=section(source,'export async function runMediaJob(','function pdfDiagnostics(');
  before(job,'verificationScopeForOperation(','await verifyMediaTools(');
  before(job,'CALLER_OPTIONS','await verifyMediaTools(');
  // FFmpeg paths must be resolved only within the VIDEO branch, after IMAGE/PDF dispatch.
  before(job,"operation==='PDF'",'resolve(ROOT,tools.ffmpeg)');
  before(job,"operation==='IMAGE'",'resolve(ROOT,tools.ffmpeg)');
});
test('scope: every standalone PDF pin call is fixed PDF and precedes spawn/load',async()=>{
  const main=await readFile(new URL('../cms-api/media-pdf.mjs',import.meta.url),'utf8'),runtime=await readFile(new URL('../cms-api/media-pdf-runtime.mjs',import.meta.url),'utf8');
  for(const source of [main,runtime]) {
    const calls=[...source.matchAll(/\bverifyMediaTools\(([^)]*)\)/g)];assert(calls.length>=2);
    for(const call of calls) assert.match(call[1],/^['"]PDF['"]$/);
  }
  const entry=section(runtime,'export async function startPdfRuntime(','async function pdfWorker(');
  before(entry,"await verifyMediaTools('PDF')",'await supervised(NODE');
  before(entry,"await verifyMediaTools('PDF')",'await checkPdfDirectory(');
  const worker=runtime.slice(runtime.indexOf('async function pdfWorker('));
  before(worker,"await verifyMediaTools('PDF')","await native('info'");
  before(worker,"await verifyMediaTools('PDF')","await import('sharp')");
});
test('scope: helper CLI keeps closed modes/arity and fixed IMAGE-POSTER/PDF/ALL gates',async()=>{
  const source=await helperSource(),cli=source.slice(source.indexOf('if(process.argv[1]===SELF)'));
  assert(cli.startsWith('if(process.argv[1]===SELF)'));assert(cli.includes('CLI_ARGUMENTS'));assert(cli.includes('INTERNAL_WORKER_ONLY'));
  for(const mode of ['--pdf-raster-worker','--image-worker','--resource-worker']) assert(cli.includes(mode),mode);
  assert.match(cli,/(?:\.length|argc|arity)/);
  assert.match(cli,/(?:\['IMAGE','POSTER'\]|operation==='IMAGE'\s*\|\|\s*operation==='POSTER')/);
  assert.match(cli,/verifyMediaTools\(['"]ALL['"]\)/);
  const resource=cli.slice(cli.indexOf("mode==='--resource-worker'"));
  before(resource,"verifyMediaTools('ALL')","if(value==='logs')");
});
