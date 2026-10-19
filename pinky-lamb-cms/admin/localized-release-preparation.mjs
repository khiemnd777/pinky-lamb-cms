import {localizedPrivateResourcePath} from '../preview/localized-resource-transport.mjs';
import {contentReadinessStatusSchema} from '../contracts/content-workspace.mjs';
import {parseLocalizedReleaseReadiness} from '../contracts/localized-review-records.mjs';
import {releaseResourceDescriptors,RELEASE_BYTE_BUDGET} from '../contracts/localized-release-package.mjs';
import {canonicalJson} from '../contracts/draft.mjs';

const digest=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(value=>value.toString(16).padStart(2,'0')).join('');
const encode=bytes=>{let value='';for(let i=0;i<bytes.length;i+=6144)value+=btoa(String.fromCharCode(...bytes.subarray(i,i+6144)));return value;};
const member=value=>value?JSON.stringify([value.uid,value.role,value.authzVersion]):null;
const locales={en:'Tiếng Anh',vi:'Tiếng Việt',ja:'Tiếng Nhật'};

/** Only authenticated derivative bytes cross the browser handoff. Pinned legacy bytes are resolved offline by the exporter. */
export async function buildLocalizedReleaseHandoff(input,{apiFetch,signal,assertCurrent=()=>{}}){
 const {release,resources}=releaseResourceDescriptors(input);
 const projection=release.entries.map(entry=>({locale:entry.locale,dependencyVector:entry.dependencyVector,dependencyHash:entry.dependencyHash}));
 if(await digest(new TextEncoder().encode(canonicalJson(projection)))!==release.snapshotSetHash)throw Error('Bộ bản xuất bản đã thay đổi. Hãy tải lại.');
 const files=[];let total=0;
 for(const resource of resources.values()){
  assertCurrent();signal?.throwIfAborted();let bytes;
  if(resource.inlineBase64!==undefined){const text=atob(resource.inlineBase64);if(btoa(text)!==resource.inlineBase64)throw Error('Dữ liệu tài nguyên không hợp lệ.');bytes=Uint8Array.from(text,value=>value.charCodeAt(0));}
  else if(resource.derivative){
   bytes=(await apiFetch(localizedPrivateResourcePath(resource),{signal,responseType:'bytes',derivative:resource.derivative,maxBytes:resource.sizeBytes})).bytes;
  }else{
   const url=new URL(resource.url);
   if(url.origin!=='http://127.0.0.1:5010'||url.pathname!=='/'+resource.path||url.search||url.hash)throw Error('Tài nguyên không thuộc nguồn đã khóa.');
   continue;
  }
  if(!(bytes instanceof Uint8Array)||bytes.length!==resource.sizeBytes||await digest(bytes)!==resource.sha256)throw Error('Tài nguyên đã thay đổi. Hãy chuẩn bị lại gói website.');
  total+=bytes.length;if(total>RELEASE_BYTE_BUDGET)throw Error('Gói website vượt giới hạn dung lượng.');
  files.push({path:resource.path,base64:encode(bytes)});
 }
 assertCurrent();signal?.throwIfAborted();return {release,files};
}

