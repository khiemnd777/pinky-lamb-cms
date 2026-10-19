# MULTILINGUAL-001 — cách kiểm thử v2, áp dụng P3–P7

Ngày16/10/2026. Human giao trực tiếp sửa harness trước khi chuẩn bị P3 còn lại. Đây là quy tắc kiểm thử của các bundle tiếp theo; không tự cấp quyền ghi/import/activation. [Task canonical](../tasks/MULTILINGUAL-001-v2.md), [harness correction](../../approvals/MULTILINGUAL-001-HARNESS-v1.repair.json).

## 1. Nguyên nhân và thay đổi đã làm

Legacy Playwright test sở hữu browser/context trong fixture. Sau khi dữ liệu đã lưu/CAS/retry/restore thành công, assertion hình ảnh lỗi làm teardown phiên; login timeout cũng đóng browser, trong khi câu hỏi đăng nhập ở chat còn tồn tại. Đã thay entry LIVE này bằng process owner riêng: `scripts/multilingual-browser-session.mjs` và `tests/helpers/multilingual-browser-session.mjs`. Các unit/API CAS/retry và fixture UI cũ giữ nguyên; historical LIVE failure không đổi thành PASS.

Owner giữ browser/context/page trong RAM và dùng owned persistent profile `.local/cache/multilingual-001/browser-profile` theo [CMS-AUTH-REMEMBER-001 v1](CMS-AUTH-REMEMBER-001-v1.md) đã Approved. Firebase SDK được phép tự lưu phiên LOCAL trong profile này; không đọc/copy/export credentials, cookie/token hoặc storageState, không CDP HTTP port. Parent/profile0700, `.local/` ignored; một owner tại một thời điểm, không xóa profile lock hoặc tạo profile thay thế khi đang bị giữ. CLI hiện chỉ có consumer `project-readonly`; các consumer ghi của P3/P5/P6 chỉ được thêm trong bundle được duyệt. Generic phase API có kiểm quyền task và allowlist request, không tự làm Auth/ACL.

## 2. Quy trình bắt buộc

1. **Không cần login trước:** unit/contract/context/renderer, fixture UI và export/HTTP độc lập chạy trước. So template với cùng dữ liệu/viewport. Kiểm đúng Node/browser/local project, routes/modules/assets và cửa sổ/login page. Source/server cuối được nạp trước khi mở phiên người dùng.
2. **Handoff có liveness:** chỉ nhờ login sau `LOGIN_READY`, title và trang thật khớp, process/context/page còn responsive. Nếu `AUTH_RESTORED_READY`, backend đã xác minh lại phiên và không hỏi login. Báo đúng ứng dụng/cửa sổ/URL. Nếu chưa thấy cửa sổ, giải quyết cửa sổ trước; không bảo người dùng login vào một tab khác. Status phải kiểm lại ngay khi user phản hồi.
3. **Một owner cho một phiên:** normal login chỉ người dùng nhập. Không reload/remount Auth app hoặc restart Vite sau login vì lỗi harness. Hai page cùng context chỉ khi ca CAS thực sự cần; dùng lại quyền và phiên còn hợp lệ. Chỉ điều phối viên gửi một yêu cầu login còn hiệu lực; khi hết hiệu lực phải báo rõ, không tiếp tục dùng câu hỏi cũ.
4. **Bước ghi tách khỏi UI:** exact resource IDs/expected revisions/request hashes/idempotency keys và ngân sách nằm trong bundle. Checkpoint immutable trước stage UI; journal commit/readback/restore ngay khi đạt, không chờ screenshot. Một write-stage đã attempted, completed hoặc outcome unknown không được chạy lại toàn bộ; đọc receipt/trạng thái trước mọi recovery. Denied/replay/CAS loser ghi0.
5. **Lỗi UI giữ phiên:** chuyển fence read-only, lưu stage/checkpoint, giữ browser/context/page. Sửa assertion/helper rồi gọi lại đúng read-only stage trong cùng owner. Không tự logout/close/restore/write trong catch/finally. Nếu cần nạp helper code mới, registry phiên tới phải hỗ trợ module mới trong chính browser còn sống; không biến giữ browser thành đọc lại file test chạy process mới.
6. **Login timeout khác browser chết:** hết thời gian chờ trả `LOGIN_WAIT_EXPIRED`, vẫn giữ cửa sổ. Khi người dùng đã login muộn, `confirm-login` kiểm lại trong cùng context; chỉ cho phép khi chưa có write attempted và chưa có lỗi trước đó. Sau lỗi/unknown write vẫn read-only; không tự mở lại ghi. Browser crash/process exit/Auth revoked/expiry thật báo Unknown/NOT_RUN hoặc Auth unavailable và lý do cần re-login; không copy credentials để tránh login.
7. **Kết thúc có chủ đích:** `finish` điều hướng private page sang about:blank, kiểm DOM/iframe trống rồi đóng context đúng cách; giữ SDK login trong owned profile cho lần sau. `verify-logout` là ca riêng gọi logout bình thường rồi kiểm private/session cleanup; chỉ chạy khi AC đang kiểm logout. Không logout sau mọi lượt. Cleanup lỗi giữ owner để chẩn đoán. `close` là đóng rõ ràng, không được ghi là logout proof. Không yêu cầu thêm login chỉ để chụp ảnh mới khi evidence cùng source/input còn hợp lệ.

