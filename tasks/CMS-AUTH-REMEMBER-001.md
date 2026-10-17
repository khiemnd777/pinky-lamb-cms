# CMS-AUTH-REMEMBER-001 — canonical task

16/10/2026. **APPROVED / SOURCE_COMPLETE / RUNTIME_VERIFIED_SCOPED / HUMAN_ACCEPTANCE_PENDING.** [Approved scope/AC](../docs/CMS-AUTH-REMEMBER-001-v1.md), [exact before pins/approval](../../approvals/CMS-AUTH-REMEMBER-001-v1.scope.json), [verification receipt](../.local/test-outputs/cms-auth-remember-001/v1/verification-20261016-v1.json).

## Implementation đã hoàn tất

- Firebase SDK LOCAL mặc định: IndexedDB → localStorage → memory fallback. Storage bị chặn có thông báo; không lưu mật khẩu trong application code hoặc export SDK credentials.
- Auth initialization chờ SDK restore; private UI chỉ mount sau backend session xác nhận membership/role. Network/timeout/5xx tạm thời giữ identity, chặn private UI và cho phép reload để xác minh lại. Lỗi business save thông thường giữ editor/input; terminal401/403/invalid Auth hoặc logout vẫn clear đúng policy.
- Test dùng owned persistent profile `.local/cache/multilingual-001/browser-profile`, parent/profile0700, ignored `.local/`, một owner. `finish` giải phóng private DOM/iframe và đóng context, giữ SDK login. `verify-logout` là ca riêng có chủ đích. Assertion/login timeout/helper reload không tự phá phiên hoặc replay writes.
- Sole implementation writer Medium sửa đúng10paths; root review/docs/runtime. Independent Auth review không còn findings sau sửa IDB disposable marker thành transaction PUT hoàn tất; chỉ xóa DB marker riêng.8readonly dependencies khớp. Backend/ACL/roles/CSP/routes/config/package/baseline không đổi;0CMSwrites/0account-role mutations/0emulator hoặcVite restart.

## Verification và giới hạn

| Criterion | Evidence/status |
| --- | --- |
| Policy, transient vs terminal, Auth restore/private teardown, business error | PASS11/11 policy + real Auth module synthetic; không phải actual account proof |
| Owner checkpoint/read-only retry/login timeout | PASS10/10; evidence cùng source còn hợp lệ |
| Recovery read-only admission và bounded transport | PASS3/3. VM stub thiếu contract bindings đã sửa, assertions giữ nguyên; RED và GREEN riêng |
| Persistent browser lifecycle/failure/helper reload | Managed Chromium fixture PASS1/1; storage sentinel synthetic, không suy Firebase identity |
| Lint/build/review |10paths lint PASS, affected recheck PASS; isolated final Vite build PASS; Auth review no findings. Known brand-diagonal asset warning giữ nguyên |
| Actual owned profile/readiness | Parent/profile0700; LOGIN_READY/title/app/backend anonymous401 và responsive owner đã quan sát. Cửa sổ đã kết thúc đúng cách sau verification; profile được giữ |
| Actual OWNER refresh/tab mới/close-reopen | PASS: một normal login đầu tiên; refresh và tab mới giữ cùng identity/role trong RAM, backend revalidated. Hai lần mở lại đúng profile trả AUTH_RESTORED_READY, final owner xác minh OWNER; không login lần hai |
| Actual explicit logout/revocation/other roles | NOT_RUN; không chủ động logout làm mất phiên cần giữ. Controlled coverage ghi riêng |
| Human acceptance | PENDING; không tự đóng milestone |

Logs/source pins: `.local/test-outputs/cms-auth-remember-001/v1/worker-20261016-v1/`; final build `root-build-final-20261016-v1/build.log`; actual owner `actual-login-20261016-v1/`. Browser sandbox launch failure và IDB RED/recovery RED giữ nguyên; managed rerun không sửa sandbox flags/policy.

**Runtime đã chốt:** `actual-login-20261016-v1` cuối cùng PASS remember/finish sau nạp lại helper trong cùng owner. Lỗi helper bare import `/auth.mjs` đã sửa thành đúng module entry Vite `?t=<số>` đang nạp, không chạy Auth instance thứ hai; giữ assertion identity/role. Diagnostic chỉ enum/boolean, không UID/email/token/page content. Failed checkpoints giữ nguyên, không login lại. `actual-reopen-20261016-v1` đạt AUTH_RESTORED_READY; tool stdin plain pipe đóng nên không nhận finish. Đã xác minh đúng task PID/browser profile, SIGTERM riêng browser/owner (không SIGKILL, không emulator/Edge); cleanup receipt giữ riêng. `actual-reopen-20261016-v2` dùng PTY, AUTH_RESTORED_READY → remember PASS OWNER → finish PASS private release/context close, exit0. Không hỏi login thứ hai.

**Bước kế tiếp:** human nghiệm thu Auth; P3-REMAINDER vẫn chờ approval riêng. Profile có sẵn được tái sử dụng; preflight phải nhận AUTH_RESTORED_READY và không hỏi đăng nhập khi phiên hợp lệ. Explicit logout/clear browser data/revocation có thể cần login mới, không phải assertion failure.

P3-REMAINDER proposed đã re-pin Auth/harness/testing-policy sau thay đổi, vẫn52application paths và AWAITING_APPROVAL/implementationfalse; không đổi9draft targets/budget. [Testing policy P3–P7](../docs/MULTILINGUAL-001-TESTING-v2.md) áp dụng finish/persistence mới. P3-REP acceptance/historical evidence, P1/P2, M3/M4 và LOCAL_COMPLETE giữ nguyên.
