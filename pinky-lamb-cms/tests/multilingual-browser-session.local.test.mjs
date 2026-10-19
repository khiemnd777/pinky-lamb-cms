import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdirSync,realpathSync,writeFileSync,readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {MultilingualBrowserSession} from './helpers/multilingual-browser-session.mjs';

const root=realpathSync(fileURLToPath(new URL('..',import.meta.url)));
const output=path.join(root,'.local/test-outputs/cms-auth-remember-001/v1',`fixture-${Date.now()}-${process.pid}`);
mkdirSync(output,{recursive:true,mode:0o700});
if(realpathSync(output)!==output)throw Error('Output symlink rejected');

test('owned Chromium retains same browser/context/page/in-memory state after visual failure and login timeout',async()=>{
 assert.equal(process.version,'v22.23.3');
 const executablePath=path.join(root,'.local/cache/playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),profile=path.join(output,'controlled-profile');
 const context=await chromium.launchPersistentContext(profile,{headless:true,executablePath,serviceWorkers:'block'}),browser=context.browser(),page=context.pages()[0];let sequence=0,visualCalls=0,writeCalls=0,requests=0;
 const checkpoint=record=>writeFileSync(path.join(output,`checkpoint-${++sequence}.json`),JSON.stringify(record),{flag:'wx',mode:0o600});
 // Controlled fixture has no server/Auth. An in-memory sentinel models retained session state.
 await context.route('http://127.0.0.1:5173/**',async route=>{requests++;await route.fulfill({contentType:'text/html',body:'<title>Owned fixture</title><p id="saved">saved</p>'});});
 await page.goto('http://127.0.0.1:5173/owned-fixture');
 await page.evaluate(()=>{window.fixtureSession='RAM_SENTINEL';localStorage.setItem('pinky-controlled-remember','synthetic');});
 const helperPath=path.join(output,'readonly-fixture-helper.mjs');
 const helperSource=expected=>`export function phase(page){return {run:async()=>{if(await page.locator('#saved').textContent()!==${JSON.stringify(expected)})throw Error('Visual helper mismatch');}};}`;
 writeFileSync(helperPath,helperSource('wrong'),{flag:'wx',mode:0o600});
 const broken=await import(pathToFileURL(helperPath).href+'?generation=1');
 const badPhase=broken.phase(page);
 const phases={
  'synthetic-write':{kind:'write',authorize:()=>true,allowsMutation:()=>false,run:async()=>{writeCalls++;}},
  visual:{run:async()=>{visualCalls++;await badPhase.run();}},
 };
 const owner=new MultilingualBrowserSession({browser,context,page,phases,checkpoint,dispose:()=>context.close()});
 try{
  await owner.installFence();await owner.runPhase('synthetic-write');
  const completedCheckpoint=readFileSync(path.join(output,'checkpoint-2.json'),'utf8');
  await assert.rejects(owner.resumeReadonly('visual'));
  assert.equal(owner.browser,browser);assert.equal(owner.context,context);assert.equal(owner.page,page);assert.deepEqual(context.pages(),[page]);
  assert.equal(await page.evaluate(()=>window.fixtureSession),'RAM_SENTINEL');assert.equal((await owner.status()).alive,true);
  assert.equal(await owner.waitForLogin(async()=>false,5),false);assert.equal((await owner.status()).state,'LOGIN_WAIT_EXPIRED');assert.equal((await owner.status()).responsive,true);
  // Repair only the local consumer module; the page/Auth app is never reloaded.
  writeFileSync(path.join(output,'readonly-fixture-helper-before.mjs'),helperSource('wrong'),{flag:'wx',mode:0o600});
  writeFileSync(helperPath,helperSource('saved'),{mode:0o600});
  const repaired=await import(pathToFileURL(helperPath).href+'?generation=2'),goodPhase=repaired.phase(page);
  await owner.replaceReadonlyPhases({visual:{run:async()=>{visualCalls++;await goodPhase.run();}}});
  await owner.resumeReadonly('visual');assert.equal(visualCalls,2);
  assert.equal(owner.browser,browser);assert.equal(owner.context,context);assert.equal(owner.page,page);
  assert.equal(await page.evaluate(()=>window.fixtureSession),'RAM_SENTINEL');assert.equal(writeCalls,1);
  await assert.rejects(owner.runPhase('synthetic-write'));assert.equal(writeCalls,1);
  const requestsBefore=requests;
  assert.equal(await page.evaluate(async()=>{try{await fetch('/api/cms/fixture-denied',{method:'PUT'});return false;}catch{return true;}}),true);
  assert.equal(requests,requestsBefore);assert.equal((await owner.status()).blockedMutations,1);
  assert.equal(readFileSync(path.join(output,'checkpoint-2.json'),'utf8'),completedCheckpoint);
  const serialized=readdirSync(output).filter(name=>/^checkpoint-\d+\.json$/.test(name)).map(name=>readFileSync(path.join(output,name),'utf8')).join('\n');
  for(const secret of ['RAM_SENTINEL','intentional visual failure','storageState','cookie','token'])assert.equal(serialized.includes(secret),false);
  await owner.finish(async()=>{await page.evaluate(()=>{delete window.fixtureSession;document.body.replaceChildren();});assert.equal(await page.locator('body').textContent(),'');});
  assert.equal((await owner.status()).state,'CLOSED');assert.equal(browser.isConnected(),false);
  const restored=await chromium.launchPersistentContext(profile,{headless:true,executablePath,serviceWorkers:'block'});
  try{
   await restored.route('http://127.0.0.1:5173/**',route=>route.fulfill({contentType:'text/html',body:'<p>Controlled persistence only</p>'}));
   const restoredPage=restored.pages()[0];await restoredPage.goto('http://127.0.0.1:5173/owned-fixture');
   assert.equal(await restoredPage.evaluate(()=>localStorage.getItem('pinky-controlled-remember')==='synthetic'),true);
   await restoredPage.evaluate(()=>localStorage.removeItem('pinky-controlled-remember'));
  }finally{await restored.close();}
  const loggedOut=await chromium.launchPersistentContext(profile,{headless:true,executablePath,serviceWorkers:'block'});
  try{
   await loggedOut.route('http://127.0.0.1:5173/**',route=>route.fulfill({contentType:'text/html',body:'<p>Controlled logout only</p>'}));
   await loggedOut.pages()[0].goto('http://127.0.0.1:5173/owned-fixture');
   assert.equal(await loggedOut.pages()[0].evaluate(()=>localStorage.getItem('pinky-controlled-remember')===null),true);
  }finally{await loggedOut.close();}
  writeFileSync(path.join(output,'result.json'),JSON.stringify({status:'PASS_CONTROLLED_BROWSER_FIXTURE',sameBrowser:true,sameContext:true,samePage:true,readonlyRetry:true,consumerCodeReloadSameSession:true,loginExpiryRetained:true,defaultMutationDenied:true,syntheticWriteCalls:writeCalls,explicitCleanupVerified:true,controlledProfileCloseReopen:true,controlledLogoutClearsRemembered:true,sdk:'SYNTHETIC_STORAGE_SENTINEL_ONLY',actualAuth:'NOT_RUN',cmsWrites:0}),{flag:'wx',mode:0o600});
  console.log('HARNESS_FIXTURE_EVIDENCE',output);
 }finally{if(browser.isConnected())await browser.close();}
});
