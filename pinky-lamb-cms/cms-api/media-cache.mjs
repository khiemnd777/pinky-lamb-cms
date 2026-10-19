import {createHash,randomUUID} from 'node:crypto';
import {constants} from 'node:fs';
import {lstat,mkdir,open,opendir} from 'node:fs/promises';
import {dirname,resolve,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ApiError} from '../contracts/errors.mjs';
import {resourceIdSchema} from '../contracts/hero.mjs';
import {attemptTupleV2Schema,cacheFactV2Schema} from '../contracts/media-v3-authority-v2.mjs';
import {derivativeV2Schema,mediaBindingV2Schema,immutableManifestAssetV2Schema,normalizedDerivativeProjectionV2,canonicalMediaV2Json,V2_MEDIA_LIMITS} from '../contracts/media-v3-contract-v2.mjs';
import {strictMediaV2JsonSchema} from '../contracts/media-v3-metadata-v2.mjs';

const CMS=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const PRIVATE_PARENT=resolve(CMS,'.local/media-cache');
const CACHE_ROOT=resolve(PRIVATE_PARENT,'m3');
const INDEX_ROOT=resolve(CACHE_ROOT,'index');
// Canonical 200 versions × 2 attempts × (48 PDF pages + 1 download) =
// 19600 derivative files; 65536 nodes also reserves directory/index headroom.
const RETAINED_BYTES=2*1024**3,INDEX_BYTES=262144,MAX_CACHE_ENTRIES=65536,MAX_CACHE_DEPTH=8;
const fail=()=>{throw new ApiError('VALIDATION_ERROR');};
const custodyFail=()=>{throw new ApiError('LOCAL_RUNTIME_UNAVAILABLE');};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function data(value,required,optional=[]) {
  if(!value||typeof value!=='object'||Object.getPrototypeOf(value)!==Object.prototype) fail();
  const descriptors=Object.getOwnPropertyDescriptors(value),names=Reflect.ownKeys(descriptors);
  if(required.some(key=>!Object.hasOwn(descriptors,key))||names.some(key=>typeof key!=='string'||![...required,...optional].includes(key)||!descriptors[key].enumerable||!Object.hasOwn(descriptors[key],'value'))) fail();
  return Object.fromEntries(names.map(key=>[key,descriptors[key].value]));
}
function entries(value) {
  if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype) fail();
  const d=Object.getOwnPropertyDescriptors(value),length=d.length?.value;
  if(!Number.isInteger(length)||length<1||length>256||Reflect.ownKeys(d).length!==length+1) fail();
  const result=[];
  for(let i=0;i<length;i++) {const item=d[String(i)];if(!item?.enumerable||!Object.hasOwn(item,'value')) fail();result.push(item.value);}
  return result;
}
function parse(schema,value) {try{return schema.parse(value);}catch{fail();}}
const sameIdentity=(a,b)=>['dev','ino','mode','uid','gid','nlink'].every(key=>a[key]===b[key]);
const sameDirectory=(a,b)=>['dev','ino','mode','uid','gid'].every(key=>a[key]===b[key]);
const sameFile=(a,b)=>sameIdentity(a,b)&&['size','mtimeNs','ctimeNs'].every(key=>a[key]===b[key]);
function privateDirectory(s) {if(!s.isDirectory()||s.isSymbolicLink()||s.uid!==BigInt(process.getuid())||s.gid!==BigInt(process.getgid())||(s.mode&0o777n)!==0o700n) custodyFail();}
async function directory(path,create=false) {
  let cursor=sep;
  for(const part of path.split(sep).filter(Boolean)) {
    cursor=resolve(cursor,part);let stat;
    try {stat=await lstat(cursor,{bigint:true});}
    catch(error) {
      if(error.code!=='ENOENT'||!create||!(cursor===PRIVATE_PARENT||cursor.startsWith(PRIVATE_PARENT+sep))) throw error;
      await mkdir(cursor,{mode:0o700});stat=await lstat(cursor,{bigint:true});
    }
    if(!stat.isDirectory()||stat.isSymbolicLink()) custodyFail();
    if(cursor===PRIVATE_PARENT||cursor.startsWith(PRIVATE_PARENT+sep)) privateDirectory(stat);
  }
  return lstat(path,{bigint:true});
}
function privateFile(s) {if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1n||s.uid!==BigInt(process.getuid())||s.gid!==BigInt(process.getgid())||(s.mode&0o777n)!==0o600n) custodyFail();}
const extensionFor=d=>d.mimeType==='image/webp'?'webp':d.mimeType==='application/pdf'?'pdf':'mp4';
const safeToken=(value,max=128)=>typeof value==='string'&&value.length>=1&&value.length<=max&&!/[^A-Za-z0-9_-]/.test(value);

