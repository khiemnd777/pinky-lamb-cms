import {existsSync,readFileSync,renameSync,unlinkSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {ownedFile,writeJsonExclusive} from './multilingual-release-files.mjs';
import {verifyReleaseFiles,readReleaseManifest} from './multilingual-site-artifact.mjs';
export const WEBSITE_POINTER='.local/p7-v3/website-current.json';
export const MAX_RETAINED_WEBSITE_RELEASES=128;
export function retainedWebsiteArtifacts(pointer){
 const retained=pointer.retainedArtifacts??[];
 if(!Array.isArray(retained)||retained.length>MAX_RETAINED_WEBSITE_RELEASES)throw Error('Invalid website release history');
 const seen=new Set();
 for(const artifact of retained){
  if(!artifact||Object.keys(artifact).sort().join(',')!=='manifestSha256,relativeRoot'||typeof artifact.relativeRoot!=='string'||!/^\.local\/releases\/multilingual-001\/[A-Za-z0-9_-]+\/public$/.test(artifact.relativeRoot)||typeof artifact.manifestSha256!=='string'||!/^[a-f0-9]{64}$/.test(artifact.manifestSha256)||seen.has(artifact.manifestSha256))throw Error('Invalid retained website artifact');
  seen.add(artifact.manifestSha256);
 }
 return retained;
}
/** Rollback must carry the private frozen bundle with its public artifact. */
export function previousWebsitePointer(current,manifest,updatedAt){const retainedArtifacts=[...(current.retainedArtifacts??[]),current.artifact].filter((artifact,index,all)=>all.findIndex(item=>item.manifestSha256===artifact.manifestSha256)===index);if(retainedArtifacts.length>MAX_RETAINED_WEBSITE_RELEASES)throw Error('Website release history is full');return {...current,artifact:current.previous,previous:current.artifact,retainedArtifacts,releaseSource:current.previousReleaseSource??undefined,previousReleaseSource:current.releaseSource??null,updatedAt,releaseId:manifest.releaseId,snapshotSetHash:manifest.snapshotSetHash};}
export function readWebsitePointer(){if(!existsSync(ownedFile(WEBSITE_POINTER,{missing:true})))return null;const value=JSON.parse(readFileSync(ownedFile(WEBSITE_POINTER),'utf8'));if(value.port!==4189||value.activation!==false)throw Error('Invalid website pointer');retainedWebsiteArtifacts(value);const manifest=readReleaseManifest(value.artifact.relativeRoot,value.artifact.manifestSha256);if(value.snapshotSetHash!==undefined&&value.snapshotSetHash!==manifest.snapshotSetHash)throw Error('Website pointer snapshot identity mismatch');return value;}
export function writeWebsitePointer(value){if(value.port!==4189||value.activation!==false)throw Error('Only :4189 is allowed');verifyReleaseFiles(value.artifact.relativeRoot,value.artifact.manifestSha256);for(const artifact of retainedWebsiteArtifacts(value))readReleaseManifest(artifact.relativeRoot,artifact.manifestSha256);const temporary='.local/p7-v3/pointer-'+randomUUID()+'.json';writeJsonExclusive(temporary,value);try{renameSync(ownedFile(temporary),ownedFile(WEBSITE_POINTER,{missing:true}));}finally{if(existsSync(ownedFile(temporary,{missing:true})))unlinkSync(ownedFile(temporary));}}
