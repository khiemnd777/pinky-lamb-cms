import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {localizedResourceTransportUrl} from '../preview/localized-resource-transport.mjs';
import {readHeroQaResource} from '../admin/hero-localization-preview.mjs';
import {readProjectQaResource} from '../admin/project-localization-preview.mjs';
import {renderLocalizedProjectDocument} from '../preview/project-localization-renderer.mjs';
import {projectQaFixture} from './project-localization-renderer.test.mjs';
import {renderLocalizedServiceDocument} from '../preview/service-localization-renderer.mjs';
import {serviceQaFixture} from './service-localization-renderer.test.mjs';
import {renderLocalizedWorkServicesDocument} from '../preview/work-services-localization-renderer.mjs';
import {expandedWorkServicesFixture} from './work-services-localization-renderer.test.mjs';
import {renderLocalizedFullSiteDocument} from '../preview/full-site-localization-renderer.mjs';
import {fullSiteFixture} from './full-site-localization-contract.test.mjs';

test(':4189 resolves frozen source identity without rewriting snapshots',()=>{
 const resource={path:'assets/pinky-logo.webp',url:'http://127.0.0.1:5010/assets/pinky-logo.webp'},before=JSON.stringify(resource);
 assert.equal(localizedResourceTransportUrl(resource),'http://127.0.0.1:4189/assets/pinky-logo.webp');
 assert.equal(JSON.stringify(resource),before);
 for(const url of ['http://127.0.0.1:5010/assets/other.webp','http://user@127.0.0.1:5010/assets/pinky-logo.webp','http://127.0.0.1:5010/assets/pinky-logo.webp?x=1','https://example.com/assets/pinky-logo.webp'])assert.throws(()=>localizedResourceTransportUrl({...resource,url}));
});

test(':4189 is the only static fetch target for Hero and project resources',async()=>{
 const bytes=new TextEncoder().encode('RIFFsynthetic'),resource={id:'cover',path:'assets/cover.webp',url:'http://127.0.0.1:5010/assets/cover.webp',mimeType:'image/webp',sizeBytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
 for(const read of [readHeroQaResource,readProjectQaResource]){
  let calls=0;
  assert.deepEqual(await read(resource,{fetchStatic:async(url,options)=>{calls++;assert.equal(url,'http://127.0.0.1:4189/assets/cover.webp');assert.equal(options.redirect,'error');assert.equal(options.credentials,'omit');return new Response(bytes);}}),bytes);
  assert.equal(calls,1);
 }
});

test(':4189 serves project preview CSS while immutable resource descriptors remain intact',()=>{
 const {qa}=projectQaFixture(),before=JSON.stringify(qa),html=renderLocalizedProjectDocument(qa);
 assert.match(html,/http:\/\/127\.0\.0\.1:4189\/styles\.css/);
 assert.doesNotMatch(html,/http:\/\/127\.0\.0\.1:5010/);
 assert.equal(JSON.stringify(qa),before);
 assert.match(html,/script-src &#39;none&#39;|script-src 'none'/);
});

test(':4189 is the website dependency of the durable launcher and CMS browser policy',()=>{
 const runner=readFileSync(new URL('../scripts/run-durable-stack.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(runner,/5010|serve-public-baseline-local/);
 assert.match(runner,/serve-cms-website-local/);
 const html=readFileSync(new URL('../admin/index.html',import.meta.url),'utf8'),csp=html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
 assert.doesNotMatch(csp,/5010/);
 assert.match(csp,/connect-src[^;]*http:\/\/127\.0\.0\.1:4189/);
 assert.match(csp,/object-src 'none'/);
});

test(':4189 serves Service and Work/Services assembly styles without changing frozen QA',()=>{
 for(const locale of ['en','vi','ja'])for(const [qa,render] of [[serviceQaFixture(locale),renderLocalizedServiceDocument],[expandedWorkServicesFixture(locale).qa,renderLocalizedWorkServicesDocument],[fullSiteFixture(locale),renderLocalizedFullSiteDocument]]){
  const before=JSON.stringify(qa),html=render(qa);
  assert.match(html,/href="http:\/\/127\.0\.0\.1:4189\/styles\.css"/);
  assert.doesNotMatch(html,/http:\/\/127\.0\.0\.1:5010/);
  assert.equal(JSON.stringify(qa),before);
 }
});
