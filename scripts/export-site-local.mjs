import {readFileSync,lstatSync,realpathSync,readdirSync,mkdirSync,writeFileSync,renameSync,unlinkSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {BASELINE_FILES,QA_BASE_URL} from './export-local.mjs';
import {BASELINE_INPUT_PINS,loadBaselineInputs,mapBaselineSite} from './map-baseline-site.mjs';
import {canonicalJson} from '../contracts/draft.mjs';
import {strictSiteObject} from '../contracts/site-settings.mjs';
import {siteImportLineageSchema} from '../contracts/site-draft.mjs';
import {validateSiteProofRelations} from '../contracts/source-checks.mjs';
import {validateSiteSnapshot,encodeStoredSiteSnapshot} from '../cms-api/site-snapshots.mjs';
import {renderSiteDocument,TEMPLATE_VERSION} from '../preview/site-renderer.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ENVELOPE_LIMIT=1048576;
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const hashCanonical=value=>sha256(canonicalJson(value));
const envelopeSchema=strictSiteObject({qaEnvelopeVersion:z.literal(2),snapshot:z.unknown(),reviewState:z.unknown(),review:z.unknown(),sourceChecks:z.array(z.unknown()).max(61)});
const manifestSchema=z.strictObject({schemaVersion:z.literal(2),templateVersion:z.literal(TEMPLATE_VERSION),contentHash:z.string().regex(/^[a-f0-9]{64}$/),files:z.array(z.strictObject({path:z.string(),sha256:z.string().regex(/^[a-f0-9]{64}$/)}))});
function refuse(){throw new Error('LOCAL_SITE_EXPORT: validation or containment failed');}
function statIfPresent(filename){try{return lstatSync(filename);}catch(error){if(error.code==='ENOENT')return null;throw error;}}
function bytesOf(value){return Buffer.from(JSON.stringify(value));}

/** Trusted injected context is for local callers/tests; the CLI always rebuilds pinned inputs. */
export function validateSiteQaEnvelope(value,{baseline,catalog}={}){
 const envelope=envelopeSchema.parse(value);
 if(bytesOf(envelope).length>ENVELOPE_LIMIT || !baseline?.content || !baseline?.provenance || !baseline?.context || !Array.isArray(catalog))refuse();
 const lineage=siteImportLineageSchema.parse(envelope.snapshot?.importLineage);
 if(lineage.baselineManifestHash!==baseline.provenance.baselineManifestHash || lineage.importReportHash!==baseline.provenance.reportHash)refuse();
 const context={...baseline.context,catalog,importLineage:lineage,currentYear:new Date().getUTCFullYear(),baselineContent:baseline.content};
 const snapshot=validateSiteSnapshot(envelope.snapshot,context);
 encodeStoredSiteSnapshot(snapshot,context);
 if(envelope.sourceChecks.some(record=>bytesOf(record).length>8192))refuse();
 validateSiteProofRelations({...envelope,snapshot},context,hashCanonical,{proofView:'APPROVED'});
 return {envelope:{...envelope,snapshot},context};
}

// All ancestors are checked with lstat, including dangling links. No credential paths are read.
function checkedPath(filename,{missing=false,base=ROOT}={}){
 const absolute=path.resolve(filename);
 if(realpathSync(base)!==base || (absolute!==base && !absolute.startsWith(base+path.sep)))refuse();
 let current=base;
 for(const segment of path.relative(base,absolute).split(path.sep).filter(Boolean)){
  current=path.join(current,segment);const stat=statIfPresent(current);
  if(!stat){if(missing)continue;refuse();}
  if(stat.isSymbolicLink() || realpathSync(current)!==current || (!stat.isDirectory() && !stat.isFile()) || (stat.isFile() && stat.nlink!==1))refuse();
 }
 return absolute;
}
function readRegular(filename){const checked=checkedPath(filename);if(!lstatSync(checked).isFile())refuse();return readFileSync(checked);}
function readJson(filename,limit){
 const checked=checkedPath(filename),stat=lstatSync(checked);
 if(!stat.isFile() || stat.size>limit)refuse();
 const bytes=readFileSync(checked);if(bytes.length>limit)refuse();
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes),(key,value)=>{if(['__proto__','prototype','constructor'].includes(key))refuse();return value;});
}
function trustedInputs(){
 const projectRoot=path.dirname(ROOT);
 for(const pin of BASELINE_INPUT_PINS){
  const filename=checkedPath(path.join(projectRoot,pin.path),{base:projectRoot});
  if(!lstatSync(filename).isFile())refuse();
 }
 const baseline=mapBaselineSite(loadBaselineInputs());
 for(const [name,expected] of [['baseline-site.json',baseline.content],['baseline-provenance.json',baseline.provenance]]){
  if(canonicalJson(readJson(path.join(ROOT,'contracts',name),ENVELOPE_LIMIT))!==canonicalJson(expected))refuse();
 }
 const catalog=baseline.context.catalog,files=new Map();
 for(const record of BASELINE_FILES){
  const bytes=readRegular(path.join(ROOT,'public-baseline',record.path));
  if(sha256(bytes)!==record.sha256)refuse();
  if(!['app.js','content.js','index.html'].includes(record.path))files.set(record.path,bytes);
 }
 // The mapper verifies all thirty catalog files, including hidden and fixed artwork,
 // against pinned source/public bytes. Recheck the copy used for this artifact.
 for(const asset of catalog){const bytes=files.get(asset.legacyPath);if(!bytes || bytes.length!==asset.sizeBytes || sha256(bytes)!==asset.sha256)refuse();}
 return {baseline,catalog,files};
}
function artifactFiles(envelope,context,files){
 const publicAssets=Object.fromEntries(envelope.snapshot.mediaManifest.map(asset=>[asset.id,{id:asset.id,kind:asset.kind,path:asset.legacyPath,...Object.fromEntries(['width','height','durationSeconds'].filter(key=>asset[key]!==undefined).map(key=>[key,asset[key]]))}]));
 const html=renderSiteDocument(envelope.snapshot.content,{publicAssets,localBaseUrl:QA_BASE_URL,mode:'QA_EXPORT',sourceIds:context.sourceIds,allowedShowreelSourceUrl:context.allowedShowreelSourceUrl,currentYear:context.currentYear});
 if((html.match(/<\/head>/g)??[]).length!==1)refuse();
 files.set('index.html',Buffer.from(html.replace('</head>','<link rel="stylesheet" href="site-interactions.css"><script type="module" src="site-interactions.mjs"></script></head>')));
 for(const name of ['site-interactions.mjs','site-interactions.css'])files.set(name,readRegular(path.join(ROOT,'preview',name)));
 const manifest={schemaVersion:2,templateVersion:TEMPLATE_VERSION,contentHash:envelope.snapshot.contentHash,files:[...files].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([name,bytes])=>({path:name,sha256:sha256(bytes)}))};
 files.set('qa-manifest.json',Buffer.from(JSON.stringify(manifest,null,2)+'\n'));
 return {files,manifest};
}
function inspectOwnedTree(destination,expectedNames){
 const rootStat=statIfPresent(destination);if(!rootStat)return;
 if(!rootStat.isDirectory())refuse();
 const owned=manifestSchema.parse(readJson(path.join(destination,'qa-manifest.json'),ENVELOPE_LIMIT));
 const names=owned.files.map(record=>record.path);
 if(new Set(names).size!==names.length || canonicalJson([...names].sort())!==canonicalJson([...expectedNames].filter(name=>name!=='qa-manifest.json').sort()))refuse();
 for(const record of owned.files){if(!expectedNames.has(record.path) || sha256(readRegular(path.join(destination,record.path)))!==record.sha256)refuse();}
 const allowedDirectories=new Set();
 for(const name of expectedNames){let directory=path.posix.dirname(name);while(directory!=='.'){allowedDirectories.add(directory);directory=path.posix.dirname(directory);}}
 function walk(directory){
  checkedPath(directory);
  for(const name of readdirSync(directory)){
   const filename=path.join(directory,name),relative=path.relative(destination,filename).split(path.sep).join('/');
   const stat=lstatSync(filename);checkedPath(filename);
   if(stat.isDirectory()){if(!allowedDirectories.has(relative))refuse();walk(filename);}
   else if(!stat.isFile() || !expectedNames.has(relative))refuse();
  }
 }
 walk(destination);
}
function atomicWrite(filename,bytes){
 checkedPath(filename,{missing:true});mkdirSync(path.dirname(filename),{recursive:true});checkedPath(path.dirname(filename));
 const temporary=path.join(path.dirname(filename),`.site-export-${randomUUID()}.tmp`);
 try{writeFileSync(temporary,bytes,{flag:'wx',mode:0o644});checkedPath(filename,{missing:true});renameSync(temporary,filename);}
 finally{if(statIfPresent(temporary))unlinkSync(temporary);}
}
/** Individual file replacement is atomic; a later I/O failure is not a whole-export rollback. */
export function exportSiteEnvelope({envelopePath='tests/fixtures/approved-site.json',out}={}){
 if(typeof envelopePath!=='string' || !(envelopePath==='tests/fixtures/approved-site.json' || /^\.local\/cache\/m2\/[A-Za-z0-9_./-]+$/.test(envelopePath)) || envelopePath.split('/').includes('..'))refuse();
 const value=readJson(path.join(ROOT,envelopePath),ENVELOPE_LIMIT);
 const {baseline,catalog,files}=trustedInputs();
 const {envelope,context}=validateSiteQaEnvelope(value,{baseline,catalog});
 const expectedOutput=`.preview-output/m2/${envelope.snapshot.id}`;
 if(out!==undefined && out!==expectedOutput)refuse();
 const destination=checkedPath(path.join(ROOT,expectedOutput),{missing:true});
 for(const ancestor of [path.join(ROOT,'.preview-output'),path.join(ROOT,'.preview-output/m2')]){
  const stat=statIfPresent(ancestor);if(stat && !stat.isDirectory())refuse();
 }
 const artifact=artifactFiles(envelope,context,files);
 inspectOwnedTree(destination,new Set(artifact.files.keys()));
 for(const name of artifact.files.keys())checkedPath(path.join(destination,name),{missing:true});
 // No directory or temporary file is created before every validation above succeeds.
 for(const [name,bytes] of artifact.files)atomicWrite(path.join(destination,name),bytes);
 return artifact.manifest;
}
