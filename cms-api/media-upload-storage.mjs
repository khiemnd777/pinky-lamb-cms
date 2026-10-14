import {request as httpRequest} from 'node:http';
import {createHash} from 'node:crypto';
import {ApiError} from '../contracts/errors.mjs';
import {validateRuntime,STORAGE_BUCKET} from '../scripts/local-guard.mjs';

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const id=value=>typeof value==='string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
const generation=value=>typeof value==='string' && /^[1-9][0-9]{0,127}$/.test(value);
const requireValue=condition=>{if(!condition)throw new ApiError('INTERNAL_ERROR');};
const objectPath=key=>`/storage/v1/b/${encodeURIComponent(STORAGE_BUCKET)}/o/${encodeURIComponent(key)}`;

/** A fixed loopback transport. An interrupted upload has an UNKNOWN outcome;
 * observing a later 404 cannot prove that an earlier writer has stopped. */
function localRequest(method,path,body,cap,headers={}){
 validateRuntime(process.env,undefined,{server:true});
 if(process.env.FIREBASE_STORAGE_EMULATOR_HOST!=='127.0.0.1:9199')throw new ApiError('LOCAL_RUNTIME_UNAVAILABLE');
 return new Promise((resolve,reject)=>{
  let settled=false;
  const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(deadline);if(error)reject(error);else resolve(value);};
  // The emulator's fixed synthetic admin marker is not a cloud credential.
  const request=httpRequest({hostname:'127.0.0.1',port:9199,method,path,headers:{Authorization:'Bearer owner',...headers,...(body?{'Content-Length':body.length}:{})}},response=>{
   const chunks=[];let count=0;
   response.on('data',chunk=>{count+=chunk.length;if(count>cap){request.destroy(new Error('Storage response limit'));return;}chunks.push(chunk);});
   response.on('end',()=>finish(null,{status:response.statusCode,bytes:Buffer.concat(chunks)}));
   response.on('error',error=>finish(error));
   response.on('aborted',()=>finish(new Error('Storage response aborted')));
   response.on('close',()=>{if(!response.complete)finish(new Error('Storage response incomplete'));});
  });
  const deadline=setTimeout(()=>request.destroy(new Error('Storage deadline')),30000);
  request.setTimeout(30000,()=>request.destroy(new Error('Storage timeout')));
  request.on('error',error=>finish(error));request.end(body);
 });
}

function ownedKey(key){requireValue(typeof key==='string' && /^private\/media\/v2\/[A-Za-z0-9_/-]{1,768}$/.test(key) && !key.includes('..'));return key;}
async function metadata(key,{allowAbsent=false}={}){
 const response=await localRequest('GET',objectPath(ownedKey(key)),null,65536);
 if(response.status===404&&allowAbsent)return null;
 if(response.status!==200)throw new ApiError('LOCAL_RUNTIME_UNAVAILABLE');
 let value;try{value=JSON.parse(response.bytes.toString('utf8'));}catch{throw new ApiError('INTERNAL_ERROR');}
 requireValue(value.bucket===STORAGE_BUCKET && value.name===key && generation(value.generation) && /^[1-9][0-9]*$/.test(String(value.size)));
 return {key,generation:value.generation,sizeBytes:Number(value.size),mimeType:value.contentType??'application/octet-stream'};
}
async function readObject({key,generation:expectedGeneration,sizeBytes,sha256}){
 ownedKey(key);requireValue(generation(expectedGeneration) && Number.isSafeInteger(sizeBytes) && sizeBytes>0 && sizeBytes<=134217728 && /^[a-f0-9]{64}$/.test(sha256));
 const before=await metadata(key);requireValue(before.generation===expectedGeneration&&before.sizeBytes===sizeBytes);
 const response=await localRequest('GET',`${objectPath(key)}?alt=media&generation=${encodeURIComponent(expectedGeneration)}`,null,sizeBytes);
 if(response.status!==200 || response.bytes.length!==sizeBytes || digest(response.bytes)!==sha256)throw new ApiError('INTERNAL_ERROR');
 const after=await metadata(key);requireValue(after.generation===expectedGeneration&&after.sizeBytes===sizeBytes);
 return response.bytes;
}
async function writeObject(key,bytes,mimeType,sha256){
 ownedKey(key);requireValue(Buffer.isBuffer(bytes) && bytes.length>0 && bytes.length<=134217728 && digest(bytes)===sha256);
 requireValue(['application/octet-stream','image/webp','image/jpeg','image/png','application/pdf','video/mp4'].includes(mimeType));
 const existing=await metadata(key,{allowAbsent:true});
 if(existing){requireValue(existing.sizeBytes===bytes.length&&existing.mimeType===mimeType);await readObject({...existing,sha256});return {...existing,sha256};}
 // The installed emulator does not enforce GCS conditional writes. The caller
 // must hold the persisted Q1 write claim for this globally allocated unique key.
 // A failed writer is never retried; its fence remains UNCERTAIN in Firestore.
 const response=await localRequest('POST',`/upload/storage/v1/b/${encodeURIComponent(STORAGE_BUCKET)}/o?uploadType=media&name=${encodeURIComponent(key)}&ifGenerationMatch=0`,bytes,65536,{'Content-Type':mimeType});
 // 412 remains supported for providers that do enforce the GCS precondition.
 if(![200,201,412].includes(response.status))throw new ApiError('LOCAL_RUNTIME_UNAVAILABLE');
 const observed=await metadata(key);
 requireValue(observed.sizeBytes===bytes.length&&observed.mimeType===mimeType);
 await readObject({...observed,sha256});
 return {...observed,sha256};
}

/** All keys are server allocated and private. This adapter never creates a
 * download token, public URL, IAM rule, deletion or overwrite operation. */
export function createLocalMediaUploadStorage(){
 const partKey=({assetId,objectId})=>{requireValue(id(assetId)&&id(objectId));return `private/media/v2/${assetId}/parts/${objectId}`;};
 const originalKey=({assetId,originalId})=>{requireValue(id(assetId)&&id(originalId));return `private/media/v2/${assetId}/originals/${originalId}`;};
 async function writeUpload({target,declaration},bytes){
  const key=target.partIndex===null?originalKey({assetId:target.assetId,originalId:target.objectId}):partKey({assetId:target.assetId,objectId:target.objectId});
  requireValue(bytes.length===declaration.content.sizeBytes && digest(bytes)===declaration.content.sha256);
  return writeObject(key,bytes,'application/octet-stream',declaration.content.sha256);
 }
 return Object.freeze({
  writeUpload,
  readPart:row=>readObject({key:partKey({assetId:row.assetId,objectId:row.partId}),generation:row.generation,sizeBytes:row.sizeBytes,sha256:row.sha256}),
  readOriginal:row=>readObject({key:originalKey(row),generation:row.generation,sizeBytes:row.sizeBytes,sha256:row.sha256}),
  async writeDerivative({assetId,jobId,attempt,leaseEpoch,objectId,bytes,mimeType,sha256}){
   requireValue(id(assetId)&&id(jobId)&&id(objectId)&&[1,2].includes(attempt)&&Number.isSafeInteger(leaseEpoch)&&leaseEpoch>0);
   return writeObject(`private/media/v2/${assetId}/jobs/${jobId}/${attempt}/${leaseEpoch}/${objectId}`,bytes,mimeType,sha256);
  },
  readDerivative:readObject,
  stat:metadata
 });
}
