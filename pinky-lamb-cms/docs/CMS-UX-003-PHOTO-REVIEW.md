# CMS-UX-003 — Ảnh review sau sửa, 16/10/2026

**SCOPED_REPAIRS_VERIFIED_LOCAL / HUMAN_ACCEPTED. LOCAL_COMPLETE=false.** Bộ ảnh hiện hành bên dưới thay ảnh trước follow-up. CMS chạy bằng fixture tách biệt, tài khoản EDITOR/REVIEWER thật trong emulator; không phải mockup được ghép vào CMS. Dữ liệu/revision trong ảnh thuộc fixture, không phải dữ liệu giữ lại.

**Human accepted — 16/10/2026.** Người dùng xác nhận trực tiếp: “Nhìn tốt rồi, nghiệm thu.” Phạm vi nghiệm thu là phần CMS UX vừa sửa và review theo hồ sơ này, gồm đủ 8 nhóm và các routine repairs follow-up. Preview navigation/control delta vẫn HOLD, chờ quyết định riêng; LOCAL_COMPLETE=false và trạng thái M3/M4 giữ nguyên. Các giới hạn kiểm thử bên dưới vẫn có hiệu lực.

Ảnh gốc1440×900/390×844, zoom100%, không resize/ghép. [Receipt34ảnh đầu tab trên source cuối](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/results.json). Các ảnh `start` được kiểm scrollY0/header top0; `end` thể hiện vị trí cuối lượt kiểm control/context. Template có banner mockup30px, CMS giữ typed model/nguồn/media/quyền thật. Cùng viewport không có nghĩa pixel parity hoặc human accepted.

| Nhóm | Desktop1440 | Reference1440 | Mobile390 | Reference390 |
| --- | --- | --- | --- | --- |
| Đầu trang, Hero và SEO | [CMS](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-1440-G01-settings.png) | [Template](../.local/test-outputs/cms-ux-003/v7/ui-direct/template-1440-G01-settings.jpg) | [CMS](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-390-G01-settings.png) | [Template](../.local/test-outputs/cms-ux-003/v7/ui-direct/template-390-G01-settings.jpg) |
| Khách hàng | [CMS](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-1440-G02-clients.png) | [Template](../.local/test-outputs/cms-ux-003/v7/ui-direct/template-1440-G02-clients.jpg) | [CMS](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-390-G02-clients.png) | [Template](../.local/test-outputs/cms-ux-003/v7/ui-direct/template-390-G02-clients.jpg) |
| Dự án | [CMS](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-1440-G03-projects.png) | [Template](../.local/test-outputs/cms-ux-003/v7/ui-direct/template-1440-G03-projects.jpg) | [CMS](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-390-G03-projects.png) | [Template](../.local/test-outputs/cms-ux-003/v7/ui-direct/template-390-G03-projects.jpg) |
| Dịch vụ | [CMS](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-1440-G04-services.png) | [Template](../.local/test-outputs/cms-ux-003/v7/ui-direct/template-1440-G04-services.jpg) | [CMS](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-390-G04-services.png) | [Template](../.local/test-outputs/cms-ux-003/v7/ui-direct/template-390-G04-services.jpg) |
| Giới thiệu | [CMS](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-1440-G05-about.png) | [Template](../.local/test-outputs/cms-ux-003/v7/ui-direct/template-1440-G05-about.jpg) | [CMS](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-390-G05-about.png) | [Template](../.local/test-outputs/cms-ux-003/v7/ui-direct/template-390-G05-about.jpg) |
| IP Studio | [CMS](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-1440-G06-ip.png) | [Template](../.local/test-outputs/cms-ux-003/v7/ui-direct/template-1440-G06-ip.jpg) | [CMS](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-390-G06-ip.png) | [Template](../.local/test-outputs/cms-ux-003/v7/ui-direct/template-390-G06-ip.jpg) |
| Liên hệ | [CMS](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-1440-G07-contact.png) | [Template](../.local/test-outputs/cms-ux-003/v7/ui-direct/template-1440-G07-contact.jpg) | [CMS](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-390-G07-contact.png) | [Template](../.local/test-outputs/cms-ux-003/v7/ui-direct/template-390-G07-contact.jpg) |
| Chân trang | [CMS](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-1440-G08-footer.png) | [Template](../.local/test-outputs/cms-ux-003/v7/ui-direct/template-1440-G08-footer.jpg) | [CMS](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-390-G08-footer.png) | [Template](../.local/test-outputs/cms-ux-003/v7/ui-direct/template-390-G08-footer.jpg) |

