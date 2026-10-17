import test from 'node:test';
import assert from 'node:assert/strict';
import {loadMediaProcessingProfile,validateMediaProcessingExecution} from '../cms-api/media-processing-profile.mjs';
test('native image manifest encoder knobs match the immutable full PROGRAM without inventing execution fields',()=>{
 const profile=loadMediaProcessingProfile('IMAGE'),native={source:{width:590,height:144},recipe:{quality:80,alphaQuality:100,effort:4}};
 assert.deepEqual(validateMediaProcessingExecution(profile,native).executionRecipe,native.recipe);
 for(const recipe of [{...native.recipe,quality:79},{...native.recipe,effort:3},{...native.recipe,metadata:'keep'}])assert.throws(()=>validateMediaProcessingExecution(profile,{...native,recipe}));
 assert.throws(()=>validateMediaProcessingExecution(profile,{...native,source:{width:8193,height:144}}));
 assert.equal(profile.program.recipe.decode.limitInputPixels,40000000);
 assert.equal(profile.program.recipe.encode.output.metadata,'RAW_RECONSTRUCT_STRIP_ALL');
});
test('new PDF uploads bind the isolated profile; historical R0 bindings remain readable',async()=>{
 const {expectedProcessingProgram,expectedStaticR0ToolSet,validateToolSetManifest,validateProcessingProgram}=await import('../contracts/media-v3-toolset-v2.mjs');
 const {hashMediaProcessingValue:hash}=await import('../cms-api/media-processing-profile.mjs');
 const local=loadMediaProcessingProfile('PDF');assert.equal(local.profileId,'M3-PDF-LOCAL-5');
 const historical=loadMediaProcessingProfile('PDF',{processingRecipeSha256:hash(expectedProcessingProgram('PDF')),toolSetSha256:hash(expectedStaticR0ToolSet('PDF'))});assert.equal(historical.profileId,'M3-PDF-R0-1');
 assert.deepEqual(validateMediaProcessingExecution(local,{pageCount:1,recipe:local.program.recipe}).executionRecipe,local.program.recipe);
 const options={profileId:local.profileId,hashCanonical:hash};
 assert.throws(()=>validateToolSetManifest({...local.toolSetManifest,runtimeManifest:{...local.toolSetManifest.runtimeManifest,sha256:'0'.repeat(64)}},options));
 assert.throws(()=>validateProcessingProgram({...local.program,recipe:{...local.program.recipe,render:['unsafe']}},options));
 assert.notEqual(local.toolSetSha256,historical.toolSetSha256);assert.deepEqual(local.program.recipe.limits,{...historical.program.recipe.limits,edge:1280,webpBytes:64*1024**2});assert.equal(local.program.recipe.limits.combinedBytes,96*1024**2);assert.equal(local.program.recipe.render[7],'1280');
 for(const [file,id]of [['media-pdf-local-profile.mjs','M3-PDF-LOCAL-1'],['media-pdf-local-profile-v2.mjs','M3-PDF-LOCAL-2'],['media-pdf-local-profile-v3.mjs','M3-PDF-LOCAL-3'],['media-pdf-local-profile-v4.mjs','M3-PDF-LOCAL-4']]){const old=await import('../contracts/'+file);assert.equal(loadMediaProcessingProfile('PDF',{processingRecipeSha256:hash(old.PDF_LOCAL_PROGRAM),toolSetSha256:hash(old.PDF_LOCAL_MANIFEST)}).profileId,id);}
});
test('PDF structural custody accepts 64 MiB of pages only inside the 96 MiB combined cap',async()=>{
 const {readyVersionV2Schema}=await import('../contracts/media-v3-contract-v2.mjs');
 const h='a'.repeat(64),MiB=1024**2,pages=Array.from({length:48},(_,i)=>({key:'page-'+(i+1),role:'PDF_PAGE',mimeType:'image/webp',sizeBytes:MiB,sha256:h,generation:'1',width:1600,height:1000,pageNumber:i+1}));
 const value={contractRevision:2,assetId:'pdf-budget-proof',kind:'PDF',originalSha256:h,originalSizeBytes:17349548,processingRecipeSha256:h,toolSetSha256:h,derivativeSetSha256:h,metadataDigest:h,status:'READY',archived:false,revision:0,uploaderUid:'owner',pageCount:48,derivatives:[...pages,{key:'pdf-download',role:'PDF_DOWNLOAD',mimeType:'application/pdf',sizeBytes:48*MiB,sha256:h,generation:'1'}]};
 assert.equal(readyVersionV2Schema.parse(value).derivatives.length,49);
 assert.throws(()=>readyVersionV2Schema.parse({...value,derivatives:[...pages,{...value.derivatives.at(-1),sizeBytes:48*MiB+1}]}));
 const tooManyPages=pages.map(p=>({...p,sizeBytes:2*MiB}));assert.throws(()=>readyVersionV2Schema.parse({...value,derivatives:[...tooManyPages,{...value.derivatives.at(-1),sizeBytes:1}]}));
});
