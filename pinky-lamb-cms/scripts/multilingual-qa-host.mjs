import {createServer} from 'node:http';
import {createMultilingualSiteHandler,verifyReleaseFiles} from './multilingual-site-artifact.mjs';
import {canonicalJson} from '../contracts/draft.mjs';
import {readWebsitePointer} from './local-website-pointer.mjs';
import {digest} from './multilingual-release-files.mjs';

/** This owner can switch only its own :4189 listener. No emulator discovery, stop, or :5010 action exists here. */
export async function startMultilingualQaHost(initial,{followWebsitePointer=false}={}){
 let current,handler,history=[];const prepare=(artifact,retainedArtifacts=[])=>{
  if(!artifact||Object.keys(artifact).sort().join(',')!=='manifestSha256,relativeRoot')throw Error('Exact QA artifact identity required');
  verifyReleaseFiles(artifact.relativeRoot,artifact.manifestSha256);
  return createMultilingualSiteHandler({...artifact,port:4189,retainedArtifacts});
 };
 handler=prepare(initial);current=structuredClone(initial);
 const follow=()=>{if(!followWebsitePointer)return;const pointer=readWebsitePointer(),next=pointer?.artifact,retainedArtifacts=pointer?.retainedArtifacts??[];if(next&&canonicalJson({next,retainedArtifacts})!==canonicalJson({next:current,retainedArtifacts:history})){handler=prepare(next,retainedArtifacts);current=structuredClone(next);history=structuredClone(retainedArtifacts);}};
 follow();
 const server=createServer((request,response)=>{try{follow();handler(request,response);}catch{response.writeHead(503,{'Cache-Control':'no-store'});response.end('Website release unavailable');}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen({host:'127.0.0.1',port:4189,exclusive:true},resolve);});
 const capture=()=>structuredClone(current);
 function switchArtifact(artifact){const next=prepare(artifact);handler=next;current=structuredClone(artifact);return capture();}
 async function readback(artifact,fetchLocal=fetch){
  const manifest=verifyReleaseFiles(artifact.relativeRoot,artifact.manifestSha256);
  for(const entry of manifest.files){const response=await fetchLocal('http://127.0.0.1:4189/'+entry.path,{redirect:'error',signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('QA readback unavailable');const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length!==entry.sizeBytes||digest(bytes)!==entry.sha256)throw Error('QA readback changed');}
  return {files:manifest.files.length,manifestSha256:artifact.manifestSha256};
 }
 return {capture,switchArtifact,readback,async rehearseRestore(candidate){
  const before=capture();await readback(before);let switched=false;
  try{switchArtifact(candidate);switched=true;await readback(candidate);}
  finally{if(switched)switchArtifact(before);}
  if(canonicalJson(capture())!==canonicalJson(before))throw Error('QA restore identity mismatch');
  const restored=await readback(before);return {state:'QA_RESTORE_VERIFIED',...restored,port:4189,activation:false};
 },close:()=>new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()))};
}
