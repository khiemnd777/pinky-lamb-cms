import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {canonicalJson} from '../contracts/draft.mjs';
import {strictMediaV3JsonSchema,mediaMetadataSchema,uploadActorsSchema,rightsReferenceAllowlistSchema,parseMediaMetadata,metadataDigestProjection,evidenceDigestProjection,hashMediaMetadata} from '../contracts/media-v3-metadata.mjs';

const fixture=JSON.parse(readFileSync(new URL('./fixtures/media-v3-metadata.json',import.meta.url),'utf8'));
const copy=value=>structuredClone(value);
const hashCanonical=value=>createHash('sha256').update(canonicalJson(value),'utf8').digest('hex');
const context=()=>({actors:copy(fixture.actors),referenceAllowlist:copy(fixture.allowlist),hashCanonical});
const code=expected=>error=>error.code===expected;

test('META immutable golden MD/EV matches independently authored expectations',()=>{
  assert.deepEqual(hashMediaMetadata(fixture.metadata,context()),fixture.expected);
  assert.deepEqual(metadataDigestProjection(fixture.metadata),fixture.metadata);
  assert.deepEqual(evidenceDigestProjection(fixture.metadata,fixture.actors),{rights:fixture.metadata.rights,rightsEvidenceSubmittedBy:fixture.actors.rightsEvidenceSubmittedBy});
});
test('META preserves whitespace, Unicode, newline and parsed-copy isolation',()=>{
  const value=copy(fixture.metadata);value.name='  Golden Tiếng Việt 😀  ';value.rights.basis='  Declaration\nDòng hai  ';
  const parsed=parseMediaMetadata(value,{referenceAllowlist:fixture.allowlist});assert.deepEqual(parsed,value);
  parsed.rights.evidence.text='Changed';assert.equal(value.rights.evidence.text,fixture.metadata.rights.evidence.text);
  const a=hashMediaMetadata(value,context());value.name=value.name.trim();const b=hashMediaMetadata(value,context());
  assert.notEqual(a.metadataDigest,b.metadataDigest);assert.equal(a.evidenceSha256,b.evidenceSha256);
});
test('META submitter affects EV only, uploader affects neither, actors may coincide',()=>{
  const original=hashMediaMetadata(fixture.metadata,context());
  const c=context();c.actors.rightsEvidenceSubmittedBy='other-evidence';const changed=hashMediaMetadata(fixture.metadata,c);
  assert.equal(changed.metadataDigest,original.metadataDigest);assert.notEqual(changed.evidenceSha256,original.evidenceSha256);
  c.actors=copy(fixture.actors);c.actors.uploaderUid='other-uploader';assert.deepEqual(hashMediaMetadata(fixture.metadata,c),original);
  c.actors.uploaderUid=c.actors.rightsEvidenceSubmittedBy;assert.ok(uploadActorsSchema.safeParse(c.actors).success);
});
test('META reference identity order is preserved and hashes change on swap',()=>{
  const value=copy(fixture.metadata);value.rights.evidence.sourceRefs=copy(fixture.referenceCase.sourceRefs);
  const c=context();c.referenceAllowlist=copy(fixture.referenceCase.allowlist);
  const a=hashMediaMetadata(value,c);value.rights.evidence.sourceRefs.reverse();const b=hashMediaMetadata(value,c);
  assert.notEqual(a.metadataDigest,b.metadataDigest);assert.notEqual(a.evidenceSha256,b.evidenceSha256);
  assert.deepEqual(parseMediaMetadata(value,{referenceAllowlist:c.referenceAllowlist}).rights.evidence.sourceRefs,value.rights.evidence.sourceRefs);
});
test('META missing, corrupt or caller-tagged allowlist fails closed even empty refs',()=>{
  for(const options of [undefined,null,{}, {referenceAllowlist:null},{referenceAllowlist:{schemaVersion:2,allowedSourceRefs:[]}},{referenceAllowlist:{schemaVersion:1,allowedSourceRefs:[],trust:true}},{referenceAllowlist:fixture.allowlist,trust:true}])assert.throws(()=>parseMediaMetadata(fixture.metadata,options),code('INTERNAL_ERROR'));
  assert.deepEqual(parseMediaMetadata(fixture.metadata,{referenceAllowlist:fixture.allowlist}),fixture.metadata);
  const value=copy(fixture.metadata);value.rights.evidence.sourceRefs=['unknown-ref'];assert.throws(()=>parseMediaMetadata(value,{referenceAllowlist:fixture.allowlist}),code('VALIDATION_ERROR'));
});
test('META metadata unknown fields and actor/provenance tags are refused',()=>{
  for(const mutate of [v=>v.uploaderUid='client',v=>v.rights.legalStatus='verified',v=>v.rights.evidence.verified=true,v=>v.rights.evidence.url='https://example.invalid',v=>delete v.rights.basis]){
    const value=copy(fixture.metadata);mutate(value);assert.equal(mediaMetadataSchema.safeParse(value).success,false);
  }
});
test('META existing UTF16 text bounds, nonblank and control rules',()=>{
  const value=copy(fixture.metadata);value.name='😀'.repeat(120);assert.ok(mediaMetadataSchema.safeParse(value).success);
  value.name+='x';assert.equal(mediaMetadataSchema.safeParse(value).success,false);
  for(const name of ['','   ','name\nline','name\u0000','\ud800']){value.name=name;assert.equal(mediaMetadataSchema.safeParse(value).success,false);}
  value.name='Golden';value.rights.basis='😀'.repeat(500);value.rights.evidence.text='x'.repeat(1000);assert.ok(mediaMetadataSchema.safeParse(value).success);
  value.rights.evidence.text+='x';assert.equal(mediaMetadataSchema.safeParse(value).success,false);
});
test('META refs and trusted allowlist enforce distinct caps and ASCII sorted context',()=>{
  const value=copy(fixture.metadata);value.rights.evidence.sourceRefs=Array.from({length:8},(_,i)=>'ref-'+i);assert.ok(mediaMetadataSchema.safeParse(value).success);
  value.rights.evidence.sourceRefs.push('ref-8');assert.equal(mediaMetadataSchema.safeParse(value).success,false);
  value.rights.evidence.sourceRefs=['same','same'];assert.equal(mediaMetadataSchema.safeParse(value).success,false);
  for(const refs of [['b','a'],['a','a'],['not a resource'],['x'.repeat(129)]])assert.equal(rightsReferenceAllowlistSchema.safeParse({schemaVersion:1,allowedSourceRefs:refs}).success,false);
  const refs=Array.from({length:200},(_,i)=>'ref-'+String(i).padStart(3,'0'));assert.ok(rightsReferenceAllowlistSchema.safeParse({schemaVersion:1,allowedSourceRefs:refs}).success);
  refs.push('ref-200');assert.equal(rightsReferenceAllowlistSchema.safeParse({schemaVersion:1,allowedSourceRefs:refs}).success,false);
});
test('META mandatory actors are separate, strict and retain existing UID128 bound',()=>{
  const c=context();delete c.actors;assert.throws(()=>hashMediaMetadata(fixture.metadata,c),code('INTERNAL_ERROR'));
  for(const actors of [{uploaderUid:'x',rightsEvidenceSubmittedBy:undefined},{...fixture.actors,role:'OWNER'},{...fixture.actors,uploaderUid:'x'.repeat(129)}])assert.equal(uploadActorsSchema.safeParse(actors).success,false);
  assert.ok(uploadActorsSchema.safeParse({uploaderUid:'x'.repeat(128),rightsEvidenceSubmittedBy:'y'.repeat(128)}).success);
});
test('META JSON guard refuses descriptor hazards without accessing getters or hashing',()=>{
  let calls=0,hashes=0;const unsafe=copy(fixture.metadata);Object.defineProperty(unsafe,'name',{enumerable:true,get(){calls++;return 'secret';}});
  const cycle={};cycle.self=cycle;const sparse=Array(2);sparse[1]='x';const symbols={};symbols[Symbol('x')]=1;const hidden={};Object.defineProperty(hidden,'x',{value:1});
  const inherited=Object.create({name:'x'});const nullProto=Object.assign(Object.create(null),fixture.metadata);
  for(const value of [unsafe,cycle,sparse,symbols,hidden,inherited,nullProto,new Date(),undefined,Infinity,NaN,{bad:undefined},{bad:1n},{bad:'\udfff'}])assert.equal(strictMediaV3JsonSchema.safeParse(value).success,false);
  assert.equal(calls,0);const c=context();c.hashCanonical=()=>{hashes++;return 'a'.repeat(64);};assert.throws(()=>hashMediaMetadata(unsafe,c),code('VALIDATION_ERROR'));assert.equal(calls,0);assert.equal(hashes,0);
  const options={...context()};Object.defineProperty(options,'actors',{enumerable:true,get(){calls++;return fixture.actors;}});assert.throws(()=>hashMediaMetadata(fixture.metadata,options),code('INTERNAL_ERROR'));assert.equal(calls,0);
});
test('META evidence gate counts actual escaping and whole actor-bound projection',()=>{
  // Empty declaration refs are valid; combined maximum field lengths need not fit.
  const value=copy(fixture.metadata);value.rights.basis='界'.repeat(1000);value.rights.evidence.text='界'.repeat(1000);
  assert.ok(mediaMetadataSchema.safeParse(value).success);assert.throws(()=>evidenceDigestProjection(value,fixture.actors),code('PAYLOAD_TOO_LARGE'));
  assert.throws(()=>hashMediaMetadata(value,context()),code('PAYLOAD_TOO_LARGE'));
  const boundary=copy(fixture.metadata);boundary.rights.basis='界'.repeat(1000);boundary.rights.evidence.text='x';
  const overhead=Buffer.byteLength(JSON.stringify({rights:boundary.rights,rightsEvidenceSubmittedBy:fixture.actors.rightsEvidenceSubmittedBy}),'utf8')-1;
  boundary.rights.evidence.text='x'.repeat(4096-overhead);
  assert.ok(mediaMetadataSchema.safeParse(boundary).success);assert.equal(Buffer.byteLength(JSON.stringify(evidenceDigestProjection(boundary,fixture.actors)),'utf8'),4096);
  boundary.rights.evidence.text+='x';assert.ok(mediaMetadataSchema.safeParse(boundary).success);assert.throws(()=>evidenceDigestProjection(boundary,fixture.actors),code('PAYLOAD_TOO_LARGE'));
});
test('META injected hash capability must return lowercase64 SHA strings',()=>{
  for(const callback of [undefined,()=> 'A'.repeat(64),()=> 'a'.repeat(63),()=>{throw new Error('private SDK error');}]){const c=context();c.hashCanonical=callback;assert.throws(()=>hashMediaMetadata(fixture.metadata,c),code('INTERNAL_ERROR'));}
});
