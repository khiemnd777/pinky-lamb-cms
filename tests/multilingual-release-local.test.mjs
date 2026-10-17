import test from 'node:test';
import assert from 'node:assert/strict';
import {publicPath,runId} from '../scripts/multilingual-release-files.mjs';
import {planMultilingualSiteExport,createMultilingualSiteHandler} from '../scripts/export-multilingual-site-local.mjs';
import {activateMultilingualSite,startStandaloneReleaseHosting} from '../scripts/activate-multilingual-site-local.mjs';
test('public release path allowlist excludes private data and traversal',()=>{for(const value of ['../admin/auth.mjs','assets/../secret','admin/index.html','.local/backup.json','assets/raw.json','vi/../../index.html'])assert.throws(()=>publicPath(value));assert.equal(publicPath('ja/assets/hero.webp'),'ja/assets/hero.webp');assert.throws(()=>runId('../retained'));});
test('release composer refuses saved-draft or incomplete transport before output',()=>{assert.throws(()=>planMultilingualSiteExport({release:{contractRevision:1,kind:'MULTILINGUAL_SITE_RELEASE_BUNDLE',mode:'QA_SAVED',entries:[],snapshotSetHash:'a'.repeat(64)},files:[]},'no-output'));});
test('Hosting source approval is insufficient for activation; no controller calls',async()=>{let actions=0;await assert.rejects(activateMultilingualSite({kind:'MULTILINGUAL_HOSTING_ACTIVATION',port:5010},{controller:{identity:async()=>{actions++;}},journal:{append:async()=>{actions++;}}}),/approval/);assert.equal(actions,0);await assert.rejects(startStandaloneReleaseHosting({relativeRoot:'.local/not-active',manifestSha256:'a'.repeat(64)}),/approval/);});

