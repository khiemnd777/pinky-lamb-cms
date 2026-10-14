import {z} from 'zod';
import {canonicalMediaV2Json,v2MediaManifestSchema} from '../contracts/media-v3-contract-v2.mjs';
import {contentDigestProjectionV2} from '../contracts/media-v3-records-v2.mjs';
import {parseMediaV3Content,projectClaimGroupsV3} from '../contracts/media-v3-content.mjs';
import {createMediaV2RecordSchemas} from '../contracts/media-v3-records-v2.mjs';
import {sourceCheckRequestSchema,sourceCheckReceiptSchema} from '../contracts/source-checks.mjs';
import {sourceCheckV3Schema} from '../contracts/media-v3-attestations.mjs';
import {revisionSchema,resourceIdSchema,hashSchema} from '../contracts/hero.mjs';
import {siteNode,siteButton,mountSiteFields} from './site-fields.mjs';
import {mountSiteSettings,mountSiteClients} from './site-settings-editor.mjs';
import {mountSiteWork} from './site-work-editor.mjs';
import {mountSiteServices} from './site-services-editor.mjs';
import {mountSiteAbout,mountSiteIp} from './site-about-ip-editor.mjs';
import {mountSiteContact,mountSiteFooter} from './site-contact-footer-editor.mjs';
import {openMediaSlotPicker} from './media-slot-picker.mjs';
import {createSiteMediaPreview,parseSiteMediaDraft,validateSiteMediaSnapshot} from './site-media-preview.mjs';
import {strictMediaV2JsonSchema} from '../contracts/media-v3-metadata-v2.mjs';
import {beginMediaPreviewBinary,registerMediaPreviewResourceOwner} from './media-file-preview.mjs';

const copy=value=>structuredClone(value),same=(a,b)=>canonicalMediaV2Json(a)===canonicalMediaV2Json(b);
const saveReceipt=z.strictObject({draftId:z.literal('home-v3'),contractRevision:z.literal(2),revision:revisionSchema,updatedAt:z.string().datetime().length(24),lastEventId:resourceIdSchema});
const importReceipt=z.strictObject({draftId:z.literal('home-v3'),contractRevision:z.literal(2),revision:z.literal(0),importId:resourceIdSchema,sourceDraftRevision:revisionSchema});
const summary=z.strictObject({id:resourceIdSchema,draftId:z.literal('home-v3'),schemaVersion:z.literal(3),templateVersion:z.literal('m3-site-media-v1'),contractRevision:z.literal(2),draftRevision:revisionSchema,contentHash:hashSchema,mediaManifestHash:hashSchema,submittedBy:resourceIdSchema,submittedAt:z.string().datetime().length(24)});
const savedPreviewSchema=z.strictObject({contractRevision:z.literal(2),draftId:z.literal('home-v3'),draftRevision:revisionSchema,contentHash:hashSchema,mediaManifestHash:hashSchema,mediaManifest:v2MediaManifestSchema});
const reviewReceipt=z.strictObject({snapshotId:resourceIdSchema,contentHash:hashSchema,reviewId:resourceIdSchema,status:z.enum(['APPROVED','CHANGES_REQUESTED']),revision:z.literal(1),sourceRevision:revisionSchema,attestationSetHash:hashSchema});
const sourcesPage=z.strictObject({snapshotId:resourceIdSchema,contentHash:hashSchema,view:z.enum(['ACTIVE','APPROVED']),sourceRevision:revisionSchema,checks:z.array(sourceCheckV3Schema).max(50),nextCursor:z.string().min(1).max(2048).nullable()});
const definite=e=>e.status>=400&&e.status<500&&Boolean(e.code)&&e.code!=='IDEMPOTENCY_IN_PROGRESS';
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

