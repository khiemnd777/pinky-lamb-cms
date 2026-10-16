import {z} from 'zod';
import {revisionSchema,hashSchema} from '../contracts/hero.mjs';
import {createCmsIcon} from './cms-icons.mjs';
import {createPinkySelect} from './pinky-select.mjs';
import {createMediaV2RecordSchemas,contentDigestProjectionV2} from '../contracts/media-v3-records-v2.mjs';
import {strictMediaV2JsonSchema} from '../contracts/media-v3-metadata-v2.mjs';
import {canonicalMediaV2Json,v2MediaManifestSchema} from '../contracts/media-v3-contract-v2.mjs';
import {mediaDerivativePublicSchema} from '../contracts/media-read-public.mjs';
import {renderSiteMediaDocument,projectSiteMediaPublicData,collectSiteMediaReferenceIds,collectVisibleSiteMediaReferences} from '../preview/site-media-renderer.mjs';
import {acquireMediaPreviewBinary,registerMediaPreviewResourceOwner} from './media-file-preview.mjs';
import {APPROVED_SHOWREEL_SOURCE_URL} from './site-about-ip-editor.mjs';

export function siteMediaContentContext(record){
 strictMediaV2JsonSchema.parse(record);
 return {sourceCatalog:structuredClone(record.sourceCatalog),currentYear:new Date().getUTCFullYear(),allowedShowreelSourceUrl:APPROVED_SHOWREEL_SOURCE_URL};
}
export function parseSiteMediaDraft(record){
 const context=siteMediaContentContext(record),draft=createMediaV2RecordSchemas(context).draftReadSchema.parse(record);
 return {draft,context};
}
async function digest(value,guard){
 const raw=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonicalMediaV2Json(value)));guard();
 return Array.from(new Uint8Array(raw),n=>n.toString(16).padStart(2,'0')).join('');
}
export async function validateSiteMediaSnapshot(record,guard){
 const context=siteMediaContentContext(record),response=createMediaV2RecordSchemas(context).snapshotReadSchema.parse(record),s=response.snapshot;
 if(Object.keys(response.summary).some(key=>response.summary[key]!==s[key])||response.reviewState.snapshotId!==s.id||response.review&&response.review.snapshotId!==s.id)throw Error('Snapshot identity mismatch');
 const manifestHash=await digest(s.mediaManifest,guard),contentHash=await digest(contentDigestProjectionV2(s.content,manifestHash),guard);
 if(manifestHash!==s.mediaManifestHash||contentHash!==s.contentHash)throw Error('Snapshot hash mismatch');
 guard();return {response,context};
}
const savedPreviewSchema=z.strictObject({contractRevision:z.literal(2),draftId:z.literal('home-v3'),draftRevision:revisionSchema,contentHash:hashSchema,mediaManifestHash:hashSchema,mediaManifest:v2MediaManifestSchema});
/** Same immutable manifest/content fence for canonical preview and form thumbnails. */
export async function validateSavedSiteMediaPreview(record,savedDraft,guard=()=>{}){
 const receipt=savedPreviewSchema.parse(record);guard();
 if(receipt.draftRevision!==savedDraft.revision)throw Error('Saved preview revision mismatch');
 const manifestHash=await digest(receipt.mediaManifest,guard),contentHash=await digest(contentDigestProjectionV2(savedDraft.content,manifestHash),guard);guard();
 if(manifestHash!==receipt.mediaManifestHash||contentHash!==receipt.contentHash)throw Error('Saved preview hash mismatch');
 return receipt;
}
/** Cache one verified read per exact saved content/revision and authenticated member.
 * A failed read remains failed until explicit reload/new saved revision. */
