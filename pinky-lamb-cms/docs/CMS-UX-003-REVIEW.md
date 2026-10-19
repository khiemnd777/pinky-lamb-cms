# CMS-UX-003 — Follow-up đã kiểm chứng local, 16/10/2026

## Trạng thái hiện hành — đã hoàn tất theo xác nhận của Khiêm

**ĐÃ HOÀN TẤT / CLOSED_BY_HUMAN_CONFIRMATION — 17/10/2026 (Asia/Ho_Chi_Minh).** Xem [xác nhận trực tiếp, phạm vi đóng và bảng trạng thái hiện hành](../../tasks/plan.md). Khiêm xác nhận các plan đã xong và giao chỉ đồng bộ tài liệu, không sửa code hoặc chạy lại kiểm thử.

Các trạng thái chờ duyệt/chưa hoàn tất, checkbox và bước tiếp theo trong phần bên dưới thuộc lịch sử trước xác nhận đóng; không tự mở lại plan/task từ các ghi nhận đó. Giữ nguyên bằng chứng PASS/FAIL/NOT_RUN, cờ kỹ thuật và giới hạn đã ghi nhận. Lần đồng bộ này không xác minh runtime, không ghi nhận release hoặc cấp quyền thực thi mới.

## Nội dung lịch sử trước xác nhận đóng


**SCOPED_REPAIRS_VERIFIED_LOCAL / HUMAN_ACCEPTED. LOCAL_COMPLETE=false.** Đã xử lý ba phần ưu tiên và hai lỗi focus phát hiện khi kiểm lại; không còn FAIL tái hiện trong các ca follow-up đã hoàn tất. Preview section navigation giữ HOLD riêng theo yêu cầu người dùng. Không dùng kết quả này để tự nghiệm thu toàn bộ CMS.

**Human accepted — 16/10/2026.** Người dùng xác nhận trực tiếp: “Nhìn tốt rồi, nghiệm thu.” Phạm vi nghiệm thu là phần CMS UX vừa sửa và review theo hồ sơ này, gồm đủ 8 nhóm và các routine repairs follow-up. Preview navigation/control delta vẫn HOLD, chờ quyết định riêng; LOCAL_COMPLETE=false và trạng thái M3/M4 giữ nguyên. Các giới hạn kiểm thử bên dưới vẫn có hiệu lực.

- Form: bỏ khung/label/khoảng đệm lặp; label dòng ngắn, thêm/xóa đoạn cùng header; hint/bộ đếm gọn. Tay nắm kéo luôn hiện; Sắp xếp mở đầy đủ lên/xuống/PinkySelect vị trí. Giữ AST, mọi field, caps, nguồn/media, disabled state và thứ tự thật; mở mode không làm dirty/save.
- Dịch vụ: thêm đúng chú thích ẩn khỏi lựa chọn brief, giữ liên kết đã lưu trong Dự án.
- Nổi bật: lỗi kết luận nằm ở harness đọc sau PATCH đầu tiên. Receipt xác nhận revision1 chưa có featured; khi toàn bộ Save kết thúc ở revision3, source/visibility/featured và full content đều đúng sau reload. Không thay nghiệp vụ lưu để né lỗi kiểm thử.
- Focus: sửa handler làm nút dịch chuyển giữa pointerdown/pointerup; giữ bảo vệ keyboard focus. Bổ sung summary nguồn vào vùng bảo vệ tránh thanh mobile che. Có unit đỏ→xanh và browser regression.

Source chính: `admin/site-settings-editor.mjs`, `admin/site-ux.css`, `admin/site-settings-ux.css`, `admin/site-collection-ui.mjs`, `admin/cms-shell.mjs`. Không thêm dependency, đổi backend/guard/infra/contracts/renderer/CSP/sandbox. Self-review trên correctness/readability/module boundary/security/performance; không gọi đây là independent review.

[Ảnh đủ8nhóm/tab/dialog và10boundary](CMS-UX-003-PHOTO-REVIEW.md).

