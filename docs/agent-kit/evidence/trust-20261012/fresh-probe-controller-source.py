"""Root-reviewed/root-run only. One ephemeral startup selector, no application work."""
from pathlib import Path
import subprocess,json,selectors,time,datetime,sys,hashlib,re
R=Path.cwd();assert str(R)=='/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb'
E=R/'docs/agent-kit/evidence/trust-20261012';CLI='/Applications/ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex'
selector=sys.argv[1] if len(sys.argv)>1 else 'kit-explorer';assert selector in ['kit-explorer','kit-reviewer','kit-implementer']
prompt=(f'Root-controlled native definition discovery only. Invoke spawn_agent exactly once with agent_type="{selector}" and message="DISCOVERY_ACK_{selector}: acknowledgement only; reply ACK. Do not read files, run commands, use tools, inspect sources, write any data or config, or delegate." '
'Use no other tools. Parent must not read files, run commands, change config, or inspect CMS/data. Do not invent a substitute role if the exact name fails. Do not perform implementation/review/exploration work. Report native lookup result briefly; do not claim model identity as evidence. Existing project trust is approved and already verified. This startup-only check does not approve product changes. Do not wait/send/close/followup native agents; they must simply acknowledge. No recursive delegation.')
out={'observedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'selector':selector,'scope':'Root-controlled fresh ephemeral startup lookup only','rawPromptGlobalConfigPersisted':False,'globalConfigurationWrites':'NONE','ephemeralRequested':True,'attempt':'attempt2','controllerSourceSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'controllerVersion':'userMessage-nontool-fix-plus-RPCerror-categories','requestedParentModel':'gpt-6.1-sol','requestedParentEffort':'high','promptSha256':hashlib.sha256(prompt.encode()).hexdigest(),'nativeAgentEvidence':[],'rawNativeCalls':[],'toolTypesObserved':[],'modelTextIsDiscoveryProof':False}
p=subprocess.Popen([CLI,'app-server','--listen','stdio://'],cwd=R,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
sel=selectors.DefaultSelector();sel.register(p.stdout,selectors.EVENT_READ);sel.register(p.stderr,selectors.EVENT_READ)
buffers={p.stdout:b'',p.stderr:b''};queue=[];stderrBytes=0;pending={};seq=0;threadId=None;turnId=None;turnDone=False;violations=[];children=set()
def send(v):p.stdin.write((json.dumps(v)+'\n').encode());p.stdin.flush()
def response(id,deadline):
 while time.monotonic()<deadline:
  pump(0.2)
  if id in pending:return pending.pop(id)
 raise TimeoutError('RPC_DEADLINE')
def request(method,params,seconds=15):
 global seq
 seq+=1;send({'id':seq,'method':method,'params':params});d=response(seq,time.monotonic()+seconds)
 if 'error' in d:
  error=d['error'];text=str(error.get('message','')).lower()
  labels=[label for label,needles in {'authentication_unavailable':['not authenticated','authentication','login required','api key','access token'],'model_unavailable':['model not found','unsupported model','model unavailable'],'rate_or_quota':['rate limit','quota']}.items() if any(n in text for n in needles)]
  out.setdefault('rpcErrors',[]).append({'method':method,'code':error.get('code'),'reportedCategory':labels or ['UNCLASSIFIED_REDACTED']})
 return d
def handle(d):
 global turnDone,turnId
 if 'id' in d and ('result' in d or 'error' in d):pending[d['id']]=d;return
 method=d.get('method','');params=d.get('params',{})
 if 'id' in d:
  violations.append('UNEXPECTED_SERVER_REQUEST:'+method);return
 if method=='turn/completed' and params.get('threadId')==threadId:
  turnDone=True;out['parentTurnStatus']=params.get('turn',{}).get('status');out['parentTurnErrorCode']=params.get('turn',{}).get('error',{}).get('code') if isinstance(params.get('turn',{}).get('error'),dict) else None
 if method in ['item/started','item/completed']:
  item=params.get('item',{});typ=item.get('type','');out['toolTypesObserved'].append(typ)
  if typ=='collabAgentToolCall':
   tool=item.get('tool');status=item.get('status');entry={'event':method,'tool':tool,'status':status,'receiverCount':len(item.get('receiverThreadIds',[])),'selectorMarkerInNativePrompt':('DISCOVERY_ACK_'+selector) in (item.get('prompt') or ''),'requestedModel':item.get('model'),'requestedReasoningEffort':item.get('reasoningEffort')}
   out['nativeAgentEvidence'].append(entry);children.update(item.get('receiverThreadIds',[]))
   if tool!='spawnAgent':violations.append('UNEXPECTED_COLLAB_TOOL:'+str(tool))
  elif typ not in ['userMessage','agentMessage','reasoning','plan','contextCompaction']:
   violations.append('UNEXPECTED_ITEM_TYPE:'+typ)
 # Experimental native function-call telemetry is filtered to name+exact approved role only.
 def visit(v):
  if isinstance(v,dict):
   if v.get('type')=='function_call':
    name=v.get('name','');arguments=v.get('arguments','')
    try:a=json.loads(arguments) if isinstance(arguments,str) else arguments
    except (ValueError,TypeError):a={}
    agentType=a.get('agent_type') if isinstance(a,dict) else None
    if 'spawn_agent' in name:
     out['rawNativeCalls'].append({'name':name,'agentType':agentType if agentType in ['kit-explorer','kit-reviewer','kit-implementer'] else 'OTHER_OR_UNAVAILABLE'})
     if agentType!=selector:violations.append('UNEXPECTED_NATIVE_SELECTOR')
    else:violations.append('UNEXPECTED_NATIVE_FUNCTION:'+name)
   if v.get('type')=='function_call_output':
    text=str(v.get('output',''))
    if 'unknown agent_type' in text:out['nativeUnknownAgentTypeError']=True
   for x in v.values():
    if isinstance(x,(dict,list)):visit(x)
  elif isinstance(v,list):
   for x in v:visit(x)
 visit(params)
 if method=='error':out['nativeErrorNotification']=True

def pump(seconds):
 global stderrBytes
 for key,_ in sel.select(seconds):
  data=__import__('os').read(key.fileobj.fileno(),65536)
  if not data:sel.unregister(key.fileobj);continue
  if key.fileobj is p.stderr:stderrBytes+=len(data);continue
  buffers[key.fileobj]+=data
  while b'\n' in buffers[key.fileobj]:
   line,buffers[key.fileobj]=buffers[key.fileobj].split(b'\n',1)
   try:d=json.loads(line)
   except ValueError:continue
   handle(d)
try:
 init=request('initialize',{'clientInfo':{'name':'pinky_root_ephemeral_definition_probe','title':'Pinky Lamb startup discovery','version':'1.0'},'capabilities':{'experimentalApi':True}});assert 'result' in init
 send({'method':'initialized'})
 start=request('thread/start',{'cwd':str(R),'ephemeral':True,'experimentalRawEvents':True,'model':'gpt-6.1-sol','config':{'model_reasoning_effort':'high'}});assert 'result' in start
 cfg=start['result'];thread=cfg['thread'];threadId=thread['id'];assert thread['ephemeral'] is True
 out['threadEphemeralObserved']=thread['ephemeral'];out['parentConfiguredModel']=cfg.get('model');out['parentConfiguredReasoningEffort']=cfg.get('reasoningEffort');out['parentConfiguredModelIsExecutionProof']=False
 assert cfg.get('model')=='gpt-6.1-sol' and cfg.get('reasoningEffort')=='high'
 sources=[]
 def source_paths(v):
  if isinstance(v,dict):
   for x in v.values():source_paths(x)
  elif isinstance(v,list):
   for x in v:source_paths(x)
  elif isinstance(v,str) and v.startswith(str(R)+'/'):
   rel=Path(v).relative_to(R).as_posix()
   if rel.startswith('.codex/agents/'):sources.append(rel)
 source_paths(cfg.get('instructionSources',[]));out['nativeProjectAgentInstructionSourcePaths']=sorted(set(sources))
 # Only documented per-session model/effort route; no policy/sandbox/features/global config write.
 started=request('turn/start',{'threadId':threadId,'model':'gpt-6.1-sol','effort':'high','input':[{'type':'text','text':prompt,'text_elements':[]}]});assert 'result' in started
 turnId=started['result']['turn']['id'];deadline=time.monotonic()+70
 while not turnDone and not violations and time.monotonic()<deadline:pump(0.2)
 if not turnDone or violations:
  out['interruptionReason']='UNEXPECTED_TOOL_OR_REQUEST' if violations else 'OWNED_TURN_DEADLINE'
  if turnId:request('turn/interrupt',{'threadId':threadId,'turnId':turnId},seconds=10)
 # Metadata only: role/cwd/ephemeral, configured route. Do not fetch child history.
 out['childrenMetadata']=[]
 for child in sorted(children):
  d=request('thread/read',{'threadId':child,'includeTurns':False},seconds=10)
  if 'result' in d:
   t=d['result']['thread'];out['childrenMetadata'].append({'agentRole':t.get('agentRole'),'projectCwdMatches':t.get('cwd')==str(R),'ephemeral':t.get('ephemeral'),'configuredModel':t.get('model'),'configuredReasoningEffort':t.get('reasoningEffort'),'modelIsPerTurnProof':False})
 out['violations']=violations;out['status']='OBSERVED_NATIVE_EVENTS' if out['nativeAgentEvidence'] or out['rawNativeCalls'] or out.get('nativeUnknownAgentTypeError') else 'NO_REGISTRY_TOOL_EVENT_PROOF'
except Exception as e:out.update(status='BLOCKED_OR_PARTIAL',errorType=type(e).__name__,reason='Native startup/probe unavailable or bounded assertion failed; no auth/key/config workaround')
finally:
 if turnId and not turnDone:
  try:request('turn/interrupt',{'threadId':threadId,'turnId':turnId},seconds=5)
  except Exception:pass
 p.stdin.close()
 try:p.wait(timeout=10);out['ownedProcessExitCode']=p.returncode
 except subprocess.TimeoutExpired:
  p.terminate();p.wait(timeout=10);out['ownedFreshChildCleanup']='Graceful terminate exact freshly owned process only';out['ownedProcessExitCode']=p.returncode
 out['stderrBytesNoContentsPersisted']=stderrBytes;out['toolTypesObserved']=sorted(set(out['toolTypesObserved']))
 E.mkdir(parents=True,exist_ok=True);dest=E/('fresh-native-probe-'+selector+'-attempt2-'+datetime.datetime.now(datetime.timezone.utc).strftime('%H%M%S%f')+'.json');assert not dest.exists();dest.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');print(json.dumps(out,ensure_ascii=False))
