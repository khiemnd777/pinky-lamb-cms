import nodeTest from 'node:test';
import {fileURLToPath} from 'node:url';
const test=process.argv[1]===fileURLToPath(import.meta.url)?nodeTest:()=>{};
import assert from 'node:assert/strict';
import {renderLocalizedHeroDocument,validateHeroQaRelationships} from '../preview/hero-localization-renderer.mjs';
import {HERO_PRESENTATION_ID,HERO_PRESENTATION_RESOURCE_ID,HERO_PRESENTATION_CSS,HERO_PRESENTATION_SHA256,HERO_PRESENTATION_CSP_HASH} from '../preview/hero-localization-presentation.mjs';
import {base,translated} from './hero-localization-contract.test.mjs';
import {mergeLocalizedHero} from '../contracts/hero-localization.mjs';
import {hashHeroValue} from '../cms-api/hero-localization-context.mjs';
export function qaFixture(locale='en'){
 const content=translated(),hero=mergeLocalizedHero(base.hero,content),draft={contractRevision:1,draftId:'home-v3',locale,revision:1,baseRevision:base.revision,baseContentHash:base.contentHash,contentHash:hashHeroValue(content),content,updatedAt:'2026-10-16T00:00:00.000Z'};
 const resources=[{id:hero.image.assetId,path:'assets/hero.png',url:'http://127.0.0.1:5010/assets/hero.png',mimeType:'image/png',sizeBytes:3,sha256:'a'.repeat(64),width:200,height:200},{id:'styles',path:'styles.css',url:'http://127.0.0.1:5010/styles.css',mimeType:'text/css',sizeBytes:3,sha256:'b'.repeat(64)}];return {contractRevision:1,kind:'LOCALIZED_HERO_QA',draft,hero,resources};
}
test('three locale Hero-only outputs are inert noindex with safe copy',()=>{for(const locale of ['en','vi','ja']){const html=renderLocalizedHeroDocument(qaFixture(locale),{mode:'QA_EXPORT'});assert.match(html,new RegExp(`<html lang="${locale}">`));assert.match(html,/noindex,nofollow/);assert.match(html,/Bản thử Hero — chưa xuất bản/);assert.doesNotMatch(html,/<script\b|<a\b[^>]*href=|<form\b|onclick=/);assert.equal((html.match(/<h1 /g)||[]).length,1);assert.match(html,/src="assets\/hero.png"/);}});
test('HTML-like text is escaped and QA relationship tamper rejects',()=>{const qa=qaFixture('ja');qa.draft.content.heading.lines=[[{text:'<img src=x onerror=alert(1)>'}]];qa.hero.heading=qa.draft.content.heading;const html=renderLocalizedHeroDocument(qa);assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);assert.doesNotMatch(html,/<img src=x/);qa.hero.image.assetId='unknown';assert.throws(()=>validateHeroQaRelationships(qa));});
test('private CSP and URI schemes remain fenced',()=>{const qa=qaFixture();assert.throws(()=>renderLocalizedHeroDocument(qa,{resourceUrls:{[qa.hero.image.assetId]:'javascript:alert(1)'}}));const html=renderLocalizedHeroDocument(qa);assert.match(html,/script-src &#39;none&#39;/);assert.match(html,/connect-src &#39;none&#39;/);assert.doesNotMatch(html,/allow-scripts|allow-same-origin|postMessage/);qa.resources[0].url='https://example.com/a.png';assert.throws(()=>renderLocalizedHeroDocument(qa));});
test('Hero viewport contains decorative horizontal paint without hiding translated content',()=>{
 for(const locale of ['en','vi','ja'])for(const mode of ['PRIVATE','QA_EXPORT']){
  const qa=qaFixture(locale);qa.draft.content.heading.lines=[[{text:'日本語 Tiếng Việt English'}]];qa.hero.heading=qa.draft.content.heading;
  const html=renderLocalizedHeroDocument(qa,{mode});
  assert.match(html,/<main style="overflow-x:clip">/,'clip only Hero viewport paint');assert.doesNotMatch(html,/<(?:html|body)[^>]*style="[^"]*overflow/,'do not hide whole-document content or vertical scrolling');
  assert.match(html,/日本語 Tiếng Việt English/);assert.ok(html.includes(qa.hero.eyebrow));assert.ok(html.includes(qa.hero.primaryAction.label));assert.ok(html.includes(qa.hero.image.alt));
  assert.match(html,/class="hero-spark"/);assert.match(html,/class="hero-orbit"/);assert.doesNotMatch(html,/<style\b|<script\b/);
 }
});

export function qaV2Fixture(locale='en'){
 const qa=qaFixture(locale);qa.contractRevision=2;qa.presentation={id:HERO_PRESENTATION_ID,brand:{name:'Pinky Lamb',tagline:'Shared tagline',logoResourceId:qa.hero.image.assetId},stylesheetResourceId:HERO_PRESENTATION_RESOURCE_ID};const bytes=Buffer.from(HERO_PRESENTATION_CSS);qa.resources.push({id:HERO_PRESENTATION_RESOURCE_ID,path:'assets/hero-presentation-v1.css',sourceKind:'APPLICATION_INLINE',mimeType:'text/css',sizeBytes:bytes.length,sha256:HERO_PRESENTATION_SHA256,inlineBase64:bytes.toString('base64')},...['abril-fatface-400','montserrat-400','montserrat-600','montserrat-700','montserrat-800'].map(id=>({id,path:`assets/${id}.woff`,url:`http://127.0.0.1:5010/assets/${id}.woff`,mimeType:'font/woff',sizeBytes:3,sha256:'c'.repeat(64)})));return qa;
}
test('QA2 renders approved composition and identical fixed CSS in private/export; QA1 stays legacy',()=>{for(const locale of ['en','vi','ja']){const qa=qaV2Fixture(locale),privateHtml=renderLocalizedHeroDocument(qa),exportHtml=renderLocalizedHeroDocument(qa,{mode:'QA_EXPORT'});assert.match(privateHtml,/data-presentation="MULTILINGUAL_HERO_V1"/);assert.match(privateHtml,/class="lhv2-brand"/);assert.match(privateHtml,/class="lhv2-content"/);assert.ok(privateHtml.includes(HERO_PRESENTATION_CSS));assert.ok(privateHtml.includes(HERO_PRESENTATION_CSP_HASH));assert.match(exportHtml,/href="assets\/hero-presentation-v1.css"/);assert.doesNotMatch(exportHtml,/<style|<script|<a\s|onclick=/);assert.equal((exportHtml.match(/<h1 /g)||[]).length,1);assert.doesNotMatch(privateHtml,/class="hero-spark"|class="hero-orbit"/);}});
test('QA2 rejects stylesheet tamper version downgrade untrusted roles and presentation mismatch',()=>{for(const mutate of [q=>q.resources.find(r=>r.sourceKind).inlineBase64=Buffer.from('body{}').toString('base64'),q=>q.contractRevision=1,q=>q.presentation.brand.extra='private',q=>q.resources.push({...q.resources[0],id:'unknown',path:'assets/unknown.png'}),q=>q.presentation.stylesheetResourceId='styles']){const q=qaV2Fixture();mutate(q);assert.throws(()=>renderLocalizedHeroDocument(q));}});

test('A2 QA2 private permits only exact canonical metadata-bound image data and exports stay relative',()=>{
 for(const mime of ['image/png','image/webp','image/jpeg','image/svg+xml']){
  const q=qaV2Fixture(),r=q.resources[0];r.mimeType=mime;const value=`data:${mime};base64,AQID`,map={[r.id]:value};assert.ok(renderLocalizedHeroDocument(q,{resourceUrls:map}).includes(value));assert.throws(()=>renderLocalizedHeroDocument(q,{mode:'QA_EXPORT',resourceUrls:map}));
  for(const bad of ['data:text/html;base64,AQID','data:image/png,%01%02%03',value+'=',value+'\n',value.replace('AQID','AQI='),'javascript:alert(1)'])assert.throws(()=>renderLocalizedHeroDocument(q,{resourceUrls:{[r.id]:bad}}));
  assert.doesNotMatch(renderLocalizedHeroDocument(q,{mode:'QA_EXPORT'}),/data:image/);
 }
 const q=qaV2Fixture(),r=q.resources[0];r.sizeBytes=1;assert.ok(renderLocalizedHeroDocument(q,{resourceUrls:{[r.id]:'data:image/png;base64,AQ=='}}));assert.throws(()=>renderLocalizedHeroDocument(q,{resourceUrls:{[r.id]:'data:image/png;base64,AR=='}}));
 assert.throws(()=>renderLocalizedHeroDocument(qaFixture(),{resourceUrls:{[r.id]:'data:image/png;base64,AQID'}}));
 const html=renderLocalizedHeroDocument(qaV2Fixture());assert.match(html,/img-src http:\/\/127.0.0.1:5010 blob: data:;/);assert.match(renderLocalizedHeroDocument(qaFixture()),/img-src http:\/\/127.0.0.1:5010 blob:;/);
});
test('A2 exact two-byte padding and nonimage resource substitutions are fenced',()=>{const q=qaV2Fixture(),r=q.resources[0];r.sizeBytes=2;assert.ok(renderLocalizedHeroDocument(q,{resourceUrls:{[r.id]:'data:image/png;base64,AQI='}}));for(const value of ['data:image/png;base64,AQJ=','data:image/png;base64,AQI','data:image/png;base64,AQI=='])assert.throws(()=>renderLocalizedHeroDocument(q,{resourceUrls:{[r.id]:value}}));assert.throws(()=>renderLocalizedHeroDocument(q,{resourceUrls:{styles:'data:image/png;base64,AQI='}}));});