| Kiểm tra | Kết quả / receipt |
| --- | --- |
| CMS UX unit/VM | PASS157/157: `node --experimental-vm-modules --test tests/cms-ux*.test.mjs`; [log](../.local/test-outputs/cms-ux-003/v7/followup/unit-final.log). |
| Admin lint | PASS `node node_modules/eslint/bin/eslint.js admin`; [log](../.local/test-outputs/cms-ux-003/v7/followup/lint-final.log). |
| Guarded build | PASS `node scripts/local-guard.mjs build`; [log](../.local/test-outputs/cms-ux-003/v7/followup/build-final.log). |
| Whitespace | PASS `git diff --check`; không Git mutation/commit/push. |
| Compact form/Undo/Save/reload | [PASS2cases](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-forms-final/results.json), full-content equality và cleanup/source/retained PASS. |
| New Project featured | [PASS Cancel/Apply/Save/reload + actual cover +14ảnh](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-featured-photos/results.json). |
| S13 | [PASS11/11caller](../.local/test-outputs/cms-ux-003/v7/qa/full-groups/followup-headings-final/results.json): pointer/key/position/Undo/metadata Save/reload. |
| S01–S12 | [PASS12/12model](../.local/test-outputs/cms-ux-003/v7/qa/full-groups/followup-sorts-final/results.json), cùng full-content roundtrip. |
|8group/tabs/dialog/quyền | [PASS8/8](../.local/test-outputs/cms-ux-003/v7/qa/full-groups/followup-groups-2/results.json), EDITOR1440/390 + REVIEWER locks; bounds/focus/popup/no implicit mutation. |
| Source bảo vệ | [179/179/template SHA giữ nguyên](../.local/test-outputs/cms-ux-003/v7/followup/preservation-final.json). |

Node pin: `.local/cache/node/node-v22.23.3-darwin-arm64/bin/node`. Lint toàn repo trước đó còn9lỗi trong backend/contracts có sẵn và được bảo vệ; không đánh đồng admin lint PASS với global lint PASS.

F01–F28 theo đúng lớp bằng chứng; PASS source/unit hoặc fixture không có nghĩa Human accepted:

