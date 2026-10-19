import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';
import * as transport from '../cms-api/local-admin-server.mjs';
const {createBuiltAdminApplication}=transport;

test('built Admin transport preserves canonical bodies, protects private paths and bounds Auth routes',async t=>{
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'pinky-built-transport-')));fs.mkdirSync(root+'/assets');fs.writeFileSync(root+'/index.html','<main>Built Admin</main>');fs.writeFileSync(root+'/assets/app-123.js','export const built=true;');
 fs.writeFileSync(root+'/private-key.fixture','synthetic private bytes');fs.symlinkSync(root+'/private-key.fixture',root+'/assets/leak.js');
 const calls=[],app=createBuiltAdminApplication({buildRoot:root,handleRequest:(req,res)=>{calls.push({path:req.path,raw:req.rawBody.toString('utf8')});res.status(200).json({ok:true});},authHandler:(_req,res)=>res.status(200).json({user:null})});
 const server=http.createServer(app);await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});t.after(async()=>{await new Promise(resolve=>server.close(resolve));fs.rmSync(root,{recursive:true,force:true});});
 const send=(url,{method='GET',host='127.0.0.1:5273',origin,body}={})=>new Promise((resolve,reject)=>{const headers={host,...(origin?{origin}:{}),...(body?{'content-type':'application/json','content-length':Buffer.byteLength(body)}:{})};const req=http.request({host:'127.0.0.1',port:server.address().port,path:url,method,headers},res=>{let text='';res.on('data',c=>text+=c);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,text}));});req.on('error',reject);req.end(body);});
 const html=await send('/login');assert.equal(html.status,200);assert.equal(html.headers['cache-control'],'no-store');assert.match(html.text,/Built Admin/);
 for(const url of ['/','/login','/login?next=https://attacker.test/']){
  const redirected=await send(url,{host:'localhost:5273'});
  assert.equal(redirected.status,302);assert.equal(redirected.headers.location,'http://127.0.0.1:5273'+url.split('?')[0]);assert.equal(redirected.headers['cache-control'],'no-store');
 }
 assert.equal((await send('/login',{method:'HEAD',host:'localhost:5273'})).status,302);
 for(const url of ['/api/cms/session','/api/auth/get-session','/assets/app-123.js','//attacker.test/login'])assert.equal((await send(url,{host:'localhost:5273'})).status,403,url);
 assert.equal((await send('/login',{method:'POST',host:'localhost:5273',body:'{}'})).status,403);
 assert.equal((await send('/login',{host:'localhost:5273',origin:'https://attacker.test'})).status,403);
 assert.equal((await send('/api/auth/sign-in/email',{method:'POST',host:'localhost:5273',origin:'http://localhost:5273',body:'{}'})).status,403);
 assert.equal((await send('/api/auth/sign-in/email',{method:'POST',origin:'http://localhost:5273',body:'{}'})).status,403);
 assert.deepEqual(calls,[]);
 const asset=await send('/assets/app-123.js');assert.equal(asset.status,200);assert.match(asset.headers['cache-control'],/immutable/);
 for(const url of ['/assets/leak.js','/cms-api/index.mjs','/.cms-data-local/cms.sqlite','/assets/%2e%2e/index.html','/contracts/baseline-site.json'])assert.equal((await send(url)).status,404,url);
 assert.equal((await send('/login',{host:'attacker.test:5273'})).status,403);assert.equal((await send('/api/auth/sign-up/email',{method:'POST',origin:'http://127.0.0.1:5273',body:'{}'})).status,404);
 assert.equal((await send('/api/auth/sign-in/email',{method:'POST',origin:'https://attacker.test',body:'{}'})).status,403);
 assert.equal((await send('/api/auth/sign-in/email',{method:'POST',origin:'http://127.0.0.1:5273',body:JSON.stringify({padding:'x'.repeat(4096)})})).status,400);
 await send('/api/cms/content/groups/settings',{method:'PATCH',origin:'http://127.0.0.1:5273',body:'{"expected":[],"content":{}}'});assert.deepEqual(calls,[{path:'/api/cms/content/groups/settings',raw:'{"expected":[],"content":{}}'}]);
});

