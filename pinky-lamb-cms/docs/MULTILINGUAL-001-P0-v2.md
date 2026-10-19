# MULTILINGUAL-001 v2 — P0: contract tích hợp và chuẩn đối chiếu P1

## Trạng thái hiện hành — đã hoàn tất theo xác nhận của Khiêm

**ĐÃ HOÀN TẤT / CLOSED_BY_HUMAN_CONFIRMATION — 17/10/2026 (Asia/Ho_Chi_Minh).** Xem [xác nhận trực tiếp, phạm vi đóng và bảng trạng thái hiện hành](../../tasks/plan.md). Khiêm xác nhận các plan đã xong và giao chỉ đồng bộ tài liệu, không sửa code hoặc chạy lại kiểm thử.

Các trạng thái chờ duyệt/chưa hoàn tất, checkbox và bước tiếp theo trong phần bên dưới thuộc lịch sử trước xác nhận đóng; không tự mở lại plan/task từ các ghi nhận đó. Giữ nguyên bằng chứng PASS/FAIL/NOT_RUN, cờ kỹ thuật và giới hạn đã ghi nhận. Lần đồng bộ này không xác minh runtime, không ghi nhận release hoặc cấp quyền thực thi mới.

## Nội dung lịch sử trước xác nhận đóng


Ngày 16/10/2026. Owner contract/decision: **root**. Phạm vi được giao: hoàn tất P0 bằng khảo sát/tài liệu và trình bundle P1 v2; **không sửa sản phẩm, mockup hoặc dữ liệu**. [Plan v2](MULTILINGUAL-001-v2.md), [scope P1](MULTILINGUAL-001-P1-v2.md), [tasks P1](../tasks/MULTILINGUAL-001-P1-v2.md).

## 1. Nguồn chuẩn và ranh giới quyền

Mockup được duyệt là ba file tại [design record](../../approvals/MULTILINGUAL-001-v2.design.json), hash không đổi. Dùng đúng workspace Hero, typography, thứ tự field/actions, locale tabs, source dialog chỉ đọc, saved preview và mobile layout đã trình. P0 không tạo bản thiết kế thay thế. Các hành vi hạ tầng dưới đây triển khai trong những vùng trạng thái/điều khiển hiện có, không tự thêm tab, nút hoặc màn hình.

Approval plan/P0 không phải approval implementation P1. Bundle P1 mô tả thay đổi QA/CSP, exact paths, dữ liệu và runtime cần người dùng duyệt trước ghi code. M3/M4/LOCAL_COMPLETE và P2–P7 giữ quyền riêng.

## 2. Quyết định đã chốt: UI mới thay UI cũ

Người dùng yêu cầu bám đúng mockup mới và trực tiếp bác việc giữ cái cũ để adapt. Vì vậy P1 v2 **thay UI Hero cũ bằng workspace mới**. Source/shared chỉ đọc đúng mockup. Không giữ form nguồn cũ trong workspace, không tự thêm entry nguồn, tab/nút hoặc addendum HTML.

Backend/save contract/data và helpers thực sự phù hợp có thể tái sử dụng; form cũ không phải tiêu chí phải bảo toàn. Không đưa “sửa nguồn dùng chung ngay tại Hero” thành prerequisite để chặn P0/P1. Khả năng sửa phần dùng chung nằm ngoài slice này, cần scope/design riêng nếu được giao sau; không tự thêm vào P1 hoặc giả rằng legacy resource `home` chính là base `home-v3`.

**D01 RESOLVED_BY_DIRECT_HUMAN_CORRECTION.** Hai lựa chọn trước đó bị rút; người dùng không cần chọn lại hoặc duyệt lại mockup. Lịch sử việc agent đặt sai ưu tiên được ghi tại design record; không giữ vấn đề đó như blocker triển khai.

## 3. Context và lifecycle — không đổi thiết kế nhìn thấy

### 3.1 Mount và toolbar