| Finding | Bằng chứng / phần còn mở |
| --- | --- |
| F01 | PASS rendered: mascot/tên/CONTENT STUDIO trên sidebar desktop. |
| F02 | PASS source + rendered: Lucide registry và active rail; không thêm icon tự vẽ. |
| F03 | PASS unit dirty markers; native dirty-state NOT_RUN trong lượt chụp chỉ đọc. |
| F04 | PASS rendered mobile: một cluster Xem trước/Lưu/Gửi ở chân màn hình. |
| F05 | PASS font asset/tokens scoped; không tuyên bố toàn bộ pixel parity. |
| F06 | PASS scoped: compact typed form, direct drag handles, view-only Sắp xếp mở lên/xuống/PinkySelect; AST/caps/metadata giữ nguyên. Fixture pointer/key/Undo/Save/reload PASS. Đây vẫn là typed editor theo khác biệt đã duyệt, không tự nhận pixel parity. |
| F07 | PASS rendered ngang logo/media field; metadata thật vẫn hiện. |
| F08 | PASS source/unit + browser disclosure/bounds; summary nguồn mobile được sửa focus và tái kiểm. |
| F09 | PASS source/unit + G01 control scan/bounds; S02 menu roundtrip giữ metadata. |
| F10 | PASS rendered Hero ảnh thật/heading/context; unsaved illustration được phân biệt saved preview. |
| F11 | PASS rendered search/social cards, metadata thật. |
| F12 | PASS unit focal click/clamp/keyboard/disabled/identity; native ghi focal NOT_RUN. |
| F13 | PASS source/grid layout+handle; ảnh entry bị đẩy xuống bởi F06, chưa đạt mật độ tổng thể. |
| F14 | PASS actual dialog Khách hàng3tab1440/390 và REVIEWER locks; S03 fixture Apply/save/readback giữ nội dung ngoài record. |
| F15 | PASS rendered search/table normal, không chồng icon; empty/filter/reorder source cuối NOT_RUN native. |
| F16 | PASS ordinal/titleVi/summary/count và chú thích tác động ẩn dịch vụ đúng template, desktop/mobile. |
| F17 | PASS actual Dự án4tab1440/390, Cancel và footer; new record/source/featured roundtrip có receipt. |
| F18 | PASS New Project Cancel/Apply/full Save/readback/reload: nguồn/ẩn/Nổi bật giữ đúng. FAIL cũ do harness đọc sau PATCH đầu tiên; revision1 chưa có featured, revision3 có đủ. Service staged visibility/source PASS unit; native new-service write chưa tái chạy. |
| F19 | PASS source + rendered G03 Nội dung mục/control scan: readonly Credential/context giữ shared binding. |
| F20 | PASS4tab Giới thiệu, actual context media/duration/usage và role/control bounds ở hai viewport; unit giữ metadata. |
| F21 | PASS rendered typed rich context heading/nhấn mạnh đúng dữ liệu. |
| F22 | PASS source/unit email/tel/url types; không gửi email/brief thật. |
| F23 | PASS rendered footer context, Back to top Lucide, copyright/data thật. |
| F24 | PASS modal saved-preview thật revision0; FAIL section picker/auto-jump. HOLD affected navigation contract/control slice. |
| F25 | PASS S01 actual structure order/pointer/keyboard/position/Undo/full-content roundtrip; fixed rows giữ nguồn hiện có. |
| F26 | PASS8group/tabs/dialog1440/390; sửa2focus bugs bằng unit đỏ→xanh và fixture. Các breakpoint khác/touch thật vẫn NOT_RUN. |
| F27 | PASS real picker select/confirm + cover image decode, Cancel/Apply/Save/reload fixture; unit lifecycle giữ validation. MEDIA_VERSION binary khác không suy PASS. |
| F28 | PASS current28finding ledger +10boundary/ảnh/receipt. Human acceptance ACCEPTED cho phần CMS UX đã review, theo xác nhận 16/10/2026. |


Các receipt follow-up PASS giữ retained comparison trong đúng scope khai báo và dọn đúng namespace/docs/members/Auth sở hữu, remaining0. Không reset/seed/reimport dữ liệu giữ lại hoặc restart emulator. Chỉ khởi động lại frontend guard do5173đã dừng. Các attempt FAIL trước sửa giữ nguyên; không sửa receipt cũ thành PASS. Hai lỗi focus là routine UI repair trong scope đã duyệt.

**Giới hạn:** browser fixture adapter + actual Auth/services/SDK/emulator không phải HTTP mutation-handler E2E. Native HTTP writes, browser session revocation, full history/snapshot MEDIA_VERSION binary, UI đầy đủ cả4vai trò và phần cứng touch vẫn NOT_RUN. Kiểm lại source cuối bằng hai viewport đã nêu; các breakpoint khác dùng evidence lịch sử có phạm vi riêng. Không suy source hashes thành inventory/bảo toàn toàn DB.

**Preview riêng:** [đề xuất navigation/control contract](CMS-UX-003-PREVIEW-NAVIGATION-DELTA.md). Saved modal đã có; section picker/Xem mục này/auto-jump chưa có. Không đổi renderer/CSP/sandbox/transport bằng suy đoán.

Review local: http://127.0.0.1:5173/login. Có thể review ảnh trước mà không cần phiên đăng nhập. Chưa commit/push/deploy; Human acceptance ACCEPTED trong phạm vi ghi trên; LOCAL_COMPLETE=false.

---

## Snapshot v6 lịch sử — các kết luận bên dưới có hiệu lực tại snapshot đó

# CMS-UX-003 v6 — Local review guide

