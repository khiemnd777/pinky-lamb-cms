import {mountFileThumbnail} from './file-thumbnail.mjs';
import {mountSharedLocalizationWorkspace} from './shared-localization-workspace.mjs';
import {mountSiteSettings,mountSiteClients} from './site-settings-editor.mjs';
import {mountSiteWork} from './site-work-editor.mjs';
import {mountSiteServices} from './site-services-editor.mjs';
import {mountSiteAbout,mountSiteIp} from './site-about-ip-editor.mjs';
import {mountSiteContact,mountSiteFooter} from './site-contact-footer-editor.mjs';
import {createContentLocaleSession} from './content-locale-session.mjs';
import {createFullSiteLocalizationPreview} from './full-site-localization-preview.mjs';
import {mountLocalizationReviewEditor} from './localization-review-editor.mjs';
import {mountGroupLocalizationEditor} from './group-localization-editor.mjs';
import {mountLocalizationSettings} from './localization-settings-editor.mjs';
import groupLocalizationStylesheet from './group-localization-editor.css?url&no-inline';
import {mountLocalizedCollection} from './work-services-localization-editor.mjs';
import {z} from 'zod';
import {mountProjectLocalizationEditor} from './project-localization-editor.mjs';
import projectLocalizationStylesheet from './project-localization-editor.css?url&no-inline';
import heroLocalizationStylesheet from './hero-localization-editor.css?url&no-inline';
import {createCmsIcon} from './cms-icons.mjs';
import {siteDirtyGroups} from './site-group-dirty.mjs';
import {createImagePreview} from './media-image-preview.mjs';
import {canonicalMediaV2Json} from '../contracts/media-v3-contract-v2.mjs';
import {contentDigestProjectionV2} from '../contracts/media-v3-records-v2.mjs';
import {createMediaV3ContentSchemas,parseMediaV3Content,projectClaimGroupsV3} from '../contracts/media-v3-content.mjs';
import {createMediaV2RecordSchemas} from '../contracts/media-v3-records-v2.mjs';
import {sourceCheckRequestSchema,sourceCheckReceiptSchema} from '../contracts/source-checks.mjs';
import {sourceCheckV3Schema} from '../contracts/media-v3-attestations.mjs';
import {revisionSchema,resourceIdSchema,hashSchema} from '../contracts/hero.mjs';
import {siteNode,siteButton,mountSiteFields} from './site-fields.mjs';
import {mountServiceLocalizationEditor} from './service-localization-editor.mjs';
import serviceLocalizationStylesheet from './service-localization-editor.css?url&no-inline';
import {openMediaSlotPicker} from './media-slot-picker.mjs';
import {createSiteMediaPreview,createSavedSiteManifestResolver,parseSiteMediaDraft,validateSiteMediaSnapshot} from './site-media-preview.mjs';
import {strictMediaV2JsonSchema} from '../contracts/media-v3-metadata-v2.mjs';
import {beginMediaPreviewBinary,registerMediaPreviewResourceOwner} from './media-file-preview.mjs';
import {createPinkySelect,disposePinkySelects,closePinkySelects} from './pinky-select.mjs';

