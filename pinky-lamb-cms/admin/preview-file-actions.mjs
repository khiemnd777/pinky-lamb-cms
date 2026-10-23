import {createCmsReader} from './pinky-reader.mjs';
import {fileQaResource} from '../contracts/file-resource.mjs';
import {publicMediaDerivative} from '../contracts/media-read-public.mjs';
export function mediaEntryResource(entry,{snapshotId}={}){
 const a=entry.asset;if(entry.source==='FILE_RESOURCE')return fileQaResource(a);
 if(entry.source==='LEGACY')return {id:a.id,path:a.legacyPath,url:'http://127.0.0.1:5010/'+a.legacyPath,mimeType:a.mimeType,sizeBytes:a.sizeBytes,sha256:a.sha256,...(a.width?{width:a.width,height:a.height}:{})};
 const d=a.derivatives.find(d=>a.kind==='PDF'?d.role==='PDF_DOWNLOAD':d.role==='IMAGE'&&d.targetWidth===960);if(!d)return null;
 return {id:a.assetId,path:`assets/${a.assetId}-${d.key}.${a.kind==='PDF'?'pdf':'webp'}`,url:`http://127.0.0.1:5173/api/cms/media/${a.assetId}/derivatives/${d.key}`,mimeType:d.mimeType,sizeBytes:d.sizeBytes,sha256:d.sha256,derivative:publicMediaDerivative(d),...(snapshotId?{snapshotId}:{})};
}
export function mountPreviewFileActions(root,{resources,apiFetch,getSession}){
 const doc=root.ownerDocument,section=doc.createElement('section');section.className='cms-preview-controls';section.setAttribute('aria-label','Mở ảnh và tài liệu');const reader=createCmsReader({document:doc,apiFetch,getSession});
 for(const resource of resources.filter(r=>r&&(r.file||r.mimeType==='application/pdf'||/^image\/(jpeg|png|webp)$/.test(r.mimeType)))){const b=doc.createElement('button');b.type='button';b.textContent=(resource.file?.disposition==='DOWNLOAD'?'Tải xuống — ':'Xem — ')+(resource.file?.name??resource.id);b.addEventListener('click',()=>void reader.open(resource));section.append(b);}
 root.append(section);return {destroy(){reader.destroy();section.remove();}};
}
