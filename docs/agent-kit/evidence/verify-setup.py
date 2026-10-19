from pathlib import Path
import os,stat,json,hashlib,re,subprocess,tomllib,datetime
R=Path.cwd();E=R/'docs/agent-kit/evidence';errors=[];h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def bad(s):errors.append(s)
def yaml_parse(text):
 p=subprocess.run(['ruby','-rpsych','-rjson','-e','puts JSON.generate(Psych.safe_load(STDIN.read, permitted_classes: [], permitted_symbols: [], aliases: false))'],input=text,text=True,capture_output=True)
 if p.returncode:bad('YAML parse failed: '+p.stderr[:160]);return {}
 return json.loads(p.stdout)
skillNames=[]
for root in ['.agents','.claude']:
 names=[]
 for p in sorted((R/root/'skills').glob('*/SKILL.md')):
  front=p.read_text().split('---',2)[1];d=yaml_parse(front)
  if not d.get('name') or not isinstance(d.get('description'),str):bad('Required skill metadata '+str(p.relative_to(R)))
  if d.get('name')!=p.parent.name or not re.fullmatch('[a-z0-9-]{1,64}',d.get('name','')):bad('skill name '+p.parent.name)
  names.append(p.parent.name)
 if len(names)!=17:bad(root+' skill count '+str(len(names)))
 skillNames.append(names)
if skillNames[0]!=skillNames[1]:bad('skill name mirror mismatch')
m=json.loads((R/'docs/agent-kit/skills-manifest.json').read_text())
for pair in m['mirror_pairs']:
 if (R/pair['canonical']).read_bytes()!=(R/pair['mirror']).read_bytes():bad('mirror bytes '+pair['mirror'])
for p in sorted((R/'.codex/agents').glob('*.toml')):
 d=tomllib.loads(p.read_text());role=p.stem
 if not all(d.get(k) for k in ['name','description','developer_instructions']):bad('TOML required metadata '+role)
 if d['model']!='gpt-6.1-sol' or d['model_reasoning_effort']!=('medium' if role=='kit-implementer' else 'high'):bad('TOML routing '+role)
 if role!='kit-implementer' and d.get('sandbox_mode')!='read-only':bad('TOML sandbox '+role)
for p in sorted((R/'.claude/agents').glob('*.md')):
 d=yaml_parse(p.read_text().split('---',2)[1]);role=p.stem
 if not all(d.get(k) for k in ['name','description']) or d.get('model')!='inherit':bad('Claude fields '+role)
 if role!='kit-implementer' and d.get('tools')!='Read, Glob, Grep':bad('Claude readonly '+role)
# actual Markdown links; fenced examples have their own illustrative context and are excluded.
linkCount=0
paths=[R/'AGENTS.md',R/'CLAUDE.md']+[p for root in ['.agents','.claude','.codex','docs/agent-kit'] for p in (R/root).rglob('*.md') if '/evidence/' not in p.as_posix()]
for p in paths:
 text=re.sub(r'```.*?```','',p.read_text(),flags=re.S)
 for target in re.findall(r'\]\(([^)\s]+)(?:\s+"[^"]*")?\)',text):
  if re.match(r'^[a-z]+:',target):continue
  linkCount+=1;file,_,anchor=target.partition('#');q=(p.parent/file).resolve() if file else p
  if not q.exists():bad('Missing link '+p.relative_to(R).as_posix()+' -> '+target);continue
  if anchor and q.suffix.lower()=='.md':
   heads=re.findall(r'^#{1,6}\s+(.+)$',q.read_text(),re.M);anchors=[re.sub(r'[^\w\- ]','',x.lower()).replace(' ','-') for x in heads]
   if anchor not in anchors:bad('Missing anchor '+p.relative_to(R).as_posix()+' -> '+target)
