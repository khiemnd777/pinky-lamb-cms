import {validateLocalDataRuntime,installLocalDataNetworkFence} from './local-data-guard.mjs';
validateLocalDataRuntime();installLocalDataNetworkFence();process.umask(0o077);
const [{db},{createSiteV3MediaProvider},{createLocalizedEligibilityService},{createReadinessWorker}]=await Promise.all([import('../cms-api/authorization.mjs'),import('../cms-api/site-v3-media-provider.mjs'),import('../cms-api/localized-eligibility.mjs'),import('../cms-api/readiness-projection.mjs')]);
if(!db.content)throw Error('Content migration required');
// This internal principal cannot execute a user command. HTTP reads still use
// the real session/ACL; no cookie or impersonated owner is persisted in jobs.
const authorize=async (_request,action)=>{if(action!=='MEMBER_READ')throw Error('Read-only projection worker');return {uid:'internal-content-projection',role:'REVIEWER'};};
const mediaProvider=createSiteV3MediaProvider({db,writeVerification:true});
const worker=createReadinessWorker({db,createEligibility:readinessCache=>createLocalizedEligibilityService({db,authorize,mediaProvider,readinessCache})});
let stopped=false,timer;
async function pump(){if(stopped)return;const result=await worker.tick();if(result)console.log('CONTENT_WORKER_LOCAL:',JSON.stringify(result));if(!stopped)timer=setTimeout(()=>void pump(),250);}
function stop(){stopped=true;clearTimeout(timer);}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
await pump();
