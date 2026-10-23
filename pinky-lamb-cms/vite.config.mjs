import { defineConfig } from 'vite';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {ApiError,errorEnvelope} from './contracts/errors.mjs';
import {existsSync,realpathSync} from 'node:fs';
import { ROOT, validateRuntime,installNetworkFence } from './scripts/local-guard.mjs';
import {validateLocalDataRuntime,installLocalDataNetworkFence} from './scripts/local-data-guard.mjs';
import {DURABLE_AUTH_MARKER} from './scripts/durable-admin-build.mjs';
import {m2Root,m2Environment,m2UiSources,m2Read} from './scripts/m2-recovery-profile.mjs';
const privateNames=['legacy-assets.json','baseline-site.json','baseline-provenance.json','media-tool-lock.json','media-fixtures.json'];
const privateSegment=/(?:^|\/)(?:\.local|\.cms-data-local|cms-api|cms-recovery-api|docs|tests|scripts|infra-local|quarantine|private|media-cache|media-scratch)(?:\/|$)|pinky-lamb-cms-(?:recovery-)?api-local|\.env(?:[/?]|$)/i;
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
function allowedBrowserFile(absolute){absolute=path.resolve(absolute);return ['admin','preview','contracts','reader','node_modules'].some(name=>absolute===path.join(ROOT,name)||absolute.startsWith(path.join(ROOT,name)+path.sep));}
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
 if(matches.length!==1 || !matches[0][1].includes('http://127.0.0.1:9099') || !matches[0][1].includes('ws://127.0.0.1:5273') || !/<iframe[^>]*\bsandbox(?:\s|>)/.test(html))throw new Error('M2 recovery source CSP/sandbox unavailable');
 const csp=matches[0][1].replaceAll('http://127.0.0.1:9099','http://127.0.0.1:9098').replaceAll('ws://127.0.0.1:5273','ws://127.0.0.1:5175');
 return html.replace(matches[0][0],matches[0][0].replace(matches[0][1],csp));
}
export function durableHtml(html){
 const old=' http://127.0.0.1:9099';
 if(!html.includes(old)||!html.includes('</head>'))throw Error('Local Admin CSP unavailable');
 const hosts=(process.env.PINKY_EXTERNAL_FILE_HOSTS??'').split(',').filter(Boolean);if(hosts.some(host=>!/^([a-z0-9-]+\.)+[a-z][a-z0-9-]+$/.test(host)||/(^|\.)(localhost|local|internal|lan)$/.test(host)))throw Error('Invalid external file host policy');
 return html.replace(old,'').replace("connect-src 'self'","connect-src 'self' "+hosts.map(host=>'https://'+host).join(' ')).replace('</head>',`${DURABLE_AUTH_MARKER}</head>`);
}
export function assertAdminBuildMode({command,recovery,durable,cutoverPresent}){
 if(command==='build'&&!recovery&&!durable&&cutoverPresent)throw Error('Durable local CMS is active; use npm run build:admin:durable');
}
export function recoveryBuildOutput(token){
 if(typeof token!=='string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(token))throw new Error('M2 recovery build token required');
 const output=path.join(ROOT,'.local/test-outputs/cms-recovery-001/v2/builds',token);
 let current=ROOT;for(const part of path.relative(ROOT,output).split('/')){current=path.join(current,part);if(existsSync(current) && realpathSync(current)!==current)throw new Error('Escaped recovery build output');}
 if(existsSync(output))throw new Error('Recovery build output already exists');return output;
}
/** Canonical local API runs on the already configured Vite loopback server.
 * Computed imports below execute only on Node inside configureServer/request
 * handling; no Firebase SDK or private server source enters the browser graph. */
function canonicalCmsApi(){
  return {name:'canonical-cms-api',configureServer(server){
    const durable=process.env.PINKY_LOCAL_DATA_MODE==='durable';
    let initialized=null;
    const safeFailure=(response,code)=>{
      if(response.headersSent){response.destroy();return;}
      const error=new ApiError(code);
      response.statusCode=error.status;
      response.setHeader('Cache-Control','no-store');
      response.setHeader('X-Content-Type-Options','nosniff');
      response.setHeader('Content-Type','application/json; charset=utf-8');
      response.end(JSON.stringify(errorEnvelope(error,randomUUID())));
    };
    async function application(){
      if(initialized===null){
        initialized=(async()=>{
          // The actual handler validates the demo runtime before loading SDKs,
          // then reuses canonical Auth/ACL, route validation and private reads.
          if(durable){validateLocalDataRuntime();installLocalDataNetworkFence();}
          else{validateRuntime();installNetworkFence();}
          const expressUrl=pathToFileURL(path.join(ROOT,'node_modules','express','index.js')).href;
          const apiUrl=pathToFileURL(path.join(ROOT,'cms-api','index.mjs')).href;
          const [{default:express},{handleRequest}]=await Promise.all([import(expressUrl),import(apiUrl)]);
          if(typeof express!=='function'||typeof handleRequest!=='function')throw new Error('Canonical API source unavailable');
          const app=express();
          app.disable('x-powered-by');app.disable('etag');app.set('trust proxy',false);app.set('query parser','simple');
          app.use((request,_response,next)=>{request.rawBody=Buffer.alloc(0);next();});
          app.use(express.raw({type:()=>true,limit:4*1024*1024,inflate:false,verify(request,_response,bytes){request.rawBody=bytes;}}));
          // Express retains rawHeaders, originalUrl/path/query and the real
          // ServerResponse implementation, including private binary streams.
          // Each canonical route still applies its narrower JSON/body limits.
          app.use((request,response,next)=>{Promise.resolve(handleRequest(request,response)).catch(next);});
          app.use((error,_request,response,_next)=>{
            const code=error?.type==='entity.too.large'?'PAYLOAD_TOO_LARGE':error?.type==='encoding.unsupported'?'UNSUPPORTED_MEDIA_TYPE':error?.type==='entity.parse.failed'||error?.type==='request.aborted'||error?.type==='request.size.invalid'?'BAD_REQUEST':'INTERNAL_ERROR';
            safeFailure(response,code);
          });
          return app;
        })().catch(error=>{initialized=null;throw error;});
      }
      return initialized;
    }
    // Unmounted Connect middleware preserves /api/cms in req.url. Mounting the
    // Express app at that prefix would strip the path expected by actual routes.
    if(durable){
      let authHandler=null;
      server.middlewares.use((request,response,next)=>{
        const pathname=(request.url??'').split(/[?#]/,1)[0];
        if(pathname!=='/api/auth'&&!pathname.startsWith('/api/auth/')){next();return;}
        const host=request.headers.host,remote=request.socket.remoteAddress,origin=request.headers.origin;
        const duplicate=['host','origin','cookie','authorization'].some(name=>request.rawHeaders?.filter((_value,index)=>index%2===0&&String(request.rawHeaders[index]).toLowerCase()===name).length>1);
        if(duplicate||request.headers.authorization!==undefined||host!=='127.0.0.1:5273'||!['127.0.0.1','::ffff:127.0.0.1'].includes(remote)||origin&&origin!=='http://127.0.0.1:5273'){safeFailure(response,'FORBIDDEN');return;}
        const route=pathname.slice('/api/auth/'.length),method=request.method;
        if(!((route==='get-session'&&method==='GET')||(route==='sign-in/email'&&method==='POST')||(route==='sign-out'&&method==='POST'))){safeFailure(response,'NOT_FOUND');return;}
        if(method==='POST'&&origin!=='http://127.0.0.1:5273'){safeFailure(response,'FORBIDDEN');return;}
        if(method==='POST'&&(!/^application\/json(?:;|$)/i.test(request.headers['content-type']??'')||Number(request.headers['content-length']??0)>4096)){safeFailure(response,'BAD_REQUEST');return;}
        (async()=>{if(!authHandler){validateLocalDataRuntime();const [{toNodeHandler},{localAuthServer}]=await Promise.all([import('better-auth/node'),import('./cms-api/authorization.mjs')]);authHandler=toNodeHandler(localAuthServer);}await authHandler(request,response);})().catch(()=>safeFailure(response,'LOCAL_RUNTIME_UNAVAILABLE'));
      });
    }
    server.middlewares.use((request,response,next)=>{
      const pathname=(request.url??'').split(/[?#]/,1)[0];
      if(pathname!=='/api/cms'&&!pathname.startsWith('/api/cms/')){next();return;}
      const host=request.headers.host,remote=request.socket.remoteAddress;
      if(!['127.0.0.1:5273','localhost:5273'].includes(host)||!['127.0.0.1','::ffff:127.0.0.1','::1'].includes(remote)){safeFailure(response,'FORBIDDEN');return;}
      application().then(app=>app(request,response,error=>safeFailure(response,error?'INTERNAL_ERROR':'NOT_FOUND'))).catch(()=>safeFailure(response,'LOCAL_RUNTIME_UNAVAILABLE'));
    });
  }};
}
export function createLocalViteConfig({recovery=false,output,cache}={}){return {
  root:path.join(ROOT,'admin'),
  publicDir:false,
  ...(recovery?{cacheDir:cache??path.join(ROOT,'.local/cache/cms-recovery-001/v2/vite-source-cache'),optimizeDeps:{noDiscovery:true,include:[]}}:{}),
  define:{__PINKY_M2_RECOVERY__:JSON.stringify(recovery),__PINKY_LOCAL_DATA_DURABLE__:JSON.stringify(process.env.PINKY_LOCAL_DATA_MODE==='durable'&&!recovery)},
  server:{host:'127.0.0.1',port:recovery?5175:5273,strictPort:true,
    ...(recovery?{proxy:{'/api/cms':{target:'http://127.0.0.1:5002',changeOrigin:false,rewrite:p=>`/demo-pinky-lamb-cms/us-central1/cmsApi${p}`}}}:{}),
    fs:{strict:true,allow:[path.join(ROOT,'admin'),path.join(ROOT,'contracts'),path.join(ROOT,'preview'),path.join(ROOT,'node_modules')],
      deny:['**/.local/**','**/.cms-data-local/**','**/cms-api/**','**/cms-recovery-api/**','**/docs/**','**/tests/**','**/scripts/**','**/infra-local/**','**/quarantine/**','**/private/**','**/media-cache/**','**/media-scratch/**',...privateNames.map(name=>`**/contracts/${name}`),'**/node_modules/pinky-lamb-cms-api-local/**','**/node_modules/pinky-lamb-cms-recovery-api-local/**','**/.env*','**/*.pem','**/*.key']}
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
  });}},...(!recovery?[canonicalCmsApi()]:[]),...(recovery?[{name:'m2-recovery-fixed-csp',transformIndexHtml:{order:'pre',handler:recoveryHtml}}]:process.env.PINKY_LOCAL_DATA_MODE==='durable'?[{name:'local-durable-csp',transformIndexHtml:{order:'pre',handler:durableHtml}}]:[])],
  build:{outDir:recovery?output:path.join(ROOT,'admin-dist'),emptyOutDir:!recovery}
};}
export default defineConfig(({mode,command})=>{
 const recovery=mode==='m2-recovery';let output,cache;
 assertAdminBuildMode({command,recovery,durable:process.env.PINKY_LOCAL_DATA_MODE==='durable',cutoverPresent:existsSync(path.join(ROOT,'.cms-data-local','cutover.json'))});
 if(recovery){
  if(command==='build'){
   if(process.cwd()!==ROOT || process.version!=='v22.23.3' || process.execArgv.length || process.env.NODE_OPTIONS!==undefined || process.env.GOOGLE_APPLICATION_CREDENTIALS!==undefined || process.env.FIREBASE_TOKEN!==undefined)throw new Error('Exact recovery source-build operator required');
   validateRuntime(m2Environment(m2Root('AAAAAAAAAAAAAAAAAAAAAA'),process.env));installNetworkFence();output=recoveryBuildOutput(process.env.PINKY_M2_RECOVERY_BUILD_TOKEN);cache=path.join(ROOT,'.local/cache/cms-recovery-001/v2/build-cache',process.env.PINKY_M2_RECOVERY_BUILD_TOKEN);
  }else{
   const gate=JSON.parse(m2Read('.local/cache/cms-recovery-001/v2/ui-source-release.json',1024*1024,{privateFile:true}));
   if(gate.task!=='CMS-RECOVERY-001' || gate.revision!==2 || gate.status!=='PASS_SOURCE_PRIVACY' || gate.reviewer!=='/root/pdf_setup_reviewer' || gate.coordinator!=='/root' || gate.actual_effort!=='high' || gate.runtime_observation?.model!=='gpt-6.1-sol' || gate.runtime_observation?.effort!=='high' || gate.ui_source_release!==true || JSON.stringify(gate.sources)!==JSON.stringify(m2UiSources()))throw new Error('Current High source/privacy release required');
   validateRuntime(m2Environment(m2Root(gate.runToken),process.env));installNetworkFence();cache=path.join(m2Root(gate.runToken),'vite-cache');
  }
 }else if(process.env.PINKY_LOCAL_DATA_MODE==='durable'){validateLocalDataRuntime();installLocalDataNetworkFence();}
 else validateRuntime();
 return createLocalViteConfig({recovery,output,cache});
});
