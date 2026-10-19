import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {ApiError} from '../contracts/errors.mjs';

const MAX_OBJECT_BYTES=128*1024*1024;
const MIMES=new Set(['application/octet-stream','image/webp','image/jpeg','image/png','application/pdf','video/mp4']);
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const id=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(value);
const keyPattern=/^private\/media\/v2\/[A-Za-z0-9_/-]{1,768}$/;
const requireValue=condition=>{if(!condition)throw new ApiError('INTERNAL_ERROR');};
function safeKey(key){requireValue(typeof key==='string'&&keyPattern.test(key)&&!key.split('/').some(part=>part===''||part==='.'||part==='..'));return key;}
function syncDirectory(directory){const fd=fs.openSync(directory,'r');try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
function objectPath(root,sha256){return path.join(root,'objects',sha256.slice(0,2),sha256);}
function readFile(root,expected){
 const target=objectPath(root,expected.sha256),before=fs.lstatSync(target),fd=fs.openSync(target,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
 try{
  const opened=fs.fstatSync(fd);
  requireValue(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&before.dev===opened.dev&&before.ino===opened.ino&&opened.size===expected.sizeBytes&&opened.size<=MAX_OBJECT_BYTES);
  const bytes=fs.readFileSync(fd),after=fs.fstatSync(fd);
  requireValue(bytes.length===expected.sizeBytes&&after.size===opened.size&&after.mtimeMs===opened.mtimeMs&&digest(bytes)===expected.sha256);
  return bytes;
 }finally{fs.closeSync(fd);}
}

/** The object file is durable before its database reference is committed. */
export function createLocalMediaStore({root,sqlite}){
 requireValue(path.isAbsolute(root)&&sqlite&&typeof sqlite.prepare==='function');
 const objects=path.join(root,'objects');
 if(!fs.existsSync(objects)){fs.mkdirSync(objects,{mode:0o700});syncDirectory(root);}
 requireValue(fs.realpathSync(objects)===objects&&(fs.lstatSync(objects).mode&0o077)===0);
 const select=sqlite.prepare('SELECT object_key, generation, sha256, size_bytes, mime_type FROM cms_objects WHERE object_key=?');
 const generate=sqlite.prepare('INSERT INTO cms_object_generations DEFAULT VALUES');
 const insert=sqlite.prepare('INSERT INTO cms_objects(object_key,generation,sha256,size_bytes,mime_type) VALUES (?,?,?,?,?)');
 function record(key){return select.get(safeKey(key));}
 function publicMeta(row){return {key:row.object_key,generation:String(row.generation),sizeBytes:row.size_bytes,mimeType:row.mime_type,sha256:row.sha256};}
 async function stat(key,{allowAbsent=false}={}){
  const row=record(key);
  if(!row){if(allowAbsent)return null;throw new ApiError('INTERNAL_ERROR');}
  readFile(root,{sha256:row.sha256,sizeBytes:row.size_bytes});
  return publicMeta(row);
 }
 async function readObject({key,generation,sizeBytes,sha256}){
  const row=record(key);
  requireValue(row&&String(row.generation)===generation&&row.size_bytes===sizeBytes&&row.sha256===sha256);
  return readFile(root,{sha256:row.sha256,sizeBytes:row.size_bytes});
 }
 async function writeObject(key,bytes,mimeType,sha256){
  safeKey(key);requireValue(Buffer.isBuffer(bytes)&&bytes.length>0&&bytes.length<=MAX_OBJECT_BYTES&&MIMES.has(mimeType)&&digest(bytes)===sha256);
  const prior=record(key);
  if(prior){requireValue(prior.sha256===sha256&&prior.size_bytes===bytes.length&&prior.mime_type===mimeType);readFile(root,{sha256,sizeBytes:bytes.length});return publicMeta(prior);}
  const directory=path.join(objects,sha256.slice(0,2));
  if(!fs.existsSync(directory)){fs.mkdirSync(directory,{mode:0o700});syncDirectory(objects);}
  requireValue(fs.realpathSync(directory)===directory&&(fs.lstatSync(directory).mode&0o077)===0);
  const destination=objectPath(root,sha256);
  if(fs.existsSync(destination))readFile(root,{sha256,sizeBytes:bytes.length});
  else{
   const temporary=path.join(directory,`.pending-${randomUUID()}`);
   const fd=fs.openSync(temporary,fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_WRONLY|fs.constants.O_NOFOLLOW,0o600);
   try{fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
   // A failed durability step leaves an orphan for explicit reconciliation.
   fs.renameSync(temporary,destination);syncDirectory(directory);
  }
  const commit=sqlite.transaction(()=>{
   const existing=record(key);
   if(existing){requireValue(existing.sha256===sha256&&existing.size_bytes===bytes.length&&existing.mime_type===mimeType);return existing;}
   const generation=generate.run().lastInsertRowid;
   insert.run(key,generation,sha256,bytes.length,mimeType);
   return record(key);
  });
  return publicMeta(commit.immediate());
 }
 const partKey=({assetId,objectId})=>{requireValue(id(assetId)&&id(objectId));return `private/media/v2/${assetId}/parts/${objectId}`;};
 const originalKey=({assetId,originalId})=>{requireValue(id(assetId)&&id(originalId));return `private/media/v2/${assetId}/originals/${originalId}`;};
 return Object.freeze({
  stat,readDerivative:readObject,
  async writeUpload({target,declaration},bytes){
   const key=target.partIndex===null?originalKey({assetId:target.assetId,originalId:target.objectId}):partKey({assetId:target.assetId,objectId:target.objectId});
   requireValue(bytes.length===declaration.content.sizeBytes&&digest(bytes)===declaration.content.sha256);
   return writeObject(key,bytes,'application/octet-stream',declaration.content.sha256);
  },
  readPart:row=>readObject({key:partKey({assetId:row.assetId,objectId:row.partId}),generation:row.generation,sizeBytes:row.sizeBytes,sha256:row.sha256}),
  readOriginal:row=>readObject({key:originalKey(row),generation:row.generation,sizeBytes:row.sizeBytes,sha256:row.sha256}),
  async writeDerivative({assetId,jobId,attempt,leaseEpoch,objectId,bytes,mimeType,sha256}){
   requireValue(id(assetId)&&id(jobId)&&id(objectId)&&[1,2].includes(attempt)&&Number.isSafeInteger(leaseEpoch)&&leaseEpoch>0);
   return writeObject(`private/media/v2/${assetId}/jobs/${jobId}/${attempt}/${leaseEpoch}/${objectId}`,bytes,mimeType,sha256);
  }
 });
}
