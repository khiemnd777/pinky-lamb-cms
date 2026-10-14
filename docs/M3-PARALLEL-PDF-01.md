# M3-PARALLEL-PDF-01 v1 — PDF processor local

## Current application handoff — 14/10/2026

**Verified (source authoring only):** `M3-PDF-APPLICATION-FINISH-01 v1` closes the processor request and candidate boundaries in `cms-api/media-pdf.mjs` and `cms-api/media-pdf-runtime.mjs`. Parent ACK observed actual `gpt-6.1-sol/medium`, turn `01a1387e-c093-71b2-b7c2-bdcf56b92085`. Human FAST-CODE-HANDOFF mandate stops all tests/checks/runtime; none were run for this revision. Sections below retain historical approvals and evidence; previous PASS results do not validate these source changes.

Literal caller: `processPdf({input:'/absolute/CMS/.local/media-scratch/m3/owner/run/source.pdf',expectedSha256:'<64 lowercase hex>',attemptDirectory:'/absolute/CMS/.local/media-scratch/m3/owner/new-attempt',signal:abortController.signal})`. Replace `/absolute/CMS` with the actual CMS root. Request must have `Object.prototype`, exactly the three required own enumerable data properties and optional genuine `AbortSignal`. Symbols, accessors, inherited/custom prototypes, unknown/nonenumerable keys, noncanonical paths and nonprimitive hashes are refused before filesystem/native work. The direct runtime entry also closes its own request fields.

Returned private result has `version`, `private:true`, `ready:false`, `original`, `recipe`, `recipeSha256`, `pageCount`, `pages`, `pdf`, `webpBytes`, `combinedBytes`, `verification`, `nativeSummary`, plus the owned parent `runtime` observation. Candidate schema is validated before output reads. Pages/tools/render arrays require dense `Array.prototype` arrays with exact numeric own enumerable data entries; holes, getters, symbols and extra keys are refused before callbacks or recipe serialization. SHA values are primitive strings of exactly 64 lowercase hexadecimal characters. Pages are complete and sequential, with `{page,width,height,pixelSha256,webp:{file,bytes,sha256,role:'PDF_PAGE',mime:'image/webp',pageNumber}}`. Download is `{file:'raster-only.pdf',bytes,sha256,role:'PDF_DOWNLOAD',mime:'application/pdf'}`. No generation, uploader, rightsApproval or READY state is emitted. Private receipt retains `ready:false`.

Fixed files: original copy `source.pdf`, `page-1.webp` through `page-N.webp`, `raster-only.pdf`, private `candidate.json`, `native-observations.json`, `receipt.json`, and final `manifest.json`. Each output uses exclusive creation. Input max25MiB; 1–48 pages; edge1600/pixels4M; WebP aggregate32MiB; PDF64MiB; combined96MiB; scratch256MiB; whole job120s; sampled RSS768MiB best effort; heap256MiB/threads2/log64KiB. Recipe records fixed lock/tool/package/source hashes. Actual output bytes and digests are read back; native worker retains page rendering, raster-only construction, pixel comparison, output structure inspection and cancellation/error gates. Original and rejected private attempt custody remain completion gates.

**Unknown / NOT_RUN:** all new tests, syntax/lint/build and native behavior. Existing unexplained twelve-dylib drift remains fail-closed through `verifyMediaTools('PDF')`; binaries, lock, dependencies and audit were not changed. `processPdf` has no application consumer yet. This is source delivery, not working-native or CMS/M3 acceptance.

**Manual next steps for Khiêm:** review the request/result boundary and wire the future owned caller to its generation/upload/READY policy separately. Resolve tooling drift through a separately approved tooling decision before considering native execution; do not execute drifted binaries. When tooling authority exists, manually exercise normal PDFs, rejected malformed/encrypted inputs, cancellation and output inspection. Old operators and version/map work remain frozen; this handoff grants no authority to resume them.

## Historical evidence — preceding source revisions

## Quyền và ownership — Verified

Human approval tại root chat `01a135ca-5716-7c20-9920-bbd64ddcbbfa`, turn `01a135d7-eb2c-7f41-8abf-7d51df9df19e`: “Approved M3-PARALLEL-PDF-01 v1 — PDF processor local. Phối hợp ownership với thread M3 trước khi triển khai; chỉ demo-pinky-lamb-cms và localhost, không chồng scope.”

