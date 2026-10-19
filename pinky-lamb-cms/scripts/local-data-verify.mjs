import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {ROOT} from './local-data-guard.mjs';
import {openLocalDataStore} from '../cms-api/local-data-store.mjs';

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
function hashFile(file){
 const stat=fs.lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||(stat.mode&0o077)!==0)throw Error('Insecure object');
 const fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW),hash=createHash('sha256');
 try{const bytes=Buffer.allocUnsafe(1024*1024);let total=0,length;while((length=fs.readSync(fd,bytes,0,bytes.length,null))>0){hash.update(bytes.subarray(0,length));total+=length;}return {sha256:hash.digest('hex'),sizeBytes:total};}
 finally{fs.closeSync(fd);}
}
export function verifyLocalImport(custody,stage){
 if(!path.isAbsolute(custody)||!path.isAbsolute(stage)||custody===stage)throw Error('Separate absolute paths required');
 const manifest=JSON.parse(fs.readFileSync(path.join(custody,'manifest.json'),'utf8'));
 if(manifest.version!==1||manifest.projectId!=='demo-pinky-lamb-cms'||manifest.complete!==true||manifest.sourceQuiet!==true||!Array.isArray(manifest.documents)||!Array.isArray(manifest.objects)||!Array.isArray(manifest.users))throw Error('Custody manifest invalid');
 if(digest(fs.readFileSync(path.join(custody,'auth-source.json')))!==manifest.authSourceSha256)throw Error('Auth custody mismatch');
 const store=openLocalDataStore(stage),db=store.sqlite;
 try{
  if(db.pragma('integrity_check',{simple:true})!=='ok')throw Error('Database integrity failed');
  if(db.prepare('SELECT count(*) AS n FROM cms_documents').get().n!==manifest.documents.length||db.prepare('SELECT count(*) AS n FROM cms_objects').get().n!==manifest.objects.length||db.prepare('SELECT count(*) AS n FROM cms_source_users').get().n!==manifest.users.length)throw Error('Imported count mismatch');
  const sourceHash=digest(fs.readFileSync(path.join(custody,'manifest.json')));
  if(db.prepare('SELECT source_manifest_sha256 FROM cms_import_state').get()?.source_manifest_sha256!==sourceHash)throw Error('Imported manifest mismatch');
  const queryDocument=db.prepare('SELECT body FROM cms_documents WHERE path=?');
  for(const record of manifest.documents){const row=queryDocument.get(record.path);if(!row||digest(Buffer.from(row.body))!==record.sha256||row.body!==JSON.stringify(record.data))throw Error('Imported document mismatch');}
  const queryUser=db.prepare('SELECT email_normalized,email_verified,source_disabled,provider_id,enrolled FROM cms_source_users WHERE legacy_uid=?');
  for(const user of manifest.users){const row=queryUser.get(user.uid);if(!row||row.email_normalized!==user.email||Boolean(row.email_verified)!==user.emailVerified||Boolean(row.source_disabled)!==user.disabled||row.provider_id!==user.providerId)throw Error('Imported Auth identity mismatch');}
  const queryObject=db.prepare('SELECT generation,sha256,size_bytes,mime_type,source_metadata FROM cms_objects WHERE object_key=?');
  for(const object of manifest.objects){
   const row=queryObject.get(object.key);if(!row||String(row.generation)!==String(object.generation)||row.sha256!==object.sha256||row.size_bytes!==object.sizeBytes||row.mime_type!==object.mimeType||row.source_metadata!==JSON.stringify(object.sourceMetadata))throw Error('Imported object metadata mismatch');
   const file=path.join(stage,'objects',object.sha256.slice(0,2),object.sha256),actual=hashFile(file);
   if(actual.sha256!==object.sha256||actual.sizeBytes!==object.sizeBytes)throw Error('Imported object bytes mismatch');
  }
  return {documents:manifest.documents.length,users:manifest.users.length,objects:manifest.objects.length,integrity:'ok',sourceManifestSha256:sourceHash};
 }finally{store.close();}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{if(process.argv.length!==4||process.version!=='v22.23.3'||fs.realpathSync(process.cwd())!==ROOT||process.env.NODE_OPTIONS!==undefined)throw Error('Pinned local verification invocation required');console.log(JSON.stringify(verifyLocalImport(path.resolve(process.argv[2]),path.resolve(process.argv[3]))));}
 catch(error){console.error(`LOCAL_DATA_VERIFY: ${error.message}`);process.exitCode=1;}
}
