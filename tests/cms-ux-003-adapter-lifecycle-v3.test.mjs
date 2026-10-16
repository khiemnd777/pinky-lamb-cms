import test from 'node:test';
import assert from 'node:assert/strict';
import {attachFixtureAdapter} from './helpers/cms-ux-003-isolation.mjs';
const request=()=>({method:()=> 'GET',url:()=> 'http://127.0.0.1:5173/api/cms/session',postDataJSON:()=>null,headers:()=>({})});
function setup(dispatch){let handler;const page={async route(_pattern,value){handler=value;},async unroute(){}};const fixture={dispatch,errorResponse:()=>({status:403,body:{error:{code:'FORBIDDEN'}}})};return {page,fixture,invoke:route=>handler(route)};}
test('fulfill delivery failure has one response attempt and explicit disposal failure',async()=>{
 const state=setup(async()=>({role:'EDITOR'})),adapter=await attachFixtureAdapter(state.page,state.fixture);let calls=0;
 const operation=state.invoke({request,async fulfill(){calls++;throw Error('Route already handled');}});await operation.catch(()=>{});
 assert.equal(calls,1);await assert.rejects(()=>adapter.dispose(),/Fixture adapter response delivery failed/);
});
test('dispose drains already-started service dispatch before returning',async()=>{
 let release;const pending=new Promise(resolve=>{release=resolve;}),state=setup(()=>pending),adapter=await attachFixtureAdapter(state.page,state.fixture);let delivered=false,disposed=false;
 const operation=state.invoke({request,async fulfill(){delivered=true;}}),closing=adapter.dispose().then(()=>{disposed=true;});
 try{await Promise.resolve();await Promise.resolve();assert.equal(disposed,false);assert.equal(delivered,false);}finally{release({role:'EDITOR'});await operation;await closing;}
 assert.equal(delivered,true);assert.equal(disposed,true);
});
test('service rejection produces exactly one safe error response',async()=>{
 const state=setup(async()=>{throw Error('synthetic-service-failure');}),adapter=await attachFixtureAdapter(state.page,state.fixture),responses=[];
 await state.invoke({request,async fulfill(response){responses.push(response);}});assert.equal(responses.length,1);assert.equal(responses[0].status,403);await adapter.dispose();
});

test('only exact read path with observed native ERR_ABORTED is labelled expected, never mutation',async()=>{
 for(const method of ['GET','PATCH']){let handler;const page={async route(_pattern,value){handler=value;},async unroute(){}};const fixture={async dispatch(){return {};},errorResponse:()=>({status:403,body:{}})},adapter=await attachFixtureAdapter(page,fixture);
 const req={method:()=>method,url:()=> 'http://127.0.0.1:5173/api/cms/media-site/drafts/home-v3/preview',postDataJSON:()=>null,headers:()=>({}),failure:()=>({errorText:'net::ERR_ABORTED'})};await handler({request:()=>req,async fulfill(){throw Error('Route is already handled!');}});
 if(method==='GET'){await adapter.drain();await adapter.dispose();assert.equal(adapter.expectedReadAborts.length,1);assert.equal(adapter.expectedReadAborts[0].requestFailure,'net::ERR_ABORTED');}else await assert.rejects(()=>adapter.dispose(),/response delivery failed/);
 }
});
test('drain waits without disposing the adapter or losing subsequent requests',async()=>{let release;const pending=new Promise(resolve=>{release=resolve;}),state=setup(()=>pending),adapter=await attachFixtureAdapter(state.page,state.fixture);let drained=false;const operation=state.invoke({request,async fulfill(){}}),waiting=adapter.drain().then(()=>{drained=true;});await Promise.resolve();assert.equal(drained,false);release({role:'EDITOR'});await operation;await waiting;await state.invoke({request,async fulfill(){}});await adapter.dispose();assert.equal(adapter.events.length,2);});

test('denied foreign origin preview request can never become expected read abort',async()=>{let handler;const page={async route(_pattern,value){handler=value;},async unroute(){}};let dispatched=false;const fixture={async dispatch(){dispatched=true;return {};},errorResponse:()=>({status:403,body:{}})},adapter=await attachFixtureAdapter(page,fixture);const req={method:()=> 'GET',url:()=> 'https://example.invalid/api/cms/media-site/drafts/home-v3/preview',postDataJSON:()=>null,headers:()=>({}),failure:()=>({errorText:'net::ERR_ABORTED'})};await handler({request:()=>req,async fulfill(){throw Error('Route is already handled!');}});assert.equal(dispatched,false);assert.equal(adapter.events[0].kind,'deny');assert.equal(adapter.expectedReadAborts.length,0);await assert.rejects(()=>adapter.dispose(),/response delivery failed/);});


test('preview delivery failure without exact observed native ERR_ABORTED remains a disposal failure',async()=>{for(const errorText of [null,'net::ERR_FAILED']){let handler;const page={async route(_pattern,value){handler=value;},async unroute(){}};const fixture={async dispatch(){return {};},errorResponse:()=>({status:403,body:{}})},adapter=await attachFixtureAdapter(page,fixture);const req={method:()=> 'GET',url:()=> 'http://127.0.0.1:5173/api/cms/media-site/drafts/home-v3/preview',postDataJSON:()=>null,headers:()=>({}),failure:()=>errorText?{errorText}:null};await handler({request:()=>req,async fulfill(){throw Error('Route is already handled!');}});assert.equal(adapter.expectedReadAborts.length,0);assert.equal(adapter.failures[0].disposition,'FAIL');await assert.rejects(()=>adapter.dispose(),/response delivery failed/);}});
