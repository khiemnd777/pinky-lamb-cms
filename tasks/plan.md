# CMS-001 v2 — milestone plan

## Trạng thái hiện hành — đã hoàn tất theo xác nhận của Khiêm

Ngày ghi nhận: **17/10/2026**, Asia/Ho_Chi_Minh. Trạng thái đóng hồ sơ: **ĐÃ HOÀN TẤT / CLOSED_BY_HUMAN_CONFIRMATION**. Chủ cập nhật tài liệu: phiên chính hiện tại.

### Nguồn xác nhận và phạm vi cập nhật

Khiêm xác nhận trực tiếp trong cuộc hội thoại:

> các plan này đã xong hết rồi.

Khiêm giao đồng bộ hồ sơ bằng chỉ đạo tiếp theo:

> Đồng bộ các hồ sơ plan/task thành đã hoàn tất theo xác nhận của tôi. Chỉ cập nhật tài liệu, không sửa code hay chạy lại kiểm thử.

Xác nhận này đóng các kế hoạch CMS, UI/recovery và đa ngôn ngữ đã được trao đổi trong cuộc hội thoại, theo bảng dưới đây. Đây là nguồn trạng thái hiện hành của các hồ sơ được đồng bộ; không dùng nhãn cũ để tự mở lại công việc hoặc yêu cầu nghiệm thu lại.

| Kế hoạch / phạm vi | Trạng thái hiện hành | Hồ sơ liên quan |
| --- | --- | --- |
| CMS-001 v2 — M1 | Đã hoàn tất; giữ xác nhận đóng trước đây | [Tasks M1](todo.md) |
| CMS-001 v2 — M2 | Đã hoàn tất; giữ xác nhận đóng trước đây | [Plan M2](../pinky-lamb-cms/tasks/M2-plan.md) |
| CMS-001 v2 — M3 | Đã hoàn tất theo xác nhận của Khiêm | [Plan M3](../pinky-lamb-cms/tasks/M3-plan.md), [review lịch sử](../pinky-lamb-cms/docs/M3-REVIEW.md) |
| CMS-001 v2 — M4 và kế hoạch hoàn tất CMS local | Đã hoàn tất theo xác nhận của Khiêm | Phạm vi M4 trong phần kế hoạch lịch sử bên dưới; [trạng thái CMS](../pinky-lamb-cms/docs/PROJECT-STATE.md) |
| UI-APPLY-001 v2, CMS-UX-002 v2, CMS-UX-003 v6 | Đã hoàn tất theo xác nhận của Khiêm; giữ nghiệm thu CMS UX trước đây | [UI-APPLY](../pinky-lamb-cms/tasks/UI-APPLY-001.md), [UX-002](../pinky-lamb-cms/tasks/CMS-UX-002.md), [UX-003](../pinky-lamb-cms/tasks/CMS-UX-003.md) |
| HOME-V3-RECOVERY-001 v2 và CMS-RECOVERY-001 v2 | Đã hoàn tất theo xác nhận của Khiêm | [Home v3](../pinky-lamb-cms/tasks/HOME-V3-RECOVERY-001.md), [CMS recovery](../pinky-lamb-cms/docs/CMS-RECOVERY-001-REVIEW.md) |
| MULTILINGUAL-001 v2 — P0–P7, gồm P1 v2/A2, P2 v1, P3 đại diện/phần còn lại và P7 v3 | Đã hoàn tất theo xác nhận của Khiêm | [Plan P0–P7](../pinky-lamb-cms/docs/MULTILINGUAL-001-v2.md), [tasks P0–P7](../pinky-lamb-cms/tasks/MULTILINGUAL-001-v2.md), [P7 v3](../pinky-lamb-cms/docs/P7-v3-LOCAL-ACCEPTANCE.md) |

### Bằng chứng lịch sử và giới hạn của lần đồng bộ

