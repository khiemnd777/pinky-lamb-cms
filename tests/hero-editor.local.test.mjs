import {revealCmsControl,choosePinkySelect,expectPinkyValue,expectPreviewViewport,showCmsView} from './helpers/pinky-select-ui.mjs';
import {test,expect} from '@playwright/test';
import {readFileSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {ROOT,validateRuntime} from '../scripts/local-guard.mjs';
import {fixtures,fixturePassword,seedFixtures} from '../scripts/seed-emulators.mjs';
import {db} from '../cms-api/authorization.mjs';
validateRuntime();
test.use({viewport:{width:1440,height:900},launchOptions:{chromiumSandbox:true},trace:'off',video:'off',screenshot:'off',serviceWorkers:'block'});
test.describe.configure({mode:'serial'});
const base='http://127.0.0.1:5173';
const api='http://127.0.0.1:5001/demo-pinky-lamb-cms/us-central1/cmsApi/api/cms/drafts/home';
const output=path.join(ROOT,'.local/test-outputs/hero-editor');
let originalContent,token,records,storage,blocked,errors,intentionalAbortMessages,proof;
async function callApi(method='GET',body){const response=await fetch(api,{method,headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json','Idempotency-Key':`test06-${randomUUID()}`}:{})},...(body?{body:JSON.stringify(body)}:{})});expect(response.status).toBe(200);return response.json();}
test.beforeAll(async()=>{
 mkdirSync(output,{recursive:true});await seedFixtures();
 const response=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-local-only',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:fixtures[0].email,password:fixturePassword,returnSecureToken:true})});expect(response.status).toBe(200);token=(await response.json()).idToken;originalContent=(await callApi()).content;
});
test.afterAll(async()=>{
 // Restore only this suite's synthetic content through supported CAS; retain history.
 if(originalContent){const current=await callApi();await callApi('PATCH',{expectedRevision:current.revision,patch:{hero:originalContent.hero,seo:originalContent.seo}});expect((await callApi()).content).toEqual(originalContent);}
 token=undefined;await db.terminate();
});
async function observe(context,page){
 await context.route('**/*',async route=>{if(!['127.0.0.1','[::1]'].includes(new URL(route.request().url()).hostname)){blocked++;await route.abort();}else await route.continue();});
 page.on('response',r=>{const url=new URL(r.url());records.push({method:r.request().method(),url:url.origin+url.pathname.replace(ROOT,'[workspace]'),status:r.status()});});
 page.on('pageerror',()=>errors++);
 page.on('console',m=>{if(m.type()==='error' && !/^Failed to load resource: the server responded with a status of (400|401|403|409|422)\b/.test(m.text())){if(intentionalAbortMessages>0 && /^Failed to load resource: net::ERR_FAILED$/.test(m.text()))intentionalAbortMessages--;else errors++;}});
 const response=await page.goto(base);expect(response.status()).toBe(200);
}
test.beforeEach(async({context,page})=>{records=[];storage=[];proof={};blocked=0;errors=0;intentionalAbortMessages=0;await observe(context,page);});
test.afterEach(async({},info)=>{writeFileSync(path.join(output,`${info.title.replace(/[^A-Za-z0-9_-]/g,'_')}.json`),JSON.stringify({test:info.title,status:info.status,requests:records,storage,proof,blocked,errors},null,2));expect(blocked).toBe(0);expect(errors).toBe(0);});
async function login(page,role='EDITOR'){
 const member=fixtures.find(f=>f.role===role && f.active && f.verified);const read=page.waitForResponse(r=>r.url().endsWith('/api/cms/drafts/home') && r.request().method()==='GET');
 (await revealCmsControl(page,page.locator('#email')), await page.locator('#email').fill(member.email));(await revealCmsControl(page,page.locator('#password')), await page.locator('#password').fill(fixturePassword));(await revealCmsControl(page,page.locator('#login-submit')), await page.locator('#login-submit').click());const response=await read;expect(response.status()).toBe(200);const draft=await response.json();await revealCmsControl(page,page.locator('#hero-editor'));await expect(page.locator('#hero-editor')).toBeVisible();await expect(page.locator('#cms-edit-tab')).toHaveAttribute('aria-selected','true');await expect(page.locator('#cms-review-tab')).toHaveAttribute('aria-selected','false');await expect(page.locator('#review-panel')).toBeHidden();await expect(page.locator('[data-hero-accordion=notes]')).not.toHaveAttribute('open','');await revealCmsControl(page,page.locator('#hero-note'));await expect(page.locator('#hero-note')).toBeVisible();return draft;
}
async function save(page,status=200){const pending=page.waitForResponse(r=>r.url().endsWith('/api/cms/drafts/home') && r.request().method()==='PATCH');(await revealCmsControl(page,page.locator('#save-draft')), await page.locator('#save-draft').click());const response=await pending;expect(response.status()).toBe(status);return response.json();}
const runText=(page,p)=>page.locator(`[data-run-path="${p}"] textarea`);
const runEmphasis=(page,p)=>page.locator(`[data-run-path="${p}"] [role="combobox"]`);
async function linkedError(page,control){await expect(control).toHaveAttribute('aria-invalid','true');const id=await control.getAttribute('aria-describedby');expect(id).toMatch(/^[A-Za-z0-9_-]+$/);await expect(page.locator(`[id="${id}"]`)).not.toBeEmpty();}
async function storageCheck(page){const state=await page.evaluate(async()=>{const databases=await indexedDB.databases();return {localCount:localStorage.length,sessionCount:sessionStorage.length,privateDatabaseCount:databases.filter(d=>d.name!=='firebase-heartbeat-database').length,cacheCount:(await caches.keys()).length};});storage.push(state);expect(state).toEqual({localCount:0,sessionCount:0,privateDatabaseCount:0,cacheCount:0});}
test('full Hero SEO edits save one revision and reopen exact content',async({page})=>{
 const initial=await login(page);const expected=structuredClone(initial.content);
 for(const [id,field,value] of [['hero-eyebrow','eyebrow','Independent local editorial test'],['hero-footnote','footnote','Synthetic local footnote'],['hero-note','note','Synthetic local note']]){(await revealCmsControl(page,page.locator(`#${id}`)), await page.locator(`#${id}`).fill(value));expected.hero[field]=value;}
 for(const [id,field,value] of [['seo-title','title','Pinky Lamb local title'],['seo-description','description','Synthetic local description'],['seo-og-title','ogTitle','Pinky Lamb local OG title'],['seo-og-description','ogDescription','Synthetic local OG description']]){(await revealCmsControl(page,page.locator(`#${id}`)), await page.locator(`#${id}`).fill(value));expected.seo[field]=value;}
 (await revealCmsControl(page,runText(page,'hero.heading.lines.0.0')), await runText(page,'hero.heading.lines.0.0').fill('Local big ideas.'));await choosePinkySelect(page,runEmphasis(page,'hero.heading.lines.0.0'),'STRONG');expected.hero.heading.lines[0][0]={text:'Local big ideas.',emphasis:'STRONG'};
 (await revealCmsControl(page,runText(page,'hero.description.0')), await runText(page,'hero.description.0').fill('Synthetic complete description.'));await choosePinkySelect(page,runEmphasis(page,'hero.description.0'),'ACCENT');expected.hero.description[0]={text:'Synthetic complete description.',emphasis:'ACCENT'};
 (await revealCmsControl(page,page.locator('#hero-image-alt')), await page.locator('#hero-image-alt').fill('Synthetic hero alt'));expected.hero.image.alt='Synthetic hero alt';(await revealCmsControl(page,page.locator('#hero-focal-enabled')), await page.locator('#hero-focal-enabled').check());(await revealCmsControl(page,page.locator('#hero-focal-x')), await page.locator('#hero-focal-x').fill('0'));(await revealCmsControl(page,page.locator('#hero-focal-y')), await page.locator('#hero-focal-y').fill('1'));expected.hero.image.focalPoint={x:0,y:1};
 (await revealCmsControl(page,page.locator('#seo-image-alt')), await page.locator('#seo-image-alt').fill('Synthetic OG alt'));expected.seo.ogImage.alt='Synthetic OG alt';(await revealCmsControl(page,page.locator('#seo-focal-enabled')), await page.locator('#seo-focal-enabled').check());(await revealCmsControl(page,page.locator('#seo-focal-x')), await page.locator('#seo-focal-x').fill('0.25'));(await revealCmsControl(page,page.locator('#seo-focal-y')), await page.locator('#seo-focal-y').fill('0.75'));expected.seo.ogImage.focalPoint={x:0.25,y:0.75};
 await choosePinkySelect(page,page.locator('#primaryAction-kind'),'SECTION');await choosePinkySelect(page,page.locator('#primaryAction-section'),'contact');(await revealCmsControl(page,page.locator('#primaryAction-label')), await page.locator('#primaryAction-label').fill('Local contact'));expected.hero.primaryAction={kind:'SECTION',sectionId:'contact',label:'Local contact'};
 (await revealCmsControl(page,page.locator('#secondary-enabled')), await page.locator('#secondary-enabled').uncheck());delete expected.hero.secondaryAction;
 const result=await save(page);expect(result.revision).toBe(initial.revision+1);await expect(page.locator('#draft-revision')).toContainText(String(result.revision));
 const saved=await callApi();expect(saved.content).toEqual(expected);
 await page.reload();await revealCmsControl(page,page.locator('#login-form'));await expect(page.locator('#login-form')).toBeVisible();const reopened=await login(page);expect(reopened.content).toEqual(expected);expect(reopened.revision).toBe(result.revision);await expect(page.locator('#hero-note')).toHaveValue(expected.hero.note);
 await page.screenshot({path:path.join(output,'saved-editor-desktop.png'),fullPage:true});await storageCheck(page);
});
test('real work and Hero group tabs retain dirty content without requests',async({page})=>{
 await login(page);await page.locator('#hero-note').fill('Unsaved group navigation fixture');
 const dirty=await page.locator('#draft-dirty').textContent(),requests=records.filter(record=>record.url.includes('/api/cms/')).length;
 for(const key of ['actions','images','seo','hero']){
  await page.locator(`[data-hero-group="${key}"]`).click();
  await expect(page.locator(`[data-hero-group="${key}"]`)).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('[data-hero-section]:visible')).toHaveCount(1);
  await expect(page.locator(`#hero-fields-${key}`)).toBeVisible();
  await expect(page.locator('#hero-note')).toHaveValue('Unsaved group navigation fixture');
  await expect(page.locator('#draft-dirty')).toHaveText(dirty);
 }
 await page.locator('#cms-review-tab').click();await expect(page.locator('#review-panel')).toBeVisible();await expect(page.locator('#hero-editor')).toBeHidden();
 await page.locator('#cms-edit-tab').click();await expect(page.locator('#review-panel')).toBeHidden();await expect(page.locator('#hero-note')).toHaveValue('Unsaved group navigation fixture');
 expect(records.filter(record=>record.url.includes('/api/cms/')).length).toBe(requests);expect(records.filter(record=>record.method==='PATCH')).toHaveLength(0);
});
test('keyboard media picker selects raster asset and decorative alt is exact',async({page})=>{
 await login(page);(await revealCmsControl(page,page.locator('#hero-image-pick')), await page.locator('#hero-image-pick').click());await revealCmsControl(page,page.locator('#media-picker'));await expect(page.locator('#media-picker')).toBeVisible();(await revealCmsControl(page,page.locator('#media-filter')), await page.locator('#media-filter').fill('pinky-mascot'));await page.keyboard.press('ArrowDown');await expect(page.locator('[data-asset-id="pinky-mascot"]')).toBeFocused();await page.keyboard.press('Enter');await expect(page.locator('#media-picker')).toBeHidden();await expect(page.locator('#hero-image-pick')).toBeFocused();
 (await revealCmsControl(page,page.locator('#hero-image-decorative')), await page.locator('#hero-image-decorative').check());await save(page);const read=await callApi();expect(read.content.hero.image.assetId).toBe('pinky-mascot');expect(read.content.hero.image.isDecorative).toBe(true);expect(read.content.hero.image.alt).toBe('');
 (await revealCmsControl(page,page.locator('#hero-image-pick')), await page.locator('#hero-image-pick').click());await page.keyboard.press('Escape');await expect(page.locator('#media-picker')).toBeHidden();await expect(page.locator('#hero-image-pick')).toBeFocused();
});
test('client cap feedback prevents save and retains dirty content',async({page})=>{
 const before=await login(page);
 // Browser maxlength blocks one-field overflow; aggregate runs require schema feedback.
 (await revealCmsControl(page,page.locator('#hero-note')), await page.locator('#hero-note').fill('x'.repeat(301)));await expect(page.locator('#hero-note')).toHaveValue('x'.repeat(300));
 await revealCmsControl(page,page.getByRole('button',{name:'Thêm đoạn cho Dòng tiêu đề 1',exact:true}));await page.getByRole('button',{name:'Thêm đoạn cho Dòng tiêu đề 1',exact:true}).click();(await revealCmsControl(page,runText(page,'hero.heading.lines.0.0')), await runText(page,'hero.heading.lines.0.0').fill('x'.repeat(100)));(await revealCmsControl(page,runText(page,'hero.heading.lines.0.1')), await runText(page,'hero.heading.lines.0.1').fill('y'));
 (await revealCmsControl(page,page.locator('#save-draft')), await page.locator('#save-draft').click());await expect(page.locator('#editor-errors')).not.toBeEmpty();await linkedError(page,runText(page,'hero.heading.lines.0.0'));await expect(runText(page,'hero.heading.lines.0.0')).toHaveValue('x'.repeat(100));await expect(runText(page,'hero.heading.lines.0.1')).toHaveValue('y');expect((await callApi()).revision).toBe(before.revision);expect(records.filter(r=>r.method==='PATCH')).toHaveLength(0);
});
test('server field 422 retains local edits without partial write',async({page})=>{
 const before=await login(page);(await revealCmsControl(page,page.locator('#hero-eyebrow')), await page.locator('#hero-eyebrow').fill('Local unsaved eyebrow'));
 await page.route('**/api/cms/drafts/home',async route=>{if(route.request().method()!=='PATCH')return route.continue();const body=route.request().postDataJSON();body.patch.hero.eyebrow='x'.repeat(121);await route.continue({postData:JSON.stringify(body)});});
 await save(page,422);await expect(page.locator('#editor-errors')).not.toBeEmpty();await linkedError(page,page.locator('#hero-eyebrow'));await expect(page.locator('#hero-eyebrow')).toHaveValue('Local unsaved eyebrow');expect((await callApi()).revision).toBe(before.revision);
});
test('two editors preserve losing dirty edits on revision conflict',async({page,browser})=>{
 const first=await login(page);const secondContext=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});const second=await secondContext.newPage();await observe(secondContext,second);
 try{const read=await login(second);expect(read.revision).toBe(first.revision);(await revealCmsControl(page,page.locator('#hero-note')), await page.locator('#hero-note').fill('Concurrent winning test'));(await revealCmsControl(second,second.locator('#hero-note')), await second.locator('#hero-note').fill('Concurrent unsaved losing test'));await save(page);await save(second,409);await expect(second.locator('#hero-note')).toHaveValue('Concurrent unsaved losing test');await expect(second.locator('#draft-revision')).toContainText(String(first.revision));await expect(second.locator('#editor-status')).toContainText(/xung đột|thay đổi|phiên bản/i);expect((await callApi()).content.hero.note).toBe('Concurrent winning test');await second.screenshot({path:path.join(output,'conflict-editor-mobile.png'),fullPage:true});await storageCheck(second);}
 finally{await secondContext.close();}
});
test('dirty reload requires explicit confirmation and cancel preserves edits',async({page})=>{
 const saved=await login(page);(await revealCmsControl(page,page.locator('#hero-note')), await page.locator('#hero-note').fill('Unsaved local leave test'));page.once('dialog',dialog=>dialog.dismiss());(await revealCmsControl(page,page.locator('#reload-draft')), await page.locator('#reload-draft').click());await expect(page.locator('#hero-note')).toHaveValue('Unsaved local leave test');
 page.once('dialog',dialog=>dialog.accept());const read=page.waitForResponse(r=>r.url().endsWith('/api/cms/drafts/home') && r.request().method()==='GET');(await revealCmsControl(page,page.locator('#reload-draft')), await page.locator('#reload-draft').click());expect((await read).status()).toBe(200);await expect(page.locator('#hero-note')).toHaveValue(saved.content.hero.note);
 (await revealCmsControl(page,page.locator('#hero-note')), await page.locator('#hero-note').fill('Unsaved local navigation test'));
 let dismissed;const cancellation=new Promise(resolve=>dismissed=resolve);page.once('dialog',async dialog=>{expect(dialog.type()).toBe('beforeunload');await dialog.dismiss();dismissed();});
 const navigation=page.reload({timeout:1000}).then(()=>false,error=>{expect(error.message).toMatch(/ERR_ABORTED|Timeout 1000ms exceeded/);return true;});
 await cancellation;expect(await navigation).toBe(true);await expect(page.locator('#hero-note')).toHaveValue('Unsaved local navigation test');proof.beforeUnloadCancelled=true;
});
test('reviewer publisher can inspect but cannot edit or dispatch save',async({page})=>{
 for(const role of ['REVIEWER','PUBLISHER']){await login(page,role);await expect(page.locator('#hero-note')).toBeDisabled();await expect(page.locator('#save-draft')).toBeDisabled();await expect(page.locator('#hero-image-pick')).toBeDisabled();(await revealCmsControl(page,page.locator('#logout')), await page.locator('#logout').click());await revealCmsControl(page,page.locator('#login-form'));await expect(page.locator('#login-form')).toBeVisible();}expect(records.filter(r=>r.method==='PATCH')).toHaveLength(0);
});
test('safe catalog responses and dev build exclude full private records',async({page})=>{
 const read=await login(page);for(const asset of read.catalog){expect(Object.keys(asset).sort()).toEqual(['id','kind','status','legacyPath','label',...('width'in asset?['width']:[]),...('height'in asset?['height']:[]),...('durationSeconds'in asset?['durationSeconds']:[])].sort());}
 for(const p of ['/contracts/legacy-assets.json','/.local/cache/catalog-measurements.json','/cms-api/drafts.mjs','/@fs/'+ROOT+'/contracts/legacy-assets.json','/tests/fixtures/malicious-hero.json'])expect((await page.request.get(base+p)).status()).toBe(403);
 const full=JSON.parse(readFileSync(path.join(ROOT,'contracts/legacy-assets.json'),'utf8'));const forbidden=[full[0].rights.evidenceRef,full[0].createdBy,'contracts/legacy-assets.json'];
 const files=[];function walk(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())walk(p);else if(/\.(js|mjs|json|html)$/.test(p))files.push(p);}}walk(path.join(ROOT,'admin-dist'));
 for(const file of files){const text=readFileSync(file,'utf8');for(const value of forbidden)expect(text.includes(value)).toBe(false);}
});
test('mobile editor remains usable with no private persistent storage',async({page})=>{
 await page.setViewportSize({width:390,height:844});await login(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await storageCheck(page);await page.screenshot({path:path.join(output,'editor-mobile.png'),fullPage:true});(await revealCmsControl(page,page.locator('#logout')), await page.locator('#logout').click());await expect(page.locator('#private-content')).toBeEmpty();await storageCheck(page);
});
test('committed save with lost response retries identical intent once',async({page})=>{
 const before=await login(page);const auditBefore=(await db.collection('cmsAudit').where('actorUid','==','fixture-editor').get()).size;
 let capturedKey,capturedBody,attempts=0;
 await page.route('**/api/cms/drafts/home',async route=>{
  if(route.request().method()!=='PATCH')return route.continue();attempts++;const key=route.request().headers()['idempotency-key'];const body=route.request().postData();
  if(attempts===1){capturedKey=key;capturedBody=body;const committed=await route.fetch();expect(committed.status()).toBe(200);intentionalAbortMessages++;await route.abort('failed');}
  else{expect(key===capturedKey).toBe(true);expect(body===capturedBody).toBe(true);proof.retryIdenticalBodyAndKey=true;await route.continue();}
 });
 (await revealCmsControl(page,page.locator('#hero-note')), await page.locator('#hero-note').fill('Lost response retry fixture'));(await revealCmsControl(page,page.locator('#save-draft')), await page.locator('#save-draft').click());await expect(page.locator('#editor-status')).toHaveText('Không thể tải hoặc lưu nội dung. Vui lòng thử lại.');await expect(page.locator('#save-draft')).toBeEnabled();await expect(page.locator('#hero-note')).toHaveValue('Lost response retry fixture');
 expect((await callApi()).revision).toBe(before.revision+1);const retry=await save(page);expect(retry.revision).toBe(before.revision+1);expect(attempts).toBe(2);expect((await db.collection('cmsAudit').where('actorUid','==','fixture-editor').get()).size).toBe(auditBefore+1);proof.committedEffects=1;
 capturedKey=undefined;capturedBody=undefined;
});
test('saved draft read released after logout cannot repopulate editor',async({page})=>{
 let release,entered,finished;const gate=new Promise(resolve=>release=resolve);const held=new Promise(resolve=>entered=resolve);const done=new Promise(resolve=>finished=resolve);
 await page.route('**/api/cms/drafts/home',async route=>{if(route.request().method()!=='GET')return route.continue();const response=await route.fetch();expect(response.status()).toBe(200);entered();await gate;try{await route.fulfill({response});}catch{/* The old session request may be aborted. */}finally{finished();}});
 (await revealCmsControl(page,page.locator('#email')), await page.locator('#email').fill(fixtures[0].email));(await revealCmsControl(page,page.locator('#password')), await page.locator('#password').fill(fixturePassword));(await revealCmsControl(page,page.locator('#login-submit')), await page.locator('#login-submit').click());await held;(await revealCmsControl(page,page.locator('#logout')), await page.locator('#logout').click());release();await done;await revealCmsControl(page,page.locator('#login-form'));await expect(page.locator('#login-form')).toBeVisible();await expect(page.locator('#private-content')).toBeEmpty();await expect(page.locator('#hero-editor')).toHaveCount(0);await storageCheck(page);proof.lateReadStayedCleared=true;
});
test('committed save response released after logout cannot repopulate editor',async({page})=>{
 const before=await login(page);let release,entered,finished;const gate=new Promise(resolve=>release=resolve);const held=new Promise(resolve=>entered=resolve);const done=new Promise(resolve=>finished=resolve);
 await page.route('**/api/cms/drafts/home',async route=>{if(route.request().method()!=='PATCH')return route.continue();const response=await route.fetch();expect(response.status()).toBe(200);entered();await gate;try{await route.fulfill({response});}catch{/* Logout invalidates the saved response's generation. */}finally{finished();}});
 (await revealCmsControl(page,page.locator('#hero-note')), await page.locator('#hero-note').fill('Late save response fixture'));(await revealCmsControl(page,page.locator('#save-draft')), await page.locator('#save-draft').click());await held;page.once('dialog',dialog=>dialog.accept());(await revealCmsControl(page,page.locator('#logout')), await page.locator('#logout').click());release();await done;await revealCmsControl(page,page.locator('#login-form'));await expect(page.locator('#login-form')).toBeVisible();await expect(page.locator('#private-content')).toBeEmpty();await expect(page.locator('#hero-editor')).toHaveCount(0);await storageCheck(page);expect((await callApi()).revision).toBe(before.revision+1);proof.lateSaveStayedCleared=true;
});
async function savedPreview(page,revision){await expect(page.locator('#preview-revision')).toHaveText(`Bản nháp đã lưu — phiên bản ${revision}`);await revealCmsControl(page,page.locator('#preview'));await expect(page.locator('#preview')).toBeVisible();await expect(page.frameLocator('#preview').locator('#hero-title')).toBeVisible();}
async function captureActualPreview(page,width,height,filename){
 const child=await page.frameLocator('#preview').locator('html').evaluate(element=>({width:element.ownerDocument.defaultView.innerWidth,height:element.ownerDocument.defaultView.innerHeight}));expect(child).toEqual({width,height});
 const outer=page.viewportSize();const previous=await page.locator('.preview-viewport').getAttribute('style');const frameStyle=await page.locator('#preview').getAttribute('style');
 // Capture-only parent layout override: actual authenticated srcdoc/sandbox stay intact.
 // Restore the real scroll-container UX and outer viewport immediately after capture.
 try{await page.setViewportSize({width:width+800,height:height+500});await page.locator('.preview-viewport').evaluate(element=>{element.style.overflow='visible';element.style.maxWidth='none';element.style.borderRadius='0';});await page.locator('#preview').evaluate(element=>{element.style.transform='none';});await page.locator('#preview').screenshot({path:path.join(output,filename)});proof.parentCaptureLayoutOverrideOnly=true;}
 finally{await page.locator('#preview').evaluate((element,value)=>{if(value===null)element.removeAttribute('style');else element.setAttribute('style',value);},frameStyle);await page.locator('.preview-viewport').evaluate((element,value)=>{if(value===null)element.removeAttribute('style');else element.setAttribute('style',value);},previous);await page.setViewportSize(outer);}
 const after=await page.frameLocator('#preview').locator('html').evaluate(element=>({width:element.ownerDocument.defaultView.innerWidth,height:element.ownerDocument.defaultView.innerHeight}));expect(after).toEqual(child);
}
test('saved preview has exact desktop mobile viewport fonts styles and focal point',async({page})=>{
 await login(page);(await revealCmsControl(page,page.locator('#hero-image-decorative')), await page.locator('#hero-image-decorative').uncheck());(await revealCmsControl(page,page.locator('#hero-image-alt')), await page.locator('#hero-image-alt').fill('Local preview focal test'));(await revealCmsControl(page,page.locator('#hero-focal-enabled')), await page.locator('#hero-focal-enabled').check());(await revealCmsControl(page,page.locator('#hero-focal-x')), await page.locator('#hero-focal-x').fill('0'));(await revealCmsControl(page,page.locator('#hero-focal-y')), await page.locator('#hero-focal-y').fill('1'));const saved=await save(page);await savedPreview(page,saved.revision);
 const frame=page.frameLocator('#preview');await expect(frame.locator('.hero-art img')).toHaveCSS('object-position','0% 100%');
 const fonts=await frame.locator('body').evaluate(async element=>{await element.ownerDocument.fonts.ready;return {body:getComputedStyle(element).fontFamily,heading:getComputedStyle(element.ownerDocument.querySelector('h1')).fontFamily,bodyLoaded:element.ownerDocument.fonts.check('15px Montserrat'),headingLoaded:element.ownerDocument.fonts.check('40px Abril')};});expect(fonts.body).toContain('Montserrat');expect(fonts.heading).toContain('Abril');expect(fonts.bodyLoaded).toBe(true);expect(fonts.headingLoaded).toBe(true);
 await showCmsView(page,'preview');await choosePinkySelect(page,page.locator('#preview-width'),'1440');await expectPreviewViewport(page,1440,900);await captureActualPreview(page,1440,900,'preview-desktop.png');
 await page.setViewportSize({width:390,height:844});await showCmsView(page,'preview');await choosePinkySelect(page,page.locator('#preview-width'),'390');await expectPreviewViewport(page,390,844);await captureActualPreview(page,390,844,'preview-mobile.png');await storageCheck(page);proof.savedPreviewRevision=saved.revision;
});
test('dirty form retains the saved preview until a successful save',async({page})=>{
 const draft=await login(page);await savedPreview(page,draft.revision);const frame=page.frameLocator('#preview');const before=await frame.locator('.pinky-note').textContent();
 (await revealCmsControl(page,page.locator('#hero-note')), await page.locator('#hero-note').fill('Unsaved preview text must stay private'));await revealCmsControl(page,page.locator('#preview-dirty'));await expect(page.locator('#preview-dirty')).toBeVisible();await expect(frame.locator('.pinky-note')).toHaveText(before);await expect(page.locator('#preview-revision')).toHaveText(`Bản nháp đã lưu — phiên bản ${draft.revision}`);
 const saved=await save(page);await savedPreview(page,saved.revision);await expect(frame.locator('.pinky-note')).toContainText('Unsaved preview text must stay private');proof.dirtyPreviewStayedSaved=true;
});
test('malicious saved text stays visible and preview shell is inert',async({page})=>{
 const previous=await callApi();const malicious=JSON.parse(readFileSync(path.join(ROOT,'tests/fixtures/malicious-hero.json'),'utf8'));const saved=await callApi('PATCH',{expectedRevision:previous.revision,patch:{hero:malicious.hero,seo:malicious.seo}});let unexpectedDialog=0;page.on('dialog',async dialog=>{unexpectedDialog++;await dialog.dismiss();});
 try{
  await login(page);await savedPreview(page,saved.revision);const frame=page.frameLocator('#preview');await expect(frame.locator('#hero-title')).toContainText(malicious.hero.heading.lines[0][0].text);await expect(frame.locator('.hero-description')).toContainText(malicious.hero.description[0].text);expect(unexpectedDialog).toBe(0);await expect(frame.locator('h1')).toHaveCount(1);
  const metadata=await frame.locator('html').evaluate(element=>{const doc=element.ownerDocument;return {title:doc.title,description:doc.querySelector('meta[name="description"]').content,ogTitle:doc.querySelector('meta[property="og:title"]').content,ogDescription:doc.querySelector('meta[property="og:description"]').content,ogImageAlt:doc.querySelector('meta[property="og:image:alt"]').content};});expect(metadata).toEqual({title:malicious.seo.title,description:malicious.seo.description,ogTitle:malicious.seo.ogTitle,ogDescription:malicious.seo.ogDescription,ogImageAlt:malicious.seo.ogImage.alt});proof.maliciousMetadataExact=true;
  await expect(page.locator('#preview')).toHaveAttribute('sandbox','');expect(await frame.locator('script').count()).toBe(0);expect(await frame.locator('base').count()).toBe(0);expect(await frame.locator('a[href]').count()).toBe(0);
  const safety=await frame.locator('html').evaluate(element=>{const doc=element.ownerDocument;return {csp:doc.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content,handlers:[...doc.querySelectorAll('*')].some(n=>[...n.attributes].some(a=>/^on/i.test(a.name))),enabledControls:[...doc.querySelectorAll('input,button,textarea,select')].filter(n=>!n.disabled).length};});for(const directive of ['default-src','script-src','connect-src','form-action','base-uri'])expect(safety.csp).toContain(`${directive} 'none'`);expect(safety.handlers).toBe(false);expect(safety.enabledControls).toBe(0);await storageCheck(page);proof.maliciousCopyVisibleWithoutExecution=true;
 }finally{const current=await callApi();await callApi('PATCH',{expectedRevision:current.revision,patch:{hero:previous.content.hero,seo:previous.content.seo}});}
});
test('pending preview baseline response released after logout stays cleared',async({page})=>{
 let release,entered,finished;const gate=new Promise(resolve=>release=resolve);const held=new Promise(resolve=>entered=resolve);const done=new Promise(resolve=>finished=resolve);
 await page.route('http://127.0.0.1:5010/index.html',async route=>{const response=await route.fetch();expect(response.status()).toBe(200);entered();await gate;try{await route.fulfill({response});}catch{/* Logout aborts the old preview generation. */}finally{finished();}});
 await login(page);await held;(await revealCmsControl(page,page.locator('#logout')), await page.locator('#logout').click());release();await done;await revealCmsControl(page,page.locator('#login-form'));await expect(page.locator('#login-form')).toBeVisible();await expect(page.locator('#private-content')).toBeEmpty();expect(await page.locator('#preview').getAttribute('srcdoc')).toBeFalsy();await expect(page.locator('#preview')).toBeHidden();await storageCheck(page);proof.latePreviewStayedCleared=true;
});
test('fitted desktop preview is naturally reachable and iframe scrolls by keyboard',async({page})=>{
 const draft=await login(page);await savedPreview(page,draft.revision);await showCmsView(page,'preview');await choosePinkySelect(page,page.locator('#preview-width'),'1440');const viewport=page.locator('.preview-viewport');
 await expect(viewport).toHaveAccessibleName(/.+/);await expect(viewport).toHaveAttribute('tabindex','0');
 await expectPreviewViewport(page,1440,900);expect(await viewport.evaluate(element=>element.scrollWidth<=element.clientWidth+1)).toBe(true);
 (await revealCmsControl(page,page.locator('#preview-width')), await page.locator('#preview-refresh').focus());await page.keyboard.press('Tab');await expect(page.locator('#preview-width')).toBeFocused();await page.keyboard.press('Tab');await expect(page.locator('#preview-fit')).toBeFocused();await page.keyboard.press('Tab');
 proof.naturalFocusTarget=await page.evaluate(()=>document.activeElement?.id || document.activeElement?.className || document.activeElement?.tagName);
 await expect(viewport).toBeFocused();
 (await revealCmsControl(page,page.locator('#preview')), await page.locator('#preview').focus());const child=page.frameLocator('#preview').locator('html'),before=await child.evaluate(element=>element.ownerDocument.defaultView.scrollY);await page.keyboard.press('ArrowDown');await expect.poll(()=>child.evaluate(element=>element.ownerDocument.defaultView.scrollY)).toBeGreaterThan(before);proof.keyboardIframeScroll=true;
});

test('PinkySelect real keyboard silent loading fieldset locks and lifecycle',async({page})=>{
 await login(page);
 // Isolated DOM host uses the real shipped component; this is component proof,
 // not permission/RPC proof and it never changes the working CMS model.
 await page.evaluate(async()=>{
  const {createPinkySelect}=await import('/pinky-select.mjs');
  const host=document.createElement('fieldset');host.id='qa-pinky-host';
  const label=document.createElement('label');label.htmlFor='qa-pinky-select';label.textContent='Kiểu thử';
  const control=createPinkySelect(document,{id:'qa-pinky-select',value:'',options:[{value:'',label:'Không chọn'},{value:'NONE',label:'Bình thường'},{value:'STRONG',label:'Đậm'},{value:'ACCENT',label:'Nhấn màu'},{value:'LOCKED',label:'Đã khóa',disabled:true}]});
  host.dataset.changes='0';control.addEventListener('change',()=>host.dataset.changes=String(Number(host.dataset.changes)+1));host.append(label,control);document.getElementById('private-content').append(host);
 });
 const control=page.locator('#qa-pinky-select'),host=page.locator('#qa-pinky-host');
 try{
  await expectPinkyValue(control,'');await control.focus();await control.press('Enter');await control.press('End');await control.press('Enter');await expectPinkyValue(control,'ACCENT');await expect(host).toHaveAttribute('data-changes','1');
  await control.press('Enter');await control.press('Home');await control.press('Escape');await expectPinkyValue(control,'ACCENT');await expect(host).toHaveAttribute('data-changes','1');
  await control.press('Enter');await control.press('Home');await control.press('Tab');await expectPinkyValue(control,'');await expect(host).toHaveAttribute('data-changes','2');
  await control.evaluate(element=>{element.value='STRONG';element.pinkySelect.setOptions([{value:'',label:'Không chọn'},{value:'STRONG',label:'Đậm đổi tên',disabled:true},{value:'NONE',label:'Bình thường'}]);});
  await expectPinkyValue(control,'STRONG');await expect(control).toContainText('Đậm đổi tên');await expect(host).toHaveAttribute('data-changes','2');
  await control.press('Enter');const popup=page.locator('[role=listbox]');await expect(popup.locator('[data-option-value="STRONG"]')).toHaveAttribute('aria-disabled','true');await control.press('Escape');
  await host.evaluate(element=>{element.disabled=true;});await expect(control).toBeDisabled();await host.evaluate(element=>{element.disabled=false;});await expect(control).toBeEnabled();
  await control.evaluate(element=>{element.value='unknown-kept';});await expectPinkyValue(control,'unknown-kept');await expect(host).toHaveAttribute('data-changes','2');
  await control.press('Enter');await revealCmsControl(page,page.locator('[role=listbox]'));await expect(page.locator('[role=listbox]')).toBeVisible();await host.evaluate(element=>{element.remove();});await expect.poll(()=>page.locator('[role=listbox]').count()).toBe(0);await expect(control).toHaveCount(0);
 }finally{await page.locator('#qa-pinky-host').evaluateAll(nodes=>nodes.forEach(node=>node.remove()));}
});
