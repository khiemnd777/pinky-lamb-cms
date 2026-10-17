import test from 'node:test';
import assert from 'node:assert/strict';
import {createContentLocaleSession,bindContentLocale} from '../admin/content-locale-session.mjs';
const member={uid:'synthetic-owner',role:'OWNER',authzVersion:1};
test('one session locale follows groups while hidden workspaces load only on activation',async()=>{
 const session=createContentLocaleSession({getSession:()=>member});let shown=true,state={locale:'en',record:{},pending:false,intent:false};const loads=[];
 const binding=bindContentLocale(session,{requestTransition:async()=>true,isActive:()=>shown,state:()=>state,load:async locale=>{loads.push(locale);state={...state,locale};return true;}});
 assert.equal(await session.select('vi'),true);assert.deepEqual(loads,['vi']);shown=false;await session.select('ja');assert.deepEqual(loads,['vi']);shown=true;await binding.sync();assert.deepEqual(loads,['vi','ja']);assert.equal(binding.get(),'ja');binding.destroy();session.destroy();assert.equal(session.get(),'en');
});
test('dirty refusal and unknown write outcomes deny every locale commit and load',async()=>{
 const session=createContentLocaleSession({getSession:()=>member}),events=[];let allow=false;
 session.register({requestTransition:async()=>{events.push('first guard');return true;},sync:async()=>events.push('load')});session.register({requestTransition:async()=>allow,sync:async()=>events.push('second load')});
 assert.equal(await session.select('vi'),false);assert.equal(session.get(),'en');assert.deepEqual(events,['first guard']);allow=true;assert.equal(await session.select('vi'),true);assert.equal(session.get(),'vi');assert.deepEqual(events,['first guard','first guard','load','second load']);
});
test('role or session changes revoke locale transitions without persisting private content',async()=>{
 let current=member;const session=createContentLocaleSession({getSession:()=>current});let release;session.register({requestTransition:()=>new Promise(resolve=>release=resolve),sync:async()=>assert.fail('old member loaded')});const result=session.select('ja');current={...member,authzVersion:2};release(true);assert.equal(await result,false);assert.equal(session.get(),'en');assert.equal(await session.select('vi'),false);
});
test('a failed locale read reports failure and leaves the requested locale selected for retry',async()=>{
 const session=createContentLocaleSession({getSession:()=>member});session.register({requestTransition:async()=>true,sync:async()=>false});assert.equal(await session.select('ja'),false);assert.equal(session.get(),'ja');
});