export function createSavedSiteManifestResolver({apiFetch,getSession}){
 let current=null,destroyed=false;
 const member=()=>{const session=getSession();return session?JSON.stringify([session.uid,session.role,session.authzVersion]):null;};
 function clear(){current?.controller.abort();current=null;}
 function get(savedDraft){
  const identity=member();if(destroyed||!identity)return Promise.reject(new DOMException('Phiên đã thay đổi.','AbortError'));
  const key=canonicalMediaV2Json({revision:savedDraft.revision,content:savedDraft.content});
  if(current?.key===key&&current.member===identity)return current.promise;
  clear();const run={key,member:identity,controller:new AbortController(),promise:null};current=run;
  const guard=()=>{if(destroyed||current!==run||run.controller.signal.aborted||member()!==identity)throw new DOMException('Phiên đã thay đổi.','AbortError');};
  run.promise=(async()=>{const raw=await apiFetch('/api/cms/media-site/drafts/home-v3/preview?expectedRevision='+savedDraft.revision,{signal:run.controller.signal});guard();return validateSavedSiteMediaPreview(raw,savedDraft,guard);})();return run.promise;
 }
 return Object.freeze({get,clear,destroy(){clear();destroyed=true;}});
}
const idOf=entry=>entry.source==='LEGACY'?entry.asset.id:entry.asset.assetId;
const publicDerivative=d=>mediaDerivativePublicSchema.parse({key:d.key,role:d.role,mime:d.mimeType,bytes:d.sizeBytes,sha256:d.sha256,generation:d.generation,...Object.fromEntries(['width','height','targetWidth','pageNumber','durationSeconds'].filter(k=>d[k]!==undefined).map(k=>[k,d[k]]))});
const escape=value=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const focusDocument=(url,poster,video=false)=>'<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src blob:; media-src blob:; script-src \'none\'; connect-src \'none\'; object-src \'none\'; frame-src \'none\'; style-src \'none\'; base-uri \'none\'; form-action \'none\'"></head><body>'+(video?'<video controls preload="none" width="320" src="'+escape(url)+'"'+(poster?' poster="'+escape(poster)+'"':'')+' aria-label="Video đã chọn"></video>':'<img width="320" alt="Trang PDF đã xử lý" src="'+escape(url)+'">')+'</body></html>';
/** savedDraft must be the actual saved read; mediaManifest is server-resolved,
 * never synthesized from safeCatalog. Snapshot fences pin its immutable read. */
