# UI-LAYOUT-004 — Chuẩn hóa bố cục và phòng hồi quy UI

Ngày: 23/10/2026. Owner/writer: phiên chính. Trạng thái: **Accepted — nghiệm thu local kế hoạch v4** theo xác nhận của Khiêm ngày 23/10/2026. Chưa publish/deploy.

## Nghiệm thu của Khiêm — 23/10/2026

Khiêm xác nhận: “Tôi đã kiểm tra CMS local và zoom 200%, giao diện ổn. Chốt nghiệm thu kế hoạch v4, chưa publish/deploy.”

CMS local và browser zoom 200% đã được Khiêm kiểm tra và chấp nhận (**Human verified / Human accepted**). Kế hoạch v4 đóng ở phạm vi local. Xác nhận này bổ sung bằng chứng nghiệm thu của người dùng; không đổi các kết quả NOT_RUN/FAIL lịch sử thành automated PASS. Các giới hạn kiểm chứng khác bên dưới được giữ nguyên. Git và publish/deploy cần chỉ đạo riêng.

## Authority

Khiêm: “Approve implement kế hoạch v4. Triển khai đầy đủ phần sửa UI, kiểm chứng và cập nhật hướng dẫn cho agent. Chỉ làm local, giữ nguyên dữ liệu hiện có, chưa publish/deploy.”

Scope: toàn CMS, component dùng chung, layout media đã duyệt, hồi quy Preview/Website khi chịu tác động; AGENTS → UI contract → checklist → evidence. Không reset/reimport retained data, publish/deploy, Git writes hoặc thay đổi global configuration. Các kế hoạch cũ vẫn đóng. Working tree external-media có sẵn được giữ nguyên; chỉ review diff của task so với bản chụp trước tại `/private/tmp/pinky-ui-v4-before`.

## Findings và thay đổi

- File sources phụ thuộc `.media-upload`, thiếu nhóm nút, hàng và trạng thái. Thêm layout nội bộ độc lập, embedded variant và loading/error/empty có chủ đích.
- Checkbox/radio nhận kiểu text input. Tách kích thước và label hit area.
- Heading actions gap 0, sort tools gap 2px. Dùng token gap8 và tăng cột chứa nhóm để không gây overflow mới.
- Selector flatten card quá rộng trong shell/Hero. Giới hạn vào editor pane sở hữu vỏ.
- Shared-publication action groups thiếu layout. Dùng group wrap; không kích hoạt publication trên retained data.
- Media: một intake với nguồn thiết bị/liên kết, Office routing tới existing file API, một library hợp nhất. API media vẫn giữ stream theo kind; API file thêm source filter tại nguồn trước pagination. Client ghép tối đa bốn trang nguồn (20 mỗi nguồn), cursor riêng/stream; không tải hết dataset, không hứa global chronological sort/snapshot. Search ghi rõ chỉ trong trang hiện tại. File READY không xuất hiện ở trạng thái PROCESSING/REJECTED.
- Mobile action clearance theo chiều cao đo, giữ header clearance và focus guard hiện có.

## Quy ước và matrix

Nguồn chuẩn: [ui-layout-contract.md](../../docs/agent-kit/ui-layout-contract.md). Các rows và kết quả thực tế được cập nhật bên dưới; không ghi PASS khi mới có source/build.

## Checks — lịch sử trong quá trình triển khai

- Scoped ESLint: PASS lần đầu (file sources/upload/library/page/preparation + file API/routes).
- Build Admin durable local: PASS; chỉ `admin-dist`, không publish website.
- Unit core trước bổ sung source test: 8/8 PASS.
- Focused batch lần đầu: 40 PASS, 3 FAIL: shell historical label expected `Gửi và duyệt` vs current `Xuất bản`; forms Node import CSS; browser fixture sandbox listen EPERM. Tách baseline/tooling khỏi product failures.
- Legacy media-tool tests: FAIL `TOOL_BYTES` trước native checks; ngoài UI scope, không chỉnh tool/locks.
- Browser fixture: đang chạy bằng cache Playwright đã cài; không download dependencies.

## Bảo toàn

Không ghi dữ liệu qua live CMS, không publish/deploy. Fixture dùng namespace/storage riêng hoặc API synthetic. Source review và kiểm chứng runtime/human acceptance/release được ghi tách biệt.

## Quyền restart bổ sung

Khiêm xác nhận qua câu hỏi trong chat: “Cho phép restart local sau khi checks đạt”. Dùng `make run`/durable runner hiện có để nhận API mới; không reset/seed dữ liệu và không publish/deploy. Restart sau focused checks, shell và browser fixture đạt.


