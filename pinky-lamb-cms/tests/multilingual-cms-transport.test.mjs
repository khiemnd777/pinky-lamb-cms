import test from 'node:test';
import assert from 'node:assert/strict';
import {createMultilingualReleaseReader} from '../scripts/multilingual-cms-transport.mjs';
import {digest} from '../scripts/multilingual-release-files.mjs';
const descriptor={id:'synthetic-media',path:'assets/synthetic-media-preview.webp',url:'http://127.0.0.1:5173/api/cms/media/synthetic-media/derivatives/preview',mimeType:'image/webp',sizeBytes:1,sha256:digest('x'),derivative:{key:'preview',bytes:1,mime:'image/webp',sha256:digest('x')}};
test('release reader calls only the fixed local endpoint and verifies authenticated immutable media bytes',async()=>{
 const calls=[],reader=createMultilingualReleaseReader(()=> 'synthetic-session-token-value',{fetchLocal:async(url,options)=>{calls.push({url,options});return url.endsWith('/release')?new Response(JSON.stringify({data:{frozen:true}}),{headers:{'Content-Type':'application/json'}}):new Response('x',{headers:{'Content-Type':'image/webp'}});}});
 assert.deepEqual(await reader.release(),{frozen:true});assert.equal((await reader.resource(descriptor)).toString(),'x');assert.equal((await reader.resource({...descriptor,id:'synthetic-media-poster',assetId:'synthetic-media',derivative:{...descriptor.derivative,role:'POSTER'}})).toString(),'x');assert.ok(calls.every(call=>call.url.startsWith('http://127.0.0.1:5173/api/cms/')));assert.ok(calls.every(call=>call.options.redirect==='error'));
});
test('foreign destination, changed bytes, oversized stream and wrong MIME cannot become public release bytes',async()=>{
 let requests=0;const reader=createMultilingualReleaseReader(()=> 'synthetic-session-token-value',{fetchLocal:async()=>{requests++;return new Response('x',{headers:{'Content-Type':'image/webp'}});}});
 await assert.rejects(reader.resource({...descriptor,url:'https://example.test/api/cms/media/synthetic-media/derivatives/preview'}));assert.equal(requests,0);
 for(const response of [new Response('y',{headers:{'Content-Type':'image/webp'}}),new Response('xx',{headers:{'Content-Type':'image/webp'}}),new Response('x',{headers:{'Content-Type':'text/plain'}})]){
  const bounded=createMultilingualReleaseReader(()=> 'synthetic-session-token-value',{fetchLocal:async()=>response});await assert.rejects(bounded.resource(descriptor));
 }
});
