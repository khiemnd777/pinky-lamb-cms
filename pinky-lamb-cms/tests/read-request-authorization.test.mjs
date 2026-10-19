import test from 'node:test';
import assert from 'node:assert/strict';
import {authorizeReadRequest} from '../cms-api/read-request-authorization.mjs';
test('read authorization is shared only inside one HTTP request',async()=>{
 let calls=0;const resolve=async()=>({version:++calls}),a={method:'GET'},b={method:'GET'};assert.deepEqual(await Promise.all([authorizeReadRequest(a,'MEMBER_READ',null,resolve),authorizeReadRequest(a,'MEMBER_READ',null,resolve)]),[{version:1},{version:1}]);assert.equal((await authorizeReadRequest(b,'MEMBER_READ',null,resolve)).version,2);
});
test('commands, retries in transactions and failed authorization never reuse an actor',async()=>{
 let calls=0,allowed=true;const resolve=async()=>{calls++;if(!allowed)throw Error('Revoked');return {version:calls};},request={method:'GET'};await authorizeReadRequest(request,'MEMBER_READ',null,resolve);allowed=false;await assert.rejects(authorizeReadRequest(request,'MEMBER_READ',{},resolve),/Revoked/);await assert.rejects(authorizeReadRequest(request,'DRAFT_SAVE',null,resolve),/Revoked/);await assert.rejects(authorizeReadRequest({method:'POST'},'MEMBER_READ',null,resolve),/Revoked/);
 const denied={method:'GET'};await assert.rejects(authorizeReadRequest(denied,'MEMBER_READ',null,resolve),/Revoked/);allowed=true;assert.equal((await authorizeReadRequest(denied,'MEMBER_READ',null,resolve)).version,6);
});
