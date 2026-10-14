import {spawn} from 'node:child_process';
import {lstat,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {verifyMediaTools,parseProcessSnapshot} from '../scripts/media-tool-audit.mjs';
import {IMAGE_ROOT,IMAGE_LIMITS,IMAGE_WIDTHS,IMAGE_RECIPE,checkImageDirectory,imageOwnedPath,imageActive,imageFail,imageSha,readImageFile,writeImageFile,validateImageContainer,validateImageMetadata,imageDimensions,sameImageCustody,validateImageCandidate} from './media-images.mjs';

const SELF=fileURLToPath(import.meta.url);
const NODE=resolve(IMAGE_ROOT,'.local/cache/node/node-v22.23.3-darwin-arm64/bin/node');
const ENV=Object.freeze({PATH:'/usr/bin:/bin',LANG:'C',LC_ALL:'C',VIPS_CONCURRENCY:'2',UV_THREADPOOL_SIZE:'2'});

async function processSnapshot() {
  return await new Promise((ok,bad)=>{
    const helper=spawn('/bin/ps',['-axo','pid=,ppid=,pgid=,rss=,lstart='],{env:ENV,stdio:['ignore','pipe','pipe']});
    let data=Buffer.alloc(0),failed=false;
    const reject=()=>{if(failed)return;failed=true;helper.kill('SIGKILL');clearTimeout(timer);bad(Object.assign(new Error('IMAGE_PROCESS_SNAPSHOT'),{code:'IMAGE_PROCESS_SNAPSHOT'}));};
    const timer=setTimeout(reject,1000);
    helper.stdout.on('data',bytes=>{if(data.length+bytes.length>IMAGE_LIMITS.logBytes)return reject();data=Buffer.concat([data,bytes]);});
    helper.stderr.on('data',reject);helper.on('error',reject);
    helper.on('close',code=>{if(failed)return;clearTimeout(timer);try {if(code!==0)return reject();ok(parseProcessSnapshot(data.toString()));} catch {reject();}});
  });
}
async function scratchBytes(directory) {
  await checkImageDirectory(directory);
  let size=0;
  for(const name of await readdir(directory)) {
    const st=await lstat(resolve(directory,name));
    if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.uid!==process.getuid()||(st.mode&0o777)!==0o600) imageFail('IMAGE_SCRATCH_TYPE');
    size+=st.size;
    if(size>IMAGE_LIMITS.scratchBytes) imageFail('IMAGE_SCRATCH_LIMIT');
  }
  return size;
}

