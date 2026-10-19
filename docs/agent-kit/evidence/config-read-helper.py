from pathlib import Path
import subprocess,json,time,selectors,datetime,re
R=Path.cwd();E=R/'docs/agent-kit/evidence';CLI='/Applications/ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex'
p=subprocess.Popen([CLI,'app-server','--listen','stdio://'],cwd=R,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,bufsize=1)
s=selectors.DefaultSelector();s.register(p.stdout,selectors.EVENT_READ);s.register(p.stderr,selectors.EVENT_READ)
def send(v):p.stdin.write(json.dumps(v)+'\n');p.stdin.flush()
seen=[];stderrLines=0
def wait(id):
 global stderrLines
 deadline=time.monotonic()+20
 while time.monotonic()<deadline:
  for key,_ in s.select(1):
   line=key.fileobj.readline()
   if not line:s.unregister(key.fileobj);continue
   if key.fileobj==p.stderr:stderrLines+=1;continue
   try:d=json.loads(line)
   except json.JSONDecodeError:continue
   if d.get('id')==id:return d
 raise RuntimeError('RPC response deadline; no payload persisted')
out={'observedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'schema':'Installed CLI ConfigReadParams has cwd/includeLayers','command':'Owned app-server initialize -> config/read {cwd:PROJECT_ROOT,includeLayers:true}','rawConfigPersisted':False,'configWriteOperations':'NONE','modelTurn':'NOT_RUN'}
try:
 send({'id':0,'method':'initialize','params':{'clientInfo':{'name':'pinky_agent_setup_config_diagnostic','title':'Pinky Lamb setup read-only diagnostic','version':'1.0'}}});init=wait(0)
 send({'method':'initialized'});send({'id':1,'method':'config/read','params':{'cwd':str(R),'includeLayers':True}});d=wait(1);res=d.get('result',{})
 layers=[]
 for layer in res.get('layers',[]) or []:
  name=layer.get('name',{});path=name.get('dotCodexFolder','');q=Path(path)
  if name.get('type')=='project' and path and q.is_relative_to(R):
   reason=layer.get('disabledReason');reason=re.sub(r'/Users/[^\s\"\n]+','[PRIVATE_PATH]',reason or '')
   layerAgents=layer.get('config',{}).get('agents',{}) or {}
   layers.append({'path':q.relative_to(R).as_posix(),'disabledReason':reason or None,'kitAgentNames':[n for n in ['kit-explorer','kit-implementer','kit-reviewer'] if n in layerAgents]})
 agents=res.get('config',{}).get('agents',{}) or {}
 projected=[]
 for n in ['kit-explorer','kit-implementer','kit-reviewer']:
  if n in agents:
   entry=agents[n];safe={'name':n}
   if isinstance(entry,dict):
    for k in ['model','model_reasoning_effort','sandbox_mode']:
     if k in entry:safe[k]=entry[k]
   projected.append(safe)
 out.update(status='READ_PASS' if 'result' in d else 'READ_FAIL',projectLayers=layers,effectiveKitAgents=projected,nativeDefinitionDiscovery='NOT_OBSERVED_BY_CONFIG_READ' if not projected else 'PROJECT_AGENTS_CONFIG_OBSERVED',responseErrorCode=d.get('error',{}).get('code'))
except Exception as e:out.update(status='BLOCKED_OR_PARTIAL',reason=str(e)[:200])
finally:
 p.stdin.close()
 try:p.wait(timeout=10);out['ownedProcessExitCode']=p.returncode
 except subprocess.TimeoutExpired:out['ownedProcessExitCode']='STILL_RUNNING_NO_SIGNAL_SENT';out['ownedProcessPID']=p.pid
 out['stderrLineCountNoContentsPersisted']=stderrLines
(E/'codex-project-layer-diagnostic-final.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');print(json.dumps(out,ensure_ascii=False))
