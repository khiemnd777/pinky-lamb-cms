import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {DATA_ROOT,ROOT} from './local-data-guard.mjs';
import {verifySourceAgainstCustody,verifyFirestoreAgainstCustody} from './local-data-custody.mjs';
import {verifyLocalImport} from './local-data-verify.mjs';

const CUSTODY=path.join(ROOT,'.local/data-custody/local-data-001-20261017-03');
const BACKUP=path.join(ROOT,'.local/data-backups/local-data-001-stage-02');
const MARKER=path.join(DATA_ROOT,'cutover.json');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
function processRow(pid){
 let output;try{output=execFileSync('/bin/ps',['-p',String(pid),'-o','ppid=','-o','lstart=','-o','command='],{encoding:'utf8',timeout:3000}).trim();}catch{return null;}
 const match=/^\s*(\d+)\s+(.{24})\s+(.+)$/.exec(output);if(!match)throw Error('Process identity unavailable');
 return {ppid:Number(match[1]),start:match[2],command:match[3]};
}
function listener(port){
 let output;try{output=execFileSync('/usr/sbin/lsof',['-nP',`-iTCP:${port}`,'-sTCP:LISTEN','-t'],{encoding:'utf8',timeout:3000}).trim();}catch(error){if(error.status===1)return [];throw Error(`Port ${port} owner unavailable`);}
 const values=output.split(/\s+/).filter(Boolean).map(Number);if(values.some(value=>!Number.isSafeInteger(value)))throw Error('Invalid port owner');return values;
}
function identity(pid,start,kind){
 if(!Number.isSafeInteger(pid)||pid<1)throw Error('Invalid PID');
 const row=processRow(pid),expected=kind==='group'?`/node_modules/firebase-tools/lib/bin/firebase.js emulators:start --project demo-pinky-lamb-cms --config ${ROOT}/infra-local/firebase.json --only auth,functions,hosting,storage --non-interactive`:`${ROOT}/.local/cache/emulators/cloud-firestore-emulator-v1.22.0.jar --host 127.0.0.1 --port 8080`;
 if(!row||row.ppid!==1||row.start!==start||!row.command.includes(expected))throw Error(`${kind} process identity mismatch`);
 const ports=kind==='group'?[9099,9199,5010]:[8080];
 for(const port of ports){const owners=listener(port);if(owners.length!==1||owners[0]!==pid)throw Error(`${kind} port ${port} ownership mismatch`);}
}
async function gracefulStop(pid,ports){
 process.kill(pid,'SIGINT');const deadline=Date.now()+45000;
 while(Date.now()<deadline){if(!processRow(pid)&&ports.every(port=>listener(port).length===0))return;await delay(500);}
 throw Error(`Process ${pid} did not stop gracefully`);
}
function privateFile(file){const stat=fs.lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||(stat.mode&0o077)!==0)throw Error('Private manifest required');return fs.readFileSync(file);}
function syncDirectory(directory){const fd=fs.openSync(directory,'r');try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
export async function cutover({groupPid,groupStart,firestorePid,firestoreStart}){
 if(fs.existsSync(MARKER))throw Error('Cutover marker already exists');
 identity(groupPid,groupStart,'group');identity(firestorePid,firestoreStart,'firestore');
 const sourceManifestSha256=digest(privateFile(path.join(CUSTODY,'manifest.json')));
 const backupManifestSha256=digest(privateFile(path.join(BACKUP,'manifest.json')));
 const verified=verifyLocalImport(CUSTODY,DATA_ROOT);
 if(verified.sourceManifestSha256!==sourceManifestSha256)throw Error('Active data source mismatch');
 await verifySourceAgainstCustody(CUSTODY);
 identity(groupPid,groupStart,'group');identity(firestorePid,firestoreStart,'firestore');
 await gracefulStop(groupPid,[9099,9199,5010]);
 await verifyFirestoreAgainstCustody(CUSTODY);
 identity(firestorePid,firestoreStart,'firestore');
 await gracefulStop(firestorePid,[8080]);
 const marker={version:1,state:'READY',projectId:'demo-pinky-lamb-cms',dataRoot:DATA_ROOT,sourceManifestSha256,backupManifestSha256,createdAt:new Date().toISOString()};
 const fd=fs.openSync(MARKER,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);
 try{fs.writeFileSync(fd,JSON.stringify(marker));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
 syncDirectory(DATA_ROOT);
 return {cutover:'READY',documents:verified.documents,users:verified.users,objects:verified.objects,legacyListenersStopped:true};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==6||process.version!=='v22.23.3'||fs.realpathSync(process.cwd())!==ROOT||process.execArgv.length||process.env.NODE_OPTIONS!==undefined)throw Error('Pinned cutover invocation required');
  console.log(JSON.stringify(await cutover({groupPid:Number(process.argv[2]),groupStart:process.argv[3],firestorePid:Number(process.argv[4]),firestoreStart:process.argv[5]})));
 }catch(error){console.error(`LOCAL_DATA_CUTOVER: ${error.message}`);process.exitCode=1;}
}
