import test from 'node:test';
import assert from 'node:assert/strict';
import {acquireMediaPreviewBinary,beginMediaPreviewBinary} from '../admin/media-file-preview.mjs';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const finish=reservation=>{reservation.release();reservation.settle();};

test('concurrent binary admissions serialize until actual settle, not release alone',async()=>{
 const first=beginMediaPreviewBinary(1);let secondReady=false,thirdReady=false;
 const secondPromise=acquireMediaPreviewBinary(2).then(value=>{secondReady=true;return value;}),thirdPromise=acquireMediaPreviewBinary(3).then(value=>{thirdReady=true;return value;});
 await tick();assert.equal(secondReady,false);assert.equal(thirdReady,false);first.release();await tick();assert.equal(secondReady,false,'release is not promise settlement');first.settle();
 const second=await secondPromise;assert.equal(secondReady,true);assert.equal(thirdReady,false);assert.throws(()=>beginMediaPreviewBinary(1),/PREVIEW_BUSY/);finish(second);
 const third=await thirdPromise;assert.equal(thirdReady,true);finish(third);
});
test('aborting a queued request removes only that waiter and preserves active custody',async()=>{
 const first=beginMediaPreviewBinary(1),controller=new AbortController();const aborted=acquireMediaPreviewBinary(2,null,{signal:controller.signal});let nextReady=false;const nextPromise=acquireMediaPreviewBinary(3).then(value=>{nextReady=true;return value;});
 controller.abort();await assert.rejects(aborted,{name:'AbortError'});await tick();assert.equal(nextReady,false);assert.throws(()=>beginMediaPreviewBinary(1),/PREVIEW_BUSY/);finish(first);finish(await nextPromise);
});
test('stale active caller keeps lock through late cleanup until its real operation settles',async()=>{
 const controller=new AbortController(),first=await acquireMediaPreviewBinary(4,null,{signal:controller.signal});let nextReady=false;const nextPromise=acquireMediaPreviewBinary(1).then(value=>{nextReady=true;return value;});
 controller.abort();await tick();assert.equal(nextReady,false,'abort cannot release an active reservation');first.release();await tick();assert.equal(nextReady,false,'stale cleanup release cannot admit another binary before settle');first.settle();finish(await nextPromise);
});
test('64MiB cap, retained budget rejection and original synchronous guard remain unchanged',async()=>{
 for(const bytes of [0,-1,NaN,Infinity,64*1048576+1])await assert.rejects(acquireMediaPreviewBinary(bytes),/PREVIEW_BYTES/);
 const full=await acquireMediaPreviewBinary(64*1048576);full.settle();
 try{await assert.rejects(acquireMediaPreviewBinary(1),/PREVIEW_BUDGET/);assert.throws(()=>beginMediaPreviewBinary(1),/PREVIEW_BUDGET/);}finally{full.release();}
 const after=beginMediaPreviewBinary(1);assert.throws(()=>beginMediaPreviewBinary(1),/PREVIEW_BUSY/);finish(after);
});
test('already aborted signal never reserves bytes or a binary slot',async()=>{
 const controller=new AbortController();controller.abort();await assert.rejects(acquireMediaPreviewBinary(1,null,{signal:controller.signal}),{name:'AbortError'});finish(beginMediaPreviewBinary(64*1048576));
});
