# CMS-001 v2 — phạm vi M2 local/emulators

Bundle M2 revision 1, ngày 11/10/2026. **AWAITING_APPROVAL.** Tài liệu này là đặc tả đề xuất để người dùng duyệt, chưa cấp quyền implementation. Phạm vi toàn gói vẫn là CMS đầy đủ LOCAL; M2 chưa phải `LOCAL_COMPLETE`.

## 1. Mục tiêu, hiện trạng và quyền

**Đã xác minh từ source và evidence M1:** CMS có Auth/membership, Hero/SEO Draft `home`, Save/CAS/idempotency, preview private, immutable Snapshot/review và static QA export. Các section khác vẫn lấy baseline. M1 ledger là `REVIEW_READY`, `milestone_closed: false`, chưa có lời nghiệm thu M1 của người dùng. Evidence M1 cuối ghi 28 unit, 30 emulator integration, 37 browser PASS, lint/build exit 0; đó là kết quả M1 lưu trước lượt lập M2, không phải tests M2 vừa chạy.

**Đề xuất M2:** editor quản lý nội dung toàn bộ site qua template hiện có; import baseline có provenance, giữ Hero/SEO M1 hiện tại; preview và QA export toàn site đúng revision/hash. Nguồn mới/đổi được kiểm chứng qua reviewer, không qua editor. M1 immutable history và replay tiếp tục đọc đúng v1.

Gate từ `tasks/plan.md`: **M1 accepted + detailed spec/tasks/paths/AC M2 + Approved M2 riêng**. Planning request không tự nghiệm thu M1. Có thể gửi hai quyết định trong cùng một tin nhắn:

```text
Accepted CMS-001 v2 — M1 local/emulators
Approved CMS-001 v2 — M2 local/emulators
```

`Accepted M1` chỉ đóng mốc M1, không nghiệm thu toàn CMS. Chỉ lời trực tiếp của người dùng mới là evidence; ví dụ trên không phải approval. Nếu chỉ Approved M2 mà M1 chưa accepted, ghi nhận quyết định M2 nhưng giữ implementation chờ gate M1. Không ghi approval/acceptance thay người dùng.

## 2. Trong phạm vi và ngoài phạm vi

| Phần CMS | Nội dung quản lý trong M2 | Giới hạn template/hành vi |
|---|---|---|
| Header/nav | Logo catalog/alt, descriptor, label CTA, label/order link | Stable section ID; link tới section đang bật; logo/wordmark có nguồn |
| Hero/SEO | Các field M1, dùng trong Draft toàn site | `hero-split`; Hero/SEO M1 được import đúng giá trị hiện tại |
| Clients | Heading, logo/alt/client name/order/visibility | Strip hiện có; không suy endorsement hoặc quyền sử dụng đã xác nhận |
| Work/projects | Heading/intro/filter labels/featured order; case title/client/year/category/summary/scope/cover/gallery/service links/visibility | `work-grid`; category `EVENTS`, `FILM`, `COMMUNICATIONS`; count sinh từ data |
| Services | Title/titleVi/summary/scope/order/visibility | `services-accordion`; số thứ tự sinh từ order hiện tại |
| About | Heading/lead/paragraphs/signature và hình catalog; experience value/label/copy/nguồn | `about-split`; giữ `15+` là kinh nghiệm tự giới thiệu, không biến thành năm thành lập |
| Reel | Title/caption/video/poster từ catalog; duration hiển thị | Banner trong About; duration lấy metadata catalog, không số tự gõ trái bytes |
| IP | Heading/description/disciplines/artwork/CTA | `ip-split`; không tự tạo IP đã launch, franchise hay kết quả thiếu nguồn |
| Contact | Heading/intro/email/person/tel/address/social; service interests | `contact-form`, `MAILTO_COPY`; href/recipient/label đồng bộ từ cùng data |
| Footer | Heading/descriptor/copyright/social/back-to-top label | `footer-wordmark`; tên thương hiệu/font/artwork giữ nguồn |
| Whole-site SEO | Title/description/OG/alt trong HTML tĩnh; metadata một trang | Canonical/base URL server-owned, HTTP loopback; không thêm case routes hoặc sitemap giả |

Chỉ preset/layout baseline hiện có; không thêm centered Hero, cards, arbitrary CSS/font/color, block builder hoặc variant mới. Chữ chức năng như mở/đóng dialog và validation vẫn thuộc template đã duyệt, không phải mọi string đều là field CMS.

**Section rules:** Header/Hero/Contact/Footer bắt buộc, vị trí cố định. Clients optional ở vị trí cố định sau Hero. Reorder chỉ bốn body section `work`, `services`, `about`, `ip-studio`, mỗi ID đúng một lần kể cả section đang ẩn; Contact cuối body. Reel đi cùng About. Control lên/xuống dùng bàn phím; không cần drag-and-drop. Nav chỉ trỏ section visible. CTA tới section ẩn bị từ chối; UI nêu field cần sửa cùng Save. Nếu ẩn Services, nav và service interests bỏ Services theo projection; form vẫn nhận brief tự do. Không silently đổi category/CTA/claim để vượt validation.

