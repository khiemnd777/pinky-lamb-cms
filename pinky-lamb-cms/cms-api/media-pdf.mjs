import {createHash} from 'node:crypto';
import {lstat, mkdir, writeFile} from 'node:fs/promises';
import {resolve, dirname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readRegularFile} from '../scripts/media-tool-audit.mjs';

import {verifyLocalPdfRuntime} from './pdf-local-runtime.mjs';
import {PDF_LOCAL_PROGRAM} from '../contracts/media-pdf-local-profile-v5.mjs';

export const PDF_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const PDF_SCRATCH_ROOT = resolve(PDF_ROOT, '.local/media-scratch/m3');
export const PDF_EVIDENCE_ROOT = resolve(PDF_ROOT, '.local/test-outputs/m3/parallel-pdf-01');
export const PDF_LIMITS = Object.freeze({inputBytes:25*1024**2,pages:48,edge:1280,pixels:4000000,webpBytes:64*1024**2,pdfBytes:64*1024**2,combinedBytes:96*1024**2,scratchBytes:256*1024**2,timeoutMs:120000,rssBytes:768*1024**2,heapMiB:256,threads:2,logBytes:65536});
export const pdfSha = bytes => createHash('sha256').update(bytes).digest('hex');
export function pdfFail(code) { throw Object.assign(new Error(code), {code}); }

