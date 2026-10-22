import {createHash} from 'node:crypto';
import {fullSiteFixture} from '../full-site-localization-contract.test.mjs';
import {mergeLocalizedGroup} from '../../contracts/group-localization.mjs';
import {assembleFullSiteQa} from '../../cms-api/full-site-localizations.mjs';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
export function youtubeSiteFixture(locale='vi',mode='QA_SAVED'){
 const full=fullSiteFixture(locale,mode),about=full.groups.about,old=about.base.source.showreel;
 about.base.source.showreel={sourceType:'YOUTUBE',videoId:'M7lc1UVf-VE',title:old.title,poster:old.poster};about.base.dependencyHash=hash(about.base.source);about.draft.dependencyHash=about.base.dependencyHash;about.group=mergeLocalizedGroup('about',about.base.source,about.draft.content);
 const removed=about.mediaSlots.find(s=>s.role==='VIDEO');about.mediaSlots=about.mediaSlots.filter(s=>s!==removed);about.resources=about.resources.filter(r=>r.id!==removed.resourceId);
 const snapshotIds={},approvalPins={};for(const entry of full.dependencyVector.resources)if(entry.snapshotId){const key=entry.resource.kind+'/'+entry.resource.entityId;snapshotIds[key]=entry.snapshotId;approvalPins[key]=entry.approval;}
 return assembleFullSiteQa({locale,hero:full.hero,groups:full.groups,workServices:full.workServices,mode,snapshotIds,approvalPins,sourceHash:full.dependencyVector.sourceHash,availabilityHash:full.dependencyVector.availabilityHash,heroDependencyHash:full.dependencyVector.resources.find(r=>r.resource.kind==='hero').dependencyHash});
}
