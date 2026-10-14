import {mediaIdSchema,mediaPublicSchema,mediaDetailPublicSchema} from '../contracts/media-read-public.mjs';
import {safeCatalogV2Schema} from '../contracts/media-v3-records-v2.mjs';

/** Bounded current READY pages plus the saved, source-tagged legacy catalog.
 * onSelect receives {source:'LEGACY'|'MEDIA_VERSION',asset:<actual DTO>}.
 * PDF page conflicts are reported, never removed from content by this picker. */
export function openMediaSlotPicker({apiFetch,getSession,kind,selectedId,onSelect,catalog=[],allowedIds,slot=kind,requiredPages=[],onInvalidPages}){
 if(typeof apiFetch!=='function'||typeof getSession!=='function'||typeof onSelect!=='function'||!['IMAGE','PDF','VIDEO'].includes(kind)||!['IMAGE','PDF','VIDEO','VIDEO_POSTER'].includes(slot)||slot==='VIDEO_POSTER'&&kind!=='VIDEO')throw new TypeError('Invalid picker options');
 if(selectedId!==undefined&&selectedId!=='')mediaIdSchema.parse(selectedId);
 const saved=safeCatalogV2Schema.parse(catalog),legacy=saved.filter(e=>e.source==='LEGACY'&&e.asset.kind===kind&&slot!=='VIDEO_POSTER');
 if(allowedIds!==undefined&&(!Array.isArray(allowedIds)||allowedIds.length>128||new Set(allowedIds).size!==allowedIds.length))throw new TypeError('Invalid allowed IDs');
 allowedIds?.forEach(id=>mediaIdSchema.parse(id));
 if(!Array.isArray(requiredPages)||requiredPages.length>24||requiredPages.some(p=>!p||typeof p.projectId!=='string'||typeof p.label!=='string'||!Number.isInteger(p.pageNumber)||p.pageNumber<1||p.pageNumber>48))throw new TypeError('Invalid PDF references');
 const previous=document.activeElement,dialog=document.createElement('dialog'),title=document.createElement('h2'),status=document.createElement('p'),search=document.createElement('input'),legacyList=document.createElement('div'),list=document.createElement('div'),back=document.createElement('button'),next=document.createElement('button'),close=document.createElement('button');
 title.textContent={IMAGE:'Chọn ảnh',PDF:'Chọn PDF',VIDEO:'Chọn video'}[kind];title.id='media-slot-'+crypto.randomUUID();dialog.setAttribute('aria-labelledby',title.id);status.setAttribute('role','status');search.type='search';search.setAttribute('aria-label','Lọc tài nguyên trong trang hiện tại');legacyList.setAttribute('aria-label','Tài nguyên LEGACY đã lưu');list.setAttribute('aria-label','Tài nguyên READY hiện tại');
 for(const button of [back,next,close])button.type='button';back.textContent='Trang trước';next.textContent='Trang sau';close.textContent='Đóng';
 dialog.append(title,search,status,legacyList,list,back,next,close);document.body.append(dialog);
 let removed=false,busy=false,serial=0,controller,cursor=null,nextCursor=null,history=[],items=[];
 const memberKey=()=>{const s=getSession();return s?JSON.stringify([s.uid,s.role,s.authzVersion]):null;},member=memberKey();
 const active=n=>!removed&&n===serial&&!controller?.signal.aborted&&member&&memberKey()===member;
 const allowed=id=>!allowedIds||allowedIds.includes(id);
 function finish(){if(removed)return;removed=true;serial++;controller?.abort();document.removeEventListener('cms:session',finish);dialog.remove();if(previous?.isConnected)previous.focus();}
 function check(n){if(!active(n)){if(memberKey()!==member)finish();throw new DOMException('Phiên đã thay đổi.','AbortError');}}
 function controls(){back.disabled=busy||!history.length;next.disabled=busy||!nextCursor;search.disabled=busy;}
 async function choose(selection){
  if(busy||removed||!member||memberKey()!==member)return;busy=true;controls();const n=++serial;controller?.abort();controller=new AbortController();
  try{
   let chosen=selection;
   if(selection.source==='MEDIA_VERSION'){
    const id=mediaIdSchema.parse(selection.asset.id),raw=await apiFetch('/api/cms/media/'+encodeURIComponent(id),{signal:controller.signal});check(n);
    const asset=mediaDetailPublicSchema.parse(raw);
    if(asset.id!==id||asset.kind!==kind||asset.status!=='READY'||asset.isArchived||slot==='VIDEO_POSTER'&&!asset.derivatives.some(d=>d.role==='POSTER'))throw new Error('Selection mismatch');
    chosen={source:'MEDIA_VERSION',asset};
    if(kind==='PDF'){
     const pageCount=asset.derivatives.filter(d=>d.role==='PDF_PAGE').length,invalid=requiredPages.filter(p=>p.pageNumber>pageCount);
     if(invalid.length){status.textContent='Các liên kết vượt PDF mới: '+invalid.map(p=>p.label+' — trang '+p.pageNumber).join('; ');onInvalidPages?.(invalid);if(!window.confirm(status.textContent+'. Giữ nguyên các liên kết này để sửa trước khi lưu?'))return;}
    }
   }
   check(n);onSelect(chosen);finish();
  }catch(error){if(active(n)&&error.name!=='AbortError')status.textContent='Không thể chọn tài nguyên. Hãy tải lại trang.';}
  finally{if(!removed&&n===serial){busy=false;controls();}}
 }
 function option(host,selection){
  const asset=selection.asset,id=selection.source==='LEGACY'?asset.id:asset.id;
  if(!allowed(id))return;
  const text=selection.source==='LEGACY'?asset.label:asset.name,query=search.value.toLocaleLowerCase('vi');
  if(!String(text+' '+id).toLocaleLowerCase('vi').includes(query))return;
  const button=document.createElement('button');button.type='button';button.textContent=text+' — '+selection.source;button.setAttribute('aria-pressed',String(id===selectedId));button.addEventListener('click',()=>void choose(selection));host.append(button);
 }
 function render(){
  legacyList.replaceChildren();list.replaceChildren();
  for(const entry of legacy)option(legacyList,entry);
  for(const asset of items)option(list,{source:'MEDIA_VERSION',asset});
  if(!legacyList.children.length&&!list.children.length){const empty=document.createElement('p');empty.textContent='Không có tài nguyên phù hợp trong trang này.';list.append(empty);}
 }
 async function load(){
  controller?.abort();controller=new AbortController();const n=++serial;busy=true;controls();status.textContent='Đang đọc một trang READY…';
  try{
   const query=new URLSearchParams({kind,status:'READY',pageSize:'20'});if(cursor)query.set('cursor',cursor);
   const raw=await apiFetch('/api/cms/media?'+query,{signal:controller.signal});check(n);
   if(!raw||!Array.isArray(raw.items)||raw.items.length>20||raw.nextCursor!==null&&(typeof raw.nextCursor!=='string'||!/^[A-Za-z0-9_-]{1,2048}$/.test(raw.nextCursor)))throw new Error('Invalid page');
   items=raw.items.map(item=>mediaPublicSchema.parse(item));
   if(new Set(items.map(v=>v.id)).size!==items.length||items.some(v=>v.kind!==kind||v.status!=='READY'||v.isArchived||legacy.some(e=>e.asset.id===v.id)))throw new Error('Invalid READY page');
   nextCursor=raw.nextCursor;render();status.textContent='Danh mục LEGACY giữ nguyên nguồn; chọn mới chỉ dùng READY chưa lưu trữ.';
  }catch(error){if(active(n)&&error.name!=='AbortError'){items=[];nextCursor=null;render();status.textContent='Không thể tải trang media. Vui lòng chọn lại.';}}
  finally{if(!removed&&n===serial){busy=false;controls();}}
 }
 back.addEventListener('click',()=>{if(busy||!history.length)return;cursor=history.pop();void load();});
 next.addEventListener('click',()=>{if(busy||!nextCursor)return;history.push(cursor);cursor=nextCursor;void load();});
 search.addEventListener('input',render);close.addEventListener('click',()=>{dialog.close();finish();});dialog.addEventListener('close',finish);dialog.addEventListener('cancel',finish);
 dialog.addEventListener('keydown',event=>{if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;const buttons=[...legacyList.querySelectorAll('button'),...list.querySelectorAll('button')];if(!buttons.length)return;const i=buttons.indexOf(document.activeElement),target=event.key==='Home'?0:event.key==='End'?buttons.length-1:event.key==='ArrowDown'?(i+1)%buttons.length:i<=0?buttons.length-1:i-1;event.preventDefault();buttons[target].focus();});
 document.addEventListener('cms:session',finish);render();dialog.showModal();search.focus();if(member)void load();else finish();
 return finish;
}

