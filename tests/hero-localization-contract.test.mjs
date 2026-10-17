import nodeTest from 'node:test';
import {fileURLToPath} from 'node:url';
const test=process.argv[1]===fileURLToPath(import.meta.url)?nodeTest:()=>{};
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HERO_LOCALES,heroLocaleSchema,localizedHeroFromBase,parseLocalizedHeroSave,mergeLocalizedHero,assertHeroBytes} from '../contracts/hero-localization.mjs';
import {encodeLocalizedHero,decodeLocalizedHero} from '../contracts/hero-localization-records.mjs';
import {hashHeroValue} from '../cms-api/hero-localization-context.mjs';
export const baseHero=JSON.parse(readFileSync(new URL('./fixtures/media-v3-content.json',import.meta.url))).cases[0].content.hero;
export const base={revision:4,contentHash:'a'.repeat(64),hero:baseHero};
export const translated=()=>localizedHeroFromBase(baseHero);
export const saveBody=(content=translated())=>({expectedRevision:null,baseRevision:4,baseContentHash:base.contentHash,content});
test('locale registry accepts exactly en vi ja',()=>{assert.deepEqual(HERO_LOCALES,['en','vi','ja']);for(const v of ['jp','EN','vi-VN','',null])assert.throws(()=>heroLocaleSchema.parse(v));});
test('localized copy preserves only copy while identity comes from base',()=>{
 const c=translated();c.eyebrow='日本語とTiếng Việt';const hero=mergeLocalizedHero(baseHero,c);assert.equal(hero.eyebrow,c.eyebrow);assert.equal(hero.image.assetId,baseHero.image.assetId);assert.equal(hero.primaryAction.kind,baseHero.primaryAction.kind);
 assert.throws(()=>parseLocalizedHeroSave({...saveBody(),locale:'ja'},base));assert.throws(()=>mergeLocalizedHero(baseHero,{...c,image:{...c.image,assetId:'tamper'}}));assert.throws(()=>mergeLocalizedHero(baseHero,{...c,primaryAction:{label:'Go',sectionId:'work'}}));
});
test('text budgets use submitted UTF16 and escaped UTF8 envelope, no trimming',()=>{const c=translated();c.heading.lines=[[{text:'😀'.repeat(51)}]];assert.throws(()=>mergeLocalizedHero(baseHero,c));assert.throws(()=>assertHeroBytes({text:'\u0001'.repeat(12000)}));const v=translated();v.note='  giữ nguyên  ';assert.equal(mergeLocalizedHero(baseHero,v).note,'  giữ nguyên  ');});
test('stored JSON avoids nested Firestore arrays and detects corruption',()=>{const content=translated(),record={contractRevision:1,draftId:'home-v3',locale:'ja',revision:1,baseRevision:4,baseContentHash:base.contentHash,contentHash:hashHeroValue(content),content,updatedAt:'2026-10-16T00:00:00.000Z'},stored=encodeLocalizedHero(record,'demo-editor');assert.equal(stored.content,undefined);assert.equal(typeof stored.contentJson,'string');assert.deepEqual(decodeLocalizedHero(stored,{locale:'ja',base,hashCanonical:hashHeroValue}),record);assert.throws(()=>decodeLocalizedHero({...stored,contentHash:'b'.repeat(64)},{locale:'ja',base,hashCanonical:hashHeroValue}));});
test('inline resources permit only bounded immutable baseline CSS',async()=>{
 const {heroQaResourceSchema,parseHeroQa}=await import('../contracts/hero-localization-records.mjs');const r={id:'styles',path:'styles.css',url:'http://127.0.0.1:5010/styles.css',mimeType:'text/css',sizeBytes:3,sha256:'a'.repeat(64),inlineBase64:'Y3Nz'};assert.equal(heroQaResourceSchema.parse(r).inlineBase64,'Y3Nz');
 for(const patch of [{id:'private'},{path:'assets/original.css'},{mimeType:'image/png'},{url:'http://127.0.0.1:5173/styles.css'},{sizeBytes:65537},{inlineBase64:'Y'.repeat(90000)},{inlineBase64:'x\n'}])assert.throws(()=>heroQaResourceSchema.parse({...r,...patch}));
 assert.throws(()=>parseHeroQa({extra:'x'.repeat(300000)}));assert.throws(()=>assertHeroBytes({text:'日'.repeat(90000)},262144),{code:'PAYLOAD_TOO_LARGE'});
});
