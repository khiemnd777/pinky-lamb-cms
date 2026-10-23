import {sharedFileSummarySchema} from '../contracts/shared-file-publication.mjs';
import {websitePublishSchema} from '../contracts/website-publication.mjs';
import {canonicalJson} from '../contracts/draft.mjs';
import {createFullSiteLocalizationPreview} from './full-site-localization-preview.mjs';
const member=s=>s?JSON.stringify([s.uid,s.role,s.authzVersion]):null;
export function createWebsitePublicationPreparation(root,{apiFetch,getSession,labelResource,onConfirm}){
 root.classList.add('cms-publication-preparation');const doc=root.ownerDocument,identity=member(getSession());let generation=0,controller,preview,busy=false,disposed=false;
 const node=(tag,text)=>{const el=doc.createElement(tag);if(text)el.textContent=text;return el;};
 function clear(){generation++;controller?.abort();preview?.destroy();preview=null;busy=false;root.replaceChildren();}
 async function prepare(selection){clear();if(disposed||!identity||identity!==member(getSession()))return;const n=generation;controller=new AbortController();const signal=controller.signal;busy=true;const status=node('p','Đang đối chiếu phạm vi xuất bản…');status.setAttribute('role','status');root.append(status);
  try{const result=await apiFetch('/api/cms/localizations/website/prepare',{method:'POST',signal,headers:{'Content-Type':'application/json','Idempotency-Key':crypto.randomUUID()},body:JSON.stringify(selection)});if(disposed||n!==generation||identity!==member(getSession())||signal.aborted)return;
   if(canonicalJson(result.selection)!==canonicalJson(selection))throw Error('Phạm vi phản hồi không khớp bản đã chọn.');
   if(result.mode==='SELECTED'){root.replaceChildren();if(doc.defaultView.confirm('Xuất bản '+labelResource(selection.resource)+' · '+selection.resource.locale.toUpperCase()+' lên Website local? Các nội dung khác giữ nguyên.'))await onConfirm(selection);return;}
   if(result.mode!=='SHARED_FILES')throw Error('Phạm vi xuất bản không hợp lệ.');
   const {hash,baseSnapshotSetHash,changes,files,resources}=result;sharedFileSummarySchema.parse({hash,baseSnapshotSetHash,changes,files,resources});const locales=[...new Set(resources.map(r=>r.locale))];if(!Array.isArray(result.previews)||result.previews.length!==locales.length||locales.some(l=>!result.previews.some(q=>q.locale===l)))throw Error('Thiếu bản xem trước phạm vi file.');
   root.replaceChildren(node('h3','Xác nhận cập nhật file dùng chung'),node('p','Nội dung được chọn sẽ dùng bản đã lưu. Các nơi phụ thuộc giữ nội dung đang công khai và chỉ đổi file; draft mới hơn không được xuất bản.'));
   const list=node('ul');for(const r of resources)list.append(node('li',labelResource(r)+' · '+r.locale.toUpperCase()+(canonicalJson(r)===canonicalJson(selection.resource)?' · Bản đã chọn':' · Chỉ cập nhật file')));root.append(node('p',files.map(f=>f.name+' · '+f.kind).join(' / ')),node('p',resources.length+' nội dung · '+locales.length+' ngôn ngữ'),list);
   const controls=node('div'),previewRoot=node('section');controls.className='cms-control-group';preview=createFullSiteLocalizationPreview(previewRoot,{apiFetch,getSession});for(const qa of result.previews){const button=node('button','Xem trước '+qa.locale.toUpperCase());button.type='button';button.addEventListener('click',()=>void preview.show(qa.locale,{mode:'APPROVED_RELEASE',providedQa:structuredClone(qa),expectedDependencyHash:qa.dependencyHash}));controls.append(button);}
   const confirm=node('button','Xác nhận cập nhật '+resources.length+' nội dung'),cancel=node('button','Hủy chuẩn bị');confirm.type=cancel.type='button';cancel.addEventListener('click',clear);confirm.addEventListener('click',async()=>{if(identity!==member(getSession())||n!==generation||disposed)return;const body=websitePublishSchema.parse({...selection,fileConfirmation:{hash,baseSnapshotSetHash}});confirm.disabled=cancel.disabled=true;preview?.clear();await onConfirm(body);});const actions=node('div');actions.className='cms-control-group cms-publication-actions';actions.append(confirm,cancel);root.append(controls,previewRoot,actions);
  }catch(error){if(!signal.aborted&&n===generation&&identity===member(getSession())){root.replaceChildren(node('p',error.message||'Không chuẩn bị được phạm vi. Tải lại bản đã lưu.'));}}
  finally{if(n===generation)busy=false;}
 }
 const session=()=>{if(identity!==member(getSession()))clear();};doc.addEventListener('cms:session',session);return {prepare,clear,canLeave:()=>!busy,destroy(){disposed=true;clear();doc.removeEventListener('cms:session',session);}};
}
