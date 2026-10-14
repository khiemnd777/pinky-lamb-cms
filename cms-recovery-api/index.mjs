import path from 'node:path';
import {writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {validateRuntime} from '../scripts/local-guard.mjs';
import {assertM2Release,assertM2Pins,assertM2Metadata,createM2ReadOnlyHandler,m2Sources,m2ClosureSources,m2SocketPath} from '../scripts/m2-recovery-profile.mjs';

// Native preload validates exact source, process profile and current High release first.
validateRuntime();assertM2Release();assertM2Pins();assertM2Metadata();
const {onRequest}=createRequire(import.meta.url)('firebase-functions/v2/https');
let authorization,dispatch;
async function authorize(...args){authorization??=await import('../cms-api/authorization.mjs');return authorization.authorize(...args);}
async function dispatchRequest(...args){dispatch??=await import('../cms-api/routes.mjs');return dispatch.dispatchRequest(...args);}
function observe(value){
 const root=process.env.PINKY_M2_RECOVERY_RUNTIME;
 const cases={'PATCH /api/cms/drafts/home-v2':'draft','POST /api/cms/snapshots':'snapshots','POST /api/cms/reviews':'reviews','POST /api/cms/source-checks':'source-checks'};
 const name=value.kind==='WRITE_DENY'?cases[`${value.method} ${value.path}`]:null;
 if(value.kind==='WRITE_DENY' && !name)return;
 const receipt={task:'CMS-RECOVERY-001',revision:2,projectId:'demo-pinky-lamb-cms',runToken:path.basename(root),pid:process.pid,ppid:process.ppid,entry:'cms-recovery-api/index.mjs',sources:m2Sources(),closure_sources:m2ClosureSources(),SDK:authorization?'LOADED_EXISTING_AUTHORIZATION_MODULE':'NOT_LOADED_AUTHORIZATION',...value,canonicalSocket:process.env.PORT,effectiveSocket:m2SocketPath(process.env.PORT,process.cwd(),root),atUtc:new Date().toISOString()};
 try{writeFileSync(path.join(root,name?`write-deny-${process.pid}-${name}.json`:`anonymous-session-${process.pid}.json`),JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});}catch(error){if(error.code!=='EEXIST')throw error;}
}
export const handleRequest=createM2ReadOnlyHandler({authorize,dispatchRequest,runtime:()=>validateRuntime(),observe});
export const cmsApi=onRequest({region:'us-central1',cors:false},handleRequest);
