import {z} from 'zod';
import {strictSiteObject} from './site-settings.mjs';
import {heroLocaleSchema,localizedHeroContentSchema,mergeLocalizedHero,assertHeroBytes} from './hero-localization.mjs';
import {revisionSchema,hashSchema,resourceIdSchema} from './hero.mjs';
import {canonicalJson} from './draft.mjs';
import {mediaDerivativePublicSchema} from './media-read-public.mjs';
import {HERO_PRESENTATION_ID,HERO_PRESENTATION_RESOURCE_ID,HERO_PRESENTATION_SHA256} from '../preview/hero-localization-presentation.mjs';
import {ApiError} from './errors.mjs';
const descriptor={contractRevision:z.literal(1),draftId:z.literal('home-v3'),locale:heroLocaleSchema};
export const localizedHeroReceiptSchema=strictSiteObject({...descriptor,revision:revisionSchema.refine(n=>n>=1),baseRevision:revisionSchema,baseContentHash:hashSchema,dependencyHash:hashSchema.optional(),contentHash:hashSchema,updatedAt:z.string().datetime().length(24)});
export const localizedHeroDraftSchema=strictSiteObject({...descriptor,revision:revisionSchema.refine(n=>n>=1),baseRevision:revisionSchema,baseContentHash:hashSchema,dependencyHash:hashSchema.optional(),contentHash:hashSchema,content:localizedHeroContentSchema,updatedAt:z.string().datetime().length(24)});
export const localizedHeroReadSchema=strictSiteObject({...descriptor,base:strictSiteObject({revision:revisionSchema,contentHash:hashSchema,dependencyHash:hashSchema.optional(),hero:z.unknown()}),draft:localizedHeroDraftSchema.nullable(),sourceStale:z.boolean().optional()});
export function encodeLocalizedHero(record,updatedBy){resourceIdSchema.parse(updatedBy);const {content,...rest}=localizedHeroDraftSchema.parse(record);return assertHeroBytes({...rest,updatedBy,contentJson:JSON.stringify(content)},262144);}
export function decodeLocalizedHero(stored,{locale,hashCanonical,base}={}){
 try{
  assertHeroBytes(stored,262144);const {contentJson,updatedBy,...rest}=stored;resourceIdSchema.parse(updatedBy);
  if(typeof contentJson!=='string'||Object.hasOwn(rest,'content'))throw Error();
  const value=localizedHeroDraftSchema.parse({...rest,content:JSON.parse(contentJson)});
  if(value.locale!==locale||hashCanonical(value.content)!==value.contentHash)throw Error();
  if(base&&value.baseContentHash===base.contentHash&&value.baseRevision===base.revision)mergeLocalizedHero(base.hero,value.content);
  return value;
 }catch{throw new ApiError('INTERNAL_ERROR');}
}
export function localizedHeroReceipt(draft){return localizedHeroReceiptSchema.parse({...Object.fromEntries(['contractRevision','draftId','locale','revision','baseRevision','baseContentHash','contentHash','updatedAt'].map(key=>[key,draft[key]])),...(draft.dependencyHash?{dependencyHash:draft.dependencyHash}:{})});}
export const sameHeroValue=(a,b)=>canonicalJson(a)===canonicalJson(b);
// Safe byte resources have no original path, source evidence, actor or credentials.
const legacyHeroQaResourceSchema=strictSiteObject({id:resourceIdSchema,path:z.string().regex(/^(?:styles\.css|assets\/[A-Za-z0-9][A-Za-z0-9._-]{0,180})$(?![\s\S])/),url:z.string().regex(/^http:\/\/127\.0\.0\.1:(?:5010|5173)\/(?:styles\.css|assets\/[A-Za-z0-9][A-Za-z0-9._-]{0,180}|api\/cms\/media\/[A-Za-z0-9_-]+\/derivatives\/[A-Za-z0-9_-]+)$(?![\s\S])/),mimeType:z.enum(['image/webp','image/png','image/jpeg','image/svg+xml','text/css','font/woff']),sizeBytes:z.number().int().positive().max(12*1024*1024),sha256:hashSchema,width:z.number().int().positive().max(8192).optional(),height:z.number().int().positive().max(8192).optional(),derivative:mediaDerivativePublicSchema.optional(),inlineBase64:z.string().max(87384).regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$(?![\s\S])/).optional()}).refine(resource=>{
 if(resource.inlineBase64===undefined)return true;
 const encoded=resource.inlineBase64,decodedSize=encoded.length/4*3-(encoded.endsWith('==')?2:encoded.endsWith('=')?1:0);
 return resource.id==='styles'&&resource.path==='styles.css'&&resource.url==='http://127.0.0.1:5010/styles.css'&&resource.mimeType==='text/css'&&resource.sizeBytes<=65536&&decodedSize===resource.sizeBytes&&resource.derivative===undefined&&resource.width===undefined&&resource.height===undefined;
});
const presentationResourceSchema=strictSiteObject({id:z.literal(HERO_PRESENTATION_RESOURCE_ID),path:z.literal('assets/hero-presentation-v1.css'),sourceKind:z.literal('APPLICATION_INLINE'),mimeType:z.literal('text/css'),sizeBytes:z.number().int().positive().max(65536),sha256:z.literal(HERO_PRESENTATION_SHA256),inlineBase64:z.string().max(87384).regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$(?![\s\S])/)}).refine(r=>r.inlineBase64.length/4*3-(r.inlineBase64.endsWith('==')?2:r.inlineBase64.endsWith('=')?1:0)===r.sizeBytes);
export const heroQaResourceSchema=z.union([legacyHeroQaResourceSchema,presentationResourceSchema]);
const presentationSchema=strictSiteObject({id:z.literal(HERO_PRESENTATION_ID),brand:strictSiteObject({name:z.string().min(1).max(120),tagline:z.string().max(300),logoResourceId:resourceIdSchema}),stylesheetResourceId:z.literal(HERO_PRESENTATION_RESOURCE_ID)});
const resourcesCheck=(value,ctx)=>{const ids=value.resources.map(r=>r.id),paths=value.resources.map(r=>r.path);if(new Set(ids).size!==ids.length||new Set(paths).size!==paths.length||!ids.includes('styles'))ctx.addIssue({code:'custom',message:'Invalid resources'});};
export const heroQaV1Schema=strictSiteObject({contractRevision:z.literal(1),kind:z.literal('LOCALIZED_HERO_QA'),draft:localizedHeroDraftSchema,hero:z.unknown(),resources:z.array(legacyHeroQaResourceSchema).min(2).max(8)}).superRefine(resourcesCheck);
export const heroQaV2Schema=strictSiteObject({contractRevision:z.literal(2),kind:z.literal('LOCALIZED_HERO_QA'),draft:localizedHeroDraftSchema,hero:z.unknown(),presentation:presentationSchema,resources:z.array(heroQaResourceSchema).min(3).max(9)}).superRefine((value,ctx)=>{
 resourcesCheck(value,ctx);const expected=new Set([value.hero?.image?.assetId,value.presentation.brand.logoResourceId,'styles',HERO_PRESENTATION_RESOURCE_ID,...['abril-fatface-400','montserrat-400','montserrat-600','montserrat-700','montserrat-800']]);
 const css=value.resources.find(r=>r.id===HERO_PRESENTATION_RESOURCE_ID),logo=value.resources.find(r=>r.id===value.presentation.brand.logoResourceId);
 if(!css||css.sourceKind!=='APPLICATION_INLINE'||!logo?.mimeType.startsWith('image/')||value.resources.length!==expected.size||value.resources.some(r=>!expected.has(r.id)))ctx.addIssue({code:'custom',message:'Invalid presentation closure'});
 for(const r of value.resources){if(r.id==='styles'&&(r.path!=='styles.css'||r.mimeType!=='text/css'))ctx.addIssue({code:'custom',message:'Invalid baseline stylesheet'});if(/^(?:abril-fatface|montserrat)-/.test(r.id)&&(r.path!==`assets/${r.id}.woff`||r.mimeType!=='font/woff'))ctx.addIssue({code:'custom',message:'Invalid font role'});}
});
export const heroQaSchema=z.union([heroQaV1Schema,heroQaV2Schema]);
export function parseHeroQa(value){const result=heroQaSchema.parse(value);assertHeroBytes(result,262144);return result;}
