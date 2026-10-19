import test from 'node:test';
import {createFileMatcher,forceRegExp} from '../node_modules/playwright/lib/util.js';
import assert from 'node:assert/strict';
import { readFileSync,mkdtempSync,symlinkSync,unlinkSync,rmdirSync,renameSync,existsSync,mkdirSync } from 'node:fs';
import net from 'node:net';
import {createRequire,syncBuiltinESMExports} from 'node:module';
import { spawnSync } from 'node:child_process';
import { ROOT,childEnvironment,validateRuntime,validateConfig,commandPlan,disableCliCredentialDiscovery,assertOwnedOutput,assertBuildOutput,installCliConfigAdapter,createStorageRuntime,assertStorageJar,assertEmulatorPortsAvailable,inspectStorageStopState,preserveStorageStopState,validateStorageProcessOwnership,validateSuiteHubShape,assertLocalLaunchAuthorized } from '../scripts/local-guard.mjs';
mkdirSync(`${ROOT}/.local/test-outputs/m2`,{recursive:true});
mkdirSync(`${ROOT}/.local/cache/m2`,{recursive:true});
const config=()=>JSON.parse(readFileSync(`${ROOT}/infra-local/firebase.json`));
test('five fixed emulators and exact demo environment accepted',()=>assert.equal(validateRuntime(childEnvironment({})),true));
test('real project, missing each mandatory host and remote/scheme host fail closed',()=>{
  for(const key of ['GCLOUD_PROJECT','GOOGLE_CLOUD_PROJECT','FIREBASE_AUTH_EMULATOR_HOST','FIRESTORE_EMULATOR_HOST','PINKY_FUNCTIONS_EMULATOR_HOST','PINKY_HOSTING_EMULATOR_HOST']){
    for(const bad of [undefined,'pinky-lamb','https://127.0.0.1:9099','remote.test:8080']){const e=childEnvironment({});if(bad===undefined)delete e[key];else e[key]=bad;assert.throws(()=>validateRuntime(e),/LOCAL_GUARD/);}
  }
});
test('config cannot alter watcher globs, source, rules, hosts or add emulators',()=>{
  for(const mutate of [c=>c.functions[0].ignore.push('{{evil}}'),c=>c.functions[0].source='../../dist',c=>c.firestore.rules='../secret',c=>c.hosting.public='../dist',c=>c.emulators.auth.host='0.0.0.0',c=>c.emulators.pubsub={host:'127.0.0.1',port:8085},c=>c.predeploy=['evil'],c=>c.hosting.rewrites=[{source:'**',function:'cloud'}],c=>c.firestore.indexes='/private/path']){const c=config();mutate(c);assert.throws(()=>validateConfig(c),/LOCAL_GUARD/);}
});
test('proxy, credential, account and loader environment cannot reach children; HOME unchanged',()=>{
  const e=childEnvironment({HOME:'/synthetic/home',PATH:'/usr/bin',HTTP_PROXY:'ftp://bad',http_proxy:'bad',HTTPS_PROXY:'bad',https_proxy:'bad',ALL_PROXY:'bad',all_proxy:'bad',npm_config_proxy:'bad',GOOGLE_APPLICATION_CREDENTIALS:'/private/key',FIREBASE_TOKEN:'synthetic',FIREBASE_WEBAPP_CONFIG:'bad',NODE_OPTIONS:'--require=/evil'});
  assert.equal(e.HOME,'/synthetic/home');for(const k of ['HTTP_PROXY','http_proxy','HTTPS_PROXY','https_proxy','ALL_PROXY','all_proxy','npm_config_proxy','GOOGLE_APPLICATION_CREDENTIALS','FIREBASE_TOKEN','FIREBASE_WEBAPP_CONFIG'])assert.equal(e[k],undefined);
  assert.equal(e.METADATA_SERVER_DETECTION,'none');assert.equal(e.PLAYWRIGHT_BROWSERS_PATH,`${ROOT}/.local/cache/playwright`);assert.equal(e.CI,'1');assert.equal(e.NO_UPDATE_NOTIFIER,'1');assert.equal(e.XDG_CONFIG_HOME,`${ROOT}/.local/config`);assert.match(e.NODE_OPTIONS,/local-guard/);
});
test('only fixed commands accepted, arbitrary config/project/globs denied',()=>{
  assert.match(commandPlan('emulators').args.join(' '),/--only auth,firestore,functions,hosting/);
  for(const mode of ['deploy','login','unknown'])assert.throws(()=>commandPlan(mode));
  assert.throws(()=>commandPlan('emulators',['--project','pinky-lamb']));assert.throws(()=>commandPlan('unit',['{{bad}}']));
});
test('CLI-only ADC discovery seam returns no credentials',async()=>{
  const adapter=disableCliCredentialDiscovery();assert.deepEqual(await adapter.getCredentialsEnvironment(),{});await assert.rejects(()=>adapter.getCredentialsEnvironment({user:'synthetic'}),/CLI account forbidden/);
});
test('preloaded child refuses outbound fetch before network and accepts no SDK without guard',()=>{
  const result=spawnSync(process.execPath,['--input-type=module','-e',"try { await fetch('https://example.com'); process.exit(8); } catch(e) { console.log(e.message); }"],{cwd:ROOT,env:childEnvironment(process.env),encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/non-loopback fetch blocked before request/);
  const invalid=spawnSync(process.execPath,['cms-api/index.mjs'],{cwd:ROOT,env:{PATH:process.env.PATH},encoding:'utf8'});assert.notEqual(invalid.status,0);assert.match(invalid.stderr,/LOCAL_GUARD/);
});
test('local HTTP adapter denies anonymous401 before content dispatch',async()=>{
  const result=spawnSync(process.execPath,['--input-type=module','-e',`const {handleRequest}=await import('./cms-api/index.mjs');let status;const response={set(){},status(n){status=n;return this;},json(body){if(status!==401||body.error.code!=='UNAUTHENTICATED')process.exit(9);}};await handleRequest({headers:{}},response);`],{cwd:ROOT,env:childEnvironment(process.env),encoding:'utf8'});assert.equal(result.status,0,result.stderr);
});

test('preloaded TCP and HTTP(S) reject remote host before DNS',()=>{
  for(const source of [
    "const net=await import('node:net');net.connect({host:'example.com',port:443})",
    "const http=await import('node:http');http.get('http://example.com')",
    "const https=await import('node:https');https.get('https://example.com')"
  ]){const result=spawnSync(process.execPath,['--input-type=module','-e',`try{${source};process.exit(9)}catch(e){console.log(e.message)}`],{cwd:ROOT,env:childEnvironment(process.env),encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/non-loopback connection blocked before DNS/);}
});

test('dangling output symlink cannot create an external file',()=>{
 const dir=mkdtempSync(`${ROOT}/.local/test-outputs/m2/guard-symlink-`);const link=`${dir}/dangling`;symlinkSync('/private/tmp/pinky-guard-never-create-target',link);
 try{assert.throws(()=>assertOwnedOutput(link.slice(ROOT.length+1)),/symlink output forbidden/);}finally{unlinkSync(link);rmdirSync(dir);}
});

test('supported CLI projectDir adapter preserves exact config source and path containment',()=>{
 const Config=installCliConfigAdapter();const config=Config.load({cwd:ROOT,configPath:'infra-local/firebase.json'});assert.equal(config.projectDir,ROOT);assert.equal(config.get("hosting.public"),"../public-baseline");assert.equal(config.path('cms-api'),`${ROOT}/cms-api`);assert.equal(config.path('.local/firestore-deny.rules'),`${ROOT}/.local/firestore-deny.rules`);assert.equal(config.path('public-baseline'),`${ROOT}/public-baseline`);assert.throws(()=>config.path('../outside'));
 assert.throws(()=>Config.load({cwd:ROOT,configPath:'../firebase.json'}),/unapproved config path/);assert.throws(()=>Config.load({cwd:ROOT,configPath:'infra-local/firebase.json',projectDir:'/private/tmp'}),/outside project directory/);
});

test('CLI discovery server environment still requires demo/Auth/Firestore and five config endpoints',()=>{
 const env={GCLOUD_PROJECT:'demo-pinky-lamb-cms',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080',FIREBASE_STORAGE_EMULATOR_HOST:'127.0.0.1:9199',PINKY_STORAGE_BUCKET:'demo-pinky-lamb-cms.appspot.com'};assert.equal(validateRuntime(env,undefined,{server:true}),true);
 for(const key of Object.keys(env)){const bad={...env};delete bad[key];assert.throws(()=>validateRuntime(bad,undefined,{server:true}));}for(const alias of ['','pinky-lamb'])assert.throws(()=>validateRuntime({...env,GOOGLE_CLOUD_PROJECT:alias},undefined,{server:true}));const bad=config();delete bad.emulators.hosting;assert.throws(()=>validateRuntime(env,bad,{server:true}));
});

test('shared fixtures run sequentially while individual concurrency oracles remain enabled',()=>{
 assert.ok(commandPlan('integration',['--task','M1']).args.includes('--test-concurrency=1'));
 assert.ok(commandPlan('e2e',['--task','M1']).args.includes('--workers=1'));
});
test('build refuses root and descendant symlinks including dangling outputs without modifying preserved bytes',()=>{
 const output=`${ROOT}/admin-dist`,preserved=`${ROOT}/.local/cache/m2/admin-dist-preserved-${process.pid}`;
 const existed=existsSync(output);if(existed)renameSync(output,preserved);
 try{
  symlinkSync('/private/tmp/pinky-build-never-create-target',output);assert.throws(()=>commandPlan('build'),/symlink build output forbidden/);unlinkSync(output);
  mkdirSync(output);symlinkSync('/private/tmp/pinky-build-never-create-target',`${output}/dangling`);assert.throws(()=>assertBuildOutput(),/symlink build output forbidden/);unlinkSync(`${output}/dangling`);rmdirSync(output);
 }finally{if(existed)renameSync(preserved,output);}
 assert.equal(assertBuildOutput(),output);
});

// These lists come from the Approved M2 task table, not from guard implementation.
const m1Tests={
 unit:['local-guard.test.mjs','hero-contract.test.mjs','hero-renderer.test.mjs'],
 integration:['acl.rules.test.mjs','drafts.integration.test.mjs','review.integration.test.mjs'],
 e2e:['login.local.test.mjs','hero-editor.local.test.mjs','m1.e2e.test.mjs']
};
const m2Tests={
 unit:['site-settings.test.mjs','site-records.test.mjs','site-contract.test.mjs','site-import-map.test.mjs','site-renderer.test.mjs','site-export.test.mjs','site-manifest.test.mjs','site-hash.test.mjs','site-source-coverage.test.mjs'],
 integration:['site-import.integration.test.mjs','site-drafts.integration.test.mjs','source-checks.integration.test.mjs','site-snapshots.integration.test.mjs','m1-compat.integration.test.mjs','site-reviews.integration.test.mjs','site-abuse.integration.test.mjs'],
 e2e:['site-private-files.local.test.mjs','site-public.local.test.mjs','site-settings.local.test.mjs','site-records.local.test.mjs','site-sections.local.test.mjs','site-workflow.local.test.mjs','m2.e2e.test.mjs']
};
const selectedTests=plan=>plan.args.filter(arg=>arg.startsWith('tests/') && arg.endsWith('.test.mjs') || arg.startsWith('/^') && arg.endsWith('$/')).map(arg=>arg.startsWith('/^')?arg.slice(2,-2).replace(/\\(.)/g,'$1').slice(ROOT.length+1):arg);
test('explicit M1 selector preserves all old suite paths and sequential fixture execution',()=>{
 for(const mode of Object.keys(m1Tests))assert.deepEqual(selectedTests(commandPlan(mode,['--task','M1'])),m1Tests[mode].map(name=>`tests/${name}`));
 assert.ok(commandPlan('integration',['--task','M1']).args.includes('--test-concurrency=1'));
 assert.ok(commandPlan('e2e',['--task','M1']).args.includes('--workers=1'));
});
test('00b selects only owned guard and privacy tests, rejecting task or mode confusion',()=>{
 assert.deepEqual(selectedTests(commandPlan('unit',['--task','CMS-M2-00b'])),['tests/local-guard.test.mjs']);
 assert.deepEqual(selectedTests(commandPlan('e2e',['--task','CMS-M2-00b'])),['tests/site-private-files.local.test.mjs']);
 for(const mode of ['integration','build','dev','emulators','seed','lint','export'])assert.throws(()=>commandPlan(mode,['--task','CMS-M2-00b']),/LOCAL_GUARD/);
 for(const task of ['CMS-M2-00','CMS-M2-01A','CMS-M2-99','../tests/local-guard.test.mjs','tests/*.mjs','{{glob}}','M2',''])assert.throws(()=>commandPlan('unit',['--task',task]),/LOCAL_GUARD/);
 for(const args of [['--task'],['M1'],['--task=M1'],['--task','M1','--task','CMS-M2-00b'],['--task','M1','--grep','.*'],['--task','M1','tests/local-guard.test.mjs']])assert.throws(()=>commandPlan('unit',args),/LOCAL_GUARD/);
 assert.throws(()=>commandPlan('unknown',['--task','M1']),/LOCAL_GUARD/);
});
test('final defaults require the entire approved matrix and fail rather than silently skip future suites',()=>{
 for(const mode of Object.keys(m1Tests)){
  const expected=[...m1Tests[mode],...m2Tests[mode]].map(name=>`tests/${name}`);
  if(expected.every(file=>existsSync(`${ROOT}/${file}`))){
   assert.deepEqual(new Set(selectedTests(commandPlan(mode))),new Set(expected));
   assert.equal(selectedTests(commandPlan(mode)).length,expected.length);
  }else assert.throws(()=>commandPlan(mode),/LOCAL_GUARD.*(?:missing|expected|unavailable).*test/i);
 }
});
test('task-specific missing future file fails before launching a partial suite',()=>{
 const file=`${ROOT}/tests/site-settings.test.mjs`;
 if(!existsSync(file))assert.throws(()=>commandPlan('unit',['--task','CMS-M2-01a']),/LOCAL_GUARD.*(?:missing|expected|unavailable).*test/i);
 else assert.deepEqual(selectedTests(commandPlan('unit',['--task','CMS-M2-01a'])),['tests/site-settings.test.mjs','tests/site-records.test.mjs']);
});
test('direct runtime rejects credentials, autoconfig and loopback aliases before any SDK access',()=>{
 for(const [key,value] of [['GOOGLE_APPLICATION_CREDENTIALS','synthetic.json'],['FIREBASE_TOKEN','synthetic-not-a-token'],['FIREBASE_WEBAPP_CONFIG','{}'],['FIREBASE_CONFIG','{"projectId":"production"}'],['FIREBASE_CONFIG','invalid']])assert.throws(()=>validateRuntime({...childEnvironment({}),[key]:value}),/LOCAL_GUARD/);
 for(const key of ['FIREBASE_AUTH_EMULATOR_HOST','FIRESTORE_EMULATOR_HOST','PINKY_FUNCTIONS_EMULATOR_HOST','PINKY_HOSTING_EMULATOR_HOST'])for(const value of ['localhost:9099','0.0.0.0:9099','127.0.0.1:1','127.0.0.1:9099/path','[::1]:9099'])assert.throws(()=>validateRuntime({...childEnvironment({}),[key]:value}),/LOCAL_GUARD/);
});

test('an owned selected test cannot disappear, become a directory, or redirect through a symlink',()=>{
 const file=`${ROOT}/tests/site-private-files.local.test.mjs`;
 const backup=`${ROOT}/.local/test-outputs/m2/privacy-test-preserved-${process.pid}.mjs`;
 const original=readFileSync(file);
 renameSync(file,backup);
 try{
  assert.throws(()=>commandPlan('e2e',['--task','CMS-M2-00b']),/LOCAL_GUARD/);
  mkdirSync(file);try{assert.throws(()=>commandPlan('e2e',['--task','CMS-M2-00b']),/LOCAL_GUARD/);}finally{rmdirSync(file);}
  for(const target of [backup,`${ROOT}/.local/test-outputs/m2/nonexistent-selected-test-${process.pid}`]){symlinkSync(target,file);try{assert.throws(()=>commandPlan('e2e',['--task','CMS-M2-00b']),/LOCAL_GUARD/);}finally{unlinkSync(file);}}
 }finally{renameSync(backup,file);}
 assert.deepEqual(readFileSync(file),original);
 assert.deepEqual(selectedTests(commandPlan('e2e',['--task','CMS-M2-00b'])),['tests/site-private-files.local.test.mjs']);
});


test('installed Playwright file matcher selects exact approved absolute files only',()=>{
 // Playwright CLI interprets positional file filters as RegExp, not literal filenames.
 const legacy=createFileMatcher([forceRegExp('tests/site-private-files.local.test.mjs')]);
 assert.equal(legacy(`${ROOT}/tests/site-private-filesXlocalXtestXmjs.extra`),true,'reproduces prior substring and dot-wildcard exposure');
 for(const [task,names] of [['M1',m1Tests.e2e],['CMS-M2-00b',['site-private-files.local.test.mjs']],['CMS-M2-09',['site-public.local.test.mjs']],['CMS-M2-12',['site-settings.local.test.mjs']],['CMS-M2-13',['site-records.local.test.mjs']],['CMS-M2-14',['site-sections.local.test.mjs']],['CMS-M2-15',['site-workflow.local.test.mjs']]]){
  const filters=commandPlan('e2e',['--task',task]).args.filter(arg=>arg.startsWith('/^') && arg.endsWith('$/'));
  assert.equal(filters.length,names.length);
  const matcher=createFileMatcher(filters.map(filter=>forceRegExp(filter)));
  for(const name of names){
   const exact=`${ROOT}/tests/${name}`;assert.equal(matcher(exact),true);
   for(const lookalike of [exact.toUpperCase(),`${exact}.extra`,`${exact}/child`,`${ROOT}/tests/${name.replaceAll('.','X')}`,`${ROOT}/tests/extra-${name}`,`${ROOT}/tests/nested/${name}`,`/unapproved${exact}`,`${ROOT}/other/tests/${name}`])assert.equal(matcher(lookalike),false,`unexpected file matched ${task}`);
  }
  for(const other of [...m1Tests.e2e,'site-private-files.local.test.mjs'].filter(name=>!names.includes(name)))assert.equal(matcher(`${ROOT}/tests/${other}`),false);
 }
});

test('executable guard refuses a different working directory before command preparation',()=>{
 const dir=mkdtempSync(`${ROOT}/.local/test-outputs/m2/guard-wrong-root-`);
 try{const result=spawnSync(process.execPath,[`${ROOT}/scripts/local-guard.mjs`,'synthetic-unapproved-command'],{cwd:dir,env:childEnvironment(process.env),encoding:'utf8',timeout:5000});assert.notEqual(result.status,0);assert.match(result.stderr,/LOCAL_GUARD:.*workspace/);}finally{rmdirSync(dir);}
});

test('browser lint refuses static and dynamic private/server imports while allowing pure contracts',async()=>{
 const {Linter}=await import('eslint');const {default:configuration}=await import('../eslint.config.mjs');const linter=new Linter();
 for(const target of ['node:fs','fs','fs/promises','fs?raw','fs/promises#fragment','node:fs?raw','../cms-api/site-drafts.mjs','../scripts/export-site-local.mjs','../contracts/baseline-site.json','../contracts/baseline-provenance.json','../contracts/legacy-assets.json','../contracts/baseline-site.json?raw','../contracts/baseline-provenance.json#fragment?raw','../contracts/legacy-assets.json?url'])for(const source of [`import '${target}';`,`void import('${target}');`])assert.ok(linter.verify(source,configuration,{filename:'admin/synthetic-browser.mjs'}).some(item=>item.ruleId?.startsWith('no-restricted-')),`forbidden import allowed: ${target}`);
 for(const filename of ['admin/synthetic-browser.mjs','preview/synthetic-browser.mjs','contracts/synthetic-browser.mjs'])assert.deepEqual(linter.verify("import '../contracts/site.mjs';",configuration,{filename}),[]);
 assert.deepEqual(linter.verify("import 'node:fs';",configuration,{filename:'scripts/synthetic-exporter.mjs'}),[]);
});

test('16 selection is exact, integration deduplicates shared source-check suites, and future 17 stays required',()=>{
 assert.deepEqual(selectedTests(commandPlan('unit',['--task','CMS-M2-16'])),['tests/local-guard.test.mjs']);
 const defaultCounts={unit:12,integration:10,e2e:10};for(const mode of Object.keys(m1Tests)){assert.equal(new Set([...m1Tests[mode],...m2Tests[mode]]).size,defaultCounts[mode]);}
 const future=['site-manifest.test.mjs','site-hash.test.mjs','site-source-coverage.test.mjs'];if(future.some(name=>!existsSync(`${ROOT}/tests/${name}`)))assert.throws(()=>commandPlan('unit'),/missing expected test/);
});


test('export selectors preserve explicit v1 and v2 paths while rejecting lookalikes and argument injection',()=>{
 assert.deepEqual(commandPlan('export').args,['scripts/export-local.mjs']);
 for(const [flag,input,output] of [['--snapshot','tests/fixtures/approved-hero.json','.preview-output'],['--site-envelope','tests/fixtures/approved-site.json','.preview-output/m2/synthetic-id']])assert.deepEqual(commandPlan('export',[flag,input,'--out',output]).args,['scripts/export-local.mjs',flag,input,'--out',output]);
 for(const args of [['--task','M1'],['--snapshot','tests/fixtures/approved-hero.json'],['--site-envelope','../private.json','--out','.preview-output/m2/id'],['--site-envelope','.local/cache/m2/../escape.json','--out','.preview-output/m2/id'],['--site-envelope','tests/fixtures/approved-site.json','--out','.preview-output/id'],['--snapshot','tests/fixtures/approved-hero.json','--out','../dist'],['--snapshot','tests/fixtures/approved-hero.json','--out','.preview-output','--arbitrary'],['--site-envelope','tests/fixtures/approved-site.json','--output','.preview-output/m2/id']])assert.throws(()=>commandPlan('export',args),/LOCAL_GUARD/);
});

test('M3 Storage config binds exact local host/rules/indexes and denies substitutions',()=>{const c=config();assert.deepEqual(c.storage,{rules:'infra-local/storage.rules'});assert.equal(c.firestore.indexes,'infra-local/firestore.indexes.json');assert.deepEqual(c.emulators.storage,{host:'127.0.0.1',port:9199});for(const mutate of [x=>x.storage.rules='../private.rules',x=>x.storage.bucket='real-bucket',x=>x.emulators.storage.host='0.0.0.0',x=>x.emulators.storage.port=9299,x=>x.firestore.indexes='../outside.json']){const bad=config();mutate(bad);assert.throws(()=>validateConfig(bad),/LOCAL_GUARD/);}});
test('M3 Storage demo bucket/host and direct proxy environments fail closed',()=>{const env=childEnvironment({});assert.equal(env.FIREBASE_STORAGE_EMULATOR_HOST,'127.0.0.1:9199');assert.equal(env.PINKY_STORAGE_BUCKET,'demo-pinky-lamb-cms.appspot.com');for(const [key,value]of [['FIREBASE_STORAGE_EMULATOR_HOST','https://127.0.0.1:9199'],['PINKY_STORAGE_BUCKET','production.appspot.com'],['HTTP_PROXY','http://remote.test'],['HTTPS_PROXY',''],['ALL_PROXY','socks://remote.test']])assert.throws(()=>validateRuntime({...env,[key]:value}),/LOCAL_GUARD/);});
test('M3 storage-only plan cannot start other emulators or accept caller flags; future commands stay closed',()=>{const p=commandPlan('storage-only');assert.ok(p.args.includes('--max-old-space-size=256'));assert.equal(p.args[p.args.indexOf('--only')+1],'storage');assert.throws(()=>commandPlan('storage-only',['--only','firestore']),/LOCAL_GUARD/);assert.throws(()=>commandPlan('media-worker'),/LOCAL_GUARD/);assert.throws(()=>commandPlan('export-media',['--media-envelope','.local/cache/m3/owned.json','--out','.preview-output/m3/owned']),/LOCAL_GUARD/);assert.deepEqual(selectedTests(commandPlan('unit',['--task','CMS-M3-03'])),['tests/local-guard.test.mjs']);});


test('M3 isolated Storage run preserves HOME and contains every writable runtime path',()=>{
 assert.match(assertStorageJar(),/task03\/emulators\/cloud-storage-rules-runtime-v1.1.3.jar$/);
 const run=createStorageRuntime({HOME:'/synthetic/home',PATH:'/usr/bin',HTTP_PROXY:'forbidden'});
 assert.equal(run.env.HOME,'/synthetic/home');assert.equal(run.env.HTTP_PROXY,undefined);
 assert.ok(run.runRoot.startsWith(`${ROOT}/.local/cache/m3/task03/runtime/run-`));
 for(const key of ['TMPDIR','TMP','TEMP','XDG_CONFIG_HOME','XDG_CACHE_HOME','XDG_DATA_HOME','FIREBASE_DEBUG_PATH'])assert.ok(run.env[key].startsWith(`${run.runRoot}/`),key);
 assert.equal(run.env.FIREBASE_EMULATORS_PATH,`${ROOT}/.local/cache/m3/task03/emulators`);
 assert.equal(run.env.START_LOGGING_EMULATOR,'true');
 assert.deepEqual(JSON.parse(readFileSync(`${run.env.XDG_CONFIG_HOME}/configstore/firebase-tools.json`)),{usage:false});
 assert.equal(validateRuntime(run.env),true);
});
test('M3 Storage preflight refuses an owned listener before any emulator launch',async()=>{
 const server=net.createServer();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(9199,'127.0.0.1',resolve);});
 try{await assert.rejects(()=>assertEmulatorPortsAvailable('storage-only'),/existing listener at 9199/);}finally{await new Promise(resolve=>server.close(resolve));}
 await assert.rejects(()=>assertEmulatorPortsAvailable('unknown'),/unapproved emulator preflight/);
});

test('M3 Storage adapter rejects unrelated entry, flags, cache, overrides and method drift without native spawn',()=>{
 const run=createStorageRuntime(process.env);const env={...run.env};delete env.PINKY_STORAGE_RUNTIME;delete env.JAVA_TOOL_OPTIONS;
 const source=`
 const guard=await import(${JSON.stringify(new URL('../scripts/local-guard.mjs',import.meta.url).href)});
 process.env.PINKY_STORAGE_RUNTIME=${JSON.stringify(run.runRoot)};process.env.JAVA_TOOL_OPTIONS=${JSON.stringify(run.env.JAVA_TOOL_OPTIONS)};
 process.chdir(${JSON.stringify(run.cwd)});
 const expected=guard.commandPlan('storage-only').args.slice(1);
 for(const argv of [['unrelated-api.mjs'],[...expected,'--only','firestore']]){process.argv=[process.execPath,...argv];try{guard.installStorageRuntimeAdapter();process.exit(20)}catch(e){if(!e.message.includes('entrypoint/arguments'))throw e}}
 process.argv=[process.execPath,...expected];
 for(const key of ['STORAGE_EMULATOR_BINARY_PATH','STORAGE_EMULATOR_VERSION']){process.env[key]='synthetic';try{guard.installStorageRuntimeAdapter();process.exit(21)}catch(e){if(!e.message.includes('override'))throw e}delete process.env[key]}
 const old=process.env.FIREBASE_EMULATORS_PATH;process.env.FIREBASE_EMULATORS_PATH='/unowned';try{guard.installStorageRuntimeAdapter();process.exit(22)}catch(e){if(!e.message.includes('cache'))throw e}process.env.FIREBASE_EMULATORS_PATH=old;
 const Runtime=guard.installStorageRuntimeAdapter();const instance=new Runtime();instance._alive=true;await instance.start();
 const fs=await import('node:fs');const jar=guard.assertStorageJar();const preserved=jar+'.preserved-'+process.pid;
 fs.renameSync(jar,preserved);
 try{try{await instance.start();process.exit(24)}catch(e){if(e.code!=='ENOENT')throw e}}finally{fs.renameSync(preserved,jar)}
 guard.assertStorageJar();
 Runtime.prototype.start=async()=>{};try{guard.installStorageRuntimeAdapter();process.exit(23)}catch(e){if(!e.message.includes('identity drift'))throw e}
 console.log('SEAM_CONTROLS_PASS_NO_NATIVE_SPAWN');`;
 const result=spawnSync(process.execPath,['--input-type=module','-e',source],{cwd:ROOT,env,encoding:'utf8',timeout:10000,maxBuffer:65536});
 assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/SEAM_CONTROLS_PASS_NO_NATIVE_SPAWN/);
});

