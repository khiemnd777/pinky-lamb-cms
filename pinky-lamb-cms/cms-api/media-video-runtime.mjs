import {spawn} from 'node:child_process';
import {lstat,readdir,writeFile,appendFile,unlink} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readRegularFile,verifyMediaTools,parseProcessSnapshot} from '../scripts/media-tool-audit.mjs';
import {VIDEO_ROOT,VIDEO_LIMITS,VIDEO_SCRATCH_ROOT,checkVideoDirectory,inspectVideoMetadata,validateVideoContainer,validateVideoAttemptPath,videoRecipeArgs,videoInputArgs,VIDEO_NATIVE_BASE,videoSha,videoFail} from './media-video.mjs';
const SELF=fileURLToPath(import.meta.url);
const NODE=resolve(VIDEO_ROOT,'.local/cache/node/node-v22.23.3-darwin-arm64/bin/node');
const ENV={PATH:'/usr/bin:/bin',LANG:'C',LC_ALL:'C',VIPS_CONCURRENCY:'2',UV_THREADPOOL_SIZE:'2'};

// Pure observed ancestry accounting. PGID migration never removes an enrolled identity.
export function observeVideoProcesses(state,rows) {
  const known=new Map(state.known.map(r=>[r.pid,r]));
  const unique=new Set();
  for(const row of rows) {
    if(!Number.isSafeInteger(row.pid)||row.pid<1||unique.has(row.pid)||!Number.isSafeInteger(row.rss)||row.rss<0||typeof row.start!=='string') videoFail('VIDEO_PROCESS_IDENTITY');
    unique.add(row.pid);
    if(known.has(row.pid)&&known.get(row.pid).start!==row.start) videoFail('VIDEO_PROCESS_IDENTITY');
  }
  const leader=rows.find(r=>r.pid===state.leaderPid);
  if(leader) {
    if(leader.parent!==state.parentPid||state.preflightPids.includes(leader.pid)) videoFail('VIDEO_PROCESS_IDENTITY');
    if(!known.has(leader.pid)) {
      if(state.closed) videoFail('VIDEO_PROCESS_IDENTITY');known.set(leader.pid,leader);
    }
  }
  let changed=true;
  while(changed) {
    changed=false;
    for(const row of rows) if(!known.has(row.pid)&&known.has(row.parent)&&rows.some(p=>p.pid===row.parent&&p.start===known.get(row.parent).start)) {
      if(state.preflightPids.includes(row.pid)) videoFail('VIDEO_PROCESS_IDENTITY');
      known.set(row.pid,row);changed=true;
    }
  }
  if(state.detached&&rows.some(r=>r.group===state.leaderPid&&!known.has(r.pid))) videoFail('VIDEO_PROCESS_IDENTITY');
  const owned=rows.filter(r=>known.get(r.pid)?.start===r.start);
  return {known:[...known.values()],owned,rssBytes:owned.reduce((sum,r)=>sum+r.rss,0)};
}