const copy=value=>structuredClone(value),same=(a,b)=>canonicalMediaV2Json(a)===canonicalMediaV2Json(b);
const saveReceipt=z.strictObject({draftId:z.literal('home-v3'),contractRevision:z.literal(2),revision:revisionSchema,updatedAt:z.string().datetime().length(24),lastEventId:resourceIdSchema});
const importReceipt=z.strictObject({draftId:z.literal('home-v3'),contractRevision:z.literal(2),revision:z.literal(0),importId:resourceIdSchema,sourceDraftRevision:revisionSchema});
const summary=z.strictObject({id:resourceIdSchema,draftId:z.literal('home-v3'),schemaVersion:z.literal(3),templateVersion:z.literal('m3-site-media-v1'),contractRevision:z.literal(2),draftRevision:revisionSchema,contentHash:hashSchema,mediaManifestHash:hashSchema,submittedBy:resourceIdSchema,submittedAt:z.string().datetime().length(24)});
const reviewReceipt=z.strictObject({snapshotId:resourceIdSchema,contentHash:hashSchema,reviewId:resourceIdSchema,status:z.enum(['APPROVED','CHANGES_REQUESTED']),revision:z.literal(1),sourceRevision:revisionSchema,attestationSetHash:hashSchema});
const sourcesPage=z.strictObject({snapshotId:resourceIdSchema,contentHash:hashSchema,view:z.enum(['ACTIVE','APPROVED']),sourceRevision:revisionSchema,checks:z.array(sourceCheckV3Schema).max(50),nextCursor:z.string().min(1).max(2048).nullable()});
const definite=e=>e.status>=400&&e.status<500&&Boolean(e.code)&&e.code!=='IDEMPOTENCY_IN_PROGRESS';
/** Keep local schema paths for UI reveal; the transport error allowlist remains unchanged. */
function validateWorkingContentForReveal(content,context){
 const result=createMediaV3ContentSchemas(context).contentSchema.safeParse(content);if(result.success)return;
 const error=new Error('Nội dung chưa hợp lệ. Hãy kiểm tra các trường và liên kết trước khi lưu.');error.code='SITE_PLAN_INVALID';
 error.siteValidationPaths=result.error.issues.slice(0,32).map(issue=>{
  const value=issue.path.reduce((parent,key)=>parent?.[key],content),path=issue.path.join('.');
  const imagePath=/^(hero\.image|seo\.ogImage|settings\.(brand\.logo|showreel\.poster|contact\.illustration|clientLogos\.\d+\.image)|projects\.\d+\.(cover|gallery\.\d+)|sections\.\d+\.(image|signature\.image))$/.test(path);
  return imagePath&&value&&typeof value.alt==='string'&&typeof value.isDecorative==='boolean'&&(value.isDecorative?value.alt!=='':!value.alt.trim())?path+'.alt':path;
 }).filter(path=>path.length>0&&path.length<=240);
 throw error;
}
/** Match the server's single-record CAS operations; hidden records remain intact. */
function apply(current,patch){
 const next=copy(current);
 for(const [name,list] of [['projectChanges',next.projects],['serviceChanges',next.services],['clientLogoChanges',next.settings.clientLogos]])for(const c of patch[name]??[]){
  const i=list.findIndex(v=>v.id===c.id);if(c.op==='ADD')list.push(copy(c.value));else if(c.op==='REPLACE')list[i]=copy(c.value);
 }
 for(const key of ['hero','seo','sectionOrder','claimSources'])if(patch[key]!==undefined)next[key]=copy(patch[key]);
 for(const [key,value] of Object.entries(patch.settings??{}))next.settings[key]=copy(value);
 for(const c of patch.sections??[])next.sections[next.sections.findIndex(s=>s.sectionId===c.sectionId)]=copy(c.value);
 if(patch.projectsOrder)next.projects=patch.projectsOrder.map(id=>next.projects.find(p=>p.id===id));
 if(patch.clientLogoOrder)next.settings.clientLogos=patch.clientLogoOrder.map(id=>next.settings.clientLogos.find(p=>p.id===id));
 return next;
}
function savePlan(saved,target,context){
 let current=parseMediaV3Content(saved,context);target=parseMediaV3Content(target,context);const plans=[];
 if([['projects',saved.projects,target.projects],['services',saved.services,target.services],['logos',saved.settings.clientLogos,target.settings.clientLogos]].some(([,old,list])=>old.some(v=>!list.some(n=>n.id===v.id))))throw Error('Hãy ẩn mục thay vì xóa mục đã lưu.');
 while(!same(current,target)){
  if(plans.length>=96)throw Error('Các thay đổi phụ thuộc chưa có thứ tự lưu hợp lệ.');
  const candidates=[];
  for(const [key,old,list] of [['projectChanges',current.projects,target.projects],['serviceChanges',current.services,target.services],['clientLogoChanges',current.settings.clientLogos,target.settings.clientLogos]])for(const value of list){
   const previous=old.find(v=>v.id===value.id);if(previous&&same(previous,value))continue;
   const p={[key]:[{op:previous?'REPLACE':'ADD',...(previous?{id:value.id}:{}),value:copy(value)}]};
   if(!previous&&key==='serviceChanges'){const section=copy(current.sections.find(s=>s.sectionId==='services'));section.serviceOrder.push(value.id);p.sections=[{sectionId:'services',value:section}];}
   if(!previous&&key==='clientLogoChanges')p.clientLogoOrder=[...current.settings.clientLogos.map(v=>v.id),value.id];
   candidates.push(p);
  }
  const scalars={};
  for(const key of ['hero','seo','sectionOrder','claimSources'])if(!same(current[key],target[key]))scalars[key]=copy(target[key]);
  const settings={};for(const key of ['header','brand','credential','showreel','contact','nav','copyright'])if(!same(current.settings[key],target.settings[key]))settings[key]=copy(target.settings[key]);
  if(Object.keys(settings).length)scalars.settings=settings;
  if(!same(current.projects.map(v=>v.id),target.projects.map(v=>v.id)))scalars.projectsOrder=target.projects.map(v=>v.id);
  if(!same(current.settings.clientLogos.map(v=>v.id),target.settings.clientLogos.map(v=>v.id)))scalars.clientLogoOrder=target.settings.clientLogos.map(v=>v.id);
  if(Object.keys(scalars).length)candidates.push(scalars);
  for(const section of target.sections)if(!same(section,current.sections.find(s=>s.sectionId===section.sectionId)))candidates.push({...scalars,sections:[{sectionId:section.sectionId,value:copy(section)}]},{sections:[{sectionId:section.sectionId,value:copy(section)}]});
  for(const [key,value] of Object.entries(scalars))if(key==='settings')for(const [name,v] of Object.entries(value))candidates.push({settings:{[name]:v}});else candidates.push({[key]:value});
  let accepted;for(const patch of candidates)try{const next=parseMediaV3Content(apply(current,patch),context);if(!same(next,current)){accepted={patch,next};break;}}catch{/* Whole-content dependencies must remain valid at every CAS. */}
  if(!accepted)throw Error('Hãy lưu từng nhóm liên kết hợp lệ; không bỏ liên kết ẩn để vượt validation.');
  plans.push(accepted.patch);current=accepted.next;
 }
 return plans;
}

export function ensureHeroLocalizationStylesheet(document){
 if(document.getElementById('hero-localization-stylesheet'))return;
 const stylesheet=document.createElement('link');stylesheet.id='hero-localization-stylesheet';stylesheet.rel='stylesheet';stylesheet.href=heroLocalizationStylesheet;document.head.append(stylesheet);
}

