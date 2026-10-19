import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {v3ImportLineageSchema,mediaRightsProofPinSchema,safeCatalogV3Schema,createMediaV3RecordSchemas,validateDraftV3,validateSnapshotV3,validateDraftReadV3,validateSnapshotReadV3,validateQaV3,encodeStoredDraftV3,decodeStoredDraftV3,encodeStoredSnapshotV3,decodeStoredSnapshotV3,contentDigestProjection,rightsPinsDigestProjection} from '../contracts/media-v3-records.mjs';
import {parseMediaV3Content,projectClaimGroupsV3} from '../contracts/media-v3-content.mjs';

const fixture=JSON.parse(readFileSync(new URL('./fixtures/media-v3-records.json',import.meta.url),'utf8'));
const sample=fixture.cases[0],clone=value=>structuredClone(value);
// Independently authored canonical/hash oracle. Do not import the production
// primitive to manufacture expectations. Frozen per-record bytes/hashes below
// came from the separately reviewed immutable golden authoring batch.
function canonical(value){
  if(value===null || typeof value!=='object')return JSON.stringify(value);
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';
}
const hash=value=>createHash('sha256').update(canonical(value),'utf8').digest('hex');
const utf8=value=>Buffer.byteLength(JSON.stringify(value),'utf8');
const contentContext=row=>({sourceCatalog:row.expectedSourceCatalog,currentYear:fixture.currentYear,...(row.records.DomainSnapshot.content.settings.showreel.originalSourceUrl!==undefined?{allowedShowreelSourceUrl:row.records.DomainSnapshot.content.settings.showreel.originalSourceUrl}:{})});
const base=(row=sample)=>({contentContext:contentContext(row),expectedImport:row.expectedImport,hashCanonical:hash});
const snapshotContext=(row=sample)=>({...base(row),selectedAssetIds:row.selectedAssetIds,orderedManifest:row.orderedManifest,expectedSourceRefs:row.expectedSourceRefs,originalTerminalProofs:row.originalTerminalProofs});
function claims(row=sample){
  const snap=row.records.DomainSnapshot,baseline={...clone(fixture.baselineContent),schemaVersion:3};
  return {snapshot:Object.fromEntries(['id','contentHash','schemaVersion','templateVersion','submittedBy','submittedAt'].map(key=>[key,snap[key]])),currentClaimGroups:projectClaimGroupsV3(parseMediaV3Content(snap.content,contentContext(row))),baselineClaimGroups:projectClaimGroupsV3(parseMediaV3Content(baseline,contentContext(row))),claimSources:snap.content.claimSources,sourceCatalog:row.expectedSourceCatalog,hashCanonical:hash};
}
const draftReadContext=(row=sample)=>({...base(row),expectedSafeCatalog:row.expectedSafeCatalog,expectedSourceCatalog:row.expectedSourceCatalog});
const sources=(row=sample)=>({sourceChecks:row.records.QA.sourceChecks,claimContext:claims(row)});
const readContext=(row=sample)=>({...snapshotContext(row),expectedSourceCatalog:row.expectedSourceCatalog,sourceAttestations:sources(row)});
const qaContext=(row=sample)=>({...snapshotContext(row),sourceAttestations:sources(row)});
const fail=(fn,code='INTERNAL_ERROR')=>assert.throws(fn,error=>error.code===code);
const badSnapshot=mutate=>{const value=clone(sample.records.DomainSnapshot);mutate(value);fail(()=>validateSnapshotV3(value,snapshotContext()));};

