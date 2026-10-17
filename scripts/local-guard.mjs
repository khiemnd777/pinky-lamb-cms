import { readFileSync, writeFileSync, mkdirSync, realpathSync, existsSync, lstatSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { createHash,randomUUID } from 'node:crypto';
import os from 'node:os';
import net from 'node:net';
import { createRequire, syncBuiltinESMExports } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn,spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import {ApiError,errorEnvelope} from '../contracts/errors.mjs';
import {validateM2RecoveryRuntime,validateM2Profile,installM2Profile} from './m2-recovery-profile.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PROJECT = 'demo-pinky-lamb-cms';
export const STORAGE_BUCKET = `${PROJECT}.appspot.com`;
export const ENDPOINTS = Object.freeze({ auth:9099, firestore:8080, functions:5001, hosting:5010, storage:9199 });
const ownPath = fileURLToPath(import.meta.url);
const configPath = path.join(ROOT, 'infra-local/firebase.json');
let localHttpParserIdentity=null;
let storageRuntimeIdentity=null;
const config = () => JSON.parse(readOwnedSource('infra-local/firebase.json',65536));
const fail = (message) => { throw new Error(`LOCAL_GUARD: ${message}`); };

function readOwnedSource(relative,cap){
  const absolute=path.join(ROOT,relative);
  if(!absolute.startsWith(`${ROOT}/`) || relative.split('/').includes('..'))fail('untrusted source path');
  let current=ROOT;
  for(const segment of relative.split('/')){current=path.join(current,segment);if(lstatSync(current).isSymbolicLink() || realpathSync(current)!==current)fail('escaped/symlink source');}
  const stat=lstatSync(absolute);
  if(!stat.isFile() || stat.nlink!==1 || stat.size>cap)fail('untrusted source type/size');
  return readFileSync(absolute,'utf8');
}
export function validateConfig(value = config()) {
  const keys=(object,allowed)=>{if(!object || Object.keys(object).some(key=>!allowed.includes(key)))fail('unknown config key');};
  keys(value,['functions','firestore','storage','hosting','emulators']);keys(value.firestore,['rules','indexes']);keys(value.storage,['rules']);keys(value.hosting,['public','ignore','headers']);
  for(const name of ['auth','firestore','functions','hosting','storage','hub','logging'])keys(value.emulators?.[name],['host','port']);keys(value.emulators?.ui,['enabled']);
  if(JSON.stringify(value.hosting.headers)!==JSON.stringify([{source:'/assets/**',headers:[{key:'Access-Control-Allow-Origin',value:'*'}]},{source:'/index.html',headers:[{key:'Access-Control-Allow-Origin',value:'http://127.0.0.1:5273'}]}]))fail('untrusted public headers');
  for (const [name, port] of Object.entries(ENDPOINTS)) {
    if (value.emulators?.[name]?.host !== '127.0.0.1' || value.emulators?.[name]?.port !== port) fail(`invalid ${name} emulator`);
  }
  if (value.emulators?.singleProjectMode !== true || value.emulators?.ui?.enabled !== false) fail('invalid emulator mode');
  for (const name of Object.keys(value.emulators)) if (!['auth','firestore','functions','hosting','storage','hub','logging','ui','singleProjectMode'].includes(name)) fail('extra emulator');
  for (const [name, port] of [['hub',4400],['logging',4500]]) if (value.emulators[name]?.host !== '127.0.0.1' || value.emulators[name]?.port !== port) fail('invalid auxiliary emulator');
  const expected = [{source:'cms-api',codebase:'cms-local',runtime:'nodejs22',ignore:['node_modules','.git','*.log']}];
  if (JSON.stringify(value.functions) !== JSON.stringify(expected)) fail('untrusted functions source/ignore');
  if (value.hosting?.public !== 'public-baseline' || JSON.stringify(value.hosting?.ignore) !== JSON.stringify(['firebase.json','.*','node_modules'])) fail('untrusted hosting path/ignore');
  if (!['.local/firestore-deny.rules','infra-local/firestore.rules'].includes(value.firestore?.rules)) fail('untrusted Rules path');
  if(value.storage.rules!=='infra-local/storage.rules' || value.firestore.indexes!=='infra-local/firestore.indexes.json')fail('untrusted Storage Rules/indexes path');
  readOwnedSource(value.storage.rules,65536);
  const indexes=JSON.parse(readOwnedSource(value.firestore.indexes,65536));
  if(Object.keys(indexes).some(key=>!['indexes','fieldOverrides'].includes(key)) || !Array.isArray(indexes.indexes) || !Array.isArray(indexes.fieldOverrides))fail('invalid indexes schema');
  for (const p of ['cms-api','public-baseline','infra-local']) if (realpathSync(path.join(ROOT,p)) !== path.join(ROOT,p)) fail('escaped/symlink source');
  return value;
}
export function validateRuntime(env = process.env, value, {server=false} = {}) {
  if(env.PINKY_M2_RECOVERY_RUNTIME!==undefined)return validateM2RecoveryRuntime(env);
  if(value===undefined)value=config();
  validateConfig(value);
  if (env.GCLOUD_PROJECT !== PROJECT || (server ? env.GOOGLE_CLOUD_PROJECT!==undefined && env.GOOGLE_CLOUD_PROJECT!==PROJECT : env.GOOGLE_CLOUD_PROJECT !== PROJECT)) fail('wrong/missing demo project');
  for (const [name, key] of [['auth','FIREBASE_AUTH_EMULATOR_HOST'],['firestore','FIRESTORE_EMULATOR_HOST'],['functions','PINKY_FUNCTIONS_EMULATOR_HOST'],['hosting','PINKY_HOSTING_EMULATOR_HOST'],['storage','FIREBASE_STORAGE_EMULATOR_HOST']]) {
    if (server && ['functions','hosting'].includes(name) && env[key]===undefined)continue;
    if (env[key] !== `127.0.0.1:${ENDPOINTS[name]}`) fail(`wrong/missing ${key}`);
  }
  for(const key of ['JDK_JAVA_OPTIONS','_JAVA_OPTIONS'])if(env[key]!==undefined)fail('inherited JVM options forbidden');
  if(env.JAVA_TOOL_OPTIONS!==undefined && env.PINKY_RECOVERY_RUNTIME===undefined && (typeof env.PINKY_STORAGE_RUNTIME!=='string' || !env.PINKY_STORAGE_RUNTIME.startsWith(`${ROOT}/.local/cache/m3/task03/runtime/run-`) || env.JAVA_TOOL_OPTIONS!==`-Djava.io.tmpdir=${env.PINKY_STORAGE_RUNTIME}/tmp -Xmx256m -XX:ActiveProcessorCount=2`))fail('untrusted Storage JVM options');
  if(env.PINKY_RECOVERY_RUNTIME!==undefined && env.JAVA_TOOL_OPTIONS!==undefined && env.JAVA_TOOL_OPTIONS!==`-Djava.io.tmpdir=${recoveryRoot(path.basename(env.PINKY_RECOVERY_RUNTIME))}/tmp -Xmx256m -XX:ActiveProcessorCount=2`)fail('untrusted recovery JVM options');
  if(env.PINKY_STORAGE_BUCKET!==STORAGE_BUCKET)fail('wrong/missing demo Storage bucket');
  for(const key of ['HTTP_PROXY','http_proxy','HTTPS_PROXY','https_proxy','ALL_PROXY','all_proxy','npm_config_proxy','npm_config_https_proxy'])if(env[key]!==undefined)fail('proxy environment forbidden');
  if (env.GOOGLE_APPLICATION_CREDENTIALS!==undefined || env.FIREBASE_TOKEN!==undefined || env.FIREBASE_WEBAPP_CONFIG!==undefined) fail('credentials/autoconfig forbidden');
  if (env.FIREBASE_CONFIG) {
    let parsed;try { parsed=JSON.parse(env.FIREBASE_CONFIG); } catch { fail('invalid Firebase config'); }
    if(!parsed || Array.isArray(parsed) || Object.keys(parsed).some(key=>!['projectId','storageBucket'].includes(key)))fail('untrusted Firebase autoconfig');
    if (parsed.projectId !== PROJECT || parsed.storageBucket!==undefined && parsed.storageBucket!==STORAGE_BUCKET) fail('wrong Firebase config project');
  }
  return true;
}
export function childEnvironment(input = process.env) {
  // Build an allowlist rather than carrying login, proxy, SDK or loader settings.
  const env = {};
  for (const key of ['PATH','TMPDIR','TMP','TEMP','LANG','LC_ALL','TERM','JAVA_HOME','HOME']) if (input[key]) env[key]=input[key];
  env.JAVA_HOME='/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home';
  env.PATH=`${path.join(ROOT,'.local/cache/node/node-v22.23.3-darwin-arm64/bin')}${path.delimiter}${env.JAVA_HOME}/bin${path.delimiter}${env.PATH ?? ''}`;
  Object.assign(env, { CI:'1', NO_UPDATE_NOTIFIER:'1', METADATA_SERVER_DETECTION:'none', PLAYWRIGHT_BROWSERS_PATH:path.join(ROOT,'.local/cache/playwright'), GCLOUD_PROJECT:PROJECT, GOOGLE_CLOUD_PROJECT:PROJECT,
    FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099', FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080',
    FIREBASE_STORAGE_EMULATOR_HOST:'127.0.0.1:9199', PINKY_STORAGE_BUCKET:STORAGE_BUCKET,
    PINKY_FUNCTIONS_EMULATOR_HOST:'127.0.0.1:5001', PINKY_HOSTING_EMULATOR_HOST:'127.0.0.1:5010',
    XDG_CONFIG_HOME:path.join(ROOT,'.local/config'), XDG_CACHE_HOME:path.join(ROOT,'.local/cache'), XDG_DATA_HOME:path.join(ROOT,'.local/data'), FIREBASE_DEBUG_PATH:path.join(ROOT,'.local/firebase-debug.log'),
    FIREBASE_EMULATORS_PATH:path.join(ROOT,'.local/cache/emulators'),
    PINKY_NETWORK_FENCE:'1', NODE_OPTIONS:`--import=${pathToFileURL(ownPath).href}` });
  return env;
}
/** Manual M3 application startup, independent of historical test/admission metadata.
 * Validate caller values before applying fixed demo defaults; never sanitize a
 * credential, proxy or alternate emulator into a supposedly local launch. */
function mediaApplicationEnvironment(mode,input=process.env) {
  if(!['media-worker','export-media'].includes(mode))fail('unknown media application');
  for(const key of ['NODE_OPTIONS','NODE_PATH','NODE_EXTRA_CA_CERTS','NODE_TLS_REJECT_UNAUTHORIZED','PINKY_NETWORK_FENCE','PINKY_M3_LOCAL_APPLICATION','PINKY_M2_RECOVERY_RUNTIME','PINKY_RECOVERY_RUNTIME','PINKY_STORAGE_RUNTIME','PINKY_RUNTIME_POLICY_SELECTOR','PINKY_RUNTIME_POLICY_CONTROL','JAVA_TOOL_OPTIONS','JDK_JAVA_OPTIONS','_JAVA_OPTIONS'])if(input[key]!==undefined)fail(`inherited media application override forbidden: ${key}`);
  const env=childEnvironment(input);
  validateRuntime({...env,...input});
  env.PINKY_M3_LOCAL_APPLICATION=mode;
  validateRuntime(env);
  return env;
}
export function validateMediaApplicationRuntime(env=process.env) {
  const mode=env.PINKY_M3_LOCAL_APPLICATION;
  if(!['media-worker','export-media'].includes(mode))fail('start M3 application through its local guard command');
  if(env.PINKY_M2_RECOVERY_RUNTIME!==undefined || env.PINKY_RECOVERY_RUNTIME!==undefined || env.PINKY_STORAGE_RUNTIME!==undefined || env.PINKY_RUNTIME_POLICY_SELECTOR!==undefined || env.PINKY_RUNTIME_POLICY_CONTROL!==undefined)fail('canonical M3 cannot use a recovery/test profile');
  if(process.version!=='v22.23.3' || realpathSync(process.cwd())!==ROOT || realpathSync(process.execPath)!==path.join(ROOT,'.local/cache/node/node-v22.23.3-darwin-arm64/bin/node'))fail('select pinned local Node/workspace');
  const entry=path.join(ROOT,mode==='media-worker'?'scripts/media-worker-local.mjs':'scripts/export-site-media-local.mjs');
  if(!process.argv[1] || path.resolve(process.argv[1])!==entry || process.execArgv.length!==0)fail('unexpected media application entry or Node flags');
  if(env.PINKY_NETWORK_FENCE!=='1' || env.NODE_OPTIONS!==`--import=${pathToFileURL(ownPath).href}`)fail('media application requires the fixed network guard bootstrap');
  for(const key of ['NODE_PATH','NODE_EXTRA_CA_CERTS','NODE_TLS_REJECT_UNAUTHORIZED'])if(env[key]!==undefined)fail('media loader/TLS overrides forbidden');
  validateRuntime(env);
  return true;
}

export const STORAGE_JAR = Object.freeze({relative:'.local/cache/m3/task03/emulators/cloud-storage-rules-runtime-v1.1.3.jar',bytes:52892936,sha256:'0cd52db6f6271d62078f805220706377c849220b73bd68aa27078d977df9c900'});
export function assertStorageJar(){
  const absolute=assertOwnedOutput(STORAGE_JAR.relative),stat=lstatSync(absolute);
  if(!stat.isFile() || stat.nlink!==1 || stat.size!==STORAGE_JAR.bytes)fail('invalid Storage Rules runtime artifact');
  const bytes=readFileSync(absolute);
  if(bytes.subarray(0,4).toString('hex')!=='7f454c46' || bytes.lastIndexOf(Buffer.from('504b0506','hex'))<bytes.length-65557 || createHash('sha256').update(bytes).digest('hex')!==STORAGE_JAR.sha256)fail('unreviewed Storage Rules runtime bytes');
  return absolute;
}
export async function assertEmulatorPortsAvailable(mode){
  const ports=mode==='storage-only'?[9199,4400,4500]:mode==='emulators'?[...Object.values(ENDPOINTS),4400,4500]:null;
  if(!ports)fail('unapproved emulator preflight');
  await Promise.all(ports.map(port=>new Promise((resolve,reject)=>{
    const socket=net.createConnection({host:'127.0.0.1',port});let settled=false;
    const finish=error=>{if(settled)return;settled=true;socket.destroy();error?reject(error):resolve();};
    socket.setTimeout(750,()=>finish(new Error(`LOCAL_GUARD: listener state unknown at ${port}`)));
    socket.once('connect',()=>finish(new Error(`LOCAL_GUARD: existing listener at ${port}; refuse emulator startup`)));
    socket.once('error',error=>finish(error.code==='ECONNREFUSED'?null:new Error(`LOCAL_GUARD: listener state unknown at ${port}`)));
  })));
}
export function createStorageRuntime(input=process.env){
  validateConfig();assertStorageJar();
  const relative=`.local/cache/m3/task03/runtime/run-${randomUUID()}`,runRoot=assertOwnedOutput(relative);
  if(existsSync(runRoot))fail('runtime directory already exists');
  mkdirSync(runRoot,{recursive:true,mode:0o700});
  for(const suffix of ['cwd','tmp','config','config/configstore','cache','data'])mkdirSync(path.join(runRoot,suffix),{mode:0o700});
  writeFileSync(path.join(runRoot,'config/configstore/firebase-tools.json'),JSON.stringify({usage:false}),{flag:'wx',mode:0o600});
  const env=childEnvironment(input);
  Object.assign(env,{TMPDIR:path.join(runRoot,'tmp'),TMP:path.join(runRoot,'tmp'),TEMP:path.join(runRoot,'tmp'),XDG_CONFIG_HOME:path.join(runRoot,'config'),XDG_CACHE_HOME:path.join(runRoot,'cache'),XDG_DATA_HOME:path.join(runRoot,'data'),FIREBASE_DEBUG_PATH:path.join(runRoot,'firebase-debug.log'),FIREBASE_EMULATORS_PATH:path.join(ROOT,'.local/cache/m3/task03/emulators'),START_LOGGING_EMULATOR:'true',PINKY_STORAGE_RUNTIME:runRoot});
  env.JAVA_TOOL_OPTIONS=`-Djava.io.tmpdir=${runRoot}/tmp -Xmx256m -XX:ActiveProcessorCount=2`;
  validateRuntime(env);
  return {runRoot,cwd:path.join(runRoot,'cwd'),env};
}
const STORAGE_CLI_SOURCES=Object.freeze({
 'lib/bin/firebase.js':'1e05ff8373e5a5c7222475a0d90d4db58c85c2f281d44d4884bc96062288b864',
 'lib/emulator/storage/rules/runtime.js':'060fc9bdd069b41dc3c93f3ef21d3c8b243b20591c6c571c0df3f6ae455e29d7',
 'lib/emulator/controller.js':'86a3411bbb68a6e6c031e79f921b545045618471fd373e16cf6621f67011a946',
 'lib/emulator/storage/index.js':'5f9d94f7c1480b3ad896fad3a1fd96c39aba280197adfdbdc9b055350211c3af',
 'lib/emulator/downloadableEmulators.js':'b0084f100c59a7654bedafeb1679ca99886127bf14c27aaf634888bae63422e9',
 'lib/emulator/downloadableEmulatorInfo.json':'18c3225b8007f94f55ddca3c582dd2d4f7677aa5922af895dc43334dcc41b976'
});
function validateStorageChild(){
  const runRoot=process.env.PINKY_STORAGE_RUNTIME;
  if(typeof runRoot!=='string' || !runRoot.startsWith(`${ROOT}/.local/cache/m3/task03/runtime/`) || !/^run-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(path.basename(runRoot)))fail('unapproved Storage runtime root');
  assertOwnedOutput(runRoot.slice(ROOT.length+1));
  if(realpathSync(process.cwd())!==path.join(runRoot,'cwd'))fail('unapproved Storage CLI cwd');
  const expected=commandPlan('storage-only').args.slice(1);
  if(JSON.stringify(process.argv.slice(1))!==JSON.stringify(expected))fail('unapproved Storage CLI entrypoint/arguments');
  if(process.env.FIREBASE_EMULATORS_PATH!==path.join(ROOT,'.local/cache/m3/task03/emulators'))fail('unapproved Storage cache');
  for(const key of Object.keys(process.env))if(/_EMULATOR_(?:BINARY_PATH|VERSION)$/.test(key))fail('emulator binary/version override forbidden');
  for(const key of ['TMPDIR','TMP','TEMP'])if(process.env[key]!==path.join(runRoot,'tmp'))fail('unapproved Storage temp path');
  if(process.env.JAVA_TOOL_OPTIONS!==`-Djava.io.tmpdir=${runRoot}/tmp -Xmx256m -XX:ActiveProcessorCount=2`)fail('missing fixed Storage JVM options');
  if(process.env.PINKY_NETWORK_FENCE!=='1' || process.env.START_LOGGING_EMULATOR!=='true')fail('missing Storage fence/logging mode');
  validateRuntime();assertStorageJar();
}
export function installStorageRuntimeAdapter(){
  validateStorageChild();
  const require=createRequire(import.meta.url);
  if(require('../node_modules/firebase-tools/package.json').version!=='15.33.0')fail('unreviewed Storage CLI');
  for(const [relative,hash] of Object.entries(STORAGE_CLI_SOURCES)){
    const absolute=path.join(ROOT,'node_modules/firebase-tools',relative);
    if(realpathSync(absolute)!==absolute || createHash('sha256').update(readFileSync(absolute)).digest('hex')!==hash)fail('unreviewed Storage CLI source');
  }
  const module=require('../node_modules/firebase-tools/lib/emulator/storage/rules/runtime.js');
  const constructor=module.StorageRulesRuntime,prototype=constructor?.prototype;
  if(storageRuntimeIdentity){
    if(constructor!==storageRuntimeIdentity.constructor || prototype!==storageRuntimeIdentity.prototype || prototype.start!==storageRuntimeIdentity.adapter)fail('Storage adapter identity drift');
    return constructor;
  }
  const original=prototype?.start;
  if(typeof original!=='function')fail('missing Storage runtime seam');
  const downloadable=require('../node_modules/firebase-tools/lib/emulator/downloadableEmulators.js');
  const verifyCommand=()=>{
    const details=downloadable.getDownloadDetails('storage'),command=downloadable._getCommand('storage',{});
    const args=['-Djava.security.manager=disallow','-Duser.language=en','-jar',assertStorageJar(),'serve'];
    if(details.downloadPath!==assertStorageJar() || details.version!=='1.1.3' || command.binary!=='java' || command.shell!==false || JSON.stringify(command.args)!==JSON.stringify(args))fail('unapproved Storage Java command/cache');
  };
  verifyCommand();
  const adapter=async function(){
    validateStorageChild();
    if(module.StorageRulesRuntime!==constructor || constructor.prototype!==prototype || prototype.start!==adapter || !(this instanceof constructor))fail('Storage runtime identity drift');
    verifyCommand();
    // Pinned INTERNAL CLI seam, not a public SDK API. Missing cache never downloads.
    return original.call(this,false);
  };
  prototype.start=adapter;storageRuntimeIdentity={constructor,prototype,original,adapter};return constructor;
}
function storageRunRoot(runRoot){
  const prefix=path.join(ROOT,'.local/cache/m3/task03/runtime')+path.sep;
  if(typeof runRoot!=='string' || !runRoot.startsWith(prefix) || !/^run-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(runRoot.slice(prefix.length)))fail('unapproved Storage lifecycle root');
  assertOwnedOutput(runRoot.slice(ROOT.length+1));
  const stat=lstatSync(runRoot);if(!stat.isDirectory() || stat.uid!==process.getuid())fail('unknown Storage root ownership');
  return runRoot;
}
function storageFileBytes(absolute,cap){
  const before=lstatSync(absolute);
  if(!before.isFile() || before.isSymbolicLink() || before.nlink!==1 || before.uid!==process.getuid() || before.size>cap)fail('unknown Storage file type/ownership/size');
  const fd=fs.openSync(absolute,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
  try{
    const opened=fs.fstatSync(fd);if(opened.dev!==before.dev || opened.ino!==before.ino || opened.nlink!==1 || opened.uid!==process.getuid())fail('Storage file identity changed');
    const chunks=[];let total=0;
    while(true){const buffer=Buffer.alloc(Math.min(65536,cap+1-total));const n=fs.readSync(fd,buffer,0,buffer.length,null);if(!n)break;total+=n;if(total>cap)fail('Storage custody byte cap');chunks.push(buffer.subarray(0,n));}
    return Buffer.concat(chunks);
  }finally{fs.closeSync(fd);}
}
export function inspectStorageStopState(runRoot){
  storageRunRoot(runRoot);
  for(const suffix of ['cwd','tmp','config','config/configstore','cache','data','tmp/firebase/storage/blobs']){
    const absolute=path.join(runRoot,suffix);assertOwnedOutput(absolute.slice(ROOT.length+1));const stat=lstatSync(absolute);
    if(!stat.isDirectory() || stat.uid!==process.getuid())fail('unknown/missing Storage state');
  }
  const blobs=path.join(runRoot,'tmp/firebase/storage/blobs');
  if(readdirSync(blobs).length)fail('retained Storage object/staging entry; keep runtime alive');
  const files=[],directories=[];let bytes=0,entries=0;
  function walk(absolute,relative='',depth=0){
    if(++entries>512 || depth>16)fail('Storage custody inventory cap');const stat=lstatSync(absolute);
    if(stat.uid!==process.getuid() || stat.isSymbolicLink())fail('unknown Storage type/ownership; keep runtime alive');
    if(stat.isDirectory()){directories.push({relative,mode:stat.mode&0o777});for(const name of readdirSync(absolute))walk(path.join(absolute,name),path.join(relative,name),depth+1);return;}
    if(!stat.isFile() || stat.nlink!==1)fail('unknown Storage type/link count');
    if(files.length>=256)fail('Storage custody file cap');const cap=relative.endsWith('.log')?65536:8388608;
    const content=storageFileBytes(absolute,cap);bytes+=content.length;if(bytes>8388608)fail('Storage custody total byte cap');
    files.push({relative,bytes:content.length,sha256:createHash('sha256').update(content).digest('hex'),mode:stat.mode&0o777,content});
  }
  walk(runRoot);
  for(const suffix of ['stdout.log','stderr.log','firebase-debug.log','config/configstore/firebase-tools.json',`tmp/hub-${PROJECT}.json`])if(!files.some(file=>file.relative===suffix))fail('missing Storage custody state');
  const locator=JSON.parse(files.find(file=>file.relative===`tmp/hub-${PROJECT}.json`).content);
  if(locator.version!=='15.33.0' || JSON.stringify(locator.origins)!==JSON.stringify(['http://127.0.0.1:4400']) || !Number.isSafeInteger(locator.pid) || locator.pid<=0 || Object.keys(locator).some(key=>!['version','origins','pid'].includes(key)))fail('unknown Storage Hub locator');
  return {runRoot,blobs,files,directories,bytes,locator};
}
export function preserveStorageStopState(runRoot){
  const state=inspectStorageStopState(runRoot);
  const destination=assertOwnedOutput(`.local/cache/m3/task03/custody/attempt-${randomUUID()}`);
  mkdirSync(destination,{recursive:true,mode:0o700});
  for(const directory of state.directories)mkdirSync(path.join(destination,'private-copy',directory.relative),{recursive:true,mode:0o700});
  const files=[];
  for(const file of state.files){const target=path.join(destination,'private-copy',file.relative);writeFileSync(target,file.content,{flag:'wx',mode:0o600});const pin=createHash('sha256').update(storageFileBytes(target,8388608)).digest('hex');if(pin!==file.sha256)fail('Storage custody copy mismatch');files.push({...file,content:undefined,copy:target,copySha256:pin});}
  const manifest={runRoot,destination,createdAt:new Date().toISOString(),files,directories:state.directories,bytes:state.bytes,blobs:{path:state.blobs,entries:0,bytes:0},limits:{regularFiles:256,totalBytes:8388608,logBytes:65536,entries:512,depth:16}};
  writeFileSync(path.join(destination,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx',mode:0o600});return manifest;
}
function storageProcessRows(){
  const result=spawnSync('/bin/ps',['-axo','pid=,ppid=,pgid=,lstart='],{env:{...process.env,TZ:'Asia/Ho_Chi_Minh'},encoding:'utf8',timeout:1500,maxBuffer:1048576});
  if(result.status!==0 || !result.stdout?.trim())fail('Storage process observation unavailable');
  return result.stdout.trim().split('\n').map(line=>{
    const match=line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.+)$/);
    if(!match || !Number.isFinite(Date.parse(match[4])))fail('malformed Storage process observation');
    const row={pid:Number(match[1]),ppid:Number(match[2]),pgid:Number(match[3]),start:match[4]};
    if(!Number.isSafeInteger(row.pid)||row.pid<=0||!Number.isSafeInteger(row.ppid)||row.ppid<0||!Number.isSafeInteger(row.pgid)||row.pgid<=0)fail('malformed Storage process numbers');return row;
  });
}
function storageGroupSnapshot(pid){
  return storageProcessRows().filter(row=>row.pgid===pid).map(row=>{
    const result=spawnSync('/bin/ps',['-p',String(row.pid),'-o','args='],{encoding:'utf8',timeout:1000,maxBuffer:65536});
    if(result.status!==0 || !result.stdout?.trim())fail('Storage process command observation unavailable');return {...row,argv:result.stdout.trim()};
  });
}
export function validateStorageProcessOwnership(record,rows){
  if(record.exit || record.close)fail('Storage leader already exited; no signal');
  const leader=rows.find(row=>row.pid===record.pid);
  if(!leader || leader.ppid!==record.ppid || leader.pgid!==record.pid || leader.start!==record.start || leader.argv!==record.argv)fail('unknown Storage CLI ownership');
  const javaArgv=`java -Djava.security.manager=disallow -Duser.language=en -jar ${assertStorageJar()} serve`;
  const jvms=rows.filter(row=>row.pid!==record.pid);
  if(jvms.length!==1 || jvms[0].ppid!==record.pid || jvms[0].pgid!==record.pid || jvms[0].argv!==javaArgv)fail('unknown Storage Rules JVM ownership');
  if(record.jvm && (jvms[0].pid!==record.jvm.pid || jvms[0].start!==record.jvm.start || jvms[0].argv!==record.jvm.argv))fail('Storage Rules JVM generation changed');
  return {leader,jvm:jvms[0]};
}
export async function launchStorageOnly(input=process.env){
  await assertEmulatorPortsAvailable('storage-only');const runtime=createStorageRuntime(input),plan=commandPlan('storage-only');
  const record={pid:null,ppid:process.pid,start:null,argv:[plan.node,...plan.args].join(' '),exit:null,close:null,jvm:null,signals:[],observations:[],sourcePins:Object.entries(STORAGE_CLI_SOURCES).map(([relative,expected])=>({path:path.join(ROOT,'node_modules/firebase-tools',relative),sha256:expected})),jar:STORAGE_JAR};
  const stdout=fs.openSync(path.join(runtime.runRoot,'stdout.log'),'wx',0o600),stderr=fs.openSync(path.join(runtime.runRoot,'stderr.log'),'wx',0o600);
  const child=spawn(plan.node,plan.args,{cwd:runtime.cwd,env:runtime.env,detached:true,stdio:['ignore',stdout,stderr]});fs.closeSync(stdout);fs.closeSync(stderr);record.pid=child.pid;
  child.on('exit',(code,signal)=>{record.exit={code,signal,at:new Date().toISOString()};});child.on('close',(code,signal)=>{record.close={code,signal,at:new Date().toISOString()};});
  child.on('error',error=>{record.spawnError=error.message;});
  let controller,pendingSignal=false;
  const onSignal=()=>{if(!controller){pendingSignal=true;return;}void controller.stop().then(receipt=>{console.log(`LOCAL_GUARD: Storage stop ${receipt.status}; receipt ${receipt.path}`);if(receipt.status!=='PASS_OWNED_REAPED')process.exitCode=1;}).catch(error=>{console.error(error.message);process.exitCode=1;});};
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,onSignal);
  await new Promise(resolve=>setTimeout(resolve,100));
  try{const rows=storageGroupSnapshot(child.pid),leader=rows.find(row=>row.pid===child.pid);if(!leader||leader.argv!==record.argv||leader.ppid!==process.pid)fail('unknown initial Storage CLI ownership');record.start=leader.start;record.observations.push({at:new Date().toISOString(),stage:'initial',rows});}catch(error){record.initialOwnershipError=error.message;}
  let stopping=null;
  controller={runtime,child,record,captureOwnership(){const rows=storageGroupSnapshot(child.pid),owned=validateStorageProcessOwnership(record,rows);record.jvm=owned.jvm;record.observations.push({at:new Date().toISOString(),stage:'captured',rows});return owned;},stop(){
    if(stopping)return stopping;
    stopping=(async()=>{
      const receipt={at:new Date().toISOString(),status:'HOLD',runRoot:runtime.runRoot,record,custody:null,limits:'Ordinary filesystem/ps identity controls; not a hardOSsandbox or atomic retention guarantee'};
      try{
        if(!record.start || record.initialOwnershipError)fail('missing initial Storage ownership');
        controller.captureOwnership();
        for(const pin of record.sourcePins)if(createHash('sha256').update(readFileSync(pin.path)).digest('hex')!==pin.sha256)fail('Storage installed source drift');assertStorageJar();
        receipt.custody=preserveStorageStopState(runtime.runRoot);
        const state=inspectStorageStopState(runtime.runRoot);if(state.locator.pid!==record.pid)fail('Storage Hub locator ownership mismatch');
        const rows=storageGroupSnapshot(child.pid);validateStorageProcessOwnership(record,rows);record.observations.push({at:new Date().toISOString(),stage:'immediately-before-signal',rows});
        if(child.exitCode!==null || child.signalCode!==null || record.exit || record.close)fail('Storage CLI exited before signal');
        const attempt={pid:child.pid,signal:'SIGINT',at:new Date().toISOString()};record.signals.push(attempt);attempt.accepted=child.kill('SIGINT');if(!attempt.accepted)fail('Storage signal not accepted');
        const deadline=Date.now()+10000;while(!record.close && Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,50));
        const finalRows=storageGroupSnapshot(child.pid);record.observations.push({at:new Date().toISOString(),stage:'after-close',rows:finalRows});
        if(!record.close || finalRows.length)fail('Storage cleanup/control incomplete; no further signal');receipt.status='PASS_OWNED_REAPED';
      }catch(error){receipt.reason=error.message;}
      const receiptPath=assertOwnedOutput(`.local/cache/m3/task03/shutdown-receipts/receipt-${randomUUID()}.json`);mkdirSync(path.dirname(receiptPath),{recursive:true,mode:0o700});writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});receipt.path=receiptPath;return receipt;
    })().finally(()=>{stopping=null;});return stopping;
  }};
  child.once('close',()=>{for(const signal of ['SIGINT','SIGTERM'])process.off(signal,onSignal);});
  if(pendingSignal)onSignal();
  return controller;
}
export function installNetworkFence() {
  const allowHost = host => ['127.0.0.1','::1','[::1]'].includes(host);
  const originalConnect = net.Socket.prototype.connect;
  net.Socket.prototype.connect = function (...args) {
    let first=args[0];if(Array.isArray(first))first=first[0];
    if(typeof first==='object' && first?.path) {
      const socketPath=path.resolve(first.path);
      if(!socketPath.startsWith(`${os.tmpdir()}${path.sep}`) && !socketPath.startsWith(`${ROOT}/.local/`)) fail('untrusted Unix socket');
    } else {
      const host=typeof first==='object' ? (first.host ?? 'localhost') : (typeof args[1]==='string' ? args[1] : 'localhost');
      if(host==='localhost'){if(typeof first==='object')first.host='127.0.0.1';else args[1]='127.0.0.1';}
      else if(!allowHost(host))fail('non-loopback connection blocked before DNS');
    }
    return originalConnect.apply(this,args);
  };
  const originalFetch=globalThis.fetch;
  globalThis.fetch=(input,options) => {
    const url=new URL(typeof input==='string' || input instanceof URL ? input : input.url);
    if(url.hostname==='localhost'){url.hostname='127.0.0.1';input=url;}
    else if(!allowHost(url.hostname))fail('non-loopback fetch blocked before request');
    return originalFetch(input,options);
  };
  syncBuiltinESMExports();
}
export function disableCliCredentialDiscovery() {
  // Pinned CLI15.33.0 unconditionally probes ADC for Functions, even demo.
  // This local adapter disables discovery, never SDK token verification.
  const require=createRequire(import.meta.url);
  const pkg=require('../node_modules/firebase-tools/package.json');
  if(pkg.version!=='15.33.0')fail('unreviewed Firebase CLI');
  const sourcePath=path.join(ROOT,'node_modules/firebase-tools/lib/emulator/env.js');
  const hash=createHash('sha256').update(readFileSync(sourcePath)).digest('hex');
  if(hash!=='67d2b363b2335f122193cf1a678a7b516f08321d19b8f415ca5b18bb3cf86a3b')fail('unreviewed CLI credential seam');
  const module=require(sourcePath);
  if(typeof module.getCredentialsEnvironment!=='function')fail('missing CLI credential seam');
  module.getCredentialsEnvironment=async(account)=>{if(account)fail('CLI account forbidden');return {};};
  const versioningPath=path.join(ROOT,'node_modules/firebase-tools/lib/deploy/functions/runtimes/node/versioning.js');
  if(createHash('sha256').update(readFileSync(versioningPath)).digest('hex')!=='d313a7a309f46329fbfc3b8e6bce18733693e30d1119d7ddaa3b508436d4a376')fail('unreviewed CLI version check');
  const versioning=require(versioningPath);
  if(typeof versioning.getLatestSDKVersion!=='function')fail('missing CLI version lookup seam');
  // Registry metadata was verified during setup; this child must stay offline.
  // Keep checkFunctionsSDKVersion and its supported minimum checks unchanged.
  versioning.getLatestSDKVersion=()=> '7.4.0';
  return module;
}
export function assertOwnedOutput(relative) {
  if(!relative.startsWith('.local/') || relative.includes('..'))fail('output outside owned root');
  let current=ROOT;
  for(const segment of relative.split('/')){current=path.join(current,segment);try{const stat=lstatSync(current);if(stat.isSymbolicLink())fail('symlink output forbidden');if(realpathSync(current)!==current)fail('escaped output');}catch(error){if(error.code!=='ENOENT')throw error;}}
  return path.join(ROOT,relative);
}
export function assertBuildOutput(){
 const destination=path.join(ROOT,'admin-dist');
 function inspect(target){
  let stat;try{stat=lstatSync(target);}catch(error){if(error.code==='ENOENT')return;throw error;}
  if(stat.isSymbolicLink())fail('symlink build output forbidden');
  if(realpathSync(target)!==target)fail('escaped build output');
  if(stat.isDirectory())for(const child of readdirSync(target))inspect(path.join(target,child));
 }
 if(realpathSync(ROOT)!==ROOT)fail('escaped workspace');inspect(destination);return destination;
}
export function installCliConfigAdapter() {
  const require=createRequire(import.meta.url);const sourcePath=path.join(ROOT,'node_modules/firebase-tools/lib/config.js');
  if(createHash('sha256').update(readFileSync(sourcePath)).digest('hex')!=='e0ffd09b3d65c180bd3e0a342801c8a014b211c47893566a6a64874b38480c04')fail('unreviewed CLI Config source');
  const {Config}=require(sourcePath);const original=Config.load;
  Config.load=(options,allowMissing)=>{
    if(path.resolve(options.cwd??process.cwd(),options.configPath??'')!==configPath)fail('unapproved config path');
    if(options.projectDir && path.resolve(options.projectDir)!==ROOT)fail('outside project directory');
    validateConfig();const loaded=original.call(Config,{...options,projectDir:ROOT},allowMissing);
    // Hosting independently uses the config directory as cwd. A validated
    // public path is derived only from the already validated absolute target.
    const baseline=loaded.path('public-baseline');
    const publicPath=path.relative(path.dirname(configPath),baseline);
    if(path.resolve(path.dirname(configPath),publicPath)!==realpathSync(path.join(ROOT,'public-baseline')))fail('escaped Hosting projection');
    loaded.set('hosting.public',publicPath);
    if(process.env.PINKY_RECOVERY_RUNTIME!==undefined)for(const [name,port] of [['eventarc',9299],['tasks',9499]])loaded.set(`emulators.${name}`,{host:'127.0.0.1',port});
    return loaded;
  };return Config;
}
/** Scope the raw-body seam to the pinned local cmsApi HTTP runtime only. */
export function installLocalHttpParser({profile}={}){
  const runtimePath=path.join(ROOT,'node_modules/firebase-tools/lib/emulator/functionsEmulatorRuntime.js');
  const entry=process.argv[1];
  if(![runtimePath,runtimePath.slice(0,-3)].includes(entry) || process.env.FUNCTIONS_EMULATOR!=='true' || process.env.FUNCTION_TARGET!=='cmsApi' || process.env.FUNCTION_SIGNATURE_TYPE!=='http')return false;
  const resolvedEntry=createRequire(import.meta.url).resolve(entry);
  if(profile!==undefined && profile!=='m2-recovery')fail('unexpected parser profile');
  if(profile==='m2-recovery')validateM2Profile({entry,argv:process.argv.slice(1),execArgv:process.execArgv,cwd:process.cwd(),env:process.env});
  if(realpathSync(resolvedEntry)!==runtimePath || realpathSync(process.cwd())!==path.join(ROOT,profile==='m2-recovery'?'cms-recovery-api':'cms-api'))fail('unexpected Functions HTTP runtime');
  const require=createRequire(runtimePath);
  if(createRequire(import.meta.url)('../node_modules/firebase-tools/package.json').version!=='15.33.0')fail('unreviewed HTTP runtime version');
  if(createHash('sha256').update(readFileSync(runtimePath)).digest('hex')!=='224e604c745fd538ce13b56ea651aa9c955cd32b8e629d8e118f6564c6f9c50a')fail('unreviewed Functions HTTP runtime source');
  const manifest=require.resolve('body-parser/package.json');
  if(realpathSync(manifest)!==path.join(ROOT,'node_modules/body-parser/package.json'))fail('unexpected body parser path');
  if(require(manifest).version!=='1.20.8')fail('unreviewed body parser');
  const parserRoot=path.dirname(manifest);
  const sources={
    'index.js':'9c6c900e7e85fb599c62d9b9e4dfd2ea2f61d119dce5ed69ac3a8da828819241',
    'lib/types/raw.js':'14548e46265ba5d67d6ce727fbe6f2ede1c1706b73a541502fc309b13d4fa5c1',
    'lib/read.js':'1e9e274755366c39ae70e8b9a7a42fc12219566e67efaf9b7ebc2a8b337f5b6b'
  };
  for(const [file,hash] of Object.entries(sources))if(createHash('sha256').update(readFileSync(path.join(parserRoot,file))).digest('hex')!==hash)fail('unreviewed raw transport source');
  const parser=require('body-parser');
  if(localHttpParserIdentity){
    if(parser!==localHttpParserIdentity.parser || parser.json!==localHttpParserIdentity.adapter)fail('changed raw transport adapter');
    return true;
  }
  const descriptor=Object.getOwnPropertyDescriptor(parser,'json');
  if(!descriptor?.configurable || typeof descriptor.get!=='function' || typeof parser.raw!=='function')fail('missing raw transport seam');
  const originalJson=parser.json;const originalRaw=parser.raw;let adapted=false;
  const adapter=options=>{
    if(adapted || options?.limit!=='32mb' || options.verify?.name!=='rawBodySaver')return originalJson(options);
    adapted=true;
    const capture=originalRaw({type:()=>true,limit:65536,inflate:false,verify:options.verify});
    return (request,response,next)=>capture(request,response,error=>{
      if(!error){next();return;}
      const safe=new ApiError(error.type==='entity.too.large' || error.status===413?'PAYLOAD_TOO_LARGE':'BAD_REQUEST');
      response.set('Cache-Control','no-store');response.set('X-Content-Type-Options','nosniff');
      response.status(safe.status).json(errorEnvelope(safe,randomUUID()));
    });
  };
  Object.defineProperty(parser,'json',{configurable:true,enumerable:true,value:adapter});
  localHttpParserIdentity={parser,adapter};
  return true;
}
function prepare() {
  validateConfig();
  assertOwnedOutput('.local/config/configstore/firebase-tools.json');assertOwnedOutput('.local/firestore-deny.rules');
  for(const suffix of ['.local','.local/config','.local/config/configstore']){const p=path.join(ROOT,suffix);if(existsSync(p) && realpathSync(p)!==p)fail('escaped local output parent');mkdirSync(p,{recursive:true});}
  for(const suffix of ['.local/config/configstore/firebase-tools.json','.local/firestore-deny.rules']){const p=path.join(ROOT,suffix);if(existsSync(p) && realpathSync(p)!==p)fail('escaped local output file');}
  // Only this task-owned configstore is written/read; user's HOME stays intact.
  writeFileSync(path.join(ROOT,'.local/config/configstore/firebase-tools.json'),JSON.stringify({usage:false}),{mode:0o600});
  if(!existsSync(path.join(ROOT,'infra-local/firestore.rules')))writeFileSync(path.join(ROOT,'.local/firestore-deny.rules'),"rules_version = '2';\nservice cloud.firestore { match /databases/{database}/documents { match /{document=**} { allow read, write: if false; } } }\n");
}
function launch(command,args,env,cwd) {
  const emulator=args.includes('emulators:start');
  const child=spawn(command,args,{cwd:cwd??(emulator?path.join(ROOT,'.local'):ROOT),env,stdio:'inherit'});
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
  child.on('exit',(code)=>{process.exitCode=code ?? 1;});
  child.on('error',()=>{process.exitCode=1;console.error('LOCAL_GUARD: local command unavailable');});
}
const M1_TESTS = Object.freeze({
  unit:['local-guard.test.mjs','hero-contract.test.mjs','hero-renderer.test.mjs'],
  integration:['acl.rules.test.mjs','drafts.integration.test.mjs','review.integration.test.mjs'],
  e2e:['login.local.test.mjs','hero-editor.local.test.mjs','m1.e2e.test.mjs']
});
const M2_TASK_TESTS = Object.freeze({
  'CMS-M2-00b':{unit:['local-guard.test.mjs'],e2e:['site-private-files.local.test.mjs']},
  'CMS-M2-01a':{unit:['site-settings.test.mjs','site-records.test.mjs']},
  'CMS-M2-01b':{unit:['site-contract.test.mjs']},
  'CMS-M2-02':{unit:['site-import-map.test.mjs']},
  'CMS-M2-03':{integration:['site-import.integration.test.mjs']},
  'CMS-M2-04':{integration:['site-drafts.integration.test.mjs']},
  'CMS-M2-05a':{integration:['source-checks.integration.test.mjs']},
  'CMS-M2-05b':{integration:['source-checks.integration.test.mjs']},
  'CMS-M2-06':{integration:['site-snapshots.integration.test.mjs','m1-compat.integration.test.mjs']},
  'CMS-M2-07':{integration:['site-reviews.integration.test.mjs','source-checks.integration.test.mjs']},
  'CMS-M2-08':{unit:['site-renderer.test.mjs']},
  'CMS-M2-09':{e2e:['site-public.local.test.mjs']},
  'CMS-M2-10':{unit:['site-export.test.mjs']},
  'CMS-M2-12':{e2e:['site-settings.local.test.mjs']},
  'CMS-M2-13':{e2e:['site-records.local.test.mjs']},
  'CMS-M2-14':{e2e:['site-sections.local.test.mjs']},
  'CMS-M2-15':{e2e:['site-workflow.local.test.mjs']},
  'CMS-M2-16':{unit:['local-guard.test.mjs'],integration:['acl.rules.test.mjs','site-abuse.integration.test.mjs']},
  'CMS-M2-17':{unit:['site-manifest.test.mjs','site-hash.test.mjs','site-source-coverage.test.mjs'],e2e:['m2.e2e.test.mjs']}
});
function selectedTests(mode, extra) {
  let names;
  if(extra.length){
    if(extra.length!==2 || extra[0]!=='--task')fail('untrusted task selector');
    names=extra[1]==='CMS-M3-03'?(mode==='unit'?['local-guard.test.mjs']:undefined):extra[1]==='M1'?M1_TESTS[mode]:M2_TASK_TESTS[extra[1]]?.[mode];
    if(!names)fail('unapproved task/mode');
  } else {
    names=[...new Set([...M1_TESTS[mode],...Object.values(M2_TASK_TESTS).flatMap(task=>task[mode]??[])])];
  }
  return names.map(name=>{
    const relative=`tests/${name}`;const absolute=path.join(ROOT,relative);
    let stat;try{stat=lstatSync(absolute);}catch(error){if(error.code==='ENOENT')fail(`missing expected test: ${relative}`);throw error;}
    if(!stat.isFile() || stat.isSymbolicLink() || realpathSync(absolute)!==absolute)fail('untrusted test file');
    return relative;
  });
}
export function validateSuiteHubShape(hub,map){
  const object=value=>value!==null && typeof value==='object' && !Array.isArray(value);
  if(!object(hub) || Object.keys(hub).some(key=>!['version','origins','pid','host','port'].includes(key)) || hub.version!=='15.33.0' || JSON.stringify(hub.origins)!==JSON.stringify(['http://127.0.0.1:4400']) || !Number.isSafeInteger(hub.pid) || hub.pid<=0 || hub.host!=='127.0.0.1' || hub.port!==4400)fail('untrusted managed Hub identity shape');
  const required={...ENDPOINTS,hub:4400,logging:4500};
  if(!object(map) || Object.keys(map).length!==Object.keys(required).length || Object.keys(map).some(key=>!Object.hasOwn(required,key)))fail('missing/extra required runtime components');
  for(const [name,port] of Object.entries(required)){
    const info=map[name];
    if(!object(info) || info.name!==name || info.host!=='127.0.0.1' || info.port!==port || !Array.isArray(info.listen) || info.listen.length!==1 || info.listen[0]?.address!=='127.0.0.1' || info.listen[0]?.family!=='IPv4' || info.listen[0]?.port!==port)fail('untrusted fixed runtime component');
  }
  return true; // Metadata shape only. This never authorizes a test/seed child.
}
async function suiteHubRead(suffix){
  const url=`http://127.0.0.1:4400${suffix}`,controller=new AbortController();const timer=setTimeout(()=>controller.abort(),2000);
  try{
    const response=await fetch(url,{method:'GET',redirect:'error',signal:controller.signal});
    if(response.status!==200)fail('managed Hub unavailable');
    const chunks=[];let bytes=0;
    for await(const chunk of response.body){bytes+=chunk.length;if(bytes>65536)fail('managed Hub response cap');chunks.push(chunk);}
    const body=Buffer.concat(chunks);return {url,status:response.status,bytes,sha256:createHash('sha256').update(body).digest('hex'),value:JSON.parse(body)};
  }catch(error){return {url,status:'UNPROVEN',reason:error.name==='AbortError'?'bounded Hub timeout':'Hub unavailable or invalid response'};}finally{clearTimeout(timer);}
}
export async function assertSuiteRuntimeReady(mode){
  if(!['integration','e2e'].includes(mode))fail('unapproved runtime suite preflight');
  validateConfig();
  for(const key of ['HTTP_PROXY','http_proxy','HTTPS_PROXY','https_proxy','ALL_PROXY','all_proxy','npm_config_proxy','npm_config_https_proxy'])if(process.env[key]!==undefined)fail('proxy forbidden before managed Hub preflight');
  const [root,map]=await Promise.all([suiteHubRead('/'),suiteHubRead('/emulators')]);
  const observation={mode,readOnly:true,requests:[root,map].map(receipt=>({url:receipt.url,status:receipt.status,bytes:receipt.bytes,sha256:receipt.sha256,reason:receipt.reason})),approvedProducer:'NONE',projectBinding:'NOT_PROVEN',processAndListenerOwnership:'NOT_PROVEN',decision:'REFUSE_BEFORE_PREPARE_OR_CHILD'};
  try{
    if(root.status!==200 || map.status!==200)fail('managed runtime unavailable/unproven; refuse suite before prepare/child');
    validateSuiteHubShape(root.value,map.value);
    // The pinned Hub root has no projectId. A healthy TCP/map cannot bind a
    // demo tenant, locator, source CLI argv or listener process generation.
    // No Approved full-suite producer/attestation exists in this slice. Never
    // discover/attach an orphan or accept caller/environment attestations.
    fail('no Approved full-suite producer and project-specific owned locator/source/process/listener attestation; refuse suite before prepare/child');
  }catch(error){error.runtimeObservation=observation;throw error;}
}
export async function assertLocalLaunchAuthorized(mode){
  if(Object.hasOwn(RUNTIME_POLICY_PHASES,mode)){assertRuntimePolicyAdmission(mode);return true;}
  if(mode==='runtime-recovery-unit')return true;
  if(mode==='runtime-recovery-live'){assertRecoveryRelease();return true;}
  if(mode==='seed')fail('seed/reseed not authorized in this session');
  if(['integration','e2e'].includes(mode))return assertSuiteRuntimeReady(mode);
  return true;
}
export function commandPlan(mode, extra = []) {
  if(['multilingual-import','export-multilingual-site','activate-multilingual-site'].includes(mode)){
    const scripts={'multilingual-import':'multilingual-import-local.mjs','export-multilingual-site':'export-multilingual-site-local.mjs','activate-multilingual-site':'activate-multilingual-site-local.mjs'};
    if(extra.length!==4||extra[2]!=='--run-id'||!/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(extra[3]))fail('invalid multilingual tooling arguments');
    const allowed=mode==='multilingual-import'?['validate','inventory','dry-run','apply','recover']:mode==='export-multilingual-site'?['--bundle','--release','--fetch','--serve']:[ 'prepare','serve'];
    if(!allowed.includes(extra[0])||!/^\.local\/[A-Za-z0-9_./-]+\.json$/.test(extra[1])||extra[1].split('/').some(p=>!p||p==='.'||p==='..'))fail('invalid private multilingual tooling input');
    return {node:path.join(ROOT,'.local/cache/node/node-v22.23.3-darwin-arm64/bin/node'),args:[path.join(ROOT,'scripts',scripts[mode]),...extra]};
  }

  if(mode==='multilingual-p3'){
    if(extra.length<4||extra[0]!=='--mode'||!['unit','api','fixture','build','export'].includes(extra[1])||extra[2]!=='--run-id'||!/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(extra[3]))fail('invalid P3 selectors');
    if(extra[1]==='export'){if(extra.length!==6||extra[4]!=='--bundle'||!/^\.local\/(?:test-outputs|cache)\/multilingual-001\/p3-remainder-v1\/[A-Za-z0-9_./-]+\.json$/.test(extra[5])||extra[5].split('/').some(p=>!p||p==='.'||p==='..'))fail('invalid P3 bundle');}else if(extra.length!==4)fail('unexpected P3 arguments');
    return {node:path.join(ROOT,'.local/cache/node/node-v22.23.3-darwin-arm64/bin/node'),args:[path.join(ROOT,'scripts/multilingual-p3-local.mjs'),...extra]};
  }
  if(mode==='multilingual-p3-project'){
    if(extra.length<4||extra[0]!=='--mode'||!['unit','api','browser','export','build'].includes(extra[1])||extra[2]!=='--run-id'||!/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(extra[3]))fail('invalid P3 Project selector');
    if(extra[1]==='export'){if(extra.length!==6||extra[4]!=='--bundle'||!/^\.local\/(?:test-outputs|cache)\/multilingual-001\/p3-rep-v1\/[A-Za-z0-9_./-]+\.json$/.test(extra[5])||extra[5].split('/').some(p=>!p||p==='.'||p==='..'))fail('invalid P3 Project bundle');}else if(extra.length!==4)fail('unexpected P3 Project arguments');
    return {node:path.join(ROOT,'.local/cache/node/node-v22.23.3-darwin-arm64/bin/node'),args:[path.join(ROOT,'scripts/multilingual-p3-project-local.mjs'),...extra]};
  }
  if(mode==='multilingual-p1'){
    if(extra.length<4||extra[0]!=='--mode'||!['unit','api','browser','export'].includes(extra[1])||extra[2]!=='--run-id'||!/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(extra[3]))fail('invalid P1 selector');
    if(extra[1]==='export'){if(extra.length!==6||extra[4]!=='--bundle'||!/^\.local\/(?:test-outputs|cache)\/multilingual-001\/p1-v1\/[A-Za-z0-9_./-]+\.json$/.test(extra[5])||extra[5].split('/').some(p=>!p||p==='.'||p==='..'))fail('invalid P1 bundle');}else if(extra.length!==4)fail('unexpected P1 arguments');
    return {node:path.join(ROOT,'.local/cache/node/node-v22.23.3-darwin-arm64/bin/node'),args:[path.join(ROOT,'scripts/multilingual-p1-local.mjs'),...extra]};
  }
  if(mode==='multilingual-p1-v2'){
    if(extra.length<4||extra[0]!=='--mode'||!['unit','api','browser','export'].includes(extra[1])||extra[2]!=='--run-id'||!/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(extra[3]))fail('invalid P1 selector');
    if(extra[1]==='export'){if(extra.length!==6||extra[4]!=='--bundle'||!/^\.local\/(?:test-outputs|cache)\/multilingual-001\/p1-v2\/[A-Za-z0-9_./-]+\.json$/.test(extra[5])||extra[5].split('/').some(p=>!p||p==='.'||p==='..'))fail('invalid P1 bundle');}else if(extra.length!==4)fail('unexpected P1 arguments');
    return {node:path.join(ROOT,'.local/cache/node/node-v22.23.3-darwin-arm64/bin/node'),args:[path.join(ROOT,'scripts/multilingual-p1-local.mjs'),'--profile-v2',...extra]};
  }
  if(Object.hasOwn(RUNTIME_POLICY_PHASES,mode))return runtimePolicyOperatorPlan(mode,extra);
  if(['runtime-recovery-unit','runtime-recovery-live'].includes(mode)){
    if(extra.length)fail('R1 exact selector accepts no arguments');
    const node=path.join(ROOT,'.local/cache/node/node-v22.23.3-darwin-arm64/bin/node');
    return {node,args:mode==='runtime-recovery-unit'?['--test','--test-concurrency=1',path.join(ROOT,'tests/runtime-recovery.test.mjs')]:[path.join(ROOT,'scripts/recover-auth-local.mjs'),'live']};
  }
  if(mode==='seed')fail('seed/reseed not authorized in this session');
  if(['media-worker','export-media'].includes(mode)){
    const entry=mode==='media-worker'?'scripts/media-worker-local.mjs':'scripts/export-site-media-local.mjs';
    if(!existsSync(path.join(ROOT,entry)))fail('media application entry unavailable');
    readOwnedSource(entry,65536);
    if(mode==='media-worker' && extra.length)fail('media worker accepts no arguments');
    if(mode==='export-media'){
      if(extra.length!==4 || extra[0]!=='--media-envelope' || extra[2]!=='--out')fail('media export requires --media-envelope and --out');
      const input=extra[1],output=extra[3];
      if(typeof input!=='string' || input.length>512 || !/^\.local\/[A-Za-z0-9_./-]+\.json$(?![\s\S])/.test(input) || input.split('/').some(part=>part==='' || part==='.' || part.includes('..')))fail('untrusted private media envelope path');
      if(typeof output!=='string' || !/^\.preview-output\/m3\/[A-Za-z0-9_-]{1,128}$(?![\s\S])/.test(output))fail('untrusted M3 QA export output');
    }
    return {node:path.join(ROOT,'.local/cache/node/node-v22.23.3-darwin-arm64/bin/node'),args:[path.join(ROOT,entry),...extra]};
  }
  const testing=Object.hasOwn(M1_TESTS,mode);
  if(!testing && extra.some(argument=>argument==='--task' || argument.startsWith('--task=')))fail('task selector only allowed for tests');
  if(extra.length && !testing && mode!=='export')fail('untrusted command arguments');
  if(mode==='export' && extra.length){
    if(extra.length!==4 || !['--snapshot','--site-envelope'].includes(extra[0]) || extra[2]!=='--out')fail('untrusted export arguments');
    const site=extra[0]==='--site-envelope',input=extra[1],output=extra[3];
    const fixture=site?'tests/fixtures/approved-site.json':'tests/fixtures/approved-hero.json';
    const inputPattern=site?/^\.local\/cache\/m2\/[A-Za-z0-9_./-]+$/:/^\.local\/[A-Za-z0-9_./-]+$/;
    if(typeof input!=='string' || !(input===fixture || inputPattern.test(input)) || input.split('/').includes('..'))fail('untrusted export input');
    if(typeof output!=='string' || !(site?/^\.preview-output\/m2\/[A-Za-z0-9_-]{1,128}$/ : /^\.preview-output(?:\/[A-Za-z0-9_-]+)*$/).test(output))fail('untrusted export output');
  }
  const node=path.join(ROOT,'.local/cache/node/node-v22.23.3-darwin-arm64/bin/node');
  const tests=testing?selectedTests(mode,extra):[];
  // Playwright CLI treats file arguments as regex filters, not literal paths.
  const browserFilters=mode==='e2e'?tests.map(test=>`/^${path.join(ROOT,test).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$/`):[];
  const plans={
    emulators:[path.join(ROOT,'node_modules/firebase-tools/lib/bin/firebase.js'),'emulators:start','--project',PROJECT,'--config',configPath,'--only','auth,firestore,functions,hosting,storage','--non-interactive'],
    'storage-only':['--max-old-space-size=256',path.join(ROOT,'node_modules/firebase-tools/lib/bin/firebase.js'),'emulators:start','--project',PROJECT,'--config',configPath,'--only','storage','--non-interactive'],
    dev:['node_modules/vite/bin/vite.js','--config','vite.config.mjs'],
    build:['node_modules/vite/bin/vite.js','build','--config','vite.config.mjs'],
    lint:['node_modules/eslint/bin/eslint.js','admin','cms-api','contracts','preview','scripts','tests','vite.config.mjs','eslint.config.mjs'],
    unit:['--test',...tests],
    integration:['--test','--test-concurrency=1',...tests],
    e2e:['node_modules/@playwright/test/cli.js','test',...browserFilters,'--workers=1','--output=.local/test-results','--reporter=list'],
    export:['scripts/export-local.mjs',...extra]
  };
  if(!plans[mode])fail('unapproved command');if(mode==='build')assertBuildOutput();return {node,args:plans[mode]};
}

