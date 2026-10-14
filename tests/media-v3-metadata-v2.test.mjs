import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {
  strictMediaV2JsonSchema,mediaMetadataV2Schema,uploadActorsV2Schema,
  parseMediaMetadataV2,metadataDigestProjectionV2,hashMediaMetadataV2
} from '../contracts/media-v3-metadata-v2.mjs';

// Independently authored normative fixture; never derived from the target parser.
const fixture=JSON.parse(readFileSync(new URL('./fixtures/media-v3-metadata-v2.json',import.meta.url),'utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
// These literal vectors have exactly one ASCII object key and string values.
// This independent encoder is not the production canonical helper.
const encodeMetadata=metadata=>'{"name":'+JSON.stringify(metadata.name)+'}';
const hashCanonical=metadata=>sha(Buffer.from(encodeMetadata(metadata),'utf8'));
const validation=fn=>assert.throws(fn,error=>error.code==='VALIDATION_ERROR');
const internal=fn=>assert.throws(fn,error=>error.code==='INTERNAL_ERROR');

test('v2 metadata preserves every pinned canonical byte/hash vector',()=>{
  for(const vector of fixture.vectors){
    const input={name:vector.name};
    assert.deepEqual(parseMediaMetadataV2(input),input);
    assert.deepEqual(metadataDigestProjectionV2(input),input);
    assert.equal(encodeMetadata(input),vector.canonicalJson);
    assert.equal(Buffer.byteLength(vector.canonicalJson,'utf8'),vector.canonicalUtf8Bytes);
    assert.equal(sha(Buffer.from(vector.canonicalJson,'utf8')),vector.metadataDigest);
    assert.deepEqual(hashMediaMetadataV2(input,{hashCanonical}),{metadataDigest:vector.metadataDigest});
  }
});
test('v2 name uses UTF16 units at the 240 boundary',()=>{
  assert.equal(parseMediaMetadataV2({name:'😀'.repeat(120)}).name.length,240);
  validation(()=>parseMediaMetadataV2({name:'😀'.repeat(120)+'a'}));
  validation(()=>parseMediaMetadataV2({name:'a'.repeat(241)}));
});
test('v2 name rejects empty, blank, multiline, controls and lone surrogates',()=>{
  for(const name of fixture.invalidNames)validation(()=>parseMediaMetadataV2({name}));
});
test('v2 name retains whitespace and decomposed Unicode without NFC',()=>{
  assert.equal(parseMediaMetadataV2({name:'  e\u0301  '}).name,'  e\u0301  ');
  assert.notEqual(hashMediaMetadataV2({name:'é'},{hashCanonical}).metadataDigest,hashMediaMetadataV2({name:'e\u0301'},{hashCanonical}).metadataDigest);
});
test('v2 metadata denies all superseded Rights/EV/actor/revision fields',()=>{
  for(const key of fixture.forbiddenMetadataFields)validation(()=>parseMediaMetadataV2({name:'Golden',[key]:null}));
  validation(()=>parseMediaMetadataV2({}));
});
test('v2 actors have exactly one server-owned resource128 uploader identity',()=>{
  for(const uploaderUid of fixture.validUploaderUids)assert.deepEqual(uploadActorsV2Schema.parse({uploaderUid}),{uploaderUid});
  for(const uploaderUid of fixture.invalidUploaderUids)assert.equal(uploadActorsV2Schema.safeParse({uploaderUid}).success,false);
  assert.equal(uploadActorsV2Schema.safeParse({uploaderUid:'uploader-a2',rightsEvidenceSubmittedBy:'old'}).success,false);
});
test('v2 metadata hash excludes uploader identity and rejects actor options',()=>{
  const expected=fixture.vectors[0].metadataDigest;
  for(const uploaderUid of fixture.validUploaderUids){uploadActorsV2Schema.parse({uploaderUid});assert.equal(hashMediaMetadataV2({name:fixture.vectors[0].name},{hashCanonical}).metadataDigest,expected);}
  internal(()=>hashMediaMetadataV2({name:'Golden'},{hashCanonical,actors:{uploaderUid:'uploader-a2'}}));
});
test('v2 strict JSON permits ordinary finite DATA and repeated noncyclic identities',()=>{
  const shared={name:'Golden'};
  assert.equal(strictMediaV2JsonSchema.safeParse({list:[shared,shared,null,true,0,0.5]}).success,true);
  assert.equal(mediaMetadataV2Schema.safeParse(Object.freeze({name:'Golden'})).success,true);
});
test('v2 strict JSON rejects non-JSON values, sparse arrays and cycles',()=>{
  const cyclic={};cyclic.self=cyclic;const sparse=new Array(1),extra=[];extra.extra=true;
  for(const value of [undefined,NaN,Infinity,-Infinity,1n,()=>{},Symbol('x'),{x:undefined},sparse,extra,cyclic])assert.equal(strictMediaV2JsonSchema.safeParse(value).success,false);
});
test('v2 strict JSON rejects class, inherited, null-prototype and descriptor fields',()=>{
  class Record{constructor(){this.name='Golden';}}
  const hidden={name:'Golden'};Object.defineProperty(hidden,'hidden',{value:true});
  const symbol={name:'Golden',[Symbol('x')]:true};
  const nullPrototype=Object.assign(Object.create(null),{name:'Golden'});
  const inherited=Object.assign(Object.create({foreign:true}),{name:'Golden'});
  for(const value of [new Record(),hidden,symbol,nullPrototype,inherited])validation(()=>parseMediaMetadataV2(value));
});
test('v2 input getter is rejected without invocation',()=>{
  let calls=0;const input={};Object.defineProperty(input,'name',{enumerable:true,get(){calls++;return 'Golden';}});
  validation(()=>parseMediaMetadataV2(input));assert.equal(calls,0);
});
test('v2 strict JSON rejects lone-surrogate keys and nested values',()=>{
  for(const input of [{'\ud800':true},{nested:['\udc00']}])assert.equal(strictMediaV2JsonSchema.safeParse(input).success,false);
});
test('v2 capability descriptor validation occurs before input or callback access',()=>{
  let getterCalls=0,callbackCalls=0;const input={};Object.defineProperty(input,'name',{enumerable:true,get(){getterCalls++;return 'Golden';}});
  const options={};Object.defineProperty(options,'hashCanonical',{enumerable:true,get(){getterCalls++;return ()=>{callbackCalls++;return 'a'.repeat(64);};}});
  internal(()=>hashMediaMetadataV2(input,options));assert.equal(getterCalls,0);assert.equal(callbackCalls,0);
});
test('v2 hash options require only a plain enumerable DATA function slot',()=>{
  const hidden={};Object.defineProperty(hidden,'hashCanonical',{value:hashCanonical});
  for(const options of [undefined,null,{},hidden,Object.assign(Object.create(null),{hashCanonical}),Object.assign(Object.create({foreign:true}),{hashCanonical}),{hashCanonical:'sha256'},{hashCanonical,trust:true},{hashCanonical,[Symbol('x')]:true}])internal(()=>hashMediaMetadataV2({name:'Golden'},options));
});
test('v2 invalid metadata never reaches an otherwise valid hash capability',()=>{
  let calls=0;validation(()=>hashMediaMetadataV2({name:'Golden',rights:{}},{hashCanonical(){calls++;return 'a'.repeat(64);}}));assert.equal(calls,0);
});
test('v2 callback receives stable metadata captured before caller mutation',()=>{
  const input={name:fixture.vectors[0].name};let captured;
  const result=hashMediaMetadataV2(input,{hashCanonical(value){input.name='Changed after capture';captured=value;return hashCanonical(value);}});
  assert.deepEqual(captured,{name:fixture.vectors[0].name});assert.equal(result.metadataDigest,fixture.vectors[0].metadataDigest);
});
test('v2 capability errors and malformed digest outputs fail as INTERNAL_ERROR',()=>{
  for(const output of [undefined,null,123,'A'.repeat(64),'a'.repeat(63),'a'.repeat(64)+'\n',{metadataDigest:'a'.repeat(64)}])internal(()=>hashMediaMetadataV2({name:'Golden'},{hashCanonical:()=>output}));
  internal(()=>hashMediaMetadataV2({name:'Golden'},{hashCanonical(){throw new Error('private capability failure');}}));
});
