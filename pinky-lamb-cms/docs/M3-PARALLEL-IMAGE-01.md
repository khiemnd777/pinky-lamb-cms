# M3-PARALLEL-IMAGE-01 v1 — IMAGE processor local

**State: IMAGE_CMS_INTEGRATION_SOURCE_COMPLETE / BRIEF_PARENT_SOURCE_REVIEW_COMPLETE / HUMAN_RUNTIME_ACCEPTANCE_NOT_RUN / FIRST_JPEG_AND_CONTROLLER_STOPPED_SUPERSEDED / TESTS_NOT_RUN_CURRENT_MANDATE.**

## Authority and ownership

Khiêm delegated approval and scheduling decisions to Coordinator chat `01a135e2-c142-7842-ae74-e1d8998bb073`:

> Tôi đồng ý giao quyền điều phối để bạn tự do phân tích và đưa ra quyết định Approval cho các việc đang chạy, sao cho các việc không bị đụng scope lẫn nhau, nếu conflict thì tự quyết định việc nào chạy trước, việc nào chạy sau, và các việc nào chạy song song.

The authority is **HUMAN_DELEGATED_COORDINATOR_APPROVAL**, not a direct human approval of this individual proposal. Coordinator approved the SOURCE/PURE portion of `M3-PARALLEL-IMAGE-01 v1` through `M3-PARALLEL-BATCH-01 v1`. See [coordination register](../../approvals/M3-PARALLEL-COORDINATION-01-REGISTER.json) and [frozen proposal snapshot](M3-PARALLEL-COORDINATION-01.md). Opening read-only inspection confirmed snapshot size 50,599 bytes and SHA256 `69db3eceaee253c42c09740de4ecbe38fd620d8a02c27091d77defc106c9d8a2`. Observation: 2026-10-13 16:08:06 UTC; this is an observation time, not a server message timestamp.

Scope: source implementation, synthetic pure tests and task documentation only. Syntax and focused lint are admitted. Node tests remain queued until Coordinator grants a pure runner slot. No native execution, Sharp import/decode/fixture generation, worker CLI invocation, emulator, browser, build, tool repair, installation, cloud, Git, M4 or canonical integration is authorized by this batch.

The IMAGE branch owns these new files under `pinky-lamb-cms/`:

- `cms-api/media-images.mjs`
- `cms-api/media-images-runtime.mjs`
- `tests/fixtures/media-images.mjs`
- `tests/media-images.test.mjs`
- This task record.

The branch coordinator writes this task record. Native `kit-implementer` `/root/image_processor` is sole source/test writer for the four `.mjs` files. Requested implementation route: actual `gpt-6.1-sol / medium`; parent independently inspected the worker's current `turn_context`, turn `01a13605-1553-77f2-809a-7beb0b68076b`, and confirmed model `gpt-6.1-sol`, effort `medium`, including collaboration settings. Inherited earlier parent turns are not used as worker evidence. Independent reviewer uses actual High, returns findings and does not modify application source. Children do not delegate. Preserve other agents' work.

Existing IMAGE library candidate, PDF/video/upload/V3/rights/QA ownership, shared helpers, Sharp, dependencies, locks, baseline, historical ledgers and shared indices remain protected. Routine repairs within this approved approach continue. A material delta goes to the Coordinator for a reviewed decision before dependent execution.

## Goal and contract

Deliver the standalone `CMS-M3-13` processor source for JPEG, PNG and static WebP. This is not the complete upload/lease/API/Storage/UI workflow. The frozen main M3 graph and its `CMS-M3-12` integration prerequisite are not released by standalone source completion.

`processImage({input, expectedSha256, declaredMime, attemptDirectory, signal?})` accepts an owned private local original and creates a new private attempt. Reject unknown request keys, caller executable/argv/quality/cap overrides, invalid paths, links, ownership/custody failures, input digest or MIME mismatch. Original bytes and earlier attempts are retained.

The fixed recipe uses width targets 320/960/1920 with no enlargement and WebP quality 80, alphaQuality 100 and effort 4. Full source decode precedes resizing. Apply all eight EXIF orientation transforms, including mirrors; convert to sRGB and preserve alpha. Reconstruct derivatives from decoded pixels, discard source metadata and independently decode all three outputs. Record actual dimensions, MIME, byte counts, digests and recipe. A success manifest follows complete output verification and original preservation checks only. Failure/cancel never produces a success manifest. A processor result supplies neither rights approval nor Firestore READY.

## Acceptance and verification boundaries

| Requirement | Source/pure evidence | Native evidence |
|---|---|---|
| Input <=10 MiB; edge <=8192px; <=40,000,000 pixels; one frame | Typed boundary tests; metadata and container policy | NOT_RUN |
| MIME, signature and decoder format agree | Request/signature/container tests | NOT_RUN |
| JPEG/PNG/static WebP full decode and eight orientations | Pipeline source review; native fixtures written | NOT_RUN |
| Alpha, sRGB, aspect ratio, three width targets, no upscale | Recipe/dimension policy tests | NOT_RUN |
| Strip EXIF/XMP/IPTC/ICC/orientation | Output validation source; fixture oracles written | NOT_RUN |
| Reject malformed/truncated/spoof/unallowed/APNG/animated WebP/overcaps | Bounded PNG/WebP structure and animation tests | NOT_RUN |
| Three outputs fully decoded; total <=12 MiB; SHA/size/dimensions/alpha checked | Output manifest and byte boundary tests | NOT_RUN |
| Cancel/timeout/resource failure; custody, no partial success; original preserved | Pure request/finalization cases and source review | NOT_RUN |

Pure structural checks are not a replacement for full native decode. Selecting the first frame does not prove a static input. Test names separate `pure` and `native`; selecting pure tests must not import Sharp, start a child or generate native fixtures. TDD RED execution is NOT_RUN while the runner is queued; writing tests first does not prove RED.

## Dependency and native hold

The shared immutable `verifyMediaTools()` includes PDF closure verification. [PDF evidence](M3-PARALLEL-PDF-01.md) records 12 linked bundled dylibs with SHA mismatches and `TOOL_BYTES` before native spawn. Actor/cause remain Unknown. Source-only inspection does not establish repaired tooling.

Keep the complete tool gate before child spawn and before Sharp import, including direct runtime/internal worker paths. Recheck deadline/cancellation after the gate. Do not weaken gates, rebaseline or replace them with the IMAGE candidate's separately approved fixture-only admission. Do not modify `runMediaJob`, whose IMAGE operation is setup audit with a different scratch contract, or import the PDF-owned runtime.

Native stays HOLD until separately authorized tool recovery/revision has valid evidence and Coordinator schedules the native slot. A changed tool/recipe/base needs an affected validity review before dependent work. Existing candidate authority is unaffected.

## Checks, destinations and limits

After admission, use pinned Node 22.23.3 for focused `node --test --test-concurrency=1`, `node --check` and ESLint on the owned files without `--fix`. Keep exact commands/exits and source hashes. A passing pure suite proves only the tested pure contract. Broad suite/build/native/emulator/browser are excluded.

Task fixtures/evidence may be created only in new owned namespaces:

- `.local/test-outputs/m3/parallel-image-01/<run-id>/`
- `.local/media-scratch/m3/parallel-image-01/<attempt-id>/`

Directories 0700, files 0600; not HTTP-served. Aggregate new fixture/evidence budget <=256 MiB; stop at the budget rather than deleting retained history. No existing emulator data is read or written by these tests.

The future fixed Node child source retains 30-second IMAGE timeout, heap256MiB, two processing threads, sampled process-tree RSS768MiB, scratch256MiB and 64KiB per log stream. These are best-effort observed controls, not kernel quotas or an OS sandbox. Native/resource crossings remain NOT_RUN and are reported separately from pure boundary checks. Native/browser/emulator heavy workloads use a separate Coordinator slot.

## Current evidence and next action

Opening inspection: all five owned files were absent; frozen proposal snapshot matches. Implementer dispatched with source-only ownership, runner QUEUED and native HOLD. Worker wrote test/fixture source before processor/runtime source; RED and all Node tests remain NOT_RUN. Early test source inspection identified native-oracle coverage to complete under the same ownership before source freeze.

[Opening shared-pin manifest](../.local/test-outputs/m3/parallel-image-01/coordinator-a13b7ca8-94a1-4e2a-93ec-891fe30d7517/opening-shared-pins.json), SHA256 `bf7ccda4e6f5c6b7ca3faec12064bdf060ab3e0963430fba5a4cc55e7374e225`, records current `media-tool-audit.mjs`, `media-tool-lock.json`, package.json and package-lock.json. This covers four source/dependency pins only, not actual native inventories or database preservation. Source/static/pure results and independent review will be recorded here as available.

Source freeze v1 is recorded in [source-freeze-v1.json](../.local/test-outputs/m3/parallel-image-01/coordinator-a13b7ca8-94a1-4e2a-93ec-891fe30d7517/source-freeze-v1.json). Parent independently matched all four worker-reported source digests and the four opening shared pins. Worker reports four `node --check` exits 0 and focused ESLint over four files exit 0; parent has not rerun unchanged checks. Six pure tests and three explicitly held future native groups are written. Tests were written first, but RED/GREEN remain NOT_RUN_QUEUED. Actual native crossings/live cancellation/reaping/races remain NOT_RUN.

Independent `kit-reviewer` `/root/image_source_review` returned **REQUEST_CHANGES_SOURCE_ONLY** on source freeze v1; all four hashes matched before/after review. Reviewer current turn `01a1360e-b9c0-7c41-bed0-e1ed52c4c892` reports observed `gpt-6.1-sol / high`; inherited parent xhigh records were excluded. Source review does not establish native acceptance.

Required findings assigned to the same sole writer under current source approval:

1. P1: direct `manifest.json` write precedes fsync/close/post-custody checks; a rejection can leave a success JSON. Prepare a private staged record and publish success only at a deliberate commit point after failure-prone checks. Retain failure evidence and regressions for write/fsync/close/custody failure.
2. P1: original/output verification occurs before later tool/receipt awaits. Recheck identity/custody/bytes/digests in the final commit sequence and refuse changed original/derivative without success publication. Retain the limitation that leaf O_NOFOLLOW does not eliminate ancestor check/use races.
3. P2: request MIME lookup permits object coercion. Require primitive string before lookup and cover boxed/coercible values in pure regressions.

Unaffected source review conclusions: full decode before resize, eight EXIF transforms including mirrors, raw reconstruction/metadata stripping, three fixed widths, output verification, complete tool gate before spawn/import and native-free pure top-level imports. Reuse these while their inputs remain valid.

Native limits remain explicit: a 25ms abort timer does not prove a child started; process-group-only enrollment does not prove accounting of descendants that change process group. Live cancel/reaping, resource crossings and filesystem race behavior are NOT_RUN. Do not claim whole-tree containment or complete processor acceptance.

**Pure runner request:** ready for one focused runner, concurrency 1, Node heap256MiB, 30-second file timeout. The two global pure slots currently belong to V3 C0 and upload U0; no runner has started here. Await explicit Coordinator admission before Node tests. Native stays HOLD_TOOL_BYTES.

Next: sole writer closes the three Required source findings and freezes the affected delta for review, then executes focused pure tests only after slot admission. No messaging to other chats is needed; Coordinator reads status. No M3-AC04 acceptance, module native completion, M3 Accepted or LOCAL_COMPLETE claim.

## FINALIZE-01 v1 — Proposed, awaiting Coordinator decision

