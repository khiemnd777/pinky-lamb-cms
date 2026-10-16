import {applySitePatch,validateSiteContent,FIXED_SITE_ASSET_IDS} from '../contracts/site.mjs';
import {parseSiteSaveRequest,createSiteDraftSchemas} from '../contracts/site-draft.mjs';
import {canonicalJson} from '../contracts/draft.mjs';
import {MAX_REVISION} from '../contracts/hero.mjs';
import {revisionSchema,resourceIdSchema,hashSchema,MAX_ENVELOPE_BYTES} from '../contracts/hero.mjs';
import {strictSiteObject} from '../contracts/site-settings.mjs';
import {z} from 'zod';
import {siteNode,siteButton,mountSiteFields} from './site-fields.mjs';
import {mountSiteSettings,mountSiteClients} from './site-settings-editor.mjs';
import {mountSiteWork} from './site-work-editor.mjs';
import {mountSiteServices} from './site-services-editor.mjs';
import {mountSiteAbout,mountSiteIp,APPROVED_SHOWREEL_SOURCE_URL} from './site-about-ip-editor.mjs';
import {mountSiteContact,mountSiteFooter} from './site-contact-footer-editor.mjs';
import {mountSiteReview} from './review.mjs';

export const APPROVED_BASELINE_MANIFEST_HASH='65fb8d571118ee0cbf8a2e26295219d763691c1af08c82d03d5b3909a7b8535b';
const same=(left,right)=>canonicalJson(left)===canonicalJson(right);
const copy=value=>structuredClone(value);
function invalidPlan(message,issues=[]){const error=new Error(message);error.code='SITE_PLAN_INVALID';error.siteValidationPaths=issues.slice(0,32).map(issue=>issue.path?.join('.')).filter(path=>typeof path==='string' && path.length<=240);throw error;}
export const BROWSER_METADATA_RESERVE_BYTES=98304;
const saveReceiptSchema=strictSiteObject({draftId:z.literal('home-v2'),revision:revisionSchema,updatedAt:z.string().datetime().length(24),lastEventId:resourceIdSchema});
const importReceiptSchema=strictSiteObject({draftId:z.literal('home-v2'),revision:z.literal(0),importId:resourceIdSchema,importedM1Revision:revisionSchema,importedM1ContentHash:hashSchema,baselineManifestHash:hashSchema,importReportHash:hashSchema});
function definiteRejection(error){return error.status>=400 && error.status<500 && Boolean(error.code) && error.code!=='IDEMPOTENCY_IN_PROGRESS';}
const utf8Bytes=value=>new TextEncoder().encode(JSON.stringify(value)).length;
/** Conservative preflight for this pinned M2 template/provider only. Backend
 * remains authoritative for the five actual envelopes and private media metadata. */