async function scratchBytes(dir) {
  let bytes=0;
  for(const name of await readdir(dir)) {
    const s=await lstat(resolve(dir,name));
    if(!s.isFile()||s.nlink!==1||s.isSymbolicLink()) videoFail('VIDEO_SCRATCH_TYPE');
    bytes+=s.size;
  }
  return bytes;
}
async function processSnapshot() {
  return new Promise((ok,bad)=>{
    const child=spawn('/bin/ps',['-axo','pid=,ppid=,pgid=,rss=,lstart='],{env:ENV,stdio:['ignore','pipe','pipe']});
    let data='',error='',failure,settled=false;
    function abandon(code) {
      if(settled) return;settled=true;failure=code;
      let control='SIGKILL_REQUESTED';
      try {if(child.exitCode===null&&child.signalCode===null&&!child.kill('SIGKILL')) control='SIGNAL_NOT_SENT';} catch(e) {control=e.code;}
      child.stdout.destroy();child.stderr.destroy();child.unref();clearTimeout(timer);
      bad(Object.assign(new Error(code),{code,helper:{pid:child.pid,close:false,reaped:false,control}}));
    }
    const timer=setTimeout(()=>abandon('VIDEO_PS_TIMEOUT'),1000);
    child.stdout.on('data',b=>{if(data.length+b.length>1024**2) abandon('VIDEO_PS_LOG');else data+=b;});
    child.stderr.on('data',b=>{if(error.length<1024) error+=b;});
    child.on('error',e=>{failure=e.code;});
    child.on('close',code=>{
      if(settled) return;settled=true;
      clearTimeout(timer);
      if(failure||code!==0||error) return bad(Object.assign(new Error('VIDEO_PROCESS_OBSERVATION'),{code:failure??'VIDEO_PROCESS_OBSERVATION'}));
      let rows;
      try {rows=parseProcessSnapshot(data).map(([pid,parent,group,rss,start])=>({pid,parent,group,rss:rss*1024,start}));}
      catch(e) {return bad(e);}
      ok(rows);
    });
  });
}