export function createSiteMediaPreview(root,{apiFetch,getSession,thumbnail=false}){
 const doc=root.ownerDocument,owned=doc.createElement('section'),status=doc.createElement('p'),actions=doc.createElement('div'),host=doc.createElement('div');
 owned.className='site-media-preview-content';actions.className='preview-controls cms-preview-controls ux-preview-actions';host.className='site-media-preview-viewport';root.hidden=true;
 const head=doc.createElement('div'),cardHead=doc.createElement('div'),copy=doc.createElement('div'),title=doc.createElement('h2'),subtitle=doc.createElement('p'),versionRow=doc.createElement('div'),dot=doc.createElement('span'),versionLabel=doc.createElement('p'),refresh=doc.createElement('button');
 head.className='cms-preview-head';cardHead.className='cms-card-head';versionRow.className='cms-preview-version';dot.className='cms-state-dot';dot.setAttribute('aria-hidden','true');subtitle.className='cms-card-subtitle';subtitle.textContent='Bản thử local · chưa xuất bản';title.textContent='Xem trước bản đã lưu';refresh.type='button';refresh.className='cms-icon';refresh.append(createCmsIcon('RefreshCw'));refresh.setAttribute('aria-label','Làm mới bản xem trước media');refresh.title='Làm mới bản xem trước media';refresh.disabled=true;
 refresh.addEventListener('click',()=>{if(current && active(current) && !current.busy)void documentPreview(current.selection);});copy.append(title,subtitle);cardHead.append(copy,refresh);versionRow.append(dot,versionLabel);head.append(cardHead,versionRow,status,actions);
 if(thumbnail){head.hidden=true;owned.classList.add('ux-thumbnail-preview');}
 const devices=doc.createElement('div');devices.className='ux-preview-devices';
 let size=null;
 if(!thumbnail){
  const sizes=[['fluid','Thu vừa khung'],['1440','Máy tính — 1440 px'],['768','Máy tính bảng — 768 px'],['390','Điện thoại — 390 px']];
  size=createPinkySelect(doc,{label:'Kích thước xem trước',value:'fluid',disabled:true,options:sizes.map(([value,label])=>({value,label}))});
  const resize=()=>{if(!sizes.some(([value])=>value===size.value))return;host.dataset.previewWidth=size.value;host.style.setProperty('--preview-width',size.value==='fluid'?'100%':`${size.value}px`);};
  resize();size.addEventListener('change',resize);
  const expand=doc.createElement('button');expand.type='button';expand.append(createCmsIcon('Maximize2'),doc.createTextNode('Mở rộng'));expand.addEventListener('click',()=>{const operation=!doc.fullscreenElement?root.requestFullscreen?.():doc.exitFullscreen?.();operation?.catch(()=>{status.textContent='Trình duyệt chưa cho phép toàn màn hình. Bản xem trước vẫn giữ nguyên.';});});devices.append(size,expand);head.append(devices);}
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');owned.append(head,host);root.append(owned);

 let revision=0,current=null,destroyed=false;
 const sessionKey=()=>{const s=getSession();return s?JSON.stringify([s.uid,s.role,s.authzVersion]):null;};
 const active=run=>!destroyed&&current===run&&!run.controller.signal.aborted&&run.revision===revision&&run.member&&run.member===sessionKey();
 function guard(run){if(active(run))return;if(current===run)clear();throw new DOMException('Phiên đã thay đổi.','AbortError');}
 function dispose(run){
  if(run.frame){run.frame.removeAttribute('srcdoc');run.frame.src='about:blank';run.frame.remove();run.frame=null;}
  if(run.link){run.link.removeAttribute('href');run.link.remove();run.link=null;}
  for(const resource of [...run.resources]){
   try{URL.revokeObjectURL(resource.url);}catch{continue;}
   resource.release();run.resources.delete(resource);
  }
  if(!run.resources.size){run.unregister?.();run.unregister=null;}
 }
 function clear(){size?.pinkySelect?.close();size?.pinkySelect?.setDisabled(true);root.hidden=true;delete root.dataset.cmsPreview;versionLabel.textContent='';refresh.disabled=true;if(!thumbnail)doc.dispatchEvent(new CustomEvent('cms:preview-state',{detail:{snapshot:false}}));revision++;const old=current;current=null;old?.controller.abort();if(old)dispose(old);host.replaceChildren();actions.replaceChildren();status.textContent='';}
 function start(selection){
  clear();if(destroyed||!sessionKey())return null;
  const run={selection,revision,member:sessionKey(),controller:new AbortController(),resources:new Set(),frame:null,link:null,busy:false,buttons:[]};
  run.evict=()=>{if(current===run)clear();else dispose(run);};current=run;root.hidden=false;size?.pinkySelect?.setDisabled(false);root.dataset.cmsPreview=selection.snapshotId?'snapshot':'draft';title.textContent=selection.snapshotId?'Xem trước bản nội dung':'Xem trước bản đã lưu';versionLabel.textContent=selection.snapshotId?'Snapshot '+selection.snapshotId:'Bản nháp đã lưu · phiên bản '+selection.savedRevision;if(!thumbnail)doc.dispatchEvent(new CustomEvent('cms:preview-state',{detail:{snapshot:Boolean(selection.snapshotId)}}));return run;
 }
 function binaryPath(run,id,key){
  return run.selection.snapshotId?'/api/cms/media-site/snapshots/'+encodeURIComponent(run.selection.snapshotId)+'/media/'+encodeURIComponent(id)+'/derivatives/'+encodeURIComponent(key):
   '/api/cms/media/'+encodeURIComponent(id)+'/derivatives/'+encodeURIComponent(key);
 }
 async function binary(run,entry,d){
  guard(run);
  const derivative=publicDerivative(d),reservation=await acquireMediaPreviewBinary(derivative.bytes,run.evict,{signal:run.controller.signal});
  let transferred=false,payload,bytes,blob,bitmap;
  try{
   guard(run);payload=await apiFetch(binaryPath(run,idOf(entry),derivative.key),{signal:run.controller.signal,responseType:'bytes',derivative,maxBytes:derivative.bytes});guard(run);
   if(!(payload?.bytes instanceof Uint8Array)||payload.bytes.length!==derivative.bytes||payload.mime!==derivative.mime||payload.sha256!==derivative.sha256||payload.generation!==derivative.generation)throw Error('Derivative mismatch');
   bytes=new Uint8Array(payload.bytes);payload=null;
   const hash=await crypto.subtle.digest('SHA-256',bytes);guard(run);
   if(Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('')!==derivative.sha256)throw Error('Derivative hash mismatch');
   blob=new Blob([bytes],{type:derivative.mime});bytes=null;
   if(derivative.mime==='image/webp'){try{bitmap=await createImageBitmap(blob);guard(run);if(bitmap.width!==derivative.width||bitmap.height!==derivative.height)throw Error('Derivative dimensions mismatch');}finally{bitmap?.close();bitmap=null;}}
   guard(run);const resource={url:URL.createObjectURL(blob),release:reservation.release};blob=null;run.resources.add(resource);
   if(!run.unregister)run.unregister=registerMediaPreviewResourceOwner(run.evict);
   transferred=true;return resource.url;
  }finally{payload=null;bytes=null;blob=null;try{bitmap?.close();}finally{if(!transferred)reservation.release();reservation.settle();}}
 }
 async function legacyBinary(run,entry){
  guard(run);const a=entry.asset,mimes={IMAGE:['image/jpeg','image/png','image/webp','image/svg+xml'],VIDEO:['video/mp4'],PDF:['application/pdf']};
  if(entry.source!=='LEGACY'||!mimes[a.kind]?.includes(a.mimeType)||!/^assets\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(a.legacyPath))throw Error('Legacy manifest mismatch');
  const url=new URL(a.legacyPath,'http://127.0.0.1:5010/'),reservation=await acquireMediaPreviewBinary(a.sizeBytes,run.evict,{signal:run.controller.signal});
  let reader,bytes,blob,bitmap,transferred=false;
  try{
   guard(run);const response=await fetch(url.href,{signal:run.controller.signal,credentials:'omit',redirect:'error',cache:'no-store'});guard(run);
   if(!response.ok||response.url!==url.href||response.headers.get('Content-Type')?.split(';')[0].trim()!==a.mimeType||!response.body)throw Error('Legacy response mismatch');
   bytes=new Uint8Array(a.sizeBytes);reader=response.body.getReader();let offset=0;
   while(true){const chunk=await reader.read();guard(run);if(chunk.done)break;if(!(chunk.value instanceof Uint8Array)||offset+chunk.value.length>a.sizeBytes)throw Error('Legacy bytes mismatch');bytes.set(chunk.value,offset);offset+=chunk.value.length;}
   if(offset!==a.sizeBytes)throw Error('Legacy bytes mismatch');
   const raw=await crypto.subtle.digest('SHA-256',bytes);guard(run);
   if(Array.from(new Uint8Array(raw),v=>v.toString(16).padStart(2,'0')).join('')!==a.sha256)throw Error('Legacy hash mismatch');
   blob=new Blob([bytes],{type:a.mimeType});bytes=null;
   if(a.kind==='IMAGE'){try{bitmap=await createImageBitmap(blob);guard(run);if(a.width!==undefined&&bitmap.width!==a.width||a.height!==undefined&&bitmap.height!==a.height)throw Error('Legacy dimensions mismatch');}finally{bitmap?.close();bitmap=null;}}
   guard(run);const resource={url:URL.createObjectURL(blob),release:reservation.release};blob=null;run.resources.add(resource);if(!run.unregister)run.unregister=registerMediaPreviewResourceOwner(run.evict);transferred=true;return resource.url;
  }finally{bytes=null;blob=null;try{if(reader){try{await reader.cancel();}finally{reader.releaseLock();}}}finally{try{bitmap?.close();}finally{if(!transferred)reservation.release();reservation.settle();}}}
 }
 function frame(run,html,title){guard(run);if(run.frame){run.frame.removeAttribute('srcdoc');run.frame.src='about:blank';run.frame.remove();}const f=doc.createElement('iframe');run.frame=f;f.className='media-image-frame';f.title=title;f.setAttribute('sandbox','');f.srcdoc=html;host.prepend(f);}
 async function focus(selection,entry,mode,page=1){
  const run=start(selection);if(!run)return;run.busy=true;status.textContent='Đang tải tài nguyên đã xử lý…';
  try{
   addControls(run);
   if(entry.source==='LEGACY'){
    if(mode==='VIDEO'){
     const posterEntry=selection.manifest.find(e=>idOf(e)===selection.content.settings.showreel.poster.assetId);
     const poster=posterEntry.source==='LEGACY'?await legacyBinary(run,posterEntry):await binary(run,posterEntry,posterEntry.asset.derivatives.find(d=>d.role===(posterEntry.asset.kind==='VIDEO'?'POSTER':'IMAGE')&&(d.role!=='IMAGE'||d.targetWidth===1920)));guard(run);
     const video=await legacyBinary(run,entry);guard(run);frame(run,focusDocument(video,poster,true),'Video LEGACY đã bàn giao');
    }else{const url=await legacyBinary(run,entry);guard(run);const link=doc.createElement('a');run.link=link;link.href=url;link.download=idOf(entry)+'.pdf';link.textContent='Tải PDF LEGACY đã bàn giao';link.addEventListener('click',e=>{if(!active(run))e.preventDefault();});host.append(link);}
   }else if(mode==='VIDEO'){
    const poster=await binary(run,entry,entry.asset.derivatives.find(d=>d.role==='POSTER'));guard(run);
    const video=await binary(run,entry,entry.asset.derivatives.find(d=>d.role==='VIDEO'));guard(run);frame(run,focusDocument(video,poster,true),'Xem video');
   }else if(mode==='PDF_PAGE'){
    const pages=entry.asset.derivatives.filter(d=>d.role==='PDF_PAGE').sort((a,b)=>a.pageNumber-b.pageNumber),d=pages[page-1];if(!d||d.pageNumber!==page)throw Error('Page mismatch');
    const image=await binary(run,entry,d);guard(run);frame(run,focusDocument(image),'Trang '+page+' của PDF');
    const previous=doc.createElement('button'),next=doc.createElement('button');previous.type=next.type='button';previous.textContent='Trang trước';next.textContent='Trang sau';previous.disabled=page===1;next.disabled=page===pages.length;
    previous.addEventListener('click',()=>{if(active(run)&&!run.busy)void focus(selection,entry,'PDF_PAGE',page-1);});
    next.addEventListener('click',()=>{if(active(run)&&!run.busy)void focus(selection,entry,'PDF_PAGE',page+1);});actions.append(previous,next);
   }else{
    const d=entry.asset.derivatives.find(d=>d.role==='PDF_DOWNLOAD'),url=await binary(run,entry,d);guard(run);const link=doc.createElement('a');run.link=link;link.href=url;link.download=idOf(entry)+'.pdf';link.textContent='Tải PDF đã xử lý';link.addEventListener('click',e=>{if(!active(run))e.preventDefault();});host.append(link);
   }
   status.textContent='Tài nguyên đã kiểm tra đúng bản đã chọn.';
  }catch(error){dispose(run);if(active(run))status.textContent='Không thể xem tài nguyên. Phiên bản và byte budget vẫn được giữ nghiêm.';}
  finally{run.busy=false;if(active(run)){refresh.disabled=false;run.buttons.forEach(b=>{b.disabled=false;});}}
 }
 function addControls(run){
  const visible=new Set(collectVisibleSiteMediaReferences(run.selection.content).map(r=>r.id));
  for(const entry of run.selection.manifest){
   if(!visible.has(idOf(entry))||!['PDF','VIDEO'].includes(entry.asset.kind))continue;
   for(const [label,mode] of entry.asset.kind==='VIDEO'?[['Tải và xem video','VIDEO']]:entry.source==='LEGACY'?[['Chuẩn bị tải PDF LEGACY','PDF_DOWNLOAD']]:[['Xem các trang PDF','PDF_PAGE'],['Chuẩn bị tải PDF','PDF_DOWNLOAD']]){
    const b=doc.createElement('button');b.type='button';b.textContent=label+' — '+idOf(entry);b.addEventListener('click',()=>{if(active(run)&&!run.busy)void focus(run.selection,entry,mode);});run.buttons.push(b);b.disabled=run.busy;actions.append(b);
   }
  }
 }
 async function documentPreview(selection){
  const run=start(selection);if(!run)return;run.busy=true;status.textContent='Đang chuẩn bị bản website đã lưu…';
  try{
   addControls(run);
   const manifest=v2MediaManifestSchema.parse(selection.manifest),selected=new Set(collectSiteMediaReferenceIds(selection.content).map(r=>r.id));
   if(manifest.length!==selected.size||manifest.some(e=>!selected.has(idOf(e))))throw Error('Manifest mismatch');
   const visible=collectVisibleSiteMediaReferences(selection.content),ids=new Set(visible.filter(r=>r.kind==='IMAGE'||r.kind==='VIDEO').map(r=>r.id)),resources={};
   for(const entry of manifest){
    const id=idOf(entry);
    if(entry.source==='LEGACY'){if(entry.asset.kind==='IMAGE'&&ids.has(id))resources[id]={image:entry.asset.legacyPath};continue;}
    if(!ids.has(id))continue;
    if(entry.asset.kind==='IMAGE'){const d=entry.asset.derivatives.find(d=>d.role==='IMAGE'&&d.targetWidth===1920);resources[id]={image:await binary(run,entry,d)};guard(run);}
    else if(entry.asset.kind==='VIDEO'){resources[id]={poster:await binary(run,entry,entry.asset.derivatives.find(d=>d.role==='POSTER'))};guard(run);}
   }
   const options={mediaManifest:manifest,resources,contentContext:selection.context,localBaseUrl:'http://127.0.0.1:5010/',mode:'PRIVATE'};
   projectSiteMediaPublicData(selection.content,options);
   frame(run,renderSiteMediaDocument(selection.content,options),'Website — bản đã lưu');status.textContent='Bản xem trước khớp bản đã lưu.';
  }catch(error){
   dispose(run);if(active(run))status.textContent='Không thể dựng bản đã lưu. Không tải trước video/PDF download hoặc tạo URL thay thế.';
  }finally{run.busy=false;if(active(run)){refresh.disabled=false;run.buttons.forEach(b=>{b.disabled=false;});}}
 }
 async function showSaved({savedDraft,mediaManifest,expectedRevision}){
  clear();const member=sessionKey(),n=revision;if(!member||destroyed)return;
  const {draft,context}=parseSiteMediaDraft(savedDraft);
  if(draft.revision!==expectedRevision)throw Error('Saved revision mismatch');
  const manifest=v2MediaManifestSchema.parse(mediaManifest);
  if(destroyed||n!==revision||sessionKey()!==member)return;
  await documentPreview({content:draft.content,context,manifest,savedRevision:draft.revision});
 }
 async function showSnapshot({response,expectedSnapshotId,expectedContentHash,expectedMediaManifestHash}){
  clear();const member=sessionKey(),n=revision;if(!member||destroyed)return;
  const check=()=>{if(destroyed||n!==revision||sessionKey()!==member)throw new DOMException('Phiên đã thay đổi.','AbortError');};
  const parsed=await validateSiteMediaSnapshot(response,check);check();const s=parsed.response.snapshot;
  if(s.id!==expectedSnapshotId||s.contentHash!==expectedContentHash||s.mediaManifestHash!==expectedMediaManifestHash)throw Error('Snapshot fence mismatch');
  await documentPreview({content:s.content,context:parsed.context,manifest:s.mediaManifest,snapshotId:s.id});
 }
 document.addEventListener('cms:session',clear);
 async function showThumbnail(entry,label){
  const run=start({manifest:[entry]});if(!run)return;run.busy=true;
  try{if(entry.source!=='LEGACY'||entry.asset.kind!=='IMAGE')throw Error('Invalid thumbnail');const url=await legacyBinary(run,entry);guard(run);const image=doc.createElement('img');image.alt=label??entry.asset.label??'';image.loading='lazy';image.src=url;host.append(image);}catch{if(active(run)){host.replaceChildren(createCmsIcon('Image'),doc.createTextNode((label??entry.asset.label??entry.asset.id)+' — Không thể tải ảnh xem trước. Hãy tải lại bản đã lưu để thử lại.'));host.setAttribute('role','status');}}finally{run.busy=false;}
 }
 return Object.freeze({showSaved,showSnapshot,showThumbnail,clear,destroy(){if(destroyed)return;document.removeEventListener('cms:session',clear);clear();destroyed=true;size?.pinkySelect?.destroy();owned.remove();}});
}

