import {groupStatusSchema} from '../contracts/group-localization-records.mjs';
import {localizedProjectStatusSchema} from '../contracts/project-localization-records.mjs';
import {localizedServiceStatusSchema} from '../contracts/service-localization-records.mjs';
import {localizedHeroReadSchema} from '../contracts/hero-localization-records.mjs';
import {localizedSectionReadSchema} from '../contracts/work-services-localization-records.mjs';
export const localizedDraftKey=r=>`${r.kind}/${r.entityId}/${r.locale}`;
/** Missing (null) and unread/unknown (no key) remain distinct. These are authenticated reads only. */
export async function readLocalizedDraftStatuses({apiFetch,resources,kind='all',locale='all',kinds=['hero','group','project','service','section'],signal,assertCurrent=()=>{}}){
 const states=new Map(),includes=type=>kinds.includes(type)&&(kind==='all'||kind===type);
 const families=[['group','groups',groupStatusSchema],['project','projects',localizedProjectStatusSchema],['service','services',localizedServiceStatusSchema]];
 const jobs=families.filter(([type])=>includes(type)).map(async([type,family,schema])=>{
  const result=schema.parse(await apiFetch(`/api/cms/localizations/${family}/status`,{signal}));assertCurrent();
  for(const item of result[family])for(const [language,metadata]of Object.entries(item.locales))states.set(localizedDraftKey({kind:type,entityId:item[`${type}Id`],locale:language}),metadata);
 });
 for(const resource of resources.filter(r=>(r.kind==='hero'||r.kind==='section')&&includes(r.kind)&&(locale==='all'||locale===r.locale)))jobs.push((async()=>{
  const hero=resource.kind==='hero',path=hero?`/api/cms/hero-localizations/home-v3/${resource.locale}`:`/api/cms/localizations/sections/${resource.entityId}/${resource.locale}`;
  const value=(hero?localizedHeroReadSchema:localizedSectionReadSchema).parse(await apiFetch(path,{signal}));assertCurrent();
  if(value.locale!==resource.locale||value.draft&&value.draft.locale!==resource.locale||!hero&&value.sectionId!==resource.entityId)throw Error('Trạng thái phản hồi không khớp đối tượng.');
  const stale=hero?(value.sourceStale??(value.draft?.dependencyHash&&value.base.dependencyHash?value.draft.dependencyHash!==value.base.dependencyHash:value.draft?.baseContentHash!==value.base.contentHash||value.draft?.baseRevision!==value.base.revision)):value.draft?.dependencyHash!==value.base.dependencyHash;
  states.set(localizedDraftKey(resource),value.draft?{revision:value.draft.revision,stale}:null);
 })());
 await Promise.all(jobs);assertCurrent();return states;
}
export function fullSiteDraftRequirements(locale){
 return [{kind:'hero',entityId:'home-v3',label:'Hero'},...Object.entries({header:'Đầu trang',clients:'Khách hàng',about:'Giới thiệu','ip-studio':'IP Studio',contact:'Liên hệ',footer:'Chân trang',seo:'SEO & chia sẻ'}).map(([entityId,label])=>({kind:'group',entityId,label})),{kind:'section',entityId:'work',label:'Nội dung mục Dự án'},{kind:'section',entityId:'services',label:'Nội dung mục Dịch vụ'}].map(resource=>({...resource,locale}));
}
export function fullSiteDraftBlockers(requirements,states){
 return requirements.flatMap(resource=>{const key=localizedDraftKey(resource),known=states.has(key),state=states.get(key),reason=!known?'UNKNOWN':!state?'MISSING':state.stale?'STALE':null;return reason?[{...resource,reason}]:[];});
}