Các tab và phần cuối form (mỗi cặp Desktop/Mobile):

- G01 — Đầu trang: [1440](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-1440-G01-settings.png) / [390](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-390-G01-settings.png) / [cuối form390](../.local/test-outputs/cms-ux-003/v7/qa/full-groups/followup-groups-2/G01-390-0-end.png); Hero: [1440](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-1440-G01-settings-tab-1.png) / [390](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-390-G01-settings-tab-1.png) / [cuối form390](../.local/test-outputs/cms-ux-003/v7/qa/full-groups/followup-groups-2/G01-390-1-end.png); SEO & chia sẻ: [1440](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-1440-G01-settings-tab-2.png) / [390](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-390-G01-settings-tab-2.png) / [cuối form390](../.local/test-outputs/cms-ux-003/v7/qa/full-groups/followup-groups-2/G01-390-2-end.png).
- G03 — Danh sách: [1440](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-1440-G03-projects.png) / [390](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-390-G03-projects.png) / [cuối form390](../.local/test-outputs/cms-ux-003/v7/qa/full-groups/followup-groups-2/G03-390-0-end.png); Nội dung mục: [1440](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-1440-G03-projects-tab-1.png) / [390](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-390-G03-projects-tab-1.png) / [cuối form390](../.local/test-outputs/cms-ux-003/v7/qa/full-groups/followup-groups-2/G03-390-1-end.png).
- G04 — Danh sách: [1440](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-1440-G04-services.png) / [390](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-390-G04-services.png) / [cuối form390](../.local/test-outputs/cms-ux-003/v7/qa/full-groups/followup-groups-2/G04-390-0-end.png); Nội dung mục: [1440](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-1440-G04-services-tab-1.png) / [390](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-390-G04-services-tab-1.png) / [cuối form390](../.local/test-outputs/cms-ux-003/v7/qa/full-groups/followup-groups-2/G04-390-1-end.png).
- G05 — Nội dung: [1440](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-1440-G05-about.png) / [390](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-390-G05-about.png) / [cuối form390](../.local/test-outputs/cms-ux-003/v7/qa/full-groups/followup-groups-2/G05-390-0-end.png); Kinh nghiệm & chữ ký: [1440](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-1440-G05-about-tab-1.png) / [390](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-390-G05-about-tab-1.png) / [cuối form390](../.local/test-outputs/cms-ux-003/v7/qa/full-groups/followup-groups-2/G05-390-1-end.png); Showreel: [1440](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-1440-G05-about-tab-2.png) / [390](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-390-G05-about-tab-2.png) / [cuối form390](../.local/test-outputs/cms-ux-003/v7/qa/full-groups/followup-groups-2/G05-390-2-end.png); Hồ sơ năng lực: [1440](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-1440-G05-about-tab-3.png) / [390](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-390-G05-about-tab-3.png) / [cuối form390](../.local/test-outputs/cms-ux-003/v7/qa/full-groups/followup-groups-2/G05-390-3-end.png).
- G07 — Nội dung hiển thị: [1440](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-1440-G07-contact.png) / [390](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-390-G07-contact.png) / [cuối form390](../.local/test-outputs/cms-ux-003/v7/qa/full-groups/followup-groups-2/G07-390-0-end.png); Thông tin liên hệ: [1440](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-1440-G07-contact-tab-1.png) / [390](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-390-G07-contact-tab-1.png) / [cuối form390](../.local/test-outputs/cms-ux-003/v7/qa/full-groups/followup-groups-2/G07-390-1-end.png); Form brief: [1440](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-1440-G07-contact-tab-2.png) / [390](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-photos-final-2/cms-390-G07-contact-tab-2.png) / [cuối form390](../.local/test-outputs/cms-ux-003/v7/qa/full-groups/followup-groups-2/G07-390-2-end.png).

Dialog hiện hành (Desktop/Mobile):

