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
