from pathlib import Path
import subprocess,json,re,datetime,tomllib
R=Path.cwd();E=R/'docs/agent-kit/evidence/trust-20261012';CLI='/Applications/ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex';names=['kit-explorer','kit-implementer','kit-reviewer'];known={n:tomllib.loads((R/'.codex/agents'/f'{n}.toml').read_text()) for n in names}
p=subprocess.Popen([CLI,'debug','prompt-input'],cwd=R,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
stdout,stderr=p.communicate(timeout=25);raw=json.loads(stdout) if p.returncode==0 else None
texts=[];schemas=[];shapes=[]
def walk(v,path='root'):
 if isinstance(v,dict):
  shapes.append({'path':path,'keys':sorted(v.keys())}) if path.count('.')<2 else None
  if v.get('type') in ['function','tool'] or v.get('name') in ['spawn_agent','collaboration.spawn_agent']:schemas.append(v)
  for k,x in v.items():
   if isinstance(x,(dict,list)):walk(x,path+'.'+k)
   elif isinstance(x,str) and k in ['text','content','description','developer_instructions']:texts.append(x)
 elif isinstance(v,list):
  for i,x in enumerate(v):walk(x,path+f'.[{i}]')
walk(raw)
sections=[]
for t in texts:
 sections+=re.findall(r'<multi_agent_role>(.*?)</multi_agent_role>',t,re.S)
 sections+=re.findall(r'(Available (?:agent types|roles):.*?)(?=Available model overrides|type spawn_agent|$)',t,re.S)
section='\n'.join(sections);toolText=json.dumps(schemas,ensure_ascii=False)
projected=[]
for n in names:
 item={'name':n,'presentInNativeRoleSection':n in section,'presentInSpawnToolSchema':n in toolText,'descriptionExactMatchInNativeSection':known[n]['description'] in section,'sourcePathExplicitInNativeSection':'.codex/agents/'+n+'.toml' in section,'sourcePathExplicitInSpawnToolSchema':'.codex/agents/'+n+'.toml' in toolText}
 if item['presentInNativeRoleSection'] or item['presentInSpawnToolSchema']:item['expectedDescription']=known[n]['description']
 projected.append(item)
out={'observedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'command':'codex debug prompt-input (no prompt/no model turn)','exitCode':p.returncode,'rawPromptPersisted':False,'stderrBytesNoContentsPersisted':len(stderr),'nativeRoleSectionsFound':len(sections),'toolSchemaCandidateCount':len(schemas),'nativeAgents':projected,'inputStructureOnly':shapes[:10],'invocationModelPermissionBehavior':'NOT_RUN','definitionDiscovery':'NATIVE_ROLE_OR_TOOL_METADATA_ONLY' if any(x['presentInNativeRoleSection'] or x['presentInSpawnToolSchema'] for x in projected) else 'NOT_OBSERVED_IN_NATIVE_ROLE_OR_TOOL_METADATA'}
(E/'native-prompt-projection.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');print(json.dumps(out,ensure_ascii=False))
