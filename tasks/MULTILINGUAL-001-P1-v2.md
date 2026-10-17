# MULTILINGUAL-001 v2 — Tasks P1 v2 Hero rework

## Trạng thái hiện hành — đã hoàn tất theo xác nhận của Khiêm

**ĐÃ HOÀN TẤT / CLOSED_BY_HUMAN_CONFIRMATION — 17/10/2026 (Asia/Ho_Chi_Minh).** Xem [xác nhận trực tiếp, phạm vi đóng và bảng trạng thái hiện hành](../../tasks/plan.md). Khiêm xác nhận các plan đã xong và giao chỉ đồng bộ tài liệu, không sửa code hoặc chạy lại kiểm thử.

Các trạng thái chờ duyệt/chưa hoàn tất, checkbox và bước tiếp theo trong phần bên dưới thuộc lịch sử trước xác nhận đóng; không tự mở lại plan/task từ các ghi nhận đó. Giữ nguyên bằng chứng PASS/FAIL/NOT_RUN, cờ kỹ thuật và giới hạn đã ghi nhận. Lần đồng bộ này không xác minh runtime, không ghi nhận release hoặc cấp quyền thực thi mới.

## Nội dung lịch sử trước xác nhận đóng



**Approval hiện hành:** người dùng ghi “Duyệt P1 v2” ngày16/10/2026 sau khi đã trình concrete bundle và mở lại đúng mockup. Scope/digests đã freeze dưới preflight/approved-bundle; quyền chỉ P1 v2 như manifest. Các câu “chưa duyệt” bên dưới giữ bối cảnh lúc trình, không thay approval hiện hành. T00 đã có source/data before-image và OWNER clean; chưa có app/runtime acceptance.

Ngày 16/10/2026. **IN_PROGRESS / APPROVED_P1_V2**. [Scope/AC](../docs/MULTILINGUAL-001-P1-v2.md), [P0](../docs/MULTILINGUAL-001-P0-v2.md), [exact source digests/allowlist](../../approvals/MULTILINGUAL-001-P1-v2.scope.json).

**Chuẩn:** UI mới thay UI Hero cũ, đúng mockup đã duyệt; source chỉ đọc. Không giữ form cũ, thêm entry nguồn hoặc tự đổi layout. Backend/data thích hợp được giữ. P0 tài liệu hoàn tất không cấp quyền chạy task bên dưới.

## Ownership và dependencies

Root giữ scope/tasks/approval/shared indices và quyết định contract. Một implementer được giao là sole writer32source/test paths trong mỗi lát cắt; các file dùng lại giữa task được sửa tuần tự. Reviewer chỉ trả findings; human giữ quyền duyệt và acceptance. Không tự tạo nhiều agents, reviewer không tự duyệt scope. Coding/tests theo route Medium thật; root High planning/review, telemetry thiếu ghi Unknown.

Thứ tự: **T00 → T01 → T02 → T03 → T04 → T05 → T06 → T07 → T08 → T09 → T10 → T11**. Phần độc lập có thể đổi thứ tự trong scope nếu giữ một writer/file và contract compatibility; không mở rộng UI ngoài Hero trước representative đạt. T00 đã kiểm chứng; T01–T06/T08–T09 có source và scoped checks; T07/T10 còn mở vì private preview và authenticated runtime chưa đạt. P0 chỉ là tài liệu; các kiểm tra sản phẩm hiện tại thuộc approval P1 v2.

Paths trong danh sách dưới tính từ `pinky-lamb-cms/`. AC tham chiếu exact matrix trong scope; mọi proof chưa chạy ghi NOT_RUN, không chuyển thành PASS bằng source review.

## T00 — preflight và bảo toàn [x]

**Owner:** root/implementer đúng quyền. **Depends:** human Approved exact P1 v2 bundle.

