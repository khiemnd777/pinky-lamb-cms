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


test('selected About publication accepts only Showreel source changes and keeps other locales frozen',async()=>{
 const {mergeLocalizedGroup}=await import('../contracts/group-localization.mjs');
 const {release}=releaseBytesFixture(),before=structuredClone(release),full=release.entries[0],qa=structuredClone(full.groups.about),old=qa.base.source.showreel;
 qa.base.source.showreel={sourceType:'YOUTUBE',videoId:'M7lc1UVf-VE',title:old.title,poster:old.poster};qa.base.dependencyHash=hash(qa.base.source);qa.draft.dependencyHash=qa.base.dependencyHash;qa.draft.revision++;qa.group=mergeLocalizedGroup('about',qa.base.source,qa.draft.content);
 const video=qa.mediaSlots.find(s=>s.slotId==='about/showreel');qa.mediaSlots=qa.mediaSlots.filter(s=>s!==video);qa.resources=qa.resources.filter(r=>r.id!==video.resourceId);
 const detail={snapshot:{id:'selected-youtube',resource:{kind:'group',entityId:'about',locale:'en'},revision:qa.draft.revision,dependencyHash:qa.base.dependencyHash,contentHash:qa.draft.contentHash,snapshotHash:'a'.repeat(64),qa},review:{id:'review-youtube',outcome:'APPROVED',attestationSetHash:'b'.repeat(64)}};
 const after=replaceSelectedRelease(release,detail);assert.equal(after.entries[0].groups.about.group.showreel.sourceType,'YOUTUBE');assert.deepEqual(after.entries.slice(1),before.entries.slice(1));assert.deepEqual(after.entries[0].hero,before.entries[0].hero);assert.deepEqual(after.entries[0].workServices,before.entries[0].workServices);
 const changed=structuredClone(detail);changed.snapshot.qa.base.source.section.lead+='unrelated change';changed.snapshot.qa.group=mergeLocalizedGroup('about',changed.snapshot.qa.base.source,changed.snapshot.qa.draft.content);assert.throws(()=>replaceSelectedRelease(release,changed),/phụ thuộc/);
});
