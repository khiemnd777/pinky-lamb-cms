import {videoByteRange} from './video-byte-range.mjs';
import {lstatSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {parseLocaleURL} from '../preview/site-locale.mjs';
import {digest,ownedFile,readPrivateBytes,publicPath,PUBLIC_MIME} from './multilingual-release-files.mjs';
import {CACHE_PATH,PUBLIC_ASSET_CACHE_CONTROL,PUBLIC_DOCUMENT_CACHE_CONTROL,cachePathMatches} from './public-cache-policy.mjs';

export function mimeFor(name){const ext=path.extname(name);return {'.xml':'application/xml','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.txt':'text/plain','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.woff':'font/woff','.woff2':'font/woff2','.svg':'image/svg+xml','.doc':'application/msword','.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','.xls':'application/vnd.ms-excel','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','.pdf':'application/pdf','.mp4':'video/mp4'}[ext];}
export function readReleaseManifest(relativeRoot,manifestSha256){
 if(!/^\.local\/releases\/multilingual-001\/[A-Za-z0-9_-]+\/public$/.test(relativeRoot))throw Error('Invalid release root');
 const bytes=readPrivateBytes(relativeRoot+'/manifest.json',4*1048576);
 if(digest(bytes)!==manifestSha256)throw Error('Manifest digest mismatch');
 const value=JSON.parse(bytes);
 if(value.kind!=='MULTILINGUAL_SITE_RELEASE'||value.contractRevision!==1||!Array.isArray(value.files)||value.files.length>2048)throw Error('Invalid release manifest');
 const entries=new Map();let size=0;
 for(const file of value.files){
  publicPath(file.path);size+=file.sizeBytes;
  if(size>256*1048576||(file.path.endsWith('index.html')?'text/html':mimeFor(file.path))!==file.mimeType)throw Error('Public manifest MIME/budget mismatch');
  if(entries.has(file.path)||!PUBLIC_MIME.includes(file.mimeType)||!Number.isSafeInteger(file.sizeBytes)||file.sizeBytes<1||file.sizeBytes>64*1048576||!/^[a-f0-9]{64}$/.test(file.sha256))throw Error('Invalid release entry');
  entries.set(file.path,file);
 }
 if(['index.html','vi/index.html','ja/index.html','sitemap.xml'].some(name=>!entries.has(name)))throw Error('Missing locale document');
 if(value.cacheVersion!==undefined){
  if(value.cacheVersion!==1||!Array.isArray(value.cacheAliases)||value.cacheAliases.length>2048)throw Error('Invalid release cache version');
  const aliases=new Set();
  for(const alias of value.cacheAliases){
   if(!alias||Object.keys(alias).sort().join(',')!=='path,source'||typeof alias.path!=='string'||!CACHE_PATH.test(alias.path)||aliases.has(alias.path)||entries.has(alias.path))throw Error('Invalid cache alias');
   publicPath(alias.source);const source=entries.get(alias.source);
   if(!source||!cachePathMatches(alias.path,source.sha256)||mimeFor(alias.path)!==source.mimeType)throw Error('Cache alias identity mismatch');
   aliases.add(alias.path);
  }
  for(const file of value.files)if(CACHE_PATH.test(file.path)&&!cachePathMatches(file.path,file.sha256))throw Error('Cached file identity mismatch');
 }
 return value;
}
export function verifyReleaseFiles(relativeRoot,manifestSha256){
 const manifest=readReleaseManifest(relativeRoot,manifestSha256);
 for(const entry of manifest.files){const bytes=readPrivateBytes(relativeRoot+'/'+entry.path,64*1048576);if(bytes.length!==entry.sizeBytes||digest(bytes)!==entry.sha256)throw Error('Release file missing or changed');}
 const expected=new Set(['manifest.json',...manifest.files.map(entry=>entry.path)]),actual=[];
 const walk=(relative='')=>{for(const name of readdirSync(ownedFile(relativeRoot+(relative?'/'+relative:'')))){const child=relative?relative+'/'+name:name,absolute=ownedFile(relativeRoot+'/'+child),stat=lstatSync(absolute);if(stat.isDirectory())walk(child);else actual.push(child);if(actual.length>2049)throw Error('Unexpected release files');}};
 walk();if(actual.length!==expected.size||actual.some(name=>!expected.has(name)))throw Error('Unexpected release files');
 return manifest;
}
export function createMultilingualSiteHandler({relativeRoot,manifestSha256,port=4189,retainedArtifacts=[]}){
 if(![4189,5010].includes(port))throw Error('Invalid public listener');
 const manifest=readReleaseManifest(relativeRoot,manifestSha256),entries=new Map(manifest.files.map(file=>[file.path,file]));
 if(!Array.isArray(retainedArtifacts)||retainedArtifacts.length>128)throw Error('Invalid retained release history');
 const releases=[{relativeRoot,manifest,entries},...retainedArtifacts.map(artifact=>{const old=readReleaseManifest(artifact.relativeRoot,artifact.manifestSha256);return {relativeRoot:artifact.relativeRoot,manifest:old,entries:new Map(old.files.map(file=>[file.path,file]))};})];
 const cachedFiles=new Map();
 for(const release of releases){
  if(release.manifest.cacheVersion!==1)continue;
  for(const [name,meta] of release.entries)if(CACHE_PATH.test(name)&&!cachedFiles.has(name))cachedFiles.set(name,{release,meta,name});
  for(const alias of release.manifest.cacheAliases)if(!cachedFiles.has(alias.path))cachedFiles.set(alias.path,{release,meta:release.entries.get(alias.source),name:alias.source});
 }
 if(port===5010&&manifest.qaFixture===true)throw Error('QA fixture cannot be activated');
 return(request,response)=>{
  const fail=status=>{response.writeHead(status,{'Content-Type':'text/plain','Cache-Control':'no-store'});response.end(request.method==='HEAD'?undefined:'Unavailable');};
  if(!['GET','HEAD'].includes(request.method))return fail(405);
  if(request.headers.host!==`127.0.0.1:${port}`||typeof request.url!=='string'||!request.url.startsWith('/')||request.url.startsWith('//')||request.url.includes('%')||request.url.includes('..')||request.url.includes('\\'))return fail(400);
  let url;try{url=new URL(request.url,`http://127.0.0.1:${port}`);if(url.origin!==`http://127.0.0.1:${port}`||url.hash)throw Error();if(url.search)parseLocaleURL(url.href,url.origin,manifest.policy);}catch{return fail(400);}
  let name=url.pathname.slice(1);if(['','vi/','ja/'].includes(name))name+='index.html';
  // Only locale-prefixed public assets may alias an exact manifest entry. Keep
  // generated locale scripts authoritative when they have their own entry.
  if(!entries.has(name)&&/^(?:vi|ja)\/(?:assets\/|styles(?:\.[a-f0-9]{64})?\.css$)/.test(name))name=name.slice(3);
  const cached=CACHE_PATH.test(name)?cachedFiles.get(name):null;
  const meta=cached?.meta??entries.get(name);if(!meta)return fail(404);
  try{
   const bytes=readPrivateBytes((cached?.release.relativeRoot??relativeRoot)+'/'+(cached?.name??name),64*1048576);if(bytes.length!==meta.sizeBytes||digest(bytes)!==meta.sha256)return fail(409);
   const document=manifest.cacheVersion===1&&!manifest.qaFixture&&(name.endsWith('index.html')||name==='sitemap.xml');
   const headers={'Content-Type':meta.mimeType,'Content-Length':bytes.length,'X-Content-Type-Options':'nosniff','Referrer-Policy':meta.mimeType==='text/html'?'strict-origin-when-cross-origin':'no-referrer','Cache-Control':cached&&!manifest.qaFixture?PUBLIC_ASSET_CACHE_CONTROL:document?PUBLIC_DOCUMENT_CACHE_CONTROL:'no-store','X-Robots-Tag':'noindex, nofollow'};
   if(document){headers.ETag=`"${meta.sha256}"`;if(request.headers['if-none-match']?.split(',').some(tag=>tag.trim()===headers.ETag||tag.trim()===`W/${headers.ETag}`)){delete headers['Content-Length'];response.writeHead(304,headers);response.end();return;}}
   if(manifest.qaFixture===true)headers['X-Pinky-Content']='local-qa-fixture';
   if(name.startsWith('assets/'))headers['Access-Control-Allow-Origin']='*';
   if(name==='index.html')headers['Access-Control-Allow-Origin']='http://127.0.0.1:5273';
   if(meta.mimeType==='video/mp4'){
    headers['Accept-Ranges']='bytes';headers.ETag=`"${meta.sha256}"`;
    if(request.method==='GET'&&request.headers.range!==undefined&&(!request.headers['if-range']||request.headers['if-range']===headers.ETag)){
     let range;try{range=videoByteRange(request.headers.range,bytes.length);}catch{headers['Content-Range']=`bytes */${bytes.length}`;headers['Content-Length']=0;response.writeHead(416,headers);response.end();return;}
     headers['Content-Range']=`bytes ${range.start}-${range.end}/${bytes.length}`;headers['Content-Length']=range.end-range.start+1;response.writeHead(206,headers);response.end(bytes.subarray(range.start,range.end+1));return;
    }
   }
   response.writeHead(200,headers);response.end(request.method==='HEAD'?undefined:bytes);
  }catch{return fail(409);}
 };
}
