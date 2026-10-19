# PUBLISH-SELECTED-001 — One action, one resource and locale

Approved by Khiêm on 19 October 2026: combine publication into one action that updates only the selected saved content and locale on :4189. Preserve all other live content; test failures and retry. No :5010 or Production action. Main session owns implementation, tests, documentation and sequential self-review; no delegated reviewer.

Acceptance: the candidate derives from the active frozen release, replacing only the selected resource/locale/revision. Unrelated drafts and CMS approvals cannot enter it. Preserve authorization, immutable history, concurrency and operation identity. Only report website success after verification. Packaging/verification failures preserve or restore the old website; explicit retry reuses the same frozen publication. Missing live release or incompatible shared dependencies blocks with an actionable reason instead of publishing other content.

Scope: CMS UI, selected publication API/service, frozen release composition, focused isolated tests and related docs. No retained-data seed/reset, migration, :5010 process changes, Production or Git operations. Initial engineering scope did not select retained-content publication; the later specific human authorization below covers the bounded one-character publication/restoration loop.

Current status: SOURCE_COMPLETE / FOCUSED_CHECKS_PASS / LOCAL_PUBLICATION_ROUND_TRIP_PASS. Selected-flow desktop/mobile UI observed. Human acceptance remains pending; no Production release or full-UI acceptance claim. Earlier NOT_RUN records below retain their dated meaning; the final acceptance section records the later execution.

## Delivered behavior

- The resource detail has one **Xuất bản** action. Confirmation names the resource, locale, saved revision and :4189. The separate whole-site action is removed. CMS history is labelled as history; website success appears only after the combined job completes.
- `POST /api/cms/localizations/website/publish` now requires the exact saved resource/locale/revision/content hash/dependency hash. The old empty-body whole-site scan is rejected. The command starts from the active release, replaces just the selected snapshot and reuses active artifact media bytes. Other drafts/current approval pointers do not supply release content.
- Publication remains OWNER-only with transactional authorization, source/revision conflict checks and immutable history. A stable actor + exact selection key (including note) prevents duplicate publication history after response loss or page reload. Explicit retry reuses the saved job/artifact; failures are not automatically retried.
- Packaging failures leave the website unchanged. Switch or verification failures restore the prior pointer only while the command owns the candidate pointer. Other website changes are not overwritten. A rollback now restores the matching private release source as well as the public artifact.
- First-time content absent from the active website and shared-source/media changes are blocked with a reason. They require an explicitly scoped dependency/structure update; no unrelated content is silently published.

## Checks — 19 October 2026

Pinned Node 22.23.3, installed dependencies only. No installation, services, migration, retained-data mutation, :5010 request/change or Production action.

- Test-first: the initial two regression assertions failed on the placeholder implementation (selected payload unchanged; missing dependency rejection). Both now pass.
- **47/47 tests PASS**, zero skipped, across `selected-publication.test.mjs`, `selected-publication-flow.test.mjs`, `localized-editorial-api.test.mjs`, `localized-eligibility-api.test.mjs`, `p7-release-preparation.test.mjs`, `p3-p6-ui-repairs.test.mjs` and `full-site-localization-contract.test.mjs`. Command: pinned Node `--test --test-reporter=spec` with those seven files, launched with the existing `childEnvironment()` demo/loopback guard. Tests include real temporary SQLite transactions and the actual HTML exporter, synthetic pointer/HTTP fault injection, stable retry after response loss/reload, permission/revision/concurrent-pointer denials, all content kinds/locales, rollback source identity, and the real UI mount/click handler with a synthetic DOM. Temporary databases are separate from retained CMS data.
- Focused ESLint **PASS** for the eleven changed/new JavaScript files. Build **PASS** using pinned Node `scripts/local-guard.mjs build` (Admin output only).
- Read-only compatibility check **PASS**: loaded the retained website pointer, its private frozen bundle and artifact bytes; the current exporter reproduced EN/VI/JA HTML byte-identically. No candidate files, database writes or pointer switches occurred in that check.
- Two focused test-fixture issues were corrected: macOS temporary-directory symlink normalization and missing window timer methods in the existing synthetic DOM. The original checks then reached their assertions and passed. No new runner or environment repair framework was introduced.
- Sequential self-review completed for UI/API wiring, selection boundaries, authorization, retry/history, pointer ownership and rollback. No independent reviewer ran. There is no Git metadata/diff/commit claim.

