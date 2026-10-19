import test from 'node:test';
import assert from 'node:assert/strict';
import {releaseBytesFixture} from './helpers/localized-release-fixture.mjs';
import {hashProjectValue as hash} from '../cms-api/project-localization-context.mjs';
import {replaceSelectedRelease} from '../cms-api/selected-publication.mjs';
import {mergeLocalizedProject} from '../contracts/project-localization.mjs';

function selected(release){
 const full=release.entries[0],qa=structuredClone(full.workServices.projects[0]),pin=full.dependencyVector.resources.find(v=>v.resource.kind==='project');
 qa.draft.revision++;qa.draft.content.summary='Selected English change only';qa.draft.contentHash=hash(qa.draft.content);qa.project=mergeLocalizedProject(qa.project,qa.draft.content);
 return {snapshot:{id:'selected-snapshot',resource:structuredClone(pin.resource),revision:qa.draft.revision,dependencyHash:pin.dependencyHash,contentHash:qa.draft.contentHash,snapshotHash:'a'.repeat(64),qa},review:{id:'selected-publication',outcome:'APPROVED',attestationSetHash:'b'.repeat(64)}};
}
test('selected publication replaces one live resource and locale, preserving other live payloads and pins',()=>{
 const {release}=releaseBytesFixture(),before=structuredClone(release),detail=selected(release),after=replaceSelectedRelease(release,detail);
 assert.deepEqual(after.entries[0].workServices.projects[0],detail.snapshot.qa);
 assert.deepEqual(after.entries.slice(1),before.entries.slice(1));
 const target=detail.snapshot.resource;
 assert.deepEqual(after.entries[0].dependencyVector.resources.filter(v=>v.resource.kind!==target.kind||v.resource.entityId!==target.entityId),before.entries[0].dependencyVector.resources.filter(v=>v.resource.kind!==target.kind||v.resource.entityId!==target.entityId));
 for(const key of ['hero','groups'])assert.deepEqual(after.entries[0][key],before.entries[0][key]);
 assert.deepEqual(after.entries[0].workServices.services,before.entries[0].workServices.services);
 assert.deepEqual(release,before);assert.notEqual(after.snapshotSetHash,before.snapshotSetHash);
});
test('missing live content and changed shared dependencies block instead of bringing unrelated changes into the release',()=>{
 const {release}=releaseBytesFixture(),detail=selected(release);
 detail.snapshot.dependencyHash='0'.repeat(64);assert.throws(()=>replaceSelectedRelease(release,detail),/nguồn|phụ thuộc/i);
 detail.snapshot.resource.entityId='not-live';assert.throws(()=>replaceSelectedRelease(release,detail),/website|nội dung/i);
});

test('every existing content kind and locale can replace its own pin while other saved payloads remain frozen',()=>{
 const {release}=releaseBytesFixture();
 for(const full of release.entries)for(const pin of full.dependencyVector.resources){
  const r=pin.resource,original=r.kind==='hero'?full.hero:r.kind==='group'?full.groups[r.entityId]:r.kind==='section'?full.workServices.sections[r.entityId]:full.workServices[r.kind==='project'?'projects':'services'].find(q=>q[r.kind].id===r.entityId),qa=structuredClone(original);qa.draft.revision++;
  const detail={snapshot:{id:'selected-'+r.kind+'-'+r.entityId+'-'+r.locale,resource:r,revision:qa.draft.revision,contentHash:qa.draft.contentHash,dependencyHash:pin.dependencyHash,snapshotHash:'a'.repeat(64),qa},review:{id:'selected-review',outcome:'APPROVED',attestationSetHash:'b'.repeat(64)}};
  const after=replaceSelectedRelease(release,detail),entry=after.entries.find(q=>q.locale===r.locale);
  assert.equal(entry.dependencyVector.resources.find(v=>v.resource.kind===r.kind&&v.resource.entityId===r.entityId).snapshotId,detail.snapshot.id);
  assert.deepEqual(after.entries.filter(q=>q.locale!==r.locale),release.entries.filter(q=>q.locale!==r.locale));
 }
});
