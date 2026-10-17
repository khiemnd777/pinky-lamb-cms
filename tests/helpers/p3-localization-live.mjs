import {expect} from '@playwright/test';
import {createHash,randomUUID} from 'node:crypto';
import {writeFileSync,readFileSync,readdirSync,openSync,closeSync,fstatSync,constants,existsSync} from 'node:fs';
import path from 'node:path';
import {canonicalJson} from '../../contracts/draft.mjs';
import {localizedServiceReceiptSchema,localizedServiceReadSchema,parseServiceQa} from '../../contracts/service-localization-records.mjs';
import {localizedSectionReceiptSchema,localizedSectionReadSchema} from '../../contracts/work-services-localization-records.mjs';
import {assertProjectOwnedPath} from '../../scripts/export-project-localization-local.mjs';
import {localizedServiceSaveSchema} from '../../contracts/service-localization.mjs';
import {localizedSectionSaveSchema} from '../../contracts/work-services-localization.mjs';
import {parseSectionQa} from '../../contracts/work-services-localization-records.mjs';
import {parseWorkServicesQa} from '../../contracts/site-locale-projection.mjs';
import {loadedAuthEntry} from './project-localization-live.mjs';
export const P3_WRITE_TARGETS=Object.freeze(['en','vi','ja'].flatMap(locale=>[{kind:'services',id:'brand-creative',locale},...['work','services'].map(id=>({kind:'sections',id,locale}))]));
export const P3_WRITE_BUDGET=Object.freeze({successfulCommitsMax:16,documentWritesMax:32,draftRecordsMax:9});
const hash=value=>createHash('sha256').update(typeof value==='string'?value:canonicalJson(value)).digest('hex');
export function p3TargetPath(target){if(!P3_WRITE_TARGETS.some(t=>t.kind===target.kind&&t.id===target.id&&t.locale===target.locale))throw Error('Unapproved P3 target');return `/api/cms/localizations/${target.kind}/${target.id}/${target.locale}`;}
const stageTarget=name=>{
 const initial=/^(service|work|services)-(en|vi|ja)-initial$/.exec(name);
 if(initial)return {kind:initial[1]==='service'?'services':'sections',id:initial[1]==='service'?'brand-creative':initial[1],locale:initial[2]};
 if(['service-cas','service-restore','service-response-loss'].includes(name))return {kind:'services',id:'brand-creative',locale:'en'};
 if(['work-cas','work-restore'].includes(name))return {kind:'sections',id:'work',locale:'vi'};
 throw Error('Unknown journal write stage');
};
/** One bounded restart from an original task journal. No browser/Auth state is read or serialized. */
export function p3ResumeJournal(records,{candidates}={}){
 const preflights=records.filter(r=>r.name.endsWith('-preflight.private.json'));
 if(preflights.length!==1)throw Error('Original preflight journal required');
 const preflight=preflights[0].value;if(preflight.status!=='SOURCE_AND_NINE_TARGETS_READ'||preflight.candidateSourceHash!==candidates.sourceHomeContentJsonSha256||preflight.reads?.length!==9)throw Error('Resume source preflight mismatch');
 const typedRead=(target,read)=>{const value=(target.kind==='services'?localizedServiceReadSchema:localizedSectionReadSchema).parse(read);if((value.serviceId??value.sectionId)!==target.id||value.locale!==target.locale)throw Error('Journal read identity mismatch');return value;};
 const before=new Map();for(const {target,read}of preflight.reads){typedRead(target,read);const key=p3TargetPath(target);if(before.has(key)||read.draft!==null)throw Error('Original targets must be uniquely ABSENT');before.set(key,read);}
 const completedStages=new Set(),intents=new Map(),commits=new Map(),denied=new Set(),stageBefore=new Map(),readbacks=[];
 for(const {name,value:v}of records){
  if(/^checkpoint-/.test(name)){if(v.kind==='write'&&v.state==='COMPLETE'){stageTarget(v.stage);if(completedStages.has(v.stage))throw Error('Duplicate completed stage');completedStages.add(v.stage);}continue;}
  if(name.endsWith('-stage-before.private.json')){if(stageBefore.has(v.stage))throw Error('Repeated write attempt in source journal');const target=stageTarget(v.stage);if(canonicalJson(target)!==canonicalJson(v.target))throw Error('Journal stage target mismatch');typedRead(target,v.read);stageBefore.set(v.stage,v);}
  if(name.endsWith('-write-intent.private.json')){const target=stageTarget(v.stage);(target.kind==='services'?localizedServiceSaveSchema:localizedSectionSaveSchema).parse(v.body);if(canonicalJson(target)!==canonicalJson(v.target)||hash(v.body)!==v.bodyHash||typeof v.key!=='string'||!v.key||intents.has(hash(v.key)))throw Error('Invalid immutable write intent');intents.set(hash(v.key),v);}
  if(name.endsWith('-commit-checkpoint.private.json')){if(commits.has(v.keyHash))throw Error('Duplicate commit checkpoint');const receipt=(Object.hasOwn(v.receipt,'serviceId')?localizedServiceReceiptSchema:localizedSectionReceiptSchema).parse(v.receipt);commits.set(v.keyHash,receipt);}
  if(name.endsWith('-denial.private.json')){if(!Number.isInteger(v.status)||v.status<400||v.status>=500)throw Error('Unresolved admitted outcome');denied.add(v.keyHash);}
  if(name.endsWith('-stage-readback.private.json')||name.endsWith('-restore-readback.private.json'))readbacks.push({stage:v.stage,draft:v.draft});
  if(name.endsWith('-cas-result.private.json'))readbacks.push({stage:v.stage,draft:v.readback});
 }
 if(!completedStages.size||intents.size>16||commits.size>16)throw Error('Invalid resume budget');
 const latest=new Map(),stages=new Map();
 for(const [keyHash,intent]of intents){
  const receipt=commits.get(keyHash),prior=stageBefore.get(intent.stage),target=stageTarget(intent.stage),path=p3TargetPath(target);
  if(!completedStages.has(intent.stage)||!prior||prior.read.base.dependencyHash!==intent.body.expectedDependencyHash||(prior.read.draft?.revision??null)!==intent.body.expectedRevision||intent.body.contractRevision!==1)throw Error('Unfinished admitted stage; manual reconciliation required');
  if(!receipt&&!denied.has(keyHash)||receipt&&denied.has(keyHash))throw Error('Unresolved admitted intent; writes denied');
  const stage=stages.get(intent.stage)??{intents:0,commits:0};stage.intents++;stages.set(intent.stage,stage);
  if(receipt){stage.commits++;if(receipt.locale!==target.locale||(receipt.serviceId??receipt.sectionId)!==target.id||receipt.revision!==(intent.body.expectedRevision??0)+1||receipt.dependencyHash!==intent.body.expectedDependencyHash||receipt.dependencyHash!==before.get(path).base.dependencyHash||receipt.contentHash!==hash(intent.body.content))throw Error('Commit does not match immutable intent');const draft={...receipt,content:intent.body.content},previous=latest.get(path);if(previous&&draft.revision!==previous.revision+1||!previous&&draft.revision!==1)throw Error('Noncontiguous journal revisions');latest.set(path,draft);}
 }
 for(const key of commits.keys())if(!intents.has(key))throw Error('Commit without admitted intent');
 for(const key of denied)if(!intents.has(key))throw Error('Denial without admitted intent');
 for(const name of completedStages){const stage=stages.get(name);if(!stage||stage.commits!==1||stage.intents>(name.endsWith('-cas')?2:1))throw Error('Completed stage lacks bounded commit proof');if(name.endsWith('-initial')&&!readbacks.some(r=>r.stage===name))throw Error('Completed initial stage lacks readback');}
 for(const proof of readbacks){if(!proof.draft)throw Error('Readback absent');const target=stageTarget(proof.stage),matching=[...intents.entries()].find(([key,intent])=>intent.stage===proof.stage&&commits.has(key)&&commits.get(key).revision===proof.draft.revision);if(!matching||canonicalJson(proof.draft)!==canonicalJson({...commits.get(matching[0]),content:matching[1].body.content})||p3TargetPath(target)!==p3TargetPath(matching[1].target))throw Error('Journal readback mismatch');}
 return {before,latest,completedStages,intents,commits,successfulCommits:commits.size,documentWrites:commits.size*2};
}
export function assertP3ResumeRead(resume,target,read){const key=p3TargetPath(target),prior=resume.before.get(key);if(!prior||canonicalJson(read.base)!==canonicalJson(prior.base)||canonicalJson(read.draft)!==canonicalJson(resume.latest.get(key)??null))throw Error('Resume target/source differs from proven journal');}
export function readP3ResumeJournal(root,id,candidates){
 if(typeof id!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(id))throw Error('Invalid resume run ID');
 const folder=assertProjectOwnedPath(path.join(root,'.local/test-outputs/multilingual-001/p3-remainder-v1',id));if(existsSync(path.join(folder,'resume-seed.private.json')))throw Error('Chained resume requires separate reconciliation');
 const names=readdirSync(folder).filter(name=>/^checkpoint-\d{4}\.private\.json$/.test(name)||/^p3-g0-\d{4}-(?:preflight|stage-before|write-intent|commit-checkpoint|denial|stage-readback|restore-readback|cas-result)\.private\.json$/.test(name)).sort();if(names.length>256)throw Error('Journal exceeds bounded record count');
 const records=names.map(name=>{const fd=openSync(assertProjectOwnedPath(path.join(folder,name)),constants.O_RDONLY|constants.O_NOFOLLOW);try{const stat=fstatSync(fd);if(!stat.isFile()||stat.nlink!==1||stat.size>2*1048576)throw Error('Invalid journal file');const bytes=readFileSync(fd),after=fstatSync(fd);if(bytes.length!==stat.size||after.size!==stat.size||after.mtimeMs!==stat.mtimeMs)throw Error('Journal changed during read');return {name,value:JSON.parse(bytes),sha256:createHash('sha256').update(bytes).digest('hex')};}finally{closeSync(fd);}});
 return {...p3ResumeJournal(records,{candidates}),sourceRun:id,sourceFiles:records.map(({name,sha256})=>({name,sha256}))};
}
export async function showServiceEditingPanel(page,locale){
 if(!['en','vi','ja'].includes(locale))throw Error('Invalid Service locale');
 const title=page.locator(`.service-record-dialog [data-service-field="title"][lang="${locale}"]`);
 await title.waitFor({state:'attached'});const edit=page.getByRole('button',{name:'Biên tập',exact:true});if(await edit.isVisible())await edit.click();await title.waitFor({state:'visible'});
}
/** All writes are explicit named owner stages. Launch/preflight/visual never save. */
export function p3LocalizationLive({page,context,run,candidates,generation=0,resume=null}){
 let sequence=0,active=null,preflightComplete=false,disposed=false;const commits=new Map(resume?[...resume.commits].map(([keyHash,receipt])=>[resume.intents.get(keyHash).key,receipt]):[]),admitted=new Map(resume?[...resume.intents.values()].map(i=>[i.key,{bodyHash:i.bodyHash,target:i.target}]):[]),before=new Map(resume?.before??[]),phases={};
 const write=(type,value)=>writeFileSync(path.join(run,`p3-g${generation}-${String(++sequence).padStart(4,'0')}-${type}.private.json`),JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});
 const candidate=target=>{const value=candidates.targets.find(c=>c.kind===(target.kind==='services'?'service':'section')&&c.id===target.id&&c.locale===target.locale);if(!value)throw Error('Missing reviewed candidate');return structuredClone(value.content);};
 async function api(tab,pathname,options={}){
  const entry=await tab.evaluate(()=>{const matches=[...document.querySelectorAll('script[type="module"][src]')].map(s=>new URL(s.src,location.href)).filter(u=>u.origin===location.origin&&u.pathname==='/auth.mjs');if(matches.length!==1)throw Error('Auth module unavailable');return {origin:location.origin,scripts:[{type:'module',src:matches[0].href}]};});
  const url=loadedAuthEntry(entry),result=await tab.evaluate(async({url,pathname,options})=>{const module=await import(url);try{return {ok:true,value:await module.apiFetch(pathname,options)};}catch(error){return {ok:false,status:error.status??null,code:['VALIDATION_ERROR','REVISION_CONFLICT','IDEMPOTENCY_PAYLOAD_MISMATCH','FORBIDDEN','UNAUTHENTICATED','SESSION_API_TIMEOUT'].includes(error.code)?error.code:'REQUEST_FAILED'};}},{url,pathname,options});
  if(!result.ok)throw Object.assign(Error('P3 request failed; inspect fixed status/code'),{status:result.status,code:result.code});return result.value;
 }
 function recordReceipt(key,receipt){const parsed=(Object.hasOwn(receipt,'serviceId')?localizedServiceReceiptSchema:localizedSectionReceiptSchema).parse(receipt),prior=commits.get(key);if(prior&&canonicalJson(prior)!==canonicalJson(parsed))throw Error('Replay receipt changed');if(!prior){commits.set(key,parsed);if(commits.size>16)throw Error('Commit budget exceeded');write('commit-checkpoint',{keyHash:hash(key),receipt:parsed,successfulCommits:commits.size,documentWrites:commits.size*2});}return parsed;}
 const onResponse=async response=>{try{const req=response.request();if(req.method()!=='PUT'||!/^http:\/\/127\.0\.0\.1:5173\/api\/cms\/localizations\/(services\/brand-creative|sections\/(work|services))\/(en|vi|ja)$/.test(response.url()))return;const key=await req.headerValue('idempotency-key');if(!key||!admitted.has(key))return;if(response.status()===200)recordReceipt(key,await response.json());else write('denial',{keyHash:hash(key),status:response.status(),successfulCommits:commits.size});}catch{write('response-unverified',{status:'UNVERIFIED_RESPONSE_NO_AUTOMATIC_REPLAY'});}};
 page.on('response',onResponse);
 function allowsMutation(request){
  if(!active||disposed||request.method()!=='PUT'||request.url()!==`http://127.0.0.1:5173${p3TargetPath(active.target)}`)return false;
  let body;try{body=request.postDataJSON();}catch{return false;}
  const key=request.headers()['idempotency-key'];if(!key||body.expectedDependencyHash!==active.base.dependencyHash||body.expectedRevision!==active.expectedRevision||!active.contentHashes.has(hash(body.content)))return false;
  if(!admitted.has(key)){if(admitted.size>=16||active.keys.size>=active.maxIntents)return false;admitted.set(key,{bodyHash:hash(body),target:active.target});active.keys.add(key);write('write-intent',{stage:active.stage,target:active.target,key,body,bodyHash:hash(body),maximumSuccessfulCommits:16});}
  else if(admitted.get(key).bodyHash!==hash(body))return false;
  return true;
 }
 async function prepare(target,stage,contents,{initial=false,maxIntents=1}={}){
  if(!preflightComplete)throw Error('Run readonly p3-preflight before any write');const read=await api(page,p3TargetPath(target));
  if(initial&&read.draft!==null)throw Error('Initially absent target exists; stop before overwrite');
  active={target,stage,base:read.base,expectedRevision:read.draft?.revision??null,contentHashes:new Set(contents.map(hash)),keys:new Set(),maxIntents};write('stage-before',{stage,target,read});return read;
 }
 async function put(tab,target,content,key){const body={contractRevision:1,expectedRevision:active.expectedRevision,expectedDependencyHash:active.base.dependencyHash,content},receipt=await api(tab,p3TargetPath(target),{method:'PUT',headers:{'Idempotency-Key':key,'Content-Type':'application/json'},body:JSON.stringify(body)});return recordReceipt(key,receipt);}
 async function navigateServices(tab=page){if(await tab.locator('#cms-menu-open').isVisible())await tab.locator('#cms-menu-open').click();await tab.locator('#cms-group-nav [data-site-group-target="site-component-services"]').click();await expect(tab.locator('#site-component-services')).toBeVisible();}
 async function closeService(){if(await page.locator('.service-record-dialog').evaluate(d=>d.open).catch(()=>false))await page.getByRole('button',{name:'Đóng dịch vụ',exact:true}).click();}
 async function openService(locale){await closeService();await navigateServices();await page.locator(`.locale-status [data-service-id="brand-creative"][data-service-locale="${locale}"]`).click();await expect(page.locator('.service-record-dialog')).toBeVisible();await showServiceEditingPanel(page,locale);}
 async function fillService(content){for(const [key,value]of Object.entries(content))await page.locator(`[data-service-field="${key}"]`).fill(key==='scope'?value.join('\n'):value);}
 const writePhase=(name,target,runPhase)=>{phases[name]={kind:'write',authorize:()=>process.env.PINKY_MULTILINGUAL_P3_WRITE_APPROVED==='1'&&!resume?.completedStages.has(name),allowsMutation,run:async()=>{try{await runPhase();}finally{active=null;}}};};
 phases['p3-preflight']={run:async()=>{
  const reads=[];for(const target of P3_WRITE_TARGETS){const read=await api(page,p3TargetPath(target));const source=target.kind==='services'?read.base.service:read.base.section,expected=target.kind==='services'?candidates.sourceService:candidates.sourceSections.find(s=>s.sectionId===target.id);if(canonicalJson(source)!==canonicalJson(expected))throw Error('Actual source differs from reviewed source inventory');if(resume)assertP3ResumeRead(resume,target,read);if(!before.has(p3TargetPath(target))){if(read.draft)throw Error('Target before-image no longer ABSENT');before.set(p3TargetPath(target),read);}reads.push({target,read});}write('preflight',{status:'SOURCE_AND_NINE_TARGETS_READ',reads,candidateSourceHash:candidates.sourceHomeContentJsonSha256,successfulCommits:commits.size});preflightComplete=true;
 }};
 for(const target of P3_WRITE_TARGETS){const name=`${target.kind==='services'?'service':target.id}-${target.locale}-initial`;writePhase(name,target,async()=>{
  const content=candidate(target);await prepare(target,name,[content],{initial:true});const prior=commits.size;
  if(target.kind==='services'){await openService(target.locale);await fillService(content);await page.locator('[data-service-action="save"]').click();await expect.poll(()=>commits.size,{timeout:20000}).toBe(prior+1);}
  else await put(page,target,content,randomUUID());
  const read=await api(page,p3TargetPath(target));expect(read.draft.content).toEqual(content);write('stage-readback',{stage:name,target,draft:read.draft,successfulCommits:commits.size});
 });}
 for(const [prefix,target,field]of [['service',{kind:'services',id:'brand-creative',locale:'en'},'summary'],['work',{kind:'sections',id:'work',locale:'vi'},'intro']]){
  const name=`${prefix}-cas`;writePhase(name,target,async()=>{const content=candidate(target),a={...content,[field]:content[field]+'\n'},b={...content,[field]:content[field]+'\n\n'};await prepare(target,name,[a,b],{maxIntents:2});const second=await context.newPage();try{await second.goto('http://127.0.0.1:5173/login');await expect.poll(()=>second.locator('html').getAttribute('data-cms-auth-state'),{timeout:25000}).toBe('AUTHORIZED');second.on('response',onResponse);const result=await Promise.allSettled([put(page,target,a,randomUUID()),put(second,target,b,randomUUID())]);expect(result.filter(v=>v.status==='fulfilled')).toHaveLength(1);expect(result.find(v=>v.status==='rejected')?.reason.code).toBe('REVISION_CONFLICT');write('cas-result',{stage:name,statuses:result.map(v=>v.status==='fulfilled'?'COMMITTED':v.reason.code),readback:(await api(page,p3TargetPath(target))).draft});}finally{second.off('response',onResponse);await second.close();}});
  const restore=`${prefix}-restore`;writePhase(restore,target,async()=>{const content=candidate(target);await prepare(target,restore,[content]);await put(page,target,content,randomUUID());write('restore-readback',{stage:restore,draft:(await api(page,p3TargetPath(target))).draft});});
 }
 writePhase('service-response-loss',{kind:'services',id:'brand-creative',locale:'en'},async()=>{
  const target={kind:'services',id:'brand-creative',locale:'en'},content=candidate(target);content.summary+='\n\n\n';await prepare(target,'service-response-loss',[content]);const key=randomUUID(),body={contractRevision:1,expectedRevision:active.expectedRevision,expectedDependencyHash:active.base.dependencyHash,content};
  // Inject a real client transport failure AFTER the server answered, before apiFetch receives it.
  await page.evaluate(pathname=>{const original=window.fetch;window.__p3RestoreFetch=()=>{window.fetch=original;delete window.__p3RestoreFetch;};window.fetch=async(input,options)=>{const response=await original(input,options);const url=new URL(typeof input==='string'?input:input.url,location.href);if(url.pathname===pathname&&options?.method==='PUT'){window.__p3RestoreFetch();throw new TypeError('Controlled response delivery loss');}return response;};},p3TargetPath(target));
  try{
   await expect(put(page,target,content,key)).rejects.toMatchObject({code:'REQUEST_FAILED'});
   await expect.poll(()=>commits.has(key),{timeout:20000}).toBe(true);
   const receipt=commits.get(key);write('unknown-outcome',{stage:'service-response-loss',status:'CLIENT_RESPONSE_LOST_SERVER_RECEIPT_CHECKPOINTED',keyHash:hash(key),bodyHash:hash(body)});
   const replay=await put(page,target,content,key);expect(replay).toEqual(receipt);write('response-loss-replay',{sameReceipt:true,successfulCommits:commits.size});
  }finally{await page.evaluate(()=>window.__p3RestoreFetch?.());}
 });
 async function verifyServices(width,locales){await page.setViewportSize({width,height:width<=700?844:900});for(const locale of locales){const target={kind:'services',id:'brand-creative',locale};await openService(locale);const read=await api(page,p3TargetPath(target)),qa=parseServiceQa(await api(page,p3TargetPath(target)+'/qa'));expect(qa.draft).toEqual(read.draft);for(const [key,value]of Object.entries(read.draft.content))await expect(page.locator(`[data-service-field="${key}"]`)).toHaveValue(key==='scope'?value.join('\n'):value);if(width<=700)await page.getByRole('button',{name:'Bản đã lưu',exact:true}).click();await expect(page.locator('.service-preview-host iframe')).toHaveAttribute('sandbox','');await expect(page.frameLocator('.service-preview-host iframe').locator('script')).toHaveCount(0);await expect(page.frameLocator('.service-preview-host iframe').locator('summary strong')).toHaveText(qa.service.title);await expect(page.frameLocator('.service-preview-host iframe').locator('summary small')).toHaveText(qa.service.titleVi);await page.screenshot({path:path.join(run,`p3-g${generation}-service-${locale}-${width}-${++sequence}.png`),fullPage:true});}await closeService();}
 for(const width of [1440,390])phases[`p3-service-${width}`]={run:()=>verifyServices(width,['en','vi','ja'])};
 phases['p3-service-en']={run:async()=>{for(const width of [1440,390])await verifyServices(width,['en']);}};
 async function openSection(id){await closeService();if(await page.locator('#cms-menu-open').isVisible())await page.locator('#cms-menu-open').click();await page.locator(`#cms-group-nav [data-site-group-target="site-component-${id==='work'?'work':'services'}"]`).click();await page.getByRole('tab',{name:'Nội dung mục',exact:true}).click();await expect(page.locator(`#site-component-${id}`).locator('.section-localization-editor')).toBeVisible();}
 phases['p3-sections']={run:async()=>{for(const id of ['work','services']){await openSection(id);const editor=page.locator(`#site-component-${id}`).locator('.section-localization-editor');for(const locale of ['en','vi','ja']){await editor.locator(`[data-section-locale="${locale}"]`).click();const target={kind:'sections',id,locale},read=await api(page,p3TargetPath(target)),qa=parseSectionQa(await api(page,p3TargetPath(target)+'/qa'));expect(qa.draft).toEqual(read.draft);for(const field of ['eyebrow','intro',...(id==='work'?['loadMoreLabel']:[])])await expect(editor.locator(`[data-section-field="${field}"]`)).toHaveValue(read.draft.content[field]);await expect(editor.locator('[data-section-field="heading"]')).toHaveValue(read.draft.content.heading.lines.map(line=>line.map(run=>run.text).join('')).join('\n'));await editor.getByRole('button',{name:'Đối chiếu nội dung gốc ↗'}).click();await expect(page.getByRole('dialog',{name:'Nội dung gốc'}).locator('input,textarea')).toHaveCount(0);await page.getByRole('button',{name:'Đóng đối chiếu',exact:true}).click();for(const width of [1440,390,768,320]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:path.join(run,`p3-g${generation}-section-${id}-${locale}-${width}-${++sequence}.png`),fullPage:true});}}}}};
 async function resourceBytes(resource){
  const entry=await page.evaluate(()=>({origin:location.origin,scripts:[...document.querySelectorAll('script[type="module"][src]')].map(s=>({type:s.type,src:s.src}))})),url=loadedAuthEntry(entry);
  return page.evaluate(async({resource,url})=>{
   const location=new URL(resource.url);let bytes;
   if(location.origin==='http://127.0.0.1:5010'&&location.pathname==='/'+resource.path&&!location.search&&!location.hash){const response=await fetch(location.href,{redirect:'error',signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Public resource unavailable');bytes=new Uint8Array(await response.arrayBuffer());}
   else if(location.origin==='http://127.0.0.1:5173'&&/^\/api\/cms\/media\/[A-Za-z0-9_-]+\/derivatives\/[A-Za-z0-9_-]+$/.test(location.pathname)&&!location.search&&!location.hash&&resource.derivative){const module=await import(url),payload=await module.apiFetch(location.pathname,{responseType:'bytes',derivative:resource.derivative,maxBytes:resource.sizeBytes});bytes=payload.bytes;}
   else throw Error('Resource outside approved closure');
   if(bytes.length!==resource.sizeBytes||bytes.length>64*1048576)throw Error('Resource byte size mismatch');const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');if(digest!==resource.sha256)throw Error('Resource hash mismatch');let binary='';for(let offset=0;offset<bytes.length;offset+=32768)binary+=String.fromCharCode(...bytes.subarray(offset,offset+32768));return btoa(binary);
  },{resource,url});
 }
 phases['p3-collect']={run:async()=>{const entries=[];for(const locale of ['en','vi','ja']){const qa=parseWorkServicesQa(await api(page,`/api/cms/localizations/work-services/${locale}/qa`)),files=[];for(const resource of qa.resources)files.push({path:resource.path,base64:await resourceBytes(resource)});entries.push({qa,files});}const bundle={contractRevision:1,kind:'LOCALIZED_WORK_SERVICES_QA_BUNDLE',entries};const {planWorkServicesExport}=await import('../../scripts/export-work-services-local.mjs');planWorkServicesExport(bundle,'readonly-validation');write('work-services-bundle',bundle);write('projection-collection',{status:'THREE_LOCALE_SAVED_SNAPSHOT_VALIDATED',locales:entries.map(e=>e.qa.locale),dependencyHashes:entries.map(e=>e.qa.dependencyHash)});}};
 async function release(){await page.goto('about:blank');await expect(page.locator('body')).toBeEmpty();await expect(page.locator('iframe')).toHaveCount(0);}
 return {phases,loginReady:async()=>await page.locator('html').getAttribute('data-cms-auth-state')==='AUTHORIZED'&&await page.locator('#session-role').textContent()==='OWNER',cleanup:release,verifyLogout:async()=>{await closeService();await page.locator('#cms-sidebar-logout').click();await expect(page.locator('#private-content')).toBeEmpty();},rememberResult:()=>null,issues:[],dispose(){disposed=true;page.off('response',onResponse);},summary:()=>({successfulCommits:commits.size,admittedImmutableIntents:admitted.size,maximumCommits:16,maximumDocumentWrites:32,resumedCompletedStages:[...resume?.completedStages??[]]})};
}
