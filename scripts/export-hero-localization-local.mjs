import {constants,lstatSync,realpathSync,openSync,closeSync,fstatSync,readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {z} from 'zod';
import {strictSiteObject} from '../contracts/site-settings.mjs';
import {renderLocalizedHeroDocument,validateHeroQaRelationships} from '../preview/hero-localization-renderer.mjs';
import {canonicalJson} from '../contracts/draft.mjs';
const ROOT=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const fileSchema=strictSiteObject({path:z.string().max(200),base64:z.string().max(17*1024*1024)});
const bundleSchema=strictSiteObject({contractRevision:z.literal(1),kind:z.literal('LOCALIZED_HERO_QA_BUNDLE'),entries:z.array(strictSiteObject({qa:z.unknown(),files:z.array(fileSchema).min(2).max(9)})).length(3)});
function safePath(absolute,{missing=false}={}){
 if(absolute!==ROOT&&!absolute.startsWith(ROOT+path.sep))throw Error('Export path outside workspace');
 let current=ROOT;for(const part of path.relative(ROOT,absolute).split(path.sep).filter(Boolean)){current=path.join(current,part);let st;try{st=lstatSync(current);}catch(error){if(missing&&error.code==='ENOENT')continue;throw error;}if(st.isSymbolicLink()||realpathSync(current)!==current||(!st.isDirectory()&&!st.isFile())||st.isFile()&&st.nlink!==1)throw Error('Unsafe export path');}
 return absolute;
}
export function readHeroBundle(relative,{profile='v1'}={}){
 if(!['v1','v2'].includes(profile))throw Error('Invalid export profile');
 if(typeof relative!=='string'||!new RegExp(`^\\.local/(?:test-outputs|cache)/multilingual-001/p1-${profile}/[A-Za-z0-9_./-]+\\.json$`).test(relative)||relative.split('/').some(s=>s==='..'||s==='.'||s===''))throw Error('Use task-owned safe bundle input');
 const file=safePath(path.resolve(ROOT,relative)),fd=openSync(file,constants.O_RDONLY|constants.O_NOFOLLOW);
 try{const before=fstatSync(fd);if(!before.isFile()||before.nlink!==1||before.size<1||before.size>96*1024*1024)throw Error('Bundle exceeds size/type limit');const bytes=readFileSync(fd);const after=fstatSync(fd);if(before.size!==after.size||before.mtimeMs!==after.mtimeMs||bytes.length!==before.size)throw Error('Bundle changed during read');return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}finally{closeSync(fd);}
}
export function planHeroExport(input,runId,{profile='v1'}={}){
 if(!['v1','v2'].includes(profile))throw Error('Invalid export profile');
 if(typeof runId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(runId))throw Error('Invalid run ID');
 const bundle=bundleSchema.parse(input),locales=new Set(),files=[];let total=0;
 for(const entry of bundle.entries){
  const qa=validateHeroQaRelationships(entry.qa),locale=qa.draft.locale;if(qa.contractRevision!==(profile==='v2'?2:1)||entry.files.length>(profile==='v2'?9:8))throw Error('QA version/profile mismatch');if(locales.has(locale))throw Error('Duplicate locale');locales.add(locale);
  if(sha(canonicalJson(qa.draft.content))!==qa.draft.contentHash)throw Error('Saved content hash mismatch');
  const paths=new Set();for(const file of entry.files){
   if(paths.has(file.path))throw Error('Duplicate resource path');paths.add(file.path);
   const resource=qa.resources.find(r=>r.path===file.path);if(!resource||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file.base64))throw Error('Invalid resource');
   const bytes=Buffer.from(file.base64,'base64');total+=bytes.length;if(total>64*1024*1024||bytes.length!==resource.sizeBytes||sha(bytes)!==resource.sha256)throw Error('Resource integrity/size mismatch');
   files.push({relative:`${locale}/${resource.path}`,bytes});
  }
  if(qa.resources.some(r=>!paths.has(r.path)))throw Error('Missing resource bytes');
  files.push({relative:`${locale}/index.html`,bytes:Buffer.from(renderLocalizedHeroDocument(qa,{mode:'QA_EXPORT'}))});
 }
 if(['en','vi','ja'].some(locale=>!locales.has(locale)))throw Error('Require three saved locales');
 return {runId,relativeRoot:`.local/exports/multilingual-001/p1-${profile}/${runId}`,files};
}
export function exportHeroBundle(input,runId,options){
 const plan=planHeroExport(input,runId,options),root=safePath(path.resolve(ROOT,plan.relativeRoot),{missing:true});
 // Validate the whole bundle before creating a new, never reused run directory.
 const parent=path.dirname(root);mkdirSync(parent,{recursive:true,mode:0o700});safePath(parent);mkdirSync(root,{mode:0o700});
 for(const file of plan.files){const destination=path.join(root,file.relative);safePath(destination,{missing:true});mkdirSync(path.dirname(destination),{recursive:true,mode:0o700});safePath(path.dirname(destination));writeFileSync(destination,file.bytes,{flag:'wx',mode:0o600});}
 return {runId,output:plan.relativeRoot,files:plan.files.map(f=>({path:f.relative,bytes:f.bytes.length,sha256:sha(f.bytes)})),editorialApproval:false};
}
