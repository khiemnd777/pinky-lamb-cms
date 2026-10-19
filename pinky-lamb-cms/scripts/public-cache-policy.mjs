import path from 'node:path';
import {digest,publicPath} from './multilingual-release-files.mjs';

export const PUBLIC_ASSET_CACHE_SECONDS=30*24*60*60;
export const PUBLIC_ASSET_CACHE_CONTROL=`public, max-age=${PUBLIC_ASSET_CACHE_SECONDS}, immutable`;
export const PUBLIC_DOCUMENT_CACHE_CONTROL='public, no-cache';
export const CACHE_PATH=/^assets\/cache\/([a-f0-9]{64})\.(css|js|mjs|txt|webp|png|jpg|jpeg|svg|woff|woff2|pdf|mp4)$/;

export function cachedAssetPath(source,sha256){
 publicPath(source);
 if(!/^[a-f0-9]{64}$/.test(sha256))throw Error('Invalid cache digest');
 const extension=path.extname(source).slice(1);
 const result=`assets/cache/${sha256}.${extension}`;
 if(!CACHE_PATH.test(result))throw Error('Unsupported cache asset');
 return result;
}

export function cachePathMatches(pathname,sha256){return CACHE_PATH.exec(pathname)?.[1]===sha256;}

export function versionPublicReleaseFiles(files){
 const originals=[...files.values()],byPath=new Map(originals.map(file=>[file.relative,file])),versioned=new Map(),aliases=[];
 const add=(name,bytes,mimeType)=>{
  const existing=files.get(name);
  if(existing){if(existing.mimeType!==mimeType||!existing.bytes.equals(bytes))throw Error('Versioned asset collision');return;}
  files.set(name,{relative:name,bytes,mimeType});
 };
 for(const file of originals){
  if(file.mimeType==='text/html'||file.mimeType==='application/xml'||file.mimeType==='text/css'||file.relative.endsWith('/full-site-qa.js')||file.relative==='assets/full-site-qa.js')continue;
  if(file.mimeType==='text/javascript'&&!/(?:^|\/)site-locale\.mjs$|(?:^|\/)full-site-locale-copy\.mjs$/.test(file.relative))continue;
  const name=cachedAssetPath(file.relative,digest(file.bytes));
  versioned.set(file.relative,name);
  if(!aliases.some(alias=>alias.path===name))aliases.push({path:name,source:file.relative});
 }
 for(const file of originals.filter(file=>file.mimeType==='text/css')){
  const css=file.bytes.toString('utf8').replace(/url\((['"]?)(assets\/[A-Za-z0-9._-]+)\1\)/g,(_match,quote,target)=>{
   const mapped=versioned.get(target);
   if(!mapped)throw Error('Unversioned CSS asset');
   return `url(${quote}/${mapped}${quote})`;
  });
  const bytes=Buffer.from(css),name=cachedAssetPath(file.relative,digest(bytes));
  add(name,bytes,file.mimeType);versioned.set(file.relative,name);
 }
 for(const file of originals.filter(file=>file.relative.endsWith('/full-site-qa.js')||file.relative==='assets/full-site-qa.js')){
  const modulePath=versioned.get(file.relative.replace(/full-site-qa\.js$/,'site-locale.mjs'));
  if(!modulePath)throw Error('Missing cacheable locale module');
  const script=file.bytes.toString('utf8');
  if(!script.includes("'./site-locale.mjs'"))throw Error('Unexpected site script dependency');
  const bytes=Buffer.from(script.replace("'./site-locale.mjs'",`'./${path.basename(modulePath)}'`));
  const name=cachedAssetPath(file.relative,digest(bytes));
  add(name,bytes,file.mimeType);versioned.set(file.relative,name);
 }
 for(const file of originals.filter(file=>file.mimeType==='text/html')){
  const localePrefix=file.relative.includes('/')?file.relative.split('/')[0]+'/':'';
  const html=file.bytes.toString('utf8').replace(/\b(src|href|poster|content)="([^"]+)"/g,(attribute,key,target)=>{
   const pathEnd=target.search(/[?#]/),resource=pathEnd<0?target:target.slice(0,pathEnd),suffix=pathEnd<0?'':target.slice(pathEnd);
   const mapped=versioned.get(localePrefix+resource)??versioned.get(resource);
   return mapped?`${key}="/${mapped}${suffix}"`:attribute;
  });
  if(html===file.bytes.toString('utf8'))throw Error('Public document has no versioned assets');
  files.set(file.relative,{...file,bytes:Buffer.from(html)});
 }
 for(const alias of aliases){if(!byPath.has(alias.source)||files.has(alias.path))throw Error('Invalid cache alias');}
 return aliases.sort((a,b)=>a.path.localeCompare(b.path,'en'));
}
