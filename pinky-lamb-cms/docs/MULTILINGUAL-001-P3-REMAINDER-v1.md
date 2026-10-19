# MULTILINGUAL-001 — P3-REMAINDER v1

## Trạng thái hiện hành — đã hoàn tất theo xác nhận của Khiêm

**ĐÃ HOÀN TẤT / CLOSED_BY_HUMAN_CONFIRMATION — 17/10/2026 (Asia/Ho_Chi_Minh).** Xem [xác nhận trực tiếp, phạm vi đóng và bảng trạng thái hiện hành](../../tasks/plan.md). Khiêm xác nhận các plan đã xong và giao chỉ đồng bộ tài liệu, không sửa code hoặc chạy lại kiểm thử.

Các trạng thái chờ duyệt/chưa hoàn tất, checkbox và bước tiếp theo trong phần bên dưới thuộc lịch sử trước xác nhận đóng; không tự mở lại plan/task từ các ghi nhận đó. Giữ nguyên bằng chứng PASS/FAIL/NOT_RUN, cờ kỹ thuật và giới hạn đã ghi nhận. Lần đồng bộ này không xác minh runtime, không ghi nhận release hoặc cấp quyền thực thi mới.

## Nội dung lịch sử trước xác nhận đóng


16/10/2026. **BUNDLE_READY / AWAITING_APPROVAL; chưa triển khai sản phẩm.** [52 exact paths và before pins](../../approvals/MULTILINGUAL-001-P3-REMAINDER-v1.scope.json), [WBS canonical](../tasks/MULTILINGUAL-001-v2.md), [cách kiểm thử sửa mới](MULTILINGUAL-001-TESTING-v2.md). Một lần duyệt bao toàn bộ công việc/routine fixes trong bundle; không xin duyệt từng file hoặc bug. Harness correction đã được giao riêng; P3-REP đã nghiệm thu, không chạy lại luồng ghi của slice đó.

## 1. Kết quả bàn giao và ranh giới

**P3 hoàn tất chức năng** khi: cả Project và Service trong Home v3 có editor/status EN–VI–JA; hai tab “Nội dung mục” Work/Services hoạt động; saved preview/QA dùng dữ liệu thật; locale policy/controllers dùng IDs/availability thật, không CASE1; card/modal/accordion/sections đúng template; data bảo toàn; kiểm thử và human handoff đủ trong scope. P3 không có nghĩa đã nhập đầy đủ bản dịch cho mọi nội dung website — batch import/coverage editorial thuộc P6, approval/release eligibility thuộc P5.

Source inventory chỉ đọc mới: Home v3 revision0; 8 Project `wayfair, sony, diag, vifa, petrosetco, varna, samsung, psd`; 6 Service `brand-creative, film-content, events-experiences, exhibition-activation, integrated-communications, original-ip`. Hai section `work, services`. Exact9 sidecar targets trong ngân sách hiện ABSENT; phải đọc lại trước ghi. Inventory metadata/digests nằm trong scope JSON. Đây là trusted local diagnostic, không được báo là authenticated CMS API proof.

Bao gồm:

- Project editor đã nghiệm thu áp dụng mọi stable Project ID qua API hiện có; thêm tab Danh sách/Nội dung mục đúng mockup, kiểm đủ 8 nguồn. Dùng lại evidence P3-REP; không viết lại Project editor hoặc lưu lại Wayfair để lấy ảnh.
- Service manager cho tối đa12 nguồn; mỗi locale có `title, subtitle, summary, scope[]`; trạng thái dịch độc lập với visibility. Nối schema → API/transport → list/editor → saved preview → QA.
- Work/Services section localization; source/shared read-only, dirty/failed/CAS/unknown guards và saved identity.
- Typed projection/availability và hai-section QA thực, controller switch/filter/modal/native accordion/load-more bằng stable IDs. Đây là component QA Work+Services; không lấy P2 shell làm full website, không giả Contact/Brief/Header/Footer đã xong.