test('five frozen family records match independent canonical hashes/whole actual JSON byte vectors',()=>{
  for(const row of fixture.cases){
    const records=row.records;
    for(const name of ['DomainDraft','StoredDraft','DomainSnapshot','StoredSnapshot','SnapshotRead','QA']){assert.equal(hash(records[name]),row.expectedHashes[name],row.family+'/'+name);assert.equal(utf8(records[name]),row.expectedBytes[name],row.family+'/'+name);}
    assert.deepEqual(validateDraftV3(records.DomainDraft,base(row)),records.DomainDraft);assert.deepEqual(validateSnapshotV3(records.DomainSnapshot,snapshotContext(row)),records.DomainSnapshot);
    assert.deepEqual(validateDraftReadV3(records.DraftRead,draftReadContext(row)),records.DraftRead);assert.deepEqual(validateSnapshotReadV3(records.SnapshotRead,readContext(row)),records.SnapshotRead);assert.deepEqual(validateQaV3(records.QA,qaContext(row)),records.QA);
  }
});
test('factory returns seven exact schema names and public lineages/pins/catalog parse frozen subsets',()=>{
  assert.deepEqual(Object.keys(createMediaV3RecordSchemas(contentContext(sample))),['domainDraftSchema','storedDraftSchema','snapshotSchema','storedSnapshotSchema','draftReadSchema','snapshotReadSchema','qaSchema']);
  assert.deepEqual(v3ImportLineageSchema.parse(sample.expectedImport),sample.expectedImport);assert.deepEqual(mediaRightsProofPinSchema.parse(sample.records.DomainSnapshot.mediaRightsProofPins[0]),sample.records.DomainSnapshot.mediaRightsProofPins[0]);assert.deepEqual(safeCatalogV3Schema.parse(sample.expectedSafeCatalog),sample.expectedSafeCatalog);
});
test('domain/stored draft and snapshot roundtrip exact frozen compact contentJson including VIDEO POSTER key order',()=>{
  for(const row of fixture.cases){
    assert.deepEqual(encodeStoredDraftV3(row.records.DomainDraft,base(row)),row.records.StoredDraft);assert.deepEqual(encodeStoredSnapshotV3(row.records.DomainSnapshot,snapshotContext(row)),row.records.StoredSnapshot);
    assert.deepEqual(decodeStoredDraftV3(row.records.StoredDraft,base(row)),row.records.DomainDraft);assert.deepEqual(decodeStoredSnapshotV3(row.records.StoredSnapshot,snapshotContext(row)),row.records.DomainSnapshot);
    assert.equal(encodeStoredSnapshotV3(decodeStoredSnapshotV3(row.records.StoredSnapshot,snapshotContext(row)),snapshotContext(row)).contentJson,row.records.StoredSnapshot.contentJson);
  }
});
test('encoder captures DATA property enumeration before callbacks and leaves its captured result stable',()=>{
  const value=clone(sample.records.DomainSnapshot),original=clone(value),c=snapshotContext();let calls=0;
  c.hashCanonical=input=>{calls++;value.content.hero.note='callback changed caller';return hash(input);};
  const encoded=encodeStoredSnapshotV3(value,c);assert.ok(calls>0);assert.equal(encoded.contentJson,JSON.stringify(original.content));assert.equal(value.content.hero.note,'callback changed caller');
});
test('descriptor guards refuse unsafe records/context before getter/hash execution',()=>{
  let calls=0;const value=clone(sample.records.DomainSnapshot);Object.defineProperty(value.content.hero,'note',{enumerable:true,get(){calls++;return 'x';}});const c=snapshotContext();c.hashCanonical=()=>{calls++;return 'a'.repeat(64);};fail(()=>validateSnapshotV3(value,c));assert.equal(calls,0);
  const ctx=base();Object.defineProperty(ctx,'expectedImport',{enumerable:true,get(){calls++;return sample.expectedImport;}});fail(()=>validateDraftV3(sample.records.DomainDraft,ctx));assert.equal(calls,0);
  const catalog=clone(sample.expectedSafeCatalog);Object.defineProperty(catalog,'0',{enumerable:true,get(){calls++;return sample.expectedSafeCatalog[0];}});assert.throws(()=>safeCatalogV3Schema.parse(catalog));assert.equal(calls,0);
});
test('CURRENT M2 import identity and nested M1 history match independent context without rewriting lineage',()=>{
  badSnapshot(value=>{value.importLineage.sourceDraftRevision=0;});badSnapshot(value=>{value.importLineage.sourceContentHash='a'.repeat(64);});
  badSnapshot(value=>{value.importLineage.sourceRefsHash='b'.repeat(64);});badSnapshot(value=>{value.importLineage.sourceImportLineage.importedM1Revision=1;});
  badSnapshot(value=>{value.importLineage.sourceDraftId='home';});
  const value=clone(sample.records.DomainSnapshot),c=snapshotContext();c.expectedImport={...clone(sample.expectedImport),sourceRefsHash:hash(['independent-CURRENT-M2-raw-reference'])};value.importLineage=clone(c.expectedImport);assert.deepEqual(validateSnapshotV3(value,c),value);
});
test('contexts require exact keys and independent selected manifest/source/proof data, without trust flags',()=>{
  for(const key of ['selectedAssetIds','orderedManifest','expectedSourceRefs','originalTerminalProofs']){const c=snapshotContext();delete c[key];fail(()=>validateSnapshotV3(sample.records.DomainSnapshot,c));}
  fail(()=>validateDraftV3(sample.records.DomainDraft,{...base(),trust:true}));
  const c=snapshotContext();c.originalTerminalProofs=clone(c.originalTerminalProofs);c.originalTerminalProofs[0].context.currentActorUid='caller';fail(()=>validateSnapshotV3(sample.records.DomainSnapshot,c));
});
test('independent selected IDs and full ordered manifest validate bijection including hidden/fixed assets',()=>{
  const hidden=sample.records.DomainSnapshot.content.projects.find(value=>!value.isVisible);assert.ok(hidden);assert.ok(sample.selectedAssetIds.includes(hidden.cover.assetId));
  const c=snapshotContext();c.selectedAssetIds=c.selectedAssetIds.filter(id=>id!==hidden.cover.assetId);fail(()=>validateSnapshotV3(sample.records.DomainSnapshot,c));
  badSnapshot(value=>{value.mediaManifest=value.mediaManifest.filter(entry=>entry.asset.id!=='favicon');});
  const missing=snapshotContext();missing.orderedManifest=clone(missing.orderedManifest);missing.orderedManifest=missing.orderedManifest.filter(entry=>entry.asset.id!=='brand-diagonal');missing.selectedAssetIds=missing.selectedAssetIds.filter(id=>id!=='brand-diagonal');fail(()=>validateSnapshotV3(sample.records.DomainSnapshot,missing));
});
test('ordered selected manifest preserves source/id and role/target/page/key gates',()=>{
  badSnapshot(value=>{value.mediaManifest.reverse();});
  badSnapshot(value=>{value.mediaManifest.find(entry=>entry.source==='MEDIA_VERSION').asset.derivatives.reverse();});
  const video=fixture.cases.find(row=>row.family==='G_VIDEO');assert.deepEqual(video.records.DomainSnapshot.mediaManifest.find(entry=>entry.source==='MEDIA_VERSION').asset.derivatives.map(value=>value.role),['POSTER','VIDEO']);
});
test('manifest/content/pins digests use exact frozen formulas and reject stale/tampered values',()=>{
  const value=sample.records.DomainSnapshot;assert.equal(hash(value.mediaManifest),value.mediaManifestHash);assert.equal(hash({content:value.content,mediaManifestHash:value.mediaManifestHash,schemaVersion:3,templateVersion:'m3-site-media-v1'}),value.contentHash);assert.equal(hash(value.mediaRightsProofPins),value.mediaRightsProofPinsHash);
  badSnapshot(record=>{record.contentHash='a'.repeat(64);});badSnapshot(record=>{record.mediaManifestHash='b'.repeat(64);});badSnapshot(record=>{record.mediaRightsProofPinsHash='c'.repeat(64);});badSnapshot(record=>{record.content.hero.note+=' modified';});
});
test('new versions require exact original APPROVED proof/context/pins, legacy gets no synthetic Rights proof',()=>{
  badSnapshot(value=>{value.mediaRightsProofPins=[];});badSnapshot(value=>{value.mediaRightsProofPins[0].proofId='current-replacement';});badSnapshot(value=>{value.mediaRightsProofPins[0].proofDigest='a'.repeat(64);});
  const c=snapshotContext();c.originalTerminalProofs=clone(c.originalTerminalProofs);c.originalTerminalProofs[0].context.originalCheckerUid='current-actor';fail(()=>validateSnapshotV3(sample.records.DomainSnapshot,c));
  const extra=snapshotContext();extra.originalTerminalProofs=[...extra.originalTerminalProofs,extra.originalTerminalProofs[0]];fail(()=>validateSnapshotV3(sample.records.DomainSnapshot,extra));
});
test('raw LEGACY sourceRefs remain exact UNVERIFIED lineage, separate from factual and Rights namespaces',()=>{
  const qa=sample.records.QA;assert.ok(qa.sourceChecks[0].evidence.every(evidence=>!qa.snapshot.sourceRefs.some(ref=>ref.id===evidence.sourceId)));
  badSnapshot(value=>{value.sourceRefs[0].verification='SOURCE_CHECKED';});badSnapshot(value=>{value.sourceRefs[0].claimBindings=['hero/facts'];});badSnapshot(value=>{value.sourceRefs=[];});badSnapshot(value=>{value.sourceRefs[0].privateDocumentId='legacy-source-'+'a'.repeat(64);});
});
test('safe catalog has two bounded sorted namespaces, no cross-ID collision or private version fields',()=>{
  const catalog=clone(sample.expectedSafeCatalog),version=catalog.find(entry=>entry.source==='MEDIA_VERSION');version.asset.uploaderUid='private';assert.throws(()=>safeCatalogV3Schema.parse(catalog));
  for(const key of ['originalSha256','derivatives','metadata','rights']){const bad=clone(sample.expectedSafeCatalog);bad.find(entry=>entry.source==='MEDIA_VERSION').asset[key]=key==='derivatives'?[]:'private';assert.throws(()=>safeCatalogV3Schema.parse(bad));}
  const duplicate=clone(sample.expectedSafeCatalog);duplicate.push(duplicate[0]);assert.throws(()=>safeCatalogV3Schema.parse(duplicate));
  const collision=clone(sample.expectedSafeCatalog);collision.find(entry=>entry.source==='MEDIA_VERSION').asset.assetId=collision[0].asset.id;assert.throws(()=>safeCatalogV3Schema.parse(collision));
  assert.throws(()=>safeCatalogV3Schema.parse([...sample.expectedSafeCatalog].reverse()));
});
test('safe catalog allows 64 LEGACY plus64 MEDIA_VERSION, rejects65 in either namespace',()=>{
  const legacy=sample.expectedSafeCatalog.find(entry=>entry.source==='LEGACY'),version=sample.expectedSafeCatalog.find(entry=>entry.source==='MEDIA_VERSION');
  const left=Array.from({length:64},(_,index)=>({source:'LEGACY',asset:{...clone(legacy.asset),id:'legacy-'+String(index).padStart(3,'0')}})),right=Array.from({length:64},(_,index)=>({source:'MEDIA_VERSION',asset:{...clone(version.asset),assetId:'version-'+String(index).padStart(3,'0')}}));
  assert.equal(safeCatalogV3Schema.parse([...left,...right]).length,128);
  assert.throws(()=>safeCatalogV3Schema.parse([...left,{source:'LEGACY',asset:{...clone(legacy.asset),id:'legacy-064'}}]));
  assert.throws(()=>safeCatalogV3Schema.parse([...right,{source:'MEDIA_VERSION',asset:{...clone(version.asset),assetId:'version-064'}}]));
});
test('DraftRead checks exact safe/source catalogs and retained archived inspection stays structural',()=>{
  const row=clone(sample);row.expectedSafeCatalog.find(entry=>entry.source==='MEDIA_VERSION').asset.archived=true;row.records.DraftRead.catalog=clone(row.expectedSafeCatalog);assert.deepEqual(validateDraftReadV3(row.records.DraftRead,draftReadContext(row)),row.records.DraftRead);
  const value=clone(sample.records.DraftRead);value.catalog.pop();fail(()=>validateDraftReadV3(value,draftReadContext()));
  const source=clone(sample.records.DraftRead);source.sourceCatalog[0].sha256='a'.repeat(64);fail(()=>validateDraftReadV3(source,draftReadContext()));
});
test('SnapshotRead exact five fields, summary, source catalogs and ALL proof relations are checked',()=>{
  for(const mutate of [value=>{value.summary.contentHash='a'.repeat(64);},value=>{value.summary.submittedBy='other';},value=>{value.sourceCatalog=[];},value=>{value.sourceChecks=sample.records.QA.sourceChecks;},value=>{value.review=null;}]){const value=clone(sample.records.SnapshotRead);mutate(value);fail(()=>validateSnapshotReadV3(value,readContext()));}
  const c=readContext();c.sourceAttestations.sourceChecks=[];fail(()=>validateSnapshotReadV3(sample.records.SnapshotRead,c));
});
test('QA exact five fields requires APPROVED pinned source set and full original Rights set',()=>{
  for(const mutate of [value=>{value.sourceChecks=[];},value=>{value.mediaRightsChecks=[];},value=>{value.sourceCatalog=sample.expectedSourceCatalog;},value=>{value.qaEnvelopeVersion=3;},value=>{value.mediaRightsChecks[0].checkedBy='replacement';},value=>{value.reviewState.status='IN_REVIEW';}]){const value=clone(sample.records.QA);mutate(value);fail(()=>validateQaV3(value,qaContext()));}
});
test('claim context matches snapshot identity and exact CONTENT projection, independently of CURRENT M2 lineage',()=>{
  const c=qaContext();c.sourceAttestations.claimContext.currentClaimGroups=clone(c.sourceAttestations.claimContext.currentClaimGroups);c.sourceAttestations.claimContext.currentClaimGroups[0].value={wrong:'claim'};fail(()=>validateQaV3(sample.records.QA,c));
  const stale=readContext();stale.sourceAttestations.claimContext.snapshot={...stale.sourceAttestations.claimContext.snapshot,snapshotId:'extra'};fail(()=>validateSnapshotReadV3(sample.records.SnapshotRead,stale));
  const source=qaContext();source.sourceAttestations.claimContext.sourceCatalog=[];fail(()=>validateQaV3(sample.records.QA,source));
});
test('encode submitted invalid domain yields VALIDATION_ERROR; corrupt context/persisted decode yields INTERNAL_ERROR',()=>{
  const draft=clone(sample.records.DomainDraft);draft.content.schemaVersion=2;fail(()=>encodeStoredDraftV3(draft,base()),'VALIDATION_ERROR');
  const snap=clone(sample.records.DomainSnapshot);snap.contentHash='a'.repeat(64);fail(()=>encodeStoredSnapshotV3(snap,snapshotContext()),'VALIDATION_ERROR');
  fail(()=>encodeStoredDraftV3(sample.records.DomainDraft,{...base(),trust:true}));
  const stored=clone(sample.records.StoredSnapshot);stored.contentJson='{broken';fail(()=>decodeStoredSnapshotV3(stored,snapshotContext()));
  const wrong=clone(sample.records.StoredDraft);wrong.content=sample.records.DomainDraft.content;fail(()=>decodeStoredDraftV3(wrong,base()));
});
test('strict JSON refuses unsafe Unicode/undefined/sparse/cycles; stable returned DATA is independent',()=>{
  badSnapshot(value=>{value.content.hero.note='\uD800';});badSnapshot(value=>{value.message=undefined;});badSnapshot(value=>{delete value.mediaManifest[0];});badSnapshot(value=>{value.self=value;});
  const value=validateSnapshotV3(sample.records.DomainSnapshot,snapshotContext());value.content.hero.note='changed result';assert.notEqual(sample.records.DomainSnapshot.content.hero.note,'changed result');
});
test('digest projections preserve exact content/array/text and normalize only Rights pin set order',()=>{
  const snapshot=sample.records.DomainSnapshot,projection=contentDigestProjection(snapshot.content,snapshot.mediaManifestHash);assert.deepEqual(projection,{content:snapshot.content,mediaManifestHash:snapshot.mediaManifestHash,schemaVersion:3,templateVersion:'m3-site-media-v1'});
  projection.content.hero.note='changed';assert.notEqual(snapshot.content.hero.note,'changed');
  const pins=[{assetId:'z-asset',proofId:'proof-z',proofDigest:hash('z')},{assetId:'a-asset',proofId:'proof-a',proofDigest:hash('a')}];assert.deepEqual(rightsPinsDigestProjection(pins).map(value=>value.assetId),['a-asset','z-asset']);assert.equal(pins[0].assetId,'z-asset');
  fail(()=>rightsPinsDigestProjection([pins[0],pins[0]]));
});
