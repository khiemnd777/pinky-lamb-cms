import {test,expect} from '@playwright/test';
import {readFileSync,readdirSync,mkdirSync,writeFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {ROOT,validateRuntime} from '../scripts/local-guard.mjs';
validateRuntime();
test.use({viewport:{width:1440,height:900},launchOptions:{chromiumSandbox:true},trace:'off',video:'off',screenshot:'off',serviceWorkers:'block'});
test.describe.configure({mode:'serial'});
const base='http://127.0.0.1:5173';
const output=path.join(ROOT,'.local/test-outputs/m2/00b');
const names=['baseline-site.json','baseline-provenance.json'];
const forbiddenPath=/(?:baseline-(?:site|provenance)\.json|legacy-assets\.json|\/cms-api\/|pinky-lamb-cms-api-local)/;
const privateValues=[...new Set(JSON.parse(readFileSync(path.join(ROOT,'contracts/legacy-assets.json'),'utf8')).flatMap(record=>[record.createdBy,record.rights.evidenceRef,...record.sourceRefs]))];
const safeUrl=raw=>{const url=new URL(raw);return url.origin+url.pathname;};
const observations=[];
let denied=0,blocked=0;
test.beforeAll(()=>mkdirSync(output,{recursive:true}));
test.afterAll(()=>writeFileSync(path.join(output,'privacy-evidence.json'),JSON.stringify({privateMappingsPresent:names.map(name=>({name,present:existsSync(path.join(ROOT,'contracts',name))})),denied,blocked,requests:observations},null,2)));
for(const name of names)test(`private ${name} is HTTP403 across raw, encoded, @fs and query forms`,async({request})=>{
 const absolute=`${ROOT}/contracts/${name}`;
 const paths=[`/contracts/${name}`,`/${name}`,`/contracts/${name}?raw`,`/contracts/${name}?import`,`/contracts/${name}?url`,`/@fs${absolute}`,`/@fs${absolute}?raw`,`/%63ontracts/${name.replace('.', '%2e')}`,`/contracts/${name.replace('baseline','%62aseline')}`,`/@fs${absolute.replaceAll('/','%2f')}`,`/contracts%2f${name}`];
 for(const target of paths){
  const response=await request.get(base+target,{maxRedirects:0});
  observations.push({method:'GET',url:safeUrl(base+target),status:response.status()});
  expect(response.status(),target).toBe(403);denied++;
  expect(response.headers()['access-control-allow-credentials']).toBeUndefined();
 }
});
test('actual desktop and mobile dev module graph stays private and loopback',async({page,context})=>{
 const pending=[];const urls=[];const errors=[];
 await context.route('**/*',async route=>{const url=new URL(route.request().url());if(!['127.0.0.1','[::1]'].includes(url.hostname)){blocked++;await route.abort();return;}await route.continue();});
 page.on('pageerror',()=>errors.push('pageerror'));
 page.on('response',response=>{
  const url=response.url();urls.push(url);observations.push({method:response.request().method(),url:safeUrl(url),status:response.status()});
  if(response.ok() && /javascript|text\/html|text\/css/.test(response.headers()['content-type']??''))pending.push(response.text().then(body=>{
   expect(forbiddenPath.test(new URL(url).pathname)).toBe(false);
   for(const value of privateValues)expect(body.includes(value),'private record value must stay server-side').toBe(false);
   expect(body).not.toMatch(/(?:from\s*|import\s*\()\s*['"][^'"]*(?:cms-api|baseline-site\.json|baseline-provenance\.json|legacy-assets\.json|firebase-admin)/);
  }));
 });
 for(const [label,width,height] of [['desktop',1440,900],['mobile',390,844]]){
  await page.setViewportSize({width,height});await page.goto(base);await expect(page.locator('#login-form')).toBeVisible();
  await page.screenshot({path:path.join(output,`privacy-${label}.png`),fullPage:true});
 }
 await Promise.all(pending);
 expect(urls.length).toBeGreaterThan(3);expect(blocked).toBe(0);expect(errors).toEqual([]);
 for(const url of urls){expect(new URL(url).hostname).toBe('127.0.0.1');expect(forbiddenPath.test(new URL(url).pathname)).toBe(false);}
 expect(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length}))).toEqual({local:0,session:0});
 const anonymous=await page.request.get(base+'/api/cms/session');expect(anonymous.status()).toBe(401);
 observations.push({method:'GET',url:base+'/api/cms/session',status:anonymous.status()});
});
test('actual emitted build and pre-resolver reject private provenance including fragment raw-loader bypass',async()=>{
 const {default:config}=await import('../vite.config.mjs');
 const plugin=config.plugins.find(item=>item.name==='deny-private-browser-imports');expect(plugin.enforce).toBe('pre');
 const importer=path.join(ROOT,'admin','auth.mjs');
 for(const name of [...names,'legacy-assets.json'])for(const suffix of ['#fragment?raw','#?url','?raw#fragment','%23fragment?raw']){
  let delegated=false;
  await expect(plugin.resolveId.call({resolve:async()=>{delegated=true;return null;}},`../contracts/${name}${suffix}`,importer)).rejects.toThrow(/Private\/server import forbidden/);
  expect(delegated,'lexical private filename must fail before even resolving missing mappings').toBe(false);
  await expect(plugin.resolveId.call({resolve:async()=>({id:path.join(ROOT,'contracts',name)+suffix})},'synthetic-private-alias',importer)).rejects.toThrow(/Private\/server import forbidden/);
 }

 for(const source of ['.env.local?raw','credential.pem#frag?raw','missing.key#?url']){
  await expect(plugin.resolveId.call({resolve:async()=>null},`../synthetic/${source}`,importer)).rejects.toThrow(/Private\/server import forbidden/);
  await expect(plugin.resolveId.call({resolve:async()=>({id:path.join(ROOT,'synthetic',source)})},'synthetic-secret-alias',importer)).rejects.toThrow(/Private\/server import forbidden/);
 }
 const dir=path.join(ROOT,'admin-dist');expect(existsSync(path.join(dir,'index.html')),'guarded build must exist before this gate').toBe(true);
 const files=[];const walk=folder=>{for(const entry of readdirSync(folder,{withFileTypes:true})){const file=path.join(folder,entry.name);if(entry.isDirectory())walk(file);else files.push(file);}};walk(dir);
 expect(files.length).toBeGreaterThan(1);
 for(const file of files){expect(forbiddenPath.test(file.slice(dir.length))).toBe(false);if(!/\.(?:js|mjs|css|html|json)$/.test(file))continue;
  const body=readFileSync(file,'utf8');for(const value of privateValues)expect(body.includes(value),'emitted artifact leaked private record value').toBe(false);
  expect(body).not.toMatch(/firebase-admin|pinky-lamb-cms-api-local|baseline-site\.json|baseline-provenance\.json|legacy-assets\.json/);
 }
 writeFileSync(path.join(output,'build-privacy.json'),JSON.stringify({files:files.map(file=>file.slice(dir.length+1)).sort(),privateValueChecks:privateValues.length,preResolverPrivateCases:24,preResolverSyntheticSecretCases:6,passed:true},null,2));
});
