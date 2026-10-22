import test from 'node:test';
import assert from 'node:assert/strict';
import {installPinkyVideoPlayer} from '../preview/pinky-video-player.mjs';
class Element extends EventTarget{
 constructor(){super();this.attrs={};this.dataset={};this.value='0';this.textContent='';this.children=[];const classes=new Set();this.classList={contains:k=>classes.has(k),add:k=>classes.add(k),remove:k=>classes.delete(k)};}
 setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k]??null;}append(...children){this.children.push(...children);}replaceChildren(...children){this.children=children;}cloneNode(){return new Element();}remove(){}
}
function fixture(source='FIREBASE'){
 const win=new EventTarget(),doc=new EventTarget(),root=new Element(),stage=new Element(),video=new Element(),status=new Element(),seek=new Element(),volume=new Element(),time=new Element(),group=new Element();
 Object.assign(win,{location:{origin:'http://127.0.0.1:4199'},setTimeout:()=>1,clearTimeout(){},setInterval:()=>2,clearInterval(){}});Object.assign(doc,{defaultView:win,createElement:()=>new Element(),head:new Element(),hidden:false});root.ownerDocument=doc;root.dataset={source,videoId:'M7lc1UVf-VE',locale:'vi'};stage.firstElementChild=new Element();
 const buttons=Object.fromEntries(['play','back','forward','mute','fullscreen','retry',...(source==='YOUTUBE'?['native']:[])].map(key=>{const b=new Element();b.dataset.videoAction=key;return [key,b];}));
 const nodes={'.pinky-video-stage':stage,video,'[data-video-seek]':seek,'[data-video-volume]':volume,'[data-video-time]':time,'[data-video-status]':status,'[role=group]':group};root.querySelector=s=>nodes[s];root.querySelectorAll=()=>Object.values(buttons);
 video.dataset.videoUrl='blob:synthetic-upload';Object.assign(video,{currentTime:0,duration:65,volume:.7,muted:false,playCalls:0,pauseCalls:0,play(){this.playCalls++;this.dispatchEvent(new Event('loadedmetadata'));this.dispatchEvent(new Event('playing'));return Promise.resolve();},pause(){this.pauseCalls++;this.dispatchEvent(new Event('pause'));},load(){}});
 const client=installPinkyVideoPlayer(root);return {win,doc,root,stage,video,buttons,seek,volume,time,client};
}
test('uploaded-file controls lazy-load only the selected file, follow events, seek, mute and stop',async t=>{
 const f=fixture();t.after(()=>f.client.destroy());assert.equal(f.video.src,undefined);assert.equal(f.root.dataset.phase,'before');
 await f.client.play();assert.equal(f.video.src,'blob:synthetic-upload');assert.equal(f.root.dataset.phase,'playing');assert.equal(f.buttons.play.getAttribute('aria-label'),'Tạm dừng');
 f.buttons.forward.dispatchEvent(new Event('click'));assert.equal(f.video.currentTime,10);f.buttons.back.dispatchEvent(new Event('click'));assert.equal(f.video.currentTime,0);
 f.buttons.mute.dispatchEvent(new Event('click'));assert.equal(f.video.muted,true);assert.equal(f.buttons.mute.getAttribute('aria-label'),'Bật tiếng');
 f.buttons.play.dispatchEvent(new Event('click'));assert.equal(f.root.dataset.phase,'paused');f.client.stop();assert.equal(f.root.dataset.phase,'before');assert.equal(f.win.YT,undefined);
});
test('controls render decorative icons with accessible names and state-specific play/mute glyphs',async t=>{
 const f=fixture();t.after(()=>f.client.destroy());
 for(const key of ['play','back','forward','mute','fullscreen','retry']){assert.match(f.buttons[key].innerHTML??'',/<svg/);assert.match(f.buttons[key].innerHTML,/aria-hidden="true"/);assert.ok(f.buttons[key].getAttribute('aria-label'));assert.ok(f.buttons[key].title);assert.equal(f.buttons[key].textContent,'');}
 const play=f.buttons.play.innerHTML,mute=f.buttons.mute.innerHTML;
 await f.client.play();assert.notEqual(f.buttons.play.innerHTML,play);assert.equal(f.buttons.play.getAttribute('aria-label'),'Tạm dừng');
 f.buttons.mute.dispatchEvent(new Event('click'));assert.notEqual(f.buttons.mute.innerHTML,mute);assert.equal(f.buttons.mute.getAttribute('aria-label'),'Bật tiếng');
});
test('closing a loading YouTube player fences late readiness so it cannot start audio',async t=>{
 const f=fixture('YOUTUBE'),calls={play:0,destroy:0},players=[];t.after(()=>f.client.destroy());
 f.win.YT={Player:class{constructor(_mount,options){this.options=options;players.push(this);}playVideo(){calls.play++;}pauseVideo(){}destroy(){calls.destroy++;}}};
 await f.client.play();assert.equal(players.length,1);assert.equal(players[0].options.playerVars.controls,0);assert.equal(f.root.dataset.phase,'loading');
 f.client.stop();players[0].options.events.onReady({target:players[0]});assert.equal(calls.play,0);assert.ok(calls.destroy>=1);assert.equal(f.root.dataset.phase,'before');assert.equal(f.video.playCalls,0);
});
test('YouTube errors keep the chosen source and offer retry without starting an uploaded video',async t=>{
 const f=fixture('YOUTUBE'),players=[];t.after(()=>f.client.destroy());f.win.YT={Player:class{constructor(_mount,options){this.options=options;players.push(this);}pauseVideo(){}destroy(){}}};
 await f.client.play();players[0].options.events.onError({data:150});assert.equal(f.root.dataset.phase,'error');assert.equal(f.buttons.retry.hidden,false);assert.equal(f.video.playCalls,0);assert.equal(f.root.dataset.source,'YOUTUBE');
});
