import {z} from 'zod';
import {strictSiteObject} from '../contracts/site-settings.mjs';
import {validateSiteContent,collectSiteAssetIds} from '../contracts/site.mjs';

const assetSchema=strictSiteObject({id:z.string().regex(/^[A-Za-z0-9_-]{1,100}$/),kind:z.enum(['IMAGE','VIDEO','PDF']),path:z.string().regex(/^assets\/[A-Za-z0-9][A-Za-z0-9._-]*$/),width:z.number().int().positive().optional(),height:z.number().int().positive().optional(),durationSeconds:z.number().finite().positive().optional()});
export function siteRenderContext(options){
 const plain=strictSiteObject({publicAssets:z.unknown(),sourceIds:z.unknown(),currentYear:z.unknown(),allowedShowreelSourceUrl:z.unknown().optional(),localBaseUrl:z.unknown().optional(),mode:z.unknown().optional()}).parse(options);
 const publicAssets=z.record(z.string(),assetSchema).parse(plain.publicAssets);
 for(const [id,asset] of Object.entries(publicAssets))if(id!==asset.id)throw new Error('Invalid public asset identity');
 if(!Array.isArray(plain.sourceIds) || !Number.isInteger(plain.currentYear))throw new Error('Missing trusted render context');
 const catalog=Object.values(publicAssets).map(({id,kind,durationSeconds})=>({id,kind,status:'LEGACY_READY',...(durationSeconds!==undefined?{durationSeconds}:{})}));
 return {catalog,sourceIds:plain.sourceIds,currentYear:plain.currentYear,allowedShowreelSourceUrl:plain.allowedShowreelSourceUrl,fixedAssetIds:['brand-diagonal','favicon']};
}
/** Validate every selected and hidden reference before creating public-only data. */
export function projectSitePublicData(content,options){
 const context=siteRenderContext(options),value=validateSiteContent(content,context);
 collectSiteAssetIds(value,context);
 const sections=value.sections.filter(section=>section.isVisible!==false);
 const visible=new Set(sections.map(section=>section.sectionId));
 const services=visible.has('services')?value.services.filter(service=>service.isVisible):[];
 const serviceIds=new Set(services.map(service=>service.id));
 const contact=value.sections.find(section=>section.kind==='CONTACT');
 const eligibleInterestIds=new Set(contact.serviceOptionIds.filter(id=>serviceIds.has(id)));
 const projects=visible.has('work')?value.projects.filter(project=>project.isVisible):[];
 const settings={header:value.settings.header,brand:value.settings.brand,credential:value.settings.credential,...(visible.has('about')?{showreel:value.settings.showreel}:{}),contact:value.settings.contact,nav:value.settings.nav.filter(item=>item.sectionId!=='services' || services.length>0),copyright:value.settings.copyright,clientLogos:visible.has('clients')?value.settings.clientLogos.filter(logo=>logo.isVisible):[]};
 const publicSections=sections.map(section=>{
  if(section.kind==='CONTACT')return {...section,serviceOptionIds:section.serviceOptionIds.filter(id=>serviceIds.has(id))};
  if(section.kind==='SERVICES')return {...section,serviceOrder:section.serviceOrder.filter(id=>serviceIds.has(id))};
  if(section.kind==='WORK')return {...section,featuredIds:section.featuredIds.filter(id=>projects.some(project=>project.id===id))};
  return section;
 });
 return structuredClone({hero:value.hero,seo:value.seo,settings,services,projects:projects.map(project=>({...project,serviceIds:project.serviceIds.filter(id=>eligibleInterestIds.has(id))})),sections:publicSections,sectionOrder:value.sectionOrder.filter(id=>visible.has(id))});
}
