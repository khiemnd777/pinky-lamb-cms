# MULTILINGUAL-001 v1 — P1 Hero local/emulators

> **Cập nhật 16/10/2026:** mockup HTML sửa đã được người dùng duyệt. Kế hoạch hiện hành là [MULTILINGUAL-001 v2](MULTILINGUAL-001-v2.md), tasks tại [v2](../tasks/MULTILINGUAL-001-v2.md), [design record](../../approvals/MULTILINGUAL-001-v2.design.json). Tài liệu v1 dưới đây giữ lịch sử; UI P1 sản phẩm cũ vẫn bị từ chối, rework implementation HOLD chờ scope/Approved mới. Không dùng checklist v1 để resume.

Ngày: **16/10/2026**, Asia/Ho_Chi_Minh. Trạng thái **IN_PROGRESS / UI_ACCEPTANCE_REJECTED / DESIGN_REPLAN_REQUIRED**. Approval P1+A1 lịch sử giữ nguyên; implementation hiện **HOLD theo yêu cầu human review** cho phần bị ảnh hưởng. Unit38/browser17/scoped lint/build PASS; OWNER đã lưu/readback, kiểm retry/CAS/lỗi mạng/logout và export QA thật; AC04 role runtime còn thiếu trong matrix. [Tasks và evidence hiện hành](../tasks/MULTILINGUAL-001-P1-v1.md#bằng-chứng-hiện-tại).

## Human UI review — 16/10/2026, thay thế trạng thái acceptance trước đó

**UI_ACCEPTANCE_REJECTED / DESIGN_REPLAN_REQUIRED.** Người dùng đã kiểm tra P1, từ chối chất lượng UI/UX và yêu cầu đề xuất thiết kế trước triển khai. Dừng thay đổi sản phẩm/luồng kiểm thử ghi dữ liệu cho phần bị ảnh hưởng; chưa có Approved thiết kế sửa. P1 chưa được nghiệm thu. Approval P1+A1 và các bằng chứng kỹ thuật trước đó được giữ để truy vết; không cấp quyền triển khai phương án thiết kế mới. Không có child đang chạy khi ghi nhận hold.

**Verified qua ảnh đã lưu:** panel bản dịch bị ghép dưới nội dung Đầu trang; form trình bày cấu trúc “Đoạn chữ/Nhấn mạnh” thay cho tác vụ biên tập; hành động lưu/preview tách khỏi ngữ cảnh chung. Hero Nhật dùng cỡ chữ lớn, ngắt “ヒーロー” giữa từ. Kiểm tra hình học không tràn màn hình không đồng nghĩa chất lượng UX hoặc human acceptance.

**Proposed — thiết kế sửa, chưa được duyệt/triển khai:**

1. Tích hợp quản lý bản dịch trong tab Hero của nhóm “Đầu trang, Hero và SEO”. Phân biệt rõ nội dung nguồn dùng chung với ba bản ngôn ngữ; không gọi nội dung nguồn hiện có là bản Anh. Dùng thành phần, màu sắc và spacing của CMS hiện hành.
2. Một vùng chọn “Tiếng Anh | Tiếng Việt | Tiếng Nhật”, trạng thái bản đang chọn, một hành động chính “Lưu bản [ngôn ngữ]” và hành động phụ “Xem bản đã lưu”. Các hành động phải chỉ rõ đối tượng; không để Lưu website/Gửi duyệt gây hiểu nhầm rằng sẽ lưu/gửi bản dịch P1.
3. Biên tập theo nội dung: tiêu đề với công cụ nhấn mạnh ngay tại vùng chữ, mô tả, nhãn nút và thông tin bổ sung. Không phơi bày mảng runs, revision/hash hoặc thao tác QA trong luồng chính. Công cụ định dạng chỉ biểu đạt contract hiện có, không tự mở rộng rich text.
4. Desktop đặt nội dung và preview đã lưu cạnh nhau; preview ghi rõ trạng thái đã lưu, mở rộng xem đúng kích thước. Mobile một cột với thao tác mở preview riêng. Chưa đề xuất thay saved preview bằng live preview.
5. Hero dùng cùng nhận diện và artwork; trình bày typography, cỡ chữ và ngắt dòng có chủ đích cho EN/VI/JA ở desktop/mobile. Không tự dịch hoặc coi dữ liệu synthetic là bản dịch được duyệt.
6. Trình mockup cụ thể desktop/mobile của CMS và Hero ba ngôn ngữ, kèm trạng thái chưa có bản dịch/chưa lưu/đang lưu/lỗi/xung đột/chỉ đọc, trước khi xin Approved triển khai. Tiêu chí review gồm đúng ngữ cảnh, rõ thao tác lưu, dễ biên tập, cân đối chữ/ảnh, không ngắt từ Nhật như ảnh hiện tại và giữ các bảo vệ dữ liệu P1. Đây là tiêu chí đề xuất, chưa phải evidence PASS.

Bước tiếp theo: duyệt thiết kế cụ thể, sau đó cập nhật phạm vi/tasks/AC sửa và nhận Approved đúng version trước sửa source. Không sửa source, dữ liệu hoặc runtime trong lượt ghi nhận này.

## Approval hiện hành

Người dùng trực tiếp ghi ngày 16/10/2026:

> Approved MULTILINGUAL-001 v1 — P1 Hero local/emulators theo bundle đã trình. Triển khai và kiểm thử đúng phạm vi P1.

Sau source preflight, người dùng duyệt đúng amendment transport:

> Approved MULTILINGUAL-001 P1-A1 v1

**A1 v1:** bổ sung duy nhất `admin/auth.mjs` vào allowlist để `apiFetch` nhận GET/PUT `/api/cms/hero-localizations/home-v3/{en|vi|ja}` và GET `.../{locale}/qa`. Dùng các tests P1 đã khai báo. Giữ Auth/ACL, host/origin, timeout, logout, sandbox/CSP và route khác. Lý do: transport hiện có deny-by-default, allowlist P1 trước đó thiếu file caller này; không được bypass bằng raw fetch/token plumbing.

Manifest giữ digest bundle được duyệt và snapshot nguyên bản dưới `.local/test-outputs/multilingual-001/p1-v1/approval-bundle-20261016/`. Nội dung xin duyệt ban đầu bên dưới giữ để truy vết; trạng thái hiện hành theo phần này và approval record trong manifest. A1 không mở rộng dữ liệu/runtime/production của P1.

## 1. Bundle xin duyệt

- Phương án tổng thể đã được người dùng đồng ý: [MULTILINGUAL-001 v1](MULTILINGUAL-001-v1.md).
- Scope/contract/AC có thẩm quyền của P1: **tài liệu này**.
- Thứ tự, ownership và checklist: [tasks P1](../tasks/MULTILINGUAL-001-P1-v1.md).
- Exact allowlist, document/source digests: [scope manifest](../../approvals/MULTILINGUAL-001-P1-v1.scope.json). Hash không phải runtime authorization; không đưa manifest/reviewer/model identity thành dependency ứng dụng.

Lời người dùng hiện chỉ cho ghi tài liệu và chuẩn bị P1 để duyệt. Implementation chỉ bắt đầu sau trực tiếp Approved đúng bundle/version/slice. Câu đề xuất để người dùng duyệt **sau khi review**, chưa có hiệu lực từ việc xuất hiện ở đây:

```text
Approved MULTILINGUAL-001 v1 — P1 Hero local/emulators theo bundle đã trình.
```

Routine repairs/checks trong P1 được duyệt và còn mở không cần xin lại từng bug. Đổi isolation, auth, dữ liệu được phép ghi, activation :5010, dependencies hoặc approach đáng kể phải replan/Approved trước phần bị ảnh hưởng. Sau khi P1 đóng, thay đổi mới cần scope mới.

## 2. User result và ranh giới

Editor/Owner mở **Toàn website → Đầu trang, Hero và SEO → Hero đa ngôn ngữ (P1)**; nhập riêng Anh/Việt/Nhật; lưu; tải lại; xem đúng saved revision trong private preview; tạo artifact QA Hero local đúng bản vừa lưu.

P1 là vertical slice có persistence thật qua API và emulator, không phải form/mock localStorage. Locale lần đầu chọn trong panel P1 là `en`; label/control CMS vẫn tiếng Việt. Không thay global CMS group/state hoặc existing whole-site save semantics.

### Trong phạm vi xin duyệt

1. Locale registry `en|vi|ja`, contract trường dịch Hero, bản nháp localized tách khỏi `home-v3` hiện có.
2. GET/PUT qua API CMS canonical và Auth/ACL hiện có, CAS revision/idempotency, append audit cho thao tác mới.
3. Panel Hero ngôn ngữ, lưu/readback và chuyển bản an toàn; read-only theo role; unsaved/error/conflict states.
4. Preview **riêng Hero**, authenticated, saved revision, sandbox/CSP hiện hành; không full-site section navigation.
5. Artifact QA riêng Hero cho ba locale, không index và không nhận là website hoàn chỉnh/được duyệt. Mở qua server QA loopback riêng nếu đủ prerequisite.
6. Focused contract/API/browser/export/security regression và bằng chứng bảo toàn.

### Ngoài phạm vi

- Header/footer switch website, routing `/vi/`/`/ja/` công khai, giữ modal/filter/brief khi switch: P2.
- Project/service hoặc bất kỳ nội dung khác ngoài Hero: P3/P4. SEO editable đầy đủ, canonical/hreflang/sitemap toàn site: P4/P7.
- Editorial review/approval locale và stale-translation workflow toàn site: P5. P1 không có nút Gửi duyệt cho bản dịch và không tạo snapshot APPROVED.
- Migration/reimport/mutation `home`, `home-v2`, `home-v3`; tạo lại import lineage; tự động dịch/AI API; human acceptance bản dịch: P6 hoặc quyết định riêng.
- Đổi nguồn Hosting :5010, overwrite baseline, publication/history/current-pointer machinery hoặc M4: P7/scope khác.
- Upload/process media, đổi rights, đổi font binary/cài dependency, Firebase login thật/cloud/billing/IAM/global config/Git/deploy.
- Preview navigation delta đang HOLD: [nguồn riêng](CMS-UX-003-PREVIEW-NAVIGATION-DELTA.md); P1 không xử lý hoặc đóng gap này.

## 3. Quyết định kỹ thuật P1 — Proposed, xin duyệt trong bundle

### 3.1 Lưu riêng bản dịch, không đổi schema cũ

Tạo `cmsLocalizedHeroDrafts/home-v3--en`, `home-v3--vi`, `home-v3--ja`; mỗi bản một document có contract version riêng, locale, revision, base revision/hash, nội dung localized và actor/time. Không tạo ba bản Home v3; không mở rộng schemaVersion3 hoặc sửa literal locale của dữ liệu cũ.

Base Hero dùng dữ liệu Home v3 đã lưu và đã validate qua trusted context hiện có, với media refs hợp lệ. P1 giữ base **chỉ đọc**; dùng shared inputs/asset refs từ base. Nếu chưa có base hợp lệ hoặc media derivative cần thiết, báo điều kiện thiếu; không seed/import/placeholder giả thành công.

| Trường Hero | P1 localized | Shared/read-only |
| --- | --- | --- |
| heading | Lines, text runs và emphasis hợp lệ | Không arbitrary HTML/code |
| eyebrow, description | Có | Giữ loại/schema text hiện có |
| primaryAction, secondaryAction | Chỉ label của hành động đang có | Kind và target từ base; không tự thêm action |
| footnote, note | Có; giữ optional/empty semantics | Không tự thêm claim |
| image | Alt nếu không decorative | Asset ID, decorative flag, focal point, media version từ base |
| kind, variant, thứ tự/layout | Không | Từ base |

Content nested arrays lưu trong JSON string theo pattern hiện có để tránh shape Firestore không hỗ trợ. Server validate cấu trúc và rendered text trước/sau decode; không mở schema tùy ý. Locale không hợp lệ hoặc key ngoài allowlist bị từ chối. Giữ giới hạn text/runs cũ và trần request/envelope 64/256 KiB, đo cả escaped UTF-8 JSON, không tăng giới hạn để tránh lỗi.

GET không khởi tạo dữ liệu. Bản thiếu hiển thị **Chưa có bản dịch**; editor nhập mới hoặc bấm sao chép nguồn rõ ràng. Sao chép nguồn chỉ tạo nội dung đang nhập và nhãn **Bản nháp**, không tự phân loại thành bản Anh hoặc đã dịch. Fixtures ba ngôn ngữ dùng test, không phải bản dịch thương mại được nghiệm thu.

### 3.2 API và xung đột

| API mới, chưa tồn tại | Quyền và kết quả |
| --- | --- |
| `GET /api/cms/hero-localizations/home-v3/{locale}` | MEMBER_READ; trả localized draft hoặc trạng thái missing cùng base đã validate; không ghi |
| `PUT /api/cms/hero-localizations/home-v3/{locale}` | DRAFT_SAVE; full replacement của một localized Hero; không PATCH whole-site |
| `GET /api/cms/hero-localizations/home-v3/{locale}/qa` | MEMBER_READ; safe QA envelope từ saved draft/base đúng revision; không tự ghi file hoặc phục vụ public |

PUT yêu cầu `Idempotency-Key`, `expectedRevision` (`null` chỉ khi document chưa tồn tại), `baseRevision`, `baseContentHash`, `content`. Locale lấy từ route, không cho body ghi đè. Tạo đầu tiên revision1; lưu sau tăng đúng một. Response xác nhận locale/revision/base/content hash và thời gian server, không echo token/private metadata.

Transaction đọc authorization hiện hành, base, localized doc và operation record trước khi ghi. Hai request cùng expected revision: tối đa một thành công; request còn lại conflict. Cùng actor/key/payload retry: trả lại receipt; cùng key khác payload/locale: từ chối, không ghi lần hai. Nếu client mất response sau commit, retry cùng intent/key trước khi tạo intent mới; UI không tự bỏ dữ liệu hoặc báo đã lưu khi chưa xác nhận.

Base revision/hash đổi: trả conflict/rebase-required có mã rõ ràng; giữ nội dung nhập để đối chiếu. P1 không auto-merge/rebase. Kiểm base toàn resource là lựa chọn bảo thủ: sửa nhóm khác cũng có thể yêu cầu đối chiếu lại. Tối ưu invalidation theo nhóm thuộc scope sau, không tự thêm field-level tracking trong P1.

Từ chối anonymous/inactive/unverified/unknown member và role không có DRAFT_SAVE theo guard sẵn có. Reviewer/Publisher chỉ đọc; Owner/Editor được ghi. Giữ HTTP/body/host/origin/network fence hiện có; error mới dùng envelope chuẩn và không nới allowlist cho route khác.

Operation/audit mới trong `cmsLocalizedHeroOperations`, namespace `ml001-p1-` và định danh derived từ actor/key theo pattern hiện có. Record chứa request hash, receipt, actor/action/time; không chứa credential/token hoặc draft text dư thừa. Giữ operation records để retry/audit, không tự cleanup lịch sử.

### 3.3 CMS và preview

```text
Hero đa ngôn ngữ (P1) — bản nháp thử local
Ngôn ngữ nội dung: [Tiếng Anh] [Tiếng Việt] [Tiếng Nhật]
Nguồn Home v3: revision …     Bản dịch: revision … / Chưa có
Trường nội dung bản đang chọn
Dữ liệu dùng chung: chỉ đọc từ Home v3
[Lưu Hero tiếng Anh] [Tải lại] [Xem trước Hero đã lưu] [Tải gói QA]
```

Chuyển locale/reload/đóng panel khi dirty: Lưu và chuyển / Bỏ thay đổi / Ở lại. Lưu lỗi không chuyển locale. Không autosave, không browser storage cho draft. Request đang chạy gắn generation/locale; response cũ không cập nhật panel locale mới. Logout/destroy hủy request, xóa nội dung/private preview và object URLs.

Preview mới riêng Hero dùng cùng source/template Hero phù hợp và dữ liệu public-safe; nhãn CMS ghi locale/saved revision/hash. Chỉ saved content đi vào viewer; nội dung chưa lưu phải lưu trước, không tự nhận là saved. Giữ iframe sandbox không scripts/same-origin, không thêm postMessage bridge, không đổi transport hoặc nới CSP. Shared asset không resolve được: báo lỗi; không coi placeholder là PASS.

### 3.4 Artifact QA

API QA trả envelope public-safe chứa localized Hero, locale/revisions/hash, shared Hero refs và allowlisted resource metadata. Exporter đọc envelope/file safe và bytes tài nguyên đã hợp lệ theo provider hiện hành; không đọc credentials, private originals, Storage trực tiếp ngoài public-safe provider hoặc gọi cloud. Kiểm path containment/symlink/hash/size.

Output mới duy nhất: `.local/exports/multilingual-001/p1-v1/<run-id>/{en,vi,ja}/index.html` và assets public-safe cần thiết trong cùng run root. Không overwrite run cũ. Đây là Hero-only QA, có badge **Bản thử Hero — chưa xuất bản**, `noindex,nofollow` và `lang` đúng. Nút CTA ở QA/preview không gửi form hoặc điều hướng tới section chưa có; label và target identity vẫn được kiểm trong contract.

Không đưa draft artifact lên :5010, không tạo public switch, không giả trang Nhật đầy đủ bằng phần còn lại tiếng Việt. P1 QA có thể chứa draft vì chỉ là output kiểm thử được giao quyền, không áp dụng nhãn editorial approval. P7 mới dùng reviewed public projection cho website.

## 4. Quyền dữ liệu, runtime và bảo toàn xin duyệt

- Duy nhất `demo-pinky-lamb-cms`, loopback. Đọc base Home v3 và trusted metadata/media để render; không ghi base/import/media/member/role hoặc collection CMS cũ.
- Ghi đúng ba localized draft IDs mới nêu trên và operation records mới có prefix. Before-image phải xác nhận ba IDs chưa tồn tại. Nếu đã tồn tại, giữ nguyên và trình collision/ownership trước khi ghi; không dùng fixture đè bản của phiên khác.
- Test mutation ở chính draft IDs P1 mới được khai báo, dùng nội dung synthetic có nhãn; giữ bản cuối để human review, không tự xóa. Không tạo/sửa tài khoản/role. Dùng account demo hiện có được phép và user login bình thường; thiếu role/session thì criterion tương ứng NOT_RUN, không lấy secret hay giả identity.
- Canonical frontend/API Vite `127.0.0.1:5173` là route integration mục tiêu. Sau Approved P1, được start/restart **đúng Vite CMS** qua command guard sẵn có nếu xác minh đúng project/process và bảo toàn; không phát signal tới process chưa rõ ownership. Việc restart cần thiết để activate server imports mới phải ghi before/after. Không cấp restart Auth/Firestore/Functions/Storage/Hosting hoặc recovery stack.
- Auth/Firestore/Storage và asset Hosting :5010 cần sẵn sàng theo guard hiện có. Nếu không sẵn sàng, báo prerequisite/owner/bounded next action; không tự reset/reseed/reimport hoặc nới guard. Runtime mới cần thiết kế khác phải replan.
- QA HTTP `127.0.0.1:4173` chỉ serve run output đã kiểm, nếu port rảnh; stop chỉ process do P1 tạo. Port bị chiếm: không kill/đổi port âm thầm.
- Tất cả runtime evidence/build/cache vào `.local/test-outputs/multilingual-001/p1-v1/` hoặc `.local/cache/multilingual-001/p1-v1/`. Exact owned cleanup chỉ áp dụng file tạm do run tạo, không xóa drafts/operations/retained evidence.
- Before/after kiểm source protected, count/ID/revision/hash dữ liệu retained liên quan và delta của ba drafts/operations; không xuất credential hoặc plaintext private content. Không lấy toàn bộ inventory runtime làm dependency khởi động ứng dụng.

Danh sách source được sửa chỉ theo manifest. Source baseline hiện là snapshot hash, không commit. T00 kiểm lại drift trước coding; bảo toàn thay đổi mới của người khác. Drift material dừng phần bị ảnh hưởng; không restore snapshot cũ để đạt PASS.

## 5. Tiêu chí nghiệm thu P1

AC dưới đây là yêu cầu đã Approved; hiện chưa đóng toàn bộ criterion. [Matrix evidence](../tasks/MULTILINGUAL-001-P1-v1.md#matrix-nghiệm-thu-hiện-tại) phân biệt pure/source checks đã PASS với authenticated/runtime proof còn NOT_RUN. Source/build không thay runtime/human acceptance.

| AC | Điều kiện đạt | Bằng chứng cần |
| --- | --- | --- |
| P1-AC01 | Locale chỉ en/vi/ja; mapping Hero đúng; default panel en; CMS tiếng Việt | Contract negative cases + rendered panel |
| P1-AC02 | Lưu/readback cả ba bản độc lập qua API thật; base và hai bản khác không đổi | Request/receipt sanitized, reload và hash before/after |
| P1-AC03 | Missing không auto-create; first-create CAS; concurrent writes không mất dữ liệu; retry/response-loss không tăng revision lần hai | Transaction integration và real HTTP tests |
| P1-AC04 | Anonymous và member không hợp lệ bị chặn; Reviewer/Publisher không ghi; Editor/Owner ghi đúng locale | API ACL tests; role chưa truy cập được ghi NOT_RUN |
| P1-AC05 | Dirty switch có ba lựa chọn; failure/conflict giữ text; response cũ không ghi sang locale khác | Browser thao tác thật, network failure/delay có kiểm soát |
| P1-AC06 | Base drift bị từ chối rõ, không auto-merge; labels/targets/media refs không bị đổi trái phép | API negative tests + source/readback preservation |
| P1-AC07 | Saved private preview đúng locale/revision/hash; logout/destroy clear; sandbox/CSP không nới | Browser authenticated, DOM/source checks, request/URL cleanup |
| P1-AC08 | Ba artifact Hero QA đúng nội dung/lang/noindex; không private metadata/scripts nguy hiểm; path/hash/size hợp lệ | Export positive/negative tests + HTTP/artifact inspection |
| P1-AC09 | Không mất dấu/glyph Nhật/clip controls/overflow; keyboard và focus thực dùng được tại 1440/768/390/320 px | Rendered CMS và Hero QA ở từng viewport, không chỉ page overflow |
| P1-AC10 | Caller/route và hành vi save cũ giữ nguyên trong controlled fixture; preview cũ kiểm chỉ đọc; :5010/baseline/old data không bị thay; chỉ có declared delta | Focused fixture regression + read-only UI/source/data/runtime before/after; không claim đã ghi thử base thật |
| P1-AC11 | Source/callers/routes/startup/export/manual steps đầy đủ; evidence/limits rõ; không gán editorial approval | Handoff/manual run và source review; language acceptance PENDING |

Nếu thiếu glyph Nhật, kiểm font fallback hệ thống/CSS hiện có trong allowlist; không tự tải font/dependency. Nếu chưa chứng minh được, AC09 mở và trình giải pháp font riêng.

## 6. Checks, gates và bàn giao

Task checklist ghi commands và bước cụ thể. Chỉ chạy sau Approved; lượt documentation không chạy CMS tests/build. Gate trước mutation: đúng runtime/demo/base/trusted media, actor quyền đúng và preservation. Owner Coordinator; PASS khi quan sát đủ; hết giá trị khi runtime/base/ownership đổi.

Source/contract review tập trung: isolation các locale, atomicity/idempotency, public projection, retained-data protection và preview controls. Review source ở High; implementation/tests ở Medium có observed route đúng. Không suy runtime từ file config hoặc ACK. Nếu không chọn được route bắt buộc, hoàn thành phần review/docs độc lập và nêu capability gap, không code ở High. Không yêu cầu thêm một đội agent hoặc review chain; một writer mỗi file.

Hoàn tất kỹ thuật P1 chỉ khi AC01–AC11 có proof phù hợp và không còn blocker bắt buộc. Nếu user sau này yêu cầu source handoff trước runtime, ghi CODE_COMPLETE_UNTESTED và giữ criteria NOT_RUN, không đóng mục tiêu verified P1. Human chấp nhận P1 riêng; không đồng nghĩa bản dịch đã được biên tập chấp nhận, full multilingual complete, M3/M4 accepted hoặc LOCAL_COMPLETE.

**Hiện tại:** P1/A1 đã Approved; source24paths đã triển khai. Unit38/browser17/scoped lint/task-only build PASS. Authenticated OWNER kiểm dirty/retry/response-loss/CAS/delay và logout/URL cleanup thật; EN khôi phục hash ban đầu ởrevision5, VI/JA1/base0. CMS/Hero4actualwidths, private3preview, oldpreviewread-only và finalexport/HTTP24files PASS.346protected source records/retaineddata/Hosting5010 giữ nguyên; delta authrun4opsEN, total7ops. **P1 vẫn IN_PROGRESS do AC04 role runtime chưa chạy:** user chỉ có OWNER, không tạo/sửa account/role. Forced unknowncommit/staleAuth runtime NOT_RUN, source/fixtures ghi riêng. Human/language acceptance PENDING; P2–P7/M3/M4/LOCAL_COMPLETE không đổi. [Tasks/evidence](../tasks/MULTILINGUAL-001-P1-v1.md#bằng-chứng-hiện-tại).
