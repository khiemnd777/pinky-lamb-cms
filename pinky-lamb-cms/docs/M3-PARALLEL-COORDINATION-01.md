# M3-PARALLEL-COORDINATION-01 v1

## Authority — Verified

Khiêm directly delegated approval and scheduling decisions in Coordinator chat `01a135e2-c142-7842-ae74-e1d8998bb073`:

> Tôi đồng ý giao quyền điều phối để bạn tự do phân tích và đưa ra quyết định Approval cho các việc đang chạy, sao cho các việc không bị đụng scope lẫn nhau, nếu conflict thì tự quyết định việc nào chạy trước, việc nào chạy sau, và các việc nào chạy song song.

Observed at 2026-10-13 16:01:25 UTC (Asia/Ho_Chi_Minh: 23:01:25). This is observation time, not a server timestamp for the human message. The approving authority below is the Codex Coordinator under this direct delegation. These are not fabricated direct human approvals of individual proposals. The latest direct delegation supersedes the earlier requirement that only Khiêm personally approve each of these assigned M3 work slices. All other applicable controls remain in force.

## Decision — Approved

The Coordinator approves `M3-PARALLEL-BATCH-01 v1`, source/pure portions of the six frozen v1 proposals below. The six chats self-organize according to current project policy. A Task Owner uses actual GPT-6.1 Sol Medium for code/tests, actual High reviews; inspect observed routing. One writer per file and no recursive child delegation. Routine in-scope repair continues without per-file approval. Coordinator decides conflicts, contract release, scheduling and materially revised bounded local plans under the delegated authority, after a concrete proposal/evidence review. There is no blanket execution authority for a plan that has not been reviewed.

Existing IMAGE candidate and PDF processor approvals retain their current ownership. This new coordination record does not rewrite historical ledgers, receipts, source pins or the frozen M3 graph. Each processor standalone delta is attributed separately from protected M1/M2 files. Upload remains in its isolated workspace; no canonical promotion.

| Branch / v1 | Decision | Initial pure runner |
|---|---|---|
| M3-PARALLEL-VIDEO-01 | SOURCE_PURE_APPROVED_NATIVE_HOLD | QUEUED |
| M3-PARALLEL-IMAGE-01 | SOURCE_PURE_APPROVED_NATIVE_HOLD | QUEUED |
| M3-PARALLEL-UPLOAD-01 | U0_APPROVED_U1_Q1_J1_WAIT_CONTRACT_FREEZE | ADMITTED_ONE_PURE_RUNNER |
| M3-PARALLEL-RIGHTS-01 | PREPARATION_APPROVED_DEPENDENT_IMPLEMENTATION_WAIT_MEDIA_BINDING_FREEZE | QUEUED |
| M3-PARALLEL-V3-01 | C0_APPROVED_A_B_C_WAIT_CONTRACT_FREEZE_I_WAIT_COMPOSITION | ADMITTED_ONE_PURE_RUNNER |
| M3-PARALLEL-QA-01 | PREPARATION_GENERIC_ORACLE_APPROVED_SCHEMA_CASES_WAIT_FREEZE_INTEGRATED_QA_HOLD | QUEUED |

## Dependencies and contracts

V3 chat `01a135ee-9f2c-78b1-9026-447e6b87a018` owns C0 for the proposed pure metadata/ref/manifest interface in `contracts/media-v3-contract.mjs`; this does not create a replacement `contracts/media.mjs` or promote IMAGE candidate contracts. Upload chat owns U0 in its isolated candidate. Rights chat owns its rights contract. They supply exact interface/golden vectors and unresolved semantic decisions to the Coordinator through their own chat/task record. The Coordinator checks compatibility and records a release before dependent implementations run.

C0/U0 preparation, processor source/pure authoring and QA matrix/runbook preparation may proceed in parallel. Rights may prepare non-self/terminal/replay cases and its proposed binding; dependent implementation waits for exact media binding. Upload U1/Q1/J1 and V3 A/B/C wait for C0/U0 compatibility freeze, then may code in parallel in separate owned files; composition follows. QA generic oracles may be authored independently; schema-specific oracles wait for agreed contracts. Missing native/READY/rights proof remains unknown; synthetic fixtures do not become product evidence.

Preserve schema1/2 behavior and hashes. Proposed field choice is `isDecorative` consistent with existing source; no silent edit to frozen scope examples. Keep `max_processing_attempts:2` as total attempts from the frozen scope caps; clarify ambiguous prose in the owned new contract, not by rewriting historical scope. Idempotency bindings and exact record byte measurement must agree before integration.

## Runtime and tooling

Two lightweight pure runners maximum across the six new branches; initial slots are V3 C0 and upload U0, each concurrency1, using its proposal's stricter heap/deadline/output caps. This is an explicitly coordinated exception for the new pure-only slices, not permission for concurrent native/emulator/browser runners. Queued chats may author source/tests/docs and run scoped syntax/lint; record a runner request and wait for Coordinator admission before Node test execution. Task Owners report actual runner completion/custody in their chat. The Coordinator then releases slots to the next ready branch; no automatic process kill or historical test cleanup.

One heavy native/emulator/browser workload at a time. Existing IMAGE candidate retains its approved runtime priority; future admission needs its own observed custody/preflight. New processor native IMAGE/VIDEO and PDF are HOLD: `verifyMediaTools` checks the PDF closure, and twelve bundled dylibs differ from frozen pins. No bypass, rebaseline or reuse of IMAGE fixture permission for full processors. PDF chat owns read-only recovery proposal preparation; no tool repair has been approved in this record. Coordinator reviews a complete bounded local recovery proposal before a separate approval/release, preserving old evidence and comparing affected consumers. A changed verifier/pin/recipe requires affected source review and a recorded revised decision before native use.

Only demo-pinky-lamb-cms and localhost for any separately approved runtime. No existing accounts/data reset, reseed, import or deletion; preserve source, assets, dependencies, libraries, history and old evidence. No cloud/production, Firebase login/billing/IAM, global configuration, permissions/sandbox changes, Git or M4. No autonomous human acceptance or LOCAL_COMPLETE.

## Verification and handoff

Each Task Owner keeps the exact approved paths, original frozen proposal caps and separate evidence namespace below. Source/pure verification proves only that scope. Record command/exits, source/tool/contract hashes, retained failure evidence, preservation, actual routing, findings and unrun criteria. Coordinator owns this document and `approvals/M3-PARALLEL-COORDINATION-01-REGISTER.json`; branch owners do not write shared ledgers/indices. This coordination record is a new decision record, not whole-database protection or runtime enforcement.

## Frozen original proposals

