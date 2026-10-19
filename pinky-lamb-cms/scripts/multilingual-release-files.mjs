import {constants,openSync,closeSync,fstatSync,readFileSync,lstatSync,realpathSync,mkdirSync,writeFileSync,fsyncSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {validateRuntime} from './local-guard.mjs';
export const CMS_ROOT=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
export const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export const runId=value=>{if(typeof value!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(value))throw Error('Invalid multilingual run ID');return value;};
export function ownedFile(relative,{missing=false}={}){
 if(typeof relative!=='string'||!relative.startsWith('.local/')||relative.includes('\\')||relative.split('/').some(s=>!s||s==='.'||s==='..'))throw Error('Use a private task-owned path');
 const absolute=path.join(CMS_ROOT,relative);let cursor=CMS_ROOT;
 for(const segment of relative.split('/')){cursor=path.join(cursor,segment);let stat;try{stat=lstatSync(cursor);}catch(error){if(missing&&error.code==='ENOENT')continue;throw error;}if(stat.isSymbolicLink()||realpathSync(cursor)!==cursor||(!stat.isDirectory()&&!stat.isFile())||(stat.isFile()&&stat.nlink!==1))throw Error('Unsafe task-owned path');}
 return absolute;
}
export function readPrivateBytes(relative,cap=16*1048576){
 const absolute=ownedFile(relative),fd=openSync(absolute,constants.O_RDONLY|constants.O_NOFOLLOW);
 try{const before=fstatSync(fd);if(!before.isFile()||before.nlink!==1||before.size<1||before.size>cap)throw Error('Invalid input file');const bytes=readFileSync(fd),after=fstatSync(fd);if(before.size!==after.size||before.mtimeMs!==after.mtimeMs||before.ctimeMs!==after.ctimeMs||bytes.length!==before.size)throw Error('Input changed during read');return bytes;}finally{closeSync(fd);}
}
export function readPrivateJson(relative,cap){return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(readPrivateBytes(relative,cap)),(key,value)=>{if(['__proto__','constructor','prototype'].includes(key))throw Error('Forbidden object key');return value;});}
export function writeExclusive(relative,bytes){
 const destination=ownedFile(relative,{missing:true}),parent=path.dirname(destination);mkdirSync(parent,{recursive:true,mode:0o700});ownedFile(path.relative(CMS_ROOT,parent));
 const fd=openSync(destination,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
 try{writeFileSync(fd,bytes);fsyncSync(fd);}finally{closeSync(fd);}return destination;
}
export function writeJsonExclusive(relative,value){return writeExclusive(relative,Buffer.from(JSON.stringify(value)+'\n'));}
export function publicPath(value){if(value==='sitemap.xml')return value;if(typeof value!=='string'||value.length>220||! /^(?:assets\/cache\/[a-f0-9]{64}\.(?:webp|png|jpe?g|svg|woff2?|pdf|mp4|css|js|mjs|txt)|(?:(?:vi|ja)\/)?(?:index\.html|[A-Za-z0-9][A-Za-z0-9._-]*\.(?:css|js|mjs|txt)|assets\/[A-Za-z0-9][A-Za-z0-9._-]*\.(?:webp|png|jpe?g|svg|woff2?|pdf|mp4|css|js|mjs)))$/.test(value)||value.includes('..'))throw Error('Invalid public artifact path');return value;}
export const PUBLIC_MIME=Object.freeze(['application/xml','text/html','text/css','text/javascript','text/plain','image/webp','image/png','image/jpeg','image/svg+xml','font/woff','font/woff2','application/pdf','video/mp4']);

export function assertMultilingualToolingRuntime(){if(process.version!=='v22.23.3'||realpathSync(process.execPath)!==path.join(CMS_ROOT,'.local/cache/node/node-v22.23.3-darwin-arm64/bin/node')||realpathSync(process.cwd())!==CMS_ROOT||process.env.PINKY_NETWORK_FENCE!=='1')throw Error('Use the pinned local-guard multilingual command');validateRuntime();}
