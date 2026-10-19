# CMS-001 v2 — đề xuất CMS Pinky Lamb

**Ngày 11/10/2026. Trạng thái AWAITING_APPROVAL. CMS NOT_IMPLEMENTED.** Bản này xin phép **M1 local/emulators**; deployment ngoài gói. Đặc tả và workflow đã được chuẩn bị theo yêu cầu, nhưng chưa có product code/prototype/config/infra/deploy mới.

## 1. Quyết định để duyệt

CMS-001 v2 điều chỉnh phạm vi gói thành **CMS đầy đủ local từ đầu đến cuối**, giữ M1 first slice như phiên bản trước. User scope clarification chỉ cho sửa handoff, chưa Approved implementation. CMS dự kiến có Email/Password emulator, membership/roles, editor tiếng Việt, template được kiểm soát, media local, nháp/preview/review, local static publication/version history/rollback. Public baseline vẫn HTML/CSS/vanilla JS; không public Firestore runtime hoặc framework migration.

**Phạm vi toàn gói: CMS đầy đủ LOCAL.** Chỉ Firebase demo `demo-pinky-lamb-cms` và emulators loopback; không tài khoản thật, Firebase login, Blaze, billing hoặc IAM làm điều kiện local. Production/deploy ngoài gói; chỉ đề xuất riêng sau khi toàn CMS đạt LOCAL_COMPLETE và người dùng nghiệm thu. M1 là first slice, không phải LOCAL_COMPLETE. M2–M4 phải có đặc tả/task/Approved riêng.

## 2. Scope xin Approved — M1

**Environment:** isolated local root `pinky-lamb-cms/` tương lai, Firebase emulators với project demo `demo-pinky-lamb-cms`, loopback. Website original và baseline public giữ read-only. Auth user và dữ liệu đều fixture giả; không yêu cầu mật khẩu/email admin thật.



**Tooling preflight M1-01a:** Node22 ≥22.12/npm và **JDK 21+** (đề nghị Java21 LTS, exact patch ghi lại); kiểm `java -version` và compatibility chosen pinned CLI/emulator binaries trước start. Root đối chiếu CLI firebase-tools 15.33.0 local có `MIN_SUPPORTED_JAVA_MAJOR_VERSION=21` tại `lib/emulator/commandUtils.js`; không chỉ dựa generic webdocs về transition Java21. Không cài Java/tooling trong lượt handoff.

`cms-api/package.json` là npm workspace member và Functions source metadata: main/type=module/engines Node22, runtime dependencies firebase-admin/firebase-functions/zod; **chỉ root package-lock.json**, không tạo API lockfile khác. Lint dùng `eslint.config.mjs` được viết trong CMS-M1-02 và source allowlist, với ESM/browser/Node contexts đúng thực tế. Malicious synthetic fixture thuộc CMS-M1-02; approved Hero fixture thuộc CMS-M1-09 để mỗi task ≤5 files. Fixture JSON đã commit là input có nguồn synthetic, không generated-output permission.

M1 chứng minh: **member login → Hero/SEO edit → save revision → private preview → immutable submit/review**, kèm local static export để QA. Hero chỉ variant `hero-split`, media picker catalog legacy; phần khác là baseline read-only. Có fixture editor/reviewer/publisher/owner, unknown UID, inactive và unverified. Không có signup UI; tự signup bằng API không tạo membership. Role không được client tự gán. M1 cấm self-review với **mọi role kể cả OWNER**; owner override chỉ là khả năng policy tương lai, cần policy proposal/Approved riêng.

Save có expectedRevision và transaction; hai editor chỉ một người save thắng, không overwrite im lặng. Snapshot bất biến, review gắn exact hash; sửa draft sau submit không đổi snapshot. Private preview ở admin authenticated, không phải Firebase Hosting preview URL chia sẻ. Preview phải encode text/chặn script URLs và không rò token/provenance/private draft; clear khi logout.

**Stack đã chọn:** vanilla JavaScript ESM `.mjs` + JSDoc + Zod; Vite chỉ admin dev/build; Node.js 22 (≥22.12) + npm. Exact Node patch/npm/package releases pin tại CMS-M1-01a sau compatibility audit; một npm workspace/root lockfile. Runtime packages firebase/firebase-admin/firebase-functions/zod; dev vite/firebase-tools/@firebase/rules-unit-testing/@playwright/test/eslint; Node native `node --test` unit runner.