Ngoài scope: sửa shared Home v3/creation/order/visibility UI, các group P4 khác, full Brief/Contact/dictionary/SEO, P5 editorial workflow, bulk dịch/import P6, full assembly/activation P7, :5010, Auth/ACL/rules/config/package/lock, Git/deploy/cloud. Thêm mới entity được kiểm bằng owned in-memory fixture để status xuất hiện đúng; không tạo nguồn retained thật cho ca này.

## 2. Thiết kế và mapping bắt buộc

Dùng nguyên D3-PROJECT/D3-SERVICE và các workspace “Nội dung mục” trong `mockups/multilingual-p3-p5-design-v1.{html,css,js}` đã duyệt. Template baseline39files + approved Hero/switch delta pin tại [P7 lock](../../approvals/MULTILINGUAL-001-P7-template-v1.pins.json). Không mockup mới, không thêm field/control ngoài thiết kế, không giữ editor legacy cạnh workspace mới. CMS luôn tiếng Việt; chỉ nội dung thay locale.

| UI/template slot | Field locale | Shared/read-only và nguồn |
| --- | --- | --- |
| Service `<strong>` / `<small>` | `title`120 / `subtitle`120 chars | Hai slot đều thuộc cùng locale; subtitle theo thiết kế đã duyệt, không render titleVi thành ngôn ngữ thứ hai. Source đối chiếu `title/titleVi`; không auto-populate missing locale. |
| `.service-body p` / `.service-scope` | `summary`1000multiline / `scope`≤12×160 | Service ID, ordinal/order/visibility; `services/{id}/facts` bindings/catalog. Scope không bịa vai trò. |
| Work/Services eyebrow, heading, intro | `eyebrow`120; `heading`giữ typed lines/runs ≤3lines×8runs×100chars; `intro`4000multiline | Source heading runs/intro; nguồn copy `creative-copy`, thứ tự/section identity/variant cố định. Reuse rich-text primitive, không raw HTML. |
| Work “Nhãn Xem thêm” | `loadMoreLabel`80 | Map field `cta` của mockup → nút `#load-projects`; collapse/counter/aria thuộc closed dictionary. |
| Work filters/counter/more sentence/credential label; Services section CTA | Closed UI dictionary EN/VI/JA cho đúng các slots P3 | Không thêm form fields ngoài mockup. Filter IDs theo category enum; credential asset và action destination giữ nguyên. Full dictionary còn lại thuộc P4. |
| Project card/modal | Existing localized Project DTO/renderer | Chỉ expose pure card/modal rendering cho assembly; không đổi DOM/classes/font/crop/controls của representative đã nghiệm thu. |
| Native accordion + Work grid | Saved Service/Project + saved sections | Đủ copy/scope/gallery/PDF; cùng count/featured/relations/eligible set. Không CSS shrink/ellipsis/scale hoặc bỏ section để che thiếu dữ liệu. |

Dữ liệu không có trong source được phân biệt: eyebrow có trong template/dictionary, không giả là Home field; Service subtitle bản nguồn titleVi chỉ đối chiếu, candidate mới phải biên tập cùng locale. Nội dung chưa có hiện “Chưa có bản dịch”, không tự lấy EN/VI/mockup mẫu.

## 3. API, transport, callers và persistence

| Exact pattern | Method / actor | Caller |
| --- | --- | --- |
| `/api/cms/localizations/services/status` | GET MEMBER_READ | Service list metadata đủ3locale, bounded≤12×3 |
| `/api/cms/localizations/services/{serviceId}/{en|vi|ja}` | GET MEMBER_READ; PUT DRAFT_SAVE | Service editor, immutable request intent |
| Pattern trên +`/qa` | GET MEMBER_READ | Private saved Service preview/export DTO |
| `/api/cms/localizations/sections/{work|services}/{en|vi|ja}` | GET MEMBER_READ; PUT DRAFT_SAVE | “Nội dung mục” trong Work/Services |
| Pattern trên +`/qa` | GET MEMBER_READ | Saved section preview, mapping same key |
| `/api/cms/localizations/work-services/{en|vi|ja}/qa` | GET MEMBER_READ | Two-section validated projection/export và real policy |