**Correction sau phản hồi Logo của người dùng:** phát hiện thêm **FAIL — khối nhận diện đầu sidebar**. Template `updateChrome()` có ảnh `ASSETS['pinky-mascot']`, tên PINKY LAMB và dòng CONTENT STUDIO; `admin/index.html:19` chỉ có `<p class="brand">PINKY LAMB</p>`. Ảnh bàn giao G01 số37 xác nhận thiếu ảnh/dòng phụ. Không tìm thấy ngoại lệ đã duyệt cho việc bỏ khối này. Phần chọn logo website trong G01 vẫn hiện diện; đó là bề mặt khác, không chứng minh sidebar đạt template. **Hiện biết ít nhất hai điểm FAIL**, gồm sidebar branding và preview navigation. Matrix52/gallery/ZIP đã đóng gói là snapshot bằng chứng trước correction, không phải danh sách lỗi đầy đủ; số51PASS+1FAIL trong snapshot không được dùng làm kết luận tổng thể hiện hành. Chưa sửa ứng dụng trong lượt rà soát này.

Trạng thái: **SOURCE_INTEGRATED / VERIFIED_LOCAL_SCOPED / OPEN_TEMPLATE_GAPS**. Hai gap đã biết: **nhận diện sidebar** và **Xem mục này / chọn và tự nhảy section trong preview**. [Chênh lệch preview, nguyên nhân và phương án cần quyết định](CMS-UX-003-PREVIEW-NAVIGATION-DELTA.md). Người dùng chưa nghiệm thu. Không đánh dấu `Human accepted` hoặc `LOCAL_COMPLETE`. [Task/approval và lịch sử kiểm chứng](../tasks/CMS-UX-003.md) là nguồn điều phối.

## Bộ ảnh để review sau — 15/10/2026

Đã chuẩn bị **519 ảnh** cho đủ tám nhóm, liên kết tới **52 tiêu chí và 10 nhóm boundary**. [Mở gallery tương tác](../.local/test-outputs/cms-ux-003/v6/acceptance-photos/index.html) hoặc [tải bộ ZIP khoảng65 MB](../.local/test-outputs/cms-ux-003/v6/acceptance-photos/CMS-UX-003-v6-review-photos.zip), giải nén rồi mở `index.html`; không cần server. [Hướng dẫn và phạm vi ảnh](CMS-UX-003-PHOTO-REVIEW.md).

Chọn từng nhóm, lọc boundary/viewport/vai trò, bấm ảnh để phóng to. Mỗi chuỗi giữ tab, đoạn cuộn và trạng thái trước/khi/sau kéo thả/Hoàn tác. Ảnh hiện trạng không thay kết quả kiểm thử hoặc quyết định nghiệm thu. Gallery giữ **51 tiêu chí PASS trong phạm vi bằng chứng +1 FAIL preview navigation**; `Human acceptance=PENDING`, `LOCAL_COMPLETE=false`.

## Mở bản local

