import {createPinkySelect,disposePinkySelects} from './pinky-select.mjs';
import {z} from 'zod';
import {canonicalJson} from '../contracts/draft.mjs';
import {projectClaimGroups,FIXED_SITE_ASSET_IDS,SITE_TEMPLATE_VERSION,collectSiteAssetIds} from '../contracts/site.mjs';
import {createSiteDraftSchemas,siteSourceCatalogSchema} from '../contracts/site-draft.mjs';
import {sourceCheckRecordSchema,sourceCheckReceiptSchema,sourceCheckCursorSchema,parseSourceCheckRequest,siteReviewNoteSchema} from '../contracts/source-checks.mjs';
import {strictSiteObject} from '../contracts/site-settings.mjs';
import {resourceIdSchema,hashSchema,revisionSchema} from '../contracts/hero.mjs';
import {APPROVED_SHOWREEL_SOURCE_URL} from './site-about-ip-editor.mjs';

const bytes=value=>new TextEncoder().encode(JSON.stringify(value)).length;
const same=(a,b)=>canonicalJson(a)===canonicalJson(b);
const compare=(a,b)=>a.claimPath<b.claimPath?-1:a.claimPath>b.claimPath?1:a.id<b.id?-1:a.id>b.id?1:0;
export function siteWorkflowNode(tag,text,id){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(id)node.id=id;return node;}
export function siteWorkflowField(parent,id,label,tag='input',options=[]){const wrap=siteWorkflowNode('div'),caption=siteWorkflowNode('label',label),control=tag==='select'?createPinkySelect(document,{id,label,value:options[0]?.value??'',options}):siteWorkflowNode(tag,undefined,id);caption.htmlFor=id;if(tag==='input')control.type='text';wrap.append(caption,control);parent.append(wrap);return control;}
export function siteWorkflowButton(parent,id,label,handler){const button=siteWorkflowNode('button',label,id);button.type='button';button.addEventListener('click',handler);parent.append(button);return button;}
export function siteWorkflowStatus(parent,id){const node=siteWorkflowNode('p','',id);node.setAttribute('role','status');node.setAttribute('aria-live','polite');parent.append(node);return node;}
export function assertWorkflowActive(isActive){if(!isActive())throw new DOMException('Nội dung đã được chuyển.','AbortError');}
export async function hashSiteValue(value,isActive=()=>true){const result=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonicalJson(value)));assertWorkflowActive(isActive);return [...new Uint8Array(result)].map(unit=>unit.toString(16).padStart(2,'0')).join('');}
async function hashText(value,isActive){const result=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));assertWorkflowActive(isActive);return [...new Uint8Array(result)].map(unit=>unit.toString(16).padStart(2,'0')).join('');}
export function snapshotBrowserContext(response){const sourceCatalog=siteSourceCatalogSchema.parse(response.sourceCatalog);return {catalog:response.snapshot.mediaManifest.map(asset=>({...asset,status:'LEGACY_READY',label:asset.id})),sourceCatalog,sourceIds:sourceCatalog.map(source=>source.id),fixedAssetIds:FIXED_SITE_ASSET_IDS,importLineage:response.snapshot.importLineage,currentYear:new Date().getUTCFullYear(),allowedShowreelSourceUrl:APPROVED_SHOWREEL_SOURCE_URL};}
/** Browser identity checks deliberately do not classify changes against the private baseline. */
export async function validateBrowserSnapshot(value,isActive=()=>true){
 if(bytes(value)>262144)throw new Error('Bản nội dung vượt giới hạn.');
 value=strictSiteObject({summary:z.unknown(),snapshot:z.unknown(),reviewState:z.unknown(),review:z.unknown(),sourceCatalog:z.unknown()}).parse(value);const context=snapshotBrowserContext(value),response=createSiteDraftSchemas(context).snapshotReadSchema.parse(value),snapshot=response.snapshot;
 if(snapshot.message!==undefined)siteReviewNoteSchema.max(500).parse(snapshot.message);
 const selected=collectSiteAssetIds(snapshot.content,context);
 if(!same(selected,snapshot.mediaManifest.map(asset=>asset.id)))throw new Error('Danh mục hình ảnh không khớp.');
 const mediaManifestHash=await hashSiteValue(snapshot.mediaManifest,isActive);
 const contentHash=await hashSiteValue({content:snapshot.content,mediaManifestHash,schemaVersion:2,templateVersion:SITE_TEMPLATE_VERSION},isActive);
 if(contentHash!==snapshot.contentHash || mediaManifestHash!==snapshot.mediaManifestHash)throw new Error('Hash bản nội dung không khớp.');
 const references=[];
 for(const reference of [...new Set(snapshot.mediaManifest.flatMap(asset=>asset.sourceRefs))].sort()){
  const hash=await hashText(reference,isActive);references.push({id:`source-${hash}`,kind:'SUPPLIED_FILE',privateDocumentId:`legacy-source-${hash}`,claimBindings:[],verification:'UNVERIFIED'});
 }
 if(!same(references,snapshot.sourceRefs))throw new Error('Nguồn hình ảnh không khớp.');
 const state=response.reviewState,review=response.review;
 if(new Set(Object.values(state.activeSourceCheckIds)).size!==Object.keys(state.activeSourceCheckIds).length || state.updatedAt<snapshot.submittedAt)throw new Error('Trạng thái không khớp.');
 if(state.sourceRevision===0 && (Object.keys(state.activeSourceCheckIds).length || (state.status==='IN_REVIEW' && state.updatedAt!==snapshot.submittedAt)))throw new Error('Trạng thái nguồn không khớp.');if(state.sourceRevision>0 && !Object.keys(state.activeSourceCheckIds).length)throw new Error('Thiếu chỉ mục nguồn.');
 if(review){if(!same([...review.sourceCheckIds].sort(),review.sourceCheckIds))throw new Error('Thứ tự chứng cứ đã ghim không khớp.');if(review.reviewedAt<snapshot.submittedAt)throw new Error('Thời điểm duyệt không khớp.');if(review.note!==undefined)siteReviewNoteSchema.parse(review.note);}
 assertWorkflowActive(isActive);return {response,context};
}
function supports(source,path){return source.supportedClaimPaths.includes(path) || ['projects','services','clientLogos'].some(family=>path.startsWith(`${family}/`) && path.endsWith('/facts') && source.supportedClaimPaths.includes(`${family}/*/facts`));}
export async function validateBrowserProof(value,selection,isActive=()=>true){
 const record=sourceCheckRecordSchema.parse(value),{snapshot,reviewState:state}=selection.response;
 if(bytes(record)>8192 || record.snapshotId!==snapshot.id || record.contentHash!==snapshot.contentHash || record.checkedBy===snapshot.submittedBy || record.checkedAt<snapshot.submittedAt || record.sourceRevision>state.sourceRevision || record.checkedAt>state.updatedAt)throw new Error('Chứng cứ không khớp bản nội dung.');
 const group=projectClaimGroups(snapshot.content,selection.context).find(group=>group.claimPath===record.claimPath);
 if(!group || await hashSiteValue(group.value,isActive)!==record.claimHash)throw new Error('Hash nhóm nội dung không khớp.');
 const binding=snapshot.content.claimSources.find(value=>value.claimPath===record.claimPath);
 for(const item of record.evidence){const source=selection.context.sourceCatalog.find(value=>value.id===item.sourceId);if(!source || !supports(source,record.claimPath) || item.sha256!==source.sha256 || (binding && !binding.sourceIds.includes(item.sourceId)) || (source.kind==='CREDENTIAL'?item.pages===undefined:item.pages!==undefined))throw new Error('Nguồn chứng cứ không khớp.');}
 if(selection.response.review && record.checkedAt>selection.response.review.reviewedAt)throw new Error('Chứng cứ có sau quyết định duyệt.');
 assertWorkflowActive(isActive);return record;
}
export const sourcePageSchema=strictSiteObject({snapshotId:resourceIdSchema,contentHash:hashSchema,view:z.enum(['ACTIVE','APPROVED']),sourceRevision:revisionSchema,checks:z.array(sourceCheckRecordSchema).max(50),nextCursor:z.string().min(1).max(2048).nullable()});
export async function readBrowserSourcePage(apiFetch,selection,{view='ACTIVE',cursor}={},isActive=()=>true){
 const {snapshot,reviewState}=selection.response,query=new URLSearchParams({pageSize:'20',...(cursor?{cursor}:{})});
 // APPROVED is selected by terminal snapshot status on the server, never a caller query.
 if((view==='APPROVED')!==(reviewState.status==='APPROVED'))throw new Error('Chọn đúng trạng thái chứng cứ.');
 const raw=await apiFetch(`/api/cms/snapshots/${snapshot.id}/source-checks?${query}`);assertWorkflowActive(isActive);
 if(bytes(raw)>131072)throw new Error('Trang chứng cứ vượt giới hạn.');
 const page=sourcePageSchema.parse(raw);
 if(page.snapshotId!==snapshot.id || page.contentHash!==snapshot.contentHash || page.view!==view || page.sourceRevision!==reviewState.sourceRevision)throw new Error('Phiên bản chứng cứ đã thay đổi. Mở lại bản nội dung.');
 const checks=[];for(const record of page.checks)checks.push(await validateBrowserProof(record,selection,isActive));
 if(checks.some((record,index)=>index>0 && compare(checks[index-1],record)>=0))throw new Error('Thứ tự chứng cứ không khớp.');
 const ids=view==='APPROVED'?selection.response.review.sourceCheckIds:Object.values(reviewState.activeSourceCheckIds);
 if(checks.some(record=>!ids.includes(record.id) || selection.response.reviewState.activeSourceCheckIds[record.claimPath]!==record.id))throw new Error('Chứng cứ không thuộc trạng thái đã chọn.');
 if(page.nextCursor){const text=new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(page.nextCursor.replaceAll('-','+').replaceAll('_','/')+'='.repeat((4-page.nextCursor.length%4)%4)),c=>c.charCodeAt(0)));const parsed=sourceCheckCursorSchema.parse(JSON.parse(text)),last=checks.at(-1);if(!last || parsed.snapshotId!==snapshot.id || parsed.contentHash!==snapshot.contentHash || parsed.view!==view || parsed.sourceRevision!==reviewState.sourceRevision || parsed.lastClaimPath!==last.claimPath || parsed.lastId!==last.id)throw new Error('Con trỏ chứng cứ không khớp.');}
 return {...page,checks};
}
export async function createSiteQaEnvelope(selection,checks,isActive=()=>true){
 const checked=await validateBrowserSnapshot(selection.response,isActive),{snapshot,reviewState,review}=checked.response;
 if(reviewState.status!=='APPROVED' || !review || review.outcome!=='APPROVED')throw new Error('Chỉ tải bản đã chấp thuận.');
 const records=[];for(const value of checks)records.push(await validateBrowserProof(value,checked,isActive));records.sort(compare);
 const ids=records.map(record=>record.id);
 if(records.length>61 || new Set(ids).size!==ids.length || !same([...ids].sort(),[...review.sourceCheckIds].sort()) || records.some(record=>reviewState.activeSourceCheckIds[record.claimPath]!==record.id))throw new Error('Tập chứng cứ đã ghim không khớp.');
 if(review.creativeCopyDeclaration==='SOURCE_CHECKED' && !records.some(record=>record.claimPath==='creative-copy'))throw new Error('Thiếu chứng cứ đã ghim cho nội dung sáng tạo.');
 if(await hashSiteValue(records,isActive)!==review.attestationSetHash)throw new Error('Hash tập chứng cứ không khớp.');
 const envelope={qaEnvelopeVersion:2,snapshot,reviewState,review,sourceChecks:records};if(bytes(envelope)>1048576)throw new Error('Tệp QA vượt giới hạn.');assertWorkflowActive(isActive);return envelope;
}
/** Member paging and human attestation; no browser baseline or factual-truth claim. */
export function mountSourceReview(container,{apiFetch,session,readOnly=false,getSelection,onRefresh,isActive,onBusy,isBusy}){
 const root=siteWorkflowNode('section',undefined,'site-source-panel');root.className='card';root.style.minWidth='0';root.style.overflowWrap='anywhere';container.append(root);root.append(siteWorkflowNode('h3','Nguồn và đối chiếu thủ công'),siteWorkflowNode('p','UNVERIFIED: nguồn được cung cấp chưa chứng minh sự thật hay quyền sử dụng. SOURCE_CHECKED là xác nhận đối chiếu của người duyệt cho đúng nhóm nội dung. Máy chủ quyết định nhóm nào cần chứng cứ.'));
 const view=siteWorkflowField(root,'site-source-view','Tập chứng cứ','select',[{value:'ACTIVE',label:'ACTIVE'},{value:'APPROVED',label:'APPROVED'}]);view.disabled=true;
 const load=siteWorkflowButton(root,'site-source-load','Tải chứng cứ',()=>void page(false)),next=siteWorkflowButton(root,'site-source-next','Trang tiếp',()=>void page(true)),status=siteWorkflowStatus(root,'site-source-status'),list=siteWorkflowNode('div',undefined,'site-source-checks'),catalogView=siteWorkflowNode('div',undefined,'site-source-catalog'),groups=siteWorkflowNode('div',undefined,'site-source-groups');root.append(catalogView,list,groups);
 const note=siteWorkflowField(root,'site-source-note','Ghi chú đối chiếu','textarea');note.maxLength=1000;
 const submit=siteWorkflowButton(root,'site-source-submit','Lưu đối chiếu các nhóm đã chọn',()=>void write());
 let disposed=false,generation=0,selection=null,intent=null,records=[],cursor=null,seen=new Set(),busy=false;
 const writable=()=>!readOnly && selection && ['REVIEWER','OWNER'].includes(session.role) && selection.response.snapshot.submittedBy!==session.uid && (selection.response.reviewState.status==='IN_REVIEW' || intent?.body.snapshotId===selection.response.snapshot.id);
 function active(serial,captured){return !disposed && serial===generation && isActive() && getSelection()===captured;}
 function controls(){const locked=busy || isBusy();load.disabled=locked || !selection || Boolean(intent);next.disabled=locked || !cursor;submit.disabled=locked || !writable();note.disabled=locked || !writable() || Boolean(intent);for(const control of groups.querySelectorAll('input,textarea,select,button'))control.disabled=locked || !writable() || Boolean(intent);}
 function failure(error){if(error.name!=='AbortError')status.textContent=error.code?error.message:'Không thể xác nhận chứng cứ. Vui lòng thử lại hoặc mở lại bản nội dung.';}
 function readable(value){const pre=siteWorkflowNode('pre',JSON.stringify(value,null,2));pre.style.whiteSpace='pre-wrap';pre.style.overflowWrap='anywhere';pre.style.maxWidth='100%';return pre;}
 function renderCatalog(){disposePinkySelects(catalogView);catalogView.replaceChildren();if(!selection)return;catalogView.append(siteWorkflowNode('h4','Nguồn được cung cấp — UNVERIFIED'));for(const source of selection.context.sourceCatalog){const details=siteWorkflowNode('details');details.dataset.sourceCatalogId=source.id;details.append(siteWorkflowNode('summary',source.title),siteWorkflowNode('p',`${source.kind} — ${source.id} — SHA-256: ${source.sha256}`));if(source.excerpt!==undefined)details.append(siteWorkflowNode('p',source.excerpt));if(source.kind==='CREDENTIAL'){details.append(siteWorkflowNode('p',`${source.pageCount} trang PDF. Người duyệt cần xem nguồn và xác nhận toàn nhóm.`));const link=siteWorkflowNode('a','Mở credential local');link.href=source.publicCredentialUrl;link.target='_blank';link.rel='noopener noreferrer';details.append(link);}details.append(siteWorkflowNode('p','Nguồn này chưa phải xác nhận sự thật hoặc quyền sử dụng.'));catalogView.append(details);}}
 function renderRecords(){disposePinkySelects(list);list.replaceChildren();for(const record of records){const row=siteWorkflowNode('details');row.dataset.sourceCheckId=record.id;row.dataset.claimPath=record.claimPath;row.append(siteWorkflowNode('summary',`${record.claimPath} — SOURCE_CHECKED — ${record.id}`),siteWorkflowNode('p',`Người đối chiếu: ${record.checkedBy}`),siteWorkflowNode('p',`Thời điểm: ${record.checkedAt} — phiên bản nguồn: ${record.sourceRevision}`),siteWorkflowNode('p',`Hash nhóm: ${record.claimHash}`));for(const evidence of record.evidence)row.append(siteWorkflowNode('p',`Nguồn: ${evidence.sourceId} — SHA-256: ${evidence.sha256}${evidence.pages?' — trang: '+evidence.pages.join(', '):''}`));if(record.note!==undefined)row.append(siteWorkflowNode('p',`Ghi chú: ${record.note}`));list.append(row);}}

 async function page(more){if(busy || isBusy() || !selection)return;const captured=selection,serial=++generation,guard=()=>active(serial,captured);busy=true;onBusy(true);controls();try{if(!more){records=[];cursor=null;seen=new Set();renderRecords();}const result=await readBrowserSourcePage(apiFetch,captured,{view:view.value,...(more?{cursor}:{})},guard);if(more && records.length && result.checks.length && compare(records.at(-1),result.checks[0])>=0)throw new Error('Thứ tự trang không khớp.');if(result.checks.some(record=>records.some(old=>old.id===record.id)) || records.length+result.checks.length>61 || (result.nextCursor && seen.has(result.nextCursor)))throw new Error('Trang chứng cứ bị lặp.');if(result.nextCursor)seen.add(result.nextCursor);records.push(...result.checks);cursor=result.nextCursor;if(!cursor){const ids=view.value==='APPROVED'?captured.response.review.sourceCheckIds:Object.values(captured.response.reviewState.activeSourceCheckIds);if(view.value==='ACTIVE' && captured.response.reviewState.sourceRevision>0 && !records.some(record=>record.sourceRevision===captured.response.reviewState.sourceRevision))throw new Error('Thiếu phiên bản đối chiếu hiện tại.');if(!same(records.map(value=>value.id).sort(),[...ids].sort()))throw new Error('Thiếu chứng cứ trong tập đã chọn.');}renderRecords();status.textContent=`Đã đọc ${records.length} chứng cứ.`;}catch(error){if(guard()){records=[];cursor=null;seen=new Set();renderRecords();failure(error);}}finally{if(guard()){busy=false;onBusy(false);controls();}}}
 function buildGroups(){disposePinkySelects(groups);groups.replaceChildren();if(!selection)return;for(const group of projectClaimGroups(selection.response.snapshot.content,selection.context)){
  const row=siteWorkflowNode('fieldset');row.dataset.claimPath=group.claimPath;row.append(siteWorkflowNode('legend',group.claimPath));const facts=siteWorkflowNode('details');facts.dataset.sourceFacts='';facts.append(siteWorkflowNode('summary','Nội dung chính xác của nhóm (chỉ đọc)'),readable(group.value));row.append(facts);const chosen=siteWorkflowField(row,`site-source-group-${groups.children.length}`,'Chọn nhóm');chosen.type='checkbox';chosen.dataset.sourceSelect='';row.append(siteWorkflowNode('p','Trạng thái yêu cầu chứng cứ do máy chủ kiểm tra; không suy diễn từ câu chữ.'));
  const binding=selection.response.snapshot.content.claimSources.find(value=>value.claimPath===group.claimPath);
  for(const source of selection.context.sourceCatalog.filter(source=>supports(source,group.claimPath) && (!binding || binding.sourceIds.includes(source.id)))){const control=siteWorkflowField(row,`${chosen.id}-${source.id}`,source.title);control.type='checkbox';control.dataset.sourceId=source.id;if(source.kind==='CREDENTIAL'){const pages=siteWorkflowField(row,`${control.id}-pages`,'Trang PDF (1–48, tăng dần, cách nhau bằng dấu phẩy)');pages.dataset.sourcePages=source.id;pages.maxLength=160;}}
  groups.append(row);const captured=selection,serial=generation;void hashSiteValue(group.value,()=>active(serial,captured)).then(hash=>{if(active(serial,captured)){row.dataset.claimHash=hash;const output=siteWorkflowNode('p',`Hash nhóm: ${hash}`);row.append(output);}}).catch(()=>{});
 }}
 async function write(){if(busy || isBusy() || !writable())return;const captured=selection,serial=++generation,guard=()=>active(serial,captured);try{
  if(!intent){const checks=[...groups.querySelectorAll('fieldset[data-claim-path]')].filter(row=>row.querySelector('[data-source-select]').checked).map(row=>({claimPath:row.dataset.claimPath,evidence:[...row.querySelectorAll('[data-source-id]')].filter(control=>control.checked).map(control=>{const pages=row.querySelector(`[data-source-pages="${control.dataset.sourceId}"]`);return {sourceId:control.dataset.sourceId,...(pages?{pages:pages.value.split(',').map(value=>{if(!/^(?:[1-9]|[1-3][0-9]|4[0-8])$/.test(value.trim()))throw new Error('Nhập đúng trang PDF.');return Number(value.trim());})}:{})};})}));const body=parseSourceCheckRequest({snapshotId:captured.response.snapshot.id,contentHash:captured.response.snapshot.contentHash,expectedReviewRevision:0,expectedSourceRevision:captured.response.reviewState.sourceRevision,checks,...(note.value?{note:note.value}:{})});intent={key:crypto.randomUUID(),body,serialized:JSON.stringify(body)};}
  busy=true;onBusy(true);controls();status.textContent='Đang lưu đối chiếu…';const raw=await apiFetch('/api/cms/source-checks',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':intent.key},body:intent.serialized});assertWorkflowActive(guard);const receipt=sourceCheckReceiptSchema.parse(raw);if(receipt.snapshotId!==intent.body.snapshotId || receipt.contentHash!==intent.body.contentHash || receipt.sourceRevision!==intent.body.expectedSourceRevision+1 || receipt.sourceCheckIds.length!==intent.body.checks.length)throw new Error('Biên nhận không khớp.');const refreshed=await onRefresh(guard);assertWorkflowActive(isActive);if(refreshed.response.reviewState.sourceRevision<receipt.sourceRevision)throw new Error('Phiên bản đối chiếu không khớp.');if(refreshed.response.reviewState.sourceRevision===receipt.sourceRevision && !same(intent.body.checks.map(check=>refreshed.response.reviewState.activeSourceCheckIds[check.claimPath]).sort(),[...receipt.sourceCheckIds].sort()))throw new Error('Biên nhận chứng cứ không khớp chỉ mục.');intent=null;status.textContent='Đã lưu đối chiếu của người duyệt.';
 }catch(error){if(isActive() && !disposed){if(error.status>=400 && error.status<500 && error.code && error.code!=='IDEMPOTENCY_IN_PROGRESS')intent=null;failure(error);}}finally{if(!disposed && isActive()){busy=false;onBusy(false);controls();}}}
 return {setSelection(value){view.pinkySelect.close();generation++;selection=value;records=[];cursor=null;seen=new Set();view.value=value?.response.reviewState.status==='APPROVED'?'APPROVED':'ACTIVE';renderCatalog();renderRecords();buildGroups();controls();},setBusy:controls,hasIntent:()=>Boolean(intent),canLeave:()=>!intent || window.confirm('Kết quả đối chiếu chưa được xác nhận. Rời nội dung?'),destroy(){disposed=true;generation++;selection=null;intent=null;records=[];disposePinkySelects(root);root.remove();}};
}
