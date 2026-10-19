import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {request as nodeRequest} from 'node:http';
import {validateRuntime,installNetworkFence} from '../scripts/local-guard.mjs';
validateRuntime();installNetworkFence();
const {db,authorize}=await import('../cms-api/authorization.mjs');
const {seedFixtures,fixturePassword,baselineContent}=await import('../scripts/seed-emulators.mjs');
const {encodeStoredContent,decodeStoredContent,decodeStoredDraft}=await import('../contracts/draft.mjs');
const {createDraftService,loadTrustedCatalog,mutationIdentity}=await import('../cms-api/drafts.mjs');
const api='http://127.0.0.1:5001/demo-pinky-lamb-cms/us-central1/cmsApi';
let catalog,original,editorToken,ownerToken,lastWrittenDraft;
const intents=[];
const request=token=>({headers:{authorization:`Bearer ${token}`}});
async function signIn(email){const response=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-local-only',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:fixturePassword,returnSecureToken:true})});assert.equal(response.status,200);return (await response.json()).idToken;}
async function http(path,token,options={}){const response=await fetch(`${api}${path}`,{...options,headers:{Authorization:`Bearer ${token}`,...options.headers}});const text=await response.text();let body;try{body=JSON.parse(text);}catch{body=text;}return {status:response.status,body,allow:response.headers.get('allow')};}
function rawHttp(path,token,{method='PATCH',chunks=['{}'],headers={}}={}){
 return new Promise((resolve,reject)=>{
  const outgoing=nodeRequest(`${api}${path}`,{method,headers:{Authorization:`Bearer ${token}`,...headers}},incoming=>{
   const chunks=[];incoming.on('data',chunk=>chunks.push(chunk));incoming.on('end',()=>{let body;const text=Buffer.concat(chunks).toString();try{body=JSON.parse(text);}catch{body=text;}resolve({status:incoming.statusCode,body});});
  });
  outgoing.on('error',reject);for(const chunk of chunks)outgoing.write(chunk);outgoing.end();
 });
}
function newIntent(uid,body){const key=`test05-${randomUUID()}`;intents.push({uid,key,body});return key;}
const draftRef=()=>db.collection('cmsDrafts').doc('home');
const service=()=>createDraftService({db,authorize,catalogProvider:async()=>catalog});
async function save(token,body,key){const actor=await authorize(request(token),'DRAFT_SAVE');const result=await service().saveDraft({request:request(token),actor,body,key,correlationId:'test05-integration'});lastWrittenDraft=(await draftRef().get()).data();return result;}
before(async()=>{await seedFixtures();catalog=await loadTrustedCatalog();original=(await draftRef().get()).data();editorToken=await signIn('editor@pinky.test');ownerToken=await signIn('owner@pinky.test');});
after(async()=>{
 if(original && lastWrittenDraft){const current=(await draftRef().get()).data();if(current.revision===lastWrittenDraft.revision && current.lastEventId===lastWrittenDraft.lastEventId){const content=JSON.parse(original.contentJson),body={expectedRevision:current.revision,patch:{hero:content.hero,seo:content.seo}};await save(editorToken,body,newIntent('fixture-editor',body));}}
 await db.terminate();
});
test('storage codec round-trips exact text and rejects corrupt persisted content',()=>{
 const content=structuredClone(baselineContent);content.hero.note='Quote " slash \\ Unicode cừu <script>';
 assert.deepEqual(decodeStoredContent(encodeStoredContent(content,{catalog}),{catalog}),content);
 const oversizedStored={...original,contentJson:JSON.stringify({padding:'\"'.repeat(140000)})};
 assert.throws(()=>decodeStoredDraft(oversizedStored,{catalog}),{code:'INTERNAL_ERROR'});
 for(const input of ['{broken',JSON.stringify({...content,role:'OWNER'}),JSON.stringify({...content,hero:{...content.hero,image:{...content.hero.image,assetId:'unknown'}}}),' '.repeat(256*1024+1)])assert.throws(()=>decodeStoredContent(input,{catalog}),{code:'INTERNAL_ERROR'});
});
test('two independent clients saving one revision have exactly one winner',async()=>{
 const current=await service().readDraft({request:request(editorToken)});
 const first={expectedRevision:current.revision,patch:{hero:{...current.content.hero,note:'Concurrent editor'}}};
 const second={expectedRevision:current.revision,patch:{hero:{...current.content.hero,note:'Concurrent owner'}}};
 const results=await Promise.allSettled([save(editorToken,first,newIntent('fixture-editor',first)),save(ownerToken,second,newIntent('fixture-owner',second))]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.code,'REVISION_CONFLICT');
 assert.equal((await draftRef().get()).data().revision,current.revision+1);
});
test('concurrent identical delivery and later replay produce one effect and audit',async()=>{
 const current=await service().readDraft({request:request(editorToken)});const body={expectedRevision:current.revision,patch:{seo:current.content.seo}};const key=newIntent('fixture-editor',body);
 const responses=await Promise.all([save(editorToken,body,key),save(editorToken,body,key)]);assert.deepEqual(responses[0],responses[1]);assert.deepEqual(await save(editorToken,body,key),responses[0]);
 assert.equal((await draftRef().get()).data().revision,current.revision+1);
 const id=mutationIdentity('fixture-editor','PATCH /api/cms/drafts/home',key,body).id;const record=(await db.collection('cmsIdempotency').doc(id).get()).data();assert.equal(record.state,'COMPLETED');assert.equal(record.statusCode,200);assert.deepEqual(record.response,responses[0]);assert.equal((await db.collection('cmsAudit').doc(record.eventId).get()).exists,true);
 await assert.rejects(()=>save(editorToken,{...body,patch:{seo:{...body.patch.seo,title:'Changed retry'}}},key),{code:'IDEMPOTENCY_PAYLOAD_MISMATCH'});
});
test('replay rechecks membership; invalid client fields and corrupt storage never mutate',async()=>{
 const current=await service().readDraft({request:request(editorToken)});const body={expectedRevision:current.revision,patch:{hero:current.content.hero}};const key=newIntent('fixture-editor',body);await save(editorToken,body,key);
 const member=db.collection('cmsMembers').doc('fixture-editor');try{await member.update({isActive:false});await assert.rejects(()=>save(editorToken,body,key),{code:'FORBIDDEN'});}finally{await member.update({isActive:true});}
 for(const bad of [{...body,role:'OWNER'},{...body,patch:{hero:{...body.patch.hero,revision:55}}},{...body,patch:{'hero.note':'deep'}},{...body,contentJson:'{}'}])await assert.rejects(()=>save(editorToken,bad,newIntent('fixture-editor',bad)),{code:'VALIDATION_ERROR'});
 const valid=(await draftRef().get()).data();try{await draftRef().update({contentJson:'{invalid'});await assert.rejects(()=>service().readDraft({request:request(editorToken)}),{code:'INTERNAL_ERROR'});await assert.rejects(()=>save(editorToken,{expectedRevision:valid.revision,patch:{hero:body.patch.hero}},newIntent('fixture-editor',body)),{code:'INTERNAL_ERROR'});assert.equal((await draftRef().get()).data().revision,valid.revision);}finally{await draftRef().set(valid);}
});
test('actual route reads safe catalog and enforces method/transport/schema bounds',async()=>{
 const read=await http('/api/cms/drafts/home',editorToken);assert.equal(read.status,200);assert.deepEqual(Object.keys(read.body).sort(),['catalog','content','lastEventId','revision','updatedAt','updatedBy']);
 assert.equal(read.body.catalog.length,catalog.length);assert.deepEqual(read.body.catalog.map(a=>a.id),catalog.map(a=>a.id).sort());
 for(const entry of read.body.catalog)for(const key of Object.keys(entry))assert.ok(['id','kind','status','legacyPath','label','width','height','durationSeconds'].includes(key));
 assert.equal((await http('/api/cms/unknown',editorToken)).status,404);assert.equal((await http('/api/cms/drafts/home',editorToken,{method:'PUT'})).status,405);
 const body={expectedRevision:read.body.revision,patch:{seo:read.body.content.seo}};
 const key=newIntent('fixture-editor',body);
 const success=await http('/api/cms/drafts/home',editorToken,{method:'PATCH',headers:{'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(body)});assert.equal(success.status,200);assert.equal(success.body.revision,read.body.revision+1);lastWrittenDraft=(await draftRef().get()).data();
 const malformed=await http('/api/cms/drafts/home',editorToken,{method:'PATCH',headers:{'Content-Type':'application/json','Idempotency-Key':'test05-malformed'},body:'{bad'});assert.equal(malformed.status,400);assert.equal(malformed.body.error.code,'BAD_REQUEST');assert.equal(typeof malformed.body.error.correlationId,'string');
 assert.equal((await http('/api/cms/drafts/home',editorToken,{method:'PATCH',headers:{'Content-Type':'text/plain'},body:'{}'})).status,415);
 assert.equal((await http('/api/cms/drafts/home',editorToken,{method:'PATCH',headers:{'Content-Type':'application/json'},body:'{}'})).status,422);
 assert.equal((await http('/api/cms/drafts/home',editorToken,{method:'PATCH',headers:{'Content-Type':'application/json','Idempotency-Key':'test05-oversize'},body:JSON.stringify({padding:'x'.repeat(64*1024)})})).status,413);
});
test('reviewer/publisher cannot save; implemented snapshot endpoints validate requests and missing resources',async()=>{
 for(const email of ['reviewer@pinky.test','publisher@pinky.test']){const token=await signIn(email);assert.equal((await http('/api/cms/drafts/home',token)).status,200);assert.equal((await http('/api/cms/drafts/home',token,{method:'PATCH',headers:{'Content-Type':'application/json'},body:'{}'})).status,403);}
 assert.equal((await http('/api/cms/snapshots',editorToken,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':'test05-pending'},body:'{}'})).status,422);
 assert.equal((await http('/api/cms/snapshots/not-created',editorToken)).status,404);
});
test('actual concurrent HTTP clients have one CAS winner and no overwrite',async()=>{
 const read=await http('/api/cms/drafts/home',editorToken);
 const first={expectedRevision:read.body.revision,patch:{hero:{...read.body.content.hero,note:'HTTP editor'}}};
 const second={expectedRevision:read.body.revision,patch:{hero:{...read.body.content.hero,note:'HTTP owner'}}};
 const send=(token,uid,body)=>http('/api/cms/drafts/home',token,{method:'PATCH',headers:{'Content-Type':'application/json','Idempotency-Key':newIntent(uid,body)},body:JSON.stringify(body)});
 const results=await Promise.all([send(editorToken,'fixture-editor',first),send(ownerToken,'fixture-owner',second)]);
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);assert.equal((await draftRef().get()).data().revision,read.body.revision+1);lastWrittenDraft=(await draftRef().get()).data();
});
test('adversarial actual transport always returns safe bounded envelopes',async()=>{
 const before=(await draftRef().get()).data();
 const auditBefore=(await db.collection('cmsAudit').get()).docs.map(doc=>doc.id).sort();
 const keysBefore=(await db.collection('cmsIdempotency').get()).docs.map(doc=>doc.id).sort();
 const common={method:'PATCH',headers:{'Content-Type':'application/json','Idempotency-Key':'test05-transport'}};
 const cases=[
  [{...common,body:'{malformed'},400,'BAD_REQUEST'],
  [{...common,body:new Uint8Array([0x7b,0x22,0xff,0x22,0x7d])},400,'BAD_REQUEST'],
  [{...common,body:JSON.stringify({padding:'x'.repeat(64*1024)})},413,'PAYLOAD_TOO_LARGE'],
  [{...common,headers:{...common.headers,'Content-Encoding':'gzip'},body:gzipSync('{}')},400,'BAD_REQUEST'],
  [{...common,headers:{'Idempotency-Key':'test05-transport'},body:new TextEncoder().encode('{}')},415,'UNSUPPORTED_MEDIA_TYPE'],
  [{...common,headers:{...common.headers,'Content-Type':'multipart/form-data; boundary=test'},body:'--test--'},415,'UNSUPPORTED_MEDIA_TYPE']
 ];
 for(const [options,status,code] of cases){const result=await http('/api/cms/drafts/home',editorToken,options);assert.equal(result.status,status);assert.equal(typeof result.body,'object');assert.equal(result.body.error.code,code);assert.deepEqual(Object.keys(result.body.error).sort(),['code','correlationId','message']);assert.equal(JSON.stringify(result.body).includes('SyntaxError'),false);}
 const publisher=await signIn('publisher@pinky.test');assert.equal((await http('/api/cms/drafts/home',publisher,{method:'POST'})).status,405);
 assert.equal((await http('/api/cms/session?private=1',editorToken)).status,400);
 assert.equal((await rawHttp('/api/cms/session',editorToken,{method:'GET',headers:{'Content-Type':'application/json'},chunks:['{}']})).status,400);
 const chunked=await rawHttp('/api/cms/drafts/home',editorToken,{headers:common.headers,chunks:['{"padding":"','x'.repeat(32000),'x'.repeat(34000),'"}']});assert.equal(chunked.status,413);assert.equal(chunked.body.error.code,'PAYLOAD_TOO_LARGE');
 const charset=await http('/api/cms/drafts/home',editorToken,{...common,headers:{...common.headers,'Content-Type':'application/json; charset=iso-8859-1'},body:'{}'});assert.equal(charset.status,415);assert.equal(charset.body.error.code,'UNSUPPORTED_MEDIA_TYPE');
 assert.deepEqual((await draftRef().get()).data(),before);
 assert.deepEqual((await db.collection('cmsAudit').get()).docs.map(doc=>doc.id).sort(),auditBefore);
 assert.deepEqual((await db.collection('cmsIdempotency').get()).docs.map(doc=>doc.id).sort(),keysBefore);
 const identity=mutationIdentity('fixture-editor','PATCH /api/cms/drafts/home','test05-transport',{});assert.equal((await db.collection('cmsIdempotency').doc(identity.id).get()).exists,false);
});