// R1 is deliberately separate from generic test/startup authorization.
export const RECOVERY_SOURCE_PATHS=Object.freeze(['scripts/local-guard.mjs','scripts/recover-auth-local.mjs','tests/runtime-recovery.test.mjs','docs/LOCAL-RUNBOOK.md']);
export const RECOVERY_BUNDLE=Object.freeze({proposal:'55103f5ba5b492103f5bb23385351d98420433b3669cb66ebe5e86fce1e75b58',scope:'812ad8e6a00acfaf69d00ab81ec50b2553ee06401c73ae8a51b75342fcc70222',canonical:'096238cf9ddbbee674ba6e516dbf58d33660cb16a58c9dad496d5c3f1e8eb2df',approval:'8f41f8de82f0ff3d231ab1faee52df7bcbc93456b46528e2917a6fe068ea0e83'});
export const RECOVERY_COMPONENTS=Object.freeze({auth:9099,functions:5001,hosting:5010,storage:9199,hub:4400,logging:4500,eventarc:9299,tasks:9499});
const recoveryScopePath='.local/cache/m3/runtime-recovery-amendment/revision1-final/M3-RUNTIME-01.scope.json';
const recoveryApprovalPath='.local/cache/m3/approved-runtime-preview-resume-20261012-1250/approval-observation.json';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function recoverySourceRecords(){
 return RECOVERY_SOURCE_PATHS.map(relative=>{
  const bytes=readOwnedSource(relative,512*1024),stat=lstatSync(path.join(ROOT,relative));
  return {path:`pinky-lamb-cms/${relative}`,bytes:stat.size,mode:`0o${(stat.mode&0o777).toString(8)}`,links:stat.nlink,sha256:sha(bytes)};
 });
}
export function validateRecoveryRelease(receipt,current){
 if(!receipt || receipt.status!=='PASS_CODE_UNIT_ONLY' || JSON.stringify(receipt.bundle)!==JSON.stringify(RECOVERY_BUNDLE) || !Array.isArray(receipt.sources) || JSON.stringify(receipt.sources)!==JSON.stringify(current))fail('R1 High release source/bundle mismatch');
 const review=receipt.review;
 if(!review || typeof review.path!=='string' || !review.path.startsWith('.local/cache/m3/') || review.path.includes('..') || !/^[a-f0-9]{64}$/.test(review.sha256??'') || !Number.isFinite(Date.parse(review.atUtc)))fail('R1 High review receipt missing');
 return true;
}
export function assertRecoveryRelease(){
 const receipt=JSON.parse(readOwnedSource('.local/cache/m3/runtime-recovery/01Ra-high-release.json',65536));
 validateRecoveryRelease(receipt,recoverySourceRecords());
 if(sha(readOwnedSource(recoveryScopePath,256*1024))!==RECOVERY_BUNDLE.scope || sha(readOwnedSource('.local/cache/m3/runtime-recovery-amendment/revision1-final/M3-RUNTIME-01-PROPOSAL.md',65536))!==RECOVERY_BUNDLE.proposal || sha(readOwnedSource(recoveryApprovalPath,65536))!==RECOVERY_BUNDLE.approval)fail('R1 frozen authorization changed');
 const review=JSON.parse(readOwnedSource(receipt.review.path,65536));
 if(sha(readOwnedSource(receipt.review.path,65536))!==receipt.review.sha256)fail('R1 actual High review hash');
 validateRecoveryHighReview(review,receipt,recoverySourceRecords());
 return receipt;
}
export function recoveryPinnedLocation(pin){
 const workspace=path.dirname(ROOT);
 if(pin.path==='pinky-lamb-cms/scripts/local-guard.mjs')return {absolute:path.join(ROOT,'.local/cache/m3/runtime-recovery/01Ra-4e723b85-a8fc-47d0-bc19-f94f909832cb/prior-source/pinky-lamb-cms/scripts/local-guard.mjs'),mode:'0o600',historical:true};
 if(!pin.path.startsWith('pinky-lamb-cms/') && !pin.path.startsWith('approvals/'))fail('R1 pinned workspace path');
 const absolute=path.join(workspace,pin.path);
 if(path.resolve(absolute)!==absolute || !absolute.startsWith(`${workspace}/`))fail('R1 pinned path traversal');
 return {absolute,mode:pin.mode,historical:false};
}
export function assertRecoveryPinnedSources(){
 const raw=readOwnedSource(recoveryScopePath,256*1024);if(sha(raw)!==RECOVERY_BUNDLE.scope)fail('R1 scope drift');
 const relocationText=readOwnedSource('.local/cache/m3/runtime-recovery/01Ra-4e723b85-a8fc-47d0-bc19-f94f909832cb/prior-source-relocation.json',65536);
 if(sha(relocationText)!=='40ee39361871e573c6ae9fb28eddfcccec0d24cca26d87bb2758e37a4917643b')fail('R1 historical relocation changed');
 const relocations=JSON.parse(relocationText),scope=JSON.parse(raw),workspace=path.dirname(ROOT);
 for(const pin of scope.frozen_input_pins){
  const location=recoveryPinnedLocation(pin),absolute=location.absolute;
  let current=workspace;for(const segment of path.relative(workspace,path.dirname(absolute)).split('/')){if(!segment || segment==='..')fail('R1 pin ancestry');current=path.join(current,segment);if(lstatSync(current).isSymbolicLink() || realpathSync(current)!==current)fail('R1 pin ancestry');}
  const stat=lstatSync(absolute);
  if(pin.type==='symlink'){
   if(!stat.isSymbolicLink() || fs.readlinkSync(absolute)!==pin.target || realpathSync(absolute)!==pin.resolved_path || sha(readFileSync(pin.resolved_path))!==pin.resolved_sha256)fail('R1 discovery alias changed');
  }else{
   if(location.historical){const record=relocations.find(row=>row.path===pin.path);if(!record || record.sha256!==pin.sha256 || record.originalMode!==pin.mode || record.archiveMode!=='0600' || path.join(workspace,record.archive)!==absolute)fail('R1 historical source provenance');}
   if(!stat.isFile() || stat.nlink!==pin.links || stat.size!==pin.bytes || `0o${(stat.mode&0o777).toString(8)}`!==location.mode || sha(readFileSync(absolute))!==pin.sha256)fail('R1 frozen source drift');
  }
 }
 return scope;
}
export function validateRecoveryOperator({execPath,version,argv,execArgv,cwd,env}){
 const node=path.join(ROOT,'.local/cache/node/node-v22.23.3-darwin-arm64/bin/node');
 if(execPath!==node || version!=='v22.23.3' || cwd!==ROOT || JSON.stringify(argv)!==JSON.stringify([path.join(ROOT,'scripts/recover-auth-local.mjs'),'live']) || JSON.stringify(execArgv)!=='[]')fail('R1 exact live operator profile');
 for(const key of ['NODE_OPTIONS','NODE_PATH','NODE_EXTRA_CA_CERTS','NODE_TLS_REJECT_UNAUTHORIZED','PINKY_RECOVERY_RUNTIME','PINKY_STORAGE_RUNTIME','JAVA_TOOL_OPTIONS','JDK_JAVA_OPTIONS','_JAVA_OPTIONS'])if(env[key]!==undefined)fail('R1 live operator inherited loader/runtime settings');
 validateRuntime(env);return true;
}
export function assertRecoveryOperator(){
 validateRecoveryOperator({execPath:process.execPath,version:process.version,argv:process.argv.slice(1),execArgv:process.execArgv,cwd:process.cwd(),env:process.env});
 const relative='.local/cache/node/node-v22.23.3-darwin-arm64/bin/node',node=assertOwnedOutput(relative),stat=lstatSync(node);
 if(!stat.isFile() || stat.nlink!==1 || stat.size!==112925600 || sha(readFileSync(node))!=='68f4d07ca49e0500cc135c7e0a445093e228e42e126ac22306d045f0a8c2636b')fail('R1 operator Node bytes');return true;
}
export function recoveryToken(uuid=randomUUID()){
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(uuid))fail('R1 UUID shape');
 return Buffer.from(uuid.replaceAll('-',''),'hex').toString('base64url');
}
export function recoveryRoot(token){
 if(!/^[A-Za-z0-9_-]{22}$/.test(token) || Buffer.from(token,'base64url').length!==16 || Buffer.from(token,'base64url').toString('base64url')!==token)fail('R1 root token');
 return path.join(ROOT,'.local/cache/m3/runtime-recovery/runs',token);
}
export function recoverySocketPath(canonical,cwd,runRoot){
 if(typeof canonical!=='string' || canonical.includes('\0') || !new RegExp(`^${runRoot.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}/tmp/fire_emu_[a-f0-9]{16}\\.sock$`).test(canonical))fail('R1 unknown socket');
 if(![path.join(ROOT,'cms-api'),path.join(runRoot,'cwd')].includes(cwd))fail('R1 socket cwd');
 const relative=path.relative(cwd,canonical);
 if(path.resolve(cwd,relative)!==canonical || Buffer.byteLength(relative)>103 || relative.includes('\0'))fail('R1 native Unix path budget');
 return relative;
}
export function recoveryMetadataName(name){
 if(typeof name!=='string')fail('R1 metadata filename type');const value=name.toLowerCase();return value.startsWith('.env') || value.startsWith('.secret') || value.startsWith('.runtimeconfig') || value==='functions.yaml' || value.startsWith('.pnp');
}
export function assertRecoveryMetadata(){
 for(const dir of [ROOT,path.join(ROOT,'cms-api')])for(const name of readdirSync(dir))if(recoveryMetadataName(name))fail('R1 unexpected discovery metadata');
 return true;
}
export function validateRecoveryHighReview(review,receipt,current){
 if(!review || review.status!=='PASS_CODE_UNIT_ONLY' || review.amendment_id!=='M3-RUNTIME-01' || review.revision!==1 || review.actual_effort!=='HIGH' || review.reviewer!=='/root/pdf_setup_reviewer' || review.atUtc!==receipt.review.atUtc || !Number.isFinite(Date.parse(review.atUtc)) || JSON.stringify(review.bundle)!==JSON.stringify(RECOVERY_BUNDLE) || JSON.stringify(review.sources)!==JSON.stringify(receipt.sources) || JSON.stringify(review.sources)!==JSON.stringify(current))fail('R1 linked High review source/revision/provenance mismatch');
 return true;
}
export function recoveryEnvironment(runRoot,input=process.env,{jvm=false}={}){
 if(recoveryRoot(path.basename(runRoot))!==runRoot)fail('R1 runtime root');
 for(const key of ['JAVA_TOOL_OPTIONS','JDK_JAVA_OPTIONS','_JAVA_OPTIONS','PINKY_STORAGE_RUNTIME','PINKY_RECOVERY_RUNTIME'])if(input[key]!==undefined)fail('R1 inherited runtime markers');
 const env=childEnvironment(input);
 Object.assign(env,{PINKY_RECOVERY_RUNTIME:runRoot,TMPDIR:path.join(runRoot,'tmp'),TMP:path.join(runRoot,'tmp'),TEMP:path.join(runRoot,'tmp'),XDG_CONFIG_HOME:path.join(runRoot,'config'),XDG_CACHE_HOME:path.join(runRoot,'cache'),XDG_DATA_HOME:path.join(runRoot,'data'),FIREBASE_DEBUG_PATH:path.join(runRoot,'firebase-debug.log'),FIREBASE_EMULATORS_PATH:path.join(ROOT,'.local/cache/m3/task03/emulators'),START_LOGGING_EMULATOR:'true',FIREBASE_FUNCTIONS_DISCOVERY_OUTPUT_PATH:path.join(runRoot,'discovery')});
 if(jvm)env.JAVA_TOOL_OPTIONS=`-Djava.io.tmpdir=${runRoot}/tmp -Xmx256m -XX:ActiveProcessorCount=2`;
 return env;
}
export function recoveryPlan(mode,runRoot,destination){
 const entry=path.join(ROOT,'node_modules/firebase-tools/lib/bin/firebase.js'),prefix=['--max-old-space-size=256',entry];
 if(mode==='start')return {node:path.join(ROOT,'.local/cache/node/node-v22.23.3-darwin-arm64/bin/node'),args:[...prefix,'emulators:start','--project',PROJECT,'--config',configPath,'--only','auth,functions,hosting,storage','--non-interactive'],cwd:path.join(runRoot,'cwd')};
 if(mode==='export-auth'){
  if(typeof destination!=='string' || !new RegExp(`^${ROOT.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}/\\.local/emulator-data/m3/runtime-recovery/[A-Za-z0-9_-]{22}/auth-custody$`).test(destination))fail('R1 Auth-only destination');
  return {node:path.join(ROOT,'.local/cache/node/node-v22.23.3-darwin-arm64/bin/node'),args:[...prefix,'emulators:export',destination,'--project',PROJECT,'--config',configPath,'--only','auth','--non-interactive'],cwd:path.join(runRoot,'cwd')};
 }
 fail('R1 fixed CLI mode');
}
export function validateRecoveryProfile({argv,execArgv,cwd,env,entry}){
 const runRoot=env.PINKY_RECOVERY_RUNTIME;if(recoveryRoot(path.basename(runRoot??''))!==runRoot)fail('R1 profile root');
 const worker=path.join(ROOT,'node_modules/firebase-tools/lib/emulator/functionsEmulatorRuntime');
 const discovery=path.join(ROOT,'node_modules/firebase-functions/lib/bin/firebase-functions.js');
 const exact=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 if(entry===path.join(ROOT,'node_modules/firebase-tools/lib/bin/firebase.js')){
  if(cwd!==path.join(runRoot,'cwd') || !exact(execArgv,['--max-old-space-size=256']))fail('R1 CLI profile');
  if(exact(argv,recoveryPlan('start',runRoot).args.slice(1)))return 'cli';
  if(typeof env.PINKY_RECOVERY_AUTH_DEST==='string' && exact(argv,recoveryPlan('export-auth',runRoot,env.PINKY_RECOVERY_AUTH_DEST).args.slice(1)) && env.JAVA_TOOL_OPTIONS===undefined)return 'export';
  fail('R1 CLI profile');
 }
 if([worker,`${worker}.js`].includes(entry)){
  if(cwd!==path.join(ROOT,'cms-api') || !exact(argv,[entry]) || execArgv.length || env.FUNCTIONS_EMULATOR!=='true' || env.FUNCTION_TARGET!=='cmsApi' || env.FUNCTION_SIGNATURE_TYPE!=='http' || env.JAVA_TOOL_OPTIONS!==undefined || env.PINKY_STORAGE_RUNTIME!==undefined)fail('R1 HTTP worker profile');
  recoverySocketPath(env.PORT,cwd,runRoot);return 'worker';
 }
 if([discovery,path.join(ROOT,'node_modules/.bin/firebase-functions')].includes(entry)){
  if(cwd!==path.join(ROOT,'cms-api') || !exact(argv,[entry,path.join(ROOT,'cms-api')]) || execArgv.length || env.FUNCTIONS_CONTROL_API!=='true' || env.FUNCTIONS_MANIFEST_OUTPUT_PATH!==path.join(runRoot,'discovery/functions.yaml') || env.JAVA_TOOL_OPTIONS!==undefined || env.PINKY_STORAGE_RUNTIME!==undefined)fail('R1 discovery profile');return 'discovery';
 }
 fail('R1 unknown process class');
}
// Node22.23.3 net.js269–299/1145–1175 marks the normalized tuple.
// Mutate its options slot, never rebuild the tuple and lose the real marker.
export function mapRecoveryConnectArguments(args,mapPath){
 if(!Array.isArray(args) || typeof mapPath!=='function')fail('R2 connect arguments');
 const first=args[0];let options=first;
 if(Array.isArray(first)){
  const exemplar=net._normalizeArgs([]),symbols=Object.getOwnPropertySymbols(exemplar);
  if(symbols.length!==1 || first.length!==2 || first[symbols[0]]!==true || !first[0] || typeof first[0]!=='object' || Array.isArray(first[0]) || first[1]!==null && typeof first[1]!=='function' || args.length!==1)fail('R2 malformed native normalized tuple');
  options=first[0];
 }
 if(options && typeof options==='object' && options.path!==undefined){
  const mapped={...options,path:mapPath(options.path)};
  if(Array.isArray(first)){first[0]=mapped;return args;}
  return [mapped,...args.slice(1)];
 }
 if(typeof options==='string' && options.includes('/'))fail('R1 unknown Unix connect overload');
 return args;
}
export function installRegisteredRecoveryConnectAdapter(socket,runRoot,cwd,sockets){
 if(!socket || typeof socket.connect!=='function' || !(sockets instanceof Set))fail('R2 registered socket seam');const original=socket.connect;
 const adapter=function(...args){return original.apply(this,mapRecoveryConnectArguments(args,absolute=>{const canonical=path.resolve(cwd,absolute);if(!sockets.has(canonical))fail('R1 unregistered worker socket');return recoverySocketPath(canonical,cwd,runRoot);}));};socket.connect=adapter;return {original,adapter};
}
export function installRecoverySocketAdapter(profile,runRoot,{server=net.Server.prototype,socket=net.Socket.prototype,cwd=process.cwd(),port=process.env.PORT}={}){
 if(!['cli','worker'].includes(profile))fail('R1 socket adapter profile');
 const listen=server.listen,connect=socket.connect;
 if(profile==='worker')server.listen=function(...args){
  if(args[0]!==port || args.length>2 || args.length===2 && typeof args[1]!=='function')fail('R1 worker listen overload');
  return listen.apply(this,[recoverySocketPath(port,cwd,runRoot),...args.slice(1)]);
 };
 socket.connect=function(...args){
  return connect.apply(this,mapRecoveryConnectArguments(args,absolute=>recoverySocketPath(path.resolve(cwd,absolute),cwd,runRoot)));
 };
 return {listen,connect};
}