async function shutdownFixture(t,handleRequest){
 assert.equal(typeof transport.createBuiltAdminServer,'function');
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'pinky-admin-shutdown-')));
 fs.writeFileSync(path.join(root,'index.html'),'<main>Synthetic shutdown test</main>');
 const app=transport.createBuiltAdminServer({buildRoot:root,handleRequest,authHandler:(_req,res)=>res.end()});
 const {server}=app;server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(async()=>{await app.close();fs.rmSync(root,{recursive:true,force:true});});
 return {...app,port:server.address().port};
}

test('shutdown closes an incomplete API body without dispatching a command',async t=>{
 let commands=0;const {server,port,close}=await shutdownFixture(t,(_req,res)=>{commands++;res.end();});
 const accepted=once(server,'request'),socket=net.createConnection({host:'127.0.0.1',port});socket.on('error',()=>{});socket.resume();
 t.after(()=>socket.destroy());await once(socket,'connect');
 socket.write('POST /api/cms/session HTTP/1.1\r\nHost: 127.0.0.1:5273\r\nContent-Type: application/json\r\nContent-Length: 100\r\n\r\n{');
 await accepted;
 await Promise.race([close(),delay(1000).then(()=>assert.fail('shutdown held by incomplete HTTP body'))]);
 assert.equal(commands,0);assert.equal(server.listening,false);
});

test('shutdown closes a socket with incomplete headers',async t=>{
 const {server,port,close}=await shutdownFixture(t,(_req,res)=>res.end());
 const accepted=once(server,'connection'),socket=net.createConnection({host:'127.0.0.1',port});socket.on('error',()=>{});socket.resume();
 t.after(()=>socket.destroy());await once(socket,'connect');await accepted;
 socket.write('GET /login HTTP/1.1\r\nHost: 127.0.0.1:5273\r\n');
 await Promise.race([close(),delay(1000).then(()=>assert.fail('shutdown held by incomplete headers'))]);
});

test('shutdown drains an already dispatched command even if its client disconnects',async t=>{
 let release,started;const blocked=new Promise(resolve=>{release=resolve;}),dispatched=new Promise(resolve=>{started=resolve;});
 let completed=false;
 const {port,close}=await shutdownFixture(t,async(_req,res)=>{started();await blocked;completed=true;res.end();});
 t.after(()=>release());
 const request=http.request({host:'127.0.0.1',port,path:'/api/cms/session',method:'POST',headers:{host:'127.0.0.1:5273','content-type':'application/json','content-length':2}});
 request.on('error',()=>{});request.end('{}');await dispatched;request.destroy();
 let closed=false;const stopping=close().then(()=>{closed=true;});
 await delay(30);assert.equal(closed,false);assert.equal(completed,false);
 release();await stopping;assert.equal(completed,true);
 // Repeated signals share the completed shutdown instead of closing twice.
 await close();
});

test('shutdown preserves the response of a complete request while its handler drains',async t=>{
 let release,started;const blocked=new Promise(resolve=>{release=resolve;}),dispatched=new Promise(resolve=>{started=resolve;});
 const {port,close}=await shutdownFixture(t,async(_req,res)=>{started();await blocked;res.end('command completed');});
 t.after(()=>release());
 const response=new Promise((resolve,reject)=>{
  const request=http.get({host:'127.0.0.1',port,path:'/api/cms/session',headers:{host:'127.0.0.1:5273'}},res=>{
   let body='';res.on('data',chunk=>{body+=chunk;});res.on('end',()=>resolve(body));res.on('error',reject);
  });request.on('error',reject);
 });
 await dispatched;const closing=close();release();
 assert.equal(await response,'command completed');await closing;
});
