import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {execFileSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {DATA_ROOT,ROOT,validateLocalDataRuntime} from './local-data-guard.mjs';

const NODE=path.join(ROOT,'.local/cache/node/node-v22.23.3-darwin-arm64/bin/node');
const MARKER=path.join(DATA_ROOT,'cutover.json');
const INSTANCE=path.join(DATA_ROOT,'run-instance.json');
const SCRIPT=fileURLToPath(import.meta.url);
const children=[];let stopping=false,ownedNonce=null;
function syncDirectory(directory){const fd=fs.openSync(directory,'r');try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
function privateJson(file){const stat=fs.lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||(stat.mode&0o077)!==0||stat.size>4096)throw Error('Unsafe runtime marker');return JSON.parse(fs.readFileSync(file,'utf8'));}
function processIdentity(pid){
 if(!Number.isSafeInteger(pid)||pid<1)throw Error('Invalid process identity');
 let output;try{output=execFileSync('/bin/ps',['-p',String(pid),'-o','ppid=','-o','lstart=','-o','command='],{encoding:'utf8',timeout:3000}).trim();}catch{return null;}
 const match=/^\s*(\d+)\s+(.{24})\s+(.+)$/.exec(output);if(!match)throw Error('Process identity unavailable');
 return {ppid:Number(match[1]),start:match[2],command:match[3]};
}
function listeners(port){
 let output;try{output=execFileSync('/usr/sbin/lsof',['-nP',`-iTCP:${port}`,'-sTCP:LISTEN','-t'],{encoding:'utf8',timeout:3000}).trim();}catch(error){if(error.status===1)return [];throw Error(`Port ${port} owner unavailable`);}
 const pids=output.split(/\s+/).filter(Boolean).map(Number);if(pids.some(pid=>!Number.isSafeInteger(pid)||pid<1))throw Error('Invalid port owner');return pids;
}
function writeInstance(){
 const identity=processIdentity(process.pid);if(!identity||!identity.command.includes(`${NODE} ${SCRIPT}`))throw Error('Launcher process identity mismatch');
 const nonce=randomUUID(),value={version:1,pid:process.pid,ppid:identity.ppid,start:identity.start,command:identity.command,node:NODE,script:SCRIPT,dataRoot:DATA_ROOT,nonce};
 const fd=fs.openSync(INSTANCE,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);
 try{fs.writeFileSync(fd,JSON.stringify(value));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
 syncDirectory(DATA_ROOT);ownedNonce=nonce;
}
function removeOwnedInstance(){
 if(!ownedNonce||!fs.existsSync(INSTANCE))return;
 try{if(privateJson(INSTANCE).nonce===ownedNonce){fs.unlinkSync(INSTANCE);syncDirectory(DATA_ROOT);}}catch(error){console.error(`LOCAL_DATA: runtime marker cleanup failed: ${error.message}`);}
 ownedNonce=null;
}
async function prepareInstance(){
 const occupied=await Promise.all([5273,5010].map(port=>portBusy(port)));
 if(!fs.existsSync(INSTANCE)){
  if(occupied.some(Boolean))throw Error('Existing listener is not an owned durable instance');
  writeInstance();return;
 }
 const value=privateJson(INSTANCE);
 if(value.version!==1||value.node!==NODE||value.script!==SCRIPT||value.dataRoot!==DATA_ROOT||!Number.isSafeInteger(value.pid)||typeof value.nonce!=='string'||typeof value.start!=='string'||typeof value.command!=='string')throw Error('Runtime marker identity mismatch');
 const identity=processIdentity(value.pid);
 if(identity){
  if(identity.start!==value.start||identity.command!==value.command||identity.ppid!==value.ppid||!identity.command.includes(`${NODE} ${SCRIPT}`))throw Error('Running process does not match durable marker');
  for(const port of [5273,5010]){
   const owners=listeners(port);
   if(((await portBusy(port))&&owners.length!==1)||owners.some(pid=>processIdentity(pid)?.ppid!==value.pid))throw Error(`Port ${port} has a foreign listener`);
  }
  process.kill(value.pid,'SIGTERM');
  const deadline=Date.now()+30000;
  while(Date.now()<deadline){
   if(!processIdentity(value.pid)&&!(await portBusy(5273))&&!(await portBusy(5010))&&!fs.existsSync(INSTANCE))break;
   await delay(250);
  }
  if(processIdentity(value.pid)||await portBusy(5273)||await portBusy(5010)||fs.existsSync(INSTANCE))throw Error('Owned instance did not stop gracefully');
 }else{
  if(occupied.some(Boolean))throw Error('Stale marker with occupied port');
  fs.renameSync(INSTANCE,path.join(DATA_ROOT,`run-stale-${randomUUID()}.json`));syncDirectory(DATA_ROOT);
 }
 writeInstance();
}
async function fileHash(file){const hash=createHash('sha256');for await(const chunk of fs.createReadStream(file,{flags:fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW}))hash.update(chunk);return hash.digest('hex');}
function portBusy(port){return new Promise((resolve,reject)=>{const socket=net.createConnection({host:'127.0.0.1',port});socket.setTimeout(1000,()=>{socket.destroy();reject(Error(`Port ${port} state unknown`));});socket.once('connect',()=>{socket.destroy();resolve(true);});socket.once('error',error=>{socket.destroy();error.code==='ECONNREFUSED'?resolve(false):reject(error);});});}
function ownerMarker(){
 if(!fs.existsSync(MARKER))throw Error('Local cutover marker missing; restore the private CMS data before startup');
 const value=privateJson(MARKER);
 if(value.version!==1||value.state!=='READY'||value.projectId!=='demo-pinky-lamb-cms'||value.dataRoot!==DATA_ROOT||!isHash(value.sourceManifestSha256)||!isHash(value.backupManifestSha256))throw Error('Cutover marker is not ready');
 return value;
}
const isHash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
async function inspectData(){
 const [{openLocalDataStore},{openLocalAuth}]=await Promise.all([import('../cms-api/local-data-store.mjs'),import('../cms-api/local-auth.mjs')]);
 const store=openLocalDataStore(DATA_ROOT);
 try{
  if(store.sqlite.pragma('integrity_check',{simple:true})!=='ok')throw Error('Local database integrity failed');
  const marker=ownerMarker(),importState=store.sqlite.prepare('SELECT source_manifest_sha256 FROM cms_import_state').get();
  if(importState?.source_manifest_sha256!==marker.sourceManifestSha256)throw Error('Cutover source does not match database');
  const pending=store.sqlite.prepare('SELECT count(*) AS n FROM cms_source_users WHERE source_disabled=0 AND email_verified=1 AND enrolled=0').get().n;
  if(pending>0)throw Error('Local Auth enrollment incomplete');
  await openLocalAuth({root:DATA_ROOT,sqlite:store.sqlite});
  const rows=store.sqlite.prepare('SELECT sha256,size_bytes FROM cms_objects').all();
  for(const row of rows){
   if(!/^[a-f0-9]{64}$/.test(row.sha256))throw Error('Invalid object digest');
   const file=path.join(DATA_ROOT,'objects',row.sha256.slice(0,2),row.sha256),stat=fs.lstatSync(file);
   if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||stat.size!==row.size_bytes)throw Error('Local media is incomplete');
   if(await fileHash(file)!==row.sha256)throw Error('Local media checksum mismatch');
  }
 }finally{store.close();}
}
function launch(name,args,env){
 const child=spawn(NODE,args,{cwd:ROOT,env,stdio:'inherit',detached:true});
 const row={name,child,closed:false};children.push(row);
 row.done=new Promise(resolve=>{child.once('error',error=>{console.error(`LOCAL_DATA: ${name} unavailable: ${error.code}`);});child.once('close',(code,signal)=>{row.closed=true;resolve();if(!stopping){console.error(`LOCAL_DATA: ${name} exited: ${signal??code}`);void stop(1);}});});
}
async function stop(code){if(stopping)return;stopping=true;process.exitCode=code;for(const row of [...children].reverse())if(!row.closed&&row.child.pid)row.child.kill('SIGINT');await Promise.all(children.map(row=>row.done));removeOwnedInstance();}
async function ready(url,status){const deadline=Date.now()+60000;while(Date.now()<deadline&&!stopping){try{const response=await fetch(url,{signal:AbortSignal.timeout(1000),redirect:'error'});await response.body?.cancel();if(response.status===status)return;}catch{}await delay(500);}throw Error(`Readiness failed: ${url}`);}
export async function runDurableStack(){
 if(process.argv.length!==2||fileURLToPath(import.meta.url)!==path.resolve(process.argv[1]))throw Error('Invalid durable launcher');
 if(fs.realpathSync(process.cwd())!==ROOT)process.chdir(ROOT);
 const env={...process.env,PINKY_LOCAL_DATA_MODE:'durable',PINKY_LOCAL_DATA_ROOT:DATA_ROOT};
 validateLocalDataRuntime(env);ownerMarker();await inspectData();
 await prepareInstance();
 launch('public',['scripts/serve-public-baseline-local.mjs'],env);
 launch('admin',['node_modules/vite/bin/vite.js','--configLoader','native','--host','127.0.0.1','--port','5273','--strictPort'],env);
 launch('worker',['scripts/media-worker-local.mjs'],env);
 await Promise.all([ready('http://127.0.0.1:5010/',200),ready('http://127.0.0.1:5273/login',200),ready('http://127.0.0.1:5273/api/cms/session',401)]);
 console.log('LOCAL_DATA: Admin http://127.0.0.1:5273/login; public http://127.0.0.1:5010/');
 await Promise.all(children.map(row=>row.done));
}
for(const [signal,code] of [['SIGINT',130],['SIGTERM',0],['SIGHUP',129]])process.on(signal,()=>void stop(code));
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))try{await runDurableStack();}catch(error){console.error(`LOCAL_DATA: ${error.message}`);await stop(1);}