- G02 Thông tin: [1440](../.local/test-outputs/cms-ux-003/v7/qa/full-groups/followup-groups-2/G02-dialog-1440-0.png) / [390](../.local/test-outputs/cms-ux-003/v7/qa/full-groups/followup-groups-2/G02-dialog-390-0.png).
- G02 Logo: [1440](../.local/test-outputs/cms-ux-003/v7/qa/full-groups/followup-groups-2/G02-dialog-1440-1.png) / [390](../.local/test-outputs/cms-ux-003/v7/qa/full-groups/followup-groups-2/G02-dialog-390-1.png).
- G02 Nguồn: [1440](../.local/test-outputs/cms-ux-003/v7/qa/full-groups/followup-groups-2/G02-dialog-1440-2.png) / [390](../.local/test-outputs/cms-ux-003/v7/qa/full-groups/followup-groups-2/G02-dialog-390-2.png).
- G04 Thông tin: [1440](../.local/test-outputs/cms-ux-003/v7/qa/full-groups/followup-groups-2/G04-dialog-1440-0.png) / [390](../.local/test-outputs/cms-ux-003/v7/qa/full-groups/followup-groups-2/G04-dialog-390-0.png).
- G04 Phạm vi công việc: [1440](../.local/test-outputs/cms-ux-003/v7/qa/full-groups/followup-groups-2/G04-dialog-1440-1.png) / [390](../.local/test-outputs/cms-ux-003/v7/qa/full-groups/followup-groups-2/G04-dialog-390-1.png).
- G04 Hiển thị & nguồn: [1440](../.local/test-outputs/cms-ux-003/v7/qa/full-groups/followup-groups-2/G04-dialog-1440-2.png) / [390](../.local/test-outputs/cms-ux-003/v7/qa/full-groups/followup-groups-2/G04-dialog-390-2.png).
- G03 Thông tin: [1440](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-featured-photos/featured-1440-dialog-0.png) / [390](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-featured-photos/featured-390-dialog-0.png).
- G03 Hình ảnh: [1440](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-featured-photos/featured-1440-dialog-1.png) / [390](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-featured-photos/featured-390-dialog-1.png).
- G03 Liên kết & hiển thị: [1440](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-featured-photos/featured-1440-dialog-2.png) / [390](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-featured-photos/featured-390-dialog-2.png).
- G03 Nguồn: [1440](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-featured-photos/featured-1440-dialog-3.png) / [390](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-featured-photos/featured-390-dialog-3.png).

Ảnh hành vi:

- [Mở đủ control Sắp xếp](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-forms-final/cms-1440-about-order-expanded.png); [Nổi bật sau Save/reload, revision3](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-featured-photos/featured-390-list.png); [PinkySelect mở](../.local/test-outputs/cms-ux-003/v7/qa/representative/followup-featured-photos/featured-390-pinkyselect.png).
- [S13 —11caller, ảnh/receipt](../.local/test-outputs/cms-ux-003/v7/qa/full-groups/followup-headings-final/results.json); [S01–S12 —12model, ảnh/receipt](../.local/test-outputs/cms-ux-003/v7/qa/full-groups/followup-sorts-final/results.json).

| Boundary | Kết quả có bằng chứng |
| --- | --- |
| B01 — Branding/cấu trúc | PASS đủ8group/sidebar logo; context và field thật giữ lại. |
| B02 — Table/dialog/actions | PASS Dự án4tab, Dịch vụ3tab, Khách hàng3tab ở hai viewport; fixture Apply/Save/reload có receipt riêng. |
| B03 — Lucide/PinkySelect/sort | PASS S01–S12 và11caller S13 pointer/keyboard/PinkySelect/Undo/full-content roundtrip; tay nắm luôn hiện, control vị trí mở bằng Sắp xếp. |
| B04 — Working/scratch | PASS fixture Cancel/Apply/Save/reload, Undo giữ text edit; không tự lưu khi mở mode hoặc sort. |
| B05 — Quyền | PASS actual EDITOR/REVIEWER trong8group; không suy thành UI cả4vai trò. Service/VM quyền giữ lớp kiểm riêng. |
| B06 — Focus | PASS sửa click-target di chuyển khi pointerdown; summary nguồn được Tab ra khỏi vùng che. Unit đỏ→xanh và browser regression. |
| B07 — Responsive | PASS1440×900 và390×844 cho8group/tab/dialog; breakpoint320/768/720/721/1023 không tái chạy ở follow-up này. |
| B08 — Preview/media | Cover thật được chọn/xác nhận và decode; preview modal cũ giữ saved identity. Section picker/auto-jump tiếp tục HOLD riêng. |
| B09 — Overflow/reachability | PASS control scan/hit-test/focus/popups và document overflow trên viewport đã chạy; không suy thành phần cứng touch. |
| B10 — Bảo toàn/errors | PASS source179/template, retained collection comparison và exact fixture cleanup ở các receipt PASS. Các attempt FAIL cũ vẫn giữ lịch sử. |

