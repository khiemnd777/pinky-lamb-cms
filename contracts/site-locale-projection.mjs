import {z} from 'zod';
import {strictSiteObject,stableIdSchema} from './site-settings.mjs';
import {hashSchema,revisionSchema,resourceIdSchema} from './hero.mjs';
import {SERVICE_TEMPLATE_ID,serviceLocaleSchema} from './service-localization.mjs';
import {localizedServiceQaSchema} from './service-localization-records.mjs';
import {localizedSectionQaSchema} from './work-services-localization-records.mjs';
import {localizedProjectQaSchema,projectQaResourceSchema} from './project-localization-records.mjs';
import {canonicalJson} from './draft.mjs';
import {ApiError} from './errors.mjs';
const locales=z.array(serviceLocaleSchema).max(3).refine(v=>new Set(v).size===v.length);
export const siteLocalePolicySchema=strictSiteObject({locales:z.tuple([z.literal('en'),z.literal('vi'),z.literal('ja')]),sections:z.tuple([z.literal('top'),z.literal('clients'),z.literal('work'),z.literal('services'),z.literal('about'),z.literal('ip-studio'),z.literal('contact'),z.literal('footer'),z.literal('main')]),filters:z.tuple([z.literal('all'),z.literal('events'),z.literal('film'),z.literal('communications')]),projectLocales:z.record(stableIdSchema,locales).refine(v=>Object.keys(v).length<=24),serviceLocales:z.record(stableIdSchema,locales).refine(v=>Object.keys(v).length<=12)});
export function buildSiteLocalePolicy({projectLocales={},serviceLocales={}}={}){return siteLocalePolicySchema.parse({locales:['en','vi','ja'],sections:['top','clients','work','services','about','ip-studio','contact','footer','main'],filters:['all','events','film','communications'],projectLocales,serviceLocales});}
const vectorEntry=strictSiteObject({id:stableIdSchema,revision:revisionSchema.refine(n=>n>=1),dependencyHash:hashSchema,contentHash:hashSchema});
export const dependencyVectorSchema=strictSiteObject({homeSharedHash:hashSchema,availabilityHash:hashSchema,sections:z.array(vectorEntry).length(2),projects:z.array(vectorEntry).max(24),services:z.array(vectorEntry).max(12)});
const excluded=z.array(strictSiteObject({id:stableIdSchema,reason:z.enum(['MISSING','STALE','HIDDEN'])}));
export const workServicesQaSchema=strictSiteObject({contractRevision:z.literal(1),kind:z.literal('LOCALIZED_WORK_SERVICES_QA'),mode:z.enum(['QA_SAVED_PARTIAL','APPROVED_RELEASE']),locale:serviceLocaleSchema,workCredential:strictSiteObject({resourceId:resourceIdSchema}),templateIdentity:z.literal(SERVICE_TEMPLATE_ID),dependencyHash:hashSchema,dependencyVector:dependencyVectorSchema,sections:strictSiteObject({work:localizedSectionQaSchema,services:localizedSectionQaSchema}),projects:z.array(localizedProjectQaSchema).max(24),services:z.array(localizedServiceQaSchema).max(12),excluded:strictSiteObject({projects:excluded.max(24),services:excluded.max(12)}),relations:z.record(stableIdSchema,strictSiteObject({eligibleServiceIds:z.array(stableIdSchema).max(12),missingServiceIds:z.array(stableIdSchema).max(12)})),policy:siteLocalePolicySchema,resources:z.array(projectQaResourceSchema).max(336)}).superRefine((v,ctx)=>{
 const fail=()=>ctx.addIssue({code:'custom',message:'Mixed or invalid Work/Services projection'}),pids=v.projects.map(q=>q.project.id),sids=v.services.map(q=>q.service.id);
 if(v.mode==='APPROVED_RELEASE'&&((v.sections.work.section.isVisible&&pids.length===0)||(v.sections.services.section.isVisible&&sids.length===0)))fail();
 if(new Set(pids).size!==pids.length||new Set(sids).size!==sids.length||Object.keys(v.relations).length!==pids.length)fail();
 for(const [id,q]of Object.entries(v.sections))if(q.draft.locale!==v.locale||q.draft.sectionId!==id)fail();
 for(const [name,qas]of [['projects',v.projects],['services',v.services]]){
  const entries=v.dependencyVector[name];if(entries.length!==qas.length)fail();
  for(const q of qas){const id=name==='projects'?q.project.id:q.service.id,d=q.draft,vector=entries.find(e=>e.id===id);if(!q[name==='projects'?'project':'service'].isVisible||d.locale!==v.locale||!v.policy[name==='projects'?'projectLocales':'serviceLocales'][id]?.includes(v.locale)||!vector||vector.revision!==d.revision||vector.contentHash!==d.contentHash||vector.dependencyHash!==d.dependencyHash)fail();}
 }
 for(const [id,q]of Object.entries(v.sections)){const vector=v.dependencyVector.sections.find(e=>e.id===id);if(!vector||vector.revision!==q.draft.revision||vector.contentHash!==q.draft.contentHash||vector.dependencyHash!==q.draft.dependencyHash)fail();}
 for(const q of v.projects){const relation=v.relations[q.project.id];if(!relation){fail();continue;}const eligible=q.project.serviceIds.filter(id=>sids.includes(id)),missing=q.project.serviceIds.filter(id=>!sids.includes(id));if(canonicalJson(relation)!==canonicalJson({eligibleServiceIds:eligible,missingServiceIds:missing}))fail();}
 const union=new Map();for(const q of [...Object.values(v.sections),...v.projects,...v.services])for(const r of q.resources){if(union.has(r.id)&&canonicalJson(union.get(r.id))!==canonicalJson(r))fail();union.set(r.id,r);}
 const credential=v.resources.find(r=>r.id===v.workCredential.resourceId);if(!credential||credential.mimeType!=='application/pdf')fail();else{if(union.has(credential.id)&&canonicalJson(union.get(credential.id))!==canonicalJson(credential))fail();union.set(credential.id,credential);}
 if(union.size!==v.resources.length||new Set(v.resources.map(r=>r.path)).size!==v.resources.length||v.resources.some(r=>canonicalJson(union.get(r.id))!==canonicalJson(r))||v.resources.reduce((n,r)=>n+r.sizeBytes,0)>256*1048576)fail();
 for(const group of ['projects','services'])if(v.excluded[group].some(e=>(group==='projects'?pids:sids).includes(e.id))||new Set(v.excluded[group].map(e=>e.id)).size!==v.excluded[group].length)fail();
});
export function parseWorkServicesQa(input){if(new TextEncoder().encode(JSON.stringify(input)).length>2*1048576)throw new ApiError('PAYLOAD_TOO_LARGE');return workServicesQaSchema.parse(input);}
