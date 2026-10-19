import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parseMediaV3Content,projectClaimGroupsV3} from '../contracts/media-v3-content.mjs';
import {sourceCheckV3Schema,reviewStateV3Schema,reviewV3Schema,validateSourceCheckV3,selectSourceChecksV3,validateSourceAttestationsV3,attestationDigestProjection} from '../contracts/media-v3-attestations.mjs';

const fixture=JSON.parse(readFileSync(new URL('./fixtures/media-v3-attestations.json',import.meta.url),'utf8'));
const sample=fixture.cases[0],clone=value=>structuredClone(value);
// Independent canonical/hash oracle; expectations are frozen golden subsets,
// not values obtained from the module under test or its canonical primitive.
function canonical(value){
  if(value===null || typeof value!=='object')return JSON.stringify(value);
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';
}
const hash=value=>createHash('sha256').update(canonical(value),'utf8').digest('hex');
function context(row=sample){
  const contentContext={sourceCatalog:row.sourceCatalog,currentYear:fixture.currentYear,...(row.content.settings.showreel.originalSourceUrl!==undefined?{allowedShowreelSourceUrl:row.content.settings.showreel.originalSourceUrl}:{})};
  return {snapshot:row.snapshot,currentClaimGroups:projectClaimGroupsV3(parseMediaV3Content(row.content,contentContext)),baselineClaimGroups:projectClaimGroupsV3(parseMediaV3Content(fixture.baselineContent,contentContext)),claimSources:row.content.claimSources,sourceCatalog:row.sourceCatalog,hashCanonical:hash};
}
const input=(row=sample)=>({reviewState:row.reviewState,review:row.review,sourceChecks:row.sourceChecks});
const internal=run=>assert.throws(run,error=>error.code==='INTERNAL_ERROR');
const badProof=mutate=>{const value=clone(sample.sourceChecks[0]);mutate(value);internal(()=>validateSourceCheckV3(value,context()));};
const badRelations=mutate=>{const value=clone(input());mutate(value);internal(()=>validateSourceAttestationsV3(value,context(),{proofView:'ALL'}));};
function privateSuperset(){
  const ctx=context(),value=clone(input()),group=ctx.currentClaimGroups.find(group=>group.claimPath==='seo/facts');
  const binding=ctx.claimSources.find(binding=>binding.claimPath===group.claimPath),source=ctx.sourceCatalog.find(source=>source.id===binding.sourceIds[0]);
  const extra={...clone(value.sourceChecks[0]),id:'extra-seo-check',claimPath:group.claimPath,claimHash:hash(group.value),evidence:[{sourceId:source.id,sha256:source.sha256,...(source.kind==='CREDENTIAL'?{pages:[1]}:{})}],sourceRevision:2,eventId:'extra-source-event'};
  value.sourceChecks.push(extra);value.reviewState.activeSourceCheckIds[group.claimPath]=extra.id;value.reviewState.sourceRevision=2;value.review.sourceRevision=2;
  return {ctx,value,extra};
}

