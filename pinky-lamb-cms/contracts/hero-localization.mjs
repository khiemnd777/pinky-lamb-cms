import {z} from 'zod';
import {ApiError,validationError} from './errors.mjs';
import {plainText,strictSiteObject} from './site-settings.mjs';
import {revisionSchema,hashSchema,assertEnvelopeSize,MAX_BODY_BYTES} from './hero.mjs';
import {createHeroSchemas} from './hero.mjs';

export const HERO_LOCALES=Object.freeze(['en','vi','ja']);
export const heroLocaleSchema=z.enum(HERO_LOCALES);
const run=strictSiteObject({text:plainText(1000,{visible:false,multiline:true}),emphasis:z.enum(['NONE','STRONG','ACCENT']).optional()});
const runs=(count,cap)=>z.array(run).min(1).max(count).refine(values=>{const text=values.map(value=>value.text).join('');return text.length<=cap&&text.trim().length>0;});
export const localizedHeroContentSchema=strictSiteObject({
 heading:strictSiteObject({lines:z.array(runs(8,100)).min(1).max(3)}),eyebrow:plainText(120),description:runs(12,1000),
 primaryAction:strictSiteObject({label:plainText(80)}),secondaryAction:strictSiteObject({label:plainText(80)}).optional(),
 footnote:plainText(240,{empty:true,multiline:true}),note:plainText(300,{empty:true,multiline:true}),image:strictSiteObject({alt:plainText(300,{empty:true,visible:false})})
});
export const localizedHeroSaveSchema=strictSiteObject({expectedRevision:revisionSchema.nullable(),expectedSourceHash:hashSchema.optional(),baseRevision:revisionSchema,baseContentHash:hashSchema,expectedDependencyHash:hashSchema.optional(),content:localizedHeroContentSchema});
export const heroBaseSchema=strictSiteObject({revision:revisionSchema,contentHash:hashSchema,dependencyHash:hashSchema.optional(),hero:z.unknown()});
export function assertHeroBytes(value,limit=MAX_BODY_BYTES){
 assertEnvelopeSize(value);if(new TextEncoder().encode(JSON.stringify(value)).length>limit)throw new ApiError('PAYLOAD_TOO_LARGE');return value;
}
export function localizedHeroFromBase(hero){
 return localizedHeroContentSchema.parse({heading:hero.heading,eyebrow:hero.eyebrow,description:hero.description,primaryAction:{label:hero.primaryAction.label},...(hero.secondaryAction?{secondaryAction:{label:hero.secondaryAction.label}}:{}),footnote:hero.footnote,note:hero.note,image:{alt:hero.image.alt}});
}
/** Shared identity never comes from translated input. Existing Hero limits apply. */
export function mergeLocalizedHero(base,input){
 const content=localizedHeroContentSchema.parse(input);
 if(Boolean(base.secondaryAction)!==Boolean(content.secondaryAction))throw new ApiError('VALIDATION_ERROR');
 const hero={...base,...content,heading:base.heading,primaryAction:{...base.primaryAction,...content.primaryAction},...(base.secondaryAction?{secondaryAction:{...base.secondaryAction,...content.secondaryAction}}:{}),image:{...base.image,...content.image}};
 const catalog=[{id:base.image.assetId,kind:'IMAGE',status:'LEGACY_READY'},...([base.primaryAction,base.secondaryAction].filter(a=>a?.kind==='CREDENTIAL').map(a=>({id:a.assetId,kind:'PDF',status:'LEGACY_READY'})))];
 return createHeroSchemas(catalog).heroSchema.parse(hero);
}
export function parseLocalizedHeroSave(input,base){
 try{const parsed=localizedHeroSaveSchema.parse(input);assertHeroBytes(parsed);mergeLocalizedHero(base.hero,parsed.content);return parsed;}catch(error){throw validationError(error);}
}