function ownData(value,required,optional=[],code='PDF_MANIFEST') {
  if(!value||typeof value!=='object'||Object.getPrototypeOf(value)!==Object.prototype) pdfFail(code);
  const descriptors=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(descriptors);
  if(keys.some(key=>typeof key!=='string'||![...required,...optional].includes(key))||required.some(key=>!Object.hasOwn(descriptors,key))) pdfFail(code);
  for(const key of keys) if(!Object.hasOwn(descriptors[key],'value')||!descriptors[key].enumerable) pdfFail(code);
  return Object.fromEntries(keys.map(key=>[key,descriptors[key].value]));
}
function densePdfArray(value) {
  if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype) pdfFail('PDF_MANIFEST');
  const descriptors=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(descriptors),length=descriptors.length;
  if(!length||!Object.hasOwn(length,'value')||length.enumerable||!Number.isSafeInteger(length.value)||length.value<0||length.value>PDF_LIMITS.pages||keys.length!==length.value+1) pdfFail('PDF_MANIFEST');
  const items=[];
  for(let i=0;i<length.value;i++) {
    const descriptor=descriptors[String(i)];
    if(!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.enumerable) pdfFail('PDF_MANIFEST');
    items.push(descriptor.value);
  }
  if(keys.some(key=>typeof key!=='string'||(key!=='length'&&(!/^(0|[1-9][0-9]*)$/.test(key)||Number(key)>=length.value)))) pdfFail('PDF_MANIFEST');
  return items;
}
export function checkPdfSignal(signal,code='PDF_REQUEST') {
  if(signal===undefined) return;
  try {Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted').get.call(signal);} catch {pdfFail(code);}
}
export const pdfSignalAborted=signal=>signal===undefined?false:Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted').get.call(signal);

export function validatePdfRequest(value) {
  const request=ownData(value,['input','expectedSha256','attemptDirectory'],['signal'],'PDF_REQUEST');
  const {input,expectedSha256,attemptDirectory,signal}=request;
  if(typeof input!=='string' || !input.startsWith(sep) || input!==resolve(input) || typeof attemptDirectory!=='string' || !attemptDirectory.startsWith(sep) || attemptDirectory!==resolve(attemptDirectory) || typeof expectedSha256!=='string' || expectedSha256.length!==64 || !/^[a-f0-9]{64}$/.test(expectedSha256)) pdfFail('PDF_REQUEST');
  const owned=p=>p.startsWith(PDF_SCRATCH_ROOT+sep)&&p.slice(PDF_SCRATCH_ROOT.length+1).split(sep).every(part=>part.length>=1&&part.length<=96&&/^[A-Za-z0-9]/.test(part)&&!/[^A-Za-z0-9_.-]/.test(part)&&part!=='.'&&part!=='..');
  if(!owned(input)||!owned(attemptDirectory)||input.slice(PDF_SCRATCH_ROOT.length+1).split(sep).length<3||attemptDirectory.slice(PDF_SCRATCH_ROOT.length+1).split(sep).length!==2) pdfFail('PDF_REQUEST');
  checkPdfSignal(signal);
  return request;
}

// The private worker and caller share this exact candidate boundary. Validate
// the complete shape before resolving or reading any candidate output filename.
export function validatePdfCandidate(value,{originalBytes,originalSha256}) {
  const c=ownData(value,['version','private','ready','original','recipe','recipeSha256','pageCount','pages','pdf','webpBytes','combinedBytes','verification','nativeSummary']);
  const uint=(n,max)=>Number.isSafeInteger(n)&&n>=1&&n<=max;
  const hash=h=>typeof h==='string'&&h.length===64&&/^[a-f0-9]{64}$/.test(h);
  const pages=densePdfArray(c.pages);
  if(c.version!==1||c.private!==true||c.ready!==false||!uint(c.pageCount,PDF_LIMITS.pages)||pages.length!==c.pageCount) pdfFail('PDF_MANIFEST');
  const original=ownData(c.original,['bytes','sha256']);
  if(!uint(original.bytes,PDF_LIMITS.inputBytes)||!hash(original.sha256)||original.bytes!==originalBytes||original.sha256!==originalSha256) pdfFail('PDF_MANIFEST');
  const recipe=ownData(c.recipe,['version','limits','render','webp','pdf','lockSha256','runtimeSha256','processorSha256','tools','sharp','pdfLib']);
  const limits=ownData(recipe.limits,Object.keys(PDF_LIMITS));
  const render=densePdfArray(recipe.render),fixedRender=PDF_LOCAL_PROGRAM.recipe.render;
  if(Object.keys(PDF_LIMITS).some(key=>limits[key]!==PDF_LIMITS[key])||recipe.version!=='M3-PARALLEL-PDF-01-v1'||render.length!==fixedRender.length||render.some((part,i)=>part!==fixedRender[i])||recipe.webp!=='lossless-srgb-rgba'||recipe.pdf!=='fresh-embedPng-immediate-embed'||recipe.lockSha256!==PDF_LOCAL_PROGRAM.recipe.lockSha256||!hash(recipe.runtimeSha256)||!hash(recipe.processorSha256)||recipe.sharp!=='0.35.5'||recipe.pdfLib!=='1.17.1') pdfFail('PDF_MANIFEST');
  const tools=PDF_LOCAL_PROGRAM.recipe.tools;
  const toolItems=densePdfArray(recipe.tools);
  if(toolItems.length!==tools.length) pdfFail('PDF_MANIFEST');
  toolItems.forEach((tool,i)=>{const pin=ownData(tool,['path','type','bytes','sha256']);if(Object.keys(tools[i]).some(key=>pin[key]!==tools[i][key])) pdfFail('PDF_MANIFEST');});
  if(!hash(c.recipeSha256)||c.recipeSha256!==pdfSha(Buffer.from(JSON.stringify(c.recipe)))) pdfFail('PDF_MANIFEST');
  let total=0;
  pages.forEach((item,index)=>{
    const page=ownData(item,['page','width','height','pixelSha256','webp']);
    if(page.page!==index+1||!uint(page.width,PDF_LIMITS.edge)||!uint(page.height,PDF_LIMITS.edge)||page.width*page.height>PDF_LIMITS.pixels||!hash(page.pixelSha256)) pdfFail('PDF_MANIFEST');
    const webp=ownData(page.webp,['file','bytes','sha256','role','mime','pageNumber']);
    if(webp.file!==`page-${index+1}.webp`||!uint(webp.bytes,PDF_LIMITS.webpBytes)||!hash(webp.sha256)||webp.role!=='PDF_PAGE'||webp.mime!=='image/webp'||webp.pageNumber!==index+1) pdfFail('PDF_MANIFEST');
    total+=webp.bytes;
  });
  const pdf=ownData(c.pdf,['file','bytes','sha256','role','mime']);
  if(pdf.file!=='raster-only.pdf'||!uint(pdf.bytes,PDF_LIMITS.pdfBytes)||!hash(pdf.sha256)||pdf.role!=='PDF_DOWNLOAD'||pdf.mime!=='application/pdf'||total>PDF_LIMITS.webpBytes||c.webpBytes!==total||c.combinedBytes!==total+pdf.bytes||c.combinedBytes>PDF_LIMITS.combinedBytes) pdfFail('PDF_MANIFEST');
  const verification=ownData(c.verification,['allPagesDecoded','webpPixelsEqual','pdfPixelsEqual','noSourceComponents']);
  if(Object.values(verification).some(flag=>flag!==true)) pdfFail('PDF_MANIFEST');
  const native=ownData(c.nativeSummary,['count','allReaped','peakRssBytes','peakScratchBytes']);
  if(native.count!==2+2*c.pageCount||native.allReaped!==true||!Number.isSafeInteger(native.peakRssBytes)||native.peakRssBytes<0||native.peakRssBytes>PDF_LIMITS.rssBytes||!Number.isSafeInteger(native.peakScratchBytes)||native.peakScratchBytes<0||native.peakScratchBytes>PDF_LIMITS.scratchBytes) pdfFail('PDF_MANIFEST');
  return value;
}
export function parsePdfInfo(value) {
  const pageFields=value.split(/\r?\n/).filter(line=>line.startsWith('Pages:')),encryptionFields=value.split(/\r?\n/).filter(line=>line.startsWith('Encrypted:'));
  if(pageFields.length!==1||encryptionFields.length!==1) pdfFail('PDF_METADATA');
  const pages=[pageFields[0].match(/^Pages:\s+(\d+)\s*$/)],encrypted=[encryptionFields[0].match(/^Encrypted:\s+(no|yes(?: \(print:(?:yes|no) copy:(?:yes|no) change:(?:yes|no) addNotes:(?:yes|no) algorithm:(?:RC4|AES|AES-256)\))?)\s*$/)];
  if(!pages[0]||!encrypted[0]) pdfFail('PDF_METADATA');
  if(encrypted[0][1]!=='no') pdfFail('PDF_ENCRYPTED');
  const count=Number(pages[0][1]);
  if(!Number.isSafeInteger(count)||count<1||count>PDF_LIMITS.pages) pdfFail('PDF_PAGES');
  return {pages:count,encrypted:false};
}
export async function checkPdfDirectory(path) {
  let cursor=sep;
  for(const part of resolve(path).split(sep).filter(Boolean)) {
    cursor=resolve(cursor,part); const st=await lstat(cursor);
    if(st.isSymbolicLink()||!st.isDirectory()) pdfFail('PDF_PATH');
    if((cursor===PDF_SCRATCH_ROOT||cursor.startsWith(PDF_SCRATCH_ROOT+sep))&&(st.uid!==process.getuid()||(st.mode&0o022)!==0)) pdfFail('PDF_PRIVATE_DIRECTORY');
  }
}
// This helper only finalizes the two fixed private records in a caller-retained, newly owned attempt.
export async function writePdfAttemptRecord({attemptDirectory,custody,name,value}) {
  if(!['receipt.json','manifest.json'].includes(name)||dirname(dirname(attemptDirectory))!==PDF_SCRATCH_ROOT) pdfFail('PDF_FINAL_RECORD');
  await checkPdfDirectory(attemptDirectory);
  const current=await lstat(attemptDirectory);
  if(current.ino!==custody.ino||current.dev!==custody.dev||current.mode!==custody.mode||current.uid!==custody.uid||current.uid!==process.getuid()||(current.mode&0o777)!==0o700) pdfFail('PDF_ATTEMPT_CHANGED');
  const encoded=JSON.stringify(value,null,2);
  if(Buffer.byteLength(encoded)>65536) pdfFail('PDF_FINAL_RECORD_SIZE');
  await writeFile(resolve(attemptDirectory,name),encoded,{flag:'wx',mode:0o600});
}

/** Private local processing only. This result does not grant READY state. */
export async function processPdf(request) {
  const {input,expectedSha256,attemptDirectory,signal}=validatePdfRequest(request);
  if(pdfSignalAborted(signal)) pdfFail('PDF_CANCELLED');
  const started=Date.now(),deadline=started+PDF_LIMITS.timeoutMs;
  await checkPdfDirectory(dirname(input));
  const custody=await lstat(input);
  if(custody.uid!==process.getuid()||(custody.mode&0o022)!==0) pdfFail('PDF_PRIVATE_INPUT');
  const original=await readRegularFile(input,PDF_LIMITS.inputBytes);
  if(pdfSha(original)!==expectedSha256) pdfFail('PDF_INPUT_HASH');
  if(!/^%PDF-[12]\.[0-9]/.test(original.subarray(0,8).toString('ascii'))) pdfFail('PDF_SIGNATURE');
  await verifyLocalPdfRuntime();
  if(pdfSignalAborted(signal)) pdfFail('PDF_CANCELLED');
  if(Date.now()>deadline) pdfFail('PDF_TIMEOUT');
  await checkPdfDirectory(dirname(attemptDirectory));
  await mkdir(attemptDirectory,{mode:0o700}); // EEXIST is refusal, never reuse/overwrite an attempt.
  await checkPdfDirectory(attemptDirectory);
  const attempt=await lstat(attemptDirectory);
  if(attempt.uid!==process.getuid()||(attempt.mode&0o777)!==0o700) pdfFail('PDF_ATTEMPT_MODE');
  await writeFile(resolve(attemptDirectory,'source.pdf'),original,{flag:'wx',mode:0o600});
  let manifest,problem;
  try {
    const {startPdfRuntime}=await import('./media-pdf-runtime.mjs');
    const runtime=await startPdfRuntime({attemptDirectory,deadline,signal});
    const bytes=await readRegularFile(resolve(attemptDirectory,'candidate.json'),65536);
    const candidate=validatePdfCandidate(JSON.parse(bytes),{originalSha256:expectedSha256,originalBytes:original.length});
    if(candidate.recipe.processorSha256!==pdfSha(await readRegularFile(resolve(PDF_ROOT,'cms-api/media-pdf.mjs'),1024**2))||candidate.recipe.runtimeSha256!==pdfSha(await readRegularFile(resolve(PDF_ROOT,'cms-api/media-pdf-runtime.mjs'),1024**2))) pdfFail('PDF_RECIPE_HASH');
    for(const output of [...candidate.pages.map(p=>p.webp),candidate.pdf]) {
      if(pdfSignalAborted(signal)) pdfFail('PDF_CANCELLED');
      if(Date.now()>deadline) pdfFail('PDF_TIMEOUT');
      await checkPdfDirectory(attemptDirectory);
      const currentAttempt=await lstat(attemptDirectory);
      if(currentAttempt.ino!==attempt.ino||currentAttempt.dev!==attempt.dev||currentAttempt.uid!==attempt.uid||currentAttempt.mode!==attempt.mode) pdfFail('PDF_ATTEMPT_CHANGED');
      const data=await readRegularFile(resolve(attemptDirectory,output.file),output.role==='PDF_PAGE'?PDF_LIMITS.webpBytes:PDF_LIMITS.pdfBytes);
      if(data.length!==output.bytes || pdfSha(data)!==output.sha256) pdfFail('PDF_OUTPUT_HASH');
    }
    manifest={...candidate,runtime};
  } catch(e) { problem=e; }
  // Preservation and pin checks are completion gates on both success and failure.
  try {
    if(pdfSha(await readRegularFile(input,PDF_LIMITS.inputBytes))!==expectedSha256) pdfFail('PDF_ORIGINAL_CHANGED');
    const current=await lstat(input),currentAttempt=await lstat(attemptDirectory);
    if(current.ino!==custody.ino||current.dev!==custody.dev||current.size!==custody.size||current.mode!==custody.mode||current.uid!==custody.uid||current.nlink!==1||current.mtimeMs!==custody.mtimeMs||current.ctimeMs!==custody.ctimeMs) pdfFail('PDF_ORIGINAL_CHANGED');
    if(currentAttempt.ino!==attempt.ino||currentAttempt.dev!==attempt.dev||currentAttempt.uid!==attempt.uid||currentAttempt.mode!==attempt.mode) pdfFail('PDF_ATTEMPT_CHANGED');
    await verifyLocalPdfRuntime();
    if(Date.now()>deadline) pdfFail('PDF_TIMEOUT');
    if(pdfSignalAborted(signal)) pdfFail('PDF_CANCELLED');
  } catch(e) { problem=e; }
  if(['PDF_ATTEMPT_CHANGED','PDF_ORIGINAL_CHANGED','PDF_PATH','PDF_PRIVATE_DIRECTORY'].includes(problem?.code)) throw problem;
  const receipt={private:true,task:'M3-PARALLEL-PDF-01 v1',status:problem?'FAILED':'VERIFIED',code:problem?.code??null,originalSha256:expectedSha256,durationMs:Date.now()-started,runtime:manifest?.runtime??problem?.observation??null,ready:false};
  await writePdfAttemptRecord({attemptDirectory,custody:attempt,name:'receipt.json',value:receipt});
  if(problem) throw problem;
  if(pdfSignalAborted(signal)) pdfFail('PDF_CANCELLED');
  if(Date.now()>deadline) pdfFail('PDF_TIMEOUT');
  await writePdfAttemptRecord({attemptDirectory,custody:attempt,name:'manifest.json',value:manifest});
  return manifest;
}