export function assertSiteEditorBudget(content,context){
 const reserve=BROWSER_METADATA_RESERVE_BYTES+utf8Bytes({catalog:context.catalog,sourceCatalog:context.sourceCatalog,importLineage:context.importLineage});
 if(utf8Bytes(content)+reserve>MAX_ENVELOPE_BYTES || utf8Bytes({contentJson:JSON.stringify(content)})+reserve>MAX_ENVELOPE_BYTES)invalidPlan('Tổng nội dung vượt ngân sách lưu trữ. Hãy giảm dung lượng nội dung trước khi lưu.');
}
export function siteContextFromDraft(draft){
 return Object.freeze({catalog:copy(draft.catalog),sourceCatalog:copy(draft.sourceCatalog),importLineage:copy(draft.importLineage),sourceIds:Object.freeze(draft.sourceCatalog.map(source=>source.id)),fixedAssetIds:FIXED_SITE_ASSET_IDS,currentYear:new Date().getUTCFullYear(),allowedShowreelSourceUrl:APPROVED_SHOWREEL_SOURCE_URL});
}
function scalarPatch(current,target){
 const patch={};
 for(const key of ['hero','seo','sectionOrder','claimSources'])if(!same(current[key],target[key]))patch[key]=copy(target[key]);
 const settings={};
 for(const key of ['header','brand','credential','showreel','contact','nav','copyright']){
  if(same(current.settings[key],target.settings[key]))continue;
  settings[key]=copy(target.settings[key]);
  if(key==='brand'){delete settings[key].name;}
  if(key==='showreel'){delete settings[key].durationSeconds;}
 }
 if(Object.keys(settings).length)patch.settings=settings;
 if(!same(current.projects.map(value=>value.id),target.projects.map(value=>value.id)))patch.projectsOrder=target.projects.map(value=>value.id);
 if(!same(current.settings.clientLogos.map(value=>value.id),target.settings.clientLogos.map(value=>value.id)))patch.clientLogoOrder=target.settings.clientLogos.map(value=>value.id);
 return patch;
}
function candidates(current,target){
 const result=[];
 for(const [field,key,list,next] of [['services','serviceChanges',current.services,target.services],['projects','projectChanges',current.projects,target.projects],['clientLogos','clientLogoChanges',current.settings.clientLogos,target.settings.clientLogos]]){
  for(const record of next){
   const existing=list.find(value=>value.id===record.id);if(existing && same(existing,record))continue;
   const patch={[key]:[{op:existing?'REPLACE':'ADD',...(existing?{id:record.id}:{}),value:copy(record)}]};
   if(!existing && field==='services'){
    const section=copy(current.sections.find(value=>value.sectionId==='services'));section.serviceOrder.push(record.id);
    patch.sections=[{sectionId:'services',value:section}];
   }
   if(!existing && field==='clientLogos')patch.clientLogoOrder=[...current.settings.clientLogos.map(value=>value.id),record.id];
   if(!existing && field==='projects' && target.sections.find(value=>value.sectionId==='work').featuredIds.includes(record.id)){
    const section=copy(current.sections.find(value=>value.sectionId==='work'));section.featuredIds.push(record.id);
    patch.sections=[{sectionId:'work',value:section}];
   }
   result.push(patch);
  }
 }
 const scalar=scalarPatch(current,target),sections=target.sections.filter(section=>!same(section,current.sections.find(value=>value.sectionId===section.sectionId)));
 if(Object.keys(scalar).length)result.push(scalar);
 for(const section of sections){
  const sectionPatch={sections:[{sectionId:section.sectionId,value:copy(section)}]};
  result.push({...scalar,...sectionPatch},sectionPatch);
 }
 // If the aggregate exceeds the raw-body cap, legal independent typed values
 // can still be saved individually. Dependencies stay subject to whole validation.
 for(const [key,value] of Object.entries(scalar)){
  if(key==='settings')for(const [name,setting] of Object.entries(value))result.push({settings:{[name]:setting}});
  else result.push({[key]:value});
 }
 return result;
}
/** Simulate the complete sequence before the caller sends any request. No hard deletes. */
export function planSiteSave(saved,working,context){
 let current,target;
 try{current=validateSiteContent(saved,context);target=validateSiteContent(working,context);}catch(error){invalidPlan('Nội dung chưa hợp lệ. Hãy kiểm tra các trường và liên kết trước khi lưu.',error.issues);}
 const plan=[];
 assertSiteEditorBudget(target,context);
 for(const [left,right] of [[current.services,target.services],[current.projects,target.projects],[current.settings.clientLogos,target.settings.clientLogos]])if(left.some(record=>!right.some(value=>value.id===record.id)))invalidPlan('Hãy ẩn mục thay vì xóa dữ liệu đã lưu.');
 while(!same(current,target)){
  if(plan.length>=96)invalidPlan('Không thể lập trình tự lưu hợp lệ. Hãy lưu từng nhóm thay đổi liên quan.');
  let accepted=null;
  for(const patch of candidates(current,target)){
   try{parseSiteSaveRequest({expectedRevision:MAX_REVISION,patch},context);const next=applySitePatch(current,patch,context);assertSiteEditorBudget(next,context);if(!same(next,current)){accepted={patch,next};break;}}catch{ /* A dependent typed change may become valid after another operation. */ }
  }
  if(!accepted)invalidPlan('Các thay đổi phụ thuộc chưa có trình tự lưu hợp lệ. Hãy kiểm tra dịch vụ, thứ tự, liên kết và mục hiển thị.');
  plan.push(copy(accepted.patch));current=accepted.next;
 }
 return plan;
}

