import {spawn} from 'node:child_process';
import {lstat,readdir,writeFile,unlink} from 'node:fs/promises';
import {resolve,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readRegularFile,verifyMediaTools} from '../scripts/media-tool-audit.mjs';
import {PDF_ROOT,PDF_LIMITS,PDF_SCRATCH_ROOT,checkPdfDirectory,checkPdfSignal,pdfSignalAborted,validatePdfCandidate,parsePdfInfo,pdfSha,pdfFail} from './media-pdf.mjs';

const SELF=fileURLToPath(import.meta.url);
const NODE=resolve(PDF_ROOT,'.local/cache/node/node-v22.23.3-darwin-arm64/bin/node');
const ENV={PATH:'/usr/bin:/bin',LANG:'C',LC_ALL:'C',VIPS_CONCURRENCY:'2',UV_THREADPOOL_SIZE:'2'};

async function scratchBytes(dir) {
  let bytes=0;
  for(const name of await readdir(dir)) {
    const s=await lstat(resolve(dir,name));
    if(!s.isFile()||s.nlink!==1||s.isSymbolicLink()) pdfFail('PDF_SCRATCH_TYPE');
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
    const timer=setTimeout(()=>abandon('PDF_PS_TIMEOUT'),1000);
    child.stdout.on('data',b=>{if(data.length+b.length>1024**2) abandon('PDF_PS_LOG');else data+=b;});
    child.stderr.on('data',b=>{if(error.length<1024) error+=b;});
    child.on('error',e=>{failure=e.code;});
    child.on('close',code=>{
      if(settled) return;settled=true;
      clearTimeout(timer);
      if(failure||code!==0||error) return bad(Object.assign(new Error('PDF_PROCESS_OBSERVATION'),{code:failure??'PDF_PROCESS_OBSERVATION'}));
      const rows=[];
      for(const line of data.trim().split('\n')) {
        const m=line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(.+)$/);
        if(!m||!Number.isFinite(Date.parse(m[5]))) return bad(Object.assign(new Error('PDF_PROCESS_OBSERVATION'),{code:'PDF_PROCESS_OBSERVATION'}));
        rows.push({pid:+m[1],parent:+m[2],group:+m[3],rss:+m[4]*1024,start:m[5]});
      }
      ok(rows);
    });
  });
}

