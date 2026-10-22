import {youtubeSiteFixture} from './helpers/showreel-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fullSiteFixture} from './full-site-localization-contract.test.mjs';
import {renderLocalizedFullSiteDocument,FULL_SITE_QA_SCRIPT} from '../preview/full-site-localization-renderer.mjs';
import {PINKY_VIDEO_STYLE} from '../preview/pinky-video-player.mjs';
import {parseYoutubeVideoId} from '../contracts/showreel-source.mjs';
test('uploaded and YouTube full documents use the same Pinky controls; YouTube stays lazy and has no MP4 fallback',()=>{
 for(const locale of ['en','vi','ja'])for(const youtube of [false,true]){
  const qa=youtube?youtubeSiteFixture(locale):fullSiteFixture(locale),html=renderLocalizedFullSiteDocument(qa,{mode:'QA_EXPORT'});
  assert.match(html,new RegExp(`data-source="${youtube?'YOUTUBE':'FIREBASE'}"`));for(const action of ['play','back','forward','mute','fullscreen','retry'])assert.ok(html.includes(`data-video-action="${action}"`));
  assert.doesNotMatch(html,/NaN|<iframe|<video[^>]*\bcontrols\b/);
  if(youtube){assert.match(html,/data-video-id="M7lc1UVf-VE"/);assert.doesNotMatch(html,/<video|\.mp4|showinfo|modestbranding/);assert.match(html,/frame-src https:\/\/www.youtube.com/);assert.ok(!qa.resources.some(r=>r.mimeType==='video/mp4'));}
  else{assert.match(html,/<video id="showreel-video"/);assert.match(html,/data-video-url="assets\//);assert.doesNotMatch(html,/frame-src https:\/\/www.youtube.com/);}
 }
 assert.match(FULL_SITE_QA_SCRIPT,/installPinkyVideoPlayer/);assert.doesNotThrow(()=>new Function(FULL_SITE_QA_SCRIPT.replace(/^import[^\n]*\n/,'')));
});
test('private website stays script-free with both sources',()=>{for(const qa of [fullSiteFixture(),youtubeSiteFixture()])assert.doesNotMatch(renderLocalizedFullSiteDocument(qa),/<script|<iframe|allow-scripts/);});
test('Admin stylesheet mirrors the shared exported player CSS',()=>assert.equal(readFileSync(new URL('../preview/pinky-video-player.css',import.meta.url),'utf8'),PINKY_VIDEO_STYLE));
test('YouTube parser normalizes known URLs and refuses unrelated hosts, duplicate IDs and embeds as HTML',()=>{
 for(const input of ['M7lc1UVf-VE','https://www.youtube.com/watch?v=M7lc1UVf-VE&si=share','https://youtu.be/M7lc1UVf-VE','https://www.youtube.com/shorts/M7lc1UVf-VE'])assert.equal(parseYoutubeVideoId(input),'M7lc1UVf-VE');
 for(const input of ['http://youtube.com/watch?v=M7lc1UVf-VE','https://youtube.com.attacker.test/watch?v=M7lc1UVf-VE','https://user@youtube.com/watch?v=M7lc1UVf-VE','https://youtube.com/watch?v=M7lc1UVf-VE&v=abcdefghijk','<iframe src="https://www.youtube.com/embed/M7lc1UVf-VE">','https://youtube.com/playlist?list=example'])assert.throws(()=>parseYoutubeVideoId(input));
});