**Records:** import 6 services, 8 projects, 5 client logos đang hiển thị (Sony, Wayfair, Samsung, AQUA, Manulife). Catalog có thêm logo không đồng nghĩa thêm vào strip. Cho phép thêm record trong giới hạn 12 services, 24 projects, 12 logos; ID ổn định, slug unique, duplicate bị từ chối. Archive bằng `isVisible: false`, không hard delete hoặc tái sử dụng ID. Gallery tối đa 12 ảnh bổ sung ngoài cover, không duplicate; scope rỗng hợp lệ. M2 chỉ chọn catalog 30 asset M1; không upload. Record mới có thể lưu nháp nhưng chưa qua source gate khi nguồn hiện có không hỗ trợ claim.

**Ngoài M2:** Storage/upload/quarantine/derivatives/private new-media preview (M3); publication job/current pointer/release/history/rollback/full backup-restore và nghiệm thu toàn CMS (M4); autosave, membership admin/owner override/role kép; backend lead/email, blog/payment/portal/analytics/AI/multilingual routes; redesign hoặc vẽ/generate artwork mới; mọi cloud/production/deploy. Không dùng tài khoản thật, Firebase login/ADC, Blaze, billing hoặc IAM làm điều kiện.

## 3. Workflow và màn hình đề xuất

1. OWNER thấy trạng thái “Chưa import toàn site”, M1 revision và baseline digest. Sau khi chọn import rõ ràng, API tạo riêng Draft `home-v2`; không gọi seed/reset M1.
2. EDITOR/OWNER mở editor toàn site: danh sách section ở cột trái, form section ở giữa, panel revision/preview ở phải. Mobile dùng một cột với section selector và action bar. Hero M1 và toàn site được phân biệt rõ bằng resource/schema; không trộn hai Draft.
3. Chọn section, sửa field plain text/catalog, xem lỗi tại field. Record lists có thêm/sửa/ẩn/di chuyển lên/xuống. Stable ID không đổi khi đổi title. Không cần code/JSON editor.
4. “Lưu nháp” gửi đúng revision và một intent key. Save thành công cập nhật revision; lỗi không hiện thông báo đã lưu. 409 giữ form chưa lưu và cho tải bản mới/đối chiếu; không tự đổi revision rồi overwrite. Giữ manual Save, không thêm autosave.
5. Preview private mặc định dùng Saved Draft; form chưa lưu không giả là đã preview bản đã lưu. Chọn Snapshot thì preview giữ Snapshot đó dù Draft có Save mới. Panel hiện resource/revision/hash/template và source warnings. Private frame giữ sandbox không script, không token; tương tác visitor kiểm ở QA artifact riêng.
6. Submit chụp đúng `home-v2` revision. REVIEWER/OWNER khác submitter xem fixed Snapshot, đối chiếu nguồn và ghi source check. Editor không xác nhận nguồn. Review chỉ `IN_REVIEW → APPROVED | CHANGES_REQUESTED`, CAS terminal như M1; không thêm cancel/override trong M2.
7. QA export toàn site lấy Snapshot + immutable Review + source-check proof đã pin; tạo artifact local visibly unpublished. Không switch website baseline/current pointer. Không có nút Publish/Upload giả thành công.

Admin UI dùng style M1, labels tiếng Việt, thứ bậc rõ. Có loading/empty/permission/invalid/conflict/retry/review-blocked states. Sau logout/deactivation: clear token/private memory/DOM/preview; generation guard chặn response/JSON parse tới muộn. Evidence reviewer riêng xem source không biến nguồn thành nội dung visitor.

## 4. Resource, phiên bản và import

### 4.1 Giữ M1; mở resource M2 rõ ràng

| Resource | Schema/template | Quy tắc |
|---|---|---|
| `cmsDrafts/home` và Snapshot cũ | v1 / `m1-hero-split-v1` | Giữ validator, contentJson codec, hash, response/replay v1 nguyên nghĩa |
| `cmsDrafts/home-v2` và Snapshot mới | v2 / `m2-site-baseline-v1` | Full site typed; adapter chọn đúng cặp version, fail closed khi mismatch/unknown |

M2 dùng notation full-site ở `docs/CMS-ARCHITECTURE.md §6` làm đầu vào, **không tự widen v1 thành full-site**. Refinement được duyệt trong M2: `schemaVersion: 2`, resource `home-v2`; fixed IDs; `settings.header` cho descriptor/CTA; About signature/experience copy/artwork; `publicCredentialPage` cho link PDF case; `claimSources` private cho source IDs theo claim group; source verification nằm ngoài immutable Snapshot. `localBaseUrl` là config renderer, không nằm trong editable patch/content client gửi. Brand name `Pinky Lamb` cố định. Không ép TypeScript/framework mới vào vanilla ESM.

Envelope Draft v2 trả `{draftId, schemaVersion, templateVersion, content, revision, updatedBy, updatedAt, lastEventId, importLineage, catalog, sourceCatalog}`. `catalog` giữ finite media M1; `sourceCatalog` chỉ authorized summaries của evidence hiện có. Stored `contentJson` và decoder v2 riêng; không sửa bytes/decoder v1 để đọc v2. `importLineage` server-owned pin baseline manifest, imported M1 revision/digest và mapping report digest. Corrupt persisted data fail 500 generic, không fallback/reseed baseline. Response ≤256 KiB; Save validator dự trữ metadata/manifest/catalog headroom, không nhận content tới cap rồi giả rằng read/submit luôn vừa cap.

### 4.2 Import một lần, idempotent và có CAS