Kiểm browser ở đây đi qua adapter fixture + Auth/services/SDK/emulator thật; **không phải native HTTP mutation-handler E2E**. [Kết quả và giới hạn](CMS-UX-003-REVIEW.md). Human accepted cho phần CMS UX vừa review theo xác nhận 16/10/2026 ở đầu hồ sơ.

---

## Snapshot v6 lịch sử — không phải trạng thái source hiện hành

# CMS-UX-003 v6 — Hướng dẫn review bằng ảnh

**Correction hiện hành — Logo sidebar:** ảnh37 có chữ PINKY LAMB nhưng thiếu ảnh mascot và CONTENT STUDIO của template. Đây là FAIL bổ sung, không phải khác biệt đã duyệt. Gallery/ZIP/52criteria giữ nguyên snapshot trước phát hiện; không dùng số51PASS+1FAIL trong snapshot để nói hiện chỉ còn một lỗi. Xem [review guide đã hiệu chỉnh](CMS-UX-003-REVIEW.md). Human acceptance vẫn PENDING.

**Đã chuẩn bị ảnh; chờ người dùng nghiệm thu.** Bộ ảnh chụp CMS đang chạy bằng fixture tách biệt, không phải ảnh tạo từ mockup. Không sửa source CMS trong lượt chụp. Nội dung fixture có thể khác dữ liệu giữ lại.

- [Gallery519ảnh](../.local/test-outputs/cms-ux-003/v6/acceptance-photos/index.html)
- [ZIP portable khoảng65 MB](../.local/test-outputs/cms-ux-003/v6/acceptance-photos/CMS-UX-003-v6-review-photos.zip): giải nén và mở `index.html`, không cần server.
- [Manifest ảnh/tiêu chí](../.local/test-outputs/cms-ux-003/v6/acceptance-photos/manifest.json), [kiểm tra paths/hash/ZIP](../.local/test-outputs/cms-ux-003/v6/acceptance-photos/pack-validation.json), [kiểm tra gallery desktop/mobile](../.local/test-outputs/cms-ux-003/v6/acceptance-photos/gallery-ui-verification-v2.json).

## Cách review

1. Chọn lần lượt G01–G08. Xem các tab, ảnh cuộn có phần chồng và dialog; bấm ảnh để phóng to. Dùng Trước/Sau hoặc phím mũi tên, Escape để đóng.
2. Lọc viewport1440/390 để xem các ảnh mới chụp. Ảnh768/320 và boundary720/721/1023 được tái sử dụng từ cùng source đã kiểm; manifest đánh dấu `reused=true`.
3. Chọn boundary để đối chiếu từng nhóm dưới đây. Mở phần52tiêu chí để phân biệt kết quả hành vi với ảnh đã chụp. Có thể ghi nhận xét bằng ID tiêu chí và số ảnh trong gallery.
4. Với sắp xếp, xem cả chuỗi trước → giữ kéo → sau → Hoàn tác và PinkySelect mở. Một ảnh không chứng minh được toàn bộ chuỗi bàn phím hay thao tác ghi.

| Boundary trong gallery | Điểm cần quan sát |
| --- | --- |
| B01 Structure/hierarchy | Sidebar tám nhóm, tiêu đề, phân cấp, tab và table/dialog |
| B02 Workflow order | Thứ tự nhập, Hủy/Áp dụng, lưu bản nháp, phần nội dung dùng chung |
| B03 Controls/interaction | Lucide thật, PinkySelect, tay nắm kéo, điểm thả, nút sắp xếp và Hoàn tác |
| B04 Navigation continuity | Chuyển nhóm/tab, cảnh báo bỏ thay đổi, đóng dialog và điểm quay lại |
| B05 Permission/feedback | REVIEWER bị khóa đúng chỗ, trạng thái lưu, Retry và phản hồi lỗi |
| B06 Focus/keyboard | Focus hiển thị, dropdown/dialog; chuỗi bàn phím có receipt hành vi riêng |
| B07 Responsive | Desktop/tablet/mobile, sidebar/drawer, bảng, dialog và thanh hành động |
| B08 Preview identity | Toàn bản đã lưu có revision/định danh; chưa có preview theo từng mục |
| B09 Clipping/occlusion | Control cuối trang, popup/dialog, header/footer không che thao tác |
| B10 Empty/loading/error/permission | Tải, lọc không có kết quả, lỗi đọc/khôi phục, rỗng/một item và quyền |