- Localized editor được mount vào panel Hero qua hook của `mountSiteSettings`, không append sau toàn bộ settings. Root ownership controller không bị tạo lại chỉ vì đổi tab/locale/viewport.
- Parent sở hữu editing context gồm resource `home-v3`, group `settings`, subtab `hero`, locale và lifecycle state. Shell chỉ nhận context từ editor đang active; sự kiện UI không có quyền xác thực hoặc ghi API.
- Khi đang localized Hero: dùng action/status trong workspace như mockup; ẩn các proxy toàn website Lưu website/Xem trước/Gửi duyệt và mobile duplicate actions. Khôi phục nguyên trạng ngoài context này. Không chuyển các nút toàn site thành localized save bằng cách đổi label nhưng giữ handler cũ.
- Breadcrumb, heading và role dùng dữ liệu/thành phần thật của CMS. Bỏ banner/role giả và repetition do wrapper, chỉ trong context Hero; không restyle các nhóm khác.
- Quản lý/sidebar/whole-site review navigation đi qua cùng transition guard; không chỉ bắt pointer click. Keyboard tab change, programmatic reveal, logout/resource/group switch và hành động preview đang chờ cũng phải xác định đúng context.

### 3.2 Transition contract

`requestTransition(target)` chỉ cam kết đổi context sau khi guard trả allowed; target là ID nội bộ hợp lệ, không phải callback tùy ý do DOM text cấp. Same target là no-op. Một transition đang chờ không mở nhiều dialog. Chọn ở lại/Escape không đổi context và không xóa text; bỏ thay đổi chỉ tác động bản đang sửa; lưu và chuyển chỉ chuyển khi save + readback xác nhận đúng receipt. Save thất bại giữ context/chữ/format.

`createFormTabs` có guard tùy chọn; không cung cấp guard thì hành vi cũ giữ nguyên. Group selection/reveal trong `site-fields.mjs` cũng phải đi qua guard trước khi hide/show/focus; callback selected context chỉ phát sau commit. Programmatic reveal tới field cũ không được bypass dữ liệu chưa lưu hoặc mở editor nguồn không còn được D01 cho phép.

## 4. State contract

| State | Form/actions và preview | Chuyển context |
| --- | --- | --- |
| LOADING | Khóa controls ghi, trạng thái đang tải trong vùng hiện có; không nháy dữ liệu locale trước | Không cho response cũ overwrite target mới; generation fence |
| MISSING_CLEAN | Form trắng chưa persist, label Chưa có bản lưu; CTA phụ tồn tại theo base; không tự copy source | GET không ghi; không coi form trắng là dirty chỉ vì vừa mount |
| SAVED_CLEAN | Nội dung đúng bản đã lưu; save disabled; preview đúng identity | Đổi context an toàn |
| DIRTY | Save theo locale; preview giữ saved content và hiển thị nhắc chưa lưu như mockup | Native dialog giữ ba lựa chọn đã duyệt |
| SAVING | Khóa field/locale/transition liên quan; chỉ một request intent | Không rời context để mất intent |
| UNKNOWN_COMMIT | Nội dung/operation key được giữ; trạng thái báo chưa xác nhận, dùng chính action lưu để retry cùng key/body | Không discard hoặc đổi locale cho tới khi xác nhận/đối chiếu bằng luồng hợp lệ; không fake success |
| SAVE_ERROR | Chữ/format giữ, lỗi ở vùng notice hiện có; retry theo loại lỗi | Lưu và chuyển không chuyển nếu lỗi |
| CONFLICT | Không overwrite bản khác; giữ chữ, tải bản mới cần xác nhận thay thế | Không tự rebase hoặc gọi save với revision mới để thắng |
| SOURCE_DRIFT | Base revision/hash không khớp, bản nhập giữ, preview/save bị chặn theo trust contract | P1 không ghi base để ép drift, không auto-rebase; controlled fixture kiểm rule |
| READ_ONLY | Xem được nội dung/saved preview theo quyền; field/save không ghi | Backend vẫn quyết định ACL |
| AUTH_CHANGED/DESTROYED | Hủy read, gỡ private DOM/srcdoc, revoke owned URLs/release budgets; bỏ response muộn | Không replay transition hoặc render dữ liệu phiên trước |

Error và source drift không trở thành status “Đã lưu”. Reload/tab refresh có cảnh báo beforeunload theo khả năng trình duyệt; không hứa chặn được tab close hoặc khôi phục chữ sau crash. Không lưu private draft vào browser storage.

## 5. Rich text và dữ liệu

