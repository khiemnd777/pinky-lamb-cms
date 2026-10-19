// B1a source only. Acquisition functions/CLI need separate execution admission.
import {request as httpsRequest} from 'node:https';
import {createHash,randomUUID} from 'node:crypto';
import {open,lstat,mkdir,writeFile} from 'node:fs/promises';
import {constants} from 'node:fs';
import {dirname,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const SELF=fileURLToPath(import.meta.url),ROOT=resolve(dirname(SELF),'..');
const BASE=resolve(ROOT,'.local/test-outputs/m3/tool-recovery-01/b-v3/B1a');
const NODE=resolve(ROOT,'.local/cache/node/node-v22.23.3-darwin-arm64/bin/node');
const INPUT_SHA='78bbef256ac0714bfee2e4020286d4809211627b78efa7392743b1b27bb56f54';
const TUPLE_SHA='e970d5dd6fb9c1dc55ed7bfbd99191f7a024c46c52769dc2aa4674ccfd356c8d';
const MAX_ARCHIVE=64*1024**2,MAX_TOTAL=256*1024**2,DOWNLOAD_MS=30000;
const sha=b=>createHash('sha256').update(b).digest('hex');
function fail(code){throw Object.assign(new Error(code),{code});}
async function noLinks(path){let at=sep;for(const part of path.split(sep).filter(Boolean)){at=resolve(at,part);if((await lstat(at)).isSymbolicLink())fail('PATH_LINK');}}
async function regular(path,max){
 await noLinks(path);const before=await lstat(path);if(!before.isFile()||before.nlink!==1||before.size>max)fail('FILE_CUSTODY');
 const fd=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW);
 try{const first=await fd.stat();if(first.ino!==before.ino||first.dev!==before.dev||first.size!==before.size||first.mtimeMs!==before.mtimeMs)fail('FILE_CHANGED');const data=await fd.readFile();const after=await fd.stat();if(after.ino!==first.ino||after.dev!==first.dev||after.size!==first.size||after.mtimeMs!==first.mtimeMs||data.length!==first.size)fail('FILE_CHANGED');return data;}finally{await fd.close();}
}
async function loadInputs(){
 const raw=await regular(resolve(ROOT,'contracts/media-pdf-recovery-inputs.json'),1024**2);if(sha(raw)!==INPUT_SHA)fail('INPUT_PIN');
 const data=JSON.parse(raw),rows=data.rows;const canonical=JSON.stringify(rows.map(row=>Object.fromEntries(Object.keys(row).sort().map(k=>[k,row[k]]))));
 if(rows.length!==12||sha(Buffer.from(canonical))!==TUPLE_SHA||rows.reduce((sum,row)=>sum+row.bytes,0)!==4069885)fail('INPUT_TUPLE');
 for(const row of rows)if(row.url!==`https://conda.anaconda.org/conda-forge/osx-arm64/${row.filename}`||!/^[-a-zA-Z0-9_.]+\.conda$/.test(row.filename)||row.subdir!=='osx-arm64'||row.bytes>MAX_ARCHIVE)fail('INPUT_ORIGIN');
 return data;
}
async function ownedDirectory(path,expected){
 await noLinks(path);const actual=await lstat(path);
 if(!actual.isDirectory()||actual.uid!==process.getuid()||(actual.mode&0o777)!==0o700||actual.ino!==expected.ino||actual.dev!==expected.dev)fail('OWNED_DIRECTORY_CHANGED');
}

