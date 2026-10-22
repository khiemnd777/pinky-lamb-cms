import '../preview/pinky-video-player.css';
import {createCmsIcon} from './cms-icons.mjs';
import {assertLocalOrigin,LOCAL} from './config-local.mjs';
import {composeDocument} from '../preview/hero-renderer.mjs';
import {renderSiteDocument} from '../preview/site-renderer.mjs';
import {APPROVED_SHOWREEL_SOURCE_URL} from './site-about-ip-editor.mjs';
import {createPinkySelect} from './pinky-select.mjs';
import previewStylesheet from '../preview/preview.css?url&no-inline';
assertLocalOrigin();
const stylesheet=document.createElement('link');stylesheet.rel='stylesheet';stylesheet.href=previewStylesheet;document.head.append(stylesheet);
const frame=document.getElementById('preview');
const originalParent=frame.parentNode,homeMarker=document.createComment('Original shared preview position');frame.before(homeMarker);let informationHost=null;
function placePreview(site){const shellHost=document.getElementById('cms-preview-host'),host=shellHost??(site?document.querySelector('#site-editor .site-information'):null);if(informationHost && informationHost!==host)informationHost.style.position='';informationHost=host===shellHost?null:host;if(host){if(!shellHost)host.style.position='static';host.append(panel);}else if(homeMarker.parentNode===originalParent){originalParent.insertBefore(panel,homeMarker.nextSibling);}fitPreview();}
const panel=document.createElement('section');panel.id='preview-panel';panel.className='cms-preview-panel';panel.hidden=true;panel.setAttribute('aria-label','Xem trước bản nháp đã lưu');
const title=document.createElement('h2');title.textContent='Xem trước bản nháp';
const revision=document.createElement('p');revision.id='preview-revision';
const dirty=document.createElement('p');dirty.id='preview-dirty';
const warning=document.createElement('p');warning.id='preview-source-warning';warning.style.overflowWrap='anywhere';
const status=document.createElement('p');status.id='preview-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
const controls=document.createElement('div');controls.className='preview-controls cms-preview-controls';
const head=document.createElement('div');head.className='cms-preview-head';
const cardHead=document.createElement('div');cardHead.className='cms-card-head';
const headingCopy=document.createElement('div');
const versionRow=document.createElement('div');versionRow.className='cms-preview-version';
const dot=document.createElement('span');dot.className='cms-state-dot';dot.setAttribute('aria-hidden','true');
const sizeField=document.createElement('div');sizeField.className='editor-field';
status.className='cms-card-subtitle';dirty.className='cms-unsaved';warning.className='cms-preview-warning';
const label=document.createElement('label');label.htmlFor='preview-width';label.textContent='Kích thước xem trước';
const width=createPinkySelect(document,{id:'preview-width',label:'Kích thước xem trước',value:'1440',options:[{value:'1440',label:'Máy tính — 1440 px'},{value:'390',label:'Điện thoại — 390 px'}]});
const refresh=document.createElement('button');refresh.id='preview-refresh';refresh.type='button';refresh.append(createCmsIcon('RefreshCw'));refresh.setAttribute('aria-label','Làm mới xem trước');refresh.title='Làm mới xem trước';refresh.className='cms-icon';
const fit=document.createElement('button');fit.id='preview-fit';fit.type='button';fit.textContent='Thu vừa khung';fit.className='cms-soft';fit.addEventListener('click',()=>fitPreview());
const returnDraft=document.createElement('button');returnDraft.id='preview-draft';returnDraft.type='button';returnDraft.textContent='Xem bản nháp đã lưu';returnDraft.hidden=true;returnDraft.addEventListener('click',()=>{if(draft){saved=structuredClone(draft);returnDraft.hidden=true;document.dispatchEvent(new CustomEvent('cms:show-work',{detail:{pane:'edit',view:'preview'}}));void render();}});
const viewport=document.createElement('div');viewport.className='preview-viewport';viewport.tabIndex=0;viewport.setAttribute('role','region');viewport.setAttribute('aria-label','Khung xem trước. Dùng phím mũi tên để cuộn.');frame.before(panel);viewport.append(frame);headingCopy.append(title,status);cardHead.append(headingCopy,refresh);versionRow.append(dot,revision);sizeField.append(label,width);controls.append(sizeField,fit,returnDraft);head.append(cardHead,versionRow,dirty,warning,controls);panel.style.minWidth='0';panel.append(head,viewport);
let draft=null,saved=null,generation=0,controller=null,baseline=null;
function clear(){delete panel.dataset.cmsPreview;width.pinkySelect?.close();fitObserver.disconnect();placePreview(false);generation++;controller?.abort();controller=null;draft=null;saved=null;baseline=null;returnDraft.hidden=true;frame.removeAttribute('srcdoc');frame.hidden=true;panel.hidden=true;frame.style.transform='';viewport.style.height='';revision.textContent='';dirty.textContent='';warning.textContent='';status.textContent='';refresh.disabled=false;}
function assets(summary){return Object.fromEntries(summary.map(asset=>[asset.id,{id:asset.id,kind:asset.kind,path:asset.legacyPath,...Object.fromEntries(['width','height','durationSeconds'].filter(key=>asset[key]!==undefined).map(key=>[key,asset[key]]))}]));}
// Scale only the host presentation; the sandbox document keeps its chosen viewport.
function fitPreview(){
  if(panel.hidden || frame.hidden || !viewport.clientWidth)return;
  const mobile=width.value==='390',innerWidth=mobile?390:1440,innerHeight=mobile?844:900;
  const scale=Math.min(1,viewport.clientWidth/innerWidth),border=viewport.offsetHeight-viewport.clientHeight;
  frame.style.width=`${innerWidth}px`;frame.style.height=`${innerHeight}px`;frame.style.transformOrigin='top left';frame.style.transform=`scale(${scale})`;
  const renderedHeight=`${innerHeight*scale+border}px`;if(viewport.style.height!==renderedHeight)viewport.style.height=renderedHeight;
}
const fitObserver=new ResizeObserver(fitPreview);
function size(){frame.className=width.value==='390'?'preview-mobile':'preview-desktop';fitObserver.observe(viewport);fitPreview();}