Input cố định local: read-only `dist/index.html`, `dist/content.js`, `source-content.json`, catalog/provenance M1 và bytes baseline. Converter chỉ chạy sau Approved M2, parse JSON object literal có header/footer đúng từ `content.js`, không execute script. Pinned mapping JSON gồm non-Hero sections + factual baseline values + local source identities/digests; mapping report chỉ ra nguồn từng field.

OWNER POST import gửi `{expectedM1Revision, baselineManifestHash}` + `Idempotency-Key`. Validate bytes/input pin trước transaction. Transaction reread active OWNER membership, M1 Draft, target existence, operation key và source catalog identities trước writes; read-before-write. Create `home-v2` revision 0, immutable import report/source catalog, audit + completed intent cùng transaction. Hero/SEO lấy **M1 current tại revision được yêu cầu**, còn lại từ pinned baseline. `home`, Snapshot/Review/audit/idempotency cũ không bị sửa.

- M1 đổi revision: 409, chưa tạo v2. Hai import đồng thời: một winner.
- V2 đã có dưới intent khác: 409 `ALREADY_INITIALIZED`, không reset.
- Cùng key/body: replay receipt đúng import cũ, kể cả v2 đã được chỉnh về sau; validate pinned import evidence, không so receipt với revision mới.
- Cùng key/body khác: 422; mất response được retry cùng key. In-flight ngắn: 409; không “giành” intent của lần chưa rõ kết quả.
- Missing/mismatch mapping/catalog/source digest hoặc corrupt existing state: fail closed. Startup và seed M1 không tạo/xóa/overwrite v2.

Baseline factual reference để so claim luôn là **baseline có nguồn đã pin**, không phải giá trị M1 editor đang sửa. Hero/SEO M1 khác factual baseline được import nguyên giá trị nhưng vẫn được phân loại mới/đổi, không tự exempt hoặc tự verified.

### 4.3 Mapping bắt buộc

| Baseline record | Category hoặc ID M2 | Credential page; gallery gốc gồm cover |
|---|---|---|
| `wayfair` | `EVENTS` | 21; 3; scope `[]` |
| `sony` | `FILM` | 6; 1 |
| `diag` | `COMMUNICATIONS` | 7; 1 |
| `vifa` | `EVENTS` | 22; 2 |
| `petrosetco` | `EVENTS` | 20; 3; scope `[]` |
| `varna` | `COMMUNICATIONS` | 9; 3 |
| `samsung` | `FILM` | 14; 1 |
| `psd` | `EVENTS` | 23; 3; scope `[]` |

Service IDs giữ `brand-creative`, `film-content`, `events-experiences`, `exhibition-activation`, `integrated-communications`, `original-ip`. Gallery M2 bỏ cover khỏi danh sách bổ sung, giữ order/asset equivalence. Scope và source pages giữ dữ liệu đã supplied, không suy thêm vai trò dự án. Case→service IDs chỉ gán từ mapping scope có nguồn; không suy category là mọi service agency đã làm. M2-02 chốt report field-by-field và page map trước importer/UI; sai source không tự sửa facts cho “đẹp”.

Contact hiển thị dùng copy Việt từ HTML baseline, định danh email/E164/URL từ source JSON; report nêu khác biệt ngôn ngữ, không tự coi JSON tiếng Anh là public copy replacement. Không đọc Google Drive hoặc tải source ngoài local. Source notes/page lineage ở private data; chỉ fixed public PDF link + page integer được đưa ra visitor theo policy đã có.

## 5. Typed validation, patch và API

V2 có hero/seo/settings/services/projects/sections/sectionOrder/claimSources. Strict unknown-key denial; numbers finite; ID enum/resource-safe; URLs không nhận script/HTML/data URLs. Text plain, encode tại renderer; heading tối đa 3 dòng x 100 ký tự; title 120, SEO title 80/description 200; summary 1.000; long copy mỗi section tổng 4.000; scope 12 x 160; year 1990..năm hiện tại+2; focalPoint 0..1. Credential/image/video kind đúng catalog; decorative image alt rỗng, meaningful image alt bắt buộc. Nav ≤6 unique anchors; duplicate IDs/slugs/order bị reject. Source page 1..48 theo credential đã pin. Email max254/valid no CRLF; phone E164 canonical + display label≤80; address≤4 lines x160; Facebook HTTPS fixed `www.facebook.com` host/no credentials, showreel source URL chỉ exact baseline Drive URL hoặc absent, không fetch. URLs/mailto/tel derive và encode từ validated data.

Raw mutation request ≤64 KiB như M1. Logical content, escaped persisted Draft và Snapshot envelope mỗi loại ≤256 KiB, kiểm trước writes. V2 partial patch có các phép typed theo root và stable ID (`settings` allowed fields, `sections` by fixed ID, `projectChanges`, `serviceChanges`, `clientLogoChanges`, `sectionOrder`, `claimSources`), không JSONPath/arbitrary merge/prototype keys. Update tối đa một case/service/logo hoặc một section mỗi request; cùng request được sửa order/reference cần thiết nguyên tử. Record add/update archive không hard delete. Schema/template/resource/server actor/time/lineage/verification bị reject. Hai field roots chạm cùng một record trong một patch bị reject; không phụ thuộc thứ tự merge.

