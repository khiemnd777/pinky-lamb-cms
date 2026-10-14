# CMS-001 v2 — M1 local/emulators: technical review

Ngày 11/10/2026. **M1 REVIEW_READY — technical PASS với các giới hạn bên dưới.** High đã review contracts, source, Checkpoint A/B, các log cuối và ảnh desktop/mobile thực tế. Lần độc lập task09 đạt9/9; final gate đạt28 unit +30 emulator integration +37 browser, lint/build PASS. Chờ người dùng review; chưa Closed hoặc nghiệm thu. Toàn CMS chưa LOCAL_COMPLETE.

## Quyền và kết quả trong phạm vi

Người dùng đã gửi chính xác `Approved CMS-001 v2 — M1 local/emulators`. [Approval register](../../approvals/APPROVAL-REGISTER.json) giữ lời duyệt và frozen digests. Chỉ `demo-pinky-lamb-cms` cùng emulators loopback được sử dụng. Source nằm trong 52 đường dẫn đã duyệt của `pinky-lamb-cms/`; root register là ngoại lệ ghi evidence đã được cho phép.

M1 triển khai đăng nhập Email/Password, membership và bốn role; Hero/SEO editor với finite legacy asset picker; revision/CAS và idempotency; private preview của Draft đã lưu hoặc Snapshot được chọn; immutable submit và exact-hash review; offline static QA export. OWNER cũng không được tự duyệt. PUBLISHER trong M1 chỉ có quyền đọc. Không có upload media, full-site editor, publisher/current pointer/history/rollback hoặc backend nhận lead.

High dùng runtime High cho thiết kế/review/audit; hai worker dùng Medium thực tế cho application/config và viết/chạy tests. Pinned engineering skills đã được đọc theo từng phase; vendor không được cài/kích hoạt vào runtime. Đây là export không có `.git`, không tạo commit hoặc giả diff Git.

## Requirement → evidence

| Acceptance / SPEC oracle | Bằng chứng thực tế |
| --- | --- |
| Auth, current membership/role, deny anonymous/unknown/inactive/unverified, chống tự cấp quyền | `tests/acl.rules.test.mjs`, `tests/login.local.test.mjs`; Checkpoint A |
| C-01/02/04/05: strict Hero/SEO, lưu/mở lại, unknown keys/asset/URL/size, CAS và retry | Contract/unit, `tests/drafts.integration.test.mjs`, `tests/hero-editor.local.test.mjs` |
| C-03/08: encoded copy, inert sandbox, saved/Snapshot preview, logout và response cũ | Renderer/unit; Hero browser; `tests/m1.e2e.test.mjs`; Checkpoint B |
| C-06/07: immutable Snapshot, independent hashes, self-review cả OWNER, competing decisions, replay/corruption | `tests/review.integration.test.mjs`; independent task09 browser |
| C-09: static Hero/SEO một H1 với JS tắt; public bytes/manifest; baseline interactions và no private leakage | Independent task09 export/browser, desktop/mobile images, filesystem negative tests |
| C-10/11: demo/host guards, SDK Rules deny, private dev paths và catalog projection | Guard/unit; ACL/API; browser request and persistent-storage captures |
| C-12/13: nested heading codec/caps, malformed persisted data và HTTP raw transport | Draft/review integration; exact source/hash-bound CLI parser guard |

Task09 fresh 9/9 đạt trong 16.9 s: [.local/cache/task09-browser-main-final.log](../.local/cache/task09-browser-main-final.log), SHA256 `950f43e3021ca7a0d455cf8fac36c16ee1cc111edc2173c92e6a36adabbb9b9b`. Chín JSON evidence hiện tại, từ full37 rerun, ghi 641 responses tới loopback, blocked/unexpected errors 0; private localStorage/sessionStorage/CacheStorage/database 0. Firebase SDK heartbeat store chỉ chứa metadata theo allowlist; không chứa session/content/token. Expected refusal/race responses là oracle, không bị coi là success giả.

Gate toàn bộ sau source freeze **PASS**, chạy tuần tự 07:17:57–07:18:50 UTC ngày11/10: lint exit0; unit28/28 (14 guard +8 contract +6 renderer); emulator integration30/30 (10 Auth/Rules +8 Draft +12 review); build exit0; browser37/37 (11 login +17 editor/preview +9 workflow/export), không fail/skip. High đọc trực tiếp stage summary và các log cuối. [QA-M1](QA-M1.md) giữ commands/artifacts; [.local/cache/m1-final-gates-summary.json](../.local/cache/m1-final-gates-summary.json) SHA256 `09d58a5cca0c9cb44dc34183ed4af4e711c7ba8918e778ba706d15eb98c2f7b7`. Worker chạy exact package-script target qua isolated Node và local guard. Không cộng các lần cũ để thay gate cuối.

## Findings đã xử lý

