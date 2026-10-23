import {createHash} from 'node:crypto';
import {ApiError} from '../contracts/errors.mjs';
import {canonicalJson} from '../contracts/draft.mjs';
import {publicMediaDerivative} from '../contracts/media-read-public.mjs';
import {readPinnedReleaseResource} from '../scripts/export-multilingual-site-local.mjs';
import {reserveMediaReadBytes} from './media-reads.mjs';
const same=(a,b)=>canonicalJson(a)===canonicalJson(b);
/** Called only with the assembled frozen release, after source/snapshot checks.
 * New bytes are confined to the selected About Showreel's VIDEO/POSTER slots. */
export async function readSelectedShowreelResource({descriptor,release,selection,library,storage}){
 if(selection.resource.kind!=='group'||selection.resource.entityId!=='about')throw new ApiError('REVISION_CONFLICT');
 const about=release.entries.find(e=>e.locale===selection.resource.locale)?.groups.about;
 const allowed=about?.mediaSlots.filter(s=>['about/showreel','about/poster'].includes(s.slotId));
 const slot=allowed?.find(s=>s.resourceId===descriptor.id),pin=about?.resources.find(r=>r.id===descriptor.id);
 if(!slot||!pin||!same(pin,descriptor))throw new ApiError('REVISION_CONFLICT');
 if(!descriptor.derivative)return readPinnedReleaseResource(descriptor);
 const version=await library.readVersion(slot.assetId),derivative=version.readyVersion?.derivatives.find(d=>d.key===descriptor.derivative.key),object=version.storage?.derivatives.find(d=>d.key===descriptor.derivative.key);
 if(version.status!=='READY'||!derivative||!object||!same(publicMediaDerivative(derivative),descriptor.derivative)||!['key','generation','sizeBytes','mimeType','sha256'].every(k=>object[k]===derivative[k]))throw new ApiError('REVISION_CONFLICT');
 const releaseBytes=reserveMediaReadBytes(descriptor.sizeBytes);
 try{const bytes=await storage.readDerivative({key:object.objectKey,generation:object.generation,sizeBytes:object.sizeBytes,sha256:object.sha256});
  if(!Buffer.isBuffer(bytes)||bytes.length!==descriptor.sizeBytes||createHash('sha256').update(bytes).digest('hex')!==descriptor.sha256)throw new ApiError('INTERNAL_ERROR');
  const current=await library.readVersion(slot.assetId);if(!same(current,version))throw new ApiError('REVISION_CONFLICT');return bytes;
 }finally{releaseBytes();}
}

/** New public bytes must be an exact descriptor in the confirmed file plan. */
export async function readPublicationFileResource({descriptor,allowed,library,storage}){
 if(!allowed.some(r=>same(r,descriptor)))throw new ApiError('REVISION_CONFLICT');
 if(!descriptor.derivative)return readPinnedReleaseResource(descriptor);
 if(!['application/pdf','image/webp','image/png','image/jpeg'].includes(descriptor.mimeType))throw new ApiError('VALIDATION_ERROR');
 const version=await library.readVersion(descriptor.id),derivative=version.readyVersion?.derivatives.find(d=>d.key===descriptor.derivative.key),object=version.storage?.derivatives.find(d=>d.key===descriptor.derivative.key);
 if(version.status!=='READY'||!derivative||!object||!['IMAGE','PDF_DOWNLOAD'].includes(derivative.role)||!same(publicMediaDerivative(derivative),descriptor.derivative)||!['key','generation','sizeBytes','mimeType','sha256'].every(k=>object[k]===derivative[k])||derivative.sha256!==descriptor.sha256||derivative.sizeBytes!==descriptor.sizeBytes||derivative.mimeType!==descriptor.mimeType)throw new ApiError('REVISION_CONFLICT');
 const releaseBytes=reserveMediaReadBytes(descriptor.sizeBytes);try{const bytes=await storage.readDerivative({key:object.objectKey,generation:object.generation,sizeBytes:object.sizeBytes,sha256:object.sha256});if(!Buffer.isBuffer(bytes)||bytes.length!==descriptor.sizeBytes||createHash('sha256').update(bytes).digest('hex')!==descriptor.sha256)throw new ApiError('INTERNAL_ERROR');if(!same(await library.readVersion(descriptor.id),version))throw new ApiError('REVISION_CONFLICT');return bytes;}finally{releaseBytes();}
}