UI có thể chứa nhiều sửa chưa Save: tạo intent độc lập theo nhóm patch, tuần tự CAS; sau lỗi giữa chừng hiện đúng nhóm đã lưu/chưa lưu, không gọi cả form đã Save. Không hứa một request 64 KiB ghi toàn Draft 256 KiB. Các cap là policy ứng dụng, không tuyên bố giới hạn Firebase mới.

| API | Input/kết quả/quyền |
|---|---|
| M1 endpoints | Giữ response/replay/role hiện tại; no query/body mở rộng tùy tiện |
| `GET /api/cms/drafts/home-v2` | Member read; chưa import 404 rõ ràng; Draft v2 typed |
| `POST /api/cms/drafts/home-v2/import` | OWNER; preconditions §4.2; receipt 201; key replay giữ receipt |
| `PATCH /api/cms/drafts/home-v2` | EDITOR/OWNER; `{expectedRevision,patch}`; revision+1/audit/key transaction |
| `POST /api/cms/snapshots` | V1 input cũ giữ nguyên; v2 input `{draftId:'home-v2',draftRevision,message?}`; namespace intent chứa resource |
| `GET /api/cms/snapshots/{id}` | Dispatch từ immutable schema/template; v1 shape giữ; v2 có explicit draftId/version + fixed snapshot/review/sourceCatalog summaries |
| `POST /api/cms/source-checks` | REVIEWER/OWNER khác submitter; strict input §5.1, ≤16 supported factual hoặc creative groups; server resolve exact values/digests |
| `GET /api/cms/snapshots/{id}/source-checks` | Member read; cursor bound snapshot/hash/view/sourceRevision, page size ≤50, ≤128 KiB; active/pinned private immutable proof pages, không toàn registry |
| `POST /api/cms/reviews` | V1 unchanged; v2 same snapshot/hash/CAS + explicit creative-copy review declaration; server resolve/pin matching immutable source-check set; 201/replay |

Không fork REST transport, không callable mới; same-origin Vite proxy/Functions emulator hiện có. Error envelope giữ `{error:{code,message,fieldErrors?,correlationId}}`. 401 auth, 403 ACL/self, 404 missing, 409 CAS/initialized/terminal/inflight, 422 schema/key-body/source unresolved, 500 corruption generic. GET source-check list cho IN_REVIEW hoặc terminal nhưng không tạo/xóa record. No wildcard CORS, no server URL fetch.

### 5.1 Request grammar và receipts v2

Notation dưới là spec review, chưa phải executable source. `?` là absent được phép; `null` bị reject cho mọi editable value. All objects strict. `HeroV1`, `SeoV1` giữ field shape/constraints M1 rồi thêm full-site reference validation, không sửa API v1.

```text
SaveRequest = { expectedRevision: integer>=0, patch: SitePatch }
SitePatch = {
  hero?: HeroV1, seo?: SeoV1,
  settings?: { header?, brand?: {logo?,tagline?}, credential?,showreel?,
               contact?,nav?,copyright? },
  sections?: [{sectionId: fixed-ID, value: full-section-value}],  // max1
  sectionOrder?: ['work'|'services'|'about'|'ip-studio', ...],
  projectChanges?: [RecordChange<CaseV2>],     // max1
  projectsOrder?: [projectId,...],
  serviceChanges?: [RecordChange<ServiceV2>],  // max1
  clientLogoChanges?: [RecordChange<ClientLogoV2>], // max1
  clientLogoOrder?: [clientLogoId,...],
  claimSources?: [{claimPath, sourceIds:[sourceId,...]}] // replace full map
}
RecordChange<T> = {op:'ADD', value:T}
               | {op:'REPLACE', id, value:T}
               | {op:'SET_VISIBILITY', id, isVisible:boolean}
SourceCheckRequest = {
  snapshotId, contentHash, expectedReviewRevision:0,
  expectedSourceRevision:integer>=0,
  checks:[{claimPath, evidence:[{sourceId,pages?:[integer1..48,...]}]}],
  note?:plainText<=1000
}
ReviewRequestV2 = {
  snapshotId,contentHash,expectedReviewRevision:0,expectedSourceRevision:integer>=0,
  outcome:'APPROVED'|'CHANGES_REQUESTED',
  creativeCopyDeclaration?:'NO_FACTUAL_CLAIMS'|'SOURCE_CHECKED', note?:plainText
}
```

At least one patch change; chỉ một trong project/service/clientLogo change lists được có trong một request, tối đa một record. Sections change tối đa một; related settings/order/claimSources vẫn được sửa cùng transaction. `settings.header` allowed descriptor/ctaLabel; brand logo/tagline only; credential allowed assetId/label/edition; showreel allowed assetId/poster/title/originalSourceUrl, duration derived catalog; contact allowed personName/personPhoneE164/personPhoneLabel/officePhoneE164/officePhoneLabel/email/addressLines/facebookUrl/illustration; nav/copyright replace đúng typed subvalue. Subobject hiện diện phải full typed value, trừ `brand` patch fields. `brand.name`, localBaseUrl, schema/template/revision/lineage/verification không nằm trong patch. Value hết hạn bị reject, không ignore unknown field.

