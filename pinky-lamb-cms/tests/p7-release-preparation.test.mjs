import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {rmSync,writeFileSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {buildLocalizedReleaseHandoff} from '../admin/localized-release-preparation.mjs';
import {completeReleaseHandoff,exportMultilingualSite,verifyReleaseFiles,createMultilingualSiteHandler} from '../scripts/export-multilingual-site-local.mjs';
import {planMultilingualActivation} from '../scripts/activate-multilingual-site-local.mjs';
import {CMS_ROOT} from '../scripts/multilingual-release-files.mjs';
import {releaseSnapshotSetHash} from '../cms-api/localized-eligibility.mjs';
import {releaseBytesFixture} from './helpers/localized-release-fixture.mjs';
import {routeDefinition} from '../cms-api/routes.mjs';
import {projectQaResourceSchema} from '../contracts/project-localization-records.mjs';

test('PDF release descriptors retain the approved derivative budget without expanding legacy or image limits',()=>{
 const descriptor={id:'credential',path:'assets/credential-pdf-download.pdf',url:'http://127.0.0.1:5173/api/cms/media/credential/derivatives/pdf-download',mimeType:'application/pdf',sizeBytes:64*1048576,sha256:'a'.repeat(64),derivative:{key:'pdf-download',role:'PDF_DOWNLOAD',generation:'1',bytes:64*1048576,sha256:'a'.repeat(64),mime:'application/pdf'}};
 assert.equal(projectQaResourceSchema.safeParse(descriptor).success,true);
 assert.equal(projectQaResourceSchema.safeParse({...descriptor,sizeBytes:descriptor.sizeBytes+1,derivative:{...descriptor.derivative,bytes:descriptor.sizeBytes+1}}).success,false);
 const legacy={...descriptor,path:'assets/credential.pdf',url:'http://127.0.0.1:5010/assets/credential.pdf'};delete legacy.derivative;
 assert.equal(projectQaResourceSchema.safeParse(legacy).success,false);
 assert.equal(projectQaResourceSchema.safeParse({...legacy,sizeBytes:24*1048576}).success,true);
 assert.equal(projectQaResourceSchema.safeParse({...legacy,path:'assets/image.webp',url:'http://127.0.0.1:5010/assets/image.webp',mimeType:'image/webp',sizeBytes:12*1048576+1}).success,false);
});

test('readiness is GET-only and admitted through the authenticated browser API',()=>{
 const source=readFileSync(new URL('../admin/auth.mjs',import.meta.url),'utf8'),start=source.indexOf('export function isAllowedMediaSiteRequest('),end=source.indexOf('\nfunction mediaBytesRoute',start),isAllowedMediaSiteRequest=new Function('revisionSchema','resourceIdSchema','hashSchema',source.slice(start,end).replace('export ','')+';return isAllowedMediaSiteRequest;')({parse:value=>value},{parse:value=>value},{parse:value=>value});
 assert.deepEqual(routeDefinition('/api/cms/localizations/editorial/readiness'),{methods:['GET'],kind:'LOCALIZED_EDITORIAL_READINESS'});
 assert.equal(isAllowedMediaSiteRequest('/api/cms/localizations/editorial/readiness','GET'),true);
 for(const [url,method] of [['/api/cms/localizations/editorial/readiness','POST'],['/api/cms/localizations/editorial/readiness?locale=en','GET'],['/api/cms/localizations/editorial/readiness#private','GET']])assert.equal(isAllowedMediaSiteRequest(url,method),false);
});
test('browser preparation hands off frozen content without copying sessions or reading legacy assets cross-origin',async()=>{
 const original=releaseBytesFixture(),before=structuredClone(original.release),handoff=await buildLocalizedReleaseHandoff(original.release,{apiFetch:()=>{throw Error('No authenticated derivative in fixture');}});
 assert.deepEqual(handoff.release,before);assert.ok(handoff.files.length>0,'inline presentation/style bytes');assert.ok(handoff.files.length<original.files.length,'legacy bytes stay offline');
 // Complete only with a fixture reader's known bytes for synthetic media; actual baseline omissions are checked separately.
 const byPath=new Map(original.files.map(file=>[file.path,file]));for(const resource of original.release.entries[0].resources)if(!handoff.files.some(file=>file.path===resource.path)&&!['styles.css',...['abril-fatface-400','montserrat-400','montserrat-600','montserrat-700','montserrat-800'].map(id=>`assets/${id}.woff`)].includes(resource.path))handoff.files.push(byPath.get(resource.path));
 const complete=await completeReleaseHandoff(handoff);assert.equal(complete.files.length,original.files.length);assert.deepEqual(handoff.release,before);
});
test('browser download rejects changed snapshot set, session change and changed authenticated media bytes',async()=>{
 const original=releaseBytesFixture();await assert.rejects(buildLocalizedReleaseHandoff({...original.release,snapshotSetHash:'0'.repeat(64)},{apiFetch:()=>{}}),/đã thay đổi/);
 await assert.rejects(buildLocalizedReleaseHandoff(original.release,{apiFetch:()=>{},assertCurrent:()=>{throw new DOMException('Session changed','AbortError');}}),{name:'AbortError'});
 const derivative=structuredClone(original.release),descriptor=derivative.entries[0].resources.find(resource=>resource.id==='cover'),oldPath=descriptor.path;
 for(const entry of derivative.entries){const visit=value=>{if(!value||typeof value!=='object')return;if(value.path===oldPath&&value.id===descriptor.id){value.path='assets/cover-image-320.webp';value.url='http://127.0.0.1:5173/api/cms/media/cover/derivatives/image-320';value.width=200;value.height=200;value.derivative={key:'image-320',role:'IMAGE',generation:'1',targetWidth:320,bytes:value.sizeBytes,sha256:value.sha256,mime:value.mimeType,width:200,height:200};}for(const child of Object.values(value))visit(child);};visit(entry);}
 derivative.snapshotSetHash=releaseSnapshotSetHash(derivative.entries);
 await assert.rejects(buildLocalizedReleaseHandoff(derivative,{apiFetch:async()=>({bytes:new Uint8Array([0])})}),/thay đổi/);
});
test('offline handoff rejects invented omitted assets, duplicates, extra bytes and changed frozen copy',async()=>{
 const bundle=releaseBytesFixture(),omit={...bundle,files:bundle.files.filter(file=>file.path!=='assets/cover.webp')};await assert.rejects(completeReleaseHandoff(omit),/reader required/);
 await assert.rejects(completeReleaseHandoff({...bundle,files:[...bundle.files,bundle.files[0]]}),/duplicate/);
 await assert.rejects(completeReleaseHandoff({...bundle,files:[...bundle.files,{path:'private.json',base64:'eA=='}]}),/Unexpected/);
 const changed=structuredClone(bundle);changed.release.entries[0].hero.draft.content.note='unapproved changed copy';changed.release.entries[0].hero.hero.note='unapproved changed copy';
 const {planMultilingualSiteExport}=await import('../scripts/export-multilingual-site-local.mjs');assert.throws(()=>planMultilingualSiteExport(changed,'tampered-copy'),/content hash mismatch/);
});
test('exclusive generation closes its filesystem, denies foreign URL targets and cannot activate a QA fixture',()=>{
 const id='p7-unit-'+randomUUID(),bundle={...releaseBytesFixture(),qaFixture:true},artifact=exportMultilingualSite(bundle,id),root=path.join(CMS_ROOT,artifact.root);
 try{
  verifyReleaseFiles(artifact.root,artifact.manifestSha256);assert.throws(()=>exportMultilingualSite(bundle,id));
  const handler=createMultilingualSiteHandler({relativeRoot:artifact.root,manifestSha256:artifact.manifestSha256});
  const call=url=>{const result={};handler({method:'GET',url,headers:{host:'127.0.0.1:4189'}},{writeHead(status,headers){result.status=status;result.headers=headers;},end(body){result.body=body;}});return result;};
  assert.equal(call('/').status,200);assert.equal(call('/').headers['X-Pinky-Content'],'local-qa-fixture');
  const manifest=verifyReleaseFiles(artifact.root,artifact.manifestSha256);
  for(const file of bundle.files){
   assert.equal(manifest.files.filter(entry=>entry.path===file.path).length,1);
   assert.equal(manifest.files.some(entry=>entry.path==='vi/'+file.path||entry.path==='ja/'+file.path),false);
   if(file.path.startsWith('assets/')||file.path==='styles.css')for(const locale of ['vi','ja']){const actual=call('/'+locale+'/'+file.path),root=call('/'+file.path);assert.equal(actual.status,200);assert.deepEqual(actual.body,root.body);assert.equal(actual.headers['Content-Type'],root.headers['Content-Type']);}
  }
  for(const url of ['/vi/assets/absent.pdf','/ja/manifest.json','/ja/assets/private.json'])assert.equal(call(url).status,404);
  for(const url of ['http://foreign.test/','//foreign.test/','/%2e%2e/index.html','/../admin/auth.mjs'])assert.equal(call(url).status,400);
  for(const url of ['/manifest.json','/.local/backups/hosting-5010','/admin/auth.mjs'])assert.equal(call(url).status,404);
  assert.throws(()=>createMultilingualSiteHandler({relativeRoot:artifact.root,manifestSha256:artifact.manifestSha256,port:5010}),/fixture/);
  assert.throws(()=>planMultilingualActivation({relativeRoot:artifact.root,manifestSha256:artifact.manifestSha256,activationId:'not-allowed',currentHosting:{service:'hosting',host:'127.0.0.1',port:5010,projectId:'demo-pinky-lamb-cms',independentlyManaged:true,pid:123,startIdentity:'fixture'}}),/fixture/);
  writeFileSync(path.join(root,'private.json'),'private');assert.throws(()=>verifyReleaseFiles(artifact.root,artifact.manifestSha256),/Unexpected/);
 }finally{rmSync(path.dirname(root),{recursive:true});}
});