Contract lưu giữ nguyên `contracts/hero-localization.mjs` và record revision1: heading 1–3 dòng, ≤8 runs/100 JS code units mỗi dòng; description ≤12 runs/1000; eyebrow120, CTA80, footnote240, note300, alt300. Body64KiB/envelope256KiB giữ nguyên; đo encoded JSON, không dùng character counter để suy byte size.

Adapter trong `admin/hero-localization-text.mjs` (file mới sau Approved) ánh xạ plain textarea + selection formatting vào existing runs. Chỉ NONE/STRONG/ACCENT. Không arbitrary HTML, markdown hoặc contenteditable HTML parser. Paste plain text, newline heading là ranh giới dòng, description giữ multiline theo contract. Không NFC normalize hoặc trim nội dung toàn cục để “đồng nhất”.

- Hydrate→serialize khi không sửa phải giữ nguyên stored content/optional emphasis, không làm dirty hoặc thay hash do UI mount.
- Sửa một vùng chỉ thay text/marks trong vùng đó; giữ format phần trước/sau, xử lý insert/delete/selection xuyên dòng và Undo/Redo/IME một cách nhất quán. Không split surrogate pair; formatting không cắt combining sequence khi chọn chữ.
- Nếu thao tác làm vượt cap/runs/lines/bytes: giữ last valid working text/selection hoặc giữ bản nhập để báo validation nhưng **không submit/cắt tự động**. Cách áp dụng phải nhất quán và được kiểm; không thay limits backend.
- Toolbar theo mockup ở tiêu đề. Mô tả không tự thêm toolbar: bảo toàn STRONG/ACCENT của dữ liệu hiện có khi sửa text bằng cùng adapter, không xóa formatting vô cớ. Không thêm năng lực rich text mới vào contract.
- CTA chỉ đổi label; shared kind/target và CTA phụ present/absent từ base. Alt decorative rỗng/disabled; non-decorative có mô tả hợp lệ. Footnote/note giữ dữ liệu nhưng không tự thêm overlay/decoration ngoài composition mockup.
- Nguồn và shared data chỉ đọc trong bản dịch; default EN không gán source đang có thành EN. Không lấy sample text hoặc nhãn target cố định trong mockup để overwrite dữ liệu thật.

## 6. HTTP, persistence và QA presentation revision2

### 6.1 Endpoint/data không đổi

GET/PUT `/api/cms/hero-localizations/home-v3/{en|vi|ja}` giữ exact admission A1, schemas/read/save/receipt và auth semantics hiện có. Không route mới, không token plumbing, không đổi `admin/auth.mjs` hoặc `cms-api/routes.mjs` để làm UI. GET không tạo draft. Sidecar IDs `home-v3--en|vi|ja`; operation namespace `ml001-p1-<sha256>` giữ nguyên.

One actor/key namespace across locales, CAS transaction và append audit giữ. Unknown outcome retry cùng body/key; stale/newer readback không bị nhận là success cho bản khác. Không thêm collection hoặc migration.

### 6.2 QA endpoint revision2, caller update nguyên khối

GET `.../{locale}/qa` trả envelope **contractRevision2**, kind vẫn `LOCALIZED_HERO_QA`. `draft` bên trong vẫn revision1, cùng saved identity; `hero` vẫn merged base + localized đã validate. Bổ sung safe `presentation` gồm fixed ID `MULTILINGUAL_HERO_V1`, brand name/tagline, logo asset reference và stylesheet identity; không trả settings/private/source catalog tùy ý.

Production context lấy logo từ shared brand có trusted legacy/media authority như Hero image, không hardcode URL/file theo sample. `resources` có closed roles: Hero image, brand logo (dedup nếu cùng ID), baseline styles, presentation stylesheet, năm font baseline hiện có. **Cap tối đa9 thay8 chỉ cho QA2**, không nới QA1 hoặc payload/resource byte budgets. Không cài font mới; renderer dùng Montserrat và Japanese system fallback như mockup, không dùng Abril làm Japanese fallback.

Presentation stylesheet là text do source sở hữu, path export cố định `assets/hero-presentation-v1.css`, MIME text/css, ≤65536bytes, canonical base64 + sha256/size. Source kind APPLICATION_INLINE riêng, **không gắn URL :5010 giả cho file không được serve**. Các resources legacy/media khác giữ URL allowlist, derivative authority, paths và caps hiện có. `presentation.stylesheetResourceId` phải trỏ đúng resource cố định. Mọi ID/path unique; không duplicate asset bytes/authority để né validation.

