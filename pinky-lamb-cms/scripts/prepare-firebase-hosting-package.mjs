import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdirSync} from 'node:fs';
import {readWebsitePointer,retainedWebsiteArtifacts} from './local-website-pointer.mjs';
import {verifyReleaseFiles,mimeFor} from './multilingual-site-artifact.mjs';
import {CACHE_PATH} from './public-cache-policy.mjs';
import {CMS_ROOT,digest,ownedFile,readPrivateBytes,runId,writeExclusive} from './multilingual-release-files.mjs';
import {firebaseHostingCacheConfig} from './firebase-hosting-cache-config.mjs';

const LOCAL_ORIGIN='http://127.0.0.1:4189';
const MAX_PACKAGE_BYTES=512*1048576;

function productionOrigin(value){
 const url=new URL(value);
 if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash||url.href!==value.replace(/\/$/,'')+'/'||url.hostname==='localhost'||url.hostname==='127.0.0.1')throw Error('HTTPS site origin required');
 return url.origin;
}

/** All input bytes come from verified immutable release artifacts. */
export function planFirebaseHostingPackage({artifact,retainedArtifacts=[],origin,indexing='noindex',run}){
 runId(run);
 const siteOrigin=productionOrigin(origin);
 if(!['noindex','index'].includes(indexing))throw Error('Invalid indexing mode');
 if(!Array.isArray(retainedArtifacts)||retainedArtifacts.length>128)throw Error('Invalid retained artifact list');
 const current=verifyReleaseFiles(artifact.relativeRoot,artifact.manifestSha256);
 if(current.cacheVersion!==1||current.qaFixture===true)throw Error('Production package requires a versioned approved release');
 const files=new Map();let total=0;
 const add=(name,bytes,mimeType)=>{
  if(files.has(name)){
   const prior=files.get(name);if(prior.mimeType!==mimeType||!prior.bytes.equals(bytes))throw Error('Public package path collision');
   return;
  }
  total+=bytes.length;if(total>MAX_PACKAGE_BYTES)throw Error('Hosting package byte budget exceeded');
  files.set(name,{relative:name,bytes,mimeType});
 };
 const validated=[{artifact,manifest:current},...retainedArtifacts.map(old=>({artifact:old,manifest:verifyReleaseFiles(old.relativeRoot,old.manifestSha256)}))];
 for(const {artifact:source,manifest} of validated){
  if(manifest.qaFixture===true)throw Error('QA fixture cannot be packaged');
  const entries=new Map(manifest.files.map(file=>[file.path,file]));
  for(const file of manifest.files){
   if(source!==artifact&&!CACHE_PATH.test(file.path))continue;
   const bytes=readPrivateBytes(source.relativeRoot+'/'+file.path,64*1048576);
   if(bytes.length!==file.sizeBytes||digest(bytes)!==file.sha256)throw Error('Release bytes changed');
   if(source===artifact&&(file.mimeType==='text/html'||file.mimeType==='application/xml')){
    let document=bytes.toString('utf8');
    if(!document.includes(LOCAL_ORIGIN+'/'))throw Error('Missing local canonical URL');
    document=document.replaceAll(LOCAL_ORIGIN+'/',siteOrigin+'/');
    if(indexing==='index'&&file.mimeType==='text/html'){
     if(!document.includes('<meta name="robots" content="noindex,nofollow">'))throw Error('Missing controlled robots tag');
     document=document.replace('<meta name="robots" content="noindex,nofollow">','<meta name="robots" content="index,follow">');
    }
    if(/https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\//.test(document))throw Error('Local URL remains in public document');
    add(file.path,Buffer.from(document),file.mimeType);
   }else add(file.path,bytes,file.mimeType);
  }
  if(manifest.cacheVersion===1)for(const alias of manifest.cacheAliases){
   const meta=entries.get(alias.source);
   const bytes=readPrivateBytes(source.relativeRoot+'/'+alias.source,64*1048576);
   if(bytes.length!==meta.sizeBytes||digest(bytes)!==meta.sha256||mimeFor(alias.path)!==meta.mimeType)throw Error('Cache alias bytes changed');
   add(alias.path,bytes,meta.mimeType);
  }
 }
 const outputRoot=`.local/exports/firebase-hosting/${run}`;
 return {outputRoot,origin:siteOrigin,indexing,files:[...files.values()].sort((a,b)=>a.relative.localeCompare(b.relative,'en')),config:firebaseHostingCacheConfig({indexing})};
}

export function writeFirebaseHostingPackage(plan){
 const root=ownedFile(plan.outputRoot,{missing:true});
 mkdirSync(path.dirname(root),{recursive:true,mode:0o700});
 mkdirSync(root,{mode:0o700});
 for(const file of plan.files)writeExclusive(plan.outputRoot+'/public/'+file.relative,file.bytes);
 writeExclusive(plan.outputRoot+'/firebase.json',Buffer.from(JSON.stringify(plan.config,null,2)+'\n'));
 return {outputRoot:plan.outputRoot,fileCount:plan.files.length,origin:plan.origin,indexing:plan.indexing};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);
  if(args.length!==6||args[0]!=='--run-id'||args[2]!=='--origin'||args[4]!=='--indexing')throw Error('Usage: prepare-firebase-hosting-package.mjs --run-id <id> --origin https://pinkylamb.com --indexing noindex|index');
  const pointer=readWebsitePointer();if(!pointer)throw Error('No current website release');
  const plan=planFirebaseHostingPackage({artifact:pointer.artifact,retainedArtifacts:retainedWebsiteArtifacts(pointer),run:args[1],origin:args[3],indexing:args[5]});
  console.log(JSON.stringify(writeFirebaseHostingPackage(plan)));
 }catch(error){console.error(error.message);process.exitCode=1;}
}
