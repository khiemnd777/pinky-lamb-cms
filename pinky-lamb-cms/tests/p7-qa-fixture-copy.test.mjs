import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {p7QaFixture,readP7ResourceBytes} from './helpers/p7-qa-fixture.mjs';
import {p7TemplateData,p7QaCopy} from './helpers/p7-qa-copy.mjs';
import {parseLocalizedReleaseBundle} from '../contracts/localized-review-records.mjs';
import {releaseSnapshotSetHash} from '../cms-api/localized-eligibility.mjs';
import {planMultilingualSiteExport} from '../scripts/export-multilingual-site-local.mjs';
import {FULL_SITE_COPY} from '../preview/full-site-locale-copy.mjs';

const headingHtml=(html,id)=>new RegExp('<h2 id="'+id+'"[^>]*>([\\s\\S]*?)</h2>').exec(html)[1];
test('P7 retains pinned English headings, emphasis and original entity titles in all three locales',()=>{
 const bundle=p7QaFixture(),entries=parseLocalizedReleaseBundle(bundle.release).entries,template=p7TemplateData(),baseline=readFileSync(new URL('../public-baseline/index.html',import.meta.url),'utf8');
 assert.equal(bundle.qaFixture,true);assert.equal(bundle.release.snapshotSetHash,releaseSnapshotSetHash(entries));
 const plan=planMultilingualSiteExport(bundle,'p7-template-title-unit');
 for(const qa of entries){
  const html=plan.files.find(file=>file.relative===(qa.locale==='en'?'':qa.locale+'/')+'index.html').bytes.toString();
  for(const id of ['work-title','services-title','about-title','ip-title','contact-title'])assert.equal(headingHtml(html,id),headingHtml(baseline,id),qa.locale+' '+id);
  assert.deepEqual(qa.hero.draft.content.heading.lines,[[{text:'Big ideas.'}],[{text:'Lovely '},{text:'impact.',emphasis:'ACCENT'}]]);
  assert.deepEqual(qa.workServices.projects.map(part=>part.project.title),template.projects.map(part=>part.title));
  assert.deepEqual(qa.workServices.services.map(part=>part.service.title),template.services.map(part=>part.title));
  assert.deepEqual(qa.workServices.projects.map(part=>part.project.client),template.projects.map(part=>part.client));
  assert.deepEqual(qa.workServices.projects.map(part=>part.credential.page),template.projects.map(part=>part.sourcePage));
  assert.equal(qa.workServices.projects[0].project.cover.assetId,'wayfair-summit-2026');
  assert.equal(qa.workServices.projects[1].project.cover.assetId,'sony-ult-2025');
  assert.equal(qa.groups.about.draft.content.experienceLabel,'Years of creative\n& production experience.');
  assert.match(html,/<h3>SCOPE OF WORK<\/h3>/);
  const text=JSON.stringify([qa.hero,...Object.values(qa.groups),...Object.values(qa.workServices.sections),...qa.workServices.projects,...qa.workServices.services].map(part=>part.draft.content));
  assert.doesNotMatch(text,/日本語 見出し|日本語の説明|Nội dung\\nđã lưu|Complete saved summary|Source scope|Sample project \d/);
  if(qa.locale!=='ja')assert.doesNotMatch(text,/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u);
  assert.equal(qa.workServices.projects.length,8);assert.equal(qa.workServices.services.length,6);
 }
 assert.notEqual(entries[0].hero.draft.content.description[0].text,entries[1].hero.draft.content.description[0].text,'body descriptions still follow locale');
});

test('English editorial marks stay fixed while action and form labels remain localized',()=>{
 for(const locale of ['en','vi','ja'])for(const key of ['aboutEyebrow','ipEyebrow','contactEyebrow','ipSticker','heroCredit','reelOverline','scroll'])assert.equal(FULL_SITE_COPY[locale][key],FULL_SITE_COPY.en[key]);
 assert.equal(FULL_SITE_COPY.vi.openMenu,'Mở menu');assert.equal(FULL_SITE_COPY.ja.openMenu,'メニューを開く');
 assert.equal(FULL_SITE_COPY.en.contactEyebrow,"LET'S TALK");
});

test('separate long-copy fixtures keep English titles and leave the normal reference fixture unchanged',()=>{
 const normal=p7QaFixture(),long=p7QaFixture({longCopy:true});
 for(const qa of long.release.entries){
  assert.match(qa.workServices.projects[0].project.title,/^(Long sample title ){6}1$/);
  assert.doesNotMatch(qa.workServices.projects[0].project.title,/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u);
 }
 assert.equal(planMultilingualSiteExport(long,'p7-long-copy-unit').manifest.qaFixture,true);
 assert.equal(normal.release.entries[0].workServices.projects[0].project.title,'Wayfair Global Selling Vietnam Summit');
});

