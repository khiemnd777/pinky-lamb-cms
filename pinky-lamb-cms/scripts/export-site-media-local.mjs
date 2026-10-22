import {PINKY_VIDEO_STYLE,installPinkyVideoPlayer} from '../preview/pinky-video-player.mjs';
import {constants,lstatSync,realpathSync,openSync,closeSync,fstatSync,readSync,writeSync,mkdirSync,fsyncSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {z} from 'zod';
import {BASELINE_FILES,QA_BASE_URL} from './export-local.mjs';
import {validateMediaApplicationRuntime} from './local-guard.mjs';
import {strictMediaV2JsonSchema} from '../contracts/media-v3-metadata-v2.mjs';
import {canonicalMediaV2Json,normalizedDerivativeProjectionV2,V2_BUDGET_PROFILE,V2_MEDIA_LIMITS} from '../contracts/media-v3-contract-v2.mjs';
import {readMediaCacheDerivative} from '../cms-api/media-cache.mjs';
import {validateQaV2} from '../contracts/media-v3-records-v2.mjs';
import {renderSiteMediaDocument,collectSiteMediaReferenceIds,SITE_MEDIA_TEMPLATE_VERSION} from '../preview/site-media-renderer.mjs';

const CMS=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const MiB=1024**2;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const hashCanonical=value=>sha(canonicalMediaV2Json(value));
const same=(a,b)=>canonicalMediaV2Json(a)===canonicalMediaV2Json(b);
const fail=()=>{throw new Error('LOCAL_MEDIA_EXPORT: validation, cache custody or output containment failed');};
const exact=shape=>strictMediaV2JsonSchema.pipe(z.strictObject(shape));
const contextKeys=['contentContext','expectedImport','selectedAssetIds','orderedManifest','expectedSourceRefs','expectedMediaVersions','sourceAttestations'];
// This private transport is emitted by the authenticated Snapshot QA producer.
// Local validation checks its complete relationships; it does not mint editorial/Auth proof.
const portableSchema=exact({qaEnvelopeVersion:z.literal(3),contractRevision:z.literal(2),qa:z.unknown(),validationContext:exact(Object.fromEntries(contextKeys.map(key=>[key,z.unknown()])))});
function statMaybe(file){try{return lstatSync(file,{bigint:true});}catch(e){if(e.code==='ENOENT')return null;throw e;}}
function contained(file,{missing=false}={}){
 const absolute=path.resolve(file);if(realpathSync(CMS)!==CMS||(absolute!==CMS&&!absolute.startsWith(CMS+path.sep)))fail();
 if(absolute===CMS)return absolute;
 let cursor=CMS;
 for(const segment of path.relative(CMS,absolute).split(path.sep)){
  cursor=path.join(cursor,segment);const s=statMaybe(cursor);
  if(!s){if(missing)continue;fail();}
  if(s.isSymbolicLink()||realpathSync(cursor)!==cursor||(!s.isDirectory()&&!s.isFile())||(s.isFile()&&s.nlink!==1n))fail();
 }
 return absolute;
}
const fileSame=(a,b)=>['dev','ino','mode','uid','gid','nlink','size','mtimeNs','ctimeNs'].every(k=>a[k]===b[k]);
const directorySame=(a,b)=>['dev','ino','mode','uid','gid'].every(k=>a[k]===b[k]);
function input(file,limit,{expectedHash,expectedSize}={}){
 contained(file);const fd=openSync(file,constants.O_RDONLY|constants.O_NOFOLLOW);
 try{
  const before=fstatSync(fd,{bigint:true});
  if(!before.isFile()||before.nlink!==1n||before.size>BigInt(limit)||before.size<1n||!fileSame(before,lstatSync(file,{bigint:true})))fail();
  if(expectedSize!==undefined&&before.size!==BigInt(expectedSize))fail();
  const h=createHash('sha256'),chunk=Buffer.alloc(Math.min(MiB,Number(before.size)));let offset=0;
  while(offset<Number(before.size)){const n=readSync(fd,chunk,0,Math.min(chunk.length,Number(before.size)-offset),offset);if(n<=0)fail();h.update(chunk.subarray(0,n));offset+=n;}
  const digest=h.digest('hex');if(!fileSame(before,fstatSync(fd,{bigint:true}))||!fileSame(before,lstatSync(file,{bigint:true}))||(expectedHash!==undefined&&digest!==expectedHash))fail();
  return {source:file,stat:before,sizeBytes:offset,sha256:digest};
 }finally{closeSync(fd);}
}
function readJson(file,limit){
 const inspected=input(file,limit),fd=openSync(file,constants.O_RDONLY|constants.O_NOFOLLOW);
 try{const bytes=Buffer.alloc(inspected.sizeBytes);let offset=0;while(offset<bytes.length){const n=readSync(fd,bytes,offset,bytes.length-offset,offset);if(n<=0)fail();offset+=n;}
  if(!fileSame(inspected.stat,fstatSync(fd,{bigint:true}))||!fileSame(inspected.stat,lstatSync(file,{bigint:true}))||sha(bytes)!==inspected.sha256)fail();
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes),(key,value)=>{if(['__proto__','prototype','constructor'].includes(key))fail();return value;});
 }finally{closeSync(fd);}
}
function callbackContext(raw){
 const c=raw.validationContext,att=c.sourceAttestations;
 const parsed=exact({sourceChecks:z.unknown(),claimContext:exact({snapshot:z.unknown(),currentClaimGroups:z.unknown(),baselineClaimGroups:z.unknown(),claimSources:z.unknown(),sourceCatalog:z.unknown()})}).parse(att);
 return {...c,hashCanonical,sourceAttestations:{sourceChecks:parsed.sourceChecks,claimContext:{...parsed.claimContext,hashCanonical}}};
}
/** Complete QA relations include terminal editorial/source checks and hidden media.
 * No sample envelope, partial READY set or caller-supplied executable hash capability.
 */