export function observeRecoveryProcesses(){return storageProcessRows();}
export function assertExternalFirestoreIdentity(){
 assertRecoveryPinnedSources();
 const expected=JSON.parse(readOwnedSource('.local/cache/m3/runtime-recovery-amendment/current-external-firestore-metadata.json',65536)).expected_tuple;
 const result=spawnSync('/bin/ps',['-p','65804','-o','pid=,ppid=,pgid=,lstart=,command='],{env:{...process.env,TZ:'Asia/Ho_Chi_Minh'},encoding:'utf8',timeout:1500,maxBuffer:65536});
 const match=result.stdout?.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+([A-Z][a-z]{2}\s+[A-Z][a-z]{2}\s+\d+\s+\d{2}:\d{2}:\d{2}\s+\d{4})\s+(.+)$/);
 if(result.status!==0 || !match || Number(match[1])!==expected.pid || Number(match[2])!==expected.ppid || Number(match[3])!==expected.pgid || match[4].replace(/\s+/g,' ')!==expected.lstart_raw || match[5]!==expected.command_raw)fail('R1 external Firestore identity changed/unknown');
 const listener=spawnSync('/usr/sbin/lsof',['-nP','-a','-p','65804','-iTCP','-sTCP:LISTEN','-Fn'],{encoding:'utf8',timeout:1500,maxBuffer:65536});
 const names=listener.stdout?.split('\n').filter(line=>line.startsWith('n')).map(line=>line.slice(1));
 if(listener.status!==0 || JSON.stringify(names?.sort())!==JSON.stringify(expected.listener_ports.map(port=>`127.0.0.1:${port}`).sort()))fail('R1 external Firestore listeners unknown');
 return {pid:65804,ppid:1,pgid:65804,start:expected.lstart_raw,argv:match[5],listeners:names,resolvedExecutable:'UNKNOWN_BASENAME_ONLY'};
}
export function validateRecoveryHub(root,map,locator,pid){
 if(!root || root.version!=='15.33.0' || root.pid!==pid || root.host!=='127.0.0.1' || root.port!==4400 || JSON.stringify(root.origins)!==JSON.stringify(['http://127.0.0.1:4400']) || Object.keys(root).some(key=>!['version','origins','pid','host','port'].includes(key)))fail('R1 Hub identity');
 if(JSON.stringify(locator)!==JSON.stringify({version:root.version,origins:root.origins,pid:root.pid}))fail('R1 locator identity');
 if(!map || JSON.stringify(Object.keys(map).sort())!==JSON.stringify(Object.keys(RECOVERY_COMPONENTS).sort()))fail('R1 managed component map');
 for(const [name,port] of Object.entries(RECOVERY_COMPONENTS)){
  const value=map[name];if(!value || typeof value!=='object' || Array.isArray(value) || Object.getPrototypeOf(value)!==Object.prototype || Object.keys(value).some(key=>!['name','host','port','listen'].includes(key)) || value?.name!==name || value.host!=='127.0.0.1' || value.port!==port)fail(`R1 component endpoint ${name}`);
  // Pinned Hub snapshots its initial listen map. Controller adds these three
  // components later, so their undefined listen property is omitted by JSON.
  if(!Object.hasOwn(value,'listen') && ['functions','eventarc','tasks'].includes(name))continue;
  if(!Array.isArray(value.listen) || value.listen.length!==1 || !value.listen[0] || typeof value.listen[0]!=='object' || Array.isArray(value.listen[0]) || Object.getPrototypeOf(value.listen[0])!==Object.prototype || value.listen[0].address!=='127.0.0.1' || value.listen[0].port!==port || value.listen[0].family!=='IPv4' || Object.keys(value.listen[0]).some(key=>!['address','port','family'].includes(key)))fail(`R1 component listen ${name}`);
 }
 return true;
}
export function validateRecoveryOwnership(record,rows){
 if(record.exit || record.close || !Number.isSafeInteger(record.pid) || !record.start)fail('R1 missing/live ownership');
 const leader=rows.find(row=>row.pid===record.pid);if(!leader || leader.ppid!==record.ppid || leader.pgid!==record.pid || leader.start!==record.start || leader.argv!==record.argv)fail('R1 leader generation');
 const node=path.join(ROOT,'.local/cache/node/node-v22.23.3-darwin-arm64/bin/node');let jvm=null;const known=new Map(record.generations??[]);
 for(const row of rows){
  if(row.pid===record.pid)continue;
  if(row.ppid!==record.pid || row.pgid!==record.pid)fail('R1 unknown descendant ancestry');
  let kind;
  if(row.argv===`java -Djava.security.manager=disallow -Duser.language=en -jar ${assertStorageJar()} serve`){kind='rules-jvm';if(jvm)fail('R1 extra JVM');jvm=row;}
  else if(row.argv===`${node} ${path.join(ROOT,'node_modules/firebase-tools/lib/emulator/functionsEmulatorRuntime')}` || row.argv===`${node} ${path.join(ROOT,'node_modules/firebase-tools/lib/emulator/functionsEmulatorRuntime.js')}`)kind='http-worker';
  else if(row.argv===`node ${path.join(ROOT,'node_modules/.bin/firebase-functions')} ${path.join(ROOT,'cms-api')}` || row.argv===`node ${path.join(ROOT,'node_modules/firebase-functions/lib/bin/firebase-functions.js')} ${path.join(ROOT,'cms-api')}` || row.argv===`${node} ${path.join(ROOT,'node_modules/.bin/firebase-functions')} ${path.join(ROOT,'cms-api')}` || row.argv===`${node} ${path.join(ROOT,'node_modules/firebase-functions/lib/bin/firebase-functions.js')} ${path.join(ROOT,'cms-api')}`)kind='sdk-discovery';
  else fail('R1 unknown descendant class');
  if(record.runRoot && kind!=='rules-jvm'){const target=assertOwnedOutput(`${record.runRoot.slice(ROOT.length+1)}/profiles/profile-${row.pid}.json`),stat=lstatSync(target);if(!stat.isFile() || stat.nlink!==1 || stat.uid!==process.getuid() || (stat.mode&0o777)!==0o600 || stat.size>65536)fail('R1 child profile receipt');const profile=JSON.parse(readFileSync(target,'utf8'));if(profile.pid!==row.pid || profile.ppid!==row.ppid || profile.pgid!==row.pgid || profile.start!==row.start || profile.execPath!==node || profile.cwd!==path.join(ROOT,'cms-api') || profile.profile!==(kind==='http-worker'?'worker':'discovery')){if(kind!=='rules-jvm')fail('R1 child receipt generation/profile');}}
  if(known.has(row.pid) && known.get(row.pid)!==row.start)fail('R1 descendant generation changed');known.set(row.pid,row.start);row.kind=kind;
 }
 if(!jvm)fail('R1 Rules JVM not proven');record.generations=[...known];return {leader,jvm,rows};
}
export async function assertRecoveryPortsAvailable(){
 for(const port of Object.values(RECOVERY_COMPONENTS))await new Promise((resolve,reject)=>{
  const socket=net.createConnection({host:'127.0.0.1',port});let done=false;
  const finish=error=>{if(done)return;done=true;socket.destroy();error?reject(error):resolve();};
  socket.setTimeout(750,()=>finish(new Error('LOCAL_GUARD: R1 port unknown')));
  socket.once('connect',()=>finish(new Error('LOCAL_GUARD: R1 existing listener')));
  socket.once('error',error=>finish(error.code==='ECONNREFUSED'?null:new Error('LOCAL_GUARD: R1 port unknown')));
 });
}
export function createRecoveryRuntime(input=process.env,policySelector=null){
 // No directory is allocated until the source-bound High receipt succeeds.
 if(policySelector!==null){if(policySelector!=='runtime-policy-recover')fail('R2 fresh selector');assertRuntimePolicyAdmission(policySelector);}else assertRecoveryRelease();assertRecoveryPinnedSources();assertRecoveryMetadata();assertStorageJar();
 const token=recoveryToken(),runRoot=assertOwnedOutput(`.local/cache/m3/runtime-recovery/runs/${token}`);
 if(existsSync(runRoot))fail('R1 root already exists');
 const env=recoveryEnvironment(runRoot,input,{jvm:true});if(policySelector)env.PINKY_RUNTIME_POLICY_SELECTOR=policySelector;process.umask(0o077);
 mkdirSync(runRoot,{recursive:true,mode:0o700});
 for(const suffix of ['cwd','tmp','config','config/configstore','cache','data','discovery','profiles'])mkdirSync(path.join(runRoot,suffix),{mode:0o700});
 writeFileSync(path.join(runRoot,'config/configstore/firebase-tools.json'),JSON.stringify({usage:false}),{flag:'wx',mode:0o600});
 return {token,runRoot,cwd:path.join(runRoot,'cwd'),env,policySelector};
}
export async function launchRecoveryRuntime(runtime){
 if(runtime.policySelector)assertRuntimePolicyAdmission(runtime.policySelector);else assertRecoveryRelease();assertRecoveryPinnedSources();assertRecoveryMetadata();assertExternalFirestoreIdentity();await assertRecoveryPortsAvailable();
 const plan=recoveryPlan('start',runtime.runRoot),record={runRoot:runtime.runRoot,pid:null,ppid:process.pid,argv:[plan.node,...plan.args].join(' '),start:null,exit:null,close:null,generations:[],observations:[]};
 const out=fs.openSync(path.join(runtime.runRoot,'stdout.log'),'wx',0o600),err=fs.openSync(path.join(runtime.runRoot,'stderr.log'),'wx',0o600);
 const child=spawn(plan.node,plan.args,{cwd:plan.cwd,env:runtime.env,detached:true,stdio:['ignore',out,err]});fs.closeSync(out);fs.closeSync(err);record.pid=child.pid;
 child.on('exit',(code,signal)=>{record.exit={code,signal,atUtc:new Date().toISOString()};});child.on('close',(code,signal)=>{record.close={code,signal,atUtc:new Date().toISOString()};});child.on('error',error=>{record.spawnError=error.code??'UNKNOWN';});
 child.unref();await new Promise(resolve=>setTimeout(resolve,100));
 const rows=storageGroupSnapshot(child.pid),leader=rows.find(row=>row.pid===child.pid);
 if(!leader || leader.ppid!==process.pid || leader.pgid!==child.pid || leader.argv!==record.argv)fail('R1 initial generation unknown; preserve child');record.start=leader.start;
 const save=()=>writeFileSync(path.join(runtime.runRoot,'runtime-owner.json'),JSON.stringify(record,null,2)+'\n',{mode:0o600});save();
 return {runtime,child,record,save,observe(){
  const current=storageGroupSnapshot(record.pid),owned=validateRecoveryOwnership(record,current);
  const listeners=spawnSync('/usr/sbin/lsof',['-nP','-a','-p',current.map(row=>row.pid).join(','),'-iTCP','-sTCP:LISTEN','-Fpn'],{encoding:'utf8',timeout:1500,maxBuffer:65536});
  if(listeners.status!==0)fail('R1 listeners unavailable');let pid=null;const entries=[];
  for(const line of listeners.stdout.split('\n')){if(line.startsWith('p'))pid=Number(line.slice(1));else if(line.startsWith('n'))entries.push({pid,name:line.slice(1)});}
  for(const port of Object.values(RECOVERY_COMPONENTS)){const match=entries.filter(entry=>entry.name===`127.0.0.1:${port}`);if(match.length!==1 || match[0].pid!==record.pid)fail('R1 fixed listener owner');}
  if(entries.some(entry=>!Object.values(RECOVERY_COMPONENTS).some(port=>entry.name===`127.0.0.1:${port}`)))fail('R1 unexplained listener');
  record.observations.push({atUtc:new Date().toISOString(),owned,listeners:entries});save();return owned;
 }};
}

