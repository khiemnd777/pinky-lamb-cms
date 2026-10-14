import {createHash} from 'node:crypto';
import {ApiError,errorEnvelope} from '../contracts/errors.mjs';
import {strictMediaV2JsonSchema} from '../contracts/media-v3-metadata-v2.mjs';
import {immutableManifestAssetV2Schema,immutableManifestAssetFromReadyVersionV2,v2MediaManifestSchema,canonicalMediaV2Json} from '../contracts/media-v3-contract-v2.mjs';
import {parsePersistedMediaV2} from '../contracts/media.mjs';
import {reserveMediaReadBytes} from './media-reads.mjs';

const hashCanonical=value=>createHash('sha256').update(canonicalMediaV2Json(value)).digest('hex');
const requireValue=(value,code='INTERNAL_ERROR')=>{if(!value)throw new ApiError(code);};
const sameActor=(a,b)=>a.uid===b.uid&&a.role===b.role&&a.authzVersion===b.authzVersion;
const fingerprint=value=>canonicalMediaV2Json(value);

export function siteV3MediaReadRoute(path) {
  if(typeof path!=='string')throw new ApiError('NOT_FOUND');
  const match=/^\/api\/cms\/media-site\/snapshots\/([A-Za-z0-9_-]{1,128})\/media\/([A-Za-z0-9_-]{1,100})\/derivatives\/([A-Za-z0-9][A-Za-z0-9_-]{0,127})$(?![\s\S])/.exec(path);
  if(!match)throw new ApiError('NOT_FOUND');
  return {kind:'MEDIA_READ_SNAPSHOT_BYTES',methods:['GET'],snapshotId:match[1],id:match[2],key:match[3]};
}
function requestRoute(request) {
  const raw=request.originalUrl??request.url;
  requireValue(typeof raw==='string'&&raw.startsWith('/')&&!raw.includes('?')&&!raw.includes('#'),'BAD_REQUEST');
  const parsed=new URL(raw,'http://127.0.0.1');
  requireValue(parsed.origin==='http://127.0.0.1'&&raw===parsed.pathname,'BAD_REQUEST');
  const route=siteV3MediaReadRoute(parsed.pathname);
  if(request.path!==undefined&&request.path!==parsed.pathname)throw new ApiError('BAD_REQUEST');
  if(request.query&&Reflect.ownKeys(request.query).length)throw new ApiError('BAD_REQUEST');
  if(request.rawBody?.byteLength||request.headers?.['transfer-encoding']!==undefined||(request.headers?.['content-length']!==undefined&&request.headers['content-length']!=='0'))throw new ApiError('BAD_REQUEST');
  if(request.body!==undefined&&request.body!==null&&!(typeof request.body==='object'&&!Array.isArray(request.body)&&Reflect.ownKeys(request.body).length===0))throw new ApiError('BAD_REQUEST');
  return route;
}
function origin(request) {
  const count=request.rawHeaders?.filter((_value,index)=>index%2===0&&String(request.rawHeaders[index]).toLowerCase()==='origin').length;
  if((count!==undefined&&count>1)||(request.headers?.origin!==undefined&&request.headers.origin!=='http://127.0.0.1:5173'))throw new ApiError('FORBIDDEN');
}
function pinnedSnapshot(value,route) {
  // Actual C0 readSnapshot performs contextual content/claim/hash validation.
  // This adapter accepts only its declared SnapshotRead, never client context.
  let read,manifest;
  try {
    read=strictMediaV2JsonSchema.parse(value);
    const names=Object.keys(read).sort();
    requireValue(fingerprint(names)===fingerprint(['review','reviewState','snapshot','sourceCatalog','summary']));
    requireValue(read.snapshot.id===route.snapshotId&&read.summary.id===route.snapshotId&&read.snapshot.contractRevision===2&&read.snapshot.schemaVersion===3&&read.snapshot.templateVersion==='m3-site-media-v1');
    manifest=v2MediaManifestSchema.parse(read.snapshot.mediaManifest);
    requireValue(read.snapshot.mediaManifestHash===hashCanonical(manifest));
    requireValue(typeof read.snapshot.contentHash==='string'&&read.snapshot.contentHash.length===64&&!/[^a-f0-9]/.test(read.snapshot.contentHash));
  } catch {throw new ApiError('INTERNAL_ERROR');}
  const entries=manifest.filter(entry=>entry.source==='MEDIA_VERSION'&&entry.asset.assetId===route.id);
  requireValue(entries.length===1,'NOT_FOUND');
  const asset=immutableManifestAssetV2Schema.parse(entries[0].asset);
  const derivative=asset.derivatives.find(entry=>entry.key===route.key);
  requireValue(derivative,'NOT_FOUND');
  return {asset,derivative,pin:fingerprint({snapshotId:read.snapshot.id,contentHash:read.snapshot.contentHash,mediaManifestHash:read.snapshot.mediaManifestHash,mediaManifest:manifest})};
}
function pinnedVersion(value,pinned) {
  let version;
  try {version=parsePersistedMediaV2(value,{hashCanonical});}catch{throw new ApiError('INTERNAL_ERROR');}
  requireValue(version.status==='READY'&&version.assetId===pinned.asset.assetId,'NOT_FOUND');
  requireValue(fingerprint(immutableManifestAssetFromReadyVersionV2(version.readyVersion))===fingerprint(pinned.asset),'NOT_FOUND');
  const object=version.storage.derivatives.find(entry=>entry.key===pinned.derivative.key);
  requireValue(object,'NOT_FOUND');
  requireValue(['key','generation','sizeBytes','mimeType','sha256'].every(key=>object[key]===pinned.derivative[key]));
  // Archive/revision are mutable and deliberately excluded from a snapshot pin.
  return {version,object,storagePin:fingerprint(version.storage)};
}

