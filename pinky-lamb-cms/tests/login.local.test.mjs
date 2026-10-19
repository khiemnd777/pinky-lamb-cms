import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {ROOT,validateRuntime} from '../scripts/local-guard.mjs';
import {fixtures,fixturePassword,seedFixtures} from '../scripts/seed-emulators.mjs';
import {auth,db} from '../cms-api/authorization.mjs';
validateRuntime();
// Isolated contexts and the Chromium sandbox; never connect to a personal profile.
// https://playwright.dev/docs/network and https://playwright.dev/docs/test-use-options
test.use({viewport:{width:1440,height:900},launchOptions:{chromiumSandbox:true},trace:'off',video:'off',screenshot:'off',serviceWorkers:'block'});
test.describe.configure({mode:'serial'});
const base='http://127.0.0.1:5173';
const output=path.join(ROOT,'.local/test-outputs/login');
let observations,storageObservations,blocked,pageErrors,consoleErrors,expectedDenialConsoleErrors;
const allowed=url=>['127.0.0.1','[::1]'].includes(new URL(url).hostname);
test.beforeAll(async()=>{mkdirSync(output,{recursive:true});await seedFixtures();});
test.beforeEach(async({context,page})=>{
 observations=[];storageObservations=[];blocked=0;pageErrors=0;consoleErrors=0;expectedDenialConsoleErrors=0;
 await context.route('**/*',async route=>{if(!allowed(route.request().url())){blocked++;await route.abort();}else await route.continue();});
 page.on('response',response=>{const u=new URL(response.url());observations.push({method:response.request().method(),url:u.origin+u.pathname.replace(ROOT,'[workspace]'),status:response.status()});});
 page.on('request',request=>{if(!allowed(request.url()))blocked++;});
 page.on('pageerror',()=>pageErrors++);
 page.on('console',message=>{if(message.type()==='error'){if(/^Failed to load resource: the server responded with a status of (400|401|403)\b/.test(message.text()))expectedDenialConsoleErrors++;else consoleErrors++;}});
 const response=await page.goto(base);expect(response.status()).toBe(200);
});
test.afterEach(async({},info)=>{
 // No headers, queries, bodies, console strings, tokens or passwords in evidence.
 writeFileSync(path.join(output,`${info.title.replace(/[^a-zA-Z0-9_-]/g,'_')}.json`),JSON.stringify({test:info.title,status:info.status,requests:observations,storage:storageObservations,blocked,pageErrors,consoleErrors,expectedDenialConsoleErrors},null,2));
 expect(blocked).toBe(0);expect(pageErrors).toBe(0);expect(consoleErrors).toBe(0);
});
test.afterAll(async()=>{await db.terminate();});
async function login(page,fixture,password=fixturePassword){await page.locator('#email').fill(fixture.email);await page.locator('#password').fill(password);await page.locator('#login-submit').click();}
// Installed Firebase app SDK stores platform heartbeat date/agent metadata.
// The original total-DB-zero oracle was incorrect; Auth/CMS databases still deny.
// @firebase/app/dist/index.cjs.js:868-945, 990-1040; constant local appName/appId.
async function privateStorage(page){
 const result=await page.evaluate(async()=>{
  const databases=await indexedDB.databases();const heartbeat=databases.filter(d=>d.name==='firebase-heartbeat-database');
  let heartbeatStoreNames=[];
  if(heartbeat.length)heartbeatStoreNames=await new Promise((resolve,reject)=>{const request=indexedDB.open('firebase-heartbeat-database');request.onerror=()=>reject(new Error('Metadata inspection failed.'));request.onsuccess=()=>{const database=request.result;const names=Array.from(database.objectStoreNames);database.close();resolve(names);};});
  return {localCount:localStorage.length,sessionCount:sessionStorage.length,indexedDbCount:databases.length-heartbeat.length,heartbeatMetadataDatabaseCount:heartbeat.length,heartbeatStoreNames,cacheCount:(await caches.keys()).length};
 });
 storageObservations.push(result);expect(result.heartbeatMetadataDatabaseCount).toBeLessThanOrEqual(1);expect(result.heartbeatStoreNames).toEqual(result.heartbeatMetadataDatabaseCount?['firebase-heartbeat-store']:[]);
 return {localCount:result.localCount,sessionCount:result.sessionCount,indexedDbCount:result.indexedDbCount,cacheCount:result.cacheCount};
}
for(const role of ['EDITOR','REVIEWER','PUBLISHER','OWNER'])test(`member ${role} session logout and reload memory`,async({page})=>{
 const fixture=fixtures.find(f=>f.role===role && f.active && f.verified);
 await login(page,fixture);await expect(page.locator('#session-panel')).toBeVisible();await expect(page.locator('#session-role')).toHaveText(role);
 expect(await privateStorage(page)).toEqual({localCount:0,sessionCount:0,indexedDbCount:0,cacheCount:0});
 await page.screenshot({path:path.join(output,`${role}-desktop.png`),fullPage:true,mask:[page.locator('#email'),page.locator('#password')]});
 await page.reload();await expect(page.locator('#login-form')).toBeVisible();await expect(page.locator('#session-panel')).toBeHidden();
 await login(page,fixture);await expect(page.locator('#session-panel')).toBeVisible();await page.locator('#logout').click();await expect(page.locator('#session-panel')).toBeHidden();await expect(page.locator('#private-content')).toBeEmpty();
 expect(await page.locator('#preview').getAttribute('srcdoc')).toBeFalsy();
 expect(await privateStorage(page)).toEqual({localCount:0,sessionCount:0,indexedDbCount:0,cacheCount:0});
});
test('generic bad credentials and no signup interface at mobile width',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await login(page,fixtures[0],'IncorrectLocalFixturePassword');await expect(page.locator('#status')).toHaveText('Không thể đăng nhập. Vui lòng kiểm tra thông tin và thử lại.');await expect(page.locator('#session-panel')).toBeHidden();
 await expect(page.locator('#login-submit')).toBeEnabled();await expect(page.locator('#password')).toHaveValue('');
 await expect(page.locator('#status')).not.toContainText(/auth\/|password|token|editor@|stack/i);
 expect(await page.getByRole('button',{name:/đăng ký|signup|reset/i}).count()).toBe(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.screenshot({path:path.join(output,'login-mobile-error.png'),fullPage:true,mask:[page.locator('#email'),page.locator('#password')]});
});
for(const uid of ['fixture-unknown','fixture-inactive','fixture-unverified'])test(`membership denies ${uid}`,async({page})=>{
 const response=page.waitForResponse(r=>r.url().includes('/api/cms/session'));
 await login(page,fixtures.find(f=>f.uid===uid));expect((await response).status()).toBe(403);await expect(page.locator('#session-panel')).toBeHidden();await expect(page.locator('#status')).not.toHaveText('');await expect(page.locator('#private-content')).toBeEmpty();
 await expect(page.locator('#login-form')).toBeVisible();await expect(page.locator('#status')).toHaveText('Không thể truy cập nội dung. Vui lòng kiểm tra quyền hoặc đăng nhập lại.');
 expect(observations.some(r=>r.url.endsWith('/api/cms/drafts/home') && r.status===200)).toBe(false);
});
test('changed email denies membership and disabled identity denies sign-in',async({page})=>{
 const member=fixtures[0];await auth.updateUser(member.uid,{email:'changed-editor@pinky.test'});
 try{const response=page.waitForResponse(r=>r.url().includes('/api/cms/session'));await login(page,{email:'changed-editor@pinky.test'});expect((await response).status()).toBe(403);await expect(page.locator('#session-panel')).toBeHidden();await expect(page.locator('#login-form')).toBeVisible();await expect(page.locator('#status')).toHaveText('Không thể truy cập nội dung. Vui lòng kiểm tra quyền hoặc đăng nhập lại.');}
 finally{await auth.updateUser(member.uid,{email:member.email});}
 await auth.updateUser(member.uid,{disabled:true});
 try{await page.reload();await login(page,member);await expect(page.locator('#status')).toHaveText('Không thể đăng nhập. Vui lòng kiểm tra thông tin và thử lại.');await expect(page.locator('#session-panel')).toBeHidden();await expect(page.locator('#login-submit')).toBeEnabled();await expect(page.locator('#password')).toHaveValue('');}
 finally{await auth.updateUser(member.uid,{disabled:false});}
});
test('self signup auth identity cannot gain CMS membership',async({page})=>{
 const email='self-signup-browser@pinky.test';let createdUid;
 try{
  // This is an authorized synthetic emulator write. Response stays in memory.
  const result=await page.evaluate(async({email,password})=>{const response=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-local',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})});const body=await response.json();return {ok:response.ok,uid:body.localId};},{email,password:fixturePassword});
  expect(result.ok).toBe(true);createdUid=result.uid;
  const response=page.waitForResponse(r=>r.url().includes('/api/cms/session'));await login(page,{email});expect((await response).status()).toBe(403);await expect(page.locator('#session-panel')).toBeHidden();await expect(page.locator('#private-content')).toBeEmpty();
  await expect(page.locator('#login-form')).toBeVisible();await expect(page.locator('#status')).toHaveText('Không thể truy cập nội dung. Vui lòng kiểm tra quyền hoặc đăng nhập lại.');
 }finally{if(createdUid)await auth.deleteUser(createdUid);}
});
test('logout while saved session response pending cannot restore private state',async({page})=>{
 let release,held,done;const gate=new Promise(resolve=>release=resolve);const entered=new Promise(resolve=>held=resolve);const completed=new Promise(resolve=>done=resolve);
 await page.route('**/api/cms/session',async route=>{const response=await route.fetch();held();await gate;try{await route.fulfill({response});}catch{/* Sign-out may abort the captured request. */}finally{done();}});
 await login(page,fixtures[0]);await entered;await expect(page.locator('#logout')).toBeVisible();await page.locator('#logout').click();release();
 await expect(page.locator('#login-form')).toBeVisible();await expect(page.locator('#session-panel')).toBeHidden();await expect(page.locator('#private-content')).toBeEmpty();expect(await page.locator('#preview').getAttribute('srcdoc')).toBeFalsy();
 // Wait for route completion through a subsequent same-origin response.
 await completed;await page.request.get(base);await expect(page.locator('#session-panel')).toBeHidden();expect(await privateStorage(page)).toEqual({localCount:0,sessionCount:0,indexedDbCount:0,cacheCount:0});
});