## Remaining runtime proof and next action

Browser navigation to `http://127.0.0.1:5273/login` returned `ERR_CONNECTION_REFUSED`; listener inspection found neither :5273 nor :4189 running. Authenticated rendered desktop/mobile UI and actual retained-content publication/readback are **NOT_RUN**, not failed business assertions. No restart was attempted. The current stack runner also starts :5010, which this task excludes.

Next: obtain authority to start only Admin/API :5273 and the existing pointer-following website host :4189, with no :5010 action, seed/reset or migration. Inspect the new UI using an existing OWNER session. A real publication check requires the human to select/authorize a resource, locale and saved revision (or perform that action themselves). Expected acceptance: one action updates the selected content, other live snapshots/languages remain unchanged, and failure/retry shows accurate results. Until then, runtime availability remains Unknown.


## Runtime acceptance — 19 October 2026 (in progress)

Khiêm authorized starting only Admin/API :5273 and website :4189, desktop/mobile UI inspection, then a one-character edit → publication → restore original copy → publication. No :5010/Production or seed/reset. The main session owns this bounded loop; no subagents.

- Started pinned Vite in durable local mode only on :5273. Started the existing pointer-following host only on :4189 through the guarded tooling environment. No worker, baseline server or emulator stack was launched. Initial listener inspection had no :5010 listener.
- Admin startup first encountered sandbox bind EPERM; the same approved :5273 command succeeded through normal auto-review escalation. :4189 also started through approved escalation.
- Browser auto-review refused observation of an old :5173 tab because the authorization targets :5273. That tab was not accessed; a new tab at the approved :5273 origin opened successfully. No permission bypass or indirect access to :5173 occurred.
- The :5273 page requests login. Asked the human to sign in there; no credentials were read, reset or entered by the agent. Authenticated UI and the edit/publication loop are pending this session.
- Selected target after read-only comparison: service `brand-creative`, locale `en`, saved revision 2. Saved draft contentHash matches the current live draft contentHash. Intended edit: append one punctuation character to `summary`, publish, then restore the exact original `summary` and publish. No changes yet.
- Before-state stored privately at `.local/test-outputs/publish-selected-20261019/before.json`: pointer, frozen bundle, selected original and hashes of 144 draft/approval records. Active bundle has 72 resource/locale snapshot pins.
- Public website :4189 observed at 1440×900 and 390×844. Screenshots saved in the same private evidence directory. Mobile document/client/scroll widths all 390px; no broken visible images observed. This is preliminary UI evidence, not publication acceptance.

### Progress after human login

- Human confirmed login to :5273. Observed OWNER UI. Opened service Brand & Creative → EN and appended exactly one `!` to its saved summary through the real UI. Save succeeded at revision 3. Read-only database/pointer check confirmed exactly the intended summary edit and unchanged website pointer before publication. No Publish POST has been executed in this campaign.
- Opened Xuất bản → Dịch vụ → Tiếng Anh → Brand & Creative revision 3. The detail shows the saved copy and one website Publish action. A stale explanatory sentence on the listing still refers to the removed Xuất bản website button; this is a copy defect to repair within scope after restoring access.
- Public screenshots at 1440×900 and 390×844 were observed. Admin screenshots were actually 1874×991: the browser-scoped viewport override applied to the selected public tab rather than the Admin tab. The falsely named mobile capture was renamed `05-admin-viewport-not-applied-desktop.jpg`; do not count it as mobile proof. Authenticated Admin mobile acceptance is still NOT_RUN.
- Attempt to rebind the already-authorized Admin tab `334098511` at :5273 was NOT_EXECUTED: automatic approval review could not complete because its selected model was at capacity. This is a review infrastructure failure, not an unsafe-action decision. Stopped affected browser work; did not bypass via another handle, raw browser protocol or API execution. Asked the human whether to wait/retry the same :5273 tab or restore manually.
- Current retained state: only `brand-creative/en` draft revision 3 contains the temporary final `!`. :4189 still serves the original release `cms-mvbw7erw-27ea14c2`. Both requested publication steps and final restoration remain pending.

