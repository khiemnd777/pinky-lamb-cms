import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {createBuiltAdminApplication} from '../cms-api/local-admin-server.mjs';

test('built Admin transport preserves canonical bodies, protects private paths and bounds Auth routes',async t=>{
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'pinky-built-transport-')));fs.mkdirSync(root+'/assets');fs.writeFileSync(root+'/index.html','<main>Built Admin</main>');fs.writeFileSync(root+'/assets/app-123.js','export const built=true;');
 fs.writeFileSync(root+'/private-key.fixture','synthetic private bytes');fs.symlinkSync(root+'/private-key.fixture',root+'/assets/leak.js');
 const calls=[],app=createBuiltAdminApplication({buildRoot:root,handleRequest:(req,res)=>{calls.push({path:req.path,raw:req.rawBody.toString('utf8')});res.status(200).json({ok:true});},authHandler:(_req,res)=>res.status(200).json({user:null})});
 const server=http.createServer(app);await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});t.after(async()=>{await new Promise(resolve=>server.close(resolve));fs.rmSync(root,{recursive:true,force:true});});
 const send=(url,{method='GET',host='127.0.0.1:5273',origin,body}={})=>new Promise((resolve,reject)=>{const headers={host,...(origin?{origin}:{}),...(body?{'content-type':'application/json','content-length':Buffer.byteLength(body)}:{})};const req=http.request({host:'127.0.0.1',port:server.address().port,path:url,method,headers},res=>{let text='';res.on('data',c=>text+=c);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,text}));});req.on('error',reject);req.end(body);});
 const html=await send('/login');assert.equal(html.status,200);assert.equal(html.headers['cache-control'],'no-store');assert.match(html.text,/Built Admin/);
 const asset=await send('/assets/app-123.js');assert.equal(asset.status,200);assert.match(asset.headers['cache-control'],/immutable/);
 for(const url of ['/assets/leak.js','/cms-api/index.mjs','/.cms-data-local/cms.sqlite','/assets/%2e%2e/index.html','/contracts/baseline-site.json'])assert.equal((await send(url)).status,404,url);
 assert.equal((await send('/login',{host:'attacker.test:5273'})).status,403);assert.equal((await send('/api/auth/sign-up/email',{method:'POST',origin:'http://127.0.0.1:5273',body:'{}'})).status,404);
 assert.equal((await send('/api/auth/sign-in/email',{method:'POST',origin:'https://attacker.test',body:'{}'})).status,403);
 assert.equal((await send('/api/auth/sign-in/email',{method:'POST',origin:'http://127.0.0.1:5273',body:JSON.stringify({padding:'x'.repeat(4096)})})).status,400);
 await send('/api/cms/content/groups/settings',{method:'PATCH',origin:'http://127.0.0.1:5273',body:'{"expected":[],"content":{}}'});assert.deepEqual(calls,[{path:'/api/cms/content/groups/settings',raw:'{"expected":[],"content":{}}'}]);
});
