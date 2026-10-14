# M3-PARALLEL-VIDEO-01 v1 — SOURCE/PURE

**Current — VIDEO job application handoff:** dedicated `cms-api/media-video-job.mjs` có `processVideoJob({request,tuple,frozenInput,toolSetManifest})`, generation-free result mapping và canonical recipe producer. SOURCE Written/textually reviewed only; tests/runtime **NOT_RUN**, native **HOLD**. Upload/common dispatcher và C0-owned canonical source-pin update còn lại; các handoffs bên dưới giữ chronology của snapshot riêng.

**Current — APPLICATION_A_APPROVED / M3-FAST-CODE-HANDOFF-01:** đã bỏ `rightsApproval` khỏi VIDEO candidate, receipt và runtime emitter; field obsolete được từ chối như unknown key. Chỉ SOURCE edits và textual readback; tests/runtime/native **NOT_RUN**, native **HOLD**. Các sections/queue/test commands phía dưới là lịch sử snapshot, không phải chỉ dẫn chạy hiện hành. Mandate mới không chạy tests, diagnostics hoặc controller recovery. Handoff hiện hành ở cuối tài liệu.

**Current — VIDEO-H2-CONSUMER-01-SOURCE v1:** exact source delta/three syntax checks/focused lint PASS; actual High **PASS_SOURCE_CONTROL_ONLY**, Required0/Optional0. Future ONE pure30 **QUEUED/NOT_RUN — NO_ADMISSION**. Canonical H2 promoted/15purePASS là Coordinator-recorded evidence, không live verifier proof của VIDEO. **Historical H0:** source High PASS_SOURCE_ONLY, Pool05 **27/27 PASS** và old18PASS freeze2 áp dụng đúng old snapshots trong immutable receipts. New H2 source không kế thừa behavioral PASS. Fixture NOOP. Không active/pending runner hoặc automatic dispatch; native/live verifier **NOT_RUN/HOLD**, full7 `processingRecipe` producer **UNASSIGNED**, OS-wide custody **Unknown**. Không shared/source4/integration writes từ closeout.

**Authority:** Coordinator Approved `SOURCE_PURE_APPROVED_NATIVE_HOLD` theo `approvals/M3-PARALLEL-COORDINATION-01-REGISTER.json`, dưới ủy quyền trực tiếp của Khiêm về approval/scheduling các nhánh M3. Đây là **COORDINATOR_APPROVED_UNDER_DIRECT_HUMAN_DELEGATION**, không phải individual VIDEO direct-human Approved. Frozen proposal: `docs/M3-PARALLEL-COORDINATION-01.md`, SHA256 `69db3eceaee253c42c09740de4ecbe38fd620d8a02c27091d77defc106c9d8a2`.

**Observed route:** child thread `01a13605-28a3-7310-9c19-ff3b5aff34f1`, exact turn `01a13605-28ec-7123-9068-6f90b69eb45b`, runtime `turn_context` tại `2026-10-13T16:07:52.907Z` ghi model `gpt-6.1-sol`, effort `medium`, collaboration setting `reasoning_effort:medium`. Quan sát trước application source writes; Coordinator đã nhận. Đây là metadata runtime quan sát, không phải suy từ TOML. Model/task/approval identity không làm điều kiện application runtime.

## Interface và ranh giới

`processVideo({input, expectedSha256, attemptDirectory, signal?})` từ chối unknown keys, URLs, caller argv/tools/caps. Original `.mp4` và attempt cùng một private run dưới `.local/media-scratch/m3/parallel-video-01/<run>/`; attempt mới bằng exclusive `mkdir`, không reuse/overwrite. Original regular/nonlink/single-link, owner và permissions private; SHA và stat custody trước/sau. Final records kiểm namespace, attempt identity và từng ancestor identity. `manifest.json` chỉ xuất sau decode/hash/custody/full-tool/worker reap gates. Failed/cancel giữ attempt/partials/receipt; không xuất success manifest.

Manifest chỉ private processor evidence: original, recipe/tool/source hashes, native metadata, `safe.mp4`, `poster.webp` role `POSTER`, decode/reap evidence. `rightsApproval:false`, `ready:false`. V3/upload/rights/Storage/API/UI normalization thuộc integration riêng.

## Recipe source đã viết

1. **Historical H0 recipe gate:** full immutable `verifyMediaTools` trước worker spawn, trong guarded worker trước native loads, trước Sharp và tại completion; H0 không per-kind narrowing, không bỏ PDF closure. `TOOL_BYTES` vẫn lỗi/HOLD trong receipts H0. **Current H2 amendment** ở cuối tài liệu thay fixed source calls bằng VIDEO/COMMON closure sau explicit Coordinator source approval; không sửa history/defaultALL/PDF checks.
2. Immutable MOV reference validator + H264/AAC metadata validator; fixed file-only protocol whitelist, drefs/absolute references disabled; full input decode với strict errors.
3. H264 VideoToolbox `allow_sw:0`, `require_sw:0`; không remux/software fallback. AAC optional, 96 kbit/s, 48 kHz, stereo. Global/stream metadata và chapters mappings disabled. Scale không upscale; 1280×720/30fps tối đa; hai codec/filter threads.
4. Full output probe/decode. Poster lấy từ safe video qua PNG decoder đã pin, sau đó Sharp raw RGBA/sRGB → WebP quality80; full WebP raw decode. Không dùng FFmpeg libwebp vì frozen closure không có encoder đó. Chỉ xóa `poster.png` do worker sở hữu sau khi giữ SHA/pixel evidence và kiểm inode/custody; original/history/unknown files không xóa.
5. Recipe dùng logical relative file names; absolute native argv chỉ nằm trong private observations. Recipe identity gồm source hashes, full lock SHA, binary pins và Sharp version.

Metadata input không hỗ trợ attached artwork/extra streams hoặc Display Matrix rotation; geometry không được tự xoay. CPB properties là structural side data được phép. Output không giữ descriptive tags/chapters/side data ngoài CPB; muxer structural tags (`major_brand`, `minor_version`, `compatible_brands`, `encoder`, `language`, `handler_name`, `vendor_id`) được phép. Real metadata behavior vẫn Unknown.

Duration rounding giới hạn một output video frame cộng một AAC frame (1024/48000 s) khi có audio. Output vẫn phải ≤300 s tuyệt đối; input đúng300 s có thể fail closed nếu encoder/muxer làm vượt300 s. Không có tolerance tăng duration cap. Native boundary behavior chưa kiểm chứng.

## Caps và kiểm soát