**API đã chọn:** Firebase v2 HTTP `onRequest` function `cmsApi` trong Functions emulator, REST `/api/cms/...`, Vite proxy tới loopback Functions URL; không standalone Express hoặc callable alternative. Auth emulator token in memory, Admin SDK chỉ Firestore emulator; browser direct writes deny. Session GET, draft GET/PATCH, snapshot POST/GET và review POST đều bắt buộc M1. Auth/Firestore/Functions/Hosting emulators đều bắt buộc cùng demo project, loopback/fail closed; không ADC/service account thật hoặc Storage/Hosting REST cloud.

Dependencies/config local, runtime validators, API adapter và test scripts chỉ được viết sau Approved. M1 cho phép dependency/docs downloads và local dependency cache/node_modules/build/test/emulator outputs trong isolated designated dirs; **Firebase app/runtime traffic vẫn chỉ demo+loopback**, không cloud APIs. Dependency install không được đánh đồng với Firebase cloud runtime permission. App/API **fail closed** khi thiếu emulator/demo guard, không fallback production. Local export không gọi Hosting REST hoặc dùng cloud credential. M1 không có nút giả “Đã xuất bản”.

Tasks có owner/dependency/likely file budget/acceptance/verification ở [tasks/todo](../tasks/todo.md); milestones ở [tasks/plan](../tasks/plan.md). Proposal không duplicate task list. Task IDs **CMS-M1-00, CMS-M1-01a, CMS-M1-01b, CMS-M1-02…CMS-M1-10**; checkpoints A/B là technical reviews trong M1 còn mở. Mỗi task thường ≤5 files; không tạo app source trong handoff preparation.

## 2A. Nội dung động, template và người dùng CMS

Matrix dưới mô tả target CMS theo kế hoạch local; **M1 chỉ Hero/SEO, catalog legacy, nháp/preview/review local**. Các section khác chưa CMS-managed. Client chọn nội dung và variant **đã engineered + Approved + QA**; không tự sửa theme source. Sau khi workflow editorial được triển khai, thay text/content và chọn variant có sẵn đi qua quyền duyệt nội dung, không cần engineering Approved cho từng câu chữ. Thêm variant/schema/code hoặc đổi behavior cần engineering proposal mới.

| Phần | Client có thể chỉnh trong target local | Guardrail/template | Mốc |
| --- | --- | --- | --- |
| Header/nav | Label, logo catalog, order link tới section bật | Anchor ID ổn định, logo có nguồn, không script | M2 |
| Hero | Eyebrow, heading/emphasis, copy, CTA, ảnh/alt, note | `hero-split` M1; centered chỉ sau engineering+QA | **M1** |
| Clients | Logo/alt/order/visibility | Quyền dùng và nguồn; không suy endorsement | M2 |
| Work | Heading/intro, featured/order/filter labels | ID/category ổn định, count sinh từ data | M2 |
| Services | Title/Vi/summary/scope/order/visibility | Accordion mặc định; cards cần engineered variant | M2 |
| About | Copy/facts có claim binding/source | Không suy năm thành lập từ 15+ năm kinh nghiệm | M2 |
| Reel | Video/poster/caption/duration | Catalog/rights/validation, media tải theo nhu cầu | M2 |
| IP | Copy/disciplines/artwork/CTA | Không tạo IP đã launched khi chưa nguồn | M2 |
| Contact | Email/tel/address/social/intro | Đồng bộ href/recipient; brief vẫn mailto/copy | M2 |
| Footer | Copy/social/copyright | Giữ wordmark/font licence; no arbitrary script | M2 |
| SEO | Title/description/OG image+alt/copy | Publish HTML; canonical/base URL quyền quản trị | **M1 Hero/SEO local**, whole-site sau |

Brand tokens dùng controlled presets có QA, không arbitrary CSS/color/font uploads. Header/Hero/Contact/Footer cố định; order/visibility body chỉ trong vùng/variant được phép ở full editor, đồng bộ nav/service interests. Dữ kiện mới bind source verification tới exact claim value/hash; editor không tự đánh verified; claim factual chưa xác thực chặn full publish.

