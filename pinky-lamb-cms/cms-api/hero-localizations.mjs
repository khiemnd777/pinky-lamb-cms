import {readHeroFreshness} from './hero-localization-dependency.mjs';
import {createHash} from 'node:crypto';
import {ApiError,validationError} from '../contracts/errors.mjs';
import {idempotencyKeySchema,MAX_REVISION,assertEnvelopeSize} from '../contracts/hero.mjs';
import {heroLocaleSchema,parseLocalizedHeroSave,mergeLocalizedHero} from '../contracts/hero-localization.mjs';
import {encodeLocalizedHero,decodeLocalizedHero,localizedHeroReceipt,localizedHeroReadSchema,parseHeroQa,sameHeroValue} from '../contracts/hero-localization-records.mjs';
import {hashHeroValue,createHeroLocalizationContext} from './hero-localization-context.mjs';
const conflict=reason=>{const error=new ApiError('REVISION_CONFLICT');error.heroReason=reason;throw error;};
export async function createHeroLocalizationService(options={}){
 const trusted=options.context??await createHeroLocalizationContext(options),{db,authorize}=trusted;
 const ref=locale=>db.collection('cmsLocalizedHeroDrafts').doc(`home-v3--${locale}`);
 function localeOf(input){try{return heroLocaleSchema.parse(input);}catch(error){throw validationError(error);}}
 async function read({request,locale,qa=false}){
  locale=localeOf(locale);
  return db.runTransaction(async tx=>{
   await authorize(request,'MEMBER_READ',tx);
   const {base,resources,presentation}=await trusted.readBase(tx),doc=await tx.get(ref(locale));
   const draft=doc.exists?decodeLocalizedHero(doc.data(),{locale,base,hashCanonical:hashHeroValue}):null;
   const {stale}=await readHeroFreshness(tx,db,locale,draft,base);
   await authorize(request,'MEMBER_READ',tx);
   if(!qa)return assertEnvelopeSize(localizedHeroReadSchema.parse({contractRevision:1,draftId:'home-v3',locale,base,draft,sourceStale:stale}));
   if(!draft)throw new ApiError('NOT_FOUND');
   if(stale)conflict('BASE_REBASE_REQUIRED');
   return parseHeroQa({contractRevision:2,kind:'LOCALIZED_HERO_QA',draft,hero:mergeLocalizedHero(base.hero,draft.content),resources,presentation});
  });
 }
 async function save({request,actor,locale,body,key}){
  locale=localeOf(locale);try{idempotencyKeySchema.parse(key);}catch(error){throw validationError(error);}
  // One actor/key namespace across locales prevents cross-locale key reuse.
  const id='ml001-p1-'+createHash('sha256').update(JSON.stringify([actor.uid,key])).digest('hex');
  const requestHash=hashHeroValue({locale,body});
  return db.runTransaction(async tx=>{
   if((await authorize(request,'DRAFT_SAVE',tx)).uid!==actor.uid)throw new ApiError('FORBIDDEN');
   const operationRef=db.collection('cmsLocalizedHeroOperations').doc(id),prior=await tx.get(operationRef);
   if(prior.exists){
    const value=prior.data();if(value.actorUid!==actor.uid||value.requestHash!==requestHash||value.locale!==locale)throw new ApiError('IDEMPOTENCY_PAYLOAD_MISMATCH');
    if(value.action!=='LOCALIZED_HERO_DRAFT_SAVED'||value.id!==id||!sameHeroValue(value.receipt,localizedHeroReceipt(value.receipt)))throw new ApiError('INTERNAL_ERROR');
    return value.receipt;
   }
   const {base}=await trusted.readBase(tx),parsed=parseLocalizedHeroSave(body,base),doc=await tx.get(ref(locale));
   if(parsed.expectedSourceHash!==undefined&&parsed.expectedSourceHash!==base.contentHash)conflict('BASE_REBASE_REQUIRED');
   if(parsed.expectedDependencyHash!==undefined?parsed.expectedDependencyHash!==base.dependencyHash:parsed.baseRevision!==base.revision||parsed.baseContentHash!==base.contentHash)conflict('BASE_REBASE_REQUIRED');
   const previous=doc.exists?decodeLocalizedHero(doc.data(),{locale,base,hashCanonical:hashHeroValue}):null;
   if((await readHeroFreshness(tx,db,locale,previous,base)).stale)conflict('BASE_REBASE_REQUIRED');
   if((previous?.revision??null)!==parsed.expectedRevision||previous?.revision>=MAX_REVISION)conflict('LOCALIZED_REVISION_CONFLICT');
   const next={contractRevision:1,draftId:'home-v3',locale,revision:(previous?.revision??0)+1,baseRevision:base.revision,baseContentHash:base.contentHash,...(base.dependencyHash?{dependencyHash:base.dependencyHash}:{}),contentHash:hashHeroValue(parsed.content),content:parsed.content,updatedAt:new Date().toISOString()},stored=encodeLocalizedHero(next,actor.uid),receipt=localizedHeroReceipt(next);
   if((await authorize(request,'DRAFT_SAVE',tx)).uid!==actor.uid)throw new ApiError('FORBIDDEN');
   if(previous)tx.set(ref(locale),stored);else tx.create(ref(locale),stored);
   tx.create(operationRef,{contractRevision:1,id,action:'LOCALIZED_HERO_DRAFT_SAVED',actorUid:actor.uid,locale,requestHash,at:next.updatedAt,receipt});
   return receipt;
  });
 }
 return Object.freeze({readDraft:args=>read(args),readQa:args=>read({...args,qa:true}),saveDraft:save});
}