Input ≤128 MiB/300 s/1920×1080/60fps; output MP4 ≤48 MiB/1280×720/30fps, poster ≤1 MiB. Deadline aggregate600 s; worker heap256 MiB; sampled whole worker-tree RSS768 MiB; attempt scratch256 MiB; stdout/stderr64 KiB mỗi stream. Native commands nằm trong worker group; outer watchdog tổng hợp worker/native descendants. Trước spawn kiểm lại cancel/deadline sau process snapshot. Signals chỉ tới identity đã quan sát; process observation failure giữ control Unknown và không signal identity/group chưa biết. Watchdog best effort, không phải OS hard containment. Original retained bên ngoài working attempt; run retention cap512 MiB cần Coordinator kiểm tại admission/fixture run.

## Verification

Từ CMS root, pinned Node `.local/cache/node/node-v22.23.3-darwin-arm64/bin/node`:

- `--max-old-space-size=256 --check cms-api/media-video.mjs` — exit0 (increment đầu và sau routine repairs).
- `--max-old-space-size=256 --check cms-api/media-video-runtime.mjs` — exit0 trước PNG repair; final recheck ghi private receipt.
- `--max-old-space-size=256 --check tests/fixtures/media-video.mjs` — exit0.
- `--max-old-space-size=256 --check tests/media-video.test.mjs` — exit0 trước boundary additions; final recheck ghi private receipt.
- `--max-old-space-size=256 node_modules/eslint/bin/eslint.js cms-api/media-video.mjs cms-api/media-video-runtime.mjs tests/fixtures/media-video.mjs tests/media-video.test.mjs` — exit0 trước final repairs; final recheck ghi private receipt. Không `--fix`.

**Tests QUEUED:** selectors `^pure VIDEO:` gồm request/caps/MP4 references/hash/custody/ancestry/golden candidate/tamper/pre-aborted refusal/import API. Golden recipe SHA dùng Python hashlib từ literal JSON, độc lập `videoSha`. Import test chỉ xác minh module API khi được chạy; không phải oracle chứng minh toàn bộ filesystem/process inertness.

**Native NOT_RUN:** `^native VIDEO:` có audio/silent và retained boundary fixtures; fixtures không tự tạo trên import, không automatic hooks. Các fixtures nằm cố định trong owned `native-fixtures` run và cần approval/admission riêng trước tạo/chạy. Live cancel/tamper/timeout/RSS/log/scratch crossing và end-to-end preservation chưa có native evidence; chưa thể đóng acceptance. Full verifier live invocation trong slice này NOT_RUN vì native/tool audit chưa được admitted; gate source vẫn bắt buộc.

**Unknown:** VideoToolbox availability, fixed argv compatibility, output timing/metadata, native fixture corpus, real process-tree reap/memory containment, independent output oracle và integrated M3 acceptance. Static exit0 không chứng minh processor hoạt động.

**Next:** Coordinator cấp pure slot; chạy đúng selector dưới heap256 MiB, sau đó reviewer High review source/evidence. Native tiếp tục HOLD_TOOL_BYTES đến tool recovery approval, verifier nguyên trạng PASS và heavy-slot admission. `CMS-M3-15` chưa hoàn thành; M3/LOCAL_COMPLETE/production không được thay đổi bởi slice này.

## Source repair sau High review — freeze 2

**Verified:** independent High review freeze1 là `HOLD_SOURCE_ONLY`, sáu Required; không phải native finding. Reviewer route được Coordinator báo: actual High turn `01a1360e-fe5e-7b40-895e-6c2af7ca0927`, timestamp `2026-10-13T16:18:36.953Z`; five hashes match freeze1. Không có saved review file; full verdict chuyển qua Coordinator mailbox. Receipt freeze1 giữ nguyên. Resumed implementer runtime turn `01a13612-93a3-7522-bee1-eb74e29dead5` tại `2026-10-13T16:22:29.578Z` ghi `gpt-6.1-sol / medium`, quan sát trước repairs.

**Written, reviewPending:** sáu corrections trong cùng năm files:

1. Mọi FFprobe/FFmpeg ingress cố định `threads:2`, `format_whitelist:mov`, `codec_whitelist:h264,aac`, `-f mov`, protocol/dref controls; fixture-only decoders không được phép trước metadata rejection.
2. Original/outputs đúng0600, owned scratch root và descendants đúng0700, cùng uid, không group/world access hoặc special permission bits. Shared `.local/media-scratch` và `m3` được stat tại repair:0700; chưa có namespace `parallel-video-01`. Không chmod original/shared ancestors. Namespace chưa có sẽ do riêng admitted run setup tạo đúng mode.
3. Candidate version1 và toàn bộ nested keys/types/caps bị strict validation. Complete fixed arrays, poster encoding, Sharp version và tool pins được kiểm semantic; unknown/missing keys, version/argv tamper với recomputed digest vẫn từ chối. Golden vector đã thêm đầy đủ fields; digest vẫn độc lập Python hashlib.
4. Finalization ghi exclusive private `*.pending`, kiểm sau async write/close/ancestor/stat awaits. Guard signal/deadline chạy ngay trước synchronous exclusive `linkSync` commit; không overwrite hoặc event-loop gap trước visibility. Đây là linearization point: cancel đã quan sát trước commit từ chối; cancel đến sau commit không thu hồi success. Pending record được giữ khi fail/cancel. Receipt success-stage dùng `PROCESSING_VALIDATED`, không phải final manifest acceptance. Chỉ known owned pending link được unlink synchronous sau commit. Pure tests mô phỏng guards sau receipt/custody/write/close; chưa phải real filesystem oracle.
5. Privacy kiểm cả key và generated structural values. Brand strings chỉ fixed muxer values; encoder chỉ `Lavf63.1.102` hoặc `Lavc63.1.102 h264_videotoolbox`/`Lavc63.1.102 aac`; language`und`, handler`VideoHandler`/`SoundHandler`, vendor`[0][0][0][0]`. Recipe gán handler/language cố định. Version63.1.102 đối chiếu read-only local source `libavformat/version*.h` và `libavcodec/version*.h` của9.0.2; đó là source evidence, không native output observation. Marker ở mọi allowed key bị từ chối theo tests authored. Giá trị muxer thực tế nếu khác sẽ fail closed; native compatibility Unknown.
6. Observed descendant identities được giữ theo PID/start và ancestry khi đổi PGID/reparent. RSS/reap dùng toàn bộ identities đã quan sát, không chỉ PGID. Signals chỉ từng PID/start sau fresh snapshot; không whole-group signal, không fallback khi snapshot unavailable. Unknown PID generation/group member làm refusal. Tests authored cho migration, reparent, RSS, reusedPID và unknowngroup.

