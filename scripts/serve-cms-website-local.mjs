import {startMultilingualQaHost} from './multilingual-qa-host.mjs';
import {assertMultilingualToolingRuntime,readPrivateJson} from './multilingual-release-files.mjs';
import {readWebsitePointer,writeWebsitePointer} from './local-website-pointer.mjs';
assertMultilingualToolingRuntime();
const receiptPath=process.argv[2];
if(!receiptPath||process.argv.length!==3)throw Error('Use a task-owned initial artifact receipt');
let pointer=readWebsitePointer();
if(!pointer){const receipt=readPrivateJson(receiptPath),artifact={relativeRoot:receipt.root??receipt.relativeRoot,manifestSha256:receipt.manifestSha256};pointer={port:4189,activation:false,artifact,previous:null,releaseId:'PREVIOUS_QA_ARTIFACT',updatedAt:new Date().toISOString()};writeWebsitePointer(pointer);}
const host=await startMultilingualQaHost(pointer.artifact,{followWebsitePointer:true});
console.log(JSON.stringify({port:4189,activation:false,mode:'CMS_RELEASE_POINTER',artifact:host.capture()}));
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>void host.close().then(()=>process.exit(0)));