async function render({reload=false}={}){
  if(!saved)return;
  const current=++generation;controller?.abort();controller=new AbortController();refresh.disabled=true;panel.hidden=false;status.textContent='Đang dựng bản xem trước…';
  try{
    if(!saved.site && (!baseline || reload)){const response=await fetch(`${LOCAL.hosting}/index.html`,{cache:'no-store',credentials:'omit',signal:controller.signal});if(!response.ok)throw new Error();const html=await response.text();if(current!==generation)return;baseline=html;}
    const input=saved;panel.dataset.cmsPreview=input.id?'snapshot':'draft';placePreview(Boolean(input.site));
    let html;
    if(input.site){html=renderSiteDocument(input.content,{publicAssets:assets(input.catalog),localBaseUrl:`${LOCAL.hosting}/`,mode:'PRIVATE',sourceIds:input.context.sourceIds,allowedShowreelSourceUrl:APPROVED_SHOWREEL_SOURCE_URL,currentYear:new Date().getUTCFullYear()});}
    else{const composed=composeDocument(baseline,input.content,{publicAssets:assets(input.catalog),localBaseUrl:`${LOCAL.hosting}/`,mode:'PRIVATE_PREVIEW'});if((composed.match(/<main id="main">/g)??[]).length!==1)throw new Error();html=composed.replace('<main id="main">','<main id="main" style="overflow-x:clip">');}
    if(current!==generation)return;
    title.textContent=input.id?'Xem trước bản nội dung':'Xem trước bản nháp';panel.setAttribute('aria-label',input.id?'Xem trước bản nội dung đã chọn':'Xem trước bản nháp đã lưu');
    frame.setAttribute('sandbox','');frame.srcdoc=html;frame.hidden=false;size();revision.textContent=input.site?(input.id?`Toàn website — home-v2 — schema 2 — m2-site-baseline-v1 — Bản nội dung ${input.id} — bản nháp đã gửi: ${input.draftRevision} — Hash: ${input.contentHash}`:`Toàn website — home-v2 — schema 2 — m2-site-baseline-v1 — Bản nháp đã lưu — phiên bản ${input.revision}`):(input.id?`Bản nội dung ${input.id} — Hash: ${input.contentHash}`:`Bản nháp đã lưu — phiên bản ${input.revision}`);warning.textContent=input.site?'UNVERIFIED: nguồn được cung cấp chưa xác nhận sự thật hoặc quyền sử dụng. Preview dùng đúng bản đã lưu hoặc Snapshot đã chọn.':'';dirty.textContent=input.dirty?'Có thay đổi chưa lưu; xem trước vẫn dùng bản đã lưu.':'';status.textContent='Bản thử local — chưa xuất bản.';
  }catch(error){if(current===generation && error.name!=='AbortError'){frame.removeAttribute('srcdoc');frame.hidden=true;fitObserver.disconnect();viewport.style.height='';status.textContent='Không thể dựng bản xem trước. Vui lòng thử lại.';}}
  finally{if(current===generation){refresh.disabled=false;controller=null;}}
}
width.addEventListener('change',size);refresh.addEventListener('click',()=>void render({reload:true}));
document.addEventListener('cms:session',event=>{if(!event.detail)clear();});
document.addEventListener('cms:content',event=>{
  const input=event.detail;if(!input){clear();return;}
  draft=structuredClone(input);if(saved?.id)return;
  const same=!saved?.site && saved?.revision===input.revision;saved=structuredClone(input);
  dirty.textContent=input.dirty?'Có thay đổi chưa lưu; xem trước vẫn dùng bản đã lưu.':'';
  if(!same || frame.hidden)void render();
});
document.addEventListener('cms:snapshot',event=>{if(!event.detail)return;saved=structuredClone(event.detail);returnDraft.hidden=false;dirty.textContent='';void render();});
clear();

