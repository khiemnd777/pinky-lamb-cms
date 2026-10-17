# MULTILINGUAL-001 v2 — P1 v2 Hero rework: scope và nghiệm thu

## Trạng thái hiện hành — đã hoàn tất theo xác nhận của Khiêm

**ĐÃ HOÀN TẤT / CLOSED_BY_HUMAN_CONFIRMATION — 17/10/2026 (Asia/Ho_Chi_Minh).** Xem [xác nhận trực tiếp, phạm vi đóng và bảng trạng thái hiện hành](../../tasks/plan.md). Khiêm xác nhận các plan đã xong và giao chỉ đồng bộ tài liệu, không sửa code hoặc chạy lại kiểm thử.

Các trạng thái chờ duyệt/chưa hoàn tất, checkbox và bước tiếp theo trong phần bên dưới thuộc lịch sử trước xác nhận đóng; không tự mở lại plan/task từ các ghi nhận đó. Giữ nguyên bằng chứng PASS/FAIL/NOT_RUN, cờ kỹ thuật và giới hạn đã ghi nhận. Lần đồng bộ này không xác minh runtime, không ghi nhận release hoặc cấp quyền thực thi mới.

## Nội dung lịch sử trước xác nhận đóng



**Approval hiện hành:** người dùng ghi “Duyệt P1 v2” ngày16/10/2026 sau khi đã trình concrete bundle và mở lại đúng mockup. Scope/digests đã freeze dưới preflight/approved-bundle; quyền chỉ P1 v2 như manifest. Các câu “chưa duyệt” bên dưới giữ bối cảnh lúc trình, không thay approval hiện hành. T00 đã có source/data before-image và OWNER clean; chưa có app/runtime acceptance.

Ngày 16/10/2026. **IN_PROGRESS / APPROVED_P1_V2**. Owner bundle: root. [P0 đã chốt](MULTILINGUAL-001-P0-v2.md), [tasks cụ thể](../tasks/MULTILINGUAL-001-P1-v2.md), [exact allowlist/digests](../../approvals/MULTILINGUAL-001-P1-v2.scope.json), [plan P0–P7](MULTILINGUAL-001-v2.md).

## 1. Quyết định không được diễn giải lại

**Thay UI Hero cũ bằng đúng mockup đã duyệt. Không adapt/giữ form cũ, không thêm đường sửa nguồn, tab hoặc nút ngoài mockup.** Source/shared read-only trong workspace mới. Việc biên tập phần dùng chung không nằm trong P1 v2; không lấy lý do bảo toàn UI cũ để đổi thiết kế mới. Dữ liệu và backend thích hợp được tái sử dụng; UI nguồn cũ không phải constraint thiết kế.

Ba file HTML/CSS/JS nguồn chuẩn và hash tại [design approval](../../approvals/MULTILINGUAL-001-v2.design.json). Các thành phần phải giữ: sidebar/context/tab order; locale tabs; “Biên tập bản dịch”; thông điệp → CTA → disclosure bổ sung; source dialog read-only; save theo locale; saved preview cạnh form; preview mở rộng Desktop/Mobile; mobile Biên tập/Bản đã lưu và thanh lưu dưới.

Người dùng đã **Approved plan v2/P0** và yêu cầu trình P1 để duyệt implementation. Lượt này không sửa app/mockup/data. Approval P1 v1+A1 là lịch sử, không mở implementation v2. Không tự đánh dấu UI sản phẩm hoặc bản dịch đã nghiệm thu.

## 2. Kết quả và phạm vi thực thi xin duyệt

Luồng thật: Toàn website → Đầu trang, Hero và SEO → Hero → chọn EN/VI/JA → nhập → lưu bản đang chọn → readback → xem đúng saved revision → export QA Hero đúng thiết kế. CMS tiếng Việt; EN mặc định lần đầu vào editor; không đổi tab mặc định của các màn hình không liên quan.

Trong phạm vi:

1. Dỡ panel append sai vị trí và per-run form cũ; mount workspace mới chỉ tại tab Hero. Shell actions chỉ thay trong localized Hero context, không hiển thị Lưu website/Gửi duyệt hoặc preview toàn site gây hiểu nhầm. Header/SEO và nhóm khác giữ semantics của chúng.
2. Nối layout và controls mockup với controller/API thật; thêm adapter textarea/selection vào existing runs. Không copy state/fake save/prototype JS làm controller sản phẩm.
3. Giữ sidecar/data/save contract/CAS/idempotency/audit; guard tab/group/resource/review/logout/keyboard/programmatic transitions. Source drift và unknown commit giữ chữ/intent, không fake success.
4. Viết Hero composition mới theo mockup; safe brand/logo projection, stylesheet nguồn cố định, private preview scaled1200/full/mobile và QA export cùng thiết kế.
5. QA envelope revision2, resource validation và **CSP delta giới hạn** ở section4; không thêm API route/auth policy.
6. Focused unit/integration/contract/browser, actual authorized demo save/readback và matched visual comparison. Operator export không tạo thêm nút kỹ thuật trong author flow.

Không thuộc P1: editor nguồn/dùng chung mới; switch/routing public :5010; nội dung ngoài Hero; editorial submission/approval; migration/reset/reimport; media upload/process, assets/font binary/dependency mới; M3/M4 closure; global config/Git/cloud/Production. QA CTA inert, không tự bật link/showreel/download vì mockup hiển thị nhãn.

## 3. Dữ liệu và API giữ nguyên

GET/PUT `/api/cms/hero-localizations/home-v3/{en|vi|ja}`: nguyên read/save/receipt và draft record revision1. GET `.../{locale}/qa`: current response nâng lên envelope2, draft bên trong vẫn1. Auth/ACL, host/origin, timeout, logout và transport route admission A1 giữ; `admin/auth.mjs`/`cms-api/routes.mjs` chỉ đọc để kiểm caller, không thuộc allowlist sửa.

Không collection mới. Chỉ `cmsLocalizedHeroDrafts/home-v3--en|vi|ja` được ghi trong authenticated tests đã có before-image. Operations chỉ append `cmsLocalizedHeroOperations/ml001-p1-<sha256>` theo service thật. Không đổi resource ID, shared targets/media/order/factual sources hoặc base Home v3. Giới hạn text/runs/body64KiB/envelope256KiB giữ; [P0 sections4–6](MULTILINGUAL-001-P0-v2.md) là contract chi tiết.

First-create runtime trên ba IDs retained đã có dữ liệu không được ép bằng delete/reset; kiểm bằng controlled fixtures và giữ proof boundary. Không tự đổi source để ép source-drift. Không coi OWNER là bằng chứng runtime của các role khác.

## 4. QA/resource/CSP delta cần duyệt cùng bundle

Đây là thay đổi kỹ thuật để thực hiện giao diện đã duyệt, **không thay bố cục hoặc luồng UI/UX**:

- QA2 có fixed presentation ID `MULTILINGUAL_HERO_V1`, safe brand/logo/tagline và stylesheet identity từ trusted context. Không trả toàn settings/private/source catalog.
- Resources QA2 tối đa9 thay8 để chứa Hero image, logo, baseline CSS, presentation CSS và5font hiện có; dedup cùng asset ID. QA1 giữ caps/shape cũ. Caps bytes/resource, aggregate64MiB và envelope256KiB không tăng.
- Presentation CSS do `preview/hero-localization-presentation.mjs` sở hữu; text literal, fixed hash/size/path, không nhận CSS người dùng. Private inline style và exported presentation CSS có cùng bytes; baseline CSS/font binaries giữ nguyên.
- Vì `srcdoc` kế thừa parent CSP, `admin/index.html` chỉ thêm **đúng hash SHA-256 của literal này vào style-src**. Child cho cùng hash; giữ sandbox rỗng/script/connect/form/object/media denies. Không wildcard, thêm origin, arbitrary nonce, unsafe-inline cho style element hoặc đổi directive khác. Hash do source/test/build đối chiếu, không lấy tùy ý từ API.
- Validate UTF-8/base64/hash/size, resource roles/path/URL và brand/logo relationships trước render/export. Legacy QA1 renderer/export vẫn đọc được bundle lịch sử; không ghi lại artifact v1 hoặc silently render layout cũ cho QA2.