| Role | Quyền target | M1 |
| --- | --- | --- |
| Editor | Read/edit draft, chọn media, submit snapshot | Fixture local; không tự duyệt/publish/assign role |
| Reviewer | Read preview, approve/reject exact snapshot hash | Fixture local; self-review cấm |
| Publisher | Publish/rollback snapshot được duyệt qua local publisher | Chỉ fixture quyền; không local publication trong M1 |
| Owner | Membership/admin và quyền quản trị được policy nêu | Fixture local; **self-review vẫn cấm**, no cloud/IAM/billing |

UID active/verified membership là căn cứ quyền, không email domain hoặc login đơn thuần. User không dùng chung password; role/verification/membership fields không client-write. Engineering và local acceptance vẫn là quyền riêng với CMS editorial. Owner override/self-review nhỏ-team chỉ là đề xuất policy tương lai cần Approved riêng.

M1 setup cho phép **một lần khởi tạo** `public-baseline/` bằng copy byte-identical 39 file từ bundled `dist/` và `FONT-NOTICES.txt` nếu cần; xác minh SHA từng file rồi giữ read-only. Đây là faithful setup copy, không quyền sửa/rewrite public baseline hoặc website original. Cũng có thể dùng read-only reference/mount tới bundled dist nếu môi trường hỗ trợ. Official JDK21/emulator/Playwright browser binaries và dependency/docs downloads/cache có thể đặt dưới `.local/` trong tooling setup đã duyệt; Firebase app/API runtime vẫn chỉ demo+loopback, không bypass guard.

## 3. Acceptance trước đóng M1

- Fixture member login và quyền đúng; anonymous/unknown/inactive/unverified không đọc/mutate; browser/direct SDK không tự gán role hoặc sửa snapshot/review trái phép.
- Hero và SEO save/reopen đúng revision; validation giới hạn/unknown keys/asset ref/script CTA/oversize; hai-client conflict và retry/idempotency có evidence.
- Desktop/mobile private preview đúng Hero; text tiếng Việt dài/keyboard/focus/error states dùng được; XSS payload không chạy, one h1; metadata nằm trong local exported HTML.
- Immutable submit/review gắn exact content hash; edit-after-submit không thay snapshot; self-review bị chặn với mọi role, kể cả OWNER.
- Network Firebase chỉ emulator; guard real project/missing host bị từ chối; không ghi cloud/live hoặc thay original/baseline. Phân biệt unit, Rules, API integration và browser QA; chưa chạy ghi chưa chạy.
- Runbook/version lock/evidence/diff và High review đủ kiểm tra; local pass không là production readiness. Baseline form vẫn mailto/copy, chưa có lead/email backend.

## 4. Scope loại trừ và quyền riêng

M1 không account thật, upload/process media thật, cloud Storage/Functions/publisher, Security Rules cloud, billing/Blaze/IAM/region provisioning, staging/production/public preview deploy, migration full site hoặc backend lead/email. Không blog, payment, portal, multilingual routing, arbitrary HTML/theme code, generic page builder, tracking hoặc claim AI không nguồn.

M2 toàn site content/templates, M3 media/private preview, M4 local publication/history/rollback/full regression/usability/backup-restore và nghiệm thu. **Mỗi mốc cần detailed spec/task/Approved mới; Approved M1 không bao M2+.** Xem [plan](../tasks/plan.md).

## LOCAL_COMPLETE và nghiệm thu

LOCAL_COMPLETE chỉ được ghi khi toàn CMS local đã đạt:

- Editor quản lý toàn bộ section và variant đã engineered/Approved; schema, nguồn claim và asset refs đúng, không arbitrary theme/code.
- Media local có quarantine, MIME/size/decode validation, derivatives, rights/provenance; original/private metadata không lọt public projection.
- Authenticated full-site preview đúng revision; logout xóa private preview/token; ACL chặn anonymous/unknown/inactive/unverified, role tamper và self-review kể cả OWNER.
- Save có revision conflict/idempotency; immutable snapshot và exact-hash review; local publication tạo full-site static artifact, history/current pointer và rollback giữ draft hiện tại.
- Unit, Rules/ACL, API integration, browser desktop/mobile và static SEO/XSS/workflow/rollback regressions có evidence thật; runbook setup/backup/restore lặp lại được; usability và limitations được báo rõ.

