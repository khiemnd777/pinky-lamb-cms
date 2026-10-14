import {mediaDetailPublicSchema,mediaIdSchema} from '../contracts/media-read-public.mjs';

const MiB=1048576,CAP=64*MiB;
let retainedBlobBytes=0,binaryInFlight=false;
const resourceOwners=new Set();
const statusLabels={QUEUED:'Đang chờ xử lý',PROCESSING:'Đang xử lý',READY:'Sẵn sàng',REJECTED:'Đã từ chối',RECOVERY_REQUIRED:'Cần khôi phục'};
const escapeAttribute=value=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const childDocument=(url,poster)=>'<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src blob:; media-src blob:; script-src \'none\'; connect-src \'none\'; object-src \'none\'; frame-src \'none\'; style-src \'none\'; base-uri \'none\'; form-action \'none\'"><meta name="referrer" content="no-referrer"></head><body>'+
  (poster?'<video controls preload="none" width="320" aria-label="Video đã xử lý" src="'+escapeAttribute(url)+'" poster="'+escapeAttribute(poster)+'">Trình duyệt không hỗ trợ video.</video>':'<img width="320" alt="Bản xem trước đã xử lý" src="'+escapeAttribute(url)+'">')+'</body></html>';

// One logical encoded-payload reservation, shared by all helper instances.
// Hash/decode/network remain charged and locked until their actual promises
// settle. Transient copies, decoded browser memory, physical GC/RSS are Unknown.
function beginBinary(bytes,protectedOwner) {
  if(binaryInFlight) throw new Error('PREVIEW_BUSY');
  if(!Number.isSafeInteger(bytes)||bytes<1||bytes>CAP) throw new Error('PREVIEW_BYTES');
  if(retainedBlobBytes+bytes>CAP) {
    for(const evict of resourceOwners){if(evict===protectedOwner)continue;evict();if(retainedBlobBytes+bytes<=CAP)break;}
  }
  if(retainedBlobBytes+bytes>CAP) throw new Error('PREVIEW_BUDGET');
  retainedBlobBytes+=bytes;binaryInFlight=true;
  let released=false,settled=false;
  return {release(){if(!released){released=true;retainedBlobBytes-=bytes;}},
    settle(){if(!settled){settled=true;binaryInFlight=false;}}};
}
export function beginMediaPreviewBinary(bytes,protectedOwner){return beginBinary(bytes,protectedOwner);}
export function registerMediaPreviewResourceOwner(evict){
  if(typeof evict!=='function')throw new TypeError('Resource owner required');
  resourceOwners.add(evict);let removed=false;
  return ()=>{if(!removed){removed=true;resourceOwners.delete(evict);}};
}
function readyFiles(record) {
  if(record.kind==='VIDEO') {
    const video=record.derivatives.find(d=>d.role==='VIDEO'),poster=record.derivatives.find(d=>d.role==='POSTER');
    if(!video||!poster||video.bytes>48*MiB||poster.bytes>MiB||video.width>1280||video.height>720) throw new Error('PREVIEW_DETAIL');
    return {video,poster,pages:[]};
  }
  const pages=record.derivatives.filter(d=>d.role==='PDF_PAGE').sort((a,b)=>a.pageNumber-b.pageNumber);
  const download=record.derivatives.find(d=>d.role==='PDF_DOWNLOAD');
  if(!download||!pages.length||!pages.every((d,i)=>d.pageNumber===i+1)||pages.length>48) throw new Error('PREVIEW_DETAIL');
  return {pages,download};
}

/** Private safe-derivative preview. No original, external URL, PDF plugin,
 * injected child script, relaxed sandbox, or preloaded video/PDF download. */