test('M3 Firebase autoconfig rejects remote services, unknown fields and even empty credential settings',()=>{
 for(const value of [{projectId:'demo-pinky-lamb-cms',storageBucket:'production.appspot.com'},{projectId:'demo-pinky-lamb-cms',databaseURL:'https://production.firebaseio.com'},{projectId:'demo-pinky-lamb-cms',apiKey:'synthetic'},null,[]])assert.throws(()=>validateRuntime({...childEnvironment({}),FIREBASE_CONFIG:JSON.stringify(value)}),/LOCAL_GUARD/);
 for(const key of ['GOOGLE_APPLICATION_CREDENTIALS','FIREBASE_TOKEN','FIREBASE_WEBAPP_CONFIG'])assert.throws(()=>validateRuntime({...childEnvironment({}),[key]:''}),/LOCAL_GUARD/);
 assert.equal(validateRuntime({...childEnvironment({}),FIREBASE_CONFIG:JSON.stringify({projectId:'demo-pinky-lamb-cms',storageBucket:'demo-pinky-lamb-cms.appspot.com'})}),true);
});

test('M3 inherited JVM overrides are removed and direct untrusted JVM options are refused',()=>{
 const env=childEnvironment({JAVA_TOOL_OPTIONS:'-Djava.io.tmpdir=/outside',JDK_JAVA_OPTIONS:'-javaagent:unowned',_JAVA_OPTIONS:'-Xmx4g'});
 for(const key of ['JAVA_TOOL_OPTIONS','JDK_JAVA_OPTIONS','_JAVA_OPTIONS'])assert.equal(env[key],undefined);
 for(const key of ['JAVA_TOOL_OPTIONS','JDK_JAVA_OPTIONS','_JAVA_OPTIONS'])assert.throws(()=>validateRuntime({...env,[key]:'synthetic'}),/LOCAL_GUARD/);
});

