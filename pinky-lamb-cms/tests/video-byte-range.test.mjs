import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {videoByteRange} from '../scripts/video-byte-range.mjs';
import {createMultilingualSiteHandler} from '../scripts/multilingual-site-artifact.mjs';
import {CMS_ROOT,digest,writeExclusive,writeJsonExclusive} from '../scripts/multilingual-release-files.mjs';
test('single video ranges support forward/suffix seeks and refuse unsafe or unsatisfiable inputs',()=>{
 assert.deepEqual(videoByteRange('bytes=2-5',10),{start:2,end:5});assert.deepEqual(videoByteRange('bytes=-3',10),{start:7,end:9});assert.deepEqual(videoByteRange('bytes=8-',10),{start:8,end:9});assert.deepEqual(videoByteRange('bytes=0-999',10),{start:0,end:9});
 for(const h of ['bytes=10-','bytes=5-2','bytes=-0','bytes=1-2,3-4','bytes=9999999999999999999999-','bytes=-','other=0-2'])assert.throws(()=>videoByteRange(h,10),RangeError);
});
test('real public handler serves integrity-checked video ranges and a YouTube-compatible document referrer policy',t=>{
 const root='.local/releases/multilingual-001/video-range-'+randomUUID()+'/public',bytes=Buffer.from('0123456789'),names=['index.html','vi/index.html','ja/index.html','sitemap.xml','assets/reel.mp4'];
 const manifest={contractRevision:1,kind:'MULTILINGUAL_SITE_RELEASE',qaFixture:true,files:names.map(name=>({path:name,sizeBytes:bytes.length,sha256:digest(bytes),mimeType:name.endsWith('.mp4')?'video/mp4':name.endsWith('.xml')?'application/xml':'text/html'}))};for(const name of names)writeExclusive(root+'/'+name,bytes);writeJsonExclusive(root+'/manifest.json',manifest);t.after(()=>fs.rmSync(path.join(CMS_ROOT,root),{recursive:true}));
 const manifestBytes=fs.readFileSync(path.join(CMS_ROOT,root,'manifest.json')),handler=createMultilingualSiteHandler({relativeRoot:root,manifestSha256:digest(manifestBytes)});
 const call=(range,method='GET',extra={},url='/assets/reel.mp4')=>{const result={};handler({method,url,headers:{host:'127.0.0.1:4189',...(range?{range}:{}),...extra}},{writeHead(status,headers){result.status=status;result.headers=headers;},end(body){result.body=body;}});return result;};
 const partial=call('bytes=2-5');assert.equal(partial.status,206);assert.equal(partial.body.toString(),'2345');assert.equal(partial.headers['Content-Range'],'bytes 2-5/10');assert.equal(call('bytes=-2').body.toString(),'89');assert.equal(call('bytes=20-').status,416);assert.equal(call('bytes=2-5','HEAD').status,200);assert.equal(call('bytes=2-5','GET',{'if-range':'"different"'}).status,200);assert.equal(call(undefined,'GET',{},'/').headers['Referrer-Policy'],'strict-origin-when-cross-origin');
});
