import test from 'node:test';
import assert from 'node:assert/strict';
import {measurePdfScratch} from '../cms-api/media-pdf-runtime.mjs';
const gone=()=>Object.assign(new Error('removed after directory listing'),{code:'ENOENT'});
const regular=size=>({size,nlink:1,isFile:()=>true,isSymbolicLink:()=>false});
test('scratch watchdog tolerates only the producer-owned intermediate unlink race',async()=>{
 const seen=[];const bytes=await measurePdfScratch('/owned/attempt',{listFiles:async()=>['source.pdf','raster.png','page-1.webp','proof.png'],statFile:async path=>{seen.push(path);if(path.endsWith('.png'))throw gone();return regular(path.endsWith('.pdf')?100:30);}});
 assert.equal(bytes,130);assert.equal(seen.length,4);
 for(const name of ['source.pdf','page-1.webp','raster-only.pdf','candidate.json'])await assert.rejects(measurePdfScratch('/owned/attempt',{listFiles:async()=>[name],statFile:async()=>{throw gone();}}),e=>e.code==='ENOENT');
 await assert.rejects(measurePdfScratch('/owned/attempt',{listFiles:async()=>['raster.png'],statFile:async()=>{throw Object.assign(new Error('denied'),{code:'EACCES'});}}),e=>e.code==='EACCES');
 for(const stat of [{...regular(1),nlink:2},{...regular(1),isFile:()=>false},{...regular(1),isSymbolicLink:()=>true}])await assert.rejects(measurePdfScratch('/owned/attempt',{listFiles:async()=>['raster.png'],statFile:async()=>stat}),e=>e.code==='PDF_SCRATCH_TYPE');
});
test('fresh raster pages discard only empty pdf-lib annotation scaffolding',async()=>{
 const {sealRasterPage}=await import('../cms-api/media-pdf-runtime.mjs'),{PDFDocument,PDFName}=await import('pdf-lib'),doc=await PDFDocument.create({updateMetadata:false}),page=doc.addPage([10,10]),key=PDFName.of('Annots');
 page.drawRectangle({x:0,y:0,width:10,height:10});assert.equal(page.node.Annots().size(),0);await sealRasterPage(page);assert.equal(page.node.has(key),false);
 const bytes=await doc.save({useObjectStreams:false}),read=await PDFDocument.load(bytes,{updateMetadata:false});assert.equal(read.getPageCount(),1);assert.equal(read.getPages()[0].node.has(key),false);
 for(const value of [doc.context.obj([doc.context.obj({Subtype:'Link'})]),PDFName.of('Unexpected')]){page.node.set(key,value);await assert.rejects(sealRasterPage(page),e=>e.code==='PDF_OUTPUT_ACTIVE');assert.equal(page.node.get(key),value);}
});
