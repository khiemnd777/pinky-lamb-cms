import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {V2_DESCRIPTOR,V2_CAPS,V2_BUDGET_PROFILE,V2_MEDIA_LIMITS,
 imageReferenceV2Schema,identityReferenceV2Schema,videoPosterReferenceV2Schema,
 derivativeV2Schema,readyVersionV2Schema,immutableManifestAssetV2Schema,
 mediaBindingV2Schema,mediaV2ContextSchema,v2MediaManifestSchema,
 canonicalMediaV2Json,normalizedDerivativeProjectionV2,bindingFromReadyVersionV2,
 immutableManifestAssetFromReadyVersionV2,safeMetadataFromReadyVersionV2,
 safeMediaDiagnosticV2Schema} from '../contracts/media-v3-contract-v2.mjs';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/media-v3-contract-v2.json',import.meta.url),'utf8'));
const copy=value=>structuredClone(value);
const sha=text=>createHash('sha256').update(text,'utf8').digest('hex');
const version=kind=>copy(fixture.families.find(value=>value.readyVersion.kind===kind).readyVersion);
const reject=(schema,value)=>assert.equal(schema.safeParse(value).success,false);

test('v2 descriptor/caps retain technical budgets and omit Rights proof capacity',()=>{
 assert.deepEqual(V2_DESCRIPTOR,{draftId:'home-v3',schemaVersion:3,templateVersion:'m3-site-media-v1',contractRevision:2});
 assert.deepEqual(V2_CAPS,{references:64,derivatives:256,sourceProofs:61,sourceRefs:600,max_processing_attempts:2});
 assert.deepEqual(V2_BUDGET_PROFILE,{storedDraft:262144,storedSnapshot:262144,privateJSON:262144,qaEnvelopeVersion3:2097152,qaEnvelopeLegacy:1048576});
 assert.equal(V2_MEDIA_LIMITS.IMAGE.outputBytes,12*1024**2);
});
test('v2 canonical vectors preserve Unicode, arrays and UTF16 key order',()=>{
 for(const vector of fixture.canonicalVectors){const actual=canonicalMediaV2Json(vector.value);assert.equal(actual,vector.canonicalJson);assert.equal(Buffer.byteLength(actual,'utf8'),vector.utf8Bytes);assert.equal(sha(actual),vector.sha256);}
 assert.notEqual(canonicalMediaV2Json({'2':'two','10':'ten'}),JSON.stringify({'2':'two','10':'ten'}));
});
test('v2 references preserve decorative/alt/focal rules with no source discriminator',()=>{
 assert.deepEqual(imageReferenceV2Schema.parse({assetId:'image',alt:'',isDecorative:true}),{assetId:'image',alt:'',isDecorative:true});
 assert.equal(imageReferenceV2Schema.safeParse({assetId:'image',alt:'Có nghĩa',isDecorative:false,focalPoint:{x:0,y:1}}).success,true);
 for(const value of [{assetId:'image',alt:' ',isDecorative:false},{assetId:'image',alt:'text',isDecorative:true},{assetId:'image',alt:'',isDecorative:true,source:'MEDIA_VERSION'}])reject(imageReferenceV2Schema,value);
 reject(imageReferenceV2Schema,{assetId:'image',alt:'x',isDecorative:false,focalPoint:{x:Infinity,y:0}});
});
test('v2 identity and poster references enforce exact shape and asset100',()=>{
 assert.equal(identityReferenceV2Schema.safeParse({assetId:'a'.repeat(100)}).success,true);
 for(const assetId of ['a'.repeat(101),'a\n','../a'])reject(identityReferenceV2Schema,{assetId});
 assert.equal(videoPosterReferenceV2Schema.safeParse({assetId:'video',derivativeRole:'POSTER',alt:'Poster',isDecorative:false}).success,true);
 reject(videoPosterReferenceV2Schema,{assetId:'video',derivativeRole:'VIDEO',alt:'Poster',isDecorative:false});
});
test('v2 complete five synthetic families match independent binding/immutable/safe projections',()=>{
 for(const f of fixture.families){assert.deepEqual(readyVersionV2Schema.parse(f.readyVersion),f.readyVersion);assert.deepEqual(bindingFromReadyVersionV2(f.readyVersion),f.binding);assert.deepEqual(immutableManifestAssetFromReadyVersionV2(f.readyVersion),f.immutable);assert.deepEqual(safeMetadataFromReadyVersionV2(f.readyVersion),f.safe);}
});
test('v2 ReadyVersion requires revision2 and metadataDigest outside six-binding',()=>{
 const value=version('IMAGE');for(const key of ['contractRevision','metadataDigest']){const v=copy(value);delete v[key];reject(readyVersionV2Schema,v);}
 reject(readyVersionV2Schema,{...value,contractRevision:1});
 const b=bindingFromReadyVersionV2(value);assert.equal(Object.keys(b).length,6);assert.equal(Object.hasOwn(b,'metadataDigest'),false);reject(mediaBindingV2Schema,{...b,metadataDigest:value.metadataDigest});reject(mediaBindingV2Schema,{...b,contractRevision:2});
});
test('v2 new media denies superseded Rights/EV/proof/submitter fields',()=>{
 for(const field of fixture.forbiddenNewFields){reject(readyVersionV2Schema,{...version('IMAGE'),[field]:null});reject(immutableManifestAssetV2Schema,{...fixture.families[0].immutable,[field]:null});}
});
test('v2 every digest has exact lowercase64 including final-newline refusal',()=>{
 for(const key of ['originalSha256','processingRecipeSha256','toolSetSha256','derivativeSetSha256','metadataDigest'])for(const hash of ['a'.repeat(64)+'\n','A'.repeat(64),'a'.repeat(63)])reject(readyVersionV2Schema,{...version('IMAGE'),[key]:hash});
});
test('v2 immutable/safe projections remove server/private fields and retain MD only immutable',()=>{
 const v=version('IMAGE'),i=immutableManifestAssetFromReadyVersionV2(v),s=safeMetadataFromReadyVersionV2(v);
 for(const key of ['status','archived','revision','uploaderUid'])assert.equal(Object.hasOwn(i,key),false);
 assert.equal(i.metadataDigest,v.metadataDigest);
 for(const key of ['metadataDigest','uploaderUid','originalSha256','derivatives','name'])assert.equal(Object.hasOwn(s,key),false);
 assert.equal(s.contractRevision,2);assert.equal(s.width,v.width);
});
test('v2 normalizer accepts READY raw order and preserves opaque generations',()=>{
 for(const f of fixture.families){const v=copy(f.readyVersion);v.derivatives.reverse();assert.equal(readyVersionV2Schema.safeParse(v).success,true);const n=normalizedDerivativeProjectionV2(v.derivatives);assert.deepEqual(n,f.normalizedDerivatives);assert.equal(canonicalMediaV2Json(n),f.canonicalDerivatives);assert.equal(sha(f.canonicalDerivatives),f.derivativeSetSha256);assert.deepEqual(v.derivatives,[...f.readyVersion.derivatives].reverse());assert.notEqual(n,v.derivatives);assert.notEqual(n[0],v.derivatives[0]);assert.ok(n.every(d=>typeof d.generation==='string'));}
});
test('v2 tiny IMAGE retains three logical buckets with equal dimensions and SHA',()=>{
 const f=fixture.families.find(f=>f.id==='tiny');assert.equal(f.readyVersion.derivatives.length,3);assert.equal(new Set(f.readyVersion.derivatives.map(d=>d.sha256)).size,1);assert.equal(normalizedDerivativeProjectionV2(f.readyVersion.derivatives).length,3);
});
test('v2 portrait uses oriented originals and allows output height above1920',()=>{
 const f=fixture.families.find(f=>f.id==='portrait');assert.deepEqual(f.readyVersion.derivatives.map(d=>[d.width,d.height]),[[320,480],[960,1440],[1920,2880]]);assert.equal(readyVersionV2Schema.safeParse(f.readyVersion).success,true);
});
test('v2 IMAGE rejects missing/duplicate/wrong buckets, upscale and wrong aspect',()=>{
 const a=version('IMAGE');const missing=copy(a);missing.derivatives.pop();reject(readyVersionV2Schema,missing);
 for(const mutate of [v=>{v.derivatives[1].targetWidth=320;},v=>{v.derivatives[0].key='wrong-key';},v=>{v.derivatives[0].targetWidth=1290;},v=>{v.derivatives[0].width=321;},v=>{v.derivatives[0].height++;}]){const v=copy(a);mutate(v);reject(readyVersionV2Schema,v);}
 const tiny=copy(fixture.families.find(f=>f.id==='tiny').readyVersion);tiny.derivatives[0].width=320;reject(readyVersionV2Schema,tiny);
});
test('v2 IMAGE enforces original8192edge/40Mp and exact aggregate12MiB',()=>{
 for(const patch of [{width:8193},{width:8192,height:8192}])reject(readyVersionV2Schema,{...version('IMAGE'),...patch});
 const v=version('IMAGE');v.derivatives[0].sizeBytes=12*1024**2-v.derivatives[1].sizeBytes-v.derivatives[2].sizeBytes;assert.equal(readyVersionV2Schema.safeParse(v).success,true);v.derivatives[0].sizeBytes++;reject(readyVersionV2Schema,v);
});
test('v2 derivative roles require applicable fields and reject unknown or explicitundefined',()=>{
 for(const f of fixture.families)for(const d of f.readyVersion.derivatives){reject(derivativeV2Schema,{...d,unknown:true});reject(derivativeV2Schema,{...d,unknown:undefined});if(d.role!=='IMAGE')reject(derivativeV2Schema,{...d,targetWidth:320});}
 reject(derivativeV2Schema,{...version('PDF').derivatives[0],width:undefined});
 reject(derivativeV2Schema,{...version('IMAGE').derivatives[0],pageNumber:1});
});
test('v2 derivative logical keys/MIME/size/hash/generation are strictly bounded',()=>{
 const d=version('IMAGE').derivatives[0];for(const patch of [{key:'../file'},{key:'a\n'},{mimeType:'image/png'},{sizeBytes:0},{sizeBytes:0.5},{sha256:'a'.repeat(64)+'\n'},{generation:9007199254741001},{generation:'0'},{generation:'01'},{generation:'123\n'},{generation:'1'.repeat(129)}])reject(derivativeV2Schema,{...d,...patch});
});
test('v2 PDF requires one download and contiguous complete numbered pages',()=>{
 const p=version('PDF');for(const mutate of [v=>{v.derivatives.pop();},v=>{v.derivatives[2].pageNumber=1;},v=>{v.derivatives[1].pageNumber=4;},v=>{v.pageCount=49;}]){const v=copy(p);mutate(v);reject(readyVersionV2Schema,v);}
});
test('v2 PDF enforces download64MiB/page aggregate32MiB and1600edge',()=>{
 const p=version('PDF');p.derivatives[0].sizeBytes=64*1024**2;p.derivatives[1].sizeBytes=32*1024**2-p.derivatives[2].sizeBytes-p.derivatives[3].sizeBytes;assert.equal(readyVersionV2Schema.safeParse(p).success,true);p.derivatives[1].sizeBytes++;reject(readyVersionV2Schema,p);reject(derivativeV2Schema,{...version('PDF').derivatives[1],width:1601});
});
test('v2 VIDEO needs oneVIDEO/onePOSTER matching output geometry/duration',()=>{
 const v=version('VIDEO');for(const mutate of [x=>{x.derivatives.pop();},x=>{x.derivatives[0].width--;},x=>{x.derivatives[1].durationSeconds--;},x=>{x.durationSeconds=301;}]){const x=copy(v);mutate(x);reject(readyVersionV2Schema,x);}
});
test('v2 each kind preserves input-byte limit and archive is structural state',()=>{
 for(const f of fixture.families){const v=copy(f.readyVersion);v.originalSizeBytes=V2_MEDIA_LIMITS[v.kind].inputBytes;v.archived=true;assert.equal(readyVersionV2Schema.safeParse(v).success,true);v.originalSizeBytes++;reject(readyVersionV2Schema,v);}
});
test('v2 normalizer rejects empty/over256/duplicate keys and is not Ready authority',()=>{
 const d=version('IMAGE').derivatives[0];for(const values of [[],Array.from({length:257},()=>copy(d)),[d,d]])assert.throws(()=>normalizedDerivativeProjectionV2(values));
 assert.equal(normalizedDerivativeProjectionV2([d]).length,1);
});
test('v2 full legacy wrapper retains historical fields/value/sourceRef order',()=>{
 assert.deepEqual(v2MediaManifestSchema.parse(fixture.legacyManifest),fixture.legacyManifest);
 for(const entry of fixture.legacyManifest){assert.equal(entry.asset.rights.basis,'CLIENT_SUPPLIED');assert.equal(Object.hasOwn(entry.asset,'contractRevision'),false);}
});
test('v2 supplied manifest enforces source-ID/derivative order and global identity uniqueness',()=>{
 const m=copy(fixture.selectedManifest);assert.deepEqual(v2MediaManifestSchema.parse(m),m);reject(v2MediaManifestSchema,[...m].reverse());
 const unsorted=copy(m);unsorted.at(-1).asset.derivatives.reverse();reject(v2MediaManifestSchema,unsorted);
 reject(v2MediaManifestSchema,[...m,m.at(-1)]);
});
test('v2 context distinguishes legacy/new identities and requires fixed legacy IMAGE IDs',()=>{
 const c=copy(fixture.context);assert.equal(mediaV2ContextSchema.safeParse(c).success,true);const missing=copy(c);missing.legacyCatalog.pop();reject(mediaV2ContextSchema,missing);const collision=copy(c);collision.readyVersions[0].assetId=collision.legacyCatalog[0].id;reject(mediaV2ContextSchema,collision);
});
test('v2 manifest allows256 complete derivatives and rejects257 without invalid partial sets',()=>{
 const pdf=pages=>{const p=copy(fixture.families.find(f=>f.id==='pdf').immutable);p.pageCount=pages;p.derivatives=[p.derivatives[0],...Array.from({length:pages},(_,i)=>({...p.derivatives[1],key:'page-'+(i+1),pageNumber:i+1}))];return p;};
 const entries=[...Array.from({length:4},(_,i)=>({source:'MEDIA_VERSION',asset:{...copy(fixture.families[0].immutable),assetId:'image-'+i}})),...Array.from({length:4},(_,i)=>({source:'MEDIA_VERSION',asset:{...pdf(48),assetId:'pdf-'+i}})),{source:'MEDIA_VERSION',asset:{...pdf(47),assetId:'pdf-z'}}];
 assert.equal(entries.reduce((n,e)=>n+e.asset.derivatives.length,0),256);assert.equal(v2MediaManifestSchema.safeParse(entries).success,true);entries.at(-1).asset= {...pdf(48),assetId:'pdf-z'};reject(v2MediaManifestSchema,entries);
});
test('v2 manifest/context retain64version/reference bounds',()=>{
 const i=fixture.families[0].immutable;const list=Array.from({length:64},(_,n)=>({source:'MEDIA_VERSION',asset:{...copy(i),assetId:'asset-'+String(n).padStart(2,'0')}}));assert.equal(v2MediaManifestSchema.safeParse(list).success,true);list.push({source:'MEDIA_VERSION',asset:{...copy(i),assetId:'asset-64'}});reject(v2MediaManifestSchema,list);
});
test('v2 canonical/structural guards reject getter/cycle/sparse/undefined/surrogate/nonfinite',()=>{
 let calls=0;const getter={};Object.defineProperty(getter,'name',{enumerable:true,get(){calls++;return 'x';}});const cycle={};cycle.self=cycle;
 for(const x of [getter,cycle,new Array(1),{x:undefined},{x:'\ud800'},{x:Infinity},Object.create(null)])assert.throws(()=>canonicalMediaV2Json(x));assert.equal(calls,0);
 const ready=version('IMAGE');Object.defineProperty(ready,'width',{enumerable:true,get(){calls++;return 2000;}});reject(readyVersionV2Schema,ready);assert.equal(calls,0);
});
test('v2 safe diagnostics include revision2 and only allowlisted code/path',()=>{
 assert.equal(safeMediaDiagnosticV2Schema.safeParse({contractRevision:2,code:'UNKNOWN_ASSET',path:'projects.0.publicCredentialPage'}).success,true);
 for(const x of [{code:'UNKNOWN_ASSET',path:'hero.image'},{contractRevision:2,code:'UNKNOWN_ASSET',path:'/private/file'},{contractRevision:2,code:'UNKNOWN_ASSET',path:'hero.image',rawValue:'secret'}])reject(safeMediaDiagnosticV2Schema,x);
});
