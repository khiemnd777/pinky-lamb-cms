import {existsSync,readFileSync,renameSync,unlinkSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {ownedFile,writeJsonExclusive} from './multilingual-release-files.mjs';
import {verifyReleaseFiles,readReleaseManifest} from './multilingual-site-artifact.mjs';
export const WEBSITE_POINTER='.local/p7-v3/website-current.json';
/** Rollback must carry the private frozen bundle with its public artifact. */
export function previousWebsitePointer(current,manifest,updatedAt){return {...current,artifact:current.previous,previous:current.artifact,releaseSource:current.previousReleaseSource??undefined,previousReleaseSource:current.releaseSource??null,updatedAt,releaseId:manifest.releaseId,snapshotSetHash:manifest.snapshotSetHash};}
export function readWebsitePointer(){if(!existsSync(ownedFile(WEBSITE_POINTER,{missing:true})))return null;const value=JSON.parse(readFileSync(ownedFile(WEBSITE_POINTER),'utf8'));if(value.port!==4189||value.activation!==false)throw Error('Invalid website pointer');const manifest=readReleaseManifest(value.artifact.relativeRoot,value.artifact.manifestSha256);if(value.snapshotSetHash!==undefined&&value.snapshotSetHash!==manifest.snapshotSetHash)throw Error('Website pointer snapshot identity mismatch');return value;}
export function writeWebsitePointer(value){if(value.port!==4189||value.activation!==false)throw Error('Only :4189 is allowed');verifyReleaseFiles(value.artifact.relativeRoot,value.artifact.manifestSha256);const temporary='.local/p7-v3/pointer-'+randomUUID()+'.json';writeJsonExclusive(temporary,value);try{renameSync(ownedFile(temporary),ownedFile(WEBSITE_POINTER,{missing:true}));}finally{if(existsSync(ownedFile(temporary,{missing:true})))unlinkSync(ownedFile(temporary));}}
