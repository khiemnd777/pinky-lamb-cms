import test from 'node:test';
import assert from 'node:assert/strict';
import {createMediaV2RecordSchemas,contentDigestProjectionV2,safeCatalogV2Schema,
 validateDraftV2,v2ImportLineageSchema} from '../contracts/media-v3-records-v2.mjs';
const hash='a'.repeat(64);
test('v2 factory exposes seven named schemas without Rights envelope fields',()=>{
 const schemas=createMediaV2RecordSchemas({sourceCatalog:[],currentYear:2026});
 assert.deepEqual(Object.keys(schemas),['domainDraftSchema','storedDraftSchema','snapshotSchema','storedSnapshotSchema','draftReadSchema','snapshotReadSchema','qaSchema']);
 assert.equal(schemas.qaSchema.safeParse({snapshot:{},reviewState:{},review:{},sourceChecks:[],mediaRightsChecks:[]}).success,false);
});
test('v2 content digest payload pins revision2 and captures unchanged DATA',()=>{
 const content={schemaVersion:3,list:['Tiếng Việt 😀','  whitespace  ']};
 const result=contentDigestProjectionV2(content,hash);content.list.reverse();
 assert.deepEqual(result,{content:{schemaVersion:3,list:['Tiếng Việt 😀','  whitespace  ']},mediaManifestHash:hash,schemaVersion:3,templateVersion:'m3-site-media-v1',contractRevision:2});
 assert.throws(()=>contentDigestProjectionV2({schemaVersion:3},hash+'\n'),error=>error.code==='INTERNAL_ERROR');
});
test('v2 safe catalog distinguishes unchanged Legacy and revision2 media summaries',()=>{
 const legacy={source:'LEGACY',asset:{id:'brand-diagonal',kind:'IMAGE',status:'LEGACY_READY',legacyPath:'assets/brand-diagonal.webp',label:'Trusted label',width:100,height:100}};
 const media={source:'MEDIA_VERSION',asset:{contractRevision:2,assetId:'asset-a2',kind:'IMAGE',status:'READY',archived:false,revision:1,width:120,height:80}};
 assert.deepEqual(safeCatalogV2Schema.parse([legacy,media]),[legacy,media]);
 assert.equal(safeCatalogV2Schema.safeParse([media,legacy]).success,false);
 assert.equal(safeCatalogV2Schema.safeParse([legacy,{...media,asset:{...media.asset,uploaderUid:'private'}}]).success,false);
});
test('v2 context hash accessor is rejected before invocation',()=>{
 let calls=0;const context={contentContext:{sourceCatalog:[],currentYear:2026},expectedImport:{}};
 Object.defineProperty(context,'hashCanonical',{enumerable:true,get(){calls++;return ()=>hash;}});
 assert.throws(()=>validateDraftV2(null,context),error=>error.code==='INTERNAL_ERROR');assert.equal(calls,0);
});
test('v2 lineage retains strict CURRENTM2 plus nested M1 identity without new revision',()=>{
 const m1={importId:'import-m1',importedM1Revision:1,importedM1ContentHash:hash,baselineManifestHash:hash,importReportHash:hash};
 const lineage={importId:'import-a2',sourceDraftId:'home-v2',sourceSchemaVersion:2,sourceTemplateVersion:'m2-site-baseline-v1',sourceDraftRevision:7,sourceContentHash:hash,sourceMediaManifestHash:hash,sourceRefsHash:hash,sourceImportLineage:m1,importReportHash:hash};
 assert.deepEqual(v2ImportLineageSchema.parse(lineage),lineage);
 assert.equal(v2ImportLineageSchema.safeParse({...lineage,contractRevision:2}).success,false);
});