ACK thread `01a13556-f342-7222-828f-7509812bf862` xác nhận sole writer cho `cms-api/media-pdf.mjs`, `cms-api/media-pdf-runtime.mjs`, `tests/fixtures/media-pdf.mjs`, `tests/media-pdf.test.mjs`, tài liệu này; prefix chung `pinky-lamb-cms/`. Không ghi shared ledgers/indices. Tool/dependencies/audit source immutable. Không API/UI/worker/Storage integration, emulator, browser, network input, cloud, install, Git hoặc publish.

Runtime-observed session `01a135da-c945-7f01-ae7d-818e40d8e166`, turn `01a135da-c998-7b41-842f-c7e00349fbf2`: `gpt-6.1-sol`, `medium`; session_meta agent_path `/root/pdf_processor`, role `kit-implementer`. Không suy route từ TOML.

## Contract

`processPdf({input, expectedSha256, attemptDirectory, signal?})` nhận original local thuộc private `.local/media-scratch/m3/<owner>/<run>/<file>` và tạo attempt mới `.local/media-scratch/m3/<owner>/<attempt>`. Interface không phụ thuộc task ID/test evidence. Phiên này chỉ tạo fixture/evidence và scratch trong hai namespace `parallel-pdf-01` được Approved. Caller không được truyền executable/argv/caps. Original giữ nguyên. Success manifest chỉ xuất sau decode lại toàn bộ outputs, digest và preservation checks. Failure/cancel không success manifest. Receipt PRIVATE không có nghĩa rights approval hoặc Firestore READY.

Một trang được render/decode/encode/embed/verify rồi unlink raster owned trước trang tiếp. Pinned pdf-lib `PDFImage.embed()` xóa embedder sau khi embed để giải phóng decoded channels; gọi public API này ngay mỗi trang. PDF context vẫn giữ compressed image streams tới save; không hứa constant memory. Watchdog RSS là best effort, heap256MiB, threads2; không hard OS sandbox.