- Xác minh source/mockup hashes, Node/runtime/demo/process, phiên/role thật, base/shared/3sidecar identities và before-images; inventory tối thiểu chỉ đọc. Không dùng EN5/VI1/JA1 cũ làm sự thật hiện tại nếu chưa readback.
- Ghi test-write plan ≤16commits, owned output roots, failure/restore strategy; không account/token mutation, không activate marker v1 hoặc stop emulators.
- **AC/proof:** AC07/13 prerequisites; sanitized manifest, sidecar content before-image được bảo vệ task-local, baseline/source hashes. Thiếu role không chặn static/khả năng OWNER, nhưng AC role runtime còn mở.
- **Files sản phẩm sửa:** không. **Evidence:** `.local/test-outputs/multilingual-001/p1-v2/<run-id>/preflight/`.

## T01 — transition guard cho tabs/groups [x] SOURCE_AND_SCOPED_CHECKS

**Owner:** implementer. **Depends:** T00.

**Files:** `admin/site-form-ui.mjs`, `admin/site-fields.mjs`, `tests/cms-ux-forms.test.mjs`, `tests/cms-ux-003-settings-clients.test.mjs`.

- Thêm guard tùy chọn trước commit selection/reveal; pointer, keyboard và programmatic cùng đi qua guard. Default không có guard giữ hành vi cũ của callers khác.
- Không hide panel/đổi focus trước khi dirty decision hoàn tất; pending/unknown không replay selection; không tạo dialog mới khác mockup.
- **AC/proof:** AC05/12; focused tests allowed/cancel/save/error/pending và caller regression. Không chỉ test callback được gọi.

## T02 — mount workspace và context actions [x] SOURCE_AND_SCOPED_CHECKS

**Owner:** implementer. **Depends:** T01.

**Files:** `admin/site-settings-editor.mjs`, `admin/site-media-editor.mjs`, `admin/cms-shell.mjs`, `tests/cms-ux-003-shell.test.mjs`, `tests/cms-ux-003-settings-clients.test.mjs`.

- Thay vùng Hero bằng mount slot workspace mới, bỏ append ở cuối settings; không render form Hero nguồn cũ trong Home v3 workspace. Header/SEO/nhóm khác tiếp tục semantics của chúng.
- Context rõ để shell ẩn đúng save/preview/send toàn site và mobile proxies chỉ khi Hero localized active; khôi phục khi rời context. Không thêm source editor entry hoặc đổi legacy `home` thành Home v3.
- **AC/proof:** AC01/02/05; cả ba subtab, sidebar/group/review/resource navigation và async preview không reopen context đã rời. Source dialog giữ readonly.

## T03 — adapter text/runs [x] SOURCE_AND_SCOPED_CHECKS

**Owner:** implementer. **Depends:** T00; contract P0 section5.

**Files:** `admin/hero-localization-text.mjs` (mới), `tests/hero-localization-text.test.mjs` (mới).

- Hydrate/serialize lossless khi chưa sửa; selection formatting và edits giữ marks ngoài vùng sửa. Xử lý newline, ranges/IME/paste/undo; không normalize hoặc cắt dữ liệu âm thầm.
- Giữ caps 3lines×100/8runs, description1000/12runs, emphasis NONE/STRONG/ACCENT; reject invalid edits/submission với nội dung còn được bảo vệ.
- **AC/proof:** AC03; meaningful round-trip/insert/delete/format across boundaries/Unicode/runs limit tests, không tests chỉ mirror helper implementation.

## T04 — workspace theo mockup, controller thật [x] SOURCE_AND_SCOPED_CHECKS

**Owner:** implementer. **Depends:** T02/03.

**Files:** `admin/hero-localization-editor.mjs`, `admin/hero-localization-editor.css`, `tests/hero-localization-editor.test.mjs`.

- Dựng đúng layout và control order; remove per-run form, technical paragraphs/QA actions khỏi author flow. Có blank missing draft không tự copy nguồn/ghi GET. Role/status/CTA target từ dữ liệu thật.
- Nối field/locale/save/dialog vào controller hiện có; dirty/pending/intent/error/source drift/Auth lifecycle theo P0. Scoped CSS không làm đổi UI nhóm khác.
- **AC/proof:** AC01–06/12; controller/unit + mounted interactions. Form mới không dùng prototype sample/state/timers/storage để fake API.