// Private fixed callers construct argv below. No caller executable/argv or cap overrides are exported.
async function supervised(command,args,dir,{deadline,signal,env={},worker=false}={}) {
  if(pdfSignalAborted(signal)) pdfFail('PDF_CANCELLED');
  if(deadline<=Date.now()) pdfFail('PDF_TIMEOUT');
  const preflight=await processSnapshot();
  const child=spawn(command,args,{cwd:dir,env:{...ENV,TMPDIR:dir,HOME:dir,...env},detached:worker,stdio:worker?['ignore','pipe','pipe','ipc']:['ignore','pipe','pipe']});
  const observation={pid:child.pid,command:command===NODE?'pinned-node':command.split('/').at(-1),args,start:new Date().toISOString(),exit:null,close:false,signals:[],peakRssBytes:0,peakScratchBytes:0,watchdog:'BEST_EFFORT',reaped:false};
  let stdout=Buffer.alloc(0),stderr=Buffer.alloc(0),reason,spawnError,polling=false,known=new Map(),stopPromise=Promise.resolve(),killTimer,cleanupTimer,closeResolve,pipeTimer,finished=false;
  const capture=rows=>{
    const own=rows.filter(r=>worker?r.group===child.pid:r.pid===child.pid);
    const leader=own.find(r=>r.pid===child.pid);
    if(leader) {
      if(leader.parent!==process.pid||(worker&&leader.group!==child.pid)||preflight.some(r=>r.pid===leader.pid)) pdfFail('PDF_PROCESS_IDENTITY');
      const saved=known.get(leader.pid);
      if(saved&&saved.start!==leader.start) pdfFail('PDF_PROCESS_IDENTITY');
      if(!saved) {
        if(observation.close||child.exitCode!==null||child.signalCode!==null) pdfFail('PDF_PROCESS_IDENTITY');
        known.set(leader.pid,leader);
      }
    }
    for(const row of own) {
      const old=known.get(row.pid);
      if(old&&old.start!==row.start) pdfFail('PDF_PROCESS_IDENTITY');
    }
    // New descendants are enrolled only while the exact leader is alive and through observed ancestry.
    if(leader&&!observation.close&&child.exitCode===null&&child.signalCode===null) {
      let changed=true;
      while(changed) {changed=false;for(const row of own) if(!known.has(row.pid)&&known.has(row.parent)) {known.set(row.pid,row);changed=true;}}
    }
    if(own.some(r=>!known.has(r.pid)||known.get(r.pid).start!==r.start)) pdfFail('PDF_PROCESS_IDENTITY');
    return own;
  };
  async function send(sig) {
    let rows;
    try {rows=await processSnapshot();} catch(e) {
      observation.controlError=e.code;
      if(child.exitCode===null&&child.signalCode===null&&child.pid) {child.kill(sig);observation.signals.push('DIRECT_'+sig);}
      return;
    }
    const own=capture(rows),leader=rows.find(r=>r.pid===child.pid);
    if(leader && (leader.parent!==process.pid || known.get(leader.pid)?.start!==leader.start)) pdfFail('PDF_PROCESS_IDENTITY');
    if(!own.length) return;
    // Group membership is observed before group signals. Unknown/reused identities refuse termination.
    if(worker&&own.some(r=>!known.has(r.pid)||known.get(r.pid).start!==r.start)) pdfFail('PDF_PROCESS_IDENTITY');
    try { if(worker) process.kill(-child.pid,sig); else child.kill(sig); observation.signals.push(sig); }
    catch(e) { if(e.code!=='ESRCH') throw e; }
  }
  function stop(code) {
    if(reason||finished) return;
    reason=code;
    stopPromise=stopPromise.then(()=>send('SIGTERM')).catch(e=>{observation.controlError=e.code;});
    killTimer=setTimeout(()=>{stopPromise=stopPromise.then(()=>send('SIGKILL')).catch(e=>{observation.controlError=e.code;});},200);
    cleanupTimer=setTimeout(()=>{
      observation.controlError='PDF_CLEANUP_TIMEOUT';child.stdout.destroy();child.stderr.destroy();if(child.connected)child.disconnect();child.unref();closeResolve?.();
    },2000);
  }
  for(const [stream,key] of [[child.stdout,'stdout'],[child.stderr,'stderr']]) stream.on('data',b=>{
    const prev=key==='stdout'?stdout:stderr;
    observation[key+'ObservedBytes']=(observation[key+'ObservedBytes']??0)+b.length;
    if(prev.length+b.length>PDF_LIMITS.logBytes) {stop('PDF_LOG_LIMIT');return;}
    if(key==='stdout') stdout=Buffer.concat([prev,b]); else stderr=Buffer.concat([prev,b]);
  });
  const cancel=()=>stop('PDF_CANCELLED');
  if(signal) EventTarget.prototype.addEventListener.call(signal,'abort',cancel,{once:true});
  const timer=setTimeout(()=>stop('PDF_TIMEOUT'),Math.max(1,deadline-Date.now()));
  const sample=setInterval(async()=>{
    if(polling) return; polling=true;
    try {
      const rows=capture(await processSnapshot());
      observation.peakRssBytes=Math.max(observation.peakRssBytes,rows.reduce((n,r)=>n+r.rss,0));
      observation.peakScratchBytes=Math.max(observation.peakScratchBytes,await scratchBytes(dir));
      if(observation.peakRssBytes>PDF_LIMITS.rssBytes) stop('PDF_RSS_LIMIT');
      if(observation.peakScratchBytes>PDF_LIMITS.scratchBytes) stop('PDF_SCRATCH_LIMIT');
    } catch(e) {stop(e.code??'PDF_WATCHDOG');} finally {polling=false;}
  },50);
  await new Promise(done=>{
    closeResolve=done;
    child.on('error',e=>{spawnError=e.code;});
    child.on('exit',(code,sig)=>{observation.exit=code;observation.signal=sig;pipeTimer=setTimeout(()=>{if(!observation.close) stop('PDF_PIPE_HOLD');},250);});
    child.on('close',()=>{observation.close=true;done();});
  });
  finished=true;clearTimeout(timer);clearInterval(sample);clearTimeout(cleanupTimer);clearTimeout(pipeTimer);if(signal) EventTarget.prototype.removeEventListener.call(signal,'abort',cancel);
  if(killTimer) clearTimeout(killTimer);
  // A successful leader must leave no native descendants. Terminate only the observed owned group.
  if(worker) {
    try { const remaining=capture(await processSnapshot()); if(remaining.length) {await send('SIGTERM');await new Promise(r=>setTimeout(r,220));await send('SIGKILL');} }
    catch(e) {observation.controlError=e.code;}
  }
  await stopPromise;
  try {
    const rows=await processSnapshot();
    observation.remainingPids=rows.filter(r=>worker?r.group===child.pid:r.pid===child.pid).map(r=>r.pid);
    observation.reaped=observation.close&&observation.remainingPids.length===0&&(child.exitCode!==null||child.signalCode!==null);
    observation.peakScratchBytes=Math.max(observation.peakScratchBytes,await scratchBytes(dir));
  } catch(e) {observation.controlError=e.code;}
  observation.stdoutBytes=stdout.length;observation.stderrBytes=stderr.length;
  if(!observation.reaped||observation.controlError) reason='PDF_PROCESS_CONTROL';
  if(observation.peakScratchBytes>PDF_LIMITS.scratchBytes) reason='PDF_SCRATCH_LIMIT';
  let workerError;
  if(worker&&stderr.length) {try {workerError=JSON.parse(stderr.toString());} catch { /* Bounded diagnostics remain failure. */ }}
  if(reason||spawnError||observation.exit!==0) throw Object.assign(new Error(reason??spawnError??workerError?.code??'PDF_NATIVE_FAILED'),{code:reason??spawnError??workerError?.code??'PDF_NATIVE_FAILED',observation,diagnostic:stderr.toString()});
  return {stdout:stdout.toString(),stderr:stderr.toString(),observation};
}

