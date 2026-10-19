import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fullSiteFixture} from '../full-site-localization-contract.test.mjs';
import {BASELINE_FILES} from '../../scripts/export-local.mjs';
import {CMS_ROOT,digest} from '../../scripts/multilingual-release-files.mjs';
import {releaseSnapshotSetHash} from '../../cms-api/localized-eligibility.mjs';
export function releaseBytesFixture(){
 const entries=['en','vi','ja'].map(locale=>fullSiteFixture(locale,'APPROVED_RELEASE')),bytesByPath=new Map();
 for(const qa of entries)for(const resource of qa.resources){if(bytesByPath.has(resource.path))continue;const pinned=BASELINE_FILES.find(pin=>pin.path===resource.path),bytes=pinned?readFileSync(path.join(CMS_ROOT,'public-baseline',pinned.path)):resource.inlineBase64?Buffer.from(resource.inlineBase64,'base64'):Buffer.from('closed fixture resource');bytesByPath.set(resource.path,bytes);}
 const hydrate=value=>{if(!value||typeof value!=='object')return;if(typeof value.path==='string'&&typeof value.mimeType==='string'&&Object.hasOwn(value,'sha256')&&Object.hasOwn(value,'sizeBytes')){const bytes=bytesByPath.get(value.path);assert.ok(bytes,'closed resource bytes');value.sizeBytes=bytes.length;value.sha256=digest(bytes);if(value.inlineBase64!==undefined)value.inlineBase64=bytes.toString('base64');}for(const child of Object.values(value))hydrate(child);};entries.forEach(hydrate);
 return {release:{contractRevision:1,kind:'MULTILINGUAL_SITE_RELEASE_BUNDLE',mode:'APPROVED_RELEASE',entries,snapshotSetHash:releaseSnapshotSetHash(entries)},files:[...bytesByPath].map(([name,bytes])=>({path:name,base64:bytes.toString('base64')}))};
}
