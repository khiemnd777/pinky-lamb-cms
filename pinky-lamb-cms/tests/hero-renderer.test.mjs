import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderHero,renderSeo,composeDocument,TEMPLATE_VERSION} from '../preview/hero-renderer.mjs';
const baseline=readFileSync(new URL('../public-baseline/index.html',import.meta.url),'utf8');
const malicious=JSON.parse(readFileSync(new URL('./fixtures/malicious-hero.json',import.meta.url),'utf8'));
const publicAssets={
 'pinky-hero':{id:'pinky-hero',kind:'IMAGE',path:'assets/pinky-hero.webp',width:830,height:900},
 credential:{id:'credential',kind:'PDF',path:'assets/Pinky-Lamb-Credential-2026.pdf'},
 'showreel-2025':{id:'showreel-2025',kind:'VIDEO',path:'assets/showreel-2025.mp4',durationSeconds:65.344}
};
const options={publicAssets,localBaseUrl:'http://127.0.0.1:5010/'};
test('renderer encodes all copy and retains one H1 with fixed emphasis/decoration',()=>{
 const hero=renderHero(malicious,{publicAssets,assetBaseUrl:options.localBaseUrl});
 assert.equal((hero.match(/<h1\b/g)??[]).length,1);assert.match(hero,/id="hero-title"/);assert.match(hero,/hero-spark/);
 assert.match(hero,/&lt;script&gt;/);assert.match(hero,/&amp;/);assert.match(hero,/&quot;/);assert.match(hero,/&#39;/);
 assert.doesNotMatch(hero,/<script\b|<img onerror|<svg onload/);assert.match(hero,/width="830" height="900"/);
 assert.equal(TEMPLATE_VERSION,'m1-hero-split-v1');
});
test('fixed CTA kinds, decorative alt and exact controlled focal numbers',()=>{
 const content=structuredClone(malicious);content.hero.primaryAction={kind:'CREDENTIAL',assetId:'credential',label:'PDF'};content.hero.image={assetId:'pinky-hero',alt:'',isDecorative:true,focalPoint:{x:.123,y:.987}};
 const hero=renderHero(content,{publicAssets,assetBaseUrl:options.localBaseUrl});assert.match(hero,/noopener noreferrer/);assert.match(hero,/Pinky-Lamb-Credential-2026.pdf/);assert.match(hero,/alt=""/);assert.match(hero,/object-position:12.3% 98.7%/);assert.match(hero,/data-showreel/);assert.match(hero,/01:05/);
 for(const change of [c=>c.hero.image.focalPoint.x=Infinity,c=>c.hero.primaryAction.href='javascript:alert(1)']){const invalid=structuredClone(content);change(invalid);assert.throws(()=>renderHero(invalid,{publicAssets,assetBaseUrl:options.localBaseUrl}));}
});
test('static SEO encodes metadata and uses configured local URLs only',()=>{
 const seo=renderSeo(malicious.seo,options);assert.match(seo,/og:image:alt/);assert.match(seo,/http:\/\/127.0.0.1:5010\/assets\/pinky-hero.webp/);assert.match(seo,/&lt;script&gt;/);assert.doesNotMatch(seo,/pinky-lamb.web.app/);
});
test('private composition replaces exact slots, disables activity and preserves other baseline HTML',()=>{
 const html=composeDocument(baseline.replace('<main id="main">','<main id="main"><img ONERROR="alert(1)" src="assets/favicon.png">'),malicious,{...options,mode:'PRIVATE_PREVIEW'});
 assert.equal((html.match(/<h1\b/g)??[]).length,1);assert.equal((html.match(/property="og:image:alt"/g)??[]).length,1);
 assert.doesNotMatch(html,/<script\b|<base\b|<form\b|href="#work"/);assert.match(html,/script-src 'none'/);assert.match(html,/connect-src 'none'/);assert.match(html,/style-src-attr 'unsafe-inline'/);
 assert.doesNotMatch(html,/\sONERROR=/);assert.match(html,/&lt;img onerror=alert\(1\)&gt;/);assert.match(html,/<img src="http:\/\/127.0.0.1:5010\/assets\/favicon.png">/);assert.match(html,/http:\/\/127.0.0.1:5010\/styles.css/);assert.match(html,/<use href="#arrow"/);assert.match(html,/id="work"/);assert.match(html,/id="contact"/);assert.doesNotMatch(html,/https:\/\/pinky-lamb.web.app/);
});
test('QA composition keeps baseline interactions and static saved metadata',()=>{
 const html=composeDocument(baseline,malicious,{...options,mode:'QA_EXPORT'});assert.match(html,/<script src="content.js" defer><\/script>/);assert.match(html,/<script src="app.js" defer><\/script>/);assert.match(html,/id="project-grid"/);assert.match(html,/href="#work"/);assert.match(html,/og:image:alt/);
});
test('duplicate/missing slots, unsafe mappings and nonloopback configuration fail closed',()=>{
 for(const input of [baseline.replace('<title>','<title>Duplicate</title><title>'),baseline.replace(/<meta name="description"[^>]*>/,''),baseline.replace('</head>','<meta property="og:image:alt" content="1"><meta property="og:image:alt" content="2"></head>'),baseline.replace('<section class="hero shell"','<section class="other"')])assert.throws(()=>composeDocument(input,malicious,{...options,mode:'PRIVATE_PREVIEW'}));
 for(const localBaseUrl of ['https://example.com/','http://127.0.0.1:5010/?private=1','http://user@127.0.0.1:5010/','http://127.0.0.1:5010/../private/'])assert.throws(()=>renderSeo(malicious.seo,{publicAssets,localBaseUrl}));
 for(const path of ['../../private.json','assets/%2e%2e/file.png','https://example.com/img.png'])assert.throws(()=>renderHero(malicious,{publicAssets:{...publicAssets,'pinky-hero':{...publicAssets['pinky-hero'],path}},assetBaseUrl:options.localBaseUrl}));
 assert.throws(()=>composeDocument(baseline,malicious,{...options,mode:'UNKNOWN'}));
});
