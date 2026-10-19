from pathlib import Path
import os,stat,json,hashlib,tomllib,re,subprocess,selectors,time,datetime,sys
R=Path.cwd();TARGET=str(R);C=Path.home()/'.codex/config.toml';E=R/'docs/agent-kit/evidence/trust-20261012';CLI='/Applications/ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex'
assert TARGET=='/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb'
def sha(b):return hashlib.sha256(b).hexdigest()
def safe_read():
 assert stat.S_ISDIR(C.parent.lstat().st_mode)
 fd=os.open(C,os.O_RDONLY|os.O_NOFOLLOW)
 try:
  s=os.fstat(fd);assert stat.S_ISREG(s.st_mode) and s.st_nlink==1
  with os.fdopen(os.dup(fd),'rb') as f:raw=f.read()
  return raw,s
 finally:os.close(fd)
def flatten(d,p=()):
 out={}
 for k,v in d.items():
  if isinstance(v,dict):out.update(flatten(v,p+(k,)))
  else:out[p+(k,)]=v
 return out
raw,beforeStat=safe_read();before=tomllib.loads(raw.decode());previous=before.get('projects',{}).get(TARGET,{}).get('trust_level')
assert previous in [None,'untrusted','trusted']
assert len(list((R/'.codex').rglob('*')))==4
for p in (R/'.codex').rglob('*'):assert stat.S_ISDIR(p.lstat().st_mode) or stat.S_ISREG(p.lstat().st_mode)
assert {p.name for p in (R/'.codex/agents').iterdir()}=={'kit-explorer.toml','kit-implementer.toml','kit-reviewer.toml'}
metadata={'task':'AGENT-TRUST-001','observedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'configPath':'USER_CONFIG_REDACTED','targetProject':'PROJECT_ROOT','beforeSha256':sha(raw),'beforeBytes':len(raw),'mode':oct(stat.S_IMODE(beforeStat.st_mode)),'targetPreviousTrust':previous,'targetNextTrust':'trusted','expectedParsedFieldDelta':1 if previous!='trusted' else 0,'credentialFilesRead':False,'rawConfigPersisted':False,'projectDotCodexContainsOnlyThreeReviewedAdapters':True}
if '--apply' not in sys.argv:
 print(json.dumps(metadata));sys.exit(0)
p=subprocess.Popen([CLI,'app-server','--listen','stdio://'],cwd=R,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,bufsize=1)
sel=selectors.DefaultSelector();sel.register(p.stdout,selectors.EVENT_READ);sel.register(p.stderr,selectors.EVENT_READ);stderrCount=0
# Use only one request in flight. Drain stderr without persisting contents.
def send(v):p.stdin.write(json.dumps(v)+'\n');p.stdin.flush()
def wait(id):
 global stderrCount
 deadline=time.monotonic()+20
 while time.monotonic()<deadline:
  for key,_ in sel.select(1):
   line=key.fileobj.readline()
   if not line:sel.unregister(key.fileobj);continue
   if key.fileobj is p.stderr:stderrCount+=1;continue
   try:d=json.loads(line)
   except json.JSONDecodeError:continue
   if d.get('id')==id:return d
 raise RuntimeError('RPC_RESPONSE_DEADLINE')
try:
 send({'id':0,'method':'initialize','params':{'clientInfo':{'name':'pinky_exact_project_trust','title':'Pinky Lamb approved exact trust','version':'1.0'}}});assert 'result' in wait(0)
 send({'method':'initialized'});send({'id':1,'method':'config/read','params':{'cwd':TARGET,'includeLayers':True}});d=wait(1);assert 'result' in d
 layers=d['result'].get('layers',[]) or [];matches=[x for x in layers if x.get('name',{}).get('type')=='user' and x['name'].get('file')==str(C)];assert len(matches)==1
 version=matches[0]['version'];current,curStat=safe_read();assert sha(current)==sha(raw) and stat.S_IMODE(curStat.st_mode)==stat.S_IMODE(beforeStat.st_mode)
 if previous!='trusted':
  key='projects.'+json.dumps(TARGET)+'.trust_level'
  send({'id':2,'method':'config/value/write','params':{'keyPath':key,'value':'trusted','mergeStrategy':'upsert','filePath':str(C),'expectedVersion':version}});w=wait(2);metadata['nativeWriteResponseStatus']=w.get('result',{}).get('status');metadata['nativeWriteErrorCode']=w.get('error',{}).get('code');assert 'result' in w and w['result']['status']=='ok'
 else:metadata['nativeWriteResponseStatus']='ALREADY_TRUSTED_NO_WRITE'
 afterRaw,afterStat=safe_read();after=tomllib.loads(afterRaw.decode());fb=flatten(before);fa=flatten(after);key=('projects',TARGET,'trust_level');delta={k for k in set(fa)|set(fb) if fa.get(k)!=fb.get(k)}
 assert delta==({key} if previous!='trusted' else set()) and fa[key]=='trusted'
 assert stat.S_IMODE(afterStat.st_mode)==stat.S_IMODE(beforeStat.st_mode)
 # Native TOML editor must retain every original byte outside the inserted table.
 preserved=afterRaw==raw
 if previous is None:
  header=('[projects.'+json.dumps(TARGET)+']').encode();start=afterRaw.find(header);assert start>=0
  suffix=afterRaw[start:];match=re.search(rb'(?m)^\[',suffix[len(header):]);end=start+len(header)+match.start() if match else len(afterRaw)
  prefix=afterRaw[:start];tail=afterRaw[end:]
  for lead in [b'',b'\n',b'\n\n',b'\r\n',b'\r\n\r\n']:
   if prefix.endswith(lead) if lead else True:
    candidate=(prefix[:-len(lead)] if lead else prefix)+tail
    if candidate==raw:preserved=True
 else:
  # If the field already existed, compare only the literal trust replacement.
  preserved=afterRaw.replace(b'trust_level = "trusted"',b'trust_level = "untrusted"')==raw if previous=='untrusted' else preserved
 metadata.update(afterSha256=sha(afterRaw),afterBytes=len(afterRaw),targetFinalTrust=fa[key],parsedFieldDeltaCount=len(delta),parsedUnrelatedFieldsEqual=True,unrelatedBytesPreserved=preserved,modePreserved=True,status='PASS' if preserved else 'HOLD_BYTE_PRESERVATION_REVIEW')
except Exception as e:
 metadata.update(status='HOLD',errorType=type(e).__name__,reason='Bounded trust RPC or integrity assertion did not complete; no raw configuration emitted')
finally:
 p.stdin.close()
 try:p.wait(timeout=10);metadata['ownedProcessExitCode']=p.returncode
 except subprocess.TimeoutExpired:
  p.terminate();p.wait(timeout=10);metadata['ownedFreshChildCleanup']='Graceful termination of this owned fresh app-server only';metadata['ownedProcessExitCode']=p.returncode
 metadata['stderrLinesNoContentsSaved']=stderrCount
E.mkdir(parents=True,exist_ok=True);(E/'config-change.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n');print(json.dumps(metadata,ensure_ascii=False))
