import {renderSeo,escapeHtml} from './hero-renderer.mjs';
import {projectSitePublicData} from './site-public-data.mjs';
import {SITE_SVG_DEFS,renderSiteHeader,renderSiteHero,renderSiteSections,renderSiteFooter} from './site-sections.mjs';

export const TEMPLATE_VERSION='m2-site-baseline-v1';
function configuredBase(value,mode){
 if(typeof value!=='string')throw new Error('Missing local artifact base');
 const base=new URL(value);
 if(base.href!==value || base.protocol!=='http:' || base.hostname!=='127.0.0.1' || base.username || base.password || base.search || base.hash || base.pathname!=='/' || base.port!==(mode==='PRIVATE'?'4189':'4173'))throw new Error('Invalid local artifact base');
 return base;
}
/** Shared pure full-site renderer. No private documents, SDKs, fetches or script generation. */
export function renderSiteDocument(content,options){
 if(!options || !['PRIVATE','QA_EXPORT'].includes(options.mode))throw new Error('Invalid render mode');
 const base=configuredBase(options.localBaseUrl,options.mode),data=projectSitePublicData(content,options);
 const context={assets:options.publicAssets,localBaseUrl:base.href,mode:options.mode};
 const resource=path=>escapeHtml(new URL(path,base).href);
 const seo=renderSeo(data.seo,{publicAssets:options.publicAssets,localBaseUrl:base.href});
 const csp=options.mode==='PRIVATE'?`default-src 'none'; script-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'; style-src ${base.origin}; style-src-attr 'unsafe-inline'; img-src ${base.origin}; font-src ${base.origin}; media-src 'none'`:`default-src 'self'; script-src 'self'; connect-src 'none'; form-action mailto:; base-uri 'none'; object-src 'none'; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self'; font-src 'self'; media-src 'self'`;
 const skip=options.mode==='PRIVATE'?'<span class="skip-link">Đến nội dung chính</span>':'<a class="skip-link" href="#main">Đến nội dung chính</a>';
 const notice=options.mode==='QA_EXPORT'?'<p id="local-qa-notice" style="padding:12px 24px;overflow-wrap:anywhere">Bản thử local — chưa xuất bản</p>':'';
 const favicon=options.publicAssets.favicon.path;
 const html=`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#fff9f5"><meta http-equiv="Content-Security-Policy" content="${escapeHtml(csp)}">${seo}<meta property="og:type" content="website"><link rel="icon" href="${resource(favicon)}" type="image/png"><link rel="preload" href="${resource('assets/abril-fatface-400.woff')}" as="font" type="font/woff" crossorigin><link rel="preload" href="${resource('assets/montserrat-400.woff')}" as="font" type="font/woff" crossorigin><link rel="stylesheet" href="${resource('styles.css')}"></head><body>${notice}${skip}${SITE_SVG_DEFS}${renderSiteHeader(data,context)}<main id="main" style="overflow-x:clip">${renderSiteHero(data,context)}${renderSiteSections(data,context)}</main>${renderSiteFooter(data,context)}</body></html>`;
 if((html.match(/<h1\b/g)??[]).length!==1 || /<script\b|<base\b/i.test(html))throw new Error('Unsafe generated document');
 return html;
}