Routes và `admin/auth.mjs` allowlist cùng exact methods/grammar/query policy; không generic arbitrary localizations. Không thay `cms-api/index.mjs`, authorization, roles, host/origin, timeout, logout, Firebase rules. OWNER/EDITOR lưu; REVIEWER/PUBLISHER chỉ đọc theo quyền hiện có. Actual other-role sessions thiếu được giữ NOT_RUN, không tạo account.

PUT shape thống nhất contractRevision1, expectedRevision nullable, expectedDependencyHash, typed content; header idempotency key strict. Service/section có schema nghiệp vụ riêng. DB draft `cmsLocalizedServiceDrafts/home-v3--{id}--{locale}`, `cmsLocalizedSectionDrafts/home-v3--{work|services}--{locale}`. Mỗi commit atomic draft+immutable operation tại `cmsLocalizedServiceOperations` hoặc `cmsLocalizedSectionOperations`; receipt gắn resource kind/id/locale/revision/hash/actor và server time, không ghi credentials.

CAS/idempotency và authorization đọc trong transaction từng callback attempt. Không cache context theo Transaction object; không automatic rebase. Replay key/body trả receipt cũ,0writes; altered body/resource/locale denied. Source digest theo dependency: selected Service/index/order/visibility/source bindings/template; Work/Services copy/shared configuration/related resource manifest. Không hash unrelated About/Hero thành stale của Service. Projection kiểm revision+digest liên quan trong cùng snapshot read; typed dependency vector/hash chống mixed-version assembly.

Callers xuyên suốt: `site-media-editor` mount Work/Service wrappers → `site-fields` navigation guards → `cms-shell` context actions → authenticated `apiFetch` → exact route → owning context/service → typed draft/QA → preview/export. Giữ một save/locale, source/shared readonly, no source editor giả. P3-REP untouched files là dependencies read-only; only Project renderer extraction có regression parity riêng.

## 4. Locale projection và template consumers

- Canonical section IDs từ Home v3; `ip-studio`, không `ip/creative`. Categories `EVENTS/FILM/COMMUNICATIONS` map rõ query `events/film/communications`, default `all`. Stable Project/Service IDs giữ qua URL/history; không thêm localized slugs/detail routes, không browser/IP auto-redirect.
- `site-locale.mjs` nhận validated policy/availability thật. CASE1/creative/ip fixture chỉ còn trong consumer P2 historical với policy truyền tường minh; không là default của production adapter. Update cả callers/export validators/tests bị tác động. Historical output P2 không overwrite.
- `QA_SAVED_PARTIAL` chỉ đọc sidecars đã lưu, còn tương thích; projection trả excluded IDs/reasons rõ, không fallback. Thiếu mandatory Work/Services section copy thì chặn two-section export. Thiếu bản dịch entity được exclude minh bạch trong component QA; count/featured/filter/service relations cùng eligible set. Không được dùng partial mode để báo full coverage hay APPROVED_RELEASE. P5 mới quyết release eligibility.
- Switch giữ controls/keyboard/focus/missing notice/dirty guards đã duyệt; EN→VI cùng Project nếu có, JA missing về Work có thông báo, direct/refresh/back-forward đúng; empty filter xử lý rõ. Service liên quan thiếu locale không được chọn interest âm thầm.
- Render Work/Services theo baseline DOM và stylesheet thật: button filters/load/collapse/counter, native case dialog, gallery/PDF, native details/summary/plus/scope và hai title slots. Component QA chỉ gắn switch controls cần kiểm, không dựng full Header/Footer/Contact giả. CTA giữ đúng typed intent `PROJECT_CONTACT`/`SERVICE_CONTACT` với stable IDs; full Brief/Contact integration thuộc P4/P7.
- Saved private preview sandbox rỗng/scripts0, CSS/fonts/resources hash/MIME/byte budgets và lifetime như P3-REP. Interactive QA có scripts đóng gói riêng, public DTO/asset closure, noindex, không private catalogs/source records. Export3routes rootEN,/vi/,/ja/ vào exclusive task output.

## 5. Công việc theo WBS canonical — một approval, một lần bàn giao P3

