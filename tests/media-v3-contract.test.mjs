import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {
  V3_DESCRIPTOR,V3_CAPS,V3_BUDGET_PROFILE,imageReferenceSchema,identityReferenceSchema,
  videoPosterReferenceSchema,readyVersionSchema,derivativeSchema,mediaBindingSchema,
  bindingFromReadyVersion,safeMetadataFromReadyVersion,mediaV3ContextSchema,
  v3MediaManifestSchema,canonicalMediaV3Json,safeMediaDiagnosticSchema
} from '../contracts/media-v3-contract.mjs';
const f=JSON.parse(readFileSync(new URL('./fixtures/media-v3-contract.json',import.meta.url),'utf8'));
const copy=value=>structuredClone(value);
// This oracle does not call the contract encoder to construct expected bytes/hashes.
function independentEncode(value){
  if(Array.isArray(value))return '['+value.map(independentEncode).join(',')+']';
  if(value!==null && typeof value==='object')return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+independentEncode(value[key])).join(',')+'}';
  return JSON.stringify(value);
}
const hash=value=>createHash('sha256').update(value).digest('hex');
test('C0 descriptor and immutable count/byte profiles are explicit',()=>{
  assert.deepEqual(V3_DESCRIPTOR,{draftId:'home-v3',schemaVersion:3,templateVersion:'m3-site-media-v1'});
  assert.equal(V3_CAPS.references,64);assert.equal(V3_CAPS.derivatives,256);
  assert.equal(V3_CAPS.rightsProofs,64);assert.equal(V3_CAPS.sourceProofs,61);assert.equal(V3_CAPS.sourceRefs,600);
  assert.equal(V3_CAPS.max_processing_attempts,2);
  assert.equal(V3_BUDGET_PROFILE.storedDraft,262144);assert.equal(V3_BUDGET_PROFILE.storedSnapshot,262144);
  assert.equal(V3_BUDGET_PROFILE.privateJSON,262144);assert.equal(V3_BUDGET_PROFILE.qaEnvelopeVersion3,2097152);assert.equal(V3_BUDGET_PROFILE.qaEnvelopeLegacy,1048576);
  assert.ok(Object.isFrozen(V3_DESCRIPTOR)&&Object.isFrozen(V3_CAPS)&&Object.isFrozen(V3_BUDGET_PROFILE));
});
test('C0 content refs keep existing names and decoration invariants',()=>{
  const ref={assetId:'media-image',alt:'Ảnh thử',isDecorative:false};
  assert.deepEqual(imageReferenceSchema.parse(ref),ref);
  for(const value of [{...ref,source:'MEDIA_VERSION'},{...ref,alt:''},{...ref,isDecorative:true},{...ref,focalPoint:{x:NaN,y:0}},{...ref,assetId:'x'.repeat(101)}])assert.equal(imageReferenceSchema.safeParse(value).success,false);
  assert.ok(imageReferenceSchema.safeParse({...ref,isDecorative:true,alt:''}).success);
  assert.ok(identityReferenceSchema.safeParse({assetId:'media-pdf'}).success);
  assert.ok(videoPosterReferenceSchema.safeParse({...ref,assetId:'media-video',derivativeRole:'POSTER'}).success);
  assert.equal(videoPosterReferenceSchema.safeParse({...ref,derivativeRole:'IMAGE'}).success,false);
});
test('C0 strict ReadyVersion admits synthetic kinds and rejects processor raw receipts',()=>{
  for(const value of [f.image,f.pdf,f.video])assert.deepEqual(readyVersionSchema.parse(value),value);
  for(const patch of [{status:'PROCESSING'},{storagePath:'/private/scratch'},{originalSha256:'A'.repeat(64)},{originalSizeBytes:10*1024**2+1},{revision:Number.MAX_SAFE_INTEGER},{width:8193}])assert.equal(readyVersionSchema.safeParse({...f.image,...patch}).success,false);
  assert.equal(readyVersionSchema.safeParse({original:{sha256:'a'.repeat(64)},outputs:[]}).success,false);
  const archived={...f.image,archived:true};assert.ok(readyVersionSchema.safeParse(archived).success); // Structural schema cannot grant eligibility.
});
test('C0 derivatives reject paths, coercion, role metadata and size overcaps',()=>{
  const d=f.image.derivatives[0];
  for(const patch of [{key:'../safe.webp'},{key:'/safe.webp'},{generation:9007199254740992},{generation:'0'},{generation:'01'},{role:'POSTER',mimeType:'application/pdf'},{width:Infinity},{sizeBytes:12*1024**2+1},{sha256:'wrong'}])assert.equal(derivativeSchema.safeParse({...d,...patch}).success,false);
  assert.equal(derivativeSchema.safeParse({...d,pageNumber:1}).success,false);
  assert.equal(derivativeSchema.safeParse({...d,privatePath:'x'}).success,false);
  assert.equal(derivativeSchema.safeParse({...d,targetWidth:1290}).success,false);
  const missing=copy(d);delete missing.targetWidth;assert.equal(derivativeSchema.safeParse(missing).success,false);
  for(const base of [...f.pdf.derivatives,...f.video.derivatives]){
    assert.equal(derivativeSchema.safeParse({...base,targetWidth:320}).success,false);
    assert.equal(derivativeSchema.safeParse({...base,targetWidth:undefined}).success,false);
  }
});
test('C0 ReadyVersion enforces kind roles, contiguous PDF pages and same video metadata',()=>{
  for(const mutate of [v=>v.derivatives.push(copy(v.derivatives[0])),v=>v.derivatives[0].width=321,v=>v.derivatives[1].height=2000,v=>v.derivatives[0].role='POSTER']){
    const v=copy(f.image);mutate(v);assert.equal(readyVersionSchema.safeParse(v).success,false);
  }
  for(const mutate of [v=>v.pageCount=2,v=>v.derivatives[1].pageNumber=2,v=>v.derivatives.shift(),v=>v.derivatives.push({...v.derivatives[1],key:'page-duplicate'})]){
    const v=copy(f.pdf);mutate(v);assert.equal(readyVersionSchema.safeParse(v).success,false);
  }
  for(const mutate of [v=>v.derivatives.pop(),v=>v.durationSeconds=301,v=>v.derivatives[0].durationSeconds=10,v=>v.derivatives[1].width=1400]){
    const v=copy(f.video);mutate(v);assert.equal(readyVersionSchema.safeParse(v).success,false);
  }
  assert.ok(readyVersionSchema.safeParse(f.tinyImage).success);
  assert.ok(readyVersionSchema.safeParse(f.portraitImage).success);
});
test('C0 revised IMAGE uses oriented originals and exactly three target buckets without digest dedup',()=>{
  for(const value of [f.image,f.tinyImage,f.portraitImage]){
    assert.deepEqual(readyVersionSchema.parse(value),value);
    assert.deepEqual(value.derivatives.map(d=>d.targetWidth),[320,960,1920]);
    assert.deepEqual(value.derivatives.map(d=>d.key),['image-320','image-960','image-1920']);
  }
  assert.deepEqual(f.portraitImage.derivatives.map(d=>[d.width,d.height]),[[320,480],[960,1440],[1920,2880]]);
  assert.equal(new Set(f.tinyImage.derivatives.map(d=>d.width)).size,1);
  assert.equal(new Set(f.tinyImage.derivatives.map(d=>d.sha256)).size,1);
  for(const mutate of [v=>v.derivatives.pop(),v=>v.derivatives[1].targetWidth=320,v=>v.derivatives[1].key='image-1920',v=>v.derivatives[0].width=321,v=>v.derivatives[0].height=481,v=>v.derivatives[0].targetWidth=1290,v=>v.width=8193,v=>{v.width=8192;v.height=8192;}]){
    const value=copy(f.portraitImage);mutate(value);assert.equal(readyVersionSchema.safeParse(value).success,false);
  }
  const tinyUpscale=copy(f.tinyImage);tinyUpscale.derivatives[2].width=1920;assert.equal(readyVersionSchema.safeParse(tinyUpscale).success,false);
});
test('C0 exact input/output byte caps reject cap plus one per kind',()=>{
  const caps={IMAGE:10,PDF:25,VIDEO:128};
  for(const value of [f.image,f.pdf,f.video]){
    assert.ok(readyVersionSchema.safeParse({...value,originalSizeBytes:caps[value.kind]*1024**2}).success);
    assert.equal(readyVersionSchema.safeParse({...value,originalSizeBytes:caps[value.kind]*1024**2+1}).success,false);
  }
  const image=copy(f.image);image.derivatives[0].sizeBytes=12*1024**2-image.derivatives.slice(1).reduce((sum,d)=>sum+d.sizeBytes,0);
  assert.ok(readyVersionSchema.safeParse(image).success);image.derivatives[0].sizeBytes++;assert.equal(readyVersionSchema.safeParse(image).success,false);
  const pdf=copy(f.pdf);pdf.derivatives[0].sizeBytes=64*1024**2;pdf.derivatives[1].sizeBytes=32*1024**2;
  assert.ok(readyVersionSchema.safeParse(pdf).success);pdf.derivatives[1].sizeBytes++;assert.equal(readyVersionSchema.safeParse(pdf).success,false);
  const video=copy(f.video);video.derivatives[0].sizeBytes=48*1024**2;video.derivatives[1].sizeBytes=1024**2;
  assert.ok(readyVersionSchema.safeParse(video).success);video.derivatives[1].sizeBytes++;assert.equal(readyVersionSchema.safeParse(video).success,false);
});
test('C0 metadata distinguishes oriented IMAGE originals from PDF and VIDEO outputs',()=>{
  const image=copy(f.image);image.height=8193;assert.equal(readyVersionSchema.safeParse(image).success,false);
  assert.deepEqual(safeMetadataFromReadyVersion(f.portraitImage),{assetId:'media-portrait',kind:'IMAGE',status:'READY',archived:false,revision:1,width:2000,height:3000});
  const pdf=copy(f.pdf);pdf.derivatives[1].height=1601;assert.equal(readyVersionSchema.safeParse(pdf).success,false);
  const video=copy(f.video);video.width=1281;assert.equal(readyVersionSchema.safeParse(video).success,false);
});
test('C0 bindings and safe metadata redact private fields',()=>{
  for(const v of [f.image,f.pdf,f.video]){
    const binding=bindingFromReadyVersion(v);assert.ok(mediaBindingSchema.safeParse(binding).success);
    assert.deepEqual(Object.keys(binding).sort(),['assetId','kind','originalSha256','derivativeSetSha256','processingRecipeSha256','toolSetSha256','evidenceSha256'].sort());
    const safe=safeMetadataFromReadyVersion(v);assert.equal(safe.assetId,v.assetId);
    for(const key of ['uploaderUid','rightsEvidenceSubmittedBy','originalSha256','evidenceSha256','derivatives','toolSetSha256'])assert.ok(!Object.hasOwn(safe,key));
  }
  assert.equal(mediaBindingSchema.safeParse({...bindingFromReadyVersion(f.image),uploaderUid:'x'}).success,false);
});
test('C0 catalogs reject collisions and require fixed legacy IMAGE identities',()=>{
  const context={legacyCatalog:[f.legacy,{...f.legacy,id:'favicon'}],readyVersions:[f.image,f.pdf,f.video]};
  assert.ok(mediaV3ContextSchema.safeParse(context).success);
  for(const mutate of [v=>v.legacyCatalog.pop(),v=>v.legacyCatalog[0].kind='VIDEO',v=>v.readyVersions.push({...f.image,assetId:'favicon'}),v=>v.readyVersions.push(copy(f.image))]){
    const v=copy(context);mutate(v);assert.equal(mediaV3ContextSchema.safeParse(v).success,false);
  }
});
test('C0 private manifest union rejects leaking server mutable identity',()=>{
  assert.ok(v3MediaManifestSchema.safeParse(f.manifest).success);
  for(const patch of [{uploaderUid:'x'},{status:'READY'},{revision:1},{archived:false},{rightsEvidenceSubmittedBy:'x'}]){
    const v=copy(f.manifest);Object.assign(v[1].asset,patch);assert.equal(v3MediaManifestSchema.safeParse(v).success,false);
  }
  assert.equal(v3MediaManifestSchema.safeParse([...f.manifest,copy(f.manifest[1])]).success,false);
  assert.equal(v3MediaManifestSchema.safeParse(Array.from({length:65},(_,i)=>({...f.manifest[0],asset:{...f.legacy,id:'id'+i}}))).success,false);
});
test('C0 manifest total derivative cap counts every selected hidden version',()=>{
  const project=v=>{const result=copy(v);for(const key of ['uploaderUid','rightsEvidenceSubmittedBy','revision','status','archived'])delete result[key];return {source:'MEDIA_VERSION',asset:result};};
  const pdf=copy(f.pdf);pdf.pageCount=48;pdf.derivatives=[pdf.derivatives[0],...Array.from({length:48},(_,i)=>({...f.pdf.derivatives[1],key:'page-'+(i+1),pageNumber:i+1}))];
  const large=Array.from({length:5},(_,i)=>project({...pdf,assetId:'pdf-'+i}));
  large.push(...Array.from({length:3},(_,i)=>project({...f.image,assetId:'image-'+i})),project({...f.pdf,assetId:'pdf-extra'}));
  assert.equal(large.reduce((sum,v)=>sum+v.asset.derivatives.length,0),256);assert.ok(v3MediaManifestSchema.safeParse(large).success);
  large.at(-1).asset.pageCount=2;large.at(-1).asset.derivatives.push({...f.pdf.derivatives[1],key:'page-2',pageNumber:2});
  assert.equal(large.reduce((sum,v)=>sum+v.asset.derivatives.length,0),257);assert.equal(v3MediaManifestSchema.safeParse(large).success,false);
  assert.ok(v3MediaManifestSchema.safeParse(Array.from({length:64},(_,i)=>({...f.manifest[0],asset:{...f.legacy,id:'id'+i}}))).success);
});
test('C0 independent canonical bytes and digest vectors preserve Unicode and array order',()=>{
  for(const v of f.vectors){assert.equal(independentEncode(v.value),v.canonical);assert.equal(canonicalMediaV3Json(v.value),v.canonical);assert.equal(Buffer.byteLength(v.canonical),v.utf8Bytes);assert.equal(hash(v.canonical),v.sha256);}
  assert.equal(hash(independentEncode(f.manifest)),f.mediaManifestHash);
  const changed=copy(f.manifest);changed[1].asset.derivatives[0].generation='2';assert.notEqual(hash(independentEncode(changed)),f.mediaManifestHash);
  const hidden=copy(f.content);hidden.projects[0].cover.alt='Khác';assert.notEqual(hash(independentEncode({...f.vectors[3].value,content:hidden})),f.contentHash);
  assert.notEqual(canonicalMediaV3Json([1,2]),canonicalMediaV3Json([2,1]));
});
test('C0 canonical guard rejects accessors, cycles, sparse arrays and non-JSON values',()=>{
  let accessed=false;const getter={};Object.defineProperty(getter,'x',{enumerable:true,get(){accessed=true;return 1;}});
  const cycle={};cycle.self=cycle;const sparse=Array(2);sparse[1]=1;const symbol={a:1};symbol[Symbol('x')]=2;
  const nonEnumerable={};Object.defineProperty(nonEnumerable,'x',{value:1});const extra=[];extra.x=1;
  for(const value of [getter,cycle,sparse,symbol,nonEnumerable,extra,{a:undefined},Infinity,NaN,1n,new Date()])assert.throws(()=>canonicalMediaV3Json(value));
  assert.equal(accessed,false);assert.equal(canonicalMediaV3Json(-0),'0');
});
test('C0 diagnostic paths are allowlisted and never include raw values',()=>{
  for(const path of ['hero.image','seo.ogImage','settings.brand.logo','settings.showreel.assetId','settings.showreel.poster','settings.credential','projects.0.gallery.11','projects.23.publicCredentialPage','sections.6.signature.image','fixedAssets.1'])assert.ok(safeMediaDiagnosticSchema.safeParse({code:'INVALID_BINDING',path}).success,path);
  for(const value of [{code:'TOOL_BYTES',path:'hero.image'},{code:'INVALID_BINDING',path:'/private/tool'},{code:'BYTE_LIMIT',path:'projects.24.cover'},{code:'BYTE_LIMIT',path:'hero.image',value:'secret'},{code:'BYTE_LIMIT',path:'projects.01.cover'}])assert.equal(safeMediaDiagnosticSchema.safeParse(value).success,false);
});
test('C0 golden record vectors count outer contentJson escaping without budget implementation',()=>{
  for(const v of f.budgetVectors){const record={contentJson:'x'.repeat(v.repeatAsciiChars)};assert.equal(Buffer.byteLength(JSON.stringify(record)),v.cap);assert.equal(Buffer.byteLength(JSON.stringify({...record,contentJson:record.contentJson+'x'})),v.cap+1);}
  const record={contentJson:JSON.stringify({copy:'Tiếng Việt "🦄"\n'})};
  assert.ok(Buffer.byteLength(JSON.stringify(record))>Buffer.byteLength(record.contentJson));
});