export function mountLocalizedReleasePreparation(root,{apiFetch,getSession,labelResource=resource=>resource.entityId}){
 const doc=root.ownerDocument,view=doc.defaultView,initial=member(getSession());let destroyed=false,pending=false,readiness=null,error='',controller,website=null,pollTimer,pollDeadline=0,readinessTimer,readinessState=null;
 const active=()=>!destroyed&&member(getSession())===initial;
 const current=()=>{if(!active()||controller?.signal.aborted)throw new DOMException('Phiên đã thay đổi.','AbortError');};
 const node=(tag,text)=>{const el=doc.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
 async function run(action){if(pending||!active())return;controller=new AbortController();pending=true;error='';render();try{await action(controller.signal);current();}catch(failure){if(active()&&failure.name!=='AbortError'){error=failure.message||'Chưa chuẩn bị được bản website.';readiness=null;}}finally{if(active()){pending=false;render();}}}
 function load(){return run(async signal=>{const [ready,status]=await Promise.all([apiFetch('/api/cms/localizations/editorial/readiness',{signal}),getSession()?.role==='OWNER'?apiFetch('/api/cms/localizations/website/status',{signal}):Promise.resolve(null)]);if(ready.kind==='CONTENT_READINESS_STATUS'){const value=contentReadinessStatusSchema.parse(ready);readinessState=value.state;readiness=value.readiness?parseLocalizedReleaseReadiness(value.readiness):null;view.clearTimeout(readinessTimer);if(['PENDING','RUNNING'].includes(value.state))readinessTimer=view.setTimeout(()=>void load(),1000);if(value.state==='FAILED')error='Chưa kiểm tra được điều kiện xuất bản ('+value.errorCode+').';}else{readinessState=null;readiness=parseLocalizedReleaseReadiness(ready);}website=status;if(website?.job?.state==='RUNNING'){pollDeadline=Date.now()+30*60000;schedulePoll();}});}
 function schedulePoll(){view.clearTimeout(pollTimer);if(!active()||website?.job?.state!=='RUNNING')return;pollTimer=view.setTimeout(()=>void poll(),2000);}
 async function poll(){if(!active())return;try{website=await apiFetch('/api/cms/localizations/website/status');if(!active())return;if(website.job?.state==='RUNNING'&&Date.now()<pollDeadline){render();schedulePoll();}else{if(website.job?.state==='RUNNING')error='Tác vụ vẫn đang chạy. Dùng Kiểm tra điều kiện để đọc trạng thái mới.';readiness=null;render();if(website.job?.state==='COMPLETED')void load();}}catch(failure){if(active()){error=failure.message;render();}}}
 function command(action){return run(async signal=>{await apiFetch('/api/cms/localizations/website/'+action,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':crypto.randomUUID()},body:'{}',signal});website=await apiFetch('/api/cms/localizations/website/status',{signal});pollDeadline=Date.now()+30*60000;schedulePoll();});}
 async function download(){return run(async signal=>{
  const release=await apiFetch('/api/cms/localizations/editorial/release',{signal});current();
  const bundle=await buildLocalizedReleaseHandoff(release,{apiFetch,signal,assertCurrent:current});current();
  const blob=new view.Blob([JSON.stringify(bundle)],{type:'application/json'}),url=view.URL.createObjectURL(blob),link=node('a');
  link.href=url;link.download=`pinky-lamb-website-${bundle.release.snapshotSetHash.slice(0,16)}.json`;root.append(link);
  try{link.click();}finally{link.remove();view.setTimeout(()=>view.URL.revokeObjectURL(url),1000);}
 });}
 function render(){
  root.replaceChildren();root.className='release-preparation';root.setAttribute('aria-label','Chuẩn bị bản website');
  root.append(node('h3','Website local · ba ngôn ngữ'),node('p','Mở đúng bản nháp và chọn Xuất bản để cập nhật nội dung, ngôn ngữ đó lên :4189. Các nội dung khác giữ nguyên bản đang chạy.'));
  const busy=pending||website?.job?.state==='RUNNING',owner=getSession()?.role==='OWNER';
  if(website?.job){const job=website.job,progress=node('p',job.stage+' · '+job.state);progress.setAttribute('role','status');root.append(progress);if(job.error)root.append(node('p','Bị chặn: '+job.error.message));}
  if(website?.seed)root.append(node('p',`${website.seed.media.length} media READY · ${website.seed.resources.length} bản nội dung đã seed.`));
  if(website?.website){root.append(node('p','Bản đang chạy: '+website.website.releaseId));const link=node('a','Mở website :4189 ↗');link.href='http://127.0.0.1:4189/';link.target='_blank';link.rel='noopener';root.append(link);}
  const websiteActions=node('div');websiteActions.className='compact-actions';
  for(const [action,label,disabled]of [['rollback','Khôi phục bản website trước',!owner||busy||!website?.website?.previous]]){const b=node('button',label);b.type='button';b.disabled=disabled;b.addEventListener('click',()=>void command(action));websiteActions.append(b);}
  if(website?.pdfRecoveryAvailable){const recover=node('button','Phục hồi PDF local đã duyệt');recover.type='button';recover.disabled=busy||!owner;recover.addEventListener('click',()=>void command('recover-pdf'));websiteActions.append(recover);}
  if(website?.blockedMedia){root.append(node('p','Xử lý media: '+website.blockedMedia.state));if(website.blockedMedia.canRetry){const retry=node('button','Tiếp tục media sau sửa lỗi');retry.type='button';retry.disabled=busy||!owner;retry.addEventListener('click',()=>void command('retry-media'));websiteActions.append(retry);}}root.append(websiteActions);
  const seedDetails=node('details');seedDetails.append(node('summary','Khởi tạo dữ liệu từ template đóng gói'));seedDetails.append(node('p','Seed nội dung và media thật; bảo lưu dữ liệu trước ghi và lịch sử cũ. Tiêu đề tiếng Anh dùng chung; nội dung EN/JA đã dịch theo nguồn. Seed không tự xuất bản.'));const seedButton=node('button',website?.seed?.state==='COMPLETED'?'Đã seed từ bản gốc':'Seed dữ liệu và media từ template đóng gói');seedButton.type='button';seedButton.disabled=!owner||busy||website?.seed?.state==='COMPLETED';seedButton.addEventListener('click',()=>void command('seed'));seedDetails.append(seedButton);root.append(seedDetails);
  if(error){const notice=node('p',error);notice.setAttribute('role','status');root.append(notice);}
  if(['PENDING','RUNNING'].includes(readinessState))root.append(node('p','Đang cập nhật điều kiện xuất bản theo phiên bản mới nhất…'));
  if(readiness){
   root.append(node('p',readiness.ready?'Đủ nội dung để chuẩn bị gói website.':'Chưa đủ nội dung đã xuất bản cho cả ba ngôn ngữ.'));
   const list=node('div');list.className='release-readiness';
   for(const locale of readiness.locales){const details=node('details'),summary=node('summary',`${locales[locale.locale]} · ${locale.eligible?'Sẵn sàng':'Chưa đủ nội dung'}`);details.append(summary);
    for(const item of locale.resources.filter(item=>item.mandatory&&item.reason!=='ELIGIBLE'))details.append(node('p',`${labelResource(item.resource)} · ${item.reason==='STALE'?'Cần cập nhật nguồn':'Chưa xuất bản'}`));
    for(const section of locale.sectionReadiness.filter(item=>!item.ready))details.append(node('p',`${section.sectionId==='work'?'Dự án':'Dịch vụ'} · Chưa có nội dung đã xuất bản hợp lệ`));
    list.append(details);
   }root.append(list);
  }
  const actions=node('div');actions.className='compact-actions';const refresh=node('button',pending?'Đang xử lý…':'Kiểm tra điều kiện'),save=node('button','Tải gói website');
  refresh.type=save.type='button';refresh.disabled=pending;save.disabled=busy||!readiness?.ready||getSession()?.role!=='OWNER';
  refresh.addEventListener('click',()=>void load());save.addEventListener('click',()=>void download());actions.append(refresh,save);root.append(actions);
 }
 render();void load();return {load,destroy(){destroyed=true;view.clearTimeout(pollTimer);view.clearTimeout(readinessTimer);controller?.abort();root.remove();}};
}
