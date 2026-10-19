import {PDF_LOCAL_MANIFEST as PDF_LOCAL5_MANIFEST,PDF_LOCAL_PROGRAM as PDF_LOCAL5_PROGRAM} from '../contracts/media-pdf-local-profile-v5.mjs';
import {PDF_LOCAL_MANIFEST as PDF_LOCAL4_MANIFEST,PDF_LOCAL_PROGRAM as PDF_LOCAL4_PROGRAM} from '../contracts/media-pdf-local-profile-v4.mjs';
import {PDF_LOCAL_MANIFEST as PDF_LOCAL3_MANIFEST,PDF_LOCAL_PROGRAM as PDF_LOCAL3_PROGRAM} from '../contracts/media-pdf-local-profile-v3.mjs';
import {PDF_LOCAL_MANIFEST as PDF_LOCAL2_MANIFEST,PDF_LOCAL_PROGRAM as PDF_LOCAL2_PROGRAM} from '../contracts/media-pdf-local-profile-v2.mjs';
import {PDF_LOCAL_MANIFEST,PDF_LOCAL_PROGRAM} from '../contracts/media-pdf-local-profile.mjs';
import {createHash} from 'node:crypto';
import {ApiError} from '../contracts/errors.mjs';
import {resourceIdSchema} from '../contracts/hero.mjs';
import {DECLARED_MIME,MEDIA_UPLOAD_CAPS,mediaAssetIdSchema} from '../contracts/media-upload.mjs';
import {canonicalMediaV2Json} from '../contracts/media-v3-contract-v2.mjs';
import * as toolset from '../contracts/media-v3-toolset-v2.mjs';

export const hashMediaProcessingValue=value=>createHash('sha256').update(canonicalMediaV2Json(value),'utf8').digest('hex');
export const hashMediaProcessingBytes=bytes=>createHash('sha256').update(bytes).digest('hex');
const requireValue=(condition,code='INTERNAL_ERROR')=>{if(!condition)throw new ApiError(code);};
const registeredProfiles=new Map();
function freezeProfile(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freezeProfile(child);Object.freeze(value);}return value;}

/** No decoder, ffprobe or processor execution belongs in upload COMPLETE. */
export function loadMediaProcessingProfile(kind,binding){
 requireValue(Object.hasOwn(MEDIA_UPLOAD_CAPS,kind),'VALIDATION_ERROR');
 const cacheKey=JSON.stringify([kind,binding?.processingRecipeSha256??null,binding?.toolSetSha256??null]);
 if(registeredProfiles.has(cacheKey))return registeredProfiles.get(cacheKey);
 requireValue(typeof toolset.expectedStaticR0ToolSet==='function'&&typeof toolset.expectedProcessingProgram==='function'&&typeof toolset.validateProcessingProgram==='function'&&typeof toolset.validateProcessingExecution==='function','LOCAL_RUNTIME_UNAVAILABLE');
 const profiles=[{profileId:'M3-PDF-LOCAL-5',toolSetManifest:PDF_LOCAL5_MANIFEST,program:PDF_LOCAL5_PROGRAM},{profileId:'M3-PDF-LOCAL-4',toolSetManifest:PDF_LOCAL4_MANIFEST,program:PDF_LOCAL4_PROGRAM},{profileId:'M3-PDF-LOCAL-3',toolSetManifest:PDF_LOCAL3_MANIFEST,program:PDF_LOCAL3_PROGRAM},{profileId:'M3-PDF-LOCAL-2',toolSetManifest:PDF_LOCAL2_MANIFEST,program:PDF_LOCAL2_PROGRAM},{profileId:'M3-PDF-LOCAL-1',toolSetManifest:PDF_LOCAL_MANIFEST,program:PDF_LOCAL_PROGRAM}];
 const local=kind==='PDF'?(binding?profiles.find(p=>binding.processingRecipeSha256===hashMediaProcessingValue(p.program)&&binding.toolSetSha256===hashMediaProcessingValue(p.toolSetManifest)):profiles[0]):null;
 const toolSetManifest=local?structuredClone(local.toolSetManifest):toolset.expectedStaticR0ToolSet(kind),program=local?structuredClone(local.program):toolset.expectedProcessingProgram(kind);
 const profileId=local?local.profileId:`M3-${kind}-R0-1`;
 toolset.validateToolSetManifest(toolSetManifest,{profileId,hashCanonical:hashMediaProcessingValue});
 toolset.validateProcessingProgram(program,{profileId,hashCanonical:hashMediaProcessingValue});
 requireValue(toolSetManifest.kind===kind&&program.kind===kind);
 const toolSetSha256=hashMediaProcessingValue(toolSetManifest),processingRecipeSha256=hashMediaProcessingValue(program);
 requireValue(program.toolSetSha256===toolSetSha256);
 const profile=freezeProfile({kind,profileId,toolSetManifest,program,toolSetSha256,processingRecipeSha256});
 // The registry is bounded by profiles compiled into this application. Unknown
 // caller pins never create a new cache entry or mark mutable media as trusted.
 if(!binding||binding.toolSetSha256===toolSetSha256&&binding.processingRecipeSha256===processingRecipeSha256)registeredProfiles.set(cacheKey,profile);
 return profile;
}

export function resolveMediaProcessingBindings(value){
 requireValue(value!==null&&typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype,'VALIDATION_ERROR');
 const keys=['kind','originalBytes','declaredMime','assetId','intentId'],descriptors=Object.getOwnPropertyDescriptors(value);
 requireValue(Reflect.ownKeys(value).length===keys.length&&keys.every(key=>descriptors[key]?.enumerable&&Object.hasOwn(descriptors[key],'value')),'VALIDATION_ERROR');
 const {kind,originalBytes,declaredMime,assetId,intentId}=value;
 requireValue(typeof kind==='string'&&Object.hasOwn(MEDIA_UPLOAD_CAPS,kind)&&Buffer.isBuffer(originalBytes)&&originalBytes.length>0&&originalBytes.length<=MEDIA_UPLOAD_CAPS[kind].inputBytes&&typeof declaredMime==='string'&&DECLARED_MIME[kind].includes(declaredMime),'VALIDATION_ERROR');
 mediaAssetIdSchema.parse(assetId);resourceIdSchema.parse(intentId);
 const profile=loadMediaProcessingProfile(kind);
 return {processingRecipeSha256:profile.processingRecipeSha256,toolSetSha256:profile.toolSetSha256};
}

/** Actual raw processor recipes are execution evidence, never the PROGRAM binding hash. */
export function validateMediaProcessingExecution(profile,result){
 let originalMetadata;
 if(profile.kind==='IMAGE')originalMetadata={width:result.source.width,height:result.source.height};
 else if(profile.kind==='PDF')originalMetadata={pageCount:result.pageCount};
 else originalMetadata={...result.original.metadata};
 const executionRecipe=result.recipe;
 toolset.validateProcessingExecution(profile.program,executionRecipe,originalMetadata,hashMediaProcessingValue);
 return {processingProgram:profile.program,toolSetManifest:profile.toolSetManifest,originalMetadata,executionRecipe,executionRecipeSha256:hashMediaProcessingValue(executionRecipe)};
}
