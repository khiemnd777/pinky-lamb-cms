import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {rmSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {releaseBytesFixture} from './helpers/localized-release-fixture.mjs';
import {planMultilingualSiteExport,createMultilingualSiteHandler} from '../scripts/export-multilingual-site-local.mjs';
import {CMS_ROOT,digest,writeExclusive,writeJsonExclusive} from '../scripts/multilingual-release-files.mjs';
import {PUBLIC_ASSET_CACHE_CONTROL,PUBLIC_DOCUMENT_CACHE_CONTROL} from '../scripts/public-cache-policy.mjs';
import {previousWebsitePointer} from '../scripts/local-website-pointer.mjs';

function writePlan(plan){
 for(const file of plan.files)writeExclusive(plan.relativeRoot+'/'+file.relative,file.bytes);
 writeJsonExclusive(plan.relativeRoot+'/manifest.json',plan.manifest);
 return {relativeRoot:plan.relativeRoot,manifestSha256:digest(Buffer.from(JSON.stringify(plan.manifest)+'\n'))};
}
function call(handler,url,{method='GET',etag}={}){
 const result={};handler({method,url,headers:{host:'127.0.0.1:4189',...(etag?{'if-none-match':etag}:{})}},{writeHead(status,headers){result.status=status;result.headers=headers;},end(body){result.body=body;}});return result;
}

test('versioned public assets, HTML validation and retained release bytes survive a website switch',()=>{
 const id='cache-'+randomUUID(),old=planMultilingualSiteExport(releaseBytesFixture(),id+'-old'),next=planMultilingualSiteExport(releaseBytesFixture(),id+'-new');
 const publicHtml=old.files.find(file=>file.relative==='index.html').bytes.toString();
 assert.match(publicHtml,/href="\/assets\/cache\/[a-f0-9]{64}\.css"/);
 assert.match(publicHtml,/src="\/assets\/cache\/[a-f0-9]{64}\.js"/);
 assert.match(publicHtml,/property="og:image" content="\/assets\/cache\/[a-f0-9]{64}\.webp"/);
 assert.match(publicHtml,/href="\/assets\/cache\/[a-f0-9]{64}\.pdf#page=10"/);
 assert.doesNotMatch(publicHtml,/(?:src|href)="(?:styles\.css|assets\/full-site-qa\.js)"/);
 const cachedStyle=old.files.find(file=>file.relative.startsWith('assets/cache/')&&file.mimeType==='text/css');
 const replacement=Buffer.concat([cachedStyle.bytes,Buffer.from('\n/* changed cache test style */')]);
 const changedPath='assets/cache/'+digest(replacement)+'.css';
 next.files=next.files.filter(file=>file.relative!==cachedStyle.relative);
 next.files.push({...cachedStyle,relative:changedPath,bytes:replacement});
 const styleEntry=next.manifest.files.find(file=>file.path===cachedStyle.relative);
 styleEntry.path=changedPath;styleEntry.sha256=digest(replacement);styleEntry.sizeBytes=replacement.length;
 const nextDocument=next.files.find(file=>file.relative==='index.html');
 nextDocument.bytes=Buffer.from(nextDocument.bytes.toString().replaceAll('/'+cachedStyle.relative,'/'+changedPath).replace('</title>',' · changed</title>'));
 const htmlEntry=next.manifest.files.find(file=>file.path==='index.html');
 htmlEntry.sha256=digest(nextDocument.bytes);htmlEntry.sizeBytes=nextDocument.bytes.length;
 const oldArtifact=writePlan(old),nextArtifact=writePlan(next);
 try{
  const before=createMultilingualSiteHandler(oldArtifact),after=createMultilingualSiteHandler({...nextArtifact,retainedArtifacts:[oldArtifact]});
  const first=call(before,'/');assert.equal(first.status,200);assert.equal(first.headers['Cache-Control'],PUBLIC_DOCUMENT_CACHE_CONTROL);
  assert.equal(call(before,'/',{etag:first.headers.ETag}).status,304);
  const changed=call(after,'/',{etag:first.headers.ETag});assert.equal(changed.status,200);assert.notEqual(changed.headers.ETag,first.headers.ETag);
  assert.equal(call(after,'/',{etag:changed.headers.ETag}).status,304);
  assert.equal(call(before,'/',{etag:changed.headers.ETag}).status,200,'rollback revalidates the old document');
  const oldStyle=call(after,'/'+cachedStyle.relative);assert.equal(oldStyle.status,200);assert.equal(oldStyle.headers['Cache-Control'],PUBLIC_ASSET_CACHE_CONTROL);assert.deepEqual(oldStyle.body,cachedStyle.bytes);
  const currentStyle=call(after,'/'+changedPath);assert.equal(currentStyle.status,200);assert.deepEqual(currentStyle.body,replacement);
  assert.equal(call(after,'/styles.css').headers['Cache-Control'],'no-store');
  assert.equal(call(after,'/assets/cache/'+'0'.repeat(64)+'.css').status,404);
  const moduleEntry=old.manifest.cacheAliases.find(alias=>alias.source.endsWith('/site-locale.mjs'));
  assert.ok(moduleEntry);assert.equal(call(before,'/'+moduleEntry.path).status,200);
  const cachedScript=old.files.find(file=>file.relative.startsWith('assets/cache/')&&file.mimeType==='text/javascript');
  assert.match(cachedScript.bytes.toString(),new RegExp('./'+path.basename(moduleEntry.path).replaceAll('.','\\.')));
  writeFileSync(path.join(CMS_ROOT,old.relativeRoot,cachedStyle.relative),'changed bytes');
  assert.equal(call(after,'/'+cachedStyle.relative).status,409,'a corrupted retained asset fails closed');
 }finally{rmSync(path.join(CMS_ROOT,'.local/releases/multilingual-001',id+'-old'),{recursive:true});rmSync(path.join(CMS_ROOT,'.local/releases/multilingual-001',id+'-new'),{recursive:true});}
});

test('selected publication preserves unaffected locale HTML and its original digest',()=>{
 const bundle=releaseBytesFixture(),before=planMultilingualSiteExport(bundle,'cache-preserve-before');
 const oldVi=before.files.find(file=>file.relative==='vi/index.html').bytes;
 const after=planMultilingualSiteExport(bundle,'cache-preserve-after',{preserveDocuments:{'vi/index.html':oldVi}});
 const nextVi=after.files.find(file=>file.relative==='vi/index.html');
 assert.deepEqual(nextVi.bytes,oldVi);
 assert.equal(after.manifest.files.find(file=>file.path==='vi/index.html').sha256,digest(oldVi));
 assert.throws(()=>planMultilingualSiteExport(bundle,'cache-preserve-invalid',{preserveDocuments:{'../private.html':oldVi}}));
});

test('rollback retains the superseded release for browsers that cached its HTML',()=>{
 const old={relativeRoot:'.local/releases/multilingual-001/old/public',manifestSha256:'a'.repeat(64)};
 const next={relativeRoot:'.local/releases/multilingual-001/next/public',manifestSha256:'b'.repeat(64)};
 const pointer={port:4189,activation:false,artifact:next,previous:old,retainedArtifacts:[old]};
 const rolled=previousWebsitePointer(pointer,{releaseId:'old',snapshotSetHash:'old-hash'},'now');
 assert.deepEqual(rolled.artifact,old);
 assert.deepEqual(rolled.retainedArtifacts,[old,next]);
});