| Task | Thực hiện đến kết quả | Dependency / proof |
| --- | --- | --- |
| P3-04a | Service contract/context/API/status/transport + per-resource CAS/idempotency/source digest | Reuse Project transaction rules; pure/contract tests trước UI, Service actual flow trong một phiên sau khi runtime ổn định |
| P3-04b | D3-SERVICE list/editor/saved preview; tab Nội dung mục Work/Services + schema/API/renderer; Project list áp dụngmọiID | Shared mounting/guards/context cùng owner; Service representative nối thật đạt template trước expand6Service, không xin duyệt thêm bên trong bundle |
| P3-05a | Validated real locale policy/projection + Work/Services template assembly/interactions và P2 caller compatibility | Phụ thuộc typed saved DTO; missing/relations/counts/history/filter tests; không CASE1 runtime |
| P3-05b | Safe export/HTTP, scoped regression/parity; final P3 handoff và preservation receipt | Unit/fixture trước login; write business một lần; UI read-only riêng cùng owner; human acceptance riêng |

Các parent P3-02/03 phần Project dùng lại evidence đã nghiệm thu; chỉ rerun affected calls/renderer extraction/layout wrapper. Một implementer sở hữu patch tương thích; root giữ contracts/scope/shared record và review cuối. Không triển khaiP4 để tuyên bố P3xong.

## 6. Runtime, dữ liệu và ngân sách cụ thể

Chỉ demo-pinky-lamb-cms; existing loopback CMS5173/Auth9099/Firestore8080/Functions5001/Storage9199. :5010 read-only. QA owned4188, dừng owned process lúc bàn giao; không kill listener lạ. Không emulator restart/seed/reset/import. Tối đa1 Vite-only restart khi chứng minh stale ESM, trước normal login. Mọi source/harness/route readiness chạy trước login; không reload Auth vì screenshot fail.

**Exact write set9draft IDs:** Service `brand-creative × en|vi|ja`, Section `work × en|vi|ja`, Section `services × en|vi|ja`. Project Wayfair/7Project còn lại và5Service còn lại không ghi retained; functionality cho tất cả được kiểm fixture và actual status read. Không biến P3 thành P6 import.

Planned14commits: initial9 (3Service+6section); ServiceEN CASwinner1, committed response-loss1 và restorecandidate1; WorkVI CASwinner1 và restorecandidate1. Denied/replay/loser0. **Ceiling16successful commits =32document writes =≤16newoperation records**, hai contingency chỉ corrective-save trong cùng9IDs, có expected revisions và budget checkpoint. Không xóa/audit rollback. Initially missing9drafts được giữ unpublished source-based QA candidates; không ghi sample QA branding hoặc claim không nguồn. P5editorial/release vẫn riêng.

Before first PUT: trusted source/target before-image/hash, source/project/locale identities và current expected versions; nếu target đã tồn tại/concurrent khác before-image thì dừng affected write để đối chiếu, không overwrite. Với initially existing record hợp lệ, restore exact content bằng revision/audit mới, trong budget; nếu cần vượt16 hoặc đổi IDs phải trình delta trước. Existing Home/Hero/Project operations giữ hash/history; budget không cho ghi user/member/Auth/media records.

Outputs mới chỉ trong `.local/{test-outputs,exports,cache}/multilingual-001/p3-remainder-v1/<exclusive-id>/`; không overwrite cũ/admin-dist. Export public-root chỉ manifest allowlisted files, private before-image/journal ngoài public. New commands sau Approved implementation (hiện **chưa tồn tại**): pinnedNode `scripts/local-guard.mjs multilingual-p3 --mode unit|api|fixture|build|export --run-id <id>`; export explicit task bundle. New owner consumer registration `scripts/multilingual-browser-session.mjs p3-live <id>` sẽ dùng same owner và registered steps, không tự chạy writes khi launch.

## 7. Acceptance criteria P3 còn lại

