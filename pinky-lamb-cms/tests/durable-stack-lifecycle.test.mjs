import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import * as launcher from '../scripts/run-durable-stack.mjs';
import {ROOT} from '../scripts/local-data-guard.mjs';

const node=path.join(ROOT,'.local/cache/node/node-v22.23.3-darwin-arm64/bin/node');
const row=(pid,args)=>({pid,ppid:1,uid:process.getuid(),start:'Mon Oct 19 10:00:00 2026',command:`${node} ${args}`,cwd:ROOT});
const website=row(101,'scripts/serve-cms-website-local.mjs .local/p7-v3/website-current.json');
const admin=row(102,'node_modules/vite/bin/vite.js --configLoader native --host 127.0.0.1 --port 5273 --strictPort');
const worker=row(103,'scripts/media-worker-local.mjs');
function runtime(rows=[website,admin,worker]){
 const active=new Map(rows.map(value=>[value.pid,{...value}])),signals=[];
 let time=0;
 return {active,signals,components:()=>[...active.values()],identity:pid=>active.get(pid)??null,
  listeners:port=>[...active.values()].filter(value=>port===5273?value.pid===102:value.pid===101).map(value=>value.pid),
  busy:async port=>[...active.values()].some(value=>port===5273?value.pid===102:value.pid===101),
  signal:(pid,signal)=>{signals.push([pid,signal]);active.delete(pid);},now:()=>time,sleep:async ms=>{time+=ms;}};
}

test('stale/missing launcher: gracefully stops both servers AND the portless worker',async()=>{
 assert.equal(typeof launcher.stopPreviousComponents,'function');
 const state=runtime();
 await launcher.stopPreviousComponents({runtime:state});
 assert.deepEqual(state.signals.map(([pid])=>pid).sort(),[101,102,103]);
 assert.ok(state.signals.every(([,signal])=>signal==='SIGINT'));
 assert.equal(state.active.size,0);
});

test('same-user exact command, pinned Node and CMS cwd are all required',()=>{
 assert.equal(typeof launcher.ownedComponentKind,'function');
 assert.equal(launcher.ownedComponentKind(website),'website');
 assert.equal(launcher.ownedComponentKind(admin),'admin');
 assert.equal(launcher.ownedComponentKind(worker),'worker');
 for(const change of [{uid:process.getuid()+1},{cwd:'/tmp/another-app'},{command:admin.command+' --other'},{command:admin.command.replace(node,'/usr/bin/node')}]){
  assert.equal(launcher.ownedComponentKind({...admin,...change}),null);
 }
});

test('a foreign port owner refuses the whole stop before sending any signal',async()=>{
 const state=runtime();state.listeners=port=>port===5273?[999]:[101];
 await assert.rejects(launcher.stopPreviousComponents({runtime:state}),/foreign listener/);
 assert.deepEqual(state.signals,[]);
});

test('an occupied port with unavailable ownership refuses to stop',async()=>{
 const state=runtime();state.listeners=()=>[];
 await assert.rejects(launcher.stopPreviousComponents({runtime:state}),/foreign listener/);
 assert.deepEqual(state.signals,[]);
});

test('a PID reused after discovery is never signalled',async()=>{
 const state=runtime();const identity=state.identity;
 state.identity=pid=>({...identity(pid),start:'changed birth'});
 await assert.rejects(launcher.stopPreviousComponents({runtime:state}),/identity changed/);
 assert.deepEqual(state.signals,[]);
});

test('waits for every component to exit, even after both ports are free',async()=>{
 const state=runtime();state.signal=(pid,signal)=>{state.signals.push([pid,signal]);};
 state.busy=async()=>false;state.listeners=()=>[];
 await assert.rejects(launcher.stopPreviousComponents({runtime:state,timeoutMs:500}),/did not stop gracefully/);
 assert.equal(state.signals.length,3);
 assert.ok(state.signals.every(([,signal])=>signal==='SIGINT'));
});

test('a live verified launcher owns graceful shutdown of its children',async()=>{
 const parent=row(100,'scripts/run-durable-stack.mjs');const state=runtime();state.active.set(parent.pid,parent);
 state.components=()=>[website,admin,worker].map(identity=>({...identity,ppid:parent.pid}));
 state.signal=(pid,signal)=>{state.signals.push([pid,signal]);state.active.clear();};
 await launcher.stopPreviousComponents({runtime:state,parent});
 assert.deepEqual(state.signals,[[100,'SIGTERM']]);
});

test('a live launcher plus a separate same-app component are both stopped',async()=>{
 const parent=row(100,'scripts/run-durable-stack.mjs');const state=runtime();state.active.set(parent.pid,parent);
 state.components=()=>[website,{...admin,ppid:parent.pid},{...worker,ppid:parent.pid}];
 state.signal=(pid,signal)=>{state.signals.push([pid,signal]);if(pid===parent.pid)state.active.clear();else state.active.delete(pid);};
 await launcher.stopPreviousComponents({runtime:state,parent});
 assert.deepEqual(state.signals,[[101,'SIGINT'],[100,'SIGTERM']]);
});

test('empty runtime can start without signalling any process',async()=>{
 const state=runtime([]);await launcher.stopPreviousComponents({runtime:state});
 assert.deepEqual(state.signals,[]);
});

test('built Admin and portless content worker have exact recoverable process identities',async()=>{
 const built={...admin,command:node+' scripts/serve-cms-admin-local.mjs'},content=row(104,'scripts/content-worker-local.mjs');assert.equal(launcher.ownedComponentKind(built),'admin');assert.equal(launcher.ownedComponentKind(content),'content');const state=runtime([website,built,worker,content]);await launcher.stopPreviousComponents({runtime:state});assert.equal(state.signals.length,4);
});
