import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile,symlink} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {exportMultilingualShell,serveMultilingualShell,validateMultilingualShellOutput} from '../scripts/export-multilingual-shell-local.mjs';
const cms=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const bundlePath=path.join(cms,'.local/test-outputs/multilingual-001/p1-v2/live-a2-20261016/browser-results/tests-hero-localization-ui-6f273-CAS-and-guarded-restoration/latest-qa-bundle.json');
const run=randomUUID();const output=path.join(cms,'.local/exports/multilingual-001/p3-remainder-v1/p2-compat-test-'+run);const evidence=path.join(cms,'.local/test-outputs/multilingual-001/p3-remainder-v1/p2-compat-test-'+run);
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
test('safe QA2 export three real routes with integrity and exclusive output',async()=>{const result=await exportMultilingualShell({bundlePath,output});assert.equal(result.files,17);const manifest=JSON.parse(await readFile(path.join(output,'manifest.json')));for(const file of manifest.files){assert.equal(digest(await readFile(path.join(output,file.path))),file.sha256);}for(const [locale,name] of [['en','index.html'],['vi','vi/index.html'],['ja','ja/index.html']]){const html=await readFile(path.join(output,name),'utf8');assert.match(html,new RegExp(`<html lang="${locale}"`));assert.match(html,/noindex,nofollow/);assert.match(html,/connect-src 'none'/);assert.match(html,/src="\/site-interactions.mjs"/);assert.doesNotMatch(html,/<script(?! type="module" src=)|Authorization|accessToken|refreshToken/);}await assert.rejects(exportMultilingualShell({bundlePath,output}),/EEXIST/);});
test('tampered resource and private path rejected before output exists',async()=>{await mkdir(evidence,{recursive:true});const bundle=JSON.parse(await readFile(bundlePath));bundle.entries[0].files[0].base64='YWJj';const input=path.join(evidence,'tampered.json');await writeFile(input,JSON.stringify(bundle),{flag:'wx'});await assert.rejects(exportMultilingualShell({bundlePath:input,output:output+'-tampered'}),/integrity/);bundle.entries[0].qa.resources[0].path='../private';await writeFile(path.join(evidence,'badpath.json'),JSON.stringify(bundle),{flag:'wx'});await assert.rejects(exportMultilingualShell({bundlePath:path.join(evidence,'badpath.json'),output:output+'-badpath'}));});
test('symlink input and output ancestors denied',async()=>{await mkdir(evidence,{recursive:true});const link=path.join(evidence,'bundle-link.json');await symlink(bundlePath,link);await assert.rejects(exportMultilingualShell({bundlePath:link,output:output+'-link'}),/Symlink/);await assert.rejects(exportMultilingualShell({bundlePath,output:path.join(cms,'admin-dist')}),/outside P2/);});

test('mismatched draft contentHash and private input denied before output creation',async()=>{const bundle=JSON.parse(await readFile(bundlePath));bundle.entries[0].qa.draft.contentHash='0'.repeat(64);const input=path.join(evidence,'bad-contenthash.json');await writeFile(input,JSON.stringify(bundle),{flag:'wx'});await assert.rejects(exportMultilingualShell({bundlePath:input,output:output+'-contenthash'}),/content hash/);await assert.rejects(exportMultilingualShell({bundlePath:path.join(cms,'contracts/baseline-site.json'),output:output+'-private'}),/outside safe QA/);});


test('serve rejects unowned root, malformed/unsafe manifest and symlinks before binding',async()=>{
 await assert.rejects(serveMultilingualShell(evidence),/outside P2/);
 const original=JSON.parse(await readFile(path.join(output,'manifest.json')));
 const invalid=[
  {...original,private:true},
  {...original,files:[...original.files.slice(1),original.files[1]]},
  {...original,files:original.files.map((item,index)=>index?item:{...item,path:'../private'})},
  {...original,files:original.files.map((item,index)=>index?item:{...item,sizeBytes:9_000_000})},
  {...original,files:original.files.map((item,index)=>index?item:{...item,sha256:'bad'})},
 ];
 for(const [index,manifest] of invalid.entries()){
  const directory=output+'-serve-denial-'+index;await mkdir(directory);await writeFile(path.join(directory,'manifest.json'),JSON.stringify(manifest),{flag:'wx'});
  await assert.rejects(serveMultilingualShell(directory),/Invalid QA manifest/);
 }
 const linked=output+'-linked-manifest';await mkdir(linked);await symlink(path.join(output,'manifest.json'),path.join(linked,'manifest.json'));
 await assert.rejects(serveMultilingualShell(linked),/Symlink/);
 assert.equal((await validateMultilingualShellOutput(output)).allowed.size,17);
 const corrupt=output+'-corrupt-manifest';await mkdir(corrupt);await writeFile(path.join(corrupt,'manifest.json'),JSON.stringify(original),{flag:'wx'});await mkdir(path.join(corrupt,'assets'));await writeFile(path.join(corrupt,original.files[0].path),'tampered',{flag:'wx'});
 await assert.rejects(serveMultilingualShell(corrupt),/integrity/);
});