Atomic application: clone current typed content; apply one record ADD/REPLACE/visibility (REPLACE phải same ID, ADD ID chưa tồn tại và cap còn chỗ); apply supplied settings subvalues/Hero/SEO/one section; apply explicit order arrays/claimSources; validate resulting whole content/refs/visibility/caps; write once revision+1. Không duplicate patch target/ID; absent giữ nguyên, null không xóa. Projects/client logo order phải exact full permutation kể cả hidden IDs. Services order ở `sections.services.serviceOrder` cũng full permutation; Work `featuredIds` là subset unique và được render trước các case còn lại theo projects order. Một section order luôn chứa đúng bốn body IDs. Nếu cần sửa hai section phụ thuộc nhau, UI trình Save theo nhóm có resulting whole content hợp lệ; không silently auto-repair bất biến.

Save receipt 200 `{draftId:'home-v2',revision,updatedAt,lastEventId}`. Import receipt 201 `{draftId:'home-v2',revision:0,importId,importedM1Revision,importedM1ContentHash,baselineManifestHash,importReportHash}`. Submit receipt 201 `{id,draftId:'home-v2',draftRevision,contentHash,mediaManifestHash,schemaVersion:2,templateVersion,submittedBy,submittedAt}`. Same intent key/body trả exact completed receipt; changed body422. Server record timestamps/IDs/actor; client không gửi server fields.

Source POST checks có 1..16 unique claim paths, 1..8 unique evidence IDs/check, unique sorted pages tối đa48 cho credential, no pages cho source JSON. `creative-copy` là supported path. Note là private human explanation, không nguồn tự tạo. Không nhận claimHash/verification/checkedBy/checkedAt/evidenceDigest từ client. Receipt201 `{snapshotId,contentHash,sourceRevision,sourceCheckIds}` với IDs ordered theo claimPath. V2 Review APPROVED bắt buộc creative declaration; `SOURCE_CHECKED` cần creative check, `NO_FACTUAL_CLAIMS` là exact-hash human declaration. CHANGES_REQUESTED cần note 1..2000, không cần source/creative declaration. Review receipt201 `{snapshotId,contentHash,reviewId,status,revision:1,sourceRevision,attestationSetHash}`; empty set digest dùng cho CHANGES_REQUESTED. Review/receipt v1 không đổi.

GET source-checks chỉ nhận `{cursor?,pageSize?}`; default20, max50. View `ACTIVE` lấy active index khi IN_REVIEW/CHANGES_REQUESTED; view `APPROVED` lấy immutable Review-pinned proof IDs. Server sort theo claimPath ascending, rồi ID tie-breaker. Cursor opaque encoded typed context gồm snapshotId/contentHash/view/sourceRevision/lastClaimPath/lastId; verify context/member trước lookup/page, sai context422, sourceRevision đổi giữa pages409 và phải đọc lại. Không dùng cursor như authorization. Response `{snapshotId,contentHash,view,sourceRevision,checks,nextCursor}` với `nextCursor:null` khi hết. Greedy page theo count và actual UTF8 bytes≤128 KiB, không cắt record; mỗi record≤8 KiB nên page không rỗng khi còn data. Không trả private absolute paths. Source index max61 entries, không scan lịch sử không giới hạn hoặc cần exact count query.

## 6. Nguồn claim và review

### 6.1 Taxonomy rõ, không dùng NLP

Claim group dùng path ổn định theo ID, không index array. `claimHash = SHA256(canonicalJson(exact projected group value))`: cùng sorted-key recursive JSON M1, không trim/case-fold/tự sửa câu. Các group được server resolver hỗ trợ; path lạ bị reject. Group mới/đổi so exact pinned factual baseline cần nguồn, bao gồm records/sections đang ẩn.

| Nhóm | Giá trị phải phủ trong digest |
|---|---|
| `projects/{id}/facts` (≤24) | Title/client/year/category/eyebrow/summary/scope/serviceIds/publicCredentialPage và alt/asset identity cover/gallery |
| `services/{id}/facts` (≤12) | Title/titleVi/summary/scope |
| `clientLogos/{id}/facts` (≤12) | Client name/image identity/alt; supplied logo không tự là endorsement |
| `hero/facts` | Eyebrow/description/footnote và image identity/alt; note/tagline sáng tạo ở creative group |
| `seo/facts` | Description/OG description/OG image identity/alt |
| `settings/brand/facts` | Descriptor và logo identity/alt; brand name fixed |
| `settings/contact/facts` | Person/contact identity/email/tel/address/social/illustration identity/alt; form recipient derive cùng data |
| `settings/credential/facts` | Credential identity/edition/label và source page identity |
| `settings/showreel/facts` | Video/poster identity/alt/title/duration/source URL |
| `sections/about/facts` | Lead/paragraphs/experience value/label/copy/location và signature image identity/alt |
| `sections/ip-studio/facts` | Description/disciplines/artwork identity/alt; không thêm launched/result field |
| `sections/footer/facts` | Descriptor/copyright text |
| `creative-copy` | Mọi heading, slogan/tagline/note, navigation/filter/CTA/reel creative caption/signature copy/intro copy/functional editorial labels còn lại; tách khỏi các group trên |

Tối đa 57 factual groups + 1 creative group với caps record đã chọn (policy envelope max61, không tự thêm path). Source binding list ≤61 groups, ≤8 source IDs/group. M2-01a/b schema phải có exhaustive projection test: mọi renderable content field thuộc factual/creative/presentation (stable ID/slug/order/visibility/geometry) hoặc constant template. Category là factual, không phải presentation. Schema addition chưa classified bị từ chối; không regex/NLP đoán câu có phải claim.

