# AGENT-PERMISSION-003 v1 — dedicated read-only CLI review parent

**State: CLOSED — user accepted the current result on 2026-10-13 (Asia/Ho_Chi_Minh).** Dedicated CLI review lane complete; parent enforcement and child policy verified. Direct child write probes remain NOT_RUN. [Closure record](../evidence/permission-003-20261013-closure.json) records the human decision; the unchanged [final receipt](../evidence/permission-003-20261013-final.json) records the verification boundary. The `agent_setup` worker used actual GPT-6.1 Sol Medium for implementation and tests; independent High review passed. No CMS implementation or acceptance is authorized.

## Direct human approval

> Approved AGENT-PERMISSION-003 v1 — phương án 1: triển khai CLI review parent read-only riêng và kiểm thử từ chối ghi trên fixture. Giữ nguyên mã CMS, dữ liệu emulator, global config và các approval hiện hành.

Observed by root on 2026-10-13 (Asia/Ho_Chi_Minh). This approves option 1: a dedicated CLI review parent with native `read-only` permissions, inherited by `kit-explorer` and `kit-reviewer`, and actual write-denial tests on an owned synthetic project fixture. The desktop coding parent and `kit-implementer` keep their existing permissions. No global policy/configuration, adapter, feature, installation, login or CMS approval change is authorized.

## Verified cause and selected repair

The installed CLI is `0.162.0-alpha.17.2`. In its matching source commit `740e5af33c71225640e0c1c1555c514c2c93ab74`, `AgentRoleOverrides` omits `sandbox_mode`, and the child spawn configuration applies the parent's live permission snapshot after role overrides. The earlier desktop parent and explorer/reviewer children had equal write-capable policies. A role's TOML request therefore does not establish read-only enforcement in this build.

The approved repair places review work in a separate parent with a verified read-only policy. Existing adapters, global configuration and historical evidence remain unchanged. [Earlier discovery](AGENT-DISCOVERY-002.md) remains a separate result.

## Ownership and acceptance

- Worker owns the new repository-local CLI launcher, bounded verification controller and standard-library tests under `engineering/agent-kit/`.
- Root owns this task, selected evidence and the mutable setup indices. Only synthetic fixture files may be targeted by negative write attempts.
- Confirm the parent startup policy before model work. Confirm the parent and two exact native child policies before write probes. Retain native selector, child identity, route and policy evidence.
- For the parent, reading the sentinel must succeed. Creating a file and modifying the sentinel must return actual permission errors. Sentinel bytes must remain unchanged and the create target must remain absent. A refusal message or configuration field alone cannot pass OS enforcement. For the two children, verify native identity, completed ACK, effective read-only policy, equality with the parent permission snapshot and unchanged approvals. Their unchanged developer instructions prohibit write attempts; record child-specific OS probes as NOT_RUN rather than substituting a refusal for OS evidence.
- Use native sandboxed file/shell operations. Do not use the unsandboxed `thread/shellCommand` API, escalation, external tools, connectors or a substitute agent role for enforcement tests. Filesystem enforcement does not prove independent MCP/connector permissions.
- Preserve source, all emulator records, global config hash/mode, six approval JSON files, adapters and the immutable kit lock. Do not run CMS tests/build/HTTP/emulators or mutate Git.

The controller uses the existing signed-in CLI runtime. It never reads credential contents, installs dependencies or bypasses existing approval settings. An unavailable runtime or missing native observation is reported as partial/NOT_RUN.

## Sources

