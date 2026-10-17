"""One-time, source-bound local PDF closure. Never writes into the bundled runtime."""
from pathlib import Path
import hashlib,json,os,re,shutil,subprocess
ROOT=Path(__file__).resolve().parents[1]
if Path.cwd().resolve()!=ROOT:raise RuntimeError('Use the CMS workspace')
PREFIX=ROOT/'.local/tools/p7-v3/pdf-runtime-v2'
EVIDENCE=ROOT/'.local/p7-v3/pdf-recovery'
BUNDLE=Path('/Users/khiemnguyen/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/poppler')
CLEAN=ROOT/'.local/cache/p7-v3/pdf-clean-sources'
CLEAN_PROVENANCE=json.loads((CLEAN/'provenance.json').read_text())
CLEAN_PINS={item['path']:item for package in CLEAN_PROVENANCE for item in package['files']}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def run(args,env=None):return subprocess.run(args,check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,env=env).stdout
if PREFIX.exists():raise RuntimeError('New runtime must not replace an existing closure')
lock=json.loads((ROOT/'contracts/media-tool-lock.json').read_text())
inv=json.loads((ROOT/lock['poppler']['inventory']['path']).read_text())
for item in inv['files']:
 p=ROOT/item['path'];assert p.stat().st_size==item['bytes'] and sha(p)==item['sha256']
PREFIX.mkdir(parents=True,mode=0o700);EVIDENCE.mkdir(parents=True,exist_ok=True,mode=0o700)
for name in ['bin','lib','fonts','share/poppler','etc/fonts','cache']:(PREFIX/name).mkdir(parents=True,exist_ok=True,mode=0o700)
seeds=[Path(lock['poppler']['root'])/'bin/pdfinfo',Path(lock['poppler']['root'])/'bin/pdftocairo',CLEAN/'bin/fc-cache']
def dependencies(p):
 lines=run(['/usr/bin/otool','-L',str(p)]).splitlines()[1:]
 return [line.strip().split(' (compatibility')[0] for line in lines]
def identity(p):
 try:return run(['/usr/bin/otool','-D',str(p)]).splitlines()[1].strip()
 except (subprocess.CalledProcessError,IndexError):return None
def target(name):
 if name.startswith(('/usr/lib/','/System/Library/')):return None
 if name.startswith('@rpath/'):p=(BUNDLE/'lib'/name[7:]).resolve()
 elif name.startswith(str(BUNDLE)+'/'):p=Path(name).resolve()
 else:raise RuntimeError('Unrecognized dependency '+name)
 if not p.is_relative_to(BUNDLE) or not p.is_file():raise RuntimeError('Escaped native dependency')
 return CLEAN/'lib'/p.name
source_map={};queue=seeds[:];provenance=[]
while queue:
 source=queue.pop(0).resolve()
 if source in source_map:continue
 is_bin=source in [p.resolve() for p in seeds];destination=PREFIX/('bin' if is_bin else 'lib')/source.name
 if destination in source_map.values():raise RuntimeError('Native basename collision')
 if source.is_relative_to(CLEAN):
  pin=CLEAN_PINS[str(source.relative_to(CLEAN))];assert sha(source)==pin['sha256'] and source.stat().st_size==pin['bytes']
 original_hash=sha(source);shutil.copyfile(source,destination);destination.chmod(0o700)
 source_map[source]=destination
 provenance.append({'source':str(source),'sha256':original_hash,'bytes':source.stat().st_size,'destination':str(destination.relative_to(ROOT)),'sourceKind':'PINNED_LOCAL_POPPLER' if not source.is_relative_to(CLEAN) else 'CONDA_FORGE_ARCHIVE_SHA256_VERIFIED'})
 own=identity(source)
 for name in dependencies(source):
  if name==own:continue
  resolved=target(name)
  if resolved is not None:queue.append(resolved)
for source,destination in source_map.items():
 if source in [p.resolve() for p in seeds[:2]]:
  old=lock['poppler']['dataDir'].encode();new=str(PREFIX/'share/poppler').encode();body=destination.read_bytes();assert len(new)<=len(old) and body.count(old+b'\0')==1
  destination.write_bytes(body.replace(old+b'\0',new+b'\0'*(len(old)-len(new)+1)))
 own=identity(source)
 if own:run(['/usr/bin/install_name_tool','-id','@rpath/'+destination.name,str(destination)])
 for name in dependencies(source):
  if name==own:continue
  resolved=target(name)
  if resolved is not None:
   new=source_map[resolved];relative='@loader_path/'+('../lib/' if destination.parent.name=='bin' else '')+new.name
   run(['/usr/bin/install_name_tool','-change',name,relative,str(destination)])
 load=run(['/usr/bin/otool','-l',str(destination)])
 for rp in re.findall(r'cmd LC_RPATH\n\s*cmdsize \d+\n\s*path (.*?) \(offset',load):run(['/usr/bin/install_name_tool','-delete_rpath',rp,str(destination)])
 run(['/usr/bin/codesign','--force','--sign','-',str(destination)])
 run(['/usr/bin/codesign','--verify','--strict',str(destination)])
 for name in dependencies(destination):
  if name==identity(destination):continue
  if name.startswith('@loader_path/'):
   resolved=(destination.parent/name[len('@loader_path/'):]).resolve();assert resolved.is_relative_to(PREFIX) and resolved in source_map.values()
  elif not name.startswith(('/usr/lib/','/System/Library/')):raise RuntimeError('Unisolated load '+name)
 destination.chmod(0o500)
