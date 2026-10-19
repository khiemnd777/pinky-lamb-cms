#!/usr/bin/env python3
"""Read-only UPDATE-006 package checks. Historical broad validators are not run."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import sys

PREFLIGHT = 'docs/agent-kit/evidence/update-006-preflight.json'
PREFLIGHT_SHA = '3adc447e15c575907c8b6f407f08d2016bb3eb0662b4d4f5d742973ee9a5392d'
LOCK = 'engineering/AGENT-KIT-UPDATE-006-LOCK.json'
# Independent candidate anchor: canonical JSON of the reviewed lock except its
# checker digest, avoiding a lock/checker self-hash cycle. Never rebaseline failures.
CANDIDATE_SHA = '69cdae6bc3f625a33c5919b03d076791de30da4e33556be0ea9dd0e792191eed'
PACKAGE_ROOTS = ('.agents', '.claude', '.codex', 'docs/agent-kit', 'engineering/agent-kit')

def sha(data):
    return hashlib.sha256(data).hexdigest()

def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()

def mirror_digest_errors(pair, canonical_bytes, mirror_bytes, inventory):
    """Pair metadata must describe both current bytes and effective file records."""
    digest = sha(canonical_bytes)
    errors = []
    if pair.get('sha256') != digest or sha(mirror_bytes) != digest:
        errors.append('Mirror pair digest mismatch: ' + pair['mirror'])
    for name in (pair['canonical'], pair['mirror']):
        if inventory[name]['sha256'] != pair.get('sha256'):
            errors.append('Mirror pair/file metadata mismatch: ' + name)
    return errors

def verify(root):
    errors = []
    def fail(message):
        errors.append(message)
    def path(name):
        p = root / name
        if Path(name).is_absolute() or '..' in Path(name).parts:
            raise ValueError('Out-of-scope path: ' + name)
        for ancestor in (p, *p.parents):
            if ancestor == root.parent:
                break
            if ancestor.is_symlink():
                raise ValueError('Symlink path: ' + name)
        return p
    def read(name):
        return path(name).read_bytes()
    try:
        prebytes = read(PREFLIGHT)
        if sha(prebytes) != PREFLIGHT_SHA:
            raise ValueError('Frozen preflight mismatch')
        pre = json.loads(prebytes)
        lock = json.loads(read(LOCK))
        checker = lock.pop('checker')
        if sha(canonical(lock)) != CANDIDATE_SHA:
            raise ValueError('Unapproved lock/candidate mismatch')
        if checker != {'path': 'engineering/agent-kit/verify-proportionate-update.py',
                       'sha256': sha(read('engineering/agent-kit/verify-proportionate-update.py'))}:
            raise ValueError('Checker digest mismatch')
        if lock['baseline'] != {'path': PREFLIGHT, 'sha256': PREFLIGHT_SHA}:
            raise ValueError('Before-chain baseline mismatch')
        baseline = {item['path']: item['sha256'] for item in pre['records']}
        amendments = {item['path']: item for item in lock['amendments']}
        if len(amendments) != 17 or len(amendments) != len(lock['amendments']):
            raise ValueError('Amendment inventory mismatch')
        for name, item in amendments.items():
            if item['beforeSha256'] != baseline.get(name):
                fail('Before-chain mismatch: ' + name)
        mutable = set(lock['mutableIntegrationPaths'])
        for name, expected in baseline.items():
            if name in mutable:
                continue
            expected = amendments.get(name, {}).get('afterSha256', expected)
            if sha(read(name)) != expected:
                fail('Package/preservation hash mismatch: ' + name)
        expected_paths = set(baseline) | set(lock['addedPaths'])
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
        manifest_record = lock['effectiveManifest']
        manifest_bytes = read(manifest_record['path'])
        if sha(manifest_bytes) != manifest_record['sha256']:
            raise ValueError('Effective manifest hash mismatch')
        manifest = json.loads(manifest_bytes)
        historical = json.loads(read('docs/agent-kit/skills-manifest.json'))
        inventory = {item['path']: item for item in manifest['files']}
        if len(inventory) != len(manifest['files']) or set(inventory) != {item['path'] for item in historical['files']}:
            fail('Effective inventory differs from approved historical package')
        if manifest['historical_manifest']['sha256'] != baseline['docs/agent-kit/skills-manifest.json']:
            fail('Historical manifest anchor mismatch')
        upstream_files = []
        for name, item in inventory.items():
            content = read(name)
            if sha(content) != item['sha256']:
                fail('Effective file hash mismatch: ' + name)
            origin = item.get('origin', {})
            if origin.get('repository') == manifest['upstream']['repository']:
                if origin.get('commit') != manifest['upstream']['commit']:
                    fail('Upstream commit mismatch: ' + name)
                if name.startswith('.agents/'):
                    upstream_files.append(item)
                adaptation = item.get('adaptation')
                if adaptation is None:
                    blob = hashlib.sha1(b'blob ' + str(len(content)).encode() + b'\0' + content).hexdigest()
                    if blob != origin.get('git_blob_sha'):
                        fail('Unmarked upstream change: ' + name)
                elif not all(adaptation.get(key) for key in ('source', 'record', 'reason', 'approval', 'source_sha256')):
                    fail('Invalid adaptation metadata: ' + name)
                else:
                    read(adaptation['record'])
                    read(adaptation['approval'])
        adapted = sum('adaptation' in item for item in upstream_files)
        if len(upstream_files) != 26 or adapted != 4 or manifest['upstream']['unchanged_file_count'] != 22:
            fail('Upstream original/adapted counts mismatch')
        for pair in manifest['mirror_pairs']:
            c, m = pair['canonical'], pair['mirror']
            canonical_bytes, mirror_bytes = read(c), read(m)
            if canonical_bytes != mirror_bytes:
                fail('Mirror bytes mismatch: ' + m)
            errors.extend(mirror_digest_errors(pair, canonical_bytes, mirror_bytes, inventory))
            if any(inventory[c].get(k) != inventory[m].get(k) for k in ('origin', 'adaptation')):
                fail('Mirror provenance mismatch: ' + m)
        skills = {item['name'] for item in manifest['skills']}
        for folder in ('.agents/skills', '.claude/skills'):
            actual = {p.parent.name for p in path(folder).glob('*/SKILL.md')}
            if actual != skills or len(actual) != 17:
                fail('Skill inventory mismatch: ' + folder)
            for name in skills:
                text = read(folder + '/' + name + '/SKILL.md').decode()
                frontmatter = re.match(r'^---\n(.*?)\n---\n', text, re.S)
                if not frontmatter or not re.search(r'^name: '+re.escape(name)+r'$', frontmatter[1], re.M) or not re.search(r'^description: \S', frontmatter[1], re.M):
                    fail('Skill metadata mismatch: ' + folder + '/' + name)
        links = 0
        for name in amendments:
            if not name.endswith('.md'):
                continue
            text = read(name).decode()
            for match in re.finditer(r'\[[^\]\n]*\]\(([^)\n]+)\)', text):
                destination = match[1].strip().strip('<>')
                if re.match(r'^[a-zA-Z][a-zA-Z0-9+.-]*:', destination):
                    continue
                local, _, anchor = destination.partition('#')
                target = (path(name).parent / local).resolve() if local else path(name)
                if not target.is_relative_to(root) or not target.is_file():
                    fail('Broken/outside local link: ' + name + ' -> ' + destination)
                    continue
                links += 1
                if anchor and target.suffix == '.md':
                    headings = re.findall(r'^#{1,6}\s+(.+?)\s*#*$', target.read_text(), re.M)
                    slugs = {re.sub(r'[^\w\- ]', '', h.lower()).replace(' ', '-') for h in headings}
                    if anchor not in slugs:
                        fail('Missing local anchor: ' + name + ' -> ' + destination)
        if not errors:
            return {'result': 'PASS', 'baselineRecords': len(baseline), 'amendments': len(amendments),
                    'maintainedFiles': len(inventory), 'mirrorPairs': len(manifest['mirror_pairs']),
                    'skillsPerRoot': 17, 'originalUpstreamFiles': 22, 'adaptedUpstreamFiles': 4,
                    'localLinks': links, 'boundary': 'Package/static only; CMS/runtime/emulator/global/native/production NOT_RUN'}
    except (OSError, ValueError, KeyError, TypeError) as exc:
        fail(str(exc))
    return {'result': 'FAIL', 'errors': errors}

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[2],
                        help='Owned package fixture root; does not authorize writes or extra scans')
    args = parser.parse_args()
    result = verify(args.root.resolve())
    print(json.dumps(result, indent=2, ensure_ascii=False))
    sys.exit(0 if result['result'] == 'PASS' else 1)