- [Installed-version role overrides](https://github.com/openai/codex/blob/740e5af33c71225640e0c1c1555c514c2c93ab74/codex-rs/core/src/agent/role.rs).
- [Installed-version child configuration](https://github.com/openai/codex/blob/740e5af33c71225640e0c1c1555c514c2c93ab74/codex-rs/core/src/agent/child_config.rs).
- [Official app-server thread and sandbox contracts](https://learn.chatgpt.com/docs/app-server#threads). The local generated schema confirms `sandbox: "read-only"` for this installed build.

## Preflight

Read-only setup verifier PASS at `2026-10-13T00:08:34.065472+00:00`: 3,942 original source records and 746 emulator records preserved; 17 skills per runtime mirror, 27 mirror pairs, six adapters and immutable package checks pass. Global config hash/mode and the protected approval/adapter/lock hashes match the preceding approved discovery snapshot. Raw global configuration is not copied.

## Dedicated CLI review lane

From this exact project root, run the [launcher](../../../engineering/agent-kit/review-read-only.py):

```sh
python3 -B engineering/agent-kit/review-read-only.py --prompt 'Review the assigned scope. Use kit-explorer and kit-reviewer when needed. Report findings only.'
```

The launcher accepts only `--prompt` or stdin text. It forwards no caller-supplied Codex options. It fixes the project directory, `--sandbox read-only`, `gpt-6.1-sol` and High reasoning. Normal user configuration and approvals remain loaded. `--skip-git-repo-check` permits this existing exported non-Git snapshot; it does not disable the sandbox or approvals. The prompt must name the concrete review scope. Do not use this lane for implementation or permission escalation. MCP/connectors have separate permission controls and are outside the verified filesystem boundary.

Root's actual launcher startup completed ACK with no tools and exit 0, native session `01a13298-fb09-7d23-b353-a754efbd5557`. Its turn context records `gpt-6.1-sol / high`, `read-only`, managed restricted filesystem with only root/read, network restricted, `on-request / auto_review`. A first outer-sandbox startup failed with OS EPERM before a session began. The reviewed launcher then ran with an approved outer bootstrap; the inner read-only policy remained unchanged.

## Separate OS enforcement result

[Native OS receipt](../evidence/permission-003-os-20261013-06fd2e7e7bd44c3ca1ba90732f9f3122.json): **OS_NATIVE_READONLY_FIXTURE_PASS**. The documented native `command/exec` API used explicit `readOnly`, network disabled and a synthetic owner-writable fixture (directory 0700, sentinel 0600). Read succeeded; create and modify both returned `EPERM` (`errno 1`). Sentinel hash stayed unchanged, create target remained absent, and the owned process exited 0 normally. This test uses no model turn and does not prove that either native child executed a command.

The three-actor controller separately requires actual parent/child policy and parent command evidence. Its initial two receipts remain preserved: [namespace harness stop](../evidence/permission-003-20261013-3dd47ed7bb374fa0b44bde86c85a92c3.json), [activity harness stop](../evidence/permission-003-20261013-97a8caaafb4e4c9d82ff327a1a1aecaa.json). Both stopped before fixture commands and retained the sentinel. Root inspected the second run's native activity and owned child rollout: `kit-explorer` matched its parent, recorded High/read-only/same approvals, completed ACK and made no tool calls. The final repaired controller recognizes the actual namespace and native activity bindings without inferring UUIDs from task names or decoding opaque arguments.

## Native role constraint and verification boundary

The initial test contract attempted to obtain a negative write probe from each child. In the final observed run, both children explicitly refused that script under their role developer instructions. `kit-explorer` reported that read-only instructions prohibit the supplied create/overwrite attempts. `kit-reviewer` reported that parent approval does not override the reviewer write prohibition. Neither child made a tool call. The adapters and those constraints remain unchanged.

The approved CLI-parent repair therefore verifies three effective native policies and actual parent/OS write denial. It does not claim direct child OS enforcement. The controller's default verification records this boundary and does not request forbidden child operations. [Historical full probe](../evidence/permission-003-20261013-089c5e93f453431abab7ed5036cf3d02.json) remains HOLD for the former all-actor physics criterion; its normal exit, actual parent fixture success and three read-only policies can be audited separately without another model run. This is a correction to the verification method, not an exception to the child role constraints or a new permission grant.

## Final integration and verification

Root audited the exact three owned native rollouts offline at `2026-10-13T00:47:16.270644+00:00`. No model, native client or new command ran during recovery. Result: **PASS_PARENT_ENFORCEMENT_CHILD_POLICY_VERIFIED**. Parent, `kit-explorer` and `kit-reviewer` record identical managed root/read permissions, network restricted, `gpt-6.1-sol / high` and unchanged `on-request / auto_review`. Native role/identity and completed ACK evidence are bound to the observed spawn calls. Parent's actual completed native command read the fixture and returned `EPERM` (`errno 1`) for create and modify, exit 0. Sentinel unchanged; created target absent. Both child-specific write probes remain **NOT_RUN_HIGHER_PRIORITY_ROLE_CONSTRAINT**.

The final controller defaults to ACK/policy checks for the two children and a parent-only fixture probe. Offline recovery accepts only exact owned regular rollout files and preserves every historical receipt, including HOLD. Independent High review found no actionable issue and independently ran all **29 local tests: PASS**. Root also ran 29 tests: PASS. A worker-run in-memory read-only to workspace-write mutation failed the safety test as expected; no mutated source was saved.

The [final receipt](../evidence/permission-003-20261013-final.json) contains frozen implementation hashes, selected native evidence, final static/preservation checks and this boundary. Review work now uses the dedicated CLI launcher. The existing desktop coding parent remains workspace-write. CMS code, emulator data, global config, adapters, locks and existing approval records are preserved; CMS gates and LOCAL_COMPLETE are unchanged.

Final read-only package/preservation command `python3 -B docs/agent-kit/evidence/verify-setup.py`: **PASS**, exit 0, observed `2026-10-13T00:50:44.467692+00:00`; 275 Markdown links, 3,942 protected source records and all 746 emulator records checked. Separate final hashes/mode match preflight for the global config, six approval JSONs, three Codex adapters and immutable kit lock. The static script's nativeInvocation NOT_RUN refers only to that script; actual native observations are recorded separately above.

## Human closure — 2026-10-13

> Đồng ý, chốt AGENT-PERMISSION-003 v1 theo kết quả hiện tại, không điều tra thêm. Giữ NOT_RUN cho thử ghi trực tiếp của hai child; giữ nguyên mã CMS, dữ liệu emulator, global config và các approval hiện hành.

The user accepted the existing result and closed this task. No further investigation or native probe is pending in AGENT-PERMISSION-003 v1. Direct write probes for both `kit-explorer` and `kit-reviewer` remain **NOT_RUN_HIGHER_PRIORITY_ROLE_CONSTRAINT**; closure does not change that evidence status. The parent fixture enforcement and three effective policy observations retain their recorded scope. Root recorded closure only in this task, the mutable setup indices and a separate [closure receipt](../evidence/permission-003-20261013-closure.json). Existing verification receipts, implementation, CMS source/data, global config and approval records remain unchanged. Any new implementation after closure requires a separately approved scope.