- Replay được kiểm tra với đúng effect/resource/current actor; terminal ReviewState phải tham chiếu Review hợp lệ. Corruption tests so sánh toàn bộ state sau khi tạo corruption và trước restoration.
- API generation được kiểm tra lại sau `response.json()`. Response403 cũ không làm mất session mới; `SELF_REVIEW_FORBIDDEN` giữ session nhưng không cấp quyền.
- Build từ chối symlink/dangling symlink ở `admin-dist` trước khi empty output. Export validate hoàn toàn trước ghi, preflight symlinks/targets, thay known file bằng exclusive temporary sibling + rename và giữ unknown regular files. Hard link không làm truncate inode khác.
- Snapshot preview dùng heading/accessibility label đúng mode; ID/hash dài wrap trên mobile. Review POST đã thành công vẫn giữ trạng thái terminal khi follow-up GET lỗi; retry giữ cùng intent.
- Baseline có ornament Hero làm trang rộng395 px tại viewport390. Body clip chưa sửa được lỗi và lần RED được giữ lại. Đo độc lập xác định fixed `main#main` clip đưa document/body về390, giữ note/content trong viewport và cuộn dọc. Hai adapter PRIVATE/QA_EXPORT dùng containment cố định này; baseline CSS, renderer Hero và template version không đổi. [.local/cache/task09-containment-matrix.json](../.local/cache/task09-containment-matrix.json) và [.local/cache/task09-main-containment-repair.log](../.local/cache/task09-main-containment-repair.log) giữ evidence. Export có nhãn `Bản thử local — chưa xuất bản`.

Export desktop/mobile đã được High xem. Full-page CMS images ban đầu có iframe ngoài viewport chụp trắng; không dùng ảnh đó làm paint proof. High đã xem thêm normal CMS viewport với Snapshot paint đúng ở desktop/mobile, review panel và full-child artifacts1440×900/390×844. Full-child capture chỉ thay layout của parent để chụp toàn khung rồi restore; srcdoc/hash/sandbox/kích thước/nội dung child không đổi. Normal CMS dùng scroll region; phần khung rộng hơn vùng parent vẫn cuộn được bằng bàn phím, đã có oracle trong final37. Read-only capture ghi57 loopback requests, errors/blocked0, editorial mutations0 và logout clear. [.local/cache/task09-visible-snapshot-proof.json](../.local/cache/task09-visible-snapshot-proof.json) SHA256 `26baac22454b99c681a5034236d4d979dbe2d7064843ce98b5afad1ff035c23b`. Nguyên nhân ảnh trắng ban đầu có thể do thời điểm compositor; đây là suy luận, không khẳng định lỗi ứng dụng hoặc nguyên nhân đã verified.

## Bảo toàn, dữ liệu và giới hạn

Final audit sau docs/gates được lưu ở [.local/cache/preservation-final.json](../.local/cache/preservation-final.json): 93 baseline files, 40 faithful read-only copies và 212 vendor entries khớp hash; 18 frozen documents/canonical scope không đổi; root SHA256SUMS chỉ khác approval register đúng ngoại lệ. Đủ52 source files nằm trong allowlist, không có source path ngoài phạm vi. Lockfile vẫn khớp bản đã pin. Source hash inventory nằm trong cùng evidence để review được đúng bản bàn giao.

Tests chỉ dùng identities/content tổng hợp. Cleanup khôi phục original content bằng supported PATCH/CAS; revision/audit/Snapshot/Review hợp lệ được giữ, không rewind hoặc xóa lịch sử để làm xanh tests. Temporary memberships/corruption được restore riêng. Offline `approved-hero.json` là fixture tổng hợp, không phải editorial approval hoặc publication của khách hàng. Hash kiểm tính toàn vẹn, không phải chữ ký hoặc xác nhận quyền/claim. SourceReference vẫn UNVERIFIED, claim bindings rỗng; không tạo source registry thật.

Saved dependency audit còn **0 Critical / 3 High / 2 Moderate**. High đã rà reachable fixed CLI watcher và nhánh PubSub không được kích hoạt trong cấu hình bốn emulators. Đây là mitigations có điều kiện của runtime local đã pin, không phải audit sạch, audit mới hoặc chứng minh không thể khai thác. Node network fence không bao phủ Java/OS. Xem [DEPENDENCIES](DEPENDENCIES.md).

Chưa kiểm chứng Safari/iOS, physical mobile, mail client/clipboard end-to-end, backup/restore hoặc full CMS acceptance. Runtime không cần Firebase login, tài khoản thật, Blaze, billing hay IAM. Root `firebase.json` historical không được dùng/sửa; không có cloud writes/deployment/production verification.

## Bước tiếp theo được đề xuất

High kết luận **M1 technical PASS / REVIEW_READY** trong đúng scope CMS-001 v2. Approval register giữ local acceptance null và milestone còn mở. Người dùng review trước khi quyết định đóng M1; không tự điền acceptance hoặc Closed. Toàn CMS chưa LOCAL_COMPLETE.

Batch M2 đề xuất: đặc tả full-site content/templates cho Header, Projects, Services, About, Reel, IP, Contact và Footer; chuyển 6 services/8 projects có nguồn sang controlled contracts; định nghĩa claim/source bindings, variant/order/visibility và đồng bộ navigation/contact. Giữ artwork/logo, scope trống khi thiếu nguồn và brief mailto/copy. Cần detailed SPEC, API/storage contracts, file/task budget ≤5, acceptance/negative tests và Approved M2 riêng trước coding. M3 media/quarantine/derivatives và M4 local publication/history/rollback/full regression/backup-restore vẫn cần kế hoạch và Approved riêng. Production không thuộc gói.
