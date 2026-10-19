import {lstatSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {parseLocaleURL} from '../preview/site-locale.mjs';
import {digest,ownedFile,readPrivateBytes,publicPath,PUBLIC_MIME} from './multilingual-release-files.mjs';

export function mimeFor(name){const ext=path.extname(name);return {'.xml':'application/xml','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.txt':'text/plain','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.woff':'font/woff','.woff2':'font/woff2','.svg':'image/svg+xml','.pdf':'application/pdf','.mp4':'video/mp4'}[ext];}
export function readReleaseManifest(relativeRoot,manifestSha256){if(!/^\.local\/releases\/multilingual-001\/[A-Za-z0-9_-]+\/public$/.test(relativeRoot))throw Error('Invalid release root');const bytes=readPrivateBytes(relativeRoot+'/manifest.json',4*1048576);if(digest(bytes)!==manifestSha256)throw Error('Manifest digest mismatch');const value=JSON.parse(bytes);if(value.kind!=='MULTILINGUAL_SITE_RELEASE'||value.contractRevision!==1||!Array.isArray(value.files)||value.files.length>2048)throw Error('Invalid release manifest');const names=new Set();let size=0;for(const file of value.files){publicPath(file.path);size+=file.sizeBytes;if(size>256*1048576||(file.path.endsWith('index.html')?'text/html':mimeFor(file.path))!==file.mimeType)throw Error('Public manifest MIME/budget mismatch');if(names.has(file.path)||!PUBLIC_MIME.includes(file.mimeType)||!Number.isSafeInteger(file.sizeBytes)||file.sizeBytes<1||file.sizeBytes>64*1048576||!/^[a-f0-9]{64}$/.test(file.sha256))throw Error('Invalid release entry');names.add(file.path);}if(['index.html','vi/index.html','ja/index.html','sitemap.xml'].some(name=>!names.has(name)))throw Error('Missing locale document');return value;}
export function verifyReleaseFiles(relativeRoot,manifestSha256){
 const manifest=readReleaseManifest(relativeRoot,manifestSha256);
 for(const entry of manifest.files){const bytes=readPrivateBytes(relativeRoot+'/'+entry.path,64*1048576);if(bytes.length!==entry.sizeBytes||digest(bytes)!==entry.sha256)throw Error('Release file missing or changed');}
 const expected=new Set(['manifest.json',...manifest.files.map(entry=>entry.path)]),actual=[];
 const walk=(relative='')=>{for(const name of readdirSync(ownedFile(relativeRoot+(relative?'/'+relative:'')))){const child=relative?relative+'/'+name:name,absolute=ownedFile(relativeRoot+'/'+child),stat=lstatSync(absolute);if(stat.isDirectory())walk(child);else actual.push(child);if(actual.length>2049)throw Error('Unexpected release files');}};
 walk();if(actual.length!==expected.size||actual.some(name=>!expected.has(name)))throw Error('Unexpected release files');
 return manifest;
}
export function createMultilingualSiteHandler({relativeRoot,manifestSha256,port=4189}){
 if(![4189,5010].includes(port))throw Error('Invalid public listener');
 const manifest=readReleaseManifest(relativeRoot,manifestSha256),entries=new Map(manifest.files.map(file=>[file.path,file]));
 if(port===5010&&manifest.qaFixture===true)throw Error('QA fixture cannot be activated');
 return(request,response)=>{
  const fail=status=>{response.writeHead(status,{'Content-Type':'text/plain','Cache-Control':'no-store'});response.end(request.method==='HEAD'?undefined:'Unavailable');};
  if(!['GET','HEAD'].includes(request.method))return fail(405);
  if(request.headers.host!==`127.0.0.1:${port}`||typeof request.url!=='string'||!request.url.startsWith('/')||request.url.startsWith('//')||request.url.includes('%')||request.url.includes('..')||request.url.includes('\\'))return fail(400);
  let url;try{url=new URL(request.url,`http://127.0.0.1:${port}`);if(url.origin!==`http://127.0.0.1:${port}`||url.hash)throw Error();if(url.search)parseLocaleURL(url.href,url.origin,manifest.policy);}catch{return fail(400);}
  let name=url.pathname.slice(1);if(['','vi/','ja/'].includes(name))name+='index.html';
  // Only locale-prefixed public assets may alias an exact manifest entry. Keep
  // generated locale scripts authoritative when they have their own entry.
  if(!entries.has(name)&&/^(?:vi|ja)\/(?:assets\/|styles\.css$)/.test(name))name=name.slice(3);
  const meta=entries.get(name);if(!meta)return fail(404);
  try{
   const bytes=readPrivateBytes(relativeRoot+'/'+name,64*1048576);if(bytes.length!==meta.sizeBytes||digest(bytes)!==meta.sha256)return fail(409);
   const headers={'Content-Type':meta.mimeType,'Content-Length':bytes.length,'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'};
   if(manifest.qaFixture===true)headers['X-Pinky-Content']='local-qa-fixture';
   if(name.startsWith('assets/'))headers['Access-Control-Allow-Origin']='*';
   if(name==='index.html')headers['Access-Control-Allow-Origin']='http://127.0.0.1:5273';
   response.writeHead(200,headers);response.end(request.method==='HEAD'?undefined:bytes);
  }catch{return fail(409);}
 };
}
