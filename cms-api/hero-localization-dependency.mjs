import {createHash} from 'node:crypto';
import {canonicalJson} from '../contracts/draft.mjs';
import {ApiError} from '../contracts/errors.mjs';

export const hashHeroValue=value=>createHash('sha256').update(canonicalJson(value)).digest('hex');
export function heroDependencyHash(current,record,{base,resources,presentation}){
 const bindings=current.content.claimSources.filter(b=>['hero/facts','creative-copy'].includes(b.claimPath)),ids=new Set(bindings.flatMap(b=>b.sourceIds)),sources=record.sourceCatalog.filter(s=>ids.has(s.id));
 if(sources.length!==ids.size)throw new ApiError('INTERNAL_ERROR');
 return hashHeroValue({kind:'LOCALIZED_HERO_DEPENDENCY',hero:base.hero,resources,presentation,bindings,sources});
}

/** Legacy drafts retain conservative full-Home freshness until explicitly rebased. */
export async function readHeroFreshness(transaction,db,locale,draft,base){
 if(!draft)return {stale:false,previousDependencyHash:null};
 let dependencyHash=draft.dependencyHash;
 const association=await transaction.get(db.collection('cmsLocalizedHeroBases').doc(`home-v3--${locale}--${draft.revision}`));
 if(association.exists){
  const a=association.data();
  if(a.contentHash!==draft.contentHash||a.baseRevision!==draft.baseRevision||a.baseContentHash!==draft.baseContentHash||!/^[a-f0-9]{64}$/.test(a.dependencyHash??'')||dependencyHash&&dependencyHash!==a.dependencyHash)throw new ApiError('INTERNAL_ERROR');
  dependencyHash=a.dependencyHash;
 }
 if(dependencyHash&&base.dependencyHash)return {stale:dependencyHash!==base.dependencyHash,previousDependencyHash:dependencyHash};
 const stale=draft.baseRevision!==base.revision||draft.baseContentHash!==base.contentHash;
 return {stale,previousDependencyHash:stale?draft.baseContentHash:base.dependencyHash??draft.baseContentHash};
}
