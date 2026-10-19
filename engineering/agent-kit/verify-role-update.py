#!/usr/bin/env python3
"""Read-only base → UPDATE-004 → UPDATE-005 integrity and CURRENT preservation.

Reuse only hash-pinned historical helper functions, never historical main/checks.
No native client, application, upstream recipe or permission fixture executes.
"""
import hashlib
import json
import os
from pathlib import Path
import stat
import tomllib

ROOT = Path(__file__).absolute().parents[2]
HELPER = 'engineering/agent-kit/verify-guidance-update.py'
HELPER_SHA = '69a6bf8cf4954b994f7e485bfbdc30d549b18f958456e93cff20657b6169d190'
BASELINE = 'docs/agent-kit/evidence/update-005-preflight.json'
BASELINE_SHA = 'ab007b17ead33c66a1e309b554fd27fc93abe3222c63781ddc5c74700297e280'
LOCK = 'engineering/AGENT-KIT-UPDATE-005-LOCK.json'
PACKAGE_ROOTS = ('.agents/', '.claude/', '.codex/', 'docs/agent-kit/', 'engineering/agent-kit/')
MUTABLE = frozenset('docs/agent-kit/' + name for name in (
    'project-context.md', 'project-plan.md', 'project-state.md', 'verification-results.md'))
NEW_FILES = frozenset({
    'docs/agent-kit/tasks/AGENT-KIT-UPDATE-005.md',
    'docs/agent-kit/evidence/update-005-preflight.json',
    'engineering/agent-kit/verify-role-update.py'})
