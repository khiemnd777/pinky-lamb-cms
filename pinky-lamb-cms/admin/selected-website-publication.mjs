import {websitePublishSchema} from '../contracts/website-publication.mjs';
import {canonicalJson} from '../contracts/draft.mjs';
import {selectedWebsiteReceiptSchema} from '../contracts/localized-review-records.mjs';

function delay(ms,signal){return new Promise((resolve,reject)=>{
 signal?.throwIfAborted();const abort=()=>{clearTimeout(timer);reject(signal.reason??new DOMException('Aborted','AbortError'));};
 const timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve();},ms);signal?.addEventListener('abort',abort,{once:true});
});}
/** Keep the command key/body on uncertain results; never automatically restart a blocked job. */
export async function publishSelectedWebsite({apiFetch,body,key,signal,onProgress=()=>{},wait=delay,maxPolls=300}){
 websitePublishSchema.parse(body);
 let job=await apiFetch('/api/cms/localizations/website/publish',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(body),signal});
 const id=job.id;
 for(let poll=0;poll<=maxPolls;poll++){
  signal?.throwIfAborted();
  if(typeof id!=='string'||job.id!==id||job.kind!=='PUBLISH'||canonicalJson(job.selection)!==canonicalJson(body))throw Error('Tác vụ phản hồi không khớp nội dung đã chọn. Giữ nguyên thao tác để kiểm tra lại.');
  onProgress(job.stage);
  if(job.state==='COMPLETED'){
   const receipt=selectedWebsiteReceiptSchema.parse(job.result);
   if(canonicalJson(receipt.resource)!==canonicalJson(body.resource)||receipt.revision!==body.expectedRevision)throw Error('Kết quả không khớp phiên bản đã chọn.');
   return receipt;
  }
  if(job.state==='BLOCKED'){const error=Error('Chưa cập nhật website. '+(job.error?.message??'Giữ bản website trước và thử lại cùng thao tác.'));error.jobBlocked=true;throw error;}
  if(job.state!=='RUNNING')throw Error('Chưa xác định được trạng thái xuất bản.');
  if(poll===maxPolls)throw Error('Tác vụ chưa có kết quả cuối. Giữ nguyên thao tác để kiểm tra lại.');
  await wait(1000,signal);const response=await apiFetch('/api/cms/localizations/website/status',{signal});job=response.job;
  if(!job)throw Error('Chưa đọc được kết quả thao tác.');
 }
}