function storageStopFixture(){
 const run=createStorageRuntime(process.env);mkdirSync(`${run.runRoot}/tmp/firebase/storage/blobs`,{recursive:true,mode:0o700});
 const fs=createRequire(import.meta.url)('node:fs');
 for(const name of ['stdout.log','stderr.log','firebase-debug.log'])fs.writeFileSync(`${run.runRoot}/${name}`,'synthetic local log\n',{mode:0o600});
 fs.writeFileSync(`${run.runRoot}/tmp/hub-demo-pinky-lamb-cms.json`,JSON.stringify({version:'15.33.0',origins:['http://127.0.0.1:4400'],pid:process.pid}),{mode:0o600});return run;
}
test('M3 shutdown custody copies exact owned bytes before any signal; retained zero-byte object stays intact',()=>{
 const fs=createRequire(import.meta.url)('node:fs'),run=storageStopFixture();const state=inspectStorageStopState(run.runRoot);assert.ok(state.files.length>=5);
 const custody=preserveStorageStopState(run.runRoot);assert.equal(custody.blobs.entries,0);for(const file of custody.files)assert.deepEqual(readFileSync(file.copy),readFileSync(`${run.runRoot}/${file.relative}`));
 const sentinel=`${run.runRoot}/tmp/firebase/storage/blobs/retained-zero-byte`;fs.writeFileSync(sentinel,'',{flag:'wx'});
 assert.throws(()=>preserveStorageStopState(run.runRoot),/retained Storage object\/staging entry/);assert.equal(fs.lstatSync(sentinel).size,0);
});
test('M3 shutdown refuses missing, symlink, hardlink and unknown FIFO state without consuming fixtures',()=>{
 const fs=createRequire(import.meta.url)('node:fs');const missing=createStorageRuntime();assert.throws(()=>inspectStorageStopState(missing.runRoot));
 const link=storageStopFixture();symlinkSync('/private/tmp/unowned-never-read',`${link.runRoot}/data/untrusted`);assert.throws(()=>inspectStorageStopState(link.runRoot),/unknown Storage type/);assert.equal(fs.readlinkSync(`${link.runRoot}/data/untrusted`),'/private/tmp/unowned-never-read');
 const hard=storageStopFixture();fs.linkSync(`${hard.runRoot}/stdout.log`,`${hard.runRoot}/data/hardlink`);assert.throws(()=>inspectStorageStopState(hard.runRoot),/unknown Storage type\/link count/);
 const fifo=storageStopFixture();const result=spawnSync('/usr/bin/mkfifo',[`${fifo.runRoot}/data/unknown-fifo`]);assert.equal(result.status,0);assert.throws(()=>inspectStorageStopState(fifo.runRoot),/unknown Storage type\/link count/);assert.equal(fs.lstatSync(`${fifo.runRoot}/data/unknown-fifo`).isFIFO(),true);
});
test('M3 custody copy syscall failure throws before signal and leaves original bytes unchanged',()=>{
 const fs=createRequire(import.meta.url)('node:fs'),run=storageStopFixture(),before=readFileSync(`${run.runRoot}/stdout.log`),original=fs.writeFileSync;
 try{fs.writeFileSync=(target,...args)=>{if(String(target).includes('/task03/custody/'))throw Object.assign(new Error('SYNTHETIC_COPY_FAILURE'),{code:'EIO'});return original(target,...args);};syncBuiltinESMExports();assert.throws(()=>preserveStorageStopState(run.runRoot),/SYNTHETIC_COPY_FAILURE/);}finally{fs.writeFileSync=original;syncBuiltinESMExports();}
 assert.deepEqual(readFileSync(`${run.runRoot}/stdout.log`),before);
});
test('M3 ownership rejects missing/reused leader, changed JVM and recorded exit before signal',()=>{
 const record={pid:1001,ppid:1000,start:'Mon Oct 12 10:00:00 2026',argv:'owned fixed CLI',exit:null,close:null,jvm:null};
 const leader={pid:1001,ppid:1000,pgid:1001,start:record.start,argv:record.argv},jvm={pid:1002,ppid:1001,pgid:1001,start:record.start,argv:`java -Djava.security.manager=disallow -Duser.language=en -jar ${assertStorageJar()} serve`};
 assert.equal(validateStorageProcessOwnership(record,[leader,jvm]).jvm.pid,1002);
 for(const rows of [[],[{...leader,pgid:999},jvm],[{...leader,start:'changed'},jvm],[leader,{...jvm,ppid:999}],[leader,jvm,{...jvm,pid:1003}]])assert.throws(()=>validateStorageProcessOwnership(record,rows),/ownership/);
 assert.throws(()=>validateStorageProcessOwnership({...record,exit:{code:0}},[leader,jvm]),/already exited/);assert.throws(()=>validateStorageProcessOwnership({...record,jvm:{...jvm,pid:1003}},[leader,jvm]),/generation changed/);
});

