// Setup audit only. The future processor supplies owned scratch files, never shell commands.
import {createHash, randomUUID} from 'node:crypto';
import {constants} from 'node:fs';
import {open, lstat, realpath, readdir, mkdir, writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {resolve, dirname, relative, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const SELF=fileURLToPath(import.meta.url);
const NODE=resolve(ROOT,'.local/cache/node/node-v22.23.3-darwin-arm64/bin/node');
const SCRATCH=resolve(ROOT,'.local/media-scratch/m3');
const LOCK_SHA='2c049b8684ba07916855f009b1a52af77650a118e96090fadc45453f4eb18081';
const NODE_PIN={path:'.local/cache/node/node-v22.23.3-darwin-arm64/bin/node',bytes:112925600,sha256:'68f4d07ca49e0500cc135c7e0a445093e228e42e126ac22306d045f0a8c2636b'};
const AUX_INVENTORY_SHA='dc43289f3131f0680f1eede3f916cb93247e97d8b83e01987ae342b0391585c4';
const PACKAGE_INVENTORY_SHA='e8889fa7ca68f8b3661d8a92425501e6b40b185749d24434de805b977491bfe8';
export const MEDIA_LIMITS=Object.freeze({threads:2,heapMiB:256,rssBytes:768*1024**2,logBytes:65536,scratchBytes:256*1024**2,imageMs:30000,videoMs:600000,pdfMs:120000,pdfInputBytes:25*1024**2,pdfPages:48,pdfPixels:4000000,pdfEdge:1600,pdfWebpBytes:32*1024**2,pdfOutputBytes:64*1024**2,pdfCombinedBytes:96*1024**2});
export function detectImageSignature(bytes){
 if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'png';
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'jpeg';
 if(bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP')return 'webp';
 fail('IMAGE_SIGNATURE');
}
const sha=b=>createHash('sha256').update(b).digest('hex');
function fail(code){throw Object.assign(new Error(code),{code});}
export async function readRegularFile(path,maxBytes){
 const abs=resolve(path);let cursor=sep;
 for(const part of abs.split(sep).filter(Boolean)){cursor=resolve(cursor,part);const s=await lstat(cursor);if(s.isSymbolicLink())fail('PATH_LINK');}
 const s=await lstat(abs);if(!s.isFile()||s.nlink!==1)fail('NOT_SINGLE_REGULAR_FILE');if(s.size>maxBytes)fail('INPUT_SIZE');
 const fd=await open(abs,constants.O_RDONLY|constants.O_NOFOLLOW);
 try{const fresh=await fd.stat();if(fresh.ino!==s.ino||fresh.dev!==s.dev||fresh.size!==s.size)fail('INPUT_CHANGED');const data=await fd.readFile();if(data.length>maxBytes||data.length!==s.size)fail('INPUT_CHANGED');return data;}finally{await fd.close();}
}
// This helper checks supplied pins only; it grants no execution authority.
export async function verifyPinnedFiles(root,files){
 for(const p of files){if(typeof p.path!=='string'||p.path.includes('..')||resolve(root,p.path).startsWith(`${resolve(root)}${sep}`)===false)fail('PIN_PATH');const data=await readRegularFile(resolve(root,p.path),p.bytes);if(data.length!==p.bytes||sha(data)!==p.sha256)fail('TOOL_BYTES');}
}
const OPERATION_SCOPES=Object.freeze({IMAGE:'IMAGE',PDF:'PDF',POSTER:'VIDEO',PROBE:'VIDEO',TRANSCODE:'VIDEO',DECODE:'VIDEO',EXTRACT_POSTER:'VIDEO',FIXTURE_VIDEO:'VIDEO',FIXTURE_VIDEO_NO_AUDIO:'VIDEO'});
// Public recipes are fixed source keys; internal audit/worker entry names are not recipes.
export function verificationScopeForOperation(operation){
 if(typeof operation!=='string'||!Object.hasOwn(OPERATION_SCOPES,operation))fail('UNKNOWN_OPERATION');
 return OPERATION_SCOPES[operation];
}
export async function verifyMediaTools(scope='ALL'){
 if(typeof scope!=='string'||!['ALL','IMAGE','PDF','VIDEO'].includes(scope))fail('VERIFICATION_SCOPE');
 if(process.versions.node!=='22.23.3'||resolve(process.execPath)!==NODE)fail('NODE_IDENTITY');
 await verifyPinnedFiles(ROOT,[NODE_PIN]);
 const bytes=await readRegularFile(resolve(ROOT,'contracts/media-tool-lock.json'),65536);if(sha(bytes)!==LOCK_SHA)fail('LOCK_BYTES');const lock=JSON.parse(bytes);
 const inv=await readRegularFile(resolve(ROOT,'.local/cache/m3/task01-npm/installed-file-inventory.json'),4*1024**2);if(sha(inv)!==PACKAGE_INVENTORY_SHA)fail('PACKAGE_INVENTORY');const packageFiles=JSON.parse(inv);const aux=await readRegularFile(resolve(ROOT,'.local/cache/m3/task02/runtime-existing-dependency-inventory.json'),65536);if(sha(aux)!==AUX_INVENTORY_SHA)fail('AUX_INVENTORY');const auxFiles=JSON.parse(aux).files;await verifyPinnedFiles(ROOT,[...packageFiles,...auxFiles]);await exactPackageTree([...packageFiles,...auxFiles]);
 const verified={node:process.versions.node,lockSha256:LOCK_SHA};
 if(scope==='VIDEO'||scope==='ALL'){
  await verifyPinnedFiles(ROOT,[...lock.ffmpeg.binaries,...lock.ffmpeg.staticLibraries]);
  verified.ffmpeg=lock.ffmpeg.binaries.find(p=>p.path.endsWith('/ffmpeg')).path;
  verified.ffprobe=lock.ffmpeg.binaries.find(p=>p.path.endsWith('/ffprobe')).path;
 }
 if(scope==='PDF'||scope==='ALL'){
  await verifyPdfTools(lock);
  verified.pdf='AUDIT_NATIVE_ONLY';verified.poppler=lock.poppler;
 }
 return verified;
}
// These receipts are anchored by the fixed lock; no caller-supplied paths grant authority.
async function pinnedJson(pin){const bytes=await readRegularFile(resolve(ROOT,pin.path),pin.bytes);if(bytes.length!==pin.bytes||sha(bytes)!==pin.sha256)fail('PDF_RECEIPT_BYTES');return JSON.parse(bytes);}
async function verifyPdfTools(lock){
 const p=lock.poppler,inv=await pinnedJson(p.inventory);await verifyPinnedFiles(ROOT,inv.files);
 const allowed=new Set(inv.files.map(f=>resolve(ROOT,f.path))),dirs=new Set(inv.directories.map(d=>resolve(ROOT,d)));
 async function walk(path){const st=await lstat(path);if(st.isSymbolicLink())fail('PDF_TOOL_LINK');if(st.isDirectory()){if(path!==p.root&&!dirs.has(path))fail('PDF_TOOL_TREE');for(const n of await readdir(path))await walk(resolve(path,n));}else if(!st.isFile()||!allowed.has(path)||st.nlink!==1)fail('PDF_TOOL_TREE');}
 await walk(p.root);for(const f of inv.files)if(((await lstat(resolve(ROOT,f.path))).mode&0o777)!==Number(f.mode))fail('PDF_TOOL_MODE');
 for(const path of [dirname(p.fontConfig.path),p.fontConfig.cacheDir])if(((await lstat(path)).mode&0o777)!==0o500)fail('PDF_CACHE_MODE');
 const linkage=await pinnedJson(p.linkageEvidence),bundle=await pinnedJson(lock.supersededBundledPopplerIdentity.inventory);
 // Alias resolution is constrained to the previously reviewed bundle, then byte-pinned to its regular target.
 for(const n of linkage.nodes){const path=resolve(ROOT,n.file.path);if(path.startsWith(p.root+sep))continue;const target=await realpath(path);if(!target.startsWith(bundle.root+sep))fail('PDF_LIBRARY_PATH');const entry=bundle.entries.find(e=>e.type==='file'&&resolve(bundle.root,e.path)===target);if(!entry||entry.bytes!==n.file.bytes||entry.sha256!==n.file.sha256)fail('PDF_LIBRARY_PIN');await verifyPinnedFiles(bundle.root,[entry]);}
 const fonts=bundle.entries.filter(e=>e.type==='file'&&e.path.startsWith('poppler/fonts/')),resources=bundle.entries.filter(e=>e.type==='file'&&e.path.startsWith('poppler/share/poppler/'));await verifyPinnedFiles(bundle.root,[...fonts,...resources]);
 async function exactPinnedTree(root,files){const allowed=new Set(files.map(f=>resolve(ROOT,f.path)));async function scan(path){const st=await lstat(path);if(st.isSymbolicLink())fail('PDF_CLOSURE_LINK');if(st.isDirectory()){for(const n of await readdir(path))await scan(resolve(path,n));}else if(!st.isFile()||st.nlink!==1||!allowed.has(path))fail('PDF_CLOSURE_TREE');}await scan(root);}
 await exactPinnedTree(p.fontConfig.fontDir,fonts.map(f=>({...f,path:resolve(bundle.root,f.path)})));await exactPinnedTree(p.dataDir,resources.map(f=>({...f,path:resolve(bundle.root,f.path)})));
 const headers=await pinnedJson(lock.pdfDevelopmentHeaders.installedInventory);await verifyPinnedFiles(ROOT,headers.files);await exactPinnedTree(lock.pdfDevelopmentHeaders.prefix,headers.files);
 return {candidateFiles:inv.files.length,fonts:fonts.length,libraries:linkage.nodes.length,cachePolicy:'ORDINARY_READONLY',systemRuntimeBytes:'NOT_PINNED'};
}
export async function createAuditScratch(){await mkdir(SCRATCH,{recursive:true,mode:0o700});if(await realpath(SCRATCH)!==SCRATCH)fail('SCRATCH_LINK');const path=resolve(SCRATCH,`audit-${randomUUID()}`);await mkdir(path,{mode:0o700});return path;}
async function exactPackageTree(files){const allowed=new Set(files.map(f=>resolve(ROOT,f.path)));const roots=new Set(files.map(f=>f.path.split('/').slice(0,f.path.split('/')[1].startsWith('@')?3:2).join('/')));async function walk(p){const st=await lstat(p);if(st.isSymbolicLink())fail('PACKAGE_LINK');if(st.isDirectory()){for(const n of await readdir(p))await walk(resolve(p,n));}else if(!st.isFile()||!allowed.has(p)||st.nlink!==1)fail('PACKAGE_TREE');}for(const root of roots)await walk(resolve(ROOT,root));}
async function ownedDir(path){const abs=resolve(path);if(dirname(abs)!==SCRATCH||!/^audit-[a-f0-9-]{36}$/.test(relative(SCRATCH,abs)))fail('SCRATCH_OWNER');if(await realpath(abs)!==abs||(await lstat(abs)).isSymbolicLink())fail('SCRATCH_LINK');return abs;}
async function scratchSize(dir){let size=0;for(const name of await readdir(dir)){const p=resolve(dir,name),s=await lstat(p);if(!s.isFile()||s.nlink!==1)fail('SCRATCH_SPECIAL');size+=s.size;}return size;}
const minimalEnv={PATH:'/usr/bin:/bin',LANG:'C',LC_ALL:'C',VIPS_CONCURRENCY:'2',UV_THREADPOOL_SIZE:'2'};
export function parseProcessSnapshot(text){
 if(typeof text!=='string'||!text.trim()||text.length>1024**2)fail('PROCESS_SNAPSHOT_INVALID');const seen=new Set();return text.trim().split(/\r?\n/).map(line=>{const m=line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+\d{4})$/);if(!m)fail('PROCESS_SNAPSHOT_INVALID');const nums=m.slice(1,5).map(Number);if(nums.some(n=>!Number.isSafeInteger(n)||n<0)||seen.has(nums[0])||!Number.isFinite(Date.parse(m[5])))fail('PROCESS_SNAPSHOT_INVALID');seen.add(nums[0]);return [...nums,m[5]];});
}
async function processRows(){return await new Promise((ok,bad)=>{
 const c=spawn('/bin/ps',['-axo','pid=,ppid=,pgid=,rss=,lstart='],{env:minimalEnv,stdio:['ignore','pipe','pipe']});let text='',done=false,helperControlError=null;
 function reject(error){if(done)return;done=true;clearTimeout(guard);bad(Object.assign(error,{helperControlError}));}
 function stopHelper(){try{c.kill();}catch(e){helperControlError=e.code??e.message;}c.stdout.destroy();c.stderr.destroy();c.unref();}
 const guard=setTimeout(()=>{stopHelper();reject(new Error('RSS_OBSERVATION_TIMEOUT'));},1000);
 c.stdout.on('data',b=>{text+=b;if(text.length>1024**2){stopHelper();reject(new Error('RSS_OBSERVATION_LIMIT'));}});c.stdout.on('error',reject);c.stderr.on('error',reject);c.on('error',reject);
 c.on('close',code=>{if(done)return;try{if(code!==0)throw new Error('RSS_OBSERVATION_UNAVAILABLE');const rows=parseProcessSnapshot(text);done=true;clearTimeout(guard);ok(rows);}catch(e){reject(e);}});
});}
// Fixed callers below construct every argv. No public generic command runner is exported.
async function supervise(command,args,dir,limits={}){
 const {signal:abortSignal,nativeEnv={},...bounds}=limits;if(abortSignal?.aborted)fail('CANCELLED');
 const caps={timeoutMs:MEDIA_LIMITS.videoMs,rssBytes:MEDIA_LIMITS.rssBytes,logBytes:MEDIA_LIMITS.logBytes,scratchBytes:MEDIA_LIMITS.scratchBytes,...bounds};
 const start=Date.now();let reason=null,peakRss=0,peakScratch=0,stdout=Buffer.alloc(0),stderr=Buffer.alloc(0),settled=false,sampling=false;
 const child=spawn(command,args,{cwd:dir,env:{...minimalEnv,TMPDIR:dir,...nativeEnv},detached:true,stdio:command===NODE?['ignore','pipe','pipe','ipc']:['ignore','pipe','pipe']});
 const observations={pid:child.pid,command:relative(ROOT,command),args,start:new Date(start).toISOString(),caps,signals:[],descendantPids:[]};
 const knownOwned=new Map();let termination=Promise.resolve(),controlFailure=null,closeResolve,cleanupTimer;
 const closed=new Promise((ok,bad)=>{closeResolve=ok;child.on('error',bad);child.on('exit',(code,sig)=>{observations.exitEvent={at:new Date().toISOString(),code,signal:sig};if(reason){observations.captureAbandonedAfterOwnedExit=true;child.stdout.destroy();child.stderr.destroy();if(child.connected)child.disconnect();}});child.on('close',(code,sig)=>{observations.closeEvent={at:new Date().toISOString(),code,signal:sig};ok([code,sig]);});});
 function track(rows){if(observations.exitEvent||observations.closeEvent)return;const leader=rows.find(r=>r[0]===child.pid);if(leader&&leader[1]===process.pid&&leader[2]===child.pid&&child.exitCode===null&&child.signalCode===null&&!knownOwned.has(leader[0]))knownOwned.set(leader[0],leader[4]);let changed=true;while(changed){changed=false;for(const r of rows)if(r[2]===child.pid&&knownOwned.get(r[1])&&rows.some(parent=>parent[0]===r[1]&&parent[4]===knownOwned.get(r[1]))&&!knownOwned.has(r[0])){knownOwned.set(r[0],r[4]);changed=true;}}}
 async function signal(sig){
 const rows=await processRows();track(rows);const childRow=rows.find(r=>r[0]===child.pid),group=rows.filter(r=>r[2]===child.pid);
 const attempt={signal:sig,group:child.pid,childLifecycle:{exitCode:child.exitCode,signalCode:child.signalCode},members:group.map(r=>({pid:r[0],ppid:r[1],pgid:r[2],generation:r[4]}))};(observations.signalAttempts??=[]).push(attempt);
 if(!childRow&&group.length===0){attempt.result='NO_LIVE_OWNED_MEMBERS';return;}
 if(childRow&&(observations.exitEvent||observations.closeEvent)){controlFailure='PROCESS_OWNERSHIP_UNKNOWN';attempt.result='STALE_LEADER_PID_AFTER_EXIT_OR_CLOSE';return;}
 if((childRow&&(childRow[1]!==process.pid||childRow[2]!==child.pid||childRow[4]!==knownOwned.get(childRow[0])))||group.some(r=>!knownOwned.has(r[0])||knownOwned.get(r[0])!==r[4])){controlFailure='PROCESS_OWNERSHIP_UNKNOWN';attempt.result=controlFailure;return;}
 try{process.kill(-child.pid,sig);observations.signals.push(sig);attempt.result='GROUP_SIGNAL_SENT';}catch(e){attempt.error=e.code;if(e.code==='ESRCH')return;(observations.signalErrors??=[]).push({signal:sig,code:e.code});if(childRow&&childRow[1]===process.pid&&childRow[4]===knownOwned.get(childRow[0])&&child.exitCode===null&&child.signalCode===null){try{if(child.kill(sig)){(observations.directChildSignals??=[]).push(sig);attempt.result='EXACT_OWNED_CHILD_SIGNAL_SENT';}}catch(d){observations.signalErrors.push({signal:sig,code:d.code,directOwnedChild:true});}}}
 }
 function requestSignal(sig){termination=termination.then(()=>signal(sig)).catch(e=>{controlFailure=e.code??e.message;(observations.controlErrors??=[]).push(controlFailure);});}
 let killTimer;function stop(code){if(reason)return;reason=code;requestSignal('SIGTERM');killTimer=setTimeout(()=>requestSignal('SIGKILL'),200);cleanupTimer=setTimeout(()=>{controlFailure='CLEANUP_TIMEOUT';observations.cleanupExpiredAt=new Date().toISOString();child.stdout.destroy();child.stderr.destroy();if(child.connected)child.disconnect();child.unref();closeResolve([null,'CLEANUP_TIMEOUT']);},1500);}
 for(const [stream,key]of [[child.stdout,'stdout'],[child.stderr,'stderr']])stream.on('data',chunk=>{observations[`${key}ObservedBytes`]=(observations[`${key}ObservedBytes`]??0)+chunk.length;const old=key==='stdout'?stdout:stderr;if(old.length+chunk.length>caps.logBytes){stream.pause();stop('LOG_LIMIT');return;}if(key==='stdout')stdout=Buffer.concat([old,chunk]);else stderr=Buffer.concat([old,chunk]);});
 const cancel=()=>stop('CANCELLED');abortSignal?.addEventListener('abort',cancel,{once:true});
 const timer=setTimeout(()=>stop('TIMEOUT'),caps.timeoutMs);
 const sample=setInterval(async()=>{if(sampling||settled)return;sampling=true;try{const rows=await processRows();track(rows);const group=rows.filter(r=>r[2]===child.pid);peakRss=Math.max(peakRss,group.reduce((n,r)=>n+r[3]*1024,0));observations.descendantPids=[...new Set([...observations.descendantPids,...group.filter(r=>r[0]!==child.pid).map(r=>r[0])])];peakScratch=Math.max(peakScratch,await scratchSize(dir));if(peakRss>caps.rssBytes)stop('RSS_LIMIT');if(peakScratch>caps.scratchBytes)stop('OUTPUT_LIMIT');}catch(e){stop(e.code??e.message);}finally{sampling=false;}},40);
 let exit,signalName;try{[exit,signalName]=await closed;}finally{settled=true;clearInterval(sample);clearTimeout(timer);clearTimeout(cleanupTimer);abortSignal?.removeEventListener('abort',cancel);}
 // A parent may exit while descendants retain pipes or ignore TERM. Always close the owned group.
 requestSignal('SIGTERM');await new Promise(r=>setTimeout(r,220));requestSignal('SIGKILL');clearTimeout(killTimer);await termination;
 let rows=null;try{rows=await processRows();observations.finalSnapshotStatus='VALID';}catch(e){controlFailure=e.code??e.message;observations.finalSnapshotStatus='FAILED';observations.finalSnapshotError={code:controlFailure,helperControlError:e.helperControlError??null};}
 const live=rows?.filter(r=>r[2]===child.pid)??null,liveChild=rows?.find(r=>r[0]===child.pid);observations.finalOwnedChildRow=rows?(liveChild??null):'UNKNOWN';observations.finalChildLifecycle={exitCode:child.exitCode,signalCode:child.signalCode};observations.controlFailure=controlFailure;observations.remainingGroupPids=live?.map(r=>r[0])??null;
 peakScratch=Math.max(peakScratch,await scratchSize(dir));if(peakScratch>caps.scratchBytes&&!reason)reason='OUTPUT_LIMIT';
 Object.assign(observations,{exit,signal:signalName,reason,peakRssBytes:peakRss,peakScratchBytes:peakScratch,stdoutBytes:stdout.length,stderrBytes:stderr.length,durationMs:Date.now()-start,reaped:Boolean(rows)&&live.length===0&&!liveChild&&(child.exitCode!==null||child.signalCode!==null)&&Boolean(observations.closeEvent)});
 if(!observations.reaped||controlFailure){observations.originalCapReason=reason;reason=controlFailure??'GROUP_NOT_REAPED';observations.reason=reason;}
 if(reason||exit!==0)throw Object.assign(new Error(reason??'TOOL_FAILED'),{code:reason??'TOOL_FAILED',observation:observations,stderr:stderr.toString()});return {stdout:stdout.toString(),stderr:stderr.toString(),observation:observations};
}
// Bounded structural check supplements the fixed native dref/protocol options.
export function validateMovReferences(bytes){
 let boxes=0,foundFtyp=false;const containers=new Set(['moov','trak','mdia','minf','dinf','stbl','edts','udta','moof','traf']);
 function walk(start,end,depth){if(depth>12)fail('MOV_STRUCTURE');for(let at=start;at<end;){if(++boxes>20000||end-at<8)fail('MOV_STRUCTURE');let size=bytes.readUInt32BE(at),head=8;const type=bytes.toString('ascii',at+4,at+8);if(size===1){if(end-at<16)fail('MOV_STRUCTURE');const n=bytes.readBigUInt64BE(at+8);if(n>BigInt(Number.MAX_SAFE_INTEGER))fail('MOV_STRUCTURE');size=Number(n);head=16;}else if(size===0)size=end-at;if(size<head||at+size>end)fail('MOV_STRUCTURE');if(type==='ftyp')foundFtyp=true;
 if(type==='dref'){const payload=at+head;if(size<head+8)fail('MOV_STRUCTURE');const count=bytes.readUInt32BE(payload+4);if(count<1||count>64)fail('MOV_STRUCTURE');let p=payload+8;for(let i=0;i<count;i++){if(p+12>at+size)fail('MOV_STRUCTURE');const n=bytes.readUInt32BE(p),entryType=bytes.toString('ascii',p+4,p+8),flags=bytes.readUInt32BE(p+8);if(n<12||p+n>at+size)fail('MOV_STRUCTURE');if(entryType!=='url '||flags!==1||n!==12)fail('VIDEO_EXTERNAL_REFERENCE');p+=n;}if(p!==at+size)fail('MOV_STRUCTURE');}
 if(containers.has(type))walk(at+head,at+size,depth+1);at+=size;}}
 walk(0,bytes.length,0);if(!foundFtyp)fail('MP4_CONTAINER');return true;
}
export function validateVideoMetadata(value){
 if(!value||!Array.isArray(value.streams)||value.streams.length<1||value.streams.length>2)fail('VIDEO_STREAMS');const video=value.streams.filter(s=>s.codec_type==='video'),audio=value.streams.filter(s=>s.codec_type==='audio');if(video.length!==1||audio.length>1||video.length+audio.length!==value.streams.length||video[0].codec_name!=='h264'||audio.some(s=>s.codec_name!=='aac'))fail('VIDEO_STREAMS');
 const v=video[0],duration=Number(value.format?.duration);const [n,d]=String(v.avg_frame_rate).split('/').map(Number),fps=n/d;if(!Number.isFinite(duration)||duration<=0||duration>300||!Number.isFinite(fps)||fps<=0||fps>60||!Number.isInteger(v.width)||!Number.isInteger(v.height)||v.width<1||v.height<1||v.width>1920||v.height>1080)fail('VIDEO_CAP');return {width:v.width,height:v.height,duration,fps,audio:audio.length===1};
}
export async function auditExternalReferences({directory,input}){
 const tools=await verifyMediaTools('VIDEO'),dir=await ownedDir(directory),file=resolve(input);if(dirname(file)!==dir)fail('INPUT_OWNER');await readRegularFile(file,128*1024**2);
 // Low-level audit only: demonstrates the native fixed options with owned reference fixtures.
 return supervise(resolve(ROOT,tools.ffprobe),['-v','warning',...inputOptions,'-count_packets','-show_streams','-show_format','-of','json',file],dir);
}
const inputOptions=['-threads','2','-protocol_whitelist','file,pipe','-format_whitelist','mov','-codec_whitelist','h264,aac','-enable_drefs','0','-use_absolute_path','0','-f','mov'];
async function newOutput(dir,name){const path=resolve(dir,name);try{await lstat(path);fail('OUTPUT_EXISTS');}catch(e){if(e.code!=='ENOENT')throw e;}return path;}
export async function runMediaJob(request){
 const operation=request&&typeof request==='object'?Object.getOwnPropertyDescriptor(request,'operation')?.value:undefined;
 const scope=verificationScopeForOperation(operation),optionError=operation==='PDF'?'PDF_CALLER_OPTIONS':'MEDIA_CALLER_OPTIONS';
 const prototype=Object.getPrototypeOf(request);
 if(prototype!==Object.prototype&&prototype!==null)fail(optionError);
 for(const key of Reflect.ownKeys(request))if(typeof key!=='string'||!['operation','directory','input','signal'].includes(key)||!Object.hasOwn(Object.getOwnPropertyDescriptor(request,key),'value'))fail(optionError);
 const {directory,input,signal}=request;
 const tools=await verifyMediaTools(scope),dir=await ownedDir(directory);
 if(operation==='PDF'){return pdfJob(tools,dir,input,signal);}
 if(operation==='IMAGE'||operation==='POSTER'){
 const file=resolve(input);if(dirname(file)!==dir)fail('INPUT_OWNER');detectImageSignature(await readRegularFile(file,10*1024**2));
 return supervise(NODE,['--max-old-space-size=256',SELF,'--image-worker',operation,file],dir,{timeoutMs:MEDIA_LIMITS.imageMs,signal});
 }
 const ffmpeg=resolve(ROOT,tools.ffmpeg),probe=resolve(ROOT,tools.ffprobe);
 if(operation==='FIXTURE_VIDEO'||operation==='FIXTURE_VIDEO_NO_AUDIO'){
 const out=await newOutput(dir,operation==='FIXTURE_VIDEO'?'audio.mp4':'silent.mp4');
 const args=['-hide_banner','-loglevel','error','-nostdin','-threads','2','-filter_threads','2','-f','lavfi','-i','color=c=red:s=64x48:r=10:d=0.4'];
 if(operation==='FIXTURE_VIDEO')args.push('-f','lavfi','-i','sine=frequency=440:sample_rate=44100:duration=0.4');
 args.push('-c:v','h264_videotoolbox','-allow_sw','0','-require_sw','0','-pix_fmt','yuv420p');if(operation==='FIXTURE_VIDEO')args.push('-c:a','aac','-b:a','64k');else args.push('-an');args.push('-threads','2','-movflags','+faststart','-f','mp4',out);
 return supervise(ffmpeg,args,dir,{signal});
 }
 if(!['PROBE','TRANSCODE','DECODE','EXTRACT_POSTER'].includes(operation))fail('UNKNOWN_OPERATION');
 const file=resolve(input);if(dirname(file)!==dir)fail('INPUT_OWNER');validateMovReferences(await readRegularFile(file,128*1024**2));
 const checked=await supervise(probe,['-v','error',...inputOptions,'-show_streams','-show_format','-of','json',file],dir,{signal});let metadata;try{metadata=validateVideoMetadata(JSON.parse(checked.stdout));}catch(e){e.observation=checked.observation;throw e;}if(operation==='PROBE')return {...checked,metadata};const finish=async promise=>({...await promise,preflightObservation:checked.observation});
 if(operation==='EXTRACT_POSTER'){const out=await newOutput(dir,'poster.png');return finish(supervise(ffmpeg,['-hide_banner','-loglevel','error','-nostdin','-threads','2','-filter_threads','2',...inputOptions,'-i',file,'-map','0:v:0','-frames:v','1','-c:v','png','-threads','2','-f','image2',out],dir,{signal}));}
 if(operation==='DECODE')return finish(supervise(ffmpeg,['-abort_on','empty_output','-hide_banner','-loglevel','error','-nostdin','-threads','2','-filter_threads','2',...inputOptions,'-i',file,'-map','0:v:0','-map','0:a:0?','-f','null','-'],dir,{signal}));
 const out=await newOutput(dir,'safe.mp4');const result=await supervise(ffmpeg,['-hide_banner','-loglevel','error','-nostdin','-threads','2','-filter_threads','2',...inputOptions,'-i',file,'-map','0:v:0','-map','0:a:0?','-vf',"scale=w='min(1280,iw)':h='min(720,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,fps=30",'-c:v','h264_videotoolbox','-allow_sw','0','-require_sw','0','-c:a','aac','-map_metadata','-1','-threads','2','-movflags','+faststart','-f','mp4',out],dir,{signal});if((await lstat(out)).size>48*1024**2)fail('VIDEO_OUTPUT');return {...result,preflightObservation:checked.observation};
}
function pdfDiagnostics(result){if(result.stderr.trim())throw Object.assign(new Error('PDF_DIAGNOSTIC'),{code:'PDF_DIAGNOSTIC',observation:result.observation,stderr:result.stderr});}
async function pdfJob(tools,dir,input,signal,auditCaps={}){
 const file=resolve(input);if(dirname(file)!==dir)fail('INPUT_OWNER');const bytes=await readRegularFile(file,MEDIA_LIMITS.pdfInputBytes);if(!bytes.subarray(0,8).toString('ascii').match(/^%PDF-[12]\.[0-9]/))fail('PDF_SIGNATURE');
 const p=tools.poppler,deadlineMs=auditCaps.timeoutMs??MEDIA_LIMITS.pdfMs,nativeEnv={FONTCONFIG_FILE:p.fontConfig.path,FONTCONFIG_PATH:dirname(p.fontConfig.path),XDG_CACHE_HOME:dirname(p.fontConfig.cacheDir)},observations=[];const began=Date.now();
 async function native(command,args){const remaining=deadlineMs-(Date.now()-began);if(remaining<1)fail('TIMEOUT');try{const r=await supervise(command,args,dir,{...auditCaps,timeoutMs:remaining,signal,nativeEnv});observations.push(r.observation);pdfDiagnostics(r);return r;}catch(e){if(e.observation&&!observations.includes(e.observation))observations.push(e.observation);throw e;}}
 try{
 const info=await native(resolve(p.root,'bin/pdfinfo'),[file]);const pageFields=[...info.stdout.matchAll(/^Pages:[^\r\n]*$/gm)],encryptionFields=[...info.stdout.matchAll(/^Encrypted:[^\r\n]*$/gm)];const fieldError=code=>Object.assign(new Error(code),{code,nativeMetadata:{infoStdout:info.stdout,stdoutSha256:sha(Buffer.from(info.stdout))}});if(pageFields.length!==1||encryptionFields.length!==1||!/^Pages:\s+\d+\s*$/.test(pageFields[0][0])||!/^Encrypted:\s+(?:yes|no)(?:\s|$)/.test(encryptionFields[0][0]))throw fieldError('PDF_METADATA');const pages=Number(pageFields[0][0].match(/\d+/)[0]),encrypted=encryptionFields[0][0].match(/^Encrypted:\s+(yes|no)/)[1];if(encrypted==='yes')throw Object.assign(new Error('PDF_ENCRYPTED'),{code:'PDF_ENCRYPTED',nativeMetadata:{encrypted,infoStdout:info.stdout}});if(encrypted!=='no')fail('PDF_METADATA');if(!Number.isInteger(pages)||pages<1||pages>MEDIA_LIMITS.pdfPages)throw fieldError('PDF_PAGES');
 const rasters=[];for(let page=1;page<=pages;page++){
 await verifyPdfTools(JSON.parse(await readRegularFile(resolve(ROOT,'contracts/media-tool-lock.json'),65536)));const prefix=await newOutput(dir,`page-${page}`);await newOutput(dir,`page-${page}.png`);
 await native(resolve(p.root,'bin/pdftocairo'),['-png','-singlefile','-f',String(page),'-l',String(page),'-scale-to','1600',file,prefix]);rasters.push(`${prefix}.png`);
 }
 const packed=await supervise(NODE,['--max-old-space-size=256',SELF,'--pdf-raster-worker',String(pages)],dir,{...auditCaps,timeoutMs:Math.max(1,deadlineMs-(Date.now()-began)),signal});observations.push(packed.observation);const output=JSON.parse(packed.stdout);await verifyMediaTools('PDF');return {observations,observation:packed.observation,metadata:{pages,encrypted:false},...output};
 }catch(e){e.observations=observations;throw e;}finally{await verifyMediaTools('PDF');}
}
// Audit-only fixed tightening; ordinary PDF jobs never accept caller cap overrides.
export async function runPdfResourceProbe({probe,directory,input}){const caps={timeout:{timeoutMs:3000},logs:{logBytes:1},scratch:{scratchBytes:1},rss:{rssBytes:1024*1024}}[probe];if(!caps)fail('PDF_PROBE_KIND');const tools=await verifyMediaTools('PDF'),dir=await ownedDir(directory);return pdfJob(tools,dir,input,undefined,caps);}
// PDF-lib only constructs a fresh document from fully decoded raster bytes. It never loads source PDF.
export function validatePdfRasterMetadata(meta){if(meta.format!=='png'||(meta.pages??1)!==1||!Number.isInteger(meta.width)||!Number.isInteger(meta.height)||meta.width<1||meta.height<1||meta.width*meta.height>MEDIA_LIMITS.pdfPixels||Math.max(meta.width,meta.height)>MEDIA_LIMITS.pdfEdge)fail('PDF_RASTER_CAP');return true;}
export function validatePdfOutputBytes(webpBytes,pdfBytes){if(!Number.isInteger(webpBytes)||!Number.isInteger(pdfBytes)||webpBytes<0||pdfBytes<0)fail('PDF_OUTPUT_SIZE');if(webpBytes>MEDIA_LIMITS.pdfWebpBytes)fail('PDF_WEBP_OUTPUT');if(pdfBytes>MEDIA_LIMITS.pdfOutputBytes||pdfBytes+webpBytes>MEDIA_LIMITS.pdfCombinedBytes)fail('PDF_COMBINED_OUTPUT');return true;}
async function pdfRasterWorker(pages){
 if(!Number.isInteger(pages)||pages<1||pages>MEDIA_LIMITS.pdfPages)fail('PDF_PAGES');await verifyMediaTools('PDF');await ownedDir(process.cwd());const sharp=(await import('sharp')).default;sharp.concurrency(2);sharp.cache(false);const {PDFDocument}=await import('pdf-lib'),doc=await PDFDocument.create();let webpBytes=0;const pageMetadata=[];
 for(let n=1;n<=pages;n++){const input=resolve(process.cwd(),`page-${n}.png`);detectImageSignature(await readRegularFile(input,32*1024**2));const image=sharp(input,{failOn:'warning',unlimited:false,limitInputPixels:MEDIA_LIMITS.pdfPixels,pages:1});const meta=await image.metadata();validatePdfRasterMetadata(meta);
 const raw=await image.ensureAlpha().toColourspace('srgb').raw().toBuffer({resolveWithObject:true});if(raw.info.width!==meta.width||raw.info.height!==meta.height||raw.data.length!==meta.width*meta.height*4)fail('PDF_RASTER_DECODE');const trusted=sharp(raw.data,{raw:{width:meta.width,height:meta.height,channels:4}});const webp=await trusted.clone().webp().toBuffer();webpBytes+=webp.length;validatePdfOutputBytes(webpBytes,0);await writeFile(resolve(process.cwd(),`page-${n}.webp`),webp,{flag:'wx',mode:0o600});
 const png=await trusted.clone().png().toBuffer(),embedded=await doc.embedPng(png),page=doc.addPage([meta.width,meta.height]);page.drawImage(embedded,{x:0,y:0,width:meta.width,height:meta.height});pageMetadata.push({page:n,width:meta.width,height:meta.height,rawSha256:sha(raw.data),webpBytes:webp.length});}
 const pdf=await doc.save();validatePdfOutputBytes(webpBytes,pdf.length);await writeFile(resolve(process.cwd(),'raster-only.pdf'),pdf,{flag:'wx',mode:0o600});console.log(JSON.stringify({pageMetadata,webpBytes,pdfBytes:pdf.length,outputPdf:'raster-only.pdf'}));
}
// Audit-only fixed resource probes. Callers may tighten caps, never widen them.
export async function runResourceProbe({probe,directory,timeoutMs=500,logBytes=65536,scratchBytes=256*1024**2,rssBytes=768*1024**2}){
 if(!['timeout','logs','output','rss','descendant','cancel'].includes(probe))fail('PROBE_KIND');if(timeoutMs<1||timeoutMs>1000||logBytes<1||logBytes>65536||scratchBytes<1||scratchBytes>MEDIA_LIMITS.scratchBytes||rssBytes<1||rssBytes>MEDIA_LIMITS.rssBytes)fail('PROBE_CAP');await verifyMediaTools('ALL');const dir=await ownedDir(directory);const controller=new AbortController();const timer=probe==='cancel'?setTimeout(()=>controller.abort(),200):null;try{return await supervise(NODE,['--max-old-space-size=256',SELF,'--resource-worker',probe],dir,{timeoutMs,logBytes,scratchBytes,rssBytes,signal:controller.signal});}finally{if(timer)clearTimeout(timer);}
}
async function imageWorker(operation,input){
 if(!['IMAGE','POSTER'].includes(operation))fail('WORKER_MODE');await verifyMediaTools(verificationScopeForOperation(operation));await ownedDir(process.cwd());if(dirname(resolve(input))!==process.cwd())fail('INPUT_OWNER');detectImageSignature(await readRegularFile(input,10*1024**2));const sharp=(await import('sharp')).default;sharp.concurrency(2);sharp.cache(false);
 
 const metadata=await sharp(input,{failOn:'warning',unlimited:false,limitInputPixels:40000000,pages:1}).metadata();if(!['jpeg','png','webp'].includes(metadata.format)||metadata.width>8192||metadata.height>8192||(metadata.pages??1)!==1)fail('IMAGE_METADATA');
 let bytes=0;for(const width of operation==='POSTER'?[1280]:[320,960,1920]){const out=resolve(dirname(input),operation==='POSTER'?'poster.webp':`image-${width}.webp`);const value=await sharp(input,{failOn:'warning',unlimited:false,limitInputPixels:40000000,pages:1}).rotate().toColourspace('srgb').resize({width,withoutEnlargement:true}).webp().toBuffer();bytes+=value.length;if(bytes>(operation==='POSTER'?1:12)*1024**2)fail('IMAGE_OUTPUT');await writeFile(out,value,{flag:'wx',mode:0o600});}console.log(JSON.stringify({format:metadata.format,width:metadata.width,height:metadata.height,outputBytes:bytes}));
}
if(process.argv[1]===SELF){
 const args=process.argv.slice(2),[mode,value,input]=args;
 if(!['--pdf-raster-worker','--image-worker','--resource-worker'].includes(mode)||args.length!==(mode==='--image-worker'?3:2))fail('CLI_ARGUMENTS');
 if(mode==='--image-worker'&&!['IMAGE','POSTER'].includes(value))fail('CLI_ARGUMENTS');
 if(mode==='--pdf-raster-worker'&&(!/^[1-9][0-9]*$/.test(value)||Number(value)>MEDIA_LIMITS.pdfPages))fail('PDF_PAGES');
 if(mode==='--resource-worker'&&!['timeout','logs','output','rss','descendant','cancel'].includes(value))fail('WORKER_MODE');
 if(!process.send||process.execArgv.join(' ')!=='--max-old-space-size=256')fail('INTERNAL_WORKER_ONLY');
 if(mode==='--pdf-raster-worker')await pdfRasterWorker(Number(value));
 else if(mode==='--image-worker')await imageWorker(value,input);
 else if(mode==='--resource-worker'){
  await verifyMediaTools('ALL');await ownedDir(process.cwd());
  if(value==='logs')setInterval(()=>process.stdout.write('x'.repeat(8192)),1);
  else if(value==='output'){await writeFile(resolve(process.cwd(),'probe-output'),Buffer.alloc(2*1024**2));setInterval(()=>{},100);}
  else if(value==='rss'){const buffers=[];setInterval(()=>buffers.push(Buffer.alloc(8*1024**2,1)),5);}
  else if(value==='descendant'){spawn(NODE,['-e',"process.on('SIGTERM',()=>{});setInterval(()=>{},100)"],{stdio:'inherit',env:minimalEnv});process.on('SIGTERM',()=>{});setInterval(()=>{},100);}
  else if(['timeout','cancel'].includes(value)){process.on('SIGTERM',()=>{});setInterval(()=>{},100);}
  else fail('WORKER_MODE');
 }else fail('CLI_ARGUMENTS');
}
