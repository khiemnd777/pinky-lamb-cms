import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {registerHooks} from 'node:module';
import {openLocalDataStore} from '../../cms-api/local-data-store.mjs';
import {loadBaselineInputs,mapBaselineSite} from '../../scripts/map-baseline-site.mjs';
import {encodeStoredContent} from '../../contracts/draft.mjs';
import {ApiError} from '../../contracts/errors.mjs';
const authUrl=new URL('../../cms-api/authorization.mjs',import.meta.url).href;
const hook=registerHooks({load(url,context,next){return url===authUrl?{format:'module',shortCircuit:true,source:'export const db=null;export function authorize(){throw Error("Unexpected default auth");}'}:next(url,context);}});
const [{createContentService},{createSiteImportService},{createSiteV3DraftService},{createLocalizedEligibilityService},{createReadinessWorker}]=await Promise.all([import('../../cms-api/content-service.mjs'),import('../../cms-api/import-site.mjs'),import('../../cms-api/site-v3-drafts.mjs'),import('../../cms-api/localized-eligibility.mjs'),import('../../cms-api/readiness-projection.mjs')]);hook.deregister();
export async function createNativeContentFixture(){
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'pinky-content-api-')));fs.chmodSync(root,0o700);const db=openLocalDataStore(root,{create:true});const close=()=>{db.close();fs.rmSync(root,{recursive:true,force:true});};
 const baseline=mapBaselineSite(loadBaselineInputs()),catalog=baseline.context.catalog;let role='OWNER',calls=0;
 const authorize=async (_request,action)=>{if(role==='ANONYMOUS')throw new ApiError('UNAUTHENTICATED');if(action==='DRAFT_SAVE'&&role!=='OWNER')throw new ApiError('FORBIDDEN');return {uid:'synthetic-owner',role,authzVersion:1};};
 const mediaProvider={async resolveSelection({content,pinnedManifest,legacyCatalog}){calls++;return {safeCatalog:[],expectedMediaVersions:[],orderedManifest:pinnedManifest??legacyCatalog.filter(a=>JSON.stringify(content).includes(a.id)||['brand-diagonal','favicon'].includes(a.id)).map(asset=>({source:'LEGACY',asset}))};}};
 const options={db,authorize,mediaProvider,baselineProvider:()=>baseline,catalogProvider:()=>catalog};
 await db.collection('cmsDrafts').doc('home').create({contentJson:encodeStoredContent({schemaVersion:1,locale:baseline.content.locale,hero:baseline.content.hero,seo:baseline.content.seo},{catalog}),revision:159,updatedBy:'synthetic-owner',updatedAt:'2026-10-15T00:00:00.000Z',lastEventId:'synthetic-m1-event'});
 await (await createSiteImportService(options)).importSite({request:{},actor:{uid:'synthetic-owner'},body:{expectedM1Revision:159,baselineManifestHash:baseline.provenance.baselineManifestHash},key:'synthetic-m2-import',correlationId:'synthetic'});
 await (await createSiteV3DraftService(options)).importSite({request:{},actor:{uid:'synthetic-owner'},body:{expectedM2Revision:0},key:'synthetic-v3-import',correlationId:'synthetic'});
 return {close,db,options,service:createContentService(options),setRole:value=>role=value,calls:()=>calls};
}

export {createLocalizedEligibilityService,createReadinessWorker};
