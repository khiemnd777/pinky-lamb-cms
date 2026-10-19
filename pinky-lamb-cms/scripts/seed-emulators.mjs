import {pathToFileURL} from 'node:url';
import {validateRuntime,installNetworkFence} from './local-guard.mjs';
import {validateContent,assertEnvelopeSize} from '../contracts/hero.mjs';
validateRuntime();installNetworkFence();
const {auth,db}=await import('../cms-api/authorization.mjs');
export const fixtures=Object.freeze([
 {uid:'fixture-editor',role:'EDITOR',email:'editor@pinky.test',active:true,verified:true},
 {uid:'fixture-reviewer',role:'REVIEWER',email:'reviewer@pinky.test',active:true,verified:true},
 {uid:'fixture-publisher',role:'PUBLISHER',email:'publisher@pinky.test',active:true,verified:true},
 {uid:'fixture-owner',role:'OWNER',email:'owner@pinky.test',active:true,verified:true},
 {uid:'fixture-unknown',email:'unknown@pinky.test',verified:true},
 {uid:'fixture-inactive',role:'EDITOR',email:'inactive@pinky.test',active:false,verified:true},
 {uid:'fixture-unverified',role:'EDITOR',email:'unverified@pinky.test',active:true,verified:false}
]);
// Synthetic local-only input; never an operational account credential.
export const fixturePassword='LocalFixture-Only-42!';
export const baselineContent=validateContent({schemaVersion:1,locale:'vi-VN',hero:{kind:'HERO',variant:'hero-split',heading:{lines:[[{text:'Big ideas.'}],[{text:'Lovely '},{text:'impact.',emphasis:'ACCENT'}]]},eyebrow:'INDEPENDENT MINDS. MEMORABLE EXPERIENCES.',description:[{text:'Từ ý tưởng thương hiệu đến phim, truyền thông và sự kiện. Chúng tôi biến sáng tạo thành những trải nghiệm đáng nhớ — với một chút '},{text:'Pinky',emphasis:'STRONG'},{text:'.'}],primaryAction:{kind:'SECTION',sectionId:'work',label:'Khám phá dự án'},secondaryAction:{kind:'SHOWREEL',label:'Xem showreel'},footnote:'BASED IN VIETNAM. CREATING FOR THE WORLD.',note:'The house of all cutest things.',image:{assetId:'pinky-hero',alt:'Mascot cừu hồng Pinky Lamb trong bộ nhận diện Crystal Blossom',isDecorative:false}},seo:{title:'Pinky Lamb — Creative, Media & Events',description:'Pinky Lamb — Independent Creative Production Agency & IP Studio. Brand, phim & nội dung, truyền thông, sự kiện và những trải nghiệm đáng nhớ.',ogTitle:'Pinky Lamb — Big ideas. Lovely impact.',ogDescription:'Creative production, media & events. Cùng Pinky Lamb biến ý tưởng thành những điều đáng nhớ.',ogImage:{assetId:'pinky-hero',alt:'Mascot cừu hồng Pinky Lamb',isDecorative:false}}},[{id:'pinky-hero',kind:'IMAGE',status:'LEGACY_READY'}]);
export async function seedFixtures(){
 validateRuntime();
 for(const fixture of fixtures){
  const properties={email:fixture.email,password:fixturePassword,emailVerified:fixture.verified,disabled:false};
  try{await auth.getUser(fixture.uid);await auth.updateUser(fixture.uid,properties);}catch(error){if(error.code!=='auth/user-not-found')throw error;await auth.createUser({uid:fixture.uid,...properties});}
  if(fixture.role)await db.collection('cmsMembers').doc(fixture.uid).set({uid:fixture.uid,role:fixture.role,isActive:fixture.active,expectedEmail:fixture.email,authzVersion:1,invitedBy:'local-fixture-operator',createdAt:'2026-10-11T00:00:00Z'});
 }
 // Preserve existing editorial history when seeding is repeated.
 const draft=db.collection('cmsDrafts').doc('home');
 await db.runTransaction(async transaction=>{if(!(await transaction.get(draft)).exists)transaction.create(draft,assertEnvelopeSize({contentJson:JSON.stringify(baselineContent),revision:0,updatedBy:'fixture-editor',updatedAt:'2026-10-11T00:00:00Z',lastEventId:'fixture-initial-draft'}));});
 return {fixtureCount:fixtures.length};
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){await seedFixtures();console.log('Local fixtures ready.');await db.terminate();}
