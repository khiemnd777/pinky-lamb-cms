import test from 'node:test';
import assert from 'node:assert/strict';
import {createReadinessReader} from '../admin/readiness-reader.mjs';
const path='/api/cms/localizations/editorial/readiness';
test('simultaneous readiness consumers share transport; a later read is fresh',async()=>{
 let calls=0,finish;const reader=createReadinessReader(async()=>{calls++;return new Promise(resolve=>finish=resolve);}),a=reader.apiFetch(path),b=reader.apiFetch(path);assert.equal(calls,1);finish({generation:3});assert.deepEqual(await a,await b);const c=reader.apiFetch(path);assert.equal(calls,2);finish({generation:4});assert.equal((await c).generation,4);reader.destroy();
});
test('consumer cancellation does not cancel another consumer; workspace close aborts transport',async()=>{
 let finish,transport;const reader=createReadinessReader(async(_path,options)=>{transport=options.signal;return new Promise(resolve=>finish=resolve);}),cancel=new AbortController(),a=reader.apiFetch(path,{signal:cancel.signal}),b=reader.apiFetch(path);cancel.abort();await assert.rejects(a,{name:'AbortError'});assert.equal(transport.aborted,false);finish({generation:1});assert.deepEqual(await b,{generation:1});reader.destroy();assert.equal(transport.aborted,true);assert.throws(()=>reader.apiFetch(path),{name:'AbortError'});
});
