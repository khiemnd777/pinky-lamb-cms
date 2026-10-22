// Explicit manual QA fixture: synthetic store/account, real services and editor.
// It never opens the retained .cms-data-local store or exposes publication routes.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import express from 'express';
import {betterAuth} from 'better-auth';
import {getMigrations} from 'better-auth/db/migration';
import {toNodeHandler,fromNodeHeaders} from 'better-auth/node';
import {build} from 'vite';
import {createNativeContentFixture,createReadinessWorker,createLocalizedEligibilityService} from './content-native-fixture.mjs';
import {GROUP_IDS,groupContentFromSource} from '../../contracts/group-localization.mjs';
import {localizedHeroFromBase} from '../../contracts/hero-localization.mjs';
import {ApiError,errorEnvelope} from '../../contracts/errors.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url)),origin='http://127.0.0.1:5283';
const output=path.join(root,'.local/test-outputs/video-sources-001/isolated-cms');
fs.mkdirSync(output,{recursive:true});
const fixture=await createNativeContentFixture(),db=fixture.db;
const {createContentService}=await import('../../cms-api/content-service.mjs');
const {createSiteV3MediaProvider}=await import('../../cms-api/site-v3-media-provider.mjs');
const {createGroupLocalizationService}=await import('../../cms-api/group-localizations.mjs');
const {createHeroLocalizationService}=await import('../../cms-api/hero-localizations.mjs');
const {createWorkServicesLocalizationService}=await import('../../cms-api/work-services-localizations.mjs');
const {createFullSiteLocalizationService}=await import('../../cms-api/full-site-localizations.mjs');
const {readReadinessProjection}=await import('../../cms-api/readiness-projection.mjs');
const authOptions={database:db.sqlite,secret:randomUUID()+randomUUID(),baseURL:origin,trustedOrigins:[origin],telemetry:{enabled:false},advanced:{cookiePrefix:'pinky-video-synthetic-qa'},emailAndPassword:{enabled:true,requireEmailVerification:true}};
await (await getMigrations(authOptions)).runMigrations();
const enrollment=betterAuth(authOptions),email='video-qa@example.invalid';
// Disposable synthetic credential; has no authority in the real CMS.
await enrollment.api.signUpEmail({body:{email,password:'Synthetic-video-QA-2026!',name:'Video QA'}});
db.sqlite.prepare('UPDATE user SET emailVerified=1 WHERE email=?').run(email);
const auth=betterAuth({...authOptions,emailAndPassword:{...authOptions.emailAndPassword,disableSignUp:true}});
await db.collection('cmsMembers').doc('synthetic-owner').create({uid:'synthetic-owner',expectedEmail:email,isActive:true,role:'OWNER',authzVersion:1});
async function authorize(request,action,tx){
 const identity=await auth.api.getSession({headers:fromNodeHeaders(request.headers)});
 if(!identity?.user?.emailVerified||!identity.session)throw new ApiError('UNAUTHENTICATED');
 const ref=db.collection('cmsMembers').doc('synthetic-owner'),member=(await (tx?tx.get(ref):ref.get())).data();
 if(!member?.isActive||member.expectedEmail!==identity.user.email||member.role!=='OWNER'||!['MEMBER_READ','DRAFT_SAVE'].includes(action))throw new ApiError('FORBIDDEN');
 tx?.validate(()=>Boolean(db.sqlite.prepare('SELECT id FROM session WHERE id=? AND userId=? AND expiresAt>?').get(identity.session.id,identity.user.id,Date.now())));
 return {uid:member.uid,role:member.role,authzVersion:member.authzVersion};
}
const options={...fixture.options,authorize,mediaProvider:createSiteV3MediaProvider({db})};
const content=createContentService(options),groups=await createGroupLocalizationService(options),hero=await createHeroLocalizationService(options),sections=await createWorkServicesLocalizationService(options),full=await createFullSiteLocalizationService(options);
const worker=createReadinessWorker({db,createEligibility:readinessCache=>createLocalizedEligibilityService({...options,readinessCache})});
const login=await auth.api.signInEmail({body:{email,password:'Synthetic-video-QA-2026!',rememberMe:true},asResponse:true});
const cookie=login.headers.getSetCookie().map(v=>v.split(';')[0]).join('; '),request={method:'GET',headers:{cookie}},actor=await authorize(request,'MEMBER_READ');
// Other saved sections are prerequisites. About is intentionally absent until
// the browser saves a source and then its matching localized About draft.
for(const groupId of GROUP_IDS.filter(id=>id!=='about')){const read=await groups.readDraft({request,groupId,locale:'en'});await groups.saveDraft({request,actor,groupId,locale:'en',key:randomUUID(),body:{contractRevision:1,expectedRevision:null,expectedDependencyHash:read.base.dependencyHash,content:groupContentFromSource(groupId,read.base.source)}});}
const h=await hero.readDraft({request,locale:'en'});await hero.saveDraft({request,actor,locale:'en',key:randomUUID(),body:{expectedRevision:null,baseRevision:h.base.revision,baseContentHash:h.base.contentHash,expectedDependencyHash:h.base.dependencyHash,content:localizedHeroFromBase(h.base.hero)}});
for(const sectionId of ['work','services']){const read=await sections.readDraft({request,sectionId,locale:'en'}),source=read.base.section;await sections.saveDraft({request,actor,sectionId,locale:'en',key:randomUUID(),body:{contractRevision:1,expectedRevision:null,expectedDependencyHash:read.base.dependencyHash,content:{heading:source.heading,intro:source.intro,eyebrow:'Synthetic QA',...(sectionId==='work'?{loadMoreLabel:'More projects'}:{})}}});}