Creative copy không cần đúng nguyên câu trong credential. Reviewer phải khai `NO_FACTUAL_CLAIMS` cho creative group hoặc `SOURCE_CHECKED`; mode sau cần check bind exact creative digest. Factual claims đặt trong creative field vẫn cần nguồn; reviewer phải từ chối/đưa vào nhóm có nguồn. Khai này là human editorial attestation, không thuật toán chứng minh câu không có claim. Một digest chỉ chứng minh binding, không chứng minh sự thật.

### 6.2 Evidence và quyền

M2 chỉ dùng local credential 48 pages/source-content supplied và read-only evidence catalog được import từ input có hash. M2 có `SOURCE_CHECKED`; chưa cung cấp `CLIENT_CONFIRMED` cho tài liệu mới, upload source hoặc arbitrary URL/path. Attaching source ID/page không tự verified. Không lấy user-typed claimHash/checkedBy/checkedAt/verification làm trusted data. Reviewer nhìn credential và mapping note rồi xác nhận nguồn hỗ trợ **toàn group**; thiếu hỗ trợ → CHANGES_REQUESTED. Catalog/source source-content lineage không phải third-party xác nhận mọi nội dung.

`cmsSiteSources` lưu immutable source identities/digests/approved fixed local locations; `cmsSourceChecks` là append-only records do protected action tạo: snapshotId/contentHash/claimPath/exact claimHash/evidence IDs + actual digests/pages, SOURCE_CHECKED, checkedBy/checkedAt/sourceRevision/audit intent. Browser direct SDK read/write vẫn deny-all. Active role và `checkedBy !== submittedBy` kiểm trong transaction kể cả replay/OWNER; late ACL revoke/self không được replay success. Mỗi batch tối đa 16 groups, cùng payload được replay idempotently; no source record overwrite.

V2 ReviewState có `revision:0→1` chỉ cho terminal review, **sourceRevision riêng** `0→N` và server-owned `activeSourceCheckIds` theo claimPath. Source action transaction đọc Snapshot/ReviewState/member/key/source records, assert IN_REVIEW + expected review/source revision, resolve exact groups và actual pinned evidence; create immutable checks rồi update active IDs/sourceRevision+1 + audit/key cùng transaction. Update state đảm bảo competing Review transaction conflict/retry; check mới không commit sau terminal. Replay completed check sau terminal chỉ trả committed receipt khi immutable proof/replay identity hợp lệ và actor còn quyền/không self; không append/update state. New intent sau terminal409. V1 ReviewState/receipt không thêm fields.

V2 Review transaction reread state/member/Snapshot, assert both expected revisions, lấy đúng active check ID cho mỗi NEW/CHANGED required factual path (và creative nếu mode SOURCE_CHECKED), validate claim/evidence/version/digests/self relation; all reads trước writes. Không query “latest by timestamp” hoặc chọn user-sent attestation IDs. Pin sorted unique immutable IDs + `SHA256(canonicalJson(sorted full immutable check records by claimPath then id))`; create Review, terminal state revision1, audit/intent atomic. Check overwritten trong active index không sửa record cũ; review/set digest vẫn đọc record đã pin. M1 review không đổi.

**Evidence viewing:** authorized Draft/Snapshot response có `sourceCatalog` summaries `{id,kind,title,sha256,pageCount?,publicCredentialUrl?,supportedClaimPaths,excerpt?}` theo selected/imported sources. Supported paths là fixed taxonomy, wildcard theo stable-ID family do server định nghĩa, không arbitrary regex từ client. Excerpt từ private mapping/source JSON, tối đa1000 ký tự/source; max16 sources và private response cap vẫn áp dụng. Không trả absolute path, Drive ID hay raw full supplied file. Credential viewer chỉ mở fixed PDF asset/page allowlisted đã public trong baseline. Reviewer đọc private excerpt và page PDF rồi kiểm tra; EDITOR chỉ chọn IDs/pages có sẵn. Không thêm unauth FS endpoint hoặc fetch URL ngoài local. Nếu evidence vượt bounds/không hỗ trợ claim, không auto-truncate nguồn để approve, giữ draft/CHANGES_REQUESTED.

**Unchanged imported baseline:** vẫn `UNVERIFIED`, warnings giữ nguyên; không fabricate checkedBy hoặc client confirmation. Review/QA có thể dùng baseline unchanged theo nhánh legacy explicit; lineage/baseline group hashes có oracle, không so với Draft mutable. **NEW/CHANGED factual group:** cần exact SOURCE_CHECKED của chính immutable Snapshot/hash. Nguồn cũ không chứng nhận giá trị mới. Review APPROVED pin attestation IDs và canonical set digest, cùng creative-copy declaration; immutable Snapshot không bị mutate để thêm check. Export xác minh pinned proof, không substitute registry mới.

**Lựa chọn policy mới cần Approved M2:** áp source gate mới/đổi ngay tại APPROVED và full-site QA export, mạnh hơn policy full-publish gốc. Private preview vẫn được mở với warnings, CHANGES_REQUESTED vẫn được ghi. Full QA export chỉ từ APPROVED v2, có unpublished notice; không thêm mode “public unapproved QA” để né gate. Unchanged legacy warnings không được trình bày như quyền phát hành đã đủ; M4 phải chốt full-publish source/rights gate riêng. Kiểm nguồn không phải xác nhận bản quyền hoặc chứng nhận pháp lý.

