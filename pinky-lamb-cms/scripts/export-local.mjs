import {readFileSync,lstatSync,realpathSync,mkdirSync,readdirSync,writeFileSync,renameSync,unlinkSync} from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {z} from 'zod';
import {mediaEntrySchema,validateSnapshot,encodeStoredSnapshot} from '../cms-api/snapshots.mjs';
import {resourceIdSchema,MAX_ENVELOPE_BYTES} from '../contracts/hero.mjs';
import {utcTimestampSchema} from '../contracts/draft.mjs';
import {composeDocument,TEMPLATE_VERSION} from '../preview/hero-renderer.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const QA_BASE_URL='http://127.0.0.1:4173/';
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
// Approved setup copy hashes pin all public files, including font notices.
export const BASELINE_FILES=[
  {
    "path": "app.js",
    "sha256": "3a0d2d5466f21f662c61870a851b10b7848c880ea90f75bcb3483d89d49fda32"
  },
  {
    "path": "assets/Pinky-Lamb-Credential-2026.pdf",
    "sha256": "6087d6465ad55ae8451e2f7f3df1512e1427b987c220d9358f8fc899abe2dcce"
  },
  {
    "path": "assets/abril-fatface-400.woff",
    "sha256": "69bcdad947bd8e75608dd9b9c9316a52810a4741138dd8bb09b75408c30f7357"
  },
  {
    "path": "assets/brand-diagonal.webp",
    "sha256": "db4e953807bccc00738d0ef86abf0bfb10b064ca87766d7fe24a6d014425252a"
  },
  {
    "path": "assets/client-aqua.webp",
    "sha256": "ae48fec0fb2589281f92852aa68438910e62e99376be9d316fbc23d6f233dc35"
  },
  {
    "path": "assets/client-manulife.webp",
    "sha256": "8cfe37730f8de501a4d00d1ce79524400d5b8762ef6f98346782e877261fafdb"
  },
  {
    "path": "assets/client-samsung.webp",
    "sha256": "8e08722e2518b871ee2925f15abc1fbd5db4f63ee2addd62990bf47b1af5ef36"
  },
  {
    "path": "assets/client-sony.webp",
    "sha256": "e569fdcbdd37349cd70f65d21ae8f80fa7294dbff8db1af661310dc644e0886f"
  },
  {
    "path": "assets/client-wayfair.webp",
    "sha256": "756f4897b5f4b7198d331aa220338af6b836f985ff6d69a95e6455e6718423c8"
  },
  {
    "path": "assets/diag-awareness-2022.webp",
    "sha256": "10d659bad3fb0f410aa26f8070d7fb1156dd3192b701599186510d2dfdd5d025"
  },
  {
    "path": "assets/favicon.png",
    "sha256": "fa1747f42e462ec10b01ae5c81ea7be0ce4b41157aef0ef1ca904a905a893adc"
  },
  {
    "path": "assets/montserrat-400.woff",
    "sha256": "42970cee008d8fd45a7bb2836ea3212c11402aaa17a708990f68034846eda0f1"
  },
  {
    "path": "assets/montserrat-600.woff",
    "sha256": "361d93dee1189f66e5ba91ac8eb3e0f99f599875b807e07e5738f3acb7ae861f"
  },
  {
    "path": "assets/montserrat-700.woff",
    "sha256": "d0b09855fddfa2deb3cc3a5ca576d8d830d436178e39920c04a1526e1c46ec03"
  },
  {
    "path": "assets/montserrat-800.woff",
    "sha256": "ccaac20ea18265a297ff438ab2954f2395c97512c8b1f6ac862ad8363fd3a1d1"
  },
  {
    "path": "assets/petrosetco-fireworks-2026.webp",
    "sha256": "5e766ac200e564218847bf1169c5a16e3e7244a29ff80dae2a9c1e6c970ec7e7"
  },
  {
    "path": "assets/petrosetco-guests-2026.webp",
    "sha256": "6b565f3489d5e45a6afa94fb80cc80af598b7324b83f700e3761ddff75044968"
  },
  {
    "path": "assets/petrosetco-party-2026.webp",
    "sha256": "64bf5ee5768c1b5357560a0fd333ab3969f16f55469b12b7fa815b93d8293733"
  },
  {
    "path": "assets/pinky-hero.webp",
    "sha256": "aa4da85571bbfe81bcfce951ecac8a422cfb96415fb9d70fa5485fc89d7c5f63"
  },
  {
    "path": "assets/pinky-logo.webp",
    "sha256": "94a6077ba40575d6c544b77f5bd0a95952a4e22d8ebe8411ac8c20661cb803dd"
  },
  {
    "path": "assets/pinky-mascot.webp",
    "sha256": "a7b5dbd5ce3aba41395f8d48416f312fec1542af04c57afa49e1e961f2744d00"
  },
  {
    "path": "assets/psd-dell-microsoft-2025.webp",
    "sha256": "acea013677dd343a58bd80570fb6bb1e6d9d1a3862efdfe6324a175751a8e1e4"
  },
  {
    "path": "assets/psd-dell-microsoft-guests-2025.webp",
    "sha256": "c8655d5803c5df9d327bd85f6044a30cc5068dc6981534a499a24735e9ceca50"
  },
  {
    "path": "assets/psd-dell-microsoft-stage-2025.webp",
    "sha256": "04860477aa6faba25f78eb1d16574c796d3fdd6f7213856aea7fc25297da227f"
  },
  {
    "path": "assets/samsung-flip2-2019.webp",
    "sha256": "96bf63fb4388e41d81be5ef2aefeb4374fac5888f5766aac332a90219309460a"
  },
  {
    "path": "assets/showreel-2025.mp4",
    "sha256": "be8c124f6ac003bc2e7ae83ada63bd309e7da0b8c26ff7eba7cfeeace7307d92"
  },
  {
    "path": "assets/showreel-poster.webp",
    "sha256": "4a6fe318eba873cd9615893c322a4d9b1bdc1e90fa571f1309b0af3ccf662ce4"
  },
  {
    "path": "assets/sony-ult-2025.webp",
    "sha256": "974007875aecf5d36c12e5c0f78595f4d0c7eb65c2f40271299fa9419fedf20a"
  },
  {
    "path": "assets/varna-elite-2023.webp",
    "sha256": "7746960f52ba17501327f3b79c53cf6db3c0edbc54ed5e6c460e4fae63269316"
  },
  {
    "path": "assets/varna-elite-collage-2023.webp",
    "sha256": "719a97585020e516f149d990334bc70036e6521768f5c73a973fa01f11b39d78"
  },
  {
    "path": "assets/varna-elite-lifestyle-2023.webp",
    "sha256": "05882c6ac0da80e034e1d9c795c2896aadafe7a0dd347f7aad83d40e94039d49"
  },
  {
    "path": "assets/vifa-fair-2026.webp",
    "sha256": "582252951c252608fe5111c5fc2e9090c1136356d5f5b5ae328ba300e14be450"
  },
  {
    "path": "assets/vifa-opening-2026.webp",
    "sha256": "e01630438426ca558d3e7a713ca1ce519b66842cf699d465276bde1af7ffe4aa"
  },
  {
    "path": "assets/wayfair-registration-2026.webp",
    "sha256": "7c2fec6ae1eda773e3e7b630032bf146da92222c98402680b607682c85415248"
  },
  {
    "path": "assets/wayfair-summit-2026.webp",
    "sha256": "01a6e9d1c04506302793dfba213fd05440d8490a9e305e0c6997045652ae28e4"
  },
  {
    "path": "assets/wayfair-team-2026.webp",
    "sha256": "4b203f914175e0a2dbc9dc4d21fc147b21ad028647b4c4eec51a601842dd4d06"
  },
  {
    "path": "content.js",
    "sha256": "0140b31e91742d75387860a565c8082f3e34d5dc4b79c3b92b69cc0dd2484a63"
  },
  {
    "path": "index.html",
    "sha256": "4de13ed9a2b513458574b16fdaf9410422eb311ea23a0c4bce45b50a5d4630de"
  },
  {
    "path": "styles.css",
    "sha256": "511db2c926152e819f267fe187b47a9fba32b8bdc39877969157504d04dfa65e"
  },
  {
    "path": "FONT-NOTICES.txt",
    "sha256": "a6851476c9681331829c76cfce22722c1d0f582e97a0e12e8aebbb719dfe2eff"
  }
];
const catalogSchema=z.array(mediaEntrySchema.extend({status:z.literal('LEGACY_READY'),derivatives:z.array(z.unknown()).max(0),createdBy:resourceIdSchema,createdAt:utcTimestampSchema})).min(1).max(200);
function refuse(message){throw new Error(`LOCAL_EXPORT: ${message}`);}
function statIfPresent(filename){try{return lstatSync(filename);}catch(error){if(error.code==='ENOENT')return null;throw error;}}
function checkedPath(filename,{allowMissing=false}={}){
 const absolute=path.resolve(filename);if(absolute!==ROOT && !absolute.startsWith(ROOT+path.sep))refuse('path outside isolated CMS');
 if(realpathSync(ROOT)!==ROOT)refuse('workspace symlink');
 let current=ROOT;
 for(const segment of path.relative(ROOT,absolute).split(path.sep).filter(Boolean)){
  current=path.join(current,segment);const stat=statIfPresent(current);
  if(!stat){if(allowMissing)continue;refuse('missing input');}
  if(stat.isSymbolicLink() || realpathSync(current)!==current)refuse('symlink or escaped path');
 }
 return absolute;
}
function readRegular(filename){const checked=checkedPath(filename);if(!lstatSync(checked).isFile())refuse('regular file required');return readFileSync(checked);}
function readJson(filename,maxBytes){const bytes=readRegular(filename);if(bytes.length>maxBytes)refuse('input envelope too large');return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
function verifyMagic(asset,bytes){
 const mime=asset.mimeType;
 const matches=mime==='image/webp'?bytes.toString('ascii',0,4)==='RIFF' && bytes.toString('ascii',8,12)==='WEBP':mime==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):mime==='application/pdf'?bytes.toString('ascii',0,5)==='%PDF-':mime==='video/mp4'?bytes.toString('ascii',4,8)==='ftyp':false;
 if(!matches || (asset.kind==='IMAGE' && !['image/webp','image/png'].includes(mime)) || (asset.kind==='VIDEO' && mime!=='video/mp4') || (asset.kind==='PDF' && mime!=='application/pdf'))refuse('asset MIME mismatch');
}
function trustedInputs(snapshotPath){
 const catalog=catalogSchema.parse(readJson(path.join(ROOT,'contracts/legacy-assets.json'),MAX_ENVELOPE_BYTES));
 const ids=new Set(),paths=new Set(),files=new Map();
 for(const record of BASELINE_FILES){const bytes=readRegular(path.join(ROOT,'public-baseline',record.path));if(sha256(bytes)!==record.sha256)refuse('baseline bytes mismatch');files.set(record.path,bytes);}
 for(const asset of catalog){
  if(ids.has(asset.id) || paths.has(asset.legacyPath))refuse('duplicate catalog identity');ids.add(asset.id);paths.add(asset.legacyPath);
  const bytes=files.get(asset.legacyPath);if(!bytes || bytes.length!==asset.sizeBytes || sha256(bytes)!==asset.sha256)refuse('catalog bytes mismatch');verifyMagic(asset,bytes);
 }
 const snapshot=validateSnapshot(readJson(snapshotPath,MAX_ENVELOPE_BYTES),{catalog});encodeStoredSnapshot(snapshot,{catalog});
 const publicAssets=Object.fromEntries(snapshot.mediaManifest.map(asset=>[asset.id,{id:asset.id,kind:asset.kind,path:asset.legacyPath,...Object.fromEntries(['width','height','durationSeconds'].filter(key=>asset[key]!==undefined).map(key=>[key,asset[key]]))}]));
 const composed=composeDocument(files.get('index.html').toString('utf8'),snapshot.content,{publicAssets,localBaseUrl:QA_BASE_URL,mode:'QA_EXPORT'});
 if((composed.match(/<body>/g)??[]).length!==1)refuse('ambiguous document body');
 if((composed.match(/<main id="main">/g)??[]).length!==1)refuse('ambiguous QA main shell');
 const contained=composed.replace('<main id="main">','<main id="main" style="overflow-x:clip">');
 const html=contained.replace('<body>','<body>\n<p id="local-qa-notice" class="container" role="note">Bản thử local — chưa xuất bản</p>');
 files.set('index.html',Buffer.from(html));
 const manifest={templateVersion:TEMPLATE_VERSION,files:[...files].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([name,bytes])=>({path:name,sha256:sha256(bytes)}))};
 files.set('qa-manifest.json',Buffer.from(JSON.stringify(manifest,null,2)+'\n'));return {files,manifest};
}
function outputPath(value){
 if(typeof value!=='string' || !/^\.preview-output(?:\/[A-Za-z0-9_-]+)*$/.test(value))refuse('output must be designated preview root or descendants');
 return checkedPath(path.join(ROOT,value),{allowMissing:true});
}
function inspectOutput(root){
 const stat=statIfPresent(root);if(!stat)return;
 checkedPath(root);if(!stat.isDirectory())refuse('output directory required');
 for(const name of readdirSync(root)){const entry=path.join(root,name),stat=lstatSync(entry);checkedPath(entry);if(stat.isDirectory())inspectOutput(entry);else if(!stat.isFile())refuse('unsupported output entry');}
}
function atomicWrite(filename,bytes){
 checkedPath(filename,{allowMissing:true});mkdirSync(path.dirname(filename),{recursive:true});checkedPath(path.dirname(filename));
 const existing=statIfPresent(filename);if(existing && !existing.isFile())refuse('output file required');
 const temporary=path.join(path.dirname(filename),`.export-${randomUUID()}.tmp`);
 try{writeFileSync(temporary,bytes,{flag:'wx',mode:0o644});checkedPath(filename,{allowMissing:true});renameSync(temporary,filename);}finally{if(statIfPresent(temporary))unlinkSync(temporary);}
}
/** Offline validation completes before creating any output or temporary file. */
export function exportSnapshot({snapshotPath='tests/fixtures/approved-hero.json',out='.preview-output'}={}){
 if(typeof snapshotPath!=='string' || !(snapshotPath==='tests/fixtures/approved-hero.json' || /^\.local\/[A-Za-z0-9_./-]+$/.test(snapshotPath)) || snapshotPath.split('/').includes('..'))refuse('unapproved snapshot input path');
 const input=checkedPath(path.join(ROOT,snapshotPath));const {files,manifest}=trustedInputs(input);
 const destination=outputPath(out);inspectOutput(destination);
 // Validate every known target before the first write. Unknown regular files stay.
 for(const name of files.keys()){const target=checkedPath(path.join(destination,name),{allowMissing:true});const stat=statIfPresent(target);if(stat && !stat.isFile())refuse('output target is not a file');}
 for(const [name,bytes] of files)atomicWrite(path.join(destination,name),bytes);
 return manifest;
}
async function cli(args){
 if(args.length!==4 || !['--snapshot','--site-envelope'].includes(args[0]) || args[2]!=='--out')refuse('expected explicit fixture and preview-directory');
 if(args[0]==='--site-envelope'){
  const {exportSiteEnvelope}=await import('./export-site-local.mjs');
  exportSiteEnvelope({envelopePath:args[1],out:args[3]});
 }else exportSnapshot({snapshotPath:args[1],out:args[3]});
 console.log('Local QA artifact exported. This synthetic fixture is not editorial approval.');
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){cli(process.argv.slice(2)).catch(()=>{console.error('LOCAL_EXPORT: validation or containment failed; no publication occurred.');process.exitCode=1;});}