export function createMediaFilePreview(root,{apiFetch,getSession}) {
  if(typeof apiFetch!=='function'||typeof getSession!=='function') throw new TypeError('Session provider required');
  const document=root.ownerDocument,owned=document.createElement('section'),status=document.createElement('p'),controls=document.createElement('div'),content=document.createElement('div');
  owned.className='media-file-preview';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  owned.append(status,controls,content);root.append(owned);
  let revision=0,current=null,destroyed=false;
  function sessionKey() {
    const member=getSession();
    return member&&typeof member.uid==='string'&&member.uid&&typeof member.role==='string'&&member.role&&Number.isSafeInteger(member.authzVersion)?
      JSON.stringify([member.uid,member.role,member.authzVersion]):null;
  }
  const active=run=>!destroyed&&current===run&&revision===run.revision&&!run.controller.signal.aborted&&sessionKey()===run.member;
  function requireActive(run) {
    if(active(run))return;
    if(current===run)clear();
    throw new Error('STALE_PREVIEW');
  }
  function updateControls(run) {
    if(!active(run))return;
    if(run.previous)run.previous.disabled=run.busy||run.page<=1;
    if(run.next)run.next.disabled=run.busy||run.page>=run.files.pages.length;
    if(run.prepare)run.prepare.disabled=run.busy||[...run.resources].some(r=>r.derivative.role==='PDF_DOWNLOAD');
    if(run.play)run.play.disabled=run.busy||[...run.resources].some(r=>r.derivative.role==='VIDEO');
  }
  function evict(run) {
    // Opaque sandbox: detach/blank/remove the browsing context before revoking.
    // Parent never claims access to, or pause control of, the child video.
    if(run.frame){run.frame.removeAttribute('srcdoc');run.frame.src='about:blank';run.frame.remove();run.frame=null;}
    if(run.download){run.download.removeAttribute('href');run.download.remove();run.download=null;}
    for(const resource of [...run.resources]) {
      try{URL.revokeObjectURL(resource.url);}catch{continue;} // Unknown revocation keeps its logical reservation charged.
      resource.release();run.resources.delete(resource);
    }
    if(!run.resources.size)resourceOwners.delete(run.evict);
    if(current===run){content.replaceChildren();updateControls(run);}
  }
  function clear() {
    revision++;const previous=current;current=null;
    previous?.controller.abort();
    if(previous)evict(previous);
    content.replaceChildren();controls.replaceChildren();status.textContent='';owned.removeAttribute('aria-busy');
    // No pending reservation or global lock is released merely by abort/clear.
  }
  async function loadFile(run,derivative) {
    requireActive(run);const reservation=beginBinary(derivative.bytes,run.evict);
    let transferred=false,payload,bytes,blob,bitmap;
    try {
      payload=await apiFetch('/api/cms/media/'+encodeURIComponent(run.record.id)+'/derivatives/'+encodeURIComponent(derivative.key),
        {signal:run.controller.signal,responseType:'bytes',derivative,maxBytes:derivative.bytes});
      requireActive(run);
      if(!(payload?.bytes instanceof Uint8Array)||payload.bytes.byteLength!==derivative.bytes||payload.mime!==derivative.mime||
        payload.generation!==derivative.generation||payload.sha256!==derivative.sha256) throw new Error('PREVIEW_INTEGRITY');
      bytes=new Uint8Array(payload.bytes);payload=null;
      const digest=await crypto.subtle.digest('SHA-256',bytes);requireActive(run);
      const hash=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
      if(hash!==derivative.sha256)throw new Error('PREVIEW_INTEGRITY');
      blob=new Blob([bytes],{type:derivative.mime});bytes=null;
      if(derivative.mime==='image/webp') {
        try{bitmap=await createImageBitmap(blob);requireActive(run);if(bitmap.width!==derivative.width||bitmap.height!==derivative.height)throw new Error('PREVIEW_DIMENSIONS');}
        finally{bitmap?.close();bitmap=null;}
      }
      requireActive(run);
      const resource={url:URL.createObjectURL(blob),derivative,release:reservation.release};
      blob=null;run.resources.add(resource);resourceOwners.add(run.evict);transferred=true;
      return resource;
    } finally {
      payload=null;bytes=null;blob=null;
      try{bitmap?.close();}finally{if(!transferred)reservation.release();reservation.settle();}
    }
  }
  function frame(run,url,poster) {
    requireActive(run);
    if(run.frame){run.frame.removeAttribute('srcdoc');run.frame.src='about:blank';run.frame.remove();}
    const iframe=document.createElement('iframe');run.frame=iframe;
    iframe.className='media-image-frame';iframe.title=poster?'Xem video đã xử lý':'Xem trang hoặc ảnh đã xử lý';
    iframe.setAttribute('sandbox','');iframe.srcdoc=childDocument(url,poster);content.prepend(iframe);
  }
  async function action(run,operation) {
    if(!active(run)||run.busy)return;
    run.busy=true;updateControls(run);owned.setAttribute('aria-busy','true');status.textContent='Đang tải bản xem trước…';
    try{await operation();requireActive(run);}
    catch(error){
      if(current===run&&sessionKey()!==run.member){clear();return;}
      evict(run);
      if(active(run))status.textContent=['PREVIEW_BUSY','PREVIEW_BUDGET'].includes(error.message)?'Đang có tệp được tải hoặc bộ nhớ xem trước đang đầy. Đợi rồi thử lại.':'Không thể xem tệp. Vui lòng thử lại.';
    } finally {
      run.busy=false;
      if(active(run)){owned.removeAttribute('aria-busy');updateControls(run);}
    }
  }
  async function openPage(run,page) {
    await action(run,async()=>{
      const selected=run.files.pages[page-1];if(!selected)throw new Error('PREVIEW_DETAIL');
      evict(run);const image=await loadFile(run,selected);requireActive(run);
      run.page=page;frame(run,image.url);status.textContent=run.record.name+' — Trang '+page+'/'+run.files.pages.length;
    });
  }
  function makeControls(run) {
    function button(label,click){const element=document.createElement('button');element.type='button';element.textContent=label;element.addEventListener('click',click);controls.append(element);return element;}
    if(run.record.kind==='VIDEO') {
      run.play=button('Xem video',()=>action(run,async()=>{
        let poster=[...run.resources].find(r=>r.derivative.role==='POSTER');
        if(!poster){poster=await loadFile(run,run.files.poster);requireActive(run);frame(run,poster.url);}
        const video=await loadFile(run,run.files.video);requireActive(run);
        frame(run,video.url,poster.url);status.textContent=run.record.name+' — Sẵn sàng phát';
      }));
    } else {
      run.previous=button('Trang trước',()=>openPage(run,run.page-1));
      run.next=button('Trang sau',()=>openPage(run,run.page+1));
      run.prepare=button('Chuẩn bị tải PDF',()=>action(run,async()=>{
        if(retainedBlobBytes+run.files.download.bytes>CAP)evict(run);
        const file=await loadFile(run,run.files.download);requireActive(run);
        const link=document.createElement('a');run.download=link;
        link.className='site-qa-link';link.textContent='Tải PDF đã xử lý';link.download=run.record.id+'.pdf';link.href=file.url;
        link.addEventListener('click',event=>{if(!active(run)){event.preventDefault();if(current===run)clear();}});
        content.append(link);status.textContent='PDF đã xử lý sẵn sàng để tải.';
      }));
    }
  }
  async function show(id) {
    clear();if(destroyed)return;const member=sessionKey();if(!member)return;
    const run={revision,member,controller:new AbortController(),resources:new Set(),record:null,files:null,frame:null,download:null,page:1,busy:true};
    run.evict=()=>evict(run);current=run;status.textContent='Đang đọc trạng thái tệp…';owned.setAttribute('aria-busy','true');
    try {
      const assetId=mediaIdSchema.parse(id),raw=await apiFetch('/api/cms/media/'+encodeURIComponent(assetId),{signal:run.controller.signal});requireActive(run);
      run.record=mediaDetailPublicSchema.parse(raw);
      if(run.record.id!==assetId||run.record.isArchived||!['VIDEO','PDF'].includes(run.record.kind))throw new Error('PREVIEW_DETAIL');
      if(run.record.status!=='READY'){status.textContent=run.record.name+' — '+statusLabels[run.record.status];return;}
      run.files=readyFiles(run.record);makeControls(run);updateControls(run);
      if(run.record.kind==='VIDEO'){const poster=await loadFile(run,run.files.poster);requireActive(run);frame(run,poster.url);status.textContent=run.record.name+' — Nhấn Xem video để tải và phát.';}
      else{const first=await loadFile(run,run.files.pages[0]);requireActive(run);frame(run,first.url);status.textContent=run.record.name+' — Trang 1/'+run.files.pages.length;}
    } catch(error) {
      if(current===run&&sessionKey()!==run.member){clear();return;}
      evict(run);if(active(run))status.textContent=['PREVIEW_BUSY','PREVIEW_BUDGET'].includes(error.message)?'Đang có tệp được tải. Đợi rồi chọn lại.':'Không thể xem tệp. Vui lòng thử lại.';
    } finally {run.busy=false;if(active(run)){owned.removeAttribute('aria-busy');updateControls(run);}}
  }
  document.addEventListener('cms:session',clear);
  return Object.freeze({show,clear,destroy(){
    if(destroyed)return;document.removeEventListener('cms:session',clear);clear();destroyed=true;owned.remove();
  }});
}