export async function startPdfRuntime(request) {
  if(!request||typeof request!=='object'||Object.getPrototypeOf(request)!==Object.prototype) pdfFail('PDF_RUNTIME_REQUEST');
  const descriptors=Object.getOwnPropertyDescriptors(request),keys=Reflect.ownKeys(descriptors);
  if(keys.some(key=>typeof key!=='string'||!['attemptDirectory','deadline','signal'].includes(key))||!['attemptDirectory','deadline'].every(key=>Object.hasOwn(descriptors,key))||keys.some(key=>!descriptors[key].enumerable||!Object.hasOwn(descriptors[key],'value'))) pdfFail('PDF_RUNTIME_REQUEST');
  const attemptDirectory=descriptors.attemptDirectory.value,deadline=descriptors.deadline.value,signal=descriptors.signal?.value;
  checkPdfSignal(signal,'PDF_RUNTIME_REQUEST');
  if(typeof attemptDirectory!=='string'||!attemptDirectory.startsWith(sep)||attemptDirectory!==resolve(attemptDirectory)||dirname(dirname(attemptDirectory))!==PDF_SCRATCH_ROOT||!attemptDirectory.slice(PDF_SCRATCH_ROOT.length+1).split(sep).every(part=>part.length>=1&&part.length<=96&&/^[A-Za-z0-9]/.test(part)&&!/[^A-Za-z0-9_.-]/.test(part)&&part!=='.'&&part!=='..')||!Number.isSafeInteger(deadline)||deadline>Date.now()+PDF_LIMITS.timeoutMs) pdfFail('PDF_RUNTIME_REQUEST');
  if(pdfSignalAborted(signal)) pdfFail('PDF_CANCELLED');
  if(deadline<=Date.now()) pdfFail('PDF_TIMEOUT');
  await verifyMediaTools('PDF');
  if(pdfSignalAborted(signal)) pdfFail('PDF_CANCELLED');
  if(deadline<=Date.now()) pdfFail('PDF_TIMEOUT');
  await checkPdfDirectory(attemptDirectory);
  const result=await supervised(NODE,['--max-old-space-size=256',SELF,'--owned-pdf-worker'],attemptDirectory,{deadline,signal,worker:true,env:{PDF_DEADLINE:String(deadline)}});
  if(result.stderr.trim()) pdfFail('PDF_WORKER_DIAGNOSTIC');
  return result.observation;
}