### Báo cáo nghiệm thu tạm thời — bị chặn công cụ

Khiêm chọn “Chờ rồi thử lại đúng tab :5273”. Đã thử lại đúng `cua.getTab(334098511, browser 2)`; sau khoảng 69 giây, auto-review tiếp tục báo mô hình kiểm duyệt hết công suất. Lệnh không được thực thi. Không thử đổi model hoặc dùng handle cũ/đường API để vượt kiểm duyệt.

| Tiêu chí | Kết quả quan sát | Trạng thái |
| --- | --- | --- |
| Khởi động riêng Admin/API :5273 và website :4189 | Hai listener đúng cổng đã chạy; không chạy stack/baseline/emulator/worker | PASS |
| Website desktop/mobile trước thay đổi | Quan sát 1440×900 và 390×844; mobile không tràn ngang hoặc ảnh hiển thị bị hỏng | PASS trong phạm vi màn hình đã xem |
| Đăng nhập OWNER và chọn đúng bản EN | Người dùng đăng nhập; UI cho thấy Brand & Creative, Tiếng Anh | PASS |
| Thay đúng 1 ký tự và lưu | Thêm `!` cuối summary; save v2 → v3; pointer website chưa thay đổi | PASS |
| Admin desktop có một action Xuất bản cho bản chọn | Chi tiết v3 hiển thị một action cập nhật :4189; ảnh thực tế 1874×991 | PASS phần điều khiển; không tuyên bố toàn UI đạt |
| Admin mobile | Viewport override chưa áp lên đúng tab; không có ảnh mobile hợp lệ | NOT_RUN / chưa có bằng chứng |
| Xuất bản v3 và đọc lại website | Chưa bấm Publish hoặc xác nhận mutation | NOT_RUN — auto-review bị chặn |
| Khôi phục nguyên văn và xuất bản lần hai | Chưa thực hiện; không tự sửa database để thay thao tác UI | NOT_RUN — phụ thuộc quyền điều khiển UI |
| Nội dung/ngôn ngữ khác giữ nguyên sau hai lần xuất bản | Chưa có hai lần xuất bản để đối chiếu; 47 test cũ không thay thế bằng chứng này | NOT_RUN |

Ảnh đã lưu (JPEG gốc, không chỉnh sửa):

- `01-public-before-desktop.jpg`: website trước thay đổi, 1440×900.
- `02-public-before-mobile.jpg`: website 390×844, điểm cuộn trước phần dịch vụ.
- `03-public-summary-before-mobile.jpg`: mô tả dịch vụ ở 390×844.
- `04-admin-publish-desktop.jpg`: chi tiết bản nháp v3, nút Xuất bản, 1874×991.
- `05-admin-viewport-not-applied-desktop.jpg`: bằng chứng viewport chưa áp lên Admin, không dùng làm nghiệm thu mobile.

Toàn bộ ảnh và `before.json` nằm dưới `.local/test-outputs/publish-selected-20261019/`. Admin desktop có logo sidebar không tải được trong cấu hình chạy riêng này; chưa xác minh/sửa nguyên nhân, không đánh dấu giao diện toàn bộ PASS. Một câu hướng dẫn cũ ở danh sách vẫn nhắc nút Xuất bản website đã bỏ; cần sửa copy và kiểm lại khi công cụ phục hồi.