for root in ['.agents','.claude','.codex','docs/agent-kit','engineering/agent-kit']:
 for base,dirs,files in os.walk(R/root,followlinks=False):
  for n in dirs+files:
   q=Path(base)/n;s=q.lstat()
   if not(stat.S_ISDIR(s.st_mode) or stat.S_ISREG(s.st_mode)):bad('Unsafe destination type '+q.relative_to(R).as_posix())
lock=json.loads((R/'engineering/AGENT-KIT-LOCK.json').read_text());unchanged=0
for x in lock['sourceFiles']:
 if x['destination'] and x['classification']=='original' and x['destination'].startswith(('.agents/','.claude/')):
  if h(R/x['destination'])!=x['sourceSha256']:bad('Upstream bytes '+x['destination'])
  unchanged+=1
# Read-only digest verification; do not rewrite expected values to match files.
for x in m['files']:
 if h(R/x['path'])!=x['sha256']:bad('Manifest hash '+x['path'])
for x in lock['destinationFiles']:
 if h(R/x['path'])!=x['sha256']:bad('Destination lock hash '+x['path'])
mutableAllowed={'docs/agent-kit/project-context.md','docs/agent-kit/project-plan.md','docs/agent-kit/project-state.md','docs/agent-kit/verification-results.md'}
if set(lock.get('mutableDestinationPaths',[]))!=mutableAllowed:bad('Mutable destination allowlist differs')
for x in lock['sourceFiles']:
 destination=x.get('destination')
 if x.get('mutableDestination') and destination not in mutableAllowed:bad('Unapproved mutable source destination '+str(destination))
 if destination in mutableAllowed and not x.get('destinationSnapshotObservedAtUtc'):bad('Missing mutable snapshot timestamp '+destination)
 if destination and destination not in mutableAllowed and h(R/destination)!=x['destinationSha256']:bad('Source mapping destination hash '+destination)
# preserve prior typed records; no symlink following or special reads
before=json.loads((E/'preservation-before.json').read_text());counts={}
for bucket in ['files','emulatorData']:
 for x in before[bucket]:
  if x['path']=='AGENTS.md':continue
  q=R/x['path']
  try:s=q.lstat()
  except FileNotFoundError:bad('Missing protected '+x['path']);continue
  typ='symlink' if stat.S_ISLNK(s.st_mode) else 'directory' if stat.S_ISDIR(s.st_mode) else 'file' if stat.S_ISREG(s.st_mode) else 'special_not_read'
  if typ!=x['type'] or oct(stat.S_IMODE(s.st_mode))!=x['mode']:bad('Protected type/mode '+x['path']);continue
  if typ=='file' and (s.st_size!=x['bytes'] or h(q)!=x['sha256']):bad('Protected hash '+x['path'])
  if typ=='symlink' and (os.readlink(q)!=x['target'] or hashlib.sha256(os.fsencode(os.readlink(q))).hexdigest()!=x['sha256']):bad('Protected link '+x['path'])
 counts[bucket]=len(before[bucket])-(1 if bucket=='files' else 0)
orig=(E/'AGENTS-before.md').read_bytes()
if not (R/'AGENTS.md').read_bytes().startswith(orig):bad('AGENTS original body changed')
out={'status':'PASS' if not errors else 'FAIL','observedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'skillCounts':[len(n) for n in skillNames],'mirrorPairs':len(m['mirror_pairs']),'nativeAdaptersParsed':6,'unchangedOriginalEngineeringMirrorFiles':unchanged,'markdownLinksChecked':linkCount,'sourceRecordsPreservedExcludingAGENTS':counts['files'],'emulatorRecordsPreserved':counts['emulatorData'],'AGENTS':'Original body preserved; scoped append only','quickValidate':'NOT_RUN missing PyYAML; required metadata separately checked with Ruby Psych/Python tomllib','nativeInvocation':'NOT_RUN','errors':errors}
print(json.dumps(out,ensure_ascii=False));raise SystemExit(0 if not errors else 1)
