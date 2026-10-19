import {z} from 'zod';
import {plainText,stableIdSchema,slugSchema,yearSchema,strictSiteObject,createSiteSettingsSchemas} from './site-settings.mjs';

export const CAPS=Object.freeze({services:12,projects:24,clientLogos:12,gallery:12,scope:12});
export const CATEGORY_IDS=Object.freeze(['EVENTS','FILM','COMMUNICATIONS']);
const unique=(values,key=value=>value)=>new Set(values.map(key)).size===values.length;

/** Hidden records obey the same contracts and references as visible records. */
export function createSiteRecordSchemas(context){
  const {assetUseSchema,clientLogoSchema,clientLogosSchema}=createSiteSettingsSchemas(context);
  const scope=z.array(plainText(160)).max(CAPS.scope);
  const serviceSchema=strictSiteObject({id:stableIdSchema,title:plainText(120),titleVi:plainText(120),summary:plainText(1000,{multiline:true}),scope,isVisible:z.boolean()});
  const projectSchema=strictSiteObject({id:stableIdSchema,slug:slugSchema,title:plainText(120),client:plainText(120),year:yearSchema(context.currentYear),category:z.enum(CATEGORY_IDS),eyebrow:plainText(120),summary:plainText(1000,{multiline:true}),scope,
    cover:assetUseSchema,gallery:z.array(assetUseSchema).max(CAPS.gallery),serviceIds:z.array(stableIdSchema).max(CAPS.services).refine(values=>unique(values)),publicCredentialPage:z.number().int().min(1).max(48).optional(),isVisible:z.boolean()
  }).refine(value=>unique([value.cover,...value.gallery],asset=>asset.assetId));
  const servicesSchema=z.array(serviceSchema).max(CAPS.services).refine(values=>unique(values,value=>value.id));
  const projectsSchema=z.array(projectSchema).max(CAPS.projects).refine(values=>unique(values,value=>value.id) && unique(values,value=>value.slug));
  return {serviceSchema,projectSchema,clientLogoSchema,servicesSchema,projectsSchema,clientLogosSchema};
}