export function mountSiteMediaEditor(root,{apiFetch,getSession,session}){
 const owned=siteNode('section',undefined,{'aria-label':'Website Home v3'}),status=siteNode('p','Đang tải Home v3…',{role:'status'}),body=siteNode('div'),actions=siteNode('div',undefined,{class:'editor-actions'}),workflow=siteNode('section'),previewRoot=siteNode('section');
 owned.append(siteNode('h2','Website Home v3'),status,actions,body,workflow,previewRoot);root.append(owned);
 const preview=createSiteMediaPreview(previewRoot,{apiFetch,getSession}),selected=new Map(),member=JSON.stringify([session.uid,session.role,session.authzVersion]);
 let saved,working,context,fields,controllers=[],pending=false,disposed=false,serial=0,controller,intent=null,snapshotRead=null,snapshotContext=null,pickerCleanup,missing=false,errorText='',qaDownload=null;
 function clearQaDownload(){
  if(!qaDownload)return;qaDownload.anchor.removeAttribute('href');qaDownload.anchor.remove();
  try{URL.revokeObjectURL(qaDownload.url);}catch{return;}
  qaDownload.release();qaDownload.unregister();qaDownload=null;
 }
 const active=()=>!disposed&&JSON.stringify([getSession()?.uid,getSession()?.role,getSession()?.authzVersion])===member;
 function guard(n){if(!active()||n!==serial||controller?.signal.aborted)throw new DOMException('Phiên đã thay đổi.','AbortError');}
 const dirty=()=>Boolean(saved&&working&&!same(saved.content,working));
 const staged=()=>controllers.some(c=>c.hasPendingInput?.());
 function canLeave(){return !(dirty()||staged()||intent)||window.confirm('Có thay đổi chưa lưu hoặc thao tác chưa được xác nhận. Rời trang?');}
 const editable=()=>active()&&['EDITOR','OWNER'].includes(getSession().role);
 function update(){if(qaDownload&&qaDownload.serial!==serial)clearQaDownload();fields?.setDisabled(!editable()||pending||Boolean(intent));save.disabled=!editable()||pending||staged()||Boolean(intent)||!dirty();reload.disabled=pending||Boolean(intent);importButton.hidden=!missing||session.role!=='OWNER';importButton.disabled=pending||Boolean(intent);snapshotButton.disabled=pending||Boolean(intent)||!saved||dirty()||staged();retry.disabled=!active()||pending||!intent;savedPreviewButton.disabled=!active()||pending||!saved;status.textContent=errorText||(intent?'Kết quả thao tác chưa xác nhận. Dùng cùng thao tác để thử lại.':saved?'Home v3 — phiên bản '+saved.revision+(dirty()?' — chưa lưu':' — đã lưu'):missing?'Chưa có Home v3. Chỉ nhập từ Home v2 khi bạn chọn.':status.textContent);}
 function fail(error){errorText=error.name==='AbortError'?'Phiên đã thay đổi.':error.status===409?'Xung đột phiên bản. Giữ thay đổi và tải bản mới để đối chiếu.':error.message||'Thao tác chưa được xác nhận.';status.textContent=errorText;}
 async function mutate(path,value,schema){
  if(intent&&(intent.path!==path||!same(intent.body,value)))throw Error('Phải xác nhận thao tác trước khi gửi nội dung khác.');
  intent??={path,body:copy(value),key:crypto.randomUUID(),receipt:null};update();
  try{const receipt=schema.parse(await apiFetch(path,{method:path==='/api/cms/drafts/home-v3'?'PATCH':'POST',headers:{'Content-Type':'application/json','Idempotency-Key':intent.key},body:JSON.stringify(intent.body),signal:controller.signal}));guard(serial);intent.receipt=receipt;return receipt;}
  catch(e){if(definite(e))intent=null;throw e;}
 }
 function asset(entry){
  if(entry.source==='LEGACY')return copy(entry.asset);
  const a=entry.asset;return {id:a.assetId??a.id,kind:a.kind,status:a.status,isArchived:a.archived??a.isArchived,width:a.width,height:a.height,...(a.kind==='PDF'?{pageCount:a.pageCount??a.derivatives?.filter(d=>d.role==='PDF_PAGE').length}:{}),...(a.kind==='VIDEO'?{durationSeconds:a.durationSeconds??a.derivatives?.find(d=>d.role==='VIDEO')?.durationSeconds}:{})};
 }
 function mount(){
  fields?.destroy();controllers=[];const catalog=saved.catalog.map(asset),uiContext={...context,catalog,sourceIds:context.sourceCatalog.map(s=>s.id),importLineage:saved.importLineage,resolveMediaAsset:id=>selected.get(id)??catalog.find(a=>a.id===id)};
  uiContext.openMediaPicker=options=>{pickerCleanup?.();pickerCleanup=openMediaSlotPicker({...options,apiFetch,getSession,catalog:saved.catalog,requiredPages:options.kind==='PDF'?working.projects.filter(p=>p.publicCredentialPage!==undefined).map(p=>({projectId:p.id,label:p.title,pageNumber:p.publicCredentialPage})):[],onSelect:entry=>{if(!active())return;const chosen=asset(entry);selected.set(chosen.id,chosen);options.onSelect(chosen);}});return pickerCleanup;};
  const changed=()=>{preview.clear();clearQaDownload();update();};
  uiContext.validateProjectAddition=(content,project)=>{try{const candidate=copy(content);candidate.projects.push(copy(project));const valid=parseMediaV3Content(candidate,context);return {success:true,data:valid.projects.find(p=>p.id===project.id)};}catch{return {success:false};}};
  const wrap=(key,label,sectionIds,mountComponent,extra={})=>({key,label,sectionIds,mount:(host,opts)=>{const c=mountComponent(host,{...opts,...extra});controllers.push(c);return c;}});
  fields=mountSiteFields(body,{content:working,context:uiContext,onChange:changed,components:[
   wrap('settings','Nhận diện và Hero',[],mountSiteSettings,{includeContact:false}),wrap('clients','Khách hàng',['clients'],mountSiteClients),wrap('work','Dự án',['work'],mountSiteWork),wrap('services','Dịch vụ',['services'],mountSiteServices),wrap('about','Giới thiệu',['about'],mountSiteAbout),wrap('ip','IP Studio',['ip-studio'],mountSiteIp),wrap('contact','Liên hệ',['contact'],mountSiteContact),wrap('footer','Chân trang',['footer'],mountSiteFooter)]});
  update();
 }
 async function readSaved(n){const parsed=parseSiteMediaDraft(await apiFetch('/api/cms/drafts/home-v3',{signal:controller.signal}));guard(n);return parsed;}
 async function load(){
  if(pending||intent)return;errorText='';preview.clear();pickerCleanup?.();pending=true;const n=++serial;controller?.abort();controller=new AbortController();update();
  try{const parsed=await readSaved(n);saved=parsed.draft;context=parsed.context;working=copy(saved.content);missing=false;selected.clear();mount();}
  catch(e){if(active()&&n===serial){missing=e.status===404;if(missing){fields?.destroy();fields=null;saved=null;working=null;}fail(e);}}
  finally{if(n===serial){pending=false;update();}}
 }
 async function saveWorking(){
  if(!editable()||pending||staged()||!saved)return;pending=true;errorText='';const n=++serial;controller=new AbortController();preview.clear();update();
  try{
   if(intent&&intent.path!=='/api/cms/drafts/home-v3')throw Error('Xác nhận thao tác khác trước khi lưu.');
   const target=copy(working);
   const catalogEntry=saved.catalog.find(e=>(e.asset.id??e.asset.assetId)===target.settings.credential.assetId),chosen=selected.get(target.settings.credential.assetId)??(catalogEntry?asset(catalogEntry):null);
   if(chosen?.pageCount&&target.projects.some(p=>p.publicCredentialPage>chosen.pageCount))throw Error('Có trang dự án vượt PDF đã chọn. Sửa liên kết; không tự xóa.');
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
  if(pending||!active()||session.role!=='OWNER')return;pending=true;const n=++serial;controller=new AbortController();update();
  try{
   let value;if(intent){if(intent.path!=='/api/cms/drafts/home-v3/import')throw Error('Xác nhận thao tác đang giữ.');value=intent.body;}
   else{const m2=await apiFetch('/api/cms/drafts/home-v2',{signal:controller.signal});guard(n);value={expectedM2Revision:revisionSchema.parse(m2.revision)};if(!window.confirm('Nhập bản Home v2 hiện tại, phiên bản '+value.expectedM2Revision+'?'))return;}
   const receipt=await mutate('/api/cms/drafts/home-v3/import',value,importReceipt);guard(n);const parsed=await readSaved(n);
   if(parsed.draft.importLineage.importId!==receipt.importId)throw Error('Import receipt không khớp.');
   intent=null;saved=parsed.draft;context=parsed.context;working=copy(saved.content);missing=false;mount();
  }catch(e){if(active())fail(e);}finally{pending=false;update();}
 }
 const snapshotInput=siteNode('input',undefined,{'aria-label':'Mã snapshot'});snapshotInput.maxLength=100;
 async function showSavedPreview(){
  if(pending||!saved||!active())return;pending=true;errorText='';const n=++serial;controller=new AbortController();const actualSaved=copy(saved);update();
  try{
   const receipt=savedPreviewSchema.parse(await apiFetch('/api/cms/media-site/drafts/home-v3/preview?expectedRevision='+actualSaved.revision,{signal:controller.signal}));guard(n);
   if(receipt.draftRevision!==actualSaved.revision)throw Error('Saved preview revision mismatch');
   const hash=async value=>{const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonicalMediaV2Json(value)));guard(n);return Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('');};
   const manifestHash=await hash(receipt.mediaManifest),contentHash=await hash(contentDigestProjectionV2(actualSaved.content,manifestHash));guard(n);
   if(manifestHash!==receipt.mediaManifestHash||contentHash!==receipt.contentHash)throw Error('Saved preview hash mismatch');
   await preview.showSaved({savedDraft:actualSaved,mediaManifest:receipt.mediaManifest,expectedRevision:actualSaved.revision});guard(n);
  }catch(e){if(active())fail(e);}finally{pending=false;update();}
 }
 async function openSnapshot(id){
  clearQaDownload();
  resourceIdSchema.parse(id);const n=serial,raw=await apiFetch('/api/cms/media-site/snapshots/'+encodeURIComponent(id),{signal:controller.signal});guard(n);
  const parsed=await validateSiteMediaSnapshot(raw,()=>guard(n));guard(n);if(parsed.response.snapshot.id!==id)throw Error('Snapshot identity mismatch');
  snapshotRead=parsed.response;snapshotContext=parsed.context;snapshotInput.value=id;renderReview(parsed.response);const s=parsed.response.snapshot;await preview.showSnapshot({response:parsed.response,expectedSnapshotId:id,expectedContentHash:s.contentHash,expectedMediaManifestHash:s.mediaManifestHash});guard(n);
 }
 async function snapshot(){
  if(pending||!saved||dirty()||staged()||!editable())return;pending=true;const n=++serial;controller=new AbortController();update();
  try{const receipt=await mutate('/api/cms/media-site/snapshots',{draftId:'home-v3',draftRevision:saved.revision},summary);guard(n);if(receipt.draftRevision!==saved.revision)throw Error('Saved revision mismatch');await openSnapshot(receipt.id);guard(n);intent=null;}
  catch(e){if(active())fail(e);}finally{pending=false;update();}
 }
 function renderReview(read){
  workflow.replaceChildren(snapshotInput,openSnapshotButton);
  const s=read.snapshot,state=read.reviewState;
  workflow.append(siteNode('h3','Snapshot '+s.id),siteNode('p','Bản đã lưu '+s.draftRevision+' — '+state.status+' — nguồn '+state.sourceRevision));
  const note=siteNode('textarea',undefined,{'aria-label':'Ghi chú review'});note.maxLength=2000;
  const declaration=siteNode('select',undefined,{'aria-label':'Khai báo nội dung sáng tạo'});
  for(const [value,label] of [['','Chọn khai báo'],['NO_FACTUAL_CLAIMS','Không có factual claims'],['SOURCE_CHECKED','Đã đối chiếu nguồn']]){const o=siteNode('option',label,{value});declaration.append(o);}
  workflow.append(note,declaration);
  const permitted=()=>active()&&['OWNER','REVIEWER'].includes(getSession().role)&&getSession().uid!==s.submittedBy&&state.status==='IN_REVIEW';
  async function operation(path,value,schema){
   if(pending||!permitted())return;pending=true;const n=++serial;controller=new AbortController();update();
   try{const receipt=await mutate(path,value,schema);guard(n);if(receipt.snapshotId!==s.id||receipt.contentHash!==s.contentHash)throw Error('Snapshot receipt mismatch');await openSnapshot(s.id);guard(n);intent=null;}
   catch(e){if(active())fail(e);}finally{pending=false;update();}
  }
  for(const outcome of ['APPROVED','CHANGES_REQUESTED']){
   const b=siteButton(outcome==='APPROVED'?'Chấp thuận snapshot':'Yêu cầu sửa','v3-review-'+outcome,()=>{const value={snapshotId:s.id,contentHash:s.contentHash,expectedReviewRevision:0,expectedSourceRevision:state.sourceRevision,outcome,...(note.value.trim()?{note:note.value}:{}),...(declaration.value?{creativeCopyDeclaration:declaration.value}:{})};if(outcome==='APPROVED'&&!declaration.value||outcome==='CHANGES_REQUESTED'&&!note.value.trim()){status.textContent='Chọn khai báo hoặc ghi chú cần thiết.';return;}void operation('/api/cms/media-site/reviews',value,reviewReceipt);});b.disabled=!permitted();workflow.append(b);
  }
  const claim=siteNode('select',undefined,{'aria-label':'Factual claim'}),source=siteNode('select',undefined,{'aria-label':'Nguồn đối chiếu'}),pages=siteNode('input',undefined,{'aria-label':'Trang nguồn, ngăn bằng dấu phẩy'});pages.maxLength=160;
  for(const group of projectClaimGroupsV3(s.content).filter(g=>g.claimPath!=='creative-copy'))claim.append(siteNode('option',group.claimPath,{value:group.claimPath}));
  for(const entry of read.sourceCatalog)source.append(siteNode('option',entry.title,{value:entry.id}));
  const check=siteButton('Ghi nhận đối chiếu nguồn','v3-source-submit',()=>{try{const evidence={sourceId:source.value,...(pages.value.trim()?{pages:pages.value.split(',').map(v=>Number(v.trim()))}:{})},value=sourceCheckRequestSchema.parse({snapshotId:s.id,contentHash:s.contentHash,expectedReviewRevision:0,expectedSourceRevision:state.sourceRevision,checks:[{claimPath:claim.value,evidence:[evidence]}]});void operation('/api/cms/media-site/source-checks',value,sourceCheckReceiptSchema);}catch{status.textContent='Nguồn và trang đối chiếu chưa hợp lệ.';}});check.disabled=!permitted();workflow.append(claim,source,pages,check);
  const evidence=siteNode('div',undefined,{'aria-label':'Đối chiếu nguồn đã lưu'});
  const readChecks=siteButton('Đọc đối chiếu nguồn','v3-source-read',()=>void readSourceChecks(s,evidence));
  workflow.append(readChecks,evidence);
  const qa=siteButton('Đọc QA snapshot','v3-qa-read',()=>void readQa(s,evidence));qa.disabled=state.status!=='APPROVED';workflow.append(qa);
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
 const save=siteButton('Lưu thay đổi Home v3','v3-save',()=>void saveWorking()),reload=siteButton('Tải lại bản đã lưu','v3-reload',()=>{if(canLeave())void load();}),importButton=siteButton('Nhập Home v2 hiện tại','v3-import',()=>void importCurrent()),snapshotButton=siteButton('Tạo snapshot bản đã lưu','v3-snapshot',()=>void snapshot());
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
 actions.append(save,reload,importButton,snapshotButton,retry,savedPreviewButton);workflow.append(snapshotInput,openSnapshotButton);
 function sessionChanged(){serial++;controller?.abort();pickerCleanup?.();preview.clear();clearQaDownload();fields?.setDisabled(true);if(!active()){body.replaceChildren();workflow.replaceChildren();status.textContent='Phiên đã thay đổi. Mở lại Home v3.';}}
 function beforeUnload(event){if(dirty()||staged()||intent){event.preventDefault();event.returnValue='';}}
 document.addEventListener('cms:session',sessionChanged);window.addEventListener('beforeunload',beforeUnload);void load();
 return Object.freeze({canLeave,destroy(){if(disposed)return;disposed=true;serial++;controller?.abort();pickerCleanup?.();fields?.destroy();preview.destroy();clearQaDownload();document.removeEventListener('cms:session',sessionChanged);window.removeEventListener('beforeunload',beforeUnload);owned.remove();}});
}