High technical review đạt và LOCAL_COMPLETE kỹ thuật chưa phải nghiệm thu người dùng. Ghi user local acceptance riêng bằng lời/reference thực tế; không tự điền vào ledger. M1 closed không cho phép tự implement M2–M4.

## 5. Base, freeze và approval record

Baseline source provenance: commit `739fbe1752fdda64e328f4b46cecd292059b05b1`, export không Git. Website static/reference/font/source-content/firebase bytes giữ nguyên từ handoff 10/10. Deploy 39 files/Spark/HTTP 200 ngày 10/10 là evidence lịch sử, chưa phải browser/live audit mới.

Canonical scope/environment/paths/tasks/base/document digests ở [CMS-001-v2.scope.json](../approvals/CMS-001-v2.scope.json); approval/digest tại [APPROVAL-REGISTER](../approvals/APPROVAL-REGISTER.json). Agent freeze actual hashes sau review, không tự tạo approval. Đối chiếu actual HEAD/worktree lúc bắt đầu; provenance không giả là HEAD mới. User không phải gõ SHA dài: lời duyệt rõ gắn bundle CMS-001 v2 đang trình.

```text
Approved CMS-001 v2 — M1 local/emulators
```

Đây chỉ là ví dụ; chỉ có hiệu lực khi người dùng tự gửi lời duyệt rõ cho bundle này. Câu tương đương không nhập nhằng được chấp nhận. Trước Approved: đọc/nghiên cứu/spec/plan/doc/review tiếp theo quyền đã giao; **WAIT trước implementation**. Sau Approved M1: thực hiện code/tests/fix cần thiết đúng scope để đạt AC khi milestone còn mở. Session/compaction không tự hủy quyền còn hiệu lực. Material scope mới hoặc implementation sau milestone Closed cần fresh Approved. Technical review passed không là business approval. Quy trình chi tiết: [APPROVAL-PROTOCOL](APPROVAL-PROTOCOL.md).

## 6. Rủi ro và rollback local

Auth không đồng nghĩa membership; ẩn signup không chặn Auth API. Server SDK bypass Rules nên API emulator phải kiểm ACL độc lập. Private preview phải authenticated, không chia sẻ public draft URL. Local publication cần revision/hash checks, idempotency, serialized jobs và filesystem current pointer atomic; lỗi giữa artifact/ledger/pointer phải fail closed và reconcile local, không hứa exactly-once thiếu bằng chứng.

M1 rollback dừng local/emulators và rollback isolated diff/copy theo chỉ dẫn, giữ user edits/evidence. Không tự discard user work. Full local rollback ở M4 tạo history record mới trỏ retained artifact, không reset draft. Những quyết định local chưa cần cho M1 như ưu tiên variant, media caps/retention và backup format được chốt trong proposal mốc tương ứng; không chờ account/password/billing để làm local.

## 7. Tài liệu và nguồn

Trong ZIP đọc [CMS-ARCHITECTURE](CMS-ARCHITECTURE.md) cho capability/data/API/roles/media/publish/rollback/migration, [ENGINEERING-WORKFLOW](ENGINEERING-WORKFLOW.md), [QA-AND-DOD](QA-AND-DOD.md). Bản proposal tải riêng giữ nội dung quyết định đủ đọc; links relative tới tài liệu chi tiết cần mở trong cấu trúc ZIP đầy đủ.

Primary sources cho implementation local (kiểm phiên bản thực tế trong setup đã Approved):

- https://firebase.google.com/docs/emulator-suite
- https://firebase.google.com/docs/emulator-suite/connect_functions
- https://firebase.google.com/docs/auth/web/password-auth
- https://firebase.google.com/docs/auth/web/auth-state-persistence
- https://firebase.google.com/docs/firestore/security/rules-conditions
- https://firebase.google.com/docs/functions/manage-functions
- https://vite.dev/guide/
- https://zod.dev/



Schema/caps/role policy/SLO/roadmap là đề xuất thiết kế, không phải Firebase bảo đảm. GPT-6.1 Sol High reasoning/plan/review/audit; Medium coding/draw/generate/unit test; runtime cần chọn thật. Mọi snippet config hiện là tài liệu, chưa activate. Không đổi approval_policy/sandbox, không có hard CI gate mới được cài.
