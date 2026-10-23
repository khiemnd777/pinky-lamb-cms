import {websitePublishSchema} from '../contracts/website-publication.mjs';
import {localizedPublishSchema} from '../contracts/localized-review-records.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {releaseBytesFixture} from './helpers/localized-release-fixture.mjs';
import {publicationQa,prepareSharedFilePlan} from '../cms-api/shared-file-publication.mjs';
import {hashProjectValue as hash} from '../cms-api/project-localization-context.mjs';
const same=(a,b)=>hash(a)===hash(b);
export function sharedFileFixture(){
 const original=releaseBytesFixture(),release=original.release,full=release.entries[0],pin=full.dependencyVector.resources.find(p=>p.resource.kind==='project'),old=publicationQa(full,pin.resource),from=old.credential.resourceId,to='file-new-credential',descriptor={...old.resources.find(r=>r.id===from),id:to,path:'assets/new-credential.pdf',url:'http://127.0.0.1:5010/assets/new-credential.pdf'};
 const reads=[],drafts=new Map(),currents=new Map();for(const e of release.entries)for(const p of e.dependencyVector.resources){const before=publicationQa(e,p.resource),qa=structuredClone(before),affected=qa.resources.some(r=>r.id===from);if(affected){const rewrite=v=>{if(!v||typeof v!=='object')return;for(const [k,child]of Object.entries(v)){if(['assetId','resourceId'].includes(k)&&child===from)v[k]=to;else rewrite(child);}};rewrite(qa);qa.resources=qa.resources.map(r=>r.id===from?structuredClone(descriptor):r);qa.draft.dependencyHash=hash([p.dependencyHash,to]);if(qa.base)qa.base.dependencyHash=qa.draft.dependencyHash;}
  const saved=structuredClone(qa.draft);saved.revision+=10;saved.content.summary='UNRELATED DRAFT NEVER PUBLISH';saved.contentHash=hash(saved.content);drafts.set(JSON.stringify(p.resource),saved);currents.set(JSON.stringify(p.resource),{resource:p.resource,draft:saved,dependencyHash:qa.draft.dependencyHash??p.dependencyHash,stale:true,base:qa.base??{},qa:null,claims:[],sourceCatalog:[],sourceProvenance:{},buildQa:d=>({...structuredClone(qa),draft:structuredClone(d)})});}
 const current=currents.get(JSON.stringify(pin.resource));current.stale=false;current.draft=structuredClone(old.draft);current.draft.revision++;current.draft.dependencyHash=current.dependencyHash;current.qa={...current.buildQa(current.draft)};
 const selection={resource:pin.resource,expectedRevision:current.draft.revision,expectedContentHash:current.draft.contentHash,expectedDependencyHash:current.dependencyHash};
 return {original,release,from,to,descriptor,selection,drafts,currents,readCurrent:async r=>{reads.push(r);return currents.get(JSON.stringify(r));},reads,same};
}
test('one shared Credential change plans every live consumer in all locales using frozen copy, never unrelated drafts',async()=>{
 const f=sharedFileFixture(),before=structuredClone(f.release),plan=await prepareSharedFilePlan(f);assert.ok(plan.targets.length>=3);assert.deepEqual(new Set(plan.targets.map(t=>t.resource.locale)),new Set(['en','vi','ja']));assert.equal(plan.changes[0].from,f.from);for(const t of plan.targets){assert.ok(!JSON.stringify(t.qa).includes('UNRELATED DRAFT'));if(!same(t.resource,f.selection.resource))assert.deepEqual(t.qa.draft.content,publicationQa(f.release.entries.find(e=>e.locale===t.resource.locale),t.resource).draft.content);}assert.deepEqual(f.release,before);
});
test('partial source replacement and concurrent selected revision fail before publishing any draft',async()=>{
 const f=sharedFileFixture(),target=[...f.currents.values()].find(r=>r.resource.locale==='vi'&&r.resource.kind==='project');target.buildQa=()=>publicationQa(f.release.entries[1],target.resource);await assert.rejects(prepareSharedFilePlan(f),/đồng nhất|khác/);const next=sharedFileFixture();next.currents.get(JSON.stringify(next.selection.resource)).draft.revision++;await assert.rejects(prepareSharedFilePlan(next),/xác nhận/);
});

test('only Website publication accepts the exact shared-file confirmation; editorial submit retains its old strict contract',()=>{
 const f=sharedFileFixture(),body={...f.selection,fileConfirmation:{hash:'a'.repeat(64),baseSnapshotSetHash:f.release.snapshotSetHash}};assert.deepEqual(websitePublishSchema.parse(body),body);assert.equal(localizedPublishSchema.safeParse(body).success,false);for(const bad of [{...body,extra:true},{...body,fileConfirmation:{...body.fileConfirmation,extra:true}},{...body,fileConfirmation:{hash:'bad',baseSnapshotSetHash:f.release.snapshotSetHash}},{...body,expectedRevision:0}])assert.equal(websitePublishSchema.safeParse(bad).success,false);
});
