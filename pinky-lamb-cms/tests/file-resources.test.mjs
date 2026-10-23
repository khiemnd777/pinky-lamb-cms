import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {createLocalMediaStore} from '../cms-api/local-media-store.mjs';
import {zipSync,strToU8} from 'fflate';
import {createNativeContentFixture} from './helpers/content-native-fixture.mjs';
import {createFileResourceService} from '../cms-api/file-resources.mjs';
const {createSiteV3MediaProvider}=await import('../cms-api/site-v3-media-provider.mjs');
const {createContentService}=await import('../cms-api/content-service.mjs');
import {fileAssetSchema,fileQaResource,fileQaResourceSchema} from '../contracts/file-resource.mjs';
const digest=b=>createHash('sha256').update(b).digest('hex');
const pdf={assetId:'pending',revision:0,name:'Credential ngoài',kind:'PDF',format:'PDF',mimeType:'application/pdf',disposition:'READER',downloadName:'Credential.pdf',sizeBytes:100,sha256:'a'.repeat(64),pageCount:48,rightsConfirmed:true,source:{kind:'EXTERNAL',url:'https://media.example.org/credential'}};
async function fixture(t){const f=await createNativeContentFixture();t.after(f.close);let role='OWNER';const authorize=async(_request,action)=>{if(action==='MEDIA_UPLOAD'&&!['OWNER','EDITOR'].includes(role))throw Object.assign(Error('Denied'),{code:'FORBIDDEN'});return {uid:'synthetic-owner',role,authzVersion:1};};const storage=createLocalMediaStore({root:path.dirname(f.db.sqlite.name),sqlite:f.db.sqlite});return {...f,service:createFileResourceService({db:f.db,authorize,storage,hosts:['media.example.org']}),setRole:r=>role=r,authorize};}
test('external create/list is idempotent, server validates policy and denies writes by reviewer',async t=>{
 const f=await fixture(t),args={request:{},key:'external-pdf-1',body:{name:pdf.name,sizeBytes:100,sha256:pdf.sha256,rightsConfirmed:true,external:pdf}};
 const result=await f.service.create(args);assert.deepEqual(await f.service.create(args),result);assert.equal(result.state,'INSPECTED');assert.equal((await f.service.list({request:{},kind:'PDF'})).items.length,1);assert.equal(fileQaResourceSchema.safeParse(fileQaResource(result.asset)).success,true);
 await assert.rejects(f.service.create({...args,body:{...args.body,name:'different'}}),{code:'IDEMPOTENCY_PAYLOAD_MISMATCH'});
 await assert.rejects(f.service.create({...args,key:'invalid-host',body:{...args.body,external:{...pdf,source:{kind:'EXTERNAL',url:'https://elsewhere.example.org/x'}}}}));
 f.setRole('REVIEWER');await assert.rejects(f.service.create({...args,key:'reviewer-write'}),{code:'FORBIDDEN'});
});
test('external Credential crosses real native content save/provider with hash pin and stale-save protection',async t=>{
 const f=await fixture(t),result=await f.service.create({request:{},key:'credential-external',body:{name:pdf.name,sizeBytes:100,sha256:pdf.sha256,rightsConfirmed:true,external:pdf}}),provider=createSiteV3MediaProvider({db:f.db}),content=createContentService({...f.options,mediaProvider:provider});
 const read=await content.readGroup({request:{},group:'about'}),next=structuredClone(read.content);next.settings.credential.assetId=result.id;
 const args={request:{},actor:{uid:'synthetic-owner'},group:'about',body:{expected:read.entities.map(({kind,id,revision})=>({kind,id,revision})),content:next},key:'save-external-credential',correlationId:'test'};
 const saved=await content.saveGroup(args);assert.equal(saved.read.content.settings.credential.assetId,result.id);assert.ok(saved.read.catalog.some(e=>e.source==='FILE_RESOURCE'&&e.asset.sha256===pdf.sha256));
 await assert.rejects(content.saveGroup({...args,key:'stale-external-credential'}),{code:'REVISION_CONFLICT'});
 const {createSiteV3SnapshotService}=await import('../cms-api/site-v3-snapshots.mjs'),snapshots=await createSiteV3SnapshotService({...f.options,mediaProvider:provider});const snapshot=await snapshots.submitSnapshot({request:{},actor:{uid:'synthetic-owner'},body:{draftId:'home-v3',draftRevision:saved.read.siteRevision},key:'snapshot-external-pdf',correlationId:'test'});const frozen=await snapshots.readSnapshot({request:{},id:snapshot.id});assert.equal(frozen.snapshot.mediaManifest.find(e=>e.source==='FILE_RESOURCE').asset.sha256,pdf.sha256);await f.service.archive({request:{},id:result.id,key:'archive-frozen-pdf',body:{expectedRevision:0}});assert.equal((await snapshots.readSnapshot({request:{},id:snapshot.id})).snapshot.mediaManifest.find(e=>e.source==='FILE_RESOURCE').asset.sha256,pdf.sha256,'archive must not rewrite snapshot identity');
});
test('Office multipart upload uses server detection, immutable download bytes and replay',async t=>{
 const f=await fixture(t),bytes=Buffer.from(zipSync({'[Content_Types].xml':strToU8('application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml'),'word/document.xml':strToU8('<document/>')})),start=await f.service.create({request:{},key:'office-upload',body:{name:'Plan.docx',sizeBytes:bytes.length,sha256:digest(bytes),rightsConfirmed:true}});
 await f.service.part({request:{},id:start.id,index:0,bytes,key:'office-part-0'});const result=await f.service.complete({request:{},id:start.id,key:'office-complete'});assert.equal(result.asset.kind,'WORD');assert.deepEqual((await f.service.bytes({request:{},id:start.id})).bytes,bytes);assert.equal(result.asset.source.kind,'HOSTED');assert.ok(!JSON.stringify(fileQaResource(result.asset)).includes('private/media'));
 assert.deepEqual(await f.service.complete({request:{},id:start.id,key:'office-complete'}),result);await assert.rejects(f.service.archive({request:{},id:start.id,key:'office-complete',body:{expectedRevision:0}}),{code:'IDEMPOTENCY_PAYLOAD_MISMATCH'});await f.service.archive({request:{},id:start.id,key:'archive-office',body:{expectedRevision:0}});assert.equal((await f.service.list({request:{},kind:'WORD'})).items.length,0);assert.deepEqual((await f.service.bytes({request:{},id:start.id})).bytes,bytes,'archived immutable bytes remain available for pinned reads');
});
test('a descriptor cannot mislabel an Office file as a reader PDF',()=>{assert.equal(fileAssetSchema.safeParse({...pdf,kind:'WORD',format:'DOCX'}).success,false);});

test('file source filtering is applied before pagination and invalid sources are rejected',async t=>{
 const f=await fixture(t);await f.service.create({request:{},key:'source-filter-external',body:{name:pdf.name,sizeBytes:100,sha256:pdf.sha256,rightsConfirmed:true,external:pdf}});
 assert.equal((await f.service.list({request:{},source:'EXTERNAL'})).items.length,1);
 assert.equal((await f.service.list({request:{},source:'HOSTED'})).items.length,0);
 await assert.rejects(f.service.list({request:{},source:'OTHER'}),{code:'VALIDATION_ERROR'});
});
