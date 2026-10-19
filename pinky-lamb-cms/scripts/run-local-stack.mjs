import {realpathSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const NODE=path.join(ROOT,'.local/cache/node/node-v22.23.3-darwin-arm64/bin/node');
const ADMIN='http://127.0.0.1:5273';
const EMULATOR_PORTS=[9099,8080,5001,5010,9199,4400];
// Functions can reserve Eventarc/Tasks even when those services are not configured explicitly.
const RESERVED_PORTS=[5273,...EMULATOR_PORTS,4500,9299,9499];
const children=[];
let stopping=false;
let stoppingPromise;

function listenerPresent(port){
  return new Promise((resolve,reject)=>{
    const socket=net.createConnection({host:'127.0.0.1',port});
    let settled=false;
    const finish=(error,present)=>{
      if(settled)return;
      settled=true;socket.destroy();error?reject(error):resolve(present);
    };
    socket.setTimeout(750,()=>finish(Error(`Listener state unknown at ${port}`)));
    socket.once('connect',()=>finish(null,true));
    socket.once('error',error=>finish(error.code==='ECONNREFUSED'?null:Error(`Listener state unknown at ${port}: ${error.code}`),false));
  });
}

function launch(mode){
  // Isolate terminal signals so Ctrl+C reaches this runner once. The guard forwards
  // our signal to its own child; never signal a process group or discovered PID.
  const child=spawn(NODE,['scripts/local-guard.mjs',mode],{cwd:ROOT,env:process.env,stdio:'inherit',detached:true});
  const entry={child,mode,closed:false,signalled:false};
  children.push(entry);
  entry.done=new Promise(resolve=>{
    child.once('error',error=>{
      entry.error=error;
      console.error(`LOCAL_STACK: ${mode} unavailable: ${error.code??'UNKNOWN'}`);
    });
    child.once('close',(code,signal)=>{
      entry.closed=true;resolve();
      if(!stopping){
        console.error(`LOCAL_STACK: ${mode} exited (${signal??code}); stopping owned stack`);
        void stop(1);
      }
    });
  });
}

function signalOwnedGuards(){
  for(const entry of [...children].reverse()){
    if(entry.closed||entry.signalled||!entry.child.pid)continue;
    entry.signalled=true;
    try{
      if(!entry.child.kill('SIGINT'))console.error(`LOCAL_STACK: ${entry.mode} signal not accepted; shutdown unverified`);
    }catch(error){console.error(`LOCAL_STACK: ${entry.mode} signal failed: ${error.code??'UNKNOWN'}`);}
  }
}

function stop(code){
  if(stoppingPromise)return stoppingPromise;
  stopping=true;process.exitCode=code;
  signalOwnedGuards();
  stoppingPromise=(async()=>{
    // Do not force-kill a guard and leave its emulator descendants orphaned.
    const warning=setTimeout(()=>console.error('LOCAL_STACK: owned guards have not closed after 15s; waiting for graceful shutdown. No forced or retained-process signals sent.'),15000);
    try{await Promise.all(children.map(entry=>entry.done));}
    finally{clearTimeout(warning);}
  })();
  return stoppingPromise;
}

async function waitUntil(label,timeoutMs,check){
  const deadline=Date.now()+timeoutMs;
  while(Date.now()<deadline){
    if(stopping)throw Error('Startup interrupted');
    if(await check())return;
    await delay(500);
  }
  throw Error(`${label} readiness timed out after ${timeoutMs/1000}s`);
}

async function statusAt(route,status){
  try{
    const response=await fetch(ADMIN+route,{redirect:'error',signal:AbortSignal.timeout(1000)});
    await response.body?.cancel();
    return response.status===status;
  }catch{return false;}
}

async function main(){
  if(process.argv.length!==2)throw Error('No launcher arguments are supported');
  if(process.version!=='v22.23.3'||realpathSync(process.execPath)!==NODE)throw Error('Select pinned local Node22.23.3');
  const caller=realpathSync(process.cwd());
  if(![ROOT,path.dirname(ROOT)].includes(caller)||realpathSync(ROOT)!==ROOT)throw Error('Use repository root or exact CMS working directory');
  process.chdir(ROOT);
  for(const port of RESERVED_PORTS){
    if(stopping)return;
    if(await listenerPresent(port))throw Error(`Existing listener at ${port}; startup refused. No process was stopped or adopted.`);
  }
  if(stopping)return;
  console.log('LOCAL_STACK: starting guarded demo emulators; no seed/reset/import/export-on-exit');
  launch('emulators');
  await waitUntil('Emulator',120000,async()=>{
    const states=await Promise.all(EMULATOR_PORTS.map(listenerPresent));
    return states.every(Boolean);
  });
  if(stopping)return;
  launch('dev');
  await waitUntil('Admin',60000,async()=>await statusAt('/login',200)&&await statusAt('/api/cms/session',401));
  if(stopping)return;
  console.log(`LOCAL_STACK: Admin ${ADMIN}/login; public baseline http://127.0.0.1:5010/`);
  console.log('LOCAL_STACK: HTTP startup ready only; data/login/QA acceptance unverified. Ctrl+C stops only this launch\'s guard children.');
  await Promise.all(children.map(entry=>entry.done));
}

for(const signal of ['SIGINT','SIGTERM','SIGHUP'])process.on(signal,()=>void stop(signal==='SIGINT'?130:signal==='SIGTERM'?143:129));
process.once('exit',signalOwnedGuards);
try{await main();}
catch(error){if(!stopping)console.error(`LOCAL_STACK: ${error.message}`);await stop(process.exitCode??1);}
