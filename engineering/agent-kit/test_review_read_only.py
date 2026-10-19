"""Local unit checks only; never start a native model in these tests."""
import sys
sys.dont_write_bytecode = True
import importlib.util
from pathlib import Path
import io
import subprocess
import unittest
from unittest.mock import patch

SOURCE = Path(__file__).with_name('review-read-only.py')
spec = importlib.util.spec_from_file_location('review_read_only', SOURCE)
launcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(launcher)


class ReviewLauncherTests(unittest.TestCase):
    def test_fixed_read_only_route_and_project(self):
        with patch.object(launcher.subprocess, 'run', return_value=subprocess.CompletedProcess([], 0)) as run:
            self.assertEqual(launcher.main(['--prompt', 'Review the assigned source.']), 0)
        argv = run.call_args.args[0]
        self.assertEqual(argv[argv.index('--sandbox') + 1], 'read-only')
        self.assertEqual(argv[argv.index('--model') + 1], 'gpt-6.1-sol')
        self.assertIn('model_reasoning_effort="high"', argv)
        self.assertEqual(argv[argv.index('--cd') + 1], str(launcher.PROJECT_ROOT))
        self.assertEqual(run.call_args.kwargs['cwd'], launcher.PROJECT_ROOT)
        self.assertFalse(run.call_args.kwargs['shell'])
        self.assertEqual(argv[-1], '-')
        self.assertNotIn('--ignore-user-config', argv)
        self.assertNotIn('--approve-for-me', argv)
        self.assertFalse(any('bypass' in a for a in argv))

    def test_override_arguments_fail_before_native_execution(self):
        overrides = [['--sandbox', 'workspace-write'], ['-c', 'sandbox_mode="workspace-write"'],
                     ['--config=model="other"'], ['--model', 'other'], ['--profile', 'other'],
                     ['--ask-for-approval', 'never'], ['--approve-for-me'], ['--ignore-user-config'],
                     ['--dangerously-bypass-approvals-and-sandbox'], ['--cd', '/tmp'], ['--add-dir', '/tmp'],
                     ['--enable', 'anything'], ['--prom', 'abbreviation'], ['exec'], ['--', '--sandbox=workspace-write']]
        for args in overrides:
            with self.subTest(args=args), patch.object(launcher.subprocess, 'run') as run, patch('sys.stderr', new=io.StringIO()):
                with self.assertRaises(SystemExit) as error:
                    launcher.main(args)
                self.assertEqual(error.exception.code, 2)
                run.assert_not_called()

    def test_prompt_options_remain_stdin_data(self):
        text = '--sandbox danger-full-access -c approval_policy="never"'
        with patch.object(launcher.subprocess, 'run', return_value=subprocess.CompletedProcess([], 0)) as run:
            launcher.main(['--prompt=' + text])
        self.assertEqual(run.call_args.kwargs['input'], text)
        self.assertNotIn(text, run.call_args.args[0])

    def test_shell_interpolation_is_not_executed(self):
        text = 'Review $(touch /tmp/never-created) `touch /tmp/never-created` ; echo $HOME'
        with patch.object(launcher.subprocess, 'run', return_value=subprocess.CompletedProcess([], 0)) as run:
            launcher.main(['--prompt', text])
        self.assertEqual(run.call_args.kwargs['input'], text)
        self.assertFalse(run.call_args.kwargs['shell'])
        self.assertNotIn(text, run.call_args.args[0])

    def test_piped_prompt_and_exit_code_forwarded(self):
        with patch('sys.stdin', new=io.StringIO('Read-only review from stdin.')), patch.object(launcher.subprocess, 'run', return_value=subprocess.CompletedProcess([], 7)) as run:
            self.assertEqual(launcher.main([]), 7)
        self.assertEqual(run.call_args.kwargs['input'], 'Read-only review from stdin.')

    def test_blank_prompt_does_not_start_native_process(self):
        with patch.object(launcher.subprocess, 'run') as run, patch('sys.stderr', new=io.StringIO()):
            with self.assertRaises(SystemExit):
                launcher.main(['--prompt', '  '])
            run.assert_not_called()

    def test_wrong_project_or_symlinked_launcher_fails_closed(self):
        with patch.object(launcher, 'PROJECT_ROOT', Path('/tmp')), patch.object(launcher.subprocess, 'run') as run:
            with self.assertRaises(ValueError):
                launcher.main(['--prompt', 'Review.'])
            run.assert_not_called()


