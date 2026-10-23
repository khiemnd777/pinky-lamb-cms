import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {FULL_SITE_QA_STYLE} from '../preview/full-site-localization-renderer.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {releaseBytesFixture} from './helpers/localized-release-fixture.mjs';
import {fileQaResource} from '../contracts/file-resource.mjs';
import {releaseSnapshotSetHash} from '../cms-api/localized-eligibility.mjs';
import {packageReleaseResources,planMultilingualSiteExport} from '../scripts/export-multilingual-site-local.mjs';
import {releaseResourceDescriptors} from '../contracts/localized-release-package.mjs';
import {attachFileReaderHooks} from '../preview/file-reader-hooks.mjs';
test('three-locale frozen release retains external descriptors, never reads/copies their bytes and installs reader runtime',async()=>{
 const bundle=releaseBytesFixture(),id=bundle.release.entries[0].hero.hero.image.assetId;
 const asset={assetId:id,revision:0,name:'Ảnh ngoài',kind:'IMAGE',format:'PNG',mimeType:'image/png',sizeBytes:100,sha256:'a'.repeat(64),disposition:'READER',downloadName:'Image.png',width:64,height:64,rightsConfirmed:true,source:{kind:'EXTERNAL',url:'https://media.example.org/image'}};
 const external=fileQaResource(asset),replace=value=>{if(!value||typeof value!=='object')return;if(value.id===id&&value.mimeType&&value.sizeBytes){for(const key of Object.keys(value))delete value[key];Object.assign(value,structuredClone(external));return;}for(const child of Object.values(value))replace(child);};bundle.release.entries.forEach(replace);bundle.release.snapshotSetHash=releaseSnapshotSetHash(bundle.release.entries);
 const {resources}=releaseResourceDescriptors(bundle.release);bundle.files=bundle.files.filter(f=>resources.has(f.path));const provided=new Map(bundle.files.map(f=>[f.path,Buffer.from(f.base64,'base64')]));let calls=0;
 const packaged=await packageReleaseResources(bundle.release,{readResource:descriptor=>{calls++;assert.ok(!descriptor.file||descriptor.file.source.kind!=='EXTERNAL');return provided.get(descriptor.path);}});assert.equal(calls,resources.size);
 const plan=planMultilingualSiteExport(packaged,'test-external-release');assert.equal(plan.manifest.externalResources.length,1);assert.ok(!plan.files.some(f=>f.relative===external.path));assert.ok(plan.files.some(f=>f.relative==='assets/pdf.worker.mjs'));
 for(const name of ['index.html','vi/index.html','ja/index.html']){const html=plan.files.find(f=>f.relative===name).bytes.toString();assert.ok(html.includes('data-pinky-image="'+id+'"'));assert.ok(html.includes('pinky-file-policy'));assert.ok(html.includes('https://media.example.org'));assert.ok(html.includes("worker-src &#39;self&#39;"));}
});
test('PDF deep links and Office/image actions use the dispatcher without external raw-link fallback',()=>{
 const base={id:'file-doc',path:'assets/file-doc.pdf',url:'https://media.example.org/file',mimeType:'application/pdf',sizeBytes:20,sha256:'a'.repeat(64),file:{source:{kind:'EXTERNAL'},kind:'PDF'}};
 const html=attachFileReaderHooks('<body><a href="assets/file-doc.pdf#page=7" target="_blank">Read</a></body>',[base]);assert.ok(html.includes('data-pinky-page="7"'));assert.ok(html.includes('href="#pinky-file"'));assert.ok(!html.includes('href="https://media.example.org/file"'));
});

test('Admin CSP authorizes the exact current opaque Preview stylesheet, without enabling inline scripts',()=>{
 const html=readFileSync(new URL('../admin/index.html',import.meta.url),'utf8'),hash='sha256-'+createHash('sha256').update(FULL_SITE_QA_STYLE).digest('base64');assert.ok(html.includes("'"+hash+"'"));assert.ok(!html.includes("script-src 'unsafe-inline'"));assert.ok(html.includes("worker-src 'self'"));
});
