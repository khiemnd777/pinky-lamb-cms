import {mountSiteReview} from './review.mjs';
import {createCmsIcon} from './cms-icons.mjs';

/** Keep the schema-2 reader and exact-snapshot guards. Never create a v2 draft/submission. */
export function mountSiteLegacyHistory(container,{apiFetch,session}){
 const doc=container.ownerDocument,details=doc.createElement('details'),summary=doc.createElement('summary'),hint=doc.createElement('p'),host=doc.createElement('div');
 details.className='ux-legacy-history cms-review-card';details.dataset.cmsPane='review';summary.append(createCmsIcon('History'),doc.createTextNode('Trước nâng cấp'));
 hint.className='cms-hint';hint.textContent='Mở snapshot home-v2 bằng mã đã lưu. Bản gốc, hash và lịch sử được giữ nguyên; không đồng bộ hoặc nhập lại vào Toàn website.';
 details.append(summary,hint,host);container.append(details);
 const workflow=mountSiteReview(host,{apiFetch,session,legacyOnly:true});
 const beforeUnload=event=>{if(workflow.hasIntent()){event.preventDefault();event.returnValue='';}};
 const clearPreview=()=>doc.dispatchEvent(new CustomEvent('cms:legacy-preview-clear'));
 const click=event=>{if(event.target.closest?.('#v3-saved-preview,#v3-snapshot-open,#v3-snapshot'))clearPreview();};
 const snapshot=event=>{if(event.detail&&details.open){for(const panel of doc.querySelectorAll('.site-media-preview'))panel.hidden=true;}};
 details.addEventListener('toggle',()=>{if(!details.open)clearPreview();});doc.addEventListener('click',click);doc.addEventListener('cms:site-snapshot',snapshot);doc.defaultView.addEventListener('beforeunload',beforeUnload);
 return {canLeave:()=>workflow.canLeave(),destroy(){doc.removeEventListener('click',click);doc.removeEventListener('cms:site-snapshot',snapshot);doc.defaultView.removeEventListener('beforeunload',beforeUnload);workflow.destroy();clearPreview();details.remove();}};
}
