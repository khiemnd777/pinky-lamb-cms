#!/usr/bin/env python3
"""Native command/exec read-only OS fixture, without model turns or delegation.

This separate test does not prove that parent/child agents executed any command.
Run only after root source review. Importing the module starts no process.
"""
import sys
sys.dont_write_bytecode = True
import importlib.util
import datetime
import hashlib
import json
import os
from pathlib import Path
import stat
import uuid

SOURCE = Path(__file__).with_name('verify-review-read-only.py')
spec = importlib.util.spec_from_file_location('permission_controller', SOURCE)
core = importlib.util.module_from_spec(spec)
spec.loader.exec_module(core)


def command_params(directory):
    return {'command': ['python3', '-c', core.fixture_program(directory)],
            'cwd': str(core.ROOT), 'timeoutMs': 10000, 'outputBytesCap': 4096,
            'sandboxPolicy': {'type': 'readOnly', 'networkAccess': False}}


def main():
    if not __debug__:
        raise RuntimeError('Optimized Python is unsupported; no fixture or native process was started')
    if core.ROOT != core.APPROVED_ROOT:
        raise RuntimeError('Unexpected project root')
    run_id = uuid.uuid4().hex
    base = core.ROOT / 'docs/agent-kit/evidence/permission-003-fixture'
    for path in [base, *base.parents]:
        if path.is_symlink():
            raise RuntimeError('Fixture ancestry contains a symlink')
    base.mkdir(exist_ok=True)
    fixture = base / ('os-' + run_id)
    fixture.mkdir(mode=0o700)
    (fixture / '.owned-marker').write_text('AGENT-PERMISSION-003 OS synthetic fixture only\n')
    sentinel = fixture / 'sentinel.txt'
    fd = os.open(sentinel, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, 'w') as stream:
        stream.write('readonly-fixture-original\n')
    stats = [fixture.stat(), sentinel.stat()]
    if not all(row.st_uid == os.geteuid() and row.st_mode & stat.S_IWUSR for row in stats):
        raise RuntimeError('Fixture owner write permission missing')
    digest = hashlib.sha256(sentinel.read_bytes()).hexdigest()
    report = {'status': 'HOLD', 'runId': run_id,
              'observedAtUtc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'helperSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              'importedControllerSha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
              'scope': 'Standalone native command/exec OS sandbox only; no model turns or agent execution proof',
              'modelTurns': 'NOT_RUN', 'agentCommands': 'NOT_RUN', 'configWrites': 'NONE',
              'fixtureRelativePath': fixture.relative_to(core.ROOT).as_posix(),
              'fixtureOwnerWritable': True, 'fixtureModes': [oct(stat.S_IMODE(row.st_mode)) for row in stats]}
    client = None
    try:
        client = core.NativeClient()
        client.request('initialize', {'clientInfo': {'name': 'pinky_readonly_os_fixture', 'version': '1.0'},
                                      'capabilities': {'experimentalApi': True}})
        client.send({'method': 'initialized'})
        started = client.request('thread/start', {'cwd': str(core.ROOT), 'sandbox': 'read-only',
            'model': 'gpt-6.1-sol', 'config': {'model_reasoning_effort': 'high'}})
        if started['sandbox']['type'] != 'readOnly' or started['sandbox'].get('networkAccess', False) is not False:
            raise RuntimeError('Startup sandbox mismatch')
        if started['model'] != 'gpt-6.1-sol' or started['reasoningEffort'] != 'high':
            raise RuntimeError('Startup route mismatch')
        report['startup'] = {'nativeParentId': started['thread']['id'], 'sandbox': started['sandbox'],
            'model': started['model'], 'effort': started['reasoningEffort'],
            'approvalPolicy': started.get('approvalPolicy'), 'approvalsReviewer': started.get('approvalsReviewer')}
        params = command_params(fixture)
        report['commandRequestedSandbox'] = params['sandboxPolicy']
        report['commandArgvSha256'] = hashlib.sha256(json.dumps(params['command']).encode()).hexdigest()
        result = client.request('command/exec', params)
        if client.unsafe:
            raise RuntimeError('Unexpected native request during OS fixture')
        report['exitCode'] = result['exitCode']
        report['stdoutSha256'] = hashlib.sha256(result['stdout'].encode()).hexdigest()
        report['stderrBytesNoContentsSaved'] = len(result['stderr'].encode())
        if result['exitCode'] != 0 or not core.passed_fixture_output(result['stdout']):
            raise RuntimeError('Actual OS fixture denial proof missing')
        report['actualFixtureResult'] = json.loads(next(line[len(core.MARKER):] for line in result['stdout'].splitlines() if line.startswith(core.MARKER)))
        report['status'] = 'OS_NATIVE_READONLY_FIXTURE_PASS'
    except Exception as error:
        if hasattr(error, 'owned_cleanup'):
            report['constructorCleanup'] = error.owned_cleanup
        report['reason'] = str(error)[:220] if isinstance(error, RuntimeError) else type(error).__name__
    finally:
        report['sentinelUnchanged'] = hashlib.sha256(sentinel.read_bytes()).hexdigest() == digest
        report['createdFileAbsent'] = not (fixture / 'created.txt').exists()
        if client is not None:
            report['cleanup'] = client.close()
            report['unexpectedNativeActivity'] = client.unsafe
            if report['cleanup']['status'] != 'NORMAL':
                report['status'] = 'HOLD_ABNORMAL_CLEANUP'
        if not report['sentinelUnchanged'] or not report['createdFileAbsent']:
            report['status'] = 'HOLD_FIXTURE_CHANGED'
        evidence = core.ROOT / ('docs/agent-kit/evidence/permission-003-os-20261013-' + run_id + '.json')
        evidence.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report))
    return 0 if report['status'] == 'OS_NATIVE_READONLY_FIXTURE_PASS' else 1


if __name__ == '__main__':
    raise SystemExit(main())
