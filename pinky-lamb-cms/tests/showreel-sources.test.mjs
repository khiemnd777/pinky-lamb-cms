import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseMediaV3Content} from '../contracts/media-v3-content.mjs';
import {groupSourceFromHome,groupSourceSchema,groupSourceMediaUses} from '../contracts/group-localization.mjs';
import {collectSiteMediaReferenceIds} from '../preview/site-media-renderer.mjs';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/media-v3-content.json',import.meta.url)));
const row=fixture.cases[0],context={sourceCatalog:row.sourceCatalog,currentYear:fixture.currentYear,...(row.content.settings.showreel.originalSourceUrl?{allowedShowreelSourceUrl:row.content.settings.showreel.originalSourceUrl}:{})};
const youtube=()=>({...structuredClone(row.content),settings:{...structuredClone(row.content.settings),showreel:{sourceType:'YOUTUBE',videoId:'M7lc1UVf-VE',title:'Reel',poster:structuredClone(row.content.settings.showreel.poster)}}});
test('legacy upload content stays byte-identical; explicit Firebase is supported',()=>{
 assert.deepEqual(parseMediaV3Content(row.content,context),row.content);
 const value=structuredClone(row.content);value.settings.showreel.sourceType='FIREBASE';assert.equal(parseMediaV3Content(value,context).settings.showreel.sourceType,'FIREBASE');
});
test('YouTube round-trips through Home and localized source without a fake media asset or duration',()=>{
 const content=parseMediaV3Content(youtube(),context),source=groupSourceFromHome(content,'about');
 assert.deepEqual(groupSourceSchema('about').parse(source),source);
 assert.ok(!groupSourceMediaUses('about',source).some(u=>u.role==='VIDEO'));
 assert.ok(!collectSiteMediaReferenceIds(content).some(u=>u.kind==='VIDEO'&&!u.poster));
});
test('mixed providers, arbitrary embed HTML, unknown source and YouTube video-poster refs are rejected',()=>{
 for(const patch of [{assetId:'old-file'},{durationSeconds:60},{videoId:'<iframe>'},{sourceType:'VIMEO'},{poster:{...row.content.settings.showreel.poster,derivativeRole:'POSTER'}}]){
  const value=youtube();Object.assign(value.settings.showreel,patch);assert.throws(()=>parseMediaV3Content(value,context));
 }
});
