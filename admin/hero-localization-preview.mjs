import {localizedPrivateResourcePath} from '../preview/localized-resource-transport.mjs';
import {parseHeroQa,heroQaResourceSchema} from '../contracts/hero-localization-records.mjs';
import {renderLocalizedHeroDocument,validateHeroQaRelationships,validateHeroPreviewImageResource} from '../preview/hero-localization-renderer.mjs';
import {acquireMediaPreviewBinary,registerMediaPreviewResourceOwner} from './media-file-preview.mjs';
const digest=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
const PREVIEW_CAP=64*1024*1024;
/** One conservative logical charge; does not claim physical heap or GC bounds. */
export function planHeroPreviewBudget(input,{cap=PREVIEW_CAP}={}){
 const qa=validateHeroQaRelationships(input);if(qa.contractRevision!==2)throw Error('QA2 preview required');
 const images=qa.resources.filter(r=>r.mimeType.startsWith('image/')),h0=new TextEncoder().encode(renderLocalizedHeroDocument(qa)).length;
 let raw=0,encoded=0,html=h0;const add=(a,b)=>{const n=a+b;if(!Number.isSafeInteger(n)||n<0)throw Error('PREVIEW_BYTES');return n;};
 for(const r of images){validateHeroPreviewImageResource(r);const b=add(`data:${r.mimeType};base64,`.length,4*Math.ceil(r.sizeBytes/3)),occurrences=[qa.presentation.brand.logoResourceId,qa.hero.image.assetId].filter(id=>id===r.id).length;raw=add(raw,r.sizeBytes);encoded=add(encoded,b);html=add(html,occurrences*b);}
 const bytes=add(add(add(raw,encoded),2*html),32768);if(!Number.isSafeInteger(cap)||cap<1||cap>PREVIEW_CAP||bytes>cap)throw Error('PREVIEW_BUDGET');return {images,bytes};
}
function imageDataUri(bytes,mime){
 // Every full chunk is divisible by three; concatenated base64 remains canonical.
 let encoded='';for(let i=0;i<bytes.length;i+=6144)encoded+=btoa(String.fromCharCode(...bytes.subarray(i,i+6144)));
 return `data:${mime};base64,${encoded}`;
}
/** Fetch only safe provider metadata. Authenticated media goes through apiFetch. */
export async function readHeroQaResource(resource,{apiFetch,signal,fetchStatic=fetch}){
 resource=heroQaResourceSchema.parse(resource);let bytes;
 if(resource.inlineBase64!==undefined){const raw=atob(resource.inlineBase64);if(btoa(raw)!==resource.inlineBase64)throw Error('CSS encoding không hợp lệ.');bytes=Uint8Array.from(raw,char=>char.charCodeAt(0));}
 else if(resource.derivative){const payload=await apiFetch(localizedPrivateResourcePath(resource),{signal,responseType:'bytes',derivative:resource.derivative,maxBytes:12*1024*1024});bytes=payload.bytes;}
 else{
  const url=new URL(resource.url);if(url.origin!=='http://127.0.0.1:5010'||url.pathname!==`/${resource.path}`)throw Error('Nguồn tài nguyên không hợp lệ.');
  const response=await fetchStatic(url.href,{signal,cache:'no-store',credentials:'omit',redirect:'error'});
  if(!response.ok||!response.body)throw Error('Không đọc được tài nguyên Hero.');
  const reader=response.body.getReader(),chunks=[];let total=0;
  try{while(true){const part=await reader.read();if(part.done)break;total+=part.value.byteLength;if(total>resource.sizeBytes)throw Error('Tài nguyên vượt giới hạn.');chunks.push(part.value);}bytes=new Uint8Array(total);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 }
 if(!(bytes instanceof Uint8Array)||bytes.length!==resource.sizeBytes||await digest(bytes)!==resource.sha256)throw Error('Hash tài nguyên Hero không khớp.');return bytes;
}
export async function downloadHeroQaBundle({apiFetch,signal,guard=()=>{}}){
 const entries=[];
 for(const locale of ['en','vi','ja']){
  const qa=validateHeroQaRelationships(await apiFetch(`/api/cms/hero-localizations/home-v3/${locale}/qa`,{signal}));guard();const files=[];
  for(const resource of qa.resources){const bytes=await readHeroQaResource(resource,{apiFetch,signal});guard();let raw='';for(let i=0;i<bytes.length;i+=8192)raw+=String.fromCharCode(...bytes.subarray(i,i+8192));files.push({path:resource.path,base64:btoa(raw)});}
  entries.push({qa,files});
 }
 return {contractRevision:1,kind:'LOCALIZED_HERO_QA_BUNDLE',entries};
}
export function createHeroLocalizationPreview(root,{apiFetch,getSession}){
 const doc=root.ownerDocument,frame=doc.createElement('iframe'),status=doc.createElement('p');frame.title='Xem trước Hero đã lưu';frame.setAttribute('sandbox','');frame.className='hero-localization-frame';frame.hidden=true;status.setAttribute('role','status');root.append(status,frame);
 let expanded=false,mobile=false,measurement=null,measuredHeight=700;
 const measure=doc.createElement('div');measure.className='hero-preview-measure';measure.setAttribute('aria-hidden','true');measure.inert=true;root.append(measure);
 function resize(options){if(options){expanded=options.expanded;mobile=options.mobile;}const available=Math.max(1,root.clientWidth),width=expanded&&mobile?Math.min(390,available):1200,scale=Math.min(1,Math.max(0.01,available/width));measure.style.width=`${width}px`;frame.style.width=`${width}px`;if(measurement){const height=Math.ceil(measurement.getBoundingClientRect().height);if(height>0)measuredHeight=height;}frame.style.height=`${measuredHeight}px`;root.style.height=`${Math.ceil(measuredHeight*scale)}px`;root.style.setProperty('--hero-preview-scale',String(scale));}
 const resizeObserver=typeof doc.defaultView.ResizeObserver==='function'?new doc.defaultView.ResizeObserver(()=>resize()):null;resizeObserver?.observe(root);
 let generation=0,controller,destroyed=false,urls=[],releases=[],currentRun=null;const identity=()=>{const s=getSession();return s?JSON.stringify([s.uid,s.role,s.authzVersion]):null;};
 function clear(){
  generation++;controller?.abort();frame.removeAttribute('srcdoc');frame.src='about:blank';frame.hidden=true;measure.replaceChildren();measurement=null;
  if(currentRun){currentRun.retired=true;for(const key of Object.keys(currentRun.resourceUrls))delete currentRun.resourceUrls[key];if(currentRun.settled)currentRun.release();currentRun=null;}
  for(const url of urls)URL.revokeObjectURL(url);urls=[];for(const release of releases)release();releases=[];status.textContent='';root.style.height='';
 }

 const mountedMember=identity(),sessionChanged=()=>{if(identity()!==mountedMember)clear();};
 const unregister=registerMediaPreviewResourceOwner(clear);
 async function show(saved){
  clear();if(destroyed||!identity())return;const n=generation,member=identity();controller=new AbortController();const signal=controller.signal,run={retired:false,settled:false,reservation:null,resourceUrls:{}};run.release=()=>{if(run.reservation&&!run.released){run.released=true;run.reservation.release();}};currentRun=run;
  const guard=()=>{if(destroyed||signal.aborted||n!==generation||member!==identity())throw new DOMException('Phiên đã thay đổi.','AbortError');};
  try{
   const qa=parseHeroQa(await apiFetch(`/api/cms/hero-localizations/home-v3/${saved.locale}/qa`,{signal}));guard();
   for(const key of ['locale','revision','baseRevision','baseContentHash','contentHash'])if(qa.draft[key]!==saved[key])throw Error('Bản xem trước đã thay đổi. Hãy tải lại.');
   const resourceUrls=run.resourceUrls;
   if(qa.contractRevision===2){
    const plan=planHeroPreviewBudget(qa);guard();run.reservation=await acquireMediaPreviewBinary(plan.bytes,clear,{signal});
    try{guard();for(const resource of plan.images){let bytes=await readHeroQaResource(resource,{apiFetch,signal});guard();resourceUrls[resource.id]=imageDataUri(bytes,resource.mimeType);bytes=null;guard();}}
    finally{run.settled=true;if(run.retired)run.release();run.reservation.settle();}
   }else{
   for(const resource of qa.resources){
    // Fonts/CSS are immutable baseline resources; image bytes use shared budget.
    if(!resource.mimeType.startsWith('image/'))continue;
    const reservation=await acquireMediaPreviewBinary(resource.sizeBytes,clear,{signal});try{guard();const bytes=await readHeroQaResource(resource,{apiFetch,signal});guard();const url=URL.createObjectURL(new Blob([bytes],{type:resource.mimeType}));urls.push(url);releases.push(reservation.release);resourceUrls[resource.id]=url;}finally{reservation.settle();if(!resourceUrls[resource.id])reservation.release();}
   }
   }
   guard();const html=renderLocalizedHeroDocument(qa,{resourceUrls});frame.srcdoc=html;frame.hidden=false;status.textContent='';const parsed=new doc.defaultView.DOMParser().parseFromString(html,'text/html');measurement=parsed.querySelector('main');measure.replaceChildren(measurement);for(const image of measure.querySelectorAll('img'))image.addEventListener('load',()=>resize(),{once:true});doc.fonts?.ready.then(()=>{if(n===generation)resize();});resize();
  }catch(error){for(const key of Object.keys(run.resourceUrls))delete run.resourceUrls[key];if(n===generation&&member===identity()){clear();status.textContent=error.message||'Không thể xem Hero.';}else{run.retired=true;if(run.settled)run.release();}}
 }
 doc.addEventListener('cms:session',sessionChanged);
 return {show,clear,resize,destroy(){destroyed=true;clear();resizeObserver?.disconnect();unregister();doc.removeEventListener('cms:session',sessionChanged);root.replaceChildren();}};
}