Các mã B01–B10 là nhãn dẫn tới mười mục của [boundary checklist chuẩn](../../docs/agent-kit/template-application-acceptance.md), không thay đổi tiêu chí đã duyệt.

## Phạm vi đã chụp

Đủ tám nhóm và các tab ở1440×900/390×844; dialog Khách hàng ba tab, Dự án bốn tab, Dịch vụ ba tab; các phần cuộn dài; S01–S12 và đủ11caller S13; PinkySelect mở; trạng thái chưa lưu, đang lưu, Retry, quyền REVIEWER, media/source và preview toàn bản đã lưu. Có thêm ảnh768×1024/320×844 và breakpoint720/721/1023 từ bằng chứng cùng source. Không suy thành đã chụp mọi tổ hợp vai trò, viewport và trạng thái.

446ảnh mới từ các case hoàn tất PASS và73ảnh tái sử dụng tạo thành519ảnh trong gallery. Một case chụp Liên hệ ban đầu FAIL do wheel dừng ở vùng cuộn lồng;16ảnh của case đó bị loại khỏi gallery. Receipt cũ giữ nguyên. Lượt chụp lại dùng gutter đã xác minh, giữ nguyên assertion cuộn/coverage và PASS; không sửa ứng dụng để làm test xanh.

## Kết quả và giới hạn

- **FAIL/HOLD — AC52:** chưa có `Xem mục này`, preview section picker và auto-jump. Gallery có ảnh hiện trạng liên quan, không có ảnh chứng minh capability chưa tồn tại. [Phương án riêng đang chờ quyết định](CMS-UX-003-PREVIEW-NAVIGATION-DELTA.md).
- Matrix hành vi hiện hành giữ51scoped PASS +1FAIL. `Photo Captured` không có nghĩa behavior PASS, không có nghĩa Human accepted. `Human acceptance=PENDING`, `LOCAL_COMPLETE=false`.
- Các lượt UI dùng adapter fixture và Auth/authorization/services/SDK/emulator thật. **Native HTTP mutation-handler/browser Save E2E, physical touch, browser session revocation và binary MEDIA_VERSION snapshot playback: NOT_RUN.** Nội dung lịch sử thật chưa được kiểm đầy đủ.
- Chín lượt capture đều ghi cleanup đúng namespace/member/Auth, remaining0, retained comparison và source stability PASS. So sánh dữ liệu giữ lại bao phủ14collections/4441documents bằng ID/hash; không phải inventory toàn bộ database hay Storage binary.
- Source21files vẫn khớp freeze SHA256 `7ebe48bbc647dab40a52aff5791e682cc538a1231487bebe02db996c7d7c8fbe`;179protected files giữ nguyên. Không reset/seed/reimport dữ liệu, restart emulator, commit/push hoặc deploy.
- Gallery offline đã kiểm tại1440×900 và390×844: đủ tám nhóm/52tiêu chí/10boundary, bốn bộ lọc, zoom/Trước/Sau/Escape, ảnh hiện trạng AC52 vẫn giữ FAIL, không tràn ngang/không lỗi JavaScript. Kiểm gallery không phải kiểm runtime CMS mới.
- Mockup được đối chiếu bằng quan sát tab HTTP cache trước đó; không có cặp PNG tham chiếu local cho mọi ảnh trong bộ này. Không tuyên bố pixel-identical.

ZIP chỉ chứa `index.html`, `manifest.json`, `README.md` và519PNG. ZIP không chứa source ứng dụng, script capture, token, credentials hay payload fixture thô. Các receipt hành vi được liên kết theo repository trong manifest và [review guide đầy đủ](CMS-UX-003-REVIEW.md).
