# AGENT-KIT-UPDATE-004 v1 — reporting and repair/review guidance

**State: GUIDANCE INTEGRATED — GLOBAL PRESERVATION HOLD.** Both guidance groups and the scoped integrity repairs are implemented and reviewed. Global config preservation is FAIL with cause Unknown, so complete verification and closure are not claimed. [Result receipt](../evidence/update-004-results.json). Root owns this task, shared indices and selected evidence; `agent_update` was the sole implementation writer. CMS implementation and native behavioral probes are excluded.

## Direct human approval

> Approved AGENT-KIT-UPDATE-004 v1 — phương án 1: cập nhật cả hai nhóm guidance. Giữ nguyên mã CMS, dữ liệu emulator, global config và các approval hiện hành; giữ AGENT-PERMISSION-003 CLOSED và thử ghi trực tiếp hai child NOT_RUN.

Source: direct user message in this chat, observed 2026-10-13 (Asia/Ho_Chi_Minh). This approves the two guidance groups and the associated local pin/digest, links, integrity and preservation checks. It grants no CMS, emulator, cloud, installation, Git, global-config, approval-policy or sandbox change.

## Source and approach

Base Agent Kit source: `22c2a20359072dcb510f3329b97161b16f947fb2`. Approved update source: `51b1c810a9920be7fe3957ce454fc25fedf7b155`.

