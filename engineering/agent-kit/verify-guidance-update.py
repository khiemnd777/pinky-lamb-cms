#!/usr/bin/env python3
"""Read-only verification of the approved guidance amendment and current baseline.

No upstream recipes, native clients, applications or historical verifiers execute.
Symlink records are compared with readlink; their targets are never read.
"""
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import subprocess
import tomllib
from urllib.parse import unquote

ROOT = Path(__file__).absolute().parents[2]
LOCK = 'engineering/AGENT-KIT-UPDATE-004-LOCK.json'
BASELINE = 'docs/agent-kit/evidence/update-004-preflight.json'
BASELINE_SHA = 'c32abb32bf09309e6cd81dc626ccfb0cacc75bdf425522d852bf72362cc26748'
OWNED = frozenset('docs/agent-kit/' + name for name in (
    'technote.md', 'team-policy.md', 'team-workflow.md',
    'agent-coordination-templates.md', 'skills-catalog.md',
    'roles/coordinator.md', 'roles/explorer.md', 'roles/implementer.md',
    'roles/reviewer.md', 'verification-guide.md'))
MUTABLE = frozenset('docs/agent-kit/' + name for name in (
    'project-context.md', 'project-plan.md', 'project-state.md', 'verification-results.md'))
HEAD = '51b1c810a9920be7fe3957ce454fc25fedf7b155'
BASE = '22c2a20359072dcb510f3329b97161b16f947fb2'
SHA = re.compile(r'[0-9a-f]{64}')
# Fixed after-hashes independently reviewed by the root; the amendment cannot
# authorize a replacement merely by changing its own toSha256 field.
GUIDANCE_AFTER = {'docs/agent-kit/technote.md': 'd3542a879731337333bb5482e239ca5c98bf82e4777e0566902aa1f95c1ff80e', 'docs/agent-kit/team-policy.md': 'eb099b185d4b0273f0a07a62a38a5510c62257149dd467e6b3156ecb9e86e7cb', 'docs/agent-kit/team-workflow.md': '3e71af13a3e3c5150dcb089ded5c2115c82127faa7326d299efad9828b8d14e4', 'docs/agent-kit/agent-coordination-templates.md': 'ce547974c6911c0d7f51ae9005fe41a00df0447880676646f1eea2f6ef38b652', 'docs/agent-kit/skills-catalog.md': '5aae58c5e8453a463071b5c078e20d47a11377b964cecc6a2015fb85959f91b3', 'docs/agent-kit/roles/coordinator.md': '8fe07bdee0e75b8f227266b5b49cdda727dff9e66bd5b2689f4bba31dddcd222', 'docs/agent-kit/roles/explorer.md': 'ea503477bd5b2ef3982de5ecced8ccd0d64f2cde7eb1ab135ada92d8e22aad90', 'docs/agent-kit/roles/implementer.md': '5d8c6a30bff0472830231f606aa69d08b9b2b819e158d7e8e295cab86cb42d40', 'docs/agent-kit/roles/reviewer.md': '2751a2920f6c80b5985060e885358ba9358fbd21b567bd67c15822a7b7a10755', 'docs/agent-kit/verification-guide.md': '4cabd27549c0f1aade8cd7afc1a12c00253b76e82c2a33796a86b1c25677ca59'}
PACKAGE_ROOTS = ('.agents/', '.claude/', '.codex/', 'docs/agent-kit/', 'engineering/agent-kit/')
NEW_PACKAGE_FILES = frozenset({
    'docs/agent-kit/tasks/AGENT-KIT-UPDATE-004.md',
    'docs/agent-kit/evidence/update-004-preflight.json',
    'engineering/agent-kit/verify-guidance-update.py',
})
OPTIONAL_FINAL_RECEIPT = 'docs/agent-kit/evidence/update-004-results.json'


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def relative(value):
    require(isinstance(value, str) and value and '\\' not in value,
            'Invalid relative path')
    p = PurePosixPath(value)
    require(not p.is_absolute() and p.as_posix() == value
            and all(x not in {'.', '..', '.git'} for x in p.parts),
            'Unsafe/noncanonical path: ' + value)
    return p


def safe_path(value, final_symlink=False):
    p = relative(value)
    q = ROOT
    for index, part in enumerate(p.parts):
        q = q / part
        mode = q.lstat().st_mode
        last = index == len(p.parts) - 1
        require(not stat.S_ISLNK(mode) or (last and final_symlink),
                'Symlink traversal rejected: ' + value)
        if not last:
            require(stat.S_ISDIR(mode), 'Non-directory ancestor: ' + value)
    return q