/** Injected readSnapshot({request,actor,snapshotId}) must wrap actual C0
 * readSnapshot({request,id}). No service factory or archived bypass is guessed.
 * Storage has no cancellation API: abort suppresses late send, not transport. */
export async function handleSiteV3MediaReadRequest(request,response,dependencies,correlationId) {
  response.set('Cache-Control','no-store');response.set('X-Content-Type-Options','nosniff');
  let aborted=request.aborted===true,responseDone=response.destroyed===true||response.writableFinished===true,storageSettled=true,releaseReservation=null,body=null;
  const release=()=>{
    if(storageSettled&&responseDone){releaseReservation?.();releaseReservation=null;body=null;}
  };
  const finish=()=>{responseDone=true;release();};
  const close=()=>{aborted=true;responseDone=true;release();};
  const abort=()=>{aborted=true;};
  const unavailable=()=>aborted||responseDone||response.destroyed||response.writableFinished;
  request.once('aborted',abort);response.once('finish',finish);response.once('close',close);
  try {
    if(unavailable())return;
    origin(request);
    requireValue(dependencies&&typeof dependencies.authorize==='function'&&typeof dependencies.readSnapshot==='function'&&typeof dependencies.library?.readPinnedVersion==='function'&&typeof dependencies.storage?.readDerivative==='function','LOCAL_RUNTIME_UNAVAILABLE');
    const {authorize,readSnapshot,library,storage}=dependencies;
    const actor=await authorize(request,'MEMBER_READ');
    if(request.method!=='GET'){response.set('Allow','GET');throw new ApiError('METHOD_NOT_ALLOWED');}
    const route=requestRoute(request);
    if(unavailable())return;
    const snapshot=pinnedSnapshot(await readSnapshot({request,actor,snapshotId:route.snapshotId}),route);
    const selected=pinnedVersion(await library.readPinnedVersion(route.id,snapshot.asset),snapshot);
    if(unavailable())return;
    releaseReservation=reserveMediaReadBytes(selected.object.sizeBytes);
    storageSettled=false;
    try {
      body=await storage.readDerivative({key:selected.object.objectKey,generation:selected.object.generation,sizeBytes:selected.object.sizeBytes,sha256:selected.object.sha256});
    } finally {storageSettled=true;release();}
    if(unavailable())return;
    requireValue(Buffer.isBuffer(body)&&body.length===snapshot.derivative.sizeBytes&&createHash('sha256').update(body).digest('hex')===snapshot.derivative.sha256);
    const freshSnapshot=pinnedSnapshot(await readSnapshot({request,actor,snapshotId:route.snapshotId}),route);
    requireValue(freshSnapshot.pin===snapshot.pin&&fingerprint(freshSnapshot.derivative)===fingerprint(snapshot.derivative),'NOT_FOUND');
    const current=pinnedVersion(await library.readPinnedVersion(route.id,freshSnapshot.asset),freshSnapshot);
    requireValue(current.storagePin===selected.storagePin&&fingerprint(current.object)===fingerprint(selected.object),'NOT_FOUND');
    const freshActor=await authorize(request,'MEMBER_READ');
    requireValue(sameActor(actor,freshActor),'FORBIDDEN');
    if(unavailable())return;
    response.set('Content-Type',snapshot.derivative.mimeType);
    response.set('Content-Length',String(body.length));
    response.set('X-Media-SHA256',snapshot.derivative.sha256);
    response.set('X-Media-Generation',snapshot.derivative.generation);
    response.status(200).end(body);
  } catch(error) {
    if(unavailable())return;
    const safe=error instanceof ApiError?error:new ApiError('INTERNAL_ERROR');
    response.status(safe.status).json(errorEnvelope(safe,correlationId));
  } finally {
    request.removeListener('aborted',abort);
    if(response.writableFinished||response.destroyed)responseDone=true;
    release();
    if(responseDone){response.removeListener('finish',finish);response.removeListener('close',close);}
  }
}
