import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {projectionFixture,projectionApiFixture} from './site-locale-projection.test.mjs';
import {planWorkServicesExport,exportWorkServicesBundle,createWorkServicesQaHandler,validWorkServicesBundlePath} from '../scripts/export-work-services-local.mjs';
import {WORK_SERVICES_QA_SCRIPT,WORK_SERVICES_QA_SCRIPT_PATH,WORK_SERVICES_QA_STYLE,WORK_SERVICES_QA_STYLE_PATH} from '../preview/work-services-localization-renderer.mjs';
const bundle=()=>({contractRevision:1,kind:'LOCALIZED_WORK_SERVICES_QA_BUNDLE',entries:['en','vi','ja'].map(projectionFixture)});
test('saved three-locale export closes pinned bytes and fixed interaction/style assets exclusively',()=>{
 const input=bundle(),plan=planWorkServicesExport(input,'controlled');assert.equal(plan.manifest.identities.length,3);assert.deepEqual(plan.manifest.policy,input.entries[0].qa.policy);
 for(const prefix of ['','vi/','ja/']){assert.ok(plan.files.some(f=>f.relative===prefix+'index.html'));assert.equal(plan.files.find(f=>f.relative===prefix+WORK_SERVICES_QA_SCRIPT_PATH).bytes.toString(),WORK_SERVICES_QA_SCRIPT);assert.equal(plan.files.find(f=>f.relative===prefix+WORK_SERVICES_QA_STYLE_PATH).bytes.toString(),WORK_SERVICES_QA_STYLE);assert.ok(plan.files.some(f=>f.relative===prefix+'assets/credential.pdf'));}
 const result=exportWorkServicesBundle(input,'export-unit-'+randomUUID());assert.equal(result.editorialApproval,false);assert.throws(()=>exportWorkServicesBundle(input,result.runId),/EEXIST/);
 const handler=createWorkServicesQaHandler(result.output,{manifestSha256:result.manifestSha256}),request=(url,options={})=>{let status,headers,body;handler({url,method:'GET',headers:{host:'127.0.0.1:4188'},...options},{writeHead(s,h){status=s;headers=h;},end(b){body=b;}});return {status,headers,body};};
 for(const url of ['/','/vi/','/ja/','/?filter=events&project=wayfair','/?service=brand-creative'])assert.equal(request(url).status,200);assert.equal(request('/').headers['X-Robots-Tag'],'noindex, nofollow');
 for(const url of ['/?email=private','/?filter=unknown','/?project=unknown','/?service=unknown','/?project=wayfair&service=brand-creative','/styles.css?filter=events','/%2e%2e/private','/../private','/assets/absent.webp'])assert.ok(request(url).status>=400);
 assert.equal(request('/',{method:'PUT'}).status,405);assert.equal(request('/',{headers:{host:'evil.test'}}).status,400);
 const asset=result.manifest.files.find(f=>f.mimeType==='application/pdf'),file=new URL('../'+result.output+'/'+asset.path,import.meta.url),prior=readFileSync(file);writeFileSync(file,Buffer.from('tampered'));assert.equal(request('/'+asset.path).status,409);writeFileSync(file,prior);
});
test('export rejects missing bytes, altered hashes, excess resources, duplicate locales and unowned bundle paths',()=>{
 for(const mutate of [b=>b.entries.pop(),b=>b.entries[1]=b.entries[0],b=>b.entries[0].files.pop(),b=>b.entries[0].files[0].base64='YWJj',b=>b.entries[0].files.push({path:'private.json',base64:'eA=='}),b=>b.entries[0].qa.services[0].draft.content.title='unsaved',b=>b.entries[0].qa.dependencyHash='0'.repeat(64)]){const b=bundle();mutate(b);assert.throws(()=>planWorkServicesExport(b,'controlled'));}
 for(const input of ['/tmp/bundle.json','.local/test-outputs/multilingual-001/p2-v1/bundle.json','.local/test-outputs/multilingual-001/p3-remainder-v1/../bundle.json'])assert.equal(validWorkServicesBundlePath(input),false);
});
test('collect EN then related source/media or sidecar availability change rejects mixed locale export',async()=>{
 for(const kind of ['related-copy','selected-media','sidecar-availability']){
  const {api,f,context,qa,setServiceDependency}=await projectionApiFixture();const {encodeLocalizedSection}=await import('../contracts/work-services-localization-records.mjs'),{encodeLocalizedProject}=await import('../contracts/project-localization-records.mjs'),{encodeLocalizedService}=await import('../contracts/service-localization-records.mjs');
  for(const locale of ['vi','ja']){for(const [id,q]of Object.entries(qa.sections))f.records.set(`cmsLocalizedSectionDrafts/home-v3--${id}--${locale}`,encodeLocalizedSection({...q.draft,locale},'owner'));for(const q of qa.projects)f.records.set(`cmsLocalizedProjectDrafts/home-v3--${q.project.id}--${locale}`,encodeLocalizedProject({...q.draft,locale},'owner'));}
  const first=await api.readQa({request:{},locale:'en'});
  if(kind==='related-copy')setServiceDependency('d'.repeat(64));
  if(kind==='selected-media'){const original=context.projectBase;context.projectBase=async(...args)=>{const result=await original(...args);result.base.dependencyHash='e'.repeat(64);return result;};}
  if(kind==='sidecar-availability')f.records.set('cmsLocalizedServiceDrafts/home-v3--brand-creative--ja',encodeLocalizedService({...qa.services[0].draft,locale:'ja'},'owner'));
  const later=await Promise.all(['vi','ja'].map(locale=>api.readQa({request:{},locale}))),input={contractRevision:1,kind:'LOCALIZED_WORK_SERVICES_QA_BUNDLE',entries:[first,...later].map(q=>({qa:q,files:projectionFixture(q.locale).files.filter(file=>q.resources.some(r=>r.path===file.path))}))};
  assert.throws(()=>planWorkServicesExport(input,'mixed'),kind==='sidecar-availability'?/Mixed sidecar availability snapshot/:/Mixed source snapshot/);
 }
});
