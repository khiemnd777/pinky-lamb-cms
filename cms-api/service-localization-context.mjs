import {ApiError} from '../contracts/errors.mjs';
import {SERVICE_TEMPLATE_ID,serviceIdSchema,sourceServiceSchema,serviceBaseSchema} from '../contracts/service-localization.mjs';
import {hashProjectValue,PROJECT_TEMPLATE_PINS,projectTemplateResources} from './project-localization-context.mjs';
export const hashServiceValue=hashProjectValue;
export function projectServiceQaContext(current,record,serviceId,{templateResources=projectTemplateResources()}={}){
 serviceIdSchema.parse(serviceId);const service=sourceServiceSchema.parse(current.content.services.find(s=>s.id===serviceId)??(()=>{throw new ApiError('NOT_FOUND');})());
 const section=current.content.sections.find(s=>s.sectionId==='services'),serviceIndex=section?.serviceOrder.indexOf(serviceId);if(!Number.isInteger(serviceIndex)||serviceIndex<0||serviceIndex>11)throw new ApiError('INTERNAL_ERROR');
 const bindings=current.content.claimSources.filter(b=>b.claimPath===`services/${serviceId}/facts`),ids=new Set(bindings.flatMap(b=>b.sourceIds)),sources=record.sourceCatalog.filter(s=>ids.has(s.id));if(!bindings.length||sources.length!==ids.size||!ids.size)throw new ApiError('INTERNAL_ERROR');
 const dependencyHash=hashServiceValue({kind:'SERVICE_DEPENDENCY',serviceIndex,service,sectionVisible:section.isVisible,bindings,sources,template:{id:SERVICE_TEMPLATE_ID,pins:PROJECT_TEMPLATE_PINS}});
 return {base:serviceBaseSchema.parse({dependencyHash,serviceIndex,service,templateIdentity:SERVICE_TEMPLATE_ID}),resources:templateResources};
}
export async function createServiceLocalizationContext(options={}){
 const trusted=options.trustedContext??await (await import('./site-v3-context.mjs')).createSiteV3ContextService(options);
 const load=async tx=>trusted.readTrustedDraftContext({transaction:tx,target:await tx.get(trusted.db.collection('cmsDrafts').doc('home-v3'))});
 const readBase=async(tx,id)=>{const {current,record}=await load(tx);return projectServiceQaContext(current,record,id);};
 const readServices=async tx=>{const {current}=await load(tx);return current.content.services.map(s=>sourceServiceSchema.parse(s));};
 return {...trusted,load,readBase,readServices};
}