export function validateRecoveryManifest(value){
 const object=entry=>entry!==null && typeof entry==='object' && !Array.isArray(entry) && Object.getPrototypeOf(entry)===Object.prototype;
 if(!object(value) || value.specVersion!=='v1alpha1' || Object.keys(value).some(key=>!['specVersion','endpoints','extensions','params','requiredAPIs'].includes(key)) || !object(value.endpoints) || JSON.stringify(Object.keys(value.endpoints))!==JSON.stringify(['cmsApi']))fail('R1 discovery manifest contract');
 for(const name of ['params','requiredAPIs'])if(value[name]!==undefined && (!Array.isArray(value[name]) || value[name].length))fail('R1 discovery manifest dynamic inputs');
 if(value.extensions!==undefined && (!object(value.extensions) || Object.keys(value.extensions).length))fail('R1 discovery extensions');
 const endpoint=value.endpoints.cmsApi,reset=['availableMemoryMb','timeoutSeconds','minInstances','maxInstances','ingressSettings','concurrency','serviceAccountEmail','vpc'];
 if(!object(endpoint) || Object.keys(endpoint).some(key=>!['entryPoint','platform','region','labels','httpsTrigger',...reset].includes(key)) || endpoint.entryPoint!=='cmsApi' || endpoint.platform!=='gcfv2' || JSON.stringify(endpoint.region)!==JSON.stringify(['us-central1']) || !object(endpoint.httpsTrigger) || Object.keys(endpoint.httpsTrigger).length)fail('R1 cmsApi HTTP manifest');
 if(endpoint.labels!==undefined && (!object(endpoint.labels) || Object.keys(endpoint.labels).length))fail('R1 HTTP labels');
 for(const name of reset)if(endpoint[name]!==undefined && endpoint[name]!==null)fail('R1 HTTP override');
 return true;
}
export function assertRecoveryManifest(runRoot){
 const target=assertOwnedOutput(`${runRoot.slice(ROOT.length+1)}/discovery/functions.yaml`),stat=lstatSync(target);
 if(!stat.isFile() || stat.nlink!==1 || stat.uid!==process.getuid() || stat.size>65536)fail('R1 discovery manifest type/size');
 // Pinned firebase-functions bin writes JSON wireFormat, despite functions.yaml filename.
 validateRecoveryManifest(JSON.parse(readFileSync(target,'utf8')));return {path:target,bytes:stat.size,sha256:sha(readFileSync(target))};
}

