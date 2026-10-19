import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';

const admin=new URL('../admin/',import.meta.url);
const assets=['abril-fatface-400.woff','montserrat-400.woff','montserrat-600.woff','montserrat-700.woff','montserrat-800.woff','brand-diagonal.webp'];

test('CMS styles load fonts and artwork from their own origin with approved bytes',()=>{
 const origin='http://127.0.0.1:5273',referenced=new Set();
 for(const name of readdirSync(admin).filter(name=>name.endsWith('.css'))){
  const css=readFileSync(new URL(name,admin),'utf8');
  for(const match of css.matchAll(/url\(\s*(?:"([^"]+)"|'([^']+)'|([^\s)]+))\s*\)/g)){
   const value=match[1]??match[2]??match[3];
   if(value.startsWith('data:')||value.startsWith('#'))continue;
   const url=new URL(value,new URL(name,origin));
   assert.equal(url.origin,origin,`${name}: ${value} must not depend on another server`);
   assert.ok(url.pathname.startsWith('/assets/'),`${name}: public CMS asset path`);
   const bytes=readFileSync(new URL('.'+url.pathname,admin));
   assert.deepEqual(bytes,readFileSync(new URL('../public-baseline'+url.pathname,import.meta.url)),`${name}: preserve approved bytes`);
   referenced.add(url.pathname.slice('/assets/'.length));
  }
 }
 assert.deepEqual([...referenced].sort(),[...assets].sort(),'All existing font weights and artwork remain wired');
 const html=readFileSync(new URL('index.html',admin),'utf8');
 assert.match(html,/<link rel="license" href="\/assets\/FONT-NOTICES\.txt">/);
 assert.equal(readFileSync(new URL('assets/FONT-NOTICES.txt',admin),'utf8'),readFileSync(new URL('../public-baseline/FONT-NOTICES.txt',import.meta.url),'utf8'));
});