// Private fixed callers construct argv below. No caller executable/argv or cap overrides are exported.
async function supervised(command,args,dir,{deadline,signal,env={},worker=false}={}) {
  if(signal?.aborted) videoFail('VIDEO_CANCELLED');
  if(deadline<=Date.now()) videoFail('VIDEO_TIMEOUT');
  const preflight=await processSnapshot();
  if(signal?.aborted) videoFail('VIDEO_CANCELLED');
  if(deadline<=Date.now()) videoFail('VIDEO_TIMEOUT');
  const child=spawn(command,args,{cwd:dir,env:{...ENV,TMPDIR:dir,HOME:dir,...env},detached:worker,stdio:worker?['ignore','pipe','pipe','ipc']:['ignore','pipe','pipe']});
  const observation={pid:child.pid,command:command===NODE?'pinned-node':command.split('/').at(-1),args,start:new Date().toISOString(),exit:null,close:false,signals:[],peakRssBytes:0,peakScratchBytes:0,watchdog:'BEST_EFFORT',reaped:false};
  let stdout=Buffer.alloc(0),stderr=Buffer.alloc(0),reason,spawnError,polling=false,known=[],stopPromise=Promise.resolve(),killTimer,cleanupTimer,closeResolve,pipeTimer,finished=false;
  const capture=rows=>{
    const observed=observeVideoProcesses({known,leaderPid:child.pid,parentPid:process.pid,preflightPids:preflight.map(r=>r.pid),detached:worker,closed:observation.close||child.exitCode!==null||child.signalCode!==null},rows);
    known=observed.known;observation.observedIdentities=known.map(r=>({pid:r.pid,start:r.start}));
    return observed.owned;
  };
  async function send(sig) {
    let rows;
    try {rows=await processSnapshot();} catch(e) {
      observation.controlError=e.code;
      return;
    }
    const own=capture(rows);
    if(!own.length) return;
    // Never signal a whole group. Reobserve each exact enrolled PID/start before signalling it.
    for(const target of own.reverse()) {
      const current=capture(await processSnapshot()).find(r=>r.pid===target.pid);
      if(!current) continue;if(current.start!==target.start) videoFail('VIDEO_PROCESS_IDENTITY');
      try {process.kill(target.pid,sig);observation.signals.push({pid:target.pid,start:target.start,signal:sig});}
      catch(e) {if(e.code!=='ESRCH') throw e;}
    }
  }
  function stop(code) {
    if(reason||finished) return;
    reason=code;
    stopPromise=stopPromise.then(()=>send('SIGTERM')).catch(e=>{observation.controlError=e.code;});
    killTimer=setTimeout(()=>{stopPromise=stopPromise.then(()=>send('SIGKILL')).catch(e=>{observation.controlError=e.code;});},200);
    cleanupTimer=setTimeout(()=>{
      observation.controlError='VIDEO_CLEANUP_TIMEOUT';child.stdout.destroy();child.stderr.destroy();if(child.connected)child.disconnect();child.unref();closeResolve?.();
    },2000);
  }
  for(const [stream,key] of [[child.stdout,'stdout'],[child.stderr,'stderr']]) stream.on('data',b=>{
    const prev=key==='stdout'?stdout:stderr;
    observation[key+'ObservedBytes']=(observation[key+'ObservedBytes']??0)+b.length;
    if(prev.length+b.length>VIDEO_LIMITS.logBytes) {stop('VIDEO_LOG_LIMIT');return;}
    if(key==='stdout') stdout=Buffer.concat([prev,b]); else stderr=Buffer.concat([prev,b]);
  });
  const cancel=()=>stop('VIDEO_CANCELLED');
  signal?.addEventListener('abort',cancel,{once:true});
  const timer=setTimeout(()=>stop('VIDEO_TIMEOUT'),Math.max(1,deadline-Date.now()));
  const sample=setInterval(async()=>{
    if(polling) return; polling=true;
    try {
      const rows=capture(await processSnapshot());
      observation.peakRssBytes=Math.max(observation.peakRssBytes,rows.reduce((n,r)=>n+r.rss,0));
      observation.peakScratchBytes=Math.max(observation.peakScratchBytes,await scratchBytes(dir));
      if(observation.peakRssBytes>VIDEO_LIMITS.rssBytes) stop('VIDEO_RSS_LIMIT');
      if(observation.peakScratchBytes>VIDEO_LIMITS.scratchBytes) stop('VIDEO_SCRATCH_LIMIT');
    } catch(e) {stop(e.code??'VIDEO_WATCHDOG');} finally {polling=false;}
  },50);
  await new Promise(done=>{
    closeResolve=done;
    child.on('error',e=>{spawnError=e.code;});
    child.on('exit',(code,sig)=>{observation.exit=code;observation.signal=sig;pipeTimer=setTimeout(()=>{if(!observation.close) stop('VIDEO_PIPE_HOLD');},250);});
    child.on('close',()=>{observation.close=true;done();});
  });
  finished=true;clearTimeout(timer);clearInterval(sample);clearTimeout(cleanupTimer);clearTimeout(pipeTimer);signal?.removeEventListener('abort',cancel);
  if(killTimer) clearTimeout(killTimer);
  // A successful leader must leave no native descendants. Terminate only the observed owned group.
  try { const remaining=capture(await processSnapshot()); if(remaining.length) {await send('SIGTERM');await new Promise(r=>setTimeout(r,220));await send('SIGKILL');} }
  catch(e) {observation.controlError=e.code;}
  await stopPromise;
  try {
    const rows=await processSnapshot();
    observation.remainingPids=capture(rows).map(r=>r.pid);
    observation.reaped=observation.close&&observation.remainingPids.length===0&&(child.exitCode!==null||child.signalCode!==null);
    observation.peakScratchBytes=Math.max(observation.peakScratchBytes,await scratchBytes(dir));
  } catch(e) {observation.controlError=e.code;}
  observation.stdoutBytes=stdout.length;observation.stderrBytes=stderr.length;
  if(!observation.reaped||observation.controlError) reason='VIDEO_PROCESS_CONTROL';
  if(observation.peakScratchBytes>VIDEO_LIMITS.scratchBytes) reason='VIDEO_SCRATCH_LIMIT';
  let workerError;
  if(worker&&stderr.length) {try {workerError=JSON.parse(stderr.toString());} catch { /* Bounded diagnostics remain failure. */ }}
  if(reason||spawnError||observation.exit!==0) throw Object.assign(new Error(reason??spawnError??workerError?.code??'VIDEO_NATIVE_FAILED'),{code:reason??spawnError??workerError?.code??'VIDEO_NATIVE_FAILED',observation,diagnostic:stderr.toString()});
  return {stdout:stdout.toString(),stderr:stderr.toString(),observation};
}