test('five frozen V3 source records/reviews pass shapes and exact independent claim/set hashes',()=>{
  for(const row of fixture.cases){
    const ctx=context(row);assert.deepEqual(sourceCheckV3Schema.parse(row.sourceChecks[0]),row.sourceChecks[0]);
    assert.deepEqual(reviewStateV3Schema.parse(row.reviewState),row.reviewState);assert.deepEqual(reviewV3Schema.parse(row.review),row.review);
    const group=ctx.currentClaimGroups.find(group=>group.claimPath===row.sourceChecks[0].claimPath);assert.equal(hash(group.value),row.sourceChecks[0].claimHash);
    assert.equal(hash(row.sourceChecks),row.review.attestationSetHash);assert.equal(validateSourceAttestationsV3(input(row),ctx,{proofView:'ALL'}),true);
    assert.deepEqual(selectSourceChecksV3(input(row),ctx,{proofView:'APPROVED'}),row.sourceChecks);
  }
});
test('ALL private union and APPROVED frozen pins remain separate from terminal digest',()=>{
  const {ctx,value,extra}=privateSuperset();assert.equal(validateSourceAttestationsV3(value,ctx,{proofView:'ALL'}),true);
  const all=selectSourceChecksV3(value,ctx,{proofView:'ALL'});assert.equal(all.length,2);assert.equal(all[1].id,extra.id);
  const qa={...value,sourceChecks:value.sourceChecks.filter(record=>value.review.sourceCheckIds.includes(record.id))};
  assert.deepEqual(selectSourceChecksV3(qa,ctx,{proofView:'APPROVED'}),sample.sourceChecks);assert.equal(hash(qa.sourceChecks),qa.review.attestationSetHash);assert.notEqual(hash(all),qa.review.attestationSetHash);
  internal(()=>validateSourceAttestationsV3(value,ctx,{proofView:'APPROVED'}));
});
test('IN_REVIEW initial sourceRevision0 requires ALL/null review and exact submission time',()=>{
  const ctx=context(),state={snapshotId:ctx.snapshot.id,status:'IN_REVIEW',revision:0,activeReviewId:null,sourceRevision:0,activeSourceCheckIds:{},updatedAt:ctx.snapshot.submittedAt};
  const value={reviewState:state,review:null,sourceChecks:[]};assert.deepEqual(selectSourceChecksV3(value,ctx,{proofView:'ALL'}),[]);
  internal(()=>validateSourceAttestationsV3(value,ctx,{proofView:'APPROVED'}));
  const bad=clone(value);bad.reviewState.updatedAt='2026-10-13T00:00:03.000Z';internal(()=>validateSourceAttestationsV3(bad,ctx,{proofView:'ALL'}));
});
test('IN_REVIEW active state proves latest sourceRevision and exact updatedAt relation',()=>{
  const value=clone(input());value.review=null;value.reviewState.status='IN_REVIEW';value.reviewState.revision=0;value.reviewState.activeReviewId=null;value.reviewState.updatedAt=value.sourceChecks[0].checkedAt;
  assert.equal(validateSourceAttestationsV3(value,context(),{proofView:'ALL'}),true);
  value.reviewState.sourceRevision=2;internal(()=>validateSourceAttestationsV3(value,context(),{proofView:'ALL'}));
});
test('CHANGES_REQUESTED keeps note and empty frozen pins/digest with private active checks',()=>{
  const value=clone(input());value.reviewState.status='CHANGES_REQUESTED';value.review.outcome='CHANGES_REQUESTED';value.review.note='  Cần kiểm tra 😀  ';delete value.review.creativeCopyDeclaration;value.review.sourceCheckIds=[];value.review.attestationSetHash=hash([]);
  assert.equal(validateSourceAttestationsV3(value,context(),{proofView:'ALL'}),true);
  internal(()=>validateSourceAttestationsV3(value,context(),{proofView:'APPROVED'}));
  delete value.review.note;internal(()=>validateSourceAttestationsV3(value,context(),{proofView:'ALL'}));
});
test('actor and source-check time rules reject self-attestation/earlier proof',()=>{
  badProof(value=>{value.checkedBy=sample.snapshot.submittedBy;});badProof(value=>{value.checkedAt='2026-10-13T00:00:01.000Z';});
  badRelations(value=>{value.review.reviewedBy=sample.snapshot.submittedBy;});
  badRelations(value=>{value.review.reviewedAt='2026-10-13T00:00:01.000Z';value.reviewState.updatedAt=value.review.reviewedAt;});
  badRelations(value=>{value.sourceChecks[0].checkedAt='2026-10-13T00:00:05.000Z';});
});
test('source proof binds V3 descriptor/snapshot/content/projected claim identities',()=>{
  badProof(value=>{value.schemaVersion=2;});badProof(value=>{value.templateVersion='m2-site-baseline-v1';});
  badProof(value=>{value.snapshotId='other-snapshot';});badProof(value=>{value.contentHash='a'.repeat(64);});
  badProof(value=>{value.claimHash='b'.repeat(64);});badProof(value=>{value.claimPath='projects/missing/facts';});
});
test('source catalog support/binding/SHA and page-kind rules are exact',()=>{
  badProof(value=>{value.evidence[0].sha256='a'.repeat(64);});badProof(value=>{value.evidence[0].sourceId='raw-legacy-ref';});
  badProof(value=>{value.evidence[0].pages=[1];});
  const ctx=context();ctx.sourceCatalog=clone(ctx.sourceCatalog);ctx.sourceCatalog.find(source=>source.id===sample.sourceChecks[0].evidence[0].sourceId).supportedClaimPaths=['seo/facts'];internal(()=>validateSourceCheckV3(sample.sourceChecks[0],ctx));
  const bind=context();bind.claimSources=clone(bind.claimSources);bind.claimSources.find(value=>value.claimPath===sample.sourceChecks[0].claimPath).sourceIds=['baseline-source'];internal(()=>validateSourceCheckV3(sample.sourceChecks[0],bind));
});
test('CREDENTIAL pages are required sorted unique bounded and factual catalog remains baseline strict',()=>{
  const ctx=context(),proof=clone(sample.sourceChecks[0]),id=proof.evidence[0].sourceId;ctx.sourceCatalog=clone(ctx.sourceCatalog);
  const source=ctx.sourceCatalog.find(value=>value.id===id);source.kind='CREDENTIAL';source.pageCount=48;source.publicCredentialUrl='http://127.0.0.1:5010/assets/Pinky-Lamb-Credential-2026.pdf';
  internal(()=>validateSourceCheckV3(proof,ctx));proof.evidence[0].pages=[1,48];assert.deepEqual(validateSourceCheckV3(proof,ctx),proof);
  for(const pages of [[48,1],[1,1],[0],[49],[]]){const bad=clone(proof);bad.evidence[0].pages=pages;internal(()=>validateSourceCheckV3(bad,ctx));}
});
test('strict JSON context descriptors reject before accessing/executing hash capability',()=>{
  let calls=0;const ctx=context();ctx.hashCanonical=()=>{calls++;return 'a'.repeat(64);};Object.defineProperty(ctx,'snapshot',{enumerable:true,get(){calls++;return sample.snapshot;}});
  internal(()=>validateSourceCheckV3(sample.sourceChecks[0],ctx));assert.equal(calls,0);
  const bad=context();bad.currentClaimGroups=clone(bad.currentClaimGroups);Object.defineProperty(bad.currentClaimGroups[0],'value',{enumerable:true,get(){calls++;return {};}});internal(()=>validateSourceCheckV3(sample.sourceChecks[0],bad));assert.equal(calls,0);
  const inputWithGetter=clone(input());Object.defineProperty(inputWithGetter.review,'note',{enumerable:true,get(){calls++;return 'bad';}});internal(()=>validateSourceAttestationsV3(inputWithGetter,context(),{proofView:'ALL'}));assert.equal(calls,0);
});
test('context has one exact shape, no authority flags/aliases/private namespaces',()=>{
  internal(()=>validateSourceCheckV3(sample.sourceChecks[0],{...context(),trust:true}));
  internal(()=>validateSourceCheckV3(sample.sourceChecks[0],{...context(),sourceIds:[]}));
  const ctx=context();delete ctx.hashCanonical;internal(()=>validateSourceCheckV3(sample.sourceChecks[0],ctx));
  const corrupt=context();corrupt.baselineClaimGroups=[];internal(()=>validateSourceCheckV3(sample.sourceChecks[0],corrupt));
  const duplicate=context();duplicate.currentClaimGroups=[...duplicate.currentClaimGroups,duplicate.currentClaimGroups[0]];internal(()=>validateSourceCheckV3(sample.sourceChecks[0],duplicate));
});
test('review/state terminal pairing and explicit views reject corruption',()=>{
  badRelations(value=>{value.review=null;});badRelations(value=>{value.review.id='wrong-review';});
  badRelations(value=>{value.reviewState.revision=0;});badRelations(value=>{value.review.sourceRevision=2;});
  badRelations(value=>{value.review.outcome='CHANGES_REQUESTED';value.review.note='Need changes';});
  for(const options of [undefined,{}, {proofView:'ACTIVE'},{proofView:'ALL',trust:true}])internal(()=>validateSourceAttestationsV3(input(),context(),options));
});
test('exact sets reject missing/additional/duplicate records or corrupted active indices',()=>{
  badRelations(value=>{value.sourceChecks=[];});badRelations(value=>{value.sourceChecks.push(clone(value.sourceChecks[0]));});
  badRelations(value=>{value.reviewState.activeSourceCheckIds['unknown/facts']=value.sourceChecks[0].id;});
  badRelations(value=>{value.reviewState.activeSourceCheckIds['seo/facts']=value.sourceChecks[0].id;});
  badRelations(value=>{value.reviewState.sourceRevision=0;value.review.sourceRevision=0;});
});
test('terminal frozen IDs/hash are required active subset, sorted and never full union digest',()=>{
  const {ctx,value}=privateSuperset();value.review.attestationSetHash=hash(value.sourceChecks);internal(()=>validateSourceAttestationsV3(value,ctx,{proofView:'ALL'}));
  badRelations(value=>{value.review.sourceCheckIds=[];value.review.attestationSetHash=hash([]);});
  badRelations(value=>{value.review.attestationSetHash='c'.repeat(64);});
  badRelations(value=>{value.reviewState.activeSourceCheckIds[sample.sourceChecks[0].claimPath]='missing-proof';});
});
test('creative SOURCE_CHECKED requires an independent active creative-copy proof',()=>{
  const value=clone(input());value.review.creativeCopyDeclaration='SOURCE_CHECKED';internal(()=>validateSourceAttestationsV3(value,context(),{proofView:'ALL'}));
  const ctx=context(),group=ctx.currentClaimGroups.find(value=>value.claimPath==='creative-copy'),source=ctx.sourceCatalog.find(value=>value.id==='baseline-source');
  const extra={...clone(value.sourceChecks[0]),id:'creative-check',claimPath:group.claimPath,claimHash:hash(group.value),evidence:[{sourceId:source.id,sha256:source.sha256}],sourceRevision:2,eventId:'creative-event'};
  value.sourceChecks.push(extra);value.reviewState.activeSourceCheckIds['creative-copy']=extra.id;value.reviewState.sourceRevision=2;value.review.sourceRevision=2;value.review.sourceCheckIds=value.sourceChecks.map(record=>record.id).sort();
  value.review.attestationSetHash=hash([...value.sourceChecks].sort((a,b)=>a.claimPath<b.claimPath?-1:a.claimPath>b.claimPath?1:a.id<b.id?-1:1));
  assert.equal(validateSourceAttestationsV3(value,ctx,{proofView:'ALL'}),true);
});
test('projection includes complete records sorted by claimPath/id, preserves evidence order and input',()=>{
  const first=clone(sample.sourceChecks[0]),second={...clone(first),id:'a-other-proof',claimPath:'seo/facts'};
  const values=[second,first],projection=attestationDigestProjection(values);assert.equal(projection[0].id,first.id);assert.deepEqual(values,[second,first]);
  assert.deepEqual(projection[0],first);projection[0].evidence[0].sha256='f'.repeat(64);assert.notEqual(first.evidence[0].sha256,projection[0].evidence[0].sha256);
  internal(()=>attestationDigestProjection([first,first]));
});
test('proof shapes reject unsafe Unicode/undefined/unknown fields and preserve raw note text',()=>{
  const proof={...clone(sample.sourceChecks[0]),note:'  Tiếng Việt 😀\nDòng hai  '};assert.equal(validateSourceCheckV3(proof,context()).note,proof.note);
  badProof(value=>{value.note='\uD800';});badProof(value=>{value.note=undefined;});
  badProof(value=>{value.privateDocumentId='secret';});badProof(value=>{value.note='😀'.repeat(501);});
  badProof(value=>{value.sourceRevision=Number.MAX_SAFE_INTEGER;});
});
