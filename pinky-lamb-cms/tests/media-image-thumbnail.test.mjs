import test from 'node:test';
import assert from 'node:assert/strict';
import {imagePreviewDocument,selectImagePreviewDerivative} from '../admin/media-image-preview.mjs';

test('gallery thumbnails use the small verified derivative and full viewer keeps 960 px',()=>{
 const record={derivatives:[{key:'image-960',bytes:900},{key:'image-320',bytes:200}]};
 assert.equal(selectImagePreviewDerivative(record,{thumbnail:true}).key,'image-320');
 assert.equal(selectImagePreviewDerivative(record).key,'image-960');
 assert.equal(selectImagePreviewDerivative({derivatives:[record.derivatives[0]]},{thumbnail:true}).key,'image-960');
 assert.throws(()=>selectImagePreviewDerivative({derivatives:[]},{thumbnail:true}),/chưa có phiên bản/);
});

test('thumbnail document bounds the image and escapes the file name',()=>{
 const html=imagePreviewDocument(new Uint8Array([1,2,3]),'<bad>"name"',{thumbnail:true,fit:'contain'});
 assert.match(html,/object-fit:contain/);
 assert.match(html,/height:100vh/);
 assert.match(html,/alt="&lt;bad&gt;&quot;name&quot;"/);
 assert.doesNotMatch(html,/<bad>/);
 assert.match(imagePreviewDocument(new Uint8Array([1]),'x',{thumbnail:true,fit:'invalid'}),/object-fit:cover/);
});

test('VIDEO thumbnails select the verified poster, never MP4; PDF thumbnails use page one',()=>{
 const poster={key:'video-poster',role:'POSTER',mime:'image/webp'},video={key:'video-720',role:'VIDEO',mime:'video/mp4'};
 assert.equal(selectImagePreviewDerivative({kind:'VIDEO',derivatives:[video,poster]},{thumbnail:true}),poster);
 assert.throws(()=>selectImagePreviewDerivative({kind:'VIDEO',derivatives:[video]},{thumbnail:true}));
 assert.throws(()=>selectImagePreviewDerivative({kind:'VIDEO',derivatives:[video,poster]}));
 const page={key:'pdf-page-1',role:'PDF_PAGE',pageNumber:1,mime:'image/webp'};
 assert.equal(selectImagePreviewDerivative({kind:'PDF',derivatives:[{...page,pageNumber:2},page]},{thumbnail:true}),page);
 assert.throws(()=>selectImagePreviewDerivative({kind:'VIDEO',derivatives:[{...poster,mime:'video/mp4'}]},{thumbnail:true}));
});