def read(value):
    q = safe_path(value)
    require(stat.S_ISREG(q.lstat().st_mode), 'Non-regular file: ' + value)
    # O_NOFOLLOW prevents a final-component link substitution during open.
    fd = os.open(q, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        require(stat.S_ISREG(os.fstat(fd).st_mode), 'Non-regular opened file: ' + value)
        with os.fdopen(fd, 'rb', closefd=False) as stream:
            return stream.read()
    finally:
        os.close(fd)


def checked_sha(value):
    require(isinstance(value, str) and SHA.fullmatch(value), 'Malformed SHA-256')
    return value


def check_hash(path, expected):
    require(digest(read(path)) == checked_sha(expected), 'Hash mismatch: ' + path)


def validate_amendments(items, before):
    require(isinstance(items, list) and len(items) == 10, 'Exactly ten amendments required')
    result = {}
    for item in items:
        require(isinstance(item, dict) and set(item) == {'path', 'fromSha256', 'toSha256'},
                'Malformed amendment')
        path = relative(item['path']).as_posix()
        require(path in OWNED and path not in result, 'Unapproved/duplicate amendment: ' + path)
        require(checked_sha(item['fromSha256']) == before[path], 'Wrong preflight fromHash: ' + path)
        checked_sha(item['toSha256'])
        require(item['toSha256'] == GUIDANCE_AFTER[path], 'Unreviewed guidance afterHash: ' + path)
        require(item['fromSha256'] != item['toSha256'], 'Empty amendment: ' + path)
        result[path] = item
    require(set(result) == OWNED, 'Amendment allowlist differs')
    return result


def typed_records(records):
    require(isinstance(records, list), 'Malformed typed preservation records')
    seen = set()
    for record in records:
        require(isinstance(record, dict), 'Malformed typed record')
        path = relative(record['path']).as_posix()
        require(path not in seen, 'Duplicate preservation record: ' + path)
        seen.add(path)
        kind = record['type']
        require(kind in {'file', 'directory', 'symlink'}, 'Unsupported protected type: ' + path)
        expected_keys = {'path', 'mode', 'type'} | ({'bytes', 'sha256'} if kind == 'file'
                        else {'target', 'sha256'} if kind == 'symlink' else set())
        require(set(record) == expected_keys, 'Malformed typed fields: ' + path)
        require(re.fullmatch(r'0o[0-7]{3,4}', record['mode']), 'Invalid mode: ' + path)
        q = safe_path(path, final_symlink=kind == 'symlink')
        s = q.lstat()
        actual = 'symlink' if stat.S_ISLNK(s.st_mode) else 'directory' if stat.S_ISDIR(s.st_mode) else 'file' if stat.S_ISREG(s.st_mode) else 'special'
        require(kind == actual and oct(stat.S_IMODE(s.st_mode)) == record['mode'],
                'Protected type/mode differs: ' + path)
        if kind == 'file':
            require(type(record['bytes']) is int and record['bytes'] >= 0, 'Invalid file size')
            require(s.st_size == record['bytes'], 'Protected size differs: ' + path)
            check_hash(path, record['sha256'])
        elif kind == 'symlink':
            require(isinstance(record['target'], str), 'Invalid symlink target')
            target = os.readlink(q)
            require(target == record['target'] and digest(os.fsencode(target)) == checked_sha(record['sha256']),
                    'Protected symlink differs: ' + path)
    return len(seen)


def walk_files(folder):
    directory = safe_path(folder)
    require(directory.is_dir(), 'Missing inventory directory: ' + folder)
    found = set()
    for base, dirs, files in os.walk(directory, followlinks=False):
        for name in dirs + files:
            q = Path(base) / name
            require(stat.S_ISDIR(q.lstat().st_mode) or stat.S_ISREG(q.lstat().st_mode),
                    'Unsafe package type: ' + q.relative_to(ROOT).as_posix())
        found.update((Path(base) / name).relative_to(ROOT).as_posix() for name in files)
    return found



def validate_package_inventory(actual, baseline):
    require(isinstance(actual, set), 'Package inventory must be a set')
    original = {path for group in ('protectedHashes', 'guidanceBeforeHashes')
                for path in baseline[group] if path.startswith(PACKAGE_ROOTS)}
    mandatory = original | NEW_PACKAGE_FILES
    allowed = mandatory | {OPTIONAL_FINAL_RECEIPT}
    require(mandatory <= actual, 'Missing base/mandatory package files: ' + ', '.join(sorted(mandatory - actual)))
    require(actual <= allowed, 'Unapproved package files: ' + ', '.join(sorted(actual - allowed)))
    return len(actual)


def yaml_parse(text):
    process = subprocess.run(['ruby', '-rpsych', '-rjson', '-e',
        'puts JSON.generate(Psych.safe_load(STDIN.read, permitted_classes: [], permitted_symbols: [], aliases: false))'],
        input=text, text=True, capture_output=True, timeout=30)
    require(process.returncode == 0, 'YAML parsing failed')
    data = json.loads(process.stdout)
    require(isinstance(data, dict), 'YAML mapping required')
    return data


def frontmatter(path):
    parts = read(path).decode('utf-8').split('---', 2)
    require(len(parts) == 3 and not parts[0].strip(), 'Missing YAML frontmatter: ' + path)
    return yaml_parse(parts[1])


def links(paths):
    count = 0
    for path in sorted(paths):
        text = re.sub(r'```.*?```', '', read(path).decode('utf-8'), flags=re.S)
        for target in re.findall(r'\]\(([^)\s]+)(?:\s+"[^"]*")?\)', text):
            if re.match(r'^[a-zA-Z][a-zA-Z0-9+.-]*:', target):
                continue
            file, _, anchor = unquote(target).partition('#')
            # Normalize relative Markdown paths without following filesystem links.
            parts = list(PurePosixPath(path).parent.parts)
            if file:
                require(not file.startswith('/'), 'Absolute Markdown link: ' + path)
                for part in file.split('/'):
                    if part == '..':
                        require(parts, 'Escaping Markdown link: ' + path)
                        parts.pop()
                    elif part not in {'', '.'}:
                        parts.append(part)
                destination = '/'.join(parts)
            else:
                destination = path
            safe_path(destination)
            if anchor and destination.endswith('.md'):
                headings = re.findall(r'^#{1,6}\s+(.+)$', read(destination).decode('utf-8'), re.M)
                anchors = {re.sub(r'[^\w\- ]', '', x.lower()).replace(' ', '-') for x in headings}
                require(anchor in anchors, 'Missing Markdown anchor: ' + path + ' -> ' + target)
            count += 1
    return count


def main():
    check_hash(BASELINE, BASELINE_SHA)
    baseline = json.loads(read(BASELINE))
    amendment = json.loads(read(LOCK))
    require(set(amendment) == {'schemaVersion', 'task', 'approvalSource', 'baseFiles', 'baseline',
            'source', 'amendments', 'checker', 'evidenceBoundary'}, 'Unexpected amendment lock fields')
    require(amendment['schemaVersion'] == 1 and amendment['task'] == 'AGENT-KIT-UPDATE-004 v1', 'Wrong amendment task/schema')
    require(amendment['approvalSource'] == 'docs/agent-kit/tasks/AGENT-KIT-UPDATE-004.md', 'Wrong approval source')
    require(amendment['baseline'] == {'path': BASELINE, 'sha256': BASELINE_SHA}, 'Wrong current baseline pin')
    base_files = {'engineering/AGENT-KIT-LOCK.json', 'engineering/SKILLS-LOCK.json',
                  'docs/agent-kit/skills-manifest.json', 'docs/agent-kit/evidence/verify-setup.py'}
    require(set(amendment['baseFiles']) == base_files, 'Unexpected base package pin')
    for path, expected in amendment['baseFiles'].items():
        require(expected == baseline['protectedHashes'][path], 'Wrong original package hash: ' + path)
        check_hash(path, expected)
    source = amendment['source']
    require(source['baseCommit'] == BASE and source['headCommit'] == HEAD
            and source['repository'] == 'https://github.com/khiemnd777/agent-kit', 'Wrong approved source pin')
    require(len(source['fetchedFiles']) == 14 and source['gitBlobVerification'] == 'PASS_14_UTF8_GIT_BLOBS', 'Wrong fetched provenance')
    require(len({x['path'] for x in source['fetchedFiles']}) == 14, 'Duplicate upstream provenance')
    for item in source['fetchedFiles']:
        relative(item['path']); checked_sha(item['contentSha256'])
        require(re.fullmatch(r'[0-9a-f]{40}', item['gitBlobSha']), 'Malformed git blob SHA')
    require(amendment['checker']['path'] == 'engineering/agent-kit/verify-guidance-update.py', 'Unexpected checker path')
    check_hash(amendment['checker']['path'], amendment['checker']['sha256'])
    overrides = validate_amendments(amendment['amendments'], baseline['guidanceBeforeHashes'])
    for path, item in overrides.items():
        check_hash(path, item['toSha256'])
    for path, expected in baseline['protectedHashes'].items():
        require(path not in OWNED, 'Protected/amended overlap')
        check_hash(path, expected)
    for path, expected in baseline['guidanceBeforeHashes'].items():
        if path not in OWNED | MUTABLE:
            check_hash(path, expected)
    manifest = json.loads(read('docs/agent-kit/skills-manifest.json'))
    original = json.loads(read('engineering/AGENT-KIT-LOCK.json'))
    require(set(original['mutableDestinationPaths']) == MUTABLE, 'Original mutable allowlist differs')

    def package_hash(path, expected):
        checked_sha(expected)
        if path in overrides:
            require(expected == overrides[path]['fromSha256'], 'Amendment does not match original digest: ' + path)
            expected = overrides[path]['toSha256']
        check_hash(path, expected)

    for item in manifest['files']:
        package_hash(item['path'], item['sha256'])
    for item in original['destinationFiles']:
        package_hash(item['path'], item['sha256'])
    upstream_count = 0
    for item in original['sourceFiles']:
        path = item.get('destination')
        if item.get('mutableDestination'):
            require(path in MUTABLE and item.get('destinationSnapshotObservedAtUtc'), 'Unapproved mutable destination')
        if path and path not in MUTABLE:
            package_hash(path, item['destinationSha256'])
        if path and item['classification'] == 'original' and path.startswith(('.agents/', '.claude/')):
            check_hash(path, item['sourceSha256']); upstream_count += 1
    for pair in manifest['mirror_pairs']:
        require(read(pair['canonical']) == read(pair['mirror']), 'Mirror bytes differ')
    names = {x['name'] for x in manifest['skills']}
    require(len(names) == 17, 'Expected seventeen logical skills')
    package_files = set()
    for folder in ('.agents', '.claude', '.codex', 'docs/agent-kit', 'engineering/agent-kit'):
        package_files.update(walk_files(folder))
    validate_package_inventory(package_files, baseline)
    for folder in ('.agents/skills', '.claude/skills'):
        entries = {p for p in package_files if p.startswith(folder + '/') and p.endswith('/SKILL.md')}
        require({PurePosixPath(p).parent.name for p in entries} == names and len(entries) == 17, 'Skill inventory differs')
        for path in entries:
            fields = frontmatter(path)
            require(fields.get('name') == PurePosixPath(path).parent.name
                    and re.fullmatch(r'[a-z0-9-]{1,64}', fields['name'])
                    and isinstance(fields.get('description'), str) and fields['description'].strip(), 'Invalid skill metadata: ' + path)
    roles = {'kit-explorer', 'kit-implementer', 'kit-reviewer'}
    require({PurePosixPath(p).stem for p in package_files if p.startswith('.codex/agents/') and p.endswith('.toml')} == roles, 'Codex agent inventory differs')
    require({PurePosixPath(p).stem for p in package_files if p.startswith('.claude/agents/') and p.endswith('.md')} == roles, 'Claude agent inventory differs')
    for role in roles:
        codex = tomllib.loads(read('.codex/agents/' + role + '.toml').decode('utf-8'))
        require(all(codex.get(x) for x in ('name', 'description', 'developer_instructions')), 'Missing Codex metadata')
        require(codex['name'] == role and codex['model'] == 'gpt-6.1-sol'
                and codex['model_reasoning_effort'] == ('medium' if role == 'kit-implementer' else 'high'), 'Codex route differs')
        if role != 'kit-implementer':
            require(codex.get('sandbox_mode') == 'read-only', 'Read-only sandbox differs')
        claude = frontmatter('.claude/agents/' + role + '.md')
        require(claude.get('name') == role and claude.get('description') and claude.get('model') == 'inherit', 'Claude metadata differs')
        if role != 'kit-implementer':
            require(claude.get('tools') == 'Read, Glob, Grep', 'Claude read-only tools differ')
    link_count = links({p for p in package_files if p.endswith('.md') and '/evidence/' not in p}
                       | {'AGENTS.md', 'CLAUDE.md'})
    preserved = {key: typed_records(baseline[key]) for key in (
        'currentSourceRecords', 'currentEmulatorRecords', 'currentCmsSourceFiles')}
    # The global file is hashed only; never parsed or printed. No config bytes enter output.
    config = Path.home() / '.codex/config.toml'
    for ancestor in (Path.home(), Path.home() / '.codex', config):
        require(not stat.S_ISLNK(ancestor.lstat().st_mode), 'Global config symlink rejected')
    fd = os.open(config, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        s = os.fstat(fd)
        require(stat.S_ISREG(s.st_mode), 'Global config must be regular')
        with os.fdopen(fd, 'rb', closefd=False) as stream:
            config_hash = digest(stream.read())
        global_preserved = (config_hash == baseline['globalConfigSha256']
                            and oct(stat.S_IMODE(s.st_mode)) == baseline['globalConfigMode'])
    finally:
        os.close(fd)
    # Recompute the same filtered CURRENT CMS inventory; no source additions are allowed.
    cms_paths = set()
    excluded = {'node_modules', '.local', 'dist', 'coverage', '.git'}
    for folder in ('pinky-lamb-cms', 'infra-local'):
        try:
            directory = safe_path(folder)
        except FileNotFoundError:
            # Match baseline os.walk behavior for an absent root; typed records
            # above already reject deletion of any previously recorded file.
            continue
        for base, dirs, files in os.walk(directory, followlinks=False):
            dirs[:] = sorted(name for name in dirs if name not in excluded)
            for name in sorted(files):
                cms_paths.add((Path(base) / name).relative_to(ROOT).as_posix())
    require(cms_paths == {x['path'] for x in baseline['currentCmsSourceFiles']},
            'Current CMS source inventory differs')
    emulator_expected = {x['path'] for x in baseline['currentEmulatorRecords']}
    emulator_roots = [p for p in emulator_expected if not any(
        parent.as_posix() in emulator_expected for parent in PurePosixPath(p).parents)]
    emulator_actual = set(emulator_roots)
    for folder in emulator_roots:
        directory = safe_path(folder)
        for base, dirs, files in os.walk(directory, followlinks=False):
            for name in dirs + files:
                emulator_actual.add((Path(base) / name).relative_to(ROOT).as_posix())
    require(emulator_actual == emulator_expected, 'Current emulator inventory differs')
    closure = json.loads(read('docs/agent-kit/evidence/permission-003-20261013-closure.json'))
    require(closure['state'] == 'CLOSED' and closure['childWriteAttempts'] == {
        'kit-explorer': 'NOT_RUN_HIGHER_PRIORITY_ROLE_CONSTRAINT',
        'kit-reviewer': 'NOT_RUN_HIGHER_PRIORITY_ROLE_CONSTRAINT'}, 'Authoritative closure differs')
    require(baseline['closureState'] == 'CLOSED'
            and baseline['childWriteAttempts'] == 'NOT_RUN_HIGHER_PRIORITY_ROLE_CONSTRAINT', 'Current closure baseline differs')
    # Protected hashes preserve the full authoritative closure receipt and task.
    task = read('docs/agent-kit/tasks/AGENT-PERMISSION-003.md').decode('utf-8')
    require('CLOSED' in task and 'NOT_RUN_HIGHER_PRIORITY_ROLE_CONSTRAINT' in task, 'Permission closure missing')
    require(baseline['historicalStaticPreflight']['status'] == 'FAIL_PREEXISTING_SOURCE_SNAPSHOT_DIFFERENCES'
            and len(baseline['preExistingHistoricalSourceDifferences']) == 8, 'Historical FAIL must remain')
    print(json.dumps({'status': 'PASS' if global_preserved else 'FAIL',
        'errors': [] if global_preserved else ['Current global config hash/mode differs'],
        'approvedGuidanceAmendments': len(overrides),
        'manifestHashes': len(manifest['files']), 'destinationHashes': len(original['destinationFiles']),
        'protectedHashes': len(baseline['protectedHashes']), 'exactPackageFiles': len(package_files), 'skillCounts': [17, 17],
        'mirrorPairs': len(manifest['mirror_pairs']), 'adaptersParsed': 6,
        'unchangedOriginalEngineeringMirrorFiles': upstream_count, 'markdownLinksChecked': link_count,
        **preserved, 'globalConfig': 'CURRENT_HASH_MODE_PRESERVED' if global_preserved else 'FAIL_CURRENT_BASELINE_DIFFERS',
        'permissionTask': 'CLOSED', 'childWriteAttempts': 'NOT_RUN_HIGHER_PRIORITY_ROLE_CONSTRAINT',
        'historicalStaticPreflight': baseline['historicalStaticPreflight']['status'],
        'preExistingCmsDifferences': 8, 'nativeScenarios': 'NOT_RUN', 'runtimeRoute': 'UNKNOWN_UNOBSERVED'}))
    if not global_preserved:
        raise SystemExit(1)


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, KeyError, TypeError, json.JSONDecodeError, subprocess.SubprocessError) as error:
        print(json.dumps({'status': 'FAIL', 'error': str(error)}))
        raise SystemExit(1)