// Full-site events never pass v2 content into the frozen Hero renderer.
document.addEventListener('cms:site-content',event=>{
 if(!event.detail){if(saved?.site || draft?.site)clear();return;}
 const input=event.detail.draft,context={sourceIds:input.sourceCatalog.map(source=>source.id)};
 draft={site:true,content:structuredClone(input.content),catalog:structuredClone(input.catalog),revision:input.revision,dirty:event.detail.dirty,context};
 if(saved?.site && saved.id){dirty.textContent=event.detail.dirty?'Có thay đổi chưa lưu; bản nội dung đã chọn vẫn bất biến.':'';return;}
 const same=saved?.site && saved.revision===input.revision;saved=structuredClone(draft);dirty.textContent=event.detail.dirty?'Có thay đổi chưa lưu; xem trước vẫn dùng bản đã lưu.':'';if(!same || frame.hidden)void render();
});
document.addEventListener('cms:site-snapshot',event=>{
 if(!event.detail){if(saved?.site && saved.id){saved=null;frame.removeAttribute('srcdoc');frame.hidden=true;fitObserver.disconnect();viewport.style.height='';returnDraft.hidden=true;}return;}
 const {response,context}=event.detail;saved={site:true,id:response.snapshot.id,draftRevision:response.snapshot.draftRevision,contentHash:response.snapshot.contentHash,content:structuredClone(response.snapshot.content),catalog:structuredClone(response.snapshot.mediaManifest),context:structuredClone(context)};returnDraft.hidden=false;dirty.textContent='';void render();
});

// Legacy history shares its schema-2 renderer; v3 owns its own authenticated preview.
document.addEventListener('cms:legacy-preview-clear',()=>{if(saved?.site&&saved.id)clear();});
