import {test} from 'node:test';
import assert from 'node:assert/strict';
import {zipSync,strToU8} from 'fflate';
import {detectFile,validateExternalUrl,safeDownloadName} from '../contracts/file-detection.mjs';
const office=type=>zipSync({'[Content_Types].xml':strToU8(`<Types><Override ContentType="application/vnd.openxmlformats-officedocument.${type==='word'?'wordprocessingml.document':'spreadsheetml.sheet'}.main+xml"/></Types>`),[type==='word'?'word/document.xml':'xl/workbook.xml']:strToU8('<document/>')});
test('detects PDF/image/Office from bytes, without trusting filename or MIME',()=>{
 assert.equal(detectFile(strToU8('%PDF-1.7\n')).kind,'PDF');assert.equal(detectFile(office('word')).format,'DOCX');assert.equal(detectFile(office('excel')).format,'XLSX');
 assert.throws(()=>detectFile(strToU8('<html>file.pdf</html>')),/FILE_TYPE/);assert.throws(()=>detectFile(zipSync({'other.txt':strToU8('x')})),/FILE_TYPE/);
});
test('rejects ambiguous, traversal and macro Office packages',()=>{
 for(const extras of [{'xl/workbook.xml':strToU8('x')},{'word/vbaProject.bin':strToU8('x')},{'../bad':strToU8('x')}]){const contents={'[Content_Types].xml':strToU8('application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml'),'word/document.xml':strToU8('x'),...extras};assert.throws(()=>detectFile(zipSync(contents)),/FILE_TYPE/);}
});
test('external URL allowlist is exact and rejects secrets, local addresses and fragments',()=>{
 assert.equal(validateExternalUrl('https://media.example.org/file',['media.example.org']),'https://media.example.org/file');
 for(const url of ['http://media.example.org/f','https://media.example.org.evil/f','https://u:p@media.example.org/f','https://127.0.0.1/f','https://media.example.org/f?token=x','https://media.example.org/f#page=1'])assert.throws(()=>validateExternalUrl(url,['media.example.org']),/FILE_URL/);
 assert.equal(safeDownloadName('../../bad\r\n.exe','PDF'),'bad.pdf');
});

// Minimal CFB containers exercise regular FAT and mini-FAT traversal, not Office rendering.
function compound(format,{encrypted=false,mini=false,cycle=false}={}){
 const sector=512,mainSectors=mini?1:8,bytes=Buffer.alloc((3+mainSectors+(mini?1:0))*sector),v=new DataView(bytes.buffer,bytes.byteOffset,bytes.length);
 bytes.set([208,207,17,224,161,177,26,225]);v.setUint16(26,3,true);v.setUint16(28,0xfffe,true);v.setUint16(30,9,true);v.setUint16(32,6,true);v.setUint32(44,1,true);v.setUint32(48,1,true);v.setUint32(56,4096,true);v.setUint32(60,mini?3:0xfffffffe,true);v.setUint32(64,mini?1:0,true);v.setUint32(68,0xfffffffe,true);for(let p=76;p<512;p+=4)v.setUint32(p,0xffffffff,true);v.setUint32(76,0,true);
 for(let p=512;p<1024;p+=4)v.setUint32(p,0xffffffff,true);v.setUint32(512,0xfffffffd,true);v.setUint32(516,cycle?1:0xfffffffe,true);for(let id=2;id<2+mainSectors;id++)v.setUint32(512+id*4,id===1+mainSectors?0xfffffffe:id+1,true);
 const entry=(i,name,type,start,size)=>{const p=1024+i*128;bytes.set(Buffer.from(name+'\0','utf16le'),p);v.setUint16(p+64,(name.length+1)*2,true);bytes[p+66]=type;v.setUint32(p+116,start,true);v.setBigUint64(p+120,BigInt(size),true);};
 entry(0,'Root Entry',5,mini?2:0xfffffffe,mini?128:0);entry(1,format==='DOC'?'WordDocument':'Workbook',2,mini?0:2,mini?32:4096);if(format==='DOC')entry(2,'0Table',2,mini?1:0xfffffffe,mini?64:0);
 const p=1536;if(format==='DOC'){v.setUint16(p,0xa5ec,true);v.setUint16(p+10,encrypted?0x100:0,true);}else{v.setUint16(p,0x0809,true);v.setUint16(p+2,16,true);v.setUint16(p+4,0x0600,true);v.setUint16(p+6,5,true);v.setUint16(p+20,encrypted?0x002f:0x000a,true);}
 if(mini){v.setUint32(512+3*4,0xfffffffe,true);for(let p=2048;p<2560;p+=4)v.setUint32(p,0xffffffff,true);v.setUint32(2048,0xfffffffe,true);v.setUint32(2052,0xfffffffe,true);}return bytes;
}
test('legacy DOC/XLS inspect bounded FAT/mini-FAT streams and reject encryption or corrupt chains',()=>{
 for(const format of ['DOC','XLS'])for(const mini of [false,true]){assert.equal(detectFile(compound(format,{mini})).format,format);assert.throws(()=>detectFile(compound(format,{mini,encrypted:true})),/FILE_TYPE/);}
 assert.throws(()=>detectFile(compound('DOC',{cycle:true})),/FILE_TYPE/);
 const wrong=compound('DOC');wrong.fill(0,1536,1538);assert.throws(()=>detectFile(wrong),/FILE_TYPE/);
});
