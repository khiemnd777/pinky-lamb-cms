import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {installNetworkFence as installExistingNetworkFence,validateRuntime} from './local-guard.mjs';

export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const DATA_ROOT=path.join(ROOT,'.cms-data-local');
const NODE=path.join(ROOT,'.local/cache/node/node-v22.23.3-darwin-arm64/bin/node');
const forbidden=['GOOGLE_APPLICATION_CREDENTIALS','GOOGLE_CLOUD_PROJECT','GCLOUD_PROJECT','FIREBASE_TOKEN','FIREBASE_WEBAPP_CONFIG','FIREBASE_AUTH_EMULATOR_HOST','FIRESTORE_EMULATOR_HOST','FIREBASE_STORAGE_EMULATOR_HOST','FIREBASE_CONFIG','PINKY_STORAGE_BUCKET','PINKY_NETWORK_FENCE','HTTP_PROXY','http_proxy','HTTPS_PROXY','https_proxy','ALL_PROXY','all_proxy','NODE_OPTIONS','NODE_PATH','NODE_EXTRA_CA_CERTS','NODE_TLS_REJECT_UNAUTHORIZED'];

export function validateLocalDataRuntime(env=process.env){
 if(env.PINKY_LOCAL_DATA_MODE!=='durable'||process.version!=='v22.23.3'||fs.realpathSync(process.execPath)!==NODE||fs.realpathSync(process.cwd())!==ROOT||process.execArgv.length!==0)throw Error('Invalid durable local runtime');
 for(const key of forbidden)if(env[key]!==undefined)throw Error(`Forbidden local runtime variable: ${key}`);
 if(env.PINKY_LOCAL_DATA_ROOT!==DATA_ROOT)throw Error('Wrong local data root');
 if(!fs.existsSync(DATA_ROOT)||fs.realpathSync(DATA_ROOT)!==DATA_ROOT||!fs.lstatSync(DATA_ROOT).isDirectory()||fs.lstatSync(DATA_ROOT).uid!==process.getuid()||(fs.lstatSync(DATA_ROOT).mode&0o077)!==0)throw Error('Local data root unavailable');
 return true;
}

let fenced=false;
export function installLocalDataNetworkFence(){if(!fenced){installExistingNetworkFence();fenced=true;}}
export function validateCmsServerRuntime(){return process.env.PINKY_LOCAL_DATA_MODE==='durable'?validateLocalDataRuntime():validateRuntime(process.env,undefined,{server:true});}
export function installCmsNetworkFence(){return process.env.PINKY_LOCAL_DATA_MODE==='durable'?installLocalDataNetworkFence():installExistingNetworkFence();}
