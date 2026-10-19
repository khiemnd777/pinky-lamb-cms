import path from 'node:path';
import {ROOT,validateLocalDataRuntime,installLocalDataNetworkFence} from './local-data-guard.mjs';
import {assertDurableAdminBuild} from './durable-admin-build.mjs';
validateLocalDataRuntime();installLocalDataNetworkFence();process.umask(0o077);
assertDurableAdminBuild(path.join(ROOT,'admin-dist'));
const [{handleRequest},{localAuthServer,db},{siteV3Dependencies},{toNodeHandler},{createBuiltAdminServer}]=await Promise.all([import('../cms-api/index.mjs'),import('../cms-api/authorization.mjs'),import('../cms-api/routes.mjs'),import('better-auth/node'),import('../cms-api/local-admin-server.mjs')]);
if(!db.content?.head())throw Error('Content migration required');
const dependencies=await siteV3Dependencies();
await Promise.all([import('../cms-api/content-service.mjs'),import('../cms-api/readiness-projection.mjs'),import('../cms-api/hero-localizations.mjs'),import('../cms-api/group-localizations.mjs'),import('../cms-api/project-localizations.mjs'),import('../cms-api/service-localizations.mjs'),import('../cms-api/work-services-localizations.mjs'),import('../cms-api/localized-editorial.mjs')]);
const {loadMediaProcessingProfile}=await import('../cms-api/media-processing-profile.mjs');
for(const kind of ['IMAGE','PDF','VIDEO'])loadMediaProcessingProfile(kind);
const {createContentService}=await import('../cms-api/content-service.mjs');createContentService(dependencies.options).groupRead('settings');
const {server,close}=createBuiltAdminServer({handleRequest,authHandler:toNodeHandler(localAuthServer),buildRoot:path.join(ROOT,'admin-dist')});
server.listen(5273,'127.0.0.1',()=>console.log('CMS_ADMIN_LOCAL: built Admin/API http://127.0.0.1:5273/login'));
server.requestTimeout=30000;server.headersTimeout=10000;
let stopping=false;async function stop(){
 if(stopping)return;stopping=true;console.log('CMS_ADMIN_LOCAL: draining active requests before closing database');
 try{await close();db.close();console.log('CMS_ADMIN_LOCAL: stopped');}
 catch(error){process.exitCode=1;console.error('CMS_ADMIN_LOCAL: shutdown failed',{code:error.code??'SHUTDOWN_FAILED'});}
}
process.on('SIGINT',()=>void stop());process.on('SIGTERM',()=>void stop());