The Required failure-publication finding exposed a contract choice. Node's standard filesystem API has no atomic rename-NOREPLACE. Ordinary rename can overwrite a destination that appears between checking and publishing. The implementer proposes exclusive `linkSync` publication from a fully prepared, fsynced and closed private staging record, retaining the staging record as evidence. This makes the exact final record pair have nlink2. The original proposal has no explicit final-record-only hardlink exception, so publication changes are held pending a Coordinator decision. The same file allowlist alone does not approve this material contract delta.

**Recommendation:** approve the following bounded source amendment; do not authorize native execution or release tool/runner holds.

- Keep the existing four source/test files and this task record as the full ownership. No helper/dependency/pin/ledger/shared-index edit.
- Prepare one fixed staging record in the newly owned private attempt. Finish bounded write/fsync/close, cancellation/deadline checks and final original/output identity/custody/byte/digest checks before publication.
- Use exclusive `linkSync` as the final manifest commit point, refusing an existing destination without overwriting it. No failure-prone I/O follows successful publication. Retain the staging record and partial failed staging evidence; do not delete original/derivatives/prior attempts/history.
- Permit nlink2 only for the exact owned manifest/staging pair with the same inode/dev, private uid/mode and prepared record bytes. Original, derivatives, tool inputs and other records retain nlink1 checks. Do not add a general hardlink allowance. Consumers must not silently use the single-link reader for this explicit pair; integration remains outside scope.
- State cancellation relative to the publication commit point. Do not claim directory-entry power-loss durability, atomic ancestor confinement or kernel isolation. Same-UID external filesystem mutation remains a limitation rather than a passed enforcement test.
- Write focused pure regression oracles for prepublication write/fsync/close/custody/hash failures, changed original/output, existing-destination refusal, and exact successful pair publication. Run only after an admitted pure slot; these tests cannot establish native image decoding.

**Acceptance:** an observed failure before publication leaves no newly published success manifest; existing destinations and retained originals/outputs remain unchanged; after successful publication no subsequent close/fsync/custody operation can turn success into a rejected promise. Original/output integrity is rechecked after prior awaits. Known-pair policy is explicit and bounded; arbitrary hardlinks stay denied.

**Source work while awaiting decision:** MIME primitive/coercion regressions and synchronous final-integrity preparation are written. Final-integrity code captures original/output custody and rechecks bounded bytes/digests before publication. The old direct-publication body remains unchanged, so the P1 publication finding remains unresolved. Staging failure regression oracles are written against the proposed design and are NOT_RUN_PENDING_FINALIZE_APPROVAL, not evidence that the current publisher passed.

The [unaffected-repair-v2 freeze](../.local/test-outputs/m3/parallel-image-01/coordinator-a13b7ca8-94a1-4e2a-93ec-891fe30d7517/unaffected-repair-freeze-v2.json) matches all four worker hashes and the four protected opening pins. Worker reports four final syntax checks and focused lint exit0; no Node tests, Sharp/native, runtime fixtures or data operations ran. Current worker turn `01a13613-8ba2-7611-86d0-a9a2f0004874` reports `gpt-6.1-sol / medium`. Native cancel test labels now explicitly retain CHILD_START_NOT_PROVED; runtime metadata describes sampled owned process-group RSS and unobserved descendants leaving the group, not full-tree containment.

Publication edits remain HOLD until Coordinator approves a bounded primitive/contract decision. Native remains HOLD_TOOL_BYTES, Node tests remain QUEUED. No new native execution or data authority is requested.

Coordinator decision wording:

> Approved M3-PARALLEL-IMAGE-01 FINALIZE-01 v1 — SOURCE/PURE only; exact owned staging/manifest nlink2 exception and exclusive commit semantics as proposed. Original/output single-link guards remain. No native/runtime/tool repair or integration release; Node tests require pure slot admission.

## M3-PURE-POOL-02 — safe selected batch admitted

Coordinator decision `M3-PURE-POOL-02`, observed in the coordination register at 2026-10-13 16:27:58 UTC, releases U0/C0 slots and admits one IMAGE and one VIDEO focused pure runner. IMAGE current register field is ADMITTED_ONE_PURE_RUNNER. Limits: concurrency1, pinned Node22.23.3, heap256MiB, stricter proposal deadline/output/evidence limits, no native groups, decoder imports or full native audit.

The publication finding remains unresolved and FINALIZE-01 has no approval in the current decisions. Therefore filesystem finalization/mutation tests are not admitted yet. Sole Medium writer is assigned one safe command selecting only:

`^pure: (request|MIME|signature|PNG|WebP|metadata|candidate)`

These seven tests have no fixture IO and do not call the publisher/native runtime. Log/evidence capture uses the new owned parallel-image-01 namespace. After this single safe batch completes, release the slot and report no pending runner; do not automatically dispatch additional tests. Full pure completion remains dependent on the publication decision and a new slot. RED originally could not run while queued; a safe initial GREEN is not retrospective RED evidence.

## Tool-recovery consumer ACK — full IMAGE only

Coordinator `M3-TOOLS-RECOVERY-01 v2 A_SOURCE_PURE_01` is conditional. PDF/tool owner is the sole writer of existing `scripts/media-tool-audit.mjs`, `cms-api/media-pdf.mjs`, `cms-api/media-pdf-runtime.mjs`, and new `tests/media-tool-scopes.test.mjs` / `docs/M3-TOOLS-RECOVERY-01.md`. Full IMAGE owns none of those files and writes none of them. IMAGE reads/imports the audit helper for signature/file/tool/process checks; it does not import the PDF implementation/runtime.

Current IMAGE pure batch requires the original shared audit SHA256 `56d122ed0226c371a72e5048996508024e133a2b09e8d05b7e5e5f6b987fc2fc`. Recovery A shared writes wait for this batch's actual completion/freeze, the other consumer ACKs and approved source-plan review. Our slot release does not prove VIDEO completion or satisfy its ACK.

Conditions to accept a later explicit approved shared-source delta:

1. Attribute the new helper source revision/digest separately; do not refresh old receipts or claim the old helper bytes remain unchanged.
2. Preserve immutable tool lock, package/dependency bytes, global bundled libraries and all other protected sources. The expected exception is the exact approved audit helper source only, not a blanket allowlist.
3. Relevant High compatibility/delta review must retain helper exports/pure import behavior and complete required closure, path/link/loader guards. Default ALL/PDF remains fail-closed on current drift. Operation mapping is a fixed source allowlist; caller cannot supply a verification scope to omit required dependencies.
4. A subsequent IMAGE caller change or per-kind native release needs its own reviewed Coordinator decision, complete closure/loader evidence and scheduled slot. A source-only A approval does not release IMAGE native, filesystem tests or integration.

No candidate helper exception is requested here. The existing IMAGE candidate owns its separate source snapshot/admission; its chat must provide its own ACK. This ACK covers the full IMAGE processor branch only.

## Safe pure batch result — Verified within selected scope

Exactly one admitted command selected the seven non-fixture pure tests. [Command](../.local/test-outputs/m3/parallel-image-01/pure-safe-6cf18ff2-b3db-456d-9944-1d39445a4c75/command.json) and [result](../.local/test-outputs/m3/parallel-image-01/pure-safe-6cf18ff2-b3db-456d-9944-1d39445a4c75/result.json): **PASS7/7**, fail0, exit0; stdout1,598 bytes, stderr0. Start 2026-10-13 16:34:11.099868 UTC; completion 16:34:11.205103 UTC. TAP duration58.263542ms. Node used heap256MiB/concurrency1 and the admitted selector. Native/Sharp/tool audit/runtime/fixture generation did not run.

Worker current turn `01a1361c-1991-77f0-9d69-46b457c12bce` reports observed `gpt-6.1-sol / medium`. Pre/post source, Node and helper SHA/custody records match; parent independently matched current four source hashes with unaffected-repair-v2 and the original helper SHA. Evidence directories0700/files0600. No old evidence is overwritten.

Direct child PID32831 exited0 and was reaped. The worker explicitly **RELEASED IMAGE PURE SLOT** and reports no pending runner/session. `/bin/ps` was denied before/after; whole-group/OS-wide process absence remains Unknown. No escalation or permission change occurred. This is bounded pure command completion, not native tree containment. No additional tests auto-dispatch after release.

Filesystem finalization/mutation tests remain NOT_RUN_FINALIZE_01_HOLD. Native/resource/decoder/livecancel remain NOT_RUN_HOLD_TOOL_BYTES. Original RED remains NOT_RUN_QUEUED. This seven-test result is not full pure completion, source review PASS or M3-AC04 acceptance.

## M3-C0-IMAGE-ALIGNMENT-01 v1 — compatibility handoff ACK

Coordinator approved a source-only C0 revision to match the inspected IMAGE recipe. Full IMAGE keeps width targets320/960/1920, exact three distinct target buckets/logical filenames and no upscale. Equal effective widths are valid for small originals. Effective width is min(targetWidth, oriented original width); height follows oriented aspect ratio, bounded by original8192px/40Mpixel caps rather than a1920px cap on both axes.

The existing IMAGE source/candidate policy already carries targetWidth on each output and does not deduplicate by effective dimensions. No IMAGE recipe/source change is made for provisional C0. C0 golden examples portrait2000x3000->1920x2880 and tiny120x80->three equal-size buckets are compatible with the inspected processor policy; actual native examples and integrated C0 compatibility remain NOT_RUN.

This processor's private manifest has no Storage generation yet because Storage integration is excluded. The future integration owner maps immutable returned Storage generations and the full processed set into reviewed C0/rights projection; neither a source alignment decision nor the seven pure tests proves that binding. TargetWidth is an IMAGE field; no PDF/VIDEO/candidate/legacy contract is changed. A/B/C/I/full-binding/native/integration gates remain separate.

## Exact recovery-A consumer ACK — frozen batch completed

The PDF/tool owner requested ACK for the following exact source-only operation mapping: IMAGE->IMAGE; POSTER/PROBE/TRANSCODE/DECODE/EXTRACT_POSTER/FIXTURE_VIDEO*/external-reference audit->VIDEO; PDF/worker/probe->PDF; legacy Node resource probe->ALL. Default `verifyMediaTools()` remains strict ALL and rejects the current PDF drift.

**Full IMAGE ACK:** no ownership overlap. This branch writes none of recovery A's audit helper, PDF main/runtime, scope tests or recovery doc. All existing IMAGE verifier calls use the default ALL form and ignore the verifier's returned capability object. Limiting that return object to actually verified capabilities does not create an observed IMAGE return-field dependency. No consumer source change is made just to ACK. IMAGE depends on preserved `detectImageSignature`, `readRegularFile`, `parseProcessSnapshot`, native-free pure imports and default ALL semantics.

The current admitted IMAGE batch is complete, source frozen, direct child reaped and slot RELEASED; no active or pending runner is owned by this branch. OS-wide absence remains Unknown because ps was denied. Read-only ACK inspection confirmed the original audit SHA and all four unaffected-repair-v2 hashes still match:

| File | Frozen SHA256 |
|---|---|
| cms-api/media-images.mjs | 3fda94278380d39393607200004a855e5a00e79d794920c5484c4c524332d7f6 |
| cms-api/media-images-runtime.mjs | 15a77787f5c663791ad260df18a5613a33a5135c9175aa3d25ec9d91655c6f8d |
| tests/fixtures/media-images.mjs | ca626922e127f308896777df4a4263f0934480f077754e560c29aeeca89b10de |
| tests/media-images.test.mjs | 85c994f1e021a91faf5dc1d25a2f0794334bfa1017db09e5fb10be5d7b53e3ef |