**Trạng thái bàn giao:** chưa nghiệm thu luồng end-to-end. Hai dịch vụ để chạy theo quyền đã cấp. Bản nháp `brand-creative/en` v3 còn dấu `!`; website vẫn giữ release gốc `cms-mvbw7erw-27ea14c2` theo lần đọc pointer trước Publish (không Publish nào được thực hiện sau đó). Không tự viết lại lịch sử, reset/seed dữ liệu hoặc chuyển pointer.

**Việc tiếp theo:** khi auto-review có công suất, tiếp tục cùng tab :5273 theo phạm vi đã duyệt, hoàn tất xuất bản v3, kiểm :4189 và 71 pin khác, khôi phục summary gốc từ bằng chứng, lưu và xuất bản, kiểm HTML ba ngôn ngữ và draft/approval hashes. Không cần xin lại phạm vi cũ. Nếu người dùng muốn loại bỏ ký tự thử ngay, có thể mở Dịch vụ → Brand & Creative → EN, xóa `!` cuối mô tả và chọn Lưu bản Anh; website hiện chưa nhận ký tự thử. Chủ khắc phục blocker: hạ tầng automatic approval review; agent không tự đổi model/global settings.

### Tiếp tục theo chỉ đạo dùng Edge — 19/10/2026

Khiêm yêu cầu trực tiếp “dùng trình duyệt Edge”. Đã thử chọn đúng browser `2` (Edge) và gắn đúng tab Admin `334098511` tại :5273. Công cụ yêu cầu khôi phục documentation; bước này timeout lần đầu và trả documentation ở lần thử lại. Lệnh chọn browser có lỗi binding JavaScript sau chờ kiểm duyệt; không có thao tác trang được thực hiện từ lỗi này. Lệnh `getTab` tại đúng origin :5273 tiếp tục timeout auto-review, kể cả lần thử lại được công cụ cho phép. Không nhận được quyền đọc trang hoặc quyết định rằng thao tác không an toàn. Dừng các lần gọi lặp, không dùng đường vòng hoặc đổi model/global settings.

Không có thao tác lưu, Publish, khôi phục, reset/seed hoặc đổi pointer nào trong lượt tiếp tục này. Trạng thái dữ liệu cuối đã xác minh ở đợt trước giữ làm nguồn bàn giao: draft Brand & Creative/en v3 có ký tự thử `!`; website chưa nhận thay đổi. Chưa xác minh lại dữ liệu qua UI do origin gate chưa mở. Blocker hiện tại là timeout của automatic approval review cho Edge/:5273. Khi dịch vụ kiểm duyệt phục hồi, tiếp tục vòng xuất bản–khôi phục theo phạm vi đã duyệt; không cần mở một kế hoạch mới.

### Chẩn đoán lỗi công cụ Codex — 19/10/2026

- Thông báo quan sát được: `Automatic approval review failed: Selected model is at capacity. Please try a different model.` Các lần khác báo hết thời gian xét duyệt. Đây là kết quả của công cụ điều khiển trình duyệt trong Codex, không phải thông báo do trang CMS hoặc Edge hiển thị.
- Bước tái hiện đã thất bại: gắn tab Edge `334098511`, browser `2`, origin đã được người dùng cho phép `http://127.0.0.1:5273`. Lệnh chưa thực thi; lỗi xảy ra trước thao tác trang và trước Publish. Không kết luận rằng nghiệp vụ Publish đã thất bại.
- Tra tài liệu chính thức: automatic approval review dùng một reviewer riêng; chính sách browser/Computer Use được quản lý riêng với sandbox. Không có bằng chứng rằng thay model của chat sẽ đổi reviewer đang lỗi. Tài liệu `/approve` nói lần thử lại vẫn đi qua auto-review; không coi đây là cách sửa lỗi công suất.
- Kiểm tra chỉ đọc log desktop của đúng chat không tìm thấy bản ghi capacity/approval timeout đủ để xác định model reviewer hay nguyên nhân sâu hơn. Không thu thập hoặc gửi credentials, source, dữ liệu CMS hoặc toàn bộ log ra ngoài. Chưa gửi báo lỗi tới dịch vụ hỗ trợ.
- Trạng thái: lỗi công cụ CHƯA KHẮC PHỤC; nguyên nhân sâu hơn UNKNOWN. Đầu mối cần chẩn đoán dịch vụ reviewer là hỗ trợ Codex/OpenAI. Bản ghi này cung cấp thông báo, bước tái hiện và tác động để gửi hỗ trợ khi người dùng cho phép; không phải bằng chứng đã tạo ticket hoặc đã sửa được lỗi.
- Khi công cụ có thể gắn tab theo cơ chế quyền hiện hành, tiếp tục cùng phạm vi đã duyệt: đọc lại draft và pointer trước, xuất bản ký tự thử, kiểm :4189 và các nội dung khác, khôi phục nguyên văn, xuất bản lần hai và chụp UI desktop/mobile. Dữ liệu cuối đã xác minh vẫn là draft v3 còn `!`, website nguyên bản; lượt chẩn đoán này không sửa dữ liệu hoặc chạy Publish.