export async function startVideoRuntime(value) {
  if(!value||Object.keys(value).some(k=>!['attemptDirectory','deadline','signal'].includes(k))) videoFail('VIDEO_RUNTIME_REQUEST');
  const {attemptDirectory,deadline,signal}=value;
  validateVideoAttemptPath(attemptDirectory);
  if(typeof attemptDirectory!=='string'||attemptDirectory!==resolve(attemptDirectory)||dirname(dirname(attemptDirectory))!==VIDEO_SCRATCH_ROOT||!Number.isFinite(deadline)||deadline>Date.now()+VIDEO_LIMITS.timeoutMs||(signal!==undefined&&!(signal instanceof AbortSignal))) videoFail('VIDEO_RUNTIME_REQUEST');
  await checkVideoDirectory(attemptDirectory);
  const stat=await lstat(attemptDirectory);if(stat.uid!==process.getuid()||(stat.mode&0o777)!==0o700) videoFail('VIDEO_ATTEMPT_MODE');
  if(signal?.aborted) videoFail('VIDEO_CANCELLED');if(Date.now()>=deadline) videoFail('VIDEO_TIMEOUT');
  await verifyMediaTools('VIDEO'); // Complete COMMON + VIDEO closure before worker load/spawn.
  if(signal?.aborted) videoFail('VIDEO_CANCELLED');if(Date.now()>=deadline) videoFail('VIDEO_TIMEOUT');
  const result=await supervised(NODE,['--max-old-space-size=256',SELF,'--owned-video-worker'],attemptDirectory,{deadline,signal,worker:true,env:{VIDEO_DEADLINE:String(deadline)}});
  if(result.stderr.trim()) videoFail('VIDEO_WORKER_DIAGNOSTIC');return result.observation;
}

