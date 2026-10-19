import {expect} from '@playwright/test';
import path from 'node:path';
import {appendFileSync,constants} from 'node:fs';
import {localizedProjectReadSchema,parseProjectQa} from '../../contracts/project-localization-records.mjs';

/** Select only the actual CMS module entry; never instantiate a second bare Auth module. */
export function loadedAuthEntry({origin,scripts}){
 if(origin!=='http://127.0.0.1:5173')throw Error('Unexpected Auth origin');
 const entries=new Set();
 for(const script of scripts){
  if(script.type!=='module')continue;
  let url;try{url=new URL(script.src,origin);}catch{continue;}
  if(url.origin!==origin||url.pathname!=='/auth.mjs')continue;
  if(url.hash||(url.search&&!/^\?t=[0-9]+$/.test(url.search)))throw Error('Unexpected Auth entry query');
  entries.add(url.href);
 }
 if(entries.size!==1)throw Error('Auth entry unavailable or ambiguous');
 return [...entries][0];
}
/** Actual Project GET/QA and UI checks. No login, writes or automatic cleanup. */
export function projectReadonlyPhases({page,fixture,run,generation=0}){
 const reads=new Map(),qas=new Map(),issues=[],phases={};let attempt=0;
  const resourcePattern=/^http:\/\/127\.0\.0\.1:5173\/api\/cms\/localizations\/projects\/wayfair\/(en|vi|ja)(\/qa)?$/;
  const onResponse=async response=>{try{const match=resourcePattern.exec(response.url());if(!match||response.request().method()!=='GET')return;if(response.status()!==200){issues.push(`Read status ${response.status()} for ${match[1]}${match[2]??''}`);return;}const raw=await response.json();if(match[2]){const qa=parseProjectQa(raw);qas.set(match[1],qa);}else{const read=localizedProjectReadSchema.parse(raw);reads.set(match[1],read);}}catch(error){issues.push('RESPONSE_PARSE_FAILED');}};
  page.on('response',onResponse);
  async function navigateProject(){if(await page.locator('#cms-menu-open').isVisible())await page.locator('#cms-menu-open').click();await expect(async()=>{await page.locator('#cms-group-nav [data-site-group-target="site-component-work"]').click();await expect(page.locator('#site-component-work')).toBeVisible();}).toPass({timeout:15000,intervals:[250,500,1000]});}
  async function closeRecord(){if(await page.getByRole('dialog',{name:'Nội dung gốc',exact:true}).isVisible())await page.getByRole('button',{name:'Đóng đối chiếu',exact:true}).click();if(await page.locator('.project-expanded-dialog').evaluate(dialog=>dialog.open).catch(()=>false))await page.getByRole('button',{name:'Đóng xem trước',exact:true}).click();if(await page.locator('.project-record-dialog').evaluate(dialog=>dialog.open).catch(()=>false))await page.getByRole('button',{name:'Đóng dự án',exact:true}).click();}
  async function logout(){await page.setViewportSize({width:1440,height:900});await closeRecord();await page.locator('#cms-sidebar-logout').click();await expect(page.locator('#login-panel')).toBeVisible();await expect(page.locator('#private-content')).toBeEmpty();await expect(page.locator('iframe[srcdoc]')).toHaveCount(0);await expect(page.locator('#session-panel')).toBeHidden();await expect(page.locator('#session-role')).toHaveText('');}
   for(const width of [1440,390])phases[`project-${width}`]={run:async()=>{const current=++attempt,startIssues=issues.length;await closeRecord();await page.setViewportSize({width,height:900});await navigateProject();await expect(page.getByRole('heading',{name:'Dự án',exact:true})).toHaveCount(2);for(const selector of ['.cms-content-header','#site-component-work>.cms-section-heading','.cms-editor-card>.cms-card-head','.cms-section-context','.cms-section-eyebrow','.editor-actions'])for(const element of await page.locator(selector).all())await expect(element).toBeHidden();await page.screenshot({path:path.join(run,`generation-${generation}-attempt-${current}-actual-list-${width}.png`),fullPage:true});
    for(const locale of ['en','vi','ja']){reads.delete(locale);qas.delete(locale);await page.locator(`.locale-status [data-project-id="wayfair"][data-project-locale="${locale}"]`).click();await expect.poll(()=>reads.has(locale)).toBe(true);const read=reads.get(locale);expect(read.draft).toEqual(fixture.reads[locale].draft);expect(read.base.project).toEqual(fixture.reads[locale].base.project);await expect(page.locator('[data-project-field="summary"]')).toHaveValue(read.draft.content.summary);await expect(page.locator('.project-record-dialog .save-actions [role="status"]')).toHaveText('✓ Đã lưu');
     await page.getByRole('button',{name:'Đối chiếu nội dung gốc ↗',exact:true}).click();await expect(page.getByRole('dialog',{name:'Nội dung gốc',exact:true}).locator('input,textarea')).toHaveCount(0);await expect(page.getByRole('dialog',{name:'Nội dung gốc',exact:true})).toContainText(read.base.project.summary);await page.getByRole('button',{name:'Đóng đối chiếu',exact:true}).click();if(width<=700)await page.getByRole('button',{name:'Bản đã lưu',exact:true}).click();await expect.poll(()=>qas.has(locale),{timeout:15000}).toBe(true);const qa=qas.get(locale);expect(qa.draft).toEqual(read.draft);await expect(page.locator('.project-preview-host iframe')).toBeVisible();await expect.poll(()=>page.frameLocator('.project-preview-host iframe').locator('.project-meta').evaluate(el=>getComputedStyle(el).paddingTop===(innerWidth<=480?'14px':innerWidth<=760?'13px':'17px'))).toBe(true);await page.screenshot({path:path.join(run,`generation-${generation}-attempt-${current}-actual-${locale}-${width}.png`),fullPage:false});
     await page.getByRole('button',{name:'Mở chi tiết dự án ↗',exact:true}).click();const detail=page.frameLocator('.project-expanded-dialog iframe');await expect(detail.locator('.case-gallery img')).toHaveCount(2);await expect(detail.locator('.case-overview>p')).toHaveText(qa.project.summary);await expect.poll(()=>detail.locator('.case-body').evaluate(el=>getComputedStyle(el).paddingLeft===(innerWidth>760?'45px':'23px'))).toBe(true);await expect.poll(()=>detail.locator('#case-dialog').evaluate(el=>getComputedStyle(el).transform)).toBe('none');await expect(detail.locator('.case-footer')).toContainText('21');await page.screenshot({path:path.join(run,`generation-${generation}-attempt-${current}-actual-detail-${locale}-${width}.png`),fullPage:false});await closeRecord();
    }
    if(issues.length!==startIssues)throw Error('Project response verification failed');
   }};
 let remembered=null;
 phases.remember={run:async()=>{
  let step='INITIAL_IMPORT';
  const diagnostic=async(tab,phase,errorCode='NONE')=>{
   let snapshot={authPhase:'UNKNOWN',loginPanelVisible:false,roleCategory:'NONE',hasAuthEntryQuery:false};
   try{snapshot=await tab.evaluate(()=>{
    const current=document.documentElement.dataset.cmsAuthState,authPhase=['AUTHORIZED','LOGIN_REQUIRED','RETRY_REQUIRED'].includes(current)?current:'UNKNOWN';
    const login=document.getElementById('login-panel'),role=document.getElementById('session-role')?.textContent??'';
    const hasAuthEntryQuery=[...document.scripts].some(script=>{try{const url=new URL(script.src,location.href);return url.origin===location.origin&&url.pathname==='/auth.mjs'&&url.search!=='';}catch{return false;}});
    return {authPhase,loginPanelVisible:Boolean(login&&!login.hidden&&login.getClientRects().length),roleCategory:['OWNER','EDITOR','REVIEWER','PUBLISHER'].includes(role)?role:'NONE',hasAuthEntryQuery};
   });}catch{}
   appendFileSync(path.join(run,'remember-diagnostics.private.jsonl'),JSON.stringify({step,phase,errorCode,...snapshot})+'\n',{flag:constants.O_WRONLY|constants.O_APPEND|constants.O_CREAT|constants.O_NOFOLLOW,mode:0o600});
  };
  await diagnostic(page,'BEFORE_IMPORT');
  try{

  const readSession=async tab=>{
   const entry=await tab.evaluate(selector=>{
    // Only this validated same-origin module URL leaves the browser; never logs.
    const entries=new Set();if(location.origin!=='http://127.0.0.1:5173')throw Error('Unexpected Auth origin');
    for(const script of document.querySelectorAll(selector)){
     const url=new URL(script.src,location.href);if(url.origin!==location.origin||url.pathname!=='/auth.mjs')continue;
     if(url.hash||(url.search&&!/^\?t=[0-9]+$/.test(url.search)))throw Error('Unexpected Auth entry query');entries.add(url.href);
    }
    if(entries.size!==1)throw Error('Auth entry unavailable or ambiguous');return [...entries][0];
   },'script[type="module"][src]');
   // Validate again at the Node boundary before the fixed Auth module import.
   const verified=loadedAuthEntry({origin:'http://127.0.0.1:5173',scripts:[{type:'module',src:entry}]});
   return tab.evaluate(async url=>{const module=await import(url);return module.getSession();},verified);
  };
  const ready=async tab=>{await expect.poll(()=>tab.locator('html').getAttribute('data-cms-auth-state'),{timeout:25000}).toBe('AUTHORIZED');};
  const original=await readSession(page);step='INITIAL_SESSION_VALIDATION';await diagnostic(page,original?'SESSION_PRESENT':'SESSION_ABSENT');if(!original)throw Error('Verified session unavailable');
  step='RELOAD';await diagnostic(page,'BEFORE_RELOAD');await page.reload();step='RELOAD_AUTH_WAIT';await ready(page);step='RELOAD_SESSION_VALIDATION';await diagnostic(page,'AUTHORIZED');const reloaded=await readSession(page);
  expect(reloaded?.uid).toBe(original.uid);expect(reloaded?.role).toBe(original.role);
  step='NEW_TAB';const tab=await page.context().newPage();
  try{await tab.goto('http://127.0.0.1:5173/login');step='NEW_TAB_AUTH_WAIT';await ready(tab);step='NEW_TAB_SESSION_VALIDATION';await diagnostic(tab,'AUTHORIZED');const reopened=await readSession(tab);expect(reopened?.uid).toBe(original.uid);expect(reopened?.role).toBe(original.role);}
  finally{await tab.close();}
  remembered={reloadSameIdentity:true,newTabSameIdentity:true,backendRevalidated:true,role:original.role};step='COMPLETE';await diagnostic(page,'PASS');
  }catch(error){await diagnostic(page,'FAILED',error?.code==='auth/already-initialized'?'auth/already-initialized':'UNCLASSIFIED');throw Error('Remember verification failed; inspect sanitized diagnostic step');}
 }};
 async function releasePrivatePage(){
  await page.goto('about:blank');await expect(page.locator('body')).toBeEmpty();await expect(page.locator('iframe')).toHaveCount(0);
 }
 return {phases,loginReady:async()=>await page.locator('#session-role').textContent()==='OWNER'&&await page.locator('#private-content .project-localization-editor').count()===1,cleanup:releasePrivatePage,verifyLogout:logout,rememberResult:()=>remembered,issues,dispose:()=>page.off('response',onResponse)};
}
