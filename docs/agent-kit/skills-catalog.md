# Skills catalog

The package has 17 logical skills, each with a canonical `.agents/skills/` entrypoint and byte-identical `.claude/skills/` copy. [Team workflow](team-workflow.md) is the only delivery process; skills supply technical help on demand. They do not create approval rounds, required agents or universal checklists.

| Skill | Use when |
| --- | --- |
| using-agent-skills | Select the minimum useful available aid |
| spec-driven-development | Clarify significant requirements and material choices |
| planning-and-task-breakdown | Organize coherent changes and real dependencies |
| incremental-implementation | Implement a complete change with developer feedback |
| context-engineering | Load/resume relevant context without restarting delivery |
| test-driven-development | Test changed behavior and meaningful regressions |
| debugging-and-error-recovery | Diagnose and repair a concrete defect |
| code-review-and-quality | Review a completed coherent result |
| code-simplification | Reduce relevant complexity while preserving behavior |
| api-and-interface-design | Design contracts and module interfaces |
| frontend-ui-engineering | Implement accessible/responsive UI and approved-template fidelity |
| source-driven-development | Verify a version-sensitive/unfamiliar approach with primary sources |
| security-and-hardening | Address relevant trust boundaries and permission/data risks |
| performance-optimization | Measure and improve an actual performance problem |
| observability-and-instrumentation | Instrument behavior needed for diagnosis/operation |
| documentation-and-adrs | Record decisions, changed contracts and operations |
| technote | Explain outcomes/evidence and requested presentation levels |

## Read and route

Read the chosen entrypoint and only relevant references. Do not preload all skills or follow a lifecycle chain. Existing stack, commands, business rules and authority come from the project. Identify effective sources when names collide; do not silently substitute or change global settings. See [runtime compatibility](agent-compatibility.md).

## Provenance

The sixteen engineering skills derive from 26 instruction-only files at [addyosmani/agent-skills commit 1401c8b8030e023baeebb31781a6653fe8e93026](https://github.com/addyosmani/agent-skills/tree/1401c8b8030e023baeebb31781a6653fe8e93026). Twenty-three canonical upstream files are adapted: all sixteen entrypoints plus definition-of-done, orchestration-patterns and the accessibility, observability, performance, security and testing references. Three upstream files retain original bytes: the MIT notice and the hardening/optimization pattern references. Original origin/pin/blob metadata remains in the manifest; adaptation means maintained local content, not byte equality with the original blob.

### Current Pinky Lamb adoption

[UPDATE-007](tasks/AGENT-KIT-UPDATE-007.md) adopts Agent Kit commit `4f5c3bc7dcb2d052e8fd28699f118a22eb1f82c5` into existing local paths, including the continuous workflow and its eight-, seven- and two-finding corrections. Links are adapted for `docs/agent-kit/`; actual Pinky Lamb domain/approval/data boundaries remain project-owned. This adoption imports no product approval from Agent Kit.

Earlier setup, UPDATE-004/005/006, template-adoption and POLICY-LOOP records retain their historical evidence. Their former process wording does not add another lifecycle. The current [effective manifest](skills-manifest-current.json) retains original upstream origins, amendments and current digests/mirror pairs. Static checks do not prove future native behavior or speed; see [verification results](verification-results.md).
