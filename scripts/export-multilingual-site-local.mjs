import {readMultilingualSession,createMultilingualReleaseReader} from './multilingual-cms-transport.mjs';
import {constants,openSync,fstatSync,readFileSync,closeSync,mkdirSync,lstatSync,realpathSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {z} from 'zod';
import {mimeFor,verifyReleaseFiles} from './multilingual-site-artifact.mjs';
export {readReleaseManifest,verifyReleaseFiles,createMultilingualSiteHandler} from './multilingual-site-artifact.mjs';
import {canonicalJson} from '../contracts/draft.mjs';
import {parseLocalizedReleaseBundle} from '../contracts/localized-review-records.mjs';
import {parseFullSiteQa} from '../contracts/full-site-localization.mjs';
import {localizedReleasePackageSchema,releaseResourceDescriptors} from '../contracts/localized-release-package.mjs';
import {BASELINE_FILES} from './export-local.mjs';
import {renderLocalizedFullSiteDocument,validateLocalizedFullSiteQaRelationships,FULL_SITE_QA_SCRIPT,FULL_SITE_QA_SCRIPT_PATH,FULL_SITE_QA_STYLE,FULL_SITE_QA_STYLE_PATH} from '../preview/full-site-localization-renderer.mjs';
import {assertMultilingualToolingRuntime,CMS_ROOT,digest,runId,ownedFile,readPrivateJson,writeExclusive,publicPath,PUBLIC_MIME} from './multilingual-release-files.mjs';
const bundleSchema=localizedReleasePackageSchema;
const hash=value=>digest(canonicalJson(value));
export async function packageReleaseResources(release,{readResource=readPinnedReleaseResource}={}){const {resources}=releaseResourceDescriptors(release);if(typeof readResource!=='function')throw Error('Resource byte reader required');const files=[];for(const descriptor of resources.values()){const bytes=Buffer.from(await readResource(descriptor));if(bytes.length!==descriptor.sizeBytes||digest(bytes)!==descriptor.sha256)throw Error('Resource packaging mismatch');files.push({path:descriptor.path,base64:bytes.toString('base64')});}return bundleSchema.parse({release,files});}
/** Browser handoffs omit legacy bytes. Only the exact checked-in baseline pins may fill those omissions. */
export async function completeReleaseHandoff(input){
 const bundle=bundleSchema.parse(input),{resources}=releaseResourceDescriptors(bundle.release),provided=new Map();
 for(const file of bundle.files){if(provided.has(file.path)||!resources.has(file.path))throw Error('Unexpected or duplicate release resource');const bytes=Buffer.from(file.base64,'base64');if(bytes.toString('base64')!==file.base64)throw Error('Invalid release resource encoding');provided.set(file.path,bytes);}
 const complete=await packageReleaseResources(bundle.release,{readResource:descriptor=>provided.get(descriptor.path)??readPinnedReleaseResource(descriptor)});
 return {...complete,...(bundle.qaFixture?{qaFixture:true}:{})};
}
function baselineBytes(relative,expectedHash){const absolute=path.join(CMS_ROOT,'public-baseline',relative);let cursor=path.join(CMS_ROOT,'public-baseline');for(const part of relative.split('/')){cursor=path.join(cursor,part);if(lstatSync(cursor).isSymbolicLink()||realpathSync(cursor)!==cursor)throw Error('Unsafe legacy resource');}const fd=openSync(absolute,constants.O_RDONLY|constants.O_NOFOLLOW);try{const stat=fstatSync(fd);if(!stat.isFile()||stat.nlink!==1||stat.size>64*1048576)throw Error('Invalid legacy resource');const bytes=readFileSync(fd);if(digest(bytes)!==expectedHash)throw Error('Legacy compatibility pin mismatch');return bytes;}finally{closeSync(fd);}}
export function readPinnedReleaseResource(descriptor){if(descriptor.inlineBase64!==undefined){const bytes=Buffer.from(descriptor.inlineBase64,'base64');if(bytes.toString('base64')!==descriptor.inlineBase64||bytes.length!==descriptor.sizeBytes||digest(bytes)!==descriptor.sha256)throw Error('Invalid inline resource');return bytes;}const pin=BASELINE_FILES.find(p=>p.path===descriptor.path&&p.sha256===descriptor.sha256);if(!pin)throw Error('Authenticated media resource reader required; no legacy fallback');return baselineBytes(pin.path,pin.sha256);}

/** Sitemap contains only the canonical routes from the complete frozen release. */
export function renderMultilingualSitemap(release){
 const parsed=parseLocalizedReleaseBundle(release),locales=parsed.entries.map(entry=>entry.locale);
 if(hash(parsed.entries.map(q=>({locale:q.locale,dependencyVector:q.dependencyVector,dependencyHash:q.dependencyHash})))!==parsed.snapshotSetHash)throw Error('Frozen snapshot set mismatch');
 const canonical=locale=>`http://127.0.0.1:5010/${locale==='en'?'':locale+'/'}`;
 const alternates=locales.map(locale=>`    <xhtml:link rel="alternate" hreflang="${locale}" href="${canonical(locale)}"/>`).join('\n')+'\n    <xhtml:link rel="alternate" hreflang="x-default" href="http://127.0.0.1:5010/"/>';
 return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'+locales.map(locale=>`  <url>\n    <loc>${canonical(locale)}</loc>\n${alternates}\n  </url>`).join('\n')+'\n</urlset>\n';
}
/** Compose only immutable approved projections. Every enabled section is mandatory in the full DTO. */
export function planMultilingualSiteExport(input,id){
 runId(id);const bundle=bundleSchema.parse(input);parseLocalizedReleaseBundle(bundle.release);if(hash(bundle.release.entries.map(q=>({locale:q.locale,dependencyVector:q.dependencyVector,dependencyHash:q.dependencyHash})))!==bundle.release.snapshotSetHash)throw Error('Frozen snapshot set mismatch');const files=new Map(),identities=[],seen=new Set();let sourceHash,templateIdentity,policyHash,total=0;
 const add=(name,bytes,mimeType)=>{publicPath(name);if((name.endsWith('index.html')?'text/html':mimeFor(name))!==mimeType)throw Error('Public extension/MIME mismatch');if(!PUBLIC_MIME.includes(mimeType)||!Buffer.isBuffer(bytes)||bytes.length<1||bytes.length>64*1048576)throw Error('Invalid public resource');const existing=files.get(name);if(existing){if(existing.mimeType!==mimeType||!existing.bytes.equals(bytes))throw Error('Resource path collision');return;}total+=bytes.length;if(total>256*1048576)throw Error('Release exceeds public byte budget');files.set(name,{relative:name,bytes,mimeType});};
 for(const input of bundle.release.entries){
  const qa=validateLocalizedFullSiteQaRelationships(parseFullSiteQa(input));if(hash({mode:qa.mode,locale:qa.locale,dependencyVector:qa.dependencyVector,policy:qa.policy})!==qa.dependencyHash)throw Error('Projection digest mismatch');if(qa.mode!=='APPROVED_RELEASE'||qa.dependencyVector.resources.some(r=>!r.snapshotId))throw Error('Only frozen approved snapshots can be released');if(seen.has(qa.locale))throw Error('Duplicate release locale');seen.add(qa.locale);
  sourceHash??=qa.dependencyVector.sourceHash;templateIdentity??=qa.templateIdentity;policyHash??=hash(qa.policy);
  if(sourceHash!==qa.dependencyVector.sourceHash||templateIdentity!==qa.templateIdentity||policyHash!==hash(qa.policy))throw Error('Mixed source, media, policy or availability release');
  const prefix=qa.locale==='en'?'':`${qa.locale}/`,resources=new Set();
  // Media identities are shared across locales. Store each verified resource once;
  // localized document-relative asset requests resolve through the manifest-only alias.
  for(const file of bundle.files){const descriptor=qa.resources.find(r=>r.path===file.path);if(!descriptor)continue;if(resources.has(file.path))throw Error('Duplicate public bytes');resources.add(file.path);const bytes=Buffer.from(file.base64,'base64');if(bytes.toString('base64')!==file.base64||bytes.length!==descriptor.sizeBytes||digest(bytes)!==descriptor.sha256)throw Error('Resource integrity mismatch');add(file.path,bytes,descriptor.mimeType);}
  if(qa.resources.some(r=>!resources.has(r.path)))throw Error('Missing mandatory resource');
  for(const part of [qa.hero,...Object.values(qa.groups),...Object.values(qa.workServices.sections),...qa.workServices.projects,...qa.workServices.services])if(hash(part.draft.content)!==part.draft.contentHash)throw Error('Frozen content hash mismatch');
  const document=renderLocalizedFullSiteDocument(qa,{mode:'QA_EXPORT',canonicalBaseUrl:'http://127.0.0.1:5010/',availableLocales:bundle.release.entries.map(entry=>entry.locale)});
  add(prefix+'index.html',Buffer.from(document),'text/html');
  add(prefix+FULL_SITE_QA_SCRIPT_PATH,Buffer.from(FULL_SITE_QA_SCRIPT),'text/javascript');add(prefix+FULL_SITE_QA_STYLE_PATH,Buffer.from(FULL_SITE_QA_STYLE),'text/css');
  for(const name of ['site-locale.mjs','full-site-locale-copy.mjs'])add(prefix+'assets/'+name,readFileSync(new URL('../preview/'+name,import.meta.url)),'text/javascript');
  identities.push({locale:qa.locale,templateIdentity:qa.templateIdentity,dependencyHash:qa.dependencyHash,dependencyVector:qa.dependencyVector});
 }
 if(['en','vi','ja'].some(locale=>!seen.has(locale)))throw Error('Three locale release required');const allPaths=new Set(bundle.release.entries.flatMap(q=>q.resources.map(r=>r.path)));if(new Set(bundle.files.map(f=>f.path)).size!==bundle.files.length||bundle.files.some(f=>!allPaths.has(f.path)))throw Error('Unexpected release bytes');
 add('sitemap.xml',Buffer.from(renderMultilingualSitemap(bundle.release)),'application/xml');
 // Retain public callers' legacy paths/bytes. Never copy the old index or raw CMS sources; the pinned public app.js remains available to legacy callers.
 const compatibility=[];for(const pin of BASELINE_FILES){if(pin.path==='index.html')continue;const mimeType=mimeFor(pin.path);if(!mimeType)throw Error('Unsupported legacy compatibility type');const bytes=baselineBytes(pin.path,pin.sha256);add(pin.path,bytes,mimeType);compatibility.push({path:pin.path,sha256:pin.sha256});}
 const ordered=[...files.values()].sort((a,b)=>a.relative.localeCompare(b.relative,'en'));
 const manifest={contractRevision:1,kind:'MULTILINGUAL_SITE_RELEASE',presentation:{renderer:'full-site-localization-renderer-v1',rendererSha256:digest(readFileSync(new URL('../preview/full-site-localization-renderer.mjs',import.meta.url))),dictionary:'full-site-locale-copy-v1',dictionarySha256:digest(readFileSync(new URL('../preview/full-site-locale-copy.mjs',import.meta.url))),scriptSha256:digest(FULL_SITE_QA_SCRIPT),stylesheetSha256:digest(FULL_SITE_QA_STYLE)},releaseId:id,templateIdentity,sourceHash,availabilityHashes:identities.map(i=>({locale:i.locale,hash:i.dependencyVector.availabilityHash})),snapshotSetHash:bundle.release.snapshotSetHash,policy:bundle.release.entries[0].policy,identities,compatibility,files:ordered.map(f=>({path:f.relative,sizeBytes:f.bytes.length,sha256:digest(f.bytes),mimeType:f.mimeType}))};
 manifest.qaFixture=bundle.qaFixture===true;
 return {relativeRoot:`.local/releases/multilingual-001/${id}/public`,files:ordered,manifest};
}
export function exportMultilingualSite(input,id){const plan=planMultilingualSiteExport(input,id),root=ownedFile(plan.relativeRoot,{missing:true});mkdirSync(path.dirname(root),{recursive:true,mode:0o700});mkdirSync(root,{mode:0o700});for(const file of plan.files)writeExclusive(plan.relativeRoot+'/'+file.relative,file.bytes);const manifestBytes=Buffer.from(JSON.stringify(plan.manifest)+'\n');writeExclusive(plan.relativeRoot+'/manifest.json',manifestBytes);return {root:plan.relativeRoot,manifestSha256:digest(manifestBytes),releaseId:id,activation:false};}

export async function main(args=process.argv.slice(2)){
 assertMultilingualToolingRuntime();
 if(args.length!==4||!['--bundle','--release','--fetch','--serve'].includes(args[0])||args[2]!=='--run-id')throw Error('Usage: export-multilingual-site-local.mjs <--bundle input.json|--release release.json|--fetch request.json|--serve artifact.json> --run-id <id>');
 const value=readPrivateJson(args[1],360*1048576);let bundle;
 if(args[0]==='--serve'){
  const artifact=z.strictObject({relativeRoot:z.string(),manifestSha256:z.string().regex(/^[a-f0-9]{64}$/)}).parse(value),manifest=verifyReleaseFiles(artifact.relativeRoot,artifact.manifestSha256);
  if(manifest.releaseId!==args[3])throw Error('QA artifact run identity mismatch');
  const {startMultilingualQaHost}=await import('./multilingual-qa-host.mjs'),host=await startMultilingualQaHost(artifact);
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{void host.close();});
  return {state:'QA_READY',origin:'http://127.0.0.1:4189',...artifact,qaFixture:manifest.qaFixture===true,activation:false};
 }
 if(args[0]==='--bundle')bundle=await completeReleaseHandoff(value);
 else {
  let reader;
  if(args[0]==='--fetch'||value.entries?.some(entry=>entry.resources?.some(resource=>resource.derivative))){const session=await readMultilingualSession();reader=createMultilingualReleaseReader(()=>session.token);}
  if(args[0]==='--fetch')z.strictObject({contractRevision:z.literal(1),kind:z.literal('FROZEN_LOCALIZED_RELEASE_REQUEST')}).parse(value);
  const release=args[0]==='--fetch'?await reader.release():value;
  bundle=await packageReleaseResources(release,{readResource:descriptor=>descriptor.derivative?reader.resource(descriptor):readPinnedReleaseResource(descriptor)});
 }
 return exportMultilingualSite(bundle,args[3]);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{console.log(JSON.stringify(await main()));}catch(error){console.error(error.message);process.exitCode=1;}}