## 3. CLI hiện có và recovery

Từ CMS cwd, pinned Node22, cached Chromium1248; cần quyền local cho lượt chạy live tương ứng. Lượt correction không yêu cầu user login hoặc chạy actual Project lại.

```sh
PINKY_MULTILINGUAL_READONLY_APPROVED=1 \
.local/cache/node/node-v22.23.3-darwin-arm64/bin/node \
scripts/multilingual-browser-session.mjs project-readonly <exclusive-output-id>
```

Nếu chạy qua exec API, bật `tty:true` để giữ stdin tương tác; plain-pipe EOF có thể làm owner sống nhưng không nhận lệnh. Không xóa profile lock hoặc tạo profile mới để vượt lỗi tool. `confirm-login` chỉ dùng sau LOGIN_WAIT_EXPIRED; trạng thái READY dùng wait-login hoặc readonly stage được cấp quyền.

Commands stdin: `status`, `readiness`, `reload-readonly`, `wait-login`, `confirm-login`, `verify-remember`, `verify-logout`, `resume-readonly project-1440`, `resume-readonly project-390`, `finish`, `close`. Readiness đã đạt không reload session. `verify-remember` là ca chỉ đọc: so identity/role trong RAM qua refresh và tab mới sau backend revalidation, không xuất UID/token. Đóng/mở lại cùng profile là proof riêng, phải quan sát `AUTH_RESTORED_READY`; không suy từ fixture storage sentinel. Startup lỗi chỉ cho status/readiness/close. `status` báo browser/page/response, mode, stages, mutation attempts; không đọc credentials. Hết login wait giữ owner, không tự mở tab/process mới.

Bản hiện tại có `reload-readonly`: sau khi sửa helper, dynamic import đúng module local cố định với generation mới, thay callbacks của các readonly stage đã đăng ký trong cùng owner/context/page. Không nhận module path/URL từ stdin, không thay write stage hoặc xóa checkpoints; gỡ response listener cũ. Retry assertion lỗi tạm thời dùng `resume-readonly`; lỗi code dùng `reload-readonly` rồi retry. Không reload trang CMS hoặc tự coi file trên disk đã có hiệu lực.

## 4. Áp dụng từng phase và evidence reuse

| Phase | Phần ghi | Phần chỉ đọc, dùng cùng owner hoặc không cần Auth |
| --- | --- | --- |
| P3 | Service/Work/Services trong exact9draft IDs của bundle; Project đã nghiệm thu chỉ đọc | UI/saved previews/source/QA/native accordion/dialog/switch; không lặp P3-REP CAS |
| P4 | Chỉ group IDs/locales được bundle cấp quyền | So từng section/template và full assembly; lỗi screenshot không lặp save |
| P5 | Submit/review theo exact snapshot/role budget | Queue/detail/eligibility; chỉ đổi session khi kiểm role/revocation thực sự cần, không vì assertion |
| P6 | Exact approved import plan và per-item checkpoint | Dry-run/coverage; lỗi sau commit không import lại item đã đạt |
| P7 | Activation riêng được Approved; không trộn với UAT ghi CMS | Full-template parity/HTTP/interaction không cần login CMS; lỗi UI không chạy lại import/activation |

Mỗi bundle phải trỏ policy này và có: phases/read-write split, source/runtime preflight, exact retained targets/budget, checkpoint/resume plan, cleanup owner, tests tái dùng và điều kiện làm evidence mất hiệu lực. Không tạo thêm reviewer/admission chain khi chỉ đổi trạng thái hồ sơ.

## 5. Bằng chứng và giới hạn

Unit10/10, ESLint6files và managed Chromium fixture1/1 đạt sau review fixes: injected visual failure + login timeout vẫn cùng browser/context/page/in-memory sentinel; sửa helper+reload readonly consumer rồi retry đạt trong cùng phiên, synthetic write chỉ1lần, CMS mutation denied, checkpoint không đổi và cleanup rõ ràng. Logs ở `.local/test-outputs/multilingual-001/harness-repair-v1/worker-checks-20261016-1138/`. Sandbox launch fail trước đó giữ nguyên, managed rerun không đổi policy/flags để vượt bảo vệ.

Fixture không phải actual Auth reuse. Actual Auth reuse trong lượt harness correction lịch sử là NOT_RUN. Verification mới của Auth nằm ở [task CMS-AUTH-REMEMBER-001](../tasks/CMS-AUTH-REMEMBER-001.md); không đổi kết quả lịch sử. Một lần normal login ban đầu chỉ cần khi owned profile chưa có phiên; sau đó giữ profile để dùng xuyên P3–P7. Cửa sổ hay tài khoản bị đóng/thu hồi thật vẫn có thể cần login lại; mục tiêu là assertion/harness timeout không tự phá phiên.

Auth verification bổ sung16/10: actual OWNER một login, refresh/newtab/backend revalidation và close/reopen same profile PASS; finish giữ SDK login và private release đạt. Helper đọc getSession phải import đúng script Auth đang nạp (same origin/path và optional numeric Vite `?t`), không bare import tạo instance thứ hai. Lint/narrow selector regression PASS; failed helper checkpoints giữ nguyên và đã recover cùng owner không re-login. Canonical proof/giới hạn theo task Auth.