- Chỉ bổ sung trạng thái đóng và liên kết vào 30 tài liệu Markdown hiện có. Nội dung trước xác nhận được giữ nguyên bên dưới mục lịch sử của từng file. Các bản v1 đã bị thay thế, proposal/scope/register JSON, manifest/lock, báo cáo kiểm thử và artifacts gốc giữ nguyên.
- Các nhãn cũ như AWAITING_APPROVAL, IN_PROGRESS, HOLD, HUMAN_ACCEPTANCE_PENDING, READY_FOR_USER_ACCEPTANCE và checkbox chưa đánh dấu là ghi nhận tại thời điểm cũ. Chúng không còn mô tả trạng thái mở của các plan/task đã đóng trong bảng trên.
- Kết quả PASS/FAIL/NOT_RUN, giới hạn kiểm chứng, cờ kỹ thuật LOCAL_COMPLETE/cms_complete và bằng chứng runtime trước đây không được viết lại. Đóng hồ sơ theo xác nhận người dùng không tạo thêm bằng chứng kỹ thuật. Proposal preview navigation được khép lại trong hồ sơ; không suy ra tính năng đó đã được triển khai từ việc đóng plan.
- Không xác minh lại runtime, activation :5010 hoặc Production; không ghi nhận thêm release. Chỉ đạo này không cấp quyền sửa ứng dụng, ghi dữ liệu, chạy dịch vụ/kiểm thử, Git hoặc deploy.
- Rà soát tài liệu: các bổ sung và liên kết trỏ về hồ sơ này; phần nội dung lịch sử được giữ nguyên. Không chạy lại test, lint hoặc build. Việc ngoài các plan trong bảng, gồm các task agent/tooling riêng, giữ phạm vi và bằng chứng riêng.

Bước tiếp theo: Khiêm có thể xem bản đồng bộ trong hồ sơ này; công việc mới cần yêu cầu riêng, không tự tiếp tục plan đã đóng.

## Kế hoạch và bằng chứng lịch sử trước xác nhận đóng


Ngày 11/10/2026. **M1 AWAITING_APPROVAL; CMS NOT_IMPLEMENTED.** Proposal [CMS-001 v2](../docs/CMS-PROPOSAL-CMS-001-v2.md); full spec [CMS-ARCHITECTURE](../docs/CMS-ARCHITECTURE.md); task list duy nhất [todo](todo.md).

## Trước Approved

Inspect/read/research/spec/plan/review theo quyền đã cấp; agent báo proposal và WAIT trước implementation. High reasoning/plan/review/audit; Medium coding/draw/generate/unit test. Đối chiếu source lock, actual runtime và baseline; không activate config/plugin hoặc viết product code.

## M1 được xin duyệt

Mục tiêu: Auth/member roles → Hero/SEO edit → save revision → private preview → immutable submit/review, local/emulators only. Isolated root `pinky-lamb-cms/`, demo project `demo-pinky-lamb-cms`, loopback/fail closed; public baseline read-only. M1 gồm local config/dependencies/tests được chốt trong scope, không cloud writes. Stack/API exact ở proposal/spec; local dependency/download/cache/build/test/emulator outputs được phép trong designated isolated dirs, Firebase runtime traffic chỉ demo+loopback.

Luồng checkpoint: contract/setup/validator/ACL/login → **A auth+guard review** → draft/editor/preview → **B Hero/private preview review** → snapshot/review/export-local/e2e → High final review. Các checkpoint là review kỹ thuật trong cùng slice M1 đang mở, không user approval tự động cho milestone khác.

M1 không gồm account thật, upload thật, cloud publisher, Security Rules cloud, Blaze, CI/protection setup, migration/deploy/public preview channel hoặc backend lead/email. Sửa trong phạm vi để đạt AC được phép sau Approved M1; thay scope material/ngoài allowlist trình version mới. Khi M1 đóng, mọi implementation mới cần fresh Approved. Session/compaction không hủy Approved còn mở đúng scope.

