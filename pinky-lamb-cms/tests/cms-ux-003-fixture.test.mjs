import test from 'node:test';
import assert from 'node:assert/strict';
import {namespaceCollection, classifyFixtureRequest} from './helpers/cms-ux-003-isolation.mjs';
const namespace='cmsux003_'+'a'.repeat(32);
test('namespace facade refuses canonical, unknown and path-injected collections',()=>{
 assert.equal(namespaceCollection(namespace,'cmsDrafts'),namespace+'__cmsDrafts');
 for(const name of ['cmsMembers','cmsDrafts/home-v3','unknown'])assert.throws(()=>namespaceCollection(namespace,name));
 assert.throws(()=>namespaceCollection('cmsux003_', 'cmsDrafts'));
});
test('adapter admits only explicit fixture routes and blocks every unknown mutation',()=>{
 assert.equal(classifyFixtureRequest('PATCH','http://127.0.0.1:5173/api/cms/drafts/home-v3'),'draft-save');
 assert.equal(classifyFixtureRequest('POST','http://127.0.0.1:5173/api/cms/media-site/snapshots'),'snapshot-submit');
 for(const url of ['/api/cms/drafts/home','/api/cms/drafts/home-v3/import','/api/cms/media/uploads','/api/cms/members'])assert.equal(classifyFixtureRequest('POST','http://127.0.0.1:5173'+url),'deny');
 assert.equal(classifyFixtureRequest('GET','http://127.0.0.1:5173/api/cms/media'),'media-read');
 assert.equal(classifyFixtureRequest('GET','http://127.0.0.1:5173/api/cms/media?kind=IMAGE&kind=VIDEO'),'deny');
 assert.equal(classifyFixtureRequest('GET','http://127.0.0.1:5173/api/cms/media/asset/derivatives/thumb'),'media-read');
 assert.equal(classifyFixtureRequest('GET','http://127.0.0.1:5173/api/cms/media/asset/derivatives/thumb?url=https://example.com'),'deny');
 assert.equal(classifyFixtureRequest('GET','http://127.0.0.1:5173/api/cms/session'),'session-read');
 assert.equal(classifyFixtureRequest('PATCH','https://example.com/api/cms/drafts/home-v3'),'deny');
});
test('adapter never forwards denied mutations and dispatches permitted saves to fixture only',async()=>{
 const {attachFixtureAdapter}=await import('./helpers/cms-ux-003-isolation.mjs');let handler,removed=false;const calls=[],fulfills=[];
 const page={async route(pattern,fn){assert.equal(pattern,'**/api/cms/**');handler=fn;},async unroute(pattern,fn){assert.equal(pattern,'**/api/cms/**');assert.equal(fn,handler);removed=true;}};
 const fixture={async dispatch(kind,input){calls.push({kind,input});return {revision:1};},errorResponse(){throw Error('unexpected error');}};
 const adapter=await attachFixtureAdapter(page,fixture,{role:'EDITOR'});
 const invoke=async(method,pathname,body=null)=>handler({request:()=>({method:()=>method,url:()=> 'http://127.0.0.1:5173'+pathname,postDataJSON:()=>body,headers:()=>({'idempotency-key':'synthetic-key'})}),fulfill:async response=>fulfills.push(response),continue:()=>{throw Error('canonical forwarding forbidden');}});
 await invoke('POST','/api/cms/media/uploads',{unsafe:true});assert.equal(calls.length,0);assert.equal(fulfills[0].status,403);
 await invoke('PATCH','/api/cms/drafts/home-v3',{expectedRevision:0,patch:{}});assert.equal(calls.length,1);assert.equal(calls[0].kind,'draft-save');assert.equal(calls[0].input.role,'EDITOR');assert.equal(calls[0].input.key,'synthetic-key');assert.equal(fulfills[1].status,200);
 await adapter.dispose();assert.equal(removed,true);assert.deepEqual(adapter.events.map(event=>event.kind),['deny','draft-save']);
});
test('fixture media provider returns actual validated legacy catalog and refuses nonlegacy store access',async()=>{
 const {createFixtureMediaProvider}=await import('./helpers/cms-ux-003-fixture.mjs');
 const {pathToFileURL}=await import('node:url');const path=await import('node:path');const load=relative=>import(pathToFileURL(path.join(process.cwd(),relative)).href);
 const {childEnvironment,validateConfig,validateRuntime,installNetworkFence}=await load('scripts/local-guard.mjs');validateConfig();const env=childEnvironment();validateRuntime({...env,...process.env});validateRuntime(env);Object.assign(process.env,env);installNetworkFence();
 const db={collection:name=>{namespaceCollection(namespace,name);throw Error('Unexpected data access');}};
 const provider=await createFixtureMediaProvider({db,load});
 const asset=id=>({id,kind:'IMAGE',legacyPath:'assets/'+id+'.webp',mimeType:'image/webp',sizeBytes:1,sha256:'a'.repeat(64),rights:{basis:'CLIENT_SUPPLIED',evidenceRef:'synthetic-local-fixture'},sourceRefs:['synthetic-local-fixture'],width:1,height:1});
 const legacyCatalog=['brand-diagonal','cover','favicon'].map(asset);
 const transaction={get(){throw Error('Legacy-only selection must not read a media store');}};
 const content={schemaVersion:3,image:{assetId:'cover',alt:'Synthetic cover',isDecorative:false}};
 const result=await provider.resolveSelection({transaction,content,legacyCatalog});
 assert.deepEqual(result.safeCatalog.map(entry=>entry.asset.id),['brand-diagonal','cover','favicon']);
 assert.equal(result.safeCatalog.find(entry=>entry.asset.id==='cover').asset.kind,'IMAGE');
 assert.equal(result.safeCatalog.find(entry=>entry.asset.id==='cover').asset.status,'LEGACY_READY');
 assert.deepEqual(result.orderedManifest.map(entry=>entry.asset.id),['brand-diagonal','cover','favicon']);
 assert.deepEqual(result.expectedMediaVersions,[]);
 await assert.rejects(()=>provider.resolveSelection({transaction,content:{...content,image:{...content.image,assetId:'unknown-media'}},legacyCatalog}),/Unmapped collection refused/);
});