| ID | Điều kiện đạt và proof |
| --- | --- |
| R01 | D3Service + Work/Services tabs đúng mockup, một save/locale/source read-only, không lặp actions/editor. Actual OWNER1440/390; fixtures bổ sung768/320, controls/focus/clipping. |
| R02 | Cả8Project/6Service được map theo ID; new/hidden/reordered/missing tested trong fixture; no shared mutation khi save1locale; metadata≤24Project/12Service, không N+1 unbounded. |
| R03 | Strict field/runs/byte limits, Vietnamese/Japanese paste/IME/Undo field phù hợp, no HTML/shared/unknown injection; unit+actual invalid PUT0writes. Physical IME chưa có thiết bị được ghi giới hạn thay vì fake PASS. |
| R04 | Service vàSection atomic CAS/idempotency, permission reread, same-key replay/response loss/input preserved. Actual Service vàWork CAS trong planned budget; unknown phase không replay whole writes. |
| R05 | Source digest chặn related change, bỏ unrelated change; corrupt/missing source stops; callback retry fresh. Controlled context tests, không sửa retained Home để tạo drift. |
| R06 | Service `<strong>/<small>` cùng locale, đủ summary/scope; Work heading format/CTA đúng; no auto titleVi/EN fallback. Same-data baseline component comparison1440/390 +768/320, text dài hợp lệ; không shrink/layout delta. |
| R07 | Real policy URL/filter/project/category/section/availability; EN→VI same entity, missingJA notice, emptyfilter, invalidinput, refresh/history/dirty, canonicalip-studio. All visible counts/featured/relations cùng eligible set; P2 prior guard semantics giữ. |
| R08 | Private saved identity đúng key/revision/content/dependency/resource hashes, scripts0/sandbox, tamper/budget/session cleanup. Dirty chưa lưu không đổi saved preview. |
| R09 | Export3locale closure hashes/MIME/paths/overwrite/traversal/Host deny; no private payload/noindex. HTTPmanifest toàn bộ, QAactual saved outputs desktop/mobile; missing mandatory blocks. |
| R10 | Default-deny owner; write stage checkpoint trước UI; intentionally failed visual → same context/Auth RAM, reload readonly helper + retry không lưu lại; timeout giữ browser; finish cleanup. Fixture correction evidence reuse; actual normal session reuse được quan sát trong P3 live, không thêm login chỉ để diễn lại lỗi. |
| R11 | Target9drafts/budget receipts, before/after Home/Hero/Project preserved; retries/denied0, source pins/protected hash giữ. Không account/role/infra/baseline writes. |
| R12 | Scopedunit/API/fixture/lint/syntax/isolatedbuild + ảnh/evidence; source-complete/runtime-verified/human-accepted tách rõ. FullP3 chức năng đạt4tasks trên, không đóngP1/P2/M3/M4/LOCAL_COMPLETE hoặc fullwebsite. |

Test selection: Service rules/API/editor/preview/renderer; section rules/API/editor/renderer; projection/export/runner; actual owner adapter; affected Project renderer/P2 resolver/controller/export regressions. Harness đã PASS được tái dùng trừ consumer/owner input đổi; không rerun retained P3-REP, không full CMS suite để cập nhật tài liệu. Chưa có kết quả runtime của bundle này; bảng AC không phải PASS hiện tại.

## 8. Duyệt bundle

**`Approved MULTILINGUAL-001 P3-REMAINDER v1 — toàn bộ P3 còn lại local/emulators`**

Lời duyệt này mở implementation/routine fixes/tests đúng52paths, UI đã duyệt, runtime và ngân sách trên. Kế hoạch P3–P7 đã duyệt trước vẫn là parent; bundle này không tự mởP4–P7. P6retainedimport và P7activation phải có bundle/approval riêng. Không hỏi lại từng file; material UI/data/control/scope delta vẫn trình trước khi sửa.

## Amendment sau Auth (16/10/2026)

CMS-AUTH-REMEMBER-001 v1 đã được Approved riêng. Before pins Auth/harness và testing policy trong bundle proposed này được cập nhật theo source Auth mới; giữ52paths, API,9draft targets và max16commits/32document writes. Dùng lại owned persistent profile; `finish` giữ SDK login và `verify-logout` là ca riêng. Không triển khai P3 trước approval riêng cho P3-REMAINDER. Source/runtime/acceptance Auth theo [task canonical](../tasks/CMS-AUTH-REMEMBER-001.md); không thay bằng chứng P3-REP lịch sử.
