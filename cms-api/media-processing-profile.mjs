import {createHash} from 'node:crypto';
import {ApiError} from '../contracts/errors.mjs';
import {resourceIdSchema} from '../contracts/hero.mjs';
import {DECLARED_MIME,MEDIA_UPLOAD_CAPS,mediaAssetIdSchema} from '../contracts/media-upload.mjs';
import {canonicalMediaV2Json} from '../contracts/media-v3-contract-v2.mjs';
import * as toolset from '../contracts/media-v3-toolset-v2.mjs';

export const hashMediaProcessingValue=value=>createHash('sha256').update(canonicalMediaV2Json(value),'utf8').digest('hex');
export const hashMediaProcessingBytes=bytes=>createHash('sha256').update(bytes).digest('hex');
const requireValue=(condition,code='INTERNAL_ERROR')=>{if(!condition)throw new ApiError(code);};

/** No decoder, ffprobe or processor execution belongs in upload COMPLETE. */
export function loadMediaProcessingProfile(kind){
 requireValue(Object.hasOwn(MEDIA_UPLOAD_CAPS,kind),'VALIDATION_ERROR');
 requireValue(typeof toolset.expectedStaticR0ToolSet==='function'&&typeof toolset.expectedProcessingProgram==='function'&&typeof toolset.validateProcessingProgram==='function'&&typeof toolset.validateProcessingExecution==='function','LOCAL_RUNTIME_UNAVAILABLE');
 const toolSetManifest=toolset.expectedStaticR0ToolSet(kind),program=toolset.expectedProcessingProgram(kind);
 const profileId=`M3-${kind}-R0-1`;
 toolset.validateToolSetManifest(toolSetManifest,{profileId,hashCanonical:hashMediaProcessingValue});
 toolset.validateProcessingProgram(program,{profileId,hashCanonical:hashMediaProcessingValue});
 requireValue(toolSetManifest.kind===kind&&program.kind===kind);
 const toolSetSha256=hashMediaProcessingValue(toolSetManifest),processingRecipeSha256=hashMediaProcessingValue(program);
 requireValue(program.toolSetSha256===toolSetSha256);
 return {kind,profileId,toolSetManifest,program,toolSetSha256,processingRecipeSha256};
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
