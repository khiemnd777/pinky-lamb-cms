import {test} from 'node:test';
import assert from 'node:assert/strict';
import {authFailureAction,rememberingAvailable,persistenceHierarchy} from '../admin/auth-session.mjs';

test('temporary Auth/API failures retain identity; terminal identity/membership clears',()=>{
 for(const error of [{code:'auth/network-request-failed'},{code:'SESSION_API_TIMEOUT'},{status:500},{status:503},new TypeError('fetch failed')])assert.equal(authFailureAction(error),'KEEP_IDENTITY');
 for(const error of [{code:'auth/user-disabled'},{code:'auth/user-token-expired'},{code:'auth/invalid-user-token'},{code:'auth/id-token-revoked'},{status:401},{status:403}])assert.equal(authFailureAction(error),'SIGN_OUT');
 assert.equal(authFailureAction({status:403,code:'SELF_REVIEW_FORBIDDEN'}),'KEEP_IDENTITY');
});
test('persistence hierarchy prefers IndexedDB then local storage and reports blocked storage',async()=>{
 const sdk={indexedDBLocalPersistence:{id:'idb'},browserLocalPersistence:{id:'local'},inMemoryPersistence:{id:'memory'}};
 assert.deepEqual(persistenceHierarchy(sdk),[sdk.indexedDBLocalPersistence,sdk.browserLocalPersistence,sdk.inMemoryPersistence]);
 assert.equal(await rememberingAvailable({indexedDB:null,storage:()=>{throw Error('blocked');}}),false);
 const values=new Map();assert.equal(await rememberingAvailable({indexedDB:null,storage:()=>({setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)})}),true);assert.equal(values.size,0);
});

function idbFixture({blockedWrite=false,late=false}={}){
 const names=[],deleted=[],requests=[],transactions=[],writes=[];let closed=0;
 const indexedDB={open(name){
  names.push(name);const database={createObjectStore(){},close(){closed++;},transaction(store,mode){
   assert.equal(store,'probe');assert.equal(mode,'readwrite');if(blockedWrite)throw Error('Read-only quota');
   const transaction={objectStore:()=>({put:(value,key)=>writes.push({value,key})})};transactions.push(transaction);return transaction;
  }};
  const request={result:database,transaction:{abort(){}}};requests.push(request);
  queueMicrotask(()=>{request.onupgradeneeded?.();if(!late)request.onsuccess?.();});return request;
 },deleteDatabase:name=>deleted.push(name)};
 return {indexedDB,names,deleted,requests,transactions,writes,closed:()=>closed};
}
const blockedStorage=()=>{throw Error('Storage blocked');};

test('opening IndexedDB without write permission does not claim remembered persistence',async()=>{
 const f=idbFixture({blockedWrite:true});assert.equal(await rememberingAvailable({indexedDB:f.indexedDB,storage:blockedStorage}),false);
 assert.equal(f.closed(),1);assert.deepEqual(f.deleted,f.names);
});
test('IndexedDB probe reports available only after own marker transaction completes; names are unique',async()=>{
 const first=idbFixture();let settled=false;
 const result=rememberingAvailable({indexedDB:first.indexedDB,storage:blockedStorage}).then(value=>{settled=true;return value;});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(settled,false);assert.deepEqual(first.writes,[{value:'1',key:'available'}]);first.transactions[0].oncomplete();assert.equal(await result,true);
 const second=idbFixture();const next=rememberingAvailable({indexedDB:second.indexedDB,storage:blockedStorage});await new Promise(resolve=>setImmediate(resolve));second.transactions[0].oncomplete();assert.equal(await next,true);
 assert.notEqual(first.names[0],second.names[0]);assert.deepEqual(first.deleted,first.names);assert.deepEqual(second.deleted,second.names);
});
test('timeout followed by late IndexedDB success closes and deletes only the unique probe',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const f=idbFixture({late:true});
 const result=rememberingAvailable({indexedDB:f.indexedDB,storage:blockedStorage});
 t.mock.timers.tick(1500);assert.equal(await result,false);
 f.requests[0].onsuccess();assert.equal(f.closed(),1);assert.equal(f.transactions.length,0);assert.ok(f.deleted.length>=1);assert.ok(f.deleted.every(name=>name===f.names[0]));
});
