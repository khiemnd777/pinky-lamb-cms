import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createServiceLocalizationController} from '../admin/service-localization-editor.mjs';
import {canonicalJson} from '../contracts/draft.mjs';
import {base,saveBody} from './service-localization-contract.test.mjs';
import {editorialFixture} from './localized-editorial-api.test.mjs';
import {createLocalizedEditorialService} from '../cms-api/localized-editorial.mjs';
const hash=value=>createHash('sha256').update(canonicalJson(value)).digest('hex');
test('editor can change stale copy and explicitly rebase it; an unknown response holds the exact new content',async()=>{
 const resource={kind:'service',entityId:base.service.id,locale:'en'},current={...base,dependencyHash:'b'.repeat(64)},content=saveBody().content,original={contractRevision:1,draftId:'home-v3',serviceId:base.service.id,locale:'en',revision:1,dependencyHash:base.dependencyHash,contentHash:hash(content),content,updatedAt:'2026-10-16T00:00:00.000Z'};
 let saved=original,first=true;const writes=[];
 const apiFetch=async(path,options={})=>{
  if(path.includes('/editorial/resources/'))return {contractRevision:1,resource,draft:original,currentDependencyHash:current.dependencyHash,previousDependencyHash:original.dependencyHash,stale:true,claims:[],sourceCatalog:[],sourceProvenance:{homeRevision:2,homeContentHash:'c'.repeat(64),importLineageHash:'d'.repeat(64),templateIdentity:base.templateIdentity,rendererContract:'multilingual-full-site-v1',dictionaryContract:'multilingual-locale-copy-v1'}};
  if(options.method==='POST'){
   assert.equal(path,'/api/cms/localizations/editorial/rebase');const body=JSON.parse(options.body);writes.push({body,key:options.headers['Idempotency-Key']});assert.equal(body.acknowledgeSourceChange,true);assert.equal(body.expectedContentHash,original.contentHash);
   saved={...original,revision:2,dependencyHash:current.dependencyHash,content:body.content,contentHash:hash(body.content)};if(first){first=false;throw Error('lost response');}
   return {contractRevision:1,resource,revision:2,dependencyHash:current.dependencyHash,contentHash:saved.contentHash,updatedAt:saved.updatedAt};
  }
  assert.equal(options.method,undefined);return {contractRevision:1,draftId:'home-v3',serviceId:base.service.id,locale:'en',base:current,draft:saved};
 };
 const controller=createServiceLocalizationController({apiFetch,getSession:()=>({uid:'synthetic-editor',role:'EDITOR',authzVersion:1}),keyFactory:()=> 'explicit-rebase-key'});
 await controller.load(base.service.id);assert.equal(controller.state().baseDrift,true);controller.edit(value=>value.title='Reviewed against changed source');assert.equal(await controller.save(),false);
 assert.equal(await controller.rebase(),false);assert.equal(controller.state().intent,true);assert.equal(await controller.load(base.service.id,'vi'),false);assert.equal(await controller.save(),true);
 assert.deepEqual(writes[0],writes[1]);assert.equal(controller.state().working.title,'Reviewed against changed source');assert.equal(controller.state().baseDrift,false);assert.equal(controller.state().dirty,false);
});
test('Project/Service-style receipt readback cannot acknowledge a different payload at the same revision/hash',async()=>{
 const content=saveBody().content;let draft=null;const controller=createServiceLocalizationController({getSession:()=>({uid:'synthetic-owner',role:'OWNER',authzVersion:1}),apiFetch:async(_path,options={})=>{
  if(options.method==='PUT'){draft={contractRevision:1,draftId:'home-v3',serviceId:base.service.id,locale:'en',revision:1,dependencyHash:base.dependencyHash,contentHash:hash(content),content:{...content,title:'Different payload'},updatedAt:'2026-10-16T00:00:00.000Z'};const {content:ignored,...receipt}=draft;void ignored;return receipt;}
  return {contractRevision:1,draftId:'home-v3',serviceId:base.service.id,locale:'en',base,draft};
 }});await controller.load(base.service.id);controller.edit(value=>Object.assign(value,content));assert.equal(await controller.save(),false);assert.equal(controller.state().conflict,true);assert.equal(controller.state().working.title,content.title);
});
test('actual editorial service rebases edited content with a new hash while preserving submitted snapshots',async()=>{
 const f=editorialFixture(),api=await createLocalizedEditorialService({resourceContext:f.context}),submitted=await api.submitSnapshot(f.args()),before=(await api.readSnapshot({request:{},id:submitted.snapshotId})).snapshot;f.drift();const read=await api.readResource({request:{},resource:f.resource}),content={...read.draft.content,title:'Reviewed updated translation'};
 const receipt=await api.rebaseDraft({request:{},actor:f.actor(),key:'edited-rebase-regression',body:{resource:f.resource,expectedRevision:read.draft.revision,expectedContentHash:read.draft.contentHash,expectedDependencyHash:read.currentDependencyHash,previousDependencyHash:read.previousDependencyHash,acknowledgeSourceChange:true,content}});
 assert.equal(receipt.contentHash,hash(content));assert.notEqual(receipt.contentHash,before.contentHash);assert.equal(receipt.revision,before.revision+1);assert.deepEqual((await api.readSnapshot({request:{},id:submitted.snapshotId})).snapshot,before);
});
