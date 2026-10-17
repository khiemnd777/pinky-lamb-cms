import {z} from 'zod';
import {parseLocalizedReleaseBundle} from './localized-review-records.mjs';
import {canonicalJson} from './draft.mjs';

export const RELEASE_BYTE_BUDGET=256*1048576;
export const localizedReleasePackageSchema=z.strictObject({release:z.unknown(),files:z.array(z.strictObject({path:z.string().max(220),base64:z.string().max(90*1048576)})).max(512),qaFixture:z.literal(true).optional()});

/** A public path has exactly one frozen identity across all locales. */
export function releaseResourceDescriptors(input){
 const release=parseLocalizedReleaseBundle(input),resources=new Map();let bytes=0;
 for(const entry of release.entries)for(const descriptor of entry.resources){
  const previous=resources.get(descriptor.path);
  if(previous&&canonicalJson(previous)!==canonicalJson(descriptor))throw Error('Incompatible release resource identity');
  if(!previous){resources.set(descriptor.path,descriptor);bytes+=descriptor.sizeBytes;}
 }
 if(bytes>RELEASE_BYTE_BUDGET)throw Error('Release resource byte budget exceeded');
 return {release,resources};
}