async function pdfWorker() {
  const dir=process.cwd(),deadline=Number(process.env.PDF_DEADLINE);
  if(!process.send||process.execPath!==NODE||process.execArgv.join(' ')!=='--max-old-space-size=256'||dirname(dirname(dir))!==PDF_SCRATCH_ROOT||!Number.isFinite(deadline)) pdfFail('PDF_INTERNAL_ONLY');
  await checkPdfDirectory(dir);
  const attempt=await lstat(dir);
  if(attempt.uid!==process.getuid()||(attempt.mode&0o777)!==0o700) pdfFail('PDF_ATTEMPT_MODE');
  if(deadline<=Date.now()||!process.connected) pdfFail('PDF_TIMEOUT');
  await verifyMediaTools('PDF');
  if(deadline<=Date.now()||!process.connected) pdfFail('PDF_TIMEOUT');
  const lockBytes=await readRegularFile(resolve(PDF_ROOT,'contracts/media-tool-lock.json'),65536);
  if(pdfSha(lockBytes)!=='2c049b8684ba07916855f009b1a52af77650a118e96090fadc45453f4eb18081') pdfFail('PDF_LOCK');
  const lock=JSON.parse(lockBytes),poppler=lock.poppler,observations=[];
  const env={FONTCONFIG_FILE:poppler.fontConfig.path,FONTCONFIG_PATH:dirname(poppler.fontConfig.path),XDG_CACHE_HOME:dirname(poppler.fontConfig.cacheDir)};
  async function native(kind,input,page,prefix) {
    const args=kind==='info'?[input]:['-png','-singlefile','-f',String(page),'-l',String(page),'-scale-to','1600',input,prefix];
    const result=await supervised(resolve(poppler.root,'bin',kind==='info'?'pdfinfo':'pdftocairo'),args,dir,{deadline,env});
    observations.push(result.observation);
    if(result.stderr.trim()) pdfFail('PDF_DIAGNOSTIC');
    return result.stdout;
  }
  const source=resolve(dir,'source.pdf'),inputBytes=await readRegularFile(source,PDF_LIMITS.inputBytes);
  const metadata=parsePdfInfo(await native('info',source));
  const sharp=(await import('sharp')).default;
  sharp.concurrency(2);sharp.cache(false);
  const {PDFDocument,PDFName}=await import('pdf-lib');
  const document=await PDFDocument.create({updateMetadata:false});
  const pages=[];let webpBytes=0;
  async function decode(path,format='png') {
    const data=await readRegularFile(path,32*1024**2);
    const pipeline=sharp(data,{failOn:'warning',unlimited:false,limitInputPixels:PDF_LIMITS.pixels,pages:1});
    const meta=await pipeline.metadata();
    if(meta.format!==format||(meta.pages??1)!==1||!Number.isInteger(meta.width)||!Number.isInteger(meta.height)||meta.width<1||meta.height<1||Math.max(meta.width,meta.height)>PDF_LIMITS.edge||meta.width*meta.height>PDF_LIMITS.pixels) pdfFail('PDF_RASTER_CAP');
    const raw=await pipeline.ensureAlpha().toColourspace('srgb').raw().toBuffer({resolveWithObject:true});
    if(raw.info.width!==meta.width||raw.info.height!==meta.height||raw.data.length!==meta.width*meta.height*4) pdfFail('PDF_RASTER_DECODE');
    return {raw:raw.data,width:meta.width,height:meta.height};
  }
  async function convertPage(n) {
    const prefix=resolve(dir,'raster');
    try {await lstat(prefix+'.png');pdfFail('PDF_INTERMEDIATE_EXISTS');} catch(e) {if(e.code!=='ENOENT') throw e;}
    await native('render',source,n,prefix);
    const owned=await lstat(prefix+'.png');
    const {raw,width,height}=await decode(prefix+'.png');
    const image=sharp(raw,{raw:{width,height,channels:4}});
    const webp=await image.clone().webp({lossless:true}).toBuffer();
    webpBytes+=webp.length;
    if(webpBytes>PDF_LIMITS.webpBytes) pdfFail('PDF_WEBP_LIMIT');
    const file=`page-${n}.webp`;
    await writeFile(resolve(dir,file),webp,{flag:'wx',mode:0o600});
    const checked=await decode(resolve(dir,file),'webp');
    if(checked.width!==width||checked.height!==height||pdfSha(checked.raw)!==pdfSha(raw)) pdfFail('PDF_WEBP_PIXELS');
    // Public embed() clears the pinned 1.17.1 embedder, allowing raster channels to be collected per page.
    const png=await image.clone().png().toBuffer(),embedded=await document.embedPng(png);
    const page=document.addPage([width,height]);page.drawImage(embedded,{x:0,y:0,width,height});await embedded.embed();
    pages.push({page:n,width,height,pixelSha256:pdfSha(raw),webp:{file,bytes:webp.length,sha256:pdfSha(webp),role:'PDF_PAGE',mime:'image/webp',pageNumber:n}});
    const fresh=await lstat(prefix+'.png'),currentDir=await lstat(dir);
    if(currentDir.ino!==attempt.ino||currentDir.dev!==attempt.dev||currentDir.uid!==attempt.uid||currentDir.mode!==attempt.mode) pdfFail('PDF_ATTEMPT_CHANGED');
    if(fresh.ino!==owned.ino||fresh.dev!==owned.dev||fresh.nlink!==1||!fresh.isFile()) pdfFail('PDF_CLEANUP_OWNER');
    await unlink(prefix+'.png');
  }
  for(let n=1;n<=metadata.pages;n++) {await convertPage(n);if(Date.now()>deadline) pdfFail('PDF_TIMEOUT');}
  const pdf=await document.save({useObjectStreams:false});
  if(pdf.length>PDF_LIMITS.pdfBytes||pdf.length+webpBytes>PDF_LIMITS.combinedBytes) pdfFail('PDF_OUTPUT_LIMIT');
  const output=resolve(dir,'raster-only.pdf');await writeFile(output,pdf,{flag:'wx',mode:0o600});
  // Only the newly built output is loaded. Source PDF is never loaded or copied by pdf-lib.
  const inspected=await PDFDocument.load(pdf,{updateMetadata:false});
  if(inspected.getPageCount()!==metadata.pages||inspected.isEncrypted) pdfFail('PDF_OUTPUT_STRUCTURE');
  const blocked=['OpenAction','AA','AcroForm','Names','Metadata','Outlines','Annots','EmbeddedFiles','JavaScript','Launch','URI'];
  for(const [,object] of inspected.context.enumerateIndirectObjects()) {
    if(typeof object.keys==='function'&&object.keys().some(key=>blocked.includes(key.decodeText()))) pdfFail('PDF_OUTPUT_ACTIVE');
  }
  if(inspected.catalog.has(PDFName.of('AcroForm'))) pdfFail('PDF_OUTPUT_ACTIVE');
  const outputInfo=parsePdfInfo(await native('info',output));if(outputInfo.pages!==metadata.pages) pdfFail('PDF_OUTPUT_PAGES');
  async function inspectPage(page) {
    const prefix=resolve(dir,'proof');await native('render',output,page.page,prefix);
    const owned=await lstat(prefix+'.png');
    const decoded=await decode(prefix+'.png');
    if(decoded.width!==page.width||decoded.height!==page.height||pdfSha(decoded.raw)!==page.pixelSha256) pdfFail('PDF_OUTPUT_PIXELS');
    const fresh=await lstat(prefix+'.png'),currentDir=await lstat(dir);
    if(currentDir.ino!==attempt.ino||currentDir.dev!==attempt.dev||currentDir.uid!==attempt.uid||currentDir.mode!==attempt.mode) pdfFail('PDF_ATTEMPT_CHANGED');
    if(fresh.ino!==owned.ino||fresh.dev!==owned.dev||fresh.nlink!==1||!fresh.isFile()) pdfFail('PDF_CLEANUP_OWNER');
    await unlink(prefix+'.png');
  }
  for(const page of pages) await inspectPage(page);
  const recipe={version:'M3-PARALLEL-PDF-01-v1',limits:PDF_LIMITS,render:lock.poppler.fixedRasterPageRecipe,webp:'lossless-srgb-rgba',pdf:'fresh-embedPng-immediate-embed',lockSha256:pdfSha(lockBytes),runtimeSha256:pdfSha(await readRegularFile(SELF,1024**2)),processorSha256:pdfSha(await readRegularFile(resolve(PDF_ROOT,'cms-api/media-pdf.mjs'),1024**2)),tools:poppler.binaryPins,sharp:lock.packages.sharp.version,pdfLib:lock.packages['pdf-lib'].version};
  await writeFile(resolve(dir,'native-observations.json'),JSON.stringify({private:true,observations}),{flag:'wx',mode:0o600});
  const nativeSummary={count:observations.length,allReaped:observations.every(o=>o.close&&o.reaped&&o.exit===0),peakRssBytes:Math.max(...observations.map(o=>o.peakRssBytes)),peakScratchBytes:Math.max(...observations.map(o=>o.peakScratchBytes))};
  const manifest={version:1,private:true,ready:false,original:{bytes:inputBytes.length,sha256:pdfSha(inputBytes)},recipe,recipeSha256:pdfSha(Buffer.from(JSON.stringify(recipe))),pageCount:metadata.pages,pages,pdf:{file:'raster-only.pdf',bytes:pdf.length,sha256:pdfSha(pdf),role:'PDF_DOWNLOAD',mime:'application/pdf'},webpBytes,combinedBytes:webpBytes+pdf.length,verification:{allPagesDecoded:true,webpPixelsEqual:true,pdfPixelsEqual:true,noSourceComponents:true},nativeSummary};
  validatePdfCandidate(manifest,{originalBytes:inputBytes.length,originalSha256:pdfSha(inputBytes)});
  if(deadline<=Date.now()||!process.connected) pdfFail('PDF_TIMEOUT');
  await writeFile(resolve(dir,'candidate.json'),JSON.stringify(manifest),{flag:'wx',mode:0o600});
}

if(process.argv[1]===SELF) {
  if(process.argv.length!==3||process.argv[2]!=='--owned-pdf-worker') pdfFail('PDF_INTERNAL_ONLY');
  try {await pdfWorker();} catch(e) {process.stderr.write(JSON.stringify({code:e.code??'PDF_WORKER_FAILED',observation:e.observation??null})+'\n');process.exitCode=1;}
}
