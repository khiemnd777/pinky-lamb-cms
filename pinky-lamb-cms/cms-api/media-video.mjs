import {createHash} from 'node:crypto';
import {lstat,mkdir,writeFile} from 'node:fs/promises';
import fsPromises from 'node:fs/promises';
import fs from 'node:fs';
const {constants}=fs;
import {resolve,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readRegularFile,verifyMediaTools,validateMovReferences,validateVideoMetadata} from '../scripts/media-tool-audit.mjs';

export const VIDEO_ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const VIDEO_SCRATCH_ROOT=resolve(VIDEO_ROOT,'.local/media-scratch/m3/parallel-video-01');
export const VIDEO_LIMITS=Object.freeze({inputBytes:128*1024**2,inputDuration:300,inputWidth:1920,inputHeight:1080,inputFps:60,outputBytes:48*1024**2,posterBytes:1024**2,outputWidth:1280,outputHeight:720,outputFps:30,timeoutMs:600000,threads:2,heapMiB:256,rssBytes:768*1024**2,scratchBytes:256*1024**2,logBytes:65536});
export const videoSha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function videoFail(code) {throw Object.assign(new Error(code),{code});}
export function checkVideoPrivateMode(stat,kind,uid=process.getuid()) {
  if(!stat||stat.uid!==uid||(stat.mode&0o7777)!==(kind==='directory'?0o700:0o600)) videoFail(kind==='directory'?'VIDEO_PRIVATE_DIRECTORY':'VIDEO_PRIVATE_INPUT');return true;
}
export function checkVideoFinalization({deadline,signal},now=Date.now()) {
  if(!Number.isFinite(deadline)) videoFail('VIDEO_FINALIZATION');
  if(signal?.aborted) videoFail('VIDEO_CANCELLED');if(now>=deadline) videoFail('VIDEO_TIMEOUT');return true;
}
function exactObject(value,keys) {
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||Object.keys(value).some(k=>!keys.includes(k))) videoFail('VIDEO_MANIFEST');
}
export const videoInputArgs=input=>['-threads','2','-protocol_whitelist','file','-format_whitelist','mov','-codec_whitelist','h264,aac','-enable_drefs','0','-use_absolute_path','0','-err_detect','explode','-f','mov','-i',input];
export const VIDEO_NATIVE_BASE=Object.freeze(['-nostdin','-hide_banner','-loglevel','error','-xerror','-n','-threads','2','-filter_threads','2']);
export const VIDEO_TOOL_PINS=Object.freeze([
  Object.freeze({path:'.local/tools/m3/ffmpeg-9.0.2/install/bin/ffmpeg',bytes:5215704,sha256:'dece05f7fdedb3027a4a9e438cad6b208e3f0da93872ae2ac0d19d2bbe14aa1d'}),
  Object.freeze({path:'.local/tools/m3/ffmpeg-9.0.2/install/bin/ffprobe',bytes:5039672,sha256:'cf2989fc4f5c20e35f184a1b17ffe14dfe977cf822fd735837b51ad4f56d82c3'})
]);
export function videoRecipeArgs(source) {
  const width=Math.max(2,Math.floor(Math.min(source.width,1280,source.width*720/source.height)/2)*2),height=Math.max(2,Math.floor(source.height*width/source.width/2)*2),fps=Math.min(source.fps,30);
  if(width>source.width||height>source.height) videoFail('VIDEO_OUTPUT_CAP');
  const strip=['-map_metadata','-1','-map_metadata:s','-1','-map_chapters','-1'];
  return {
    transcode:[...VIDEO_NATIVE_BASE,...videoInputArgs('source.mp4'),'-map','0:v:0','-map','0:a:0?','-sn','-dn',...strip,'-metadata:s:v:0','handler_name=VideoHandler','-metadata:s:v:0','language=und',...(source.audio?['-metadata:s:a:0','handler_name=SoundHandler','-metadata:s:a:0','language=und']:[]),'-vf',`scale=${width}:${height},fps=${fps},format=yuv420p`,'-c:v','h264_videotoolbox','-allow_sw','0','-require_sw','0','-b:v','1000000','-maxrate','1000000','-bufsize','2000000','-c:a','aac','-b:a','96000','-ar','48000','-ac','2','-threads','2','-movflags','+faststart','safe.mp4'],
    poster:[...VIDEO_NATIVE_BASE,...videoInputArgs('safe.mp4'),'-map','0:v:0','-an','-sn','-dn',...strip,'-frames:v','1','-c:v','png','-threads','2','poster.png']
  };
}
const owned=p=>typeof p==='string'&&p===resolve(p)&&p.startsWith(VIDEO_SCRATCH_ROOT+sep)&&p.slice(VIDEO_SCRATCH_ROOT.length+1).split(sep).every(n=>/^[A-Za-z0-9][A-Za-z0-9_.-]{0,95}$/.test(n)&&n!=='.'&&n!=='..');
export function validateVideoAttemptPath(path) {
  if(!owned(path)||dirname(dirname(path))!==VIDEO_SCRATCH_ROOT) videoFail('VIDEO_ATTEMPT_PATH');return path;
}
export function validateVideoRequest(value) {
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['input','expectedSha256','attemptDirectory','signal'].includes(k))) videoFail('VIDEO_REQUEST');
  const {input,expectedSha256,attemptDirectory,signal}=value;
  if(!owned(input)||!owned(attemptDirectory)||input===attemptDirectory||dirname(input)!==dirname(attemptDirectory)||dirname(dirname(attemptDirectory))!==VIDEO_SCRATCH_ROOT||!input.endsWith('.mp4')||!/^[a-f0-9]{64}$/.test(expectedSha256??'')||(signal!==undefined&&!(signal instanceof AbortSignal))) videoFail('VIDEO_REQUEST');
  return value;
}
export function validateVideoContainer(bytes) {
  if(!Buffer.isBuffer(bytes)||bytes.length<16||bytes.length>VIDEO_LIMITS.inputBytes) videoFail('VIDEO_CONTAINER');
  validateMovReferences(bytes);
  if(bytes.toString('ascii',4,8)!=='ftyp'||!['isom','iso2','mp41','mp42','avc1'].includes(bytes.toString('ascii',8,12))) videoFail('VIDEO_CONTAINER');
  return true;
}
export function inspectVideoMetadata(value,{output=false,source}={}) {
  const metadata=validateVideoMetadata(value);
  const video=value.streams.find(s=>s.codec_type==='video');
  if(video.disposition?.attached_pic||video.side_data_list?.some(s=>s.side_data_type==='Display Matrix')||!/^\d+\/[1-9]\d*$/.test(String(video.avg_frame_rate))||!String(value.format?.format_name).split(',').includes('mp4')) videoFail('VIDEO_STREAMS');
  if(output) {
    // One output frame and one AAC frame at fixed 48kHz bound muxer rounding.
    const durationRounding=1/metadata.fps+(metadata.audio?1024/48000:0);
    if(!source||metadata.width>VIDEO_LIMITS.outputWidth||metadata.height>VIDEO_LIMITS.outputHeight||metadata.fps>VIDEO_LIMITS.outputFps||metadata.width>source.width||metadata.height>source.height||metadata.audio!==source.audio||Math.abs(metadata.duration-source.duration)>durationRounding) videoFail('VIDEO_OUTPUT_CAP');
    // Muxer structural tags are allowed; copied source or descriptive tags are not.
    const tagsValid=(tags,kind)=>Object.entries(tags??{}).every(([key,text])=>{
      if(typeof text!=='string') return false;
      if(key==='encoder') return text===(kind==='format'?'Lavf63.1.102':`Lavc63.1.102 ${kind==='video'?'h264_videotoolbox':'aac'}`);
      if(kind==='format') return {major_brand:'isom',minor_version:'512',compatible_brands:'isomiso2avc1mp41'}[key]===text;
      return {language:'und',handler_name:kind==='video'?'VideoHandler':'SoundHandler',vendor_id:'[0][0][0][0]'}[key]===text;
    });
    if((value.chapters??[]).length||value.streams.some(v=>v.side_data_list?.some(s=>s.side_data_type!=='CPB properties')||!tagsValid(v.tags,v.codec_type))||!tagsValid(value.format?.tags,'format')) videoFail('VIDEO_OUTPUT_METADATA');
  }
  return metadata;
}
export function checkVideoCustody(before,after) {
  if(['ino','dev','size','mode','uid','nlink','mtimeMs','ctimeMs'].some(k=>before[k]!==after[k])||after.nlink!==1) videoFail('VIDEO_CUSTODY_CHANGED');
  return true;
}
export function checkVideoAncestry(before,after) {
  if(!Array.isArray(before)||!Array.isArray(after)||before.length!==after.length||before.some((s,i)=>['path','ino','dev','mode','uid'].some(k=>s[k]!==after[i][k]))) videoFail('VIDEO_ANCESTRY_CHANGED');return true;
}
export async function checkVideoDirectory(path) {
  let cursor=sep;const ancestry=[];
  for(const part of resolve(path).split(sep).filter(Boolean)) {
    cursor=resolve(cursor,part);const stat=await lstat(cursor);
    if(stat.isSymbolicLink()||!stat.isDirectory()) videoFail('VIDEO_PATH');
    const scratch=resolve(VIDEO_ROOT,'.local/media-scratch');
    if(cursor===scratch||cursor.startsWith(scratch+sep)) checkVideoPrivateMode(stat,'directory');
    ancestry.push({path:cursor,ino:stat.ino,dev:stat.dev,mode:stat.mode,uid:stat.uid});
  }
  return ancestry;
}
function verifyRecordDescriptor(fd,path,expectedStat,bytes,links) {
  const current=fs.fstatSync(fd.fd),pathStat=fs.lstatSync(path);
  if(!current.isFile()||!pathStat.isFile()||pathStat.isSymbolicLink()||current.nlink!==links||pathStat.nlink!==links||current.uid!==process.getuid()||(current.mode&0o7777)!==0o600||current.size!==bytes.length||pathStat.ino!==current.ino||pathStat.dev!==current.dev||['ino','dev','size','uid','mode','mtimeMs','ctimeMs'].some(k=>expectedStat[k]!==current[k])) videoFail('VIDEO_RECORD_CUSTODY');
  const data=Buffer.alloc(bytes.length);let offset=0;
  while(offset<data.length) {const count=fs.readSync(fd.fd,data,offset,data.length-offset,offset);if(!count) videoFail('VIDEO_RECORD_CUSTODY');offset+=count;}
  if(videoSha(data)!==videoSha(bytes)) videoFail('VIDEO_RECORD_CONTENT');
  const after=fs.fstatSync(fd.fd);
  if(['ino','dev','size','uid','mode','mtimeMs','ctimeMs','nlink'].some(k=>current[k]!==after[k])) videoFail('VIDEO_RECORD_CUSTODY');
  return after;
}
function verifyRecordAncestry(ancestry) {
  for(const expected of ancestry) {
    const current=fs.lstatSync(expected.path);
    if(!current.isDirectory()||current.isSymbolicLink()||['ino','dev','uid','mode'].some(k=>current[k]!==expected[k])) videoFail('VIDEO_ANCESTRY_CHANGED');
  }
}
export async function writeVideoRecord(directory,custody,name,value,control) {
  validateVideoAttemptPath(directory);
  if(!custody||!Array.isArray(custody.ancestry)||custody.ancestry.at(-1)?.path!==directory) videoFail('VIDEO_RECORD_CUSTODY');
  if(!['receipt.json','manifest.json'].includes(name)) videoFail('VIDEO_RECORD');
  checkVideoAncestry(custody.ancestry,await checkVideoDirectory(directory));const stat=await lstat(directory);
  if(stat.ino!==custody.ino||stat.dev!==custody.dev||stat.uid!==custody.uid||stat.mode!==custody.mode||(stat.mode&0o777)!==0o700) videoFail('VIDEO_ATTEMPT_CHANGED');
  const bytes=Buffer.from(JSON.stringify(value,null,2));if(bytes.length>65536) videoFail('VIDEO_RECORD_LIMIT');
  const success=name==='manifest.json'||value.status==='VERIFIED';
  if(success) checkVideoFinalization(control??{});
  const path=resolve(directory,name),pending=resolve(directory,`${name}.pending`),fd=await fsPromises.open(pending,constants.O_RDWR|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
  let committed=false,published=false,result,problem;
  try {
    if(success) checkVideoFinalization(control);
    await fd.writeFile(bytes);
    const written=await fd.stat(); // Complete post-write custody, not the empty initial stat.
    if(success) checkVideoFinalization(control);
    checkVideoAncestry(custody.ancestry,await checkVideoDirectory(directory));
    verifyRecordAncestry(custody.ancestry);
    verifyRecordDescriptor(fd,pending,written,bytes,1);
    if(success) checkVideoFinalization(control);
    // All commit syscalls/checks are synchronous: cancellation has no event-loop gap.
    fs.linkSync(pending,path);published=true;
    fs.unlinkSync(pending);
    const linked=fs.fstatSync(fd.fd);
    // Hard-link changes ctime; verify the new expected link custody and expected content.
    verifyRecordDescriptor(fd,path,linked,bytes,1);
    committed=true;result={committed:true,singleLink:true,housekeeping:[]};
  } catch(e) {
    problem=e;
    if(published&&!committed) {
      try {
        verifyRecordAncestry(custody.ancestry);
        const current=fs.lstatSync(path),descriptor=fs.fstatSync(fd.fd);
        if(current.ino!==descriptor.ino||current.dev!==descriptor.dev||!current.isFile()||current.isSymbolicLink()) videoFail('VIDEO_RECORD_CUSTODY');
        // Restore a retained pending link if unlink succeeded but final validation failed.
        try {fs.lstatSync(pending);} catch(missing) {if(missing.code!=='ENOENT') throw missing;fs.linkSync(path,pending);}
        const retained=fs.lstatSync(pending);
        if(retained.ino!==descriptor.ino||retained.dev!==descriptor.dev||!retained.isFile()||retained.isSymbolicLink()) videoFail('VIDEO_RECORD_CUSTODY');
        fs.unlinkSync(path);published=false;
      } catch(rollback) {
        problem=Object.assign(new Error('VIDEO_PUBLICATION_UNKNOWN'),{code:'VIDEO_PUBLICATION_UNKNOWN',cause:e.code??e.message,rollback:rollback.code??rollback.message,publication:{committed:false,state:'UNKNOWN',file:name}});
      }
      if(!published) problem=Object.assign(new Error('VIDEO_PUBLICATION_ABORTED'),{code:'VIDEO_PUBLICATION_ABORTED',cause:e.code??e.message,publication:{committed:false,state:'ROLLED_BACK'}});
    }
  } finally {
    try {await fd.close();}
    catch(close) {if(committed) result.housekeeping.push({code:close.code??'VIDEO_DESCRIPTOR_CLOSE',state:'UNKNOWN'});else if(!problem) problem=close;}
  }
  if(problem) throw problem;
  return result; // Post-commit descriptor housekeeping does not relabel a committed artifact FAILED.
}
export function validateVideoCandidate(value,expectedSha256,bytes) {
  exactObject(value,['version','private','ready','original','recipe','recipeSha256','video','poster','verification','nativeSummary']);
  exactObject(value.original,['bytes','sha256','metadata']);exactObject(value.original.metadata,['width','height','duration','fps','audio']);
  exactObject(value.video,['file','bytes','sha256','width','height','duration','fps','audio']);
  exactObject(value.poster,['file','derivativeRole','bytes','sha256','width','height','pixelSha256']);
  exactObject(value.verification,['inputDecoded','outputDecoded','posterDecoded']);
  exactObject(value.nativeSummary,['count','allReaped','peakRssBytes','peakScratchBytes']);
  exactObject(value.recipe,['version','limits','transcode','poster','posterEncode','lockSha256','runtimeSha256','processorSha256','tools','sharp']);
  exactObject(value.recipe.limits,Object.keys(VIDEO_LIMITS));
  if(!Array.isArray(value.recipe.tools)||value.recipe.tools.length!==2) videoFail('VIDEO_MANIFEST');
  value.recipe.tools.forEach(pin=>exactObject(pin,['path','bytes','sha256']));
  if(value.version!==1||!/^[a-f0-9]{64}$/.test(expectedSha256??'')||!Number.isSafeInteger(bytes)||bytes<1||bytes>VIDEO_LIMITS.inputBytes||value.nativeSummary.count!==6||!['peakRssBytes','peakScratchBytes'].every(k=>Number.isSafeInteger(value.nativeSummary[k])&&value.nativeSummary[k]>=0)||value.nativeSummary.peakRssBytes>VIDEO_LIMITS.rssBytes||value.nativeSummary.peakScratchBytes>VIDEO_LIMITS.scratchBytes) videoFail('VIDEO_MANIFEST');
  if(!value||value.private!==true||value.original?.sha256!==expectedSha256||value.original?.bytes!==bytes||value.ready!==false||value.video?.file!=='safe.mp4'||value.poster?.file!=='poster.webp'||value.poster?.derivativeRole!=='POSTER'||value.nativeSummary?.allReaped!==true||value.verification?.inputDecoded!==true||value.verification?.outputDecoded!==true||value.verification?.posterDecoded!==true||value.recipeSha256!==videoSha(Buffer.from(JSON.stringify(value.recipe)))) videoFail('VIDEO_MANIFEST');
  for(const [output,max] of [[value.video,VIDEO_LIMITS.outputBytes],[value.poster,VIDEO_LIMITS.posterBytes]]) if(!Number.isSafeInteger(output.bytes)||output.bytes<1||output.bytes>max||!/^[a-f0-9]{64}$/.test(output.sha256)) videoFail('VIDEO_MANIFEST');
  const source=value.original.metadata,output=value.video;
  const normalized=m=>m&&Number.isInteger(m.width)&&m.width>0&&Number.isInteger(m.height)&&m.height>0&&Number.isFinite(m.duration)&&m.duration>0&&m.duration<=300&&Number.isFinite(m.fps)&&m.fps>0&&typeof m.audio==='boolean';
  if(!normalized(source)||!normalized(output)||source.width>1920||source.height>1080||source.fps>60||output.width>Math.min(1280,source.width)||output.height>Math.min(720,source.height)||output.fps>Math.min(30,source.fps)||output.audio!==source.audio||Math.abs(output.duration-source.duration)>1/output.fps+(output.audio?1024/48000:0)||value.poster.width!==output.width||value.poster.height!==output.height||!/^[a-f0-9]{64}$/.test(value.poster.pixelSha256??'')) videoFail('VIDEO_MANIFEST');
  const fixed=videoRecipeArgs(source),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  if(value.recipe.version!=='M3-PARALLEL-VIDEO-01-v1'||value.recipe.lockSha256!=='2c049b8684ba07916855f009b1a52af77650a118e96090fadc45453f4eb18081'||!Object.keys(VIDEO_LIMITS).every(k=>value.recipe.limits[k]===VIDEO_LIMITS[k])||!['runtimeSha256','processorSha256'].every(k=>/^[a-f0-9]{64}$/.test(value.recipe[k]??''))||!same(value.recipe.transcode,fixed.transcode)||!same(value.recipe.poster,fixed.poster)||value.recipe.posterEncode!=='sharp-raw-srgb-rgba-webp-quality80'||value.recipe.sharp!=='0.35.5'||!same(value.recipe.tools,VIDEO_TOOL_PINS)) videoFail('VIDEO_MANIFEST');
  return value;
}
/** Fixed private local processor. No rights, READY or application integration is granted. */
export async function processVideo(request) {
  validateVideoRequest(request);const {input,expectedSha256,attemptDirectory,signal}=request;
  const started=Date.now(),deadline=started+VIDEO_LIMITS.timeoutMs;
  if(signal?.aborted) videoFail('VIDEO_CANCELLED');
  const inputAncestry=await checkVideoDirectory(dirname(input));const originalStat=await lstat(input);
  checkVideoPrivateMode(originalStat,'file');
  if(!originalStat.isFile()||originalStat.nlink!==1) videoFail('VIDEO_PRIVATE_INPUT');
  const original=await readRegularFile(input,VIDEO_LIMITS.inputBytes);
  if(videoSha(original)!==expectedSha256) videoFail('VIDEO_INPUT_HASH');validateVideoContainer(original);
  await verifyMediaTools('VIDEO');
  if(signal?.aborted) videoFail('VIDEO_CANCELLED');if(Date.now()>=deadline) videoFail('VIDEO_TIMEOUT');
  await mkdir(attemptDirectory,{mode:0o700});const ancestry=await checkVideoDirectory(attemptDirectory);const attempt=await lstat(attemptDirectory);attempt.ancestry=ancestry;
  if((attempt.mode&0o777)!==0o700) videoFail('VIDEO_ATTEMPT_MODE');
  await writeFile(resolve(attemptDirectory,'source.mp4'),original,{flag:'wx',mode:0o600});
  let manifest,problem;
  try {
    const {startVideoRuntime}=await import('./media-video-runtime.mjs');
    const runtime=await startVideoRuntime({attemptDirectory,deadline,signal});
    const candidate=validateVideoCandidate(JSON.parse(await readRegularFile(resolve(attemptDirectory,'candidate.json'),65536)),expectedSha256,original.length);
    const lock=JSON.parse(await readRegularFile(resolve(VIDEO_ROOT,'contracts/media-tool-lock.json'),65536));
    if(JSON.stringify(candidate.recipe.tools)!==JSON.stringify(lock.ffmpeg.binaries)||candidate.recipe.sharp!==lock.packages.sharp.version||candidate.recipe.processorSha256!==videoSha(await readRegularFile(fileURLToPath(import.meta.url),1024**2))||candidate.recipe.runtimeSha256!==videoSha(await readRegularFile(resolve(VIDEO_ROOT,'cms-api/media-video-runtime.mjs'),1024**2))) videoFail('VIDEO_RECIPE_IDENTITY');
    for(const [out,max] of [[candidate.video,VIDEO_LIMITS.outputBytes],[candidate.poster,VIDEO_LIMITS.posterBytes]]) {
      const stat=await lstat(resolve(attemptDirectory,out.file));checkVideoPrivateMode(stat,'file');
      const data=await readRegularFile(resolve(attemptDirectory,out.file),max);
      if(data.length!==out.bytes||videoSha(data)!==out.sha256) videoFail('VIDEO_OUTPUT_HASH');
    }
    if(!runtime.reaped||runtime.exit!==0||!runtime.close) videoFail('VIDEO_PROCESS_CONTROL');
    manifest={...candidate,runtime};
  } catch(e) {problem=e;}
  try {
    checkVideoAncestry(inputAncestry,await checkVideoDirectory(dirname(input)));
    checkVideoCustody(originalStat,await lstat(input));
    if(videoSha(await readRegularFile(input,VIDEO_LIMITS.inputBytes))!==expectedSha256) videoFail('VIDEO_CUSTODY_CHANGED');
    const current=await lstat(attemptDirectory);if(current.ino!==attempt.ino||current.dev!==attempt.dev||current.mode!==attempt.mode||current.uid!==attempt.uid) videoFail('VIDEO_ATTEMPT_CHANGED');
    checkVideoAncestry(ancestry,await checkVideoDirectory(attemptDirectory));
    if(videoSha(await readRegularFile(resolve(attemptDirectory,'source.mp4'),VIDEO_LIMITS.inputBytes))!==expectedSha256) videoFail('VIDEO_CUSTODY_CHANGED');
    await verifyMediaTools('VIDEO');if(signal?.aborted) videoFail('VIDEO_CANCELLED');if(Date.now()>=deadline) videoFail('VIDEO_TIMEOUT');
  } catch(e) {problem=e;}
  if(['VIDEO_CUSTODY_CHANGED','VIDEO_ATTEMPT_CHANGED','VIDEO_ANCESTRY_CHANGED','VIDEO_PATH','VIDEO_PRIVATE_DIRECTORY'].includes(problem?.code)) throw problem;
  await writeVideoRecord(attemptDirectory,attempt,'receipt.json',{private:true,status:problem?'FAILED':'PROCESSING_VALIDATED',code:problem?.code??null,originalSha256:expectedSha256,durationMs:Date.now()-started,runtime:manifest?.runtime??problem?.observation??null,ready:false});
  if(problem) throw problem;
  const publication=await writeVideoRecord(attemptDirectory,attempt,'manifest.json',manifest,{deadline,signal});return {...manifest,publication};
}
