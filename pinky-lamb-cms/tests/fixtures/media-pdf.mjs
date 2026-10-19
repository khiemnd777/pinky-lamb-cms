import {PDFDocument,PDFName,PDFString,rgb} from 'pdf-lib';
import {mkdir,writeFile} from 'node:fs/promises';
import {randomUUID,createHash,createCipheriv} from 'node:crypto';
import {resolve} from 'node:path';
import {PDF_ROOT,PDF_EVIDENCE_ROOT,checkPdfDirectory,pdfSha} from '../../cms-api/media-pdf.mjs';

export const TEST_SCRATCH=resolve(PDF_ROOT,'.local/media-scratch/m3/parallel-pdf-01');
export async function pdfTestRun() {
  for(const path of [PDF_EVIDENCE_ROOT,TEST_SCRATCH]) {await mkdir(path,{recursive:true,mode:0o700});await checkPdfDirectory(path);}
  const id=`run-${randomUUID()}`,evidence=resolve(PDF_EVIDENCE_ROOT,id),inputDirectory=resolve(TEST_SCRATCH,id);
  await mkdir(evidence,{mode:0o700});await mkdir(inputDirectory,{mode:0o700});
  return {id,evidence,inputDirectory,attemptDirectory:resolve(TEST_SCRATCH,`${id}-attempt`)};
}
export async function makePdfFixture(run,{pages=1,active=false,width=200,height=150}={}) {
  const doc=await PDFDocument.create();
  for(let n=0;n<pages;n++) {
    const page=doc.addPage([width,height]);
    page.drawRectangle({x:0,y:0,width,height,color:rgb((n%3)/3,0.2,0.7)});
    page.drawRectangle({x:20,y:20,width:50,height:50,color:rgb(1,0,0)});
  }
  if(active) {
    doc.setTitle('PRIVATE_SOURCE_METADATA_012345');doc.setAuthor('PRIVATE_SOURCE_AUTHOR');
    doc.addJavaScript('source-js','var PRIVATE_SOURCE_ACTION = 1;');
    doc.catalog.set(PDFName.of('OpenAction'),doc.context.obj({S:'JavaScript',JS:PDFString.of('var PRIVATE_OPEN_ACTION=1;')}));
    const form=doc.getForm(),field=form.createTextField('PRIVATE_FORM');field.setText('visible form');field.addToPage(doc.getPages()[0],{x:85,y:20,width:90,height:25});
    await doc.attach(Buffer.from('PRIVATE_ATTACHMENT_PAYLOAD'), 'private.txt',{mimeType:'text/plain'});
  }
  const bytes=Buffer.from(await doc.save({useObjectStreams:false}));
  return writePdfFixture(run,bytes);
}
export async function writePdfFixture(run,bytes) {
  const input=resolve(run.inputDirectory,'source.pdf');
  await writeFile(input,bytes,{flag:'wx',mode:0o600});
  await writeFile(resolve(run.evidence,'source.pdf'),bytes,{flag:'wx',mode:0o600});
  return {input,expectedSha256:pdfSha(bytes),attemptDirectory:run.attemptDirectory};
}

function fixturePdf(objects,trailer='') {
  const parts=[Buffer.from('%PDF-2.0\n')],offsets=[0];let size=parts[0].length;
  for(let n=0;n<objects.length;n++) {offsets.push(size);const object=Buffer.concat([Buffer.from(`${n+1} 0 obj\n`),Buffer.isBuffer(objects[n])?objects[n]:Buffer.from(objects[n]),Buffer.from('\nendobj\n')]);parts.push(object);size+=object.length;}
  parts.push(Buffer.from(`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(n=>`${String(n).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length+1} /Root 1 0 R ${trailer} >>\nstartxref\n${size}\n%%EOF\n`));return Buffer.concat(parts);
}
// Genuine fixed AESV3/R6 empty-password fixture, based on the reviewed native audit fixture.
// Test data only: never a production encryption API or caller password interface.
export function encryptedPdfFixture() {
  function aes(mode,key,iv,data,padding=false) {const cipher=createCipheriv(mode,key,iv);cipher.setAutoPadding(padding);return Buffer.concat([cipher.update(data),cipher.final()]);}
  function hash(password,salt,user) {
    let k=createHash('sha256').update(Buffer.concat([password,salt,user])).digest(),round=0,e;
    do {const unit=Buffer.concat([password,k,user]);e=aes('aes-128-cbc',k.subarray(0,16),k.subarray(16,32),Buffer.concat(Array(64).fill(unit)));k=createHash(['sha256','sha384','sha512'][e.subarray(0,16).reduce((a,b)=>a+b,0)%3]).update(e).digest();round++;} while(round<64||e.at(-1)>round-32);
    return k.subarray(0,32);
  }
  const empty=Buffer.alloc(0),owner=Buffer.from('synthetic-owner'),key=Buffer.alloc(32,0x42),uv=Buffer.alloc(8,1),uk=Buffer.alloc(8,2),ov=Buffer.alloc(8,3),ok=Buffer.alloc(8,4);
  const u=Buffer.concat([hash(empty,uv,empty),uv,uk]),o=Buffer.concat([hash(owner,ov,u),ov,ok]),ue=aes('aes-256-cbc',hash(empty,uk,empty),Buffer.alloc(16),key),oe=aes('aes-256-cbc',hash(owner,ok,u),Buffer.alloc(16),key);
  const perms=aes('aes-256-ecb',key,null,Buffer.concat([Buffer.from([252,255,255,255,255,255,255,255]),Buffer.from('Tadb'),Buffer.alloc(4,5)])),iv=Buffer.alloc(16,6),plain=Buffer.from('0 1 0 rg 20 20 80 80 re f'),stream=Buffer.concat([iv,aes('aes-256-cbc',key,iv,plain,true)]),hex=b=>`<${b.toString('hex')}>`;
  const dict=`<< /Filter /Standard /V 5 /R 6 /Length 256 /P -4 /EncryptMetadata true /O ${hex(o)} /U ${hex(u)} /OE ${hex(oe)} /UE ${hex(ue)} /Perms ${hex(perms)} /CF << /StdCF << /CFM /AESV3 /AuthEvent /DocOpen /Length 32 >> >> /StmF /StdCF /StrF /StdCF >>`;
  return fixturePdf(['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Count 1 /Kids [3 0 R] >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 120 120] /Resources << >> /Contents 4 0 R >>',Buffer.concat([Buffer.from(`<< /Length ${stream.length} >>\nstream\n`),stream,Buffer.from('\nendstream')]),dict],`/Encrypt 5 0 R /ID [${hex(Buffer.alloc(16,7))} ${hex(Buffer.alloc(16,7))}]`);
}
