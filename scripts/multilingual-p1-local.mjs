import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {realpathSync,mkdirSync,writeFileSync,lstatSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {ROOT,PROJECT,childEnvironment,validateRuntime,installNetworkFence} from './local-guard.mjs';
import {readHeroBundle,exportHeroBundle} from './export-hero-localization-local.mjs';
export const P1_PURE_TESTS=Object.freeze(['contract','api','routes','editor','preview','renderer','export','runner'].map(name=>`tests/hero-localization-${name}.test.mjs`));
export function multilingualP1Plan(args,{profile='v1'}={}){
 if(!['v1','v2'].includes(profile))throw Error('Invalid P1 profile');
 if(!Array.isArray(args)||args.length<4||args[0]!=='--mode'||args[2]!=='--run-id')throw Error('Use --mode unit|api|browser|export --run-id <run-id>');
 const mode=args[1],runId=args[3];if(!['unit','api','browser','export'].includes(mode)||!/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(runId??''))throw Error('Invalid P1 selector');
 if(mode==='export'){if(args.length!==6||args[4]!=='--bundle'||typeof args[5]!=='string'||!new RegExp(`^\\.local/(?:test-outputs|cache)/multilingual-001/p1-${profile}/[A-Za-z0-9_./-]+\\.json$`).test(args[5])||args[5].split('/').some(p=>!p||p==='.'||p==='..'))throw Error('Invalid P1 bundle path');}
 else if(args.length!==4)throw Error('P1 selector rejects extra arguments');
 return {profile,mode,runId,projectId:PROJECT,evidenceRoot:`.local/test-outputs/multilingual-001/p1-${profile}/${runId}`,bundle:mode==='export'?args[5]:null,tests:mode==='unit'?[...P1_PURE_TESTS,...(profile==='v2'?['tests/hero-localization-text.test.mjs','tests/hero-localization-context.test.mjs']:[])]:[],retainedWrites:false,authMutations:false,emulatorLifecycle:false,hostingActivation:false};
}
export async function runMultilingualP1(args,options){
 const plan=multilingualP1Plan(args,options),env=childEnvironment();validateRuntime({...env,...process.env});validateRuntime(env);installNetworkFence();
 if(process.version!=='v22.23.3'||realpathSync(process.cwd())!==ROOT||realpathSync(process.execPath)!==path.join(ROOT,'.local/cache/node/node-v22.23.3-darwin-arm64/bin/node'))throw Error('Use pinned local Node and CMS workspace');
 // API/browser need an existing human login and preservation preflight. The
 // runner never mints tokens, changes members or starts/restarts emulators.

 let current=ROOT;for(const part of plan.evidenceRoot.split('/')){current=path.join(current,part);try{const st=lstatSync(current);if(!st.isDirectory()||st.isSymbolicLink())throw Error('Unsafe evidence directory');}catch(error){if(error.code!=='ENOENT')throw error;mkdirSync(current,{mode:0o700});}}
 if(plan.mode==='api'){
  const checks=[];for(const locale of ['en','vi','ja'])for(const method of ['GET','PUT']){const response=await fetch(`http://127.0.0.1:5273/api/cms/hero-localizations/home-v3/${locale}`,{method,redirect:'error',signal:AbortSignal.timeout(10000),...(method==='PUT'?{headers:{'Content-Type':'application/json','Idempotency-Key':'ml001-p1-anonymous'},body:'{}'}:{})});const body=await response.json();checks.push({locale,method,status:response.status,code:body.error?.code,pass:response.status===401&&body.error?.code==='UNAUTHENTICATED'});}
  const result={status:checks.every(c=>c.pass)?'PASS_ANONYMOUS_ONLY':'FAIL',checks,authenticated:'NOT_RUN: existing human demo session required; use CMS UI save/readback',roles:'NOT_RUN: no role/account mutation',retainedWrites:false};writeFileSync(path.join(ROOT,plan.evidenceRoot,'api-result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify(result));return checks.every(c=>c.pass)?0:1;
 }
 if(plan.mode==='export'){const result=exportHeroBundle(readHeroBundle(plan.bundle,{profile:plan.profile}),plan.runId,{profile:plan.profile});writeFileSync(path.join(ROOT,plan.evidenceRoot,'export-result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});return 0;}
 return new Promise((resolve,reject)=>{env.PINKY_MULTILINGUAL_PROFILE=plan.profile;const command=plan.mode==='browser'?['node_modules/@playwright/test/cli.js','test','tests/hero-localization-ui.local.test.mjs','--workers=1',`--output=${plan.evidenceRoot}/browser-results`,'--reporter=list']:['--test','--test-concurrency=1',...plan.tests];const child=spawn(process.execPath,command,{cwd:ROOT,env,stdio:['ignore','pipe','pipe']});let output='';for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{output+=chunk;process.stdout.write(chunk);});child.on('error',reject);child.on('close',code=>{writeFileSync(path.join(ROOT,plan.evidenceRoot,`${plan.mode}.log`),output,{flag:'wx',mode:0o600});resolve(code??1);});});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))runMultilingualP1(process.argv.slice(process.argv[2]==='--profile-v2'?3:2),{profile:process.argv[2]==='--profile-v2'?'v2':'v1'}).then(code=>{process.exitCode=code;}).catch(error=>{console.error(error.message);process.exitCode=1;});
