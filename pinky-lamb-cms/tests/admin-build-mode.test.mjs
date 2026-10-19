import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {assertAdminBuildMode,durableHtml} from '../vite.config.mjs';
import {assertDurableAdminBuild,DURABLE_AUTH_MARKER} from '../scripts/durable-admin-build.mjs';

test('a legacy Admin build cannot overwrite the durable local CMS bundle after cutover',()=>{
 assert.throws(()=>assertAdminBuildMode({command:'build',recovery:false,durable:false,cutoverPresent:true}),/build:admin:durable/);
 for(const options of [
  {command:'serve',recovery:false,durable:false,cutoverPresent:true},
  {command:'build',recovery:true,durable:false,cutoverPresent:true},
  {command:'build',recovery:false,durable:true,cutoverPresent:true},
  {command:'build',recovery:false,durable:false,cutoverPresent:false},
 ])assert.doesNotThrow(()=>assertAdminBuildMode(options));
});

test('make run accepts only a complete Admin build for durable Auth',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'pinky-admin-build-'));
 try{
  fs.mkdirSync(path.join(root,'assets'));
  fs.writeFileSync(path.join(root,'assets','index-abc123.js'),'export {};');
  const legacy='<head><meta http-equiv="Content-Security-Policy" content="connect-src http://127.0.0.1:9099"><script type="module" src="/assets/index-abc123.js"></script></head>';
  fs.writeFileSync(path.join(root,'index.html'),legacy);
  assert.throws(()=>assertDurableAdminBuild(root),/wrong Auth runtime/);
  const durable=durableHtml(legacy);
  assert.ok(durable.includes(DURABLE_AUTH_MARKER));
  assert.ok(!durable.includes('127.0.0.1:9099'));
  fs.writeFileSync(path.join(root,'index.html'),durable);
  assert.doesNotThrow(()=>assertDurableAdminBuild(root));
  fs.unlinkSync(path.join(root,'assets','index-abc123.js'));
  assert.throws(()=>assertDurableAdminBuild(root),/entry asset missing/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
