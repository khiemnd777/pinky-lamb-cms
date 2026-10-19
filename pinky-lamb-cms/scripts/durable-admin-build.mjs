import fs from 'node:fs';
import path from 'node:path';

export const DURABLE_AUTH_MARKER='<meta name="pinky-auth-runtime" content="durable">';

export function assertDurableAdminBuild(buildRoot){
 const index=path.join(buildRoot,'index.html');
 let html;
 try{html=fs.readFileSync(index,'utf8');}catch{throw Error('Durable Admin build missing; run make run again');}
 if(html.split(DURABLE_AUTH_MARKER).length!==2)throw Error('Admin build uses the wrong Auth runtime; run make run again');
 const entries=[...html.matchAll(/<script\b[^>]*\bsrc="(\/assets\/[a-zA-Z0-9._-]+\.js)"[^>]*>/g)];
 if(entries.length!==1)throw Error('Durable Admin entry asset missing');
 const entry=path.join(buildRoot,entries[0][1].slice(1));
 try{if(!fs.statSync(entry).isFile())throw Error();}catch{throw Error('Durable Admin entry asset missing');}
}