The following texts are exact snapshots of the six original planning final answers read in this Coordinator chat. Their original AWAITING_APPROVAL wording records historical planning state; the operative decisions and restrictions are above and in the separate register.

### M3-PARALLEL-VIDEO-01 v1 — M3 — Plan processor video

Source chat: `01a135ee-7c15-7183-90b4-100fe389bf0a`.

**Proposed — `M3-PARALLEL-VIDEO-01 v1`: tách processor VIDEO của `CMS-M3-15` để phát triển độc lập.** Mục tiêu là xử lý original MP4 private thành MP4 và WebP poster đã kiểm chứng, kèm manifest. Trạng thái: **AWAITING_APPROVAL**.

**Verified:** chưa có module, tests hoặc fixtures `media-video` trong source đã khảo sát. [Kế hoạch M3](/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/pinky-lamb-cms/tasks/M3-plan.md:245) vẫn đặt VIDEO sau PDF; proposal này chỉ mở một nhánh processor riêng, chưa thay graph tích hợp.

[Verifier chung](/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/pinky-lamb-cms/scripts/media-tool-audit.mjs:36) kiểm cả PDF closure trước native VIDEO. Receipt PDF ghi **12 dylibs lệch SHA**, actor/cause **Unknown**. Linkage FFmpeg đã lưu chỉ liệt kê system libraries/frameworks; điều đó chưa chứng minh bytes hoặc dynamic loading hiện tại. **Native VIDEO vẫn HOLD**, không đổi pins hoặc bỏ verifier.

**Ownership dự kiến:** một Task Owner dùng actual GPT-6.1 Sol Medium, tối đa năm files mới:

- `/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/pinky-lamb-cms/cms-api/media-video.mjs`
- `/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/pinky-lamb-cms/cms-api/media-video-runtime.mjs`
- `/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/pinky-lamb-cms/tests/fixtures/media-video.mjs`
- `/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/pinky-lamb-cms/tests/media-video.test.mjs`
- `/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/pinky-lamb-cms/docs/M3-PARALLEL-VIDEO-01.md`

Giữ ownership IMAGE/PDF. Shared tools, dependencies, locks và ledgers chỉ đọc. Coordinator chỉ định reviewer High và quản lý tích hợp.

**Contract đề xuất:**

`processVideo({input, expectedSha256, attemptDirectory, signal?})`

- Dùng cùng request shape với `processPdf`; từ chối unknown keys, URL, executable, argv và caller-supplied caps.
- Original thuộc private scratch, là regular file không links, pin SHA và custody trước/sau. Attempt mới; không reuse hoặc overwrite.
- Success trả manifest private gồm original digest, recipe/tool/source digests, metadata native và hai outputs `safe.mp4`, `poster.webp`. Poster thuộc cùng version, role `POSTER`.
- Chỉ xuất manifest sau khi decode lại outputs, kiểm size/SHA, preservation và process cleanup. Failure/cancel không có success manifest; giữ nguyên lỗi `TOOL_BYTES`.
- Manifest không cấp rights hoặc `READY`. Chuẩn hóa kết quả các processors vào contracts CMS thuộc bước tích hợp sau.

**Thứ tự thực hiện sau Approved:**

| Bước | Kết quả và kiểm chứng |
|---|---|
| 1. Source/pure | Request, MP4 structure/metadata, manifest/hash, private-path/custody tests; syntax và focused ESLint. Chưa generate MP4 hoặc load native modules. |
| 2. Native đầu tiên | Sau tool gate và slot: fixture nhỏ H.264/AAC → probe → full decode → transcode → poster → decode lại → manifest. Sau đó kiểm no-audio. |
| 3. Boundary/review | Native caps, malformed/truncated, extra streams, external references, metadata, tamper, timeout/cancel/resource limits và partial outputs; independent High review rồi bàn giao Coordinator. |

