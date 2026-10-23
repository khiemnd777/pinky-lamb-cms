import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readLibraryPage} from '../admin/media-library-page.mjs';
import {isAllowedFileRequest} from '../contracts/file-http.mjs';
const record=kind=>({id:kind,name:kind,kind,status:'QUEUED',revision:0,canArchive:false,createdAtMs:1,width:null,height:null,isArchived:false,derivative:null});
test('unified library bounds all streams and advances only unfinished server cursors',async()=>{
 const calls=[],apiFetch=async path=>{calls.push(path);const u=new URL(path,'http://local');return {items:u.pathname.endsWith('/files')?[]:[record(u.searchParams.get('kind'))],nextCursor:u.searchParams.get('kind')==='PDF'?'pdf-next':null};};
 const first=await readLibraryPage({apiFetch});assert.equal(calls.length,4);assert.equal(first.items.length,3);assert.deepEqual(first.cursors,{IMAGE:null,PDF:'pdf-next',VIDEO:null,FILES:null});assert.equal(first.hasNext,true);
 calls.length=0;await readLibraryPage({apiFetch,cursors:first.cursors});assert.equal(calls.length,1);assert.match(calls[0],/kind=PDF/);assert.match(calls[0],/cursor=pdf-next/);assert.match(calls[0],/pageSize=20/);
});
test('source/kind/status filters reach the owning server and never mix file status semantics',async()=>{
 const calls=[],apiFetch=async path=>{calls.push(path);return {items:[],nextCursor:null};};
 await readLibraryPage({apiFetch,source:'EXTERNAL',kind:'PDF'});assert.equal(calls.length,1);assert.match(calls[0],/files\?kind=PDF&source=EXTERNAL/);
 calls.length=0;await readLibraryPage({apiFetch,source:'DEVICE',kind:'WORD'});assert.equal(calls.length,1);assert.match(calls[0],/source=HOSTED/);
 calls.length=0;await readLibraryPage({apiFetch,kind:'WORD',status:'PROCESSING'});assert.equal(calls.length,0);
 calls.length=0;await readLibraryPage({apiFetch,kind:'VIDEO'});assert.equal(calls.length,1);assert.match(calls[0],/kind=VIDEO/);
});
test('failed or oversized source cannot appear as a successful partial library page',async()=>{
 await assert.rejects(readLibraryPage({apiFetch:async path=>{if(path.includes('/files'))throw Error('Unavailable');return {items:[],nextCursor:null};}}),/Unavailable/);
 await assert.rejects(readLibraryPage({apiFetch:async()=>({items:Array(21).fill(record('PDF')),nextCursor:null}),kind:'PDF'}),/Invalid library page/);
});

test('file requests remain canonical and source filter stays allowlisted at the browser boundary',async()=>{
 const calls=[];await readLibraryPage({apiFetch:async path=>{calls.push(path);return {items:[],nextCursor:null};}});
 assert.ok(calls.includes('/api/cms/files'));assert.equal(isAllowedFileRequest('/api/cms/files?source=EXTERNAL','GET'),true);assert.equal(isAllowedFileRequest('/api/cms/files?source=OTHER','GET'),false);assert.equal(isAllowedFileRequest('/api/cms/files?source=HOSTED&source=EXTERNAL','GET'),false);
});
