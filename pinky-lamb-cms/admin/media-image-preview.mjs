import {MEDIA_LIMITS,mediaDetailPublicSchema} from '../contracts/media-read-public.mjs';
const SERIALIZED_CAP=192*1048576;let retained=0,serialized=0;
/** Admission happens before allocating a base64/srcdoc string, shared by viewers. */
export function reserveImagePreview(byteLength){
 if(!Number.isSafeInteger(byteLength)||byteLength<1||byteLength>MEDIA_LIMITS.imageBytes)throw Error('Ảnh vượt giới hạn.');
 // Conservatively charge UTF-16 binary + encoded + final srcdoc copies.
 const charge=(byteLength+Math.ceil(byteLength/3)*8+4096)*2;
 if(retained+byteLength>MEDIA_LIMITS.retainedBytes||serialized+charge>SERIALIZED_CAP)throw Error('Bộ nhớ xem ảnh đang đầy.');
 retained+=byteLength;serialized+=charge;let released=false;return ()=>{if(!released){released=true;retained-=byteLength;serialized-=charge;}};
}
export const imagePreviewBudget=()=>({retained,serialized,retainedCap:MEDIA_LIMITS.retainedBytes,serializedCap:SERIALIZED_CAP});
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function imagePreviewDocument(bytes,name,{thumbnail=false,fit='cover'}={}){
 let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));const encoded=btoa(binary);
 const imageStyle=thumbnail?`display:block;width:100%;height:100vh;object-fit:${fit==='contain'?'contain':'cover'}`:'display:block;max-width:100%;height:auto';
 return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; script-src 'none'; connect-src 'none'; object-src 'none'; style-src 'none'; style-src-attr 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-src 'none'"><meta name="referrer" content="no-referrer"></head><body style="margin:0"><img alt="${escape(name)}" style="${imageStyle}" src="data:image/webp;base64,${encoded}"></body></html>`;
}
export async function verifyImageBytes(payload,derivative,{decode=decodeWebP}={}){
 const bytes=payload.bytes;
 if(!(bytes instanceof Uint8Array)||bytes.length!==derivative.bytes||bytes.length>MEDIA_LIMITS.imageBytes||payload.mime!=='image/webp'||payload.mime!==derivative.mime||payload.generation!==derivative.generation||payload.sha256!==derivative.sha256||bytes.length<12||String.fromCharCode(...bytes.subarray(0,4))!=='RIFF'||String.fromCharCode(...bytes.subarray(8,12))!=='WEBP')throw Error('Dữ liệu ảnh không khớp phiên bản.');
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');if(hash!==derivative.sha256)throw Error('Dữ liệu ảnh không khớp phiên bản.');
 const dimensions=await decode(bytes);if(dimensions.width!==derivative.width||dimensions.height!==derivative.height)throw Error('Kích thước ảnh không khớp phiên bản.');return bytes;
}
async function decodeWebP(bytes){const image=await createImageBitmap(new Blob([bytes],{type:'image/webp'}));try{return {width:image.width,height:image.height};}finally{image.close();}}
export function selectImagePreviewDerivative(record,{thumbnail=false}={}){
 const kind=record.kind??'IMAGE';
 let derivative;
 if(kind==='IMAGE')derivative=record.derivatives.find(d=>d.key===(thumbnail?'image-320':'image-960'))??(thumbnail?record.derivatives.find(d=>d.key==='image-960'):null);
 else if(thumbnail&&kind==='VIDEO')derivative=record.derivatives.find(d=>d.role==='POSTER'&&d.mime==='image/webp');
 else if(thumbnail&&kind==='PDF')derivative=record.derivatives.find(d=>d.role==='PDF_PAGE'&&d.pageNumber===1&&d.mime==='image/webp');
 if(!derivative)throw Error('Ảnh chưa có phiên bản xem trước.');
 return derivative;
}
export function createImagePreview(root,{apiFetch,getSession,decode,thumbnail=false,fit='cover'}={}){
 if(typeof apiFetch!=='function'||typeof getSession!=='function')throw new TypeError('Session provider required');
 const sessionKey=()=>{const value=getSession();return value?JSON.stringify([value.uid,value.role,value.authzVersion]):null;};
 const document=root.ownerDocument,status=document.createElement('p'),frame=document.createElement('iframe');status.setAttribute('role','status');frame.title='Xem ảnh';frame.setAttribute('sandbox','');frame.className='media-image-frame';frame.hidden=true;if(thumbnail)root.classList.add('cms-image-thumbnail');root.append(status,frame);
 let revision=0,controller,displayRelease,destroyed=false;
 function clear(){revision++;controller?.abort();controller=null;frame.removeAttribute('srcdoc');frame.hidden=true;root.classList.remove('is-ready');status.textContent='';displayRelease?.();displayRelease=null;}
 async function show(id){
  clear();if(destroyed)return;const current=revision,member=sessionKey();if(!member)return;controller=new AbortController();const signal=controller.signal;let reservation;status.textContent='Đang tải ảnh…';
  const active=()=>!destroyed&&!signal.aborted&&revision===current&&sessionKey()===member;
  try{
   const record=mediaDetailPublicSchema.parse(await apiFetch(`/api/cms/media/${id}`,{signal}));if(!active())return;if(record.id!==id||record.isArchived||record.kind!=='IMAGE'&&(!thumbnail||!['VIDEO','PDF'].includes(record.kind)))throw Error('Phiên bản ảnh không hợp lệ.');
   if(record.status!=='READY'||!record.derivative){status.textContent='Ảnh chưa sẵn sàng để xem.';return;}
   const derivative=selectImagePreviewDerivative(record,{thumbnail});reservation=reserveImagePreview(derivative.bytes);
   const payload=await apiFetch(`/api/cms/media/${record.id}/derivatives/${derivative.key}`,{signal,responseType:'bytes',derivative});if(!active())return;
   const bytes=await verifyImageBytes(payload,derivative,{decode});if(!active())return;
   const html=imagePreviewDocument(bytes,record.name,{thumbnail,fit});if(!active())return;
   displayRelease=reservation;frame.setAttribute('sandbox','');frame.srcdoc=html;frame.hidden=false;root.classList.add('is-ready');status.textContent=record.name;
  }catch(error){if(active()){frame.removeAttribute('srcdoc');frame.hidden=true;root.classList.remove('is-ready');status.textContent=error.name==='AbortError'?'':'Không thể xem ảnh. Vui lòng thử lại.';}}finally{if(displayRelease!==reservation)reservation?.();}
 }
 document.addEventListener('cms:session',clear);
 return Object.freeze({show,clear,destroy(){document.removeEventListener('cms:session',clear);clear();destroyed=true;root.replaceChildren();}});
}
