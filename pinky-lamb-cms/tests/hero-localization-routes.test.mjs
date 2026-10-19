import test from 'node:test';
import assert from 'node:assert/strict';
// Route modules pull canonical runtime dependencies; execute only via local guard.
import {routeDefinition,siteErrorResponse} from '../cms-api/routes.mjs';
import {ApiError} from '../contracts/errors.mjs';
test('only exact localized routes and methods are admitted',()=>{for(const locale of ['en','vi','ja']){assert.deepEqual(routeDefinition(`/api/cms/hero-localizations/home-v3/${locale}`).methods,['GET','PUT']);assert.deepEqual(routeDefinition(`/api/cms/hero-localizations/home-v3/${locale}/qa`).methods,['GET']);}for(const path of ['/api/cms/hero-localizations/home-v3/jp','/api/cms/hero-localizations/home-v3/en/','/api/cms/hero-localizations/home-v2/en'])assert.throws(()=>routeDefinition(path));assert.equal(routeDefinition('/api/cms/drafts/home-v3').kind,'SITE_V3_DRAFT');});
test('base conflict reason is safe and bounded',()=>{const e=new ApiError('REVISION_CONFLICT');e.heroReason='BASE_REBASE_REQUIRED';assert.equal(siteErrorResponse(e,'test-correlation').body.error.reason,'BASE_REBASE_REQUIRED');e.heroReason='secret';assert.equal(siteErrorResponse(e,'test-correlation').body.error.reason,undefined);});
test('A1 canonical browser predicate admits only exact localized routes',async()=>{
 const {readFileSync}=await import('node:fs');const source=readFileSync(new URL('../admin/auth.mjs',import.meta.url),'utf8'),start=source.indexOf('export function isAllowedMediaSiteRequest('),end=source.indexOf('\nfunction mediaBytesRoute',start);assert.ok(start>0&&end>start);
 const allowed=new Function('revisionSchema','resourceIdSchema','hashSchema',source.slice(start,end).replace('export ','')+';return isAllowedMediaSiteRequest;')({parse:v=>v},{parse:v=>v},{parse:v=>v});
 for(const locale of ['en','vi','ja']){assert.equal(allowed(`/api/cms/hero-localizations/home-v3/${locale}`,'GET'),true);assert.equal(allowed(`/api/cms/hero-localizations/home-v3/${locale}`,'PUT'),true);assert.equal(allowed(`/api/cms/hero-localizations/home-v3/${locale}/qa`,'GET'),true);assert.equal(allowed(`/api/cms/hero-localizations/home-v3/${locale}/qa`,'PUT'),false);}
 for(const value of ['/api/cms/hero-localizations/home-v3/jp','/api/cms/hero-localizations/home-v3/en?x=1','/api/cms/hero-localizations/home-v3/en/../ja','/api/cms/hero-localizations/home-v3/en/','/api/cms/hero-localizations/home-v3/%65n'])assert.equal(allowed(value,'GET'),false,value);
});
