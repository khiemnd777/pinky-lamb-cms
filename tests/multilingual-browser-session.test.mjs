import {test} from 'node:test';
import {EventEmitter} from 'node:events';
import {projectReadonlyPhases} from './helpers/project-localization-live.mjs';
import assert from 'node:assert/strict';
import {MultilingualBrowserSession} from './helpers/multilingual-browser-session.mjs';

function fixture(phases={}) {
 let closed=false;const state={session:'IN_MEMORY_ONLY'};
 const browser={isConnected:()=>!closed,close:async()=>{closed=true;}};
 const page={isClosed:()=>closed,evaluate:async()=>true};
 const context={pages:()=>[page],route:async(_pattern,handler)=>{context.fence=handler;}};
 const checkpoints=[];
 return {browser,context,page,state,checkpoints,owner:new MultilingualBrowserSession({browser,context,page,phases,checkpoint:record=>checkpoints.push(record)})};
}
test('readonly assertion failure retains identities and state, retry runs only selected phase',async()=>{
 let calls=0;const f=fixture({visual:{run:async()=>{if(++calls===1)throw Error('secret assertion detail');}}});
 await f.owner.installFence();await assert.rejects(f.owner.resumeReadonly('visual'));
 assert.equal(f.owner.browser,f.browser);assert.equal(f.owner.context,f.context);assert.equal(f.owner.page,f.page);assert.equal(f.state.session,'IN_MEMORY_ONLY');
 assert.equal((await f.owner.status()).alive,true);await f.owner.resumeReadonly('visual');assert.equal(calls,2);
 assert.equal(JSON.stringify(f.checkpoints).includes('secret'),false);
});
test('login wait expiry keeps healthy browser alive; explicit close is separate',async()=>{
 const f=fixture();assert.equal(await f.owner.waitForLogin(async()=>false,1),false);
 assert.equal((await f.owner.status()).state,'LOGIN_WAIT_EXPIRED');assert.equal((await f.owner.status()).alive,true);
 await f.owner.close();assert.equal((await f.owner.status()).alive,false);
});
test('default fence denies mutation; failure revokes stage permit; completed write cannot replay',async()=>{
 let writes=0;const f=fixture({write:{kind:'write',authorize:()=>true,run:async()=>{writes++;}},later:{kind:'write',authorize:()=>true,run:async()=>{writes++;}},broken:{kind:'write',authorize:()=>true,run:async()=>{throw Error('failure');}}});
 await f.owner.installFence();let denied=0;await f.context.fence({request:()=>({method:()=> 'PUT'}),abort:async()=>{denied++;},continue:async()=>{throw Error('must deny');}});assert.equal(denied,1);
 await f.owner.runPhase('write');await assert.rejects(f.owner.runPhase('write'),/already/);assert.equal(writes,1);
 await assert.rejects(f.owner.runPhase('broken'));await assert.rejects(f.owner.runPhase('later'),/read-only/);await assert.rejects(f.owner.runPhase('broken'),/read-only/);
 assert.equal((await f.owner.status()).mutationsAllowed,false);assert.equal(f.checkpoints[0].stage,'write');
});
test('finish verifies cleanup before close; cleanup failure keeps browser for inspection',async()=>{
 const f=fixture();await assert.rejects(f.owner.finish(async()=>{throw Error('cleanup');}));assert.equal((await f.owner.status()).alive,true);
 await f.owner.finish(async()=>{});assert.equal((await f.owner.status()).state,'CLOSED');
});

test('concurrent stage requests cannot overlap or run after close',async()=>{
 let release;const held=new Promise(resolve=>{release=resolve;});let calls=0;
 const f=fixture({visual:{run:async()=>{calls++;await held;}}});
 const first=f.owner.resumeReadonly('visual');await new Promise(resolve=>setTimeout(resolve,0));
 await assert.rejects(f.owner.resumeReadonly('visual'),/busy/);await assert.rejects(f.owner.close(),/busy/);
 release();await first;assert.equal(calls,1);await f.owner.close();await assert.rejects(f.owner.resumeReadonly('visual'),/unavailable/);
});