QA1 parser/renderer/export path dùng cho bundle lịch sử giữ tương thích; QA2 parser strict, không bỏ qua unknown keys. Current API/UI chuyển đồng bộ sang QA2; static exports v1/frozen evidence không bị ghi lại. Sai version báo rõ, không silently render legacy layout cho envelope v2. Không hứa đã kiểm tương thích trước khi chạy tests trong P1.

### 6.3 Contract nền dùng tiếp cho P2–P7

- Locale registry duy nhất `en|vi|ja`; website root `/`=en, `/vi/`=vi, `/ja/`=ja. URL quyết định locale; không IP/browser auto-switch. CMS labels tiếng Việt; locale content mặc định EN, session-only selection khi chuyển nhóm, không browser storage private content.
- Logical content key là `(resourceKind, stableEntityId, locale)`; shared key là `(resourceKind, stableEntityId)`. Một entity ID dùng cho ba bản, không tạo ba project/service IDs. Hero cụ thể dùng key/store ở section6.1; module khác chốt storage/schema riêng ở phase của nó, không một universal persistence model.
- Localized fields gồm text hiển thị/alt/caption/CTA label/SEO text. Shared fields gồm ID, order, visibility, relations, brand identity, asset/focal point, factual data/sources và action target. UI dictionary (open/close/filter/validation/aria) do source ứng dụng sở hữu. Mapping theo từng nhóm trong plan v2; không biến fixture/source VI thành EN vì default website.
- Read/preview identity tối thiểu có logical key, saved revision/contentHash và shared/source/media versions đang tham chiếu. Save dùng expected revision + idempotency và resource/locale identity; không ghi nhiều locale như một side effect của save một bản. Nguyên tắc này không tạo API mới trong P1.
- Missing mandatory Hero/nav/contact/SEO chặn eligibility của locale trước P7. Missing project/service giữ entity chung, ẩn bản thiếu khỏi projection locale và đồng bộ counts/filter/featured/relations/form references; không fallback tiếng Anh âm thầm. Chưa phục vụ locale website ở P1.
- Draft save, editorial approval, served version là ba trạng thái riêng. P5 snapshot phải khóa logical key + content/shared/source/media identities; self-review guard giữ, approve VI không approve EN/JA. Source đổi tạo cờ cần đối chiếu, không sửa hồi tố snapshot hoặc tự thay bản đang phục vụ. P6 import dùng expected versions/idempotency và before-image; P7 chỉ phục vụ eligible frozen bundle local sau approval riêng.

Đây là contract nền để các phase dùng cùng thuật ngữ/identity/ownership. Field schemas, route payloads và UI mới ngoài Hero được đóng gói ở phase tương ứng trước implementation, không được hiểu là chúng đã được xây dựng hoặc mở quyền P2–P7.

## 7. Stylesheet/CSP delta — giải pháp cụ thể để xin duyệt

