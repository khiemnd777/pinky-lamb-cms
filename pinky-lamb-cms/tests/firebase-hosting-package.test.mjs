import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {rmSync,readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {releaseBytesFixture} from './helpers/localized-release-fixture.mjs';
import {planMultilingualSiteExport} from '../scripts/export-multilingual-site-local.mjs';
import {planFirebaseHostingPackage,writeFirebaseHostingPackage} from '../scripts/prepare-firebase-hosting-package.mjs';
import {CMS_ROOT,digest,writeExclusive,writeJsonExclusive} from '../scripts/multilingual-release-files.mjs';

function writePlan(plan){
 for(const file of plan.files)writeExclusive(plan.relativeRoot+'/'+file.relative,file.bytes);
 writeJsonExclusive(plan.relativeRoot+'/manifest.json',plan.manifest);
 return {relativeRoot:plan.relativeRoot,manifestSha256:digest(Buffer.from(JSON.stringify(plan.manifest)+'\n'))};
}

test('Firebase package carries current documents, old immutable assets and controlled SEO',()=>{
 const id='hosting-cache-'+randomUUID(),bundle=releaseBytesFixture();
 const old=planMultilingualSiteExport(bundle,id+'-old'),next=planMultilingualSiteExport(bundle,id+'-next');
 const oldAsset=old.files.find(file=>file.relative.startsWith('assets/cache/')&&file.mimeType==='text/css');
 const extra=Buffer.from(oldAsset.bytes.toString()+'\n/* historical variant */');
 const extraPath='assets/cache/'+digest(extra)+'.css';
 old.files.push({...oldAsset,relative:extraPath,bytes:extra});
 old.manifest.files.push({path:extraPath,sizeBytes:extra.length,sha256:digest(extra),mimeType:'text/css'});
 const oldArtifact=writePlan(old),nextArtifact=writePlan(next);
 try{
  const plan=planFirebaseHostingPackage({artifact:nextArtifact,retainedArtifacts:[oldArtifact],run:id,origin:'https://pinkylamb.com',indexing:'noindex'});
  const entry=name=>plan.files.find(file=>file.relative===name);
  assert.deepEqual(entry(extraPath).bytes,extra);
  assert.ok(entry(old.manifest.cacheAliases[0].path));
  assert.match(entry('index.html').bytes.toString(),/https:\/\/pinkylamb\.com\//);
  assert.doesNotMatch(entry('index.html').bytes.toString(),/127\.0\.0\.1/);
  assert.match(entry('index.html').bytes.toString(),/name="robots" content="noindex,nofollow"/);
  assert.match(entry('sitemap.xml').bytes.toString(),/https:\/\/pinkylamb\.com\/vi\//);
  const result=writeFirebaseHostingPackage(plan);
  assert.equal(result.origin,'https://pinkylamb.com');
  assert.deepEqual(readFileSync(path.join(CMS_ROOT,result.outputRoot,'public',extraPath)),extra);
  assert.equal(JSON.parse(readFileSync(path.join(CMS_ROOT,result.outputRoot,'firebase.json'))).hosting.public,'public');
  assert.equal(existsSync(path.join(CMS_ROOT,result.outputRoot,'public','manifest.json')),false);
  const indexed=planFirebaseHostingPackage({artifact:nextArtifact,run:id+'-index',origin:'https://pinkylamb.com',indexing:'index'});
  assert.match(indexed.files.find(file=>file.relative==='index.html').bytes.toString(),/name="robots" content="index,follow"/);
  for(const origin of ['http://pinkylamb.com','https://localhost','https://pinkylamb.com/other','https://pinkylamb.com?x=1'])assert.throws(()=>planFirebaseHostingPackage({artifact:nextArtifact,run:id+'-bad',origin}));
  assert.throws(()=>planFirebaseHostingPackage({artifact:nextArtifact,run:id+'-bad',origin:'https://pinkylamb.com',indexing:'invalid'}));
  assert.throws(()=>planFirebaseHostingPackage({artifact:{...nextArtifact,manifestSha256:'0'.repeat(64)},run:id+'-bad',origin:'https://pinkylamb.com'}));
 }finally{
  rmSync(path.join(CMS_ROOT,'.local/releases/multilingual-001',id+'-old'),{recursive:true});
  rmSync(path.join(CMS_ROOT,'.local/releases/multilingual-001',id+'-next'),{recursive:true});
  rmSync(path.join(CMS_ROOT,'.local/exports/firebase-hosting',id),{recursive:true,force:true});
 }
});
