import {renderPinkyVideoPlayer,installPinkyVideoPlayer} from '../preview/pinky-video-player.mjs';
import {localizedPrivateResourcePath,localizedResourceTransportUrl} from '../preview/localized-resource-transport.mjs';
import {acquireMediaPreviewBinary} from './media-file-preview.mjs';
/** Interactive video sits beside the inert website iframe. Private bytes remain
 * authenticated, pinned, budgeted and owned by the parent preview/session. */
export function createLocalizedVideoPreview(root,{apiFetch,getSession,reel,poster,resource,assertCurrent=()=>{},evict=()=>{}}){
 const doc=root.ownerDocument,member=()=>{const s=getSession();return s?JSON.stringify([s.uid,s.role,s.authzVersion]):null;},identity=member(),controller=new AbortController();
 let player=null,reservation=null,url=null,destroyed=false,busy=false;

 const button=doc.createElement('button'),status=doc.createElement('p'),host=doc.createElement('div');button.type='button';button.textContent='Xem video đã lưu';status.setAttribute('role','status');root.append(button,status,host);
 const guard=()=>{assertCurrent();if(destroyed||!identity||member()!==identity||controller.signal.aborted)throw new DOMException('Phiên đã thay đổi.','AbortError');};
 function release(){player?.destroy();player=null;if(url)URL.revokeObjectURL(url);url=null;reservation?.release();reservation=null;host.replaceChildren();}
 async function readVideo(){
  if(!resource||resource.mimeType!=='video/mp4'||resource.sizeBytes>64*1048576)throw Error('Thiếu video đã lưu.');
  const acquired=await acquireMediaPreviewBinary(resource.sizeBytes,evict,{signal:controller.signal});reservation=acquired;
  try{guard();let bytes;
   if(resource.derivative){const payload=await apiFetch(localizedPrivateResourcePath(resource),{signal:controller.signal,responseType:'bytes',derivative:resource.derivative,maxBytes:resource.sizeBytes});bytes=payload.bytes;}
   else{const response=await fetch(localizedResourceTransportUrl(resource),{signal:controller.signal,credentials:'omit',redirect:'error'});guard();if(!response.ok||response.headers.get('content-type')?.split(';')[0]!==resource.mimeType||!response.body)throw Error('Không tải được video.');const reader=response.body.getReader();try{bytes=new Uint8Array(resource.sizeBytes);let offset=0;while(true){const part=await reader.read();guard();if(part.done)break;if(offset+part.value.length>bytes.length)throw Error('Video vượt kích thước đã lưu.');bytes.set(part.value,offset);offset+=part.value.length;}if(offset!==bytes.length)throw Error('Kích thước video không khớp.');}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}}
   guard();if(!(bytes instanceof Uint8Array)||bytes.length!==resource.sizeBytes)throw Error('Kích thước video không khớp.');const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');guard();if(digest!==resource.sha256)throw Error('Video không khớp bản đã lưu.');url=URL.createObjectURL(new Blob([bytes],{type:'video/mp4'}));return url;
  }finally{acquired.settle();}
 }
 button.addEventListener('click',async()=>{if(busy||destroyed)return;busy=true;button.disabled=true;status.textContent='Đang chuẩn bị video…';try{guard();release();const videoUrl=reel.sourceType==='YOUTUBE'?'':await readVideo();guard();host.innerHTML=renderPinkyVideoPlayer(reel,{poster,videoUrl,locale:'vi'});player=installPinkyVideoPlayer(host.querySelector('[data-pinky-player]'));status.textContent='Video của bản đã lưu. Website đang phục vụ chưa thay đổi.';void player.play();}catch(error){release();if(!destroyed)status.textContent=error.name==='AbortError'?'Phiên xem trước đã thay đổi.':'Không thể xem video. Bấm lại để thử.';}finally{busy=false;if(!destroyed)button.disabled=false;}});
 return {destroy(){destroyed=true;controller.abort();release();root.replaceChildren();}};
}