**Unknown / limits:** observation sampling50 ms có thể bỏ lỡ process spawn→escape→reparent giữa snapshots; `ps lstart` có độ phân giải seconds, không phải kernel generation handle. Không tuyên bố hard OS containment hoặc tất cả unseen descendants đã được chứng minh. Finalization guard simulations không chứng minh OS atomic/link/custody runtime. Freeze2 chỉ source/static evidence; pure **QUEUED**, native/full verifier **NOT_RUN_HOLD_TOOL_BYTES**, re-review **PENDING** đến Coordinator nhận verdict mới.

## Current pure batch — M3-PURE-POOL-02

**Verified:** Coordinator cấp một focused pure runner; register ghi VIDEO `ADMITTED_ONE_PURE_RUNNER` và current slot chứa chat `01a135ee-7c15-7183-90b4-100fe389bf0a`. Actual implementer turn `01a1361b-c519-7e81-b5e4-c515f6adbb7e`, timestamp `2026-10-13T16:32:32.072Z`, ghi `gpt-6.1-sol / medium` trước writes/tests.

Đã chạy đúng một command từ CMS root:

```sh
.local/cache/node/node-v22.23.3-darwin-arm64/bin/node --max-old-space-size=256 --test --test-concurrency=1 --test-name-pattern='^pure VIDEO:' tests/media-video.test.mjs
```

**Result:** exit0, tests18/pass18/fail0/cancelled0/skipped0; TAP duration66.381458 ms. Owned runner wall0.104197 s, bound60 s, stdout/stderr cap64 KiB mỗi stream. stdout4092 bytes, stderr0 bytes; authoritative byte counts trong receipt. No cap crossing. Runner được `wait` kết thúc, không pending owned runner. **Own slot RELEASED**, không sửa shared register và không automatic next dispatch. Bốn MJS source không đổi sau freeze2; chỉ task doc thêm current result/ACK này.

Evidence additive: `.local/test-outputs/m3/parallel-video-01/20261013T163336Z-pure-a17896b5-0ecd-409d-8421-a6c6a25d6cb9/pure-run.json`, `stdout.log`, `stderr.log`, `batch-summary.json`. Before/after runner pin của năm owned files + shared helper + lock đều bằng nhau. Shared audit SHA `56d122ed0226c371a72e5048996508024e133a2b09e8d05b7e5e5f6b987fc2fc`; lock SHA `2c049b8684ba07916855f009b1a52af77650a118e96090fadc45453f4eb18081`. Initial preimplementation RED **NOT_RUN** vì queued; không dựng RED history.

**ACK — conditional tool recovery:** VIDEO không sở hữu `scripts/media-tool-audit.mjs`, PDF source hoặc tool pins. Shared audit phải giữ SHA trên trong IMAGE/VIDEO batches hiện hành. PDF/tool owner chỉ nhận shared writes sau Coordinator conditions và consumer ACK/review. VIDEO chỉ chấp nhận delta sau explicit Coordinator approved affected-consumer revision/review; không refresh/rewrite receipt cũ để báo preservation.

**Unknown / NOT_RUN:** pure tests xác minh schema/metadata/hash/request/custody models, pre-aborted refusal, finalization guard simulations và observed-process accounting. Không chứng minh filesystem finalization, native decoding, actual OS process cleanup/RSS hoặc hardware behavior. Native selectors không được thực thi; không fixture generation/full verifier/tool repair. Native giữ **NOT_RUN_HOLD_TOOL_BYTES**, High re-review **PENDING**, processor/M3 acceptance chưa hoàn thành. Không source repair hoặc runner tiếp theo được dispatch sau release.

## Freeze3 — publisher corrections, filesystem tests QUEUED

**Verified:** 18PASS và slot RELEASED phía trên thuộc **freeze2**. Chúng không chứng minh publisher freeze3. Coordinator giao hai Required publisher defects từ High delta review: link thành công rồi pending unlink lỗi tạo reject/2links; empty pre-write stat không bảo vệ pending content/mode. Đây là source findings; native occurrence Unknown. Historical freezes/pure receipt giữ nguyên. Actual implementer resumed turn `01a1361e-b324-7a23-9e16-4394daed7acb`, timestamp `2026-10-13T16:35:44.082Z`, ghi `gpt-6.1-sol / medium` trước source writes.

**Written / reviewPending:** publisher giữ stable O_RDWR/nonfollow descriptor từ private exclusive pending creation đến sau commit. Post-write custody gồm ino/dev/size/uid/mode/mtime/ctime; expected byte count/SHA và0600, single regular file, private ancestor identities được kiểm synchronous ngay trước publication. Hash đọc trực tiếp qua descriptor; path inode phải bằng descriptor inode. Link/cleanup thay ctime có expected custody mới; full content/mode/single-link được kiểm lại sau đó.

Commit protocol:

1. Async write/post-write stat/private ancestry checks; synchronous final ancestry/content/custody/signal/deadline guards.
2. Exclusive hard-link pending→final, rồi unlink đúng pending do publisher sở hữu. Sau full final descriptor/path/content validation với nlink1, artifact mới **COMMITTED**. Không asynchronous event-loop gap trong commit syscalls.
3. Nếu pending unlink/final validation lỗi trước COMMITTED, kiểm inode ownership và rollback final link. Nếu cần, tạo lại owned pending link trước rollback để giữ partial/evidence. Final không còn khi rollback thành công; error `VIDEO_PUBLICATION_ABORTED`, pending retained. Không xóa original/history/shared data.
4. Nếu OS hoặc custody failure ngăn verified rollback, error `VIDEO_PUBLICATION_UNKNOWN` có explicit publication state UNKNOWN; không báo FAILED/accepted hoặc giả vờ final đã xóa. Artifact có thể còn, cần Coordinator xử lý preservation/recovery riêng. Đây là fail-closed disclosure, không quyền cleanup unknown files.
5. Sau COMMITTED/single-link validation, descriptor close là housekeeping. Close error không đổi successful publication thành FAILED; return `publication.housekeeping` state UNKNOWN. `processVideo` trả publication observation kèm private manifest. Nó không cấp rights/READY hoặc production acceptance.

**Tests authored, execution QUEUED:** tests dùng real Node filesystem với tiny synthetic records dưới `.local/media-scratch/m3/parallel-video-01/pure-record-<UUID>/attempt`. Fixture creation chỉ xảy ra bên trong admitted matching tests, không trên import. Tests kiểm exact bytes/hash/single-link/0600, exclusive commit/no overwrite, pending cleanup fault→rollback giữ evidence, postcommit close fault→housekeeping, same-inode append/overwrite/chmod tamper, cancel/deadline sau pending write. Mock faults chỉ ảnh hưởng file/descriptor mới do test sở hữu. Chmod chỉ new synthetic tamper record; không chmod original/shared directories. Không media generation/FFprobe/Sharp/verifier/native operations.

