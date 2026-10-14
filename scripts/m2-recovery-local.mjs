/** Parallel read-only M2 control lane. No fixture, SDK, export or signal operation. */
import path from 'node:path';
import * as fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {mkdirSync,lstatSync,realpathSync,openSync,closeSync,writeSync,writeFileSync,existsSync,readdirSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {canonicalJson} from '../contracts/draft.mjs';
import {installNetworkFence} from './local-guard.mjs';
import {M2_PORTS,m2Root,m2Read,m2Sources,m2UiSources,m2ClosureSources,m2Environment,m2Plan,m2SocketPath,installM2PortFence,assertM2Release,assertM2Pins,assertM2Metadata,assertM2Admission,assertM2Manifest,validateM2Config,validateM2RetainedIdentity,validateM2Ownership,validateM2Catalog,validateM2Manifest,assertM2Amendment,readM2HistoricalLinks,M2_AMENDMENT_PINS,M2_VITE_PINS} from './m2-recovery-profile.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ownPath=fileURLToPath(import.meta.url);
const fail=reason=>{throw new Error(`M2_RECOVERY_HOLD: ${reason}`);};
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const safeEnv={PATH:'/usr/bin:/bin:/usr/sbin:/sbin',TZ:'Asia/Ho_Chi_Minh'};
const PROJECT='demo-pinky-lamb-cms';
const digest=value=>createHash('sha256').update(typeof value==='string' || Buffer.isBuffer(value)?value:canonicalJson(value)).digest('hex');
export const M2_BROWSER_ARGS=Object.freeze(['--experimental-vm-modules','--test','--test-name-pattern=^live:','tests/m2-recovery.local.test.mjs']);
export const M2_PHASES=Object.freeze(['inventory-before','fixtures','auth-custody','inventory-after','reconcile','ui-build','ui-serve','ui-privacy','ui-browser']);
export const M2_COLLECTIONS=Object.freeze(['cmsMembers','cmsDrafts','cmsSiteImports','cmsSiteSources','cmsIdempotency','cmsAudit','cmsSnapshots','cmsReviewStates','cmsReviews','cmsSourceChecks']);
export const M2_PRIVATE_CASES=Object.freeze(['/cms-recovery-api/index.mjs','/cms-api/authorization.mjs','/.local/cache/cms-recovery-001/v2/private','/contracts/baseline-site.json','/infra-local/firebase.m2-recovery.json','/scripts/m2-recovery-profile.mjs','/node_modules/pinky-lamb-cms-recovery-api-local/index.mjs']);
function command(binary,args){
 const result=spawnSync(binary,args,{encoding:'utf8',timeout:2000,maxBuffer:1024*1024,env:safeEnv});
 if(result.error || result.signal || result.status!==0)fail('native metadata unavailable');return result.stdout;
}
function processRow(pid){
 const line=command('/bin/ps',['-p',String(pid),'-o','pid=,ppid=,pgid=,lstart=,command=']).trim();
 const m=line.match(/^(\d+)\s+(\d+)\s+(\d+)\s+([A-Z][a-z]{2}\s+[A-Z][a-z]{2}\s+\d+\s+\d{2}:\d{2}:\d{2}\s+\d{4})\s+(.+)$/);
 if(!m || Number(m[1])!==pid)fail('process generation');
 const cwdLines=command('/usr/sbin/lsof',['-a','-p',String(pid),'-d','cwd','-Fn']).split('\n').filter(x=>x.startsWith('n'));
 if(cwdLines.length!==1)fail('process cwd');
 return {pid:Number(m[1]),ppid:Number(m[2]),pgid:Number(m[3]),start:m[4].replace(/\s+/g,' '),argv:m[5],cwd:cwdLines[0].slice(1)};
}
function listenerNames(pid){
 return command('/usr/sbin/lsof',['-nP','-a','-p',String(pid),'-iTCP','-sTCP:LISTEN','-Fn']).split('\n').filter(x=>x.startsWith('n')).map(x=>x.slice(1)).sort();
}
export function observeM2Retained(){
 return {observed_at_utc:new Date().toISOString(),owners:[65804,15465].map(pid=>({...processRow(pid),listeners:listenerNames(pid)}))};
}
export function assertM2PortsFree(){
 // lsof exit 1 with empty stdout is its no-listener result; every other failure holds.
 for(const port of [5175,...Object.values(M2_PORTS)]){
  const r=spawnSync('/usr/sbin/lsof',['-nP',`-iTCP:${port}`,'-sTCP:LISTEN','-Fp'],{encoding:'utf8',timeout:2000,maxBuffer:65536,env:safeEnv});
  if(r.error || r.signal || r.status!==1 || r.stdout.trim() || r.stderr.trim())fail(`candidate port ${port} occupied or unproven`);
 }
 return true;
}
function writePrivate(target,value){writeFileSync(target,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});}
function privateAncestors(target){
 if(!target.startsWith(`${ROOT}/.local/cache/cms-recovery-001/v2/`))fail('output outside new custody');
 let current=ROOT;
 for(const part of path.relative(ROOT,target).split('/')){
  current=path.join(current,part);let s;
  try{s=lstatSync(current);}catch(e){if(e.code!=='ENOENT')throw e;mkdirSync(current,{mode:0o700});s=lstatSync(current);}
  if(!s.isDirectory() || s.isSymbolicLink() || s.uid!==process.getuid() || realpathSync(current)!==current)fail('custody directory type/owner');
 }
}
export async function m2Deadline(operation,milliseconds=120000){
 if(typeof operation!=='function' || !Number.isSafeInteger(milliseconds) || milliseconds<1 || milliseconds>120000)fail('bounded deadline');
 const controller=new AbortController(),deadline=Date.now()+milliseconds;let closed=false,timer;
 const assertActive=()=>{if(closed || Date.now()>=deadline)fail('native operation deadline; preserve pending state');};
 const context={deadline,signal:controller.signal,assertActive,remaining:()=>{assertActive();return deadline-Date.now();}};
 try{return await Promise.race([Promise.resolve().then(()=>{assertActive();return operation(context);}),new Promise((_resolve,reject)=>{timer=setTimeout(()=>{closed=true;controller.abort();reject(new Error('M2_RECOVERY_HOLD: native operation deadline; preserve pending state'));},milliseconds);})]);}
 finally{closed=true;controller.abort();clearTimeout(timer);}
}
export function createM2BoundedCapture(write,{cap=256*1024}={}){
 if(typeof write!=='function' || !Number.isSafeInteger(cap) || cap<1 || cap>256*1024)fail('log capture cap');
 let received=0,captured=0,exceeded=false,stopped=false;
 return {
  add(chunk){
   if(!Buffer.isBuffer(chunk))fail('log chunk must be bytes');
   received+=chunk.length;if(!Number.isSafeInteger(received))fail('log byte count overflow');
   const take=stopped?0:Math.min(chunk.length,cap-captured);
   if(take){write(chunk.subarray(0,take));captured+=take;}
   if(received>cap)exceeded=true;return {received,captured,cap,exceeded};
  },
  stop(){stopped=true;},
  snapshot(){return {received,captured,cap,exceeded,stopped};}
 };
}
function validateHistoricalSlot2(attempts,amendment){
 if(!Array.isArray(attempts) || attempts.length!==1)fail('cumulative slot2 requires exactly closed slot1; no slot3/replay');
 const old=attempts[0],done=old?.completion;
 if(amendment?.approval_sha256!==M2_AMENDMENT_PINS.approval || amendment.additional_attempt!==2 || old.task!=='CMS-RECOVERY-001' || old.revision!==2 || old.number!==1 || old.status!=='ADMITTED_COMPLETION_UNKNOWN' || !Array.isArray(old.sources) || old.sources.length!==9 || old.runRoot!==m2Root(old.runToken) || !old.attemptId || done?.task!=='CMS-RECOVERY-001' || done.revision!==2 || done.number!==1 || done.status!=='CLOSED_SAFE_NO_PENDING_OR_LIVE_CHILDREN' || done.original_admission_preserved!==true || done.runToken!==old.runToken || done.runRoot!==old.runRoot || done.attemptId!==old.attemptId || !equal(done.sources,old.sources) || done.approval_sha256!==M2_AMENDMENT_PINS.approval || done.closure_high_review?.sha256!==M2_AMENDMENT_PINS.closure)fail('unknown/open/drifting slot1 or amendment');return 2;
}
export function validateM2AttemptHistory(attempts,amendment){
 if(amendment?.additional_attempt===2)return validateHistoricalSlot2(attempts,amendment);
 if(!Array.isArray(attempts) || attempts.length!==2 || amendment?.additional_attempt!==3 || amendment.approval_sha256!==M2_VITE_PINS.approval)fail('cumulative slot3 requires exactly closed slots1/2; no slot4/replay');
 validateHistoricalSlot2([attempts[0]],{approval_sha256:M2_AMENDMENT_PINS.approval,additional_attempt:2});
 const old=attempts[1],done=old?.completion;
 if(old?.task!=='CMS-RECOVERY-001' || old.revision!==2 || old.number!==2 || old.status!=='ADMITTED_COMPLETION_UNKNOWN' || old.approval_sha256!==M2_AMENDMENT_PINS.approval || !Array.isArray(old.sources) || old.sources.length!==9 || old.runRoot!==m2Root(old.runToken) || !old.attemptId || done?.task!=='CMS-RECOVERY-001' || done.revision!==2 || done.number!==2 || done.status!=='CLOSED_OWNED_PROCESSES_ABSENT_PRIVATE_EXPORT_PRESERVED' || done.original_admission_preserved!==true || done.no_pending_known_owned_children!==true || done.runToken!==old.runToken || done.runRoot!==old.runRoot || done.attemptId!==old.attemptId || !equal(done.sources,old.sources) || done.original_approval_sha256!==M2_AMENDMENT_PINS.approval || done.approval_sha256!==M2_VITE_PINS.approval || done.closure_high_review?.sha256!==M2_VITE_PINS.closure)fail('unknown/open/drifting slot2 or Vite amendment');return 3;
}
export function m2AtomicAttempt(writeExclusive,record){
 if(typeof writeExclusive!=='function' || record?.task!=='CMS-RECOVERY-001' || record.revision!==2 || !Number.isSafeInteger(record.number) || record.number!==3)fail('atomic attempt identity');
 try{writeExclusive(record);}catch(error){if(error.code==='EEXIST')fail('concurrent or replayed admission; preserve active state');throw error;}return record;
}
function claimM2Attempt(runtime){
 assertM2Amendment();const epoch=path.join(ROOT,'.local/cache/cms-recovery-001/v2/epoch');
 const names=readdirSync(epoch).sort();if(!equal(names,['attempt-1.json','attempt-2.json','complete-1.json','complete-2.json']))fail('cumulative slot3 unavailable/consumed/unknown epoch; no slot4');
 const read=name=>JSON.parse(m2Read(path.relative(ROOT,path.join(epoch,name)),65536,{privateFile:true}));
 const previous=read('attempt-1.json');previous.completion=read('complete-1.json');
 const second=read('attempt-2.json');second.completion=read('complete-2.json');
 const number=validateM2AttemptHistory([previous,second],{approval_sha256:M2_VITE_PINS.approval,additional_attempt:3});
 m2AtomicAttempt(record=>writePrivate(path.join(epoch,'attempt-3.json'),record),{task:'CMS-RECOVERY-001',revision:2,number,runToken:path.basename(runtime.runRoot),runRoot:runtime.runRoot,attemptId:runtime.attemptId,sources:runtime.sources,approval_sha256:M2_VITE_PINS.approval,previous_completion_sha256:M2_VITE_PINS.completion,admitted_at_utc:new Date().toISOString(),status:'ADMITTED_COMPLETION_UNKNOWN'});return number;
}
export function prepareM2Runtime(input=process.env){
 const release=assertM2Release();assertM2Pins();assertM2Metadata();validateM2Config(JSON.parse(m2Read('infra-local/firebase.m2-recovery.json')));
 const retained=observeM2Retained();validateM2RetainedIdentity(release.retained_baseline,retained);
 assertM2PortsFree();
 const token=randomBytes(16).toString('base64url'),runRoot=m2Root(token),environment=m2Environment(runRoot,input),plan=m2Plan(runRoot);
 const runtime={task:'CMS-RECOVERY-001',revision:2,attemptId:randomUUID(),runRoot,plan,environment,retained,sources:m2Sources(),closure_sources:m2ClosureSources(),created_at_utc:new Date().toISOString()};
 runtime.attemptNumber=claimM2Attempt(runtime);
 process.umask(0o077);privateAncestors(path.dirname(runRoot));mkdirSync(runRoot,{mode:0o700});
 for(const suffix of ['cwd','tmp','config','config/configstore','cache','data','discovery','profiles'])mkdirSync(path.join(runRoot,suffix),{mode:0o700});
 writePrivate(path.join(runRoot,'config/configstore/firebase-tools.json'),{usage:false});
 writePrivate(path.join(runRoot,'prepared.json'),{...runtime,environment:'PRIVATE_ENV_CONSTRUCTED_NOT_SERIALIZED',native:'NOT_RUN',SDK:'NOT_RUN',data:'NOT_RUN'});
 return runtime;
}
export async function m2HubJSON(url,control,{cap=65536,fetchImpl=fetch}={}){
 control.assertActive();if(!['http://127.0.0.1:4401/','http://127.0.0.1:4401/emulators'].includes(url) || cap!==65536)fail('fixed Hub GET request');
 const signal=AbortSignal.any([control.signal,AbortSignal.timeout(Math.min(1500,control.remaining()))]);
 let response;try{response=await fetchImpl(url,{method:'GET',redirect:'error',signal});}catch(error){
  control.assertActive();throw Object.assign(new Error(`new Hub connect: ${error.name}`),{stage:'HUB_CONNECT',transient:error.name==='TimeoutError' || error instanceof TypeError && ['ECONNREFUSED','ECONNRESET'].includes(error.cause?.code)});
 }
 control.assertActive();if(response.status!==200)fail(`new Hub HTTP status ${response.status}`);const chunks=[];let bytes=0;
 for await(const part of response.body){control.assertActive();bytes+=part.length;if(bytes>cap)fail('Hub response cap');chunks.push(part);}
 control.assertActive();return JSON.parse(Buffer.concat(chunks));
}
export function validateM2HubIdentity(hub,pid){
 const object=x=>x!==null && typeof x==='object' && !Array.isArray(x) && Object.getPrototypeOf(x)===Object.prototype;
 if(!object(hub))fail('new Hub root/map shape');
 if(hub.version!=='15.33.0' || hub.pid!==pid || hub.host!=='127.0.0.1' || hub.port!==4401 || !equal(hub.origins,['http://127.0.0.1:4401']) || Object.keys(hub).some(k=>!['version','pid','host','port','origins'].includes(k)))fail('new Hub identity');return true;
}
export function validateM2Hub(hub,map,pid){
 const object=x=>x!==null && typeof x==='object' && !Array.isArray(x) && Object.getPrototypeOf(x)===Object.prototype;
 if(!object(hub) || !object(map))fail('new Hub root/map shape');
 validateM2HubIdentity(hub,pid);
 if(!equal(Object.keys(map).sort(),Object.keys(M2_PORTS).sort()))fail('new Hub exact service map');
 for(const [name,port] of Object.entries(M2_PORTS)){
  const i=map[name];if(!object(i) || i.name!==name || i.host!=='127.0.0.1' || i.port!==port || Object.keys(i).some(k=>!['name','host','port','listen'].includes(k)))fail('new Hub service identity');
  if(i.listen!==undefined && (!Array.isArray(i.listen) || i.listen.length!==1 || !object(i.listen[0]) || i.listen[0].address!=='127.0.0.1' || i.listen[0].port!==port || i.listen[0].family!=='IPv4' || Object.keys(i.listen[0]).some(k=>!['address','port','family'].includes(k))))fail('new Hub listener');
  if(i.listen===undefined && !['functions','eventarc','tasks'].includes(name))fail('new Hub missing listeners');
 }
 return true;
}
export function observeM2Owned(runtime,pid,{parentPid=process.pid}={}){
 const leader=processRow(pid),group=command('/bin/ps',['-axo','pid=,pgid=']).trim().split('\n').map(x=>x.trim().split(/\s+/).map(Number)).filter(x=>x[1]===pid).map(x=>x[0]);
 if(!group.includes(pid))fail('new process group unavailable');
 const rows=group.map(id=>{
  const row=id===pid?leader:processRow(id);
  const profile=JSON.parse(m2Read(`${path.relative(ROOT,runtime.runRoot)}/profiles/profile-${id}.json`,1024*1024,{privateFile:true}));
  if(!equal(Object.fromEntries(Object.keys(row).map(k=>[k,profile[k]])),row) || !equal(profile.sources,runtime.sources) || !equal(profile.closure_sources,runtime.closure_sources))fail('fresh source-bound child receipt');
  return id===pid?row:{...row,profile:profile.profile};
 });
 if(leader.argv!==`${runtime.plan.node} ${runtime.plan.args.join(' ')}` || leader.ppid!==parentPid)fail('new CLI operator ownership');
 const listeners=listenerNames(pid).map(x=>{const m=x.match(/^127\.0\.0\.1:(\d+)$/);if(!m)fail('non-loopback new listener');return {pid,address:'127.0.0.1',port:Number(m[1])};});
 const record={runRoot:runtime.runRoot,leader};validateM2Ownership(record,rows,listeners);return {record,rows,listeners};
}
export function validateM2DiscoveryProfile(proof,runtime,leaderPid){
 const source=path.join(ROOT,'cms-recovery-api'),bin=path.join(ROOT,'node_modules/firebase-functions/lib/bin/firebase-functions.js'),shebang=path.join(ROOT,'node_modules/.bin/firebase-functions');
 if(!proof || proof.profile!=='discovery' || proof.node!==runtime.plan.node || proof.version!=='v22.23.3' || proof.cwd!==source || proof.ppid!==leaderPid || proof.pgid!==leaderPid || !Number.isSafeInteger(proof.pid) || !proof.start || !equal(proof.sources,runtime.sources) || !equal(proof.closure_sources,runtime.closure_sources) || ![`${runtime.plan.node} ${bin} ${source}`,`${runtime.plan.node} ${shebang} ${source}`,`node ${shebang} ${source}`].includes(proof.argv))fail('new native discovery source/argv proof');return true;
}
function readM2DiscoveryState(runtime){
 const read=name=>{
  const absolute=path.join(runtime.runRoot,name),parent=lstatSync(path.dirname(absolute));if(!parent.isDirectory() || parent.isSymbolicLink() || parent.uid!==process.getuid() || (parent.mode&0o777)!==0o700 || realpathSync(path.dirname(absolute))!==path.dirname(absolute))fail('discovery evidence parent');
  try{lstatSync(absolute);}catch(error){if(error.code==='ENOENT')return undefined;throw error;}
  return JSON.parse(m2Read(path.relative(ROOT,absolute),1024*1024,{privateFile:true}));
 };
 const admission=read('discovery-admission.json'),completion=read('discovery-completion.json'),ready=read('controller-ready.json');
 if(completion===undefined)return {admission,completion,ready};
 const profile=read(`profiles/profile-${completion.pid}.json`),manifest=assertM2Manifest(runtime.runRoot);return {admission,completion,ready,profile,manifest};
}
export async function waitM2Discovery(runtime,control,leaderPid,{readState=()=>readM2DiscoveryState(runtime),delay=ms=>new Promise(resolve=>setTimeout(resolve,ms)),check=()=>{}}={}){
 const validate=value=>{
  if(!value || value.task!=='CMS-RECOVERY-001' || value.revision!==2 || value.projectId!==PROJECT || value.runToken!==path.basename(runtime.runRoot) || value.parentPid!==leaderPid || value.source!==path.join(ROOT,'cms-recovery-api') || value.manifestPath!==path.join(runtime.runRoot,'discovery/functions.yaml') || !equal(value.sources,runtime.sources) || !equal(value.closure_sources,runtime.closure_sources) || !Number.isSafeInteger(value.pid) || value.pid<1)fail('source-bound discovery completion identity');
 };
 while(true){
  control.assertActive();check();const state=readState();
  if(!state || typeof state!=='object' || Array.isArray(state))fail('discovery readiness shape');
  if(state.admission!==undefined){validate(state.admission);if(state.admission.status!=='DISCOVERY_ADMITTED_COMPLETION_UNKNOWN')fail('discovery admission status');}
  if(state.ready!==undefined){validate(state.ready);if(state.ready.pid!==leaderPid || state.ready.status!=='START_ALL_RESOLVED')fail('controller startup completion');}
  if(state.completion!==undefined){
   validate(state.completion);if(!state.admission || state.completion.pid!==state.admission.pid || state.completion.status!=='DISCOVERY_EXITED' || state.completion.exitCode!==0 || state.completion.signal!==null)fail('discovery exit did not complete safely');
   validateM2DiscoveryProfile(state.profile,runtime,leaderPid);if(state.profile.pid!==state.completion.pid || !state.manifest || !Number.isSafeInteger(state.manifest.bytes) || state.manifest.bytes<1 || state.manifest.bytes>65536 || !/^[a-f0-9]{64}$/.test(state.manifest.sha256))fail('completed discovery private manifest');
   validateM2Manifest(state.manifest.value);if(state.ready)return state;
  }
  await delay(Math.min(50,control.remaining()));control.assertActive();check();
 }
}
export function validateM2NativeEntry({discovery,worker,api,manifest,ownership},runtime){
 const source=path.join(ROOT,'cms-recovery-api'),workerBin=path.join(ROOT,'node_modules/firebase-tools/lib/emulator/functionsEmulatorRuntime');
 for(const p of [discovery,worker])if(!p || p.node!==runtime.plan.node || p.version!=='v22.23.3' || p.cwd!==source || p.ppid!==ownership.record.leader.pid || p.pgid!==ownership.record.leader.pid || !p.start || !equal(p.sources,runtime.sources) || !equal(p.closure_sources,runtime.closure_sources))fail('new discovery/worker source proof');
 validateM2DiscoveryProfile(discovery,runtime,ownership.record.leader.pid);if(!manifest?.sha256)fail('new native discovery manifest');
 if(worker.profile!=='worker' || ![`${runtime.plan.node} ${workerBin}`,`${runtime.plan.node} ${workerBin}.js`].includes(worker.argv) || !ownership.rows.some(r=>r.pid===worker.pid && r.start===worker.start && r.argv===worker.argv) || worker.effectiveSocket!==m2SocketPath(worker.canonicalSocket,source,runtime.runRoot))fail('new native worker/socket entry');
 if(!api || api.task!=='CMS-RECOVERY-001' || api.revision!==2 || api.pid!==worker.pid || api.ppid!==worker.ppid || api.entry!=='cms-recovery-api/index.mjs' || api.status!==401 || api.code!=='UNAUTHENTICATED' || api.authorizationInput!=='ABSENT' || api.SDK!=='LOADED_EXISTING_AUTHORIZATION_MODULE' || api.authenticatedAuthFirestoreRpc!=='NOT_RUN_NO_BEARER' || api.canonicalSocket!==worker.canonicalSocket || api.effectiveSocket!==worker.effectiveSocket || !equal(api.sources,runtime.sources) || !equal(api.closure_sources,runtime.closure_sources))fail('new API anonymous source receipt');
 return true;
}
async function proveM2Entry(runtime,control,pid){
 control.assertActive();const manifest=assertM2Manifest(runtime.runRoot);
 const response=await fetch('http://127.0.0.1:5002/demo-pinky-lamb-cms/us-central1/cmsApi/api/cms/session',{method:'GET',redirect:'error',signal:AbortSignal.any([control.signal,AbortSignal.timeout(Math.min(5000,control.remaining()))])});
 const chunks=[];let bytes=0;
 for await(const part of response.body){control.assertActive();bytes+=part.length;if(bytes>65536)fail('anonymous API response cap');chunks.push(part);}
 control.assertActive();const body=JSON.parse(Buffer.concat(chunks));
 if(response.status!==401 || body?.error?.code!=='UNAUTHENTICATED')fail(`anonymous new API expected401 received${response.status}`);
 const ownership=observeM2Owned(runtime,pid),profiles=readdirSync(path.join(runtime.runRoot,'profiles')).map(name=>{
  if(!/^profile-\d+\.json$/.test(name))fail('unknown new profile receipt');return JSON.parse(m2Read(`${path.relative(ROOT,runtime.runRoot)}/profiles/${name}`,1024*1024,{privateFile:true}));
 });
 const workers=profiles.filter(p=>p.profile==='worker' && ownership.rows.some(r=>r.pid===p.pid));
 const discoveries=profiles.filter(p=>p.profile==='discovery');
 if(workers.length!==1 || discoveries.length!==1)fail('exact one new discovery and current HTTP worker required');
 const worker=workers[0],discovery=discoveries[0],api=JSON.parse(m2Read(`${path.relative(ROOT,runtime.runRoot)}/anonymous-session-${worker.pid}.json`,1024*1024,{privateFile:true}));
 const socket=path.resolve(path.join(ROOT,'cms-recovery-api'),worker.effectiveSocket),stat=lstatSync(socket);
 if(!stat.isSocket() || stat.uid!==process.getuid() || socket!==worker.canonicalSocket)fail('new native Unix socket type/owner');
 validateM2NativeEntry({discovery,worker,api,manifest,ownership},runtime);
 return {manifest,discovery,worker,api,ownership,socket:{canonical:socket,effective:worker.effectiveSocket,type:'UNIX_SOCKET',ownerUid:stat.uid},anonymous:{status:response.status,code:body.error.code,bytes},SDK:'MODULE_LOADED_EXISTING_AUTHORIZATION',authenticatedAuthFirestoreRpc:'NOT_RUN_NO_BEARER'};
}
async function proveM2WriteDeny(runtime,control,entry){
 const cases=[];
 for(const [method,pathname,name] of [['PATCH','/api/cms/drafts/home-v2','draft'],['POST','/api/cms/snapshots','snapshots'],['POST','/api/cms/reviews','reviews'],['POST','/api/cms/source-checks','source-checks']]){
  control.assertActive();const response=await fetch(`http://127.0.0.1:5002/demo-pinky-lamb-cms/us-central1/cmsApi${pathname}`,{method,headers:{Origin:'http://127.0.0.1:5175','Content-Type':'application/json'},body:'{}',redirect:'error',signal:AbortSignal.any([control.signal,AbortSignal.timeout(Math.min(3000,control.remaining()))])});
  const body=await readM2JSON(response,control,65536);
  if(response.status!==405 || body.error?.code!=='METHOD_NOT_ALLOWED')fail('native write denial expected405');
  const receipt=JSON.parse(m2Read(`${path.relative(ROOT,runtime.runRoot)}/write-deny-${entry.worker.pid}-${name}.json`,1024*1024,{privateFile:true}));
  if(receipt.pid!==entry.worker.pid || receipt.status!==405 || receipt.code!=='METHOD_NOT_ALLOWED' || receipt.method!==method || receipt.path!==pathname || receipt.authorize_called!==false || receipt.dispatch_called!==false || !equal(receipt.sources,runtime.sources) || !equal(receipt.closure_sources,runtime.closure_sources))fail('native write denial before-dispatch receipt');
  cases.push({method,path:pathname,status:405,code:'METHOD_NOT_ALLOWED',authorize_called:false,dispatch_called:false});
 }
 return {status:'PASS_BEFORE_DISPATCH_405',cases};
}
async function readM2JSON(response,control,cap){
 const chunks=[];let bytes=0;for await(const part of response.body){control.assertActive();bytes+=part.length;if(bytes>cap)fail('bounded phase HTTP response');chunks.push(part);}control.assertActive();return JSON.parse(Buffer.concat(chunks));
}
function assertM2StartupIdentity(runtime,pid){
 const row=processRow(pid);
 if(row.pid!==pid || row.ppid!==process.pid || row.pgid!==pid || row.cwd!==runtime.plan.cwd || row.argv!==`${runtime.plan.node} ${runtime.plan.args.join(' ')}` || !equal(runtime.sources,m2Sources()) || !equal(runtime.closure_sources,m2ClosureSources()))fail('startup CLI generation/source identity before pending');
 const file=path.join(runtime.runRoot,`profiles/profile-${pid}.json`);
 // The exact new child may still be inside its source-bound preload; only this expected receipt can be pending.
 if(!existsSync(file))return false;
 const profile=JSON.parse(m2Read(path.relative(ROOT,file),1024*1024,{privateFile:true}));
 if(profile.profile!=='cli' || profile.node!==runtime.plan.node || profile.version!=='v22.23.3' || !equal(Object.fromEntries(Object.keys(row).map(k=>[k,profile[k]])),row) || !equal(profile.sources,runtime.sources) || !equal(profile.closure_sources,runtime.closure_sources))fail('startup CLI profile identity');return row;
}
export async function runM2Startup(runtime,control,operations){
 const states=[];const phase=value=>{control.assertActive();operations.checkIdentity();states.push(value);};
 phase('IDENTITY');
 while(operations.checkIdentity()===false){await (operations.delay??(ms=>new Promise(resolve=>setTimeout(resolve,ms))))(Math.min(50,control.remaining()));control.assertActive();}
 let hub;
 while(true){
  control.assertActive();operations.checkIdentity();
  try{hub=await operations.fetchHubIdentity();control.assertActive();validateM2HubIdentity(hub,operations.pid);break;}
  catch(error){control.assertActive();operations.checkIdentity();if(error.stage!=='HUB_CONNECT' || error.transient!==true)throw error;}
  await (operations.delay??(ms=>new Promise(resolve=>setTimeout(resolve,ms))))(Math.min(50,control.remaining()));control.assertActive();
 }
 phase('DISCOVERY_PENDING');const discoveryReadiness=await operations.waitDiscovery();
 phase('CONTROLLER_READY');const map=await operations.fetchHubMap();control.assertActive();validateM2Hub(hub,map,operations.pid);
 phase('FRESH_FULL_MAP');const ownership=operations.observeOwnership();
 phase('API_WORKER');const entry=await operations.proveEntry();control.assertActive();
 phase('WRITE_DENY');const writeDeny=await operations.proveDeny(entry);control.assertActive();
 const retained=operations.observeRetained();operations.validateRetained(retained);phase('READY');
 return {hub,map,discoveryReadiness,ownership,entry,writeDeny,retained,startupState:'READY',startupStates:states};
}
export async function launchM2NativeControls(runtime){
 assertM2Release();if(!equal(runtime.sources,m2Sources()) || !equal(runtime.closure_sources,m2ClosureSources()))fail('source drift before launch');
 validateM2RetainedIdentity(runtime.retained,observeM2Retained());assertM2PortsFree();
 writePrivate(path.join(runtime.runRoot,'launch-admission.json'),{task:'CMS-RECOVERY-001',revision:2,attemptId:runtime.attemptId,sources:runtime.sources,status:'LAUNCH_CONSUMED_NO_REPLAY',atUtc:new Date().toISOString()});
 const fds={};for(const name of ['stdout','stderr'])fds[name]=openSync(path.join(runtime.runRoot,`${name}.log`),'wx',0o600);
 const child=spawn(runtime.plan.node,runtime.plan.args,{cwd:runtime.plan.cwd,env:runtime.environment,detached:true,stdio:['ignore','pipe','pipe']});
 const capture={};let captureError=null,firstLogError=null;
 for(const name of ['stdout','stderr']){
  const fd=fds[name],buffer=createM2BoundedCapture(bytes=>writeSync(fd,bytes));capture[name]=buffer;let diagnosticTail='';
  child[name].on('data',chunk=>{try{
   const stats=buffer.add(chunk);diagnosticTail=(diagnosticTail+chunk.toString('utf8')).slice(-4096);
   firstLogError??=diagnosticTail.match(/(?:^|\n)[^\n]*(?:Error:|ERR_|M2_RECOVERY_HOLD:)[^\n]*/)?.[0]?.trim().slice(0,1000)??null;
   if(stats.exceeded && !captureError){captureError=`${name} exceeds ${stats.cap} bytes`;writePrivate(path.join(runtime.runRoot,'log-capture-hold.json'),{status:'HOLD',stream:name,...stats,atUtc:new Date().toISOString(),action:'PRESERVE_PARTIAL_STATE_NO_SIGNAL'});}
  }catch(error){captureError??=error.message;buffer.stop();}});
  child[name].once('close',()=>{buffer.stop();closeSync(fd);});
 }
 let exit=null,spawnError=null;child.once('error',error=>{spawnError=error.code??'UNKNOWN';});child.once('exit',(code,signal)=>{exit={code,signal};});
 writePrivate(path.join(runtime.runRoot,'launch.json'),{pid:child.pid??null,attemptId:runtime.attemptId,atUtc:new Date().toISOString(),sources:runtime.sources});
 try{
  const result=await m2Deadline(async control=>{
   const checkIdentity=()=>{if(captureError || exit || spawnError)fail('startup CLI/capture completion unknown; preserve state');return assertM2StartupIdentity(runtime,child.pid);};
   const startup=await runM2Startup(runtime,control,{pid:child.pid,checkIdentity,fetchHubIdentity:()=>m2HubJSON('http://127.0.0.1:4401/',control),waitDiscovery:()=>waitM2Discovery(runtime,control,child.pid,{check:checkIdentity}),fetchHubMap:()=>m2HubJSON('http://127.0.0.1:4401/emulators',control),observeOwnership:()=>observeM2Owned(runtime,child.pid),proveEntry:()=>proveM2Entry(runtime,control,child.pid),proveDeny:entry=>proveM2WriteDeny(runtime,control,entry),observeRetained:observeM2Retained,validateRetained:retained=>validateM2RetainedIdentity(runtime.retained,retained)});
   return {task:'CMS-RECOVERY-001',revision:2,projectId:PROJECT,runToken:path.basename(runtime.runRoot),phase:'NATIVE_CONTROLS',sources:runtime.sources,closure_sources:runtime.closure_sources,status:'PASS_NATIVE_CONTROL_ONLY',...startup,capture:Object.fromEntries(Object.entries(capture).map(([name,value])=>[name,value.snapshot()])),SDK:startup.entry.SDK,authenticatedAuthFirestoreRpc:'NOT_RUN_NO_BEARER',fixtures:'NOT_RUN',Vite:'NOT_RUN'};
  });
  writePrivate(path.join(runtime.runRoot,'native-controls.json'),result);child.unref();return {runtime,child,result};
 }catch(error){writePrivate(path.join(runtime.runRoot,'native-hold.json'),{...baseEvidence(runtime,'NATIVE_CONTROLS','HOLD'),reason:error.message,first_observed_log_error:firstLogError,first_log_error_scope:'ACTUAL_PRIVATE_STREAM_LINE; not a proven root cause',pid:child.pid??null,atUtc:new Date().toISOString(),action:'PRESERVE_NEW_PARTIAL_STATE_NO_SIGNAL',capture:Object.fromEntries(Object.entries(capture).map(([name,value])=>[name,value.snapshot()])),capture_count_scope:'AT_HOLD_OBSERVATION; remaining pipes drain without diagnostic polling',fixtures:'NOT_RUN'});child.unref();throw error;}
}
export function validateM2PhaseRelease(gate,phase,runtime){
 if(!M2_PHASES.includes(phase) || !gate || gate.task!=='CMS-RECOVERY-001' || gate.revision!==2 || gate.projectId!==PROJECT || gate.runToken!==path.basename(runtime.runRoot) || gate.phase!==phase || gate.status!=='PASS_PRECEDING_GATE' || gate.phase_release!==true || gate.reviewer!=='/root/pdf_setup_reviewer' || gate.coordinator!=='/root' || gate.actual_effort!=='high' || gate.runtime_observation?.model!=='gpt-6.1-sol' || gate.runtime_observation?.effort!=='high' || !/^[a-f0-9]{64}$/.test(gate.runtime_observation?.turn_context_sha256??'') || !equal(gate.sources,runtime.sources) || !equal(gate.closure_sources,runtime.closure_sources))fail('same-run current High phase release');return true;
}
function phaseRuntime(phase,token){
 const runRoot=m2Root(token),runtime=assertM2Admission(runRoot);assertM2Release();assertM2Pins();assertM2Metadata();
 const gate=JSON.parse(m2Read(`${path.relative(ROOT,runRoot)}/phase-release-${phase}.json`,1024*1024,{privateFile:true}));validateM2PhaseRelease(gate,phase,runtime);
 if(existsSync(path.join(runRoot,'log-capture-hold.json')) || existsSync(path.join(runRoot,'native-hold.json')))fail('new runtime held; no phase effects');
 const native=JSON.parse(m2Read(`${path.relative(ROOT,runRoot)}/native-controls.json`,8*1024*1024,{privateFile:true}));
 if(native.task!=='CMS-RECOVERY-001' || native.revision!==2 || native.projectId!==PROJECT || native.runToken!==token || native.phase!=='NATIVE_CONTROLS' || native.status!=='PASS_NATIVE_CONTROL_ONLY' || native.writeDeny?.status!=='PASS_BEFORE_DISPATCH_405' || !equal(native.sources,runtime.sources) || !equal(native.closure_sources,runtime.closure_sources))fail('actual new native proof before phase');
 observeM2Owned(runtime,native.ownership.record.leader.pid,{parentPid:native.ownership.record.leader.ppid});validateM2RetainedIdentity(runtime.retained,observeM2Retained());
 const operator=processRow(process.pid);if(operator.argv!==`${runtime.plan.node} ${ownPath} ${phase} ${token}` || operator.cwd!==ROOT)fail('fixed phase operator generation');
 writePrivate(path.join(runRoot,`operator-${phase}-${process.pid}.json`),{...operator,task:'CMS-RECOVERY-001',revision:2,projectId:PROJECT,runToken:token,phase,sources:runtime.sources});
 return {runtime,native,gate};
}
export function canonicalM2Value(value){
 if(value===null || typeof value==='string' || typeof value==='boolean')return value;
 if(typeof value==='number'){if(!Number.isFinite(value))fail('Firestore number');return value;}
 if(Buffer.isBuffer(value))return {type:'bytes',base64:value.toString('base64')};
 if(value?.constructor?.name==='Timestamp' && Number.isSafeInteger(value.seconds) && Number.isSafeInteger(value.nanoseconds) && value.nanoseconds>=0 && value.nanoseconds<1000000000)return {seconds:value.seconds,nanoseconds:value.nanoseconds};
 if(Array.isArray(value))return value.map(canonicalM2Value);
 if(value && Object.getPrototypeOf(value)===Object.prototype)return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonicalM2Value(value[k])]));
 fail('unsupported Firestore value; incomplete inventory');
}
export async function inventoryM2(db,documentId,control){
 const collections=[],raw=new Map();let documents=0,canonicalBytes=0;
 for(const name of M2_COLLECTIONS){
  const entries=[];let cursor=null,last=null;
  for(;;){
   control.assertActive();let query=db.collection(name).orderBy(documentId).limit(25);if(cursor)query=query.startAfter(cursor);
   const page=await query.get();control.assertActive();
   if(!Array.isArray(page.docs) || page.docs.length>25 || page.size!==page.docs.length)fail('inventory page shape');
   for(const doc of page.docs){
    if(typeof doc.id!=='string' || !doc.id || doc.id.includes('/') || last!==null && doc.id<=last || ++documents>20000)fail('inventory document/order cap');last=doc.id;
    const data=canonicalM2Value(doc.data()),text=canonicalJson(data);canonicalBytes+=Buffer.byteLength(text);if(canonicalBytes>256*1024*1024)fail('inventory byte cap');
    const createTime=canonicalM2Value(doc.createTime),updateTime=canonicalM2Value(doc.updateTime);if(!Number.isSafeInteger(createTime?.seconds) || !Number.isSafeInteger(updateTime?.seconds))fail('inventory timestamps missing');
    entries.push({id:doc.id,sha256:digest(text),createTime,updateTime});raw.set(`${name}/${doc.id}`,doc);
   }
   if(page.docs.length<25)break;cursor=page.docs.at(-1);
  }
  collections.push({name,count:entries.length,entries});
 }
 const inventory={collections,documents,canonicalBytes};inventory.sha256=digest(inventory);return {inventory,raw};
}
export function assertM2InventoryEqual(before,after){if(!equal(before.collections,after.collections) || before.sha256!==after.sha256)fail('retained Firestore inventory delta');return true;}
export function captureM2DiskCustody(base,manifest,{io=fs}={}){
 const records=[],seen=new Set(),known=new Map();let bytes=0,entries=0;const started=Date.now();
 const digestBytes=value=>createHash('sha256').update(value).digest('hex');
 if(!manifest || manifest.task!=='CMS-RECOVERY-001' || manifest.revision!==2 || manifest.kind!=='EXACT_KNOWN_HISTORICAL_NEGATIVE_FIXTURE_LINKS' || manifest.count!==20 || manifest.noTargetDereference!==true || manifest.noHistoricalMutation!==true || !Array.isArray(manifest.records) || manifest.records.length!==20 || !base.startsWith(`${ROOT}/.local/`) || path.resolve(base)!==base)fail('complete disk custody/verified20 scope');
 for(const row of manifest.records){
  if(!row || !equal(Object.keys(row).sort(),['path','type','uid','mode','nlink','dev','ino','size','rawTarget','sha256'].sort()) || typeof row.path!=='string' || path.isAbsolute(row.path) || row.path.split('/').some(p=>!p || p==='.' || p==='..') || !path.join(ROOT,row.path).startsWith(`${base}/`) || known.has(row.path) || row.type!=='symlink' || typeof row.rawTarget!=='string' || row.rawTarget.includes('\0') || Buffer.byteLength(row.rawTarget)!==row.size || row.sha256!==digestBytes(row.rawTarget) || ['uid','mode','nlink','dev','ino','size'].some(k=>!Number.isSafeInteger(row[k])) || row.nlink!==1)fail('verified20 raw target/metadata schema');known.set(row.path,row);
 }
 const meta=st=>({uid:Number(st.uid),gid:Number(st.gid),mode:Number(st.mode&0o777n),nlink:Number(st.nlink),dev:Number(st.dev),ino:Number(st.ino),size:Number(st.size),mtimeNs:String(st.mtimeNs),ctimeNs:String(st.ctimeNs)});
 const sameIdentity=(a,b)=>equal(meta(a),meta(b));
 const budget=()=>{if(++entries>20000 || Date.now()-started>=120000)fail('disk custody cap');};
 function inspect(p){
  budget();const st=io.lstatSync(p,{bigint:true}),relative=path.relative(ROOT,p),identity=meta(st),expected=known.get(relative);
  if(st.isSymbolicLink()){
   if(!expected)fail('unknown retained symlink');const rawTarget=io.readlinkSync(p),after=io.lstatSync(p,{bigint:true});
   const actual={path:relative,type:'symlink',...Object.fromEntries(['uid','mode','nlink','dev','ino','size'].map(k=>[k,identity[k]])),rawTarget,sha256:digestBytes(rawTarget)};
   if(!sameIdentity(st,after) || !after.isSymbolicLink() || !equal(actual,expected))fail('verified historical symlink drift/race');seen.add(relative);records.push({...actual,gid:identity.gid,mtimeNs:identity.mtimeNs,ctimeNs:identity.ctimeNs});return;
  }
  if(expected)fail('historical symlink type drift');
  if(st.isDirectory()){
   if(io.realpathSync(p)!==p)fail('disk directory alias');const names=io.readdirSync(p).sort();records.push({path:relative,type:'directory',...identity});for(const name of names)inspect(path.join(p,name));
   const after=io.lstatSync(p,{bigint:true});if(!after.isDirectory() || !sameIdentity(st,after) || io.realpathSync(p)!==p || !equal(names,io.readdirSync(p).sort()))fail('disk directory identity/membership race');return;
  }
  if(!st.isFile() || st.nlink!==1n || st.uid!==BigInt(process.getuid()) || io.realpathSync(p)!==p || st.size>16n*1024n*1024n)fail('disk unsupported file/type/identity');
  bytes+=Number(st.size);if(bytes>256*1024*1024)fail('disk custody byte cap');
  const fd=io.openSync(p,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK);let total=0;const hash=createHash('sha256');
  try{
   const initial=io.fstatSync(fd,{bigint:true});if(!initial.isFile() || !sameIdentity(st,initial))fail('disk FD identity before read');
   const chunk=Buffer.alloc(65536);while(true){if(Date.now()-started>=120000)fail('disk custody time cap');const count=io.readSync(fd,chunk,0,chunk.length,null);if(!count)break;total+=count;if(total>Number(st.size))fail('disk file read growth race');hash.update(chunk.subarray(0,count));}
   const final=io.fstatSync(fd,{bigint:true}),after=io.lstatSync(p,{bigint:true});if(total!==Number(st.size) || !final.isFile() || !after.isFile() || !sameIdentity(st,final) || !sameIdentity(st,after) || io.realpathSync(p)!==p)fail('disk file/path/FD drift during read');
  }finally{io.closeSync(fd);}
  records.push({path:relative,type:'file',...identity,sha256:hash.digest('hex')});
 }
 inspect(base);if(seen.size!==20 || [...known.keys()].some(p=>!seen.has(p)))fail('missing verified historical symlink');
 return {records,bytes,entries,knownSymlinks:20,sha256:digest(records),scope:'Complete existing emulator-data type-aware opaque custody; symlinks metadata/raw-target only; no target dereference/whole-database backup'};
}
function diskCustody(){return captureM2DiskCustody(path.join(ROOT,'.local/emulator-data'),readM2HistoricalLinks());}
function baseEvidence(runtime,phase,status){return {task:'CMS-RECOVERY-001',revision:2,projectId:PROJECT,runToken:path.basename(runtime.runRoot),phase,status,sources:runtime.sources,closure_sources:runtime.closure_sources,atUtc:new Date().toISOString()};}
async function phaseSDK(runtime){
 Object.assign(process.env,m2Environment(runtime.runRoot,process.env));installNetworkFence();installM2PortFence();
 const authorization=await import('../cms-api/authorization.mjs'),require=createRequire(import.meta.url),{FieldPath}=require('firebase-admin/firestore');
 return {...authorization,documentId:FieldPath.documentId()};
}
export function selectM2ReadableSourceIds(response){
 const state=response?.reviewState,ids=state?.status==='APPROVED'?response.review?.sourceCheckIds:Object.values(state?.activeSourceCheckIds??{});
 if(!state || !['IN_REVIEW','APPROVED','CHANGES_REQUESTED'].includes(state.status) || !Array.isArray(ids) || ids.length>61 || new Set(ids).size!==ids.length || ids.some(id=>typeof id!=='string' || !/^[A-Za-z0-9_-]{1,128}$/.test(id)))fail('validated current source-check relation');return [...ids].sort();
}
export function selectM2CatalogSnapshots(snapshots){
 if(!Array.isArray(snapshots) || snapshots.length>20000)fail('catalogue inventory cap');
 const selected=[...snapshots].sort((a,b)=>a.id.localeCompare(b.id)).slice(0,1);
 if(selected.some(s=>!Array.isArray(s.sourceCheckIds) || s.sourceCheckIds.length>61))fail('representative source-check read cap');return selected;
}
async function createReadCatalog(runtime,db,raw,inventory,control){
 const {RECOVERY_ROSTER,validateMembership}=await import('./recover-auth-local.mjs');
 for(const fixture of RECOVERY_ROSTER){const doc=raw.get(`cmsMembers/${fixture.uid}`);validateMembership(fixture,doc??{exists:false});}
 const draft=raw.get('cmsDrafts/home-v2');if(!draft?.exists)fail('existing M2 draft absent');
 const {loadTrustedCatalog}=await import('../cms-api/drafts.mjs'),{loadTrustedBaseline,createSiteImportService}=await import('../cms-api/import-site.mjs');
 const catalog=loadTrustedCatalog(),baseline=loadTrustedBaseline(),service=await createSiteImportService({db,authorize:()=>{fail('inventory must not authorize a mutation');}});
 const contextResult=await db.runTransaction(tx=>service.readTrustedContext({transaction:tx,target:draft,baseline,catalog}),{readOnly:true});control.assertActive();
 const {createSiteSnapshotService}=await import('../cms-api/site-snapshots.mjs'),snapshots=[],reader=await createSiteSnapshotService({db,authorize:()=>{fail('inventory trusted reader must not authorize mutation');},baselineProvider:()=>baseline,catalogProvider:()=>catalog});
 for(const [key,doc] of raw)if(key.startsWith('cmsSnapshots/') && doc.data()?.draftId==='home-v2'){
  const {response}=await db.runTransaction(async transaction=>reader.readTrustedSnapshot({transaction,snapshotDoc:await transaction.get(db.collection('cmsSnapshots').doc(doc.id)),baseline,catalog}),{readOnly:true});control.assertActive();
  const snapshot=response.snapshot;if(snapshot.id!==doc.id)fail('M2 snapshot identity');
  const sourceCheckIds=selectM2ReadableSourceIds(response);snapshots.push({id:doc.id,contentHash:snapshot.contentHash,sourceCheckIds});
 }
 const value={task:'CMS-RECOVERY-001',revision:2,projectId:PROJECT,resourceId:'home-v2',draftRevision:contextResult.current.revision,snapshots:selectM2CatalogSnapshots(snapshots),beforeInventoryHash:inventory.sha256};validateM2Catalog(value);writePrivate(path.join(runtime.runRoot,'read-catalog.json'),value);return value;
}
export async function runM2InventoryPhase(phase,token){
 const {runtime}=phaseRuntime(phase,token);if(!['inventory-before','inventory-after'].includes(phase))fail('inventory selector');
 const sdk=await phaseSDK(runtime);
 try{return await m2Deadline(async control=>{
  const {inventory,raw}=await inventoryM2(sdk.db,sdk.documentId,control),custody=diskCustody();control.assertActive();
  const before=phase==='inventory-after'?JSON.parse(m2Read(`${path.relative(ROOT,runtime.runRoot)}/before-inventory.json`,16*1024*1024,{privateFile:true})):null;
  if(before){assertM2InventoryEqual(before.inventory,inventory);if(before.diskCustodyHash!==custody.sha256)fail('old disk custody delta');}
  if(phase==='inventory-before')await createReadCatalog(runtime,sdk.db,raw,inventory,control);
  const result={...baseEvidence(runtime,phase==='inventory-before'?'BEFORE_INVENTORY':'AFTER_INVENTORY','PASS_READ_ONLY_INVENTORY'),inventory,beforeInventoryHash:before?.beforeInventoryHash??inventory.sha256,diskCustodyHash:custody.sha256,diskCustody:custody,limits:'Read-only paged known10 collections; not atomic whole DB or global zero-wire'};
  writePrivate(path.join(runtime.runRoot,phase==='inventory-before'?'before-inventory.json':`after-inventory-${randomUUID()}.json`),result);return result;
 });}finally{await m2Deadline(()=>sdk.db.terminate(),5000);}
}
export async function createM2Fixtures(auth,fixtures,control,{beforeCreate=()=>{},onProgress=()=>{}}={}){
 const {validateAuthUser,inspectAuth,RECOVERY_ROSTER}=await import('./recover-auth-local.mjs');
 validateM2FixtureInputs(fixtures,RECOVERY_ROSTER);
 const users=await inspectAuth(auth,false,control.deadline);control.assertActive();if(users.length)fail('fresh new Auth not empty; no blind fixture replay');
 for(const fixture of fixtures){control.assertActive();await beforeCreate();control.assertActive();
  await auth.createUser({uid:fixture.uid,email:fixture.email,emailVerified:fixture.verified,disabled:false,password:fixture.password});control.assertActive();
  validateAuthUser(await auth.getUser(fixture.uid));control.assertActive();onProgress(fixture.uid);
 }
 const result=await inspectAuth(auth,true,control.deadline);control.assertActive();return result;
}
export function validateM2FixtureInputs(fixtures,roster){
 if(!Array.isArray(fixtures) || fixtures.length!==7 || !Array.isArray(roster) || roster.length!==7 || !equal(fixtures.map(({uid,email,role,active,verified})=>({uid,email,role,active,verified})),roster) || new Set(fixtures.map(f=>f.password)).size!==7 || fixtures.some(f=>typeof f.password!=='string' || !/^[A-Za-z0-9_-]{32}$/.test(f.password)))fail('exact seven fixtures/distinct new private passwords');return true;
}
export async function runM2FixturePhase(token){
 const {runtime}=phaseRuntime('fixtures',token),before=JSON.parse(m2Read(`${path.relative(ROOT,runtime.runRoot)}/before-inventory.json`,16*1024*1024,{privateFile:true}));
 if(before.status!=='PASS_READ_ONLY_INVENTORY' || before.runToken!==token || before.projectId!==PROJECT || !equal(before.sources,runtime.sources) || !equal(before.closure_sources,runtime.closure_sources))fail('actual BEFORE preservation required');
 const {RECOVERY_ROSTER}=await import('./recover-auth-local.mjs');
 writePrivate(path.join(runtime.runRoot,'fixture-admission.json'),{...baseEvidence(runtime,'FIXTURES','CREATE_ADMITTED_COMPLETION_UNKNOWN'),pid:process.pid});
 const fixtures=RECOVERY_ROSTER.map(f=>({...f,password:randomBytes(24).toString('base64url'),expectedRole:f.role,expectedSessionStatus:f.active===true && f.verified===true?200:403}));
 writePrivate(path.join(runtime.runRoot,'fixtures.json'),{task:'CMS-RECOVERY-001',revision:2,projectId:PROJECT,authEndpoint:'127.0.0.1:9098',fixtures:fixtures.map(({uid,email,password,expectedRole,expectedSessionStatus})=>({uid,email,password,expectedRole,expectedSessionStatus}))});
 const sdk=await phaseSDK(runtime),created=[];
 try{return await m2Deadline(async control=>{
  const current=await inventoryM2(sdk.db,sdk.documentId,control);assertM2InventoryEqual(before.inventory,current.inventory);
  const users=await createM2Fixtures(sdk.auth,fixtures,control,{beforeCreate:()=>{assertM2Release();validateM2RetainedIdentity(runtime.retained,observeM2Retained());},onProgress:uid=>{created.push(uid);writePrivate(path.join(runtime.runRoot,`fixture-created-${created.length}.json`),{uid,completed_at_utc:new Date().toISOString()});}});
  const after=await inventoryM2(sdk.db,sdk.documentId,control);assertM2InventoryEqual(before.inventory,after.inventory);const custody=diskCustody();if(custody.sha256!==before.diskCustodyHash)fail('old custody delta');
  const result={...baseEvidence(runtime,'FIXTURES','PASS_NEW_AUTH_FIXTURES_ONLY'),created,users,beforeInventoryHash:before.beforeInventoryHash,afterInventoryHash:after.inventory.sha256,oldDiskCustodyHash:custody.sha256};writePrivate(path.join(runtime.runRoot,'fixture-result.json'),result);return result;
 });}catch(error){writePrivate(path.join(runtime.runRoot,'fixture-hold.json'),{...baseEvidence(runtime,'FIXTURES','HOLD_PENDING_CREATE_PRESERVE_PARTIAL_STATE'),created,reason:error.message,noBlindRetry:true});throw error;}finally{await m2Deadline(()=>sdk.db.terminate(),5000);}
}
// Hub exportAuth writes the public GET config projection, not AgentProjectState's full internal config.
export async function validateM2HubExportPayload(metadata,accounts,config){
 if(!equal(metadata,{version:'15.33.0',auth:{version:'15.33.0',path:'auth_export'}}) || !equal(config,{signIn:{allowDuplicateEmails:false},emailPrivacyConfig:{enableImprovedEmailPrivacy:false}}))fail('new Hub Auth custody metadata/public config projection');
 if(!accounts || typeof accounts!=='object' || Array.isArray(accounts) || accounts.kind!=='identitytoolkit#DownloadAccountResponse' || !Array.isArray(accounts.users) || accounts.users.length>7 || Object.keys(accounts).some(k=>!['kind','users'].includes(k)))fail('new Hub Auth custody accounts schema');
 const {validateAuthPage}=await import('./recover-auth-local.mjs');
 const users=accounts.users.map(u=>{
  if(!u || typeof u!=='object' || Array.isArray(u) || ['emailVerified','disabled'].some(k=>Object.hasOwn(u,k) && typeof u[k]!=='boolean'))fail('new Hub Auth custody account shape');
  return {uid:u.localId,email:u.email,emailVerified:u.emailVerified??false,disabled:u.disabled??false,tenantId:u.tenantId,customClaims:u.customAttributes===undefined?undefined:JSON.parse(u.customAttributes)};
 });
 validateAuthPage({users},{complete:users.length===7});return {count:users.length,tenants:0};
}
export function validateM2CustodyTree(records){
 if(!Array.isArray(records) || !equal(records.map(r=>r.name),['.','auth_export','auth_export/accounts.json','auth_export/config.json','firebase-export-metadata.json']))fail('new Auth exact private custody tree');
 for(const row of records)if(row.uid!==process.getuid() || !Number.isSafeInteger(row.dev) || !Number.isSafeInteger(row.ino) || row.ino<1 || row.type!==(row.name==='.' || row.name==='auth_export'?'directory':'file') || row.mode!==(row.type==='directory'?0o700:0o600) || row.type==='file' && (row.nlink!==1 || !Number.isSafeInteger(row.bytes) || row.bytes<1 || !/^[a-f0-9]{64}$/.test(row.sha256)))fail('custody tree type/owner/mode/hash');
 if(records.filter(r=>r.type==='file').reduce((n,r)=>n+r.bytes,0)>16*1024*1024)fail('custody tree byte cap');return records;
}
function captureM2CustodyTree(destination){
 const records=[];
 for(const name of ['.','auth_export','auth_export/accounts.json','auth_export/config.json','firebase-export-metadata.json']){
  const absolute=name==='.'?destination:path.join(destination,name),stat=lstatSync(absolute);
  if(stat.isSymbolicLink() || realpathSync(absolute)!==absolute)fail('custody tree alias');
  const directory=name==='.' || name==='auth_export';
  if(directory && !equal(readdirSync(absolute).sort(),name==='.'?['auth_export','firebase-export-metadata.json']:['accounts.json','config.json']))fail('custody tree unknown files or tenants');
  const bytes=directory?null:m2Read(path.relative(ROOT,absolute),16*1024*1024,{privateFile:true});
  records.push({name,type:directory?'directory':'file',uid:stat.uid,dev:stat.dev,ino:stat.ino,mode:stat.mode&0o777,nlink:stat.nlink,mtimeMs:stat.mtimeMs,...(bytes?{bytes:bytes.length,sha256:digest(bytes)}:{})});
 }
 return validateM2CustodyTree(records);
}
export async function runM2CustodyPhase(token){
 const {runtime}=phaseRuntime('auth-custody',token);return m2Deadline(async control=>{
  let slot=1;
  for(;slot<=3;slot++){
   const admitted=path.join(runtime.runRoot,`custody-admission-${slot}.json`);if(!existsSync(admitted))break;
   const done=path.join(runtime.runRoot,`custody-result-${slot}.json`);if(!existsSync(done))fail('pending/unknown custody writer; no blind export retry');
   const prior=JSON.parse(m2Read(path.relative(ROOT,done),1024*1024,{privateFile:true}));if(prior.status!=='PASS_NEW_AUTH_PRIVATE_CUSTODY' || prior.writerFulfilled!==true || prior.runToken!==token || !equal(prior.sources,runtime.sources))fail('custody completion unknown');
  }
  if(slot>3)fail('bounded three owned custody exports');
  const destination=path.join(runtime.runRoot,`auth-custody-${randomUUID()}`);writePrivate(path.join(runtime.runRoot,`custody-admission-${slot}.json`),{destination,status:'EXPORT_ADMITTED_COMPLETION_UNKNOWN'});
  const response=await fetch('http://127.0.0.1:4401/_admin/export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({path:destination,targets:['auth'],initiatedBy:'CMS-RECOVERY-001'}),redirect:'error',signal:control.signal});
  const body=await readM2JSON(response,control,65536);if(response.status!==200 || body.message!=='OK')fail('new Auth export writer fulfillment unknown');
  const read=name=>m2Read(`${path.relative(ROOT,destination)}/${name}`,16*1024*1024,{privateFile:true}),metadata=read('firebase-export-metadata.json'),accounts=read('auth_export/accounts.json'),config=read('auth_export/config.json');
  const accountValue=JSON.parse(accounts),configValue=JSON.parse(config),metadataValue=JSON.parse(metadata);
  await validateM2HubExportPayload(metadataValue,accountValue,configValue);
  const firstTree=captureM2CustodyTree(destination),firstAt=Date.now();control.assertActive();
  await new Promise(resolve=>setTimeout(resolve,Math.min(1000,control.remaining())));control.assertActive();
  const secondAt=Date.now(),secondTree=captureM2CustodyTree(destination);if(secondAt-firstAt<1000 || !equal(firstTree,secondTree))fail('owned Auth custody tree unstable; preserve state');
  const records=[['firebase-export-metadata.json',metadata],['auth_export/accounts.json',accounts],['auth_export/config.json',config]].map(([name,bytes])=>({name,bytes:bytes.length,sha256:digest(bytes)}));
  const totalBytes=records.reduce((n,r)=>n+r.bytes,0);if(totalBytes>16*1024*1024)fail('new custody total cap');
  const result={...baseEvidence(runtime,'AUTH_CUSTODY','PASS_NEW_AUTH_PRIVATE_CUSTODY'),destination,writerFulfilled:true,count:accountValue.users.length,partial:accountValue.users.length!==7,zeroTenants:true,files:records,totalBytes,treeSnapshots:[{atMs:firstAt,records:firstTree},{atMs:secondAt,records:secondTree}],stableMilliseconds:secondAt-firstAt};writePrivate(path.join(runtime.runRoot,`custody-result-${slot}.json`),result);return result;
 });
}
export function validateM2BrowserReport(result,runtime){
 if(!result || result.task!=='CMS-RECOVERY-001' || result.revision!==2 || result.projectId!==PROJECT || result.runToken!==path.basename(runtime.runRoot) || result.status!=='PASS_UI_PENDING_PRESERVATION' || result.beforeInventoryHash!==runtime.beforeInventoryHash || !equal(result.sourceHashes,runtime.uiSources) || !Array.isArray(result.roles) || result.roles.length!==4 || !equal(result.roles.map(r=>r.role).sort(),['EDITOR','OWNER','PUBLISHER','REVIEWER']) || result.roles.some(r=>r.status!=='PASS') || !Array.isArray(result.negativeFixtures) || result.negativeFixtures.length!==3 || result.negativeFixtures.some(r=>r.status!==403 || r.privateContentCleared!==true) || !Array.isArray(result.screenshots) || !result.screenshots.length || result.screenshots.length>128 || result.blockedNetwork!==0 || result.pageErrors!==0 || result.consoleErrors!==0)fail('actual completed browser feature/report proof');return true;
}
function readM2BrowserReport(runtime,beforeInventoryHash){
 const receipt=JSON.parse(m2Read(`${path.relative(ROOT,runtime.runRoot)}/browser-result.json`,131072,{privateFile:true})),prefix='.local/test-outputs/cms-recovery-001/v2/ui/';
 if(receipt.task!=='CMS-RECOVERY-001' || receipt.revision!==2 || receipt.projectId!==PROJECT || receipt.runToken!==path.basename(runtime.runRoot) || receipt.phase!=='UI_REPORT' || receipt.status!=='PASS_REPORT_WRITER_COMPLETED' || !equal(receipt.sources,m2UiSources()) || receipt.beforeInventoryHash!==beforeInventoryHash || typeof receipt.runId!=='string' || !/^ui-[A-Za-z0-9_-]+$/.test(receipt.runId) || receipt.output!==prefix+receipt.runId)fail('browser writer completion receipt');
 const bytes=m2Read(`${receipt.output}/manifest.json`,2097152,{privateFile:true});if(digest(bytes)!==receipt.manifestSha256)fail('browser actual manifest hash');const manifest=JSON.parse(bytes);
 if(manifest.task!=='CMS-RECOVERY-001' || manifest.revision!==2 || manifest.projectId!==PROJECT || manifest.runToken!==receipt.runToken || manifest.runId!==receipt.runId || manifest.status!=='PASS_UI_PENDING_PRESERVATION' || manifest.acceptance!=='PENDING' || !Array.isArray(manifest.files) || manifest.files.length>131 || !['results.json','report.html','report.png'].every(name=>manifest.files.some(file=>file.file===name)) || new Set(manifest.files.map(file=>file.file)).size!==manifest.files.length)fail('browser complete report files');
 for(const file of manifest.files){if(typeof file.file!=='string' || !/^[A-Za-z0-9_-]+\.(?:png|html|json)$/.test(file.file) || !/^[a-f0-9]{64}$/.test(file.sha256) || digest(m2Read(`${receipt.output}/${file.file}`,33554432,{privateFile:true}))!==file.sha256)fail('actual report file hash');}
 const result=JSON.parse(m2Read(`${receipt.output}/results.json`,2097152,{privateFile:true}));validateM2BrowserReport(result,{...runtime,uiSources:m2UiSources(),beforeInventoryHash});return receipt;
}
export async function runM2BrowserPhase(token){
 const {runtime}=phaseRuntime('ui-browser',token),before=JSON.parse(m2Read(`${path.relative(ROOT,runtime.runRoot)}/before-inventory.json`,16*1024*1024,{privateFile:true}));
 const sdk=await phaseSDK(runtime),require=createRequire(import.meta.url),{deleteApp,getApps}=require('firebase-admin/app');
 let browserResult=null,phaseError=null;
 try{
  const pre=await m2Deadline(control=>inventoryM2(sdk.db,sdk.documentId,control));assertM2InventoryEqual(before.inventory,pre.inventory);const preDisk=diskCustody();if(preDisk.sha256!==before.diskCustodyHash)fail('browser BEFORE disk delta');
  writePrivate(path.join(runtime.runRoot,'browser-admission.json'),{...baseEvidence(runtime,'UI_BROWSER','BROWSER_ADMITTED_COMPLETION_UNKNOWN'),pid:process.pid,beforeInventoryHash:before.beforeInventoryHash});
  const environment={PATH:`${path.dirname(runtime.plan.node)}:/usr/bin:/bin`,HOME:process.env.HOME,PLAYWRIGHT_BROWSERS_PATH:path.join(ROOT,'.local/cache/playwright'),PINKY_M2_UI_LIVE:'CMS-RECOVERY-001-v2',PINKY_M2_UI_RUN_TOKEN:token,TMPDIR:path.join(runtime.runRoot,'tmp'),TMP:path.join(runtime.runRoot,'tmp'),TEMP:path.join(runtime.runRoot,'tmp'),MAC_CHROMIUM_TMPDIR:path.join(runtime.runRoot,'tmp')};
  const args=[...M2_BROWSER_ARGS],child=spawn(runtime.plan.node,args,{cwd:ROOT,env:environment,stdio:['ignore','pipe','pipe']});
  let exit=null,childExit=null,spawnError=null,capError=false;const captures={};
  for(const name of ['stdout','stderr']){const fd=openSync(path.join(runtime.runRoot,`browser-${process.pid}-${name}.log`),'wx',0o600),capture=createM2BoundedCapture(b=>writeSync(fd,b));captures[name]=capture;child[name].on('data',b=>{try{if(capture.add(b).exceeded)capError=true;}catch{capError=true;capture.stop();}});child[name].once('close',()=>closeSync(fd));}
  child.once('error',e=>{spawnError=e.code??'UNKNOWN';});child.once('exit',(code,signal)=>{exit=code;childExit={code,signal};writePrivate(path.join(runtime.runRoot,`browser-child-exit-${child.pid}.json`),{...baseEvidence(runtime,'UI_BROWSER_CHILD','EXITED'),pid:child.pid,exitCode:code,signal});});
  browserResult=await m2Deadline(async control=>{while(childExit===null){control.assertActive();if(spawnError || capError)fail('browser writer/capture unknown; preserve state');await new Promise(r=>setTimeout(r,Math.min(100,control.remaining())));control.assertActive();}if(exit!==0 || childExit.signal!==null || capError)fail('browser feature checks failed');const report=readM2BrowserReport(runtime,before.beforeInventoryHash);return {pid:child.pid,args,cwd:ROOT,exit,report,capture:Object.fromEntries(Object.entries(captures).map(([k,v])=>[k,v.snapshot()])),temporaryDirectory:path.join(runtime.runRoot,'tmp'),MAC_CHROMIUM_TMPDIR:environment.MAC_CHROMIUM_TMPDIR};});
 }catch(error){phaseError=error;}finally{
  try{
   const after=await m2Deadline(control=>inventoryM2(sdk.db,sdk.documentId,control)),afterDisk=diskCustody();assertM2InventoryEqual(before.inventory,after.inventory);if(afterDisk.sha256!==before.diskCustodyHash)fail('browser AFTER disk delta');
   writePrivate(path.join(runtime.runRoot,`browser-after-inventory-${process.pid}.json`),{...baseEvidence(runtime,'AFTER_INVENTORY','PASS_READ_ONLY_INVENTORY'),inventory:after.inventory,beforeInventoryHash:before.beforeInventoryHash,diskCustodyHash:afterDisk.sha256});
  }catch(error){phaseError??=error;}
  await m2Deadline(()=>sdk.db.terminate(),5000);const app=getApps().find(a=>a.name==='cms-local' && a.options.projectId===PROJECT);if(app)await m2Deadline(()=>deleteApp(app),5000);
 }
 const result={...baseEvidence(runtime,'UI_BROWSER',phaseError?'HOLD':'PASS_REAL_BROWSER_FEATURE_CHECKS'),browserResult,beforeInventoryHash:before.beforeInventoryHash,...(phaseError?{reason:phaseError.message}:{}),userAcceptance:'PENDING'};
 writePrivate(path.join(runtime.runRoot,`browser-result-${process.pid}.json`),result);if(phaseError)throw phaseError;return result;
}
export async function runM2ReconcilePhase(token){
 const {runtime}=phaseRuntime('reconcile',token),sdk=await phaseSDK(runtime);
 try{return await m2Deadline(async control=>{
  const {inspectAuth}=await import('./recover-auth-local.mjs'),users=await inspectAuth(sdk.auth,false,control.deadline);control.assertActive();
  const result={...baseEvidence(runtime,'RECONCILE','HOLD_READ_ONLY_RECONCILIATION_NO_WRITER_COMPLETION_PROOF'),users,noCreate:true,noDelete:true,noSignal:true};writePrivate(path.join(runtime.runRoot,`reconcile-${randomUUID()}.json`),result);return result;
 });}finally{await m2Deadline(()=>sdk.db.terminate(),5000);}
}
export async function runM2UIPrivacy(token){
 const {runtime}=phaseRuntime('ui-privacy',token),before=JSON.parse(m2Read(`${path.relative(ROOT,runtime.runRoot)}/before-inventory.json`,16*1024*1024,{privateFile:true}));
 return m2Deadline(async control=>{
  const privateCases=[];for(const pathname of M2_PRIVATE_CASES){
   control.assertActive();const response=await fetch(`http://127.0.0.1:5175${pathname}`,{redirect:'error',signal:control.signal});await response.body?.cancel();control.assertActive();if(response.status!==403)fail('actual private HTTP403 required');privateCases.push({path:pathname,status:response.status});
  }
  const response=await fetch('http://127.0.0.1:5175/',{redirect:'error',signal:control.signal});if(response.status!==200)fail('new UI unavailable');
  const parts=[];let total=0;for await(const part of response.body){control.assertActive();total+=part.length;if(total>65536)fail('UI HTML cap');parts.push(part);}const html=Buffer.concat(parts).toString('utf8');control.assertActive();
  const CSP={auth9098:html.includes('http://127.0.0.1:9098') && !html.includes('http://127.0.0.1:9099'),hmr5175:html.includes('ws://127.0.0.1:5175') && !html.includes('ws://127.0.0.1:5173'),opaqueSandbox:/<iframe[^>]*\bsandbox\s/.test(html) && !/sandbox\s*=\s*["'][^"']+/.test(html)};
  if(!Object.values(CSP).every(x=>x===true))fail('actual UI CSP/opaque sandbox');
  const result={...baseEvidence(runtime,'HTTP_PRIVACY','PASS_HTTP_PRIVACY'),sources:m2UiSources(),beforeInventoryHash:before.beforeInventoryHash,privateCases,CSP};writePrivate(path.join(runtime.runRoot,'privacy.json'),result);return result;
 });
}
export async function runM2UIProcess(phase,token){
 const {runtime}=phaseRuntime(phase,token);if(!['ui-build','ui-serve'].includes(phase))fail('UI process selector');
 const args=[path.join(ROOT,'node_modules/vite/bin/vite.js'),...(phase==='ui-build'?['build']:[]),'--mode','m2-recovery','--configLoader','native'];
 const environment={PATH:runtime.environment?.PATH??`${path.dirname(runtime.plan.node)}:/usr/bin:/bin`,HOME:process.env.HOME,PINKY_M2_RECOVERY_BUILD_TOKEN:randomUUID()};
 if(phase==='ui-serve'){
  const free=spawnSync('/usr/sbin/lsof',['-nP','-iTCP:5175','-sTCP:LISTEN','-Fp'],{encoding:'utf8',timeout:2000,env:safeEnv});if(free.status!==1 || free.stdout || free.stderr)fail('new UI port unavailable');
 }
 // A new owned operator may start only this fixed compile or source-gated loopback Vite.
 const child=spawn(runtime.plan.node,args,{cwd:ROOT,env:environment,stdio:['ignore','pipe','pipe']});let exceeded=false;
 const captures={};for(const name of ['stdout','stderr']){const fd=openSync(path.join(runtime.runRoot,`${phase}-${process.pid}-${name}.log`),'wx',0o600),cap=createM2BoundedCapture(bytes=>writeSync(fd,bytes));captures[name]=cap;child[name].on('data',b=>{try{if(cap.add(b).exceeded)exceeded=true;}catch{exceeded=true;cap.stop();}});child[name].once('close',()=>closeSync(fd));}
 let exit=null,spawnError=null;child.once('error',e=>{spawnError=e.code??'UNKNOWN';});child.once('exit',code=>{exit=code;});
 const result=await m2Deadline(async control=>{
  while(true){
   control.assertActive();if(spawnError || exceeded || exit!==null && exit!==0)fail('UI process failed/capturecap; preserve');
   if(phase==='ui-build' && exit===0)return {code:0};
   if(phase==='ui-serve'){
    if(exit!==null)fail('new Vite exited before proof');
    const listen=spawnSync('/usr/sbin/lsof',['-nP','-a','-p',String(child.pid),'-iTCP','-sTCP:LISTEN','-Fn'],{encoding:'utf8',timeout:2000,env:safeEnv});
    if(listen.status===0){
     const listeners=listen.stdout.split('\n').filter(l=>l.startsWith('n')).map(l=>l.slice(1));if(!equal(listeners,['127.0.0.1:5175']))fail('new Vite exact listener');
     const owner=processRow(child.pid);if(owner.ppid!==process.pid || owner.argv!==`${runtime.plan.node} ${args.join(' ')}` || owner.cwd!==ROOT)fail('new Vite process source identity');
     return {pid:child.pid,status:'PASS_SOURCE_BOUND_LISTENER_NOT_PRIVACY_VERIFIED',owner,listeners};
    }
    if(listen.status!==1 || listen.stdout || listen.stderr)fail('new Vite listener unknown');
   }
   await new Promise(resolve=>setTimeout(resolve,Math.min(100,control.remaining())));control.assertActive();
  }
 });
 writePrivate(path.join(runtime.runRoot,`${phase}-${process.pid}.json`),{...baseEvidence(runtime,phase,phase==='ui-build'?'PASS_SOURCE_BUILD':'STARTED_NOT_PRIVACY_VERIFIED'),...result,args,capture:Object.fromEntries(Object.entries(captures).map(([k,v])=>[k,v.snapshot()]))});return {child,result};
}
export async function m2RecoveryMain(){
 if(process.execArgv.length!==0 || process.cwd()!==ROOT || process.version!=='v22.23.3' || realpathSync(process.execPath)!==m2Plan(m2Root('AAAAAAAAAAAAAAAAAAAAAA')).node)fail('exact pinned phase operator');
 const phase=process.argv[2],token=process.argv[3];
 if(phase==='native-controls' && process.argv.length===3){const runtime=prepareM2Runtime(),{child}=await launchM2NativeControls(runtime);if(child.exitCode!==null || child.signalCode!==null)fail('new CLI exited after native proof');await new Promise(resolve=>child.once('exit',resolve));return;}
 if(process.argv.length!==4 || !M2_PHASES.includes(phase))fail('fixed selector/token only');m2Root(token);
 if(['inventory-before','inventory-after'].includes(phase))await runM2InventoryPhase(phase,token);
 else if(phase==='fixtures')await runM2FixturePhase(token);
 else if(phase==='auth-custody')await runM2CustodyPhase(token);
 else if(phase==='reconcile')await runM2ReconcilePhase(token);
 else if(phase==='ui-privacy')await runM2UIPrivacy(token);
 else if(phase==='ui-browser')await runM2BrowserPhase(token);
 else await runM2UIProcess(phase,token);
 console.log('CMS-RECOVERY-001: selected phase evidence saved; human acceptance remains pending.');
}
if(process.argv[1] && path.resolve(process.argv[1])===ownPath)void m2RecoveryMain().catch(error=>{console.error(error.message);process.exitCode=1;});
