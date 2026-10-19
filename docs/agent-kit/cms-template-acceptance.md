# Pinky Lamb — CMS template acceptance mapping

**Purpose:** checklist nguồn cho task apply template CMS tiếp theo. Đây là tài liệu được viết trong [PINKY-TEMPLATE-ADOPTION-001 v2](tasks/PINKY-TEMPLATE-ADOPTION-001.md), không phải nghiệm thu UI mới hoặc một sổ trạng thái sản phẩm khác. [CMS-UX-002 v2](../../pinky-lamb-cms/tasks/CMS-UX-002.md) giữ quyền sở hữu trạng thái/approval/evidence sản phẩm. Dùng [checklist chung](template-application-acceptance.md); Task Owner gắn rows có ID vào canonical task của lần triển khai, không nhân bản trạng thái mutable ở đây.

## Nguồn và ranh giới

| Nguồn | Identity và áp dụng |
| --- | --- |
| [UI-APPLY-001](../../pinky-lamb-cms/tasks/UI-APPLY-001.md) | Accepted template v4 SHA256 `4965bcf130d7ac800c390a026c48786ffdbbc159cb8e1264d94072abe128a0e8`: shell, tokens, sidebar/header, tabs Biên tập / Gửi và duyệt, editor/preview hierarchy và mobile drawer/sticky actions. Task giữ source/reference evidence; không suy ảnh khác chiều cao thành pixel-exact parity. |
| [Mockup Toàn website v1](../../mockups/toan-website-v1.html) | SHA256 `a7dc480fa8bd7a0faa6d75f022f3578fc4d4b617290131791d0d60fb10f36256`, approved trong CMS-UX-002 v2: tám nhóm, tables/dialogs, client grid, subsections và media thumbnails. |
| [CMS-UX-002 v2](../../pinky-lamb-cms/tasks/CMS-UX-002.md) | Normal navigation chỉ một mục Toàn website dùng `home-v3`, mặc định sau login. `home-v2` chỉ history/legacy theo version. Không phục hồi navigation bốn resource cũ. Resource home và media library vẫn độc lập theo task. |
| [HOME-V3-RECOVERY-001](../../pinky-lamb-cms/tasks/HOME-V3-RECOVERY-001.md) | Import/persistence recovery là lịch sử riêng; không tự reimport, seed hoặc áp quyền recovery cho adoption này. |

Loại bỏ prototype save/review/data, artifact/device/state controls và placeholder claims. Không đổi schema, IDs/slugs, hidden/source/media refs, capabilities, contracts/backend guards hoặc server authority để đạt hình thức. Preview canonical vẫn là saved/snapshot bất biến đúng revision/hash; mockup unsaved preview không là canonical preview. Lucide dùng package chính thức đã chọn, không tự vẽ hoặc thay bằng glyph. Sai khác material ngoài quyết định CMS-UX-002 cần review/approval mới.

## Điều kiện trước khi triển khai diện rộng

Task tương lai phải ghi source hash, role/login, URL/runtime thực tế, data states, tools, evidence destination, quyền thao tác và fixture/retained-data boundaries. `http://127.0.0.1:5173/login` là URL cấu hình, không phải current liveness proof. Không đọc credentials; người dùng tự đăng nhập nếu cần. Không restart emulators hoặc ghi retained drafts để tạo bằng chứng. Fixture ghi phải có namespace/identity riêng và cleanup đúng quyền. Nếu thiếu prerequisite: ghi NOT_RUN, owner và next action trước mở rộng phần phụ thuộc.

Chọn rows theo scope thực tế: visual parity kiểm structure/layout/controls/responsive và tương tác bị sửa bằng rendered evidence. Các rows Save/persistence/roles/history/preview lifecycle chỉ là điều kiện chặn khi task yêu cầu rõ hoặc thay đổi tác động đến chúng; giữ nguyên guards và contracts hiện có. Lỗi lifecycle có sẵn không chặn phần visual độc lập. Không nhân toàn bộ roles × states × viewports thành chương trình harness mới; chỉ criterion mà phần mở rộng thực sự phụ thuộc mới phải PASS trước. Các rows bắt buộc chưa chứng minh vẫn mở, không chuyển thành PASS hoặc bỏ gate quyền/dữ liệu.