/** One mounted resource owns all state. No autosave, persistence or v1 content event. */
export function mountSiteEditor(container,{apiFetch,session,readOnly=false}){
 let saved=null,working=null,context=null,pending=false,disposed=false,generation=0,fields=null,intent=null,importIntent=null,missing=false;
 let componentControllers=[],selectedGroup,errorTarget=null;
 const editable=!readOnly && ['EDITOR','OWNER'].includes(session.role);
 const root=siteNode('section',undefined,{id:'site-editor','aria-label':'Biên tập toàn website'});
 const revision=siteNode('p','',{id:'site-revision'}),dirtyLabel=siteNode('p','',{id:'site-dirty'}),status=siteNode('p','Đang tải bản website…',{id:'site-status',role:'status','aria-live':'polite'}),errors=siteNode('div',undefined,{id:'site-errors',role:'alert'}),body=siteNode('div',undefined,{id:'site-form'});
 const save=siteButton('Lưu website','site-save',()=>void saveWorking()),reload=siteButton('Tải lại website','site-reload',()=>{if(canLeave())void load();}),importButton=siteButton('Khởi tạo website từ bản bàn giao','site-import',()=>void importSite());
 const actions=siteNode('div',undefined,{class:'editor-actions'});actions.append(save,reload,importButton);
 const frame=siteNode('div',undefined,{class:'site-editor-frame cms-site-composition'}),information=siteNode('aside',undefined,{class:'site-information','aria-label':'Trạng thái bản website'});
 frame.classList.add('cms-editor-card');frame.dataset.cmsPane='edit';
 const cardHead=siteNode('div',undefined,{class:'cms-card-head'}),headingCopy=siteNode('div');headingCopy.append(siteNode('h2','Biên tập nội dung'),siteNode('p','Thay đổi được lưu vào bản nháp.',{class:'cms-card-subtitle'}));cardHead.append(headingCopy,siteNode('span','BẢN NHÁP',{class:'cms-badge'}));
 information.append(revision,dirtyLabel,status,errors);frame.append(cardHead,information,body,actions);
 root.append(frame);container.append(root);
 // Keep browsing/navigation available while blocking even dispatched field events.
 const blockRecoveryEdit=event=>{
  if(!readOnly || !event.target.closest?.('#site-fields'))return;
  const link=event.type==='click'?event.target.closest('a[href^="#"]'):null,fragment=link?.getAttribute('href');
  const target=fragment && /^#site-(?:header-fields|hero-fields|seo-fields|project-[A-Za-z0-9_-]+|service-[A-Za-z0-9_-]+)$/.test(fragment)?document.getElementById(fragment.slice(1)):null;
  if(target && body.contains(target) || event.type==='click' && event.target.closest?.('[data-site-group-target]'))return;
  event.preventDefault();event.stopImmediatePropagation();
 };
 for(const type of ['input','change','click'])body.addEventListener(type,blockRecoveryEdit,true);
 const workflow=mountSiteReview(root,{apiFetch,session,readOnly});
 const dirty=()=>{if(!saved || !working)return false;try{return !same(saved.content,working);}catch{return true;}};
 const pendingInput=()=>componentControllers.some(controller=>controller.hasPendingInput?.());
 const unsaved=()=>dirty() || pendingInput();
 function canLeave(){if(!workflow.canLeave())return false;if(intent || importIntent)return window.confirm('Kết quả thao tác chưa được xác nhận. Rời nội dung và bỏ các thay đổi đang giữ?');return !unsaved() || window.confirm('Bạn có thay đổi website chưa lưu. Bỏ thay đổi này?');}
 function beforeUnload(event){if(unsaved() || intent || importIntent || workflow.hasIntent()){event.preventDefault();event.returnValue='';}}
 window.addEventListener('beforeunload',beforeUnload);
 function update(){
  revision.textContent=saved?`Phiên bản website: ${saved.revision}`:'';dirtyLabel.textContent=pendingInput()?'Nội dung mới chưa được thêm.':dirty()?'Có thay đổi chưa lưu.':saved?'Đã lưu.':'';
  fields?.setDisabled(!editable || pending);save.disabled=!editable || pending || pendingInput() || (!dirty() && !intent);reload.disabled=pending || Boolean(intent || importIntent);
  importButton.hidden=!missing || session.role!=='OWNER';importButton.disabled=readOnly || pending;
  if(!pending && errorTarget){fields?.revealTarget(errorTarget);errorTarget=null;}
 }
 function emitSaved(){if(saved)document.dispatchEvent(new CustomEvent('cms:site-content',{detail:{draft:copy(saved),dirty:unsaved()}}));}
 function clearErrors(){
  errors.replaceChildren();errorTarget=null;
  for(const control of body.querySelectorAll('[aria-invalid]')){
   control.removeAttribute('aria-invalid');
   const hints=(control.getAttribute('aria-describedby')??'').split(/\s+/).filter(id=>id && !id.startsWith('site-field-error-'));
   if(hints.length)control.setAttribute('aria-describedby',hints.join(' '));else control.removeAttribute('aria-describedby');
  }
  for(const message of body.querySelectorAll('.field-error'))message.remove();
 }
 function showError(error){
  clearErrors();
  const message=error.status || error.code?error.message:'Không thể kết nối. Vui lòng thử lại để xác nhận kết quả.';errors.append(siteNode('p',message));
  const paths=[...(error.siteValidationPaths??[]),...Object.keys(error.fieldErrors??{})].slice(0,32);
  let sequence=0;
  for(const path of paths){
   if(typeof path!=='string' || path.length>240)continue;
   const normalized=path.replace(/^patch\./,'');
   // Only a path already owned by a rendered control can receive a field error.
   const controls=[...body.querySelectorAll('[data-validation-path]')].filter(control=>control.dataset.validationPath===normalized || control.dataset.validationPath.startsWith(normalized+'.'));
   if(controls.length){const link=siteButton('Vị trí cần kiểm tra: '+normalized,undefined,()=>fields?.revealTarget(controls[0]));link.className='cms-error-link';errors.append(link);errorTarget??=controls[0];}
   for(const control of controls){
    if(control.hasAttribute('aria-invalid'))continue;
    const id=`site-field-error-${sequence++}`,note=siteNode('p','Nội dung này chưa hợp lệ. Hãy kiểm tra giá trị và liên kết đã chọn.',{id,class:'field-error'});
    const hints=(control.getAttribute('aria-describedby')??'').split(/\s+/).filter(Boolean);
    control.setAttribute('aria-invalid','true');control.setAttribute('aria-describedby',[...hints,id].join(' '));control.after(note);
   }
  }
 }
 function render(){
  selectedGroup=fields?.getSelectedGroup()??selectedGroup;componentControllers=[];
  const mountComponent=mount=>(host,options)=>{const controller=mount(host,options);componentControllers.push(controller);return controller;};
  fields?.destroy();fields=null;body.replaceChildren();
  if(working)fields=mountSiteFields(body,{content:working,context,initialGroup:selectedGroup,onChange:()=>{clearErrors();if(pendingInput())status.textContent='Nội dung mới chưa được thêm. Thêm bản ghi hoặc bỏ phần nhập này trước khi lưu.';else if(status.textContent.startsWith('Nội dung mới chưa được thêm.'))status.textContent=dirty()?'Có thay đổi chưa lưu. Hãy lưu website sau khi kiểm tra.':'Chọn nội dung cần sửa, sau đó lưu website.';for(const controller of componentControllers)controller.refreshReferences?.();update();emitSaved();},components:[
   {key:'settings',label:'Đầu trang, Hero và SEO',sectionIds:[],mount:mountComponent((host,options)=>mountSiteSettings(host,{...options,includeContact:false}))},
   {key:'clients',label:'Khách hàng',sectionIds:['clients'],mount:mountComponent(mountSiteClients)},
   {key:'work',label:'Dự án',sectionIds:['work'],mount:mountComponent(mountSiteWork)},
   {key:'services',label:'Dịch vụ',sectionIds:['services'],mount:mountComponent(mountSiteServices)},
   {key:'about',label:'Giới thiệu',sectionIds:['about'],mount:mountComponent(mountSiteAbout)},
   {key:'ip-studio',label:'IP Studio',sectionIds:['ip-studio'],mount:mountComponent(mountSiteIp)},
   {key:'contact',label:'Liên hệ',sectionIds:['contact'],mount:mountComponent(mountSiteContact)},
   {key:'footer',label:'Chân trang',sectionIds:['footer'],mount:mountComponent(mountSiteFooter)}
  ]});
  update();
 }
 function parseDraft(value){const nextContext=siteContextFromDraft(value),draft=createSiteDraftSchemas(nextContext).draftReadSchema.parse(value);return {draft,context:nextContext};}
 async function load(){
  const current=++generation;pending=true;update();status.textContent='Đang tải bản website…';
  try{const value=await apiFetch('/api/cms/drafts/home-v2');if(disposed || current!==generation)return;const parsed=parseDraft(value);saved=parsed.draft;context=parsed.context;working=copy(saved.content);missing=false;intent=null;importIntent=null;errors.replaceChildren();render();emitSaved();status.textContent=editable?'Chọn nội dung cần sửa, sau đó lưu website.':'Bạn có quyền xem nội dung.';}
  catch(error){if(disposed || current!==generation)return;if(error.code==='NOT_FOUND'){missing=true;status.textContent=readOnly?'Website chưa được khởi tạo. Khôi phục chỉ cho phép xem.':session.role==='OWNER'?'Website chưa được khởi tạo. Bạn có thể import bản bàn giao cùng Hero và SEO hiện tại.':'Website chưa được khởi tạo. Hãy liên hệ người quản lý.';importButton.hidden=session.role!=='OWNER';}else if(error.name!=='AbortError')showError(error);}
  finally{if(!disposed && current===generation){pending=false;update();}}
 }
 async function importSite(){
  if(readOnly || pending || session.role!=='OWNER' || !missing || disposed)return;
  const current=++generation;pending=true;update();errors.replaceChildren();
  try{
   if(!importIntent){const m1=await apiFetch('/api/cms/drafts/home');if(disposed || current!==generation)return;importIntent={key:crypto.randomUUID(),body:{expectedM1Revision:m1.revision,baselineManifestHash:APPROVED_BASELINE_MANIFEST_HASH}};}
   status.textContent='Đang khởi tạo website…';
   const receipt=importReceiptSchema.parse(await apiFetch('/api/cms/drafts/home-v2/import',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':importIntent.key},body:JSON.stringify(importIntent.body)}));
   if(disposed || current!==generation)return;
   if(receipt.importedM1Revision!==importIntent.body.expectedM1Revision || receipt.baselineManifestHash!==importIntent.body.baselineManifestHash)throw new Error('Không thể xác nhận kết quả khởi tạo.');
   importIntent.acknowledged=true;
   importIntent.receipt=receipt;
   // Retain the acknowledged intent until the follow-up read succeeds.
   const parsed=parseDraft(await apiFetch('/api/cms/drafts/home-v2'));if(disposed || current!==generation)return;
   const lineage=Object.fromEntries(['importId','importedM1Revision','importedM1ContentHash','baselineManifestHash','importReportHash'].map(key=>[key,importIntent.receipt[key]]));
   if(!same(parsed.draft.importLineage,lineage))throw new Error('Không thể xác nhận nguồn của bản website.');
   saved=parsed.draft;context=parsed.context;working=copy(saved.content);missing=false;importIntent=null;render();emitSaved();status.textContent='Website đã được khởi tạo. Hero và SEO hiện tại được giữ nguyên.';
  }catch(error){if(!disposed && current===generation && error.name!=='AbortError'){if(definiteRejection(error) && !importIntent?.acknowledged)importIntent=null;showError(error);}}
  finally{if(!disposed && current===generation){pending=false;update();}}
 }
 async function sendIntent(current){
  if(readOnly)return false;
  const receipt=saveReceiptSchema.parse(await apiFetch('/api/cms/drafts/home-v2',{method:'PATCH',headers:{'Content-Type':'application/json','Idempotency-Key':intent.key},body:JSON.stringify(intent.body)}));
  if(disposed || current!==generation)return false;
  if(receipt.draftId!=='home-v2' || receipt.revision!==intent.body.expectedRevision+1 || !receipt.updatedAt || !receipt.lastEventId)throw new Error('Không thể xác nhận kết quả lưu.');
  saved={...saved,content:copy(intent.result),revision:receipt.revision,updatedAt:receipt.updatedAt,lastEventId:receipt.lastEventId,updatedBy:session.uid};intent=null;emitSaved();update();return true;
 }
 async function saveWorking(){
  if(pending || !editable || !saved || disposed || pendingInput())return;
  const current=++generation;pending=true;update();errors.replaceChildren();let committed=0;
  try{
   if(intent){status.textContent='Đang xác nhận lần lưu trước…';if(!await sendIntent(current))return;committed++;}
   const plan=planSiteSave(saved.content,working,context);
   for(const patch of plan){
    const body=parseSiteSaveRequest({expectedRevision:saved.revision,patch},context);intent={key:crypto.randomUUID(),body:copy(body),result:applySitePatch(saved.content,patch,context)};
    status.textContent=`Đang lưu website (${committed+1}/${plan.length})…`;if(!await sendIntent(current))return;committed++;
   }
   if(disposed || current!==generation)return;status.textContent=dirty()?'Một phần thay đổi đã lưu. Các thay đổi còn lại vẫn chưa lưu.':'Đã lưu website.';update();
  }catch(error){if(!disposed && current===generation && error.name!=='AbortError'){if(definiteRejection(error))intent=null;showError(error);status.textContent=committed?'Đã lưu một phần. Hãy kiểm tra lỗi; các thay đổi còn lại vẫn chưa lưu.':'Website chưa được xác nhận đã lưu.';}}
  finally{if(!disposed && current===generation){pending=false;update();}}
 }
 void load();
 return {canLeave,destroy(){disposed=true;generation++;workflow.destroy();fields?.destroy();componentControllers=[];saved=null;working=null;context=null;intent=null;importIntent=null;window.removeEventListener('beforeunload',beforeUnload);for(const type of ['input','change','click'])body.removeEventListener(type,blockRecoveryEdit,true);root.remove();document.dispatchEvent(new CustomEvent('cms:site-content',{detail:null}));}};
}