## T05 — QA2 safe presentation/resource contract [x] SOURCE_AND_SCOPED_CHECKS

**Owner:** implementer. **Depends:** T00; P0 contract QA2.

**Files:** `contracts/hero-localization-records.mjs`, `cms-api/hero-localization-context.mjs`, `cms-api/hero-localizations.mjs`, `tests/hero-localization-context.test.mjs` (mới), `tests/hero-localization-contract.test.mjs`.

- QA endpoint cấp envelope2 với draft1, safe brand/logo, fixed stylesheet ID và closed resources≤9; không thêm route hoặc sửa save protocol/ACL. Logo đi qua trusted legacy/media selection, không hardcode sample path.
- QA1 shape/resource caps giữ; QA2 strict union/resource roles, inline stylesheet fixed path/type/size và same-version caller contract. Không fake stylesheet URL trỏ :5010.
- **AC/proof:** AC07/11/13; tamper/unknownkey/URL/type/path/size/duplicate/authority/version/source-drift cases và body/envelope caps.

## T06 — Hero renderer và CSS nguồn mới [x] SOURCE_AND_SCOPED_CHECKS

**Owner:** implementer. **Depends:** T05.

**Files:** `preview/hero-localization-presentation.mjs` (mới), `preview/hero-localization-renderer.mjs`, `tests/hero-localization-renderer.test.mjs`.

- Thực hiện Hero EN/VI/JA theo composition/typography mockup, artwork/logo được cấp trusted; không gọi legacy layout rồi gọi đó là template parity.
- CSS literal thuần với exact SHA-256; không nhận CSS người biên tập, @import/networkurl. Escape text, QA noindex/CTA inert. QA1 được render theo legacy contract; QA2 không fallback legacy.
- **AC/proof:** AC09/10/11; source hash identity, rendering rules/version, XSS/resource tamper tests. Byte-size/markup PASS không thay rendered proof T10.

## T07 — private preview và CSP inherited [ ]

**Owner:** implementer. **Depends:** T04/06.

**Files:** `admin/hero-localization-preview.mjs`, `admin/index.html`, `tests/hero-localization-preview.test.mjs`, `tests/hero-localization-ui.local.test.mjs`.

- Same saved projection/renderer trong scaled1200 và mở rộng Desktop/Mobile; verify content/base/presentation identities. Dirty không đổi saved preview; response muộn không reopen.
- Parent `style-src` thêm đúng một stylesheet hash, mọi directive/origin khác giữ; child sandbox rỗng và fixed hash; Blob/budget/Auth/session cleanup giữ. Không dùng style-src-attr để né policy.
- **AC/proof:** AC08/10/12; positive/negative inherited CSP browser, no scripts/connect, extra style/hash mismatch blocked; saved frame/focus/cleanup. Chưa cần login thật cho fixture security tests.

## T08 — QA export và bounded profile v2 [x] SOURCE_AND_SCOPED_CHECKS

**Owner:** implementer. **Depends:** T05/06/07.

**Files:** `scripts/export-hero-localization-local.mjs`, `scripts/multilingual-p1-local.mjs`, `scripts/local-guard.mjs`, `tests/hero-localization-export.test.mjs`, `tests/hero-localization-runner.test.mjs`.

- Thêm selector `multilingual-p1-v2` chỉ dispatch profile v2 vào runner; legacy selectors/profile unchanged. Unit/api/browser/export exact arguments, không reset/seed/prepare toàn cục.
- QA2 dùng output riêng p1-v2, exact CSS bytes/closure/file hash/size; QA1/profile v1 vẫn xử lý bundle lịch sử theo contract cũ, không write lại output v1. Giữ containment/no symlink/no overwrite/64MiB caps.
- **AC/proof:** AC11/13/14; negative selector/path/size/version/tamper cases và task-owned build/lint. Các command đang là proposed trước task này, không ghi “đã chạy” ở P0.

## T09 — regression API/transport/data rules [x] SOURCE_AND_SCOPED_CHECKS

**Owner:** implementer/QA. **Depends:** T04/05/08.

**Files:** `tests/hero-localization-api.test.mjs`, `tests/hero-localization-routes.test.mjs`, `tests/hero-localization-contract.test.mjs`.