test('P7 uses the original PNG favicon bytes and link for every locale and fixture variant',()=>{
 const expected=readFileSync(new URL('../public-baseline/assets/favicon.png',import.meta.url));
 for(const longCopy of [false,true]){
  const bundle=p7QaFixture({longCopy}),plan=planMultilingualSiteExport(bundle,'p7-favicon-unit-'+longCopy);
  assert.deepEqual(Buffer.from(bundle.files.find(file=>file.path==='assets/favicon.png').base64,'base64'),expected);
  assert.equal(bundle.files.some(file=>file.path==='assets/favicon.webp'),false,'no sample-image favicon alias');
  for(const qa of bundle.release.entries){
   const favicon=qa.resources.find(resource=>resource.id==='favicon'),prefix=qa.locale==='en'?'':qa.locale+'/';
   assert.equal(favicon.path,'assets/favicon.png');assert.equal(favicon.mimeType,'image/png');
   assert.equal(favicon.sha256,'fa1747f42e462ec10b01ae5c81ea7be0ce4b41157aef0ef1ca904a905a893adc');
   const html=plan.files.find(file=>file.relative===prefix+'index.html').bytes.toString();
   assert.match(html,/<link rel="icon" href="\/assets\/cache\/fa1747f42e462ec10b01ae5c81ea7be0ce4b41157aef0ef1ca904a905a893adc\.png" type="image\/png">/);
   assert.deepEqual(plan.files.find(file=>file.relative==='assets/favicon.png').bytes,expected);
   assert.ok(plan.manifest.cacheAliases.some(alias=>alias.source==='assets/favicon.png'&&alias.path==='assets/cache/'+favicon.sha256+'.png'));
  }
 }
});

test('cleanup retains each native VI entity, faithful translation coverage and clean product metadata',()=>{
 const template=p7TemplateData(),bundle=p7QaFixture(),plan=planMultilingualSiteExport(bundle,'p7-cleanup-unit');
 const vi=bundle.release.entries.find(entry=>entry.locale==='vi');
 for(const project of template.projects){const actual=vi.workServices.projects.find(part=>part.project.id===project.id).project;for(const field of ['eyebrow','summary','scope'])assert.deepEqual(actual[field],project[field],project.id+' '+field);}
 for(const service of template.services){const actual=vi.workServices.services.find(part=>part.service.id===service.id).service;for(const field of ['titleVi','summary','scope'])assert.deepEqual(actual[field],service[field],service.id+' '+field);}
 for(const qa of bundle.release.entries){
  const prefix=qa.locale==='en'?'':qa.locale+'/',html=plan.files.find(file=>file.relative===prefix+'index.html').bytes.toString(),display=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
  assert.match(html,/<title>Pinky Lamb — Creative, Media &amp; Events<\/title>/);
  assert.match(html,/<meta property="og:title" content="Pinky Lamb — Big ideas\. Lovely impact\."/);
  assert.doesNotMatch(display,/\[QA fixture\]|QA SAMPLE|MẪU QA|QAサンプル|Local QA sample|Bản mẫu QA|ローカルQA|Sample service|Sample project|Sample planning|Sample production|dịch vụ mẫu|サンプル/);
  assert.match(html,/A LITTLE CUTE\.<br>A LOT OF CREATIVE\./);
  assert.match(html,/The house of<br><strong>all cutest things\.<\/strong>/);
  assert.match(html,/PINKY LAMB SHOWREEL \/ 2025/);
  assert.match(html,/noindex,nofollow/);
  assert.equal(new Set(qa.workServices.projects.map(part=>part.project.summary)).size,8);
  assert.equal(new Set(qa.workServices.services.map(part=>part.service.summary)).size,6);
  for(const part of qa.workServices.projects)assert.equal(part.project.scope.length,template.projects.find(project=>project.id===part.project.id).scope.length);
  for(const part of qa.workServices.services)assert.equal(part.service.scope.length,template.services.find(service=>service.id===part.service.id).scope.length);
 }
 assert.deepEqual(p7QaCopy('vi').hero.description,[{text:'Từ ý tưởng thương hiệu đến phim, truyền thông và sự kiện. Chúng tôi biến sáng tạo thành những trải nghiệm đáng nhớ — với một chút '},{text:'Pinky',emphasis:'STRONG'},{text:'.'}]);
 assert.equal(plan.manifest.qaFixture,true,'clean presentation retains fixture identity and activation restrictions');
});

test('missing or mismatched media cannot silently resolve to a generic Hero image',()=>{
 assert.throws(()=>readP7ResourceBytes({id:'unknown-image',path:'assets/missing.webp',mimeType:'image/webp'}),/exact baseline pin/);
 assert.throws(()=>readP7ResourceBytes({id:'favicon',path:'assets/favicon.webp',mimeType:'image/webp'}),/exact baseline pin/);
 assert.throws(()=>readP7ResourceBytes({id:'asset-image-g01',path:'assets/not-the-hero.webp',mimeType:'image/webp'}),/alias identity/);
 assert.throws(()=>readP7ResourceBytes({id:'favicon',path:'assets/favicon.png',mimeType:'image/webp'}),/exact baseline pin/);
});