// Imported fixture producers guard their test registrations against import execution.
import {CMS_ROOT,digest,writeJsonExclusive,writeExclusive} from '../scripts/multilingual-release-files.mjs';
import {canonicalJson} from '../contracts/draft.mjs';
import {releaseSnapshotSetHash} from '../cms-api/localized-eligibility.mjs';
import {rmSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {releaseBytesFixture} from './helpers/localized-release-fixture.mjs';

test('real full-release composer passes frozen SEO closure to all three real renderer calls',()=>{
 const bundle=releaseBytesFixture(),result=planMultilingualSiteExport(bundle,'seo-closure-regression');
 for(const locale of ['en','vi','ja']){const name=locale==='en'?'index.html':`${locale}/index.html`,html=result.files.find(file=>file.relative===name).bytes.toString('utf8'),canonical=`http://127.0.0.1:5010/${locale==='en'?'':locale+'/'}`;assert.ok(html.includes(`<link rel="canonical" href="${canonical}">`));for(const language of ['en','vi','ja','x-default'])assert.ok(html.includes(`hreflang="${language}"`));assert.ok(html.includes('hero-orbit'));}
 assert.equal(result.manifest.identities.length,3);assert.equal(result.manifest.snapshotSetHash,releaseSnapshotSetHash(bundle.release.entries));
});
function hostingFailureFixture(stateAfterStop){
 const id='hosting-regression-'+randomUUID(),relativeRoot=`.local/releases/multilingual-001/${id}/public`,manifest={contractRevision:1,kind:'MULTILINGUAL_SITE_RELEASE',compatibility:[],files:['index.html','vi/index.html','ja/index.html','sitemap.xml'].map(name=>({path:name,sizeBytes:1,sha256:digest('x'),mimeType:name==='sitemap.xml'?'application/xml':'text/html'}))},bytes=JSON.stringify(manifest)+'\n';
 writeJsonExclusive(relativeRoot+'/manifest.json',manifest);for(const file of manifest.files)writeExclusive(relativeRoot+'/'+file.path,Buffer.from('x'));
 const identity={service:'hosting',host:'127.0.0.1',port:5010,projectId:'demo-pinky-lamb-cms',independentlyManaged:true,pid:12001,startIdentity:'owned-original'},before={resources:[{path:'styles.css',sha256:'a'.repeat(64)}]},events=[],calls=[];
 let listener={state:'PRESENT',identity};
 const plan={contractRevision:1,kind:'MULTILINGUAL_HOSTING_ACTIVATION',activationId:id,relativeRoot,manifestSha256:digest(bytes),currentHosting:identity,beforeResources:before.resources,port:5010};
 const controller={identity:async()=>identity,inspectHosting:async()=>listener,capture:async()=>before,stopHosting:async value=>{calls.push(['stop',value]);listener=typeof stateAfterStop==='function'?stateAfterStop(identity):stateAfterStop;throw Error('Stop reported failure');},startRelease:async()=>{calls.push(['start']);throw Error('Unexpected start');},verifyRelease:async()=>{calls.push(['verify']);},restoreHosting:async captured=>{assert.deepEqual(captured,before);calls.push(['restore']);listener={state:'PRESENT',identity};}};
 return {plan,options:{approval:{action:'ACTIVATE_LOCAL_5010',planHash:digest(canonicalJson(plan))},controller,journal:{append:async value=>events.push(value)}},events,calls,cleanup:()=>rmSync(path.join(CMS_ROOT,'.local/releases/multilingual-001',id),{recursive:true})};
}
test('Hosting stopped then rejection reconciles ABSENT and restores the captured original',async()=>{const f=hostingFailureFixture({state:'ABSENT'});try{await assert.rejects(activateMultilingualSite(f.plan,f.options),/Stop reported failure/);assert.deepEqual(f.calls.map(call=>call[0]),['stop','restore']);assert.deepEqual(f.events.map(event=>event.state),['BEFORE_CAPTURED','STOP_ATTEMPTED','ACTIVATION_FAILED','RESTORED']);}finally{f.cleanup();}});
test('Hosting stop rejection with original still present leaves it running without restore or second stop',async()=>{const f=hostingFailureFixture(identity=>({state:'PRESENT',identity}));try{await assert.rejects(activateMultilingualSite(f.plan,f.options),/Stop reported failure/);assert.deepEqual(f.calls.map(call=>call[0]),['stop']);assert.equal(f.events.at(-1).state,'ORIGINAL_HOSTING_PRESENT');}finally{f.cleanup();}});
test('foreign or Unknown listener after stop failure blocks every start, kill and restore',async()=>{for(const state of [identity=>({state:'PRESENT',identity:{...identity,pid:13002,startIdentity:'foreign'}}),{state:'UNKNOWN'}]){const f=hostingFailureFixture(state);try{await assert.rejects(activateMultilingualSite(f.plan,f.options),/foreign or Unknown/);assert.deepEqual(f.calls.map(call=>call[0]),['stop']);assert.equal(f.events.at(-1).state,'RESTORE_BLOCKED');assert.equal(f.events.at(-1).reason,typeof state==='function'?'LISTENER_IDENTITY_CHANGED':'LISTENER_STATE_UNKNOWN');}finally{f.cleanup();}}});

import {XMLParser,XMLValidator} from 'fast-xml-parser';
test('frozen sitemap has exactly three canonical URLs and complete locale/x-default alternates',()=>{
 const result=planMultilingualSiteExport(releaseBytesFixture(),'sitemap-regression'),file=result.files.find(entry=>entry.relative==='sitemap.xml'),xml=file.bytes.toString('utf8');
 assert.equal(XMLValidator.validate(xml),true);const parsed=new XMLParser({ignoreAttributes:false}).parse(xml),urls=parsed.urlset.url,expected=['http://127.0.0.1:5010/','http://127.0.0.1:5010/vi/','http://127.0.0.1:5010/ja/'];
 assert.equal(parsed.urlset['@_xmlns'],'http://www.sitemaps.org/schemas/sitemap/0.9');assert.equal(parsed.urlset['@_xmlns:xhtml'],'http://www.w3.org/1999/xhtml');assert.deepEqual(urls.map(entry=>entry.loc),expected);
 for(const entry of urls){const links=entry['xhtml:link'];assert.deepEqual(links.map(link=>link['@_hreflang']),['en','vi','ja','x-default']);assert.deepEqual(links.map(link=>link['@_href']),[...expected,expected[0]]);assert.ok(links.every(link=>link['@_rel']==='alternate'));for(const href of [entry.loc,...links.map(link=>link['@_href'])]){const url=new URL(href);assert.equal(url.origin,'http://127.0.0.1:5010');assert.equal(url.search,'');assert.equal(url.hash,'');}}
 const meta=result.manifest.files.find(entry=>entry.path==='sitemap.xml');assert.equal(meta.mimeType,'application/xml');assert.equal(meta.sha256,digest(file.bytes));assert.equal(meta.sizeBytes,file.bytes.length);assert.equal(publicPath('sitemap.xml'),'sitemap.xml');for(const name of ['private.xml','assets/sitemap.xml','vi/sitemap.xml','ja/sitemap.xml','sitemap.xml/../index.html'])assert.throws(()=>publicPath(name));
});
test('manifest handler serves only the hashed root sitemap and rejects traversal, unknown XML and changed bytes',()=>{
 const id='sitemap-handler-'+randomUUID(),result=planMultilingualSiteExport(releaseBytesFixture(),id),root=result.relativeRoot,file=result.files.find(entry=>entry.relative==='sitemap.xml'),manifestBytes=JSON.stringify(result.manifest)+'\n';
 writeExclusive(root+'/sitemap.xml',file.bytes);writeJsonExclusive(root+'/manifest.json',result.manifest);
 try{const handler=createMultilingualSiteHandler({relativeRoot:root,manifestSha256:digest(manifestBytes)}),call=(url,method='GET')=>{const response={};handler({method,url,headers:{host:'127.0.0.1:4189'}},{writeHead(status,headers){response.status=status;response.headers=headers;},end(body){response.body=body;}});return response;};
  const get=call('/sitemap.xml');assert.equal(get.status,200);assert.equal(get.headers['Content-Type'],'application/xml');assert.equal(get.headers['X-Content-Type-Options'],'nosniff');assert.equal(digest(get.body),digest(file.bytes));assert.equal(call('/sitemap.xml','HEAD').body,undefined);
  for(const url of ['/../sitemap.xml','/%2e%2e/sitemap.xml','/assets/../sitemap.xml'])assert.equal(call(url).status,400);for(const url of ['/private.xml','/assets/sitemap.xml','/vi/sitemap.xml'])assert.equal(call(url).status,404);
  writeFileSync(path.join(CMS_ROOT,root,'sitemap.xml'),Buffer.from('changed fixture'));assert.equal(call('/sitemap.xml').status,409);
 }finally{rmSync(path.join(CMS_ROOT,'.local/releases/multilingual-001',id),{recursive:true});}
});