async function download(row,dir,total,owner){
 await ownedDirectory(dir,owner);
 const path=resolve(dir,row.filename);if(dirname(path)!==dir)fail('DOWNLOAD_PATH');
 const fd=await open(path,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
 const identity=await fd.stat();let count=0,network,body,problem;const hash=createHash('sha256');
 // This timer covers headers and body; request timeout alone is only an idle timer.
 const timer=setTimeout(()=>{problem=Object.assign(new Error('DOWNLOAD_TIMEOUT'),{code:'DOWNLOAD_TIMEOUT'});network?.destroy(problem);body?.destroy(problem);},DOWNLOAD_MS);
 try{
  body=await new Promise((ok,bad)=>{
   network=httpsRequest(new URL(row.url),{method:'GET',rejectUnauthorized:true,agent:false,headers:{'Accept-Encoding':'identity'}},res=>{
    if(res.statusCode!==200){res.destroy();bad(Object.assign(new Error('HTTP_STATUS_OR_REDIRECT'),{code:'HTTP_STATUS_OR_REDIRECT'}));return;}
    if(res.headers['content-encoding']&&res.headers['content-encoding']!=='identity'){res.destroy();bad(Object.assign(new Error('HTTP_ENCODING'),{code:'HTTP_ENCODING'}));return;}
    if(res.headers['content-length']!==undefined&&res.headers['content-length']!==String(row.bytes)){res.destroy();bad(Object.assign(new Error('HTTP_SIZE'),{code:'HTTP_SIZE'}));return;}
    ok(res);
   });network.once('error',bad);network.end();
  });
  for await(const chunk of body){
   count+=chunk.length;total.bytes+=chunk.length;
   if(problem)throw problem;
   if(count>row.bytes||count>MAX_ARCHIVE||total.bytes>MAX_TOTAL)fail('DOWNLOAD_SIZE');
   hash.update(chunk);let offset=0;while(offset<chunk.length){const {bytesWritten}=await fd.write(chunk,offset,chunk.length-offset);if(bytesWritten<1)fail('DOWNLOAD_WRITE');offset+=bytesWritten;}
  }
  if(problem)throw problem;
  if(count!==row.bytes||hash.digest('hex')!==row.sha256)fail('DOWNLOAD_PIN');
  await fd.sync();const after=await fd.stat();if(after.ino!==identity.ino||after.dev!==identity.dev||after.uid!==process.getuid()||after.nlink!==1||after.size!==row.bytes||(after.mode&0o777)!==0o600)fail('DOWNLOAD_CUSTODY');
  if(problem)throw problem;
  await fd.close();await ownedDirectory(dir,owner);const placed=await lstat(path);if(placed.ino!==identity.ino||placed.dev!==identity.dev)fail('DOWNLOAD_REPLACED');
  const actual=await regular(path,MAX_ARCHIVE);if(sha(actual)!==row.sha256)fail('DOWNLOAD_REINSPECTION');if(problem)throw problem;
  return {filename:row.filename,url:row.url,bytes:count,sha256:row.sha256,inode:after.ino,dev:after.dev,declaredLicense:row.license,publisherSignature:'NOT_VERIFIED'};
 }catch(error){network?.destroy();body?.destroy();try{await fd.close();}catch{ /* Closed after reinspection; retain owned partial bytes. */ }error.partial={file:row.filename,observedBytes:count,inode:identity.ino,dev:identity.dev};throw error;}
 finally{clearTimeout(timer);}
}

export async function acquireFrozenArchives(){
 if(arguments.length)fail('CALLER_OPTIONS');
 if(process.execPath!==NODE||process.versions.node!=='22.23.3')fail('NODE_IDENTITY');
 for(const key of ['NODE_OPTIONS','NODE_PATH','DYLD_LIBRARY_PATH','DYLD_INSERT_LIBRARIES','DYLD_FALLBACK_LIBRARY_PATH'])if(process.env[key])fail('RUNTIME_ENV_OVERRIDE');
 const node=await regular(NODE,112925600);if(node.length!==112925600||sha(node)!=='68f4d07ca49e0500cc135c7e0a445093e228e42e126ac22306d045f0a8c2636b')fail('NODE_PIN');
 const input=await loadInputs();await noLinks(BASE);const parent=await lstat(BASE);if(!parent.isDirectory()||parent.uid!==process.getuid()||(parent.mode&0o022))fail('PRIVATE_ROOT');
 const run=resolve(BASE,randomUUID());await mkdir(run,{mode:0o700});const dir=resolve(run,'archives');await mkdir(dir,{mode:0o700});
 const runOwner=await lstat(run),archiveOwner=await lstat(dir);
 const total={bytes:0},completed=[];
 try{
  for(const row of input.rows)completed.push(await download(row,dir,total,archiveOwner));
  await ownedDirectory(run,runOwner);await ownedDirectory(dir,archiveOwner);
  await writeFile(resolve(run,'acquisition-receipt.json'),JSON.stringify({private:true,status:'ARCHIVES_PINNED_ONLY',completed,totalBytes:total.bytes,decoded:false,publisherSignatures:'NOT_VERIFIED'},null,2),{flag:'wx',mode:0o600});
  return {run,completed};
 }catch(error){await ownedDirectory(run,runOwner);await ownedDirectory(dir,archiveOwner);await writeFile(resolve(run,'acquisition-failure.json'),JSON.stringify({private:true,status:'HOLD',code:error.code??'ACQUISITION_FAILED',completed,partial:error.partial??null,totalBytes:total.bytes,retained:true},null,2),{flag:'wx',mode:0o600});throw error;}
}

if(process.argv[1]===SELF){
 if(process.argv.length!==3||process.argv[2]!=='download-all')fail('CLI_ARGUMENTS');
 await acquireFrozenArchives();
}