## Kết quả cuối — 23/10/2026

### Source và sửa nguyên nhân

- Intake có hai nguồn; tên/file/checkbox có spacing riêng. Tiếp tục chỉ kiểm tra; nút Thêm vào thư viện mới gửi upload. Office chạy qua file service hiện có. Busy của Office khóa input bên ngoài để không đổi file giữa lúc gửi.
- Một thư viện, bộ lọc kind/status/source tại nguồn; search chỉ trong trang hiện tại, xóa search phục hồi trạng thái thư viện. Giữ source-tag identity cho selection/archive, không gộp IDs khác nguồn; thumbnail lazy và cleanup theo session.
- File component tự có form/action/list spacing; dùng trong page, picker và trường FILE. Thông báo loading/empty/error không còn dính nút hoặc hiện Xem thêm khi chưa có cursor.
- Router generic trước đây từ chối mọi query FILE_RESOURCES trước validator riêng, gây lỗi lọc cả trong picker. Regression qua real dispatch + SQLite fixture: RED 400 thay vì 200; sửa cho FILE_RESOURCES đi tới validator allowlist, GREEN 200. Unknown/repeated query vẫn 400, invalid enum 422; authorize vẫn chạy.
- Bỏ CSS summary upload cũ và margin áp lên mọi nút/label media. Thu hẹp flatten/hide header vào đúng editor pane. Heading actions dùng 8px và cột96; sort group rộng220 khi đầy đủ control. Checkbox20px, hit area44px. Header hiển thị đúng nhóm ở cả shared mode; giữ nhãn hiện hành Xuất bản trong regression assertion.
- Footer mobile đo chiều cao thực tế; nội dung có clearance. Mobile dialog fullscreen giữ margin0 có chủ đích, không tạo dialog hẹp nhưng dính góc màn hình.
- AGENTS trỏ tới một UI contract/checklist cho UI mới và sửa đổi. Skill frontend/mirror đồng bộ; effective manifest cập nhật đúng các file liên quan và giữ nguyên lịch sử. Không khởi tạo agent khác để giả lập discovery; đã kiểm tra đường dẫn và byte mirror thực tế. Memory lưu qua một note ad_hoc được phép, không sửa memory gốc/global config.

### Kiểm tra đã quan sát

| Kiểm tra | Kết quả và phạm vi |
|---|---|
| Focused unit/integration | **48/48 PASS**: library page/cursors/filter/allowlist, route query regression, file service/rights, detection, shell, picker, shared publication flow. Log `.local/test-outputs/ui-layout-v4/unit.log`. |
| Browser file/reader | **2/2 PASS**: native SQLite fixture, external/hosted reader, Office upload/download và routing qua intake mới. Không dùng retained data. |
| Browser layout | **PASS 35 tổ hợp**: 7 mode × D/T/M/N/Z-reflow (upload, files, library, picker, heading, preparation error, FILE field). Kiểm gap, overlap trong nhóm, checkbox, bounds, footer; Tiếp tục không POST, chỉ explicit Add gửi. Z-reflow không phải browser zoom200. |
| Shared publication browser | **PASS**: confirm-success groups ở 5 viewport; CMS→frozen Preview→Website/reader EN/VI/JA qua fixture riêng; unrelated draft vẫn private. Đây là publication fixture, không phải publish Website hiện có. |
| Scoped ESLint | **PASS**, các module/tests thay đổi; không install formatter/linter mới. |
| Admin durable build | **PASS**, log build cuối được giữ. Chỉ admin-dist, không tạo Website release. |
| Links/mirror/digests | **PASS**: AGENTS→contract/checklist, frontend mirrors byte-identical, maintained hashes đúng. Không chạy lại historical kit locks. |
| Diff review | **PASS** về whitespace qua git diff --check; sequential self-review, không có independent reviewer/CI. Tại thời điểm kiểm tra chưa có human acceptance; xác nhận sau đó được ghi ở đầu hồ sơ. Working tree external-media có sẵn giữ nguyên. |

### Runtime thật (read-only trên dữ liệu hiện có)