Runtime VIDEO có recipe cố định riêng; tái sử dụng verifier, pins và validators nguyên trạng. Recipe tắt sao chép metadata global/stream và chapters, dùng strict decode errors. Audit helper hiện chỉ có `-map_metadata -1`; FFmpeg mặc định còn sao chép stream metadata và chapters. [FFmpeg documentation](https://ffmpeg.org/ffmpeg.html#Advanced-options)

**Limits và side effects đề xuất:**

| Phạm vi | Giới hạn |
|---|---|
| Input | MP4 ≤128 MiB; một H.264 stream; AAC hoặc không audio; ≤300 s, 1920×1080, 60 fps |
| Output | H.264/AAC faststart ≤1280×720, ≤30 fps, không upscale; MP4 ≤48 MiB; poster ≤1 MiB |
| Processing | Deadline toàn pipeline 600 s; 2 threads; child heap 256 MiB; sampled whole-tree RSS 768 MiB; scratch 256 MiB; stdout/stderr mỗi stream 64 KiB |
| Destinations | `.local/test-outputs/m3/parallel-video-01/<run>/` và `.local/media-scratch/m3/parallel-video-01/<attempt>/`, dưới CMS root; fixtures/candidates retained ≤512 MiB/run |

Fixture helper chỉ được tạo thêm các `audit-<UUID>` scratch do chính lần chạy sở hữu và ghi nhận custody. Cleanup chỉ intermediates đã xác minh ownership sau khi giữ evidence; không xóa original, retained outputs hoặc lịch sử. Watchdog là best effort, chưa phải hard memory limit hay OS sandbox.

Source/pure work có thể chạy song song với IMAGE/PDF. Native VIDEO phải chờ Coordinator xác nhận heavy slot đã được giải phóng; không chạy cùng lượt native/browser/emulator nặng. Không nối worker/API/Storage/UI, không emulator, install, Git, M4 hoặc production.

**Acceptance:**

- Hai luồng audio/no-audio tạo outputs đúng caps, decode được, không giữ source metadata hoặc extra streams; digest do oracle độc lập kiểm.
- Boundary fixtures chứng minh max duration và các overcaps/refusal; không remux/copy-original hoặc software fallback.
- Cancel/timeout/resource crossing không tạo success manifest; owned process trees được reap hoặc báo cleanup Unknown và giữ dữ liệu.
- Original và immutable tooling được bảo toàn; pure/static/native/review có evidence riêng. Chỉ source PASS chưa hoàn thành processor hoặc `CMS-M3-15`.

Focused commands dự kiến, từ CMS root với pinned Node:

```sh
.local/cache/node/node-v22.23.3-darwin-arm64/bin/node --test --test-concurrency=1 --test-name-pattern='^pure VIDEO:' tests/media-video.test.mjs
```

Native dùng selector `^native VIDEO:` sau khi điều kiện trên đạt. Syntax kiểm từng file `.mjs`; ESLint chỉ bốn files owned, không `--fix` hoặc broad build.

**Quyết định cần thiết:**

> Approved M3-PARALLEL-VIDEO-01 v1 — VIDEO processor local. Cho phép source/pure và kiểm thử trong phạm vi đã trình; native giữ HOLD đến khi tool-drift recovery được Approved, verifier nguyên trạng PASS và Coordinator cấp slot.

Nếu recovery thay pins, verifier hoặc recipe, phải review delta và trình revision VIDEO trước native phụ thuộc. [Approval protocol](/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/docs/APPROVAL-PROTOCOL.md) yêu cầu Approved cho scope/approach mới. Lượt này chỉ lập proposal trong chat: **không sửa files; tests/build/native/emulator và independent review đều NOT_RUN**.



### M3-PARALLEL-IMAGE-01 v1 — M3 — Plan processor ảnh

Source chat: `01a135ee-860c-7631-9452-05ec59c52995`.

**Proposed — `M3-PARALLEL-IMAGE-01 v1`:** Hoàn thành processor ảnh của `CMS-M3-13` như một module độc lập, chuẩn bị cho luồng upload sau này. Có thể làm source/pure checks song song; native verification hiện phụ thuộc lỗi tool pins.

**Verified:** Ba files của task13 chưa tồn tại. [M3-plan](/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/pinky-lamb-cms/tasks/M3-plan.md:217) còn prerequisite `CMS-M3-12`. Nhánh [IMAGE candidate](/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/pinky-lamb-cms/docs/M3-CONTINUE-04.md) chỉ làm library/detail/preview chỉ đọc với WebP tổng hợp. Helper hiện có là setup audit, chưa phải processor upload hoàn chỉnh.

Receipt PDF ghi **12 dylibs lệch SHA**, actor/cause **Unknown**. Source xác nhận `verifyMediaTools()` kiểm cả PDF closure; processor IMAGE dùng gate này cũng chịu blocker đó. Hash audit/helper và tool lock hiện khớp receipt. Tôi chưa chạy lại native.

**Mục tiêu và contract đề xuất**

```text
processImage({ input, expectedSha256, declaredMime, attemptDirectory, signal? })
```

Nhận original private local, kiểm ownership/path/hash/MIME, rồi tạo ba WebP derivatives. Kết quả chứa kích thước, MIME, byte count, SHA và recipe cố định. Chỉ xuất success manifest sau khi decode lại toàn bộ outputs và kiểm original còn nguyên. Failure/cancel giữ evidence và không xuất success manifest.

Caller không chọn executable, argv, quality hoặc caps. Kết quả processor chưa cấp rights approval hoặc trạng thái Firestore `READY`. Slice này chưa tích hợp upload parts, lease worker, API, Storage hoặc UI.

**Ownership dự kiến — Coordinator cần xác nhận trước Approved**

Một actual **GPT-6.1 Sol Medium** sole writer cho bốn files mới:

- `/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/pinky-lamb-cms/cms-api/media-images.mjs`
- `/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/pinky-lamb-cms/cms-api/media-images-runtime.mjs`
- `/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/pinky-lamb-cms/tests/fixtures/media-images.mjs`
- `/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/pinky-lamb-cms/tests/media-images.test.mjs`

Coordinator giữ task record riêng tại `/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/pinky-lamb-cms/docs/M3-PARALLEL-IMAGE-01.md`. Independent actual High review source/security/evidence. Không sửa candidate workspace, PDF-owned files, shared helpers, Sharp, dependencies hoặc pins.

**Acceptance**

1. JPEG/PNG/static WebP: magic, declared MIME và decoder format phải khớp; input ≤10 MiB, mỗi cạnh ≤8192 px, ≤40 triệu pixel, một frame.
2. Full decode trước resize; đúng tám EXIF orientations gồm xoay/lật; chuyển sRGB, giữ alpha, bảo toàn tỉ lệ, không upscale.
3. Tạo WebP theo chiều rộng 320/960/1920; tổng ≤12 MiB. Recipe cố định đề xuất `quality:80`, `alphaQuality:100`, `effort:4`.
4. Bỏ EXIF/XMP/IPTC/ICC và orientation metadata; decode lại từng output, kiểm dimensions/alpha/byte count/SHA. Cách dùng `autoOrient`, metadata stripping và resize được đối chiếu với [Sharp operations](https://sharp.pixelplumbing.com/api-operation/#autoorient), [output](https://sharp.pixelplumbing.com/api-output/) và [resize](https://sharp.pixelplumbing.com/api-resize/).
5. Từ chối malformed/truncated, spoof, formats ngoài allowlist, APNG/animated WebP và overcaps. Không coi chọn frame đầu là chứng minh ảnh tĩnh.
6. Cancel/timeout/resource failure không thành công một phần; original và attempts trước giữ nguyên. Kiểm private ancestry, symlink/hardlink, output collision và custody khi finalise.

**Thứ tự và phần độc lập**

- Sau Approved: chốt contract, viết pure regression tests, processor và Node child runtime trong ownership trên; syntax/focused lint/pure checks.
- Source/pure work độc lập với library candidate và PDF. Không import runtime riêng của PDF.
- Native chỉ chạy khi frozen tool gate hợp lệ và Coordinator cấp slot sau khi xác nhận process tree trước đã kết thúc. Giữ nguyên `verifyMediaTools()`; không dùng quyền fixture builder riêng của candidate để vượt gate processor.
- Native bắt đầu bằng một JPEG → ba WebP → output verification, rồi mở matrix orientation/alpha/metadata/animation/malformed/caps/cancel.
- Task13 integration với `CMS-M3-12` vẫn chờ graph chính được mở hợp lệ. Module PASS chưa đóng M3 hoặc chứng minh upload xuyên suốt.

**Checks và side effects sau Approved**

Dùng Node pin `22.23.3`: `--check` bốn files, focused ESLint không `--fix`, focused Node tests với `--test-concurrency=1`. Evidence ghi command/exit, source/tool hashes và actual native observations.

Chỉ tạo synthetic fixtures/evidence trong:

- `.local/test-outputs/m3/parallel-image-01/<run-id>/`
- `.local/media-scratch/m3/parallel-image-01/<attempt-id>/`

Các paths thuộc CMS root; directories `0700`, files `0600`, không serve qua HTTP. Mỗi job giữ caps **30 giây, heap 256 MiB, hai threads, sampled process-tree RSS 768 MiB, scratch 256 MiB, mỗi log stream 64 KiB**. RSS watchdog là best effort. Đề xuất tổng fixture/evidence mới ≤256 MiB; đạt giới hạn thì dừng, không xóa lịch sử. Native/browser/emulator nặng xếp riêng; slice này không mở browser/emulator hoặc ghi dữ liệu CMS.

Pure boundary checks và actual resource crossings được báo riêng. Nếu chưa quan sát được native crossing thì giữ `NOT_RUN`, không suy PASS từ mocks.

**Next:** Coordinator xác nhận ownership và đưa proposal này vào quyết định triển khai. Lời duyệt cần thiết:

> Approved M3-PARALLEL-IMAGE-01 v1 — IMAGE processor local. Xác nhận ownership bốn source/test files và task record của Coordinator; cho phép source/pure checks, native chỉ khi frozen tool gate hợp lệ và slot được điều phối.

Approved mới cần vì proposal tách task13 khỏi prerequisite tuần tự và thêm runtime file; nguồn là [M3-plan](/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/pinky-lamb-cms/tasks/M3-plan.md:219) và [team-policy](/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/docs/agent-kit/team-policy.md:13). Lượt này chỉ khảo sát và lập proposal trong chat: **không ghi files, chạy tests/build/native hoặc sửa dữ liệu**. Tool recovery cần phạm vi/approval riêng.



### M3-PARALLEL-UPLOAD-01 v1 — M3 — Plan upload quota và jobs

Source chat: `01a135ee-8f22-70f1-8016-92ca2a782719`.

**M3-PARALLEL-UPLOAD-01 v1 — Proposed, chờ Approved**

Có thể tách ba nhánh logic thuần để làm song song: **chunk/hash/idempotency**, **quota reservations** và **job transitions/retry/lease**. Mục tiêu là chuẩn bị nền tảng cho upload có thể retry, cancel và phục hồi mà không tạo job trùng hoặc bỏ sót bytes trong quota. Slice này chưa cung cấp upload hoạt động trong CMS.

**Verified:** [M3 register](/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/approvals/CMS-001-v2-M3-REGISTER.json) và [M3 plan](/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/pinky-lamb-cms/tasks/M3-plan.md:87) vẫn giữ graph tuần tự; task 05 chưa được mở. Canonical source chưa có các module upload/quota/job. Contract của IMAGE candidate chỉ là nguồn tham khảo. [PDF processor](/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/pinky-lamb-cms/docs/M3-PARALLEL-PDF-01.md) bị chặn bởi 12 dylib lệch SHA trước native spawn; actor/cause vẫn **Unknown**.

**Phạm vi và ownership đề xuất**

Dùng workspace riêng, không promote vào canonical source:

```text
/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/pinky-lamb-cms/
.local/test-outputs/m3/parallel-upload-01/<run-id>/workspace/pinky-lamb-cms/
```

Các đường dẫn trong bảng nằm dưới workspace này. Ownership chưa được giao thực tế.

| Task / owner dự kiến | Files được ghi | Kết quả và acceptance |
|---|---|---|
| **U0 — Contract owner** | `contracts/media-upload.mjs`, `tests/media-upload-contract.test.mjs`, `docs/M3-PARALLEL-UPLOAD-01.md` | Schema strict, caps, receipts, error mapping và interface bàn giao được kiểm tra rồi freeze. |
| **U1 — Upload domain owner** | `cms-api/media-upload-domain.mjs`, `tests/media-upload-domain.test.mjs` | Chunk đúng offset/size/hash; replay không tạo effect mới; partial completion và payload khác bị từ chối. |
| **Q1 — Quota domain owner** | `cms-api/media-quota-domain.mjs`, `tests/media-quota-domain.test.mjs` | Reserve/consume/release không âm, không vượt budget; cancelled/orphan/uncertain writes vẫn được tính. |
| **J1 — Job domain owner** | `cms-api/media-jobs-domain.mjs`, `tests/media-jobs-domain.test.mjs` | Claim/heartbeat/finalize có revision và lease fencing; stale worker không finalize; retry đúng giới hạn. |
| **V1 — Composition owner** | `tests/media-domain-contract.test.mjs` | Kiểm tra các quyết định upload/quota/job khớp nhau qua replay, cancel–complete race và stale finalizer. |

Implementation/tests dùng actual **Medium**; review dùng actual **High**. Trước giao việc phải kiểm observed route. Lượt này chưa có runtime evidence để xác nhận route.

**Contract cần freeze trước khi U1/Q1/J1 ghi song song**

1. **Ranh giới thuần:** module nhận snapshot, command và trusted context; trả quyết định cùng revision cần so sánh. Module không đọc Storage, Firebase, Auth, filesystem, clock hoặc environment. IDs/time được caller cung cấp từ nguồn server. Contract browser không import Node; phần hash server chỉ dùng `node:crypto`.

2. **Upload/chunks:** JSON giữ **64 KiB**; part tối đa **4 MiB**, index bắt đầu từ 0, offset cố định, part cuối có độ dài còn lại chính xác. Input cap giữ IMAGE/PDF/VIDEO **10/25/128 MiB**, tương ứng tối đa **3/7/32 parts**. Server tính SHA-256 từ bytes. Whole-file SHA phải tính từ bytes theo thứ tự; không suy ra bằng cách ghép part digests.

3. **Idempotency:** đề xuất `requestId` là khóa của một intent; nếu transport giữ `Idempotency-Key`, hai giá trị phải bằng nhau. Identity bind actor + operation + resource + requestId; fingerprint bind toàn payload đã validate. Same key/body replay receipt cũ trước kiểm revision mới; khác body trả `422`; part cùng index khác bytes trả `409`. In-flight chưa rõ kết quả không được tạo writer thứ hai. Receipt giữ trong M3, chưa thêm TTL/xóa.

4. **Metadata/rights:** core chỉ nhận binding digest do boundary đã validate tạo ra. Core không tự định nghĩa hoặc duyệt rights. Exact payload `name/basis/evidence` và rights schema phải freeze trước API integration; đây là dependency còn chờ.

5. **Quota:** giữ **200 versions**, **2 active intents/uploader**, **4 toàn project**, retained Storage **2 GiB**. Reserve ban đầu:
   `2 × declared input + kind max derivative bytes`, với output cap **12/96/49 MiB**. Cancel chỉ release phần chứng minh chưa dùng. Write chưa rõ kết quả giữ reservation; bytes orphan vẫn được charge. Retry reserve output mới và giữ attempt cũ. Adapter sau này phải áp quyết định trong cùng Firestore transaction với intent/job; unit tests không chứng minh atomicity đó.

6. **Jobs/lease:** giữ `UPLOADING → QUEUED | CANCELLED` và `QUEUED → PROCESSING → READY | REJECTED | RECOVERY_REQUIRED`. Scope JSON quy định **2 processing attempts tổng cộng**: lần đầu + tối đa 1 retry. Validation rejection không retry cùng bytes. Đề xuất lease **30 giây**, heartbeat **5 giây**, epoch tăng khi claim; heartbeat/finalize phải khớp attempt, epoch và revision hiện hành. Lease hết hạn chuyển sang recovery và chặn finalize; không tự chạy worker thay thế khi chưa chứng minh process cũ đã dừng.

**Thứ tự và phần thực sự độc lập**

`U0 freeze → U1 ∥ Q1 ∥ J1 → V1 + review`

U1/Q1/J1 chỉ đọc contract U0, không sửa file của nhau. Contract thay đổi thì dừng phần phụ thuộc để đánh giá lại. Coordinator sở hữu quyết định tích hợp; reviewer trả findings và không sửa application code.

Storage provider, Auth/current membership, routes/raw parser, `local-guard`, worker launcher/process cleanup, safe-cache/READY commit và canonical promotion **chưa mở trong v1**. Các phần đó cần proposal tích hợp riêng và các prerequisite M3 tương ứng. Ownership IMAGE và năm files PDF hiện hành được giữ nguyên; không sửa tool pins hoặc rebaseline dylibs.

**Checks, side effects và giới hạn sau Approved**

- Chỉ source inspection, focused Node unit tests, syntax và ESLint trên candidate; không `--fix`, broad suite hoặc build.
- Source/fixture/evidence chỉ nằm trong namespace `parallel-upload-01`; bản sao dependency dùng closure hiện có đã kiểm, không install/download hay backlink tới application source.
- Ba nhánh có thể code song song; tối đa **2 pure test runners**, mỗi runner concurrency **1**, heap **128 MiB**, timeout **120 giây**, stdout/stderr mỗi stream **64 KiB**. Fixture giữ tối đa **16 MiB** binary; các budget lớn kiểm bằng số nguyên.
- Không socket/HTTP, emulator, browser, decoder hoặc native processor. Không sửa canonical source, ledgers, shared indices, dữ liệu, Git hay global config.
- Bàn giao gồm exact source hashes, contract digest, exports/input/output, command/exits, findings và preservation evidence. Acceptance chỉ là **pure-domain candidate verified**; M3-AC03/07 runtime và toàn pipeline vẫn chưa đạt.

**Kiểm chứng lượt này:** chỉ đọc nguồn; không tạo/sửa file, chạy tests/build/runtime hoặc gửi tin sang chat khác. Independent review **NOT_RUN**.

Lời duyệt cần thiết cho phạm vi trên:

> Approved M3-PARALLEL-UPLOAD-01 v1 — isolated pure-domain candidate. Cho phép U0 freeze contracts, rồi U1/Q1/J1 song song và V1 với focused pure tests/review trong namespace đã nêu. Chưa mở canonical promotion, Storage/Auth/routes/guard/worker integration hoặc native/emulator/browser.

Cần Approved riêng vì [AGENTS.md](/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/AGENTS.md) yêu cầu “Chỉ triển khai khi người dùng ghi Approved cho đúng proposal/version/milestone”; proposal này mở candidate workspace và tách graph hiện hành. Tôi chờ quyết định cho v1.



### M3-PARALLEL-RIGHTS-01 v1 — M3 — Plan duyệt quyền media

Source chat: `01a135ee-96d2-7e51-a189-f19f4e328020`.

**Proposed — M3-PARALLEL-RIGHTS-01 v1: quy tắc rights thuần cho CMS-M3-05/17.**

Mục tiêu là chuẩn bị contract có thể kiểm thử độc lập, để backend sau này quyết định quyền sử dụng đúng media version. Lượt này đã đọc nguồn và lập proposal; chưa ghi file hoặc chạy tests/build/native/emulator.

**Verified:** [M3-plan](/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/pinky-lamb-cms/tasks/M3-plan.md:89) giữ graph tuần tự; original05 chưa được release, CMS-M3-17 phụ thuộc CMS-M3-16. Nhánh IMAGE chỉ đọc thư viện và giữ rights `PENDING`. [Nhánh PDF](/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/pinky-lamb-cms/docs/M3-PARALLEL-PDF-01.md) đang `BLOCKED_TOOL_BYTES`; nguyên nhân 12 dylib lệch SHA vẫn **Unknown**.

**Phạm vi và ownership dự kiến**

Một Task Owner dùng actual **GPT-6.1 Sol Medium**, sole writer cho bốn file mới:

| File dự kiến | Trách nhiệm |
|---|---|
| `/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/pinky-lamb-cms/contracts/media-rights.mjs` | Strict schemas, binding/proof validation và quy tắc terminal/replay |
| `/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/pinky-lamb-cms/tests/media-rights-contract.test.mjs` | Input, digest, kích thước và tamper cases |
| `/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/pinky-lamb-cms/tests/media-rights-policy.test.mjs` | Non-self, terminal decision và replay/conflict |
| `/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/pinky-lamb-cms/docs/M3-PARALLEL-RIGHTS-01.md` | Contract freeze, approval và handoff riêng |

Coordinator bố trí High review và cập nhật shared state. Nhánh không ghi ledger, authorization, routes, UI hoặc files của IMAGE/PDF.

**Contract cần freeze**

- `assetId` chỉ đúng **immutable media version**, không resolve “latest”. Binding pin original SHA, derivative-set SHA, processing-recipe SHA, tool-set SHA và evidence SHA.
- Request strict gồm expected binding, `expectedRightsRevision:0`, `decision: APPROVED|REJECTED`, `note?`. Intent key dùng cơ chế `Idempotency-Key` hiện hành. Client không được gửi actor, reviewer, thời gian, trạng thái hoặc proof.
- Context tin cậy do backend cung cấp gồm uploader UID, UID người nộp rights evidence, current actor và trạng thái version. “Evidence author” ở đây là tài khoản CMS nộp evidence.
- Proof terminal pin toàn binding, người nộp, reviewer, decision, thời gian, revision, proof ID và audit-event ID. SHA dùng canonical JSON hiện hành; không trim hoặc sửa nội dung trước khi tính digest.

**Quy tắc thuần**

| Điều kiện | Kết quả |
|---|---|
| Actor trùng uploader hoặc người nộp evidence | `SELF_REVIEW_FORBIDDEN`, kể cả Owner |
| Version chưa READY hoặc binding đã đổi | Từ chối quyết định mới |
| PENDING, binding đúng, non-self | Cho phép tạo một terminal proof |
| Cùng actor/operation/version/key và payload giống hệt | Replay receipt cũ sau khi kiểm proof khớp |
| Cùng key nhưng payload khác | `IDEMPOTENCY_PAYLOAD_MISMATCH` |
| Terminal đã tồn tại, request mới | Conflict; không tạo quyết định thứ hai |

Cả APPROVED và REJECTED đều append-only. Đổi file/evidence tạo version mới. Archive không trở thành rights revocation.

Rights proof chỉ xác nhận quyết định sử dụng media. Proof không tạo `SOURCE_CHECKED`, không mở rộng factual-source catalog và không thay Snapshot review.

**Dependencies và phần có thể chạy song song**

Coordinator cần freeze giao diện với **media/upload/v3**: version ID, READY binding, uploader/evidence submitter, digest format và rights revision. Hiện các contract canonical này chưa có để xác nhận compatibility.

Sau freeze và Approved riêng, module thuần cùng synthetic tests có thể làm song song với IMAGE/PDF. Module không import Firebase, Storage, native tools hoặc backend.

Phần tích hợp CMS-M3-17 vẫn đợi CMS-M3-16: backend kiểm Reviewer/Owner và membership hiện hành; đọc lại binding trong transaction; ghi proof, terminal state, idempotency receipt và audit nguyên tử. Pure tests không chứng minh concurrency, Auth hoặc ACL.

**Acceptance và checks sau Approved**

- Strict input từ chối unknown/server-owned keys, digest sai và vượt giới hạn: request 64 KiB, provenance/evidence 4 KiB, detail/proof 8 KiB.
- Tamper từng binding field đều bị từ chối; thiếu UID tin cậy không được coi là non-self.
- Ma trận self-review, APPROVED/REJECTED, identical replay, changed payload và conflicting terminal đều đạt bằng synthetic fixtures.
- SOURCE_CHECKED không được nhận như rights proof; REJECTED/PENDING không được dùng như APPROVED.
- Chạy focused Node tests, syntax và ESLint đúng owned files; High review kiểm invariant và import boundary.

Chỉ dùng Node đã pin và dependency hiện có. Một test runner, concurrency 1; V8 heap 256 MiB, deadline 60 giây/file và 5 phút toàn nhóm. Fixtures nằm trong tests; logs/evidence chỉ tại `.local/test-outputs/m3/parallel-rights-01/<run-id>/`. Không network, native processor, emulator, build, install hoặc dữ liệu CMS.

**Next:** cần Approved riêng vì proposal xin ngoại lệ song song cho phần thuần của graph đang giữ tuần tự. Lời duyệt đề nghị:

> Approved M3-PARALLEL-RIGHTS-01 v1 — pure rights contract/rules, 4-file allowlist và focused unit/lint local; ngoại lệ song song chỉ phần thuần CMS-M3-05/17.

Backend/UI integration, runtime acceptance và LOCAL_COMPLETE vẫn chưa được mở bởi lời duyệt này.



### M3-PARALLEL-V3-01 v1 — M3 — Plan contracts home-v3

Source chat: `01a135ee-9f2c-78b1-9026-447e6b87a018`.

**M3-PARALLEL-V3-01 v1 — Proposed, chờ Coordinator chốt contract owner và Approved.**

Có thể tách ba nhánh: **media refs theo slot**, **canonical manifest/hash**, **đo budget**. Các nhánh dùng metadata synthetic và không cần native processor, emulator hoặc browser.

**Verified:** [ledger M3](/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/approvals/CMS-001-v2-M3-REGISTER.json) ghi CMS-M3-06–07 `PLANNED_APPROVED`, nhưng chưa release qua chuỗi phụ thuộc. [Plan gốc](/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/pinky-lamb-cms/tasks/M3-plan.md) yêu cầu tuần tự; proposal này cần Approved riêng để tách graph. [Nhánh PDF](/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/pinky-lamb-cms/docs/M3-PARALLEL-PDF-01.md) vẫn bị chặn bởi 12 dylib lệch SHA; actor/cause **Unknown**.

**Mục tiêu:** chuẩn bị các contract thuần cho schema3, đủ kiểm tra references, manifest/hash và kích thước trước bước tích hợp CMS.

**Contracts cần thống nhất trước làm song song:**

| Contract | Đề xuất |
|---|---|
| Version | Explicit `home-v3 / schemaVersion:3 / m3-site-media-v1`. Giữ nguyên dispatch, semantics và hashes schema1/2. |
| Media refs | Phân biệt legacy với immutable media version mới. Resolver nhận metadata được caller tin cậy; không nhận storage path, không tìm “latest”. Metadata của processor chưa phải `READY` hoặc rights approval. |
| Slot/kind | Các slot ảnh chỉ nhận IMAGE; credential nhận PDF; reel nhận VIDEO. New VIDEO poster phải cùng `assetId`, `derivativeRole:'POSTER'`; duration/dimensions/hash lấy từ metadata tin cậy. Legacy poster IMAGE giữ nguyên. |
| PDF pages | Kiểm mọi `publicCredentialPage`, kể cả project hidden, trong `1..pageCount` của sanitized PDF được chọn. Trả vị trí lỗi cụ thể. |
| Manifest/hash | Include tất cả references được content chọn, kể cả hidden và fixed assets; không include toàn library. Pin version, recipe digest, output key/generation/MIME/size/SHA và derivative-set digest. Original digest thuộc manifest private. Chốt thứ tự canonical; giữ nguyên thứ tự array của content và cách encode Unicode. |
| Budgets | Tối đa 64 referenced versions, 256 derivative entries; Draft/Snapshot/private response ≤256 KiB; QA v3 ≤2 MiB, v1/v2 ≤1 MiB; tối đa 64 rights proofs. Đo UTF-8 của record đã serialize, gồm escaped `contentJson` và proof metadata; không dùng reserve legacy để giả vừa budget. |

Owner chung cần chốt thêm ba điểm: field list của trusted context/manifest, hình dạng record dùng đo budget, và diagnostics an toàn. Tôi đề xuất dùng `isDecorative` theo mã hiện tại; ví dụ trong scope M3 đang ghi `decorative`. Không âm thầm đổi tên field.

**Ownership dự kiến — chỉ phân công sau Approved.** Các đường dẫn mới dưới `/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/pinky-lamb-cms/`:

| Task | Sole writer dự kiến | Files mới | Dependency / acceptance |
|---|---|---|---|
| C0 — Contract chung | Owner do Coordinator chọn; code writer Medium | `contracts/media-v3-contract.mjs`, `tests/media-v3-contract.test.mjs`, `tests/fixtures/media-v3-contract.json`, `docs/M3-PARALLEL-V3-01.md` | Chốt strict shapes, constants, ordering, diagnostics và golden vectors trước A/B/C. |
| A — Refs theo slot | V3 refs owner | `contracts/media-v3-refs.mjs`, `tests/media-v3-refs.test.mjs` | Sau C0; reject unknown refs, wrong kind, poster khác version và page link hidden vượt bounds. |
| B — Manifest/hash | V3 manifest owner | `contracts/media-v3-manifest.mjs`, `tests/media-v3-manifest.test.mjs` | Sau C0; golden hashes được tính độc lập; hidden mutation đổi digest, unselected library mutation không đổi digest. |
| C — Budget | V3 budget owner | `contracts/media-v3-budget.mjs`, `tests/media-v3-budget.test.mjs` | Sau C0; kiểm đúng cap và cap+1, tiếng Việt, Unicode escaping, proofs và duplicate references. |
| I — Ghép contract thuần | V3 integration owner | `contracts/site-media.mjs`, `tests/media-v3-composition.test.mjs`, `tests/media-v3-compatibility.test.mjs` | Sau A/B/C; composition đạt và fixtures/hashes M1/M2 không đổi. |

A/B/C có thể viết source song song trên contract C0 đã freeze. C0 và I chạy tuần tự. Không nhánh nào tự sửa contract chung hoặc files của nhánh khác.

**Checks và side effects đề xuất sau Approved:**

- Writer dùng actual Medium; review dùng actual High. Nếu route chưa được quan sát, ghi **Unknown**.
- Chạy focused `node --test --test-concurrency=1`, `node --check` và ESLint trên files mới bằng tooling đã pin; không install hoặc native imports.
- Một pure test runner tại một thời điểm, Node heap 256 MiB, timeout 30 giây mỗi test file. Coordinator xếp lịch riêng mọi native/browser workload.
- Chỉ tạo fixture source mới và evidence dưới `.local/test-outputs/m3/parallel-v3-01/<run>/`. Tests không ghi dữ liệu emulator.
- So sánh hashes trước/sau cho builders, Draft/Snapshot contracts, fixtures lịch sử, locks và M1/M2 ledgers. Delta PDF đang được phép phải ghi riêng.
- High review kiểm contract composition, independent hashes, hidden refs, budgets và preservation. Kết quả đạt chỉ là `PURE_CONTRACTS_VERIFIED_NOT_INTEGRATED`.

Scope không gồm import/migration, sửa existing builders, Draft/Snapshot/editor/renderer, promoting IMAGE candidate hoặc sửa/rebaseline PDF tools. Chỉ Coordinator cập nhật ledger/shared state. CMS-M3-06–07 và `LOCAL_COMPLETE` chưa hoàn tất bởi slice này.

**Next:** Coordinator chọn contract owner, chốt các điểm chung trên, rồi trình lời duyệt:

> Approved CMS-001 v2 — M3-PARALLEL-V3-01 v1, pure contracts và focused source checks theo proposal đã chốt; cho phép graph C0 → A/B/C song song → I. Contract owner: [tên đã chọn].

Lượt này chỉ đọc nguồn và trình proposal; không tạo/sửa files, chạy tests/build/native/emulator hoặc gửi tin sang chat khác.



### M3-PARALLEL-QA-01 v1 — M3 — Plan QA và runbook

Source chat: `01a135ee-a794-7541-9bb6-e0b81141ae45`.

**M3-PARALLEL-QA-01 v1 — Proposed, chờ Approved**

Mục tiêu là chuẩn bị QA độc lập cho CMS-M3-34–36/38: mapping AC, matrix tình huống âm, oracle kiểm độc lập và runbook dự thảo. Phần này có thể tiến hành song song với IMAGE/PDF. QA tích hợp vẫn giữ thứ tự `34 → 35 → 36 → 37 → 38`.

**Verified từ hồ sơ đã đọc**

- [M3 register](/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/approvals/CMS-001-v2-M3-REGISTER.json) vẫn ghi M3 chưa Accepted, R2 HOLD, R3 chờ Approved; `LOCAL_COMPLETE:false`.
- [IMAGE candidate](/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/pinky-lamb-cms/docs/M3-CONTINUE-04.md) có approval riêng, ghi source trong workspace cô lập; chưa chứng minh workflow M3 đầy đủ.
- [PDF handoff](/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/pinky-lamb-cms/.local/test-outputs/m3/parallel-pdf-01/run-2115f5aa-30e3-4c26-8469-f3d293c1186d/final-handoff.json) ghi `BLOCKED_TOOL_BYTES`, pure tests 7/7 và source review PASS. Native pipeline chưa chạy thành công; 12 dylib lệch SHA, actor/cause **Unknown**.
- [M3 plan](/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/pinky-lamb-cms/tasks/M3-plan.md:541) đặt QA cuối sau exporter. Proposal này không giải phóng các dependency đó.

Lượt này chỉ đọc nguồn và receipts. Không sửa file hoặc chạy tests/build/native/emulator/browser.

**Ownership và deliverables dự kiến**

Một QA implementer actual Medium là sole writer. High reviewer kiểm source/evidence độc lập; Coordinator giữ shared state. Các file mới dự kiến:

1. `/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/pinky-lamb-cms/docs/M3-PARALLEL-QA-01.md`
2. `/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/pinky-lamb-cms/tests/fixtures/m3-parallel-qa-matrix.json`
3. `/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/pinky-lamb-cms/tests/helpers/m3-parallel-qa-oracle.mjs`
4. `/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/pinky-lamb-cms/tests/m3-parallel-qa-oracle.test.mjs`
5. `/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/pinky-lamb-cms/docs/M3-PARALLEL-QA-01-RUNBOOK.md`

| Task | Files | Kết quả |
|---|---|---|
| QA-P1 | 1–2 | Mapping AC01–18; mỗi case có input, expected, oracle, dependency, evidence cần thiết và side effects |
| QA-P2, sau P1 | 3–4 | Oracle thuần, golden vectors và tests cho chính oracle |
| QA-P3, sau P1 | 5 | Runbook kiểm chứng/preservation/recovery dự thảo |

Không sửa tests của IMAGE/PDF/processors, final review, canonical runbook, registers hoặc shared indices. Không import toàn bộ suites M1/M2 có SDK initialization và fixture writes.

**AC-to-check matrix**

Đây là matrix kiểm chứng **Proposed**. Các kiểm tra sản phẩm trong bảng chưa được chạy bởi nhánh QA này.

| AC / task đích | Cases chính và oracle cần có |
|---|---|
| AC01–02 / 34 | Demo/loopback; missing host, real project, credential configuration sai bị từ chối. Anonymous/non-member/inactive/unverified/disabled/unknown-role; bốn role hợp lệ; token/role tamper. Kiểm Rules và backend riêng; denial không lộ existence/private bytes. |
| AC03,07 / 34–36 | Part thiếu/trùng/sai hash/size; cùng requestId khác body; completion kép; quota race; hai worker claim; stale finalizer; crash giữa object/cache/receipt/READY. Oracle đối chiếu bytes, receipts, quota và state thật. |
| AC04–06 / 35 | Ảnh đúng orientation/alpha; spoof/animation/truncated/bomb. PDF 1/48/49 trang, encrypted, active components. Video no-audio, stream sai và vượt caps. Cần native output decode/inspection, không dùng metadata fixture làm proof. |
| AC08,12 / 34,36 | OWNER tự duyệt upload hoặc evidence bị chặn; Publisher không mutate; terminal decision race/replay; evidence/hash stale. READY, rights và factual source proof phải độc lập. |
| AC09 / 36 | Pagination pageSize 1; tie-breaker; cursor khác filter/malformed; empty/error; archive chặn selection mới nhưng giữ historical references/bytes. |
| AC10 / 34,36 | Import CURRENT v2→v3 với revision/hash stale; bảo toàn home/home-v2/history; v1/v2 digest, replay, render/export tương thích. |
| AC11 / 35–36 | Wrong kind, poster khác version, hidden media pending rights, credential page ngoài pageCount; unknown/duplicate keys; manifest/proof tamper; byte budgets theo UTF-8 thực. |
| AC13–14 / 36 | Empty sandbox/CSP; token không vào iframe/URL/storage; video lazy; PDF navigation; selection/logout/deactivation/unmount/failed auth/late completion không phục hồi private preview. |
| AC15 / 35–36 | Rehash từng artifact file; exact public inventory; không original/evidence/UID/storage path/private JSON. Cache mất/sai/link escape phải fail; served artifact JS-off/on cần proof riêng. |
| AC16–18 / 37–38 | Fresh applicable gates, source freeze, preservation, review và runbook reproduction. Kết quả cũ chỉ giữ attribution lịch sử. |

Matrix resource dùng caps M3 đã trình: part 4 MiB; IMAGE 10 MiB/40 triệu pixel; PDF 25 MiB/48 trang; VIDEO 128 MiB/300s; timeout 30/120/600s; scratch 256 MiB, heap 256 MiB, watchdog RSS 768 MiB, logs 64 KiB/stream. Có case tại giới hạn và vượt giới hạn. Live cancel phải kiểm reap/partial outputs; intent cancel sai state phải bị từ chối. Pure accounting không chứng minh hard memory limit hoặc native containment.

**Oracle và contracts**

Oracle tự tính SHA-256 từ bytes, canonical JSON từ golden vectors, inventory, byte totals và các private sentinels tổng hợp. Không gọi production hash/validator để tạo expected result.

Digest v3, rights-proof keys, error codes, lease/quota receipts và exporter flags giữ `BLOCKED_CONTRACT` đến khi owner chốt exact contract. Không tự dựng schema v3 rồi báo PASS. Native sanitized output cần structural inspection và decode thực; privacy cần inventory/bytes/DOM/network checks, không chỉ regex.

Trước tích hợp, Coordinator phải nhận source/contract freeze và evidence từ modules upload, processors, rights, v3 editor, preview và exporter. IMAGE read-only candidate và PDF standalone processor chưa cung cấp toàn bộ prerequisites đó.

**Desktop/mobile/keyboard và runbook**

Matrix browser dự kiến có Chromium 390/768/1440; edge states 320/1920. Kiểm focus trap/restore, Tab/Shift+Tab/Escape, pagination, PDF Previous/Next, video controls, tên tiếng Việt dài, progress/error/conflict và thao tác còn reachable khi viewport hẹp. Safari/thiết bị thật giữ `NOT_RUN` nếu chưa kiểm.

Runbook dự thảo có trình tự:

1. Xác minh authority, source/tools, profile và process ownership.
2. Thu preservation trước chạy; không reset/import/reseed retained data.
3. Chứng minh một flow thật tối thiểu, rồi mở rộng matrix.
4. Khi mismatch hoặc ownership Unknown, giữ failed attempt và dừng phần phụ thuộc.
5. Cache recovery chỉ theo immutable manifest và quyền đã giao; không fallback original, replay consumed admission hoặc đổi pins.
6. Thu preservation sau chạy; chỉ xử lý processes/scratch thuộc ownership được phép.

Preservation phải tách delta đã Approved của IMAGE/PDF khỏi protected baseline/history. So sánh source/disk và mười collections M1/M2 là evidence có phạm vi, không phải snapshot nguyên tử hoặc full backup/restore M4.

**Checks, side effects và giới hạn của proposal này**

Sau Approved, chỉ chạy syntax, focused ESLint không `--fix`, và Node tests của oracle bằng cached Node 22.23.3. Dùng fixture tổng hợp; không Firebase SDK, sockets, native decoder, browser, install hoặc dependency audit.

Evidence append-only tại:

`/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/pinky-lamb-cms/.local/test-outputs/m3/parallel-qa-01/<run-id>/`

Giới hạn đề xuất: một runner, test concurrency 1, Node heap 256 MiB, mỗi command tối đa 60 giây; fixture ≤1 MiB, evidence tổng ≤10 MiB. Không lưu token/password/raw private payload. Native/emulator/browser nặng sau này phải được xếp một slot riêng với IMAGE/PDF.

**Acceptance của nhánh chuẩn bị**

- AC01–18 đều có case/check/dependency và loại evidence phù hợp.
- Oracle phát hiện golden-vector tamper; các contracts chưa có vẫn báo blocked.
- Năm file và evidence không chồng ownership; applicable pure checks và source review đạt.
- Bàn giao trạng thái `QA_PREPARATION_READY`; không đánh dấu CMS-M3-34–38 hoàn tất hoặc M3 Accepted.

**Lời Approved cho đúng phạm vi**

> Approved M3-PARALLEL-QA-01 v1 — QA preparation local/source-only. Cho phép 5 file mới, fixtures tổng hợp và focused pure checks trong namespace riêng; không native/emulator/browser, QA tích hợp hoặc shared-state writes.

Cần Approved trước phần execution vì assignment hiện tại chỉ cấp planning/read-only, và [team policy](/Users/khiemnguyen/Works/pinky-lamb/pinky-lamb/docs/agent-kit/team-policy.md:7) quy định: “Planning allows read-only investigation and in-chat proposals.” Proposal trong chat đã hoàn tất; QA tích hợp cần phạm vi runtime riêng sau khi modules/contracts sẵn sàng.