test('finish holds busy lock until cleanup and browser disposal complete',async()=>{
 let release;const held=new Promise(resolve=>{release=resolve;});const f=fixture({visual:{run:async()=>{}}});
 const finishing=f.owner.finish(async()=>held);await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal((await f.owner.status()).busy,true);
 await assert.rejects(f.owner.resumeReadonly('visual'),/busy/);await assert.rejects(f.owner.close(),/busy/);await assert.rejects(f.owner.finish(async()=>{}),/busy/);
 release();await finishing;assert.equal((await f.owner.status()).state,'CLOSED');
});
test('explicit normal login revalidation after timeout permits only unattempted future stages in same owner',async()=>{
 let writes=0;const f=fixture({later:{kind:'write',authorize:()=>true,run:async()=>{writes++;}}});
 await f.owner.waitForLogin(async()=>false,1);await assert.rejects(f.owner.confirmLogin(async()=>false),/not ready/);
 assert.equal((await f.owner.status()).mode,'READ_ONLY');await f.owner.confirmLogin(async()=>true);
 assert.equal(f.owner.page,f.page);assert.equal(f.owner.context,f.context);assert.equal((await f.owner.status()).mode,'DEFAULT_DENY');
 await f.owner.runPhase('later');assert.equal(writes,1);await assert.rejects(f.owner.runPhase('later'),/already/);
});
test('revalidation cannot lift failure, unknown writes or crashed browser',async()=>{
 const failed=fixture({visual:{run:async()=>{throw Error('failure');}}});
 await assert.rejects(failed.owner.resumeReadonly('visual'));await failed.owner.waitForLogin(async()=>false,1);
 await assert.rejects(failed.owner.confirmLogin(async()=>true),/unavailable/);
 const unknown=fixture({write:{kind:'write',authorize:()=>true,run:async()=>{throw Error('unknown outcome');}}});
 await assert.rejects(unknown.owner.runPhase('write'));await unknown.owner.waitForLogin(async()=>false,1);
 await assert.rejects(unknown.owner.confirmLogin(async()=>true),/unavailable/);
 const crashed=fixture();await crashed.owner.waitForLogin(async()=>false,1);await crashed.browser.close();
 await assert.rejects(crashed.owner.confirmLogin(async()=>true),/unavailable/);assert.equal((await crashed.owner.status()).state,'CLOSED');
 const unavailable=fixture();await unavailable.browser.close();await assert.rejects(unavailable.owner.waitForLogin(async()=>true,1));
 assert.equal((await unavailable.owner.status()).state,'CLOSED');
});

test('readonly replacement preserves write history and failure mode; rejects write/unknown/busy',async()=>{
 let writes=0;const f=fixture({visual:{run:async()=>{throw Error('bad helper');}},write:{kind:'write',authorize:()=>true,run:async()=>{writes++;}}});
 await f.owner.runPhase('write');await assert.rejects(f.owner.resumeReadonly('visual'));
 await assert.rejects(f.owner.replaceReadonlyPhases({write:{run:async()=>{}}}),/Write/);
 await assert.rejects(f.owner.replaceReadonlyPhases({visual:{kind:'write',run:async()=>{}}}),/Write/);
 await assert.rejects(f.owner.replaceReadonlyPhases({unknown:{run:async()=>{}}}),/Unknown/);
 const history=(await f.owner.status()).attemptedWriteStages;
 await f.owner.replaceReadonlyPhases({visual:{run:async()=>{}}});await f.owner.resumeReadonly('visual');
 assert.deepEqual((await f.owner.status()).attemptedWriteStages,history);assert.equal((await f.owner.status()).mode,'READ_ONLY');
 await assert.rejects(f.owner.runPhase('write'));assert.equal(writes,1);
 let release;const held=new Promise(resolve=>{release=resolve;});await f.owner.replaceReadonlyPhases({visual:{run:async()=>held}});
 const pending=f.owner.resumeReadonly('visual');await new Promise(resolve=>setTimeout(resolve,0));
 await assert.rejects(f.owner.replaceReadonlyPhases({visual:{run:async()=>{}}}),/busy/);release();await pending;
});

test('Project consumer dispose removes its response listener before replacement',()=>{
 const page=new EventEmitter();const first=projectReadonlyPhases({page,fixture:{},run:'/unused'});
 assert.equal(page.listenerCount('response'),1);first.dispose();assert.equal(page.listenerCount('response'),0);
 const next=projectReadonlyPhases({page,fixture:{},run:'/unused',generation:1});
 assert.equal(page.listenerCount('response'),1);next.dispose();assert.equal(page.listenerCount('response'),0);
});
