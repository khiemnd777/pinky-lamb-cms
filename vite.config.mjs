import { defineConfig } from 'vite';
import path from 'node:path';
import {existsSync,realpathSync} from 'node:fs';
import { ROOT, validateRuntime,installNetworkFence } from './scripts/local-guard.mjs';
import {m2Root,m2Environment,m2UiSources,m2Read} from './scripts/m2-recovery-profile.mjs';
const privateNames=['legacy-assets.json','baseline-site.json','baseline-provenance.json','media-tool-lock.json','media-fixtures.json'];
const privateSegment=/(?:^|\/)(?:\.local|cms-api|cms-recovery-api|docs|tests|scripts|infra-local|quarantine|private|media-cache|media-scratch)(?:\/|$)|pinky-lamb-cms-(?:recovery-)?api-local|\.env(?:[/?]|$)/i;
function decodedPath(value){
  let decoded=value;
  for(let i=0;i<4;i++){const next=decodeURIComponent(decoded);if(next===decoded)return decoded;decoded=next;}
  if(/%[0-9a-f]{2}/i.test(decoded))throw new Error('Excessive URL encoding');
  return decoded;
}
export function privateFile(value){
  const decoded=decodedPath(value).replaceAll('\\','/');
  const parts=decoded.replace(/[?#].*$/,'').toLowerCase().split('/');
  const basename=parts.at(-1)??'';
  return privateSegment.test(decoded) || privateNames.some(name=>parts.includes(name)) ||
    basename.startsWith('.env') || /\.(?:pem|key)$/.test(basename);
}
function allowedBrowserFile(absolute){absolute=path.resolve(absolute);return ['admin','preview','contracts','node_modules'].some(name=>absolute===path.join(ROOT,name)||absolute.startsWith(path.join(ROOT,name)+path.sep));}
function privateImports(){
  return {name:'deny-private-browser-imports',enforce:'pre',
    async resolveId(source,importer){
      if(!importer)return null;
      if(source.startsWith('node:') || privateFile(source))throw new Error('Private/server import forbidden in browser graph');
      const resolved=await this.resolve(source,importer,{skipSelf:true});
      if(resolved){
        const candidate=decodedPath(resolved.id).replace(/[?#].*$/,'');
        const actual=existsSync(candidate)?realpathSync(candidate):candidate;
        if(privateFile(actual) || path.isAbsolute(actual) && !allowedBrowserFile(actual))throw new Error('Private/server import forbidden in browser graph');
      }
      return resolved;
    }
  };
}
export function recoveryHtml(html){
 const meta=/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/g,matches=[...html.matchAll(meta)];
 if(matches.length!==1 || !matches[0][1].includes('http://127.0.0.1:9099') || !matches[0][1].includes('ws://127.0.0.1:5173') || !/<iframe[^>]*\bsandbox(?:\s|>)/.test(html))throw new Error('M2 recovery source CSP/sandbox unavailable');
 const csp=matches[0][1].replaceAll('http://127.0.0.1:9099','http://127.0.0.1:9098').replaceAll('ws://127.0.0.1:5173','ws://127.0.0.1:5175');
 return html.replace(matches[0][0],matches[0][0].replace(matches[0][1],csp));
}
export function recoveryBuildOutput(token){
 if(typeof token!=='string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(token))throw new Error('M2 recovery build token required');
 const output=path.join(ROOT,'.local/test-outputs/cms-recovery-001/v2/builds',token);
 let current=ROOT;for(const part of path.relative(ROOT,output).split('/')){current=path.join(current,part);if(existsSync(current) && realpathSync(current)!==current)throw new Error('Escaped recovery build output');}
 if(existsSync(output))throw new Error('Recovery build output already exists');return output;
}
export function createLocalViteConfig({recovery=false,output,cache}={}){return {
  root:path.join(ROOT,'admin'),
  publicDir:false,
  ...(recovery?{cacheDir:cache??path.join(ROOT,'.local/cache/cms-recovery-001/v2/vite-source-cache'),optimizeDeps:{noDiscovery:true,include:[]}}:{}),
  define:{__PINKY_M2_RECOVERY__:JSON.stringify(recovery)},
  server:{host:'127.0.0.1',port:recovery?5175:5173,strictPort:true,
    proxy:{'/api/cms':{target:`http://127.0.0.1:${recovery?5002:5001}`,changeOrigin:false,rewrite:p=>`/demo-pinky-lamb-cms/us-central1/cmsApi${p}`}},
    fs:{strict:true,allow:[path.join(ROOT,'admin'),path.join(ROOT,'contracts'),path.join(ROOT,'preview'),path.join(ROOT,'node_modules')],
      deny:['**/.local/**','**/cms-api/**','**/cms-recovery-api/**','**/docs/**','**/tests/**','**/scripts/**','**/infra-local/**','**/quarantine/**','**/private/**','**/media-cache/**','**/media-scratch/**',...privateNames.map(name=>`**/contracts/${name}`),'**/node_modules/pinky-lamb-cms-api-local/**','**/node_modules/pinky-lamb-cms-recovery-api-local/**','**/.env*','**/*.pem','**/*.key']}
  },
  plugins:[privateImports(),{name:'deny-private-local-files',configureServer(server){server.middlewares.use((req,res,next)=>{
    let url;try{url=decodedPath(req.url??'').replaceAll('\\','/');}catch{res.statusCode=400;res.end();return;}
    if(privateFile(url) || url.replace(/[?#].*$/,'').split('/').includes('..')){res.statusCode=403;res.end('Private local file');return;}
    const pathname=url.replace(/[?#].*$/,'');
    const candidate=pathname.startsWith('/@fs/')?pathname.slice(4):path.join(ROOT,'admin',pathname);
    if(existsSync(candidate)){
      const actual=realpathSync(candidate);
      const allowed=allowedBrowserFile(actual);
      if(!allowed || privateFile(actual)){res.statusCode=403;res.end('Private local file');return;}
    }
    next();
  });}},...(recovery?[{name:'m2-recovery-fixed-csp',transformIndexHtml:{order:'pre',handler:recoveryHtml}}]:[])],
  build:{outDir:recovery?output:path.join(ROOT,'admin-dist'),emptyOutDir:!recovery}
};}
export default defineConfig(({mode,command})=>{
 const recovery=mode==='m2-recovery';let output,cache;
 if(recovery){
  if(command==='build'){
   if(process.cwd()!==ROOT || process.version!=='v22.23.3' || process.execArgv.length || process.env.NODE_OPTIONS!==undefined || process.env.GOOGLE_APPLICATION_CREDENTIALS!==undefined || process.env.FIREBASE_TOKEN!==undefined)throw new Error('Exact recovery source-build operator required');
   validateRuntime(m2Environment(m2Root('AAAAAAAAAAAAAAAAAAAAAA'),process.env));installNetworkFence();output=recoveryBuildOutput(process.env.PINKY_M2_RECOVERY_BUILD_TOKEN);cache=path.join(ROOT,'.local/cache/cms-recovery-001/v2/build-cache',process.env.PINKY_M2_RECOVERY_BUILD_TOKEN);
  }else{
   const gate=JSON.parse(m2Read('.local/cache/cms-recovery-001/v2/ui-source-release.json',1024*1024,{privateFile:true}));
   if(gate.task!=='CMS-RECOVERY-001' || gate.revision!==2 || gate.status!=='PASS_SOURCE_PRIVACY' || gate.reviewer!=='/root/pdf_setup_reviewer' || gate.coordinator!=='/root' || gate.actual_effort!=='high' || gate.runtime_observation?.model!=='gpt-6.1-sol' || gate.runtime_observation?.effort!=='high' || gate.ui_source_release!==true || JSON.stringify(gate.sources)!==JSON.stringify(m2UiSources()))throw new Error('Current High source/privacy release required');
   validateRuntime(m2Environment(m2Root(gate.runToken),process.env));installNetworkFence();cache=path.join(m2Root(gate.runToken),'vite-cache');
  }
 }else validateRuntime();
 return createLocalViteConfig({recovery,output,cache});
});