**Unknown / limits:** real filesystem tests mới chưa chạy; source correction không chứng minh behavior. Current pure slot vẫn RELEASED, không runner mới hoặc auto-dispatch. Coordinator phải cấp admission mới. Kernel/syscall failure hoặc mutation ngoài process có thể làm publication custody Unknown; không tuyên bố hard OS containment hoặc chắc chắn physical rollback khi OS từ chối. Native/tool helper pins/holds giữ nguyên. Freeze3 review và tests **PENDING/QUEUED**, M3/LOCAL_COMPLETE acceptance chưa đạt.

## Historical H0 source review — freeze3 PASS_SOURCE_ONLY

**Verified:** High reviewer exact turn `01a13626-e0c0-7d23-bf52-7891f8afccd2`, timestamp `2026-10-13T16:44:40.045Z`, model `gpt-6.1-sol / high`, verdict **PASS_SOURCE_ONLY**, Required0. Receipt `.local/test-outputs/m3/parallel-video-01/review-high-20261013T164440Z-01a13626/freeze3-review.json`, SHA256 `849614fcf321668e4980e29e976237d45862d940eb6047487f50cd10a0291893`. Receipt hash và bốn MJS source hashes đã đối chiếu trước doc-only update:

| Reviewed source | SHA256 |
|---|---|
| `cms-api/media-video.mjs` | `c8f574a628ed2b096b3872a7ea51635e9a74fc6718e259adaaaf6af22e273981` |
| `cms-api/media-video-runtime.mjs` | `c41c498f8e0346fb3cd6c973dc06bd75413972564e031ebbb0dfb0b769a2e6ae` |
| `tests/fixtures/media-video.mjs` | `2a8fafe4749c69c189240107d445808bb51e65e64669402c7308449dd77b1e2a` |
| `tests/media-video.test.mjs` | `21065277e2320e20013e8cf088a09d0cf1642d395812c06564bd932e0dae4ce8` |

**Clarification:** `VIDEO_PUBLICATION_UNKNOWN` không có nghĩa mọi artifact đều unreadable. Optional case chưa viết/chạy: final validation lỗi sau khi pending đã unlink, rồi recreation pending link bị từ chối; final có thể còn nlink1 và đọc được. **Mọi Unknown phải bị từ chối dựa vào processor outcome**, không dùng readability hoặc nlink1 để suy acceptance. Artifact phải được giữ và giải quyết bằng preservation/recovery được Coordinator cấp quyền riêng. Existing double-unlink fault test chỉ chứng minh scenario nlink2 theo fixture đó khi được chạy; không chứng minh tất cả Unknown outcomes.

**Historical H0 read-only ACK — ToolRecovery A:** tại thời điểm ACK, VIDEO source không có caller scope: mọi `verifyMediaTools()` call vẫn chạy full default ALL. Proposed A phải giữ defaultALL/PDF fail closed, fixed server/tool operation→scope allowlist, unknown operation/scope-recipe mismatch từ chối trước load/spawn. Logical VIDEO pipeline cần FFmpeg/FFprobe cùng Node/package/Sharp/POSTER closure; không được chọn labelVIDEO rồi bỏ Sharp dependencies. Caller không được truyền verificationScope/argv để thu hẹp closure. Exact future operation identifiers và helper digest chưa có frozen source trong review này; ACK này xác nhận requirements/current compatibility boundary tại H0, không xác nhận implementation tương lai. VIDEO không sở hữu shared audit/PDF files và chỉ chấp nhận actual helper delta sau explicit Coordinator decision, frozen revision và affected High consumer review. Old pins/receipts giữ nguyên.

**Current limits:** bốn reviewed MJS không đổi; doc này chỉ thêm reviewed result và factual Unknown clarification/ACK. Actual doc-update turn `01a1362b-8cdc-78f1-8128-3c036073b1a5`, timestamp `2026-10-13T16:49:46.254Z`, ghi `gpt-6.1-sol / medium`. Freeze3 filesystem tests **QUEUED**; old18PASS thuộcfreeze2. Slot **RELEASED**, không active runner/native hoặc automatic dispatch. Native/full verifier **NOT_RUN_HOLD_TOOL_BYTES**. PASS_SOURCE_ONLY không phải test PASS, native admission, M3 acceptance hoặc LOCAL_COMPLETE.

## Next VIDEO batch — QUEUED under M3-PURE-POOL-03

**Verified current authorization:** register ghi VIDEO `RELEASED_18PURE_PENDING_NEW_PUBLICATION_TEST_ADMISSION`; Pool03 current slots chỉ IMAGE finalization và Recovery A. Lượt này chỉ DOC/EVIDENCE, không source changes/tests/syntax/lint/native/runner. Actual doc writer turn `01a13634-fad7-7731-b083-fe52fccdb461`, timestamp `2026-10-13T17:00:04.223Z`, ghi `gpt-6.1-sol / medium`, trước doc write. High freeze3 receipt/hash và bốn source hashes trong current review section vẫn là relevant source-only evidence.

**Proposed command cho admission mới**, từ CMS root; chưa được chạy lại:

```sh
.local/cache/node/node-v22.23.3-darwin-arm64/bin/node --max-old-space-size=256 --test --test-concurrency=1 --test-name-pattern='^pure VIDEO:' tests/media-video.test.mjs
```

Expected selection:18 memory/metadata/request/hash/custody/guard/accounting tests trước +9 newly authored tiny filesystem publisher cases =27. **Actual counts cho freeze3: NOT_RUN**, không suy PASS từ expected selection hoặc old18 PASS. Một runner; concurrency1; heap256 MiB; wall bound60 s/command; stdout/stderr captured tối đa64 KiB mỗi stream, không secrets env, không automatic dispatch sau release.

Chỉ tạo newly owned synthetic directories0700/records0600 dưới VIDEO scratch `parallel-video-01/pure-record-<UUID>/attempt` và fresh own evidence folder. Tamper-mode fault chỉ chmod synthetic record do test mới tạo; không chmod original/shared/history. Original proposal caps vẫn áp dụng: attempt scratch256 MiB, retained fixtures/candidates≤512 MiB/run, logs64 KiB/stream; tiny fixture batch không mở rộng native/process API authority và không chứng minh native memory/decoder/reap behavior. Giữ raw logs, failure/UNKNOWN artifacts, custody và receipts; không xóa old evidence/originals hoặc fixtures lịch sử.