- API GET/PUT admission A1 không đổi; auth/ACL/CAS/same-key across locales/body mismatch/base-drift/readback giữ. Update expected QA2 shape vì contract được duyệt, không giảm assertions/gates.
- Kiểm denied roles/anonymous và first-create bằng controlled fixtures nếu retained IDs đã tồn tại; không xóa live IDs hoặc đổi base để tái hiện.
- **AC/proof:** AC04/06/07/11/13; unit/contract/API fixture boundaries ghi rõ. `admin/auth.mjs` và `cms-api/routes.mjs` protected đọc/so hash, không sửa.

## T10 — rendered parity và authenticated flow [ ]

**Owner:** QA/implementer kiểm; root đánh giá evidence. **Depends:** T01…09 source freeze/lint/build/unit đạt.

**Files:** `tests/hero-localization-ui.local.test.mjs`; evidence trong p1-v2 roots. Không sửa thêm product file từ vai trò reviewer.

- So template/app riêng từng view, cùng dataset/state/scroll/zoom100%;1440×900 và390×844, bổ sung768/320. Check groups/subtabs khác không bị thay semantics. Field/button/dialog phải visible/reachable trong container, không suy từ page overflow.
- Dùng actual human demo session khi cần; actual3locale save/readback, same-key retry/CAS/response loss/save-and-switch và restore trong ≤16commits. Hợp nhất normal EN save với save-and-switch khi phù hợp để giảm writes; không lấy hết budget nếu không cần.
- Verify saved preview/QA2 exportHTTP4174, resources/styles/policies và operation/data/source before-after. Test tab riêng, giữ tab OWNER người dùng, không dump token. Không lặp restart/login khi chưa freeze source.
- **AC/proof:** full AC matrix ghi từng PASS/FAIL/NOT_RUN. Missing role/IME/toolcase có owner/next; human UI acceptance và language acceptance riêng. Không ép toàn P1 PASS vì OWNER luồng chính đạt.

## T11 — review và handoff [ ]

**Owner:** root; reviewer nếu được giao quyền cụ thể. **Depends:** T10 hoặc human yêu cầu source-only handoff riêng.

- Review final diff về UI fidelity/data/security/scope; exact new source digest và protected file/data preservation; không biến reviewer PASS thành human acceptance.
- Cập nhật task matrix/summary/manual steps/limitations, marker consumed và owned QA process info. Không sửa archived snapshot/checksum, mockup source hoặc dùng cleanup xóa audit.
- **AC/proof:** AC14; source complete/runtime proven/human acceptance có trạng thái riêng. Nếu role runtime thiếu hoặc visual mismatch còn tồn tại, criterion giữ mở, nêu đúng owner/next action.

## Trạng thái hiện tại

**P0 hoàn tất; P1 v2 đang triển khai theo “Duyệt P1 v2”.** T00 source/data preflight đã đạt; các task còn lại chỉ đánh dấu hoàn tất theo bằng chứng mới của v2. Approval plan/P0 và P1 v1 không được dùng thay approval P1 v2; chưa có nghiệm thu sản phẩm hoặc quyền P2–P7.


## Handoff kỹ thuật 16/10/2026 — PARTIAL / PREVIEW_BLOCKED_A2_AWAITING_APPROVAL

Source đã freeze tại `source-independent-final-r2.json`, gồm 32 paths. Unit 55/55, UX 43/43, lint 30 modules và build 2.079 modules / 28 files đạt trong thư mục riêng r2. Browser r2 báo 21 passed / 1 skipped, nhưng một case là expected failure của ảnh private preview: diễn giải đúng là 20 case độc lập đạt, 1 KNOWN_FAIL và 1 Auth NOT_RUN. Trong 20 case có 12 replay QA1 lịch sử và một experiment ghi nhận cơ chế HTML Blob bị chặn; không phải 20 luồng sản phẩm v2 hoàn tất.

