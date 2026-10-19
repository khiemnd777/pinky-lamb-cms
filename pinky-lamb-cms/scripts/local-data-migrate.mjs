import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {ROOT} from './local-data-guard.mjs';
import {openLocalDataStore} from '../cms-api/local-data-store.mjs';
import {openLocalAuth} from '../cms-api/local-auth.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const id=/^[A-Za-z0-9_-]{1,256}$/;
const hash=/^[a-f0-9]{64}$/;
function privateDirectory(directory){const stat=fs.lstatSync(directory);if(!stat.isDirectory()||stat.isSymbolicLink()||(stat.mode&0o077)!==0||fs.realpathSync(directory)!==directory)throw Error('Private directory required');}
function syncDirectory(directory){const fd=fs.openSync(directory,'r');try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
function readManifest(custody){
 privateDirectory(custody);const file=path.join(custody,'manifest.json'),stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||(stat.mode&0o077)!==0||stat.size>256*1048576)throw Error('Invalid custody manifest');
 const value=JSON.parse(fs.readFileSync(file,'utf8'));
 if(value.version!==1||value.projectId!=='demo-pinky-lamb-cms'||!Array.isArray(value.documents)||!Array.isArray(value.users)||!Array.isArray(value.objects)||value.sourceQuiet!==true||value.complete!==true)throw Error('Source custody is incomplete');
 return value;
}
function documentRecord(record){
 if(!record||typeof record.path!=='string'||record.path.split('/').length%2!==0||record.path.split('/').some(part=>!id.test(part))||!record.data||typeof record.data!=='object'||Array.isArray(record.data)||!hash.test(record.sha256))throw Error('Invalid custody document');
 function safe(value){if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))return;if(!value||typeof value!=='object'||!(Array.isArray(value)||Object.getPrototypeOf(value)===Object.prototype))throw Error('Unsupported custody value');for(const [key,item] of Object.entries(value)){if(['__proto__','constructor','prototype'].includes(key))throw Error('Unsafe custody field');safe(item);}}
 safe(record.data);
 const body=JSON.stringify(record.data);if(Buffer.byteLength(body)>4*1048576||sha(Buffer.from(body))!==record.sha256)throw Error('Custody document digest mismatch');
 return {path:record.path,collection:record.path.slice(0,record.path.lastIndexOf('/')),body};
}
function userRecord(record){
 if(!record||!id.test(record.uid)||typeof record.email!=='string'||record.email.trim().toLowerCase()!==record.email||record.email.length>254||typeof record.emailVerified!=='boolean'||typeof record.disabled!=='boolean'||record.providerId!=='password')throw Error('Unsupported source identity');
 return record;
}
function objectRecord(record){
 if(!record||typeof record.key!=='string'||!/^private\/media\/v2\/[A-Za-z0-9_/-]{1,768}$/.test(record.key)||record.key.split('/').some(part=>!part||part==='..')||!hash.test(record.sha256)||!Number.isSafeInteger(record.sizeBytes)||record.sizeBytes<1||record.sizeBytes>128*1048576||!Number.isSafeInteger(Number(record.generation))||Number(record.generation)<1||!['application/octet-stream','image/webp','image/jpeg','image/png','application/pdf','video/mp4'].includes(record.mimeType)||!record.sourceMetadata||record.sourceMetadata.name!==record.key||record.sourceMetadata.bucket!=='demo-pinky-lamb-cms.appspot.com'||record.sourceMetadata.generation!==record.generation||Number(record.sourceMetadata.size)!==record.sizeBytes||record.sourceMetadata.contentType!==record.mimeType)throw Error('Invalid custody object');
 return record;
}
function copyObject(custody,stage,record){
 const source=path.join(custody,'objects',record.sha256.slice(0,2),record.sha256),sourceStat=fs.lstatSync(source);
 if(!sourceStat.isFile()||sourceStat.isSymbolicLink()||sourceStat.nlink!==1||sourceStat.size!==record.sizeBytes)throw Error('Custody object unavailable');
 const bytes=fs.readFileSync(source);if(sha(bytes)!==record.sha256)throw Error('Custody object digest mismatch');
 const objectsRoot=path.join(stage,'objects');
 if(!fs.existsSync(objectsRoot)){fs.mkdirSync(objectsRoot,{mode:0o700});syncDirectory(stage);}
 const parent=path.join(objectsRoot,record.sha256.slice(0,2));
 if(!fs.existsSync(parent)){fs.mkdirSync(parent,{mode:0o700});syncDirectory(objectsRoot);}
 const target=path.join(parent,record.sha256);if(!fs.existsSync(target)){
  const fd=fs.openSync(target,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);
  try{fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
  syncDirectory(parent);
 }else if(sha(fs.readFileSync(target))!==record.sha256)throw Error('Staging object mismatch');
}
async function migrateCredentials(custody,manifest,stage,sqlite){
 const source=fs.readFileSync(path.join(custody,'auth-source.json'));
 if(sha(source)!==manifest.authSourceSha256)throw Error('Auth source digest mismatch');
 const accounts=JSON.parse(source.toString('utf8'));
 if(!Array.isArray(accounts.users)||accounts.users.length!==manifest.users.length)throw Error('Auth source count mismatch');
 const byUid=new Map(accounts.users.map(user=>[user.localId,user]));
 const {auth}=await openLocalAuth({root:stage,sqlite,allowEnrollment:true});
 for(const user of manifest.users){
  const original=byUid.get(user.uid);
  if(!original||original.email?.trim().toLowerCase()!==user.email||Boolean(original.emailVerified)!==user.emailVerified||Boolean(original.disabled) !== user.disabled||original.tenantId)throw Error('Auth source identity mismatch');
  if(user.disabled||!user.emailVerified)continue;
  const member=sqlite.prepare('SELECT body FROM cms_documents WHERE path=?').get(`cmsMembers/${user.uid}`);
  const membership=member&&JSON.parse(member.body);
  if(!membership||membership.uid!==user.uid||membership.expectedEmail?.trim().toLowerCase()!==user.email||membership.isActive!==true||!Number.isSafeInteger(membership.authzVersion)||membership.authzVersion<1)throw Error('Auth membership mismatch');
  // firebase-tools local Auth 15.33.0 stores a plaintext-equivalent fakeHash.
  // Consume it only in this private process, then let Better Auth hash the password.
  if(typeof original.salt!=='string'||typeof original.passwordHash!=='string')throw Error('Unsupported source password format');
  const prefix=`fakeHash:salt=${original.salt}:password=`;
  if(!original.passwordHash.startsWith(prefix))throw Error('Unsupported source password format');
  const password=original.passwordHash.slice(prefix.length);
  if(password.length<8||password.length>128)throw Error('Source password requires owner enrollment');
  const result=await auth.api.signUpEmail({body:{email:user.email,password,name:user.email}});
  if(!result?.user?.id||result.user.email!==user.email)throw Error('Auth migration failed');
  sqlite.transaction(()=>{
   if(sqlite.prepare('UPDATE user SET emailVerified=1 WHERE id=? AND email=?').run(result.user.id,user.email).changes!==1)throw Error('Auth verification mismatch');
   sqlite.prepare('DELETE FROM session WHERE userId=?').run(result.user.id);
   sqlite.prepare('INSERT INTO cms_auth_links(auth_user_id,legacy_uid,email_normalized,source_disabled,enrolled) VALUES (?,?,?,?,1)').run(result.user.id,user.uid,user.email,0);
   if(sqlite.prepare('UPDATE cms_source_users SET enrolled=1 WHERE legacy_uid=? AND enrolled=0').run(user.uid).changes!==1)throw Error('Auth link conflict');
  }).immediate();
 }
}
/** Import only a separately verified, quiet and complete offline custody tree. */
export async function importCustody(custody,stage){
 if(!path.isAbsolute(custody)||!path.isAbsolute(stage)||custody===stage)throw Error('Separate absolute custody and staging paths required');
 privateDirectory(stage);const manifest=readManifest(custody);const store=openLocalDataStore(stage);
 try{
  const sql=store.sqlite;
  if(sql.prepare('SELECT count(*) AS n FROM cms_documents').get().n||sql.prepare('SELECT count(*) AS n FROM cms_objects').get().n||sql.prepare('SELECT count(*) AS n FROM cms_source_users').get().n)throw Error('Staging data is not empty');
  const documents=manifest.documents.map(documentRecord),users=manifest.users.map(userRecord),objects=manifest.objects.map(objectRecord);
  if(new Set(documents.map(v=>v.path)).size!==documents.length||new Set(users.map(v=>v.uid)).size!==users.length||new Set(objects.map(v=>v.key)).size!==objects.length)throw Error('Duplicate custody identity');
  for(const object of objects)copyObject(custody,stage,object);
  const insertDoc=sql.prepare('INSERT INTO cms_documents(path,collection_path,body,version) VALUES (?,?,?,1)');
  const insertUser=sql.prepare('INSERT INTO cms_source_users(legacy_uid,email_normalized,email_verified,source_disabled,provider_id) VALUES (?,?,?,?,?)');
  const insertObject=sql.prepare('INSERT INTO cms_objects(object_key,generation,sha256,size_bytes,mime_type,source_metadata) VALUES (?,?,?,?,?,?)');
  const commit=sql.transaction(()=>{
   for(const row of documents)insertDoc.run(row.path,row.collection,row.body);
   for(const row of users)insertUser.run(row.uid,row.email,Number(row.emailVerified),Number(row.disabled),row.providerId);
   for(const row of objects)insertObject.run(row.key,Number(row.generation),row.sha256,row.sizeBytes,row.mimeType,JSON.stringify(row.sourceMetadata));
   const maximum=objects.reduce((largest,row)=>Math.max(largest,Number(row.generation)),0);
   if(maximum>0)sql.prepare('INSERT INTO cms_object_generations(generation) VALUES (?)').run(maximum);
   sql.exec('CREATE TABLE cms_import_state(version INTEGER NOT NULL CHECK(version = 1), source_manifest_sha256 TEXT NOT NULL, documents INTEGER NOT NULL, users INTEGER NOT NULL, objects INTEGER NOT NULL)');
   sql.prepare('INSERT INTO cms_import_state VALUES (1,?,?,?,?)').run(sha(fs.readFileSync(path.join(custody,'manifest.json'))),documents.length,users.length,objects.length);
  });commit.immediate();
  await migrateCredentials(custody,manifest,stage,sql);
  return {documents:documents.length,users:users.length,objects:objects.length,stage};
 }finally{store.close();}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==4||process.version!=='v22.23.3'||fs.realpathSync(process.cwd())!==ROOT||process.execArgv.length||process.env.NODE_OPTIONS!==undefined)throw Error('Pinned local migration invocation required');
  console.log(await importCustody(path.resolve(process.argv[2]),path.resolve(process.argv[3])));
 }catch(error){console.error(`LOCAL_DATA_MIGRATE: ${error.message}`);process.exitCode=1;}
}
