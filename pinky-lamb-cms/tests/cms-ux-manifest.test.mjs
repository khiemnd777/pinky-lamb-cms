import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createSavedSiteManifestResolver,validateSavedSiteMediaPreview} from '../admin/site-media-preview.mjs';
import {canonicalMediaV2Json} from '../contracts/media-v3-contract-v2.mjs';
import {contentDigestProjectionV2} from '../contracts/media-v3-records-v2.mjs';

const hash=value=>createHash('sha256').update(canonicalMediaV2Json(value)).digest('hex');
const saved=()=>({revision:0,content:{schemaVersion:3,synthetic:'unchanged content'}});
const fullEntry=()=>({source:'LEGACY',asset:{id:'synthetic-logo',kind:'IMAGE',legacyPath:'assets/synthetic.webp',mimeType:'image/webp',sizeBytes:12,sha256:'a'.repeat(64),rights:{basis:'CLIENT_SUPPLIED',evidenceRef:'Synthetic fixture'},sourceRefs:['Synthetic source'],width:1,height:1}});
const safeEntry=()=>({source:'LEGACY',asset:{id:'synthetic-logo',kind:'IMAGE',legacyPath:'assets/synthetic.webp',status:'LEGACY_READY',label:'synthetic.webp',width:1,height:1}});
function receipt(draft=saved(),mediaManifest=[fullEntry()]){const mediaManifestHash=hash(mediaManifest);return {contractRevision:2,draftId:'home-v3',draftRevision:draft.revision,contentHash:hash(contentDigestProjectionV2(draft.content,mediaManifestHash)),mediaManifestHash,mediaManifest};}
const session=()=>({uid:'fixture-owner',role:'OWNER',authzVersion:1});

test('safe catalog cannot be used as binary manifest; complete verified metadata is required',async()=>{
 await assert.rejects(validateSavedSiteMediaPreview(receipt(saved(),[safeEntry()]),saved()));
 const full=await validateSavedSiteMediaPreview(receipt(),saved());assert.deepEqual(full.mediaManifest,[fullEntry()]);assert.equal(full.mediaManifest[0].asset.sizeBytes,12);assert.equal(full.mediaManifest[0].asset.mimeType,'image/webp');
});
test('revision, manifest and content mismatches fail closed',async()=>{
 for(const mutation of [value=>{value.draftRevision++;},value=>{value.mediaManifest[0].asset.sizeBytes++;},value=>{value.contentHash='0'.repeat(64);},value=>{value.mediaManifestHash='0'.repeat(64);}]){const value=receipt();mutation(value);await assert.rejects(validateSavedSiteMediaPreview(value,saved()));}
});
test('concurrent thumbnail slots and later redraws reuse one verified saved manifest read',async()=>{
 let calls=0;const resolver=createSavedSiteManifestResolver({apiFetch:async(path)=>{calls++;assert.equal(path,'/api/cms/media-site/drafts/home-v3/preview?expectedRevision=0');return receipt();},getSession:session});
 const values=await Promise.all(Array.from({length:31},()=>resolver.get(saved())));assert.equal(calls,1);for(const value of values)assert.deepEqual(value.mediaManifest,[fullEntry()]);await resolver.get(saved());assert.equal(calls,1);resolver.clear();await resolver.get(saved());assert.equal(calls,2);resolver.destroy();
});
test('new saved revision invalidates the cache and aborts previous revision transport',async()=>{
 const requests=[];const resolver=createSavedSiteManifestResolver({apiFetch:async(path,options)=>{requests.push({path,signal:options.signal});return receipt({...saved(),revision:Number(path.split('=').at(-1))});},getSession:session});
 await resolver.get(saved());await resolver.get({...saved(),revision:1});assert.equal(requests.length,2);assert.equal(requests[0].signal.aborted,true);assert.match(requests[1].path,/expectedRevision=1$/);resolver.destroy();assert.equal(requests[1].signal.aborted,true);
});
test('session invalidation rejects late manifest completion without exposing metadata',async()=>{
 let member=session(),resolve;const pending=new Promise(done=>{resolve=done;});const resolver=createSavedSiteManifestResolver({apiFetch:()=>pending,getSession:()=>member});
 const result=resolver.get(saved());member={...member,authzVersion:2};resolve(receipt());await assert.rejects(result,{name:'AbortError'});resolver.destroy();
});
test('invalid metadata stays failed across redraws until explicit reload',async()=>{
 let calls=0;const resolver=createSavedSiteManifestResolver({apiFetch:async()=>{calls++;return receipt(saved(),[safeEntry()]);},getSession:session});
 await assert.rejects(resolver.get(saved()));await assert.rejects(resolver.get(saved()));assert.equal(calls,1);resolver.clear();await assert.rejects(resolver.get(saved()));assert.equal(calls,2);resolver.destroy();
});
