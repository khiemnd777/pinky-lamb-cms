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
out={'observedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'clientVersion':'0.162.0-alpha.17.2','commands':['codex app-server --listen stdio://','initialize','initialized','skills/list {cwds:[PROJECT_ROOT],forceReload:true}'],'modelTurn':'NOT_RUN','helperConfigWriteOperations':'NONE; not a measured global-config integrity claim'}
try:
 send({'id':0,'method':'initialize','params':{'clientInfo':{'name':'pinky_agent_setup_discovery','title':'Pinky Lamb setup discovery','version':'1.0'}}});init=wait(0);out['initialize']='PASS' if 'result' in init else 'FAIL'
 send({'method':'initialized'});send({'id':1,'method':'skills/list','params':{'cwds':[str(R)],'forceReload':True}});d=wait(1)
 project=[];errors=[];others=0
 for group in d.get('result',{}).get('data',[]):
  for x in group.get('skills',[]):
   raw=x.get('path','');q=Path(raw)
   if q.is_relative_to(R):project.append({k:x[k] for k in ['name','scope','enabled'] if k in x}|{'path':q.relative_to(R).as_posix()})
   else:others+=1
  for x in group.get('errors',[]):
   raw=x.get('path','');q=Path(raw)
   if q.is_relative_to(R):errors.append({'path':q.relative_to(R).as_posix(),'message':str(x.get('message',''))[:240].replace(str(R),'PROJECT_ROOT')})
 out.update(status='PASS' if len(project)==17 and not errors else 'FAIL_OR_PARTIAL',projectSkills=project,projectErrors=errors,nonProjectSkillsRedacted=others,responseErrorCode=d.get('error',{}).get('code'))
except Exception as e:out.update(status='BLOCKED_OR_PARTIAL',reason=str(e)[:200])
finally:
 p.stdin.close()
 try:p.wait(timeout=10);out['processExitCode']=p.returncode
 except subprocess.TimeoutExpired:out['processExitCode']='STILL_RUNNING_NO_SIGNAL_SENT';out['ownedProcessPID']=p.pid
 out['stderrLineCountNoContentsPersisted']=stderrLines
(E/'codex-skills-discovery-elevated.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');print(json.dumps(out,ensure_ascii=False))
# debug command renders local inputs only. Keep raw output in memory; persist only exact kit names/presence.
p=subprocess.Popen([CLI,'debug','prompt-input'],cwd=R,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
try:
 stdout,stderr=p.communicate(timeout=25)
 raw=json.loads(stdout) if p.returncode==0 else None
 serialized=json.dumps(raw,ensure_ascii=False) if raw else ''
 normalized=serialized.replace('\\n','\n').replace('\\\"','\"')
 sections=re.findall(r'<multi_agent_role>(.*?)</multi_agent_role>',normalized,re.S)
 sections+=re.findall(r'(Available (?:agent types|roles):.*?)(?=Available model overrides|type spawn_agent|$)',normalized,re.S)
 native_section='\n'.join(sections)
 result={'observedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'command':'codex debug prompt-input (no prompt, no model turn)','exitCode':p.returncode,'rawPromptPersisted':False,'stderrBytesNoContentsPersisted':len(stderr),'nativeAgents':[{'name':n,'presentInNativeRoleSection':n in native_section} for n in ['kit-explorer','kit-implementer','kit-reviewer']],'runtimeModelPermissions':'NOT_RUN','definitionDiscovery':'INPUT_RENDER_ONLY_NOT_NATIVE_DISCOVERY','nativeRoleSectionsFound':len(sections)}
except subprocess.TimeoutExpired:
 result={'command':'codex debug prompt-input','status':'DEADLINE_NO_SIGNAL_SENT','ownedProcessPID':p.pid,'rawPromptPersisted':False}
(E/'codex-agent-prompt-discovery-elevated.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
