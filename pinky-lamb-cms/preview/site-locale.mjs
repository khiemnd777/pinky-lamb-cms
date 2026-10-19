/** URL is the only durable locale/context source. Consumers supply their validated availability. */
export const LOCALES=Object.freeze(['en','vi','ja']);
export const SECTIONS=Object.freeze(['top','clients','work','services','about','ip-studio','contact','footer','main']);
export const FILTERS=Object.freeze(['all','events','film','communications']);
/** Historical P2 consumer only. This policy is never a production availability default. */
export const P2_FIXTURE_POLICY=Object.freeze({locales:LOCALES,sections:Object.freeze(['top','work','services','about','ip','contact','main']),filters:Object.freeze(['all','creative']),projectLocales:Object.freeze({CASE1:Object.freeze(['en','vi'])}),serviceLocales:Object.freeze({})});
const stable=/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/;
export function validateSiteLocalePolicy(policy){
 if(!policy||Object.keys(policy).sort().join(',')!=='filters,locales,projectLocales,sections,serviceLocales')throw Error('Explicit locale policy required');
 if(JSON.stringify(policy.locales)!==JSON.stringify(LOCALES))throw Error('Invalid locale policy');
 for(const key of ['sections','filters'])if(!Array.isArray(policy[key])||policy[key].length<1||policy[key].length>16||new Set(policy[key]).size!==policy[key].length||policy[key].some(id=>typeof id!=='string'||!stable.test(id)))throw Error('Invalid context policy');
 if(!policy.sections.includes('top')||!policy.sections.includes('work')||!policy.filters.includes('all'))throw Error('Invalid context defaults');
 for(const [key,max]of [['projectLocales',24],['serviceLocales',12]]){const records=policy[key];if(!records||Array.isArray(records)||Object.keys(records).length>max)throw Error('Invalid availability policy');for(const [id,locales]of Object.entries(records))if(!stable.test(id)||!Array.isArray(locales)||locales.length>3||new Set(locales).size!==locales.length||locales.some(locale=>!LOCALES.includes(locale)))throw Error('Invalid entity availability');}
 return policy;
}
export function localePath(locale){if(!LOCALES.includes(locale))throw Error('Invalid locale');return locale==='en'?'/':`/${locale}/`;}
export function parseLocaleURL(value,origin='http://127.0.0.1:4175',policy){
 validateSiteLocalePolicy(policy);const url=new URL(value,origin);if(url.origin!==origin||url.username||url.password)throw Error('Invalid origin');const locale=LOCALES.find(item=>localePath(item)===url.pathname);if(!locale)throw Error('Invalid locale route');
 for(const key of url.searchParams.keys())if(!['filter','project','service'].includes(key)||url.searchParams.getAll(key).length!==1)throw Error('Invalid query');
 const filter=url.searchParams.get('filter')??'all',project=url.searchParams.get('project'),service=url.searchParams.get('service'),section=url.hash.slice(1)||'top';if(!policy.filters.includes(filter)||!policy.sections.includes(section)||url.searchParams.has('project')&&!project||project&&!Object.hasOwn(policy.projectLocales,project)||url.searchParams.has('service')&&!service||service&&!Object.hasOwn(policy.serviceLocales,service)||project&&service)throw Error('Invalid context');return {locale,filter,project,service,section};
}
export function localeDestination(context,locale,policy){
 validateSiteLocalePolicy(policy);localePath(locale);const service=context?.service??null;if(!context||!LOCALES.includes(context.locale)||!policy.filters.includes(context.filter)||!policy.sections.includes(context.section)||context.project!==null&&(typeof context.project!=='string'||!Object.hasOwn(policy.projectLocales,context.project))||service!==null&&(typeof service!=='string'||!Object.hasOwn(policy.serviceLocales,service))||context.project&&service)throw Error('Invalid context');
 const missingProject=Boolean(context.project&&!policy.projectLocales[context.project].includes(locale)),missingService=Boolean(service&&!policy.serviceLocales[service].includes(locale));return {...context,locale,service:missingService?null:service,project:missingProject?null:context.project,section:missingProject?'work':missingService?'services':context.section,missing:missingProject||missingService,missingKind:missingProject?'project':missingService?'service':null};
}
export function contextPath(context,policy){const checked=localeDestination(context,context.locale,policy),query=new URLSearchParams();if(checked.filter!=='all')query.set('filter',checked.filter);if(checked.project)query.set('project',checked.project);if(checked.service)query.set('service',checked.service);const path=localePath(checked.locale)+(query.size?`?${query}`:'')+(checked.section==='top'?'':`#${checked.section}`);parseLocaleURL(path,undefined,policy);return path;}
export function localeDecision(current,next,dirty){if(!LOCALES.includes(current)||!LOCALES.includes(next))throw Error('Invalid locale');return current===next?'NOOP':dirty?'CONFIRM_DISCARD':'SWITCH';}
