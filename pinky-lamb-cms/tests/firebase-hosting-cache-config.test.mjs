import test from 'node:test';
import assert from 'node:assert/strict';
import {firebaseHostingCacheConfig} from '../scripts/firebase-hosting-cache-config.mjs';
import {PUBLIC_ASSET_CACHE_CONTROL,PUBLIC_DOCUMENT_CACHE_CONTROL} from '../scripts/public-cache-policy.mjs';

test('Firebase CMS adapter gives only content-addressed assets a long public lifetime',()=>{
 const config=firebaseHostingCacheConfig();
 assert.equal(config.hosting.public,'public');
 const rule=source=>config.hosting.headers.find(item=>item.source===source);
 assert.equal(rule('**').headers[0].value,'no-store');
 for(const source of ['/','/index.html','/vi/','/vi/index.html','/ja/','/ja/index.html','/sitemap.xml'])assert.equal(rule(source).headers[0].value,PUBLIC_DOCUMENT_CACHE_CONTROL);
 assert.equal(rule('/assets/cache/**').headers[0].value,PUBLIC_ASSET_CACHE_CONTROL);
 assert.equal(config.hosting.headers.at(-1).source,'/assets/cache/**','specific cache rule follows the fallback');
 assert.equal(rule('**').headers.find(header=>header.key==='X-Robots-Tag').value,'noindex, nofollow');
 assert.equal(firebaseHostingCacheConfig({indexing:'index'}).hosting.headers[0].headers.some(header=>header.key==='X-Robots-Tag'),false);
 assert.throws(()=>firebaseHostingCacheConfig({indexing:'unknown'}));
});