let recoveryStorageIdentity=null;
export function bindRecoveryStorageStart(constructor,verify){
 const prototype=constructor?.prototype,original=prototype?.start;if(typeof original!=='function' || typeof verify!=='function')fail('R1 Storage seam missing');
 const adapter=async function(){
  if(constructor.prototype!==prototype || prototype.start!==adapter || !(this instanceof constructor))fail('R1 Storage method drift');
  verify();return original.call(this,false);
 };
 prototype.start=adapter;return {constructor,prototype,original,adapter};
}
export function installRecoveryStorageAdapter(){
 assertRecoveryPinnedSources();assertStorageJar();
 const require=createRequire(import.meta.url),module=require('../node_modules/firebase-tools/lib/emulator/storage/rules/runtime.js'),downloadable=require('../node_modules/firebase-tools/lib/emulator/downloadableEmulators.js');
 const verify=()=>{
  if(validateRecoveryProfile({entry:process.argv[1],argv:process.argv.slice(1),execArgv:process.execArgv,cwd:process.cwd(),env:process.env})!=='cli')fail('R1 Storage-only backend profile');
  const jar=assertStorageJar(),details=downloadable.getDownloadDetails('storage'),command=downloadable._getCommand('storage',{});
  if(details.downloadPath!==jar || details.version!=='1.1.3' || command.binary!=='java' || command.shell!==false || JSON.stringify(command.args)!==JSON.stringify(['-Djava.security.manager=disallow','-Duser.language=en','-jar',jar,'serve']))fail('R1 Storage Java/cache identity');
  if(recoveryStorageIdentity && (module.StorageRulesRuntime!==recoveryStorageIdentity.constructor || module.StorageRulesRuntime.prototype.start!==recoveryStorageIdentity.adapter))fail('R1 Storage module identity drift');
 };
 verify();if(recoveryStorageIdentity)return recoveryStorageIdentity;
 recoveryStorageIdentity=bindRecoveryStorageStart(module.StorageRulesRuntime,verify);return recoveryStorageIdentity;
}

