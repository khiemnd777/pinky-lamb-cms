import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {canonicalJson} from '../contracts/draft.mjs';
import {fileRefSchema,filePinSchema,r0ToolSetManifestSchema,processingRecipeSchema,validateToolSetManifest,validateProcessingRecipe,toolSetDigestProjection,processingRecipeDigestProjection} from '../contracts/media-v3-toolset.mjs';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/media-v3-toolset.json',import.meta.url),'utf8'));
const clone=value=>structuredClone(value);
const hashCanonical=value=>createHash('sha256').update(canonicalJson(value),'utf8').digest('hex');
const manifest=kind=>fixture.manifests.find(row=>row.value.kind===kind);
const recipe=kind=>fixture.recipes.find(row=>row.kind===kind);
const context=row=>({profileId:`M3-${row.kind}-R0-1`,originalMetadata:clone(row.originalMetadata),hashCanonical});

test('TOOLS frozen Policy2 unique normalized manifests match independent owner identities',()=>{
  for(const row of fixture.manifests){
    const value=validateToolSetManifest(row.value,{profileId:row.value.profileId,hashCanonical});
    assert.deepEqual(value,row.value);assert.equal(hashCanonical(value),row.expectedSha256);
    assert.equal(Buffer.byteLength(canonicalJson(value),'utf8'),row.expectedCanonicalBytes);
    assert.deepEqual(toolSetDigestProjection(value),value);
  }
  assert.deepEqual(fixture.dedupProvenance,{rawPackageRows:1736,normalizedPackageRows:1723,identicalCollapsed:13});
});
test('TOOLS FileRefs have fixed source-owned roots and exact ASCII POSIX path bounds',()=>{
  for(const path of ['a','a'.repeat(1024),'node_modules/@scope/package/file.js'])assert.ok(fileRefSchema.safeParse({rootId:'CMS',path}).success);
  for(const path of ['', 'a'.repeat(1025),'/a','a/','a//b','a/./b','a/../b','a\\b','a:b','a\n','Tiếng Việt'])assert.equal(fileRefSchema.safeParse({rootId:'CMS',path}).success,false,path);
  for(const rootId of ['VIDEO_R0','R1','CALLER_ROOT'])assert.equal(fileRefSchema.safeParse({rootId,path:'a'}).success,false);
  assert.equal(fileRefSchema.safeParse({rootId:'CMS',path:'.local/tools/m3/pdf-tools/poppler-26.10.0-cairo/bin/pdfinfo'}).success,false);
  assert.equal(fileRefSchema.safeParse({rootId:'CMS',path:'a',physicalRoot:'/private'}).success,false);
});
test('TOOLS FilePins admit zero bytes and refuse unsafe/negative/uppercase identities',()=>{
  const pin={rootId:'CMS',path:'a',bytes:0,sha256:'a'.repeat(64)};assert.ok(filePinSchema.safeParse(pin).success);
  for(const patch of [{bytes:-1},{bytes:1.5},{bytes:Number.MAX_SAFE_INTEGER+1},{sha256:'A'.repeat(64)},{sha256:'a'.repeat(63)},{type:'file'}])assert.equal(filePinSchema.safeParse({...pin,...patch}).success,false);
});
test('TOOLS strict normalized sets reject duplicate, unsorted and missing entries before hash',()=>{
  for(const mutate of [v=>v.common.packageFiles.push(clone(v.common.packageFiles[0])),v=>v.common.packageFiles.pop(),v=>v.common.packageFiles.reverse(),v=>v.common.packageRoots.reverse(),v=>v.common.sharp.nativeObjects.reverse()]){
    const value=clone(manifest('IMAGE').value);mutate(value);let calls=0;
    assert.throws(()=>validateToolSetManifest(value,{profileId:value.profileId,hashCanonical(){calls++;return manifest('IMAGE').expectedSha256;}}));assert.equal(calls,0);
  }
});
test('TOOLS repeated subset pins and common package roots must agree structurally',()=>{
  for(const mutate of [v=>v.common.sharp.nativeObjects[0].bytes++,v=>v.common.sharp.nativeObjects[0].sha256='f'.repeat(64),v=>v.common.packageRoots[0].path='node_modules/foreign']){
    const value=clone(manifest('IMAGE').value);mutate(value);assert.equal(r0ToolSetManifestSchema.safeParse(value).success,false);
  }
  const value=clone(manifest('IMAGE').value);value.common.packageFiles[0].sha256='f'.repeat(64);
  assert.throws(()=>validateToolSetManifest(value,{profileId:value.profileId,hashCanonical}));
});
test('TOOLS kind/profile/R0 identity and context are exact without trust flags',()=>{
  for(const patch of [{profileId:'M3-IMAGE-R1-1'},{schemaVersion:2},{kind:'VIDEO'},{rootRegistry:{CMS:'/private'}},{trusted:true}])assert.equal(r0ToolSetManifestSchema.safeParse({...manifest('IMAGE').value,...patch}).success,false);
  for(const options of [{profileId:'M3-PDF-R0-1',hashCanonical},{profileId:'M3-IMAGE-R0-1',hashCanonical,trust:true},{profileId:'M3-IMAGE-R0-1',hashCanonical:undefined}])assert.throws(()=>validateToolSetManifest(manifest('IMAGE').value,options));
});
test('TOOLS PDF binaryOrder is ordered FileRefs, not a sorted/name-string substitute',()=>{
  const value=clone(manifest('PDF').value);
  assert.deepEqual(value.kindTools.binaryOrder,[{rootId:'PDF_R0',path:'bin/pdfinfo'},{rootId:'PDF_R0',path:'bin/pdftocairo'}]);
  value.kindTools.binaryOrder.reverse();assert.equal(r0ToolSetManifestSchema.safeParse(value).success,false);
  value.kindTools.binaryOrder=['pdfinfo','pdftocairo'];assert.equal(r0ToolSetManifestSchema.safeParse(value).success,false);
});
test('TOOLS PDF graph, font and installed mode cross-relations refuse stale subsets',()=>{
  for(const mutate of [v=>v.kindTools.linkage.edges[0].from={rootId:'PDF_R0',path:'foreign'},v=>v.kindTools.linkage.edges.reverse(),v=>v.kindTools.installedFiles[0].bytes++,v=>v.kindTools.fonts[0].rootId='CMS',v=>v.kindTools.modes.pop(),v=>v.kindTools.buildOptions.EXTRA='ON']){
    const value=clone(manifest('PDF').value);mutate(value);assert.equal(r0ToolSetManifestSchema.safeParse(value).success,false);
  }
});
test('TOOLS argv/configuration order and system names preserve frozen VIDEO policy',()=>{
  for(const mutate of [v=>v.kindTools.baseArgs.reverse(),v=>v.kindTools.inputArgs[7]='https',v=>v.kindTools.configuration.network=true,v=>v.kindTools.configuration.protocols.reverse(),v=>v.kindTools.systemBytesPinned=true,v=>v.kindTools.binaries[0].sha256='f'.repeat(64)]){
    const value=clone(manifest('VIDEO').value);mutate(value);assert.equal(r0ToolSetManifestSchema.safeParse(value).success,false);
  }
});
test('TOOLS processing wrappers match frozen IMAGE/PDF and VIDEO A/B/C independent hashes',()=>{
  for(const row of fixture.recipes){
    const value=validateProcessingRecipe(row.wrapper,context(row));assert.deepEqual(value,row.wrapper);
    assert.equal(hashCanonical(value),row.expectedWrapperSha256);assert.deepEqual(processingRecipeDigestProjection(row.wrapper,context(row)),row.wrapper);
  }
  const pdf=recipe('PDF');assert.equal(createHash('sha256').update(JSON.stringify(pdf.wrapper.recipe),'utf8').digest('hex'),fixture.knownRawPdfRecipeSha256);
  assert.notEqual(hashCanonical(pdf.wrapper.recipe),fixture.knownRawPdfRecipeSha256);
});
test('TOOLS recipe body remains distinct from toolset FileRef normalization',()=>{
  const pdf=clone(recipe('PDF').wrapper);assert.deepEqual(Object.keys(pdf.recipe.tools[0]),['path','type','bytes','sha256']);
  pdf.recipe.tools[0]={rootId:'PDF_R0',...pdf.recipe.tools[0]};assert.equal(processingRecipeSchema.safeParse(pdf).success,false);
  const row=recipe('PDF');const wrong=clone(row.wrapper);wrong.recipe.tools.reverse();assert.equal(processingRecipeSchema.safeParse(wrong).success,false);
});
test('TOOLS source/helper/tool/limit/codec/argv mismatch refuses before recipe hash',()=>{
  for(const row of [recipe('IMAGE'),recipe('PDF'),recipe('VIDEO')]){
    for(const mutate of [v=>v.helperSha256='f'.repeat(64),v=>v.toolSetSha256='f'.repeat(64),v=>v.processorSha256='f'.repeat(64)]){
      const value=clone(row.wrapper);mutate(value);assert.throws(()=>validateProcessingRecipe(value,context(row)));
    }
  }
  const row=recipe('VIDEO');const value=clone(row.wrapper);value.recipe.transcode[0]='-y';assert.throws(()=>validateProcessingRecipe(value,context(row)));
});
test('TOOLS VIDEO geometry/audio relation uses original metadata, not fixed golden-A shortcuts',()=>{
  for(const row of fixture.recipes.filter(row=>row.kind==='VIDEO')){
    assert.ok(validateProcessingRecipe(row.wrapper,context(row)));const wrong=context(row);wrong.originalMetadata.audio=!wrong.originalMetadata.audio;
    assert.throws(()=>validateProcessingRecipe(row.wrapper,wrong));
  }
  for(const originalMetadata of [{width:2,height:1080,duration:1,fps:30,audio:false},{width:1,height:1,duration:1,fps:30,audio:false},{width:1921,height:1080,duration:300,fps:60,audio:true}]){
    const row=recipe('VIDEO');assert.throws(()=>validateProcessingRecipe(row.wrapper,{...context(row),originalMetadata}));
  }
});
test('TOOLS descriptor hazards and invalid hash capability do not become authority',()=>{
  let calls=0;const input=clone(manifest('IMAGE').value);Object.defineProperty(input,'common',{enumerable:true,get(){calls++;return {};}});
  assert.throws(()=>toolSetDigestProjection(input));assert.equal(calls,0);
  const nullProto=Object.assign(Object.create(null),manifest('IMAGE').value);assert.throws(()=>toolSetDigestProjection(nullProto));
  const cyclic=clone(manifest('IMAGE').value);cyclic.common.self=cyclic;assert.throws(()=>toolSetDigestProjection(cyclic));
  const row=recipe('VIDEO');for(const hashCanonical of [undefined,()=> 'A'.repeat(64),()=> 'f'.repeat(63)])assert.throws(()=>validateProcessingRecipe(row.wrapper,{...context(row),hashCanonical}));
  const options={profileId:'M3-IMAGE-R0-1'};Object.defineProperty(options,'hashCanonical',{enumerable:true,get(){calls++;return ()=> 'f'.repeat(64);}});
  assert.throws(()=>validateToolSetManifest(manifest('IMAGE').value,options));assert.equal(calls,0);
});