Chi tiết/căn cứ: [P0 section7](MULTILINGUAL-001-P0-v2.md#7-stylesheetcsp-delta--giải-pháp-cụ-thể-để-xin-duyệt). Runtime effect và inherited-policy negative cases phải được kiểm trong P1; chưa có PASS ở lượt P0.

## 5. Ownership và exact paths

Manifest có **32 paths: 18 source/tool paths và14 test paths**, gồm4file mới. Một implementer giữ quyền ghi source trong mỗi task; root giữ scope/tasks/approval/index. Review trả findings, không viết source. Các file dùng lại giữa task được bàn giao tuần tự, không nhiều writer cùng lúc. Không tự sinh thêm agents.

32 paths là tập tối đa được xin duyệt; không có nghĩa phải sửa tất cả. Chỉ thay phần cần cho AC, không cleanup/refactor toàn module. Auth, route registration, baseline assets/config, historical snapshots và mockup ba file nằm ngoài quyền ghi. Source mới có expected state ABSENT trong manifest; file xuất hiện ngoài kế hoạch phải đối chiếu ownership/base trước ghi.

## 6. Runtime/data writes xin duyệt cho P1, chưa thực hiện

| Bề mặt | Giới hạn |
| --- | --- |
| Runtime | Chỉ demo-pinky-lamb-cms và existing loopback emulators. Node22.23.3/npm10.9.9/Playwright đã có; không install/download tooling hoặc login Firebase thật |
| CMS5173 | Dùng server hiện có. Sau freeze source có thể reload hoặc restart **chỉ Vite5173** nếu backend/module cache cần, phải xác minh đúng process/command trước; không kill theo port hoặc restart Auth/Firestore/Storage/Hosting |
| Đăng nhập | Phiên demo hợp lệ qua login bình thường, người dùng nhập nếu cần; không đọc/xuất password/token/Auth headers/storageState hoặc tạo account/role/custom token |
| Browser test | Tab test riêng; không logout hoặc reset tab OWNER người dùng. Native page/test interactions, không bypass API transport/auth để lưu |
| Read preflight | Source digests, locale/base/resource identities, counts/hashes của retained records liên quan; không dump nội dung private không cần thiết |
| Mutations thật | Chỉ3Hero sidecars, tối đa16commits thành công tổng cộng + operation tương ứng. Snapshot content trước; mutate candidate để kiểm rồi restore **đúng nội dung** bằng CAS hợp lệ. Revision/audit tiếp tục tăng, không xóa operation hoặc đặt revision lùi |
| Budget phân bổ | Normal save+restore 3locale:6; EN CAS winner+restore:2; pre-delivery retry+restore:2; response-loss retry+restore:2; save-and-switch+restore:2; tối đa2commits cho focused repair/rerun. Retry cùng key không tính commit mới nếu service đúng |
| Unknown outcome | Drain/xác minh cùng intent trước restore. Nếu không xác định commit hoặc source changed thì dừng write liên quan, giữ evidence; không blind restore/rebase/overwrite |
| Fixtures | Unit/controlled UI isolated in-memory dùng dữ liệu tổng hợp; không thêm role/members/legacy drafts. Role thiếu thì NOT_RUN, không tạo fixture live để giả runtime role |
| Output | Chỉ `.local/test-outputs/multilingual-001/p1-v2/`, `.local/cache/multilingual-001/p1-v2/`, `.local/exports/multilingual-001/p1-v2/`; new run directories, không overwrite bằng chứng cũ |
| QA server | Nếu cần mở riêng127.0.0.1:4174 phục vụ export P1 v2; không thay4173 QA v1,4186 mockup hoặc5010 baseline. Chỉ dừng process QA4174 do chính slice tạo |

Chạy static/build/unit trước khi freeze và đăng nhập browser thật để tránh lặp reload làm mất in-memory session. Nếu quá16commits hoặc cần dữ liệu/role/process khác, dừng phần vượt scope và trình delta cụ thể; tiếp tục phần độc lập đã được phép.

## 7. Tiêu chí nghiệm thu P1 v2

Mọi AC hiện **NOT_RUN cho implementation v2**. P0/static/source inspection không phải proof runtime hoặc parity.

| AC | Điều kiện đạt | Proof bắt buộc |
| --- | --- | --- |
| AC01 — Mockup fidelity | Workspace mới đúng vùng/tab/hierarchy/spacing/controls/order; không panel/form cũ hoặc lối sửa nguồn tự thêm; source read-only | Mockup và app chụp **riêng** cùng dữ liệu/trạng thái/scroll,1440×900 và390×844, zoom100%; ghi mọi delta, không tự chấp nhận khác biệt |
| AC02 — Context actions | Hero chỉ có save theo locale, không save/preview/send toàn site lẫn ngữ cảnh; restore behavior ngoài Hero | Desktop/mobile interaction, Header/SEO/khác group, không chỉ test class hidden |
| AC03 — Text round-trip | Heading/description/format/IME/Unicode/paste/undo không mất text hoặc marks ngoài vùng sửa; caps giữ; CTA/alt đúng shared semantics | Unit adapter + rendered keyboard/pointer/IME thực tế khi đủ công cụ; khả năng chưa chạy ghi riêng |
| AC04 — Save/readback | EN/VI/JA lưu độc lập/readback/reload đúng; không ghi base hoặc locale khác; empty status đúng | Phiên OWNER/EDITOR hợp lệ, API receipt + readback + before/after; sample không thành editorial approval |
| AC05 — Transitions | Ở lại/Escape giữ context/text; discard đúng bản; save-and-switch chỉ khi xác nhận; tab/group/resource/review/logout đều có guard | Pointer+keyboard+programmatic, dirty/pending/error cases, không chỉ click locale |
| AC06 — Reliability | CAS một winner/một409, response-loss retry same key/body không thêm commit, unknown intent không bị xóa, late reads không overwrite | Controlled fixtures + two-tab authenticated cases trong mutation budget; forced cases chưa chạy giữ NOT_RUN |
| AC07 — ACL/session | OWNER/EDITOR save theo quyền; Reviewer/Publisher/anonymous/invalid-member deny theo existing semantics; Auth change/destroy clear private state | Source+contract và runtime theo role phiên có thật. Chỉ OWNER thì thiếu role runtime vẫn mở, không gọi full role matrix PASS |
| AC08 — Preview identity | Saved preview giữ đúng locale/revision/hash/base/presentation, dirty không đổi preview; empty không fallback source; scaled1200/full/mobile faithful | Response/readback/frame identity + matched rendered states; không dùng draft working state để fake saved preview |
| AC09 — Hero/locale | EN/VI/JA đúng composition đã duyệt, artwork/logo chính xác, typography Nhật không ngắt vụn hoặc clip chữ hợp lệ | Desktop/mobile +long valid content, glyph/line wraps và CTA; sample strings chưa là bản dịch được duyệt |
| AC10 — CSP/privacy | Parent hash duy nhất đúng literal, child effective policy đúng, sandbox rỗng/scripts0; extra style/hash mismatch/script/connect bị chặn; URLs/budgets cleanup | Browser positive/negative với policy inherited thật; static regex không thay proof runtime; không claim heap/GC |
| AC11 — QA2 integrity | QA2 safe projection/roles/size/hash/version đúng; legacy QA1 không bị silent reinterpret; export same presentation CSS/assets, noindex/inert | Contract/renderer/export tamper tests +actualQA2 bundle/HTTP4174/hashes, path containment/symlink controls |
| AC12 — Responsive/a11y | Desktop1440, mobile390, bổ sung768/320; field/action/dialog trong container nhìn thấy và thao tác được; savebar không che nội dung | Render thật, focus order/dialog/Escape/keyboard/tab-controls, reduced-motion; không dùng page no-overflow để suy nút không bị che |
| AC13 — Preservation | Retained base/other drafts/media/import/approval records và baseline/mockup bytes nguyên; sidecar restore content đúng, audit append đúng budget | Before/after source/data manifests, receipts/readback; không rollback revisions hoặc xóa test audit |
| AC14 — Handoff | Source/callers/routes/resource pipeline/commands đầy đủ, scoped lint/build/tests/review đúng risk; human product acceptance riêng | Task evidence matrix, actual commands/results, NOT_RUN+owner+next; không claim Production/LOCAL_COMPLETE |

Fixture dùng so parity có thể lấy text minh họa mockup, nhưng phải ghi rõ fixture. Chứng cứ luồng thật giữ riêng và dùng data identity thật; không biến fixture screenshot thành API/authenticated proof. Content khác nhau phải so layout theo data tương ứng, không đổi text để che lỗi.

## 8. Cách kiểm và approval tiếp theo

Commands **dự kiến sau implementation**, chưa tồn tại selector v2 tại lúc trình: từ `pinky-lamb-cms/`, pinned Node chạy `scripts/local-guard.mjs multilingual-p1-v2 --mode unit|api|browser|export --run-id <run-id>`; export thêm `--bundle .local/test-outputs/multilingual-001/p1-v2/<run-id>/bundle.json`. Mỗi mode chạy riêng, không đưa dấu `|` hoặc `<run-id>` vào CLI literal. Guard mới chỉ chọn profile v2; selectors/runtime/guards cũ không bị nới. Build/lint scoped, build outDir task-owned, không `admin-dist`/full-suite reset.

Browser mặc định không ghi live; authenticated case chỉ bật bằng exact opt-in/preflight riêng v2, không reactivate marker v1 đã consume. Evidence/markers là điều kiện test harness, không là dependency hoặc authorization engine trong ứng dụng. Dùng canonical `apiFetch` trong phiên hợp lệ để đọc QA bundle cho operator test/export; không thêm nút QA vào workspace khác mockup hoặc đọc token để gọi raw API.

Trình người dùng duyệt **sau khi review bundle**, chưa có hiệu lực từ ví dụ này:

> Approved MULTILINGUAL-001 v2 — P1 v2 Hero rework local/emulators theo bundle đã trình, gồm QA2 và delta CSP stylesheet hash.

Approval đó chỉ mở exact bundle P1 v2; không mở P2–P7 hoặc biến source/style/runtime checks thành human product acceptance. Routine repair đúng approach/scope đã duyệt không xin lại từng bug; material UI/control/data/runtime change phải replan.


## 9. Evidence hiện hành — P1 chưa đóng

Ngày16/10/2026: A2 được người dùng duyệt trực tiếp và đã triển khai đúng sáu file, giữ nguyên mockup/UI. Private preview fixture dùng controller thật, metadata/bytes/hash thật; hai ảnh decode đủ trong sandbox rỗng cho EN/VI/JA,1440/390/768/320px và nội dung dài. Lỗi Blob trước A2 đã được giải quyết trong case này. Unit64/64, lint scoped, independent source review và build2.079modules/28files trong output riêng r2 đạt. [A2](MULTILINGUAL-001-P1-v2-A2.md), [task](../tasks/MULTILINGUAL-001-P1-v2.md), [summary](../.local/test-outputs/multilingual-001/p1-v2/execution-summary.json).

| AC | Trạng thái / giới hạn proof hiện hành |
| --- | --- |
| AC01 | PARTIAL — matched fixture actualprivate3locale/4width, source chỉ tại Hero đúng hierarchy; human visual acceptance còn mở. Screenshot mockup có design banner; app dùng authenticated CMS shell sẵn có, không banner mô phỏng |
| AC02 | PASS_SCOPED_FIXTURE — global source buttons/proxies ẩn/khôi phục theo Hero; không thêm controls ngoài mockup |
| AC03 | PARTIAL — adapter/unit/Unicode/undo/format đạt; IME bằng bộ gõ thật NOT_RUN |
| AC04 | PASS_OWNER_CORE — actualsave/readback/restore và receipt/audit đối chiếu; EN9/VI3/JA3 đúng originalhash,8commits; whole Authcase vẫn FAIL vì tabBcleanup |
| AC05 | PASS_SCOPED_AND_OWNER_CORE — Stay/discard và actualsave-and-switch/CAS loser giữlocale/text đạt; các transition khác theo fixture |
| AC06 | PASS_OWNER_CORE —10case proof gồm precommitretry, committedresponse-loss sameintent không thêmrevision, genuineCAS200/409 và delayedGET;drain0,restore8commits verified |
| AC07 | PARTIAL — source/contract/anonymous401 đạt; chỉ OWNER thật khả dụng; logoutA+privateDOMremoval PASS, logoutB prerequisiteUNPROVEN; các role khác NOT_RUN |
| AC08 | PASS_SCOPED_PRIVATE_FIXTURE — savedidentity/generation guards +actualbyte/hash/dataimage decode; actualsavedQA2 endpoint/bundle đã xuất; authenticatedprivateDOM A có2dataimages+2measurementimages và normal logoutgỡsạch; Bchưa chứng minh |
| AC09 | PASS_RENDERED_SCOPED — EN/VI/JA composition/longcontent/QA2 actualexport12views đạt; language/humanacceptance riêng |
| AC10 | PASS_SCOPED_POLICY_RESOURCE — img-src data: đúng A2; fixedstyle chạy; extra-style/script/event/connect/Blobframe bị chặn; budget/abort/cleanup unit đạt; actuallogoutA đạt, Bcòn mở |
| AC11 | PASS_ACTUAL_QA2_EXPORT — bundle từ canonical Auth API,30HTTPfiles khớp SHA/size;3locale×4viewport images/fonts/geometry/inert đạt tại4174; QA1 compatibility giữ |
| AC12 | PARTIAL — actualprivatefixture +12actualexportviews và109publicreplaygeometry checks đạt; IME/completekeyboardmatrix/humanacceptance còn mở |
| AC13 | PASS_TRACKED_PRESERVATION — trackednonlocalizationcollections/oldoperations/Hosting5010 nguyên; chỉ8newoperations +3restoredsidecars; protectedsource/mockup nguyên. Buildoutputincident trước A2: prioradmin-dist preservationUnknown |
| AC14 | PARTIAL — source/review/scopedchecks đạt, T10/T11/P1 chưa đóng vì tabBcleanup/otherroles/IME/humanacceptance; không suy Production/LOCAL_COMPLETE |

Headless finalbrowser sau sửa harness đạt22PASS/1AuthSKIP, không expectedfailure. Trong22có12QA1replay và1Blob-navigation-denial experiment; không gọi là21luồng v2 sản phẩm. Headedlive có một testpublicreplay lỗi navigation giữa observation; đã sửa retry lifecycle cótimeout, assertion giữ nguyên, rerun đúngcaseheadedPASS. Source ứng dụng không đổi bởi sửa test. Liveharness kết thúc20PASS/2FAIL: publicreplay đã sửa/rerun đạt; actualAuthcase timeout15phút tại vòng cleanup. Proof thật ghi10corecases PASS,8commits vàrestore/auditđúng; logout/privateDOMremoval A PASS, B NOT_RUN vì prerequisite chưa chứng minh. Không suy nguyên nhân từ screenshot của pageA. Marker đã consume, không ghi thêmdatawrites. Bản sửa test mới thêm15s observationbounds/corecheckpoint/finalproof; không xác minh hồi tố B. Owner root; bước tiếp theo chỉ kiểm read-only cleanupB trong phiên demo bình thường, không lặp mutationsequence. Đừng gọi toàn bộAuthsuitePASS.

QA2 liveexport: [HTTP proof](../.local/test-outputs/multilingual-001/p1-v2/qa-a2-20261016/http-result.json), [12view browser proof](../.local/test-outputs/multilingual-001/p1-v2/qa-a2-20261016/browser-result.json), [data preservation](../.local/test-outputs/multilingual-001/p1-v2/data-after-live-a2-20261016.json). Website5010, QA1server4173 và mockup4186 không đổi; QA2 riêng4174. M3/M4/P2–P7 giữ nguyên.