OPTIONAL_RECEIPT = 'docs/agent-kit/evidence/update-005-results.json'
# AFTER_HASHES is a fixed candidate anchor reviewed independently by root.
AFTER_HASHES = {
    ".claude/agents/kit-explorer.md": "8e80a38f893020cf12fe0c0b709c7d9d22c474af250a89a6398dccc2b70d141a",
    ".claude/agents/kit-reviewer.md": "bed4a31fa817e0f11286e4d5a313c9b18b996931235268b342b4c1f4780ff60e",
    ".codex/agents/kit-explorer.toml": "bf9999b74d053d03de528eb4aafa9067603d77f85eeb52227398710e85666fdd",
    ".codex/agents/kit-reviewer.toml": "66e55e7be64e5e6f1ec233680cf9df4cd0e5d9a52c64a25d7a79c4e220895f53",
    "docs/agent-kit/team-policy.md": "763b198c109b1ccea1d687e2f0b2c30689e08dac2967f459e7508ee18665e1e3",
    "docs/agent-kit/agent-coordination-templates.md": "2b11ac4f30a1aaa29453083d986f1c74a01a8cdb64225bdda5c4daddb97f0082",
    "docs/agent-kit/roles/explorer.md": "5a37196f9aa95ffbd554115c3aabbd979c785eb59ba011e8541ad0817af8fdee",
    "docs/agent-kit/roles/reviewer.md": "c046dcc66faa52747cc4367a2600dea4877f28f7c20a86edfb1a5b01a976e16f",
    "docs/agent-kit/model-routing.md": "ef6720e8654c15b64e06b7b957128be5c0bcf6cd05399df82026541a7df2c6eb",
    "docs/agent-kit/agent-compatibility.md": "6484c7d7f82a83a565267bc7716b3a9b9965a2da56da710044ce54c060397da7",
    "docs/agent-kit/verification-guide.md": "71722244561d932be2ff2f9caf2483d5c1951a2f417717e1c9bbce19a13d035e",
    "AGENTS.md": "05c8979147391b5a4cf9da0f8a0ebf7a51b0052e5be82ec7b7a059e44cad2541"
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def load_helpers():
    path = ROOT / HELPER
    for q in (ROOT, ROOT / 'engineering', path.parent, path):
        require(not q.is_symlink(), 'Unsafe historical helper path')
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        require(stat.S_ISREG(os.fstat(fd).st_mode), 'Historical helper is not regular')
        with os.fdopen(fd, 'rb', closefd=False) as stream:
            data = stream.read()
    finally:
        os.close(fd)
    require(hashlib.sha256(data).hexdigest() == HELPER_SHA, 'Historical helper digest differs')
    # Execute exactly the bytes just hashed; __name__ avoids running main.
    namespace = {'__name__': 'pinned_update004_helpers', '__file__': str(path)}
    exec(compile(data, str(path), 'exec'), namespace)
    return namespace


H = load_helpers()
read = H['read']
check_hash = H['check_hash']
relative = H['relative']
checked_sha = H['checked_sha']


def validate_amendments(items, before):
    require(isinstance(items, list) and len(items) == 12, 'Exactly twelve amendments required')
    result = {}
    for item in items:
        require(isinstance(item, dict) and set(item) == {'path', 'fromSha256', 'toSha256'}, 'Malformed amendment')
        path = relative(item['path']).as_posix()
        require(path in AFTER_HASHES and path not in result, 'Unapproved/duplicate amendment: ' + path)
        require(checked_sha(item['fromSha256']) == before[path], 'Wrong CURRENT fromHash: ' + path)
        require(checked_sha(item['toSha256']) == AFTER_HASHES[path], 'Unreviewed afterHash: ' + path)
        require(item['fromSha256'] != item['toSha256'], 'Empty amendment: ' + path)
        result[path] = item
    require(set(result) == set(AFTER_HASHES), 'Amendment allowlist differs')
    return result


def validate_inventory(actual, baseline):
    expected = {x['path'] for x in baseline['packageRecords']} | NEW_FILES
    require(expected <= actual, 'Missing package files: ' + ', '.join(sorted(expected - actual)))
    require(actual <= expected | {OPTIONAL_RECEIPT}, 'Unapproved package files: ' + ', '.join(sorted(actual - expected - {OPTIONAL_RECEIPT})))
    return len(actual)


def validate_codex(fields, role):
    require(set(fields) == {'name', 'description', 'model', 'model_reasoning_effort', 'developer_instructions'}, 'Codex fields/permission override differ: ' + role)
    require(fields['name'] == role and fields['description'] and fields['developer_instructions'], 'Codex required metadata differs')
    require(fields['model'] == 'gpt-6.1-sol' and fields['model_reasoning_effort'] == ('medium' if role == 'kit-implementer' else 'high'), 'Codex project route differs')


def validate_claude(fields, role):
    require(set(fields) == {'name', 'description', 'model'}, 'Claude fields/tool/permission override differ: ' + role)
    require(fields['name'] == role and fields['description'] and fields['model'] == 'inherit', 'Claude metadata/route differs')


def records_with_amendments(records, amendments):
    count = 0
    for record in records:
        path = record['path']
        if path in amendments or path in MUTABLE:
            q = H['safe_path'](path)
            s = q.lstat()
            require(record['type'] == 'file' and stat.S_ISREG(s.st_mode)
                    and oct(stat.S_IMODE(s.st_mode)) == record['mode'], 'Amended/mutable type/mode differs: ' + path)
            if path in amendments:
                check_hash(path, amendments[path]['toSha256'])
        else:
            H['typed_records']([record])
        count += 1
    return count


def current_inventories(baseline):
    actual = set()
    excluded = {'node_modules', '.local', 'dist', 'coverage', '.git'}
    for folder in ('pinky-lamb-cms', 'infra-local'):
        try:
            directory = H['safe_path'](folder)
        except FileNotFoundError:
            continue
        for base, dirs, files in os.walk(directory, followlinks=False):
            dirs[:] = sorted(n for n in dirs if n not in excluded)
            actual.update((Path(base) / n).relative_to(ROOT).as_posix() for n in files)
    require(actual == {x['path'] for x in baseline['currentCmsSourceFiles']}, 'CURRENT CMS inventory differs')
    expected = {x['path'] for x in baseline['currentEmulatorRecords']}
    roots = [p for p in expected if not any(parent.as_posix() in expected for parent in Path(p).parents)]
    actual = set(roots)
    for folder in roots:
        for base, dirs, files in os.walk(H['safe_path'](folder), followlinks=False):
            actual.update((Path(base) / n).relative_to(ROOT).as_posix() for n in dirs + files)
    require(actual == expected, 'CURRENT emulator inventory differs')


def main():
    check_hash(BASELINE, BASELINE_SHA)
    baseline = json.loads(read(BASELINE))
    lock = json.loads(read(LOCK))
    require(set(lock) == {'schemaVersion', 'task', 'approvalSource', 'baseline', 'source', 'amendments', 'checker', 'historicalBoundary'}, 'Unexpected lock fields')
    require(lock['schemaVersion'] == 1 and lock['task'] == 'AGENT-KIT-UPDATE-005 v1', 'Wrong task/schema')
    require(lock['approvalSource'] == 'docs/agent-kit/tasks/AGENT-KIT-UPDATE-005.md', 'Wrong approval source')
    require(lock['baseline'] == {'path': BASELINE, 'sha256': BASELINE_SHA}, 'Wrong baseline pin')
    require(lock['source'] == {'repository': 'https://github.com/khiemnd777/agent-kit', 'baseCommit': baseline['sourceBase'], 'headCommit': baseline['sourceHead'], 'fetchedPayloadSha256': baseline['fetchedPayloadSha256'], 'fetchedFiles': baseline['sourceProvenance']}, 'Source provenance differs')
    require(baseline['sourceBase'] == '51b1c810a9920be7fe3957ce454fc25fedf7b155' and baseline['sourceHead'] == 'ea72429b4c3cd80296b7ad75139431eb944aa319', 'Wrong source pin')
    require(lock['checker']['path'] == 'engineering/agent-kit/verify-role-update.py' and set(lock['checker']) == {'path', 'sha256'}, 'Unexpected checker path/fields')
    check_hash(lock['checker']['path'], lock['checker']['sha256'])
    before = {x['path']: x['sha256'] for group in ('packageRecords', 'rootAndLockRecords') for x in baseline[group]}
    amendments = validate_amendments(lock['amendments'], before)
    package_count = records_with_amendments(baseline['packageRecords'], amendments)
    root_count = records_with_amendments(baseline['rootAndLockRecords'], amendments)
    # Preserve the original root bytes, then permit exactly the root-reviewed append.
    agents_before = next(x for x in baseline['rootAndLockRecords'] if x['path'] == 'AGENTS.md')
    require(hashlib.sha256(read('AGENTS.md')[:agents_before['bytes']]).hexdigest() == agents_before['sha256'], 'Original AGENTS body differs')
    oldlock = json.loads(read('engineering/AGENT-KIT-UPDATE-004-LOCK.json'))
    check_hash(oldlock['baseline']['path'], oldlock['baseline']['sha256'])
    oldbaseline = json.loads(read(oldlock['baseline']['path']))
    oldamendments = H['validate_amendments'](oldlock['amendments'], oldbaseline['guidanceBeforeHashes'])
    for path, expected in oldlock['baseFiles'].items():
        require(expected == oldbaseline['protectedHashes'][path], 'Original package pin differs')
        check_hash(path, expected)
    require(oldlock['checker'] == {'path': HELPER, 'sha256': HELPER_SHA}, 'Historical checker pin differs')
    for path, item in oldamendments.items():
        if path in amendments:
            require(amendments[path]['fromSha256'] == item['toSha256'], 'Broken 004→005 guidance chain: ' + path)
        else:
            check_hash(path, item['toSha256'])
    def chained_hash(path, expected):
        checked_sha(expected)
        if path in oldamendments:
            require(expected == oldamendments[path]['fromSha256'], 'Wrong original guidance digest')
            expected = oldamendments[path]['toSha256']
        if path in amendments:
            require(expected == amendments[path]['fromSha256'], 'Wrong current amendment digest')
            expected = amendments[path]['toSha256']
        check_hash(path, expected)
    manifest = json.loads(read('docs/agent-kit/skills-manifest.json'))
    base = json.loads(read('engineering/AGENT-KIT-LOCK.json'))
    require(set(base['mutableDestinationPaths']) == MUTABLE, 'Mutable allowlist differs')
    for x in manifest['files']:
        # Root AGENTS received older approved append(s); CURRENT root record is
        # authoritative for its preserved prefix and exact approved new append.
        if x['path'] != 'AGENTS.md':
            chained_hash(x['path'], x['sha256'])
    for x in base['destinationFiles']:
        if x['path'] != 'AGENTS.md':
            chained_hash(x['path'], x['sha256'])
    upstream_count = 0
    for x in base['sourceFiles']:
        path = x.get('destination')
        if x.get('mutableDestination'):
            require(path in MUTABLE and x.get('destinationSnapshotObservedAtUtc'), 'Unapproved mutable source')
        if path and path not in MUTABLE and path != 'AGENTS.md':
            chained_hash(path, x['destinationSha256'])
        if path and x['classification'] == 'original' and path.startswith(('.agents/', '.claude/')):
            check_hash(path, x['sourceSha256']); upstream_count += 1
    package = set()
    for folder in ('.agents', '.claude', '.codex', 'docs/agent-kit', 'engineering/agent-kit'):
        package.update(H['walk_files'](folder))
    exact_count = validate_inventory(package, baseline)
    for pair in manifest['mirror_pairs']:
        require(read(pair['canonical']) == read(pair['mirror']), 'Mirror bytes differ')
    names = {x['name'] for x in manifest['skills']}
    require(len(names) == 17, 'Logical skill count differs')
    for folder in ('.agents/skills/', '.claude/skills/'):
        entries = {p for p in package if p.startswith(folder) and p.endswith('/SKILL.md')}
        require(len(entries) == 17 and {Path(p).parent.name for p in entries} == names, 'Skill inventory differs')
        for path in entries:
            fields = H['frontmatter'](path)
            require(fields.get('name') == Path(path).parent.name and isinstance(fields.get('description'), str) and fields['description'].strip(), 'Invalid skill metadata')
    for role in ('kit-explorer', 'kit-reviewer', 'kit-implementer'):
        validate_codex(tomllib.loads(read('.codex/agents/' + role + '.toml').decode()), role)
        validate_claude(H['frontmatter']('.claude/agents/' + role + '.md'), role)
    count_links = H['links']({p for p in package if p.endswith('.md') and '/evidence/' not in p} | {'AGENTS.md', 'CLAUDE.md'})
    preserved = {key: H['typed_records'](baseline[key]) for key in (
        'currentApprovalRecords', 'currentSourceRecords', 'currentEmulatorRecords', 'currentCmsSourceFiles')}
    current_inventories(baseline)
    config = Path.home() / '.codex/config.toml'
    for q in (Path.home(), config.parent, config):
        require(not q.is_symlink(), 'Global config symlink rejected')
    fd = os.open(config, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        s = os.fstat(fd); require(stat.S_ISREG(s.st_mode), 'Nonregular global config')
        with os.fdopen(fd, 'rb', closefd=False) as stream:
            current_hash = hashlib.sha256(stream.read()).hexdigest()
        global_match = current_hash == baseline['globalConfigSha256'] and oct(stat.S_IMODE(s.st_mode)) == baseline['globalConfigMode']
    finally:
        os.close(fd)
    closure = json.loads(read('docs/agent-kit/evidence/permission-003-20261013-closure.json'))
    require(closure['state'] == baseline['permission003State'] == 'CLOSED', 'Permission closure differs')
    require(closure['childWriteAttempts'] == {r: 'NOT_RUN_HIGHER_PRIORITY_ROLE_CONSTRAINT' for r in ('kit-explorer', 'kit-reviewer')}, 'Direct child probe states differ')
    require(baseline['update004State'] == 'GUIDANCE_INTEGRATED_GLOBAL_PRESERVATION_HOLD', 'Historical HOLD differs')
    print(json.dumps({'status': 'PASS' if global_match else 'FAIL', 'errors': [] if global_match else ['CURRENT global config hash/mode differs'],
        'amendments': 12, 'baselinePackageRecords': package_count, 'rootAndLockRecords': root_count,
        'exactPackageFiles': exact_count, 'manifestHashes': len(manifest['files']), 'destinationHashes': len(base['destinationFiles']),
        'skills': [17, 17], 'mirrors': len(manifest['mirror_pairs']), 'adaptersParsed': 6,
        'unchangedEngineeringOriginalsAndMirrors': upstream_count, 'markdownLinks': count_links, **preserved,
        'globalConfig': 'CURRENT_HASH_MODE_PRESERVED' if global_match else 'FAIL_CURRENT_BASELINE_DIFFERS',
        'update004': baseline['update004State'], 'permission003': 'CLOSED', 'directChildWrites': baseline['directChildWrites'],
        'nativeV18FixturesTwoMachine': 'NOT_RUN', 'observedRuntime': 'UNKNOWN_UNOBSERVED'}))
    if not global_match:
        raise SystemExit(1)


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, KeyError, TypeError) as error:
        print(json.dumps({'status': 'FAIL', 'error': str(error)})); raise SystemExit(1)