// The fixed Node child is isolated from inherited NODE_OPTIONS/loaders and caller commands.
export async function startImageRuntime(value) {
  if(!value||Object.keys(value).some(k=>!['attemptDirectory','deadline','signal'].includes(k))) imageFail('IMAGE_RUNTIME_REQUEST');
  const {attemptDirectory,deadline,signal}=value;
  if(!imageOwnedPath(attemptDirectory)||!Number.isFinite(deadline)||deadline>Date.now()+IMAGE_LIMITS.timeoutMs||(signal!==undefined&&!(signal instanceof AbortSignal))) imageFail('IMAGE_RUNTIME_REQUEST');
  const custody=await checkImageDirectory(attemptDirectory);
  imageActive(deadline,signal);
  await verifyMediaTools('IMAGE');
  imageActive(deadline,signal); // Gate may consume the deadline or observe cancellation.
  const before=await processSnapshot();
  imageActive(deadline,signal);
  if(!sameImageCustody(custody,await checkImageDirectory(attemptDirectory))) imageFail('IMAGE_ATTEMPT_CHANGED');
  const child=spawn(NODE,['--max-old-space-size=256',SELF,'--image-worker',attemptDirectory,String(deadline)],{cwd:attemptDirectory,env:ENV,detached:true,stdio:['ignore','pipe','pipe']});
  const observation={pid:child.pid??null,closed:false,reaped:false,peakRssBytes:0,peakScratchBytes:0,stdoutBytes:0,stderrBytes:0,signals:[],rssPolicy:'SAMPLED_OWNED_PROCESS_GROUP_BEST_EFFORT',descendantsLeavingGroup:'NOT_OBSERVED'};
  const known=new Map();let finished=false,reason=null,poll=null,control=null,killTimer,pipeTimer;
  let stderr=Buffer.alloc(0),stopWork=Promise.resolve();
  function enroll(rows) {
    const leader=rows.find(row=>row[0]===child.pid),own=rows.filter(row=>row[2]===child.pid);
    if(leader) {
      if(leader[1]!==process.pid||leader[2]!==child.pid||before.some(row=>row[0]===leader[0])) imageFail('IMAGE_PROCESS_IDENTITY');
      if(known.has(leader[0])&&known.get(leader[0])[4]!==leader[4]) imageFail('IMAGE_PROCESS_IDENTITY');
      if(!known.has(leader[0])&&!observation.closed&&child.exitCode===null&&child.signalCode===null) known.set(leader[0],leader);
    }
    if(leader&&!observation.closed&&child.exitCode===null&&child.signalCode===null) {
      let changed=true;
      while(changed) {changed=false;for(const row of own) if(!known.has(row[0])&&known.has(row[1])) {known.set(row[0],row);changed=true;}}
    }
    if(own.some(row=>!known.has(row[0])||known.get(row[0])[4]!==row[4])) imageFail('IMAGE_PROCESS_IDENTITY');
    return own;
  }
  async function send(sig) {
    const rows=await processSnapshot(),own=enroll(rows);
    if(!own.length)return;
    // Signal only a process group with identities already observed through owned ancestry.
    try {process.kill(-child.pid,sig);observation.signals.push(sig);} catch(error) {if(error.code!=='ESRCH')throw error;}
  }
  function stop(code) {
    if(reason||finished)return;
    reason=code;
    stopWork=stopWork.then(()=>send('SIGTERM')).catch(error=>{control=error.code??'IMAGE_PROCESS_CONTROL';if(child.exitCode===null&&child.signalCode===null)child.kill('SIGTERM');});
    killTimer=setTimeout(()=>{stopWork=stopWork.then(()=>send('SIGKILL')).catch(error=>{control=error.code??'IMAGE_PROCESS_CONTROL';if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');});},200);
  }
  const cancel=()=>stop('IMAGE_CANCELLED');signal?.addEventListener('abort',cancel,{once:true});
  // An abort between preflight and listener installation must not escape observation.
  if(signal?.aborted) cancel();
  const timeout=setTimeout(()=>stop('IMAGE_TIMEOUT'),Math.max(1,deadline-Date.now()));
  const sample=setInterval(()=>{
    if(poll||finished)return;
    poll=(async()=>{
      const rows=enroll(await processSnapshot());
      observation.peakRssBytes=Math.max(observation.peakRssBytes,rows.reduce((sum,row)=>sum+row[3]*1024,0));
      observation.peakScratchBytes=Math.max(observation.peakScratchBytes,await scratchBytes(attemptDirectory));
      if(observation.peakRssBytes>IMAGE_LIMITS.rssBytes) stop('IMAGE_RSS_LIMIT');
    })().catch(error=>stop(error.code??'IMAGE_WATCHDOG')).finally(()=>{poll=null;});
  },50);
  for(const [stream,key] of [[child.stdout,'stdout'],[child.stderr,'stderr']]) stream.on('data',bytes=>{
    observation[key+'Bytes']+=bytes.length;
    if(observation[key+'Bytes']>IMAGE_LIMITS.logBytes) {stop('IMAGE_LOG_LIMIT');return;}
    if(key==='stderr') stderr=Buffer.concat([stderr,bytes]);
  });
  await new Promise(done=>{
    const cleanup=setTimeout(()=>{stop('IMAGE_PROCESS_CONTROL');child.stdout.destroy();child.stderr.destroy();child.unref();done();},Math.max(1,deadline-Date.now())+3000);
    child.on('error',error=>{reason=error.code??'IMAGE_SPAWN';});
    child.on('exit',(code,sig)=>{observation.exit=code;observation.signal=sig;pipeTimer=setTimeout(()=>stop('IMAGE_PIPE_HOLD'),250);});
    child.on('close',()=>{observation.closed=true;clearTimeout(cleanup);done();});
  });
  finished=true;clearTimeout(timeout);clearInterval(sample);clearTimeout(pipeTimer);
  signal?.removeEventListener('abort',cancel);
  if(poll)await poll;
  await stopWork;
  if(killTimer) {clearTimeout(killTimer);await send('SIGKILL').catch(error=>{control=error.code;});}
  try {
    let own=enroll(await processSnapshot());
    if(own.length) {await send('SIGKILL');await new Promise(done=>setTimeout(done,100));own=enroll(await processSnapshot());}
    observation.remainingPids=own.map(row=>row[0]);
    observation.reaped=observation.closed&&!own.length&&(child.exitCode!==null||child.signalCode!==null);
    observation.peakScratchBytes=Math.max(observation.peakScratchBytes,await scratchBytes(attemptDirectory));
    if(!sameImageCustody(custody,await checkImageDirectory(attemptDirectory))) imageFail('IMAGE_ATTEMPT_CHANGED');
  } catch(error) {control=error.code??'IMAGE_PROCESS_CONTROL';}
  if(!observation.reaped||control) reason=control??'IMAGE_PROCESS_CONTROL';
  if(signal?.aborted) reason=reason??'IMAGE_CANCELLED';
  if(Date.now()>=deadline) reason=reason??'IMAGE_TIMEOUT';
  let diagnostic;
  try {diagnostic=JSON.parse(stderr.toString());} catch { /* Unstructured diagnostics never imply success. */ }
  if(reason||observation.exit!==0) throw Object.assign(new Error(reason??diagnostic?.code??'IMAGE_NATIVE_FAILED'),{code:reason??diagnostic?.code??'IMAGE_NATIVE_FAILED',observation});
  return observation;
}

async function imageWorker(attemptDirectory,deadline) {
  if(!imageOwnedPath(attemptDirectory)||resolve(process.cwd())!==attemptDirectory||!Number.isFinite(deadline)||deadline>Date.now()+IMAGE_LIMITS.timeoutMs) imageFail('IMAGE_RUNTIME_REQUEST');
  const custody=await checkImageDirectory(attemptDirectory);
  imageActive(deadline);
  await verifyMediaTools('IMAGE'); // Fixed scope is also mandatory for direct internal CLI entry.
  imageActive(deadline);
  const request=JSON.parse((await readImageFile(resolve(attemptDirectory,'source.json'),65536)).bytes);
  if(!request||Object.keys(request).sort().join(',')!=='declaredMime,expectedSha256'||!/^[a-f0-9]{64}$/.test(request.expectedSha256??'')) imageFail('IMAGE_RUNTIME_REQUEST');
  const original=await readImageFile(resolve(attemptDirectory,'source.bin'),IMAGE_LIMITS.inputBytes);
  if(imageSha(original.bytes)!==request.expectedSha256) imageFail('IMAGE_INPUT_HASH');
  const format=validateImageContainer(original.bytes,request.declaredMime);
  imageActive(deadline);
  const sharp=(await import('sharp')).default;
  if(sharp.versions.sharp!=='0.35.5') imageFail('IMAGE_SHARP_VERSION');
  sharp.concurrency(IMAGE_LIMITS.threads);sharp.cache(false);
  const options={failOn:'warning',unlimited:false,limitInputPixels:IMAGE_LIMITS.pixels,pages:1};
  const metadata=await sharp(original.bytes,options).metadata();validateImageMetadata(metadata,format);
  const dimensions=imageDimensions(metadata);
  // Decode every original pixel before any resize. autoOrient includes mirrored EXIF orientations.
  const raw=await sharp(original.bytes,options).autoOrient().toColourspace('srgb').raw({depth:'uchar'}).toBuffer({resolveWithObject:true});
  if(raw.info.width!==dimensions.width||raw.info.height!==dimensions.height||![3,4].includes(raw.info.channels)||raw.data.length!==dimensions.width*dimensions.height*raw.info.channels) imageFail('IMAGE_FULL_DECODE');
  imageActive(deadline);
  const outputs=[];let total=0;
  for(const targetWidth of IMAGE_WIDTHS) {
    const resized=await sharp(raw.data,{raw:{width:raw.info.width,height:raw.info.height,channels:raw.info.channels}}).resize({width:targetWidth,withoutEnlargement:true}).raw().toBuffer({resolveWithObject:true});
    const webp=await sharp(resized.data,{raw:{width:resized.info.width,height:resized.info.height,channels:resized.info.channels}}).webp(IMAGE_RECIPE).toBuffer();
    total+=webp.length;if(total>IMAGE_LIMITS.outputBytes) imageFail('IMAGE_OUTPUT_SIZE');
    validateImageContainer(webp,'image/webp');
    const outMeta=await sharp(webp,options).metadata();validateImageMetadata(outMeta,'webp');
    if(outMeta.exif||outMeta.xmp||outMeta.iptc||outMeta.icc||outMeta.orientation||outMeta.width!==resized.info.width||outMeta.height!==resized.info.height||outMeta.space!=='srgb') imageFail('IMAGE_OUTPUT_METADATA');
    const decoded=await sharp(webp,options).ensureAlpha().raw({depth:'uchar'}).toBuffer({resolveWithObject:true});
    if(decoded.info.width!==resized.info.width||decoded.info.height!==resized.info.height||decoded.info.channels!==4||decoded.data.length!==resized.info.width*resized.info.height*4) imageFail('IMAGE_OUTPUT_DECODE');
    for(let pixel=0;pixel<resized.info.width*resized.info.height;pixel++) {
      const expectedAlpha=resized.info.channels===4?resized.data[pixel*4+3]:255;
      if(decoded.data[pixel*4+3]!==expectedAlpha) imageFail('IMAGE_OUTPUT_ALPHA');
    }
    imageActive(deadline);
    const file=`image-${targetWidth}.webp`;
    await writeImageFile(attemptDirectory,file,webp,custody);
    const saved=await readImageFile(resolve(attemptDirectory,file),IMAGE_LIMITS.outputBytes);
    if(imageSha(saved.bytes)!==imageSha(webp)) imageFail('IMAGE_OUTPUT_HASH');
    outputs.push({file,targetWidth,width:outMeta.width,height:outMeta.height,mime:'image/webp',bytes:webp.length,sha256:imageSha(webp),hasAlpha:outMeta.hasAlpha===true});
  }
  const after=await readImageFile(resolve(attemptDirectory,'source.bin'),IMAGE_LIMITS.inputBytes);
  if(!sameImageCustody(original.custody,after.custody,{file:true})||imageSha(after.bytes)!==request.expectedSha256) imageFail('IMAGE_ORIGINAL_CHANGED');
  await verifyMediaTools('IMAGE');imageActive(deadline);
  const candidate={version:1,kind:'IMAGE',original:{sha256:request.expectedSha256,bytes:original.bytes.length,mime:request.declaredMime},source:{...dimensions,hasAlpha:metadata.hasAlpha===true},outputs,recipe:IMAGE_RECIPE};
  validateImageCandidate(candidate,{expectedSha256:request.expectedSha256,inputBytes:original.bytes.length,declaredMime:request.declaredMime});
  await writeImageFile(attemptDirectory,'candidate.json',Buffer.from(JSON.stringify(candidate)),custody);
}

if(process.argv[1]&&resolve(process.argv[1])===SELF) {
  if(process.argv.length!==5||process.argv[2]!=='--image-worker') imageFail('IMAGE_RUNTIME_REQUEST');
  try {await imageWorker(process.argv[3],Number(process.argv[4]));}
  catch(error) {process.stderr.write(JSON.stringify({code:error.code??'IMAGE_NATIVE_FAILED'}));process.exitCode=1;}
}
