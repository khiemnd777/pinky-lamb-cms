import test from 'node:test';
import assert from 'node:assert/strict';
import {localizedDraftKey,readLocalizedDraftStatuses,fullSiteDraftRequirements,fullSiteDraftBlockers} from '../admin/localized-draft-status.mjs';
const metadata={revision:2,dependencyHash:'a'.repeat(64),contentHash:'b'.repeat(64),updatedAt:'2026-10-17T00:00:00.000Z',stale:false};
const groupStatus=()=>({contractRevision:1,draftId:'home-v3',groups:['header','clients','about','ip-studio','contact','footer','seo'].map(groupId=>({groupId,sourceTitle:groupId,isVisible:true,locales:{en:metadata,vi:null,ja:null}}))});
test('full-site readiness distinguishes missing, stale and unknown without treating saved as approved',()=>{
 const required=fullSiteDraftRequirements('vi');assert.equal(required.length,10);assert.ok(required.every(r=>r.locale==='vi'));
 const states=new Map(required.map(r=>[localizedDraftKey(r),metadata]));assert.deepEqual(fullSiteDraftBlockers(required,states),[]);
 states.set('group/header/vi',null);states.set('hero/home-v3/vi',{...metadata,stale:true});states.delete('section/services/vi');
 assert.deepEqual(fullSiteDraftBlockers(required,states).map(r=>[r.kind,r.entityId,r.reason]),[['hero','home-v3','STALE'],['group','header','MISSING'],['section','services','UNKNOWN']]);
 assert.equal(states.get('group/header/vi'),null);assert.equal(metadata.revision,2);
});
test('draft status uses one validated group read and keeps locale identities',async()=>{
 const calls=[],states=await readLocalizedDraftStatuses({apiFetch:async(path,options)=>{calls.push([path,options]);return groupStatus();},resources:fullSiteDraftRequirements('vi'),kind:'group',locale:'vi'});
 assert.equal(calls.length,1);assert.equal(calls[0][0],'/api/cms/localizations/groups/status');assert.equal(calls[0][1].method,undefined);
 assert.equal(states.get('group/header/vi'),null);assert.equal(states.get('group/header/en').revision,2);assert.equal(states.has('project/unknown/vi'),false);
});
test('failed reads, switched sessions and wrong-locale replies do not return a successful readiness map',async()=>{
 await assert.rejects(readLocalizedDraftStatuses({apiFetch:async()=>{throw Error('Offline');},resources:[],kind:'group'}),/Offline/);
 await assert.rejects(readLocalizedDraftStatuses({apiFetch:async()=>groupStatus(),resources:[],kind:'group',assertCurrent:()=>{throw Error('Session changed');}}),/Session changed/);
 await assert.rejects(readLocalizedDraftStatuses({apiFetch:async()=>({contractRevision:1,draftId:'home-v3',locale:'en',base:{revision:1,contentHash:'a'.repeat(64),hero:{}},draft:null}),resources:fullSiteDraftRequirements('vi'),kind:'hero',locale:'vi'}),/khớp đối tượng/);
});

test('native status reads one current projection and never fans out to resource evaluators',async()=>{
 const calls=[],resource={kind:'hero',entityId:'home-v3',locale:'en'},states=await readLocalizedDraftStatuses({nativeStatus:true,apiFetch:async path=>{calls.push(path);return {contractRevision:1,kind:'CONTENT_READINESS_STATUS',state:'COMPLETED',generation:1,updatedAt:'2026-10-19T09:00:00.000Z',readiness:null,draftStatuses:[{resource,draft:{revision:4,stale:false}}],errorCode:null};},resources:[resource]});
 assert.deepEqual(calls,['/api/cms/localizations/editorial/readiness']);assert.deepEqual(states.get('hero/home-v3/en'),{revision:4,stale:false});
 await assert.rejects(readLocalizedDraftStatuses({nativeStatus:true,apiFetch:async()=>({contractRevision:1,kind:'CONTENT_READINESS_STATUS',state:'PENDING',generation:2,updatedAt:'2026-10-19T09:00:00.000Z',readiness:null,draftStatuses:[],errorCode:null}),resources:[resource]}),{code:'CONTENT_STATUS_PENDING'});
});