Admission/preflight phải pin current four sources, helper và lock **trước/sau** runner; fresh UID/dev/inode/single regular/no-links custody và private synthetic ancestry checks. Current helper snapshot SHA `56d122ed0226c371a72e5048996508024e133a2b09e8d05b7e5e5f6b987fc2fc`; lock `2c049b8684ba07916855f009b1a52af77650a118e96090fadc45453f4eb18081`. DOC/EVIDENCE lần này chỉ capture preservation/custody, không chạy Node hoặc verifier. Future actual runner phải có fresh captures riêng; snapshot hôm nay không chứng minh future custody.

**API impact:** `processVideo` fixed request/private output contract giữ nguyên. Final publication observation phân biệt single-link **COMMITTED**, verified **ROLLED_BACK** (`VIDEO_PUBLICATION_ABORTED`) và `VIDEO_PUBLICATION_UNKNOWN`. Artifact existence/readability không cấp READY; mọi UNKNOWN bị từ chối theo processor outcome, chỉ recovery/preservation authority riêng được giải quyết. Postcommit descriptor-close housekeeping không đổi committed publication thành ordinary failure. Mọi manifest vẫn private, không rights approval/READY.

**Helper promotion boundary:** Pool03 giữ canonical helper promotion đến khi IMAGE finalization batch hoàn tất và Coordinator quyết định promotion gắn exact new helper SHA. Không automatic exception hoặc refresh old receipts. New VIDEO admission phải nêu current helper snapshot. Nếu SHA đã đổi, cần recorded approved delta và affected compatibility review **trước dependent runner**, giữ old histories/pins. VIDEO không sửa shared helper/PDF files, không tự đổi call mapping hoặc bypass defaultALL. Next owner: Coordinator admission/review; VIDEO **QUEUED / no active runner**.

## Historical H0 Pool05 result — freeze3 27PASS / slot RELEASED

**Authority/route Verified:** register trước runner ghi `ADMITTED_FREEZE3_PUBLICATION_PURE_H0`, VIDEO trong current slot list. Actual implementer turn `01a13653-3149-7a41-a429-da47c1836dd8` tại `2026-10-13T17:33:04.242Z` ghi `gpt-6.1-sol / medium` trước test/evidence writes. High relevant receipt SHA `849614fcf321668e4980e29e976237d45862d940eb6047487f50cd10a0291893` và source4 matched trước command. Không sửa source4, không syntax/lint/extra runner.

Exact command từ CMS root:

```sh
.local/cache/node/node-v22.23.3-darwin-arm64/bin/node --max-old-space-size=256 --test --test-concurrency=1 --test-name-pattern='^pure VIDEO:' tests/media-video.test.mjs
```

**Actual:** one runner, exit0; tests27/pass27/fail0/cancelled0/skipped0/todo0. TAP duration79.827959 ms, wall0.115246875 s dưới hard60 s; stdout6173 bytes/stderr0, capture64 KiB mỗi stream, không cap crossing. Heap256 MiB/concurrency1. PID39226: `wait` completed, direct child reaped, stdout/stderr EOF, capture pipes closed. Own slot **RELEASED** đã báo Coordinator trước doc update/review. Không active/pending owned runner, không rerun/automatic dispatch. OS-wide process tree custody **Unknown**, không có global process observation hoặc native lifecycle proof.

Evidence additive: `.local/test-outputs/m3/parallel-video-01/20261013T173432Z-pool05-8638c601-19ca-482c-a9b3-3dc9e1d09042/` gồm `before.json`, `pure-run.json`, raw `stdout.log`, `stderr.log`, `handoff.json`. Run receipt SHA `43d419144e374019721711cbe25e3adf03017426c6e8cff63c616f427524e952`; parent đã independently đọc receipt/raw TAP và kiểm counts/caps/custody/source pins. Historical source freezes/pure/review records không rewrite; source4/hash/custody hiện hành trong run receipt. Before/after source4/helperH0/lock SHA, UID/dev/inode/nlink/mode/mtime/ctime bằng nhau, path ancestry no-links. H0 SHA `56d122ed0226c371a72e5048996508024e133a2b09e8d05b7e5e5f6b987fc2fc`; lock SHA `2c049b8684ba07916855f009b1a52af77650a118e96090fadc45453f4eb18081`. Những pins này mô tả đúng reader batch H0; không dùng chúng để rebaseline future H2 promotion.

Retained newly owned tiny synthetic fixtures:29 entries,627 bytes conservative accounting tính cả hai hardlinks, directories0700. Record creation0600; negative fault states cố ý giữ một mode0644 tamper và hai paths cùng inode/nlink2 cho rollback Unknown. Không chmod/cleanup chúng để làm preservation xanh. Fresh UID/dev/inode/nlink/mode/SHA/no-symlink custody của từng entry trong receipt; không media files hoặc native fixtures được tạo. Total thấp hơn scratch256 MiB/retention512 MiB; raw failure/Unknown branches giữ evidence. Không sửa/delete original, shared ancestors hoặc old receipts.

**Verified scope:**27 tests chứng minh pure schema/caps/refusal models và actual Node filesystem publisher cases được chọn: exact exclusive single-link content, owned pending cleanup rollback, postcommit close housekeeping, Unknown rollback refusal, same-inode append/overwrite/mode tamper, cancel/deadline sau pending write. Không native decoding/FFprobe/Sharp/verifier hoặc real process control được thực thi. Optional readable single-link Unknown case vẫn chưa có execution coverage; **every UNKNOWN bị từ chối theo processor outcome**, readability/existence không acceptance/READY. Recovery/preservation cần authority riêng.

**Next/Unknown:** H0 VIDEO reader batch hoàn tất; Coordinator quyết định lịch/review/helperH2 sau khi cả hai H0 batches hoàn tất. Không helper/PDF ownership hoặc promotion từ VIDEO. H2-dependent use vẫn cần explicit approved delta/affected review/current snapshot admission; native **HOLD**. PASS27 không đóng `CMS-M3-15`, M3 acceptance hoặc LOCAL_COMPLETE.

## Current amendment — VIDEO-H2-CONSUMER-01-SOURCE v1

**Authority/route Verified:** current register record `VIDEO-H2-CONSUMER-01-SOURCE`, version1, `COORDINATOR_APPROVED_SOURCE_STATIC_ONLY`, human-delegated Coordinator approval. Exact implementer turn `01a136b1-4ea6-7883-bac0-0275cd1a2ec0` tại `2026-10-13T19:15:52.155Z` ghi `gpt-6.1-sol / medium` trước writes/static. Before pins của processor/runtime/fixture/tests/doc khớp record; fresh UID/dev/inode/nlink/mode/no-links custody được capture trong private evidence.

