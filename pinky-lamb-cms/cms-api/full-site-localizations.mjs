import {ApiError} from '../contracts/errors.mjs';
import {GROUP_IDS,groupLocaleSchema,mergeLocalizedGroup,GROUP_TEMPLATE_ID} from '../contracts/group-localization.mjs';
import {decodeLocalizedGroup,parseGroupQa} from '../contracts/group-localization-records.mjs';
import {parseFullSiteQa} from '../contracts/full-site-localization.mjs';
import {hashProjectValue} from './project-localization-context.mjs';
import {createGroupLocalizationContext} from './group-localization-context.mjs';
import {createLocalizedResourceContext} from './localized-resource-context.mjs';
import {createSiteLocaleProjectionService} from './site-locale-projections.mjs';
export function assembleFullSiteQa({locale,hero,groups,workServices,mode='QA_SAVED',snapshotIds={},approvalPins={},sourceHash,availabilityHash,heroDependencyHash}){
 const parts=[{kind:'hero',entityId:'home-v3',qa:hero},...Object.entries(groups).map(([entityId,qa])=>({kind:'group',entityId,qa})),...Object.entries(workServices.sections).map(([entityId,qa])=>({kind:'section',entityId,qa})),...workServices.projects.map(qa=>({kind:'project',entityId:qa.project.id,qa})),...workServices.services.map(qa=>({kind:'service',entityId:qa.service.id,qa}))],resources=new Map();
 for(const qa of [...parts.map(p=>p.qa),workServices])for(const r of qa.resources){if(resources.has(r.id)&&hashProjectValue(resources.get(r.id))!==hashProjectValue(r))throw new ApiError('INTERNAL_ERROR');resources.set(r.id,r);}
 const dependencyVector={sourceHash,availabilityHash,resources:parts.map(({kind,entityId,qa})=>({resource:{kind,entityId,locale},revision:qa.draft.revision,contentHash:qa.draft.contentHash,dependencyHash:qa.draft.dependencyHash??heroDependencyHash,snapshotId:snapshotIds[`${kind}/${entityId}`]??null,approval:approvalPins[`${kind}/${entityId}`]??null}))},policy=workServices.policy;
 return parseFullSiteQa({contractRevision:1,kind:'LOCALIZED_FULL_SITE_QA',mode,locale,ipServiceId:groups['ip-studio'].base.source.ipServiceId,sectionOrder:groups.header.base.source.sectionOrder,templateIdentity:GROUP_TEMPLATE_ID,hero,groups,workServices,policy,dependencyVector,dependencyHash:hashProjectValue({mode,locale,dependencyVector,policy}),resources:[...resources.values()]});
}
export async function createFullSiteLocalizationService(options={}){
 const group=options.groupContext??await createGroupLocalizationContext(options),resourceContext=options.resourceContext??await createLocalizedResourceContext(options),work=options.workServices??await createSiteLocaleProjectionService(options),{db,authorize}=group;
 async function readQaInTransaction({request,locale,tx}){
  locale=groupLocaleSchema.parse(locale);await authorize(request,'MEMBER_READ',tx);const groups={},groupPins=[];
  for(const groupId of GROUP_IDS){const value=await group.readBase(tx,groupId),doc=await tx.get(db.collection('cmsLocalizedGroupDrafts').doc(`home-v3--${groupId}--${locale}`));if(!doc.exists)throw new ApiError('NOT_FOUND');const draft=decodeLocalizedGroup(doc.data(),{groupId,locale,base:value.base,hashCanonical:hashProjectValue});if(draft.dependencyHash!==value.base.dependencyHash)throw new ApiError('REVISION_CONFLICT');groups[groupId]=parseGroupQa({contractRevision:1,kind:'LOCALIZED_GROUP_QA',templateIdentity:GROUP_TEMPLATE_ID,...value,draft,group:mergeLocalizedGroup(groupId,value.base.source,draft.content)});groupPins.push({groupId,dependencyHash:value.base.dependencyHash,revision:draft.revision,contentHash:draft.contentHash});}
  const h=await resourceContext.readResource(tx,{kind:'hero',entityId:'home-v3',locale});if(!h.draft)throw new ApiError('NOT_FOUND');if(h.stale)throw new ApiError('REVISION_CONFLICT');const heroQa=h.qa,heroDependencyHash=h.dependencyHash,draft=h.draft,workServices=await work.readQaInTransaction({request,locale,tx});await authorize(request,'MEMBER_READ',tx);
  return assembleFullSiteQa({locale,hero:heroQa,groups,workServices,heroDependencyHash,sourceHash:hashProjectValue({heroDependencyHash,groups:groupPins.map(({groupId,dependencyHash})=>({groupId,dependencyHash})),work:workServices.dependencyVector.homeSharedHash}),availabilityHash:hashProjectValue({groups:groupPins,hero:{revision:draft.revision,contentHash:draft.contentHash},work:workServices.dependencyVector.availabilityHash})});
 }
 return {readQaInTransaction,readQa:args=>db.runTransaction(tx=>readQaInTransaction({...args,tx}))};
}