Accept the later audit source delta only after the Coordinator's existing recovery-A conditions are satisfied, including other consumer completion/ACK and independent High plan/source review. Keep fixed Node, immutable lock, complete common package+aux exact byte/tree checks and Sharp IMAGE closure; VIDEO still requires FFmpeg/ffprobe plus common Sharp poster closure; PDF retains complete binary/link/library/font/data/header closure. Reject arbitrary verificationScope/argv/options, unknown modes/arity and mismatched scope/recipe before load/spawn. Recipes/protocols/outputs/caps/path/link/loader restrictions and historical evidence remain preserved.

Record any later new audit digest as the separately approved source delta. Do not refresh historical receipts or apply blanket preservation exceptions. Existing IMAGE caller changes, per-kind native release and any test rerun still need their reviewed decision/admission; this ACK is not an execution approval. FINALIZE-01 and filesystem tests remain held. IMAGE candidate must ACK its separate snapshot/controls itself.

Historical communication limit: at the first ACK inspection no direct human text confirming this branch's outbound messaging to the PDF chat was found, so the ACK was initially posted only in this chat/task record. That limit is superseded by the direct authorization below; an incoming agent request alone still does not grant messaging permission.

## Direct messaging authorization and FINALIZE-01 coordination

Khiêm directly authorized in this full IMAGE chat:

> Tôi cho phép bạn gửi ACK trực tiếp sang chat PDF và phối hợp với Coordinator để xử lý FINALIZE-01 trong phạm vi M3 đã duyệt.

Under this direct authority the branch sent the exact recovery-A ownership/preservation ACK to PDF chat `01a135ca-5716-7c20-9920-bbd64ddcbbfa` and the FINALIZE-01 decision/slot request to Coordinator chat `01a135e2-c142-7842-ae74-e1d8998bb073`. Both send tools returned success. Sending is not receiver acknowledgement or an approval decision.

The decision request preserves the four source/test paths, prepared immutable staging record, final original/output recheck, exclusive publish point, exact nlink2 pair only, single-link originals/derivatives, retained evidence and no post-publication I/O. It requests source-only approval and a separately scheduled pure slot after Required source controls close; no native/helper/tool/integration release. Routine scoped repair may resume under the Coordinator's actual decision, not from the act of sending the request.

