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
 let output;try{output=execFileSync('/bin/ps',['-p',String(pid),'-o','ppid=','-o','uid=','-o','lstart=','-o','command='],{encoding:'utf8',timeout:3000}).trim();}catch(error){if(error.status===1)return null;throw Error('Process identity unavailable');}
 const match=/^\s*(\d+)\s+(\d+)\s+(.{24})\s+(.+)$/.exec(output);if(!match)throw Error('Process identity unavailable');
 return {pid,ppid:Number(match[1]),uid:Number(match[2]),start:match[3],command:match[4]};
}
function processDirectory(pid){
 const output=execFileSync('/usr/sbin/lsof',['-a','-p',String(pid),'-d','cwd','-Fn'],{encoding:'utf8',timeout:3000});
 const directories=output.split('\n').filter(line=>line.startsWith('n')).map(line=>line.slice(1));
 if(directories.length!==1)throw Error('Process directory unavailable');
 return directories[0];
}
const componentArguments={
 website:['scripts/serve-cms-website-local.mjs','scripts/serve-cms-website-local.mjs .local/p7-v3/website-current.json'],
 admin:['node_modules/vite/bin/vite.js --configLoader native --host 127.0.0.1 --port 5273 --strictPort','scripts/serve-cms-admin-local.mjs'],
 content:['scripts/content-worker-local.mjs'],
 build:['node_modules/vite/bin/vite.js build --configLoader native'],
 worker:['scripts/media-worker-local.mjs']
};
function componentCommand(command){
 for(const [kind,args] of Object.entries(componentArguments))for(const argument of args){
  for(const executable of [NODE,path.relative(ROOT,NODE)])for(const script of [argument,path.join(ROOT,argument)]){
   if(command===`${executable} ${script}`)return kind;
  }
 }
 return null;
}
export function ownedComponentKind(identity){
 return identity&&identity.uid===process.getuid()&&identity.cwd===ROOT?componentCommand(identity.command):null;
}
function componentIdentity(pid){
 const identity=processIdentity(pid);if(!identity)return null;
 try{return {...identity,cwd:processDirectory(pid)};}catch(error){if(!processIdentity(pid))return null;throw error;}
}
function discoverComponents(){
 const output=execFileSync('/bin/ps',['-axo','pid=,command='],{encoding:'utf8',timeout:3000});
 const result=[];
 for(const line of output.split('\n')){
  const match=/^\s*(\d+)\s+(.+)$/.exec(line);if(!match||!componentCommand(match[2]))continue;
  const identity=componentIdentity(Number(match[1]));if(ownedComponentKind(identity))result.push(identity);
 }
 return result;
}
const sameProcess=(a,b)=>a&&b&&a.pid===b.pid&&a.start===b.start&&a.command===b.command&&a.uid===b.uid&&a.cwd===b.cwd;
const processRuntime={components:discoverComponents,identity:componentIdentity,listeners,busy:portBusy,signal:process.kill,now:Date.now,sleep:delay};