**Current H2 input:** canonical helper SHA `38f0bedc69b9e006cf1e9a16ac010061691c1b2ea8a74dffbd0d4b127ab4bd7d`,34537 bytes; lock giữ SHA `2c049b8684ba07916855f009b1a52af77650a118e96090fadc45453f4eb18081`. H2 promotion và15purePASS do Coordinator ghi nhận; VIDEO chỉ đọc/hash source, không gọi live verifier. Default `ALL` không đổi; `PDF/ALL` vẫn giữ full PDF drift refusal theo recovery records,12 originalPDFdylibs chưa được sửa/rebaseline. Current H2 source `VIDEO` kiểm COMMON Node/lock/package/exact-tree closure gồm Sharp/POSTER packages và FFmpeg/FFprobe/static-library pins, không PDF. H0 fullALL claim,27PASS/18PASS và chronological ACKs ở trên là history đúng source snapshot riêng, không bằng chứng liveH2.

**Exact Written delta:** processor hai calls và runtime bốn calls chuyển `verifyMediaTools()` → fixed literal `verifyMediaTools('VIDEO')`. Hai runtime comments đổi thành `Complete COMMON + VIDEO closure before worker load/spawn.` và `No FFmpeg or Sharp load before the pinned COMMON + VIDEO gate.` Source caller không nhận knobscope/operation; request guard implementation không đổi. Thêm đúng ba async pure tests: own enumerable `verificationScope:'VIDEO'`, `verificationScope:'PDF'`, `operation:'PDF'`; mỗi test assert validation throw và processing rejection `VIDEO_REQUEST` trước filesystem/verifier bằng existing request helper. Không helper/prototype scope tests hoặc graph mới.

**Preserved:** request/schema/order/argv/format-codec whitelists, recipe parameters/caps/publication/Unknown refusal/golden giữ nguyên. Fixture NOOP SHA `2a8fafe4749c69c189240107d445808bb51e65e64669402c7308449dd77b1e2a`. Runtime native recipe lấy processor/runtime source hashes thực tế mới qua existing hashing; không giả dùng sourceH0 digest. Full7 binding và `processingRecipe` producer **UNASSIGNED** trong integration hiện hành; không thêm schema fields hoặc tự gán canonical digest producer. Không shared helper/PDF/pin edits, history hoặc retained Unknown fixtures cleanup.

**Historical source-handoff static-only scope:** pinned Node heap256 MiB, từng syntax command cho ba changed MJS và focusedESLint đúng ba files, không `--fix`, bound60 s/command và64 KiB mỗi stdout/stderr. Actual commands/exits/source/input pins nằm trong additive static receipt. Static commands không chiếm pool test admission. Tests/live verifier/Sharp/FFmpeg/native/build/install/SDK/HTTP/emulator **NOT_RUN**; tại source handoff High affected source/control review **PENDING**. State lúc source handoff **SOURCE_STATIC_READY_FOR_HIGH**, không automatic runner ngay cả pool free. Current High verdict ở closeout section dưới đây.

**Actual static Verified:** three changed-file `--check` commands và focusedESLint đúng processor/runtime/tests đều exit0, stdout0/stderr0, không cap crossing. Wall times lần lượt0.025419542 s/0.025732958 s/0.024020250 s/0.281094667 s; each60 s bound. Exact source diff đối chiếu before text: chỉ6calls+2comments+3async request negatives, fixture NOOP. Evidence `.local/test-outputs/m3/parallel-video-01/20261013T191630Z-h2-source-b2073855-f4d1-4b4b-b3b5-9e0191bcfcb7/` giữ `before.json`, `source-delta.patch`, từng static command/log receipt và final `handoff.json`. No pending static child/test runner, không dispatch tiếp.

**Future pure — QUEUED**, chỉ sau Coordinator admission mới và affected High review, exactly one command từ CMS root:

```sh
.local/cache/node/node-v22.23.3-darwin-arm64/bin/node --max-old-space-size=256 --test --test-concurrency=1 --test-name-pattern='^pure VIDEO:' tests/media-video.test.mjs
```

Expected30 =old27+3 request negatives; actual counts30 **NOT_RUN**, old27PASS chỉH0. One runner/concurrency1/heap256 MiB/hard60 s/log64 KiB mỗi stream; private new0700 directories/0600 synthetic records dưới VIDEOscratch và fresh owned evidence. Scratch256 MiB/retained512 MiB proposal limits, source4/currentH2helper/lock hashes + UID/dev/inode/nlink/mode/no-links custody trước/sau, raw failure/Unknown/history retained. Không native/process API proof hoặc quyền promotion/integration từ static amendment này.

## Current factual closeout — High PASS_SOURCE_CONTROL_ONLY

**Verified:** actual High reviewer turn `01a136b5-c225-7dc1-8cf9-9c405fd25bf7`, timestamp `2026-10-13T19:20:43.864Z`, model `gpt-6.1-sol / high`; verdict **PASS_SOURCE_CONTROL_ONLY**, Required0/Optional0. Exact receipt `.local/test-outputs/m3/parallel-video-01/20261013T191630Z-h2-source-b2073855-f4d1-4b4b-b3b5-9e0191bcfcb7/reviews/high-source-control-d26be9f2-0d44-41f4-9209-ee5ff3fb5d05.json`, SHA `fefca95349fb992ff4f28df5be5bd1583e90e0ad9f22c9ecaf9c4322f33ce72a`. Review kiểm exact6calls/2comments/3tests/fixtureNOOP/current doc và future-pure controls; unchanged publisher/reap/native review reused. Không Required/Optional mới.

Trước closeout đã đối chiếu review receipt và current7 pins/custody. Exact reviewed doc SHA `67f6347df54cc24c9653180311a16476b2c8ee7d7a17c4de94973f035f87003f` được giữ **trước doc write** thành new private0600 `reviewed-doc-67f6347d.md` trong `.local/test-outputs/m3/parallel-video-01/20261013T192514Z-h2-review-closeout-e6a8b357-9570-4dd4-91fe-3ccc56e68bc0/`. New before/after doc receipt và handoff additive; không overwrite old receipt/doc snapshot/history. Source4/fixture/H2helper/lock full hashes và custody giữ nguyên; chỉ current factual index/closeout của owned doc đổi.

Actual doc/evidence writer turn `01a136b9-3315-7332-9dd4-b521b79ac2d0` tại `2026-10-13T19:24:29.383Z` ghi `gpt-6.1-sol / medium` trước writes. Closeout chỉ DOC/EVIDENCE; Node/static/tests/live verifier/Sharp/FFmpeg/native/shared writes **NOT_RUN**. Factual receipt reference không tạo source delta và không cần repeat High source review; reviewed code/control validity vẫn theo exact source4/H2/lock inputs, current doc snapshot change được attributed riêng.

