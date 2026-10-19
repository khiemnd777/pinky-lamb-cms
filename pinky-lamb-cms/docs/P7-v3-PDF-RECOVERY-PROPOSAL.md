# P7 v3 — PDF runtime blocker and bounded recovery proposal

Status: APPROVED by direct user reply on 17 October 2026: “Duyệt recovery PDF local để hoàn tất P7 v3 (đề nghị)”. This approval covers the bounded repository-owned profile and audited recovery below. Global runtime mutation, historical pin replacement, job reset and quota reset remain prohibited.

Observed 17 October 2026: the real seed uploaded five client logos to READY. The credential upload retained all five parts and the original through the normal CMS upload service. PDF job `5a4c6354-3173-4b27-b60e-f9b35122aa25` returned RECOVERY_REQUIRED after TOOL_BYTES at media-tool-audit.mjs:70. No localized source update or new publication ran. :4189 retains its prior QA artifact, not a real CMS release.

Read-only verification found no differences in the local Poppler binary inventory, development header inventory, fonts or resources. The linked bundled libraries differ from the historical pinned inventory. Exact current and expected hashes are in `.local/test-outputs/p7-v3-final/pdf-tool-drift.json`. The library root belongs to the application runtime outside this repository. The cause of those changes is unknown; this is not proof of compromise or proof that the new bytes are safe.

Completed routine repairs in the approved application scope:

- Upload request union now selects its operation before parsing CREATE-only guarded fields. A regression uses the real upload service with isolated storage and verifies accepted part replay and complete queueing.
- Image raw execution validation now compares the encoder knobs actually emitted by the native image manifest against the same fixed PROGRAM encoder values. Decode, resize, metadata stripping and size limits remain in the immutable PROGRAM. The previously captured native manifest and custody check pass without reexecution. The original image job reached READY through its one allowed normal retry; four more images reached READY normally.
- Worker failures now record safe job/code/stack diagnostics in the local application log. The website UI shows actual blocked media state and permits a normal retry only when the service's quiescence/attempt checks permit it.

Recommended recovery scope, requiring a decision because it changes native runtime identity and recovery controls:

1. Prepare an isolated repository-owned PDF runtime closure. Preserve the old lock, inventories and all existing CMS history. Compare the currently installed library versions/provenance with the fixed source requirements. Copy/install only verified inputs into a new private local profile; do not mutate the application's global runtime or silently replace historical hashes. Report any required download or unverified provenance before execution.
2. Present the concrete new profile identity and exact source diff before binding it to new jobs. Preserve the old profile for interpreting historical records. No caller-selected profile, decoder bypass, raw-PDF public fallback or fake READY state.
3. Read the failed credential job, global slot and reservation state using the authenticated OWNER application. Recover only through a bounded, audited service with actual process/write quiescence evidence. If the existing state cannot prove safe recovery, report it and keep it held. Do not reset collections, quotas or leases to force progress. Preserve the retained upload and original when reuse is safe; otherwise create a new version with explicit lineage.
4. Resume the same source-bound seed, complete all 28 content media and 72 locale records, publish through the normal services, export the real CMS release and switch only :4189. Finish one bounded campaign for the affected native path and the remaining actual UI/publish/restart/rollback criteria. Do not reopen the historical harness suite.

Boundary: solo; keep original hosting backup read-only; no :5010 activation, cloud, Git delivery or publication outside local CMS/:4189.

Acceptance remains open: 28/28 media READY; 72/72 locale records read back; actual current snapshots packaged; real CMS artifact on :4189; full desktop/mobile EN/VI/JA; real Draft→Publish→website with restoration; restart and rollback; preservation of :5010 and its original backup.
