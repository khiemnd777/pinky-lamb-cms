# CMS-UX-002 v2 — Một mục Toàn website dùng Home v3

## Trạng thái hiện hành — đã hoàn tất theo xác nhận của Khiêm

**ĐÃ HOÀN TẤT / CLOSED_BY_HUMAN_CONFIRMATION — 17/10/2026 (Asia/Ho_Chi_Minh).** Xem [xác nhận trực tiếp, phạm vi đóng và bảng trạng thái hiện hành](../../tasks/plan.md). Khiêm xác nhận các plan đã xong và giao chỉ đồng bộ tài liệu, không sửa code hoặc chạy lại kiểm thử.

Các trạng thái chờ duyệt/chưa hoàn tất, checkbox và bước tiếp theo trong phần bên dưới thuộc lịch sử trước xác nhận đóng; không tự mở lại plan/task từ các ghi nhận đó. Giữ nguyên bằng chứng PASS/FAIL/NOT_RUN, cờ kỹ thuật và giới hạn đã ghi nhận. Lần đồng bộ này không xác minh runtime, không ghi nhận release hoặc cấp quyền thực thi mới.

## Nội dung lịch sử trước xác nhận đóng


Status: **INTEGRATED / VERIFIED_LOCAL_SCOPED / READY_FOR_HUMAN_REVIEW** (15/10/2026). Local only; chưa nghiệm thu toàn CMS.

## Approval và nguồn thiết kế

Direct human approval trong cuộc hội thoại ngày 15/10/2026:

> Approved CMS-UX-002 v2. Triển khai local: một mục Toàn website dùng home-v3, đủ 8 nhóm theo mockup, dùng Lucide. Giữ nguyên nghiệp vụ, phân quyền, dữ liệu và lịch sử; kiểm thử ghi bằng fixture tách biệt.

v2 thay proposal v1 trong chat; không có implementation v1. Design: `mockups/toan-website-v1.html`, SHA256 `a7dc480fa8bd7a0faa6d75f022f3578fc4d4b617290131791d0d60fb10f36256`. Prototype data/save/review không là implementation nguồn.

## Phạm vi và invariants

- Một mục normal CMS **Toàn website** mở `home-v3`, mặc định sau đăng nhập; rút `home-v2` khỏi normal navigation. Không tự fallback hoặc reimport v2.
- Đủ tám nhóm: Đầu trang, Hero và SEO; Khách hàng; Dự án; Dịch vụ; Giới thiệu; IP Studio; Liên hệ; Chân trang.
- Lucide1.57.0 chính thức; không tự vẽ SVG/icon hoặc dùng glyph/CSS giả icon. Vanilla ESM/Vite giữ nguyên.
- Table/dialog Dự án và Dịch vụ; client logo grid/dialog; form tabs/subsections và media thumbnails theo mockup. Dialog scratch Apply chỉ đổi working content; global Save qua existing API. Cancel bỏ scratch.
- Sortable lists có handle/pointer/touch/keyboard và alternatives; independent projects/featured order; filtered list không sort mơ hồ; Undo chỉ order, giữ later edits/additions. Global body order chỉ work/services/about/ip-studio.
- Giữ schema/IDs/slug/hidden refs/caps/source binding/media validation, server authority, CAS/idempotency/partial save/session guards, bốn role hiện có và self-review refusal.
- Preview saved/snapshot đúng revision/hash, transport authenticated/sandbox/cleanup hiện có. Không đưa mockup unsaved preview thành canonical preview.
- Giữ v2 records/snapshots/reviews/source/import/audit/history nguyên vẹn; đường đọc/xử lý snapshot cũ theo version trong review/history. Không giả một revision chain v2→v3.
- Giữ resource home độc lập và media library; M2 recovery read-only riêng. Không cấp thêm role/capability hoặc publication.
- Không sửa contracts/backend/infra/local-guard/public baseline, reset/seed/reimport, retained draft writes, emulator lifecycle, global config, Git delivery hoặc deploy.

## Ownership và phối hợp

Root giữ task/evidence/shared indices và tích hợp cuối. Native `kit-implementer` route Medium được chọn cho ba workers; independent provider metadata Unknown, không suy từ config. Không child delegation; một writer mỗi file.

| Worker | Files/responsibility |
|---|---|
| cms_ux_shell | cms-shell/auth/index/admin.css/new site-ux.css/cms-icons; Lucide package+lock; legacy-history adapter/review/preview admin; shell tests |
| cms_ux_collections | site-work-editor/site-services-editor; new site-collection-ui helpers; collection tests |
| cms_ux_forms | site-fields/site-settings/site-about-ip/site-contact-footer; site-media-editor/site-media-preview; additive async binary reservation trong media-file-preview; form helpers/tests |

