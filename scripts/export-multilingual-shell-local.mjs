import {canonicalJson} from '../contracts/draft.mjs';
import {parseLocaleURL,P2_FIXTURE_POLICY} from '../preview/site-locale.mjs';
import {readFile,writeFile,mkdir,lstat,realpath} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {createServer} from 'node:http';
import {renderLocalizedQaDocument} from '../preview/site-localized-qa.mjs';
import {validateHeroQaRelationships} from '../preview/hero-localization-renderer.mjs';
const CMS=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const REPO=path.dirname(CMS);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const safePath=value=>typeof value==='string'&&/^(?:assets\/)?[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value)&&!value.includes('..');
async function noLinks(target) {let current=path.parse(target).root;for(const part of target.slice(current.length).split(path.sep)){current=path.join(current,part);try{if((await lstat(current)).isSymbolicLink())throw Error('Symlink denied');}catch(error){if(error.code==='ENOENT')continue;throw error;}}}
export async function exportMultilingualShell({bundlePath,output}) {
 output=path.resolve(output);const allowed=path.join(CMS,'.local/exports/multilingual-001/p2-v1')+path.sep;const p3Allowed=path.join(CMS,'.local/exports/multilingual-001/p3-remainder-v1')+path.sep;
 if(!output.startsWith(allowed)&&!output.startsWith(p3Allowed)||output===allowed.slice(0,-1))throw Error('Output outside P2');
 await noLinks(output);bundlePath=path.resolve(bundlePath);
 const safeP1=path.join(CMS,'.local/test-outputs/multilingual-001/p1-v2/live-a2-20261016/browser-results/tests-hero-localization-ui-6f273-CAS-and-guarded-restoration/latest-qa-bundle.json');
 const inputRoots=['.local/test-outputs/multilingual-001/p2-v1/','.local/exports/multilingual-001/p2-v1/','.local/test-outputs/multilingual-001/p3-remainder-v1/'].map(item=>path.resolve(CMS,item)+path.sep);
 if(bundlePath!==safeP1&&!inputRoots.some(root=>bundlePath.startsWith(root))) throw Error('Input outside safe QA scope');
 await noLinks(bundlePath);const info=await lstat(bundlePath);if(!info.isFile()||info.nlink!==1||info.size>8_000_000)throw Error('Unsafe input file');
 const raw=await readFile(bundlePath);if(raw.length>8_000_000)throw Error('Bundle too large');
 const bundle=JSON.parse(raw);if(bundle.kind!=='LOCALIZED_HERO_QA_BUNDLE'||bundle.contractRevision!==1||!Array.isArray(bundle.entries)||bundle.entries.length!==3)throw Error('Invalid bundle');
 const resources=new Map();
 for(const entry of bundle.entries){validateHeroQaRelationships(entry.qa);if(hash(canonicalJson(entry.qa.draft.content))!==entry.qa.draft.contentHash)throw Error('Draft content hash mismatch');if(entry.qa.contractRevision!==2||!Array.isArray(entry.files)||entry.files.length!==entry.qa.resources.length)throw Error('QA2 closure required');
 for(const resource of entry.qa.resources){if(!safePath(resource.path))throw Error('Unsafe resource path');const files=entry.files.filter(file=>file.path===resource.path);if(files.length!==1||typeof files[0].base64!=='string')throw Error('Missing resource');const bytes=Buffer.from(files[0].base64,'base64');if(bytes.toString('base64')!==files[0].base64||bytes.length!==resource.sizeBytes||hash(bytes)!==resource.sha256)throw Error('Resource integrity');if(resources.has(resource.path)&&!resources.get(resource.path).equals(bytes))throw Error('Resource collision');resources.set(resource.path,bytes);}}
 // Exact public artwork/fonts used by the approved mockup, never a private snapshot.
 for(const name of ['pinky-logo.webp','pinky-mascot.webp','montserrat-400.woff','montserrat-600.woff','montserrat-700.woff','abril-fatface-400.woff']){const source=path.join(REPO,'dist/assets',name);await noLinks(source);const bytes=await readFile(source);const key='assets/'+name;if(resources.has(key)&&!resources.get(key).equals(bytes))throw Error('Baseline collision');resources.set(key,bytes);}
 for(const name of ['site-interactions.css','site-interactions.mjs','site-locale.mjs','site-locale-copy.mjs']){const source=path.join(CMS,'preview',name);await noLinks(source);resources.set(name,await readFile(source));}
 for(const locale of ['en','vi','ja'])resources.set(locale==='en'?'index.html':`${locale}/index.html`,Buffer.from(renderLocalizedQaDocument(bundle.entries,locale)));
 await mkdir(path.dirname(output),{recursive:true});await noLinks(path.dirname(output));await mkdir(output);await mkdir(path.join(output,'assets'));await mkdir(path.join(output,'vi'));await mkdir(path.join(output,'ja'));
 const manifest=[];for(const [name,bytes] of resources){await writeFile(path.join(output,name),bytes,{flag:'wx'});manifest.push({path:name,sizeBytes:bytes.length,sha256:hash(bytes)});}
 await writeFile(path.join(output,'manifest.json'),JSON.stringify({kind:'P2_LOCAL_QA',inputSha256:hash(raw),files:manifest},null,2),{flag:'wx'});
 return {output,files:manifest.length,inputSha256:hash(raw)};
}
const SERVED_FILES = new Set([
 'index.html','vi/index.html','ja/index.html','styles.css','site-interactions.css',
 'site-interactions.mjs','site-locale.mjs','site-locale-copy.mjs',
 'assets/pinky-hero.webp','assets/pinky-logo.webp','assets/pinky-mascot.webp',
 'assets/hero-presentation-v1.css','assets/abril-fatface-400.woff',
 'assets/montserrat-400.woff','assets/montserrat-600.woff',
 'assets/montserrat-700.woff','assets/montserrat-800.woff'
]);
const exactKeys=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===[...keys].sort().join(',');
async function boundedFile(file,maxBytes){
 await noLinks(file);
 const stat=await lstat(file);
 if(!stat.isFile()||stat.nlink!==1||stat.size>maxBytes)throw Error('Unsafe QA file');
 const bytes=await readFile(file);
 if(bytes.length>maxBytes)throw Error('QA file too large');
 return bytes;
}
/** Complete validation precedes socket creation; exported for network-free denial tests. */
export async function validateMultilingualShellOutput(output){
 output=path.resolve(output);
 const root=path.join(CMS,'.local/exports/multilingual-001/p2-v1')+path.sep,p3root=path.join(CMS,'.local/exports/multilingual-001/p3-remainder-v1')+path.sep;
 if(!output.startsWith(root)&&!output.startsWith(p3root))throw Error('Serve output outside P2');
 await noLinks(output);
 if(!(await lstat(output)).isDirectory())throw Error('Not QA directory');
 const manifest=JSON.parse(await boundedFile(path.join(output,'manifest.json'),32_000));
 if(!exactKeys(manifest,['kind','inputSha256','files'])||manifest.kind!=='P2_LOCAL_QA'||!/^[a-f0-9]{64}$/.test(manifest.inputSha256)||!Array.isArray(manifest.files)||manifest.files.length!==SERVED_FILES.size)throw Error('Invalid QA manifest');
 const allowed=new Map();let total=0;
 for(const item of manifest.files){
  if(!exactKeys(item,['path','sizeBytes','sha256'])||!SERVED_FILES.has(item.path)||allowed.has(item.path)||!Number.isSafeInteger(item.sizeBytes)||item.sizeBytes<1||item.sizeBytes>8_000_000||!/^[a-f0-9]{64}$/.test(item.sha256))throw Error('Invalid QA manifest entry');
  allowed.set(item.path,item);
 }
 for(const item of allowed.values()){
  const bytes=await boundedFile(path.join(output,item.path),8_000_000);total+=bytes.length;
  if(total>16_000_000||bytes.length!==item.sizeBytes||hash(bytes)!==item.sha256)throw Error('QA manifest integrity');
 }
 return {output,allowed};
}
export async function serveMultilingualShell(output) {
 const verified=await validateMultilingualShellOutput(output);output=verified.output;const allowed=verified.allowed;
 const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.woff':'font/woff','.png':'image/png'};
 const server=createServer(async(req,res)=>{try{if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}if(req.headers.host!=='127.0.0.1:4175'){res.writeHead(403).end();return;}const url=new URL(req.url,'http://127.0.0.1:4175');if(['/','/vi/','/ja/'].includes(url.pathname)){try{parseLocaleURL(url.href,undefined,P2_FIXTURE_POLICY);}catch{res.writeHead(404).end('Invalid context');return;}}else if(url.search){res.writeHead(404).end();return;}if(url.pathname.endsWith('.html')){res.writeHead(404).end('Use canonical locale route');return;}let name={'/':'index.html','/vi/':'vi/index.html','/ja/':'ja/index.html'}[url.pathname]??url.pathname.slice(1);const item=allowed.get(name);if(!item){res.writeHead(404).end('Not found');return;}const target=path.join(output,name);await noLinks(target);if(!(await realpath(target)).startsWith(output+path.sep))throw Error('Unsafe file');const bytes=await readFile(target);if(hash(bytes)!==item.sha256)throw Error('Changed export');res.writeHead(200,{'Content-Type':mime[path.extname(name)]??'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'});res.end(req.method==='HEAD'?undefined:bytes);}catch{res.writeHead(500).end('QA integrity error');}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(4175,'127.0.0.1',resolve);});return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const args=process.argv.slice(2);if(args[0]==='--serve'&&args.length===2){await serveMultilingualShell(args[1]);console.log('P2 QA http://127.0.0.1:4175');}else if(args.length===2){console.log(JSON.stringify(await exportMultilingualShell({bundlePath:args[0],output:args[1]})));}else throw Error('Usage: node export-multilingual-shell-local.mjs BUNDLE OUTPUT | --serve OUTPUT');}