- CMS: [http://127.0.0.1:5173/login](http://127.0.0.1:5173/login). Dùng phiên local hiện có; không có tài khoản cloud hoặc production trong phạm vi này.
- Đủ tám nhóm trực tiếp trong sidebar, cùng một phiên biên tập và bản nháp `home-v3`: Đầu trang, Hero và SEO; Khách hàng; Dự án; Dịch vụ; Giới thiệu; IP Studio; Liên hệ; Chân trang.
- Thư viện media nằm trong Tài nguyên. Cấu trúc website và Gửi và duyệt nằm trong Quản lý. Toàn website là tên không gian, không còn menu cha trùng. Hero và SEO độc lập được giữ tại Gửi và duyệt → Lịch sử và nội dung cũ cùng lịch sử đúng phiên bản.
- Desktop/tablet từ721 px có sidebar. Mobile đến720 px dùng drawer; thanh hành động mobile gọi cùng controller gốc. Header tablet có thể xuống dòng để giữ đủ vai trò, trạng thái và ba hành động thật.
- Frontend được khởi động bằng Node đã pin và `scripts/local-guard.mjs dev`. Các emulator cũ được giữ nguyên; không chạy lại launcher/seed/reset khi review.

## Các điểm cần review

1. Chuyển đủ tám nhóm và các tab con. Nội dung chưa lưu phải được giữ khi chuyển nhóm/tab. Khi rời phiên qua tài nguyên hoặc đóng dialog đang sửa, xác nhận bỏ thay đổi chỉ áp dụng đúng phạm vi.
2. Dự án và Dịch vụ: tìm kiếm/lọc, mở từng item, xem đủ tab dialog, dùng Hủy và Áp dụng. Áp dụng chỉ cập nhật phiên biên tập; `Lưu website` mới lưu bản nháp. Nút/drag trong row không tự mở dialog.
3. Mở Sắp xếp ở danh sách đầy đủ. Dùng tay nắm, Alt+↑/↓, nút lên/xuống, PinkySelect vị trí và Hoàn tác. Danh sách dự án nổi bật có thứ tự riêng. Khi lọc, thao tác sắp xếp bị khóa theo quy tắc hiện có.
4. Đầu trang/Hero/SEO: menu, kiểu chữ, loại hành động, mục đích đến, media và ảnh chia sẻ. Giới thiệu có đúng bốn tab; Liên hệ có đúng ba tab; IP Studio giữ nội dung và artwork trong cùng màn hình.
5. Khách hàng: logo card và dialog Thông tin/Logo/Nguồn. Nguồn của một logo không ghi đè binding khác. Chân trang dùng liên kết tới thương hiệu và Facebook dùng chung, không tạo bản sao dữ liệu.
6. `Xem trước` chính hiển thị bản đã lưu hoặc snapshot có định danh. Các khung minh họa cạnh form được ghi rõ là phiên biên tập, chưa phải bản xem trước đã lưu.
7. Kiểm tại1440×900,768×1024,390×844,320×844. Dùng Tab qua các control cuối màn hình để kiểm focus không nằm dưới header/thanh hành động; kiểm dialog, PinkySelect và drawer.

Không dùng dữ liệu giữ lại để tái chạy thao tác ghi của agent. Các lượt ghi tự động trong bàn giao chỉ dùng namespace và synthetic Auth/member fixture riêng. Review thủ công trên bản thật có thể chỉ đọc; nếu muốn thử ghi bằng agent, tiếp tục dùng runner fixture đã cung cấp.

## Khác biệt có chủ đích so với mockup

- Giữ mô hình dòng/đoạn/nhấn mạnh và giới hạn ký tự thực tế. Editor có control sắp xếp từng dòng/đoạn thay cho textarea định dạng giản lược trong prototype. Các ID, slug, quan hệ, mô tả ảnh, ảnh trang trí, focal point và nguồn thật vẫn chỉnh được.
- Nguồn dùng binding/source catalog thật; không có checkbox mẫu tự xác nhận quyền. File ảnh/video/PDF dùng picker và metadata thật; thời lượng Showreel chỉ đọc theo catalog.
- CTA hồ sơ năng lực của Dự án và Giới thiệu dùng chung `settings.credential`. Các chuỗi cố định trong renderer được trình bày chỉ đọc; không thêm trường lưu giả. Facebook chân trang dùng thông tin Liên hệ.
- Copyright giữ năm bắt đầu tùy chọn. Form brief giữ `MAILTO_COPY`, không tạo backend nhận lead. Bỏ reset/mock-save/demo review của prototype; giữ workflow và quyền thật.

Đối chiếu chi tiết: [template → target](../.local/test-outputs/cms-ux-003/v6/evidence/template-target-map.md), [128 dòng khác biệt schema/field](../.local/test-outputs/cms-ux-003/v6/evidence/template-schema-differences.md). Các note nguồn này có trạng thái tại thời điểm khảo sát; kết quả kiểm chứng hiện hành được tổng hợp dưới đây.

## Bằng chứng hiện hành

| Phạm vi | Kết quả và bằng chứng |
| --- | --- |
| Baseline trước worker | [222 source files/179 protected files, giữ dirty work hiện có](../.local/test-outputs/cms-ux-003/v6/source-baseline.json) |
| Dự án đại diện trước nhân rộng | [R01–R08 PASS và ranh giới proof](../.local/test-outputs/cms-ux-003/v6/evidence/representative-checklist.md) |
| Source cuối | [118/118 frontend tests](../.local/test-outputs/cms-ux-003/v6/workspaces/integration/evidence/latest-final19-result.json); [focused30/lint/CSS parse/protected179/build27outputs PASS sau đúng sidebar/header order](../.local/test-outputs/cms-ux-003/v6/workspaces/integration/evidence/exact-sidebar-header-verification.json) |
| UI1440/390 | [8/8 nhóm PASS, EDITOR/REVIEWER, stable DOM identity/control bounds/focus](../.local/test-outputs/cms-ux-003/v6/fixture/full-groups/handoff-groups/results.json) |
| UI768/320 | [16/16 PASS, tám nhóm × hai viewport](../.local/test-outputs/cms-ux-003/v6/fixture/full-groups/handoff-visual/results.json) |
| Boundary720/721/1023 | [3/3 PASS: sidebar/drawer/role/status/actions/hit/bounds, wrapped-header/sticky offset và drawer qua resize](../.local/test-outputs/cms-ux-003/v6/fixture/responsive-boundary/handoff-boundary/results.json) |
| Matrix52 group/sort/caller/boundary/edge/gap rows | [51 PASS trong đúng state/control được nêu;1 FAIL capability preview navigation; source/visual/fixture proof tách riêng](../.local/test-outputs/cms-ux-003/v6/evidence/acceptance-matrix.json) |
| Khách hàng/source | [Cancel/Apply/Save/reload/full content PASS](../.local/test-outputs/cms-ux-003/v6/fixture/client-sources/client-sources-1/results.json) |
| Media/preview/links/review entry | [10/10 PASS1440/390](../.local/test-outputs/cms-ux-003/v6/fixture/resources/resources-1/results.json) |
| Quyền và ghi service | [17 checks Auth/services/SDK/emulator PASS](../.local/test-outputs/cms-ux-003/v6/fixture/service-attempt1.json) |
| Save error / service scope edge | [3/3 PASS: actual namespace commit + injected503, same-intent Retry một effect; duplicate/remove/add/Undo/empty/one/Cancel; actual REVIEWER locks](../.local/test-outputs/cms-ux-003/v6/fixture/last-edge/last-edge-1/results.json) |
| Bảo toàn cuối | [14collections/4441documents khớp baseline](../.local/test-outputs/cms-ux-003/v6/fixture/retained-handoff-after.json); [179protected files + appfreeze21 stable](../.local/test-outputs/cms-ux-003/v6/evidence/final-source-preservation.json) |
| Fixture H06 bị gián đoạn | [Dọn đúng16docs/4members/4Auth và retained hash PASS](../.local/test-outputs/cms-ux-003/v6/fixture/recovery/recover-final-h06-1.json); original run không được tính PASS |

Các receipt UI là **browser qua adapter fixture + authorization/services/SDK/emulator thật**. Chúng không chứng minh HTTP mutation-handler/browser Save E2E. Mọi completed run đều có cleanup đúng tài nguyên sở hữu, retained comparison và source stability riêng; không cộng số assertions từ các tầng thành một chỉ số E2E.

## Giới hạn còn mở

- **FAIL — preview navigation so với mockup:** global Xem trước mở toàn bản đã lưu; chưa có Xem mục này, section picker hoặc auto-jump. Đây chưa phải ngoại lệ đã Approved. [Phương án riêng](CMS-UX-003-PREVIEW-NAVIGATION-DELTA.md) giữ phần bị ảnh hưởng ở HOLD theo ràng buộc về contract/runtime controls. Các kiểm group/sort đã PASS không được dùng để xóa gap này.

- Sortable: [S01–S12 từng model12/12 PASS](../.local/test-outputs/cms-ux-003/v6/fixture/full-groups/pointer-sorts-3/results.json) và [S13 đủ11/11 caller PASS](../.local/test-outputs/cms-ux-003/v6/fixture/full-groups/pointer-headings-3/results.json): real pointer/drop ownership/capture, nút lên/xuống, AltDown, PinkySelect, Undo giữ edit sau sort, toàn content Save/reload. Escape/pointercancel/outside-drop/filter locks có R01; gallery scratch có R03; duplicate add/remove có R04. Mọi tổ hợp edge state trên từng model chưa được chạy; không suy từ một controller test thành browser PASS cho mọi tổ hợp.
- Browser session revocation: **NOT_RUN**; source/VM session-invalidation tests được ghi riêng, không suy thành browser proof.
- Native HTTP write E2E, binary `MEDIA_VERSION` snapshot playback, nội dung lịch sử thật qua fixture allowlist và phần cứng touch thật: **NOT_RUN**. Entry route của lịch sử được kiểm riêng; không suy thành nội dung lịch sử đã kiểm đầy đủ.
- Retained comparison chỉ bao phủ14 collection/4441 documents đã khai báo bằng ID/hash. Đây không phải inventory toàn bộ database hay binary Storage.
- Trình duyệt fixture kiểm EDITOR và REVIEWER ở các màn hình đã nêu; bốn vai trò có service evidence riêng. Không gọi đó là UI đầy đủ cho cả bốn vai trò.
- Mockup HTTP được quan sát từ tab cache qua CUA, không reload. Server tham chiếu52110 không trả được kết nối mới; reference-network fetch **NOT_RUN**. Ảnh native inline không bị mô tả thành local screenshot file. Viewport tạm đã reset.
- Không commit/push/deploy, đổi guard/backend/infra hoặc restart emulator. Các thay đổi backend/contracts đã có trước baseline được giữ nguyên và không được nhận là thay đổi của v6.

## Ảnh source tích hợp để đối chiếu

- [Đầu trang1440](../.local/test-outputs/cms-ux-003/v6/fixture/full-groups/handoff-groups/G01-1440-0-start.png), [tablet768](../.local/test-outputs/cms-ux-003/v6/fixture/full-groups/handoff-visual/V768-G01-0-start.png), [mobile320](../.local/test-outputs/cms-ux-003/v6/fixture/full-groups/handoff-visual/V320-G01-0-start.png).
- [Khách hàng](../.local/test-outputs/cms-ux-003/v6/fixture/full-groups/handoff-groups/G02-1440-0-start.png), [Dự án](../.local/test-outputs/cms-ux-003/v6/fixture/full-groups/handoff-groups/G03-1440-0-start.png), [Dịch vụ](../.local/test-outputs/cms-ux-003/v6/fixture/full-groups/handoff-groups/G04-1440-0-start.png).
- [Dialog Dịch vụ desktop](../.local/test-outputs/cms-ux-003/v6/fixture/full-groups/handoff-groups/G04-dialog-1440-0.png), [mobile](../.local/test-outputs/cms-ux-003/v6/fixture/full-groups/handoff-groups/G04-dialog-390-0.png).
- [Giới thiệu](../.local/test-outputs/cms-ux-003/v6/fixture/full-groups/handoff-groups/G05-1440-0-start.png), [IP Studio](../.local/test-outputs/cms-ux-003/v6/fixture/full-groups/handoff-groups/G06-1440-0-start.png), [Liên hệ](../.local/test-outputs/cms-ux-003/v6/fixture/full-groups/handoff-groups/G07-1440-0-start.png), [Chân trang](../.local/test-outputs/cms-ux-003/v6/fixture/full-groups/handoff-groups/G08-1440-0-start.png).

Ảnh dùng dữ liệu fixture được dẫn xuất trong namespace riêng; trạng thái revision hiển thị trong ảnh thuộc fixture, không phải revision của dữ liệu giữ lại.