**Proposed representative:** OWNER → Toàn website → Đầu trang, Hero và SEO, dữ liệu thật đã lưu; mở Dự án dialog để chứng minh đường scratch → working copy → global Save ở fixture nếu quyền cho phép. Delivery owner chọn representative trong task khi còn quyết định thiết kế chưa rõ có thể bị nhân rộng; không bắt buộc một Coordinator riêng hoặc một gate representative cho mọi sửa UI. So sánh source và implementation tại matched desktop/mobile viewport; 1440×900 và390×844 chỉ là kích thước đề xuất, không gán lại cho ảnh cũ. Kiểm hierarchy/primary interactions/applicable states trước khi nhân rộng đúng quyết định còn chưa được chứng minh; không thêm vòng human approval cho từng bước routine trong cùng scope.

## Rows theo nhóm — để điền vào canonical task tương lai

Mọi row dưới đây là **NOT_RUN cho lần triển khai tương lai**. Owner mặc định delivery owner của task UI; chỉ chia assignment khi delegation đã được phép và có ích. Evidence cũ chỉ là reuse candidate ở phần sau. Mỗi row khi dùng phải có role, state, viewport, expected, evidence/date/hash, result và owner theo checklist chung; tách desktop/mobile và states liên quan thành rows riêng.

| ID / Nhóm | Role / data state | Viewport cần ghi | Expected result và ví dụ kiểm | Result / Owner |
| --- | --- | --- | --- | --- |
| CMS-G01 Đầu trang, Hero và SEO | OWNER / populated, dirty | matched desktop/mobile | Form tabs/subsections đúng mockup; navigation/brand/Hero/SEO/media refs giữ IDs và values; đổi nhóm không mất working edits. Editor trước review theo hierarchy đã duyệt. | NOT_RUN / Task Owner UI |
| CMS-G02 Khách hàng | OWNER / populated, empty | matched desktop/mobile | Logo grid đủ items, dialog media/source fields đúng; Apply đổi working copy, Cancel bỏ scratch; thumbnail và controls reachable. | NOT_RUN / Task Owner UI |
| CMS-G03 Dự án | OWNER / populated, filtered, invalid scratch | matched desktop/mobile | Table/dialog tabs giữ slug/hidden/source/media refs; validation giữ dialog; full-list project order và featured order độc lập; filtered list không sort mơ hồ. | NOT_RUN / Task Owner UI |
| CMS-G04 Dịch vụ | OWNER / populated, dirty scratch | matched desktop/mobile | Table/dialog, add/edit/cancel đúng; pointer/touch/keyboard alternatives/position và Undo đúng; order service độc lập project. | NOT_RUN / Task Owner UI |
| CMS-G05 Giới thiệu | OWNER / populated, dirty | matched desktop/mobile | Text/rich text/media thumbnails theo subsections; narrow rich-text controls không bị bó hoặc che; giữ refs và later edits khi Undo body order. | NOT_RUN / Task Owner UI |
| CMS-G06 IP Studio | OWNER / populated, media selected | matched desktop/mobile | Fields/tabs và media types đúng contract, không biến filename thành media identity; preview dùng bytes/manifest guards hiện có. | NOT_RUN / Task Owner UI |
| CMS-G07 Liên hệ | OWNER / populated, invalid input | matched desktop/mobile | Contact/Form brief dùng fields hiện hữu, labels/validation đúng; không thêm backend lead workflow chưa được duyệt. | NOT_RUN / Task Owner UI |
| CMS-G08 Chân trang | OWNER / populated, dirty | matched desktop/mobile | Fields/footer links/media theo model hiện hữu; switching group giữ selection/dirty đúng; sticky actions không che field cuối. | NOT_RUN / Task Owner UI |

## Rows xuyên nhóm và invariants

