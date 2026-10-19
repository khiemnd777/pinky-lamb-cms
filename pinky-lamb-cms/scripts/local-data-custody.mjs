import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const PROJECT='demo-pinky-lamb-cms';
const BUCKET=`${PROJECT}.appspot.com`;
const FIRESTORE=`http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
const AUTH=`http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:batchGet?maxResults=-1`;
const STORAGE=`http://127.0.0.1:9199`;
const HEADERS={Authorization:'Bearer owner'};
const ID=/^[A-Za-z0-9_-]{1,256}$/;
const HASH=/^[a-f0-9]{64}$/;
const digest=value=>createHash('sha256').update(value).digest('hex');
const jsonBytes=value=>Buffer.from(JSON.stringify(value));

async function request(url,options={}){
 const response=await fetch(url,{...options,headers:{...HEADERS,...options.headers},redirect:'error',signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error(`Source read failed: ${new URL(url).pathname} HTTP ${response.status}`);
 return response;
}
async function getJson(url,options={}){return (await request(url,options)).json();}
async function* pages(url,key,{method='GET',body=null}={}){
 let token='';
 do{
  const next=new URL(url);if(method==='GET'&&token)next.searchParams.set('pageToken',token);
  const value=await getJson(next,{method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify({...body,...token?{pageToken:token}:{}}):undefined});
  if(value[key]!==undefined&&!Array.isArray(value[key]))throw Error(`Invalid source ${key} page`);
  yield value[key]??[];token=value.nextPageToken??'';
  if(typeof token!=='string'||token.length>8192)throw Error('Invalid source page token');
 }while(token);
}
function plain(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function fromFirestore(field){
 if(!plain(field)||Object.keys(field).length!==1)throw Error('Unsupported Firestore value');
 const [type]=Object.keys(field),value=field[type];
 if(type==='nullValue')return null;
 if(type==='stringValue')return value;
 if(type==='booleanValue')return value;
 if(type==='integerValue'){
  const number=Number(value);if(!Number.isSafeInteger(number))throw Error('Unsafe Firestore integer');return number;
 }
 if(type==='doubleValue'){
  const number=Number(value);if(!Number.isFinite(number))throw Error('Unsupported Firestore double');return number;
 }
 if(type==='arrayValue')return (value.values??[]).map(fromFirestore);
 if(type==='mapValue')return fieldsFromFirestore(value.fields??{});
 throw Error(`Unsupported Firestore type ${type}`);
}
function fieldsFromFirestore(fields){
 if(!plain(fields))throw Error('Invalid Firestore fields');
 const result=Object.create(null);
 for(const [key,value] of Object.entries(fields)){
  if(['__proto__','constructor','prototype'].includes(key))throw Error('Unsafe Firestore field');
  result[key]=fromFirestore(value);
 }
 return result;
}
function recordDocument(doc){
 const prefix=`projects/${PROJECT}/databases/(default)/documents/`;
 if(!plain(doc)||typeof doc.name!=='string'||!doc.name.startsWith(prefix))throw Error('Wrong Firestore project');
 const documentPath=doc.name.slice(prefix.length),parts=documentPath.split('/');
 if(parts.length%2!==0||parts.some(part=>!ID.test(part)))throw Error('Unsupported Firestore path');
 if(!doc.fields)return {path:documentPath,missing:true};
 const data=fieldsFromFirestore(doc.fields),sha256=digest(jsonBytes(data));
 return {path:documentPath,data,sha256,createTime:doc.createTime??null,updateTime:doc.updateTime??null};
}
async function mapLimited(values,limit,operation){
 let index=0;const result=new Array(values.length);
 await Promise.all(Array.from({length:Math.min(limit,values.length)},async()=>{while(index<values.length){const position=index++;result[position]=await operation(values[position]);}}));
 return result;
}
async function collectFirestore(){
 let parents=[''];const allPaths=[];const documents=[];const missing=[];const collections=[];
 while(parents.length){
  const collectionPages=await mapLimited(parents,16,async parent=>{
   const values=[];for await(const page of pages(`${FIRESTORE}${parent?`/${parent}`:''}:listCollectionIds`,'collectionIds',{method:'POST',body:{pageSize:1000}})){
    for(const id of page){if(!ID.test(id))throw Error('Unsupported Firestore collection ID');values.push(parent?`${parent}/${id}`:id);}
   }return values;
  });
  const levelCollections=collectionPages.flat();collections.push(...levelCollections);
  const documentPages=await mapLimited(levelCollections,12,async collection=>{
   const values=[];for await(const page of pages(`${FIRESTORE}/${collection}?pageSize=1000&showMissing=true`,'documents'))values.push(...page.map(recordDocument));return values;
  });
  parents=[];
  for(const page of documentPages)for(const record of page){parents.push(record.path);allPaths.push(record.path);if(record.missing)missing.push(record.path);else documents.push(record);}
  if(allPaths.length>50000||collections.length>20000)throw Error('Source inventory cap exceeded');
 }
 const unique=(values,label)=>{if(new Set(values).size!==values.length)throw Error(`Duplicate ${label}`);};
 unique(collections,'collection');unique(allPaths,'document path');
 documents.sort((a,b)=>a.path.localeCompare(b.path));missing.sort();collections.sort();
 return {documents,missing,collections};
}
async function collectAuth(){
 const raw=await getJson(AUTH);if(!Array.isArray(raw.users)||raw.nextPageToken)throw Error('Auth inventory incomplete');
 const users=raw.users.map(user=>{
  if(!ID.test(user.localId)||typeof user.email!=='string'||user.tenantId||!user.passwordHash||user.emailVerified!==true||user.disabled===true)throw Error('Unsupported source Auth identity');
  return {uid:user.localId,email:user.email.trim().toLowerCase(),emailVerified:true,disabled:false,providerId:'password'};
 });
 if(new Set(users.map(user=>user.uid)).size!==users.length||new Set(users.map(user=>user.email)).size!==users.length)throw Error('Duplicate Auth identity');
 users.sort((a,b)=>a.uid.localeCompare(b.uid));
 return {users,raw};
}
function privateDirectory(directory){
 const stat=fs.lstatSync(directory);
 if(!stat.isDirectory()||stat.isSymbolicLink()||stat.uid!==process.getuid()||(stat.mode&0o077)!==0||fs.realpathSync(directory)!==directory)throw Error('Private custody directory required');
}
function syncDirectory(directory){const fd=fs.openSync(directory,'r');try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
function writeExclusive(file,bytes){
 const fd=fs.openSync(file,fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_WRONLY|fs.constants.O_NOFOLLOW,0o600);
 try{fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
 syncDirectory(path.dirname(file));
}
async function collectStorage(destination,{readOnly=false}={}){
 const listing=[];for await(const page of pages(`${STORAGE}/v0/b/${BUCKET}/o?maxResults=1000`,'items'))listing.push(...page);
 const keys=listing.map(item=>item.name);if(new Set(keys).size!==keys.length)throw Error('Duplicate Storage key');
 const objectsRoot=path.join(destination,'objects');if(!fs.existsSync(objectsRoot)){if(readOnly)throw Error('Custody objects missing');fs.mkdirSync(objectsRoot,{mode:0o700});syncDirectory(destination);}
 const objects=[];
 for(const key of keys.sort()){
  if(typeof key!=='string'||!/^private\/media\/v2\/[A-Za-z0-9_/-]{1,768}$/.test(key)||key.split('/').some(part=>!part||part==='..'))throw Error('Unsupported Storage key');
  const url=`${STORAGE}/storage/v1/b/${BUCKET}/o/${encodeURIComponent(key)}`;
  const before=await getJson(url);
  if(before.name!==key||before.bucket!==BUCKET||!Number.isSafeInteger(Number(before.generation))||!Number.isSafeInteger(Number(before.size))||Number(before.size)<1||Number(before.size)>128*1048576)throw Error('Invalid Storage metadata');
  const response=await request(`${url}?alt=media&generation=${encodeURIComponent(before.generation)}`);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length!==Number(before.size))throw Error('Storage byte count mismatch');
  const after=await getJson(url);
  if(after.generation!==before.generation||after.size!==before.size||after.contentType!==before.contentType)throw Error('Storage object changed during read');
  const sha256=digest(bytes),directory=path.join(destination,'objects',sha256.slice(0,2)),file=path.join(directory,sha256);
  if(!fs.existsSync(directory)){fs.mkdirSync(directory,{mode:0o700});syncDirectory(path.dirname(directory));}
  if(fs.existsSync(file)){if(digest(fs.readFileSync(file))!==sha256)throw Error('Custody object collision');}
  else if(readOnly)throw Error('Custody object missing');
  else writeExclusive(file,bytes);
  objects.push({key,generation:before.generation,sizeBytes:bytes.length,mimeType:before.contentType??'application/octet-stream',sha256,sourceMetadata:before});
 }
 return objects;
}
function fingerprint({documents,missing,collections,users,authRaw,objects}){
 return digest(jsonBytes({documents:documents.map(({path,sha256,createTime,updateTime})=>({path,sha256,createTime,updateTime})),missing,collections,users,authRaw:digest(jsonBytes(authRaw)),objects:objects.map(({key,generation,sizeBytes,mimeType,sha256,sourceMetadata})=>({key,generation,sizeBytes,mimeType,sha256,sourceMetadata}))}));
}
export async function createCustody(destination){
 if(!path.isAbsolute(destination)||fs.existsSync(destination))throw Error('New absolute custody directory required');
 const parent=path.dirname(destination);privateDirectory(parent);
 fs.mkdirSync(destination,{mode:0o700});syncDirectory(parent);privateDirectory(destination);
 try{
  const [auth,firestore]=await Promise.all([collectAuth(),collectFirestore()]);
  const objects=await collectStorage(destination);
  const first={projectId:PROJECT,...firestore,users:auth.users,authRaw:auth.raw,objects};
  writeExclusive(path.join(destination,'auth-source.json'),jsonBytes(auth.raw));
  const [authAfter,firestoreAfter]=await Promise.all([collectAuth(),collectFirestore()]);
  const objectsAfter=await collectStorage(destination);
  const second={projectId:PROJECT,...firestoreAfter,users:authAfter.users,authRaw:authAfter.raw,objects:objectsAfter};
  if(fingerprint(first)!==fingerprint(second))throw Error('Source changed across custody reads');
  const manifest={version:1,projectId:PROJECT,complete:true,sourceQuiet:true,sourceReadPasses:2,createdAt:new Date().toISOString(),sourceFingerprint:fingerprint(first),authSourceSha256:digest(jsonBytes(auth.raw)),documents:first.documents,missingDocuments:first.missing,collections:first.collections,users:first.users,objects:first.objects};
  writeExclusive(path.join(destination,'manifest.json'),jsonBytes(manifest));
  return {documents:manifest.documents.length,missingDocuments:manifest.missingDocuments.length,collections:manifest.collections.length,users:manifest.users.length,objects:manifest.objects.length,sourceFingerprint:manifest.sourceFingerprint,destination};
 }catch(error){writeExclusive(path.join(destination,'INCOMPLETE'),Buffer.from(error.message));throw error;}
}
export async function verifySourceAgainstCustody(destination){
 privateDirectory(destination);
 const manifest=JSON.parse(fs.readFileSync(path.join(destination,'manifest.json'),'utf8'));
 if(manifest.version!==1||manifest.projectId!==PROJECT||manifest.complete!==true||!HASH.test(manifest.sourceFingerprint))throw Error('Custody manifest unavailable');
 const [auth,firestore]=await Promise.all([collectAuth(),collectFirestore()]);
 const objects=await collectStorage(destination,{readOnly:true});
 const current=fingerprint({...firestore,users:auth.users,authRaw:auth.raw,objects});
 if(current!==manifest.sourceFingerprint)throw Error('Source changed since custody');
 return {sourceFingerprint:current,documents:firestore.documents.length,users:auth.users.length,objects:objects.length,equal:true};
}
export async function verifyFirestoreAgainstCustody(destination){
 privateDirectory(destination);
 const manifest=JSON.parse(fs.readFileSync(path.join(destination,'manifest.json'),'utf8'));
 if(manifest.version!==1||manifest.projectId!==PROJECT||!Array.isArray(manifest.documents)||!Array.isArray(manifest.missingDocuments)||!Array.isArray(manifest.collections))throw Error('Custody manifest unavailable');
 const source=await collectFirestore();
 const compact=value=>digest(jsonBytes(value));
 if(compact(source.documents)!==compact(manifest.documents)||compact(source.missing)!==compact(manifest.missingDocuments)||compact(source.collections)!==compact(manifest.collections))throw Error('Firestore changed since custody');
 return {documents:source.documents.length,collections:source.collections.length,equal:true};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.version!=='v22.23.3'||process.execArgv.length||process.env.NODE_OPTIONS!==undefined)throw Error('Pinned local custody invocation required');
  let result;
  if(process.argv.length===4&&process.argv[2]==='verify')result=await verifySourceAgainstCustody(path.resolve(process.argv[3]));
  else if(process.argv.length===3)result=await createCustody(path.resolve(process.argv[2]));
  else throw Error('Use verify <custody> or <new-custody>');
  console.log(JSON.stringify(result));
 }
 catch(error){console.error(`LOCAL_DATA_CUSTODY: ${error.message}`);process.exitCode=1;}
}