Source verification for the proposed primitive: [Node22.23.3 fs.linkSync](https://nodejs.org/download/release/v22.23.3/docs/api/fs.html#fslinksyncexistingpath-newpath) is the synchronous hardlink API. The [Apple archived link(2) manual](https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man2/link.2.html) specifies atomic directory-entry creation and EEXIST when the destination exists, with both names on the same filesystem. These documentation facts support the exclusive-publication proposal; they do not prove this implementation's actual behavior, filesystem race protection or directory-entry durability. Runtime tests remain NOT_RUN.

## FINALIZE-01 independent plan review

Actual High reviewer current turn `01a13632-3a83-7e80-9a5c-15beccb92394`, observed at 2026-10-13 16:57:03.921 UTC, returned **PLAN_ACCEPTABLE_WITH_LIMITS**. No edits, tests, runtime or native invocation occurred. Reviewed task-doc SHA before this result was appended: `dff598da3e468329bd180ebf41fcbc42a1e26ad87142931cbde30befcbf3688c`; processor/test hashes match unaffected-repair-v2. This record update does not change the proposed mechanism.

Implementation must complete staging write/fsync/close, verify staging regular nlink1 and exact identity/uid/mode/bytes/hash, then recheck original and each output and attempt ancestry/custody. Check cancellation/deadline immediately before exclusive linkSync. Link success is the final commit point; no I/O/verification or operation that can reject follows it. Fixed owned filenames only; existing destination refuses without overwrite/unlink. No generic reader change to accept hardlinks. Retain the staged/failure records.

Required regression oracles include original/output/staging mutation, preparation write/fsync/close/custody failure, destination collision, precommit cancellation/deadline and successful expected pair publication with original/output/existing destination preservation.

The exact nlink2 pair is an expected result under the no-external-mutation assumption, not an OS enforcement PASS. Same-UID mutation between the last check and link remains possible. The design does not prove atomic ancestor confinement, directory-entry power-loss durability or a hard deadline while a synchronous filesystem call blocks. A post-publish fallible recheck cannot be added while promising that successful commit never becomes a rejected promise.

The verdict and safeguards were sent to the Coordinator under the direct human messaging authority. **Approval is still pending; source publication P1 is still open.** Plan review is not approval or implementation PASS. The sole Medium writer resumes publication only after the Coordinator's actual decision; filesystem tests wait for a new pure slot after the relevant source controls close.

## FINALIZE-01 decision and M3-PURE-POOL-03 admission

Coordinator delivered **Approved FINALIZE-01 v1 SOURCE/PURE filesystem** under Khiêm's delegated decision authority. Parent independently read decision `M3-PARALLEL-IMAGE-01-FINALIZE-01` in the coordination register: `COORDINATOR_APPROVED_SOURCE_PURE_FILESYSTEM_ONLY`. Approval applies to the proposal at lines95-124 and the existing four source/test paths plus this task record. The earlier pending statements above are historical and superseded by this decision.

Only the exact private staging/manifest pair may have nlink2; originals, derivatives, tools and all other records retain nlink1. Exclusive link commit follows all preparation write/fsync/close and final integrity/custody/signal/deadline checks. No failure-prone I/O follows successful publication. Existing destinations are refused; staging and failure evidence are retained. A bounded exact-pair reader is permitted in the owned source; general consumer integration remains unopened. The High plan safeguards and known filesystem limitations remain binding.

`M3-PURE-POOL-03` re-admits one focused native-free IMAGE filesystem/finalization runner after the source fix. Keep pinned Node22.23.3, heap256MiB, concurrency1, original30s command limit, tiny synthetic records and new owned evidence/scratch namespaces. Relevant High affected source/control review precedes dispatch. Shared audit remains at original SHA256 `56d122ed0226c371a72e5048996508024e133a2b09e8d05b7e5e5f6b987fc2fc` through this batch; recovery A canonical promotion waits actual completion/freeze/slot release. No Sharp/decoder/worker/media fixture generation, native or integration release.

The same sole Medium writer was resumed for source and static checks only. Parent will assign the admitted test command after the affected High review. Prior safe7 result and original RED NOT_RUN remain unchanged; no retrospective RED claim.

## FINALIZE-01 source freeze and affected High review

[finalize-source-freeze-01.json](../.local/test-outputs/m3/parallel-image-01/coordinator-a13b7ca8-94a1-4e2a-93ec-891fe30d7517/finalize-source-freeze-01.json) records parent-matched four source hashes. Main SHA256 `24254aac46a7985b86842d5d9ce23f6085fa7a2de6af1ab8e01a0db4a05bb89d`; test SHA256 `5f7949e5187b906967eeb73529e27d8330e257d311023fc384531b7883affcad`. Runtime and fixture hashes remain unaffected-repair-v2. Parent independently matched all four opening shared pins and inspected actual worker syntax4/4 and focused ESLint command results, exit0. Worker current turn `01a13638-0fab-7b72-b276-9dfe23a27fe3`, line331, observed actual `gpt-6.1-sol / medium`.

High reviewer current turn `01a1363b-3b90-7763-9650-f7f6c4188101`, observed 2026-10-13 17:06:54.087 UTC, returned **PASS_SOURCE_CONTROL** for this freeze. The two P1 source findings and MIME P2 are closed at source level. Fixed stage preparation, final original/output checks and precommit cancellation/deadline precede exclusive linkSync; no fallible I/O follows successful link. Explicit pair reader retains exact fixed names, inode/dev, nlink2, UID/private mode and bounded expected bytes/digest checks. Generic readers remain single-link. Reviewer rehashed four source files and helper before/after with matching results and performed no tests/writes/native calls.

One **Required verification gap** remains: filesystem tests must assert original/output bytes and full custody before/after, not only manifest outcomes or nlink. Collision also needs existing destination custody. Deliberate mutation tests must capture state after injection, prove no further finalizer changes and preserve uninjected files. This is missing acceptance evidence, not an additional source/control defect. The same sole writer received a routine test-only oracle repair; tests remain NOT_RUN pending this narrow High follow-up. Unaffected processor/recipe/runtime conclusions remain valid.

## Preservation oracle follow-up and filesystem dispatch

The same sole writer changed only `tests/media-images.test.mjs`, new SHA256 `e41426527c19b552ae79a3892eb72e87ecb8d6b288f84252083cd5d6d76b9d2d`. [finalize-oracle-freeze-02.json](../.local/test-outputs/m3/parallel-image-01/coordinator-a13b7ca8-94a1-4e2a-93ec-891fe30d7517/finalize-oracle-freeze-02.json) records parent-matched source/shared hashes and independently observed current worker turn `01a1363c-ae09-7082-9245-827dcf64ab94`, line391, actual `gpt-6.1-sol / medium`. Parent inspected actual affected test syntax/lint exits0. Three other source files and four opening shared pins match.

High follow-up current turn `01a1363d-d907-7960-a948-5ad0d1aa4c5d`, observed 2026-10-13 17:09:45.390 UTC, returned **PASS_SOURCE_AND_VERIFICATION_PLAN**. The Required preservation oracle gap is closed in test source. Snapshots now compare bytes and dev/ino/uid/mode/size/nlink/mtimeMs/ctimeMs for originals/three outputs; deliberate mutation cases compare the immediate post-injection state and other unchanged files. Collision compares existing destination bytes/custody. Review rehashed inputs and performed no tests/writes/native actions.

Parent assigned exactly one admitted `M3-PURE-POOL-03` filesystem command, cwd CMS root, pinned Node22.23.3: `--max-old-space-size=256 --test --test-concurrency=1 --test-name-pattern='^pure: (finalization|mutation|exclusive|successful|exact pair)' tests/media-images.test.mjs`. The selector covers six filesystem groups and their sequential subtests; no previous safe7 or native groups rerun. The runner must enforce30s wall time and64KiB per log stream, private fresh evidence/tiny fixture namespaces and the256MiB aggregate budget. Preserve actual results on failure; no automatic rerun or edits. Actual completion/freeze/direct-child reap and slot RELEASED must be reported before recovery canonical promotion. A dispatched command is not a test PASS.

## Filesystem batch 01 — FAILED, preserved evidence and slot release

The exact one admitted command exited1. [result.json](../.local/test-outputs/m3/parallel-image-01/pure-finalize-f3d2a8c2-f614-4b92-be3c-77d326c1e59b/result.json) and [stdout.log](../.local/test-outputs/m3/parallel-image-01/pure-finalize-f3d2a8c2-f614-4b92-be3c-77d326c1e59b/stdout.log) record TAP24 total,22 pass,2 fail: the custody subtest and its containing preparation group. Five of six top-level groups pass. Parent read the actual result and failure output. Start2026-10-13 17:12:14.325643 UTC, completion17:12:14.546763 UTC; stdout4,883bytes, stderr0. Direct child37318 was reaped; no pending runner/session. **M3-PURE-POOL-03 IMAGE slot RELEASED.** No automatic rerun or source edit was performed by that batch.

Verified localization: the custody fault mock spread a real `Stats` into a plain object and changed ino. This removed prototype methods. The finalizer therefore raised `TypeError: st.isSymbolicLink is not a function` before the intended `IMAGE_ATTEMPT_CHANGED` branch; the unchanged assertion correctly failed. This does not prove the intended custody refusal. Actual other fault/mutation/abort/deadline/collision/success/pair-refusal cases pass within their tested scope; the entire batch remains FAILED.

Worker actual turn `01a1363e-f15a-7452-9fae-42e9fe9d63f4`, independently observed line424, model `gpt-6.1-sol / medium`. Pre/post four source files, shared helper, Node, immutable lock, package JSON/lock/inventory hashes and custody remain unchanged.110 new fixture files in20 directories total1,855 logical bytes; captured UID/modes are valid0600/0700. Prior scratch remains unchanged. All failed staging/old receipts are retained. ps denied with PermissionError; OS-wide/group absence remains Unknown. No Sharp/native/full tool audit/runtime/media generator ran. Heap flag and30s/output wrapper bounds do not prove hard OS RSS containment.

Parent sent actual completion/freeze/FAILED/slot release to Coordinator and PDF under the direct human authorization, then requested a new one-run admission after a routine test-only mock repair and High follow-up. Recovery helper promotion scheduling remains the Coordinator's decision. No receipt is rebaselined to report PASS.

Sole Medium writer repaired only the mock, preserving the real Stats prototype and deliberate ino mismatch, and added assertions for callable correct type predicates and different identity. Test expectations/preservation assertions remain intact. New test SHA256 `467e0562438ea692bafb815735b0014ef42da2b35e061018bcb9461da529d928`; main/runtime/fixture/helper remain frozen. Affected syntax/lint exit0. High narrow review and **new** Coordinator runner admission are pending. The old admission is consumed and released; no repeat test command is authorized yet.

## Mock repair High follow-up — source ready, new admission pending

High reviewer actual current turn `01a13641-b4c1-7d41-96be-13f374d3b96d`, observed2026-10-13 17:13:58.253 UTC, returned **PASS_SOURCE_AND_VERIFICATION_PLAN_REPAIR**. No Required finding. Fresh real Stats keeps its prototype; only the returned ino is deliberately changed. Assertions confirm callable predicates, true directory/false symlink and a mismatched identity. Expected custody error and full preservation remain intact. Reviewer read old failed output, rehashed new test and unaffected source/helper before/after, and ran no tests/writes/native actions.

[finalize-mock-repair-freeze-03.json](../.local/test-outputs/m3/parallel-image-01/coordinator-a13b7ca8-94a1-4e2a-93ec-891fe30d7517/finalize-mock-repair-freeze-03.json) records parent-matched source/shared hashes and independently observed current Medium writer turn `01a13641-0a65-7e70-9f02-3f6aab8fcacb`, line456, and High reviewer turn, line231. Source/control and preservation-plan conclusions remain valid; the full filesystem gate is not PASS until the repair is executed.

Parent sent the concrete High-reviewed repair/freeze and new one-run request to Coordinator. Request retains exact selector/pinned Node/caps/new owned fixture/evidence scopes and original helper H0. No test repeat is dispatched from a request or silent wait; actual new admission and helper scheduling decision remain required.

## M3-PURE-POOL-04 — FIRST QUEUED, no execution admission yet

Coordinator recorded `M3-PURE-POOL-04 v1` under **HUMAN_DELEGATED_COORDINATOR_APPROVAL**. Parent independently read the register: old IMAGE/recovery batches are released; QA and C0 receive the two current pure slots. The faithful Stats mock repair and retained FAILED24 evidence are accepted within FINALIZE-01. IMAGE is the **first queued H0-dependent filesystem rerun** on the next returned slot. No borrowing or automatic rerun; a concrete follow-up admission is required before dispatch. Source/control and narrow High review remain valid, so no broad review repeat is requested.

Parent rechecked the four repair source pins and canonical helper H0, all unchanged. Recovery decision `M3-TOOLS-RECOVERY-01-H2-PRESERVATION-01` records the exact future helper exception H0 `56d122ed0226c371a72e5048996508024e133a2b09e8d05b7e5e5f6b987fc2fc` to H2 `38f0bedc69b9e006cf1e9a16ac010061691c1b2ea8a74dffbd0d4b127ab4bd7d`, but **canonical promotion remains HOLD** until the queued IMAGE H0 rerun completes/freezes, the separate candidate preservation ACK arrives and Coordinator issues the explicit promotion task. H2 source review is not Green or native proof; old receipts and staged H0 remain unchanged.

Full IMAGE acknowledges the queue and preservation order. No source edit, Node test, native action or integration was dispatched from this scheduling message. Actual next action belongs to Coordinator: deliver the concrete returned-slot admission; the same Medium worker will run the frozen selector once with existing caps and fresh owned evidence.

## M3-PURE-POOL-05 — concrete one-run admission

Coordinator delivered **ADMITTED NOW ONE native-free IMAGE filesystem rerun**. Parent independently read decision `M3-PURE-POOL-05 v1` in the coordination register, lines594-618. QA/C0 slots are returned; IMAGE and VIDEO receive the two current pure slots. This supersedes the earlier queued state without opening additional work. Recovery canonical promotion remains HOLD until **both** H0-dependent IMAGE and VIDEO batches complete/freeze and no readers remain pending; this branch does not attest VIDEO completion.

Parent rehashed all four repaired IMAGE files against freeze03 and original helper H0; hashes match. The same actual Medium worker received the exact prior six-group selector, pinned Node22.23.3, heap256MiB/concurrency1/30s command deadline/64KiB per stream. Source/control/High faithful mock repair conclusions are reused; no edits or broad review/static repeats. Use fresh private tiny fixtures/evidence, retain failed24/history and report actual counts/completion/direct-child reap/freeze/slot RELEASED. No automatic additional run, native/verifier invocation/media generation or integration. Dispatch does not prove PASS.

## M3-PURE-POOL-05 filesystem result — Verified within FINALIZE-01

Exactly one rerun of the approved repaired six-group selector completed **PASS24/24**, exit0, fail0, cancelled0, skipped0; six top-level groups and18 subtests. TAP duration157.629458ms. [Command](../.local/test-outputs/m3/parallel-image-01/pure-finalize-repaired-d50864e7-44b6-45de-9667-cb0e542de325/command.json), [result](../.local/test-outputs/m3/parallel-image-01/pure-finalize-repaired-d50864e7-44b6-45de-9667-cb0e542de325/result.json) and [stdout](../.local/test-outputs/m3/parallel-image-01/pure-finalize-repaired-d50864e7-44b6-45de-9667-cb0e542de325/stdout.log) are retained. Start2026-10-13 17:33:54.260125 UTC, completion17:33:54.453400 UTC; stdout3,768 bytes, stderr0. Actual worker current turn `01a13653-17c1-7a12-8c22-31acdfda1994`, independently observed line481, is `gpt-6.1-sol / medium`.

Parent read actual result/command/TAP, independently compared all12 tracked before/after hash+custody records, matched current four source files against freeze03 and verified canonical helper H0 unchanged. Evidence directory0700 and all nine files0600. New fixtures110 files/20 directories,1,855 logical bytes, captured UID/modes valid0600/0700. Prior scratch and old failed receipts/evidence remain unchanged. No source edit or further static/source review repeat was needed. No automatic extra runner was dispatched.

Direct child39148 exited0 and was reaped. **M3-PURE-POOL-05 IMAGE slot RELEASED**; worker reports no active/pending owned runner/session. ps denied before/after with PermissionError, so group/OS-wide process absence remains Unknown; no escalation or permission change. Heap and supervised wall/log bounds are not hard OS RSS containment.

This closes the approved **FINALIZE-01 source and synthetic filesystem** checks: preparation failures/custody/hash faults; stage/original/output mutation refusal; precommit cancellation/deadline; collision without overwrite; exclusive successful exact pair; single-link generic reader refusal and bounded pair-reader negatives. Preservation assertions verify original/output bytes and custody, deliberate post-injection state and existing destination. High source/control/verification-plan results are reused while their inputs remain frozen. Earlier safe7 and failed24 evidence remain separate; no retrospective RED or rewritten receipt.

Full IMAGE actual completion/freeze/slot release was sent directly to Coordinator and PDF under Khiêm's messaging authority. This closes only this H0 reader batch. VIDEO completion remains Unknown and is not inferred; recovery canonical H2 promotion still requires both owner completions, separate candidate preservation ACK and explicit Coordinator promotion task.

Sharp/native processing, full tool audit, resource crossings/live cancel/OS races, upload/lease/API/Storage/UI integration and M3 acceptance remain NOT_RUN/HOLD. Same-UID filesystem mutation, atomic ancestor confinement, power-loss directory durability and caller/transport uncertainty retain the documented limitations. This result grants no rights approval, READY, M3 completion or LOCAL_COMPLETE. No required work remains in the admitted FINALIZE-01 source/filesystem batch; subsequent processor/native/integration tasks need their own current authority.

## IMAGE-H2-CONSUMER-01 v1 — Proposed, READ/PLAN ONLY

Coordinator acknowledged actual IMAGE24/24 source/filesystem evidence and slot release, then requested only the remaining minimal native cases and a recovery-affected source proposal if needed. Native/full pipeline remain HOLD; no new Node/native dispatch or application edit is authorized by that request. Coordinator now records exact H2 source promotion as conditional on candidate READY. That decision is not effective promotion, Green or native evidence.

**Verified:** read-only source inspection finds six default `verifyMediaTools()` calls, therefore scope ALL: main at239/263, runtime at42/127/168, fixture builder at28. Staged reviewed H2 SHA256 `38f0bedc69b9e006cf1e9a16ac010061691c1b2ea8a74dffbd0d4b127ab4bd7d` accepts fixed literal `verifyMediaTools('IMAGE')` with required Node/lock/package/Sharp closure; default ALL/PDF retain strict PDF drift rejection. IMAGE callers do not use returned capability fields. At this planning observation canonical helper remains H0 SHA256 `56d122ed0226c371a72e5048996508024e133a2b09e8d05b7e5e5f6b987fc2fc`. No verifier/import/native call was executed to reach this source conclusion.

**Proposed SOURCE_ONLY amendment:** sole actual Medium writer changes exactly those six calls to literal `'IMAGE'` and updates their comments in `cms-api/media-images.mjs`, `cms-api/media-images-runtime.mjs` and `tests/fixtures/media-images.mjs`. In the existing fourth owned file `tests/media-images.test.mjs`, extend only the pure request-rejection cases with `verificationScope:'IMAGE'`, `verificationScope:'PDF'` and `operation:'PDF'`, each requiring `IMAGE_REQUEST`; existing filesystem/native oracles and native skip controls remain unchanged. Native matrix/fixture authoring belongs to the later separate proposal, not this source amendment. No helper/recovery-owned file, dependency, lock, baseline, recipe, cap, filename guard, generic reader, FINALIZE behavior or public caller scope override changes. Complete IMAGE closure remains mandatory before worker spawn/Sharp import, in direct-worker entry and final verification; no fallback to weaker/unverified tooling. Keep default ALL/PDF semantics in the recovery owner’s source. Freeze the affected four paths and perform narrow High gate/import-path review. Reuse applicable recovery-owned fixed-scope closure evidence; the added pure request cases cannot prove effective native gates. Coordinator Approved for this exact amendment is required before edits; any Node tests require their own admitted pure slot.

**Separate native admission:** require effective canonical H2 exact-source promotion evidence, applicable recovery Green/closure evidence, verified pinned inputs, native lane capability readiness and an explicit heavy-workload slot. First proposed smoke is one JPEG through the actual processor to three independently decoded WebP outputs and exact success pair, with original custody preserved and neither rights approval nor READY. Fixture preparation, process/snapshot supervision and resource/evidence destinations must be included in that later concrete admission; this read/plan note does not authorize them. After smoke passes, schedule the following minimal remaining matrix.

| Native proof | Existing preparation and remaining gap |
|---|---|
| Three input formats; all EXIF transforms; alpha; no upscale; landscape resize |13 fixtures already written:3 JPEG/PNG/WebP,8 asymmetric orientation JPEG,1 alpha PNG,1 landscape2000x1000 PNG. Independent corner/dimension/hash/alpha/metadata/preservation oracles are written; all native cases remain NOT_RUN. |
| Portrait recipe |Add2000x3000 in a fresh fixture attempt using existing `resize.png` name; verify320x480,960x1440,1920x2880, exact three target buckets and no enlargement. |
| Metadata and real colour conversion |Confirm source metadata exists before asserting stripping. Add IPTC and non-sRGB input with an independent expected pixel oracle; an sRGB output label alone does not prove conversion. |
| Native rejection and caps |Exercise genuine truncated JPEG/PNG/WebP, animated containers, decoder-invalid payloads and actual dimension/pixel-cap cases; exact error/no success manifest and retained original custody. Existing structural vectors are supplementary, not decoder proof. |
| Real runtime failure |Cancel only after observed owned-child start; prove timeout and controlled resource/error crossings with no publication and direct-child/owned-group cleanup. Existing25ms timer proves only preflight cancellation. A new diagnostic seam/control contract, if needed, must be proposed before implementation; no caller cap override. |

Keep30s job timeout, heap256MiB, two threads, sampled owned-group RSS768MiB, scratch256MiB and64KiB per stream. Fresh `parallel-image-01` namespaces use0700/0600 and aggregate256MiB; retain all earlier source/pure/failure receipts. Coordinate native workload ownership with the IMAGE candidate/PDF owner. No upload/lease/Auth/Storage/Firestore/UI integration, M3 acceptance or LOCAL_COMPLETE is opened.

**Unknown:** pure receipts record ps denial, but do not prove whether the exact native lane can obtain a snapshot. Runtime requests `/bin/ps` before child spawn and rejects a failed snapshot. Capability verification needs separate admission; do not bypass the watchdog or change permissions. RSS/reaping are best effort for the owned process group, not whole-tree or kernel containment. Same-UID races, ancestor confinement, directory power-loss durability and transport uncertainty retain the FINALIZE limits.

Narrow read/plan reviewer actual turn `01a1365c-7933-7352-b4aa-8bb4000227bc`, observed2026-10-13 17:43:12.489 UTC, is `gpt-6.1-sol / high`. Verdict **READ_PLAN_ONLY**; no application edits, tests, tool verification, imports or native execution. Reuse unchanged FINALIZE source/filesystem findings. Next decision belongs to Coordinator: approve or revise the SOURCE_ONLY consumer amendment, then separately prepare/admit the native smoke. No authority is inferred from this proposal or review.

## M3-IMAGE-H2-CONSUMER-01 v1 — actual SOURCE_ONLY approval

Coordinator recorded `COORDINATOR_APPROVED_SOURCE_ONLY_LITERAL_IMAGE_SCOPE` under human-delegated authority. Parent independently read the exact decision and four before hashes in the coordination register, lines1137-1184. Approval is for exactly six fixed literal IMAGE calls/comments in three owned caller files plus the three unknown-key request vectors in the existing fourth test. The earlier proposed/pending statements are historical and superseded for this source-only amendment. No native corpus or harness extension is included.

Parent independently verified all four before pins and captured59,782 source bytes privately at [before-source.json](../.local/test-outputs/m3/parallel-image-01/h2-consumer-source-daec33e9-bd48-4319-a145-e388ed02b164/before-source.json). The [approved proposal section](../.local/test-outputs/m3/parallel-image-01/h2-consumer-source-daec33e9-bd48-4319-a145-e388ed02b164/approved-proposal-section.md) retains exact SHA256 `9f5a54afe855e5ab49873c89d9f67cb0cc54d8e795c952771520723e14713801`, before this authority record was appended. Original snapshots/receipts remain unchanged.

The same sole Medium source writer was dispatched for source and syntax/focused lint only, then narrow High gate/import review. No pure runner is admitted here; no verifier invocation, Sharp import, worker, native fixture creation, SDK/HTTP or integration. Canonical helper was observed at H0 during dispatch. H0 ignores the new argument, so literal caller source does not establish effective IMAGE-only closure. Actual H2 promotion, applicable Green/closure evidence and separate native readiness/admission remain required.

New four source hashes will be recorded as actual changed recipe/manifest identity inputs. Recipe parameter values/width targets and FINALIZE controls stay unchanged. No old receipt is refreshed or old runtime proof claimed for the new source graph. The current standalone manifest exposes recipe parameters; this literal-only amendment does not add or invent a canonical `processingRecipeSha256` binding. That future integration identity remains a separate contract/verification item; source freeze inputs will be supplied explicitly to Coordinator.

## H2 consumer source/static closeout — Verified within SOURCE_ONLY scope

The same sole actual Medium writer completed the exact approved delta: six calls use fixed literal `verifyMediaTools('IMAGE')`, three corresponding comments changed and the pure request loop adds only the three approved unknown-key vectors. Independent before snapshots and [source-only.diff](../.local/test-outputs/m3/parallel-image-01/h2-consumer-source-daec33e9-bd48-4319-a145-e388ed02b164/source-only.diff) show no other application delta. Call order/imports, before-spawn/before-Sharp/direct-worker/final gates, FINALIZE, guards/readers, recipe parameters, width targets, caps and native skips/oracles remain unchanged.

| Current source | Bytes | Actual SHA256 |
|---|---:|---|
| cms-api/media-images.mjs |20016|e7f78b000754bc20ab4645281fbbaaaa48681b9340fe20c8fb11d8d1c40fe1a6|
| cms-api/media-images-runtime.mjs |13349|8f18b76f1d98a9deeba2d21f3ca2c08d4d0d137c0db1a78f85cd08d7a578fa45|
| tests/fixtures/media-images.mjs |4235|99950b9ac3e07a8cdfc5c3414dbd0c864456adfcd877b457639f175fec6e0344|
| tests/media-images.test.mjs |22287|1dd1912bd4524cbbbc5f4822123bf3bd39956cb52229b9e7ef5efd3596b26e1f|

[after-source.json](../.local/test-outputs/m3/parallel-image-01/h2-consumer-source-daec33e9-bd48-4319-a145-e388ed02b164/after-source.json), SHA256 `b4509bdc20cf796a73bad3c3da0c8326bf720d2cfffc054f723bc9278bbb46ec`, records parent-matched source hashes/private after snapshots and actual identity inputs. It records canonical helper observation H0 separately from planned/reviewed H2. No runtime or canonical recipe binding is inferred from preserved parameter literals.

Worker actual current turn `01a13665-c237-7ea0-8783-bd8af682327e`, independently observed at line507, is `gpt-6.1-sol / medium`. Four sequential pinned Node22.23.3 `--max-old-space-size=256 --check <owned-file>` commands and focused heap256 ESLint over the four files all exited0 with no output. Parent inspected the five exact command/result records at worker rollout lines521/530; checks were not rerun on unchanged source. All owned commands completed; no pure runner was dispatched or held.

High reviewer actual current turn `01a13667-d01e-7321-a51f-c02c798878d1`, independently observed line302 at2026-10-13 17:55:35.616 UTC, returned **PASS_AFFECTED_H2_CONSUMER_SOURCE_ONLY**, Required0. [high-affected-source-review.json](../.local/test-outputs/m3/parallel-image-01/h2-consumer-source-daec33e9-bd48-4319-a145-e388ed02b164/high-affected-source-review.json) records verdict, route and validity. Reviewer matched four before pins and four after pins at start/end, confirmed exact scope and gate/import preservation, and executed no tests/imports/verifier/native.

**Verification limits:** new pure request cases are written but NOT_RUN; this source graph has no newly claimed runtime proof. Historical7/7 and24/24 receipts remain at their historical freezes; unchanged FINALIZE source/control conclusions may be reused, not relabelled as current-graph native evidence. Canonical helper still observed H0 before/after source/static/review, where the new argument is ignored. Effective H2 promotion/Green, required closure verification/capability readiness and separately approved minimal JPEG native plan/heavy slot are still prerequisites. Formal canonical `processingRecipeSha256` binding is UNASSIGNED outside the literal-only scope; changed source identity inputs are now supplied honestly.

Scoped source/static preparation and affected review are complete. Parent sends the exact new freeze/verdict to Coordinator and PDF under the direct messaging authority. No further Node/verifier/native dispatch, old receipt refresh, helper edit, integration or product acceptance is opened by this closeout.

## M3-IMAGE-H2-PURE-01 — planning and CONTROL-PREP-02

Fresh read-only inspection now observes canonical helper H2 SHA256 `38f0bedc69b9e006cf1e9a16ac010061691c1b2ea8a74dffbd0d4b127ab4bd7d`,34,537bytes, UID501/dev16777230/mode0644/nlink1. Four consumer source pins still match the closeout above. This is the separately authorized recovery source transition; old H0 observations/receipts remain unchanged. Parent read recovery Green receipt SHA256 `4a0fb47d7eb3b91816a1176df328f0fd2cad445a568b1cc6fed2508834c5486a`, exit0/PID43922/nativeHOLD, and the Coordinator's A15 accepted closeout. Recovery pure15 proof remains separate from IMAGE pipeline or native evidence.

Parent submitted exact in-chat `M3-IMAGE-H2-PURE-01 v1`: one request group with three new scope/operation refusals plus the six affected FINALIZE filesystem groups, expected25 actual-count-required. Unrelated pure groups/native groups are excluded. Source/test/helper/Node12pins, selected import closure, argv/cwd/env, stream/deadline/custody/refusal/evidence protocol were supplied. Narrow actual High reviewer turn `01a136b2-c3a2-7b12-88ee-ca179f1664f6`, independently observed line331 at2026-10-13 19:17:27.629 UTC, returned **PASS_PURE_BATCH_PLAN_ONLY**, Required0; no execution/writes/imports. Plan review is not frozen control-source proof or Node admission.

Coordinator recorded `M3-IMAGE-H2-PURE-01-CONTROL-PREP-02 v2`, **COORDINATOR_APPROVED_PRIVATE_CONTROL_SOURCE_PREPARATION_NODE_HOLD**, read independently at register lines2288-2301. Coordinator requires exact frozen supervisor/manifest and adds `--experimental-test-isolation=none` to the planned Node argv. [Official pinned Node22.23.3 CLI documentation](https://nodejs.org/download/release/v22.23.3/docs/api/cli.html#--experimental-test-isolationmode) defines none as running test files in the test-runner process; actual launch/import behavior still needs admitted execution and frozen source controls. Selected application bodies do not call a media worker, verifier, Sharp or SDK.

Ownership is confined to at most three new private preparation files under `.local/test-outputs/m3/parallel-image-01/h2-pure-control-8cd5ff9d-8071-43d8-9a37-a374306172fe/`: same actual Medium writer owns only `supervisor.py` and `admission-manifest.json`; parent reserves `high-control-review.json`. Dirs0700/files0600. No application/helper/test edits, old receipt changes, runtime fixture/tmp/output creation, Node tests, verifier/native/SDK/HTTP or global changes are authorized by preparation. Static AST/JSON parsing may inspect source without executing the supervisor or creating pycache.

Controller preparation must freeze exact argv/cwd/env/import/source12pins/body/manifest identity, enforce64KiB observed offered bytes per stream during bounded reads, reserve bounded cleanup inside the30s direct-child deadline and signal only a live captured unreaped own session/group identity. Never communicate or wait without a bound, kill a reaped/reused/foreign PID, infer EOF from forced close or report truncated logs as PASS. Always attempt postflight12pin/retained-leaf captures on failure; record Unknown/refusal/cleanup/pending truthfully. Existing own history has only enumerated additive namespace deltas, not blanket retention exceptions. Clean child env is limited to PATH/LANG/LC_ALL/new owned TMPDIR with no secret values or parent/global changes.

New/changed controller code requires actual High affected source/control review Required0 before a later exact v2 Node admission. No pure slot is acquired or borrowed by this prep approval. processingRecipe canonical producer/full7 binding remain UNASSIGNED/Unknown; effective tool closure/native/evidence producer integration are not proved by selected pure tests.

## CONTROL-PREP-02 v2 — affected repair source freeze

Initial actual High source review found two Required findings: cleanup could throw before publishing child/reap/EOF/pending state; combined postrun evidence+scratch+pending-record growth was not enforced. No controller or Node was executed. Initial full source bodies, hashes and findings remain intact in [high-control-review.json](../.local/test-outputs/m3/parallel-image-01/h2-pure-control-8cd5ff9d-8071-43d8-9a37-a374306172fe/high-control-review.json), history[0]. Coordinator independently recorded `M3-IMAGE-H2-PURE-CONTROL-REPAIR-OBSERVATION-01`; routine repair continued under the open two-file preparation approval.

Same actual Medium writer turn `01a136ca-7450-7541-95ca-c9800c079f40`, independently observed line649 at2026-10-13 19:43:20.196 UTC, changed only the private supervisor and manifest. Each cleanup resource action is guarded. Nested finally publishes observed or Unknown direct-child/reap/pending/EOF/forced-close/log counters. Unknown poll or already reaped child cannot be signaled. Work stop24s, KILL24.5s, reap/EOF until29.5s and forced-close30s remain; measured elapsed>=30s blocks PASS. Combined budgets charge evidence+scratch actual bytes/entries, exact serialized pending captures and the bounded65536-byte final receipt. Postflight includes written captures and bounded receipt accounting before exclusive write. Unknown/cap/serialization/write/cleanup failures block PASS; no deletion or broad retention exception was added.

Actual High affected reviewer turn `01a136d0-519e-7ac1-ac21-67b14cecd607`, independently observed line461 at2026-10-13 19:49:44.528 UTC, returned **PASS_CONTROL_SOURCE_ONLY**, Required0. Review matched hashes at start/end and checked only the two repaired control findings. Controller29393bytes SHA256 `8b82362034c34fb174a5ed0deffc990a5fd6a64ef6b21ce27fa8112f4e6ca9db`; manifest6406bytes SHA256 `60084a9fd47417a4f3338be7277e5efbf6c2f72984dd872db9b39f38c69c5e1b`. Parent appended this freeze and full new source bodies to history[1], preserving history[0]; review file70030bytes SHA256 `66978c531e2c06df04ec5df6ef8a4490828016de2926b1aaba54484e3b98b56d`.

Parent AST/JSON parsing passed without importing/executing the controller. All12 source/tool/package/inventory pins match; controller and manifest are0600 in the0700 directory. Exactly three preparation files exist; `run-evidence/` is absent. Manifest canonical seal is consistency only, not approval. Argv/cwd/environment/import closure and expected25 count remain frozen, including isolation none. Postflight12/control/manifest/retained-leaf attempts remain mandatory after failure.

**Unknown/NOT_RUN:** controller execution, fault controls, overflow/signals/deadline crossings and this25-test batch. Prepared receipt alone cannot establish PASS; actual acceptance must compare controller exit, terminal summary and receipt. No hard OS containment/whole-group absence claim is made. Parent returns exact freeze/High0/protocol to Coordinator for a separate one-run Node admission; preparation approval and an available slot do not authorize dispatch. Application/helper/tests, historical receipts, recipe producers, native and integration remain outside this repair.

## Pool13 / ADMISSION-02 v2 — actual current-H2 pure result

Coordinator recorded `M3-PURE-POOL-13 v1` and `M3-IMAGE-H2-PURE-01-ADMISSION-02 v2`, **COORDINATOR_APPROVED_ONE_PURE_BATCH**. Parent independently read the exact register decision, rehashed all three frozen control files, Python and12 inputs, and confirmed `run-evidence/` absent before dispatch. Same actual Medium worker current turn `01a136d9-c9b2-78c0-ac1a-f382bc0e0e5b`, independently observed line726, invoked the manifest's absolute Python `-I -S` launcher **exactly once** from the frozen CMS cwd. No source/control/review/doc changes occurred during the batch; no automatic rerun was dispatched.

Actual launcher tool chunk790962 exited0; terminal summary reports PASS/error_count0/pending_runnerfalse. Parent read the actual tool result at worker session line741, [command](../.local/test-outputs/m3/parallel-image-01/h2-pure-control-8cd5ff9d-8071-43d8-9a37-a374306172fe/run-evidence/command.json), [TAP](../.local/test-outputs/m3/parallel-image-01/h2-pure-control-8cd5ff9d-8071-43d8-9a37-a374306172fe/run-evidence/stdout.log) and [receipt](../.local/test-outputs/m3/parallel-image-01/h2-pure-control-8cd5ff9d-8071-43d8-9a37-a374306172fe/run-evidence/result.json). They agree: **25 tests/pass25/top groups7**, fail0/cancelled0/skipped0/todo0, Node exit0. TAP duration109.60925ms. Receipt2404bytes SHA256 `0a0a6e138479748e610171bf73fff1c249440022b3664039e6ce305138697916`; stdout4012bytes SHA256 `ec468417d0905c33ac37526521df8f94373dbad3dd985d4255835988ccc0f93a`, stderr0bytes.

Node direct child56429 started2026-10-14 03:00:32.900337 +07:00 and completed03:00:33.046350 +07:00. Direct reap and poll are observed; pending_runnerfalse, both streams have actual EOF/observed close and no forced close. Offered/captured/disk stdout4012bytes and stderr0 match. Signals, overflow and timeout were not exercised. Controller execution completed; worker reports no pending owned runner/session. Parent sent actual completion/custody to Coordinator and immediately released **IMAGE Pool13 slot** before High evidence review. PDF's separate slot/outcome is not inferred.

Parent matched exact argv/cwd/four-keyenv,12 before/after/current input pins and controller/manifest custody; before/after capture SHA256 is the same `cbe88667b2bd347307a7cc9fa754b7a8c1eec37c34361ccd3c3f5e82443718a0`. Existing leaves and historical receipts remain intact under the controller's retention comparison. New tiny scratch fixtures comprise110 files/20 directories and1855 logical bytes. Runtime evidence files0600/tmp0700 are retained. Parent independently counted both current IMAGE namespaces: **1021982 logical bytes /459 entries**, matching the receipt's final accounting and within268435456-byte/50000-entry limits. Actual final receipt2404bytes is included; this is actual usage, not a reserve estimate.

This adds current-H2 request guards and FINALIZE synthetic filesystem proof. Historical safe7/24H0/failed24 remain at their original freezes. Actual High evidence review is pending and reuses unchanged source/control review; no slot is held for review. Supervisor cleanup fault/overflow/signaling/deadline-crossing controls remain **NOT_EXERCISED**. Node/fixture custody and direct reap do not prove OS-wide/group absence, hard RSS, kernel containment, same-UID race exclusion, atomic ancestor confinement or power-loss durability. Sharp/native/tool-verifier/SDK/HTTP, canonical producer/full7 binding and product integration remain HOLD/NOT_RUN. No rights approval, READY, M3 acceptance or LOCAL_COMPLETE is granted.

## ADMISSION-02 v2 — affected High evidence closeout

Actual High reviewer current turn `01a136db-8741-7af2-a544-bb3c88e2d874`, independently observed line504 at2026-10-14 03:01:59.154 +07:00, returned **PASS_H2_PURE_EVIDENCE_ONLY**, Required0. Reviewer read actual launcher exit/terminal summary/receipt/TAP, matched receipt SHA at start/end, current12 pins and all three frozen control files, and independently checked268 old leaves unchanged in snapshots/current hashes. Exactly7 groups+18 subtests pass. Offered/captured/disk/EOF/close/reap/pending, exact additive fixture changes and actual combined1021982-byte/459-entry budget agree. Reviewer executed no controller/tests/imports/verifier/native and wrote no files.

The earlier evidence-review-pending statement is historical. The exact admitted one-run current-H2 pure batch is now complete with actual evidence review0 and IMAGE slot already released. Parent sends this closeout to Coordinator and PDF; no required work remains in this admitted pure batch. The preparation review file and controller/manifest remain frozen at their admission hashes; evidence review is recorded here and in the direct handoff, without rewriting retained preparation/runtime receipts. Supervisor fault controls, effective native IMAGE verifier closure, Sharp/native behavior, canonical recipe/full7 producer and integration remain outside this proof. No further execution is inferred from this closeout.

## First native JPEG case — direct human approval and source preparation

Direct human message in this IMAGE chat, observed2026-10-14 09:00:53.038 +07:00, approved merging smoke into the first native case: one local JPEG through `processImage`, three WebP outputs, original/manifest and worker cleanup, coordinated with Coordinator within M3. This is the approved test scope; it creates no standalone smoke milestone. Another M3 owner retains main heavy-flow custody under C03. No source-only C03 PASS, old pure admission or this test flag releases that retained custody or grants an uncoordinated native lane.

Same actual Medium writer current turn `01a13827-104f-7fc2-b74e-0a3f13dfa3a8`, independently observed line763 at2026-10-14 09:04:06.709 +07:00, changed only `tests/fixtures/media-images.mjs` and `tests/media-images.test.mjs`. The fixture builder preserves default `ALL`; fixed test-only `JPEG_FIRST` creates only existing deterministic `source.jpeg`7x5 and returns before PNG/WebP/orientation/alpha/resize generation. The first native case lives in the existing test file, defaults to HOLD and accepts only internal test enablement `PINKY_IMAGE_NATIVE_FIRST_CASE=JPEG_LOCAL`. Exact selector is `^native: first JPEG local processor smoke$`. This flag does not replace task admission, fixed IMAGE verification or native custody.

The first case calls `processImage` once. It checks ordered target buckets320/960/1920 with three actual WebP7x5 outputs, independent decode/dimensions/opaque alpha, MIME/bytes/hash and metadata absence, original bytes/full custody, exact bounded manifest pair and matching stage/published inode/nlink2. Runtime assertions require positive PID, exit0/signalnull, closed/reapedtrue, remainingPids empty and bounded stream observations. These assertions do not claim colour fidelity, genuine metadata stripping from a tagged input, orientation coverage, hard RSS or OS-wide absence. Existing pure, full-matrix, negative and cancellation bodies remain unchanged; other native cases stay HOLD. Future matrix scheduling should reuse an accepted unchanged JPEG proof when source/tool/environment pins still match, rather than repeat a separate smoke.

| Source | Before bytes / SHA256 | After bytes / SHA256 |
| --- | --- | --- |
| tests/fixtures/media-images.mjs |4235 / `99950b9ac3e07a8cdfc5c3414dbd0c864456adfcd877b457639f175fec6e0344`|4419 / `76ef6714fe85327930dec2a5d72841015004b98a74d10b76840ac83ceb999a7d`|
| tests/media-images.test.mjs |22287 / `1dd1912bd4524cbbbc5f4822123bf3bd39956cb52229b9e7ef5efd3596b26e1f`|26615 / `11cafdea06744d60b51275e517aec72a73d08bb9adbd35a2f27a470d09f65c27`|

Immutable before bodies remain in `h2-consumer-source-daec33e9-bd48-4319-a145-e388ed02b164/after/`; parent independently compared the two-file delta. Processor/runtime/H2 helper normative pins and historical25 receipt SHA `0a0a6e138479748e610171bf73fff1c249440022b3664039e6ce305138697916` remain unchanged. Historical25 belongs to its original test/fixture freeze; it is not runtime proof for these new bodies.

Two pinned Node22.23.3 `--check` commands over the changed files exited0 with no output (worker tool chunks0cf7a7/9871e5, independently read at session line783). Actual High reviewer current turn `01a13829-70ea-79e1-a517-be6740aeac4a`, independently observed line564 at2026-10-14 09:06:42.509 +07:00, returned **PASS_FIRST_JPEG_CASE_SOURCE_ONLY**, Required0, matching before and after pins at start/end. No native tests, Sharp import, fixture generation, worker/probe/SDK/HTTP or application change was executed by this preparation or review.

**Coordination blocker:** automatic approval review rejected the direct Coordinator message twice. It classified native coordination as outside the older FINALIZE-01 messaging scope, and did not accept the current direct-human approval when the parent supplied its native session record. Both sends failed; no Coordinator ACK/register/admission is claimed. No alternate tool, child or indirect message was used. Source preparation is complete; actual first-case execution remains NOT_RUN until the messaging restriction and current custody/lane/control admission are resolved. Future frozen controls must use the two new source pins and exact first-case environment/selector; old25 controls/admissions cannot be reused for execution.

## Explicit native messaging permission — execution still blocked

At2026-10-14 09:10:22.908 +07:00 Khiêm directly authorized messaging Coordinator about native IMAGE smoke and coordinating the first JPEG case within approved M3, with no further permission question. The active native session records this as a user message at line2252; it is not external delegation. Parent received this authority and attempted the direct native coordination message again. Automatic approval review rejected the send, classifying the new permission as untrusted transcript delta and retaining only the earlier FINALIZE-01 contact scope. This third native-coordination send also failed. Human authorization is present; the tool permission remains ineffective. No alternate messenger, child, shared-state write or indirect execution was used.

Independent read access still works. Parent rechecked the exact two prepared source pins and unchanged processor/runtime/H2 helper, read current Coordinator progress and the coordination runtime register. The register retains `current_heavy_slot_thread` as `01a13556-f342-7222-828f-7509812bf862`, custody63828/session27751, C03 lifecycle plan pending, and `new_native_image_video` as `HOLD_EXPLICIT_H2_CONSUMER_PURE_AND_NATIVE_ADMISSION`. No coordinated native JPEG admission or custody release is present. Pure pool availability does not release this native lane. No extra syntax/test run, Sharp import, fixture generation, process probe/signal or native dispatch occurred.

The prepared first-case source and source review0 are retained. Actual completion needs effective Coordinator messaging plus the current custody/lane/control admission. The parent does not ask the human to repeat the same authorization, does not report the first case as PASS and does not mark this native task complete.

## Coordinator scheduling ACK — exact handoff delivered

Coordinator subsequently supplied a native scheduling task: candidate IMAGE retains staged workspace/UI/API ownership and parent63828/session27751 heavy custody. Candidate custody recovery precedes the processor first JPEG case. Processor native execution waits for exact Coordinator slot transfer after actual candidate workload closure or an explicit verified custody handoff. Idle state, numeric PS absence, source High0, syntax0 and human-approved test scope do not independently release that slot. No existing pure25 rerun or source re-review is required.

Parent successfully sent the requested read-only handoff to Coordinator under `M3-IMAGE-FIRST-NATIVE-JPEG-01 v1`, including direct human approval, exact two-file freeze/source High0, selector/flag, fixture/oracles/cleanup observations, unchanged processor/runtime/H2 pins and current native tool/capability dependencies. The messaging tool returned success for the exact handoff; previous rejected sends remain historical. This successful send is not native admission or control execution. New native controls are not yet prepared; old pure25 controls cannot supervise the changed native graph or supply new source pins.

Native bounds supplied are existing input10MiB/edge8192/pixels40M/output12MiB/job30s/heap256MiB/threads2/sampledRSS768MiB/scratch256MiB/log64KiB per stream and fixture4MiB/30s. Before runtime dispatch, Coordinator must accept exact fresh native supervisor/manifest/outer cleanup and capture bounds, current managed route/capability and immutable input pins. Same unchanged JPEG proof may be reused only after actual accepted PASS and matching source/tool/environment. Root owns scheduling/shared records; processor owns its test/fixture source. No candidate signals/custody changes, Sharp import/native fixture generation, SDK/HTTP/cloud/Git or PDF changes were made.

Coordinator also reported the separate direct-human removal of manual Rights approval and assigned revised common/consumer planning to C0/Rights/Upload/QA. The standalone processor assertions and historical technical receipts do not establish that new workflow, READY or integration; this JPEG task makes no dependent rights/common-contract amendment.

## First JPEG controller — v2 plan handoff, SOURCE/native not admitted

Khiêm directly authorized this IMAGE chat to coordinate with Coordinator2 and Root, finish controller/admission, then execute the first JPEG after custody is resolved. This extends the effective direct messaging scope; no repeat human approval is requested. Root remains the sole shared-record writer and global admission owner. Coordinator2 reviews the media plan and prepares the decision.

Coordinator2 identified a concrete cleanup gap: the unchanged runtime owns a private detached worker, while the prepared first JPEG case does not yet pass an AbortSignal. Stopping only the test actor cannot establish worker closure. The proposed Source3 therefore consists of a fresh private controller and descriptor plus a targeted cancellation/lifecycle bridge in the first case. Processor, runtime, fixture builder, H2 helper and historical receipts remain outside the proposed delta.

`M3-FIRST-JPEG-CONTROL-01 v1` received two Required plan findings from Coordinator2 before Source: close the message schemas/phases/deadlines, and close worker-observation provenance plus early lifecycle publication. Existing actual High reviewer authored the affected v2 repair in chat, turn `01a1385b-fcc6-7571-b0e3-274e0318ff70`, native context line712/final line761. The exact final is15100bytes, SHA256 `3df6a64f6dcedbae4e8d11cc5619ce115196efb93301befa497e698dba362a70`. Parent supplied that exact text to Coordinator2 and a provenance pointer to Root. This is plan authorship, not an independent PASS or Source approval.

V2 fixes ten closed IPC message schemas with sequence/nonce/PID/path binding; work grants stop after cancellation or protocol failure. Spawn latency is charged from the spawn request. GO_FIXTURE is due by10s, GO_PROCESS by40s with30s job plus5s verification reserved, case75s, cooperative cleanup10s and publication5s. The105s controller limit is a decision deadline; the110s caller budget does not guarantee hard termination. Root must record retained-actor disposition before native admission.

Worker evidence comes only from the current single processImage result.runtime or error.observation. No receipt fallback is proposed. Missing or invalid observation after GO_PROCESS means UNKNOWN/HOLD and retained custody. The early exclusive child lifecycle record is persisted before assertions and acknowledged only after controller preservation. Runtime-reported Node close and bounded owned-group sampling remain distinct from the outer actor's actual exit and stdout/stderr EOF/close. No independent native waitpid, worker-stream EOF or whole-OS absence claim is added.

Fresh read of the shared runtime register still assigns the heavy slot to IMAGE candidate `01a13556-f342-7222-828f-7509812bf862`. Root's current status reports C03 failed its first /bin/ps call with EPERM before PAUSE or signals, and retained parent custody. This report does not transfer custody or establish capability for JPEG. Processor has not run a candidate probe, native test, Sharp import or worker. Controller/descriptor Source3 has not been written. Affected v2 review, Root Source decision, frozen Source/control review and exact native admission after verified custody disposition remain outstanding.

Coordinator2 subsequently returned **PASS_AFFECTED_PLAN_ONLY**, Required0 for R1/R2, on the exact v2 text above. Coordinator2 is an independent non-author with the human-authorized xhigh exception; this does not relabel the author or Source reviewer route. Parent sent Root the exact Source3 and ancillary archive assignment. Proposed Source3 caps total98304bytes; the exact26615-byte old-test archive and source-before.json cap8192bytes add34807bytes. Root must explicitly select the total preparation interpretation before writing; no budget is silently expanded. All preparation writes must count toward393216bytes, with at most four content writes per Source file. Native execution remains NOT_RUN, with Source decision, Source freeze/review and verified custody/admission still outstanding.

## M3-FAST-CODE-HANDOFF-01 — current human STOP and application intake

Parent directly verified human userMessage `01a13872-a437-7bd1-9943-cc612a7d3002`, turn `01a13872-a40b-7800-bf2e-90af88a8417c`, in report chat `01a13866-fa1c-7c23-b30d-67516d60fc22`, and read [Coordinator2 mandate](../../docs/agent-kit/ad-hoc/M3-FAST-CODE-HANDOFF-01-COORDINATOR-2.md). The latest final clause stops all tests and diagnostic experiments. Controller/supervisor/admission/evidence-publication machinery is also stopped. The earlier first JPEG/controller plan remains history; it is not queued for automatic resumption. Unit test source may accompany application code but stays NOT_RUN. No build/lint/runtime substitute is permitted.

STOP was sent to the two existing owned children, `image_processor` and `image_source_review`. Both returned actual ACKNOWLEDGED at a safe boundary. Neither has in-flight work, owned pending tool session, new Source/control/partial files or runtime activity. Medium worker's previous READ-prep route was independently observed as gpt-6.1-sol/medium, turn `01a13871-a2fb-7f72-83eb-d9529ac062e5`, native context804. ACK-turn route was not newly inspected. High reviewer acknowledges no write or runtime activity since its v2 plan. Controller/descriptor and proposed ancillary archive remain NOT_WRITTEN; JPEG native remains NOT_RUN. No foreign actor closure or custody release is inferred from these ACKs.

Coordinator2 now owns independent decisions and source order for its assigned media branches. Parent returned a short READ-only IMAGE application intake directly to Coordinator2, without a Root approval/ledger wait. Current processImage and runtime application source are implemented; CMS API currently has no processImage caller. Current canonical v2 structural contracts use name/uploaderUid and generation-bound derivative metadata. Trusted Upload/job/Storage services must supply persisted generations, actors, metadata/digests and READY authority; the standalone processor must not invent them. Its historical private rightsApproval:false marker is a concrete optional correction for Coordinator2's ownership decision. The smallest proposed completion is a scoped application correction/handoff of the existing private processor API, with caller integration assigned to the actual Upload/job owner. No new adapter, tests, diagnostic, runtime or application writing has started from this intake.

Current limits remain explicit: first native JPEG, cooperative controller fault paths and processor integration are NOT_RUN. Retained candidate data/session/custody is preserved. No runtime PASS, M3 acceptance, LOCAL_COMPLETE, cloud, Git or production claim is made. Human testing and acceptance now belong to Khiem.

### Existing IMAGE private API — application handoff

Import `processImage` from `cms-api/media-images.mjs`. Its closed request is `{input,expectedSha256,declaredMime,attemptDirectory,signal?}`. `input` and a fresh `attemptDirectory` must be canonical owned paths under `.local/media-scratch/m3`; they must not overlap. SHA256 is lowercase64 hex; MIME is exactly image/jpeg, image/png or image/webp. `signal`, when present, is an AbortSignal. The caller must retain that signal and await settlement; this handoff does not supply a test controller or custody-recovery mechanism.

The private result contains original hash/bytes/MIME, oriented source geometry, ordered outputs for target widths320/960/1920, fixed recipe parameters and runtime observation. Outputs use logical filenames image-320.webp, image-960.webp and image-1920.webp, with independent bytes/hash/dimensions/alpha metadata. The processor preserves the original, verifies output custody, retains its receipt and exclusively publishes the exact manifest pair. It throws on invalid input, cancellation, tool/custody failures or native processing errors; it does not silently publish READY on failure.

Upload/job integration must copy the verified derivative bytes into private Storage and capture actual opaque generations. It maps `original.sha256/bytes` to the canonical original fields and each output's targetWidth/width/height/mime/bytes/sha256 to derivative metadata. Trusted server code supplies assetId, uploaderUid, metadataDigest, toolSetSha256, processingRecipeSha256 and generation-bound derivativeSetSha256, then verifies the complete canonical version before assigning READY. Processor geometry is the oriented original geometry; derivative bucket geometry does not replace it. The current private result is not itself a readyVersionV2 record.

Current private receipt/result omit the obsolete rightsApproval field. `ready:false` remains the private processor boundary. Historical fixtures/receipts are preserved. There is no processImage call site in the current CMS API source, so HTTP/job/Storage integration is not claimed complete by this branch.

Manual acceptance after integration: Khiem uploads one local JPEG through the real local Upload/job flow, checks three ordered WebP derivatives and their actual Storage generations, checks unchanged original hash/bytes and manifest consistency, and checks cancellation/failure never assigns READY. Runtime and retained candidate custody limitations must be resolved by the runtime owner before that manual flow; this document does not release any retained actor. Agent tests/checks/runtime remain NOT_RUN under the current mandate.

### APPLICATION_A — source completion and brief review

Coordinator2 directly approved APPLICATION_A under the current ad-hoc mandate: existing standalone IMAGE processor is the delivery unit. Sole existing Medium worker changed only media-images.mjs and two current-result assertions in media-images.test.mjs. Parent independently observed fresh Source turn `01a1387b-95b5-7b23-a753-d1c1088753de`, native context841, model gpt-6.1-sol/medium, and read its actual patch plus the resulting application/test fragments. The three application-line changes remove rightsApproval from the receipt/result and clarify that the Upload/job caller owns CMS readiness. Both assertions now check absence of rightsApproval. This is a brief source/diff review; no runtime or independent High verdict is claimed.

Request validation, original/container checks, fixed IMAGE tool gates, worker signal propagation, output hash/custody verification, exclusive finalization, ready:false and existing byte/time/resource caps are unchanged. Runtime, fixture builder, H2 helper and historical receipts are unchanged. The first-case JPEG Source remains written but unexecuted; controller/descriptor/ancillary archive remains NOT_WRITTEN. No checks, tests, native, lint, build, diagnostics or runtime were run for APPLICATION_A. Source identity and new manifest bytes differ from historical receipt freezes; old PASS evidence is not promoted to this current application Source.

The standalone application correction is complete and its API/limitations are handed to Coordinator2. Trusted Upload/job integration remains outside this writer's file ownership and must supply actual generation/actor/digest/READY data. This source delivery does not complete M3 or LOCAL_COMPLETE. Retained candidate custody and human manual acceptance remain separate.

## M3-MEDIA-WORKER-SOURCE-01 — current CMS integration assignment

Khiem directly requested this chat to coordinate with Coordinator2 and Upload/job, connect processImage to CMS and finish integration Source. Tests, lint and build remain forbidden; the current fast-code mandate also keeps runtime/diagnostics NOT_RUN. Coordinator2 assigned existing sole Medium writer two canonical application files: cms-api/media-worker.mjs and cms-api/media-processing-profile.mjs. Upload owns its domain/service/Storage/routes/index/authorization files. PDF owns cache/recovery; C0 owns canonical program/toolset/authority definitions. No writer overlaps those files.

Upload COMPLETE calls resolveMediaProcessingBindings with the actual private original Buffer and persisted kind/MIME/asset/intent. The resolver hashes a pure server recipe PROGRAM and expected static toolset before QUEUE; it does not run a decoder or processor. VIDEO execution expansion depends on actual decoded metadata and is checked after lease claim, with a separate execution recipe digest. The immutable binding commits the PROGRAM hash. An actual execution hash must not be relabelled as that program hash or fabricated from an expected template.

The worker independently loads persisted Upload/job/metadata, claims and heartbeats the J1 global slot, calls the actual IMAGE/PDF/VIDEO processor, verifies output bytes, commits actual Storage generations through Q1 effects, verifies cache and atomically assigns READY. Its default scheduling export returns a fast queue scheduling acknowledgement; durable QUEUED work is resumed by a bounded local queue/recovery pump. Scheduling acknowledgement is not processing completion. Current CMS/background execution is untested.

Coordinator2 selected dedicated immutable cmsMediaProcessingEvidence records at the actual manifestReceiptId, created in the same READY transaction. These records hold the canonical program, actual raw execution recipe/digest, decoded original metadata and bindings; they do not duplicate the large expected R0 manifest or alter the strict J1 record. The public library omits these facts, actors and private Storage fields. CLAIM/READY recheck current user/member authorization and compare claim authzVersion. Native or Storage failures without positive quiescence remain UNKNOWN/RECOVERY_REQUIRED, with held slot and uncertain effects preserved.

Current Source is being written and affected corrections are handled by the same writer. Final source/caller review and manual handoff remain pending. No native smoke/controller is resumed. No runtime proof, M3 acceptance or LOCAL_COMPLETE follows from this assignment.

## Current IMAGE integration source handoff — worker and D07 complete

The current direct human request authorizes coordination with Coordinator2 and Upload/job, completion of M3 application integration, a brief source review and handoff for human testing. Coordinator2 assigned the existing sole Medium writer `cms-api/media-worker.mjs`, `cms-api/media-processing-profile.mjs` and then the single D07 bridge `cms-api/site-v3-media-provider.mjs`. These three files are written. Parent read the resulting source and actual Upload, Storage, cache, authority and home-v3 caller interfaces. This was a brief parent source review, not independent or runtime verification. No tests, lint, build, imports, SDK/HTTP calls, emulator activity or diagnostics were run for this delivery.

Upload COMPLETE now resolves the actual private original Buffer through `resolveMediaProcessingBindings`, persists QUEUED and then calls the fast `enqueueMediaJob` scheduling API. The worker uses persisted Upload/J1/metadata, current uploader authorization, a global lease and heartbeat before the actual `processImage` call. IMAGE container checks occur before the processor starts; full decode remains inside the processor. The worker verifies output bytes and the original/manifest pair, records actual Storage generations through Q1 effects, verifies the private cache, and atomically persists READY plus immutable `cmsMediaProcessingEvidence`. The READY transaction rechecks current authorization. Proven-quiescent terminal outcomes close retained reservations; missing native, local-writer or remote-effect quiescence keeps UNKNOWN/RECOVERY_REQUIRED with held resources. Native observations remain limited to Node lifecycle events and bounded owned-group sampling.

`media-processing-profile.mjs` exports `resolveMediaProcessingBindings`, `loadMediaProcessingProfile` and `hashMediaProcessingValue`. The program hash is a pure pre-QUEUE commitment. The separate execution recipe hash comes from actual processing. `media-worker.mjs` exports `createMediaWorker`, `enqueueMediaJob`, `startMediaJobPump` and reexports `resolveMediaProcessingBindings`. The local pump resumes bounded QUEUED work and expired-lease recovery; its stop method stops scheduling, not active-work lifecycle verification. The actual manual launcher `scripts/media-worker-local.mjs` calls `startMediaJobPump`; package source exposes `npm run media-worker:local`. Neither entry was executed.

D07 exports only `createSiteV3MediaProvider({db,library})`, returning `resolveSelection({transaction,content,legacyCatalog,pinnedManifest?,existingAssetIds?})`. The result is strict JSON `{orderedManifest,expectedMediaVersions,safeCatalog}`. The resolver reuses the actual selection collector, including hidden references and fixed artwork. All version, job mapping, Upload, J1, metadata and processing-evidence reads use the caller's transaction and fixed document keys. Full `validateAuthorityEnvelopeV2` uses the real persisted `processingProgram`, execution recipe and original metadata with the matching static toolset. Persisted-read byte bounds are 262144, so the bridge does not impose an accidental 64 KiB limit on a valid multi-page PDF record. No UID, private Storage/cache paths or processing evidence is exposed through the public manifest/catalog projections.

Default selection requires technical READY and nonarchived media. A trusted stored Snapshot may use an archived version only when its complete immutable entry matches the saved pin. A saved Draft may retain an archived asset only through server-derived `existingAssetIds`, which must be unique, sorted and at most64 entries. C0 derives these IDs from the stored Draft; the HTTP body does not supply an archive bypass. Read Draft uses its current stored IDs; Save uses the prior stored IDs; Submit passes no archive exception. Full READY/authority validation applies in every mode. Existing immutable LEGACY entries remain unchanged.

Coordinator2 and Upload/job received the literal D07 factory/result API. C0 owns the home-v3 context/Draft callers and Upload/C1 owns default backend service injection. At this source observation those external callers were still being connected; their completion will be recorded below after reading the actual owned source. IMAGE does not write those files or open an additional approval/review gate.

Human acceptance remains unexecuted: upload one local JPEG through the actual CMS flow; check three WebP derivatives, unchanged original hash/bytes, manifest and generation consistency; check worker completion/cleanup and failure/cancel behavior; select the resulting READY image, Save Draft, Submit and Preview. Retained candidate data/actors/custody are preserved. This source delivery does not establish runtime PASS, M3 acceptance, LOCAL_COMPLETE, cloud or production readiness.

### Consumer wiring observed complete in source

On 2026-10-14, parent read the actual newly connected consumers. `cms-api/routes.mjs` constructs `createSiteV3MediaProvider({db,library})` in `siteV3Dependencies` and injects `{db,authorize,mediaProvider}` into the real home-v3 Draft, Snapshot, Review and source-check service factories. The Snapshot derivative route also uses these Snapshot services. `cms-api/index.mjs` authorizes the home-v3 operations before route dispatch; each service retains its transaction authorization checks.

`site-v3-context.mjs` now forwards the optional server-only `existingAssetIds`. `site-v3-drafts.mjs` derives Read/Save exceptions from the actual stored `current.content`, filtering trusted legacy IDs. `site-v3-snapshots.mjs` calls selection without that exception for Submit and rejects archived current media. Historical Snapshot resolution still supplies the stored complete `mediaManifest` pin. These source calls match the delivered D07 factory and result API.

The IMAGE branch's scoped CMS integration source is complete. Coordinator2 and Upload/job receive this closeout without a new approval, test, source-freeze or independent-review gate. Other M3 branches and final M3 acceptance remain their owners' responsibility. All current runtime and human acceptance results remain NOT_RUN.
