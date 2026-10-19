#!/usr/bin/env python3
"""Read-only PINKY-TEMPLATE-ADOPTION-001 v2 package/static source checks only."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import sys

PREFLIGHT = 'docs/agent-kit/evidence/template-adoption-001-v2/preflight.json'
PREFLIGHT_SHA = '1b432eda76107f3c138b45711fabd3fd0cf0150e76934be62954ccfec4ea44b4'
LOCK = 'engineering/PINKY-TEMPLATE-ADOPTION-001-v2-LOCK.json'
CHECKER = 'engineering/agent-kit/verify-template-adoption.py'
# Canonical reviewed lock excluding checker digest breaks the self-hash cycle.
CANDIDATE_SHA = '4bb820cb48ad8da26743763045e978ab06b1be4c2477a4e0e6568049aa690cf2'
HEAD = '919ce6b8d84c8ac5ad4ce473ad6e6c2c9973d2ac'
PACKAGE_ROOTS = ('.agents', '.claude', '.codex', 'docs/agent-kit', 'engineering/agent-kit')

def sha(data):
    return hashlib.sha256(data).hexdigest()

def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()

def mirror_digest_errors(pair, cb, mb, inventory):
    errors = []
    c, m = pair['canonical'], pair['mirror']
    if cb != mb or pair.get('sha256') != sha(cb):
        errors.append('Mirror bytes/pair digest mismatch: ' + m)
    for name in (c, m):
        if inventory[name]['sha256'] != pair.get('sha256'):
            errors.append('Mirror pair/file digest mismatch: ' + name)
    if any(inventory[c].get(k) != inventory[m].get(k) for k in ('origin', 'adaptation')):
        errors.append('Mirror provenance mismatch: ' + m)
    return errors

def verify(root):
    errors = []
    def fail(message):
        errors.append(message)
    def path(name):
        if not isinstance(name, str) or not name or Path(name).is_absolute() or '..' in Path(name).parts or str(Path(name)) != name:
            raise ValueError('Out-of-scope path: ' + str(name))
        p = root / name
        for part in (p, *p.parents):
            if part == root.parent:
                break
            if part.is_symlink():
                raise ValueError('Symlink path: ' + name)
        return p
    def read(name):
        return path(name).read_bytes()
    def records(items, label):
        result = {}
        for item in items:
            name = item['path']; path(name)
            if name in result or item.get('type', 'file') != 'file':
                raise ValueError('Duplicate/non-file ' + label + ': ' + name)
            result[name] = item
        return result
    try:
        prebytes = read(PREFLIGHT)
        if sha(prebytes) != PREFLIGHT_SHA:
            raise ValueError('Frozen preflight mismatch')
        pre = json.loads(prebytes)
        lock = json.loads(read(LOCK)); checker = lock.pop('checker')
        if sha(canonical(lock)) != CANDIDATE_SHA:
            raise ValueError('Unapproved lock/candidate mismatch')
        if checker != {'path': CHECKER, 'sha256': sha(read(CHECKER))}:
            raise ValueError('Checker digest mismatch')
        if lock['baseline'] != {'path': PREFLIGHT, 'sha256': PREFLIGHT_SHA}:
            raise ValueError('Before-chain baseline mismatch')
        if lock['source'] != pre['source'] or lock['source']['headCommit'] != HEAD:
            raise ValueError('Source pin mismatch')
        if sha(read(lock['approvalReceipt']['path'])) != lock['approvalReceipt']['sha256']:
            raise ValueError('Approval receipt mismatch')
        baseline = records(pre['records'], 'baseline')
        protected = records(pre['protectedCmsSourceRecords'], 'protected CMS source')
        if len(baseline) != 183 or len(protected) != 656 or tuple(pre['packageRoots']) != PACKAGE_ROOTS:
            raise ValueError('Frozen inventory count/scope mismatch')
        amendments = records(lock['amendments'], 'amendment')
        if len(amendments) != 17 or set(amendments) != set(lock['ownedPaths']) - {LOCK, CHECKER}:
            raise ValueError('Exact candidate inventory mismatch')
        if len(lock['ownedPaths']) != 19 or len(set(lock['ownedPaths'])) != 19:
            raise ValueError('Owned path inventory mismatch')
        for name in lock['ownedPaths']:
            path(name)
        mutable = set(lock['mutableIntegrationPaths'])
        if mutable & (set(amendments) | {PREFLIGHT, LOCK, CHECKER}):
            raise ValueError('Mutable integrity overlap')
        for name in mutable:
            path(name)
        for name, item in amendments.items():
            if item['beforeSha256'] != baseline.get(name, {}).get('sha256'):
                fail('Before-chain mismatch: ' + name)
            if sha(read(name)) != item['afterSha256']:
                fail('Candidate hash mismatch: ' + name)
        for name, item in baseline.items():
            if name in mutable or name in amendments:
                continue
            if sha(read(name)) != item['sha256']:
                fail('Historical/package preservation mismatch: ' + name)
        for name, item in protected.items():
            if sha(read(name)) != item['sha256']:
                fail('Protected CMS/static source mismatch: ' + name)
        expected_paths = set(baseline) | set(lock['addedPaths']) | mutable
        for name in expected_paths:
            path(name)
        actual_paths = set()
        for folder in PACKAGE_ROOTS:
            for p in path(folder).rglob('*'):
                if p.is_symlink():
                    fail('Package symlink: ' + str(p.relative_to(root)))
                elif p.is_file():
                    actual_paths.add(str(p.relative_to(root)))
        unexpected = actual_paths - expected_paths
        if unexpected:
            fail('Unapproved package files: ' + ', '.join(sorted(unexpected)))
        # Added source is required even when absent from the frozen baseline.
        for name in lock['addedPaths']:
            read(name)
        mr = lock['effectiveManifest']; manifest_bytes = read(mr['path'])
        if sha(manifest_bytes) != mr['sha256']:
            raise ValueError('Effective manifest hash mismatch')
        manifest = json.loads(manifest_bytes)
        historical = json.loads(read('docs/agent-kit/skills-manifest.json'))
        inventory = records(manifest['files'], 'effective inventory')
        if len(inventory) != 78 or set(inventory) != {x['path'] for x in historical['files']} | set(lock['newMaintainedFiles']):
            fail('Effective maintained inventory mismatch')
        if manifest['historical_manifest'] != {'path': 'docs/agent-kit/skills-manifest.json', 'sha256': baseline['docs/agent-kit/skills-manifest.json']['sha256']}:
            fail('Historical manifest anchor mismatch')
        if manifest['adaptation_source'] != lock['adaptationSource']:
            fail('Effective source metadata mismatch')
        upstream_files = []
        for name, item in inventory.items():
            data = read(name)
            if sha(data) != item['sha256']:
                fail('Effective file hash mismatch: ' + name)
            if name in lock['preservedOrigins'] and item.get('origin') != lock['preservedOrigins'][name]:
                fail('Original provenance mismatch: ' + name)
            origin = item.get('origin', {})
            if origin.get('repository') == manifest['upstream']['repository']:
                if origin.get('commit') != manifest['upstream']['commit']:
                    fail('Original upstream commit mismatch: ' + name)
                if name.startswith('.agents/'):
                    upstream_files.append(item)
                adaptation = item.get('adaptation')
                if adaptation is None:
                    blob = hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
                    if blob != origin.get('git_blob_sha'):
                        fail('Unmarked upstream change: ' + name)
                elif not all(adaptation.get(k) for k in ('source', 'record', 'reason', 'approval', 'source_sha256')):
                    fail('Invalid adaptation metadata: ' + name)
                else:
                    read(adaptation['record']); read(adaptation['approval'])
            if name in lock['sourceMappings']:
                mapping = lock['sourceMappings'][name]
                if item.get('adaptation', {}).get('source_sha256') != mapping['sourceSha256'] or item.get('adaptation', {}).get('approval') != lock['approvalSource']:
                    fail('Current adaptation provenance mismatch: ' + name)
        adapted = sum('adaptation' in item for item in upstream_files)
        if len(upstream_files) != 26 or adapted != 6 or manifest['upstream']['unchanged_file_count'] != 20 or manifest['upstream']['adapted_file_count'] != 6:
            fail('Upstream original/adapted counts mismatch')
        pairs = manifest['mirror_pairs']
        if len(pairs) != 28 or len({p['canonical'] for p in pairs}) != 28 or len({p['mirror'] for p in pairs}) != 28:
            fail('Mirror pair inventory mismatch')
        for pair in pairs:
            c, m = pair['canonical'], pair['mirror']; cb, mb = read(c), read(m)
            errors.extend(mirror_digest_errors(pair, cb, mb, inventory))
        skills = {x['name'] for x in manifest['skills']}
        if len(skills) != 17 or manifest['native_agents'] != lock['preservedNativeAgents']:
            fail('Skill/native metadata mismatch')
        for folder in ('.agents/skills', '.claude/skills'):
            actual = {p.parent.name for p in path(folder).glob('*/SKILL.md')}
            if actual != skills:
                fail('Skill inventory mismatch: ' + folder)
            for name in skills:
                text = read(folder+'/'+name+'/SKILL.md').decode()
                fm = re.match(r'^---\n(.*?)\n---\n', text, re.S)
                if not fm or not re.search(r'^name: '+re.escape(name)+r'$',fm[1],re.M) or not re.search(r'^description: \S',fm[1],re.M):
                    fail('Skill metadata mismatch: '+folder+'/'+name)
        links = 0
        for name in amendments:
            if not name.endswith('.md'):
                continue
            for match in re.finditer(r'\[[^\]\n]*\]\(([^)\n]+)\)',read(name).decode()):
                dest = match[1].strip().strip('<>')
                if re.match(r'^[a-zA-Z][a-zA-Z0-9+.-]*:',dest):
                    continue
                local, _, anchor = dest.partition('#')
                # Markdown links may use ../ to address a sibling; resolve, then
                # re-enter the safe reader so linked symlinks cannot escape.
                target = (path(name).parent/local).absolute() if local else path(name)
                normalized = Path(os.path.normpath(target))
                if not normalized.is_relative_to(root):
                    fail('Outside local link: '+name+' -> '+dest); continue
                target = path(str(normalized.relative_to(root)))
                if not target.is_file():
                    fail('Broken local link: '+name+' -> '+dest); continue
                links += 1
                if anchor and target.suffix == '.md':
                    headings = re.findall(r'^#{1,6}\s+(.+?)\s*#*$',target.read_text(),re.M)
                    slugs = {re.sub(r'[^\w\- ]','',h.lower()).replace(' ','-') for h in headings}
                    if anchor not in slugs:
                        fail('Missing local anchor: '+name+' -> '+dest)
        if not errors:
            return {'result':'PASS','baselineRecords':183,'protectedCmsSourceRecords':656,'candidatePaths':19,'maintainedFiles':78,'mirrorPairs':28,'skillsPerRoot':17,'originalUpstreamFiles':20,'adaptedUpstreamFiles':6,'localLinks':links,'boundary':'Package/static/source only; native/CMS/data/emulator/global/production NOT_RUN'}
    except (OSError,ValueError,KeyError,TypeError,UnicodeError) as exc:
        fail(str(exc))
    return {'result':'FAIL','errors':errors}

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[2],help='Owned package fixture root, not permission for extra scans or writes')
    args = parser.parse_args(); result = verify(args.root.absolute())
    print(json.dumps(result,indent=2,ensure_ascii=False))
    sys.exit(0 if result['result']=='PASS' else 1)
