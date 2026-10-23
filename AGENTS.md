# Pinky Lamb — project instructions

## Current authority and sources

Trả lời tiếng Việt. This project adopts the continuous workflow from Agent Kit commit `4f5c3bc7dcb2d052e8fd28699f118a22eb1f82c5`; [the update task](docs/agent-kit/tasks/AGENT-KIT-UPDATE-007.md) records the human request and routing decision. Current project status comes from [the human-confirmed closure record](tasks/plan.md). The CMS M1–M4, UI/recovery and multilingual P0–P7 plans listed there are closed; work continues only from the current human request. Kit adoption or closed-plan history grants no new execution/release authority.

Read [team policy](docs/agent-kit/team-policy.md) for authority/safety and [team workflow](docs/agent-kit/team-workflow.md) as the single delivery process. Skills, roles, historical setup documents and old routing examples add no lifecycle or approval rounds. The main session is the delivery owner and writer of this update; no separate Coordinator/Supervisor is required.

Read the assigned task and only relevant current project decisions, source and tests. [Project context](docs/agent-kit/project-context.md), [plan](docs/agent-kit/project-plan.md) and [state](docs/agent-kit/project-state.md) are indices, not independent approval sources. Read the current closure/status block in [tasks/plan.md](tasks/plan.md) before interpreting old task or register fields. Current human instructions and the actual approved task govern new work; past registers retain their dated evidence. [START-HERE](START-HERE.md) routes a new session to that current state. Old NOT_IMPLEMENTED/AWAITING_APPROVAL and incomplete checklist fields are historical for closed plans; do not use them to restart M1/P3, demand renewed acceptance or expand a current task.

## Continuous delivery

Agree outcome, material design, scope and acceptance once. Direct human approval covers routine implementation, focused checks and repairs within that scope. Complete a usable change through real callers/layers with developer-owned tests while coding; review/configured CI evaluates a coherent revision; QA/human acceptance checks usable-flow milestones. Recheck affected findings/checks and reuse unchanged evidence. A new file, bug, session or stage does not add approval/review rounds. File counts are not gates.

Pause affected work only for a material missing decision/expanded authority, a concrete incorrect or unsafe dependency, or an action lacking release/real-data authority. Always honor human stops. Continue independent authorized work; if none remains, report the actual blocker. Do not invent verification work while waiting.

For a tooling failure, identify the original check and intended assertion/usable-flow checkpoint. Make a focused in-scope repair and rerun the original check. If tooling still cannot reach that checkpoint and report a valid result, stop tooling edits in the product task even when the error changes. Report blocker, attempted repair, missing proof and a specific maintenance owner/action. Further tooling needs explicit maintenance scope. No new runner, admission/receipt system or reviewer orchestration as incidental work. A real failed business assertion remains developer work.

## Pinky Lamb product and data boundaries

Keep the chosen stack, real contracts, IDs/slugs, source/media references, permissions, immutable review/snapshot identity, concurrency/idempotency and data protections. Read DESIGN.md, current CMS specifications and task-specific QA when they affect the assigned work. Do not treat existing bugs or AI proposals as confirmed business rules.

CMS execution remains local-only with `demo-pinky-lamb-cms`, loopback emulators and `infra-local/`. No real Firebase account/login, Blaze, billing or IAM prerequisite for local work. Root `firebase.json`, static `dist/`, references, source-content/font notices and archived handoff/checksums remain historical protected sources unless a current direct approval explicitly covers them. Baseline brief is mailto/copy; do not claim a lead backend or unsupported customer outcomes.

Do not seed/reset/reimport retained data, start/restart/kill services, install/download dependencies, run migrations or publish/deploy without the action's actual authority. Do not read/expose credentials, change global instructions/configuration, or bypass sandbox, approvals, auth or quality protections.

The plans closed in [tasks/plan.md](tasks/plan.md) stay closed. A new request uses its own actual scope/authority; routine work and repairs in valid scope do not reopen old milestone approvals. [The approval protocol](docs/APPROVAL-PROTOCOL.md) distinguishes engineering approval, editorial approval and local acceptance. Closure by human confirmation does not rewrite historical PASS/FAIL/NOT_RUN, technical LOCAL_COMPLETE flags or release evidence. Preserve those records without treating old missing proof as an automatic new assignment.

For approved-template work preserve the actual approved structure, controls, interaction and responsive behavior. Compare each affected rendered screen with the reference at matched viewport/zoom/state. A representative screen is early feedback only when an unresolved design choice would be replicated. [CMS acceptance mapping](docs/agent-kit/cms-template-acceptance.md) is a scoped selection guide; unrelated lifecycle failures do not block independent visual repairs, and source/build does not prove visual fidelity.

## UI tasks — required discovery and verification

For every task creating or changing a page, module, component, CSS, dialog or responsive UI, read [the UI layout contract](docs/agent-kit/ui-layout-contract.md) before edits. Follow **AGENTS.md → UI contract → applicable checklist → rendered verification → evidence report**. This applies to new UI and repairs; skill selection or memory is not the trigger. Reuse layout tokens/components, map affected consumers, keep inner spacing owned by the component and verify nested controls at affected viewports/states. Record justified exceptions. Source/build alone is not UI verification; report NOT_RUN where observation is missing. Use the same task record and existing tests, with no extra approval/receipt lifecycle. This rule grants no data, service, Git or release authority.

## Skills, models and optional agents

Select only relevant local entrypoints from [the catalog](docs/agent-kit/skills-catalog.md). Seventeen `.agents/skills` entries and byte-identical `.claude/skills` mirrors are the active aids. Historical vendor/router/locks are provenance; do not activate or execute them as another workflow.

Keep existing Codex `gpt-6.1-sol` High explorer/reviewer and Medium implementer settings. The human approved removing runtime-proof/receipt requirements as a condition to proceed. Unknown observed model/effort is disclosed, not a reason to create a probe, switch session or stop otherwise authorized work. Claude retains `model: inherit` and does not need to prove Codex Medium equivalence before authorized work. See [model routing](docs/agent-kit/model-routing.md). Actual runtime restrictions still apply; no global setting is changed.

Delegate only when authorized and useful, with exact ownership/inputs/checks/acceptance. Children do not delegate. Explorer/reviewer return evidence without application implementation or deployment; roles do not impose sandbox profiles. The assigning owner integrates results, and shared records have one named writer. Disclose sequential self-review when no independent reviewer ran.

## Evidence and handoff

Use [TechNote](docs/agent-kit/technote.md) in Vietnamese unless the human requests another language/level. Distinguish source complete, observed behavior, human acceptance and release. PASS requires observed evidence; applicable unrun checks are NOT_RUN with a reason. A requested CODE_COMPLETE_UNTESTED handoff needs complete source/callers and usable prerequisites/manual steps; availability remains Unknown until observed.

Use one existing task record, relevant checks and the final diff. Do not rerun historical locks/checkers/receipts as current evidence or rewrite HOLD/NOT_RUN into PASS. Git metadata is stored in `.git/` at this project root; `pinky-lamb-cms/` belongs to the same repository. Preserve existing history and uncommitted work; do not initialize a second repository. Git mutations need their own explicit authority. [Git root repair](tasks/GIT-ROOT-REPAIR-001.md) records the relocation and verification.

Historical setup/update tasks and original manifests/locks/evidence remain in `docs/agent-kit/` and `engineering/`. [The effective manifest](docs/agent-kit/skills-manifest-current.json) identifies current sources and amendments; it does not grant CMS or runtime permission.