## Các mốc hoàn thành CMS local — mỗi mốc cần Approved riêng

| Milestone | Phạm vi dự kiến | Gate và verify |
|---|---|---|
| M2 Toàn site content/templates local | Header/nav, Hero, Clients, Work/projects/gallery/categories, Services, About, Reel, IP, Contact, Footer, SEO; controlled approved variants; full-site exporter/provenance import | M1 accepted; detailed M2 spec/tasks/paths/AC và Approved; schema/ref/claim tests, six service/eight case mapping, no-JS metadata, keyboard/desktop/mobile |
| M3 Media và private preview local | Storage emulator local upload/quarantine, trusted MIME/size/decode/derivative validation, rights/source binding, private originals/catalog, authenticated full-site preview | Detailed M3 spec/tasks/Approved; same demo project/loopback; spoofed MIME/oversize/XSS/unauthorized private reads; logout clear; public-only projection |
| M4 Local publication và hoàn tất | Full static filesystem export; deterministic artifact manifest/hash; idempotent serialized jobs; atomic current pointer; version history/rollback; full regression/usability/backup-restore và nghiệm thu | Detailed M4 spec/tasks/Approved; filesystem failure/concurrency/retry/rollback tests; preserve draft; reproducible runbook; High review; user local acceptance |

Không có Hosting REST adapter/mock, cloud release automation hoặc milestone production trong gói. M2–M4 là kế hoạch local chưa final implementation todo; trước từng mốc chia task có dependency/owner/<=5 files/AC/evidence tương tự M1. Một file một người ghi.

## LOCAL_COMPLETE và nghiệm thu

LOCAL_COMPLETE chỉ được ghi khi toàn CMS local đã đạt:

- Editor quản lý toàn bộ section và variant đã engineered/Approved; schema, nguồn claim và asset refs đúng, không arbitrary theme/code.
- Media local có quarantine, MIME/size/decode validation, derivatives, rights/provenance; original/private metadata không lọt public projection.
- Authenticated full-site preview đúng revision; logout xóa private preview/token; ACL chặn anonymous/unknown/inactive/unverified, role tamper và self-review kể cả OWNER.
- Save có revision conflict/idempotency; immutable snapshot và exact-hash review; local publication tạo full-site static artifact, history/current pointer và rollback giữ draft hiện tại.
- Unit, Rules/ACL, API integration, browser desktop/mobile và static SEO/XSS/workflow/rollback regressions có evidence thật; runbook setup/backup/restore lặp lại được; usability và limitations được báo rõ.

High technical review đạt và LOCAL_COMPLETE kỹ thuật chưa phải nghiệm thu người dùng. Ghi user local acceptance riêng bằng lời/reference thực tế; không tự điền vào ledger. M1 closed không cho phép tự implement M2–M4.



M1 setup cho phép **một lần khởi tạo** `public-baseline/` bằng copy byte-identical 39 file từ bundled `dist/` và `FONT-NOTICES.txt` nếu cần; xác minh SHA từng file rồi giữ read-only. Đây là faithful setup copy, không quyền sửa/rewrite public baseline hoặc website original. Cũng có thể dùng read-only reference/mount tới bundled dist nếu môi trường hỗ trợ. Official JDK21/emulator/Playwright browser binaries và dependency/docs downloads/cache có thể đặt dưới `.local/` trong tooling setup đã duyệt; Firebase app/API runtime vẫn chỉ demo+loopback, không bypass guard.

## Rollback và delivery

M1 dừng local/emulator processes; rollback isolated diff/copy theo chỉ dẫn và giữ user edits/evidence, không có cloud state để rollback. Giao diff, lock/tool versions, local runbook, unit/Rules/API/browser results và limitations, ảnh/render cần thiết, bằng chứng no-cloud, findings High và trạng thái local/private preview thật. Không gọi local pass là production-ready.