Sources: [pdf-lib embedPng](https://pdf-lib.js.org/docs/api/classes/pdfdocument#embedpng), [Sharp constructor](https://sharp.pixelplumbing.com/api-constructor/), pinned `node_modules/pdf-lib/src/api/PDFImage.ts` và `PDFDocument.ts` 1.17.1. Source PDF không được load/copy bằng pdf-lib; chỉ generated output được load để inspect.

## Verification — Verified và Unknown

Increment RED: focused Node test exit1 `ERR_MODULE_NOT_FOUND` trước tạo processor. Sau source: pure request/metadata/hash/path/links/input-size/pre-cancel/private-directory/input-mode checks **4/4 PASS**, exit0, command:

```sh
.local/cache/node/node-v22.23.3-darwin-arm64/bin/node --test --test-concurrency=1 --test-name-pattern='request|metadata|hash/path|private directory' tests/media-pdf.test.mjs
```

Coordinator release native slot sau safety corrections. Actual first test:

```sh
.local/cache/node/node-v22.23.3-darwin-arm64/bin/node --test --test-concurrency=1 --test-name-pattern='native one-page' tests/media-pdf.test.mjs
```

**BLOCKED**, exit1 `TOOL_BYTES` trong `verifyPdfTools`, trước attempt mkdir/worker/native. Một actual source fixture với actions/form/attachment đã generate trong owned namespace. Read-only diagnosis: **12 linked bundled dylibs SHA mismatch**, kích thước giữ nguyên; actor/cause **Unknown**. Không sửa tool pins, bytes, dependencies hoặc baseline. [Private diagnostic receipt](../.local/test-outputs/m3/parallel-pdf-01/run-2115f5aa-30e3-4c26-8469-f3d293c1186d/preflight-tool-drift.json) ghi từng expected/actual digest. Original evidence và private input bytes equal; attempt absent; owned worker starts0, native PDF starts0. Không có process tree PDF cần cleanup.

Immutable lock SHA `2c049b8684ba07916855f009b1a52af77650a118e96090fadc45453f4eb18081`; audit SHA `56d122ed0226c371a72e5048996508024e133a2b09e8d05b7e5e5f6b987fc2fc` vẫn khớp. `verifyMediaTools` fail closed; all-dependency preservation PASS chưa đạt vì library drift đã có lúc first preflight.

**Unknown / NOT_RUN:** real1page processing/output oracle,48pages, encrypted/malformed/page49 native refusal, live cancel/timeout/RSS/scratch/log/partial-output/resource crossing, full independent review và module acceptance. Native tests/source controls được viết nhưng không chứng minh behavior. Output cap rules chưa có actual maximum crossing. First pipeline chưa đạt; task không COMPLETE. Toàn CMS/M3 acceptance, LOCAL_COMPLETE và Production NOT_RUN.

Coordinator sở hữu quyết định tool drift recovery. Không tiếp tục native phụ thuộc trước source/tool revision được kiểm chứng và approval phù hợp; không rebaseline để báo PASS. `native-observations.json` giữ private per-process evidence riêng; compact candidate/manifest giữ media outputs và recipe, không tăng frozen resource caps.

Coordinator gửi stop affected native; implementer ACK. Không process PDF nào đã start; native slot released. [Full mismatch stat receipt](../.local/test-outputs/m3/parallel-pdf-01/run-2115f5aa-30e3-4c26-8469-f3d293c1186d/tool-drift-stats.json), SHA `b942aa44e3deb7dacd94c841799766eebdeeb8039bd24d196edcf42fb7820a88`, giữ uid/gid/mode/nlink/dev/inode/mtime/ctime và actual hash. Affected names: `libfreetype.6.dylib`, `libfontconfig.1.dylib`, `libjpeg.8.3.2.dylib`, `libopenjp2.2.5.4.dylib`, `liblcms2.2.dylib`, `libpng16.16.dylib`, `libz.1.3.2.dylib`, `libcairo.2.dylib`, `libexpat.1.12.1.dylib`, `libintl.8.dylib`, `libpixman-1.0.dylib`, `libiconv.2.dylib`.

Focused final ESLint bốn owned `.mjs` exit0; `node --check` từng file exit0. Không chạy `--fix`, build, emulator, broad suite hoặc network audit. Obvious approved local archive locations `task01-downloads` và `pdf-tools/01Pa-setup` chỉ có package/Poppler source archives; không tìm thấy original bundled-library archive trong hai vị trí khảo sát. Không kết luận bytes cũ không còn ở nơi khác; không restore/copy/install.

Không có safe derivative sample vì pin preflight fail. Existing source fixture có active components, chỉ là input test private, không sanitized output. Remaining: resolve tool-pin drift bằng plan/approval riêng phù hợp; sau đó resume first real1page,48pages/native adversarial/resource/livecancel/partial checks và independent review. SOURCE_WRITTEN / PURE_STATIC_VERIFIED / BLOCKED_TOOL_BYTES / NATIVE_NOT_RUN; module acceptance chưa đạt.

## Source-only independent review repairs

`startPdfRuntime` và internal CLI worker đều gọi immutable `verifyMediaTools()` trước Node/native spawn hoặc Sharp load, recheck deadline và cancellation/disconnected IPC sau pin gate. Direct runtime regression trên drift hiện tại trả `TOOL_BYTES` và empty owned directory/inode/mtime giữ nguyên. Worker CLI order chỉ được source inspection, không invocation; **NOT_RUN** actual CLI/native behavior.

Finalization không viết receipt/manifest khi custody hoặc private ancestry bị từ chối. Mỗi fixed final record kiểm no-link/private ancestry và expected attempt inode/dev/mode/uid ngay trước `wx` write. Real owned synthetic replacement và symlink regression đều từ chối; rejected/retained target directories vẫn empty. Không test hoặc đổi foreign/global directories.

Final focused checks **7/7 PASS**, exit0; ESLint4files exit0. Command thêm selectors `direct runtime|source gates|finalization` vào pure selector phía trên. Regression `direct runtime` chỉ có ý nghĩa với observed tool drift hiện tại; future approved tooling recovery phải cập nhật evidence/test expectation phù hợp, không xem pin drift là desired product behavior. Native vẫn **NOT_RUN**, không sanitized output hoặc module acceptance claim.

Independent actual High reviewer session `01a135dd-1167-7341-a3f6-287d6d2d0b3a` trả **PASS_SOURCE_ONLY** trên frozen v2: hai Required P1 closed, không unresolved Required source finding. Verdict chỉ chứng minh source review, không native behavior/module acceptance. Runtime/processor hashes giữ nguyên trong final test/doc correction; source review còn áp dụng cho code không đổi. Optional order oracle được sửa: mỗi needle phải có index>=0 trước comparison, để missing gate không lọt qua `-1 < positive`.

Final handoff/source-freeze-v3 giữ source/code pins attribution và liên kết drift receipts lịch sử. **BLOCKED_TOOL_BYTES / NATIVE_NOT_RUN**, `sliceComplete:false`. Không resume native/CLI/decode; không tools/loader/pins/shared writes.
