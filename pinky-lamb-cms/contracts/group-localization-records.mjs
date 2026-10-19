import {z} from 'zod';
import {strictSiteObject} from './site-settings.mjs';
import {resourceIdSchema,hashSchema,revisionSchema,assertEnvelopeSize} from './hero.mjs';
import {groupIdSchema,groupLocaleSchema,groupBaseSchema,groupContentSchema,groupSourceMediaUses,mergeLocalizedGroup,GROUP_TEMPLATE_ID} from './group-localization.mjs';
import {heroQaResourceSchema} from './hero-localization-records.mjs';
import {mediaDerivativePublicSchema} from './media-read-public.mjs';
import {projectQaResourceSchema} from './project-localization-records.mjs';
import {templateResourcesSchema} from './service-localization-records.mjs';
import {canonicalJson} from './draft.mjs';
import {ApiError} from './errors.mjs';
const auxiliaryResourceSchema=strictSiteObject({id:resourceIdSchema,assetId:resourceIdSchema,path:z.string().regex(/^assets\/[A-Za-z0-9][A-Za-z0-9._-]{0,180}$/),url:z.string(),mimeType:z.enum(['video/mp4','image/webp']),sizeBytes:z.number().int().positive().max(64*1048576),sha256:hashSchema,width:z.number().int().positive().max(1920).optional(),height:z.number().int().positive().max(8192).optional(),durationSeconds:z.number().finite().positive().max(300).optional(),derivative:mediaDerivativePublicSchema.optional()}).refine(r=>{
 if(r.derivative){const d=r.derivative,poster=d.role==='POSTER';return ['VIDEO','POSTER'].includes(d.role)&&r.id===(poster?r.assetId+'-poster':r.assetId)&&r.path===`assets/${r.assetId}-${d.key}.${poster?'webp':'mp4'}`&&r.url===`http://127.0.0.1:5173/api/cms/media/${r.assetId}/derivatives/${d.key}`&&r.sizeBytes===d.bytes&&r.sha256===d.sha256&&r.mimeType===d.mime&&r.mimeType===(poster?'image/webp':'video/mp4')&&r.sizeBytes<=(poster?12:64)*1048576&&r.width===d.width&&r.height===d.height&&r.durationSeconds===d.durationSeconds;}
 return r.mimeType==='video/mp4'&&r.path.endsWith('.mp4')&&r.id===r.assetId&&r.url===`http://127.0.0.1:5010/${r.path}`;
});
export const localizedQaResourceSchema=z.union([projectQaResourceSchema,heroQaResourceSchema,auxiliaryResourceSchema]);
export const groupMediaSlotSchema=strictSiteObject({slotId:z.string().min(1).max(160),assetId:resourceIdSchema,resourceId:resourceIdSchema,role:z.enum(['IMAGE','VIDEO','POSTER','PDF_DOWNLOAD'])});
const identity={contractRevision:z.literal(1),draftId:z.literal('home-v3'),groupId:groupIdSchema,locale:groupLocaleSchema};
const receipt={...identity,revision:revisionSchema.refine(n=>n>=1),dependencyHash:hashSchema,contentHash:hashSchema,updatedAt:z.string().datetime().length(24)};
export const groupReceiptSchema=strictSiteObject(receipt);
export const groupDraftSchema=strictSiteObject({...receipt,content:z.unknown()}).refine(v=>groupContentSchema(v.groupId).safeParse(v.content).success);
export const groupReadSchema=strictSiteObject({...identity,base:groupBaseSchema,draft:groupDraftSchema.nullable()}).refine(v=>v.groupId===v.base.groupId&&(!v.draft||v.draft.groupId===v.groupId&&v.draft.locale===v.locale));
export const groupStatusSchema=strictSiteObject({contractRevision:z.literal(1),draftId:z.literal('home-v3'),groups:z.array(strictSiteObject({groupId:groupIdSchema,sourceTitle:z.string().max(120),isVisible:z.boolean(),locales:strictSiteObject(Object.fromEntries(['en','vi','ja'].map(locale=>[locale,strictSiteObject({revision:revisionSchema,dependencyHash:hashSchema,contentHash:hashSchema,updatedAt:z.string().datetime(),stale:z.boolean()}).nullable()] )))})).length(7).refine(v=>new Set(v.map(g=>g.groupId)).size===7)});
export const groupQaSchema=strictSiteObject({contractRevision:z.literal(1),kind:z.literal('LOCALIZED_GROUP_QA'),templateIdentity:z.literal(GROUP_TEMPLATE_ID),draft:groupDraftSchema,base:groupBaseSchema,group:z.record(z.string(),z.unknown()),mediaSlots:z.array(groupMediaSlotSchema).max(32),resources:z.array(localizedQaResourceSchema).max(64)}).superRefine((v,ctx)=>{
 const fail=()=>ctx.addIssue({code:'custom',message:'Invalid localized group closure'}),uses=groupSourceMediaUses(v.draft.groupId,v.base.source),templateIds=['styles','abril-fatface-400','montserrat-400','montserrat-600','montserrat-700','montserrat-800'];
 if(v.draft.groupId!==v.base.groupId||v.draft.dependencyHash!==v.base.dependencyHash||v.mediaSlots.length!==uses.length||new Set(v.mediaSlots.map(s=>s.slotId)).size!==v.mediaSlots.length||new Set(v.resources.map(r=>r.id)).size!==v.resources.length||new Set(v.resources.map(r=>r.path)).size!==v.resources.length||!templateResourcesSchema.safeParse(v.resources.filter(r=>templateIds.includes(r.id))).success)fail();
 const expected=new Set(templateIds);for(const use of uses){const slot=v.mediaSlots.find(s=>s.slotId===use.slotId),r=v.resources.find(r=>r.id===slot?.resourceId),expectedId=use.role==='POSTER'?use.assetId+'-poster':use.assetId;if(!slot||slot.assetId!==use.assetId||slot.role!==use.role||slot.resourceId!==expectedId||!r||(use.role==='IMAGE'||use.role==='POSTER'?!r.mimeType.startsWith('image/'):use.role==='VIDEO'?r.mimeType!=='video/mp4':r.mimeType!=='application/pdf'))fail();expected.add(expectedId);}
 if(v.resources.length!==expected.size||v.resources.some(r=>!expected.has(r.id)))fail();
 try{if(canonicalJson(v.group)!==canonicalJson(mergeLocalizedGroup(v.draft.groupId,v.base.source,v.draft.content)))fail();}catch{fail();}
});
export function parseGroupQa(value){return assertEnvelopeSize(groupQaSchema.parse(value));}
export function groupReceipt(value){return groupReceiptSchema.parse(Object.fromEntries(Object.keys(receipt).map(key=>[key,value[key]])));}
export function encodeLocalizedGroup(value,uid){resourceIdSchema.parse(uid);const {content,...metadata}=groupDraftSchema.parse(value);return assertEnvelopeSize({...metadata,updatedBy:uid,contentJson:JSON.stringify(content)});}
export function decodeLocalizedGroup(stored,{groupId,locale,hashCanonical,base}={}){try{const {contentJson,updatedBy,...rest}=assertEnvelopeSize(stored);resourceIdSchema.parse(updatedBy);if(typeof contentJson!=='string'||Object.hasOwn(rest,'content'))throw Error();const result=groupDraftSchema.parse({...rest,content:JSON.parse(contentJson)});if(result.groupId!==groupId||result.locale!==locale||hashCanonical(result.content)!==result.contentHash)throw Error();if(base&&base.dependencyHash===result.dependencyHash)mergeLocalizedGroup(groupId,base.source,result.content);return result;}catch{throw new ApiError('INTERNAL_ERROR');}}
