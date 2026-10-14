import {createHash} from 'node:crypto';
import fs,{constants} from 'node:fs';
import {open,lstat,mkdir} from 'node:fs/promises';
import {resolve,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readRegularFile,verifyMediaTools,detectImageSignature} from '../scripts/media-tool-audit.mjs';

export const IMAGE_ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const IMAGE_SCRATCH_ROOT=resolve(IMAGE_ROOT,'.local/media-scratch/m3');
export const IMAGE_LIMITS=Object.freeze({inputBytes:10*1024**2,edge:8192,pixels:40000000,outputBytes:12*1024**2,timeoutMs:30000,heapMiB:256,threads:2,rssBytes:768*1024**2,scratchBytes:256*1024**2,logBytes:65536});
export const IMAGE_RECIPE=Object.freeze({quality:80,alphaQuality:100,effort:4});
export const IMAGE_WIDTHS=Object.freeze([320,960,1920]);
const MIME=Object.freeze({'image/jpeg':'jpeg','image/png':'png','image/webp':'webp'});
export const imageSha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function imageFail(code) {throw Object.assign(new Error(code),{code});}
export function imageActive(deadline,signal) {
  if(signal?.aborted) imageFail('IMAGE_CANCELLED');
  if(!Number.isFinite(deadline)||Date.now()>=deadline) imageFail('IMAGE_TIMEOUT');
}
function exactKeys(value,allowed,required=allowed) {
  if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value))) return false;
  const keys=Reflect.ownKeys(value);
  return keys.every(k=>typeof k==='string'&&allowed.includes(k)&&'value' in Object.getOwnPropertyDescriptor(value,k))&&required.every(k=>Object.hasOwn(value,k));
}
const hash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
export function imageOwnedPath(value) {
  return typeof value==='string'&&value===resolve(value)&&value.startsWith(IMAGE_SCRATCH_ROOT+sep)&&value.slice(IMAGE_SCRATCH_ROOT.length+1).split(sep).every(part=>/^[A-Za-z0-9][A-Za-z0-9_.-]{0,95}$/.test(part)&&part!=='.'&&part!=='..');
}
export function validateImageRequest(value) {
  if(!exactKeys(value,['input','expectedSha256','declaredMime','attemptDirectory','signal'],['input','expectedSha256','declaredMime','attemptDirectory'])) imageFail('IMAGE_REQUEST');
  const {input,expectedSha256,declaredMime,attemptDirectory,signal}=value;
  if(!imageOwnedPath(input)||!imageOwnedPath(attemptDirectory)||input===attemptDirectory||input.startsWith(attemptDirectory+sep)||attemptDirectory.startsWith(input+sep)||!hash(expectedSha256)||typeof declaredMime!=='string'||!Object.hasOwn(MIME,declaredMime)||(signal!==undefined&&!(signal instanceof AbortSignal))) imageFail('IMAGE_REQUEST');
  return value;
}
function crc32(bytes) {
  let crc=0xffffffff;
  for(const byte of bytes) {crc^=byte;for(let bit=0;bit<8;bit++) crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  return (crc^0xffffffff)>>>0;
}
function checkPng(bytes) {
  let at=8,count=0,header=false,data=false,end=false;
  while(at<bytes.length) {
    if(++count>20000||bytes.length-at<12||end) imageFail('IMAGE_CONTAINER');
    const size=bytes.readUInt32BE(at),next=at+12+size;
    if(next>bytes.length) imageFail('IMAGE_CONTAINER');
    const type=bytes.toString('ascii',at+4,at+8);
    if(!/^[A-Za-z]{4}$/.test(type)) imageFail('IMAGE_CONTAINER');
    if(['acTL','fcTL','fdAT'].includes(type)) imageFail('IMAGE_ANIMATION');
    if(crc32(bytes.subarray(at+4,next-4))!==bytes.readUInt32BE(next-4)) imageFail('IMAGE_CONTAINER');
    if(count===1&&type!=='IHDR') imageFail('IMAGE_CONTAINER');
    if(type==='IHDR') {if(header||size!==13) imageFail('IMAGE_CONTAINER');header=true;}
    if(type==='IDAT') data=true;
    if(type==='IEND') {if(size!==0||!header||!data||next!==bytes.length) imageFail('IMAGE_CONTAINER');end=true;}
    at=next;
  }
  if(!end) imageFail('IMAGE_CONTAINER');
}
function checkWebp(bytes) {
  if(bytes.length<20||bytes.readUInt32LE(4)+8!==bytes.length) imageFail('IMAGE_CONTAINER');
  let at=12,count=0,imageChunks=0,extended=false;
  while(at<bytes.length) {
    if(++count>20000||bytes.length-at<8) imageFail('IMAGE_CONTAINER');
    const type=bytes.toString('ascii',at,at+4),size=bytes.readUInt32LE(at+4),end=at+8+size,next=end+(size&1);
    if(next>bytes.length||!size||(size&1&&bytes[end]!==0)) imageFail('IMAGE_CONTAINER');
    if(type==='ANIM'||type==='ANMF') imageFail('IMAGE_ANIMATION');
    if(type==='VP8X') {
      if(extended||count!==1||size!==10) imageFail('IMAGE_CONTAINER');extended=true;
      if(bytes[at+8]&2) imageFail('IMAGE_ANIMATION');
    }
    if(type==='VP8 '||type==='VP8L') imageChunks++;
    at=next;
  }
  if(imageChunks!==1) imageFail('IMAGE_CONTAINER');
}
/** Container scanning is supplementary rejection only; JPEG and pixel validity require native full decode. */
export function validateImageContainer(bytes,declaredMime) {
  if(!Buffer.isBuffer(bytes)||bytes.length===0||bytes.length>IMAGE_LIMITS.inputBytes) imageFail('IMAGE_INPUT_SIZE');
  const format=detectImageSignature(bytes);
  if(MIME[declaredMime]!==format) imageFail('IMAGE_MIME');
  if(format==='png') checkPng(bytes);
  if(format==='webp') checkWebp(bytes);
  return format;
}
export function validateImageMetadata(meta,format) {
  if(!meta||meta.format!==format||!['jpeg','png','webp'].includes(format)||!Number.isInteger(meta.width)||!Number.isInteger(meta.height)||meta.width<1||meta.height<1||meta.width>IMAGE_LIMITS.edge||meta.height>IMAGE_LIMITS.edge||meta.width*meta.height>IMAGE_LIMITS.pixels||(meta.pages??1)!==1||(meta.pageHeight!==undefined&&meta.pageHeight!==meta.height)||!Number.isInteger(meta.orientation??1)||(meta.orientation??1)<1||(meta.orientation??1)>8) imageFail('IMAGE_METADATA');
}
export function imageDimensions(meta) {
  return (meta.orientation??1)>=5?{width:meta.height,height:meta.width}:{width:meta.width,height:meta.height};
}
export function validateImageCandidate(candidate,{expectedSha256,inputBytes,declaredMime}) {
  const bad=()=>imageFail('IMAGE_CANDIDATE');
  if(!exactKeys(candidate,['version','kind','original','source','outputs','recipe'])||candidate.version!==1||candidate.kind!=='IMAGE'||!exactKeys(candidate.original,['sha256','bytes','mime'])||candidate.original.sha256!==expectedSha256||candidate.original.bytes!==inputBytes||candidate.original.mime!==declaredMime||!exactKeys(candidate.source,['width','height','hasAlpha'])||typeof candidate.source.hasAlpha!=='boolean'||!exactKeys(candidate.recipe,['quality','alphaQuality','effort'])||Object.keys(IMAGE_RECIPE).some(k=>candidate.recipe[k]!==IMAGE_RECIPE[k])||!Array.isArray(candidate.outputs)||candidate.outputs.length!==3) bad();
  const {width,height}=candidate.source;
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||Math.max(width,height)>IMAGE_LIMITS.edge||width*height>IMAGE_LIMITS.pixels) bad();
  let total=0;
  for(let index=0;index<3;index++) {
    const output=candidate.outputs[index],target=IMAGE_WIDTHS[index],expectedWidth=Math.min(width,target),expectedHeight=Math.max(1,Math.round(height*expectedWidth/width));
    if(!exactKeys(output,['file','targetWidth','width','height','mime','bytes','sha256','hasAlpha'])||output.file!==`image-${target}.webp`||output.targetWidth!==target||output.mime!=='image/webp'||output.width!==expectedWidth||output.height!==expectedHeight||typeof output.hasAlpha!=='boolean'||!Number.isSafeInteger(output.bytes)||output.bytes<1||!hash(output.sha256)) bad();
    total+=output.bytes;
  }
  if(total>IMAGE_LIMITS.outputBytes) bad();
  return candidate;
}
// UID/mode and no-follow ancestry are checked again at finalization; this is not a kernel namespace sandbox.
export async function checkImageDirectory(path) {
  if(!imageOwnedPath(path)&&path!==IMAGE_SCRATCH_ROOT) imageFail('IMAGE_PATH');
  let cursor=sep;
  for(const part of path.split(sep).filter(Boolean)) {
    cursor=resolve(cursor,part);const stat=await lstat(cursor);
    if(stat.isSymbolicLink()||!stat.isDirectory()) imageFail('IMAGE_PATH');
    if(cursor===dirname(IMAGE_SCRATCH_ROOT)||cursor===IMAGE_SCRATCH_ROOT||cursor.startsWith(IMAGE_SCRATCH_ROOT+sep)) {
      if(stat.uid!==process.getuid()||(stat.mode&0o777)!==0o700) imageFail('IMAGE_PRIVATE_DIRECTORY');
    }
  }
  return await lstat(path);
}
export function sameImageCustody(a,b,{file=false}={}) {
  return ['dev','ino','uid','mode'].every(k=>a[k]===b[k])&&(!file||['size','mtimeMs','ctimeMs','nlink'].every(k=>a[k]===b[k]));
}
export async function readImageFile(path,maxBytes) {
  await checkImageDirectory(dirname(path));
  const before=await lstat(path);
  if(!before.isFile()||before.isSymbolicLink()||before.nlink!==1||before.uid!==process.getuid()||(before.mode&0o777)!==0o600) imageFail('IMAGE_PRIVATE_FILE');
  const bytes=await readRegularFile(path,maxBytes),after=await lstat(path);
  if(!sameImageCustody(before,after,{file:true})) imageFail('IMAGE_FILE_CHANGED');
  return {bytes,custody:after};
}
export async function writeImageFile(directory,name,bytes,custody) {
  if(!/^(source\.(bin|json)|candidate\.json|receipt\.json|manifest\.json|image-(320|960|1920)\.webp|source\.(jpeg|png|webp)|orientation-[1-8]\.jpeg|alpha\.png|resize\.png)$/.test(name)||!Buffer.isBuffer(bytes)) imageFail('IMAGE_OUTPUT_PATH');
  const before=await checkImageDirectory(directory);
  if(custody&&!sameImageCustody(before,custody)) imageFail('IMAGE_ATTEMPT_CHANGED');
  const handle=await open(resolve(directory,name),constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
  try {await handle.writeFile(bytes);await handle.sync();} finally {await handle.close();}
  const after=await checkImageDirectory(directory);
  if(!sameImageCustody(before,after)) imageFail('IMAGE_ATTEMPT_CHANGED');
  return (await readImageFile(resolve(directory,name),bytes.length)).custody;
}
function recordBytes(value) {
  const bytes=Buffer.from(JSON.stringify(value));if(bytes.length>IMAGE_LIMITS.logBytes) imageFail('IMAGE_RECORD_SIZE');return bytes;
}
function checkImageDirectorySync(directory,custody) {
  if(!imageOwnedPath(directory)&&directory!==IMAGE_SCRATCH_ROOT) imageFail('IMAGE_PATH');
  let cursor=sep;
  for(const part of directory.split(sep).filter(Boolean)) {
    cursor=resolve(cursor,part);const st=fs.lstatSync(cursor);
    if(st.isSymbolicLink()||!st.isDirectory()) imageFail('IMAGE_PATH');
    if(cursor===dirname(IMAGE_SCRATCH_ROOT)||cursor===IMAGE_SCRATCH_ROOT||cursor.startsWith(IMAGE_SCRATCH_ROOT+sep)) {
      if(st.uid!==process.getuid()||(st.mode&0o777)!==0o700) imageFail('IMAGE_PRIVATE_DIRECTORY');
    }
  }
  const current=fs.lstatSync(directory);
  if(custody&&!sameImageCustody(custody,current)) imageFail('IMAGE_ATTEMPT_CHANGED');
  return current;
}
function verifyImageFileSync({path,custody,sha256,bytes,maxBytes},code) {
  checkImageDirectorySync(dirname(path));
  const before=fs.lstatSync(path);
  if(!before.isFile()||before.isSymbolicLink()||before.nlink!==1||before.uid!==process.getuid()||(before.mode&0o777)!==0o600||before.size!==bytes||before.size>maxBytes||!sameImageCustody(custody,before,{file:true})) imageFail(code);
  const descriptor=fs.openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW);
  try {
    const opened=fs.fstatSync(descriptor);
    if(!sameImageCustody(before,opened,{file:true})) imageFail(code);
    // Fixed bounded read avoids readFile allocating an externally grown regular file.
    const data=Buffer.alloc(bytes);let offset=0;
    while(offset<bytes) {const count=fs.readSync(descriptor,data,offset,bytes-offset,offset);if(count===0) imageFail(code);offset+=count;}
    if(imageSha(data)!==sha256||!sameImageCustody(opened,fs.fstatSync(descriptor),{file:true})||!sameImageCustody(before,fs.lstatSync(path),{file:true})) imageFail(code);
  } finally {fs.closeSync(descriptor);}
}
export function commitImageManifest(directory,bytes,custody,deadline,signal,original,outputs) {
  // Trusted internal finalization seam; processImage supplies captured original/output guards.
  // Fixed staging evidence survives every preparation error. All other file guards stay nlink1.
  if(!Buffer.isBuffer(bytes)||bytes.length<1||bytes.length>IMAGE_LIMITS.logBytes) imageFail('IMAGE_RECORD_SIZE');
  const boundedGuard=(guard,cap)=>exactKeys(guard,['path','custody','sha256','bytes','maxBytes'])&&imageOwnedPath(guard.path)&&hash(guard.sha256)&&Number.isInteger(guard.bytes)&&guard.bytes>0&&guard.bytes<=cap&&Number.isInteger(guard.maxBytes)&&guard.maxBytes>=guard.bytes&&guard.maxBytes<=cap&&guard.custody&&['dev','ino','uid','mode','size','nlink'].every(k=>Number.isSafeInteger(guard.custody[k])&&guard.custody[k]>=0)&&['mtimeMs','ctimeMs'].every(k=>Number.isFinite(guard.custody[k]));
  if(!boundedGuard(original,IMAGE_LIMITS.inputBytes)||!Array.isArray(outputs)||outputs.length!==3||outputs.some((guard,index)=>!boundedGuard(guard,IMAGE_LIMITS.outputBytes)||guard.path!==resolve(directory,`image-${IMAGE_WIDTHS[index]}.webp`))) imageFail('IMAGE_COMMIT_REQUEST');
  imageActive(deadline,signal);checkImageDirectorySync(directory,custody);
  const stage=resolve(directory,'manifest.stage.json'),manifest=resolve(directory,'manifest.json');
  const descriptor=fs.openSync(stage,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
  let stageCustody;
  try {
    let offset=0;
    while(offset<bytes.length) {
      const written=fs.writeSync(descriptor,bytes,offset,bytes.length-offset);
      if(!Number.isInteger(written)||written<=0||written>bytes.length-offset) imageFail('IMAGE_STAGE_WRITE');
      offset+=written;
    }
    fs.fsyncSync(descriptor);stageCustody=fs.fstatSync(descriptor);
  } finally {fs.closeSync(descriptor);}
  const guard={path:stage,custody:stageCustody,sha256:imageSha(bytes),bytes:bytes.length,maxBytes:IMAGE_LIMITS.logBytes};
  imageActive(deadline,signal);checkImageDirectorySync(directory,custody);
  verifyImageFileSync(guard,'IMAGE_STAGE_CHANGED');
  verifyImageFileSync(original,'IMAGE_ORIGINAL_CHANGED');
  for(const output of outputs) verifyImageFileSync(output,'IMAGE_OUTPUT_CHANGED');
  // Recheck staging and owned directory after every preparation/read/close operation.
  verifyImageFileSync(guard,'IMAGE_STAGE_CHANGED');
  checkImageDirectorySync(directory,custody);
  imageActive(deadline,signal);
  // FINALIZE-01 commit point: exclusive link publication. Success has no later I/O or rejection.
  // The exact retained stage/manifest pair is nlink2. No unlink, overwrite or directory fsync follows.
  // Abort delivered after this point belongs to the caller's next operation. Same-UID ancestor
  // mutation is not atomically confined by Node O_NOFOLLOW; power-loss directory durability is unknown.
  fs.linkSync(stage,manifest);
}

/** Explicit bounded reader for FINALIZE-01's exact pair; generic single-link readers remain unchanged. */
export function readImageManifestPair(directory,expected) {
  if(!exactKeys(expected,['expectedSha256','expectedBytes','custody'],['expectedSha256','expectedBytes'])||!hash(expected.expectedSha256)||!Number.isInteger(expected.expectedBytes)||expected.expectedBytes<1||expected.expectedBytes>IMAGE_LIMITS.logBytes) imageFail('IMAGE_MANIFEST_PAIR_REQUEST');
  const directoryCustody=checkImageDirectorySync(directory,expected.custody);
  const paths=['manifest.stage.json','manifest.json'].map(name=>resolve(directory,name));
  const before=paths.map(path=>fs.lstatSync(path));
  const valid=st=>st.isFile()&&!st.isSymbolicLink()&&st.nlink===2&&st.uid===process.getuid()&&(st.mode&0o777)===0o600&&st.size===expected.expectedBytes;
  if(before.some(st=>!valid(st))||before[0].ino!==before[1].ino||before[0].dev!==before[1].dev) imageFail('IMAGE_MANIFEST_PAIR');
  const values=[];
  for(let index=0;index<paths.length;index++) {
    const fd=fs.openSync(paths[index],constants.O_RDONLY|constants.O_NOFOLLOW);
    try {
      const opened=fs.fstatSync(fd);
      if(!valid(opened)||!sameImageCustody(before[index],opened,{file:true})) imageFail('IMAGE_MANIFEST_PAIR');
      const data=Buffer.alloc(expected.expectedBytes);let offset=0;
      while(offset<data.length) {const count=fs.readSync(fd,data,offset,data.length-offset,offset);if(count===0) imageFail('IMAGE_MANIFEST_PAIR');offset+=count;}
      if(imageSha(data)!==expected.expectedSha256||!sameImageCustody(opened,fs.fstatSync(fd),{file:true})) imageFail('IMAGE_MANIFEST_PAIR');
      values.push(data);
    } finally {fs.closeSync(fd);}
  }
  checkImageDirectorySync(directory,directoryCustody);
  if(paths.some((path,index)=>!sameImageCustody(before[index],fs.lstatSync(path),{file:true}))||!values[0].equals(values[1])) imageFail('IMAGE_MANIFEST_PAIR');
  return values[1];
}

/** Local private processor result. CMS readiness belongs to the Upload/job caller. */
export async function processImage(request) {
  validateImageRequest(request);
  const {input,expectedSha256,declaredMime,attemptDirectory,signal}=request;
  const started=Date.now(),deadline=started+IMAGE_LIMITS.timeoutMs;
  imageActive(deadline,signal);
  const original=await readImageFile(input,IMAGE_LIMITS.inputBytes);
  if(imageSha(original.bytes)!==expectedSha256) imageFail('IMAGE_INPUT_HASH');
  validateImageContainer(original.bytes,declaredMime);
  const parentCustody=await checkImageDirectory(dirname(attemptDirectory));
  await verifyMediaTools('IMAGE'); // Fixed COMMON+IMAGE closure; no caller scope or fallback.
  imageActive(deadline,signal);
  if(!sameImageCustody(parentCustody,await checkImageDirectory(dirname(attemptDirectory)))) imageFail('IMAGE_ATTEMPT_CHANGED');
  await mkdir(attemptDirectory,{mode:0o700}); // Existing attempts and outputs are retained and refused.
  const attempt=await checkImageDirectory(attemptDirectory);
  let candidate,runtime,problem;const outputCustody=[];
  try {
    await writeImageFile(attemptDirectory,'source.bin',original.bytes,attempt);
    await writeImageFile(attemptDirectory,'source.json',recordBytes({expectedSha256,declaredMime}),attempt);
    imageActive(deadline,signal);
    const {startImageRuntime}=await import('./media-images-runtime.mjs');
    runtime=await startImageRuntime({attemptDirectory,deadline,signal});
    candidate=JSON.parse((await readImageFile(resolve(attemptDirectory,'candidate.json'),IMAGE_LIMITS.logBytes)).bytes);
    validateImageCandidate(candidate,{expectedSha256,inputBytes:original.bytes.length,declaredMime});
    for(const output of candidate.outputs) {
      const value=await readImageFile(resolve(attemptDirectory,output.file),IMAGE_LIMITS.outputBytes);
      if(value.bytes.length!==output.bytes||imageSha(value.bytes)!==output.sha256) imageFail('IMAGE_OUTPUT_HASH');
      outputCustody.push({path:resolve(attemptDirectory,output.file),custody:value.custody,sha256:output.sha256,bytes:output.bytes,maxBytes:IMAGE_LIMITS.outputBytes});
    }
  } catch(error) {problem=error;}
  try {
    const current=await readImageFile(input,IMAGE_LIMITS.inputBytes);
    if(!sameImageCustody(current.custody,original.custody,{file:true})||imageSha(current.bytes)!==expectedSha256) imageFail('IMAGE_ORIGINAL_CHANGED');
    if(!sameImageCustody(attempt,await checkImageDirectory(attemptDirectory))) imageFail('IMAGE_ATTEMPT_CHANGED');
    await verifyMediaTools('IMAGE');
    imageActive(deadline,signal);
  } catch(error) {problem=error;}
  if(['IMAGE_ATTEMPT_CHANGED','IMAGE_ORIGINAL_CHANGED','IMAGE_PATH','IMAGE_PRIVATE_DIRECTORY','IMAGE_PRIVATE_FILE','IMAGE_FILE_CHANGED'].includes(problem?.code)) throw problem;
  await writeImageFile(attemptDirectory,'receipt.json',recordBytes({status:problem?'FAILED':'OUTPUTS_VERIFIED',code:problem?.code??null,originalSha256:expectedSha256,durationMs:Date.now()-started,runtime:runtime??problem?.observation??null,ready:false}),attempt);
  if(problem) throw problem;
  imageActive(deadline,signal);
  const result={...candidate,runtime,ready:false};
  commitImageManifest(attemptDirectory,recordBytes(result),attempt,deadline,signal,{path:input,custody:original.custody,sha256:expectedSha256,bytes:original.bytes.length,maxBytes:IMAGE_LIMITS.inputBytes},outputCustody);
  return result;
}
