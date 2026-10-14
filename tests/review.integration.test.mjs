import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {validateRuntime,installNetworkFence} from '../scripts/local-guard.mjs';
validateRuntime();installNetworkFence();
const {db,authorize}=await import('../cms-api/authorization.mjs');
const {seedFixtures,fixturePassword}=await import('../scripts/seed-emulators.mjs');
const {loadTrustedCatalog,createDraftService,mutationIdentity,canonicalJson}=await import('../cms-api/drafts.mjs');
const {createSnapshotService,validateSnapshot,projectSourceReferences,snapshotHashes}=await import('../cms-api/snapshots.mjs');
const {createReviewService}=await import('../cms-api/reviews.mjs');
const api='http://127.0.0.1:5001/demo-pinky-lamb-cms/us-central1/cmsApi';
let catalog,original,tokens,lastWrittenDraft;
const intents=[],snapshots=new Set(),reviews=new Set();
const request=token=>({headers:{authorization:`Bearer ${token}`}});
async function signIn(name){const result=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-local-only',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:`${name}@pinky.test`,password:fixturePassword,returnSecureToken:true})});assert.equal(result.status,200);return (await result.json()).idToken;}
function intent(uid,operation,body){const key=`test08-${randomUUID()}`;intents.push({uid,operation,body,key});return key;}
async function context(name,action,body,operation,key){const req=request(tokens[name]);return {request:req,actor:await authorize(req,action),body,key:key??intent(`fixture-${name}`,operation,body),correlationId:'test08-integration'};}
async function submit(name='editor',message){const body={draftRevision:(await db.collection('cmsDrafts').doc('home').get()).data().revision,...(message!==undefined?{message}:{})};const service=await createSnapshotService({db,authorize,catalogProvider:()=>catalog});const result=await service.submitSnapshot(await context(name,'SNAPSHOT_SUBMIT',body,'POST /api/cms/snapshots'));snapshots.add(result.id);return result;}
async function read(id,name='reviewer'){const service=await createSnapshotService({db,authorize,catalogProvider:()=>catalog});return service.readSnapshot({request:request(tokens[name]),id});}
async function review(name,snapshot,overrides={},key){const body={snapshotId:snapshot.id,contentHash:snapshot.contentHash,expectedReviewRevision:0,outcome:'APPROVED',...overrides};const service=await createReviewService({db,authorize,catalogProvider:()=>catalog});const result=await service.submitReview(await context(name,'SNAPSHOT_REVIEW',body,'POST /api/cms/reviews',key));const state=(await db.collection('cmsReviewStates').doc(snapshot.id).get()).data();if(state?.activeReviewId)reviews.add(state.activeReviewId);return result;}
async function http(path,name,options={}){const response=await fetch(`${api}${path}`,{...options,headers:{Authorization:`Bearer ${tokens[name]}`,...options.headers}});return {status:response.status,body:await response.json()};}
async function counts(){const result={};for(const name of ['cmsSnapshots','cmsReviewStates','cmsReviews','cmsAudit','cmsIdempotency'])result[name]=(await db.collection(name).get()).docs.map(doc=>({id:doc.id,data:canonicalJson(doc.data())})).sort((a,b)=>a.id.localeCompare(b.id));return result;}
before(async()=>{await seedFixtures();catalog=loadTrustedCatalog();original=(await db.collection('cmsDrafts').doc('home').get()).data();tokens=Object.fromEntries(await Promise.all(['editor','reviewer','publisher','owner','unknown'].map(async name=>[name,await signIn(name)])));});
after(async()=>{
 if(original && lastWrittenDraft){
  const current=(await db.collection('cmsDrafts').doc('home').get()).data();
  // Preserve revision/history and refuse to replace any intervening edit.
  if(current.revision===lastWrittenDraft.revision && current.lastEventId===lastWrittenDraft.lastEventId){
   const body={expectedRevision:current.revision,patch:JSON.parse(original.contentJson)};
   delete body.patch.schemaVersion;delete body.patch.locale;
   await createDraftService({db,authorize,catalogProvider:()=>catalog}).saveDraft(await context('editor','DRAFT_SAVE',body,'PATCH /api/cms/drafts/home'));
  }
 }
 await db.terminate();
});
test('pure snapshot helpers import offline without SDK, environment or network',()=>{
 const result=spawnSync(process.execPath,['--input-type=module','-e',`globalThis.fetch=()=>{throw Error('network forbidden')};const {createRequire}=await import('node:module');const r=createRequire(import.meta.url);await import('./cms-api/snapshots.mjs');if(Object.keys(r.cache).some(path=>/firebase-admin|firebase-functions|google-auth-library/.test(path)))throw Error('SDK loaded');console.log('offline-import-pass')`],{env:{},encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/offline-import-pass/);
});
test('submission captures immutable encoded content, sorted manifest and conservative source lineage',async()=>{
 const summary=await submit('editor','Kiểm tra nội dung');const {snapshot,reviewState}=await read(summary.id);const stored=(await db.collection('cmsSnapshots').doc(summary.id).get()).data();assert.equal(stored.content,undefined);assert.equal(typeof stored.contentJson,'string');assert.equal(snapshot.contentJson,undefined);assert.equal(reviewState.status,'IN_REVIEW');assert.equal(reviewState.revision,0);assert.equal(reviewState.activeReviewId,null);
 assert.deepEqual(snapshot.mediaManifest.map(asset=>asset.id),['pinky-hero','showreel-2025','showreel-poster']);assert.deepEqual(snapshot.sourceRefs,projectSourceReferences(snapshot.mediaManifest));assert.ok(snapshot.sourceRefs.every(ref=>ref.verification==='UNVERIFIED' && ref.claimBindings.length===0));assert.deepEqual(snapshotHashes(snapshot.content,snapshot.mediaManifest),{contentHash:summary.contentHash,mediaManifestHash:summary.mediaManifestHash});
 const current=(await db.collection('cmsDrafts').doc('home').get()).data();const service=createDraftService({db,authorize,catalogProvider:()=>catalog});const body={expectedRevision:current.revision,patch:{hero:{...snapshot.content.hero,note:'Later draft only'}}};await service.saveDraft(await context('editor','DRAFT_SAVE',body,'PATCH /api/cms/drafts/home'));lastWrittenDraft=(await db.collection('cmsDrafts').doc('home').get()).data();assert.deepEqual((await read(summary.id)).snapshot,snapshot);
});
test('concurrent identical submissions converge to one snapshot/audit; changed keyed intent rejects',async()=>{
 const body={draftRevision:(await db.collection('cmsDrafts').doc('home').get()).data().revision};const key=intent('fixture-editor','POST /api/cms/snapshots',body);const service=await createSnapshotService({db,authorize,catalogProvider:()=>catalog});const c=await context('editor','SNAPSHOT_SUBMIT',body,'POST /api/cms/snapshots',key);const before=await counts();const results=await Promise.all([service.submitSnapshot(c),service.submitSnapshot(c)]);assert.deepEqual(results[0],results[1]);snapshots.add(results[0].id);assert.equal((await counts()).cmsSnapshots.length,before.cmsSnapshots.length+1);assert.equal((await counts()).cmsAudit.length,before.cmsAudit.length+1);assert.deepEqual(await service.submitSnapshot(c),results[0]);await assert.rejects(()=>service.submitSnapshot({...c,body:{...body,message:'Different'}}),{code:'IDEMPOTENCY_PAYLOAD_MISMATCH'});
 const member=db.collection('cmsMembers').doc('fixture-editor'),savedMember=(await member.get()).data();
 for(const patch of [{isActive:false},{role:'PUBLISHER',authzVersion:savedMember.authzVersion+1}]){await member.update(patch);try{const before=await counts();await assert.rejects(()=>service.submitSnapshot(c),{code:'FORBIDDEN'});assert.deepEqual(await counts(),before);}finally{await member.set(savedMember);}}

});
test('review hash/revision/state guards and Editor/Publisher roles deny without writes',async()=>{
 const snapshot=await submit();const before=await counts();for(const name of ['editor','publisher'])await assert.rejects(()=>review(name,snapshot),{code:'FORBIDDEN'});await assert.rejects(()=>review('reviewer',snapshot,{contentHash:'0'.repeat(64)}),{code:'SNAPSHOT_HASH_MISMATCH'});await assert.rejects(()=>review('reviewer',snapshot,{expectedReviewRevision:1}),{code:'REVIEW_REVISION_CONFLICT'});assert.deepEqual(await counts(),before);
});
test('Owner self-review denies both outcomes before keyed replay and after role changes',async()=>{
 const own=await submit('owner');
 for(const outcome of ['APPROVED','CHANGES_REQUESTED']){
  const body={snapshotId:own.id,contentHash:own.contentHash,expectedReviewRevision:0,outcome};
  const key=intent('fixture-owner','POST /api/cms/reviews',body),identity=mutationIdentity('fixture-owner','POST /api/cms/reviews',key,body),at=new Date().toISOString();
  await db.collection('cmsIdempotency').doc(identity.id).set({requestHash:identity.requestHash,state:'COMPLETED',statusCode:201,response:{snapshotId:own.id,contentHash:own.contentHash,outcome,reviewedBy:'fixture-owner',reviewedAt:at},createdAt:at,eventId:randomUUID()});
  const before=await counts();await assert.rejects(()=>review('owner',own,{outcome},key),{code:'SELF_REVIEW_FORBIDDEN'});assert.deepEqual(await counts(),before);
 }

 const editorial=await submit('editor');const member=db.collection('cmsMembers').doc('fixture-editor');const originalMember=(await member.get()).data();await member.update({role:'REVIEWER',authzVersion:originalMember.authzVersion+1});try{for(const outcome of ['APPROVED','CHANGES_REQUESTED'])await assert.rejects(()=>review('editor',editorial,{outcome}),{code:'SELF_REVIEW_FORBIDDEN'});}finally{await member.set(originalMember);}
});
test('two reviewers at revision zero have one immutable terminal decision',async()=>{
 const snapshot=await submit();const results=await Promise.allSettled([review('reviewer',snapshot),review('owner',snapshot,{outcome:'CHANGES_REQUESTED'})]);assert.equal(results.filter(result=>result.status==='fulfilled').length,1);assert.equal(results.find(result=>result.status==='rejected').reason.code,'REVIEW_REVISION_CONFLICT');const {reviewState}=await read(snapshot.id);assert.equal(reviewState.revision,1);assert.ok(['APPROVED','CHANGES_REQUESTED'].includes(reviewState.status));await assert.rejects(()=>review('reviewer',snapshot,{expectedReviewRevision:1}),{code:'REVIEW_STATE_CONFLICT'});
});
test('same-key concurrent review/retry creates one effect and membership is rechecked',async()=>{
 const snapshot=await submit();const body={snapshotId:snapshot.id,contentHash:snapshot.contentHash,expectedReviewRevision:0,outcome:'APPROVED',note:'Exact snapshot'};const key=intent('fixture-reviewer','POST /api/cms/reviews',body);const service=await createReviewService({db,authorize,catalogProvider:()=>catalog});const c=await context('reviewer','SNAPSHOT_REVIEW',body,'POST /api/cms/reviews',key);const before=await counts();const results=await Promise.all([service.submitReview(c),service.submitReview(c)]);assert.deepEqual(results[0],results[1]);assert.equal((await counts()).cmsReviews.length,before.cmsReviews.length+1);assert.equal((await counts()).cmsAudit.length,before.cmsAudit.length+1);assert.deepEqual(await service.submitReview(c),results[0]);await assert.rejects(()=>service.submitReview({...c,body:{...body,note:'changed'}}),{code:'IDEMPOTENCY_PAYLOAD_MISMATCH'});
 const member=db.collection('cmsMembers').doc('fixture-reviewer');const originalMember=(await member.get()).data();await member.update({isActive:false});try{await assert.rejects(()=>service.submitReview(c),{code:'FORBIDDEN'});}finally{await member.set(originalMember);}
 const state=(await db.collection('cmsReviewStates').doc(snapshot.id).get()).data();reviews.add(state.activeReviewId);
});
test('corrupt content/manifest/source projection fail closed and no decision/audit/key writes',async()=>{
 const summary=await submit();const ref=db.collection('cmsSnapshots').doc(summary.id);const originalSnapshot=(await ref.get()).data();
 for(const change of [value=>value.contentJson='{broken',value=>value.mediaManifest[0].sha256='0'.repeat(64),value=>value.sourceRefs[0].verification='CLIENT_CONFIRMED',value=>value.contentHash='0'.repeat(64),value=>value.contentJson='\\"'.repeat(140000)]){const corrupted=structuredClone(originalSnapshot);change(corrupted);await ref.set(corrupted);try{const before=await counts();await assert.rejects(()=>read(summary.id),{code:'INTERNAL_ERROR'});await assert.rejects(()=>review('reviewer',summary),{code:'INTERNAL_ERROR'});assert.deepEqual(await counts(),before);}finally{await ref.set(originalSnapshot);}}
 const valid=(await read(summary.id)).snapshot;const reordered={...valid,content:{seo:valid.content.seo,hero:valid.content.hero,locale:valid.content.locale,schemaVersion:valid.content.schemaVersion}};assert.equal(validateSnapshot(reordered,{catalog}).contentHash,valid.contentHash);
});
test('actual HTTP submission/read/review returns exact shapes and safe rejection envelopes',async()=>{
 const revision=(await db.collection('cmsDrafts').doc('home').get()).data().revision;const body={draftRevision:revision};const key=intent('fixture-editor','POST /api/cms/snapshots',body);const response=await http('/api/cms/snapshots','editor',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(body)});assert.equal(response.status,201);snapshots.add(response.body.id);assert.deepEqual(Object.keys(response.body).sort(),['contentHash','draftRevision','id','mediaManifestHash','schemaVersion','submittedAt','submittedBy','templateVersion']);
 const fetched=await http(`/api/cms/snapshots/${response.body.id}`,'publisher');assert.equal(fetched.status,200);assert.deepEqual(Object.keys(fetched.body).sort(),['reviewState','snapshot']);assert.equal(fetched.body.snapshot.contentJson,undefined);
 const reviewBody={snapshotId:response.body.id,contentHash:response.body.contentHash,expectedReviewRevision:0,outcome:'APPROVED'};const reviewed=await http('/api/cms/reviews','reviewer',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':intent('fixture-reviewer','POST /api/cms/reviews',reviewBody)},body:JSON.stringify(reviewBody)});assert.equal(reviewed.status,201);assert.equal(reviewed.body.outcome,'APPROVED');const state=(await db.collection('cmsReviewStates').doc(response.body.id).get()).data();reviews.add(state.activeReviewId);
 for(const [path,name,options,status] of [['/api/cms/snapshots/missing','editor',{},404],['/api/cms/snapshots','publisher',{method:'POST'},403],['/api/cms/reviews','editor',{method:'POST'},403],['/api/cms/snapshots/missing','unknown',{},403],['/api/cms/snapshots','editor',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':'test08-empty'},body:'{}'},422]]){const result=await http(path,name,options);assert.equal(result.status,status);assert.deepEqual(Object.keys(result.body),['error']);assert.doesNotMatch(JSON.stringify(result.body),/contentJson|stack|TOKEN/);}
});

test('direct SDK cannot update or delete actual immutable snapshot/review resources for any role',async()=>{
 const {initializeTestEnvironment,assertFails}=await import('@firebase/rules-unit-testing');
 const {doc,updateDoc,deleteDoc}=await import('firebase/firestore');
 const snapshot=await submit();await review('reviewer',snapshot);
 const state=(await db.collection('cmsReviewStates').doc(snapshot.id).get()).data();
 const rules=await initializeTestEnvironment({projectId:'demo-pinky-lamb-cms',firestore:{host:'127.0.0.1',port:8080}});
 const before=await counts();
 try{for(const role of ['EDITOR','REVIEWER','PUBLISHER','OWNER']){
  const firestore=rules.authenticatedContext(`fixture-${role.toLowerCase()}`,{email:`${role.toLowerCase()}@pinky.test`,email_verified:true,role}).firestore();
  for(const path of [`cmsSnapshots/${snapshot.id}`,`cmsReviewStates/${snapshot.id}`,`cmsReviews/${state.activeReviewId}`]){
   await assertFails(updateDoc(doc(firestore,path),{contentHash:'0'.repeat(64)}));await assertFails(deleteDoc(doc(firestore,path)));
  }
 }}finally{await rules.cleanup();}
 assert.deepEqual(await counts(),before);
});

test('coherently corrupted completed records cannot replay a different valid effect',async()=>{
 const service=await createSnapshotService({db,authorize,catalogProvider:()=>catalog});
 const body={draftRevision:(await db.collection('cmsDrafts').doc('home').get()).data().revision,message:'Bound intent'};
 const key=intent('fixture-editor','POST /api/cms/snapshots',body),c=await context('editor','SNAPSHOT_SUBMIT',body,'POST /api/cms/snapshots',key);
 const exact=await service.submitSnapshot(c),other=await submit('owner','Other intent');
 const ref=db.collection('cmsIdempotency').doc(mutationIdentity('fixture-editor','POST /api/cms/snapshots',key,body).id),originalRecord=(await ref.get()).data();
 await ref.set({...originalRecord,response:other,createdAt:other.submittedAt});
 try{const before=await counts();await assert.rejects(()=>service.submitSnapshot(c),{code:'INTERNAL_ERROR'});assert.deepEqual(await counts(),before);}finally{await ref.set(originalRecord);}
 const stateRef=db.collection('cmsReviewStates').doc(exact.id),originalState=(await stateRef.get()).data();await stateRef.delete();
 try{const before=await counts();await assert.rejects(()=>service.submitSnapshot(c),{code:'INTERNAL_ERROR'});assert.deepEqual(await counts(),before);}finally{await stateRef.set(originalState);}
 const reviewBody={snapshotId:exact.id,contentHash:exact.contentHash,expectedReviewRevision:0,outcome:'APPROVED',note:'Exact note'};
 const reviewKey=intent('fixture-reviewer','POST /api/cms/reviews',reviewBody),reviewContext=await context('reviewer','SNAPSHOT_REVIEW',reviewBody,'POST /api/cms/reviews',reviewKey),reviewService=await createReviewService({db,authorize,catalogProvider:()=>catalog});
 await reviewService.submitReview(reviewContext);
 const completedRef=db.collection('cmsIdempotency').doc(mutationIdentity('fixture-reviewer','POST /api/cms/reviews',reviewKey,reviewBody).id),completed=(await completedRef.get()).data();
 const state=(await stateRef.get()).data(),reviewRef=db.collection('cmsReviews').doc(state.activeReviewId),savedReview=(await reviewRef.get()).data();
 for(const change of [{outcome:'CHANGES_REQUESTED'},{note:'Different note'}]){
  const altered={...savedReview,...change};await reviewRef.set(altered);await completedRef.set({...completed,response:altered});await stateRef.set({...state,status:altered.outcome});
  try{const before=await counts();await assert.rejects(()=>reviewService.submitReview(reviewContext),{code:'INTERNAL_ERROR'});assert.deepEqual(await counts(),before);}finally{await reviewRef.set(savedReview);await completedRef.set(completed);await stateRef.set(state);}
 }
});

test('terminal state cannot reference a missing, mismatched or self-authored review',async()=>{
 const summary=await submit();await review('reviewer',summary);
 const stateRef=db.collection('cmsReviewStates').doc(summary.id),state=(await stateRef.get()).data(),ref=db.collection('cmsReviews').doc(state.activeReviewId),saved=(await ref.get()).data();
 for(const altered of [null,{...saved,snapshotId:'different'},{...saved,contentHash:'0'.repeat(64)},{...saved,outcome:'CHANGES_REQUESTED'},{...saved,reviewedAt:'2026-10-11T00:00:00.000Z'},{...saved,reviewedBy:'fixture-editor'}]){
  if(altered===null)await ref.delete();else await ref.set(altered);
  try{const before=await counts();await assert.rejects(()=>read(summary.id),{code:'INTERNAL_ERROR'});await assert.rejects(()=>review('owner',summary,{expectedReviewRevision:1}),{code:'INTERNAL_ERROR'});assert.deepEqual(await counts(),before);}finally{await ref.set(saved);}
 }
});