// A crashed launcher cannot prove ownership with its PID. Recover only exact
// same-user components in this CMS directory, including workers without a port.
export async function stopPreviousComponents({parent=null,runtime=processRuntime,timeoutMs=30000}={}){
 const components=runtime.components();
 if(components.some(identity=>!ownedComponentKind(identity)))throw Error('Component identity unavailable');
 for(const [port,kind] of [[5273,'admin'],[4189,'website']]){
  const owners=runtime.listeners(port),busy=await runtime.busy(port);
  if((busy&&owners.length!==1)||owners.some(pid=>!components.some(identity=>identity.pid===pid&&ownedComponentKind(identity)===kind)))throw Error(`Port ${port} has a foreign listener`);
 }
 const targets=parent?[...components,parent]:components;
 for(const identity of targets)if(!sameProcess(identity,runtime.identity(identity.pid)))throw Error('Process identity changed before stop');
 if(targets.length)console.log('LOCAL_DATA: stopping previous Pinky Lamb stack before startup');
 const signals=[...components].reverse().filter(identity=>!parent||identity.ppid!==parent.pid).map(identity=>[identity,'SIGINT']);
 if(parent)signals.push([parent,'SIGTERM']);
 for(const [identity,signal] of signals){
  const current=runtime.identity(identity.pid);if(!current)continue;
  if(!sameProcess(identity,current))throw Error('Process identity changed before stop');
  try{runtime.signal(identity.pid,signal);}catch(error){if(error.code!=='ESRCH')throw error;}
 }
 const deadline=runtime.now()+timeoutMs;
 while(true){
  const alive=targets.some(identity=>runtime.identity(identity.pid)!==null);
  if(!alive&&!(await runtime.busy(5273))&&!(await runtime.busy(4189)))return;
  if(runtime.now()>=deadline)throw Error('Previous Pinky Lamb stack did not stop gracefully; no new instance started');
  await runtime.sleep(250);
 }
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
 if(!fs.existsSync(INSTANCE)){
  await stopPreviousComponents();
  writeInstance();return;
 }
 const value=privateJson(INSTANCE);
 if(value.version!==1||value.node!==NODE||value.script!==SCRIPT||value.dataRoot!==DATA_ROOT||!Number.isSafeInteger(value.pid)||typeof value.nonce!=='string'||typeof value.start!=='string'||typeof value.command!=='string')throw Error('Runtime marker identity mismatch');
 const identity=processIdentity(value.pid);
 if(identity){
  if(identity.start!==value.start||identity.command!==value.command||identity.uid!==process.getuid()||!identity.command.includes(`${NODE} ${SCRIPT}`))throw Error('Running process does not match durable marker');
  const parent=componentIdentity(value.pid);if(parent.cwd!==ROOT)throw Error('Launcher directory mismatch');
  await stopPreviousComponents({parent});
  if(fs.existsSync(INSTANCE))throw Error('Owned instance did not remove its runtime marker');
 }else{
  await stopPreviousComponents();
  if(privateJson(INSTANCE).nonce!==value.nonce)throw Error('Runtime marker changed during stop');
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
  if(!store.content?.head())throw Error('Content migration pending; current stack has not been stopped');
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
function launch(name,args,env,{oneShot=false}={}){
 const child=spawn(NODE,args,{cwd:ROOT,env,stdio:'inherit',detached:true});
 const row={name,child,closed:false};children.push(row);
 row.done=new Promise(resolve=>{child.once('error',error=>{console.error(`LOCAL_DATA: ${name} unavailable: ${error.code}`);});child.once('close',(code,signal)=>{row.closed=true;row.code=code;resolve();if(!stopping&&(!oneShot||code!==0)){console.error(`LOCAL_DATA: ${name} exited: ${signal??code}`);void stop(1);}});});
 return row;
}
async function stop(code){if(stopping)return;stopping=true;process.exitCode=code;for(const row of [...children].reverse())if(!row.closed&&row.child.pid)row.child.kill('SIGINT');await Promise.all(children.map(row=>row.done));removeOwnedInstance();}
async function ready(url,status){const deadline=Date.now()+60000;while(Date.now()<deadline&&!stopping){try{const response=await fetch(url,{signal:AbortSignal.timeout(1000),redirect:'error'});await response.body?.cancel();if(response.status===status)return;}catch{}await delay(500);}throw Error(`Readiness failed: ${url}`);}
export async function runDurableStack(){
 if(process.argv.length!==2||fileURLToPath(import.meta.url)!==path.resolve(process.argv[1]))throw Error('Invalid durable launcher');
 if(fs.realpathSync(process.cwd())!==ROOT)process.chdir(ROOT);
 const env={...process.env,PINKY_LOCAL_DATA_MODE:'durable',PINKY_LOCAL_DATA_ROOT:DATA_ROOT};
 validateLocalDataRuntime(env);ownerMarker();await inspectData();
 if(stopping)return;
 await prepareInstance();
 if(stopping){removeOwnedInstance();return;}
 const build=launch('Admin build',['node_modules/vite/bin/vite.js','build','--configLoader','native'],env,{oneShot:true});await build.done;if(stopping)return;if(build.code!==0)throw Error('Admin build failed');
 launch('website',['scripts/serve-cms-website-local.mjs'],env);
 launch('admin',['scripts/serve-cms-admin-local.mjs'],env);
 launch('content',['scripts/content-worker-local.mjs'],env);
 launch('worker',['scripts/media-worker-local.mjs'],env);
 await Promise.all([ready('http://127.0.0.1:4189/',200),ready('http://127.0.0.1:5273/login',200),ready('http://127.0.0.1:5273/api/cms/session',401)]);
 console.log('LOCAL_DATA: Admin http://127.0.0.1:5273/login; public http://127.0.0.1:4189/');
 await Promise.all(children.map(row=>row.done));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 for(const [signal,code] of [['SIGINT',130],['SIGTERM',0],['SIGHUP',129]])process.on(signal,()=>void stop(code));
 try{await runDurableStack();}catch(error){console.error(`LOCAL_DATA: ${error.message}`);await stop(1);}
}