export function validateSiteMediaQaEnvelope(value){
 const raw=portableSchema.parse(value);if(Buffer.byteLength(JSON.stringify(raw))>V2_BUDGET_PROFILE.qaEnvelopeVersion3)fail();
 const c=callbackContext(raw),qa=validateQaV2(raw.qa,c),snapshot=qa.snapshot;
 const selected=[...new Set(collectSiteMediaReferenceIds(snapshot.content).map(r=>r.id))].sort();
 if(!same(selected,c.selectedAssetIds)||!same(snapshot.mediaManifest,c.orderedManifest))fail();
 // Historical baseline claims belong to the authenticated CURRENT-M2 import
 // receipt carried by the QA producer. Static M2 seed copy is not that receipt.
 const versions=c.expectedMediaVersions;
 if(!Array.isArray(versions))fail();
 for(const version of versions){
  const projection=normalizedDerivativeProjectionV2(version.derivatives);
  if(hashCanonical(projection)!==version.derivativeSetSha256)fail();
 }
 return {qa,context:c};
}
async function artifactInputs(validated){
 const {qa,context}=validated,resources={},files=new Map();let total=0;
 const add=(name,entry)=>{if(!/^assets\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name)&&!['styles.css','FONT-NOTICES.txt','site-interactions.mjs','site-interactions.css'].includes(name))fail();if(files.has(name))fail();total+=entry.sizeBytes;if(total>2*1024*MiB)fail();files.set(name,entry);};
 const pins=new Map(BASELINE_FILES.map(p=>[p.path,p.sha256]));
 for(const name of ['styles.css','FONT-NOTICES.txt',...BASELINE_FILES.filter(p=>/\.woff$/.test(p.path)).map(p=>p.path)])add(name,input(path.join(CMS,'public-baseline',name),16*MiB,{expectedHash:pins.get(name)}));
 for(const name of ['site-interactions.mjs','site-interactions.css'])add(name,input(path.join(CMS,'preview',name),MiB));
 for(const [name,text] of [['assets/pinky-video.css',PINKY_VIDEO_STYLE],['assets/pinky-video-runtime.mjs','export const installPinkyVideoPlayer='+installPinkyVideoPlayer.toString()+';']]){const bytes=Buffer.from(text);add(name,{bytes,sizeBytes:bytes.length,sha256:sha(bytes)});}
 for(const entry of qa.snapshot.mediaManifest){
  const a=entry.asset,id=entry.source==='LEGACY'?a.id:a.assetId;
  if(entry.source==='LEGACY'){
   const pin=pins.get(a.legacyPath);if(!pin||pin!==a.sha256)fail();
   add(a.legacyPath,input(path.join(CMS,'public-baseline',a.legacyPath),128*MiB,{expectedHash:a.sha256,expectedSize:a.sizeBytes}));
   resources[id]={[a.kind==='IMAGE'?'image':a.kind==='PDF'?'download':'video']:a.legacyPath};continue;
  }
  const r={};
  let outputBytes=0;
  for(const d of a.derivatives){
   const ext=d.mimeType==='image/webp'?'webp':d.mimeType==='application/pdf'?'pdf':'mp4';
   // Bounded filename preserves each descriptor identity, including equal-byte
   // IMAGE buckets, without exposing IDs/generations or exceeding NAME_MAX.
   const name=`assets/m3-${hashCanonical({assetId:id,derivative:d})}.${ext}`;
   // Actual cache owner validates immutable index/full-set binding and private
   // custody. Read one derivative at a time; never retain the aggregate in RAM.
   const bytes=await readMediaCacheDerivative({asset:a,derivative:d});
   if(!Buffer.isBuffer(bytes)||bytes.length!==d.sizeBytes||sha(bytes)!==d.sha256)fail();
   add(name,{media:{asset:a,derivative:d},sizeBytes:d.sizeBytes,sha256:d.sha256});outputBytes+=d.sizeBytes;
   if(d.role==='IMAGE'&&d.targetWidth===1920)r.image=name;
   if(d.role==='PDF_DOWNLOAD')r.download=name;
   if(d.role==='VIDEO')r.video=name;
   if(d.role==='POSTER')r.poster=name;
  }
  if(outputBytes>V2_MEDIA_LIMITS[a.kind].outputBytes)fail();resources[id]=r;
 }
 const html=renderSiteMediaDocument(qa.snapshot.content,{mediaManifest:qa.snapshot.mediaManifest,resources,contentContext:context.contentContext,localBaseUrl:QA_BASE_URL,mode:'QA_EXPORT'});
 if((html.match(/<\/head>/g)??[]).length!==1)fail();
 const bytes=Buffer.from(html.replace('</head>','<link rel="stylesheet" href="site-interactions.css"><script type="module" src="site-interactions.mjs"></script></head>'));
 files.set('index.html',{bytes,sizeBytes:bytes.length,sha256:sha(bytes)});
 return files;
}
function ensureParent(dir){
 contained(dir,{missing:true});const existing=statMaybe(dir);
 if(existing){if(!existing.isDirectory())fail();return;}
 ensureParent(path.dirname(dir));mkdirSync(dir,{mode:0o755});contained(dir);
}
async function writeArtifactFile(root,rootStat,name,entry){
 if(name.includes('..')||path.isAbsolute(name))fail();const target=path.join(root,name);
 contained(root);if(!directorySame(rootStat,lstatSync(root,{bigint:true})))fail();
 ensureParent(path.dirname(target));contained(target,{missing:true});
 const out=openSync(target,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o644);
 let source;
 try{
  const h=createHash('sha256');let length=0;
  const put=bytes=>{h.update(bytes);let p=0;while(p<bytes.length){const n=writeSync(out,bytes,p,bytes.length-p);if(n<=0)fail();p+=n;}length+=bytes.length;};
  if(entry.bytes)put(entry.bytes);
  else if(entry.media){
   const bytes=await readMediaCacheDerivative(entry.media);
   if(!Buffer.isBuffer(bytes)||bytes.length!==entry.sizeBytes||sha(bytes)!==entry.sha256)fail();
   contained(root);if(!directorySame(rootStat,lstatSync(root,{bigint:true})))fail();put(bytes);
  }else{
   contained(entry.source);source=openSync(entry.source,constants.O_RDONLY|constants.O_NOFOLLOW);
   if(!fileSame(entry.stat,fstatSync(source,{bigint:true}))||!fileSame(entry.stat,lstatSync(entry.source,{bigint:true})))fail();
   const chunk=Buffer.alloc(Math.min(MiB,entry.sizeBytes));while(length<entry.sizeBytes){const n=readSync(source,chunk,0,Math.min(chunk.length,entry.sizeBytes-length),length);if(n<=0)fail();put(chunk.subarray(0,n));}
   if(!fileSame(entry.stat,fstatSync(source,{bigint:true}))||!fileSame(entry.stat,lstatSync(entry.source,{bigint:true})))fail();
  }
  if(length!==entry.sizeBytes||h.digest('hex')!==entry.sha256)fail();fsyncSync(out);
  const actual=fstatSync(out,{bigint:true});contained(target);
  if(!actual.isFile()||actual.nlink!==1n||actual.size!==BigInt(length)||!fileSame(actual,lstatSync(target,{bigint:true}))||!directorySame(rootStat,lstatSync(root,{bigint:true})))fail();
 }finally{if(source!==undefined)closeSync(source);closeSync(out);}
}
/** No output exists until complete validation/preflight succeeds. Exclusive files
 * and manifest-last make a completed artifact immutable. On I/O failure a partial
 * directory is retained without a success manifest; no cleanup or overwrite.
 */
