import '../reader/pinky-reader.css';
import {createPinkyReader} from '../reader/pinky-reader.mjs';
import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import {localizedPrivateResourcePath} from '../preview/localized-resource-transport.mjs';
export function createCmsReader({document,apiFetch,getSession}){

 const member=()=>{const s=getSession();return s?JSON.stringify([s.uid,s.role,s.authzVersion]):null;};
 return createPinkyReader({document,loadPdf:()=>import('pdfjs-dist/build/pdf.mjs'),pdfWorkerUrl:workerUrl,readPrivate:async(resource,{signal})=>{
  const initial=member();if(!initial)throw Error('SESSION');let bytes;
  if(resource.file?.source.kind==='HOSTED'){const r=await apiFetch(`/api/cms/files/${resource.file.assetId}/bytes`,{signal,responseType:'bytes',maxBytes:25*1048576});bytes=r.bytes;}
  else if(resource.derivative){const path=resource.snapshotId?`/api/cms/media-site/snapshots/${resource.snapshotId}/media/${resource.id}/derivatives/${resource.derivative.key}`:localizedPrivateResourcePath(resource);const r=await apiFetch(path,{signal,responseType:'bytes',derivative:resource.derivative,maxBytes:64*1048576});bytes=r.bytes;}
  else{const {localizedResourceTransportUrl}=await import('../preview/localized-resource-transport.mjs');const {readBoundedResponse}=await import('../contracts/file-detection.mjs');bytes=await readBoundedResponse(await fetch(localizedResourceTransportUrl(resource),{signal,credentials:'omit',redirect:'error'}),{signal,limit:64*1048576});}
  if(initial!==member())throw Error('SESSION');return bytes;
 }});
}
