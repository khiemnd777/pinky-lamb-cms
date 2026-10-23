import {mountFileThumbnail} from './file-thumbnail.mjs';
import './hero-localization-editor.css';
import './group-localization-editor.css';
import './project-localization-editor.css';
import './service-localization-editor.css';
import {contentGroupReadSchema,contentGroupReceiptSchema} from '../contracts/content-workspace.mjs';
import {siteNode,siteButton} from './site-fields.mjs';
import {createCmsIcon} from './cms-icons.mjs';
import {mountSharedLocalizationWorkspace} from './shared-localization-workspace.mjs';
import {sourceProjectSchema} from '../contracts/project-localization.mjs';
import {sourceServiceSchema} from '../contracts/service-localization.mjs';
import {disposePinkySelects,closePinkySelects} from './pinky-select.mjs';

const LABELS={settings:'Đầu trang, Hero và SEO',clients:'Khách hàng',work:'Dự án',services:'Dịch vụ',about:'Giới thiệu',ip:'IP Studio',contact:'Liên hệ',footer:'Chân trang',structure:'Cấu trúc website'};
const component=key=>'site-component-'+(key==='ip'?'ip-studio':key);
const copy=value=>structuredClone(value),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const sharedFactories={settings:async()=>{const m=await import('./site-settings-editor.mjs');return (host,options)=>m.mountSiteSettings(host,{...options,includeContact:false});},clients:async()=>(await import('./site-settings-editor.mjs')).mountSiteClients,work:async()=>(await import('./site-work-editor.mjs')).mountSiteWork,services:async()=>(await import('./site-services-editor.mjs')).mountSiteServices,about:async()=>(await import('./site-about-ip-editor.mjs')).mountSiteAbout,ip:async()=>(await import('./site-about-ip-editor.mjs')).mountSiteIp,contact:async()=>(await import('./site-contact-footer-editor.mjs')).mountSiteContact,footer:async()=>(await import('./site-contact-footer-editor.mjs')).mountSiteFooter};
async function localizedFactory(group){
 if(group==='settings')return (await import('./localization-settings-editor.mjs')).mountLocalizationSettings;
 if(group==='work'||group==='services'){
  const [{mountLocalizedCollection},entity]=await Promise.all([import('./work-services-localization-editor.mjs'),group==='work'?import('./project-localization-editor.mjs'):import('./service-localization-editor.mjs')]);
  return (host,options)=>mountLocalizedCollection(host,{...options,kind:group==='work'?'project':'service',mountCollection:group==='work'?entity.mountProjectLocalizationEditor:entity.mountServiceLocalizationEditor});
 }
 const {mountGroupLocalizationEditor}=await import('./group-localization-editor.mjs');return (host,options)=>mountGroupLocalizationEditor(host,{...options,groupId:group==='ip'?'ip-studio':group});
}
const topic=group=>group==='work'?'cms:project-context':group==='services'?'cms:service-context':'cms:group-localization-context';

/** One active source group. Saved/working/uncertain intents are independently
 * owned by each group; no whole-site model is created by this editor. */
