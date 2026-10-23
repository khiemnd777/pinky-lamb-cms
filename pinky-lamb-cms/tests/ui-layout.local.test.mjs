import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import {build} from 'vite';
import {chromium} from '@playwright/test';
const root=new URL('../',import.meta.url),evidence=new URL('../.local/test-outputs/ui-layout-v4/',import.meta.url);
const styles=['admin.css','pinky-select.css','site-ux.css','site-collections.css','site-services-ux.css','cms-studio-shell.css','site-settings-ux.css','site-content-ux.css','ui-layout.css'];
test('real shared components retain spacing and bounds in page, nested editor and dialog at desktop/tablet/mobile/zoom reflow',async t=>{
 fs.mkdirSync(evidence,{recursive:true});
 const built=await build({configFile:false,logLevel:'silent',build:{write:false,lib:{entry:new URL('./fixtures/ui-layout-browser.mjs',import.meta.url).pathname,formats:['es']},rollupOptions:{output:{assetFileNames:'[name]-[hash][extname]'}}}});
 const output=(Array.isArray(built)?built[0]:built).output,entry=output.find(o=>o.isEntry),files=new Map(output.map(o=>['/'+o.fileName,{bytes:o.type==='chunk'?o.code:o.source,type:o.fileName.endsWith('.css')?'text/css':'text/javascript'}]));
 for(const name of styles)files.set('/'+name,{bytes:fs.readFileSync(new URL('admin/'+name,root)),type:'text/css'});
 const html=`<!doctype html><html lang="vi"><head><meta name="viewport" content="width=device-width,initial-scale=1">${styles.map(s=>`<link rel="stylesheet" href="/${s}">`).join('')}</head><body><main class="cms-authenticated" data-cms-resource="home-v3"><div class="cms-workspace"><div id="fixture"></div></div></main><script type="module" src="/${entry.fileName}"></script></body></html>`;
 const server=http.createServer((req,res)=>{if(req.url.startsWith('/?')||req.url==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}const file=files.get(req.url);res.statusCode=file?200:404;res.setHeader('Content-Type',file?.type??'text/plain');res.end(file?.bytes??'');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
 const browser=await chromium.launch({headless:true});t.after(()=>browser.close());const page=await browser.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('Fixture page error:',e.message);});const results=[];
 for(const [label,width,height]of [['D',1440,900],['T',768,1024],['M',390,844],['N',320,720],['Z-reflow',720,450]]){
  await page.setViewportSize({width,height});
  for(const mode of ['upload','files','library','picker','heading','publication','field']){
   await page.goto(`http://127.0.0.1:${server.address().port}/?mode=${mode}`);await page.locator('#fixture').waitFor({state:'attached'});
   if(mode==='upload'){await page.getByRole('heading',{name:'Thêm tài nguyên'}).waitFor({timeout:8000});assert.equal(await page.locator('input[type=checkbox]').filter({visible:true}).count(),1);if(label==='D'){await page.locator('.cms-intake-device > form input[type=file]').setInputFiles({name:'fixture.png',mimeType:'image/png',buffer:fs.readFileSync(new URL('public-baseline/assets/favicon.png',root))});await page.getByLabel('Tên tài nguyên',{exact:true}).fill('Ảnh kiểm tra');await page.getByRole('checkbox',{name:'Tôi có quyền sử dụng và công khai tài nguyên này',exact:true}).check();await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();await page.getByRole('button',{name:'Thêm vào thư viện',exact:true}).waitFor();assert.equal(await page.locator('#fixture-write-count').textContent(),'0','inspection does not write');await page.getByRole('button',{name:'Thêm vào thư viện',exact:true}).click();await page.getByRole('button',{name:'Tiếp tục gửi',exact:true}).waitFor();assert.equal(await page.locator('#fixture-write-count').textContent(),'1','only explicit add starts an upload');}await page.getByRole('tab',{name:'Liên kết ngoài'}).click();await page.getByRole('textbox',{name:'Liên kết file',exact:true}).waitFor();}
   if(mode==='files'||mode==='picker'||mode==='field')await page.getByText('Không tải được danh sách file.',{exact:true}).waitFor();
   if(mode==='library')await page.getByRole('button',{name:'Xem '+ 'Tài nguyên dài dùng kiểm tra xuống dòng 日本語の長い名前 English content',exact:true}).waitFor();
   if(mode==='library'&&label==='D'){await page.getByRole('searchbox',{name:'Tìm trong trang hiện tại',exact:true}).fill('no-such-name');assert.equal(await page.locator('.cms-media-card:visible').count(),0);await page.getByRole('searchbox',{name:'Tìm trong trang hiện tại',exact:true}).fill('');assert.equal(await page.locator('.cms-media-card:visible').count(),1);assert.equal(await page.locator('.cms-media-status').first().textContent(),'Chọn tài nguyên để xem.');}
   if(mode==='heading')await page.locator('.ux-heading-actions').first().waitFor();
   const geometry=await page.evaluate(()=>{
    const visible=e=>e.getClientRects().length>0,box=e=>e.getBoundingClientRect(),violations=[];
    for(const group of document.querySelectorAll('.cms-control-group,.ux-heading-actions,.ux-sort-tools')){
     if(!visible(group))continue;const c=getComputedStyle(group);if(parseFloat(c.columnGap)<8||parseFloat(c.rowGap)<8)violations.push('gap '+group.className);
     const children=[...group.children].filter(visible);for(let i=0;i<children.length;i++)for(let j=i+1;j<children.length;j++){const a=box(children[i]),b=box(children[j]);if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)violations.push('overlap '+group.className);}
    }
    for(const input of document.querySelectorAll('input[type=checkbox]'))if(visible(input)&&box(input).width>24)violations.push('checkbox oversized');
    for(const control of document.querySelectorAll('button,input,select,textarea'))if(visible(control)){const b=box(control);if(b.left< -1||b.right>innerWidth+1)violations.push('outside viewport '+control.outerHTML.slice(0,100));}
    return {violations,overflow:document.documentElement.scrollWidth>innerWidth+1};
   });
   assert.deepEqual(geometry.violations,[],label+' '+mode);assert.equal(geometry.overflow,false,label+' '+mode+' page overflow');
   await page.screenshot({path:new URL(label+'-'+mode+'.png',evidence).pathname,fullPage:true});
   if(mode==='picker'){const footer=page.locator('.ux-media-picker-footer');await footer.getByRole('button',{name:'Dùng tài nguyên này'}).scrollIntoViewIfNeeded();const bounds=await footer.boundingBox();assert.ok(bounds.y+bounds.height<=height+1);await page.getByRole('button',{name:'Đóng',exact:true}).click();assert.equal(await page.locator('dialog[open]').count(),0);}
   results.push({label,width,height,mode,result:'PASS'});
  }
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(new URL('fixture-results.json',evidence),JSON.stringify(results,null,2));
});