let recoveryProcessProfile=null;
let recoveryAdapterIdentity=null;
export function applyRecoveryEnvironment(values,target=process.env){
 for(const [key,value] of Object.entries(values)){if(value===undefined)delete target[key];else if(typeof value==='string')target[key]=value;else fail('R1 environment value type');}return target;
}
export function recoveryNodeEnvironment(runRoot,input=process.env){
 const env=recoveryEnvironment(runRoot,{HOME:input.HOME,PATH:input.PATH,LANG:input.LANG});
 env.FIREBASE_CONFIG=JSON.stringify({projectId:PROJECT,storageBucket:STORAGE_BUCKET});
 // Explicit undefined removes inherited JVM markers from startNode's process.env spread.
 env.JAVA_TOOL_OPTIONS=undefined;env.JDK_JAVA_OPTIONS=undefined;env._JAVA_OPTIONS=undefined;env.PINKY_STORAGE_RUNTIME=undefined;
 return env;
}
export function installRecoveryProcessAdapters(){
 if(process.env.PINKY_RUNTIME_POLICY_SELECTOR!==undefined)assertRuntimePolicyAdmission(process.env.PINKY_RUNTIME_POLICY_SELECTOR);else assertRecoveryRelease();assertRecoveryPinnedSources();assertRecoveryMetadata();
 const profile=validateRecoveryProfile({entry:process.argv[1],argv:process.argv.slice(1),execArgv:process.execArgv,cwd:process.cwd(),env:process.env});
 recoveryProcessProfile=profile;
 if(process.execPath!==path.join(ROOT,'.local/cache/node/node-v22.23.3-darwin-arm64/bin/node') || process.version!=='v22.23.3')fail('R1 child Node executable/version');
 const runRoot=process.env.PINKY_RECOVERY_RUNTIME;
 if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080' || process.env.PINKY_STORAGE_BUCKET!==STORAGE_BUCKET || process.env.NODE_OPTIONS!==`--import=${pathToFileURL(ownPath).href}` || process.env.XDG_CONFIG_HOME!==path.join(runRoot,'config') || process.env.FIREBASE_EMULATORS_PATH!==path.join(ROOT,'.local/cache/m3/task03/emulators'))fail('R1 fixed profile environment');
 for(const key of ['TMPDIR','TMP','TEMP'])if(process.env[key]!==path.join(runRoot,'tmp'))fail('R1 profile temp');
 if(os.tmpdir()!==path.join(runRoot,'tmp'))fail('R1 actual Node tmpdir');
 for(const key of Object.keys(process.env))if(/_EMULATOR_(?:BINARY_PATH|VERSION)$/.test(key))fail('R1 binary/version override');
 assertOwnedOutput(runRoot.slice(ROOT.length+1));
 const ownRootStat=lstatSync(runRoot);if(ownRootStat.uid!==process.getuid() || !ownRootStat.isDirectory() || (ownRootStat.mode&0o777)!==0o700)fail('R1 child owned root');
 const rows=storageProcessRows(),row=rows.find(value=>value.pid===process.pid);if(!row || row.ppid!==process.ppid)fail('R1 child generation observation');
 const receipt={profile,pid:process.pid,ppid:process.ppid,pgid:row.pgid,start:row.start,execPath:process.execPath,version:process.version,argv:process.argv.slice(1),execArgv:process.execArgv,cwd:process.cwd(),nodeTmpdir:os.tmpdir(),observerTimeZone:'Asia/Ho_Chi_Minh',canonicalSocket:profile==='worker'?process.env.PORT:null,effectiveSocket:profile==='worker'?recoverySocketPath(process.env.PORT,process.cwd(),runRoot):null};
 writeFileSync(path.join(runRoot,`profiles/profile-${process.pid}.json`),JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});
 if(profile==='worker'){
  installRecoverySocketAdapter('worker',runRoot);
  return profile;
 }
 if(profile==='discovery')return profile;
 if(profile==='export'){
  const require=createRequire(import.meta.url),{EmulatorHubClient}=require('../node_modules/firebase-tools/lib/emulator/hubClient.js'),original=EmulatorHubClient.prototype.postExport;
  if(typeof original!=='function')fail('R1 export fulfillment seam');
  EmulatorHubClient.prototype.postExport=async function(options){
   if(this.projectId!==PROJECT || options.path!==process.env.PINKY_RECOVERY_AUTH_DEST || JSON.stringify(options.targets)!==JSON.stringify(['auth']) || options.initiatedBy!=='emulators:export')fail('R1 export request identity');
   await original.call(this,options);
   writeFileSync(path.join(runRoot,`export-fulfilled-${path.basename(path.dirname(options.path))}.json`),JSON.stringify({status:'SOURCE_BOUND_FULFILLED',path:options.path,emulators:['auth'],atUtc:new Date().toISOString(),httpStatus:'NOT_EXPOSED_BY_PINNED_CLIENT'}),{flag:'wx',mode:0o600});
  };return profile;
 }
 installRecoveryStorageAdapter();
 const require=createRequire(import.meta.url),controller=require('../node_modules/firebase-tools/lib/emulator/controller.js');
 const {FunctionsEmulator}=require('../node_modules/firebase-tools/lib/emulator/functionsEmulator.js');
 const originalStart=controller.startAll,originalNode=FunctionsEmulator.prototype.startNode;
 if(recoveryAdapterIdentity){if(controller.startAll!==recoveryAdapterIdentity.start || FunctionsEmulator.prototype.startNode!==recoveryAdapterIdentity.node)fail('R1 adapter identity drift');return profile;}
 if(typeof originalStart!=='function' || typeof originalNode!=='function')fail('R1 missing source seam');
 const sockets=new Set(),cwd=process.cwd();
 // CLI HTTP clients may connect only sockets returned by this pinned owned startNode.
 installRegisteredRecoveryConnectAdapter(net.Socket.prototype,runRoot,cwd,sockets);
 const start=async function(options,...rest){
  if(controller.startAll!==start || FunctionsEmulator.prototype.startNode!==node || options.extDevEnv!==undefined || options.only!=='auth,functions,hosting,storage' || options.project!==PROJECT)fail('R1 controller option/source drift');
  assertRecoveryMetadata();
  return originalStart.call(this,{...options,extDevEnv:runtimePolicyNodeEnvironment(runRoot)},...rest);
 };
 const node=async function(backend,envs){
  if(controller.startAll!==start || FunctionsEmulator.prototype.startNode!==node || backend.functionsDir!==path.join(ROOT,'cms-api') || backend.bin!==path.join(ROOT,'.local/cache/node/node-v22.23.3-darwin-arm64/bin/node') || this.debugMode || envs.FUNCTION_TARGET!=='cmsApi' || envs.FUNCTION_SIGNATURE_TYPE!=='http')fail('R1 worker backend/source drift');
  assertRecoveryMetadata();assertRecoveryManifest(runRoot);
  const runtime=await originalNode.call(this,backend,{...envs,...runtimePolicyNodeEnvironment(runRoot)});
  if(runtime.cwd!==path.join(ROOT,'cms-api') || !Number.isSafeInteger(runtime.process?.pid) || !runtime.conn?.socketPath)fail('R1 returned runtime shape');
  recoverySocketPath(runtime.conn.socketPath,cwd,runRoot);sockets.add(runtime.conn.socketPath);
  return runtime;
 };
 controller.startAll=start;FunctionsEmulator.prototype.startNode=node;
 recoveryAdapterIdentity={start,node,originalStart,originalNode,sockets};return profile;
}