async function videoWorker() {
  const dir=process.cwd(),deadline=Number(process.env.VIDEO_DEADLINE);
  validateVideoAttemptPath(dir);
  if(!process.send||!process.connected||process.execPath!==NODE||process.execArgv.join(' ')!=='--max-old-space-size=256'||dirname(dirname(dir))!==VIDEO_SCRATCH_ROOT||!Number.isFinite(deadline)||deadline>Date.now()+VIDEO_LIMITS.timeoutMs) videoFail('VIDEO_INTERNAL_ONLY');
  process.umask(0o077); // Only the guarded private worker sets its own output creation mask.
  await checkVideoDirectory(dir);const attempt=await lstat(dir);
  if(attempt.uid!==process.getuid()||(attempt.mode&0o777)!==0o700) videoFail('VIDEO_ATTEMPT_MODE');
  if(Date.now()>=deadline) videoFail('VIDEO_TIMEOUT');
  const tools=await verifyMediaTools('VIDEO'); // No FFmpeg or Sharp load before the pinned COMMON + VIDEO gate.
  const lockBytes=await readRegularFile(resolve(VIDEO_ROOT,'contracts/media-tool-lock.json'),65536),lock=JSON.parse(lockBytes),observations=[];
  const evidence=resolve(dir,'native-observations.jsonl');
  await writeFile(evidence,'',{flag:'wx',mode:0o600});const evidenceStat=await lstat(evidence);
  async function retain(observation) {
    const currentAttempt=await lstat(dir);
    if(currentAttempt.ino!==attempt.ino||currentAttempt.dev!==attempt.dev||currentAttempt.uid!==attempt.uid||currentAttempt.mode!==attempt.mode) videoFail('VIDEO_ATTEMPT_CHANGED');
    const current=await lstat(evidence);
    if(current.ino!==evidenceStat.ino||current.dev!==evidenceStat.dev||!current.isFile()||current.nlink!==1||current.uid!==process.getuid()) videoFail('VIDEO_EVIDENCE_CHANGED');
    const line=JSON.stringify(observation)+'\n';if(Buffer.byteLength(line)>65536||current.size+Buffer.byteLength(line)>1024**2) videoFail('VIDEO_EVIDENCE_LIMIT');
    await appendFile(evidence,line);
  }
  const source=resolve(dir,'source.mp4'),safe=resolve(dir,'safe.mp4'),poster=resolve(dir,'poster.webp'),png=resolve(dir,'poster.png');
  const sourceBytes=await readRegularFile(source,VIDEO_LIMITS.inputBytes);validateVideoContainer(sourceBytes);
  const inputArgs=videoInputArgs;
  const base=VIDEO_NATIVE_BASE;
  async function native(command,args) {
    if(!process.connected) videoFail('VIDEO_PARENT_DISCONNECTED');
    let result;
    try {result=await supervised(resolve(VIDEO_ROOT,command),args,dir,{deadline});}
    catch(e) {await retain({failed:true,code:e.code??'VIDEO_NATIVE_FAILED',observation:e.observation??null});throw e;}
    observations.push(result.observation);await retain(result.observation);
    if(result.stderr.trim()) videoFail('VIDEO_DIAGNOSTIC');return result.stdout;
  }
  async function probe(input) {
    const text=await native(tools.ffprobe,['-v','error',...inputArgs(input),'-show_format','-show_streams','-show_chapters','-of','json']);
    try {return JSON.parse(text);} catch {videoFail('VIDEO_METADATA');}
  }
  async function decode(input) {
    await native(tools.ffmpeg,[...base,...inputArgs(input),'-map','0:v:0','-map','0:a:0?','-sn','-dn','-threads','2','-f','null','-']);
  }
  const inputMetadata=inspectVideoMetadata(await probe(source));await decode(source);
  const fixedRecipe=videoRecipeArgs(inputMetadata);
  const actual=args=>args.map(v=>v==='source.mp4'?source:v==='safe.mp4'?safe:v==='poster.png'?png:v);
  const transcode=actual(fixedRecipe.transcode);
  await native(tools.ffmpeg,transcode);
  const safeBytes=await readRegularFile(safe,VIDEO_LIMITS.outputBytes);validateVideoContainer(safeBytes);
  const outputMetadata=inspectVideoMetadata(await probe(safe),{output:true,source:inputMetadata});await decode(safe);
  // Poster always derives from fully validated safe video, never original pixels.
  const posterArgs=actual(fixedRecipe.poster);
  await native(tools.ffmpeg,posterArgs);
  const pngStat=await lstat(png),pngBytes=await readRegularFile(png,4*1024**2);
  await verifyMediaTools('VIDEO');
  const sharp=(await import('sharp')).default;sharp.concurrency(2);sharp.cache(false);
  const extracted=sharp(pngBytes,{failOn:'warning',unlimited:false,limitInputPixels:1280*720,pages:1});
  const pngMeta=await extracted.metadata();
  if(pngMeta.format!=='png'||(pngMeta.pages??1)!==1||pngMeta.width!==outputMetadata.width||pngMeta.height!==outputMetadata.height) videoFail('VIDEO_POSTER_METADATA');
  const pixels=await extracted.ensureAlpha().toColourspace('srgb').raw().toBuffer({resolveWithObject:true});
  if(pixels.data.length!==pngMeta.width*pngMeta.height*4) videoFail('VIDEO_POSTER_DECODE');
  const posterBytes=await sharp(pixels.data,{raw:{width:pngMeta.width,height:pngMeta.height,channels:4}}).webp({quality:80}).toBuffer();
  if(posterBytes.length>VIDEO_LIMITS.posterBytes) videoFail('VIDEO_POSTER_LIMIT');
  await writeFile(poster,posterBytes,{flag:'wx',mode:0o600});
  const image=sharp(posterBytes,{failOn:'warning',unlimited:false,limitInputPixels:1280*720,pages:1});
  const meta=await image.metadata();
  if(meta.format!=='webp'||(meta.pages??1)!==1||meta.width!==outputMetadata.width||meta.height!==outputMetadata.height||meta.exif||meta.xmp||meta.icc) videoFail('VIDEO_POSTER_METADATA');
  const raw=await image.ensureAlpha().toColourspace('srgb').raw().toBuffer({resolveWithObject:true});
  if(raw.info.width!==meta.width||raw.info.height!==meta.height||raw.data.length!==meta.width*meta.height*4) videoFail('VIDEO_POSTER_DECODE');
  await retain({intermediate:'poster.png',bytes:pngBytes.length,sha256:videoSha(pngBytes),pixelSha256:videoSha(pixels.data)});
  const freshPng=await lstat(png),freshAttempt=await lstat(dir);
  if(freshAttempt.ino!==attempt.ino||freshAttempt.dev!==attempt.dev||freshAttempt.uid!==attempt.uid||freshAttempt.mode!==attempt.mode||freshPng.ino!==pngStat.ino||freshPng.dev!==pngStat.dev||freshPng.nlink!==1||!freshPng.isFile()||freshPng.isSymbolicLink()) videoFail('VIDEO_CLEANUP_OWNER');
  await unlink(png); // Only this owned, evidenced intermediate is removed.
  if(!process.connected||Date.now()>=deadline) videoFail('VIDEO_TIMEOUT');
  await verifyMediaTools('VIDEO');
  await writeFile(resolve(dir,'native-observations.json'),JSON.stringify({private:true,observations}),{flag:'wx',mode:0o600});
  const recipe={version:'M3-PARALLEL-VIDEO-01-v1',limits:VIDEO_LIMITS,transcode:fixedRecipe.transcode,poster:fixedRecipe.poster,posterEncode:'sharp-raw-srgb-rgba-webp-quality80',lockSha256:videoSha(lockBytes),runtimeSha256:videoSha(await readRegularFile(SELF,1024**2)),processorSha256:videoSha(await readRegularFile(resolve(VIDEO_ROOT,'cms-api/media-video.mjs'),1024**2)),tools:lock.ffmpeg.binaries,sharp:lock.packages.sharp.version};
  const nativeSummary={count:observations.length,allReaped:observations.every(o=>o.close&&o.reaped&&o.exit===0),peakRssBytes:Math.max(...observations.map(o=>o.peakRssBytes)),peakScratchBytes:Math.max(...observations.map(o=>o.peakScratchBytes))};
  if(!nativeSummary.allReaped) videoFail('VIDEO_PROCESS_CONTROL');
  const manifest={version:1,private:true,ready:false,original:{bytes:sourceBytes.length,sha256:videoSha(sourceBytes),metadata:inputMetadata},recipe,recipeSha256:videoSha(Buffer.from(JSON.stringify(recipe))),video:{file:'safe.mp4',bytes:safeBytes.length,sha256:videoSha(safeBytes),...outputMetadata},poster:{file:'poster.webp',derivativeRole:'POSTER',bytes:posterBytes.length,sha256:videoSha(posterBytes),width:meta.width,height:meta.height,pixelSha256:videoSha(raw.data)},verification:{inputDecoded:true,outputDecoded:true,posterDecoded:true},nativeSummary};
  await writeFile(resolve(dir,'candidate.json'),JSON.stringify(manifest),{flag:'wx',mode:0o600});
}

// Imports are inert; direct CLI must meet internal fixed shape before any tool load/spawn.
if(process.argv[1]===SELF) {
  if(process.argv.length!==3||process.argv[2]!=='--owned-video-worker') videoFail('VIDEO_INTERNAL_ONLY');
  try {await videoWorker();} catch(e) {process.stderr.write(JSON.stringify({code:e.code??'VIDEO_WORKER_FAILED',observation:e.observation??null})+'\n');process.exitCode=1;}
}

