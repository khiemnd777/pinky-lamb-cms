import {parseServiceQa} from '../contracts/service-localization-records.mjs';
import {canonicalJson} from '../contracts/draft.mjs';
import {escapeHtml as e} from './hero-renderer.mjs';
import {PROJECT_TEMPLATE_RESOURCE_PINS} from './project-localization-renderer.mjs';
/** Service markup is the approved native accordion. Both title slots use the selected locale. */
export function renderLocalizedServiceItem(service,index,{open=false}={}){
 if(!Number.isInteger(index)||index<0||index>11)throw Error('Invalid Service index');
 return `<details class="service-item" data-service="${e(service.id)}"${open?' open':''}><summary><span class="service-number">${String(index+1).padStart(2,'0')}</span><span class="service-titles"><strong>${e(service.title)}</strong><small>${e(service.titleVi)}</small></span><span class="service-toggle"><svg class="icon" aria-hidden="true"><use href="#plus"/></svg></span></summary><div class="service-body"><p>${e(service.summary)}</p><ul class="service-scope">${service.scope.map(text=>`<li>${e(text)}</li>`).join('')}</ul></div></details>`;
}
export function validateServiceQaRelationships(input){
 const qa=parseServiceQa(input),s=qa.service;
 if(canonicalJson({title:s.title,subtitle:s.titleVi,summary:s.summary,scope:s.scope})!==canonicalJson(qa.draft.content))throw Error('Saved Service content mismatch');
 for(const r of qa.resources){const pin=PROJECT_TEMPLATE_RESOURCE_PINS[r.id];if(!pin||r.sha256!==pin[0]||r.sizeBytes!==pin[1]||r.url!==`http://127.0.0.1:5010/${r.path}`)throw Error('Service template resource mismatch');}
 if(qa.resources.length!==6||new Set(qa.resources.map(r=>r.id)).size!==6)throw Error('Missing Service template resources');return qa;
}
export function renderLocalizedServiceDocument(input,{mode='PRIVATE',resourceUrls={}}={}){
 const qa=validateServiceQaRelationships(input);if(!['PRIVATE','QA_EXPORT'].includes(mode))throw Error('Invalid Service render mode');
 const style=qa.resources.find(r=>r.id==='styles'),url=resourceUrls.styles??(mode==='PRIVATE'?style.url:style.path);if(url!==(mode==='PRIVATE'?style.url:style.path))throw Error('Untrusted Service stylesheet');
 const csp=mode==='PRIVATE'?"default-src 'none'; script-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'; style-src http://127.0.0.1:5010; font-src http://127.0.0.1:5010":"default-src 'none'; script-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'; style-src 'self'; font-src 'self'";
 return `<!doctype html><html lang="${qa.draft.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta http-equiv="Content-Security-Policy" content="${e(csp)}"><title>${e(qa.service.title)}</title><link rel="stylesheet" href="${e(url)}"></head><body data-service-template="${e(qa.templateIdentity)}" data-saved-revision="${qa.draft.revision}" data-content-hash="${qa.draft.contentHash}"><svg class="icon-defs" aria-hidden="true"><symbol id="plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol></svg><div class="service-list">${renderLocalizedServiceItem(qa.service,qa.serviceIndex,{open:true})}</div></body></html>`;
}
