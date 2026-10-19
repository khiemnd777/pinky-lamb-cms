import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ROOT} from './local-data-guard.mjs';
import {openLocalDataStore} from '../cms-api/local-data-store.mjs';
import {openLocalAuth} from '../cms-api/local-auth.mjs';

const STAGING=path.join(ROOT,'.local','data-staging');
function syncDirectory(directory){const fd=fs.openSync(directory,'r');try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
export async function initializeStaging(destination){
 if(!path.isAbsolute(destination)||!destination.startsWith(STAGING+path.sep)||fs.existsSync(destination))throw Error('Use a fresh private staging path');
 if(!fs.existsSync(STAGING)||fs.realpathSync(STAGING)!==STAGING||(fs.lstatSync(STAGING).mode&0o077)!==0)throw Error('Private staging parent required');
 const store=openLocalDataStore(destination,{create:true});
 try{await openLocalAuth({root:destination,sqlite:store.sqlite,create:true});}
 finally{store.close();}
 syncDirectory(destination);syncDirectory(STAGING);
 return destination;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==3||process.version!=='v22.23.3'||fs.realpathSync(process.cwd())!==ROOT||process.execArgv.length||process.env.NODE_OPTIONS!==undefined)throw Error('Pinned local staging invocation required');
  console.log(`LOCAL_DATA_INIT: ${await initializeStaging(path.resolve(process.argv[2]))}`);
 }catch(error){console.error(`LOCAL_DATA_INIT: ${error.message}`);process.exitCode=1;}
}