- [Reporting change](https://github.com/khiemnd777/agent-kit/commit/8b70cd4ba02b63a8ef8c723564ee32df2c4147f5): adaptive opening/closing reports for conversation, planning and implementation.
- [Repair/review change](https://github.com/khiemnd777/agent-kit/commit/51b1c810a9920be7fe3957ce454fc25fedf7b155): approved-approach validity, stop acknowledgement, review reuse, justified gates and acceptance progress.
- [Exact source comparison](https://github.com/khiemnd777/agent-kit/compare/22c2a20359072dcb510f3329b97161b16f947fb2...51b1c810a9920be7fe3957ce454fc25fedf7b155): two commits, fourteen documentation/manifest files; no skill payload, native adapter or sandbox change.

Adapt only the guidance delta into existing Pinky Lamb documents. Preserve Vietnamese communication, actual Codex High/Medium routing, current CMS authority and project overlays. Do not copy upstream maintenance PASS or approvals into project evidence. Keep original AGENT-KIT-LOCK, SKILLS-LOCK, skills-manifest, historical receipts and the original static verifier unchanged. Record this approved guidance delta in a separate amendment lock and use an additive checker for the base package plus exact approved amendments. The historical verifier describes the original pin; do not rewrite its expected hashes to conceal a guidance update.

## Ownership and ordered slices

The implementation worker is the sole writer for these files and works in bounded slices. Root alone updates shared coordination.

1. Reporting/policy slice: `docs/agent-kit/technote.md`, `team-policy.md`, `team-workflow.md`, `agent-coordination-templates.md`, `skills-catalog.md`.
2. Role/scenario slice: `docs/agent-kit/roles/coordinator.md`, `explorer.md`, `implementer.md`, `reviewer.md`, and `docs/agent-kit/verification-guide.md`.
3. Integrity slice: new `engineering/AGENT-KIT-UPDATE-004-LOCK.json` and `engineering/agent-kit/verify-guidance-update.py`. Freeze the exact ten guidance changes with old/new digests and upstream provenance. All original skill/adapters/locks/manifest/receipts remain byte-identical.
4. Root integration: this task, four mutable context/plan/state/results indices and selected update evidence. Record actual checks and limits; preserve the complete historical report sections.

No child delegation, native discovery/behavior probe, application execution, CMS tests/build/HTTP, emulator lifecycle/data action, external write or process cleanup is part of these slices. A human stop takes precedence. Preserve other work; do not reset or restore changed external configuration to an older snapshot.

## Acceptance and verification boundary

- All six reporting formats and both approved guidance groups are consistent across canonical guidance, templates and four roles. Simple follow-ups remain direct; routine approved repairs do not gain per-action approval gates.
- Material approach changes, stop sent/acknowledged/in-flight/Unknown status, review validity and blocking-gate reasons retain approval, data-protection and quality boundaries.
- Added native/scenario guidance is Written only. Native behavior, fixture scenarios and two-machine compatibility remain NOT_RUN in this update. AGENT-PERMISSION-003 remains CLOSED; both direct child write probes remain NOT_RUN_HIGHER_PRIORITY_ROLE_CONSTRAINT.
- The additive integrity checker validates unchanged base locks/manifest, exact amendment paths/digests, original skills/mirrors/adapters and local Markdown links. It must reject unapproved digest/path changes. Do not install dependencies or execute upstream scripts.
- Read-only preservation checks verify protected application/source records, all emulator records, current global config hash/mode, current approval records, existing runtime scripts and all prior permission/discovery receipts.

## Preflight observation

Protected approval/adapter/base-lock hashes match the preceding permission receipt; AGENT-PERMISSION-003 is CLOSED with both child probes NOT_RUN. Current global config hash differs from the historical permission snapshot, with its mode unchanged. This update makes no claim about the cause and preserves the current configuration as its baseline. Raw global configuration is not copied. [Preflight](../evidence/update-004-preflight.json) records hashes and scope only.

The unchanged historical static verifier ran before guidance writes and returned FAIL for eight already-changed CMS source files: `admin/auth.mjs`, `admin/config-local.mjs`, `admin/review.mjs`, `admin/site-editor.mjs`, `admin/source-review.mjs`, `docs/LOCAL-RUNBOOK.md`, `scripts/local-guard.mjs`, and `vite.config.mjs` under `pinky-lamb-cms/`. All 746 emulator records matched the historical snapshot. This is a pre-existing snapshot difference, not a guidance regression or authorization to repair CMS. The current preflight freezes all 3,942 historical source paths as they now exist, all emulator records, and the current CMS/infra source inventory for before/after comparison. The additive verifier must retain both this historical FAIL and the current preservation result; do not edit old evidence or restore earlier source/configuration.

## Current result

Ten guidance documents adopt adaptive reports, approved-approach validity, stop acknowledgement, review reuse, justified gates, runtime/coordination separation and V20–V25/A–G. Three templates, nine checklist items, Vietnamese communication, routing and role constraints remain. All fourteen fetched upstream Git blob hashes were independently verified by root. Source pin is recorded in the separate amendment lock; original locks/manifest/verifier and historical receipts remain unchanged.

The `agent_update` worker was dispatched with GPT-6.1 Sol Medium controls. Independent observed runtime metadata is unavailable and remains Unknown. Independent `update_review` was dispatched with High controls for the new checksum boundary. Source review found two gaps: arbitrary valid new guidance hashes supplied by the same lock, and unlisted runtime package configuration files. Both were repaired in the checker/lock. Reviewed after-hashes are now fixed independently in checker code; exact baseline package inventory admits only three mandatory update files and one exact optional final receipt. Thirteen in-memory negative cases passed without fixture writes. The reviewer confirmed both findings RESOLVED and reused its valid unchanged guidance conclusion.

Worker's final `python3 -B engineering/agent-kit/verify-guidance-update.py` returned exit 1 solely for current global config hash drift. Package/mirror/schema/link and current source/emulator/CMS inventory groups passed within that output; this is not an overall PASS. The [receipt](../evidence/update-004-results.json) records the final root run after shared-index integration.

Global config expected hash at preflight is `f6014c91ef460b47c001be3af93fd6b1fca7af1d597207fca68c009ede3715c0`; observed hash is `d41f95dcd44bcff33c154a94dbbf22b8d7c27f4e9cd4ecadba6cb092d0bf6abd`, mode `0o600` unchanged. Its mtime is `2026-10-13T08:12:38.370559+00:00`, after preflight. The user stated “tao không có thay đổi cài đặt Codex.” Metadata-only inspection found no matching config backup and no open writer at observation time. Actor/cause is Unknown. No task command wrote, restored or rebaselined global config; no raw contents were saved. This mismatch remains FAIL and blocks complete preservation acceptance. Do not conceal it, restore unknown prior bytes or extend this update into unapproved global writes.

Root integrated the guidance references and this factual result while preserving the existing CMS recovery observations. AGENT-PERMISSION-003 remains CLOSED; both direct child write probes remain NOT_RUN_HIGHER_PRIORITY_ROLE_CONSTRAINT. Native behavior, fixtures and two-machine compatibility remain NOT_RUN. No CMS action or new runtime behavior/human product acceptance is claimed. No guidance implementation/review repair remains; the unresolved condition is global config preservation and its Unknown cause.

Final root checker returned **exit 1 / FAIL_GLOBAL_CONFIG_ONLY**: 10 approved guidance amendments, 74 manifest hashes, 75 destination hashes, 136 protected hashes, exact 151 package files, 17/17 skills, 27 mirror pairs, six adapters, 52 original engineering mirror files and 322 Markdown links checked; 3,942 current source records, 746 emulator records and 3,323 current CMS source files/inventories matched. Global hash still differed from frozen preflight with mode unchanged. Supplementary eight current approval file hashes/modes matched the recorded observation; all eight observed mtimes predate the update preflight, while six are covered directly by its frozen protected records. This preserves the evidence coverage limit for the two later recovery ledgers; no approval file was written by this task. Source/read-only review and current non-global package checks are complete; overall preservation remains HOLD.
