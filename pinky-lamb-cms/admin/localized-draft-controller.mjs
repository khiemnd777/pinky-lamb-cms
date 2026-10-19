import {canonicalJson} from '../contracts/draft.mjs';
import {parseLocalizedResourceRead,localizedRebaseReceiptSchema} from '../contracts/localized-review-records.mjs';

const same=(left,right)=>canonicalJson(left)===canonicalJson(right);
const member=session=>session&&JSON.stringify([session.uid,session.role,session.authzVersion]);
const conflict=()=>Object.assign(Error('Bản đã lưu hoặc nguồn đã thay đổi. Giữ nội dung đang nhập để đối chiếu.'),{status:409,code:'REVISION_CONFLICT'});
const definite=error=>error.status>=400&&error.status<500&&error.code&&error.code!=='IDEMPOTENCY_IN_PROGRESS';

/** One resource, one immutable command, and a fenced readback for every localized editor. */
export function createLocalizedDraftController({apiFetch,getSession,onChange=()=>{},keyFactory=()=>crypto.randomUUID()},config) {
  const owner=member(getSession());
  let entityId=config.defaultId??null,locale='en',record=null,working=null;
  let pending=false,intent=null,error='',validation='',inputDirty=false,conflicted=false;
  let generation=0,aborter,disposed=false;
  const active=()=>!disposed&&owner&&member(getSession())===owner;
  const baseDrift=()=>!!(record?.draft&&(config.baseDrift?.(record)??record.draft.dependencyHash!==record.base.dependencyHash));
  const baseline=()=>{const content=record.draft?.content??config.blank(record.base);return record.draft&&baseDrift()&&config.reconcile?config.reconcile(structuredClone(content),record.base):content;};
  const state=()=>({[config.idField]:entityId,locale,record,working,pending,intent:!!intent,error:validation||error,conflict:conflicted,
    dirty:!!(validation||inputDirty||record&&working&&!same(working,baseline())),
    baseDrift:baseDrift(),editable:!!(active()&&['EDITOR','OWNER'].includes(getSession()?.role))});
  const emit=()=>onChange(state());
  const fence=n=>{if(!active()||generation!==n||aborter?.signal.aborted)throw new DOMException('Phiên đã thay đổi.','AbortError');};
  const begin=()=>{aborter?.abort();aborter=new AbortController();pending=true;error='';return ++generation;};
  const identity=()=>({kind:config.kind,entityId,locale});
  const readPath=()=>config.path(entityId,locale);
  function checkRead(value){if(value.locale!==locale||config.idField!=='entityId'&&value[config.idField]!==entityId)throw conflict();return value;}

  async function load(targetId=entityId,next=locale){
    if(!active()||intent||!['en','vi','ja'].includes(next)||!config.idSchema.safeParse(targetId).success)return false;
    const n=begin();entityId=targetId;locale=next;record=null;working=null;validation='';inputDirty=false;conflicted=false;emit();
    try{
      const read=checkRead(config.readSchema.parse(await apiFetch(readPath(),{signal:aborter.signal})));fence(n);
      record=read;working=structuredClone(read.draft?.content??config.blank(read.base));
      if(read.draft&&baseDrift()&&config.reconcile)working=config.reconcile(working,read.base);
      return true;
    }catch(e){if(active()&&n===generation)error=e.message||'Không tải được bản dịch.';return false;}
    finally{if(active()&&n===generation){pending=false;emit();}}
  }

  async function persist(rebase=false){
    if(!state().editable||pending||!record||!working||conflicted)return false;
    if(!intent){
      if(baseDrift()&&!rebase)return false;
      if(rebase&&!record.draft)return false;
      try{if(validation)throw Error(validation);config.validate(working,record.base);}
      catch{error='Nội dung chưa hợp lệ. Kiểm tra các trường và dữ liệu nguồn trước khi lưu.';emit();return false;}
    }
    const n=begin();emit();
    try{
      if(!intent){
        if(rebase){
          const resource=identity(),read=parseLocalizedResourceRead(await apiFetch(`/api/cms/localizations/editorial/resources/${resource.kind}/${resource.entityId}/${resource.locale}`,{signal:aborter.signal}));fence(n);
          if(!same(read.resource,resource)||!read.draft||read.draft.revision!==record.draft.revision||read.draft.contentHash!==record.draft.contentHash||!same(read.draft.content,record.draft.content))throw conflict();
          if(config.kind!=='hero'&&read.currentDependencyHash!==record.base.dependencyHash)throw conflict();
          if(config.kind==='hero'&&(read.sourceProvenance.homeRevision!==record.base.revision||read.sourceProvenance.homeContentHash!==record.base.contentHash))throw conflict();
          intent={key:keyFactory(),method:'POST',path:'/api/cms/localizations/editorial/rebase',rebase:true,
            body:{resource,expectedRevision:read.draft.revision,expectedContentHash:read.draft.contentHash,expectedDependencyHash:read.currentDependencyHash,previousDependencyHash:read.previousDependencyHash,acknowledgeSourceChange:true,content:structuredClone(working)}};
        }else intent={key:keyFactory(),method:'PUT',path:readPath(),rebase:false,body:config.saveBody(record,working)};
      }
      const held=intent;emit();
      const receipt=(held.rebase?localizedRebaseReceiptSchema:config.receiptSchema).parse(await apiFetch(held.path,{method:held.method,
        headers:{'Content-Type':'application/json','Idempotency-Key':held.key},body:JSON.stringify(held.body),signal:aborter.signal}));fence(n);
      const read=checkRead(config.readSchema.parse(await apiFetch(readPath(),{signal:aborter.signal})));fence(n);
      const draft=read.draft;
      if(!draft||receipt.revision!==(held.body.expectedRevision??0)+1||draft.revision!==receipt.revision||draft.contentHash!==receipt.contentHash||!same(draft.content,held.body.content))throw conflict();
      if(held.rebase){
        if(!same(receipt.resource,identity())||receipt.dependencyHash!==held.body.expectedDependencyHash||config.kind!=='hero'&&draft.dependencyHash!==receipt.dependencyHash)throw conflict();
      }else if(receipt.locale!==locale||config.idField!=='entityId'&&receipt[config.idField]!==entityId||!config.matchesReceipt(receipt,held.body,draft))throw conflict();
      record=read;working=structuredClone(draft.content);intent=null;validation='';inputDirty=false;error='';return true;
    }catch(e){
      if(active()&&n===generation){if(definite(e))intent=null;conflicted=!!(definite(e)&&e.status===409);error=intent?'Chưa xác định kết quả lưu. Giữ nguyên thao tác để xác nhận lại.':e.message||'Chưa lưu được. Nội dung đang nhập vẫn còn.';}
      return false;
    }finally{if(active()&&n===generation){pending=false;emit();}}
  }

  function discard(){if(pending||intent)return false;working=record?structuredClone(record.draft?.content??config.blank(record.base)):null;
    if(record?.draft&&baseDrift()&&config.reconcile)working=config.reconcile(working,record.base);
    validation='';inputDirty=false;error='';conflicted=false;emit();return true;}
  function clear(){generation++;aborter?.abort();record=null;working=null;intent=null;pending=false;validation='';inputDirty=false;error='Phiên đã thay đổi.';emit();}
  return {state,load,save:()=>persist(false),rebase:()=>persist(true),discard,
    edit(change){if(state().editable&&!pending&&!intent&&(!conflicted||config.allowConflictEdit)&&working){change(working);error='';emit();}},
    setValidation(message='',changed=false){validation=message;inputDirty=changed;emit();},
    clear,destroy(){disposed=true;generation++;aborter?.abort();record=null;working=null;intent=null;},
  };
}

/** An explicit editor confirmation is required before attaching edited copy to new source. */
export async function saveLocalizedWorking(controller,view) {
  const state=controller.state();
  if(state.intent)return controller.save();
  if(!state.baseDrift)return controller.save();
  if(!view.confirm('Nguồn đã thay đổi. Bạn đã đối chiếu nội dung đang nhập với nguồn mới và muốn lưu bản này?'))return false;
  return controller.rebase();
}
