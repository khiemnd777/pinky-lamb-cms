// Build only a QA website from the synthetic CMS's actual saved QA response.
// No publish endpoint, release history, website pointer or retained data write.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {parseFullSiteQa} from '../../contracts/full-site-localization.mjs';
import {renderLocalizedFullSiteDocument,FULL_SITE_QA_SCRIPT,FULL_SITE_QA_STYLE} from '../../preview/full-site-localization-renderer.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url)),origin='http://127.0.0.1:5283';
const login=await fetch(origin+'/api/auth/sign-in/email',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({email:'video-qa@example.invalid',password:'Synthetic-video-QA-2026!',rememberMe:true})});
if(!login.ok)throw Error('Synthetic Auth required');
const cookie=login.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');
const response=await fetch(origin+'/api/cms/localizations/site/en/qa',{headers:{cookie}});if(!response.ok)throw Error('Saved synthetic QA unavailable');
const qa=parseFullSiteQa(await response.json());if(qa.groups.about.group.showreel.sourceType!=='YOUTUBE')throw Error('Synthetic YouTube save required');
const out=path.join(root,'.local/test-outputs/video-sources-001/isolated-cms/public/en'),baseline=path.join(root,'public-baseline');fs.mkdirSync(path.join(out,'assets'),{recursive:true});
for(const resource of qa.resources){const from=path.resolve(baseline,resource.path),to=path.resolve(out,resource.path);if(!from.startsWith(baseline+path.sep)||!to.startsWith(out+path.sep))throw Error('Resource path escaped');const bytes=resource.inlineBase64?Buffer.from(resource.inlineBase64,'base64'):fs.readFileSync(from);if(bytes.length!==resource.sizeBytes||createHash('sha256').update(bytes).digest('hex')!==resource.sha256)throw Error('Resource pin mismatch');fs.mkdirSync(path.dirname(to),{recursive:true});fs.writeFileSync(to,bytes);}
const html=renderLocalizedFullSiteDocument(qa,{mode:'QA_EXPORT'}).replace('<a class="skip-link"','<p role="note" style="margin:0;padding:12px;background:#fde1e1">Website thử từ CMS thử đã lưu · nguồn YouTube · chưa xuất bản</p><a class="skip-link"');
fs.writeFileSync(path.join(out,'index.html'),html);fs.writeFileSync(path.join(out,'assets/full-site-qa.js'),FULL_SITE_QA_SCRIPT);fs.writeFileSync(path.join(out,'assets/full-site-qa.css'),FULL_SITE_QA_STYLE);
for(const name of ['site-locale.mjs','full-site-locale-copy.mjs'])fs.copyFileSync(path.join(root,'preview',name),path.join(out,'assets',name));
fs.writeFileSync(path.join(out,'qa-identity.json'),JSON.stringify({source:qa.groups.about.group.showreel.sourceType,videoId:qa.groups.about.group.showreel.videoId,aboutRevision:qa.groups.about.draft.revision,dependencyHash:qa.dependencyHash},null,2));
console.log('Synthetic saved CMS → QA website exported; serve the en directory at canonical / (QA port 5293).');
