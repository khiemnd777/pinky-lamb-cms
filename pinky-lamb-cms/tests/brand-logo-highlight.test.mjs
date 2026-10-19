import test from 'node:test';
import assert from 'node:assert/strict';
import {nextBrandLogoOrder,installBrandLogoHighlight} from '../preview/brand-logo-highlight.mjs';

test('random logo rounds visit each visible logo once without repeating at the boundary',()=>{
 const first=nextBrandLogoOrder(5,-1,()=>0);
 const second=nextBrandLogoOrder(5,first.at(-1),()=>0);
 assert.deepEqual([...first].sort(),[0,1,2,3,4]);
 assert.deepEqual([...second].sort(),[0,1,2,3,4]);
 assert.notEqual(second[0],first.at(-1));
 assert.deepEqual(nextBrandLogoOrder(0),[]);
 assert.deepEqual(nextBrandLogoOrder(1,0),[0]);
});
test('only one logo advances at a time and reduced motion leaves native colors static',()=>{
 const handlers=new Map(),logos=Array.from({length:5},()=>{
  const classes=new Set();return {classList:{toggle(name,active){if(active)classes.add(name);else classes.delete(name);},add(name){classes.add(name);},remove(name){classes.delete(name);},contains(name){return classes.has(name);}}};
 });
 let interval=null,hidden=false;
 const reduced={matches:false,addEventListener(type,handler){handlers.set('motion:'+type,handler);}};
 const window={matchMedia:()=>reduced,setInterval(handler,delay){assert.equal(delay,3400);interval=handler;return 1;},clearInterval(){interval=null;},addEventListener(type,handler){handlers.set('window:'+type,handler);}};
 const section={hidden:false,querySelectorAll:()=>logos};
 const document={defaultView:window,querySelector:()=>section,addEventListener(type,handler){handlers.set('document:'+type,handler);},get hidden(){return hidden;}};
 const active=()=>logos.findIndex(logo=>logo.classList.contains('is-active'));
 installBrandLogoHighlight(document);
 assert.notEqual(active(),-1);
 const visited=new Set([active()]);
 for(let index=1;index<5;index++){interval();visited.add(active());assert.equal(logos.filter(logo=>logo.classList.contains('is-active')).length,1);}
 assert.equal(visited.size,5);
 const last=active();interval();assert.notEqual(active(),last);
 hidden=true;handlers.get('document:visibilitychange')();assert.equal(interval,null);
 reduced.matches=true;handlers.get('motion:change')();assert.equal(active(),-1);
 hidden=false;reduced.matches=false;handlers.get('motion:change')();assert.notEqual(active(),-1);
 assert.equal(typeof interval,'function');
 handlers.get('window:pagehide')();assert.equal(interval,null);
 handlers.get('window:pageshow')();assert.equal(typeof interval,'function');
});