Nguồn đối chiếu: https://learn.chatgpt.com/docs/sandboxing/auto-review ; https://learn.chatgpt.com/docs/enterprise/managed-configuration#control-browser-and-computer-use ; https://learn.chatgpt.com/docs/developer-commands#approve-an-auto-review-denial-with-approve .

### Kết quả truy vết reviewer — bổ sung sau yêu cầu điều tra tiếp

Đã tìm được log thực thi trong `~/.codex/logs_2.sqlite`, không phải các file log Electron đã kiểm trước đó. Chỉ mở SQLite read-only/query-only và lọc đúng chat, thời gian, reviewer và sự kiện. Bản trích đã lọc trường lưu tại `.local/test-outputs/publish-selected-20261019/reviewer-diagnostic.json`; không sao chép prompts, credentials hoặc toàn bộ log.

**Đã xác minh:**

- Model ID gửi tới dịch vụ: `codex-auto-review`, reasoning `low`, provider `openai`. Đây là ID dịch vụ quan sát được; chưa biết model nền phía sau ID này.
- Reviewer thread: `01a15248-c0c7-7592-a278-1c66d808fb1f`, source `guardian_review`. State record và log turn cùng xác nhận model/effort, khác với `gpt-6.1-sol` của chat và các agent review code trong repository.
- Lệnh Edge lỗi lúc 05:01:15 UTC / 12:01:15 giờ Việt Nam: `call_efbbd9e477c44defb6fe99c73010902a`. Review ID: `20532ed4-84e7-4a6b-b256-5b9d28b69e67`.
- Log 647028115 và 647028161 ghi `failure_reason=Some(SessionError) error_info=Some(ServerOverloaded)`. Reviewer tự thử tổng cộng 3 lần; log turn 647028113, 647028159 và 647028245 đều ghi model `codex-auto-review` và thông báo capacity. Không có quyết định nội dung không an toàn ở những lỗi này.
- Kết nối WebSocket tới dịch vụ Responses của Codex được thiết lập thành công trước lỗi. Chưa có HTTP status hoặc backend HTTP request ID trong phần log đã xác minh. `c00093fd-6fcf-4789-9523-8ae90cefd6b0` là RPC request ID của `thread/start`, không được trình bày như HTTP request ID.
- Reviewer đang nhận `service_tier=priority` trong cả ba lần thử (log 647027947, 647028123, 647028179). Cấu hình người dùng cũng có `service_tier="priority"`. Điều này xác nhận chế độ Fast được mang sang reviewer, chưa chứng minh Fast gây lỗi quá tải.
- Catalog hiện có entry ẩn `codex-auto-review`; các trường `auto_review_model_override` và `guardian` của model chat không đặt override. Chưa thấy bằng chứng policy của repository ép chọn sai reviewer. Schema của chính bản cài xác nhận `guardian_subagent` là tên cũ còn được chấp nhận cho `auto_review`.
- `review_model` trong cấu hình là lựa chọn model cho review code (`/review`), không phải cách đã được xác minh để đổi reviewer quyền trình duyệt. Không sửa trường này để thử đoán.