## 7. Hash, preview, static HTML và export

V2 `contentHash = SHA256(canonicalJson({content,mediaManifestHash,schemaVersion:2,templateVersion:'m2-site-baseline-v1'}))`. Content exact toàn site, gồm data ẩn/private claim-source selections; manifest unique sorted IDs lấy **mọi AssetUse/action**: logo/clients, Hero/SEO, project cover/gallery, About/signature, credential, Reel/video/poster, IP, Contact mascot và template-dependent fixed catalog assets. Cả hidden records/sections cũng pin bytes. Manifest dùng legacy catalog hash/dimensions/rights/source lineage; không tự rights verified. Version/template change tạo Snapshot mới; không dùng review cũ cho renderer mới.

Shared renderer v2 tạo public projection riêng, encode text/attribute/JSON script data tại đúng context. Không `innerHTML` raw input, không script URL/HTML/custom selectors. Public projection loại member/admin UID/source notes/claimSources/private locations/rights evidence/review checks/audit/import report. Public PDF href + page là allowlisted projection riêng, không kéo private notes ra UI. Trước khi tạo baseline mapping JSON, task00b deny `contracts/baseline-site.json`/`baseline-provenance.json` ở Vite raw/@fs/encoded/query paths; browser bundle không import các private JSON hoặc cms-api. Schema/client modules chỉ giữ shapes/resolvers pure và data từ authorized API; source catalog file chưa bao giờ thành static publicDir.

Static HTML chứa metadata/OG/H1/section copy và toàn bộ visible services/cases, kể cả case summary/scope/gallery/source link khi JavaScript tắt. Native details/links/video/mailto fallback hoạt động; JavaScript chỉ enhance menu/filter/load-more/dialog/reel pause/focus/interest IDs/brief copy. JS bật có initial count như config; JS tắt không giấu những records còn lại. Không chạy baseline `content.js`/`app.js` để overwrite data v2; output dùng generated public-only data + interaction module. Category→service interests dùng actual stable IDs, không label strings hoặc category inference; đổi title không mất mapping.

Header/nav/section numbering/count/interest options/showreel CTA/source PDF link/contact mailto recipient luôn derive từ một Snapshot. Visibility xử lý observer/null element an toàn. Hero scroll cue không trỏ Clients đã ẩn; renderer chọn anchor visible theo quy tắc fixed, không đổi saved CTA tùy tiện.

Private preview không script giữ CSP/sandbox M1; HTTP private data no-store, clear logout. Static interaction QA riêng chỉ serve loopback. Full QA exporter revalidate exact version/hash/manifest/Review/proof and bytes, export chỉ `.preview-output/m2/<snapshotId>` có ownership/containment/hardlink/symlink/preflight controls như M1. Fail trước writes nếu folder lạ/corrupt proof; không xóa artifact không sở hữu. Generated artifacts/evidence nằm `.local/`, `admin-dist/` (existing reviewed Vite/guard output), `.preview-output/`; `.baseline-source/`/`public-baseline/` không ghi. Manifest public chỉ path/hash/version/content hash; fixed notice “Bản thử local — chưa xuất bản”.

Private QA input JSON≤1 MiB ở `.local/cache/m2/` hoặc named synthetic fixture: strict `{qaEnvelopeVersion:2,snapshot,reviewState,review,sourceChecks}`. UI/operator assemble từ authenticated fixed Snapshot/review + all pages APPROVED view; verify context/sourceRevision/Review IDs/digest trước download, token không nằm file. Export revalidates Snapshot≤256 KiB, terminal APPROVED relation/self policy/creative declaration/pinned IDs/exact complete set and actual local evidence/catalog hashes. Source record notes capped≤1000, full record≤8 KiB, total≤61 records; full envelope cap kiểm trước JSON parse/resource work. Public output không chứa private envelope hoặc proof text. M1 fixture/CLI input/response giữ semantics, chỉ v2 dùng envelope mới.

Offline JSON/hashes không tự chứng minh ai đã login hoặc nguồn đúng; API/emulator/browser evidence phải chứng minh protected review/source workflow riêng. Synthetic approved-site fixture chỉ là test input, không editorial approval. Không gắn artifact vào current pointer, không sửa root `dist/` hoặc public website.

## 8. Tiêu chí nghiệm thu và kiểm thử M2

