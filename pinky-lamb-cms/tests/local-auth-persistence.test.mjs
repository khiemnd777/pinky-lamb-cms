import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import Database from 'better-sqlite3';
import {openLocalAuth} from '../cms-api/local-auth.mjs';
const origin='http://127.0.0.1:5273',prefix='pinky-lamb-local.session_token';
async function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pinky-auth-remember-'));fs.chmodSync(root,0o700);let sqlite=new Database(path.join(root,'auth.sqlite'));
 let local=await openLocalAuth({root,sqlite,create:true,allowEnrollment:true});
 t.after(()=>{sqlite.close();fs.rmSync(root,{recursive:true,force:true});});
 const email='remember@example.invalid',password=randomUUID()+randomUUID();
 await local.auth.api.signUpEmail({body:{name:'Synthetic remember test',email,password}});
 sqlite.prepare('UPDATE user SET emailVerified=1 WHERE email=?').run(email);
 const user=sqlite.prepare('SELECT id FROM user WHERE email=?').get(email);
 sqlite.prepare('INSERT INTO cms_auth_links VALUES (?,?,?,?,?)').run(user.id,'synthetic-remember',email,0,1);
 const response=await local.auth.api.signInEmail({body:{email,password,rememberMe:true},asResponse:true});
 // Keep opaque test cookies only in process memory. Assertions never print values.
 const cookies=response.headers.getSetCookie(),sessionCookie=cookies.find(v=>v.startsWith(prefix+'='))??cookies.find(v=>v.includes('.session_token='));
 return {local,cookies,cookie:sessionCookie?.split(';')[0],async signInAgain(){return local.auth.api.signInEmail({body:{email,password,rememberMe:true},asResponse:true});},async restart(){sqlite.close();sqlite=new Database(path.join(root,'auth.sqlite'));local=await openLocalAuth({root,sqlite});this.local=local;return local;},age(){sqlite.prepare('UPDATE session SET updatedAt=?,expiresAt=?').run(Date.now()-2*86400000,Date.now()+28*86400000);},revoke(){sqlite.exec('DELETE FROM session');}};
}
test('remembered local cookie is app-scoped, persistent, HttpOnly, SameSite and survives a database/server reopen',async t=>{
 const f=await fixture(t);assert.ok(f.cookies.some(v=>v.startsWith(prefix+'=')),'Pinky Lamb must own a separate cookie name');
 assert.ok(f.cookies.some(v=>/Max-Age=2592000/i.test(v)),'remember for 30 days');assert.ok(f.cookies.some(v=>/HttpOnly/i.test(v)));assert.ok(f.cookies.some(v=>/SameSite=Lax/i.test(v)));
 assert.ok(await f.local.getSession({headers:{cookie:f.cookie}}),'initial session');await f.restart();assert.ok(await f.local.getSession({headers:{cookie:f.cookie}}),'same cookie survives restart');
 f.revoke();assert.ok(!await f.local.getSession({headers:{cookie:f.cookie}}),'revoked sessions stay revoked');
});
test('valid legacy cookie upgrades through the normal session endpoint; missing/invalid cookies never create a session',async t=>{
 const f=await fixture(t),legacy=f.cookie.replace(/^[^=]+=/,'better-auth.session_token=');
 const response=await f.local.auth.handler(new Request(origin+'/api/auth/get-session',{headers:{cookie:legacy}}));
 assert.ok(response.ok);assert.ok((await response.json())?.user,'valid legacy session stays usable');
 assert.ok(response.headers.getSetCookie().some(v=>v.startsWith(prefix+'=')),'reissue only the Pinky Lamb cookie after normal verification');
 for(const cookie of ['', 'better-auth.session_token=invalid']){const invalid=await f.local.auth.handler(new Request(origin+'/api/auth/get-session',{headers:{cookie}}));assert.ok(!(await invalid.json())?.user,'no cookie must not grant an identity');}
});


test('another local application cannot override a valid scoped cookie; logout remains terminal',async t=>{
 const f=await fixture(t);assert.ok(await f.local.getSession({headers:{cookie:f.cookie+'; better-auth.session_token=foreign-app'}}));
 const out=await f.local.auth.handler(new Request(origin+'/api/auth/sign-out',{method:'POST',headers:{cookie:f.cookie,origin,'content-type':'application/json'},body:'{}'}));assert.ok(out.ok);assert.ok(!await f.local.getSession({headers:{cookie:f.cookie}}));
});
test('active remembered session renews its database and cookie expiry together',async t=>{
 const f=await fixture(t);f.age();const response=await f.local.auth.handler(new Request(origin+'/api/auth/get-session',{headers:{cookie:f.cookie}}));assert.ok(response.ok);const body=await response.json();assert.ok(new Date(body.session.expiresAt).getTime()>Date.now()+29*86400000,'active session renewed');
 assert.ok(response.headers.getSetCookie().filter(v=>v.startsWith(prefix+'=')).every(v=>{const age=/Max-Age=(\d+)/i.exec(v);return age&&Number(age[1])>29*86400;}),'cookie and database lifetime stay aligned');
});


test('explicit logout cannot revive another valid legacy session left by an earlier login',async t=>{
 const f=await fixture(t),legacy=f.cookie.replace(/^[^=]+=/,'better-auth.session_token='),second=await f.signInAgain(),scoped=second.headers.getSetCookie().find(v=>v.startsWith(prefix+'=')).split(';')[0];
 const out=await f.local.auth.handler(new Request(origin+'/api/auth/sign-out',{method:'POST',headers:{cookie:scoped+'; '+legacy,origin,'content-type':'application/json'},body:'{}'}));assert.ok(out.ok);
 const marker=out.headers.getSetCookie().find(v=>v.startsWith('pinky-lamb-local.legacy_retired='));assert.ok(marker,'logout must retire the legacy compatibility path');
 const response=await f.local.auth.handler(new Request(origin+'/api/auth/get-session',{headers:{cookie:legacy+'; '+marker.split(';')[0]}}));assert.ok(!(await response.json())?.user,'old session must not silently restore after logout');
});