**Phép thử đối chứng được đề xuất, chưa phải sửa thành công:** chuyển riêng chat hiện tại từ Fast sang Standard, giữ model và `auto_review`; sau đó thử lại đúng lệnh gắn tab Edge một lần và đối chiếu tier/model/error trong log. Không có setter tốc độ chat hiện tại trong các công cụ được cấp. Đã đề nghị người dùng chuyển tốc độ trong Codex; đang chờ thay đổi này. Không tự sửa cấu hình global, đổi model reviewer, tắt xét duyệt hoặc chạy Publish. Nếu Standard vẫn `ServerOverloaded`, giả thuyết lỗi riêng tier priority không được xác nhận; không báo PASS hay lặp retry vô hạn.

Nguồn đối chiếu setting: https://learn.chatgpt.com/docs/agent-configuration/speed#fast-mode ; https://learn.chatgpt.com/docs/code-review#code-review-results .

### Kết quả điều tra và nghiệm thu local cuối lượt — 19/10/2026

**Công cụ reviewer:** Khiêm xác nhận đã chuyển chat sang Standard. Lệnh gắn tab cũ báo tab đã mất; inventory Edge cho thấy Admin hiện ở tab `334097748`, đúng origin :5273. Đã gắn tab này và đọc OWNER UI thành công. Log cho thấy reviewer mới `01a15296-60b3-7741-bfa0-de1326d96048` vẫn dùng `codex-auto-review`, `low`, và vẫn ghi `service_tier=priority`, nhưng hoàn tất xử lý. Vì tier reviewer không đổi, phép thử không chứng minh Standard chữa lỗi. Có bằng chứng truy cập đã phục hồi, không có bằng chứng một bản sửa cấu hình/model đã chữa tận gốc tình trạng quá tải dịch vụ. Không sửa policy, chọn model reviewer khác hoặc gửi hỗ trợ.

**Lỗi Edge riêng, đã xử lý trong luồng thực:** API xử lý JavaScript confirm bị timeout ở `Emulation.setFocusEmulationEnabled` trong khi hộp xác nhận đang mở. Đọc chính hộp thoại bằng Computer Use native của Edge, xác nhận đúng Brand & Creative/en/revision/:4189 rồi chọn OK một lần. Không gửi lại Publish khi chưa rõ kết quả; đối chiếu journal và pointer trước khi tiếp tục. Sau lần hai, công cụ còn giữ trạng thái confirm đã đóng: API dismiss trả `No dialog is showing` (-32602), sau đó DOM Admin đọc được và xác nhận v4. Đây là đồng bộ trạng thái công cụ sau hộp thoại, không phải lỗi nghiệp vụ Publish hoặc nới quyền xét duyệt.

