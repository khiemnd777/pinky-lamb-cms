import {chromium} from '@playwright/test';
import {createInterface} from 'node:readline';
import {mkdirSync,realpathSync,readFileSync,writeFileSync,chmodSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {MultilingualBrowserSession} from '../tests/helpers/multilingual-browser-session.mjs';
import {childEnvironment,validateRuntime,installNetworkFence} from './local-guard.mjs';
import {p3LocalizationLive,readP3ResumeJournal} from '../tests/helpers/p3-localization-live.mjs';
import {projectReadonlyPhases} from '../tests/helpers/project-localization-live.mjs';

// P3 live writes require an explicit stage command and the separately approved exact target budget.
const [mode,id,resumeFlag,resumeId,...extraArgs]=process.argv.slice(2);
if(extraArgs.length||resumeFlag!==undefined&&(mode!=='p3-live'||resumeFlag!=='--resume-from'||!/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(resumeId??'')||resumeId===id))throw Error('Use p3-live <new-run-id> [--resume-from <original-run-id>]');
if(!['project-readonly','p3-live'].includes(mode)||!/^[A-Za-z0-9_-]+$/.test(id??'')||(mode==='project-readonly'?process.env.PINKY_MULTILINGUAL_READONLY_APPROVED!=='1':process.env.PINKY_MULTILINGUAL_P3_APPROVED!=='1'))throw Error('Usage after read-only authorization: PINKY_MULTILINGUAL_READONLY_APPROVED=1 node scripts/multilingual-browser-session.mjs project-readonly <exclusive-output-id>');
const root=realpathSync(fileURLToPath(new URL('..',import.meta.url)));
if(process.version!=='v22.23.3'||realpathSync(process.execPath)!==path.join(root,'.local/cache/node/node-v22.23.3-darwin-arm64/bin/node'))throw Error('Select pinned local Node22');
if(realpathSync(process.cwd())!==root)throw Error('Use CMS working directory');
const env=childEnvironment();validateRuntime(env);installNetworkFence();
const executablePath=path.join(root,'.local/cache/playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
if(realpathSync(executablePath)!==executablePath)throw Error('Pinned browser path changed');
const base=path.join(root,mode==='p3-live'?'.local/test-outputs/multilingual-001/p3-remainder-v1':'.local/test-outputs/cms-auth-remember-001/v1');mkdirSync(base,{recursive:true,mode:0o700});if(realpathSync(base)!==base)throw Error('Output symlink refused');
const run=path.join(base,id);mkdirSync(run,{mode:0o700});
const fixture=mode==='project-readonly'?JSON.parse(readFileSync(path.join(root,'.local/test-outputs/multilingual-001/p3-rep-v1/retained-after-20261016-v1/saved-fixture.private.json'),'utf8')):null;
const candidates=mode==='p3-live'?JSON.parse(readFileSync(path.join(root,'.local/test-outputs/multilingual-001/p3-remainder-v1/api-20261016-v1/candidates.private.json'),'utf8')):null;
const resume=mode==='p3-live'&&resumeId?readP3ResumeJournal(root,resumeId,candidates):null;
if(resume)writeFileSync(path.join(run,'resume-seed.private.json'),JSON.stringify({sourceRun:resume.sourceRun,sourceFiles:resume.sourceFiles,completedStages:[...resume.completedStages],successfulCommits:resume.successfulCommits,documentWrites:resume.documentWrites,admittedImmutableIntents:resume.intents.size})+'\n',{flag:'wx',mode:0o600});
let sequence=0;
const checkpoint=record=>writeFileSync(path.join(run,`checkpoint-${String(++sequence).padStart(4,'0')}.private.json`),JSON.stringify(record)+'\n',{flag:'wx',mode:0o600});
const profileParent=path.join(root,'.local/cache/multilingual-001'),profile=path.join(profileParent,'browser-profile');
mkdirSync(profileParent,{recursive:true,mode:0o700});if(realpathSync(profileParent)!==profileParent)throw Error('Owned profile parent symlink refused');chmodSync(profileParent,0o700);
mkdirSync(profile,{recursive:true,mode:0o700});if(realpathSync(profile)!==profile)throw Error('Owned profile symlink refused');chmodSync(profile,0o700);
const context=await chromium.launchPersistentContext(profile,{headless:false,env,executablePath,viewport:{width:1440,height:900},serviceWorkers:'block',args:['--disable-save-password-bubble'],handleSIGINT:false,handleSIGTERM:false,handleSIGHUP:false});
const browser=context.browser(),page=context.pages()[0]??await context.newPage();
page.setDefaultTimeout(15000);
let generation=0,project=mode==='p3-live'?p3LocalizationLive({page,context,run,candidates,generation,resume}):projectReadonlyPhases({page,fixture,run,generation});
const writeAdapter=mode==='p3-live'?project:null;
const owner=new MultilingualBrowserSession({browser,context,page,phases:project.phases,checkpoint,dispose:()=>context.close()});await owner.installFence();
// Restrict network to retained local app/public resources and normal local demo Auth.
await context.route('**/*',route=>{const url=new URL(route.request().url());return url.protocol==='http:'&&url.hostname==='127.0.0.1'&&['5273','5010','9099'].includes(url.port)?route.fallback():route.abort('blockedbyclient');});
const report=async result=>console.log(JSON.stringify({result,...await owner.status(),...(mode==='p3-live'?{p3Budget:writeAdapter.summary()}:{} )}));
let startupErrors=0,readinessVerified=false;page.on('pageerror',()=>{startupErrors++;});
async function readiness(){
 if(readinessVerified)throw Error('Readiness already passed; preserve current page/session');
 readinessVerified=false;startupErrors=0;
 try{
 await page.goto('http://127.0.0.1:5273/login');
 await page.evaluate(()=>{document.title='Multilingual read-only verification — normal demo OWNER login';});
 if(!browser.isConnected()||page.isClosed()||await page.title()!=='Multilingual read-only verification — normal demo OWNER login')throw Error('Browser page unready');
 await page.waitForFunction(()=>['AUTHORIZED','LOGIN_REQUIRED','RETRY_REQUIRED'].includes(document.documentElement.dataset.cmsAuthState),{},{timeout:25000});
 const phase=await page.locator('html').getAttribute('data-cms-auth-state');
 if(startupErrors||phase==='RETRY_REQUIRED')throw Error('Session readiness unproved');
 if(phase==='AUTHORIZED'){
  checkpoint({stage:'auth-restored',state:'AUTH_RESTORED_READY'});readinessVerified=true;await report('AUTH_RESTORED_READY');
 }else{
  if(!await page.locator('#login-panel').isVisible())throw Error('Login unavailable');
  const anonymous=await context.request.get('http://127.0.0.1:5273/api/cms/session');if(anonymous.status()!==401)throw Error('Anonymous API unready');
  checkpoint({stage:'login-handoff',state:'PAGE_READY_TITLE_VERIFIED'});readinessVerified=true;await report('LOGIN_READY');
 }
 }catch{await report('STARTUP_UNREADY_NO_LOGIN_HANDOFF_RUN_READINESS');}
}
console.log(JSON.stringify({plan:'Readiness first. AUTH_RESTORED_READY needs no login. Only if LOGIN_READY, use one normal OWNER login in the titled window. finish preserves SDK login; verify-logout is explicit.',windowTitle:'Multilingual read-only verification — normal demo OWNER login'}));
await readiness();
console.log(JSON.stringify({registeredStages:Object.entries(project.phases).map(([name,phase])=>({name,kind:phase.kind??'readonly'})),commands:['status','reload-readonly','readiness','wait-login','confirm-login','verify-remember','verify-logout','resume-readonly <registered-readonly-stage>','run-write <registered-P3-stage>','finish','close'],run}));
// EOF and command errors retain the owner. Only finish/close disposes the browser.
const keepAlive=setInterval(()=>{},60000),input=createInterface({input:process.stdin,terminal:false});
for await(const line of input){
 const [command,stage,...extra]=line.trim().split(/\s+/);
 try{
  if(extra.length||(!['resume-readonly','run-write'].includes(command)&&stage))throw Error('Invalid command');
  if(!readinessVerified&&!['status','readiness','close'].includes(command))throw Error('Readiness must pass before login or phases');
  if(command==='status')await report('STATUS');
  else if(command==='reload-readonly'){
   // Fixed local consumer only: no supplied URL, module path or executable text.
   const updated=await import(new URL(mode==='p3-live'?`../tests/helpers/p3-localization-live.mjs?generation=${++generation}`:`../tests/helpers/project-localization-live.mjs?generation=${++generation}`,import.meta.url).href);
   const replacement=mode==='p3-live'?updated.p3LocalizationLive({page,context,run,candidates,generation,resume}):updated.projectReadonlyPhases({page,fixture,run,generation});
   try{await owner.replaceReadonlyPhases(Object.fromEntries(Object.entries(replacement.phases).filter(([,phase])=>phase.kind!=='write')));}catch{replacement.dispose();throw Error('Readonly replacement rejected');}
   project.dispose();project=replacement;await report('READ_ONLY_CONSUMER_RELOADED_SAME_SESSION');
  }
  else if(command==='readiness')await readiness();
  else if(command==='confirm-login'){await owner.confirmLogin(project.loginReady);await report('NORMAL_LOGIN_REVALIDATED');}
  else if(command==='wait-login'){const ready=await owner.waitForLogin(project.loginReady);await report(ready?'LOGIN_OBSERVED':'LOGIN_WAIT_EXPIRED_BROWSER_RETAINED');}
  else if(command==='run-write'){if(mode!=='p3-live'||process.env.PINKY_MULTILINGUAL_P3_WRITE_APPROVED!=='1')throw Error('No P3 write authorization');await owner.runPhase(stage);await report('P3_WRITE_STAGE_CHECKPOINTED');}
  else if(command==='verify-remember'){await owner.resumeReadonly('remember');console.log(JSON.stringify(project.rememberResult()));await report('REMEMBER_RELOAD_NEW_TAB_VERIFIED');}
  else if(command==='verify-logout'){await owner.finish(project.verifyLogout);await report('EXPLICIT_LOGOUT_VERIFIED');break;}
  else if(command==='resume-readonly'){if(!await project.loginReady())throw Error('Normal OWNER session unavailable');await owner.resumeReadonly(stage);await report('READ_ONLY_STAGE_COMPLETE');}
  else if(command==='finish'){await owner.finish(project.cleanup);await report('PRIVATE_PAGE_RELEASED_AUTH_PRESERVED');break;}
  else if(command==='close'){await owner.close();await report('CLOSED_WITHOUT_LOGOUT_PROOF');break;}
  else throw Error('Unknown command');
 }catch{await report('COMMAND_FAILED_BROWSER_RETAINED_IF_ALIVE');}
}
if(!(await owner.status()).alive){clearInterval(keepAlive);input.close();}