PUBLIC_LEGACY_ASSET_VISUAL_REPLAY có 109 kiểm tra geometry, ba locale, bốn chiều rộng và nội dung dài trong Desktop/Mobile; `privateBytePathVerified=false`. Kiểm tra CSP cho fixed hash, extra style, script và connect chạy với policy của parent thật. Nghiệm thu UI của người dùng và IME bằng bộ gõ thật còn mở.

T07/T10/T11 chưa đóng. [A2 v1](../docs/MULTILINGUAL-001-P1-v2-A2.md) xin delta ảnh data URI và `img-src data:` của parent/child, trong sáu paths đã thuộc allowlist; trạng thái NOT_APPROVED / NOT_IMPLEMENTED. Preview sản phẩm vẫn dùng Blob như hiện tại. Chưa restart Vite, chưa mở marker Auth v2, chưa có data commit nào trong ngân sách 16 commits. Inventory sau bằng trước; EN revision 5, VI/JA revision 1, bảy audit operations và hash Hosting :5010 giữ nguyên. Sau khi preview được sửa và kiểm, runtime cần nạp lại source API và đăng nhập demo bình thường.

Build đầu ghi nhầm `pinky-lamb-cms/admin-dist` vì cấu hình Vite bỏ qua `output` ngoài recovery. Đã capture 28 files; khả năng bảo toàn output cũ là Unknown vì thiếu before-image. Không xóa/reset hoặc khẳng định đã phục hồi. Hai build đúng thư mục r1/r2 là evidence riêng, không xóa incident.

Evidence canonical: `.local/test-outputs/multilingual-001/p1-v2/execution-summary.json`. P1 vẫn IN_PROGRESS; P2–P7, M3/M4, LOCAL_COMPLETE và Production giữ nguyên.


## Cập nhật A2 đã duyệt — 16/10/2026

User: `Approved MULTILINGUAL-001 P1 v2-A2 v1`. Đã triển khai/kiểm scoped source theo [A2](../docs/MULTILINGUAL-001-P1-v2-A2.md): unit64/64, browser21PASS/1AuthNOT_RUN, build2.079modules/28files trong output riêng r2, lint và independent source review đạt. Case ảnh private không còn expectedfailure; kiểm actualcontroller bytes/hash trong fixture, ba locale/bốn viewport/longcontent và CSP thật. QA1 legacy replay và Blob denial experiment giữ proof boundary riêng. Source32pins freeze,348before-records preserved ngoài24changes đã duyệt,6A2files; mockup/Auth/routes/corecontract/infra/baseline nguyên.

T07 source/fixture đạt, actual savedQA2 còn mở; T10/T11 chưa đóng. Dữ liệu trước live bằng baseline,0/16commits đã dùng. Harness `live-a2-20261016` chỉ mở tối đa8commits gồmrestore, chờ normalhumanlogin hai testtabs; không tự đọc credential/token, không đổi role hoặc base.

## Handoff cuối A2 — source hoàn chỉnh, P1 còn tiêu chí mở

Unit64/64; finalbrowser22PASS/1AuthSKIP; lint/build/review đạt. ActualOWNER10corecases PASS gồm retry/CAS/save-switch/readback/restore;8commits, auditappend8 khớprequestHash/receipt; originalhashkhôi phục EN9/VI3/JA3; cáccollectiontheodõi/oldops/5010 nguyên. QA2actualbundle export30HTTPfiles,12renderedviews đạt tại4174. Source cuối32pins tại `source-a2-final-r2-20261016.json`; test-only timeout/navigationpatch không đổi product/UI.

Live suite20PASS/2FAIL: publicreplay lỗi navigation đã sửa/rerunPASS; Authcase15min timeout vì tabBcleanup chưa chứng minh. Logout/privateDOMremoval A PASS, B NOT_RUN prerequisite; không báo allAuthPASS. Marker đãconsume;0pendingmutations,8/16commits đã dùng. P1/T10/T11 chưa đóng; ownerroot, next chỉ read-only cleanupB bằngnormaldemo session, không lặp mutationflow hoặc tựđọc token. Cácrolekhác/IME/humanacceptance giữmở. BộảnhUI fixture vàQA2export làproof khác nhau, không gọi fixture là authenticatedUI.
