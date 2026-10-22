import {z} from 'zod';
import {strictMediaV3JsonSchema} from './media-v3-metadata.mjs';
import {imageReferenceSchema,videoPosterReferenceSchema} from './media-v3-contract.mjs';
const exact=shape=>strictMediaV3JsonSchema.pipe(z.strictObject(shape));
export const isYoutubeReel=reel=>reel?.sourceType==='YOUTUBE';
/** Absence of sourceType is the original uploaded-file contract. Do not add defaults:
 * immutable legacy snapshots and their hashes must stay unchanged. */
export function showreelSourceSchema({assetId,title,originalSourceUrl}){
 const common={title,poster:z.union([imageReferenceSchema,videoPosterReferenceSchema])};
 return z.union([
  exact({...common,sourceType:z.literal('FIREBASE').optional(),assetId,durationSeconds:z.number().finite().positive(),originalSourceUrl:originalSourceUrl.optional()}),
  exact({sourceType:z.literal('YOUTUBE'),videoId:z.string().regex(/^[A-Za-z0-9_-]{11}$/),title,poster:imageReferenceSchema})
 ]);
}
export function parseYoutubeVideoId(input){
 if(typeof input!=='string'||input.length>2048)throw Error('Nhập link YouTube hợp lệ.');
 const value=input.trim();if(/^[A-Za-z0-9_-]{11}$/.test(value))return value;
 let url;try{url=new URL(value);}catch{throw Error('Nhập link YouTube hợp lệ.');}
 if(url.protocol!=='https:'||url.username||url.password||url.port||!['youtube.com','www.youtube.com','m.youtube.com','youtu.be'].includes(url.hostname))throw Error('Chỉ nhận link HTTPS của YouTube.');
 let id;
 if(url.hostname==='youtu.be'&&/^\/[A-Za-z0-9_-]{11}$/.test(url.pathname))id=url.pathname.slice(1);
 else if(url.hostname!=='youtu.be'&&url.pathname==='/watch'&&url.searchParams.getAll('v').length===1)id=url.searchParams.get('v');
 else if(url.hostname!=='youtu.be'&&/^\/(shorts|embed)\/[A-Za-z0-9_-]{11}$/.test(url.pathname))id=url.pathname.split('/')[2];
 if(!/^[A-Za-z0-9_-]{11}$/.test(id??''))throw Error('Link phải dẫn đến một video YouTube.');
 return id;
}
