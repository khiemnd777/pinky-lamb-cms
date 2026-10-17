# CMS-AUTH-REMEMBER-001 v1 — nhớ đăng nhập trên thiết bị local

16/10/2026. **AWAITING_APPROVAL; chưa đổi Auth/source/profile.** [Exact10paths/pins](../../approvals/CMS-AUTH-REMEMBER-001-v1.scope.json), [task canonical](../tasks/CMS-AUTH-REMEMBER-001.md). Tạm ưu tiên trước bundle P3 còn lại.

## Hành vi đã xác minh và kết quả cần sửa

`admin/auth.mjs:10–12` cố định Firebase `inMemoryPersistence`; reload/tab/browser đóng làm mất Auth RAM. `apiFetch` timeout kiểm quyền15s gọi `endSession/signOut`; `onAuthStateChanged` cũng signOut khi mount/resource error chưa phân biệt lỗi mạng với mất quyền. Backend vẫn xác minh Auth/member mỗi request.

Harness hiện `chromium.launch`+`newContext`: profile tạm mới mỗi process. `finish` hiện gọi adapter normal logout, nên ngay cả có LOCAL persistence vẫn xóa remembered state khi kết thúc test. Đây là caller phải sửa cùng Auth; sửa1dòng persistence không đạt yêu cầu user.

Mục tiêu: mặc định tự nhớ Auth khi refresh, mở tab mới, đóng/mở lại cùng browser profile/origin. Mỗi browser/profile riêng cần lần đăng nhập ban đầu; không copy phiên Edge sang test. Chỉ logout rõ ràng/identity bị thu hồi hoặc quyền bị từ chối mới xóa remembered state. Network/API tạm lỗi không tự logout; private UI fail-closed cho đến quyền được xác minh lại.

## Thiết kế cụ thể

1. Dùng Firebase SDK LOCAL persistence, ưu tiên IndexedDB trong cùng origin `http://127.0.0.1:5173`; SDK restore/refresh token. Không tự viết logic lưu password/token JSON, không đổi SDK/version. Chờ Auth initialization xong rồi gọi `/api/cms/session`; không mount private UI từ cached role. Storage bị chặn phải có thông báo rõ, không tuyên bố đã nhớ khi chỉ có RAM.
2. Phân loại lỗi: network/15s timeout/5xx → clear private state và chặn thao tác, giữ Auth SDK, thông báo tải lại để thử kết nối mà không nhập lại credentials.401 sau refresh-retry,403membership và Auth invalid/revoked/user-disabled → signOut và cleanup. Giữ generation/AbortController/late-response protections, exact transport routes/host/origin/redirect và backendACL.
3. Giữ UI login hiện có, tự nhớ theo yêu cầu user, không thêm checkbox/password manager hoặc đổi layout. Logout thủ công vẫn xóa SDK persistence và private preview; các tab cùng profile nhận thay đổi Auth. Browser data do user xóa/Incognito/profile mới hoặc Auth revoked vẫn có thể cần login lại.
4. Harness dùng `launchPersistentContext` với duy nhất owned profile `.local/cache/multilingual-001/browser-profile` để tái sử dụng qua P3–P7. Parent directory0700 và `.local/` đã ignore; không đóng gói/backup/export/read nội dung profile, không bật lưu password. Đây là Firebase/browser session storage được user cho phép trong scope, khác credential copy/storageState export bị cấm.
5. Preflight nhận diện cả LOGIN_REQUIRED và AUTH_RESTORED_READY. Nếu session hợp lệ đã restore thì chạy bước được cấp quyền, không hỏi login. API/member kiểm lại bình thường. Không tạo profile mới mỗi run hoặc cố đồng bộ profile người dùng.
6. `finish` giải phóng private page/DOM/preview và đóng context đúng cách để browser lưu profile, giữ SDK login cho lần sau. Normal logout verification thành hành động riêng rõ ràng, chỉ chạy khiAC đang kiểm logout; không logout sau mọi lượt. `close`/failed assertion không âm thầm signOut. Helper readonly reload và write-attempt checkpoint giữ nguyên.

Thay đổi quyền/lifetime này chỉ local demo, không cookie/server-session mới, không hạAuth/ACL/CSP. Firebase SDK phải giữ refresh/session token trong browser storage để nhớ đăng nhập; không lưu password và không xuất token ra logs/chat/files artifacts.

## Triển khai và kiểm tra

Exact sources/callers/tests trong scope JSON: auth policy helper+auth.mjs; owner CLI/session cleanup và Project readonly adapter; unit/browser persistence tests, owner regression tests và synthetic Firebase stub của recovery test. Không sửa index/CSS/backend/rules/config/packages hoặc chạy recovery live lịch sử.

AC:

- Sau normal login, refresh/new tab/close-reopen cùng browser profile tự restore; private UI chỉ hiện sau GETsession xác nhận quyền.
- Temporary network/timeout/5xx giữ remembered identity, không hiển thị private UI khi chưa kiểm được quyền; retry/reload thành công không cần password.
- Invalid/revoked/disabled/401sau retry/403membership và explicit logout vẫn clearAuth/private iframe/blob/generation; không cached permission grant.
- Owned persistent profile được tái dùng, không đọc/copy credentials; finish đóng private UI nhưng lần sau vẫn restore; explicit logout riêng xóaremembered state.
- Harness injected assertion/helperreload vẫn giữ phiên, không replaywrites; profile unavailable/storage blocked phải báo đúng.
- Unit/controlled browser trước login. Browser fixture profile đóng/mở kiểm storage lifecycle, không được gọi là actual Firebase Auth proof. Actual demoOWNER lần đầu trong profile cần kiểm chỉ do user đăng nhập; sau đó test chỉ reload/tab/reopen, không yêu cầu nhập lại vì harness. Không tự đóng/restart toàn Edge của user, không tạo accounttest mới. Actuallogout có thể để user chủ động kiểm nếu không muốn làm mất phiên đang dùng; criterion thiếu ghiNOT_RUN.

Runtime: existing CMS5173/Auth9099 demo,0CMSwrites/0account-role mutations/0emulator orVite restart; source/HMR chuẩn bị xong trước login. Output riêng `.local/test-outputs/cms-auth-remember-001/v1/`; profile riêng như trên. Không actualAuth trong preparation này.

## Quyền và bàn giao

Đây là thay đổi chính sách persistence và cách logout của test, ngoàiP3-REP đã đóng và ngoàiP3 remainder chưa duyệt. Theo [APPROVAL-PROTOCOL](../../docs/APPROVAL-PROTOCOL.md): “Sau milestone Closed, mọi implementation mới cần fresh Approved, kể cả fix nhỏ.” Bundle cụ thể đã sẵn sàng; một approval bao routine fixes đúng10paths, không hỏi lại từngfile.

**`Approved CMS-AUTH-REMEMBER-001 v1 — nhớ đăng nhập local và profile test riêng`**

Sau implementation, re-pin các dependencies Auth/harness bị ảnh hưởng trong P3-REMAINDER còn proposed; không sửa acceptance/evidence lịch sử hoặc tự mở implementationP3.

Nguồn API: [Firebase Authentication State Persistence](https://firebase.google.com/docs/auth/web/auth-state-persistence), public declarations của Firebase12.19.0 hiện cài. LOCAL áp dụng trong cùng browser/profile/origin; không hứa đăng nhập xuyên Edge/Chrome/profile khác.