const entry=path.join(output,'entry.mjs');
fs.writeFileSync(entry,`
import {mountContentWorkspaceEditor} from '${path.join(root,'admin/content-workspace-editor.mjs')}';
import {createContentLocaleSession} from '${path.join(root,'admin/content-locale-session.mjs')}';
import {createLocalAuthClient} from '${path.join(root,'admin/local-auth-client.mjs')}';
import '${path.join(root,'preview/pinky-video-player.css')}';
${['admin.css','pinky-select.css','site-ux.css','site-collections.css','site-services-ux.css','site-settings-ux.css','site-content-ux.css'].map(p=>`import '${path.join(root,'admin',p)}';`).join('\n')}
const client=createLocalAuthClient();let member=null;
async function apiFetch(url,options={}){const result=await fetch(url,{...options,credentials:'same-origin',headers:{...options.headers}});const body=await result.json();if(!result.ok)throw Object.assign(Error(body.error?.message??'QA request failed'),{status:result.status,code:body.error?.code});return body;}
async function mount(){await client.auth.authStateReady();if(!client.auth.currentUser)return;const bootstrap=await apiFetch('/api/cms/workspace');member=bootstrap.member;document.querySelector('#qa-login').hidden=true;document.querySelector('#qa-status').textContent='CMS thử · '+member.role+' · kho dữ liệu tách biệt';const localeSession=createContentLocaleSession({getSession:()=>member});window.addEventListener('cms:site-navigation',e=>document.querySelector('#qa-nav').replaceChildren(e.detail.node));mountContentWorkspaceEditor(document.querySelector('#private-content'),{apiFetch,getSession:()=>member,session:member,localeSession,bootstrap});}
document.querySelector('#qa-login').addEventListener('submit',async e=>{e.preventDefault();try{await client.signInWithEmailAndPassword(client.auth,document.querySelector('#qa-email').value,document.querySelector('#qa-password').value);await mount();}catch{document.querySelector('#qa-status').textContent='Không đăng nhập được tài khoản thử.';}});await mount();
`);
await build({configFile:false,root,logLevel:'warn',build:{outDir:path.join(output,'public'),emptyOutDir:false,rollupOptions:{input:entry,output:{entryFileNames:'qa.js',assetFileNames:'[name][extname]'}}}});
const publicRoot=path.join(output,'public'),css=fs.readdirSync(publicRoot).filter(v=>v.endsWith('.css'));
fs.writeFileSync(path.join(publicRoot,'index.html'),`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="strict-origin-when-cross-origin"><title>CMS thử riêng — Video</title>${css.map(p=>`<link rel="stylesheet" href="/${p}">`).join('')}<body><header style="padding:20px;background:#fde1e1"><h1>CMS thử riêng — Video</h1><p id="qa-status">Tài khoản tổng hợp; không dùng dữ liệu hoặc phiên CMS thật. Không có thao tác xuất bản.</p></header><form id="qa-login"><label>Email thử<input id="qa-email" type="email" autocomplete="off"></label><label>Mật khẩu thử<input id="qa-password" type="password" autocomplete="off"></label><button>Đăng nhập tài khoản thử</button></form><nav id="qa-nav"></nav><main id="private-content"></main><script type="module" src="/qa.js"></script></body></html>`);
const app=express();app.disable('x-powered-by');
app.use((req,res,next)=>{if(req.headers.host!=='127.0.0.1:5283'||req.headers.origin&&req.headers.origin!==origin||!['127.0.0.1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)){res.sendStatus(403);return;}res.set({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'});next();});
app.use('/api/auth', (req,res)=>{if(!['/get-session','/sign-in/email','/sign-out'].includes(req.path)){res.sendStatus(404);return;}return toNodeHandler(auth)(req,res);});
app.use(express.json({limit:'1mb'}));
app.use('/api/cms',async(req,res)=>{try{const actor=await authorize(req,req.method==='GET'?'MEMBER_READ':'DRAFT_SAVE');const url=req.path,key=req.headers['idempotency-key'];let result;
 if(url==='/workspace'&&req.method==='GET')result=await content.bootstrap({request:req});
 else if(url==='/localizations/editorial/readiness'&&req.method==='GET'){await worker.tick();result=readReadinessProjection(db);}
 else if(/^\/content\/groups\//.test(url)){const group=url.split('/').at(-1);result=req.method==='PATCH'?await content.saveGroup({request:req,actor,group,body:req.body,key,correlationId:randomUUID()}):await content.readGroup({request:req,group});if(req.method==='PATCH')console.log('QA_SOURCE_SAVED',JSON.stringify({group,revision:result.siteRevision,source:result.read.content.settings?.showreel?.sourceType}));}
 else if(url==='/localizations/groups/status')result=await groups.readStatus({request:req});
 else if(/^\/localizations\/groups\//.test(url)){const [, , ,groupId,locale]=url.split('/');const args={request:req,actor,groupId,locale,key,body:req.body};result=req.method==='PUT'?await groups.saveDraft(args):url.endsWith('/qa')?await groups.readQa(args):await groups.readDraft(args);if(req.method==='PUT')console.log('QA_LOCALIZED_SAVED',JSON.stringify({groupId,locale,revision:result.revision}));}
 else if(/^\/hero-localizations\/home-v3\//.test(url)){const args={request:req,locale:url.split('/')[3]};result=url.endsWith('/qa')?await hero.readQa(args):await hero.readDraft(args);}
 else if(/^\/localizations\/sections\//.test(url)){const parts=url.split('/');result=await sections.readDraft({request:req,sectionId:parts[3],locale:parts[4]});}
 else if(/^\/localizations\/site\/en\/qa$/.test(url)){result=await full.readQa({request:req,locale:'en'});console.log('QA_PREVIEW_READ',JSON.stringify({source:result.groups.about.group.showreel.sourceType,videoId:result.groups.about.group.showreel.videoId,revision:result.groups.about.draft.revision}));}
 else throw new ApiError('NOT_FOUND');res.json(result);
 }catch(error){const safe=error instanceof ApiError?error:new ApiError('INTERNAL_ERROR');console.error('QA_REQUEST_ERROR',{path:req.path,code:safe.code,detail:error.message});res.status(safe.status).json(errorEnvelope(safe,randomUUID()));}});
app.use(express.static(publicRoot,{dotfiles:'deny'}));
const assets=express();assets.use((req,res,next)=>{res.set('Access-Control-Allow-Origin',origin);next();});assets.use(express.static(path.join(root,'public-baseline'),{dotfiles:'deny'}));
const server=app.listen(5283,'127.0.0.1',()=>console.log('SYNTHETIC_CMS_READY http://127.0.0.1:5283/'));
const assetServer=assets.listen(5010,'127.0.0.1');
process.on('SIGINT',()=>{server.close();assetServer.close();fixture.close();});