**Next — ONE pure30 QUEUED/NO_ADMISSION:** dùng đúng command/limits/custody protocol ở future-pure section trên, chỉ sau Coordinator cấp admission mới. High source/control PASS không tự cấp runner dù pool free. Actual30 **NOT_RUN**; oldH0 27PASS/18PASS không biến thành H2 behavior proof. Không active/pending runner hoặc automatic dispatch; writer stop sau doc receipt handoff.

**Unknown / boundaries:** live verifier/native/hardware/parser/decoder/resource/reap behavior chưa kiểm; full7 `processingRecipe` producer **UNASSIGNED**, không new schema/canonical digest assignment. Mọi publication UNKNOWN bị từ chối theo processor outcome; artifact readability không rights/READY/acceptance. Native/live verifier **HOLD**, M3/LOCAL_COMPLETE chưa đóng bởi source/control closeout.

## Application handoff — remove obsolete rightsApproval

**Verified (source only):** Coordinator2 giao `APPLICATION_A_APPROVED` theo human mandate `M3-FAST-CODE-HANDOFF-01`. Actual writer `gpt-6.1-sol / medium`, turn `01a1387d-3f4b-7b20-85cf-23d0be977dfd`, timestamp `2026-10-14T03:38:14.767Z`. Processor bỏ field khỏi exact candidate keys và condition, receipt bỏ field; runtime candidate emitter bỏ field. Tests source dùng local cloned/projected candidate từ historical fixture và thêm assertions từ chối own `rightsApproval:false/true` bằng `VIDEO_MANIFEST`. Fixture và toàn bộ prior assertions/history giữ nguyên. Không tests, lint/check/build, interpreter/import/query/controller hoặc native invocation; source readback không chứng minh runtime PASS. Old D1 outputs, empty R2 directory và session drafts không đổi.

**Current contract:** `processVideo({input,expectedSha256,attemptDirectory,signal?})` không đổi, không caller-supplied knobs. Result vẫn `private:true`, `ready:false`, gồm original/recipe/output verification/native summary/runtime/publication; không có `rightsApproval`. Outputs là `safe.mp4` và `poster.webp`; receipt/manifest chỉ trong private owned attempt. Original custody/SHA, container/codec/metadata/decode, fixed H264 VideoToolbox/AAC/PNG→Sharp poster recipe, tool gates, publication/reap/Unknown checks giữ nguyên. Unknown outcome luôn bị từ chối; file tồn tại hoặc đọc được không tạo READY.

**Caps/cancellation unchanged:** input128 MiB/300 s/1920×1080/60 fps; output48 MiB/1280×720/30 fps không upscale, poster1 MiB. Pipeline600 s, threads2, heap256 MiB, best-effort whole-tree RSS768 MiB, scratch256 MiB, logs64 KiB mỗi stream. `signal` cancellation và deadline được kiểm trước native/final publication theo source hiện hành; không hứa hard OS containment hoặc native acceptance.

**Remaining / manual handoff:** job caller mapping và source-pinned canonical binding coordination chưa được tích hợp trong slice này; full7 `processingRecipe` producer vẫn **UNASSIGNED**, không gán digest giả. Khiêm có thể (1) đọc source delta bỏ field, (2) giao caller mapping dùng fixed request và phân biệt private processing/publication outcome với READY, (3) thực hiện user flow khi runtime scope được giao. Khoảng trống sản phẩm nhỏ nhất hiện còn là nối job caller với processor/result mapping đã xác định; thay đổi này chỉ bỏ obsolete field, không tự tạo uploader hoặc generation flow. Native **HOLD**, runtime **NOT_RUN**; các queue/test instructions cũ đã được supersede bởi mandate hiện hành.

## VIDEO job caller and canonical producer — source handoff

**Verified (source only):** actual `gpt-6.1-sol / medium`, turn `01a13883-0a79-7071-bb46-9159221641c5`, `2026-10-14T03:44:34.477Z`. New sole-owned `cms-api/media-video-job.mjs` captures closed own DATA for outer input/request, uses authority-v2 schemas for tuple/frozenInput, requires VIDEO/asset/hash agreement, validates R0 toolSetManifest and compares its canonical SHA before processing. Request/signal go unchanged to existing `processVideo`; original hash/bytes, validated candidate, actual runtime reaped/close/exit/no remaining PIDs and committed single-link publication are required. Processor/runtime Application A and all shared files/history remain unchanged.

**Result:** `contractRevision:2`, `private:true`, `ready:false`, tuple, original `{sizeBytes,sha256}`, originalMetadata `{width,height,duration,fps,audio}`, toolSetSha256, processingRecipe/processingRecipeSha256, outputs, verification/nativeSummary/runtime/publication. Outputs have `file/role/mimeType/sizeBytes/sha256/width/height`: `safe.mp4 / VIDEO / video/mp4` also has `durationSeconds`; `poster.webp / POSTER / image/webp` has no generation. Storage adapter uses the same sizeBytes/mimeType/sha256 names and allocates generation itself. No uploader, metadataDigest, derivativeSetSha256, Storage/cache/quiescence facts or READY envelope is invented.

**Canonical producer Written:** wrapper `{kind:'VIDEO',processorSha256,runtimeSha256,helperSha256,toolSetSha256,recipe}` uses actual processor recipe source hashes and runtime read/hash of fixed `scripts/media-tool-audit.mjs` before/after processing. `validateProcessingRecipe` receives `M3-VIDEO-R0-1`, originalMetadata and SHA256 of UTF8 canonicalMediaV2Json without newline. Wrapper digest must equal frozenInput.processingRecipeSha256; legacy inner recipeSha256 is never substituted. Helper drift, canonical/refusal/native/publication/cancel errors propagate with retained partials; no retry/cleanup. Job deadline600 s and original AbortSignal are checked around awaits and before return; core caps remain unchanged.

**Concrete shared-owner dependency:** `contracts/media-v3-toolset.mjs` still freezes VIDEO processor/runtime `98114ed3… / e26eee19…` in both `FROZEN.wrapperPins.VIDEO.{processorSha256,runtimeSha256}` and `FROZEN.videoRecipeNormative.recipeConstants.{processorSha256,runtimeSha256}`. Application A source pins reported by parent are now `7bc872e249f87d4cb1e8e2dd11d1c85b3322200a02b197e984cd451bc6341a19 / 5c4402a3e7d072b9c6cec6092d42a0ede045e3b591226c4abdc4575df6a3bfe0`. C0 owns that source correction; VIDEO does not modify it or bake either pin into the new caller. Current canonical recipe validation correctly refuses the mismatch. Canonical VIDEO producer is implemented here; full job/READY integration and full7 coordination are not established by this source handoff.