export const RETAINED_RECOVERY=Object.freeze({token:'YNT2Wz7uQ3G8sEzkrIxXgg',pid:15465,pgid:15465,start:'Mon Oct 12 14:58:14 2026',oldParent:15456,ppid:1,jvm:15525,jvmStart:'Mon Oct 12 14:58:18 2026',holdIndexSha256:'c4684992548d04ab394d5a7563888820d87fec50987a2840fae5cfae7265f02f',loadedGuardSha256:'26ee7699dfdff015f25a986a1a68a123df48794f4e23b44cdfe099894a9bd33b',oldReviewSha256:'b3ebbc88d5579da5f5a873328f79fcda2d15a36b81539c02e483e995d8a895ea',oldReleaseSha256:'a58151e85f5b29a2de16e29800bfa431f7681189fff6e514106b0b1283dd5967'});
const retainedHoldRoot='.local/cache/m3/runtime-recovery/01Rb-2e1a90bb-6820-45a4-85e3-9e0d493e1ebb';
const retainedGateRoot='.local/cache/m3/runtime-recovery/continuation-prior-gates-4fcdaadd-6aaa-4f0f-b33b-1d9267b64b6f';
const retainedSourceRoot='.local/cache/m3/runtime-recovery/01Ra-continuation-bc39c67a-05cb-4bdc-90b7-24c838d25ce6';
const CLI_POLICY_FUNCTIONS=Object.freeze(['validateConfig','validateRuntime','childEnvironment','assertStorageJar','installNetworkFence','disableCliCredentialDiscovery','installCliConfigAdapter','installLocalHttpParser','recoverySourceRecords','validateRecoveryRelease','assertRecoveryRelease','recoveryPinnedLocation','assertRecoveryPinnedSources','validateRecoveryHighReview','recoveryMetadataName','assertRecoveryMetadata','recoveryToken','recoveryRoot','recoverySocketPath','recoveryEnvironment','recoveryPlan','validateRecoveryProfile','installRecoverySocketAdapter','validateRecoveryManifest','assertRecoveryManifest','bindRecoveryStorageStart','installRecoveryStorageAdapter','applyRecoveryEnvironment','recoveryNodeEnvironment','installRecoveryProcessAdapters']);
function policyFunction(text,name){
 const start=new RegExp(`^(?:export )?(?:async )?function ${name}\\(`,'m').exec(text)?.index;if(start===undefined)fail('R1 policy section missing');
 const tail=text.slice(start),next=/\n(?:export )?(?:(?:async )?function\s|(?:let|const)\s|if\()/g;next.lastIndex=1;const boundary=next.exec(tail);return tail.slice(0,boundary?boundary.index:tail.length).trimEnd()+'\n';
}
export function compareRetainedPolicy(original,current){
 const sections=CLI_POLICY_FUNCTIONS.map(name=>{const before=policyFunction(original,name),after=policyFunction(current,name);return {name,bytes:Buffer.byteLength(before),oldSha256:sha(before),currentSha256:sha(after),match:before===after};});
 const preload=text=>{const start=/^if\(process\.env\.PINKY_NETWORK_FENCE==='1'\) \{/m.exec(text)?.index;if(start===undefined)fail('R1 preload section missing');const offset=/^if\(process\.argv\[1\] && path\.resolve\(process\.argv\[1\]\)===ownPath\)/m.exec(text.slice(start))?.index;if(offset===undefined)fail('R1 preload section missing');return text.slice(start,start+offset).trimEnd()+'\n';};
 const before=preload(original),after=preload(current);sections.push({name:'NETWORK_PRELOAD_DISPATCH',bytes:Buffer.byteLength(before),oldSha256:sha(before),currentSha256:sha(after),match:before===after});
 if(sections.some(section=>!section.match))fail('R1 loaded CLI policy section drift');return sections;
}
export function assertRetainedPolicyParity(){
 const original=readOwnedSource(`${retainedSourceRoot}/prior-source/scripts/local-guard.mjs`,512*1024);
 if(sha(original)!==RETAINED_RECOVERY.loadedGuardSha256)fail('R1 old loaded guard archival identity');
 return compareRetainedPolicy(original,readOwnedSource('scripts/local-guard.mjs',512*1024));
}
export function validateRetainedTransition(originalOwner,operatorExit,rows){
 const fixed=RETAINED_RECOVERY,runRoot=recoveryRoot(fixed.token),plan=recoveryPlan('start',runRoot),argv=[plan.node,...plan.args].join(' ');
 if(originalOwner.pid!==fixed.pid || originalOwner.ppid!==fixed.oldParent || originalOwner.start!==fixed.start || originalOwner.argv!==argv || originalOwner.exit!==null || originalOwner.close!==null)fail('R1 original retained owner mismatch');
 const originalLast=originalOwner.observations?.at(-1)?.owned;
 if(originalLast?.leader?.pid!==fixed.pid || originalLast.leader.ppid!==fixed.oldParent || originalLast.leader.pgid!==fixed.pgid || originalLast.leader.start!==fixed.start || originalLast.jvm?.pid!==fixed.jvm || originalLast.jvm.start!==fixed.jvmStart || originalLast.jvm.ppid!==fixed.pid)fail('R1 original owned generation evidence');
 if(operatorExit.pid!==fixed.oldParent || operatorExit.mode!=='runtime-recovery-live' || operatorExit.argv!==`${path.join(ROOT,'.local/cache/node/node-v22.23.3-darwin-arm64/bin/node')} ${path.join(ROOT,'scripts/recover-auth-local.mjs')} live` || operatorExit.start!=='Mon Oct 12 14:58:12 2026' || operatorExit.exit?.code!==1 || operatorExit.close?.code!==1 || operatorExit.exit.signal!==null || operatorExit.close.signal!==null || operatorExit.signals?.length || rows.some(row=>row.pid===fixed.oldParent))fail('R1 recorded old parent exit not proven');
 const leader=rows.find(row=>row.pid===fixed.pid),jvm=rows.find(row=>row.pid===fixed.jvm);
 if(!leader || leader.ppid!==1 || leader.pgid!==fixed.pgid || leader.start!==fixed.start || leader.argv!==argv || !jvm || jvm.ppid!==fixed.pid || jvm.pgid!==fixed.pgid || jvm.start!==fixed.jvmStart)fail('R1 retained reparent/generation mismatch');
 return {originalParent:fixed.oldParent,currentParent:1,transition:'EXACT_PRIOR_OWNER_EXIT_RECORDED_REPARENT',leader,jvm};
}
export function readRetainedRecoveryEvidence(){
 assertRecoveryRelease();assertRecoveryPinnedSources();assertRecoveryMetadata();
 const indexText=readOwnedSource(`${retainedHoldRoot}/evidence-index.json`,256*1024);
 if(sha(indexText)!==RETAINED_RECOVERY.holdIndexSha256)fail('R1 retained HOLD index drift');
 const index=JSON.parse(indexText);
 for(const file of index.files){
  if(!file.path.startsWith(`${ROOT}/${retainedHoldRoot}/`))fail('R1 HOLD file identity escape');
  const relative=file.path.slice(ROOT.length+1),bytes=readOwnedSource(relative,Math.max(file.bytes,1)),stat=lstatSync(file.path);
  if(stat.size!==file.bytes || stat.nlink!==1 || `0o${(stat.mode&0o777).toString(8)}`!==file.mode || sha(bytes)!==file.sha256)fail('R1 HOLD evidence bytes/mode drift');
 }
 const reviewText=readOwnedSource(`${retainedGateRoot}/01Ra-high-review.json`,65536),releaseText=readOwnedSource(`${retainedGateRoot}/01Ra-high-release.json`,65536);
 if(sha(reviewText)!==RETAINED_RECOVERY.oldReviewSha256 || sha(releaseText)!==RETAINED_RECOVERY.oldReleaseSha256)fail('R1 original High gate identity');
 const oldRelease=JSON.parse(releaseText),oldReview=JSON.parse(reviewText);
 for(const source of oldRelease.sources){const relative=source.path.replace(/^pinky-lamb-cms\//,''),target=path.join(ROOT,retainedSourceRoot,'prior-source',relative),stat=lstatSync(target);if(!stat.isFile() || stat.nlink!==1 || (stat.mode&0o777)!==0o600 || stat.size!==source.bytes || sha(readOwnedSource(`${retainedSourceRoot}/prior-source/${relative}`,512*1024))!==source.sha256)fail('R1 original approved source archive');}
 validateRecoveryRelease(oldRelease,oldRelease.sources);validateRecoveryHighReview(oldReview,oldRelease,oldRelease.sources);
 if(oldRelease.sources.find(row=>row.path==='pinky-lamb-cms/scripts/local-guard.mjs')?.sha256!==RETAINED_RECOVERY.loadedGuardSha256)fail('R1 old approved loaded guard');
 const operatorText=readOwnedSource(`${retainedSourceRoot}/old-operator-close.json`,65536);
 if(sha(operatorText)!=='b47d16a0fee7b7c4da1d12346c757ded4707d9dcfde2065d90801c8eda64e910')fail('R1 old operator close evidence');
 const originalOwner=JSON.parse(readOwnedSource(`${retainedHoldRoot}/private-runtime-snapshot/runtime-owner.json`,4*1024*1024));
 const originalObservation=JSON.parse(readOwnedSource(`${retainedHoldRoot}/private-runtime-snapshot/recovery-observation.json`,4*1024*1024));
 if(originalObservation.status!=='HOLD' || originalObservation.readiness!==undefined || originalObservation.auth!==undefined || originalObservation.custody!==undefined || originalObservation.before.documents!==4443 || originalObservation.partialCreate!==undefined || originalObservation.reason!=='STARTUP_HOLD_HTTP_DEADLINE')fail('R1 exact pre-write retained HOLD');
 return {originalOwner,originalObservation,operatorExit:JSON.parse(operatorText),oldRelease,oldReview,policyParity:assertRetainedPolicyParity()};
}
export function observeRetainedRuntime(evidence,observerRecord={...evidence.originalOwner,ppid:1,observations:[],generations:[...evidence.originalOwner.generations]}){
 const rows=storageProcessRows(),group=storageGroupSnapshot(RETAINED_RECOVERY.pid),transition=validateRetainedTransition(evidence.originalOwner,evidence.operatorExit,[...rows.filter(row=>row.pgid!==RETAINED_RECOVERY.pgid),...group]);
 const owned=validateRecoveryOwnership(observerRecord,group);
 if(owned.jvm.pid!==RETAINED_RECOVERY.jvm || owned.jvm.start!==RETAINED_RECOVERY.jvmStart)fail('R1 retained JVM generation');
 const listeners=spawnSync('/usr/sbin/lsof',['-nP','-a','-p',group.map(row=>row.pid).join(','),'-iTCP','-sTCP:LISTEN','-Fpn'],{encoding:'utf8',timeout:1500,maxBuffer:65536});
 if(listeners.status!==0)fail('R1 retained listeners unavailable');let pid=null;const entries=[];
 for(const line of listeners.stdout.split('\n')){if(line.startsWith('p'))pid=Number(line.slice(1));else if(line.startsWith('n'))entries.push({pid,name:line.slice(1)});}
 for(const port of Object.values(RECOVERY_COMPONENTS)){const matches=entries.filter(entry=>entry.name===`127.0.0.1:${port}`);if(matches.length!==1 || matches[0].pid!==RETAINED_RECOVERY.pid)fail('R1 retained listener owner');}
 if(entries.length!==8)fail('R1 extra retained listener');
 return {atUtc:new Date().toISOString(),transition,owned,listeners:entries,originalOwner:{pid:evidence.originalOwner.pid,ppid:evidence.originalOwner.ppid,start:evidence.originalOwner.start,argv:evidence.originalOwner.argv,sourceSnapshot:`${retainedHoldRoot}/private-runtime-snapshot/runtime-owner.json`},observer:{pid:process.pid,ppid:process.ppid},loadedPolicy:'ORIGINAL_APPROVED_CLI_NOT_RELOADED',newWorkerPolicy:'CURRENT_RENEWED_SOURCE_BOUND_GATE'};
}
export function validateContinuationNamespace(names){
 if(!Array.isArray(names) || names.some(name=>typeof name!=='string' || name.toLowerCase().startsWith('continuation')))fail('R1 existing/unknown continuation admission; no second operator');return true;
}
export function atomicContinuationAdmission(writeExclusive,record){
 if(typeof writeExclusive!=='function')fail('R1 admission writer');
 try{writeExclusive(record);}catch(error){if(error.code==='EEXIST')fail('R1 continuation already admitted; no SDK/API');throw error;}return record;
}
export function validateRetainedPrivateDirectory(record,uid=process.getuid()){
 if(!record || record.type!=='directory' || record.symbolicLink!==false || record.uid!==uid || record.mode!==0o700 || record.realpath!==record.path)fail('R1 retained private directory ownership/mode/type drift');return true;
}
export function assertRetainedPrivateDirectories(){
 const runRoot=recoveryRoot(RETAINED_RECOVERY.token),records=[];
 for(const suffix of ['','cwd','tmp','config','config/configstore','profiles','cache','data','discovery']){
  const target=suffix?path.join(runRoot,suffix):runRoot;assertOwnedOutput(target.slice(ROOT.length+1));const stat=lstatSync(target);
  const record={path:target,realpath:realpathSync(target),type:stat.isDirectory()?'directory':stat.isSymbolicLink()?'symlink':'other',symbolicLink:stat.isSymbolicLink(),uid:stat.uid,mode:stat.mode&0o777};validateRetainedPrivateDirectory(record);records.push(record);
 }
 return records;
}
export function continueRetainedRecovery(input=process.env){
 assertRecoveryRelease();const privateDirectories=assertRetainedPrivateDirectories();const evidence=readRetainedRecoveryEvidence();assertExternalFirestoreIdentity();const ownershipPolicyRecord={...evidence.originalOwner,ppid:1,observations:[],generations:[...evidence.originalOwner.generations]};const initial=observeRetainedRuntime(evidence,ownershipPolicyRecord);
 const runRoot=recoveryRoot(RETAINED_RECOVERY.token);assertOwnedOutput(runRoot.slice(ROOT.length+1));
 validateContinuationNamespace(readdirSync(runRoot));
 const release=assertRecoveryRelease(),admission={atUtc:new Date().toISOString(),status:'OWNED_SINGLE_CONTINUATION_ADMITTED',operator:{pid:process.pid,ppid:process.ppid,entry:process.argv[1],argv:process.argv.slice(1),execPath:process.execPath},runRoot,priorHold:RETAINED_RECOVERY.holdIndexSha256,currentHigh:release.review,currentSources:release.sources,oldLoadedGuard:RETAINED_RECOVERY.loadedGuardSha256};
 const latch=assertOwnedOutput(`${runRoot.slice(ROOT.length+1)}/continuation-admission.json`);atomicContinuationAdmission(value=>writeFileSync(latch,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600}),admission);
 const operatorRoot=assertOwnedOutput(`${runRoot.slice(ROOT.length+1)}/continuation-${recoveryToken()}`);if(existsSync(operatorRoot))fail('R1 continuation receipt exists');mkdirSync(operatorRoot,{mode:0o700});
 const runtime={token:RETAINED_RECOVERY.token,runRoot,cwd:path.join(runRoot,'cwd'),env:recoveryEnvironment(runRoot,input),operatorRoot};let serial=0;
 const record={privateDirectories,admission:{path:latch,sha256:sha(readFileSync(latch))},originalOwner:initial.originalOwner,currentObserver:{pid:process.pid,ppid:process.ppid},pid:RETAINED_RECOVERY.pid,ppid:1,start:RETAINED_RECOVERY.start,argv:evidence.originalOwner.argv,observations:[],loadedGuard:RETAINED_RECOVERY.loadedGuardSha256,priorHold:RETAINED_RECOVERY.holdIndexSha256,policyParity:evidence.policyParity};
 const capture=value=>{writeFileSync(path.join(operatorRoot,`ownership-${String(serial++).padStart(6,'0')}.json`),JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});record.observations.push({atUtc:value.atUtc,path:path.join(operatorRoot,`ownership-${String(serial-1).padStart(6,'0')}.json`)});return value;};capture(initial);
 return {runtime,record,originalInventory:evidence.originalObservation.before,observe(){assertRecoveryRelease();assertRetainedPrivateDirectories();assertRetainedPolicyParity();return capture(observeRetainedRuntime(evidence,ownershipPolicyRecord));}};
}

export function recoveryOperatorPlan(mode){
 if(!['runtime-recovery-unit','runtime-recovery-live'].includes(mode))fail('R1 operator selector');return commandPlan(mode);
}
export async function dispatchRecoveryOperator(mode,input=process.env){
 const plan=recoveryOperatorPlan(mode);
 if(mode==='runtime-recovery-live'){assertRecoveryRelease();assertRecoveryPinnedSources();assertRecoveryMetadata();}
 const env=childEnvironment(input);delete env.NODE_OPTIONS;delete env.PINKY_NETWORK_FENCE;
 // No generic launch or signal forwarding. Interrupts retain discoverable owned
 // operator/client state; a pending create/export is not cancelled by a signal.

 const child=spawn(plan.node,plan.args,{cwd:ROOT,env,detached:true,stdio:'inherit'});
 const record={mode,pid:child.pid,ppid:process.pid,argv:[plan.node,...plan.args].join(' '),start:null,exit:null,close:null,signals:[],limits:'No implicit signal forwarding or group kill; unknown/live operation retained'};
 child.on('exit',(code,signal)=>{record.exit={code,signal};});child.on('close',(code,signal)=>{record.close={code,signal};process.exitCode=code??1;});child.on('error',()=>{record.error='OPERATOR_SPAWN';process.exitCode=1;});
 await new Promise(resolve=>setTimeout(resolve,50));
 const observed=storageGroupSnapshot(child.pid),leader=observed.find(row=>row.pid===child.pid);
 if(leader){if(leader.ppid!==process.pid || leader.pgid!==child.pid || leader.argv!==record.argv)fail('R1 operator ownership unknown; no signal');record.start=leader.start;}
 else if(!record.close)fail('R1 operator generation unknown; no signal');
 const relative=`.local/cache/m3/runtime-recovery/operator-receipts/${recoveryToken()}.json`,target=assertOwnedOutput(relative);mkdirSync(path.dirname(target),{recursive:true,mode:0o700});writeFileSync(target,JSON.stringify(record,null,2)+'\n',{flag:'wx',mode:0o600});
 const onSignal=signal=>{record.signals.push({signal,forwarded:false,atUtc:new Date().toISOString(),reason:'Retain owned operation; completion unknown until receipt'});writeFileSync(target,JSON.stringify(record,null,2)+'\n',{mode:0o600});console.error(`LOCAL_GUARD: R1 interrupt retained operator ${child.pid}; no blind signal forwarding`);};
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,onSignal);
 child.once('close',()=>{for(const signal of ['SIGINT','SIGTERM'])process.off(signal,onSignal);writeFileSync(target,JSON.stringify(record,null,2)+'\n',{mode:0o600});});
 return {child,record,path:target};
}


// M3-RUNTIME-02: sequential source-bound gates, never a caller-selected root.
export const RUNTIME_POLICY_BUNDLE=Object.freeze({proposal:'788b0b0c1cc3fc5af1fa132e37e6e098ad9650b3058b4bcf921cb4c6a5b683f5',scope:'e428d68386c619c8e47e55fcc5f668cbb66fe125fef987e36543f6be9452fb67',canonical:'7b229ac74c1d3b0663e492f43c87d0f028131e53d5489270ebe1659f89926b08',approval:'0ec43f80afffc60642f129c4f64dcf554a57266f2e1498e9263372b817ef4f83'});
const policyScope='.local/cache/m3/runtime-policy-amendment/revision1-final-generation3/M3-RUNTIME-02.scope.json';
export const RUNTIME_POLICY_PHASES=Object.freeze({'runtime-policy-control':'02b','runtime-policy-preserve':'02c','runtime-policy-stop':'02d','runtime-policy-recover':'02e'});
const policyGateStatus=Object.freeze({'02a':'PASS_CODE_UNIT_ONLY','02b':'PASS_NATIVE_CONTROL_ONLY','02c':'PASS_PRESERVATION_ONLY','02d':'PASS_ABSENCE_ONLY'});
const policyBaseArchive='.local/cache/m3/runtime-policy-correction/02a-96a29eba-cca3-4fa1-a9cb-9f30c32df5b2/prior-source/pinky-lamb-cms/scripts/local-guard.mjs';
export function validateRuntimePolicyGate(receipt,review,phase,current){
 const status=policyGateStatus[phase],equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const expectedPaths=['scripts/local-guard.mjs','scripts/recover-auth-local.mjs','tests/runtime-recovery.test.mjs','docs/LOCAL-RUNBOOK.md'].map(value=>`pinky-lamb-cms/${value}`);if(!Array.isArray(current) || current.length!==4 || current.some((record,index)=>record.path!==expectedPaths[index] || record.mode!=='0o644' || record.links!==1 || !Number.isSafeInteger(record.bytes) || record.bytes<=0 || !/^[a-f0-9]{64}$/.test(record.sha256??'')))fail('R2 current source array shape');
 if(!status || !receipt || receipt.status!==status || receipt.amendment_id!=='M3-RUNTIME-02' || receipt.revision!==1 || receipt.freeze_generation!==3 || receipt.phase!==phase || !equal(receipt.bundle,RUNTIME_POLICY_BUNDLE) || !equal(receipt.sources,current) || typeof receipt.review?.path!=='string' || !new RegExp(`^\\.local/cache/m3/runtime-policy-correction/${phase}-high-review\\.json$`).test(receipt.review.path) || !/^[a-f0-9]{64}$/.test(receipt.review.sha256??'') || !Number.isFinite(Date.parse(receipt.review.atUtc)))fail('R2 source/phase release mismatch');
 if(phase!=='02a'){const expected={ '02b':'.local/cache/m3/runtime-policy-correction/02b-native-controls.json','02c':'.local/cache/m3/runtime-policy-correction/02c-preservation.json','02d':'.local/cache/m3/runtime-policy-correction/02d-absence.json'}[phase];if(receipt.evidence?.path!==expected || !/^[a-f0-9]{64}$/.test(receipt.evidence.sha256??'') || !equal(receipt.evidence,review?.evidence))fail('R2 native gate evidence binding');}
 if(!review || review.status!==status || review.amendment_id!=='M3-RUNTIME-02' || review.revision!==1 || review.freeze_generation!==3 || review.phase!==phase || review.actual_effort!=='HIGH' || review.reviewer!=='/root/pdf_setup_reviewer' || review.atUtc!==receipt.review.atUtc || !equal(review.sources,current) || !equal(review.bundle,RUNTIME_POLICY_BUNDLE))fail('R2 actual linked High mismatch');return true;
}
export function assertRuntimePolicySources(){
 const text=readOwnedSource(policyScope,256*1024);if(sha(text)!==RUNTIME_POLICY_BUNDLE.scope)fail('R2 frozen scope drift');const scope=JSON.parse(text),workspace=path.dirname(ROOT);
 for(const pin of [...scope.inherited_frozen_input_pins,...scope.additional_evidence_and_closure_pins]){
  const historical=pin.path==='pinky-lamb-cms/scripts/local-guard.mjs',absolute=historical?path.join(ROOT,'.local/cache/m3/runtime-recovery/01Ra-4e723b85-a8fc-47d0-bc19-f94f909832cb/prior-source/pinky-lamb-cms/scripts/local-guard.mjs'):path.join(workspace,pin.path);
  if(path.resolve(absolute)!==absolute || !absolute.startsWith(`${workspace}/`))fail('R2 invariant path');
  for(let ancestor=path.dirname(absolute);ancestor!==workspace;ancestor=path.dirname(ancestor)){if(!ancestor.startsWith(`${workspace}/`) || lstatSync(ancestor).isSymbolicLink() || realpathSync(ancestor)!==ancestor)fail('R2 invariant ancestry');}
  const st=lstatSync(absolute);if(`0o${(st.mode&0o777).toString(8)}`!==(historical?'0o600':pin.mode) || st.nlink!==pin.links)fail('R2 invariant mode/links');
  if(pin.type==='symlink'){if(!st.isSymbolicLink() || fs.readlinkSync(absolute)!==pin.target || realpathSync(absolute)!==pin.resolved_path || sha(readFileSync(pin.resolved_path))!==pin.resolved_sha256)fail('R2 invariant SDK alias');}
  else if(!st.isFile() || st.size!==pin.bytes || sha(readFileSync(absolute))!==pin.sha256)fail('R2 invariant bytes');
 }
 if(sha(readOwnedSource(policyBaseArchive,256*1024))!=='e7bda0913f1e227d8c9b858d944dc9e70f173f2ef36c919a4894564da78d3a1b')fail('R2 current-R1 era archive');
 if(sha(readOwnedSource('.local/cache/m3/runtime-policy-amendment/revision1-final-generation3/M3-RUNTIME-02-PROPOSAL.md',65536))!==RUNTIME_POLICY_BUNDLE.proposal || sha(readOwnedSource('.local/cache/m3/runtime-policy-correction/approved-resume-20261012-1730/approval-observation.json',65536))!==RUNTIME_POLICY_BUNDLE.approval)fail('R2 genuine authorization drift');return scope;
}
export function assertRuntimePolicyGate(phase){
 assertRuntimePolicySources();const relative=`.local/cache/m3/runtime-policy-correction/${phase}-high-release.json`,receipt=JSON.parse(readOwnedSource(relative,65536));
 const privateRecord=relative=>{const st=lstatSync(assertOwnedOutput(relative));if(!st.isFile() || st.uid!==process.getuid() || st.nlink!==1 || (st.mode&0o777)!==0o600)fail('R2 private gate type/mode');};privateRecord(relative);privateRecord(receipt.review?.path??'');
 const reviewText=readOwnedSource(receipt.review?.path??'',65536);if(sha(reviewText)!==receipt.review.sha256)fail('R2 High receipt hash');validateRuntimePolicyGate(receipt,JSON.parse(reviewText),phase,recoverySourceRecords());if(phase!=='02a'){privateRecord(receipt.evidence.path);const bytes=readOwnedSource(receipt.evidence.path,32*1024*1024);if(sha(bytes)!==receipt.evidence.sha256)fail('R2 native gate evidence hash');const proof=JSON.parse(bytes);if(proof.status!==policyGateStatus[phase] || JSON.stringify(proof.sources)!==JSON.stringify(receipt.sources))fail('R2 native gate evidence source/status');}return receipt;
}
export function assertRuntimePolicyAdmission(selector){
 const phase=RUNTIME_POLICY_PHASES[selector];if(!phase)fail('R2 fixed selector');
 for(const previous of Object.keys(policyGateStatus)){if(previous>=phase)break;assertRuntimePolicyGate(previous);}assertRecoveryMetadata();return phase;
}
export function runtimePolicyOperatorPlan(selector,extra=[]){
 if(extra.length || !Object.hasOwn(RUNTIME_POLICY_PHASES,selector))fail('R2 fixed selector/arguments');
 const node=path.join(ROOT,'.local/cache/node/node-v22.23.3-darwin-arm64/bin/node');
 if(selector==='runtime-policy-control')return {node,args:['--test','--test-concurrency=1','--test-name-pattern=^R2 native:',path.join(ROOT,'tests/runtime-recovery.test.mjs')]};
 return {node,args:[path.join(ROOT,'scripts/recover-auth-local.mjs'),selector]};
}
export function runtimePolicyNodeEnvironment(runRoot,input={HOME:process.env.HOME,PATH:process.env.PATH,LANG:process.env.LANG,PINKY_RUNTIME_POLICY_SELECTOR:process.env.PINKY_RUNTIME_POLICY_SELECTOR}){
 if(!input || Object.keys(input).some(key=>!['HOME','PATH','LANG','PINKY_RUNTIME_POLICY_SELECTOR'].includes(key)))fail('R2 explicit safe Node base required after operator admission');
 const env=recoveryNodeEnvironment(runRoot,input);if(input.PINKY_RUNTIME_POLICY_SELECTOR!==undefined){if(!['runtime-policy-preserve','runtime-policy-recover'].includes(input.PINKY_RUNTIME_POLICY_SELECTOR))fail('R2 child selector');env.PINKY_RUNTIME_POLICY_SELECTOR=input.PINKY_RUNTIME_POLICY_SELECTOR;}return env;
}
export function validateRuntimePolicyOperator({selector,execPath,version,argv,execArgv,cwd,env}){
 const plan=runtimePolicyOperatorPlan(selector);if(selector==='runtime-policy-control')fail('R2 control launcher and test child use distinct attribution');if(execPath!==plan.node || version!=='v22.23.3' || cwd!==ROOT || JSON.stringify(argv)!==JSON.stringify(plan.args) || execArgv.length)fail('R2 fixed operator profile');
 for(const key of ['NODE_OPTIONS','NODE_PATH','NODE_EXTRA_CA_CERTS','NODE_TLS_REJECT_UNAUTHORIZED','PINKY_RECOVERY_RUNTIME','PINKY_STORAGE_RUNTIME','JAVA_TOOL_OPTIONS','JDK_JAVA_OPTIONS','_JAVA_OPTIONS'])if(env[key]!==undefined)fail('R2 inherited operator settings');validateRuntime(env);return true;
}
export function validateRuntimePolicyControlOwnership(admission,operator,parent,root){
 if(!admission || admission.selector!=='runtime-policy-control' || admission.phase!=='02b' || admission.controlRoot!==root || !operator || operator.selector!==admission.selector || operator.controlRoot!==root || operator.pid!==parent.pid || operator.ppid!==admission.pid || parent.ppid!==admission.pid || parent.pgid!==parent.pid || operator.exit || operator.close || !operator.generation || operator.generation.pid!==parent.pid || operator.generation.ppid!==parent.ppid || operator.generation.pgid!==parent.pgid || operator.generation.start!==parent.start || !Number.isSafeInteger(admission.pid) || JSON.stringify(operator.argv)!==JSON.stringify([runtimePolicyOperatorPlan('runtime-policy-control').node,...runtimePolicyOperatorPlan('runtime-policy-control').args]))fail('R2 control admission/launcher/root generation binding');return true;
}
export function validateRuntimePolicyControlChild({execPath,version,argv,execArgv,cwd,env,parent,rawArgv}){
 const plan=runtimePolicyOperatorPlan('runtime-policy-control'),testFile=path.join(ROOT,'tests/runtime-recovery.test.mjs'),flags=['--test-concurrency=1','--test-name-pattern=^R2 native:'];
 if(execPath!==plan.node || version!=='v22.23.3' || cwd!==ROOT || JSON.stringify(argv)!==JSON.stringify([testFile]) || JSON.stringify(execArgv)!==JSON.stringify(flags) || env.NODE_TEST_CONTEXT!=='child-v8' || !parent || parent.pid!==process.ppid || !Number.isFinite(Date.parse(parent.start)) || parent.argv!==[plan.node,...plan.args].join(' ') || JSON.stringify(rawArgv)!==JSON.stringify([plan.node,...flags,testFile]))fail('R2 actual test-child/launcher attribution');
 validateRuntime(env);for(const key of ['NODE_OPTIONS','NODE_PATH','NODE_EXTRA_CA_CERTS','NODE_TLS_REJECT_UNAUTHORIZED','JAVA_TOOL_OPTIONS','JDK_JAVA_OPTIONS','_JAVA_OPTIONS','PINKY_RECOVERY_RUNTIME','PINKY_STORAGE_RUNTIME'])if(env[key]!==undefined)fail('R2 control inherited settings');return true;
}
export function runtimePolicyAtomicAdmission(selector,writer){
 if(!Object.hasOwn(RUNTIME_POLICY_PHASES,selector) || typeof writer!=='function')fail('R2 atomic admission contract');
 try{return writer({selector,phase:RUNTIME_POLICY_PHASES[selector],pid:process.pid,atUtc:new Date().toISOString()});}catch(error){if(error.code==='EEXIST')fail('R2 prior/unknown writer admission; no retry');throw error;}
}
export function validateRuntimePolicyCallerEnvironment(input){
 if(!input || typeof input!=='object')fail('R2 original caller environment');
 for(const key of ['NODE_OPTIONS','NODE_PATH','NODE_EXTRA_CA_CERTS','NODE_TLS_REJECT_UNAUTHORIZED','PINKY_RECOVERY_RUNTIME','PINKY_RECOVERY_AUTH_DEST','PINKY_STORAGE_RUNTIME','PINKY_RUNTIME_POLICY_SELECTOR','PINKY_RUNTIME_POLICY_CONTROL','JAVA_TOOL_OPTIONS','JDK_JAVA_OPTIONS','_JAVA_OPTIONS'])if(input[key]!==undefined)fail('R2 original caller loader/runtime setting');
 for(const key of Object.keys(input))if(/_EMULATOR_(?:BINARY_PATH|VERSION)$/.test(key))fail('R2 original caller binary override');
 // Missing values get only fixed demo defaults; all supplied caller values are
 // preserved for refusal, never stripped before credential/proxy checks.
 const fixed={GCLOUD_PROJECT:PROJECT,GOOGLE_CLOUD_PROJECT:PROJECT,FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080',FIREBASE_STORAGE_EMULATOR_HOST:'127.0.0.1:9199',PINKY_FUNCTIONS_EMULATOR_HOST:'127.0.0.1:5001',PINKY_HOSTING_EMULATOR_HOST:'127.0.0.1:5010',PINKY_STORAGE_BUCKET:STORAGE_BUCKET};
 validateRuntime({...fixed,...input});return true;
}
export function createRuntimePolicyOperator(selector,input=process.env){
 const operatorBegan=Date.now();validateRuntimePolicyCallerEnvironment(input);assertRecoveryMetadata();assertRuntimePolicyAdmission(selector);process.umask(0o077);const plan=runtimePolicyOperatorPlan(selector),env=childEnvironment(input);const controlRoot=selector==='runtime-policy-control'?assertOwnedOutput(`.local/cache/m3/runtime-recovery/runs/${recoveryToken()}`):null;delete env.NODE_OPTIONS;delete env.PINKY_NETWORK_FENCE;
 const parent=assertOwnedOutput('.local/cache/m3/runtime-policy-correction/admissions');mkdirSync(parent,{recursive:true,mode:0o700});const parentStat=lstatSync(parent);if(!parentStat.isDirectory() || parentStat.uid!==process.getuid() || (parentStat.mode&0o777)!==0o700)fail('R2 private admission directory drift');
 runtimePolicyAtomicAdmission(selector,value=>writeFileSync(path.join(parent,`${RUNTIME_POLICY_PHASES[selector]}.json`),JSON.stringify({...value,controlRoot})+'\n',{flag:'wx',mode:0o600}));
 if(selector==='runtime-policy-control'){if(existsSync(controlRoot))fail('R2 control root exists');mkdirSync(controlRoot,{recursive:true,mode:0o700});for(const name of ['cwd','tmp','profiles'])mkdirSync(path.join(controlRoot,name),{mode:0o700});Object.assign(env,{PINKY_RUNTIME_POLICY_CONTROL:controlRoot,TMPDIR:path.join(controlRoot,'tmp'),TMP:path.join(controlRoot,'tmp'),TEMP:path.join(controlRoot,'tmp')});}
 const child=spawn(plan.node,plan.args,{cwd:ROOT,env,detached:true,stdio:['ignore','pipe','pipe']});const receipt={selector,controlRoot,pid:child.pid,ppid:process.pid,argv:[plan.node,...plan.args],exit:null,close:null,signalForwarding:false};
 const save=()=>writeFileSync(path.join(parent,`${RUNTIME_POLICY_PHASES[selector]}-operator.json`),JSON.stringify(receipt,null,2)+'\n',{mode:0o600});save();
 const counts={stdout:0,stderr:0},capture={stdout:[],stderr:[]};let finished=false;
 const abandon=reason=>{if(receipt.observationReason)return;receipt.observationReason=reason;receipt.completion='UNKNOWN_NO_SIGNAL';try{receipt.processSnapshot=storageProcessRows().filter(row=>row.pid===child.pid || row.pgid===child.pid);}catch{receipt.processSnapshot='UNKNOWN_OBSERVER_UNAVAILABLE';}save();for(const stream of ['stdout','stderr'])child[stream].destroy();child.unref();process.exitCode=1;};
 const timer=setTimeout(()=>abandon('R2_ACTOR_DEADLINE_UNKNOWN'),Math.max(1,120000-(Date.now()-operatorBegan)));timer.unref();
 for(const stream of ['stdout','stderr'])child[stream].on('data',chunk=>{counts[stream]+=chunk.length;if(counts[stream]>262144){abandon('R2_ACTOR_LOG_CAP');return;}capture[stream].push(chunk);writeFileSync(path.join(parent,`${RUNTIME_POLICY_PHASES[selector]}-${stream}.log`),Buffer.concat(capture[stream]),{mode:0o600});});
 child.on('exit',(code,signal)=>{receipt.exit={code,signal};save();});child.on('close',(code,signal)=>{finished=true;clearTimeout(timer);receipt.close={code,signal};receipt.streamBytes=counts;receipt.capturedBytes=Object.fromEntries(Object.entries(capture).map(([name,chunks])=>[name,chunks.reduce((n,b)=>n+b.length,0)]));receipt.closedAtUtc=new Date().toISOString();save();process.exitCode=receipt.observationReason?1:code??1;});child.on('error',()=>{receipt.error='SPAWN_UNKNOWN';save();process.exitCode=1;});setTimeout(()=>{if(finished)return;try{const rows=storageProcessRows(),row=rows.find(value=>value.pid===child.pid);if(!row || row.ppid!==process.pid || row.pgid!==child.pid)fail('R2 actor generation unknown');const args=spawnSync('/bin/ps',['-p',String(child.pid),'-o','args='],{encoding:'utf8',timeout:1500,maxBuffer:65536});if(args.status!==0 || args.stdout.trim()!==[plan.node,...plan.args].join(' '))fail('R2 actor raw argv unknown');receipt.generation=row;save();}catch{abandon('R2_ACTOR_OWNERSHIP_UNKNOWN');}},50);return {child,receipt};
}
// Fixed historical authorities; member hashes never authorize their own index.
const policyHistoryIndexes=Object.freeze({
 first:{relative:`${retainedHoldRoot}/evidence-index.json`,bytes:11565,sha256:RETAINED_RECOVERY.holdIndexSha256},
 code:{relative:`${retainedSourceRoot}/final-7d338038-a08f-43fa-9bbd-d52b42860f7d/evidence-index.json`,bytes:32793,sha256:'25404d1a57cde04985ea42fa92df5b6d20ee5adeaf44dd057656be91c60f061f'},
 continuation:{relative:'.local/cache/m3/runtime-recovery/01Rb-continuation-47d63faa-2ba9-4f03-867b-572f8f680817/evidence-index.json',bytes:16123,sha256:'22de81e8bd9623f453c885d3272a86670d01ae0d109a0057c4953bb0aaa6eb43'}
});
export const RUNTIME_POLICY_HISTORY=Object.freeze(Object.fromEntries(Object.entries({
 'original-owner':{index:'first',relative:`${retainedHoldRoot}/private-runtime-snapshot/runtime-owner.json`},
 'original-phase':{index:'first',relative:`${retainedHoldRoot}/private-runtime-snapshot/recovery-observation.json`},
 'original-close':{index:'code',relative:`${retainedSourceRoot}/old-operator-close.json`},
 'continuation-close':{index:'continuation',relative:'.local/cache/m3/runtime-recovery/01Rb-continuation-47d63faa-2ba9-4f03-867b-572f8f680817/operator-snapshot/sOMDmEtDRMeZOK9zu4ldkg.json'},
 'continuation-phase':{index:'continuation',relative:'.local/cache/m3/runtime-recovery/01Rb-continuation-47d63faa-2ba9-4f03-867b-572f8f680817/private-runtime-snapshot/phase-000006.json'}
}).map(([key,value])=>[key,Object.freeze(value)])));
export function validateRuntimePolicyHistorical(key,indexBytes,indexMetadata,memberBytes,memberMetadata,uid=process.getuid()){
 if(!Object.hasOwn(RUNTIME_POLICY_HISTORY,key))fail('R2 fixed historical member');const member=RUNTIME_POLICY_HISTORY[key];const authority=policyHistoryIndexes[member.index];
 const privateRegular=(metadata,absolute,cap)=>metadata && metadata.path===absolute && metadata.type==='regular' && metadata.mode===0o600 && metadata.links===1 && metadata.uid===uid && Number.isSafeInteger(metadata.bytes) && metadata.bytes>=0 && metadata.bytes<=cap;
 if(!Buffer.isBuffer(indexBytes) || !privateRegular(indexMetadata,path.join(ROOT,authority.relative),1024*1024) || indexBytes.length!==authority.bytes || indexMetadata.bytes!==authority.bytes || sha(indexBytes)!==authority.sha256)fail('R2 fixed historical index identity');
 let index;try{index=JSON.parse(indexBytes);}catch{fail('R2 historical index JSON');}
 if(!Array.isArray(index.files))fail('R2 historical index schema');const absolute=path.join(ROOT,member.relative),matches=index.files.filter(record=>record.path===absolute);
 if(matches.length!==1)fail('R2 historical typed member missing/duplicate');const record=matches[0];
 if(record.type!=='regular' || record.mode!=='0o600' || record.links!==1 || !Buffer.isBuffer(memberBytes) || !privateRegular(memberMetadata,absolute,4*1024*1024) || memberMetadata.bytes!==record.bytes || memberBytes.length!==record.bytes || sha(memberBytes)!==record.sha256)fail('R2 historical member type/mode/link/bytes/hash');
 try{return JSON.parse(memberBytes);}catch{fail('R2 historical member JSON');}
}
function readRuntimePolicyHistoricalBytes(relative,cap){
 const target=assertOwnedOutput(relative),before=lstatSync(target);
 if(!before.isFile() || before.isSymbolicLink() || before.uid!==process.getuid() || before.nlink!==1 || (before.mode&0o777)!==0o600 || before.size>cap)fail('R2 historical private type/mode/link');
 const fd=fs.openSync(target,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK);try{
  const opened=fs.fstatSync(fd);if(opened.dev!==before.dev || opened.ino!==before.ino || opened.size!==before.size || opened.uid!==before.uid || opened.nlink!==1 || !opened.isFile() || (opened.mode&0o777)!==0o600)fail('R2 historical open identity');
  let bytes=0;const chunks=[];for(;;){const buffer=Buffer.alloc(Math.min(65536,cap+1-bytes)),count=fs.readSync(fd,buffer,0,buffer.length,null);if(!count)break;bytes+=count;if(bytes>cap)fail('R2 historical bounded read');chunks.push(buffer.subarray(0,count));}
  const after=fs.fstatSync(fd);if(after.size!==opened.size || after.ino!==opened.ino || after.dev!==opened.dev || after.mtimeMs!==opened.mtimeMs || after.nlink!==1 || after.uid!==opened.uid || (after.mode&0o777)!==0o600)fail('R2 historical read drift');
  return {bytes:Buffer.concat(chunks),metadata:{path:target,type:'regular',mode:0o600,links:1,uid:opened.uid,bytes:opened.size}};
 }finally{fs.closeSync(fd);}
}
export function readRuntimePolicyHistorical(key){
 if(!Object.hasOwn(RUNTIME_POLICY_HISTORY,key))fail('R2 fixed historical key');const member=RUNTIME_POLICY_HISTORY[key];const authority=policyHistoryIndexes[member.index];
 const index=readRuntimePolicyHistoricalBytes(authority.relative,1024*1024);
 // Validate the authority before opening a member, including hostile index+member drift.
 if(index.bytes.length!==authority.bytes || sha(index.bytes)!==authority.sha256)fail('R2 fixed historical index identity');
 const value=readRuntimePolicyHistoricalBytes(member.relative,4*1024*1024);return validateRuntimePolicyHistorical(key,index.bytes,index.metadata,value.bytes,value.metadata);
}

export function observeRuntimePolicyRetained(){
 assertRuntimePolicyAdmission('runtime-policy-preserve');assertRetainedPrivateDirectories();assertExternalFirestoreIdentity();
 const originalOwner=readRuntimePolicyHistorical('original-owner');
 const operatorExit=readRuntimePolicyHistorical('original-close');
 const evidence={originalOwner,operatorExit};return observeRetainedRuntime(evidence);
}
export function runtimePolicyNativeSnapshot(){
 const rows=storageProcessRows();const listener=spawnSync('/usr/sbin/lsof',['-nP','-iTCP','-sTCP:LISTEN','-Fpn'],{encoding:'utf8',timeout:1500,maxBuffer:1048576});
 if(listener.status!==0)fail('R2 listener observation unknown');let pid=null;const listeners=[];
 for(const line of listener.stdout.split('\n')){if(line.startsWith('p'))pid=Number(line.slice(1));else if(line.startsWith('n')){const match=line.slice(1).match(/^(127\.0\.0\.1):(\d+)$/);if(match && Object.values(RECOVERY_COMPONENTS).includes(Number(match[2])))listeners.push({pid,host:match[1],port:Number(match[2])});else if(Object.values(RECOVERY_COMPONENTS).some(port=>line.endsWith(`:${port}`)))fail('R2 foreign/unknown listener');}}
 return {rows,listeners,observerTimeZone:'Asia/Ho_Chi_Minh'};
}
export function validateRuntimePolicyQuiescence({rows,operators,pending,storage}){
 if(!Array.isArray(rows) || rows.length!==2 || !Array.isArray(operators) || operators.length!==2 || !pending || pending.create!==false || pending.export!==false || pending.hubWriter!==false || pending.coverage!=='SOURCE_BOUND_WORKFLOW_ONLY')fail('R2 active/unknown writer');
 const leader=rows.find(row=>row.pid===15465),jvm=rows.find(row=>row.pid===15525);
 if(!leader || leader.ppid!==1 || leader.pgid!==15465 || leader.start!==RETAINED_RECOVERY.start || !jvm || jvm.ppid!==15465 || jvm.pgid!==15465 || jvm.start!==RETAINED_RECOVERY.jvmStart || rows.some(row=>!['cli','rules-jvm'].includes(row.kind)))fail('R2 exact quiet retained group');
 for(const pid of [15456,23741]){const actor=operators.find(value=>value.pid===pid);if(!actor || actor.exit?.code!==1 || actor.close?.code!==1 || actor.exit.signal!==null || actor.close.signal!==null || actor.authCreate!==false || actor.exportStarted!==false)fail('R2 recorded writer terminal proof');}
 if(!storage || storage.entries!==0 || storage.knownActiveUpload!==false || storage.pendingStagingWriter!==false || storage.coverage!=='SOURCE_BOUND_RETAINED_DISK_AND_KNOWN_OWNED_REQUESTS')fail('R2 Storage pending/coverage unknown');return true;
}
export function validateRuntimePolicySignal({target,phase,admitted,attempts,preflight}){
 if(target!==15465 || phase!=='02d' || admitted!==true || attempts!==0 || preflight?.status!=='PASS_PRESERVATION_ONLY' || preflight.pid!==15465 || preflight.pgid!==15465 || preflight.start!==RETAINED_RECOVERY.start || preflight.zeroUsers!==true || preflight.zeroTenants!==true || preflight.zeroStorage!==true || preflight.knownQuiet!==true)fail('R2 one signal precondition');return {pid:15465,signal:'SIGINT',maxCount:1};
}
export function validateRuntimePolicyAbsence({rows,listeners,externalUnchanged}){
 if(!Array.isArray(rows) || !Array.isArray(listeners) || rows.some(row=>row.pgid===15465 || [15465,15525].includes(row.pid)) || listeners.some(value=>Object.values(RECOVERY_COMPONENTS).includes(value.port)) || externalUnchanged!==true)fail('R2 absence incomplete; no escalation/restart');return true;
}

if(process.env.PINKY_NETWORK_FENCE==='1') {
  if(process.env.PINKY_M3_LOCAL_APPLICATION!==undefined)validateMediaApplicationRuntime();
  if(process.env.PINKY_RECOVERY_RUNTIME!==undefined)installRecoveryProcessAdapters();
  validateRuntime();installNetworkFence();if(process.env.PINKY_STORAGE_RUNTIME!==undefined)installStorageRuntimeAdapter();
  if(process.env.PINKY_M3_LOCAL_APPLICATION===undefined && (process.env.PINKY_RECOVERY_RUNTIME===undefined || ['cli','export'].includes(recoveryProcessProfile))){disableCliCredentialDiscovery();installCliConfigAdapter();}
}
if(process.env.PINKY_M2_RECOVERY_RUNTIME!==undefined)installM2Profile({installNetworkFence,disableCliCredentialDiscovery,installLocalHttpParser,mapRecoveryConnectArguments});
export async function localGuardMain() {
  const mode=process.argv[2];
  try {
    if(process.version!=='v22.23.3')fail('select pinned Node22.23.3');
    if(realpathSync(process.cwd())!==ROOT || realpathSync(ROOT)!==ROOT)fail('select exact local workspace');
    const plan=commandPlan(mode,process.argv.slice(3));
    if(mode==='runtime-recovery-live'){assertRecoveryRelease();assertRecoveryPinnedSources();}
    if(!['runtime-recovery-unit','runtime-recovery-live'].includes(mode))await assertLocalLaunchAuthorized(mode);
    if(['emulators','storage-only'].includes(mode))await assertEmulatorPortsAvailable(mode);
    if(['multilingual-import','export-multilingual-site','activate-multilingual-site','multilingual-p1','multilingual-p1-v2','multilingual-p3-project','multilingual-p3'].includes(mode)){
      const env=childEnvironment();validateRuntime({...env,...process.env});validateRuntime(env);launch(plan.node,plan.args,env);
    }else if(['media-worker','export-media'].includes(mode)){
      const env=mediaApplicationEnvironment(mode);
      // No prepare/reset/configstore rewrite and no adoption of retained processes.
      // Only this newly spawned canonical application receives manual signals.
      launch(plan.node,plan.args,env);
    }else if(Object.hasOwn(RUNTIME_POLICY_PHASES,mode)){
      createRuntimePolicyOperator(mode);
    }else if(['runtime-recovery-unit','runtime-recovery-live'].includes(mode)){
      await dispatchRecoveryOperator(mode);
    }else if(mode==='storage-only'){
      const controller=await launchStorageOnly();
      console.log(`LOCAL_GUARD: detached Storage CLI ${controller.child.pid}; private root ${controller.runtime.runRoot}`);
      controller.child.on('close',code=>{process.exitCode=code??1;});
    } else {
      prepare();const env=childEnvironment();validateRuntime(env);launch(plan.node,plan.args,env);
    }
  } catch(error) {console.error(error.message);process.exitCode=1;}
}

if(process.argv[1] && path.resolve(process.argv[1])===ownPath) {void localGuardMain();}