- Stack local restart bằng make run theo quyền bổ sung; Admin5273 và Website4189 ready. Sau sửa router, chọn nguồn Liên kết ngoài trả trạng thái rỗng hợp lệ, không còn lỗi tải.
- Media D/M/N: card gap24, checkbox20, không page overflow. Nguồn Thêm tài nguyên và filter thư viện độc lập. Ảnh `.local/test-outputs/ui-layout-v4/media-desktop-final.png`, `media-mobile-final.png`, `media-320-final.png`.
- Đã đi qua tám nhóm ở D/T/M và shared modeN, ghi ảnh/geometry trong `live-navigation-results.json`. Đây là exploratory evidence; ảnh trước sửa heading không được dùng như proof cho heading cuối. Heading cuối có source regression và quan sát Giới thiệu/Dự án/media trên runtime mới.
- Sort expanded thật ở320: gap8, nhóm đầy đủ rộng220 và nút heading nằm trong x203..299; không page overflow. Tab cuối Hồ sơ năng lực truy cập được qua thanh tab có scroll chủ đích.
- Picker PDF thật: API loại PDF trả empty file list hợp lệ; footer/control vẫn có khoảng cách. Project edit dialog thật đã mở/cancel ở1440/768/390/320: không input/footer button vượt viewport; footer nằm trong màn hình (N footer y596.625..720). Không Apply/Save.
- Đã mở Cấu trúc website và màn Xuất bản để quan sát, không bấm xuất bản. `management-*.png` giữ ảnh.
- Website local tiếp tục dùng release pointer cũ `brand-logo-highlight-20261019-v2`, manifest `b57fd097a0201a4befc55b0d31a1f3464c8836d1b2b4992ba077da619947b226`, activation false ở log restart. Không seed/reset/reimport hoặc thao tác ghi nội dung qua live UI. Runner có recompute projection bình thường (`recomputed:72`); không tuyên bố toàn bộ SQLite byte-identical.

### NOT_RUN / giới hạn kiểm chứng của phiên triển khai

- **Browser zoom native200%**: agent NOT_RUN vì phím trên tab không làm đổi geometry; app-native trả cửa sổ ngoài task nên không thao tác tại đó. Agent chỉ có viewport reflow720×450. Sau triển khai, Khiêm đã kiểm tra CMS local và zoom200%, xác nhận giao diện ổn và chốt nghiệm thu như ghi ở đầu hồ sơ. Đây là Human verified, không phải automated PASS.
- Không kiểm thiết bị cảm ứng/bàn phím ảo thật, screen reader đầy đủ, mọi role×state hay mọi tổ hợp động. Không suy screenshot/fixture thành các bằng chứng đó. Không ghi retained data để tạo dirty/error/busy states.
- Historical `cms-ux-forms.test.mjs` không tới assertion vì Node import CSS; browser fixture hiện kiểm tools.heading và tools.action FILE thật. Maintenance owner của test cũ cần sửa cách bundle/import CSS trong scope riêng, không thêm runner trong task UI.
- Historical media-tool suite FAIL TOOL_BYTES/EPERM ở tool audit/supervisor, ngoài UI scope. Maintenance owner toolchain cần kiểm byte cache với pinned tool manifest và quyền chạy supervisor local; không repin/disable locks để lấy PASS. Không tính suite này là UI PASS.
- Chưa chạy full repository CI; không commit/push, không publish/deploy. Human acceptance đã được ghi riêng ở đầu hồ sơ.

### Lệnh kiểm tra

Từ `pinky-lamb-cms/`, dùng pinned `.local/cache/node/node-v22.23.3-darwin-arm64/bin/node`:

```sh
.local/cache/node/node-v22.23.3-darwin-arm64/bin/node --experimental-vm-modules --test tests/media-library-page.test.mjs tests/file-list-route.test.mjs tests/file-resources.test.mjs tests/file-detection.test.mjs tests/cms-ux-003-shell.test.mjs tests/cms-ux-003-media-picker.test.mjs tests/shared-file-publication-flow.test.mjs
PLAYWRIGHT_BROWSERS_PATH="$PWD/.local/cache/playwright" .local/cache/node/node-v22.23.3-darwin-arm64/bin/node --test tests/ui-layout.local.test.mjs tests/file-reader.local.test.mjs tests/shared-file-publication.local.test.mjs
```

Browser checks cần quyền loopback/Chromium của môi trường, dùng browser cache sẵn có. Lint dùng `node_modules/eslint/bin/eslint.js` với các module/tests đã sửa. Build dùng `npm run build:admin:durable` với pinned toolchain tương ứng package.json; trong task gọi chính lệnh Node/Vite của script để bảo đảm Node22.23.3.

Bước tiếp theo: giữ bản local đã nghiệm thu. Git hoặc publish/deploy chỉ thực hiện khi Khiêm giao riêng; không còn bước nghiệm thu v4 đang chờ.