export function mountContentWorkspaceEditor(root,{apiFetch,getSession,session,localeSession,bootstrap}){
 const doc=root.ownerDocument,view=doc.defaultView,identity=JSON.stringify([session.uid,session.role,session.authzVersion]),states=new Map();
 let disposed=false,serial=0,group='settings',mounted=null,picker=null,aborter=null,pending=false,review=null,preview=null;
 const owned=siteNode('section',undefined,{'aria-label':'Toàn website'}),edit=siteNode('section',undefined,{'data-cms-pane':'edit',class:'cms-editor-card'}),status=siteNode('p','',{id:'v3-status',role:'status','aria-live':'polite'}),body=siteNode('fieldset',undefined,{id:'site-fields'}),actions=siteNode('div',undefined,{class:'editor-actions'}),workflow=siteNode('section',undefined,{id:'v3-workflow','data-cms-pane':'review',class:'cms-review-layout'}),previewRoot=siteNode('section',undefined,{class:'site-media-preview cms-preview-panel'});
 workflow.hidden=true;previewRoot.hidden=true;edit.append(body,actions);owned.append(status,edit,workflow);root.append(owned);(doc.getElementById('cms-preview-host')??owned).append(previewRoot);
 const active=()=>!disposed&&JSON.stringify([getSession()?.uid,getSession()?.role,getSession()?.authzVersion])===identity;
 const state=()=>states.get(group),dirty=s=>Boolean(s&&!same(s.saved.content,s.working));
 const announce=text=>{status.textContent=text;};
 const save=siteButton('Lưu website','v3-save',()=>void saveCurrent()),reload=siteButton('Tải lại bản đã lưu','v3-reload',()=>void reloadCurrent()),retry=siteButton('Xác nhận lại thao tác đang giữ','v3-retry',()=>void saveCurrent());
 const savedPreview=siteButton('Xem bản đã lưu','v3-saved-preview',()=>void showPreview());actions.append(save,reload,retry,savedPreview);
 function update(){const s=state();body.inert=pending||Boolean(s?.intent);mounted?.setDisabled?.(pending);const shared=doc.getElementById(group+'-workspace-shared');if(shared)shared.inert=pending||Boolean(s?.intent)||!['OWNER','EDITOR'].includes(session.role);save.disabled=pending||!s||!dirty(s)||!['OWNER','EDITOR'].includes(session.role);reload.disabled=pending;retry.hidden=!s?.intent;retry.disabled=pending;savedPreview.disabled=pending;view.dispatchEvent(new CustomEvent('cms:site-dirty',{detail:{groups:[...states].filter(([,v])=>dirty(v)||v.intent).map(([k])=>k==='ip'?'ip-studio':k)}}));}
 function navigation(){const node=doc.createElement('nav');node.setAttribute('aria-label','Các mục website');node.className='site-section-navigation cms-section-nav';for(const [key,label]of Object.entries(LABELS)){if(key==='structure')continue;const b=siteButton(label,'site-go-'+(key==='ip'?'ip-studio':key),()=>void choose(key));b.prepend(createCmsIcon(({settings:'PanelTop',clients:'Users',work:'Clapperboard',services:'BriefcaseBusiness',about:'Info',ip:'Sparkles',contact:'Mail',footer:'PanelBottom'})[key]));b.dataset.siteGroupTarget=component(key);b.setAttribute('aria-controls',component(key));if(key===group)b.setAttribute('aria-current','true');b.setAttribute('aria-pressed',String(key===group));node.append(b);}view.dispatchEvent(new CustomEvent('cms:site-navigation',{detail:{node,groupId:group==='structure'?'site-structure-content':component(group),label:LABELS[group]}}));}
 async function guard(target){if(pending||state()?.intent)return false;if(mounted?.requestTransition&&!await mounted.requestTransition(target))return false;return active();}
 function canLeave(){return !pending&&[...states.values()].every(s=>!dirty(s)&&!s.intent)&&(mounted?.canLeave?.()??true);}
 async function choose(next){if(!Object.hasOwn(LABELS,next)||next===group)return;if(!await guard('group:'+next))return;mounted?.destroy();mounted=null;picker?.();picker=null;disposePinkySelects(body);body.replaceChildren();group=next;navigation();await loadGroup(next);}
 function receiveGroup(event){const id=event.detail?.id,key=id==='site-structure-content'?'structure':id?.replace('site-component-','');if(key)void choose(key==='ip-studio'?'ip':key);}
 async function loadGroup(key,{fresh=false}={}){
  const n=++serial;aborter?.abort();aborter=new AbortController();pending=true;update();announce('Đang tải '+LABELS[key]+'…');
  try{
   let s=states.get(key);
   if(!s||fresh){const raw=!fresh&&key==='settings'&&bootstrap?.group?bootstrap.group:await apiFetch('/api/cms/content/groups/'+key,{signal:aborter.signal});bootstrap=null;const read=contentGroupReadSchema.parse(raw);if(read.group!==key)throw Error('Nội dung trả về không đúng mục.');if(!active()||n!==serial)return;s={saved:read,working:copy(read.content),intent:null};states.set(key,s);}
   if(!active()||n!==serial)return;await mountGroup(s,key,n);if(!active()||n!==serial)return;announce('');
  }catch(e){if(active()&&n===serial&&e.name!=='AbortError')announce(e.message||'Không tải được nội dung.');}
  finally{if(n===serial){pending=false;update();}}
 }
 async function mountGroup(s,key,n){
  mounted?.destroy();mounted=null;picker?.();picker=null;disposePinkySelects(body);body.replaceChildren();const panel=siteNode('section',undefined,{id:key==='structure'?'site-structure-content':component(key),class:'editor-group cms-field-group','data-site-group':''});body.append(panel);closePinkySelects();navigation();
  if(key==='structure'){
   const {createSortableList}=await import('./site-collection-ui.mjs');
   if(!active()||n!==serial)return;
   panel.append(siteNode('h3','Cấu trúc website'),siteNode('p','Kéo các mục nội dung chính để đổi thứ tự. Các mục có khóa giữ nguyên vị trí.'));const fixed=labels=>{const host=siteNode('div',undefined,{class:'ux-structure-fixed'});for(const label of labels){const row=siteNode('div',undefined,{class:'ux-structure-fixed-row'});row.append(createCmsIcon('LockKeyhole'),siteNode('strong',label),siteNode('span','Cố định'));host.append(row);}panel.append(host);};fixed(['Đầu trang, Hero và SEO','Khách hàng']);
   const host=siteNode('div');panel.append(host);fixed(['Liên hệ','Chân trang']);const sorter=createSortableList({container:host,getIds:()=>[...s.working.sectionOrder],label:'Thứ tự nội dung chính',getLabel:id=>LABELS[id==='ip-studio'?'ip':id]??id,onReorder:ids=>{s.working.sectionOrder.splice(0,s.working.sectionOrder.length,...ids);update();}});
   mounted={destroy:()=>sorter.destroy(),canLeave:()=>true};return;
  }
  const [mountShared,mountLocalized]=await Promise.all([sharedFactories[key](),localizedFactory(key)]);if(!active()||n!==serial)return;
  const catalog=s.saved.catalog.map(entry=>entry.source==='LEGACY'?copy(entry.asset):{id:entry.asset.assetId,label:entry.asset.assetId,kind:entry.asset.kind,status:'READY',isArchived:entry.asset.archived,width:entry.asset.width,height:entry.asset.height,pageCount:entry.asset.pageCount,durationSeconds:entry.asset.durationSeconds});
  const context={...s.saved.context,siteUx:true,catalog,sourceIds:s.saved.context.sourceCatalog.map(v=>v.id),resolveMediaAsset:id=>catalog.find(v=>v.id===id)};
  context.mountMediaThumbnail=(host,id,{label,fit='cover'}={})=>{let viewer=null,dead=false;host.replaceChildren(createCmsIcon('Image'),siteNode('span',label??id));const start=async()=>{const entry=s.saved.catalog.find(e=>(e.asset.id??e.asset.assetId)===id);if(entry?.source==='FILE_RESOURCE'){if(dead||!active())return;viewer=mountFileThumbnail(host,entry.asset,{getSession,label});return;}if(entry?.source!=='MEDIA_VERSION')return;const {createImagePreview}=await import('./media-image-preview.mjs');if(dead||!active())return;host.replaceChildren();viewer=createImagePreview(host,{apiFetch,getSession,thumbnail:true,fit});await viewer.show(id);};const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();void start();}}):null;if(observer)observer.observe(host);else void start();return ()=>{dead=true;observer?.disconnect();viewer?.destroy();};};
  context.createMediaThumbnail=context.mountMediaThumbnail;
  context.fileSources={apiFetch,getSession};
  context.openMediaPicker=options=>{let stopped=false;void import('./media-slot-picker.mjs').then(({openMediaSlotPicker})=>{if(stopped||!active())return;picker=openMediaSlotPicker({...options,apiFetch,getSession,catalog:s.saved.catalog,requiredPages:options.kind==='PDF'?(s.working.projects??[]).filter(p=>p.publicCredentialPage!==undefined).map(p=>({projectId:p.id,label:p.title,pageNumber:p.publicCredentialPage})):[],onSelect:entry=>{const a=entry.asset,value=entry.source==='LEGACY'?copy(a):{id:a.assetId??a.id,kind:a.kind,status:'READY',label:a.name??a.assetId??a.id,width:a.width,height:a.height,pageCount:a.pageCount??a.derivatives?.filter(d=>d.role==='PDF_PAGE').length,durationSeconds:a.durationSeconds};const i=catalog.findIndex(v=>v.id===value.id);if(i<0)catalog.push(value);else catalog[i]=value;options.onSelect(value);}});});return ()=>{stopped=true;picker?.();picker=null;};};
  context.validateProjectAddition=(_content,value)=>sourceProjectSchema.safeParse(value);
  context.validateServiceAddition=(_content,value)=>sourceServiceSchema.safeParse(value);
  mounted=mountSharedLocalizationWorkspace(panel,{content:s.working,context,initialMode:s.mode,onModeChange:value=>{s.mode=value;},onChange:update,apiFetch,getSession,localeSession,mountMediaThumbnail:context.mountMediaThumbnail,onContext:detail=>view.dispatchEvent(new CustomEvent(topic(key),{detail}))},{key,mountShared,mountLocalized});mounted.setGroupActive(true);
 }
 async function saveCurrent(){
  const s=state();if(!s||pending||!active())return;if(mounted?.hasPendingInput?.()){announce('Áp dụng hoặc bỏ thay đổi trong hộp thoại trước khi lưu website.');return;}
  s.intent??={body:{expected:s.saved.entities.map(({kind,id,revision})=>({kind,id,revision})),content:copy(s.working)},key:crypto.randomUUID()};
  pending=true;update();announce('Đang lưu website…');
  try{const response=contentGroupReceiptSchema.parse(await apiFetch('/api/cms/content/groups/'+group,{method:'PATCH',headers:{'Content-Type':'application/json','Idempotency-Key':s.intent.key},body:JSON.stringify(s.intent.body)}));if(!active())return;if(response.group!==group||response.read.group!==group)throw Error('Phiên bản trả về không đúng mục.');s.saved=response.read;s.working=copy(response.read.content);s.intent=null;for(const [key,other]of states)if(key!==group&&!dirty(other)&&!other.intent)states.delete(key);await mountGroup(s,group,serial);announce('Đã lưu website.');}
  catch(e){if(active()){if(e.status>=400&&e.status<500&&e.code!=='IDEMPOTENCY_IN_PROGRESS')s.intent=null;announce(e.message||'Chưa xác nhận được thao tác lưu.');}}
  finally{pending=false;update();}
 }
 async function reloadCurrent(){if(!await guard('reload'))return;const s=state();if((dirty(s)||s?.intent)&&!view.confirm('Bỏ thay đổi chưa lưu và tải lại mục này?'))return;await loadGroup(group,{fresh:true});}
 async function showPreview(){
  // The shell keeps the open intent while this lazy controller is loading.
  savedPreview.disabled=true;
  try{if(!preview){const {createFullSiteLocalizationPreview}=await import('./full-site-localization-preview.mjs');if(!active())return;preview=createFullSiteLocalizationPreview(previewRoot,{apiFetch,getSession});}previewRoot.hidden=false;await preview.show(localeSession.get());view.dispatchEvent(new Event('resize'));}
  catch(e){if(active())announce(e.message||'Không tải được xem trước.');}
  finally{if(active())savedPreview.disabled=pending;}
 }
 async function ensureReview(){if(review||workflow.hidden||!active())return;const {mountLocalizationReviewEditor}=await import('./localization-review-editor.mjs');if(review||workflow.hidden||!active())return;review=mountLocalizationReviewEditor(workflow,{apiFetch,getSession,getContent:()=>state()?.saved.context.index,nativeStatus:true});void review.load();}
 const observer=new MutationObserver(()=>void ensureReview());observer.observe(workflow,{attributes:true,attributeFilter:['hidden']});
 const beforeUnload=event=>{if(!canLeave()){event.preventDefault();event.returnValue='';}};
 view.addEventListener('cms:site-group',receiveGroup);view.addEventListener('beforeunload',beforeUnload);navigation();void loadGroup(group);
 return {canLeave,destroy(){disposed=true;serial++;aborter?.abort();observer.disconnect();mounted?.destroy();review?.destroy();preview?.destroy();picker?.();disposePinkySelects(owned);owned.remove();previewRoot.remove();view.removeEventListener('cms:site-group',receiveGroup);view.removeEventListener('beforeunload',beforeUnload);view.dispatchEvent(new CustomEvent('cms:site-navigation',{detail:null}));view.dispatchEvent(new CustomEvent('cms:site-dirty',{detail:{groups:[]}}));states.clear();}};
}