CONTROLLER_SOURCE = Path(__file__).with_name('verify-review-read-only.py')
controller_spec = importlib.util.spec_from_file_location('verify_review_read_only', CONTROLLER_SOURCE)
controller = importlib.util.module_from_spec(controller_spec)
controller_spec.loader.exec_module(controller)


class PermissionEvidenceTests(unittest.TestCase):
    def context(self):
        return {'sandbox_policy': {'type': 'read-only'}, 'model': 'gpt-6.1-sol', 'effort': 'high',
                'permission_profile': {'type': 'managed', 'network': 'restricted',
                                       'file_system': {'type': 'restricted', 'entries': [
                                           {'path': {'type': 'special', 'value': {'kind': 'root'}}, 'access': 'read'}]}}}

    def test_actual_managed_read_policy_passes_without_legacy_field(self):
        self.assertTrue(controller.verified_context(self.context()))

    def test_any_filesystem_write_grant_fails(self):
        context = self.context()
        context['permission_profile']['file_system']['entries'].append({'path': 'fixture', 'access': 'write'})
        self.assertFalse(controller.verified_context(context))
        context = self.context()
        context['file_system_sandbox_policy'] = {'type': 'workspace-write', 'writable_roots': ['fixture']}
        self.assertFalse(controller.verified_context(context))

    def test_missing_actual_filesystem_proof_fails(self):
        context = self.context()
        context['permission_profile'] = {'id': ':workspace', 'extends': None}
        self.assertFalse(controller.verified_context(context))

    def test_network_or_model_override_fails(self):
        context = self.context()
        context['sandbox_policy']['network_access'] = True
        self.assertFalse(controller.verified_context(context))
        context = self.context()
        context['model'] = 'other'
        self.assertFalse(controller.verified_context(context))

    def test_model_refusal_or_unrestricted_write_is_not_denial_proof(self):
        self.assertFalse(controller.passed_fixture_output('I will not write files.'))
        self.assertFalse(controller.passed_fixture_output(controller.MARKER + '{"read":true,"create_errno":null,"modify_errno":null}'))
        self.assertTrue(controller.passed_fixture_output(controller.MARKER + '{"read":true,"create_errno":13,"modify_errno":1}'))

    def test_boolean_errno_is_not_os_denial(self):
        self.assertFalse(controller.passed_fixture_output(controller.MARKER + '{"read":true,"create_errno":true,"modify_errno":true}'))

    def test_optimized_controller_refuses_before_process_or_fixture(self):
        result = subprocess.run([sys.executable, '-B', '-O', str(CONTROLLER_SOURCE)], capture_output=True, text=True, check=False)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('no fixture or native process was started', result.stderr)

    def test_extra_child_tool_or_escalation_never_becomes_selected_proof(self):
        def row(name, arguments):
            return {'type': 'response_item', 'payload': {'type': 'function_call', 'name': name, 'arguments': __import__('json').dumps(arguments)}}
        records = [row('exec_command', {'cmd': 'approved-fixture'}), row('exec_command', {'cmd': 'different-command'})]
        with self.assertRaises(RuntimeError):
            controller.validate_actor_calls(records, 'kit-explorer', 2, 'approved-fixture', {'own-child'})
        with self.assertRaises(RuntimeError):
            controller.validate_actor_calls([row('exec_command', {'cmd': 'approved-fixture', 'sandbox_permissions': 'require_escalated'})], 'kit-explorer', 2, 'approved-fixture', {'own-child'})
        with self.assertRaises(RuntimeError):
            controller.validate_actor_calls([row('multi_agent_v1.spawn_agent', {'agent_type': 'kit-explorer'})], None, 2, 'approved-fixture', {'own-child'})
        with self.assertRaises(RuntimeError):
            controller.validate_actor_calls([{'type': 'response_item', 'payload': {'type': 'local_shell_call'}}], 'kit-explorer', 2, 'approved-fixture', {'own-child'})

    def test_selector_constructor_failure_closes_only_owned_process(self):
        from unittest.mock import MagicMock
        process = MagicMock(); process.poll.return_value = 0
        selector = MagicMock(); selector.register.side_effect = OSError('synthetic selector failure')
        with patch.object(controller.selectors, 'DefaultSelector', return_value=selector), patch.object(controller.subprocess, 'Popen', return_value=process):
            with self.assertRaises(OSError):
                controller.NativeClient()
        process.stdin.close.assert_called_once()
        process.wait.assert_called_once_with(timeout=10)
        selector.close.assert_called_once()

    def test_cleanup_failure_returns_abnormal_status_without_skipping_receipt(self):
        from unittest.mock import MagicMock
        client = controller.NativeClient.__new__(controller.NativeClient)
        client.active_turns = {}; client.selector = MagicMock(); client.process = MagicMock()
        client.process.wait.side_effect = subprocess.TimeoutExpired('owned', 1)
        client.process.poll.return_value = None
        result = client.close()
        self.assertEqual(result['status'], 'ABNORMAL_OR_INTERRUPTED')
        client.process.terminate.assert_called_once()
        client.process.kill.assert_called_once()

    def test_actual_collaboration_selectors_are_strict_and_cipher_is_not_proof(self):
        args = {'task_name': 'permission_explorer_ack', 'agent_type': 'kit-explorer',
                'fork_turns': 'none', 'message': 'opaque-synthetic-message'}
        self.assertTrue(controller.tool_allowed('collaboration', 'spawn_agent', args, 1, None, set(), True))
        for change in ({'fork_turns': 'all'}, {'task_name': 'other'}, {'model': 'other'}):
            self.assertFalse(controller.tool_allowed('collaboration', 'spawn_agent', args | change, 1, None, set(), True))
        self.assertFalse(controller.tool_allowed('collaboration', 'spawn_agent', args, 2, 'fixture', set(), True))
        self.assertFalse(controller.tool_allowed('collaboration', 'followup_task', {'target': 'unowned', 'message': 'opaque'}, 2, 'fixture', {'owned'}, True))
        row = {'type': 'response_item', 'payload': {'type': 'function_call', 'namespace': 'functions', 'name': 'exec', 'arguments': 'opaque-synthetic'}}
        with self.assertRaises(RuntimeError):
            controller.validate_actor_calls([row], 'kit-explorer', 2, 'fixture', {'owned'})
        with self.assertRaises(RuntimeError):
            controller.validate_actor_calls([row], 'kit-explorer', 2, 'fixture', {'owned'}, native_command_proofs=1)

    def test_collaboration_canonical_return_never_establishes_native_thread_identity(self):
        client = controller.NativeClient.__new__(controller.NativeClient)
        client.calls = {}; client.spawned = {}; client.selected_outputs = []; client.unsafe = []; client.stage = 1
        client.expected_command = None
        client.expected_command = None
        client.raw_items({'type': 'function_call', 'namespace': 'collaboration', 'name': 'spawn_agent',
                          'call_id': 'selected', 'arguments': '{"agent_type":"kit-explorer","task_name":"permission_explorer_ack","fork_turns":"none"}'})
        client.raw_items({'type': 'function_call_output', 'call_id': 'selected', 'output': '{"agent_id":"canonical-name"}'})
        self.assertFalse(client.spawned)
        self.assertFalse(client.unsafe)

    def test_unexpected_completed_command_without_start_cannot_hide_in_proof_filter(self):
        client = controller.NativeClient.__new__(controller.NativeClient)
        client.owned_parent = 'parent'; client.owned_children = {'child'}; client.spawned = {'kit-explorer': 'child'}
        client.stage = 2; client.expected_command = 'approved-fixture'; client.unsafe = []; client.commands = []
        client.handle({'method': 'item/completed', 'params': {'threadId': 'child',
            'item': {'type': 'commandExecution', 'id': 'extra', 'command': 'unexpected-command', 'exitCode': 0}}})
        self.assertIn('unexpected completed native commandExecution scope', client.unsafe)
        client.unsafe.clear()
        client.handle({'method': 'item/completed', 'params': {'threadId': 'unowned',
            'item': {'type': 'commandExecution', 'id': 'extra', 'command': 'approved-fixture', 'exitCode': 0}}})
        self.assertTrue(client.unsafe)

    def test_owned_subagent_activity_binds_native_uuid_and_rejects_other_path(self):
        client = controller.NativeClient.__new__(controller.NativeClient)
        client.calls = {'call_owned': ('collaboration', 'spawn_agent', {'agent_type': 'kit-explorer', 'task_name': 'permission_explorer_ack'})}
        client.spawned = {}; client.owned_children = set(); client.completed_children = set()
        client.child_activity = []; client.unsafe = []; client.stage = 1
        item = {'type': 'subAgentActivity', 'id': 'call_owned', 'kind': 'started',
                'agentThreadId': 'own-native-uuid', 'agentPath': '/root/permission_explorer_ack'}
        client.subagent_activity(item)
        self.assertEqual(client.spawned, {'kit-explorer': 'own-native-uuid'})
        client.subagent_activity(item | {'kind': 'completed', 'id': 'subagent-completed-own-native-uuid'})
        self.assertIn('own-native-uuid', client.completed_children)
        self.assertFalse(client.unsafe)
        client.subagent_activity(item | {'kind': 'completed', 'id': 'subagent-completed-unowned', 'agentThreadId': 'unowned-uuid'})
        self.assertTrue(client.unsafe)
        client.unsafe.clear()
        client.subagent_activity(item | {'agentPath': '/root/unrelated'})
        self.assertTrue(client.unsafe)
        client.unsafe.clear()
        client.subagent_activity(item | {'id': 'unmatched-call'})
        self.assertTrue(client.unsafe)
        self.assertFalse(controller.tool_allowed('collaboration', 'followup_task',
            {'target': '/root/permission_explorer_ack', 'message': 'fixture'}, 2, 'fixture', set(), True))
        self.assertTrue(controller.tool_allowed('collaboration', 'followup_task',
            {'target': '/root/permission_explorer_ack', 'message': 'fixture'}, 2, 'fixture', {'own-native-uuid'}, True, historical_followups=True))

    def test_exact_freeform_wrapper_rejects_changed_code_and_requires_native_output(self):
        command = 'approved-fixture'
        code = controller.approved_exec_wrapper(command)
        item = {'type': 'custom_tool_call', 'name': 'exec', 'namespace': None, 'call_id': 'owned', 'input': code}
        self.assertTrue(controller.exact_wrapper_call(item, 2, command))
        self.assertFalse(controller.exact_wrapper_call(item, 1, command))
        for changed in (code + ' text("forged");', code.replace('use_default', 'require_escalated'),
                        code.replace('approved-fixture', 'different-command'), code + ' await tools.other();'):
            self.assertFalse(controller.exact_wrapper_call(item | {'input': changed}, 2, command))
        records = [{'type': 'response_item', 'payload': item}]
        with self.assertRaises(RuntimeError):
            controller.validate_actor_calls(records, 'kit-explorer', 2, command, {'child'})
        controller.validate_actor_calls(records, 'kit-explorer', 2, command, {'child'}, native_command_proofs=1)
        body = controller.MARKER + '{"read":true,"create_errno":1,"modify_errno":1}\n{"exit_code":0}'
        output = {'type': 'response_item', 'payload': {'type': 'custom_tool_call_output', 'call_id': 'owned', 'output': body}}
        with patch.object(controller, 'rollout_records', return_value=records + [output]):
            proof = controller.command_from_owned_rollout('unused', 'own-child', command)
        self.assertEqual(len(proof), 1)
        self.assertEqual(proof[0]['source'], 'OWNED_ROLLOUT_NATIVE_CUSTOM_EXEC_OUTPUT')
        for invalid in ({'type': 'custom_tool_call_output', 'call_id': 'unmatched', 'output': body},
                        {'type': 'message', 'content': body},
                        {'type': 'custom_tool_call_output', 'call_id': 'owned', 'output': body.replace('"exit_code":0', '"exit_code":1')}):
            with patch.object(controller, 'rollout_records', return_value=records + [{'type': 'response_item', 'payload': invalid}]):
                self.assertFalse(controller.command_from_owned_rollout('unused', 'own-child', command))

    def test_observed_zsh_command_shape_is_exact_and_core_output_is_native_proof(self):
        import shlex
        command = 'approved-fixture'
        argv = ['/bin/zsh', '-lc', command]
        self.assertEqual(controller.native_command_method(argv, command), 'EXACT_NATIVE_ZSH_ARGV')
        self.assertEqual(controller.native_command_method(shlex.join(argv), command), 'EXACT_SDK_ZSH_DISPLAY_ARGV')
        complex_command = shlex.join(['python3', '-c', controller.fixture_program(controller.ROOT / 'docs/agent-kit/evidence/permission-003-fixture/synthetic')])
        quoted_display = '/bin/zsh -lc "' + complex_command.replace('\\', '\\\\').replace('"', '\\"') + '"'
        self.assertEqual(controller.native_command_method(quoted_display, complex_command), 'EXACT_SDK_ZSH_DISPLAY_ARGV')
        self.assertEqual(controller.native_command_method(command, command), 'EXACT_BARE_COMMAND')
        for invalid in (['/bin/bash', '-lc', command], ['/bin/zsh', '-lc', 'other'],
                        ['/bin/zsh', '-lc', command, 'extra'], ['env', '/bin/zsh', '-lc', command],
                        'env INJECT=1 ' + shlex.join(argv), shlex.join(argv) + '; other'):
            self.assertIsNone(controller.native_command_method(invalid, command))
        body = controller.MARKER + '{"read":true,"create_errno":1,"modify_errno":1}\n'
        item = {'type': 'CommandExecution', 'id': 'core-command', 'command': argv,
                'cwd': 'file://' + str(controller.ROOT), 'source': 'unified_exec_startup',
                'status': 'completed', 'exit_code': 0, 'aggregated_output': body}
        record = {'type': 'event_msg', 'payload': {'type': 'item_completed', 'thread_id': 'own-parent', 'item': item}}
        with patch.object(controller, 'rollout_records', return_value=[record]):
            proof = controller.command_from_owned_rollout('unused', 'own-parent', command)
        self.assertEqual(proof[0]['source'], 'OWNED_ROLLOUT_NATIVE_CORE_COMMAND_COMPLETED')
        self.assertEqual(proof[0]['command'], argv)
        foreign = record | {'payload': record['payload'] | {'thread_id': 'foreign-parent'}}
        with patch.object(controller, 'rollout_records', return_value=[foreign]):
            self.assertFalse(controller.command_from_owned_rollout('unused', 'own-parent', command))
        with self.assertRaises(RuntimeError):
            controller.validate_actor_calls([foreign], None, 2, command, set(), native_actor='own-parent')
        wrapper = {'type': 'response_item', 'payload': {'type': 'custom_tool_call', 'name': 'exec', 'namespace': None,
            'call_id': 'owned', 'input': controller.approved_exec_wrapper(command)}}
        controller.validate_actor_calls([wrapper, record], 'kit-explorer', 2, command, {'own-child'},
            native_command_proofs=len(proof) if proof[0]['source'] == 'OWNED_ROLLOUT_NATIVE_CORE_COMMAND_COMPLETED' else 0)
        for change in ({'cwd': 'https://example.test/'}, {'source': 'unknown'}, {'status': 'started'}, {'command': ['/bin/bash', '-lc', command]}):
            with patch.object(controller, 'rollout_records', return_value=[record | {'payload': {'type': 'item_completed', 'item': item | change}}]):
                self.assertFalse(controller.command_from_owned_rollout('unused', 'own-parent', command))

    def test_live_completed_proof_requires_exact_cwd_and_integer_exit(self):
        client = controller.NativeClient.__new__(controller.NativeClient)
        client.owned_parent = 'parent'; client.owned_children = set(); client.spawned = {}
        client.stage = 2; client.expected_command = 'fixture'; client.unsafe = []; client.commands = []
        item = {'type': 'commandExecution', 'id': 'native', 'command': ['/bin/zsh', '-lc', 'fixture'],
                'cwd': str(controller.ROOT), 'exitCode': 0, 'aggregatedOutput': 'output'}
        client.handle({'method': 'item/completed', 'params': {'threadId': 'parent', 'item': item}})
        self.assertFalse(client.unsafe)
        for change in ({'cwd': '/tmp'}, {'exitCode': False}):
            client.handle({'method': 'item/completed', 'params': {'threadId': 'parent', 'item': item | change}})
            self.assertTrue(client.unsafe)
            client.unsafe.clear()

    def test_legitimate_acceptance_never_counts_child_role_refusal_as_native_execution(self):
        result = controller.verified_outcome(True, {'parent', *controller.ROLES})
        self.assertEqual(result['status'], 'PASS_PARENT_ENFORCEMENT_CHILD_POLICY_VERIFIED')
        self.assertEqual(result['nativeExecutedActors'], ['parent'])
        self.assertEqual(result['childWriteAttempts'], 'NOT_RUN_HIGHER_PRIORITY_ROLE_CONSTRAINT')
        self.assertEqual(controller.verified_outcome('child refused', {'parent', *controller.ROLES})['status'], 'HOLD')
        self.assertEqual(controller.verified_outcome(True, {'parent'})['status'], 'HOLD')
        self.assertFalse(controller.tool_allowed('collaboration', 'followup_task',
            {'target': '/root/permission_explorer_ack', 'message': 'attempt writes'}, 2, 'fixture', {'own-child'}, True))

    def test_offline_recovery_rejects_unowned_receipt_path_without_native_process(self):
        with patch.object(controller.subprocess, 'Popen') as process:
            with self.assertRaises(AssertionError):
                controller.verify_existing_receipt('/tmp/unowned.json', {})
            process.assert_not_called()

    def test_rpc_deadline_reports_timeout_not_keyerror(self):
        client = controller.NativeClient.__new__(controller.NativeClient)
        client.seq = 0; client.responses = {}; client.send = lambda value: None; client.pump = lambda: None
        with patch.object(controller.time, 'monotonic', side_effect=[0, 21]):
            with self.assertRaises(TimeoutError):
                client.request('turn/interrupt', {})

    def test_namespace_and_call_id_are_required_for_spawn_identity(self):
        client = controller.NativeClient.__new__(controller.NativeClient)
        client.calls = {}; client.spawned = {}; client.selected_outputs = []; client.unsafe = []; client.stage = 1
        client.expected_command = None
        client.raw_items({'type': 'function_call', 'namespace': 'wrong_namespace', 'name': 'spawn_agent',
                          'call_id': 'wrong', 'arguments': '{"agent_type":"kit-explorer"}'})
        client.raw_items({'type': 'function_call_output', 'call_id': 'wrong', 'output': '{"agent_id":"wrong-child"}'})
        self.assertFalse(client.spawned)
        self.assertTrue(client.unsafe)
        client.raw_items({'type': 'function_call', 'namespace': 'multi_agent_v1', 'name': 'spawn_agent',
                          'call_id': 'owned', 'arguments': '{"agent_type":"kit-explorer"}'})
        client.raw_items({'type': 'function_call_output', 'call_id': 'unrelated', 'output': '{"agent_id":"other-child"}'})
        self.assertFalse(client.spawned)
        client.raw_items({'type': 'function_call_output', 'call_id': 'owned', 'output': '{"agent_id":"owned-child"}'})
        self.assertEqual(client.spawned, {'kit-explorer': 'owned-child'})
        client.raw_items({'type': 'function_call', 'namespace': 'multi_agent_v1', 'name': 'spawn_agent',
                          'call_id': 'failed', 'arguments': '{"agent_type":"kit-reviewer"}'})
        client.raw_items({'type': 'function_call_output', 'call_id': 'failed', 'output': 'Error: unknown agent_type at /Users/private/file'})
        self.assertIn('[PRIVATE_PATH]', client.selected_outputs[-1]['errorMeaning'])
        self.assertNotIn('/Users/', client.selected_outputs[-1]['errorMeaning'])


class StandaloneOsFixtureTests(unittest.TestCase):
    def test_native_command_request_is_fixed_read_only_and_has_no_shell_or_profile_override(self):
        source = SOURCE.with_name('verify-read-only-filesystem.py')
        spec = importlib.util.spec_from_file_location('readonly_os_fixture', source)
        helper = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(helper)
        request = helper.command_params(controller.ROOT / 'docs/agent-kit/evidence/permission-003-fixture/synthetic')
        self.assertEqual(request['sandboxPolicy'], {'type': 'readOnly', 'networkAccess': False})
        self.assertEqual(request['cwd'], str(controller.ROOT))
        self.assertEqual(request['timeoutMs'], 10000)
        self.assertEqual(request['command'][:2], ['python3', '-c'])
        self.assertNotIn('permissionProfile', request)
        self.assertNotIn('env', request)
        self.assertNotIn('approvalPolicy', request)



if __name__ == '__main__':
    unittest.main()
