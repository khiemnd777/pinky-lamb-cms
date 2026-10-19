import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalAuthClient} from '../admin/local-auth-client.mjs';
import {localSignInMessage} from '../admin/auth-session.mjs';

test('local sign-in asks for a remembered server session and retains identity on a failed restore',async()=>{
 const original=globalThis.fetch,requests=[];
 try{
  globalThis.fetch=async(path,options)=>{requests.push({path,options});if(path.endsWith('/sign-in/email'))return {ok:true,json:async()=>({user:{id:'synthetic-owner'}})};throw Error('temporary network outage');};
  const client=createLocalAuthClient();await client.signInWithEmailAndPassword(client.auth,'synthetic@example.invalid','synthetic-password');
  assert.deepEqual(JSON.parse(requests[0].options.body),{email:'synthetic@example.invalid',password:'synthetic-password',rememberMe:true});
  await assert.rejects(client.auth.authStateReady(),/temporary network outage/);
  assert.equal(client.auth.currentUser.id,'synthetic-owner');
 }finally{globalThis.fetch=original;}
});

test('local sign-in preserves HTTP failure status for a useful safe message',async()=>{
 const original=globalThis.fetch;
 try{
  globalThis.fetch=async()=>({ok:false,status:429});const client=createLocalAuthClient();
  await assert.rejects(client.signInWithEmailAndPassword(client.auth,'synthetic@example.invalid','synthetic-password'),error=>error.status===429);
  assert.match(localSignInMessage({status:429}),/quá nhiều lần/);
  assert.match(localSignInMessage({status:401}),/từ chối/);
  assert.match(localSignInMessage({status:503}),/dịch vụ/);
 }finally{globalThis.fetch=original;}
});
