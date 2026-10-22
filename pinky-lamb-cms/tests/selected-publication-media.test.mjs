import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readSelectedShowreelResource} from '../cms-api/selected-publication-media.mjs';
const bytes=Buffer.from('synthetic video derivative'),sha=createHash('sha256').update(bytes).digest('hex');
function fixture(){
 const derivative={key:'video-main',role:'VIDEO',mimeType:'video/mp4',sizeBytes:bytes.length,sha256:sha,generation:'1',width:1280,height:720,durationSeconds:10};
 const descriptor={id:'test-video',assetId:'test-video',path:'assets/test-video-video-main.mp4',url:'http://127.0.0.1:5173/api/cms/media/test-video/derivatives/video-main',mimeType:'video/mp4',sizeBytes:bytes.length,sha256:sha,width:1280,height:720,durationSeconds:10,derivative:{key:derivative.key,role:'VIDEO',mime:'video/mp4',bytes:bytes.length,sha256:sha,generation:'1',width:1280,height:720,durationSeconds:10}};
 const version={status:'READY',readyVersion:{derivatives:[derivative]},storage:{derivatives:[{...derivative,objectKey:'private/synthetic'}]}};
 const args={descriptor,release:{entries:[{locale:'vi',groups:{about:{mediaSlots:[{slotId:'about/showreel',resourceId:'test-video',assetId:'test-video'}],resources:[descriptor]}}}]},selection:{resource:{kind:'group',entityId:'about',locale:'vi'}},library:{readVersion:async()=>version},storage:{readDerivative:async()=>bytes}};
 return {args,version};
}
test('selected Showreel packages only the exact immutable derivative bytes',async()=>{const {args}=fixture();assert.ok((await readSelectedShowreelResource(args)).equals(bytes));});
test('new unrelated media, mismatched generations and corrupt bytes fail closed',async()=>{
 for(const mutate of [f=>{f.args.selection.resource.entityId='contact';},f=>{f.args.descriptor={...f.args.descriptor,id:'foreign'};},f=>{f.version.storage.derivatives[0].generation='2';},f=>{f.args.storage.readDerivative=async()=>Buffer.from('tampered');}]){const f=fixture();mutate(f);await assert.rejects(readSelectedShowreelResource(f.args));}
});
