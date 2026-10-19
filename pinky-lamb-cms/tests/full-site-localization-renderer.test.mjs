import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fullSiteFixture} from './full-site-localization-contract.test.mjs';
import {renderLocalizedFullSiteDocument,validateLocalizedFullSiteQaRelationships,FULL_SITE_QA_STYLE} from '../preview/full-site-localization-renderer.mjs';
test('top links target document origin rather than the moving sticky header',()=>{
 const html=renderLocalizedFullSiteDocument(fullSiteFixture(),{mode:'QA_EXPORT'});
 assert.match(html,/<body id="top" data-localized-mode=/);assert.doesNotMatch(html,/<header[^>]*id="top"/);assert.equal((html.match(/id="top"/g)||[]).length,1);assert.match(html,/href="#top"/);
});
const renderedText=html=>html.replace(/<br>/g,'\n').replace(/<\/?strong>/g,'').replace(/&(?:amp|lt|gt|quot|#39);/g,entity=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"}[entity]));
test('all locales adapt every native section and Hero artwork slot into one complete document',()=>{for(const locale of ['en','vi','ja']){const qa=fullSiteFixture(locale),html=renderLocalizedFullSiteDocument(qa,{mode:'QA_EXPORT'});for(const value of ['site-header','hero shell','hero-orbit','hero-spark','hero-art','pinky-note','scroll-cue','client-strip','work-section','services-section','about-section','ip-section','contact-section','site-footer','footer-wordmark','video-dialog','brief-fallback'])assert.ok(html.includes(`class="${value}`)||html.includes(`id="${value}"`),value);assert.match(html,new RegExp(`<html lang="${locale}"`));assert.equal((html.match(/<h1\b/g)||[]).length,1);const notes=[...html.matchAll(/<span class="note-star">✳<\/span><span>([\s\S]*?)<\/span><svg/g)],leads=[...html.matchAll(/<p class="about-lead">([\s\S]*?)<\/p>/g)];assert.equal(notes.length,1,'one complete Hero note slot');assert.equal(renderedText(notes[0][1]),qa.hero.hero.note,'Hero note retains every line and character');assert.equal(leads.length,1,'one complete About lead slot');assert.equal(renderedText(leads[0][1]),qa.groups.about.group.section.lead,'About lead preserves full text after safe HTML serialization');assert.match(html,/type="module" src="assets\/full-site-qa.js"/);assert.doesNotMatch(html,/lhv2-art|CASE1|LOCAL QA<|cmsLocalized|submittedBy|sourceCatalog/);assert.doesNotMatch(FULL_SITE_QA_STYLE,/\.hero\s|\.hero h1|\.services-heading|\.case-body|font-size:44px/);}});
test('approved release metadata requires the frozen complete three-locale set and remains local noindex',()=>{const qa=fullSiteFixture('vi','APPROVED_RELEASE');assert.throws(()=>renderLocalizedFullSiteDocument(qa,{mode:'QA_EXPORT'}),/SEO closure/);const html=renderLocalizedFullSiteDocument(qa,{mode:'QA_EXPORT',canonicalBaseUrl:'http://127.0.0.1:4189/',availableLocales:['en','vi','ja']});assert.match(html,/<link rel="canonical" href="http:\/\/127\.0\.0\.1:4189\/vi\/">/);assert.match(html,/hreflang="x-default"/);assert.equal((html.match(/rel="alternate"/g)||[]).length,4);assert.match(html,/noindex,nofollow/);assert.throws(()=>renderLocalizedFullSiteDocument(qa,{mode:'QA_EXPORT',canonicalBaseUrl:'https://example.test/',availableLocales:['en','vi','ja']}));});
test('private full-site documents are inert and reject mixed identity, unknown media and resource substitutions',()=>{const qa=fullSiteFixture(),html=renderLocalizedFullSiteDocument(qa);assert.doesNotMatch(html,/<script\b|<a\b[^>]*href=|allow-same-origin|allow-scripts/);assert.match(html,/script-src &#39;none&#39;/);assert.match(html,/form-action &#39;none&#39;/);assert.throws(()=>renderLocalizedFullSiteDocument(qa,{resourceUrls:{unknown:'data:image/png;base64,AA=='}}));assert.throws(()=>renderLocalizedFullSiteDocument(qa,{resourceUrls:{[qa.hero.hero.image.assetId]:'javascript:alert(1)'}}));const mixed=structuredClone(qa);mixed.groups.footer.draft.locale='ja';assert.throws(()=>validateLocalizedFullSiteQaRelationships(mixed));const missing=structuredClone(qa);missing.groups.about.mediaSlots=[];assert.throws(()=>renderLocalizedFullSiteDocument(missing));});

test('brief submission reaches the locale dictionary validation instead of native browser messages',()=>{for(const locale of ['en','vi','ja']){const html=renderLocalizedFullSiteDocument(fullSiteFixture(locale),{mode:'QA_EXPORT'});assert.match(html,/<form id="brief-form" class="brief-form" novalidate /);}});

test('full-site icon references resolve once and retain the original template Play triangle',()=>{
 const baseline=readFileSync(new URL('../public-baseline/index.html',import.meta.url),'utf8'),originalPlay=baseline.match(/<symbol id="play"[\s\S]*?<\/symbol>/)[0];
 for(const locale of ['en','vi','ja'])for(const mode of ['PRIVATE','QA_EXPORT']){
  const html=renderLocalizedFullSiteDocument(fullSiteFixture(locale),{mode}),definitions=[...html.matchAll(/<symbol id="([^"]+)"[^>]*>([\s\S]*?)<\/symbol>/g)];
  for(const reference of html.matchAll(/<use href="#([^"]+)"/g)){
   const matches=definitions.filter(definition=>definition[1]===reference[1]);
   assert.equal(matches.length,1,locale+' '+mode+' icon '+reference[1]);assert.match(matches[0][2],/<path\b[^>]*\bd="[^"]+"/);
  }
  assert.ok(html.includes(originalPlay),'Play artwork matches approved template');
  assert.equal([...html.matchAll(/<use href="#play"/g)].length,2,'Hero and banner both retain Play icons');
 }
});
