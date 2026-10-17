import {heroDependencyHash,readHeroFreshness} from './hero-localization-dependency.mjs';
import {ApiError} from '../contracts/errors.mjs';
import {localizedResourceIdentitySchema} from '../contracts/full-site-localization.mjs';
import {projectClaimGroupsV3} from '../contracts/media-v3-content.mjs';
import {groupClaimPaths,createGroupLocalizationContext} from './group-localization-context.mjs';
import {createHeroLocalizationContext} from './hero-localization-context.mjs';
import {createProjectLocalizationContext,hashProjectValue} from './project-localization-context.mjs';
import {createServiceLocalizationContext} from './service-localization-context.mjs';
import {createWorkServicesLocalizationContext} from './work-services-localization-context.mjs';
import {decodeLocalizedHero,encodeLocalizedHero,parseHeroQa} from '../contracts/hero-localization-records.mjs';
import {decodeLocalizedProject,encodeLocalizedProject,parseProjectQa} from '../contracts/project-localization-records.mjs';
import {decodeLocalizedService,encodeLocalizedService,parseServiceQa} from '../contracts/service-localization-records.mjs';
import {decodeLocalizedSection,encodeLocalizedSection,parseSectionQa} from '../contracts/work-services-localization-records.mjs';
import {decodeLocalizedGroup,encodeLocalizedGroup,parseGroupQa} from '../contracts/group-localization-records.mjs';
import {mergeLocalizedHero} from '../contracts/hero-localization.mjs';
import {mergeLocalizedProject} from '../contracts/project-localization.mjs';
import {mergeLocalizedService} from '../contracts/service-localization.mjs';
import {mergeLocalizedSection} from '../contracts/work-services-localization.mjs';
import {groupSourceFromHome,mergeLocalizedGroup} from '../contracts/group-localization.mjs';
const config={hero:{collection:'cmsLocalizedHeroDrafts',decode:decodeLocalizedHero,encode:encodeLocalizedHero},project:{collection:'cmsLocalizedProjectDrafts',decode:decodeLocalizedProject,encode:encodeLocalizedProject},service:{collection:'cmsLocalizedServiceDrafts',decode:decodeLocalizedService,encode:encodeLocalizedService},section:{collection:'cmsLocalizedSectionDrafts',decode:decodeLocalizedSection,encode:encodeLocalizedSection},group:{collection:'cmsLocalizedGroupDrafts',decode:decodeLocalizedGroup,encode:encodeLocalizedGroup}};
export const resourceKey=r=>`${r.kind}--${r.entityId}--${r.locale}`;
export function resourceClaimPaths(resource,base){if(resource.kind==='group')return groupClaimPaths(resource.entityId,base.source);if(resource.kind==='hero')return ['hero/facts','creative-copy'];if(resource.kind==='project')return [`projects/${resource.entityId}/facts`,'creative-copy'];if(resource.kind==='service')return [`services/${resource.entityId}/facts`,'creative-copy'];return ['creative-copy'];}
function claimProjection(resource,current,record,base){
 const sourceFor=content=>resource.kind==='hero'?content.hero:resource.kind==='project'?content.projects.find(p=>p.id===resource.entityId):resource.kind==='service'?content.services.find(s=>s.id===resource.entityId):resource.kind==='section'?content.sections.find(s=>s.sectionId===resource.entityId):groupSourceFromHome(content,resource.entityId);
 const paths=resourceClaimPaths(resource,base),groups=projectClaimGroupsV3(current.content),baseline=projectClaimGroupsV3(record.baselineContent),sources=new Set(),claims=[];
 for(const path of paths){const g=path==='creative-copy'?{claimPath:path,value:sourceFor(current.content)}:groups.find(g=>g.claimPath===path);if(!g)throw new ApiError('INTERNAL_ERROR');const old=path==='creative-copy'?(sourceFor(record.baselineContent)?{claimPath:path,value:sourceFor(record.baselineContent)}:null):baseline.find(g=>g.claimPath===path),binding=current.content.claimSources.find(b=>b.claimPath===path),claimHash=hashProjectValue(g.value),baselineHash=old?hashProjectValue(old.value):null,classification=path==='creative-copy'?'CREATIVE':'FACTUAL',change=old?(claimHash===baselineHash?'UNCHANGED':'CHANGED'):'NEW',sourceIds=binding?.sourceIds??[];sourceIds.forEach(id=>sources.add(id));claims.push({claimPath:path,claimHash,baselineHash,classification,change,required:classification==='FACTUAL'&&change!=='UNCHANGED',sourceIds});}
 const sourceCatalog=record.sourceCatalog.filter(s=>sources.has(s.id));if(sourceCatalog.length!==sources.size)throw new ApiError('INTERNAL_ERROR');return {claims,sourceCatalog};
}
export async function createLocalizedResourceContext(options={}){
 const trusted=options.trustedContext??await (await import('./site-v3-context.mjs')).createSiteV3ContextService(options),contexts={hero:options.heroContext??await createHeroLocalizationContext(options),project:await createProjectLocalizationContext({trustedContext:trusted}),service:await createServiceLocalizationContext({trustedContext:trusted}),section:await createWorkServicesLocalizationContext({trustedContext:trusted}),group:await createGroupLocalizationContext({trustedContext:trusted})},{db,authorize}=trusted;
 async function home(tx){return trusted.readTrustedDraftContext({transaction:tx,target:await tx.get(db.collection('cmsDrafts').doc('home-v3'))});}
 async function readResource(tx,input,{qa=true}={}){
  const resource=localizedResourceIdentitySchema.parse(input),{kind,entityId,locale}=resource,{current,record}=await home(tx),value=await contexts[kind].readBase(tx,entityId),{base}=value,c=config[kind],ref=db.collection(c.collection).doc(kind==='hero'?`home-v3--${locale}`:`home-v3--${entityId}--${locale}`),doc=await tx.get(ref),draft=doc.exists?c.decode(doc.data(),{locale,base,hashCanonical:hashProjectValue,...(kind==='hero'?{}:{[kind+'Id']:entityId})}):null;
  const proof=claimProjection(resource,current,record,base),dependencyHash=kind==='hero'?base.dependencyHash??heroDependencyHash(current,record,value):base.dependencyHash;
  let previousDependencyHash=draft?.dependencyHash??null,stale=Boolean(draft&&draft.dependencyHash!==dependencyHash);
  if(kind==='hero'&&draft){const freshness=await readHeroFreshness(tx,db,locale,draft,{...base,dependencyHash});previousDependencyHash=freshness.previousDependencyHash;stale=freshness.stale;}
  const sourceProvenance={homeRevision:current.revision,homeContentHash:hashProjectValue(current.content),importLineageHash:hashProjectValue(current.importLineage),templateIdentity:base.templateIdentity??'m3-site-media-v1',rendererContract:'multilingual-full-site-v1',dictionaryContract:'multilingual-locale-copy-v1'};
  const buildQa=d=>{
   if(kind==='hero')return parseHeroQa({contractRevision:2,kind:'LOCALIZED_HERO_QA',draft:d,hero:mergeLocalizedHero(base.hero,d.content),resources:value.resources,presentation:value.presentation});
   if(kind==='project')return parseProjectQa({contractRevision:1,kind:'LOCALIZED_PROJECT_QA',projectIndex:base.projectIndex,templateIdentity:base.templateIdentity,draft:d,project:mergeLocalizedProject(base.project,d.content),resources:value.resources,credential:value.credential});
   if(kind==='service')return parseServiceQa({contractRevision:1,kind:'LOCALIZED_SERVICE_QA',serviceIndex:base.serviceIndex,templateIdentity:base.templateIdentity,draft:d,service:mergeLocalizedService(base.service,d.content),resources:value.resources});
   if(kind==='section')return parseSectionQa({contractRevision:1,kind:'LOCALIZED_SECTION_QA',sectionIndex:base.sectionIndex,templateIdentity:base.templateIdentity,draft:d,section:mergeLocalizedSection(base.section,d.content),resources:value.resources});
   return parseGroupQa({contractRevision:1,kind:'LOCALIZED_GROUP_QA',templateIdentity:base.templateIdentity,base,draft:d,group:mergeLocalizedGroup(entityId,base.source,d.content),resources:value.resources,mediaSlots:value.mediaSlots});
  };
  return {resource,base,draft,ref,encode:c.encode,dependencyHash,previousDependencyHash,stale,qa:qa&&draft&&!stale?buildQa(draft):null,buildQa,...proof,sourceProvenance,isVisible:base.project?.isVisible??base.service?.isVisible??base.section?.isVisible??base.source?.section?.isVisible??true};
 }
 return {...trusted,db,authorize,home,readResource};
}