Shared icon contract `createCmsIcon(name, attributes={})` returns Lucide SVG DOM. Dialog/sort APIs owned by collections; field-tools public API preserved by forms. CSS owned by shell.

## Preflight và proof boundaries

Planning inspection: live UI v2rev778/v3rev0; 476 existing-item controls compared, one video-selector label difference;31media filename slots/43source checkbox states/project/service/body orders match. This is rendered-control evidence, not full database byte equality. Earlier recovery import receipt proves full normalized content equality at its recorded time.

Direct Firestore GET returned403; không đổi rules/credentials để vượt denial. Sau đó authenticated canonical API GET đã đọc đủ hai draft: v2 revision778 và v3 revision0; content chỉ khác schemaVersion. Hash content, envelope và sourceCatalog trước–sau khớp. Không có retained content mutation. Đây không phải inventory toàn bộ database/lịch sử.

Evidence root: `.local/test-outputs/cms-ux-002/v2/`. `approval.json`, `source-before.json`, `source-before-corrected.json`, `source-baseline-cross-check.json`. First source observation overlapped the shell worker's initial owned edits/new helper creation; original observation is retained. Corrected pre-edit files reconstructed separately under shell/pre-first-write; cross-check against earlier independent mockup source inventory is recorded. Protected backend/contracts/public sources were untouched.

## Acceptance và kiểm chứng

- [x] Normal Toàn website maps only v3; default sau login, không có mục whole-site thứ hai. Legacy reader trong Gửi và duyệt → Trước nâng cấp; recovery và resource home giữ riêng.
- [x] Đủ tám nhóm; giữ typed field model/IDs/source/media refs. Tất cả nhóm và tab phụ đã mở trên UI; validators và fixture round-trip kiểm dữ liệu. Chưa làm browser write round-trip từng field.
- [x] Work/services table/dialog: synthetic checks cho Apply/Cancel/add/validation/lock/destroy/refs; UI thật kiểm Apply rồi trả working copy về gốc, clean Cancel và focus return. Dirty Cancel hiển thị confirm; CUA không xử lý được native confirm, ghi giới hạn phía dưới.
- [x] Clients grid/dialog; Header/Hero/SEO; About/IP/Contact/Footer được kiểm qua UI thật, gồm Showreel/Credential/Form brief.
- [x] Drag thật và Alt+ArrowDown đổi thứ tự Dịch vụ; Undo trả đúng bản gốc. Pure/helper tests kiểm independent order, native/drag bridge, position và bảo toàn later edits/new IDs.
- [x] Session/CAS/retry/partial-save authority giữ nguyên. Actual Auth+Firestore fixture kiểm bốn role, CAS, idempotency, EDITOR save, REVIEWER/PUBLISHER denial, self-review refusal và independent review. HTTP write handler/browser Save không được kiểm riêng.
- [x] Saved preview đúng revision0 tải28/28ảnh;8/8project covers và5/5logos tải được. Snapshot v2 cũ đọc được, giữ hash/trạng thái/quyền từ chối tự duyệt. PDF/video selectors reachable; managed playback/download chưa kiểm.
- [x] Desktop1440/tablet768/mobile390/320, dialog footer/focus và cả tám nhóm320 không tràn ngang; mobile rich-text form được sửa sau visual review. Console warn/error trong tab kiểm cuối:0. Chưa kiểm exhaustive keyboard/zoom/screen reader.
- [x]44/44 focused tests,34/34syntax, scoped lint admin+7tests PASS; isolated build2062modules/27outputs PASS.221protected sources và accepted mockup giữ hash; actual fixture cleanup PASS, retained v2/v3 envelope/content/sourceCatalog giữ nguyên.
- [x] Independent source review, narrow repair reviews và root rendered review hoàn tất trong phạm vi. Human review còn chờ; M3/M4/LOCAL_COMPLETE/production không đổi.

Do not run old mutation suites on canonical retained drafts: several write then restore. Fixture tests require isolated namespaces/state and must not touch retained records. Harness failures keep dependent criteria open; bounded routine diagnosis/fix within this approval continues. Material data/control/operating approach changes require a revised human decision.

## Kết quả tích hợp

Một mục **Toàn website** mở home-v3 và đủ tám nhóm theo mockup. Dự án/Dịch vụ dùng table và scratch dialog; Khách hàng dùng logo grid/dialog; form dùng tabs và các nhóm field hiện hữu. Lucide1.57.0 dùng package chính thức, không CDN hoặc icon tự vẽ. Sortable lists có handle, pointer/touch handlers, Alt+mũi tên, lên/xuống, vị trí và Undo; thứ tự project/featured/service độc lập, body chỉ cho work/services/about/ip-studio.