function healthyHubMetadata(){
 const root={version:'15.33.0',origins:['http://127.0.0.1:4400'],pid:123,host:'127.0.0.1',port:4400},map={};
 for(const [name,port] of Object.entries({auth:9099,firestore:8080,functions:5001,hosting:5010,storage:9199,hub:4400,logging:4500}))map[name]={name,host:'127.0.0.1',port,listen:[{address:'127.0.0.1',family:'IPv4',port}]};return {root,map};
}
test('M3 suite metadata shape rejects missing/foreign components and cannot substitute projectId for ownership',()=>{
 const {root,map}=healthyHubMetadata();assert.equal(validateSuiteHubShape(root,map),true);
 for(const mutate of [(h,m)=>delete m.auth,(h,m)=>m.firestore.host='0.0.0.0',(h,m)=>m.functions.port=5002,(h,m)=>m.storage.listen[0].address='::1',h=>h.version='unreviewed',h=>h.origins=['http://foreign:4400'],h=>h.pid=NaN,h=>h.projectId='demo-pinky-lamb-cms']){const h=structuredClone(root),m=structuredClone(map);mutate(h,m);assert.throws(()=>validateSuiteHubShape(h,m),/LOCAL_GUARD/);}
});
test('M3 seed always refuses independently of readiness while offline modes remain available',async()=>{
 assert.throws(()=>commandPlan('seed'),/seed\/reseed not authorized/);await assert.rejects(()=>assertLocalLaunchAuthorized('seed'),/seed\/reseed not authorized/);
 for(const mode of ['unit','lint','build','export'])assert.equal(await assertLocalLaunchAuthorized(mode),true);
});
test('M3 missing current Hub refuses actual integration/e2e launcher before prepare/common writes or test child',()=>{
 const fs=createRequire(import.meta.url)('node:fs'),fingerprint=()=>['.local/config/configstore/firebase-tools.json','.local/firestore-deny.rules','.local/firebase-debug.log'].map(relative=>{try{const s=fs.lstatSync(`${ROOT}/${relative}`);return {relative,size:s.size,mtime:s.mtimeMs,ino:s.ino};}catch(e){if(e.code!=='ENOENT')throw e;return {relative,missing:true};}}),before=fingerprint();
 for(const mode of ['integration','e2e','seed']){
  const result=spawnSync(process.execPath,['scripts/local-guard.mjs',mode,...(mode==='seed'?[]:['--task','M1'])],{cwd:ROOT,env:{PATH:process.env.PATH,HOME:process.env.HOME},encoding:'utf8',timeout:6000,maxBuffer:65536});
  assert.equal(result.status,1,result.stderr);assert.equal(result.stdout,'');assert.match(result.stderr,mode==='seed'?/seed\/reseed not authorized/:/refuse suite before prepare\/child/);assert.deepEqual(fingerprint(),before);
 }
});
test('M3 healthy-looking foreign Hub remains refused without Approved producer/owned locator/generations',async()=>{
 const {root,map}=healthyHubMetadata(),original=globalThis.fetch,requests=[];
 try{globalThis.fetch=async(url,options)=>{requests.push({url,method:options.method,redirect:options.redirect});return new Response(JSON.stringify(url.endsWith('/emulators')?map:root),{status:200});};
 await assert.rejects(()=>assertLocalLaunchAuthorized('integration'),/no Approved full-suite producer/);assert.deepEqual(requests.map(r=>r.url),['http://127.0.0.1:4400/','http://127.0.0.1:4400/emulators']);assert.ok(requests.every(r=>r.method==='GET'&&r.redirect==='error'));
 }finally{globalThis.fetch=original;}
});

test('M3 Hub errors, response cap and malformed JSON stay refused; metadata mocks are policy coverage only',async()=>{
 const original=globalThis.fetch;
 try{
  for(const response of [()=>new Response('{}',{status:302}),()=>new Response('x'.repeat(65537),{status:200}),()=>new Response('invalid JSON',{status:200})]){
   globalThis.fetch=async()=>response();let error;try{await assertLocalLaunchAuthorized('e2e');}catch(e){error=e;}
   assert.ok(error);assert.equal(error.runtimeObservation.decision,'REFUSE_BEFORE_PREPARE_OR_CHILD');assert.ok(error.runtimeObservation.requests.every(r=>r.status==='UNPROVEN'));
  }
 }finally{globalThis.fetch=original;}
});