// Metadata-only accounting includes incomplete retained attempts and indexes.
// A single project processing lease is the writer consistency boundary; no
// physical quota refund, cleanup, unbounded fallback scan or content experiment.
async function retainedUsage() {
  let bytes=0,count=0;const files=new Map(),directories=new Map();
  async function visit(path,depth) {
    if(depth>MAX_CACHE_DEPTH) custodyFail();
    const before=await directory(path),handle=await opendir(path,{bufferSize:32});
    for await(const entry of handle) {
      if(++count>MAX_CACHE_ENTRIES||entry.name==='.'||entry.name==='..') custodyFail();
      const child=resolve(path,entry.name),stat=await lstat(child,{bigint:true});
      if(stat.isDirectory()) {privateDirectory(stat);await visit(child,depth+1);}
      else {privateFile(stat);bytes+=Number(stat.size);if(!Number.isSafeInteger(bytes)||bytes>RETAINED_BYTES) custodyFail();files.set(relative(CACHE_ROOT,child),stat);}
    }
    const after=await directory(path);
    if(!sameDirectory(before,after)||before.mtimeNs!==after.mtimeNs||before.ctimeNs!==after.ctimeNs) custodyFail();
    directories.set(relative(CACHE_ROOT,path),after);
  }
  await visit(CACHE_ROOT,0);return {bytes,count,files,directories};
}
function unchangedFiles(before,after,owned=new Map(),ownedDirectories=new Set()) {
  for(const [name,stat] of before.files) if(!after.files.has(name)||!sameFile(stat,after.files.get(name))) custodyFail();
  for(const [name,stat] of after.files) if(!before.files.has(name)&&(!owned.has(name)||!sameFile(stat,owned.get(name)))) custodyFail();
  for(const [name,stat] of before.directories) if(!after.directories.has(name)||!sameDirectory(stat,after.directories.get(name))) custodyFail();
  for(const name of after.directories.keys()) if(!before.directories.has(name)&&!ownedDirectories.has(name)) custodyFail();
}
async function readPrivate(path,cap) {
  const parent=await directory(dirname(path)),fd=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW);
  try {
    const before=await fd.stat({bigint:true});privateFile(before);
    if(before.size<1n||before.size>BigInt(cap)||!sameFile(before,await lstat(path,{bigint:true}))) custodyFail();
    const bytes=Buffer.alloc(Number(before.size));let offset=0;
    while(offset<bytes.length) {const {bytesRead}=await fd.read(bytes,offset,bytes.length-offset,offset);if(bytesRead<=0) custodyFail();offset+=bytesRead;}
    if(!sameFile(before,await fd.stat({bigint:true}))||!sameFile(before,await lstat(path,{bigint:true}))||!sameDirectory(parent,await directory(dirname(path)))) custodyFail();
    return {bytes,custody:before,parentIdentity:parent};
  } finally {await fd.close();}
}
async function publishIndex(path,bytes,guard) {
  if(bytes.length>INDEX_BYTES) fail();
  await guard();const parent=await directory(dirname(path),true),fd=await open(path,constants.O_RDWR|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
  try {
    const identity=await fd.stat({bigint:true});privateFile(identity);
    if(!sameIdentity(identity,await lstat(path,{bigint:true}))) custodyFail();
    let offset=0;
    while(offset<bytes.length) {await guard();const {bytesWritten}=await fd.write(bytes,offset,bytes.length-offset,offset);if(bytesWritten<=0) custodyFail();offset+=bytesWritten;}
    await fd.sync();const written=await fd.stat({bigint:true});
    if(!sameIdentity(identity,written)||written.size!==BigInt(bytes.length)||!sameFile(written,await lstat(path,{bigint:true}))) custodyFail();
    const actual=Buffer.alloc(bytes.length);offset=0;
    while(offset<actual.length) {const {bytesRead}=await fd.read(actual,offset,actual.length-offset,offset);if(bytesRead<=0) custodyFail();offset+=bytesRead;}
    await guard();
    if(!actual.equals(bytes)||!sameFile(written,await fd.stat({bigint:true}))||!sameFile(written,await lstat(path,{bigint:true}))||!sameDirectory(parent,await directory(dirname(path)))) custodyFail();
    return written;
  } finally {await fd.close();}
}

// Direct bounded container MIME headers only, including fixed MP4 brands.
// This is not decoded codec/pixel/original geometry proof; that remains the
// producer's independently bound manifest responsibility.
function header(descriptor,bytes) {
  if(descriptor.mimeType==='application/pdf') {
    if(bytes.length<8||!/^%PDF-[12]\.[0-9]/.test(bytes.subarray(0,8).toString('latin1'))) fail();
    return;
  }
  if(descriptor.mimeType==='video/mp4') {
    if(bytes.length<16||bytes.toString('latin1',4,8)!=='ftyp') fail();
    const size=bytes.readUInt32BE(0);
    if(size<16||size>1024||size>bytes.length||(size-16)%4!==0) fail();
    const allowed=new Set(['isom','iso2','iso3','iso4','iso5','iso6','avc1','mp41','mp42']);
    const rejected=new Set(['avif','avis','heic','heix','hevc','hevx','heim','heis','hevm','hevs','mif1','msf1','qt  ']);
    const brands=[bytes.toString('latin1',8,12)];
    for(let offset=16;offset<size;offset+=4) brands.push(bytes.toString('latin1',offset,offset+4));
    if(brands.some(brand=>rejected.has(brand))||!brands.some(brand=>allowed.has(brand))) fail();
    return;
  }
  if(bytes.length<20||bytes.toString('latin1',0,4)!=='RIFF'||bytes.toString('latin1',8,12)!=='WEBP'||bytes.readUInt32LE(4)+8!==bytes.length) fail();
  let position=12,width=null,height=null,extended=null,images=0,chunks=0;
  while(position<bytes.length) {
    if(++chunks>1024||position+8>bytes.length) fail();
    const kind=bytes.toString('latin1',position,position+4),size=bytes.readUInt32LE(position+4),start=position+8,end=start+size;
    if(end>bytes.length||end+(size&1)>bytes.length) fail();
    if(kind==='ANIM'||kind==='ANMF') fail();
    if(kind==='VP8X') {
      if(extended||size!==10||(bytes[start]&2)!==0) fail();
      extended={width:bytes.readUIntLE(start+4,3)+1,height:bytes.readUIntLE(start+7,3)+1};
    } else if(kind==='VP8L') {
      if(++images!==1||size<5||bytes[start]!==0x2f) fail();
      const bits=bytes.readUInt32LE(start+1);width=(bits&0x3fff)+1;height=((bits>>>14)&0x3fff)+1;
    } else if(kind==='VP8 ') {
      if(++images!==1||size<10||bytes.toString('hex',start+3,start+6)!=='9d012a') fail();
      width=bytes.readUInt16LE(start+6)&0x3fff;height=bytes.readUInt16LE(start+8)&0x3fff;
    }
    position=end+(size&1);
  }
  if(images!==1||width!==descriptor.width||height!==descriptor.height||(extended&&(extended.width!==width||extended.height!==height))) fail();
}
function complete(kind,descriptors) {
  const total=descriptors.reduce((sum,d)=>sum+d.sizeBytes,0),cap=V2_MEDIA_LIMITS[kind];
  if(total>cap.outputBytes) fail();
  if(kind==='IMAGE') {
    if(descriptors.length!==3||descriptors.some(d=>d.role!=='IMAGE')||new Set(descriptors.map(d=>d.targetWidth)).size!==3) fail();
  } else if(kind==='PDF') {
    const pages=descriptors.filter(d=>d.role==='PDF_PAGE'),downloads=descriptors.filter(d=>d.role==='PDF_DOWNLOAD');
    if(downloads.length!==1||pages.length<1||pages.length>48||descriptors.length!==pages.length+1||pages.reduce((sum,d)=>sum+d.sizeBytes,0)>cap.pageBytes||new Set(pages.map(d=>d.pageNumber)).size!==pages.length||Array.from({length:pages.length},(_,i)=>i+1).some(number=>!pages.some(d=>d.pageNumber===number))) fail();
  } else {
    const videos=descriptors.filter(d=>d.role==='VIDEO'),posters=descriptors.filter(d=>d.role==='POSTER');
    if(descriptors.length!==2||videos.length!==1||posters.length!==1||videos[0].width!==posters[0].width||videos[0].height!==posters[0].height) fail();
  }
}

/** Local cache proof only. Canonical generation strings are bound values, not
 * an assertion that Storage contains any generation. No public paths returned. */
export function createMediaCache(options={}) {
  const {root=CACHE_ROOT}=data(options,[],['root']);
  if(typeof root!=='string'||root!==resolve(root)||!(root===CACHE_ROOT||root.startsWith(CACHE_ROOT+sep))) fail();
  const parts=root.slice(CACHE_ROOT.length).split(sep).filter(Boolean);
  if(parts.length>2||parts.some(part=>part.length>96||!/^[A-Za-z0-9]/.test(part)||/[^A-Za-z0-9_-]/.test(part))) fail();
  return {async verifyAttempt(request) {
    const input=data(request,['tuple','binding','metadataDigest','manifestReceiptId','derivatives']);
    const tuple=parse(attemptTupleV2Schema,input.tuple),binding=parse(mediaBindingV2Schema,input.binding);
    if(tuple.jobId.length<1||tuple.jobId.length>128||/[^A-Za-z0-9_-]/.test(tuple.jobId)) fail();
    if(tuple.assetId!==binding.assetId||tuple.kind!==binding.kind||typeof input.metadataDigest!=='string'||input.metadataDigest.length!==64||/[^a-f0-9]/.test(input.metadataDigest)) fail();
    if(!safeToken(tuple.assetId,100)) fail();
    const manifestReceiptId=parse(resourceIdSchema,input.manifestReceiptId);
    // Validate the aggregate BEFORE allocating copies, then capture every caller
    // buffer before the first asynchronous filesystem operation.
    const outputs=entries(input.derivatives).map(entry=>{
      const value=data(entry,['descriptor','bytes']),descriptor=parse(derivativeV2Schema,value.descriptor);
      if(!Buffer.isBuffer(value.bytes)||value.bytes.length!==descriptor.sizeBytes) fail();
      return {descriptor,bytes:value.bytes};
    });
    const projection=normalizedDerivativeProjectionV2(outputs.map(value=>value.descriptor));
    complete(tuple.kind,projection);
    if(sha(Buffer.from(canonicalMediaV2Json(projection)))!==binding.derivativeSetSha256) fail();
    for(const output of outputs) {
      output.bytes=Buffer.from(output.bytes);
      if(sha(output.bytes)!==output.descriptor.sha256) fail();
      header(output.descriptor,output.bytes);
    }
    const rootOwner=await directory(root,true);
    const usage=await retainedUsage(),incoming=outputs.reduce((sum,item)=>sum+item.bytes.length,0);
    if(usage.bytes+incoming+INDEX_BYTES>RETAINED_BYTES||usage.count+outputs.length+8>MAX_CACHE_ENTRIES) custodyFail();
    const job=resolve(root,tuple.jobId),jobOwner=await directory(job,true);
    const attempt=resolve(job,`attempt-${tuple.attempt}-epoch-${tuple.leaseEpoch}`);
    await mkdir(attempt,{mode:0o700}); // Refuse existing attempts, never overwrite or clean them.
    const owner=await directory(attempt),retained=[];
    const guard=async()=>{const current=await directory(attempt);if(!sameDirectory(owner,current)||!sameDirectory(rootOwner,await directory(root))||!sameDirectory(jobOwner,await directory(job))) custodyFail();};
    for(const output of outputs) {
      await guard();
      const extension=extensionFor(output.descriptor);
      const file=resolve(attempt,`${output.descriptor.key}.${extension}`);
      const fd=await open(file,constants.O_RDWR|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
      try {
        const before=await fd.stat({bigint:true});privateFile(before);
        if(!sameIdentity(before,await lstat(file,{bigint:true}))) custodyFail();
        let offset=0;
        while(offset<output.bytes.length) {await guard();const {bytesWritten}=await fd.write(output.bytes,offset,output.bytes.length-offset,offset);if(bytesWritten<=0) custodyFail();offset+=bytesWritten;}
        await fd.sync();await guard();
        const written=await fd.stat({bigint:true});privateFile(written);
        if(written.size!==BigInt(output.bytes.length)||!sameIdentity(before,written)||!sameFile(written,await lstat(file,{bigint:true}))) custodyFail();
        const actual=Buffer.alloc(output.bytes.length);offset=0;
        while(offset<actual.length) {const {bytesRead}=await fd.read(actual,offset,actual.length-offset,offset);if(bytesRead<=0) custodyFail();offset+=bytesRead;}
        await guard();const after=await fd.stat({bigint:true});
        if(!sameFile(written,after)||!sameFile(after,await lstat(file,{bigint:true}))||sha(actual)!==output.descriptor.sha256||!actual.equals(output.bytes)) custodyFail();
        header(output.descriptor,actual);
        retained.push({descriptor:output.descriptor,path:file,custody:after});
      } finally {await fd.close();}
    }
    // Reinspect the entire retained set after all outputs, before issuing proof.
    for(const entry of retained) {
      await guard();const fd=await open(entry.path,constants.O_RDONLY|constants.O_NOFOLLOW);
      try {
        const before=await fd.stat({bigint:true});privateFile(before);
        if(!sameFile(before,entry.custody)||!sameFile(before,await lstat(entry.path,{bigint:true}))) custodyFail();
        const actual=Buffer.alloc(entry.descriptor.sizeBytes);let offset=0;
        while(offset<actual.length) {await guard();const {bytesRead}=await fd.read(actual,offset,actual.length-offset,offset);if(bytesRead<=0) custodyFail();offset+=bytesRead;}
        if(actual.length!==entry.descriptor.sizeBytes||sha(actual)!==entry.descriptor.sha256||!sameFile(before,await fd.stat({bigint:true}))||!sameFile(before,await lstat(entry.path,{bigint:true}))) custodyFail();
      } finally {await fd.close();}
    }
    await guard();
    const ownedFiles=new Map(retained.map(entry=>[relative(CACHE_ROOT,entry.path),entry.custody]));
    const indexDirectory=resolve(INDEX_ROOT,tuple.assetId),indexPath=resolve(indexDirectory,`${binding.derivativeSetSha256}.json`);
    const ownedDirectories=new Set([job,attempt,INDEX_ROOT,indexDirectory].map(path=>relative(CACHE_ROOT,path)));
    const preIndex=await retainedUsage();unchangedFiles(usage,preIndex,ownedFiles,ownedDirectories);
    if(preIndex.bytes+INDEX_BYTES>RETAINED_BYTES) custodyFail();
    // Inspection ID is allocated only after actual derivative readbacks. The
    // fact is returned only after immutable index publication/readback as well.
    const inspectionId=randomUUID();
    const index={contractRevision:2,tuple,binding,metadataDigest:input.metadataDigest,manifestReceiptId,inspectionId,entries:retained.map(({descriptor,path})=>({descriptor,relativePath:relative(CACHE_ROOT,path).split(sep).join('/')}))};
    const encoded=Buffer.from(canonicalMediaV2Json(index));
    if(encoded.length>INDEX_BYTES) fail();
    const indexCustody=await publishIndex(indexPath,encoded,guard);ownedFiles.set(relative(CACHE_ROOT,indexPath),indexCustody);
    const finalUsage=await retainedUsage();unchangedFiles(usage,finalUsage,ownedFiles,ownedDirectories);await guard();
    const fact=cacheFactV2Schema.parse({contractRevision:2,verification:'MEDIA_CACHE_VERIFIED',tuple,binding,metadataDigest:input.metadataDigest,manifestReceiptId,inspectionId});
    return {fact,entries:retained.map(({descriptor,path})=>({descriptor,path}))};
  }};
}

/** Fixed-root local exporter read. Index/actors/originals never become public
 * outputs. Missing or tampered data has no Storage/HTTP/native fallback. */
export async function readMediaCacheDerivative(request) {
  const input=data(request,['asset','derivative']);
  const asset=parse(immutableManifestAssetV2Schema,input.asset),derivative=parse(derivativeV2Schema,input.derivative);
  if(!safeToken(asset.assetId,100)) fail();
  const projection=normalizedDerivativeProjectionV2(asset.derivatives);
  if(sha(Buffer.from(canonicalMediaV2Json(projection)))!==asset.derivativeSetSha256||!projection.some(entry=>canonicalMediaV2Json(entry)===canonicalMediaV2Json(derivative))) fail();
  const expectedBinding=mediaBindingV2Schema.parse({assetId:asset.assetId,kind:asset.kind,originalSha256:asset.originalSha256,derivativeSetSha256:asset.derivativeSetSha256,processingRecipeSha256:asset.processingRecipeSha256,toolSetSha256:asset.toolSetSha256});
  const indexPath=resolve(INDEX_ROOT,asset.assetId,`${asset.derivativeSetSha256}.json`);
  const initialIndex=await readPrivate(indexPath,INDEX_BYTES),rawIndex=initialIndex.bytes;
  let decoded;
  try {decoded=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(rawIndex));} catch {custodyFail();}
  parse(strictMediaV2JsonSchema,decoded);
  const index=data(decoded,['contractRevision','tuple','binding','metadataDigest','manifestReceiptId','inspectionId','entries']);
  const tuple=parse(attemptTupleV2Schema,index.tuple),binding=parse(mediaBindingV2Schema,index.binding);
  if(index.contractRevision!==2||!safeToken(tuple.jobId)||tuple.assetId!==asset.assetId||tuple.kind!==asset.kind||canonicalMediaV2Json(binding)!==canonicalMediaV2Json(expectedBinding)||index.metadataDigest!==asset.metadataDigest) custodyFail();
  parse(cacheFactV2Schema,{contractRevision:2,verification:'MEDIA_CACHE_VERIFIED',tuple,binding,metadataDigest:index.metadataDigest,manifestReceiptId:index.manifestReceiptId,inspectionId:index.inspectionId});
  const indexed=entries(index.entries).map(value=>{
    const item=data(value,['descriptor','relativePath']),descriptor=parse(derivativeV2Schema,item.descriptor);
    if(typeof item.relativePath!=='string') custodyFail();
    const parts=item.relativePath.split('/'),suffix=[tuple.jobId,`attempt-${tuple.attempt}-epoch-${tuple.leaseEpoch}`,`${descriptor.key}.${extensionFor(descriptor)}`];
    if(parts.length<3||parts.length>5||parts.slice(0,-3).some(part=>!safeToken(part,96))||parts.slice(-3).some((part,i)=>part!==suffix[i])) custodyFail();
    return {descriptor,path:resolve(CACHE_ROOT,...parts)};
  });
  const indexedProjection=normalizedDerivativeProjectionV2(indexed.map(item=>item.descriptor));
  if(canonicalMediaV2Json(indexedProjection)!==canonicalMediaV2Json(projection)||sha(Buffer.from(canonicalMediaV2Json(indexedProjection)))!==binding.derivativeSetSha256) custodyFail();
  const selected=indexed.find(item=>canonicalMediaV2Json(item.descriptor)===canonicalMediaV2Json(derivative));
  if(!selected) custodyFail();
  const selectedRead=await readPrivate(selected.path,derivative.sizeBytes),bytes=selectedRead.bytes;
  if(bytes.length!==derivative.sizeBytes||sha(bytes)!==derivative.sha256) custodyFail();
  header(derivative,bytes);
  // Re-read the fixed index after the selected file; same whole set must remain.
  const finalIndex=await readPrivate(indexPath,INDEX_BYTES);
  if(!finalIndex.bytes.equals(rawIndex)||!sameFile(initialIndex.custody,finalIndex.custody)||!sameDirectory(initialIndex.parentIdentity,finalIndex.parentIdentity)) custodyFail();
  if(!sameFile(selectedRead.custody,await lstat(selected.path,{bigint:true}))||!sameDirectory(selectedRead.parentIdentity,await directory(dirname(selected.path)))) custodyFail();
  return bytes;
}
