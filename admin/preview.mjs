import {assertLocalOrigin,LOCAL} from './config-local.mjs';
import {composeDocument} from '../preview/hero-renderer.mjs';
import {renderSiteDocument} from '../preview/site-renderer.mjs';
import {APPROVED_SHOWREEL_SOURCE_URL} from './site-about-ip-editor.mjs';
import previewStylesheet from '../preview/preview.css?url&no-inline';
assertLocalOrigin();
const stylesheet=document.createElement('link');stylesheet.rel='stylesheet';stylesheet.href=previewStylesheet;document.head.append(stylesheet);
const frame=document.getElementById('preview');
const originalParent=frame.parentNode,homeMarker=document.createComment('Original shared preview position');frame.before(homeMarker);let informationHost=null;
function placePreview(site){const host=site?document.querySelector('#site-editor .site-information'):null;if(informationHost && informationHost!==host)informationHost.style.position='';informationHost=host;if(host){host.style.position='static';host.append(panel);}else if(homeMarker.parentNode===originalParent){originalParent.insertBefore(panel,homeMarker.nextSibling);}}
const panel=document.createElement('section');panel.id='preview-panel';panel.hidden=true;panel.setAttribute('aria-label','Xem trước bản nháp đã lưu');
const title=document.createElement('h2');title.textContent='Xem trước bản nháp';
const revision=document.createElement('p');revision.id='preview-revision';
const dirty=document.createElement('p');dirty.id='preview-dirty';
const warning=document.createElement('p');warning.id='preview-source-warning';warning.style.overflowWrap='anywhere';
const status=document.createElement('p');status.id='preview-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
const controls=document.createElement('div');controls.className='preview-controls';
const label=document.createElement('label');label.htmlFor='preview-width';label.textContent='Kích thước xem trước';
const width=document.createElement('select');width.id='preview-width';
for(const [value,text] of [['1440','Máy tính — 1440 px'],['390','Điện thoại — 390 px']]){const option=document.createElement('option');option.value=value;option.textContent=text;width.append(option);}
const refresh=document.createElement('button');refresh.id='preview-refresh';refresh.type='button';refresh.textContent='Làm mới xem trước';
const returnDraft=document.createElement('button');returnDraft.id='preview-draft';returnDraft.type='button';returnDraft.textContent='Xem bản nháp đã lưu';returnDraft.hidden=true;returnDraft.addEventListener('click',()=>{if(draft){saved=structuredClone(draft);returnDraft.hidden=true;void render();}});
const viewport=document.createElement('div');viewport.className='preview-viewport';viewport.tabIndex=0;viewport.setAttribute('role','region');viewport.setAttribute('aria-label','Khung xem trước. Dùng phím mũi tên để cuộn.');frame.before(panel);viewport.append(frame);controls.append(label,width,refresh,returnDraft);panel.style.minWidth='0';panel.append(title,revision,dirty,warning,status,controls,viewport);
let draft=null,saved=null,generation=0,controller=null,baseline=null;
function clear(){placePreview(false);generation++;controller?.abort();controller=null;draft=null;saved=null;baseline=null;returnDraft.hidden=true;frame.removeAttribute('srcdoc');frame.hidden=true;panel.hidden=true;revision.textContent='';dirty.textContent='';warning.textContent='';status.textContent='';refresh.disabled=false;}
function assets(summary){return Object.fromEntries(summary.map(asset=>[asset.id,{id:asset.id,kind:asset.kind,path:asset.legacyPath,...Object.fromEntries(['width','height','durationSeconds'].filter(key=>asset[key]!==undefined).map(key=>[key,asset[key]]))}]));}
function size(){frame.className=width.value==='390'?'preview-mobile':'preview-desktop';}
async function render({reload=false}={}){
  if(!saved)return;
  const current=++generation;controller?.abort();controller=new AbortController();refresh.disabled=true;panel.hidden=false;status.textContent='Đang dựng bản xem trước…';
  try{
    if(!saved.site && (!baseline || reload)){const response=await fetch(`${LOCAL.hosting}/index.html`,{cache:'no-store',credentials:'omit',signal:controller.signal});if(!response.ok)throw new Error();const html=await response.text();if(current!==generation)return;baseline=html;}
    const input=saved;placePreview(Boolean(input.site));
    let html;
    if(input.site){html=renderSiteDocument(input.content,{publicAssets:assets(input.catalog),localBaseUrl:`${LOCAL.hosting}/`,mode:'PRIVATE',sourceIds:input.context.sourceIds,allowedShowreelSourceUrl:APPROVED_SHOWREEL_SOURCE_URL,currentYear:new Date().getUTCFullYear()});}
    else{const composed=composeDocument(baseline,input.content,{publicAssets:assets(input.catalog),localBaseUrl:`${LOCAL.hosting}/`,mode:'PRIVATE_PREVIEW'});if((composed.match(/<main id="main">/g)??[]).length!==1)throw new Error();html=composed.replace('<main id="main">','<main id="main" style="overflow-x:clip">');}
    if(current!==generation)return;
    title.textContent=input.id?'Xem trước bản nội dung':'Xem trước bản nháp';panel.setAttribute('aria-label',input.id?'Xem trước bản nội dung đã chọn':'Xem trước bản nháp đã lưu');
    frame.setAttribute('sandbox','');frame.srcdoc=html;frame.hidden=false;size();revision.textContent=input.site?(input.id?`Toàn website — home-v2 — schema 2 — m2-site-baseline-v1 — Bản nội dung ${input.id} — bản nháp đã gửi: ${input.draftRevision} — Hash: ${input.contentHash}`:`Toàn website — home-v2 — schema 2 — m2-site-baseline-v1 — Bản nháp đã lưu — phiên bản ${input.revision}`):(input.id?`Bản nội dung ${input.id} — Hash: ${input.contentHash}`:`Bản nháp đã lưu — phiên bản ${input.revision}`);warning.textContent=input.site?'UNVERIFIED: nguồn được cung cấp chưa xác nhận sự thật hoặc quyền sử dụng. Preview dùng đúng bản đã lưu hoặc Snapshot đã chọn.':'';dirty.textContent=input.dirty?'Có thay đổi chưa lưu; xem trước vẫn dùng bản đã lưu.':'';status.textContent='Bản thử local — chưa xuất bản.';
  }catch(error){if(current===generation && error.name!=='AbortError'){frame.removeAttribute('srcdoc');frame.hidden=true;status.textContent='Không thể dựng bản xem trước. Vui lòng thử lại.';}}
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
 if(!event.detail){if(saved?.site && saved.id){saved=null;frame.removeAttribute('srcdoc');frame.hidden=true;returnDraft.hidden=true;}return;}
 const {response,context}=event.detail;saved={site:true,id:response.snapshot.id,draftRevision:response.snapshot.draftRevision,contentHash:response.snapshot.contentHash,content:structuredClone(response.snapshot.content),catalog:structuredClone(response.snapshot.mediaManifest),context:structuredClone(context)};returnDraft.hidden=false;dirty.textContent='';void render();
});