old_bundle=json.loads((ROOT/lock['supersededBundledPopplerIdentity']['inventory']['path']).read_text())
for entry in old_bundle['entries']:
 if entry['type']!='file':continue
 p=entry['path']
 if p.startswith('poppler/fonts/'):destination=PREFIX/'fonts'/p.removeprefix('poppler/fonts/')
 elif p.startswith('poppler/share/poppler/'):destination=PREFIX/'share/poppler'/p.removeprefix('poppler/share/poppler/')
 else:continue
 source=Path(old_bundle['root'])/p;assert source.stat().st_size==entry['bytes'] and sha(source)==entry['sha256']
 destination.parent.mkdir(parents=True,exist_ok=True,mode=0o700);shutil.copyfile(source,destination);destination.chmod(0o400)
config=Path(lock['poppler']['fontConfig']['path']).read_text().replace(lock['poppler']['fontConfig']['fontDir'],str(PREFIX/'fonts')).replace(lock['poppler']['fontConfig']['cacheDir'],str(PREFIX/'cache'))
(PREFIX/'etc/fonts/fonts.conf').write_text(config);(PREFIX/'etc/fonts/fonts.conf').chmod(0o400)
env={'PATH':'/usr/bin:/bin','LANG':'C','LC_ALL':'C','FONTCONFIG_FILE':str(PREFIX/'etc/fonts/fonts.conf'),'FONTCONFIG_PATH':str(PREFIX/'etc/fonts'),'XDG_CACHE_HOME':str(PREFIX/'cache')}
run([str(PREFIX/'bin/fc-cache'),'-f',str(PREFIX/'fonts')],env)
files=[]
for p in sorted(PREFIX.rglob('*')):
 if p.is_file():
  if p.parent.name=='cache':p.chmod(0o400)
  files.append({'path':str(p.relative_to(ROOT)),'bytes':p.stat().st_size,'sha256':sha(p),'mode':p.stat().st_mode&0o777})
for p in sorted((p for p in PREFIX.rglob('*') if p.is_dir()),key=lambda p:len(p.parts),reverse=True):p.chmod(0o500)
PREFIX.chmod(0o500)
new={'profileId':'M3-PDF-LOCAL-1','kind':'PDF','runtimeRoot':str(PREFIX.relative_to(ROOT)),'source':{'bundleVersion':'26.1011.51657','manifest':json.loads((BUNDLE.parent/'manifest.json').read_text()),'originalLockSha256':sha(ROOT/'contracts/media-tool-lock.json'),'popplerSource':lock['poppler']['sourceArtifact']},'files':files,'poppler':{'root':str(PREFIX),'binaryPins':[{'path':str(source_map[p.resolve()].relative_to(ROOT)),'bytes':source_map[p.resolve()].stat().st_size,'sha256':sha(source_map[p.resolve()])} for p in seeds[:2]],'fontConfig':{'path':str(PREFIX/'etc/fonts/fonts.conf'),'cacheDir':str(PREFIX/'cache'),'fontDir':str(PREFIX/'fonts')},'dataDir':str(PREFIX/'share/poppler'),'fixedRasterPageRecipe':lock['poppler']['fixedRasterPageRecipe']},'packages':lock['packages']}
output=ROOT/'contracts/media-pdf-local-runtime-v1.json'
with output.open('x') as fd:json.dump(new,fd,separators=(',',':'));fd.write('\n')
(EVIDENCE/'provenance.json').write_text(json.dumps({'sources':provenance,'bundleManifest':new['source']['manifest'],'globalRuntimeModified':False,'downloads':CLEAN_PROVENANCE,'localSignature':'ADHOC_AFTER_RELOCATION','runtimeManifestSha256':sha(output)},indent=2)+'\n')
print(json.dumps({'profileId':new['profileId'],'files':len(files),'nativeObjects':len(source_map),'manifestSha256':sha(output),'globalRuntimeModified':False}))