**Verified:** private iframe hiện `sandbox=""` và `srcdoc`; parent `admin/index.html` có `style-src 'self' http://127.0.0.1:5010`, không cho inline style element theo hash. `srcdoc` kế thừa policy của parent; chỉ thêm hash vào child sẽ không vượt được parent. Nguồn: [W3C CSP3 §7.8](https://www.w3.org/TR/CSP/#csp-inheriting-to-avoid-bypasses), [WHATWG policy containers](https://html.spec.whatwg.org/multipage/browsers.html#policy-containers). Đây là source/spec evidence; runtime mới NOT_RUN.

**Proposed delta P1 v2 cần Approved:**

1. File source thuần `preview/hero-localization-presentation.mjs` chứa presentation ID, CSS literal và SHA-256 đã tính từ đúng UTF-8 bytes. CSS không chứa dữ liệu người dùng, `@import`, network URL hay executable content. Fonts được khai báo bởi baseline stylesheet đọc sẵn, không phải download mới.
2. Thêm **đúng một hash của stylesheet literal** vào `style-src` của parent `admin/index.html`. Mọi directive/origin khác giữ nguyên. Hash thay đổi cùng stylesheet phải được kiểm bằng source/build test; không dynamic hash của CSS do API/user cung cấp, không nonce tùy ý hoặc wildcard. Đây là amendment giới hạn so với câu “không đổi CSP toàn CMS” của plan tổng thể, nêu rõ trước xin duyệt; không thực hiện trong P0.
3. Child giữ sandbox rỗng, scripts/connect/forms/object/media none như ranh giới cũ; `style-src` chỉ origin baseline hiện có và cùng fixed hash. Inline literal `<style>` phải đúng bytes/hash; `style-src-attr` giữ chính sách cũ, không dùng nó để nhận CSS người biên tập.
4. Private preview xác minh presentation resource/bytes/hash trước dùng; renderer chỉ chèn literal nguồn đã biết, không nội suy user text vào CSS. Baseline CSS vẫn link5010; new Hero class override đầy đủ để đúng mockup. Parent CMS load editor CSS qua external stylesheet hiện có, không tắt CSP/HMR protection.
5. QA2 export ghi **cùng presentation CSS bytes** thành file và dùng baseline CSS/font assets theo relative paths. QA document policy self cho stylesheet external, noindex/CTA inert; không dùng private srcdoc làm export input.

Kiểm positive/negative trên browser thật: approved hash cho style, hash sai/extra style bị từ chối, script/connect vẫn chặn, parent còn policy nguyên vẹn, không leaked private URL/token. Build kiểm hash trong parent/CSS module/API/export cùng identity. Nếu có policy khác từ response/header, phải kiểm effective policy; không sửa thêm để né lỗi mà không replan control delta.

## 8. Saved preview, responsive và export

Một renderer theo QA version cho expanded private và QA export; composition Hero v2 không gọi renderer legacy rồi chắp CSS để giả parity. Text escaped, đúng lang, safe brand projection, same artwork bytes; QA CTA inert theo P1. Một heading chính/document; khác h1/h2 theo context không đổi visual style.

CMS preview là canvas desktop1200px thu nhỏ bằng parent, caption đúng như mockup, mở rộng có Desktop/Mobile. Parent ResizeObserver quản lý scale/height/focus; không thêm script/postMessage/allow-same-origin vào iframe. Dirty vẫn xem được saved preview; không dùng working state để render “Bản đã lưu”. Missing draft có empty preview, không gọi /qa rồi fake fallback source.

Preview identity gồm locale/revision/contentHash/baseRevision/baseHash và presentation/style identity. Bản mới xuất hiện sau response/readback hợp lệ; response muộn, bị logout hoặc đổi context không được reopen frame. Image/logo Blob URL phải có shared budget, verified bytes, release/clear khi đóng/đổi phiên/destroy; không tăng budget để qua lỗi. Chi tiết kỹ thuật đặt trong phần phụ/metadata operator, không hiện thành paragraph trước form.

P1 v2 output mới dưới `.local/test-outputs/multilingual-001/p1-v2/` và `.local/exports/multilingual-001/p1-v2/`; giữ outputs v1. QA server nếu cần dùng riêng `127.0.0.1:4174`, không thay QA4173, mockup4186 hoặc Hosting5010. Bundle QA2 tối đa9files resources/locale + HTML, hashes/size/path containment và max aggregate64MiB giữ. Đường tool/runtime mới là selector hẹp, không reusing runner tổng quát có reset/seed.

## 9. Nghiệm thu P0 và việc còn lại

| P0 | Kết quả tài liệu | Trạng thái |
| --- | --- | --- |
| 01 — Pin design | Giữ ba source hashes + quote mockup và approval plan | COMPLETE_DOCUMENTED |
| 02 — Mapping/context/state | Mount/toolbar/guard theo UI mới; source read-only, không bảo toàn form cũ hoặc thêm entry | COMPLETE_DOCUMENTED |
| 03 — Contract text/data/QA/styles | Sections4–8, có explicit parent-CSP và QA2 delta; không đổi source | COMPLETE_DOCUMENTED |
| 04 — Bundle P1 | Scope/tasks/AC/exact allowlist/preflight/data/runtime/checks có trong bundle | COMPLETE_BUNDLE_READY_FOR_APPROVAL |

**P0 COMPLETE — DOCUMENTATION/CONTRACT ONLY.** Freeze bundle P1 v2 để người dùng review và duyệt triển khai. Source mockup/app/data chưa thay; mọi AC/runtime P1 vẫn NOT_RUN. P0 completion không cấp quyền implementation P1.