export async function runSiteMediaExport(argv){
 validateMediaApplicationRuntime(process.env);
 if(process.env.PINKY_M3_LOCAL_APPLICATION!=='export-media'||!Array.isArray(argv)||argv.length!==4||argv[0]!=='--media-envelope'||argv[2]!=='--out')fail();
 const envelopePath=argv[1],out=argv[3];
 if(typeof envelopePath!=='string'||envelopePath.length>512||!/^\.local\/[A-Za-z0-9_./-]+\.json$(?![\s\S])/.test(envelopePath)||envelopePath.split('/').some(p=>p===''||p==='.'||p.includes('..')))fail();
 if(typeof out!=='string'||!/^\.preview-output\/m3\/[A-Za-z0-9_-]{1,128}$(?![\s\S])/.test(out))fail();
 const value=readJson(path.join(CMS,envelopePath),V2_BUDGET_PROFILE.qaEnvelopeVersion3),validated=validateSiteMediaQaEnvelope(value);
 if(out!==`.preview-output/m3/${validated.qa.snapshot.id}`)fail();
 const root=contained(path.join(CMS,out),{missing:true});if(statMaybe(root))fail();
 const files=await artifactInputs(validated);
 const manifest={schemaVersion:3,contractRevision:2,templateVersion:SITE_MEDIA_TEMPLATE_VERSION,snapshotId:validated.qa.snapshot.id,contentHash:validated.qa.snapshot.contentHash,mediaManifestHash:validated.qa.snapshot.mediaManifestHash,files:[...files].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([name,v])=>({path:name,sizeBytes:v.sizeBytes,sha256:v.sha256}))};
 ensureParent(path.dirname(root));mkdirSync(root,{mode:0o755});const rootStat=lstatSync(root,{bigint:true});
 for(const [name,entry] of files)await writeArtifactFile(root,rootStat,name,entry);
 const bytes=Buffer.from(JSON.stringify(manifest,null,2)+'\n');await writeArtifactFile(root,rootStat,'qa-manifest.json',{bytes,sizeBytes:bytes.length,sha256:sha(bytes)});
 return manifest;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))runSiteMediaExport(process.argv.slice(2)).then(()=>{console.log('Local M3 QA artifact exported — chưa xuất bản.');}).catch(()=>{console.error('LOCAL_MEDIA_EXPORT: refused or incomplete; no publication occurred.');process.exitCode=1;});