| ID / Criterion | Role / state / viewport | Expected result | Evidence cần có / Owner |
| --- | --- | --- | --- |
| CMS-X01 Shell/initial view | OWNER / saved / matched desktop/mobile | Một Toàn website mở v3 mặc định, đủ8groups; Biên tập/Gửi và duyệt đúng vị trí; không review block đẩy editor ra ngoài hierarchy template. | Render/template comparison và login/navigation observations / UI Owner |
| CMS-X02 Scratch/global Save | OWNER/EDITOR / clean,dirty,invalid,busy / desktop/mobile | Apply chỉ working content; clean/dirty Cancel bỏ scratch theo guard; global Save mới gọi existing API, không ghi khi chưa Apply; CAS/idempotency/session/partial-save giữ nguyên. | Separate real browser + isolated write rows khi có quyền; synthetic/source không thay browser round-trip / UI+API Owners |
| CMS-X03 Ordering/Undo | permitted role / full,filtered,edited / desktop/mobile | Projects/featured/services độc lập; body chỉ work/services/about/ip-studio; Undo chỉ order, giữ later edits/additions; handle, Alt+arrow, up/down/position đúng. | Pointer/keyboard/touch evidence ghi riêng; không suy desktop drag thành real touch / UI Owner |
| CMS-X04 Media controls | permitted/denied roles / selected,loading,error,busy / desktop/mobile | Lucide/thumbnail/media refs và bounds đúng; PDF/video controls visible/reachable trong containers; download/playback phải có proof riêng. | Container-level renders+interaction, actual media transport evidence nếu scope cho phép / UI+Media Owners |
| CMS-X05 Roles/review | OWNER,EDITOR,REVIEWER,PUBLISHER / allowed,denied,self-review / desktop/mobile | Backend authority giữ nguyên, disabled/busy feedback đúng; self-review refusal; permissions trước reads/writes. | Separate service/Auth, HTTP và browser evidence; không chuyển kết quả layer này sang layer kia / API+UI Owners |
| CMS-X06 Preview | permitted role / saved,snapshot,dirty working / desktop/mobile | Preview identity đúng source revision/hash bất biến; dirty working không giả saved; authenticated transport/sandbox/cleanup guards giữ nguyên. | Revision/hash/readback + actual rendered preview; snapshot riêng từng version / Preview Owner |
| CMS-X07 History | permitted/denied roles / legacy v2,new v3 / desktop/mobile | Gửi và duyệt → Trước nâng cấp đọc history theo version; không tự fallback/reimport, không tạo revision chain giả; giữ records/reviews/audit/source/import. | Bounded legacy-read proof và preservation scope rõ; full DB/history inventory cần quyền riêng / History Owner |
| CMS-X08 Reachability/a11y | relevant roles / populated,dialog / desktop/tablet/mobile320 | Không clipping/occlusion; dialog footer, sticky bar, focus return/trap và keyboard thao tác được. Full keyboard, zoom và screen reader ghi riêng. | Nested-container inspection; page-level no-overflow không đủ / UI Owner |
| CMS-X09 State coverage | từng role / loading,empty,error,disabled,busy / từng viewport áp dụng | Từng applicable state có content/action/access đúng, không default empty thành missing-data success. | Một row/state; state không áp dụng ghi lý do, không PASS giả / UI Owner |

## Evidence reuse candidates — không phải current runtime proof

[CMS-UX-002 v2 canonical task](../../pinky-lamb-cms/tasks/CMS-UX-002.md) ghi evidence ngày15/10/2026 dưới `.local/test-outputs/cms-ux-002/v2/`. Reuse chỉ khi source, inputs, environment và kết luận còn valid; invalidate đúng affected scope. Adoption hiện tại không mở browser, không kiểm lại data hay chạy CMS.

| Candidate source | Proof đã ghi tại thời điểm gốc | Giới hạn phải giữ |
| --- | --- | --- |
| UI-APPLY-001 v2 images/task | Authenticated shell/hero composition desktop/mobile tại kích thước gốc | Height/reference khác nhau; không pixel-exact/human acceptance; không phục hồi navigation cũ sau CMS-UX-002. |
| CMS-UX-002 `ui/ui-verification.json` |8groups/subtabs/dialogs; Apply trả working copy về gốc; clean Cancel/focus; service drag/Alt+arrow/Undo; responsive1440/768/390/320; preview28/28images và legacy snapshot read | Không browser write round-trip từng field; dirty Cancel native confirm bị tool block; playback/download và exhaustive keyboard/zoom/screen reader NOT_RUN. |
| `collections/runtime-fixture-attempt3.json` |7checks actual authorization/services, isolated Auth/Firestore namespace facade và cleanup | Không HTTP write-handler/browser Save E2E; không retained writes. |
| `shell/final-check-result.json`, build/source reviews |44focused tests,34syntax, scoped lint/build/source review trong scope gốc | Static/synthetic không chứng minh UI hoặc runtime layer chưa chạy. |
| `data-read-before.json`, `collections/read-only-final.json` | v2rev778/v3rev0 content/envelope/sourceCatalog hashes giữ nguyên ở observed reads | Không full database/history inventory; không current liveness/data proof. |

**Unknown / NOT_RUN:** new native V31 behavior, CMS checks trong adoption này, browser writes từng field, dirty Cancel confirm hoàn chỉnh, managed PDF/video playback/download, exhaustive keyboard/zoom/screen reader, real touch device, full DB/history inventory. Human acceptance vẫn pending theo canonical task; không suy từ package/static PASS. Không chuyển M3/M4/LOCAL_COMPLETE/production disposition.