Các lỗi tích hợp đã sửa trong scope: notification session cùng identity hủy initial v3 load; thiếu metadata manifest cho thumbnail; concurrent thumbnails chạm binary single-flight; table redraw theo mỗi phím; form đoạn hai cột bị bó hẹp ở320px. Queue mới giữ nguyên cap64MiB, một binary in-flight, hash/MIME/bytes/dimensions checks và actual-settle custody. Các guard/backend/contracts/renderer không đổi.

Root quan sát cổng5173 không còn listener giữa lượt kiểm thử; nguyên nhân process kết thúc **Unknown**. Khởi động riêng Vite bằng đúng pinned Node + `scripts/local-guard.mjs dev` trong phạm vi local implementation; session10683. Không stop/restart emulator. Vite ready và canonical API/UI hoạt động tại thời điểm kiểm; không là liveness guarantee.

## Evidence và lệnh kiểm

Tất cả dưới `.local/test-outputs/cms-ux-002/v2/`:

| Proof | Evidence | Kết quả |
|---|---|---|
| Source baseline | source-before-corrected.json; source-baseline-cross-check.json |66/66 prior-source hashes đối chiếu; giữ observation đầu riêng |
| Static/unit | shell/final-check-result.json | Pinned Node22.23.3 `--experimental-vm-modules --test tests/cms-ux-*.test.mjs`:44/44; `--check`:34/34; ESLint admin+7tests PASS |
| Build cuối sau CSS repair | shell/mobile-repair-build-result.json | Guarded Vite build output riêng:2062modules/27outputs; không ghi đè admin-dist/dist |
| Actual isolated writes | collections/runtime-fixture-attempt3.json |7checks PASS; actual authorize/services + namespace facade; cleanup21docs,4members,4Auth, remaining0 |
| Retained data | data-read-before.json; collections/read-only-final.json | v2rev778/v3rev0 content/envelope/sourceCatalog SHA256 giữ nguyên |
| Independent source review | review/independent-source-review.json; v3-session-review.json; manifest-delta-review.json; preview-queue-review.json; collection-signature-runtime-review.json | PASS trong từng phạm vi; không thay bằng chứng runtime/UI |
| UI thật | ui/ui-verification.json và PNGs trong ui/ |8groups, dialogs, pointer/keyboard/Undo, responsive,28/28preview images, legacy snapshot read |

Fixture attempt đầu bị sandbox EPERM trước ghi. Attempt2 đi được Auth/Firestore nhưng frontend5173 absent; cleanup4members+4Auth PASS, chưa ghi content namespace. Sau Vite ready, attempt3 PASS. Giữ nguyên các receipt lỗi; không coi lỗi harness là pass hoặc thay guards để vượt lỗi.

## Cách review local

1. Mở `http://127.0.0.1:5173/login`, đăng nhập bằng tài khoản local đã được cấp. Toàn website mặc định là home-v3.
2. Kiểm tám nhóm trong sidebar; mở item Dự án/Dịch vụ để xem tabs và media/source fields. **Áp dụng** chỉ đổi working copy; **Lưu website** mới gọi API hiện hữu.
3. Mở Sắp xếp danh sách đầy đủ; kéo handle hoặc Alt+mũi tên. Undo phục hồi thứ tự, giữ nội dung sửa sau đó. Project featured order ở mục riêng.
4. Chọn Xem bản đã lưu, sau đó Xem trước nếu khung đang ở Biên tập. Preview luôn dùng saved revision/snapshot, không giả preview working copy thành bản đã lưu.
5. Trong Gửi và duyệt → Trước nâng cấp, snapshot `00c1ace0-5195-4583-ad42-bb82b8a087c9` (v2revision657) đã đọc thành công, hash `600a6ab8d1a46258a10957e35ff25ea17d86cda59375f8842f35e3d40f5b86d5`, trạng thái Đã chấp thuận. Không tạo snapshot v2 mới.

## Giới hạn và phần còn lại

- **Human review pending.** Không đổi trạng thái M3/M4/LOCAL_COMPLETE hoặc xác nhận whole-CMS/production.
- Không có retained draft/history write; không seed/reset/reimport/migration, emulator lifecycle, cloud/deploy, global config hay Git delivery.
- Actual fixture kiểm service+authorization thật với collection facade riêng; không phải HTTP write-handler hoặc browser-save E2E. Synthetic tests không thay actual Auth/emulator proof.
- Dirty Cancel confirm đã hiển thị nhưng CUA dialog handling timeout; đóng riêng tab scratch, không Apply/Save. Clean Cancel/focus và dirty Cancel synthetic tests PASS. Không sửa sản phẩm để né giới hạn công cụ này.
- Chưa kiểm managed PDF/video playback/download, exhaustive keyboard/screen-reader/zoom, touch device thật hoặc toàn bộ database/history inventory. Controls/handlers/source guards được kiểm trong phạm vi nêu trên.
- Viewport override đã reset. Tab CMS kiểm cuối được giữ để review; screenshot là ảnh CMS thật, không phải mockup.