**Next / manual checks:** Khiêm can review the fixed input/result shape; Upload owner connects its authorized claimed tuple/frozen input/private original to this export, then maps retained output bytes to its private Storage writeDerivative interface and produces its own generation/cache/quiescence facts. C0 updates only its obsolete VIDEO source bindings. Common dispatcher/routes/lease authority remain outside VIDEO ownership, so callable source is not a registered job route. Tests/checks/lint/build/import/runtime **NOT_RUN** by mandate; native **HOLD**. No evidence directories, controller recovery or new validation gate was created.

### Common-worker mapper followup — source only

Actual `gpt-6.1-sol / medium`, turn `01a13887-534a-7be0-8124-2a4926c19079`, `2026-10-14T03:49:15.254Z`. Hai exports hiện hành: `processVideoJob({request,tuple,frozenInput,toolSetManifest})` cho full preexisting frozenInput; `mapVideoJobResult({result,tuple,toolSetManifest,originalSha256,inputBytes})` cho actual processed result sau J1 claim. Mapper kiểm closed own DATA/canonical tuple VIDEO, original hash/bytes, candidate/native closure/committed publication và canonical toolSet, hash fixed helper source, dùng shared internal projection để validate canonical recipe wrapper. Mapper không probe/process native và không yêu cầu expected recipe digest chưa có ở projection stage. Outputs thêm deterministic `key:'video'/'poster'`, filenames/roles/MIME/size/SHA/dimensions/duration giữ nguyên và không có generation. Full-frozen entry vẫn so khớp exact toolSet/processingRecipe digests sau processing, giữ helper drift guard, signal/deadline600s và toàn bộ error propagation.

Common worker owner là IMAGE implementer: thứ tự cần dùng `J1 claim → processVideo(request) → mapVideoJobResult → owner's actual binding/Storage/cache/READY`. VIDEO recipe phụ thuộc actual `original.metadata` (dimensions/fps/audio) và actual recipe từ guarded processing; không được đoán hoặc probe preclaim để tạo digest. Nếu queued-input contract yêu cầu actual processingRecipeSha256 trước claim, C1/C0 phải xử lý binding sequence đó trong ownership của họ; mapper không relax contract hoặc cấp placeholder digest. C0 stale-pin dependency ở section trên vẫn là explicit refusal cho tới source-owner correction. Hai-file followup only; tests/checks/lint/build/import/runtime **NOT_RUN**, native **HOLD**, history/evidence/shared files không sửa.

### C2 canonical PROGRAM/execution distinction — current semantics

Actual writer `gpt-6.1-sol / medium`, turn `01a1388a-16c3-7420-a021-137298d7b208`, `2026-10-14T03:52:16.357Z`.

C2 quyết định `frozenInput.processingRecipeSha256` bind pure input-independent PROGRAM, không bind expanded execution recipe. Handoffs trước về expanded queued hash ở trên là historical và được supersede. VIDEO dùng literal `expectedProcessingProgram('VIDEO')` từ C0-owned contract, hash canonical PROGRAM trước processing để so frozenInput; không guessed geometry/fps/audio hoặc preclaim native. Result hiện trả `processingRecipe/processingRecipeSha256` (PROGRAM) và `executionRecipe/executionRecipeSha256` (actual wrapper/source/helper/toolSet/expanded recipe) tách biệt. Actual expanded wrapper vẫn được `validateProcessingRecipe` kiểm với originalMetadata cho tới C0 giao execution-validator API riêng; legacy inner recipeSha256 không dùng cho hai canonical digests.

Signatures và generation-free output keys/descriptors giữ nguyên. Full-frozen entry so PROGRAM/toolSet trước processVideo và so lại returned PROGRAM/toolSet sau actual execution validation, giữ helper drift/cancel600s/error/Unknown retention. Literal C0 export `expectedProcessingProgram` chưa có tại lúc source edit; không stub/fallback hoặc contract modification từ VIDEO. C0 cần giao export đó cùng actual execution API/source-pin correction; common profile owner dùng `expectedStaticR0ToolSet` của C0, VIDEO không duplicate manifest fixture. Source edits/readback only, tests/import/runtime **NOT_RUN**, native **HOLD**.

### C2 final V2 API fit — current job semantics

Job mapper imports literal `contracts/media-v3-toolset-v2.mjs`: `expectedProcessingProgram`, `validateProcessingProgram`, `validateProcessingExecution`, `validateToolSetManifest`. PROGRAM được canonical validator kiểm với profile/hashCanonical. `processingRecipe/processingRecipeSha256` vẫn là PROGRAM để giữ announced consumer names; common worker ánh xạ nó vào `expectedJob.processingProgram`. `executionRecipe/executionRecipeSha256` hiện là actual RAW INNER `candidate.recipe` và canonical RAW digest, không legacy expanded wrapper. `validateProcessingExecution(program,rawRecipe,originalMetadata,hashCanonical)` kiểm actual expansion sau claim; actual helper/source hashes và toolSet digest phải khớp PROGRAM. Không legacy validator/pin fallback hoặc duplicate PROGRAM alias.

Full-frozen entry vẫn so queued PROGRAM digest/toolSet trước processing và returned PROGRAM/toolSet sau processing; mapper signatures/output descriptors/cancellation/Unknown retention không đổi. C0 owns V2 provider; source delivery pending nếu literal file chưa có, không tạo stub từ VIDEO. Tests/import/runtime **NOT_RUN**, native **HOLD**; common worker's actual Storage/cache/READY facts vẫn thuộc owner tương ứng. Preview helper riêng đã sửa original64MiB/single-flight/all-pages/explicit-click/empty-sandbox boundary theo C2; không browser/CSP feasibility claim.

**Latest source fit:** C0 V2 provider hiện đã có; ordinary source read xác nhận literal exports/options/signatures khớp mapper, execution validator trả actual RAW recipe sau metadata expansion comparison. Không import/decompress/run provider để tạo verification claim. Actual VIDEO writer `gpt-6.1-sol / medium`, turn `01a13895-4739-71a2-a3b7-74d78ab967c8`, `2026-10-14T04:04:29.654Z`; own source writes STOP. UI page count lấy từ complete validated PDF_PAGE indices1..N<=48, không cần summary pageCount. Rendered sandbox/parent-CSP/GC/RSS/Storage integration vẫn Unknown; mọi runtime/tests NOT_RUN.
