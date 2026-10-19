import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePdfRequest, parsePdfInfo, PDF_LIMITS,processPdf,pdfSha,checkPdfDirectory,writePdfAttemptRecord} from '../cms-api/media-pdf.mjs';
import {readFile,lstat,writeFile,symlink,link,chmod,readdir,rename,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {PDFDocument,PDFName} from 'pdf-lib';
import sharp from 'sharp';
import {pdfTestRun,makePdfFixture,writePdfFixture,encryptedPdfFixture} from './fixtures/media-pdf.mjs';
import {startPdfRuntime} from '../cms-api/media-pdf-runtime.mjs';

test('request is a closed contract; hash, local paths and cancellation are explicit', () => {
  for (const request of [{}, {input:'https://example.invalid/a.pdf'}, {input:'/tmp/a.pdf',expectedSha256:'x',attemptDirectory:'/tmp/job'}]) {
    assert.throws(() => validatePdfRequest(request), {code:'PDF_REQUEST'});
  }
});
test('direct runtime entry refuses current immutable drift before spawn or directory mutation',async()=>{
  const run=await pdfTestRun();
  const before=await readdir(run.inputDirectory),stat=await lstat(run.inputDirectory);
  await assert.rejects(startPdfRuntime({attemptDirectory:run.inputDirectory,deadline:Date.now()+PDF_LIMITS.timeoutMs}),{code:'TOOL_BYTES'});
  assert.deepEqual(await readdir(run.inputDirectory),before);
  const after=await lstat(run.inputDirectory);assert.equal(after.ino,stat.ino);assert.equal(after.mtimeMs,stat.mtimeMs);
});
test('runtime and CLI worker source gates precede spawn, native dispatch and sharp load',async()=>{
  const source=await readFile(new URL('../cms-api/media-pdf-runtime.mjs',import.meta.url),'utf8');
  const entry=source.slice(source.indexOf('export async function startPdfRuntime'),source.indexOf('async function pdfWorker'));
  const entryGate=entry.indexOf("await verifyMediaTools('PDF')"),spawn=entry.indexOf('await supervised(NODE');
  assert(entryGate>=0);assert(spawn>=0);assert(entryGate<spawn);
  const worker=source.slice(source.indexOf('async function pdfWorker'));
  const workerGate=worker.indexOf("await verifyMediaTools('PDF')"),native=worker.indexOf("await native('info'"),sharpLoad=worker.indexOf("await import('sharp')");
  assert(workerGate>=0);assert(native>=0);assert(sharpLoad>=0);
  assert(workerGate<native);assert(workerGate<sharpLoad);
});
test('finalization refuses replaced or symlink attempt and writes no records to rejected target',async()=>{
  for(const kind of ['replacement','symlink']) {
    const run=await pdfTestRun(),custody=await lstat(run.inputDirectory),retained=run.inputDirectory+'-retained';
    await rename(run.inputDirectory,retained);
    if(kind==='replacement') await mkdir(run.inputDirectory,{mode:0o700});
    else await symlink(retained,run.inputDirectory);
    const record={attemptDirectory:run.inputDirectory,custody,name:'receipt.json',value:{status:'FAILED'}};
    await assert.rejects(writePdfAttemptRecord(record),{code:kind==='replacement'?'PDF_ATTEMPT_CHANGED':'PDF_PATH'});
    await assert.rejects(writePdfAttemptRecord({...record,name:'manifest.json'}));
    assert.deepEqual(await readdir(retained),[]);
    if(kind==='replacement') assert.deepEqual(await readdir(run.inputDirectory),[]);
  }
});
test('native 48 pages stream with complete independent output page and pixel verification',async()=>{
  const run=await pdfTestRun(),request=await makePdfFixture(run,{pages:48});const result=await processPdf(request);
  assert.equal(result.pageCount,48);assert.equal(result.pages.length,48);
  const native=JSON.parse(await readFile(resolve(run.attemptDirectory,'native-observations.json')));
  assert(native.observations.every(o=>o.close&&o.reaped&&o.exit===0));
  assert(result.runtime.peakRssBytes<PDF_LIMITS.rssBytes);
  assert(result.runtime.peakScratchBytes<PDF_LIMITS.scratchBytes);
  assert.equal(pdfSha(await readFile(request.input)),request.expectedSha256);
  await writeFile(resolve(run.evidence,'result.json'),JSON.stringify(result,null,2),{flag:'wx',mode:0o600});console.log('PDF_48_EVIDENCE',run.evidence);
});
test('hash/path/links/input-size/pre-cancel refuse before native writes',async()=>{
  const run=await pdfTestRun(),request=await makePdfFixture(run);
  await assert.rejects(processPdf({...request,expectedSha256:'0'.repeat(64)}),{code:'PDF_INPUT_HASH'});
  await assert.rejects(lstat(request.attemptDirectory),{code:'ENOENT'});
  const alias=resolve(run.inputDirectory,'alias.pdf');await symlink(request.input,alias);
  await assert.rejects(processPdf({...request,input:alias}),{code:'PATH_LINK'});
  const hard=resolve(run.inputDirectory,'hard.pdf');await link(request.input,hard);
  await assert.rejects(processPdf({...request,input:hard}),{code:'NOT_SINGLE_REGULAR_FILE'});
  const controller=new AbortController();controller.abort();await assert.rejects(processPdf({...request,signal:controller.signal}),{code:'PDF_CANCELLED'});
  const large=await pdfTestRun(),bytes=Buffer.alloc(PDF_LIMITS.inputBytes+1);bytes.write('%PDF-1.7');
  await assert.rejects(processPdf(await writePdfFixture(large,bytes)),{code:'INPUT_SIZE'});
});
test('private directory and original mode checks refuse writeable foreign surfaces',async()=>{
  const run=await pdfTestRun(),request=await makePdfFixture(run);
  await chmod(run.inputDirectory,0o707);
  await assert.rejects(checkPdfDirectory(run.inputDirectory),{code:'PDF_PRIVATE_DIRECTORY'});
  await chmod(run.inputDirectory,0o700);
  await chmod(request.input,0o666);
  await assert.rejects(processPdf(request),{code:'PDF_PRIVATE_INPUT'});
  await assert.rejects(lstat(request.attemptDirectory),{code:'ENOENT'});
});
test('native encrypted R6, malformed, and 49 pages retain originals without successful manifest',async()=>{
  for(const kind of ['encrypted','malformed','49pages']) {
    const run=await pdfTestRun(),request=kind==='49pages'?await makePdfFixture(run,{pages:49}):await writePdfFixture(run,kind==='encrypted'?encryptedPdfFixture():Buffer.from('%PDF-1.7\nmalformed'));
    await assert.rejects(processPdf(request),e=>{assert.equal(e.code,kind==='encrypted'?'PDF_ENCRYPTED':kind==='49pages'?'PDF_PAGES':'PDF_NATIVE_FAILED');return true;});
    assert.equal(pdfSha(await readFile(request.input)),request.expectedSha256);
    await assert.rejects(lstat(resolve(run.attemptDirectory,'manifest.json')),{code:'ENOENT'});
    const receipt=JSON.parse(await readFile(resolve(run.attemptDirectory,'receipt.json')));assert.equal(receipt.status,'FAILED');
  }
});
test('native one-page source with actions, form, attachment becomes verified raster-only outputs', async()=>{
  const run=await pdfTestRun(),request=await makePdfFixture(run,{active:true});
  const original=await readFile(request.input),doc=await PDFDocument.load(original);
  assert(doc.catalog.has(PDFName.of('OpenAction')));assert(doc.catalog.has(PDFName.of('AcroForm')));assert(doc.catalog.has(PDFName.of('Names')));
  const result=await processPdf(request);
  assert.equal(result.pageCount,1);assert.equal(result.original.sha256,pdfSha(original));
  assert.equal(result.verification.pdfPixelsEqual,true);assert.equal(result.runtime.reaped,true);
  const output=await readFile(resolve(run.attemptDirectory,'raster-only.pdf')),safe=await PDFDocument.load(output,{updateMetadata:false});
  for(const key of ['OpenAction','AcroForm','Names','Metadata']) assert.equal(safe.catalog.has(PDFName.of(key)),false,key);
  assert.equal(safe.getTitle(),undefined);assert.equal(safe.getAuthor(),undefined);
  assert.equal(safe.getPageCount(),1);assert.equal(pdfSha(output),result.pdf.sha256);
  const pixels=await sharp(await readFile(resolve(run.attemptDirectory,result.pages[0].webp.file))).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.equal(pixels.info.width,1600);assert.equal(pixels.info.height,1200);
  const redAt=(1000*pixels.info.width+200)*4;
  assert.deepEqual([...pixels.data.subarray(redAt,redAt+4)],[255,0,0,255]);
  assert.equal(pdfSha(await readFile(request.input)),pdfSha(original));
  await assert.rejects(lstat(resolve(run.attemptDirectory,'raster.png')),{code:'ENOENT'});
  await assert.rejects(lstat(resolve(run.attemptDirectory,'proof.png')),{code:'ENOENT'});
  const receipt=JSON.parse(await readFile(resolve(run.attemptDirectory,'receipt.json')));assert.equal(receipt.ready,false);assert.equal(receipt.private,true);
  await writeFile(resolve(run.evidence,'result.json'),JSON.stringify({request,result},null,2),{flag:'wx',mode:0o600});
  console.log('PDF_EVIDENCE',run.evidence);
});
test('metadata refuses encryption, malformed page count and outside caps', () => {
  assert.deepEqual(parsePdfInfo('Pages: 1\nEncrypted: no\n'), {pages:1,encrypted:false});
  for(const value of ['Pages: 49\nEncrypted: no\n','Pages: 0\nEncrypted: no\n','Pages: 1\nEncrypted: yes\n','Pages: 1\nPages: 2\nEncrypted: no\n','Pages: 1\nPages: bad\nEncrypted: no\n','Pages: 1\nEncrypted: no\nEncrypted: bad\n','Pages: 1\nEncrypted: nope\n','Pages: 1\nEncrypted: no-garbage\n','Pages: 1\nEncrypted: no garbage\n']) assert.throws(()=>parsePdfInfo(value));
  assert.equal(PDF_LIMITS.pages,48);
});