| Kiểm tra thực | Bằng chứng | Kết quả |
| --- | --- | --- |
| Xuất bản ký tự thử | Brand & Creative/en v3; job `mvet09sq-b56d2c45`; release `cms-mvet09sq-b56d2c45-1`; UI báo thành công, website hiển thị dấu `!` | PASS |
| Chỉ thay bản chọn | 71/72 frozen draft payloads khác giống nguyên vẹn; 142/144 bản ghi nháp/approval khác có canonical hash giữ nguyên; chỉ selected draft/approval thay đổi | PASS |
| HTML sau lần đầu | VI/JA giống từng byte; EN giống từng byte sau khi bỏ đúng ký tự thử tại summary | PASS |
| Khôi phục và xuất bản | Lưu nguyên văn gốc thành v4 qua UI; job `mvet72sd-cf5c7e5b`; release `cms-mvet72sd-cf5c7e5b-1`; receipt `PUBLISHED_ON_WEBSITE`, port 4189, activation false | PASS |
| Nội dung cuối | Summary v4 bằng nguyên văn gốc; EN/VI/JA HTML đều giống từng byte với trước vòng thử; 71 bản còn lại và 142 bản ghi khác vẫn nguyên | PASS |
| Website desktop/mobile | 1440×900 và 390×844; summary đã quan sát ở cả trạng thái thử và khôi phục; mobile scrollWidth 390, không thấy ảnh hiển thị bị hỏng ở vùng đã đo | PASS trong màn hình đã kiểm |
| Admin desktop/mobile | Desktop thực 1874×991; mobile riêng 390×844, scrollWidth 390; mở menu → Xuất bản → đúng Brand & Creative/en v4; một nút Xuất bản trong detail | PASS cho luồng đã kiểm |
| Câu hướng dẫn cũ | Đã thay câu nhắc nút Xuất bản website bằng hướng dẫn chọn bản đã lưu → Xuất bản; bản mới đã thấy trên UI mobile | PASS |
| Logo sidebar Admin | Ảnh logo không tải trong cấu hình chạy riêng; có từ trước lần xuất bản, chưa điều tra/sửa | OPEN; không khẳng định toàn UI đạt |

Không tạo lỗi nhân tạo trên retained data. Các tình huống lỗi đóng gói, xác minh, pointer race, idempotency và retry có bằng chứng từ 47 test cách ly đã ghi ở trên; vòng UI thật gồm hai lần thành công, không thay thế bằng chứng fault injection. Sau sửa copy, chạy lại `tests/p3-p6-ui-repairs.test.mjs` bằng pinned Node + childEnvironment: **7/7 PASS**, zero skipped; ESLint file editor **PASS**; `scripts/local-guard.mjs build` **PASS**. Không chạy lại phần logic không thay đổi. Tự review tuần tự; không có reviewer độc lập.

Đối chiếu retained data dùng script chẩn đoán tạm `/private/tmp/pinky-publish-selected-verify.mjs after-first` và `after-restore`, SQLite readonly. Script dùng đúng `canonicalJson` như baseline; lỗi định dạng hash ban đầu của script kiểm tra đã được sửa theo hàm baseline trước khi kết luận dữ liệu. Hai kết quả cuối đều PASS và được lưu ở `after-first.json`, `after-restore.json`. Không sửa database trực tiếp.

Ảnh mới trong `.local/test-outputs/publish-selected-20261019/`:

- `06-admin-published-v3-desktop.jpg`, `07-public-v3-desktop.jpg`, `09-public-v3-summary-mobile.jpg`: lần xuất bản ký tự thử.
- `08-public-v3-mobile.jpg`: mobile ở điểm cuộn trước summary; không dùng làm bằng chứng summary.
- `10-admin-restored-v4-desktop.jpg`, `11-public-restored-mobile.jpg`, `12-public-restored-desktop.jpg`: trạng thái khôi phục.
- `13-admin-draft-v4-mobile.jpg`, `14-admin-publish-action-mobile.jpg`: detail v4 trên mobile và một nút Xuất bản.
- `ui-measurements.json`: số đo viewport thực. Đã gọi reset viewport và đóng hai tab agent tạo để kiểm viewport; tab Admin gốc của người dùng được giữ.
- `reviewer-diagnostic.json`: model/error/review ID và quan sát phục hồi; ghi rõ kết quả đối chứng tier chưa kết luận.

**Bàn giao:** luồng chọn nội dung/ngôn ngữ → một nút Xuất bản → :4189 đã chạy thật hai lần và trở về đúng nội dung ban đầu. Lịch sử v3/v4 được giữ; không seed/reset, không :5010 hay Production, không Git. Hai dịch vụ local để chạy theo quyền đã cấp. Bước tiếp theo: Khiêm đối chiếu ảnh/kết quả và nghiệm thu luồng local; lỗi logo Admin vẫn được ghi riêng, chưa có phê duyệt nghiệm thu toàn giao diện.
