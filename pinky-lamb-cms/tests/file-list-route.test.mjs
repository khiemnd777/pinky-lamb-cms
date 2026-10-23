import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';
import {readFileSync} from 'node:fs';
import {createNativeContentFixture} from './helpers/content-native-fixture.mjs';
import {createFileResourceService,fileRoute} from '../cms-api/file-resources.mjs';
import * as errors from '../contracts/errors.mjs';
const source=readFileSync(new URL('../cms-api/routes.mjs',import.meta.url),'utf8');
test('real dispatch permits allowlisted file list query but rejects unknown/repeated parameters',async t=>{
 const f=await createNativeContentFixture();t.after(f.close);let reads=0;
 const authorize=async()=>{reads++;return {uid:'route-fixture',role:'OWNER',authzVersion:1};};
 const context=createContext({URL,URLSearchParams,Buffer,process:{env:{}},console});
 const synthetic=bindings=>new SyntheticModule(Object.keys(bindings),function(){for(const [key,value]of Object.entries(bindings))this.setExport(key,value);},{context});
 const module=new SourceTextModule(source,{context,importModuleDynamically:async spec=>{
  const bindings=spec.includes('authorization')?{db:f.db,authorize}:{createSiteV3MediaProvider:async()=>({})};const dependency=synthetic(bindings);await dependency.link(()=>{});await dependency.evaluate();return dependency;
 }});
 await module.link(spec=>{
  if(spec.includes('file-resources'))return synthetic({createFileResourceService,fileRoute});
  if(spec.includes('errors'))return synthetic(errors);
  const statement=[...source.matchAll(/import \{([^}]+)\} from '([^']+)'/g)].find(m=>m[2]===spec);
  const bindings=Object.fromEntries(statement[1].split(',').map(n=>[n.trim(),()=>{}]));
  if(spec.includes('media-reads'))bindings.mediaReadDependencies=async()=>({library:{},storage:{}});
  return synthetic(bindings);
 });await module.evaluate();
 async function request(query){const parsed=new URL('/api/cms/files'+query,'http://127.0.0.1'),req={method:'GET',path:parsed.pathname,url:parsed.pathname+parsed.search,query:Object.fromEntries(parsed.searchParams)},res={status(code){this.code=code;return this;},json(body){this.body=body;return this;},set(){return this;}};await module.namespace.dispatchRequest(req,res,{uid:'route-fixture'},'layout-route');return res;}
 const filtered=await request('?kind=PDF&source=EXTERNAL');assert.equal(filtered.code,200,JSON.stringify(filtered.body));assert.deepEqual(filtered.body.items,[]);assert.ok(reads>0,'service authorizes actual list read');
 assert.equal((await request('?source=HOSTED')).code,200);
 assert.equal((await request('?unknown=1')).code,400);
 assert.equal((await request('?source=EXTERNAL&source=HOSTED')).code,400);
 assert.equal((await request('?source=OTHER')).code,422);
});
