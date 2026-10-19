import {test,expect} from '@playwright/test';
import {sectionQaFixture} from './work-services-localization-renderer.test.mjs';
import {base,sectionContent} from './work-services-localization-contract.test.mjs';
/** Controlled UI boundaries only: real modules, synthetic session/API, all retained API requests denied. */
test.describe('P3 remainder controlled Section editor',()=>{
 test.skip(process.env.PINKY_P3_REMAINDER_FIXTURE!=='1','NOT_RUN: explicit controlled fixture opt-in required');
 async function mount(page,role='OWNER'){
  await page.route('**/api/cms/**',route=>route.abort('blockedbyclient'));
  await page.route(/\/(?:auth|preview)\.mjs(?:\?.*)?$/,route=>route.abort('blockedbyclient'));
  await page.goto('http://127.0.0.1:5173/__p3-remainder-fixture__');
  await page.evaluate(async({base,role,qaResources,canonicalModule})=>{
   document.body.replaceChildren(Object.assign(document.createElement('main'),{id:'fixture'}));const style=document.createElement('link');style.rel='stylesheet';style.href='/service-localization-editor.css';document.head.append(style);
   const {mountWorkServicesLocalizationEditor}=await import('/work-services-localization-editor.mjs');
   const session={uid:'controlled-member',role,authzVersion:1},records=new Map();window.p3Calls=[];window.p3LoseResponse=true;
   const {canonicalJson}=await import(canonicalModule);
   const digest=async value=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonicalJson(value))))].map(byte=>byte.toString(16).padStart(2,'0')).join('');
   const apiFetch=async(path,options={})=>{
    const locale=path.split('/').at(path.endsWith('/qa')?-2:-1);window.p3Calls.push({path,method:options.method??'GET',key:options.headers?.['Idempotency-Key'],body:options.body});
    if(options.method==='PUT'){
     const body=JSON.parse(options.body),key=options.headers['Idempotency-Key'];let draft=records.get(key);
     if(!draft){draft={contractRevision:1,draftId:'home-v3',sectionId:'work',locale,revision:1,dependencyHash:base.dependencyHash,contentHash:await digest(body.content),updatedAt:'2026-10-16T00:00:00.000Z',content:body.content};records.set(key,draft);window.p3Saved=draft;}
     if(window.p3LoseResponse){window.p3LoseResponse=false;throw new TypeError('Controlled response delivery loss');}const {content,...receipt}=draft;void content;return receipt;
    }
    if(path.endsWith('/qa'))return {contractRevision:1,kind:'LOCALIZED_SECTION_QA',sectionIndex:base.sectionIndex,templateIdentity:base.templateIdentity,draft:window.p3Saved,section:{...base.section,...window.p3Saved.content},resources:qaResources};
    return {contractRevision:1,draftId:'home-v3',sectionId:'work',locale,base,draft:window.p3Saved??null};
   };
   window.p3Editor=mountWorkServicesLocalizationEditor(document.getElementById('fixture'),{sectionId:'work',apiFetch,getSession:()=>session});window.p3Editor.setGroupActive(true);
  },{base,role,qaResources:sectionQaFixture().resources,canonicalModule:'/@fs'+new URL('../contracts/draft.mjs',import.meta.url).pathname});
 }
 test('typed Section save retains immutable intent after response loss, then confirms same operation',async({page})=>{
  await mount(page);const content=sectionContent();
  await expect(page.locator('[data-section-field="eyebrow"]')).toBeVisible();
  await page.locator('[data-section-field="eyebrow"]').fill(content.eyebrow);await page.locator('[data-section-field="heading"]').fill('日本語 見出し');await page.locator('[data-section-field="heading"]').evaluate(el=>{el.setSelectionRange(4,7);});await page.locator('[data-section-format="ACCENT"]').click();await page.locator('[data-section-field="intro"]').fill(content.intro);await page.locator('[data-section-field="loadMoreLabel"]').fill(content.loadMoreLabel);
  await page.locator('[data-section-action="save"]').click();await expect(page.getByRole('button',{name:'Kiểm tra bản đã lưu / thử lại cùng thao tác'})).toBeVisible();await expect(page.locator('[data-section-field="intro"]')).toHaveValue(content.intro);await expect(page.locator('[data-section-field="intro"]')).toBeDisabled();
  await page.getByRole('button',{name:'Kiểm tra bản đã lưu / thử lại cùng thao tác'}).click();await expect(page.locator('[data-section-field="intro"]')).toBeEnabled();
  await expect(page.locator('.snapshot-paper')).toHaveAttribute('data-saved-revision','1');await expect(page.locator('.snapshot-paper')).toContainText(content.intro);
  const puts=await page.evaluate(()=>window.p3Calls.filter(c=>c.method==='PUT'));expect(puts).toHaveLength(2);expect(puts[0].key).toBe(puts[1].key);expect(puts[0].body).toBe(puts[1].body);expect(JSON.parse(puts[0].body).content.heading.lines[0].some(r=>r.emphasis==='ACCENT')).toBe(true);
  await page.getByRole('button',{name:'Đối chiếu nội dung gốc ↗'}).click();await expect(page.getByRole('dialog',{name:'Nội dung gốc'}).locator('input,textarea')).toHaveCount(0);await page.getByRole('button',{name:'Đóng đối chiếu'}).click();
  for(const width of [1440,390,768,320]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
  await page.evaluate(()=>window.p3Editor.destroy());
 });
 test('REVIEWER cannot edit or save Section copy and source remains readonly',async({page})=>{
  await mount(page,'REVIEWER');await expect(page.locator('[data-section-field="intro"]')).toHaveJSProperty('readOnly',true);await expect(page.locator('[data-section-action="save"]')).toBeDisabled();await page.getByRole('button',{name:'Đối chiếu nội dung gốc ↗'}).click();await expect(page.getByRole('dialog',{name:'Nội dung gốc'}).locator('input,textarea')).toHaveCount(0);expect(await page.evaluate(()=>window.p3Calls.filter(c=>c.method==='PUT').length)).toBe(0);await page.getByRole('button',{name:'Đóng đối chiếu'}).click();await page.evaluate(()=>window.p3Editor.destroy());
 });
});
