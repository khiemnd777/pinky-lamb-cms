import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {realpathSync,mkdirSync,writeFileSync,lstatSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {ROOT,PROJECT,childEnvironment,validateRuntime,installNetworkFence} from './local-guard.mjs';
const validWorkServicesBundlePath=value=>typeof value==='string'&&/^\.local\/(?:test-outputs|cache)\/multilingual-001\/p3-remainder-v1\/[A-Za-z0-9_./-]+\.json$/.test(value)&&!value.split('/').some(part=>!part||part==='.'||part==='..');
import {assertProjectOwnedPath} from './export-project-localization-local.mjs';
export const P3_REMAINDER_UNIT_TESTS=Object.freeze(['service-localization-contract','service-localization-context','service-localization-api','service-localization-editor','service-localization-preview','service-localization-renderer','work-services-localization-contract','work-services-localization-api','work-services-localization-editor','work-services-localization-renderer','site-locale-projection','work-services-export','work-services-runner','multilingual-shell-export','project-localization-renderer','site-locale'].map(name=>`tests/${name}.test.mjs`));
export function multilingualP3Plan(args){
 if(!Array.isArray(args)||args.length<4||args[0]!=='--mode'||args[2]!=='--run-id')throw Error('Use --mode unit|api|fixture|build|export --run-id <id>');
 const [mode,runId]=[args[1],args[3]];if(!['unit','api','fixture','build','export'].includes(mode)||typeof runId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(runId))throw Error('Invalid P3 selector');
 if(mode==='export'){if(args.length!==6||args[4]!=='--bundle'||!validWorkServicesBundlePath(args[5]))throw Error('Invalid P3 bundle');}else if(args.length!==4)throw Error('Unexpected P3 arguments');
 return {mode,runId,projectId:PROJECT,evidenceRoot:`.local/test-outputs/multilingual-001/p3-remainder-v1/${runId}`,bundle:mode==='export'?args[5]:null,tests:mode==='unit'?[...P3_REMAINDER_UNIT_TESTS]:[],retainedWrites:false,authMutations:false,emulatorLifecycle:false,hostingActivation:false};
}
export async function runMultilingualP3(args){
 const plan=multilingualP3Plan(args),env=childEnvironment();validateRuntime({...env,...process.env});validateRuntime(env);installNetworkFence();
 if(process.version!=='v22.23.3'||realpathSync(process.cwd())!==ROOT||realpathSync(process.execPath)!==path.join(ROOT,'.local/cache/node/node-v22.23.3-darwin-arm64/bin/node'))throw Error('Use pinned Node/CMS cwd');
 const evidence=assertProjectOwnedPath(path.join(ROOT,plan.evidenceRoot),{missing:true});mkdirSync(path.dirname(evidence),{recursive:true,mode:0o700});assertProjectOwnedPath(path.dirname(evidence));mkdirSync(evidence,{mode:0o700});const record=(name,value)=>writeFileSync(path.join(evidence,name),typeof value==='string'?value:JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});record('plan.json',plan);
 if(plan.mode==='export'){const {readWorkServicesBundle,exportWorkServicesBundle}=await import('./export-work-services-local.mjs');record('export-result.json',exportWorkServicesBundle(readWorkServicesBundle(plan.bundle),plan.runId));return 0;}
 if(plan.mode==='api'){
  const paths=['services/status',...['en','vi','ja'].flatMap(l=>[`services/brand-creative/${l}`,`services/brand-creative/${l}/qa`,`sections/work/${l}`,`sections/services/${l}`,`sections/work/${l}/qa`,`sections/services/${l}/qa`,`work-services/${l}/qa`])],checks=[];
  for(const suffix of paths){const response=await fetch(`http://127.0.0.1:5273/api/cms/localizations/${suffix}`,{redirect:'error',signal:AbortSignal.timeout(10000)});const body=await response.json();checks.push({suffix,status:response.status,pass:response.status===401&&body.error?.code==='UNAUTHENTICATED'});}
  record('api-result.json',{status:checks.every(c=>c.pass)?'PASS_ANONYMOUS_ONLY':'FAIL',checks,authenticated:'NOT_RUN_NORMAL_OWNER_ONLY',cmsWrites:0});return checks.every(c=>c.pass)?0:1;
 }
 let command;
 if(plan.mode==='fixture'){env.PINKY_P3_REMAINDER_FIXTURE='1';command=['node_modules/@playwright/test/cli.js','test','tests/multilingual-p3-ui.local.test.mjs','--workers=1',`--output=${plan.evidenceRoot}/browser-results`,'--reporter=json'];}
 else if(plan.mode==='build'){const out=assertProjectOwnedPath(path.join(evidence,'build'),{missing:true});try{lstatSync(out);throw Error('Build output exists');}catch(error){if(error.code!=='ENOENT')throw error;}command=['node_modules/vite/bin/vite.js','build','--outDir',out,'--emptyOutDir','false'];}
 else command=['--test','--test-concurrency=1',...plan.tests];
 return new Promise((resolve,reject)=>{const child=spawn(process.execPath,command,{cwd:ROOT,env,stdio:['ignore','pipe','pipe']});let output='';for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{output+=chunk;process.stdout.write(chunk);});child.on('error',reject);child.on('close',code=>{record(`${plan.mode}.log`,output);if(plan.mode==='fixture'&&code===0){try{const report=JSON.parse(output),stats=report.stats;if(!stats||stats.expected<1||stats.unexpected!==0||stats.flaky!==0||stats.skipped!==0){record('fixture-result.json',{status:'FAIL_EXECUTION_COVERAGE',stats:stats??null});return resolve(1);}record('fixture-result.json',{status:'PASS_CONTROLLED_FIXTURE',stats,cmsWrites:0,actualAuth:'NOT_RUN'});}catch{record('fixture-result.json',{status:'FAIL_REPORT_UNAVAILABLE'});return resolve(1);}}resolve(code??1);});});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))runMultilingualP3(process.argv.slice(2)).then(code=>{process.exitCode=code;}).catch(error=>{console.error(error.message);process.exitCode=1;});
