import {loadFileBytes} from '../reader/pinky-reader.mjs';
import {fileQaResource} from '../contracts/file-resource.mjs';
export function mountFileThumbnail(host,asset,{getSession,label}={}){
 const doc=host.ownerDocument,member=()=>{const s=getSession();return s?JSON.stringify([s.uid,s.role,s.authzVersion]):null;},initial=member(),controller=new AbortController();let dead=false,url;const active=()=>!dead&&!controller.signal.aborted&&initial&&member()===initial;
 void (async()=>{try{const result=await loadFileBytes(fileQaResource(asset),{signal:controller.signal});if(!active())return;url=URL.createObjectURL(new Blob([result.bytes],{type:asset.mimeType}));const image=doc.createElement('img');image.alt=label??asset.name;image.style.cssText='width:100%;height:100%;object-fit:contain';image.src=url;await image.decode();if(!active())return;host.replaceChildren(image);}catch{if(active())host.textContent='Không tải được ảnh.';}})();
 const clear=()=>{dead=true;controller.abort();if(url)URL.revokeObjectURL(url);host.replaceChildren();};doc.addEventListener('cms:session',clear);return {destroy(){clear();doc.removeEventListener('cms:session',clear);}};
}