export function mountSiteMediaEditor(root,{apiFetch,getSession,session,localeSession:providedLocaleSession}){
 ensureHeroLocalizationStylesheet(root.ownerDocument);
 const ownsLocaleSession=!providedLocaleSession,localeSession=providedLocaleSession??createContentLocaleSession({getSession});
 if(!root.ownerDocument.getElementById('group-localization-stylesheet')){const sheet=root.ownerDocument.createElement('link');sheet.id='group-localization-stylesheet';sheet.rel='stylesheet';sheet.href=groupLocalizationStylesheet;root.ownerDocument.head.append(sheet);}
 if(!root.ownerDocument.getElementById('service-localization-stylesheet')){const sheet=root.ownerDocument.createElement('link');sheet.id='service-localization-stylesheet';sheet.rel='stylesheet';sheet.href=serviceLocalizationStylesheet;root.ownerDocument.head.append(sheet);}
 if(!root.ownerDocument.getElementById('project-localization-stylesheet')){const sheet=root.ownerDocument.createElement('link');sheet.id='project-localization-stylesheet';sheet.rel='stylesheet';sheet.href=projectLocalizationStylesheet;root.ownerDocument.head.append(sheet);}
 const owned=siteNode('section',undefined,{'aria-label':'Toàn website'}),status=siteNode('p','Đang tải Toàn website…',{id:'v3-status',role:'status','aria-live':'polite'}),body=siteNode('div'),actions=siteNode('div',undefined,{class:'editor-actions'}),workflow=siteNode('section',undefined,{id:'v3-workflow',class:'cms-review-layout','data-cms-pane':'review','aria-label':'Xuất bản nội dung'}),previewRoot=siteNode('section',undefined,{class:'site-media-preview cms-preview-panel','aria-label':'Xem trước website media đã lưu'});
 const editCard=siteNode('section',undefined,{class:'cms-editor-card','data-cms-pane':'edit'}),cardHead=siteNode('div',undefined,{class:'cms-card-head'}),headingCopy=siteNode('div');headingCopy.append(siteNode('h2','Biên tập nội dung'),siteNode('p','Thay đổi được lưu vào bản nháp.',{class:'cms-card-subtitle'}));cardHead.append(headingCopy,siteNode('span','BẢN NHÁP',{class:'cms-badge'}));editCard.append(cardHead,body,actions);
 const submitCard=siteNode('article',undefined,{class:'cms-review-card'}),decisionCard=siteNode('article',undefined,{class:'cms-review-card'}),savedSummary=siteNode('p','Đang tải bản nháp đã lưu…',{class:'cms-saved-note'});
 submitCard.append(siteNode('p','01 / GỬI BẢN ĐÃ LƯU',{class:'cms-step-label'}),siteNode('h2','Gửi website để duyệt'),savedSummary,siteNode('p','Snapshot giữ đúng bản đã lưu tại thời điểm gửi.',{class:'cms-hint'}));workflow.append(submitCard,decisionCard);
 owned.append(status,editCard,workflow);root.append(owned);
 (root.ownerDocument.getElementById('cms-preview-host')??owned).append(previewRoot);
 const fullPreviewRoot=siteNode('section');previewRoot.append(fullPreviewRoot);const fullPreview=createFullSiteLocalizationPreview(fullPreviewRoot,{apiFetch,getSession});
 const preview=createSiteMediaPreview(previewRoot,{apiFetch,getSession}),manifestResolver=createSavedSiteManifestResolver({apiFetch,getSession}),selected=new Map(),member=JSON.stringify([session.uid,session.role,session.authzVersion]);
 let saved,working,context,fields,controllers=[],pending=false,disposed=false,serial=0,controller,intent=null,snapshotRead=null,snapshotContext=null,pickerCleanup,missing=false,errorText='',qaDownload=null,selectedGroup,errorTarget=null,errorPath=null;
 function clearQaDownload(){
  if(!qaDownload)return;qaDownload.anchor.removeAttribute('href');qaDownload.anchor.remove();
  try{URL.revokeObjectURL(qaDownload.url);}catch{return;}
  qaDownload.release();qaDownload.unregister();qaDownload=null;
 }
 const active=()=>!disposed&&JSON.stringify([getSession()?.uid,getSession()?.role,getSession()?.authzVersion])===member;
 function guard(n){if(!active()||n!==serial||controller?.signal.aborted)throw new DOMException('Phiên đã thay đổi.','AbortError');}
 const dirty=()=>Boolean(saved&&working&&!same(saved.content,working));
 const staged=()=>controllers.some(c=>c.hasPendingInput?.());
 function canLeave(){if(localizationReview?.canLeave()===false)return false;if(localizationReview?.hasPendingInput()&&!window.confirm('Có ghi chú hoặc thao tác duyệt chưa hoàn tất. Rời trang?'))return false;if(controllers.some(c=>c.canLeave&&!c.canLeave()))return false;return !(dirty()||staged()||intent)||window.confirm('Có thay đổi chưa lưu hoặc thao tác chưa được xác nhận. Rời trang?');}
 const editable=()=>active()&&['EDITOR','OWNER'].includes(getSession().role);
 const unregisterLocaleWorkspace=localeSession.register({requestTransition:()=>!pending&&!intent,sync:()=>true});
 function emitDirtyGroups(groups){window.dispatchEvent(new CustomEvent('cms:site-dirty',{detail:{groups}}));}
 function update(){emitDirtyGroups(active()?siteDirtyGroups(saved?.content,working):[]);savedSummary.textContent=saved?'Toàn website · phiên bản '+saved.revision+' · Bản nháp đã lưu':'Chưa có bản nháp đã lưu.';if(qaDownload&&qaDownload.serial!==serial)clearQaDownload();fields?.setDisabled(!editable()||pending||Boolean(intent));save.disabled=!editable()||pending||staged()||Boolean(intent)||!dirty();reload.disabled=pending||Boolean(intent);importButton.hidden=!missing||!active()||getSession().role!=='OWNER';importButton.disabled=pending||Boolean(intent);snapshotButton.disabled=pending||Boolean(intent)||!saved||dirty()||staged();retry.disabled=!active()||pending||!intent;savedPreviewButton.disabled=!active()||pending||!saved;status.textContent=errorText||(intent?'Kết quả thao tác chưa xác nhận. Dùng cùng thao tác để thử lại.':saved?'Toàn website — phiên bản '+saved.revision+(dirty()?' — chưa lưu':' — đã lưu'):missing?session.role==='OWNER'?'Chưa có Home v3. Chọn “Nhập Home v2 hiện tại” để tạo bản nháp từ bản Home v2 đã lưu.':'Chưa có Home v3. Cần OWNER nhập bản Home v2 đã lưu để khởi tạo.':status.textContent);if(!pending&&errorPath){const path=errorPath;errorPath=null;const target=fields?.revealValidationPath(path);if(target instanceof Element){target.setAttribute('aria-invalid','true');fields?.revealTarget(target);}errorPath=null;}if(!pending && errorTarget){fields?.revealTarget(errorTarget);errorTarget=null;}}
 function fail(error){errorText=error.name==='AbortError'?'Phiên đã thay đổi.':error.status===409?'Xung đột phiên bản. Giữ thay đổi và tải bản mới để đối chiếu.':error.message||'Thao tác chưa được xác nhận.';status.textContent=errorText;
  const paths=[...(error.siteValidationPaths??[]),...(error.issues??[]).map(issue=>issue.path?.join('.')),...Object.keys(error.fieldErrors??{})].filter(path=>typeof path==='string'&&path.length<=240).slice(0,32);
  for(const path of paths){const normalized=path.replace(/^patch\./,'');errorPath=normalized;const target=[...body.querySelectorAll('[data-validation-path]')].find(control=>control.dataset.validationPath===normalized || control.dataset.validationPath.startsWith(normalized+'.'));if(!target&&fields?.revealValidationPath(normalized))break;if(target){fields?.revealValidationPath(normalized);target.setAttribute('aria-invalid','true');errorTarget=target;fields?.revealTarget(target,{focus:false});break;}}
 }
 async function mutate(path,value,schema){
  if(intent&&(intent.path!==path||!same(intent.body,value)))throw Error('Phải xác nhận thao tác trước khi gửi nội dung khác.');
  intent??={path,body:copy(value),key:crypto.randomUUID(),receipt:null};update();
  try{const receipt=schema.parse(await apiFetch(path,{method:path==='/api/cms/drafts/home-v3'?'PATCH':'POST',headers:{'Content-Type':'application/json','Idempotency-Key':intent.key},body:JSON.stringify(intent.body),signal:controller.signal}));guard(serial);intent.receipt=receipt;return receipt;}
  catch(e){if(definite(e))intent=null;throw e;}
 }
 function asset(entry){
  if(entry.source==='LEGACY')return copy(entry.asset);
  const a=entry.asset;return {id:a.assetId??a.id,label:a.name??a.assetId??a.id,kind:a.kind,status:a.status,isArchived:a.archived??a.isArchived,width:a.width,height:a.height,...(a.kind==='PDF'?{pageCount:a.pageCount??a.derivatives?.filter(d=>d.role==='PDF_PAGE').length}:{}),...(a.kind==='VIDEO'?{durationSeconds:a.durationSeconds??a.derivatives?.find(d=>d.role==='VIDEO')?.durationSeconds}:{})};
 }
 function mount(){
  selectedGroup=fields?.getSelectedGroup()??selectedGroup;closePinkySelects(document);fields?.destroy();controllers=[];const catalog=saved.catalog.map(asset),uiContext={...context,siteUx:true,catalog,sourceIds:context.sourceCatalog.map(s=>s.id),importLineage:saved.importLineage,resolveMediaAsset:id=>selected.get(id)??catalog.find(a=>a.id===id)};
  uiContext.mountMediaThumbnail=(host,id,{label,fit='cover'}={})=>{
   let viewer=null,disposedThumb=false;const selectedAsset=uiContext.resolveMediaAsset(id),kind=selectedAsset?.kind;host.replaceChildren(createCmsIcon(kind==='PDF'?'FileText':kind==='VIDEO'?'Clapperboard':'Image'),siteNode('span',label??selectedAsset?.label??id));if(kind!=='IMAGE')return ()=>host.replaceChildren();
   const actualSaved=saved;
   const begin=async()=>{if(disposedThumb||viewer||!active()||!id)return;const entry=actualSaved.catalog.find(value=>(value.source==='LEGACY'?value.asset.id:value.asset.assetId)===id);
    try{if(entry?.source==='FILE_RESOURCE'){viewer=mountFileThumbnail(host,entry.asset,{getSession,label});return;}if(entry?.source==='LEGACY'){const receipt=await manifestResolver.get(actualSaved);if(disposedThumb||!active()||saved!==actualSaved)return;const fullEntry=receipt.mediaManifest.find(value=>value.source==='LEGACY'&&value.asset.id===id);if(!fullEntry||fullEntry.asset.kind!=='IMAGE')throw Error('Legacy thumbnail not in verified saved manifest');host.replaceChildren();viewer=createSiteMediaPreview(host,{apiFetch,getSession,thumbnail:true});await viewer.showThumbnail(fullEntry,label);}else{host.replaceChildren();viewer=createImagePreview(host,{apiFetch,getSession,thumbnail:true,fit});await viewer.show(id);}}
    catch{if(!disposedThumb&&active())host.replaceChildren(createCmsIcon('Image'),siteNode('span',label??selectedAsset?.label??id));}
   };
   const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();begin();}},{rootMargin:'100px'}):null;
   if(observer)observer.observe(host);else begin();
   return ()=>{disposedThumb=true;observer?.disconnect();viewer?.destroy();host.replaceChildren();};
  };
  uiContext.createMediaThumbnail=uiContext.mountMediaThumbnail;uiContext.onPendingChange=()=>update();
  uiContext.fileSources={apiFetch,getSession};
  uiContext.openMediaPicker=options=>{closePinkySelects(document);pickerCleanup?.();pickerCleanup=openMediaSlotPicker({...options,apiFetch,getSession,catalog:saved.catalog,mountThumbnail(host,entry){if(entry.asset.kind!=='IMAGE')return;if(entry.source==='LEGACY')return uiContext.mountMediaThumbnail(host,entry.asset.id,{label:entry.asset.label});const viewer=createImagePreview(host,{apiFetch,getSession});void viewer.show(entry.asset.id);return ()=>viewer.destroy();},requiredPages:options.kind==='PDF'?working.projects.filter(p=>p.publicCredentialPage!==undefined).map(p=>({projectId:p.id,label:p.title,pageNumber:p.publicCredentialPage})):[],onSelect:entry=>{if(!active())return;const chosen=asset(entry);selected.set(chosen.id,chosen);options.onSelect(chosen);}});return pickerCleanup;};
  const changed=()=>{errorTarget=null;errorPath=null;for(const control of body.querySelectorAll('[aria-invalid]'))control.removeAttribute('aria-invalid');preview.clear();clearQaDownload();for(const component of controllers)component.refreshReferences?.();update();};
  uiContext.validateProjectAddition=(content,project,{claimSources=[],featured=false}={})=>{try{const candidate=copy(content);candidate.projects.push(copy(project));for(const binding of claimSources)if(binding.sourceIds.length)candidate.claimSources.push({claimPath:`projects/${project.id}/facts`,sourceIds:copy(binding.sourceIds)});if(featured)candidate.sections.find(section=>section.sectionId==='work').featuredIds.push(project.id);const valid=parseMediaV3Content(candidate,context);return {success:true,data:valid.projects.find(p=>p.id===project.id)};}catch{return {success:false};}};
  uiContext.validateServiceAddition=(content,service,{claimSources=[]}={})=>{try{const candidate=copy(content);candidate.services.push(copy(service));candidate.sections.find(section=>section.sectionId==='services').serviceOrder.push(service.id);for(const binding of claimSources)if(binding.sourceIds.length)candidate.claimSources.push({claimPath:`services/${service.id}/facts`,sourceIds:copy(binding.sourceIds)});const valid=parseMediaV3Content(candidate,context);return {success:true,data:valid.services.find(value=>value.id===service.id)};}catch{return {success:false};}};
  const sharedMounts={settings:(host,opts)=>mountSiteSettings(host,{...opts,includeContact:false}),clients:mountSiteClients,work:mountSiteWork,services:mountSiteServices,about:mountSiteAbout,ip:mountSiteIp,contact:mountSiteContact,footer:mountSiteFooter};
  const wrap=(key,label,sectionIds,mountComponent,extra={})=>({key,label,sectionIds,mount:(host,opts)=>{const c=mountSharedLocalizationWorkspace(host,{...opts,...extra,localeSession},{key,mountShared:sharedMounts[key],mountLocalized:mountComponent});controllers.push(c);return c;}});
  fields=mountSiteFields(body,{content:working,context:uiContext,initialGroup:selectedGroup,requestTransition:target=>{const guarded=controllers.filter(c=>c.requestTransition);return guarded.reduce((result,c)=>Promise.resolve(result).then(ok=>ok===true?c.requestTransition(target):false),Promise.resolve(true));},onChange:changed,components:[
   wrap('settings','Đầu trang, Hero và SEO',[],(host,opts)=>mountLocalizationSettings(host,{...opts,apiFetch,getSession,mountMediaThumbnail:uiContext.mountMediaThumbnail,onContext:detail=>window.dispatchEvent(new CustomEvent('cms:group-localization-context',{detail}))})),wrap('clients','Khách hàng',['clients'],(host,opts)=>mountGroupLocalizationEditor(host,{...opts,groupId:'clients',apiFetch,getSession,mountMediaThumbnail:uiContext.mountMediaThumbnail,onContext:detail=>window.dispatchEvent(new CustomEvent('cms:group-localization-context',{detail}))})),wrap('work','Dự án',['work'],(host,opts)=>mountLocalizedCollection(host,{kind:'project',mountCollection:mountProjectLocalizationEditor,...opts,apiFetch,getSession,mountMediaThumbnail:uiContext.mountMediaThumbnail,onContext:detail=>window.dispatchEvent(new CustomEvent('cms:project-context',{detail}))})),wrap('services','Dịch vụ',['services'],(host,opts)=>mountLocalizedCollection(host,{kind:'service',mountCollection:mountServiceLocalizationEditor,...opts,apiFetch,getSession,onContext:detail=>window.dispatchEvent(new CustomEvent('cms:service-context',{detail}))})),wrap('about','Giới thiệu',['about'],(host,opts)=>mountGroupLocalizationEditor(host,{...opts,groupId:'about',apiFetch,getSession,onContext:detail=>window.dispatchEvent(new CustomEvent('cms:group-localization-context',{detail}))})),wrap('ip','IP Studio',['ip-studio'],(host,opts)=>mountGroupLocalizationEditor(host,{...opts,groupId:'ip-studio',apiFetch,getSession,onContext:detail=>window.dispatchEvent(new CustomEvent('cms:group-localization-context',{detail}))})),wrap('contact','Liên hệ',['contact'],(host,opts)=>mountGroupLocalizationEditor(host,{...opts,groupId:'contact',apiFetch,getSession,onContext:detail=>window.dispatchEvent(new CustomEvent('cms:group-localization-context',{detail}))})),wrap('footer','Chân trang',['footer'],(host,opts)=>mountGroupLocalizationEditor(host,{...opts,groupId:'footer',apiFetch,getSession,onContext:detail=>window.dispatchEvent(new CustomEvent('cms:group-localization-context',{detail}))}))]});
  update();
 }
 async function readSaved(n){const parsed=parseSiteMediaDraft(await apiFetch('/api/cms/drafts/home-v3',{signal:controller.signal}));guard(n);return parsed;}
 async function load(){
  if(pending||intent)return;errorText='';manifestResolver.clear();preview.clear();fullPreview.clear();pickerCleanup?.();pending=true;const n=++serial;controller?.abort();controller=new AbortController();update();
  try{const parsed=await readSaved(n);saved=parsed.draft;context=parsed.context;working=copy(saved.content);missing=false;selected.clear();mount();}
  catch(e){if(active()&&n===serial){missing=e.status===404&&e.code==='DRAFT_NOT_INITIALIZED';if(missing){fields?.destroy();fields=null;controllers=[];body.replaceChildren();saved=null;working=null;errorTarget=null;}else fail(e);}}
  finally{if(n===serial){pending=false;update();}}
 }
 async function saveWorking(){
  if(!editable()||pending||staged()||!saved)return;pending=true;errorText='';const n=++serial;controller=new AbortController();preview.clear();update();
  try{
   if(intent&&intent.path!=='/api/cms/drafts/home-v3')throw Error('Xác nhận thao tác khác trước khi lưu.');
   const target=copy(working);
   const catalogEntry=saved.catalog.find(e=>(e.asset.id??e.asset.assetId)===target.settings.credential.assetId),chosen=selected.get(target.settings.credential.assetId)??(catalogEntry?asset(catalogEntry):null);
   if(chosen?.pageCount&&target.projects.some(p=>p.publicCredentialPage>chosen.pageCount))throw Error('Có trang dự án vượt PDF đã chọn. Sửa liên kết; không tự xóa.');
   if(!intent)validateWorkingContentForReveal(target,context);
   const plan=intent?[intent.body.patch]:savePlan(saved.content,target,context);
   for(const patch of plan){
    const expected=intent?intent.body.expectedRevision:saved.revision,receipt=await mutate('/api/cms/drafts/home-v3',{expectedRevision:expected,patch},saveReceipt);guard(n);
    if(receipt.revision!==expected+1)throw Error('Receipt phiên bản không khớp.');
    const parsed=await readSaved(n);if(parsed.draft.revision!==receipt.revision||parsed.draft.lastEventId!==receipt.lastEventId)throw Error('Bản đã lưu không khớp receipt.');
    saved=parsed.draft;context=parsed.context;intent=null;
   }
   if(same(saved.content,target))working=copy(saved.content);else working=target;
   mount();
  }catch(e){if(active())fail(e);}
  finally{pending=false;update();}
 }
 async function importCurrent(){
  if(pending||!active()||!missing||getSession().role!=='OWNER')return;pending=true;errorText='';const n=++serial;controller=new AbortController();update();
  try{
   let value;if(intent){if(intent.path!=='/api/cms/drafts/home-v3/import')throw Error('Xác nhận thao tác đang giữ.');value=intent.body;}
   else{const m2=await apiFetch('/api/cms/drafts/home-v2',{signal:controller.signal});guard(n);value={expectedM2Revision:revisionSchema.parse(m2.revision)};if(!window.confirm('Nhập bản Home v2 hiện tại, phiên bản '+value.expectedM2Revision+'?'))return;}
   const receipt=await mutate('/api/cms/drafts/home-v3/import',value,importReceipt);guard(n);const parsed=await readSaved(n);
   if(parsed.draft.importLineage.importId!==receipt.importId)throw Error('Import receipt không khớp.');
   intent=null;saved=parsed.draft;context=parsed.context;working=copy(saved.content);missing=false;mount();
  }catch(e){if(active())fail(e);}finally{pending=false;update();}
 }
 const snapshotInput=siteNode('input',undefined,{id:'v3-snapshot-id','aria-label':'Mã snapshot'});snapshotInput.maxLength=100;
 async function showSavedPreview(){
  if(pending||!saved||!active())return;pending=true;errorText='';const n=++serial;controller=new AbortController();update();
  try{
   preview.clear();previewRoot.hidden=false;for(const old of previewRoot.querySelectorAll(':scope>.site-media-preview-content'))old.hidden=true;await fullPreview.show(localeSession.get());guard(n);
  }catch(e){if(active())fail(e);}finally{pending=false;update();}
 }
 async function openSnapshot(id){
  clearQaDownload();
  resourceIdSchema.parse(id);const n=serial,raw=await apiFetch('/api/cms/media-site/snapshots/'+encodeURIComponent(id),{signal:controller.signal});guard(n);
  const parsed=await validateSiteMediaSnapshot(raw,()=>guard(n));guard(n);if(parsed.response.snapshot.id!==id)throw Error('Snapshot identity mismatch');
  snapshotRead=parsed.response;snapshotContext=parsed.context;snapshotInput.value=id;document.dispatchEvent(new CustomEvent('cms:show-work',{detail:{pane:'review'}}));renderReview(parsed.response);const s=parsed.response.snapshot;await preview.showSnapshot({response:parsed.response,expectedSnapshotId:id,expectedContentHash:s.contentHash,expectedMediaManifestHash:s.mediaManifestHash});guard(n);
 }
 async function snapshot(){
  if(pending||!saved||dirty()||staged()||!editable())return;pending=true;const n=++serial;controller=new AbortController();update();
  try{const receipt=await mutate('/api/cms/media-site/snapshots',{draftId:'home-v3',draftRevision:saved.revision},summary);guard(n);if(receipt.draftRevision!==saved.revision)throw Error('Saved revision mismatch');await openSnapshot(receipt.id);guard(n);intent=null;}
  catch(e){if(active())fail(e);}finally{pending=false;update();}
 }
 function renderReview(read){
  disposePinkySelects(decisionCard);decisionCard.replaceChildren(siteNode('p','02 / XEM & QUYẾT ĐỊNH',{class:'cms-step-label'}),siteNode('h2','Duyệt bản website'),snapshotField,openSnapshotButton);
  const s=read.snapshot,state=read.reviewState;
  decisionCard.append(siteNode('h3','Snapshot '+s.id),siteNode('p','Bản đã lưu '+s.draftRevision+' — '+state.status+' — nguồn '+state.sourceRevision));
  const note=siteNode('textarea',undefined,{id:'v3-review-note','aria-label':'Ghi chú review'});note.maxLength=2000;
  const declaration=createPinkySelect(document,{id:'v3-creative-declaration',label:'Khai báo nội dung sáng tạo',value:'',options:[['','Chọn khai báo'],['NO_FACTUAL_CLAIMS','Không có factual claims'],['SOURCE_CHECKED','Đã đối chiếu nguồn']].map(([value,label])=>({value,label}))});
  labeledField(decisionCard,note,'Ghi chú review');labeledField(decisionCard,declaration,'Khai báo nội dung sáng tạo');
  const permitted=()=>active()&&['OWNER','REVIEWER'].includes(getSession().role)&&getSession().uid!==s.submittedBy&&state.status==='IN_REVIEW';
  async function operation(path,value,schema){
   if(pending||!permitted())return;pending=true;const n=++serial;controller=new AbortController();update();
   try{const receipt=await mutate(path,value,schema);guard(n);if(receipt.snapshotId!==s.id||receipt.contentHash!==s.contentHash)throw Error('Snapshot receipt mismatch');await openSnapshot(s.id);guard(n);intent=null;}
   catch(e){if(active())fail(e);}finally{pending=false;update();}
  }
  for(const outcome of ['APPROVED','CHANGES_REQUESTED']){
   const b=siteButton(outcome==='APPROVED'?'Chấp thuận snapshot':'Yêu cầu sửa','v3-review-'+outcome,()=>{const value={snapshotId:s.id,contentHash:s.contentHash,expectedReviewRevision:0,expectedSourceRevision:state.sourceRevision,outcome,...(note.value.trim()?{note:note.value}:{}),...(declaration.value?{creativeCopyDeclaration:declaration.value}:{})};if(outcome==='APPROVED'&&!declaration.value||outcome==='CHANGES_REQUESTED'&&!note.value.trim()){status.textContent='Chọn khai báo hoặc ghi chú cần thiết.';return;}void operation('/api/cms/media-site/reviews',value,reviewReceipt);});b.disabled=!permitted();decisionCard.append(b);
  }
  const claims=projectClaimGroupsV3(s.content).filter(g=>g.claimPath!=='creative-copy');
  const claim=createPinkySelect(document,{id:'v3-factual-claim',label:'Factual claim',value:claims[0]?.claimPath??'',options:claims.map(group=>({value:group.claimPath,label:group.claimPath}))}),source=createPinkySelect(document,{id:'v3-check-source',label:'Nguồn đối chiếu',value:read.sourceCatalog[0]?.id??'',options:read.sourceCatalog.map(entry=>({value:entry.id,label:entry.title}))}),pages=siteNode('input',undefined,{'aria-label':'Trang nguồn, ngăn bằng dấu phẩy'});pages.maxLength=160;
  const check=siteButton('Ghi nhận đối chiếu nguồn','v3-source-submit',()=>{try{const evidence={sourceId:source.value,...(pages.value.trim()?{pages:pages.value.split(',').map(v=>Number(v.trim()))}:{})},value=sourceCheckRequestSchema.parse({snapshotId:s.id,contentHash:s.contentHash,expectedReviewRevision:0,expectedSourceRevision:state.sourceRevision,checks:[{claimPath:claim.value,evidence:[evidence]}]});void operation('/api/cms/media-site/source-checks',value,sourceCheckReceiptSchema);}catch{status.textContent='Nguồn và trang đối chiếu chưa hợp lệ.';}});check.disabled=!permitted();const sources=siteNode('details',undefined,{class:'cms-accordion'});sources.append(siteNode('summary','Đối chiếu nguồn'));const sourceBody=siteNode('div',undefined,{class:'cms-accordion-body'});sources.append(sourceBody);decisionCard.append(sources);labeledField(sourceBody,claim,'Factual claim');labeledField(sourceBody,source,'Nguồn đối chiếu');labeledField(sourceBody,pages,'Trang nguồn, ngăn bằng dấu phẩy');sourceBody.append(check);
  const evidence=siteNode('div',undefined,{'aria-label':'Đối chiếu nguồn đã lưu'});
  const readChecks=siteButton('Đọc đối chiếu nguồn','v3-source-read',()=>void readSourceChecks(s,evidence));
  sourceBody.append(readChecks,evidence);
  const qa=siteButton('Đọc QA snapshot','v3-qa-read',()=>void readQa(s,evidence));qa.disabled=state.status!=='APPROVED';sourceBody.append(qa);
 }
 async function readSourceChecks(s,target){
  if(pending)return;pending=true;const n=++serial;controller=new AbortController();update();
  try{let cursor=null,rows=[],sourceRevision,view,pageCount=0;const seen=new Set();do{
   if(++pageCount>4)throw Error('Source pagination limit');
   const page=sourcesPage.parse(await apiFetch('/api/cms/media-site/snapshots/'+encodeURIComponent(s.id)+'/source-checks'+(cursor?'?cursor='+encodeURIComponent(cursor):''),{signal:controller.signal}));guard(n);
   if(page.snapshotId!==s.id||page.contentHash!==s.contentHash||sourceRevision!==undefined&&(sourceRevision!==page.sourceRevision||view!==page.view)||page.checks.some(r=>r.snapshotId!==s.id||r.contentHash!==s.contentHash||rows.some(v=>v.id===r.id)))throw Error('Source page fence mismatch');
   rows.push(...page.checks);if(rows.length>61||page.nextCursor&&(!page.checks.length||seen.has(page.nextCursor)))throw Error('Source pagination limit');sourceRevision=page.sourceRevision;view=page.view;cursor=page.nextCursor;if(cursor)seen.add(cursor);
  }while(cursor);
  target.replaceChildren(...rows.map(r=>siteNode('p',r.claimPath+' — '+r.verification+' — nguồn '+r.sourceRevision)));
  }catch(e){if(active())fail(e);}finally{pending=false;update();}
 }
 async function readQa(s,target){
  if(pending)return;clearQaDownload();if(qaDownload){fail(Error('Không thể giải phóng QA bundle cũ.'));return;}pending=true;const n=++serial;controller=new AbortController();update();
  try{const raw=await apiFetch('/api/cms/media-site/snapshots/'+encodeURIComponent(s.id)+'/qa',{signal:controller.signal});guard(n);
   const qaContext=snapshotContext;
   strictMediaV2JsonSchema.parse(raw);
   const contextKeys=['contentContext','expectedImport','selectedAssetIds','orderedManifest','expectedSourceRefs','expectedMediaVersions','sourceAttestations'];
   const envelope=z.strictObject({qaEnvelopeVersion:z.literal(3),contractRevision:z.literal(2),qa:createMediaV2RecordSchemas(qaContext).qaSchema,validationContext:z.strictObject(Object.fromEntries(contextKeys.map(key=>[key,z.unknown()])))}).parse(raw);
   if(envelope.qa.snapshot.id!==s.id||envelope.qa.snapshot.contentHash!==s.contentHash||envelope.qa.snapshot.mediaManifestHash!==s.mediaManifestHash||envelope.qa.reviewState.status!=='APPROVED'||envelope.qa.review.outcome!=='APPROVED'||envelope.qa.review.contentHash!==s.contentHash)throw Error('QA fence mismatch');
   const digest=async value=>{const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonicalMediaV2Json(value)));guard(n);return Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('');};
   const manifestHash=await digest(envelope.qa.snapshot.mediaManifest),contentHash=await digest(contentDigestProjectionV2(envelope.qa.snapshot.content,manifestHash));guard(n);
   if(manifestHash!==s.mediaManifestHash||contentHash!==s.contentHash)throw Error('QA hash mismatch');
   const encoded=new TextEncoder().encode(JSON.stringify(raw));if(encoded.byteLength>2097152)throw Error('QA bundle vượt 2MiB.');guard(n);
   const reservation=beginMediaPreviewBinary(encoded.byteLength,clearQaDownload);let retained=false;
   try{
    const blob=new Blob([encoded],{type:'application/json'});guard(n);
    const anchor=siteNode('a','Tải QA bundle'),url=URL.createObjectURL(blob);
    qaDownload={url,anchor,serial:n,release:reservation.release,unregister:registerMediaPreviewResourceOwner(clearQaDownload)};retained=true;
    anchor.href=url;anchor.download='qa-'+s.id+'.json';anchor.addEventListener('click',event=>{try{guard(n);if(snapshotRead?.snapshot.id!==s.id)throw Error('Snapshot changed');}catch{event.preventDefault();clearQaDownload();}});
   target.replaceChildren(siteNode('p','QA — '+envelope.qa.reviewState.status+' — '+envelope.qa.sourceChecks.length+' đối chiếu nguồn. Đây không phải quyền publish.'));
    target.append(anchor);
   }finally{if(!retained)reservation.release();reservation.settle();}
  }catch(e){clearQaDownload();if(active())fail(e);}finally{pending=false;update();}
 }
 const save=siteButton('Lưu website','v3-save',()=>void saveWorking()),reload=siteButton('Tải lại bản đã lưu','v3-reload',()=>{if(canLeave())void load();}),importButton=siteButton('Nhập Home v2 hiện tại','v3-import',()=>void importCurrent()),snapshotButton=siteButton('Tạo snapshot bản đã lưu','v3-snapshot',()=>void snapshot());
 const openSnapshotButton=siteButton('Mở snapshot','v3-snapshot-open',()=>{if(pending)return;pending=true;++serial;controller=new AbortController();update();void openSnapshot(snapshotInput.value).catch(e=>{if(active())fail(e);}).finally(()=>{pending=false;update();});});
 const retry=siteButton('Xác nhận lại thao tác đang giữ','v3-retry',()=>void retryIntent());
 async function retryIntent(){
  if(pending||!intent||!active())return;pending=true;errorText='';const n=++serial;controller=new AbortController();update();
  try{
   const held=intent,path=held.path,schema=path==='/api/cms/drafts/home-v3'?saveReceipt:path.endsWith('/import')?importReceipt:path.endsWith('/snapshots')?summary:path.endsWith('/reviews')?reviewReceipt:sourceCheckReceiptSchema;
   const receipt=await mutate(path,held.body,schema);guard(n);
   if(path==='/api/cms/drafts/home-v3'||path.endsWith('/import')){
    const parsed=await readSaved(n);
    if(path.endsWith('/import')?parsed.draft.importLineage.importId!==receipt.importId:parsed.draft.revision!==receipt.revision||parsed.draft.lastEventId!==receipt.lastEventId)throw Error('Bản đọc không khớp receipt.');
    saved=parsed.draft;context=parsed.context;if(path.endsWith('/import'))working=copy(saved.content);missing=false;intent=null;mount();
   }else{if(!path.endsWith('/snapshots')&&(receipt.snapshotId!==held.body.snapshotId||receipt.contentHash!==held.body.contentHash))throw Error('Receipt identity mismatch');await openSnapshot(path.endsWith('/snapshots')?receipt.id:held.body.snapshotId);guard(n);intent=null;}
  }catch(e){if(active())fail(e);}finally{pending=false;update();}
 }
 const savedPreviewButton=siteButton('Xem bản đã lưu','v3-saved-preview',()=>void showSavedPreview());
 const snapshotField=siteNode('div',undefined,{class:'editor-field'});snapshotField.append(siteNode('label','Mã snapshot',{for:'v3-snapshot-id'}),snapshotInput);
 actions.append(save,reload,importButton,retry,savedPreviewButton);submitCard.append(snapshotButton);decisionCard.append(siteNode('p','02 / XEM & QUYẾT ĐỊNH',{class:'cms-step-label'}),siteNode('h2','Duyệt bản website'),snapshotField,openSnapshotButton);
 function labeledField(parent,control,label){const wrapper=siteNode('div',undefined,{class:'editor-field'}),caption=siteNode('label',label);if(control.id)caption.htmlFor=control.id;wrapper.append(caption,control);parent.append(wrapper);}

 function sessionChanged(){if(active())return;if(ownsLocaleSession)localeSession.destroy();fullPreview.clear();emitDirtyGroups([]);manifestResolver.clear();closePinkySelects(document);serial++;controller?.abort();pickerCleanup?.();preview.clear();clearQaDownload();fields?.setDisabled(true);if(!active()){fields?.destroy();fields=null;disposePinkySelects(body);disposePinkySelects(workflow);body.replaceChildren();workflow.replaceChildren();status.textContent='Phiên đã thay đổi. Mở lại Toàn website.';}}
 function beforeUnload(event){if(dirty()||staged()||intent){event.preventDefault();event.returnValue='';}}
 const localizationReview=mountLocalizationReviewEditor(workflow,{apiFetch,getSession,getContent:()=>saved?.content});
 document.addEventListener('cms:session',sessionChanged);window.addEventListener('beforeunload',beforeUnload);void load();
 return Object.freeze({canLeave,destroy(){if(disposed)return;disposed=true;emitDirtyGroups([]);serial++;controller?.abort();pickerCleanup?.();disposePinkySelects(workflow);localizationReview.destroy();fullPreview.destroy();unregisterLocaleWorkspace();if(ownsLocaleSession)localeSession.destroy();fields?.destroy();manifestResolver.destroy();preview.destroy();previewRoot.remove();clearQaDownload();document.removeEventListener('cms:session',sessionChanged);window.removeEventListener('beforeunload',beforeUnload);owned.remove();}});
}

