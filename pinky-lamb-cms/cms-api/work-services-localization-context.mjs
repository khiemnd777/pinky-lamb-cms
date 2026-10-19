import {ApiError} from '../contracts/errors.mjs';
import {SECTION_TEMPLATE_ID,sectionIdSchema,sectionBaseSchema,sourceWorkServicesSectionSchema} from '../contracts/work-services-localization.mjs';
import {hashProjectValue,PROJECT_TEMPLATE_PINS,projectTemplateResources} from './project-localization-context.mjs';
export const hashSectionValue=hashProjectValue;
export function projectSectionQaContext(current,record,sectionId,{templateResources=projectTemplateResources()}={}){
 sectionIdSchema.parse(sectionId);const section=sourceWorkServicesSectionSchema.parse(current.content.sections.find(s=>s.sectionId===sectionId)??(()=>{throw new ApiError('NOT_FOUND');})()),sectionIndex=current.content.sections.findIndex(s=>s.sectionId===sectionId);
 const bindings=current.content.claimSources.filter(b=>b.claimPath==='creative-copy'),ids=new Set(bindings.flatMap(b=>b.sourceIds)),sources=record.sourceCatalog.filter(s=>ids.has(s.id));if(!bindings.length||sources.length!==ids.size||!ids.size)throw new ApiError('INTERNAL_ERROR');
 const related=sectionId==='work'?current.content.projects.map(p=>({id:p.id,isVisible:p.isVisible,category:p.category,serviceIds:p.serviceIds,images:[p.cover.assetId,...p.gallery.map(i=>i.assetId)]})):current.content.services.map(s=>({id:s.id,isVisible:s.isVisible}));
 const dependencyHash=hashSectionValue({kind:'SECTION_DEPENDENCY',sectionIndex,section,related,bindings,sources,template:{id:SECTION_TEMPLATE_ID,pins:PROJECT_TEMPLATE_PINS}});
 return {base:sectionBaseSchema.parse({dependencyHash,sectionIndex,section,templateIdentity:SECTION_TEMPLATE_ID}),resources:templateResources};
}
export async function createWorkServicesLocalizationContext(options={}){
 const trusted=options.trustedContext??await (await import('./site-v3-context.mjs')).createSiteV3ContextService(options);
 const load=async tx=>trusted.readTrustedDraftContext({transaction:tx,target:await tx.get(trusted.db.collection('cmsDrafts').doc('home-v3'))});
 const readBase=async(tx,id)=>{const {current,record}=await load(tx);return projectSectionQaContext(current,record,id);};
 return {...trusted,load,readBase};
}