| AC | Kết quả bắt buộc | Bằng chứng dự kiến |
|---|---|---|
| M2-AC01 | Exact demo/loopback guard; cloud credentials không được khám phá; baseline/vendor/frozen handoff intact | Config/source audit + existing guard regressions + byte inventory |
| M2-AC02 | Explicit import 6 services/8 cases/5 visible logos; mapping/source scope/contact đúng; CURRENT M1 Hero/SEO preserved | Fixed input digests + report + emulator importer/CAS/concurrent/retry oracles |
| M2-AC03 | `home`/v1 Snapshot/hash/review/replay unchanged khi import/edit/review v2 | Archived v1 fixture/receipt oracle + real emulator compatibility tests |
| M2-AC04 | Full contract/versions/caps/refs/URLs/IDs/order/visibility/server-fields validated | Independent unit fixtures, abuse cases, raw/escaped limits and corrupt persisted integration |
| M2-AC05 | All listed sections editable/save/reopen; add/archive/reorder records, reference corrections atomic | Actual UI desktop/mobile + read/save/ref consistency; no stale DOM/output |
| M2-AC06 | Save conflict/retry/batch partial failure no overwrite/false saved state | Two clients/transaction race + lost-response same-key/mismatch tests |
| M2-AC07 | All roles/unknown/inactive/unverified/direct SDK denied correctly; OWNER no self-check/self-review | Rules/API/real browser abuse tests, ACL revoke-before-replay |
| M2-AC08 | New/changed claims source-gated; exact digests, immutable attestations/pinned review, creative declaration | Changed fact + old check rejected; spoof/editor/self rejected; actual reviewer source flow |
| M2-AC09 | Full/hidden media manifest and full content hash exact; public projection has no private metadata | Independent traversal/hash oracle + tamper fixtures + artifact scan |
| M2-AC10 | Draft/Snapshot private preview đúng revision/version; edits later/logout/late responses safe | Authenticated rendered iframe, desktop/mobile and race tests |
| M2-AC11 | Static metadata/one H1/all visible case/service content JS-off; safe public HTML | Browser JS-disabled + parse/HTML oracle, text/attribute/JSON XSS payloads |
| M2-AC12 | Nav/filter/count/load-more/case/gallery/keyboard/reel/mailto/copy baseline behavior uses CMS data | JS-on loopback browser, focus/Escape/return-focus, empty/hidden/max records |
| M2-AC13 | APPROVED full QA export source-proof/manifest exact, contained/unpublished; no pointer/deploy | Malformed/proof/ownership/path escape tests + actual served artifact |
| M2-AC14 | Keyboard + responsive 320/390/768/1024/1440; no overflow/cropped UI; labels/errors usable | Actual browser captures/DOM and High visual review; no claim physical-device QA |
| M2-AC15 | Final M1+M2 lint/unit/emulator/browser/build gates; honest dependency audit/residuals; docs/runbook/High review | Fresh sequential final logs, SHA inventory, sanitized evidence + M2 review |

All AC phải đạt mới `REVIEW_READY`. Lỗi trong đúng allowlist/AC còn mở được sửa và recheck sau Approved mà không xin lại từng fix. Material scope/new paths/new variant/new dependency cần revised proposal/Approved trước phần mới. Human M2 acceptance/Closed ghi riêng; không tự coi tests green là LOCAL_COMPLETE hoặc nghiệm thu toàn CMS.

Checks chưa chạy tại thời điểm lập proposal: toàn bộ tests/preview/import/export M2, usability M2, Safari/iOS/physical devices, native mail-client/OS clipboard và M4 backup-restore/publication. Audit M1 còn 0 Critical/3 High/2 Moderate đã triage; không gọi dependency clean. M2 không nâng version/lockfile; refresh audit sau Approved khi registry access được phép, ghi NOT_RUN nếu network không có, review lại reachability/runtime đã dùng. Không coi network fence Node là sandbox cho OS/Java.

## 9. Kế hoạch, ownership, freeze và quyết định

[M2-plan](../tasks/M2-plan.md) là task map mới; [M2 scope](../../approvals/CMS-001-v2-M2.scope.json) là exact allowlist/base digests; [M2 register](../../approvals/CMS-001-v2-M2-REGISTER.json) là ledger riêng. Root `tasks/plan.md`, `tasks/todo.md`, CMS-001 v2 proposal và register M1 vẫn là lịch sử frozen; không rewrite snapshot cũ để giả M2 Approved.

High đọc/spec/thiết kế/review/audit. Medium implementation và viết/chạy unit/integration/browser tests. Một chủ ghi/file, shared route/index/styles/test fixtures tuần tự; checkpoint High sau 2–3 tasks. Không tự tạo đội/recursive agents/config; runtime phải có lựa chọn Medium thật trước coding. Không có capability thì báo gap, không âm thầm code ở High.

Base là export không `.git`, không invent HEAD mới. Scope freeze current 52 M1 source digests + original register/proposal/scope/plan/todo/architecture/baseline/vendor preservation evidence. Không download/install trong planning; giữ exact M1 dependencies/toolchain cho implementation. Không bật Storage emulator trong M2, không sửa root `firebase.json`.

**Quyết định đang chờ:** người dùng nghiệm thu M1 và Approved bundle M2 revision 1, gồm schema v2/import riêng, baseline-only variants, caps/record add-archive, manual Save, protected source checks + QA gate và exact paths/AC. Chưa có Approved M2, implementation giữ `NOT_STARTED`.

Nguồn nội bộ: `docs/CMS-PROPOSAL-CMS-001-v2.md §4/§7`, `docs/CMS-ARCHITECTURE.md §5–§9/§14`, `tasks/plan.md`, `docs/QA-AND-DOD.md`, `docs/APPROVAL-PROTOCOL.md`; hiện trạng `pinky-lamb-cms/docs/M1-REVIEW.md`, contracts/services/admin/exporter M1 và preservation evidence. Skills pinned đã đọc để lập bundle: using-agent-skills, spec-driven-development, planning-and-task-breakdown, context-engineering, source-driven-development, api-and-interface-design, security-and-hardening, frontend-ui-engineering tại commit `1be8e34187e34647bb83adc3a1323b26ae6f6abe`. Đọc snapshot để áp dụng không phải install/discovery runtime.
