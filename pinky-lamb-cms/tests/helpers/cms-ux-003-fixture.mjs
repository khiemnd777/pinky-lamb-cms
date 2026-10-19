import assert from 'node:assert/strict';
import {realpathSync,readFileSync} from 'node:fs';
import {randomUUID,randomBytes} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {fixtureCollections,namespaceCollection,classifyFixtureRequest} from './cms-ux-003-isolation.mjs';

export async function createFixtureMediaProvider({db,load}){
 const {createSiteV3MediaProvider}=await load('cms-api/site-v3-media-provider.mjs');
 return createSiteV3MediaProvider({db});
}

/** Explicit lifecycle: callers MUST close in finally, after adapter disposal/browser close.
 * Tokens/passwords live only in process memory. Every service data write is namespaced.
 * Only exact absent-owned cmsMembers/Auth accounts are canonical synthetic resources.
 */
export async function createCmsUx003Fixture({canonicalRoot,record=()=>{}}){
 const load=relative=>import(pathToFileURL(path.join(canonicalRoot,relative)).href);
 const {ROOT,childEnvironment,validateConfig,validateRuntime,installNetworkFence}=await load('scripts/local-guard.mjs');
 assert.equal(realpathSync(canonicalRoot),ROOT);assert.equal(realpathSync(process.cwd()),ROOT);
 assert.equal(process.version,'v22.23.3');assert.equal(realpathSync(process.execPath),path.join(ROOT,'.local/cache/node/node-v22.23.3-darwin-arm64/bin/node'));
 validateConfig();const env=childEnvironment();validateRuntime({...env,...process.env});validateRuntime(env);Object.assign(process.env,env);installNetworkFence();
 const retainedBaseline=JSON.parse(readFileSync(path.join(ROOT,'.local/test-outputs/cms-ux-003/v6/fixture/retained-before.json'),'utf8'));
 assert.equal(retainedBaseline.kind,'guarded-read-only-retained-scoped-inventory');assert.equal(retainedBaseline.phase,'before');assert.equal(retainedBaseline.canonicalWrites,0);assert.ok(retainedBaseline.collections.cmsDrafts.documents.some(doc=>doc.id==='home-v3'));
 const {db,auth,authorize}=await load('cms-api/authorization.mjs');
 const namespace='cmsux003_'+randomUUID().replaceAll('-','');
 const owned=[],tokens=new Map(),credentials=new Map();let closed=false,preflight=false;
 const request=role=>{assert.ok(tokens.has(role),'Fixture role unavailable');return {headers:{authorization:'Bearer '+tokens.get(role)}};};
 const actor=role=>({uid:namespace+'_'+role.toLowerCase(),role});
 const facade={collection(name){return db.collection(namespaceCollection(namespace,name));},runTransaction:callback=>db.runTransaction(callback)};
 async function close(){
  if(closed)return;closed=true;
  let documents=0,members=0,users=0;
  try{
   if(preflight){
    for(const name of fixtureCollections){const collection=facade.collection(name),rows=await collection.get();for(const doc of rows.docs){assert.equal(doc.ref.parent.id,namespaceCollection(namespace,name));await doc.ref.delete();documents++;}assert.equal((await collection.limit(1).get()).empty,true);}
    for(const uid of owned){
     const reference=db.collection('cmsMembers').doc(uid),member=await reference.get();
     if(member.exists){assert.equal(member.data().uid,uid);assert.equal(member.data().expectedEmail,uid+'@pinky.test');await reference.delete();members++;assert.equal((await reference.get()).exists,false);}
     let user;try{user=await auth.getUser(uid);}catch(error){if(error.code!=='auth/user-not-found')throw error;}
     if(user){assert.equal(user.email,uid+'@pinky.test');await auth.deleteUser(uid);users++;await assert.rejects(()=>auth.getUser(uid),error=>error.code==='auth/user-not-found');}
    }
   }
   record({event:'cleanup',status:'PASS',namespace,documents,members,users,remainingNamespaceDocs:0});
  }catch(error){record({event:'cleanup',status:'FAIL',namespace,code:error.code??error.name});throw error;}
  finally{tokens.clear();credentials.clear();}
 }
 try{
  for(const name of fixtureCollections)assert.equal((await facade.collection(name).limit(1).get()).empty,true);
  for(const role of ['OWNER','EDITOR','REVIEWER','PUBLISHER']){
   const {uid}=actor(role),email=uid+'@pinky.test';
   await assert.rejects(()=>auth.getUser(uid),error=>error.code==='auth/user-not-found');
   await assert.rejects(()=>auth.getUserByEmail(email),error=>error.code==='auth/user-not-found');
   assert.equal((await db.collection('cmsMembers').doc(uid).get()).exists,false);
  }
  preflight=true;record({event:'namespace-preflight',namespace,status:'PASS',collections:fixtureCollections});
  for(const role of ['OWNER','EDITOR','REVIEWER','PUBLISHER']){
   const {uid}=actor(role),email=uid+'@pinky.test',password=randomBytes(24).toString('base64url');owned.push(uid);
   await auth.createUser({uid,email,password,emailVerified:true,disabled:false});
   await db.collection('cmsMembers').doc(uid).create({uid,role,isActive:true,authzVersion:1,expectedEmail:email});
   const response=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-local-only',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true}),signal:AbortSignal.timeout(15000)}),body=await response.json();
   assert.equal(response.status,200);assert.equal(body.localId,uid);tokens.set(role,body.idToken);credentials.set(role,{email,password});
   assert.equal((await authorize(request(role),'MEMBER_READ')).role,role);
  }
  const {loadBaselineInputs,mapBaselineSite}=await load('scripts/map-baseline-site.mjs'),{encodeStoredContent}=await load('contracts/draft.mjs');
  const baseline=mapBaselineSite(loadBaselineInputs()),catalog=baseline.context.catalog;
  const options={db:facade,authorize,baselineProvider:()=>baseline,catalogProvider:()=>catalog,mediaProvider:await createFixtureMediaProvider({db:facade,load})};
  await facade.collection('cmsDrafts').doc('home').create({contentJson:encodeStoredContent({schemaVersion:1,locale:baseline.content.locale,hero:baseline.content.hero,seo:baseline.content.seo},{catalog}),revision:159,updatedBy:actor('OWNER').uid,updatedAt:new Date().toISOString(),lastEventId:namespace+'-initial'});
  const {createSiteImportService}=await load('cms-api/import-site.mjs'),{createSiteV3DraftService}=await load('cms-api/site-v3-drafts.mjs'),{createSiteV3SnapshotService}=await load('cms-api/site-v3-snapshots.mjs'),{createSiteV3ReviewService}=await load('cms-api/site-v3-reviews.mjs');
  const context=role=>({request:request(role),actor:actor(role),correlationId:namespace});
  await (await createSiteImportService(options)).importSite({...context('OWNER'),body:{expectedM1Revision:159,baselineManifestHash:baseline.provenance.baselineManifestHash},key:namespace+'-m2'});
  const drafts=await createSiteV3DraftService(options),snapshots=await createSiteV3SnapshotService(options),reviews=await createSiteV3ReviewService(options);
  await drafts.importSite({...context('OWNER'),body:{expectedM2Revision:0},key:namespace+'-m3'});
  const {siteErrorResponse}=await load('cms-api/routes.mjs');
  record({event:'fixture-ready',namespace,status:'PASS',proof:'actual authorization/services/SDK with namespace facade; not HTTP-handler E2E'});
  return {
   namespace,facade,context,drafts,snapshots,reviews,close,
   async readMedia(url,{role='EDITOR'}={}){
    assert.equal(closed,false);assert.equal(classifyFixtureRequest('GET',url),'media-read');
    const response=await fetch(url,{method:'GET',headers:{Authorization:request(role).headers.authorization,Origin:'http://127.0.0.1:5173'},redirect:'error',signal:AbortSignal.timeout(15000)});
    const cap=64*1024*1024;assert.ok(Number(response.headers.get('content-length')??0)<=cap,'Read-only media exceeds test budget');
    const chunks=[];let size=0;
    for await(const chunk of response.body){size+=chunk.byteLength;if(size>cap)throw Error('Read-only media exceeds test budget');chunks.push(chunk);}
    const headers=Object.fromEntries(['content-type','cache-control','x-content-type-options','x-media-sha256','x-media-generation'].flatMap(key=>response.headers.has(key)?[[key,response.headers.get(key)]]:[]));
    return {status:response.status,headers,body:Buffer.concat(chunks)};
   },
   async signIn(page,role='EDITOR'){
    // Only owned synthetic credentials are filled. No retained browser storage is read.
    assert.ok(credentials.has(role));const value=credentials.get(role);
    await page.getByLabel('Email',{exact:true}).fill(value.email);
    await page.getByLabel('Mật khẩu',{exact:true}).fill(value.password);
    await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
   },
   errorResponse:error=>siteErrorResponse(error,namespace),
   async dispatch(kind,{role='EDITOR',body,key,url}){
    assert.equal(closed,false,'Fixture already closed');const ctx=context(role);
    if(kind==='session-read')return {...await authorize(ctx.request,'MEMBER_READ'),isActive:true};
    if(kind==='draft-read')return drafts.readDraft(ctx);
    if(kind==='draft-save')return drafts.saveDraft({...ctx,body,key});
    if(kind==='snapshot-submit')return snapshots.submitSnapshot({...ctx,body,key});
    if(kind==='review-submit')return reviews.submitReview({...ctx,body,key});
    if(kind==='preview-read'){
     const query=new URL(url).searchParams;assert.deepEqual([...query.keys()],['expectedRevision']);
     assert.match(query.get('expectedRevision'),/^(0|[1-9][0-9]{0,15})$/);
     return drafts.readPreviewManifest({...ctx,query:{expectedRevision:Number(query.get('expectedRevision'))}});
    }
    throw Error('Unhandled fixture route');
   },
  };
 }catch(error){await close();throw error;}
}
