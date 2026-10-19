# Pinky Lamb CMS — đặc tả kiến trúc đề xuất

**CMS-001 v2; AWAITING_APPROVAL / NOT_IMPLEMENTED. Ngày nghiên cứu: 11/10/2026 UTC.** Tài liệu này chỉ là thiết kế/kế hoạch. Chưa có thay đổi ứng dụng, Firebase, repository hiện có, tài khoản thật hoặc triển khai. Mọi snippet bên dưới là hợp đồng dự kiến trong tài liệu, không phải mã được cài vào dự án.

## 1. Quyết định và phạm vi local

**Phạm vi toàn gói: CMS đầy đủ LOCAL.** Chỉ Firebase demo `demo-pinky-lamb-cms` và emulators loopback; không tài khoản thật, Firebase login, Blaze, billing hoặc IAM làm điều kiện local. Production/deploy ngoài gói; chỉ đề xuất riêng sau khi toàn CMS đạt LOCAL_COMPLETE và người dùng nghiệm thu. M1 là first slice, không phải LOCAL_COMPLETE. M2–M4 phải có đặc tả/task/Approved riêng.

**CMS NOT_IMPLEMENTED / CMS-001 v2 AWAITING_APPROVAL.** M1 chỉ Auth/roles/Hero+SEO/revisions/private preview/immutable review/local QA export; bảo toàn stack/API/tasks/allowlist hiện có. Full SiteContent, media và local publication là M2–M4, cần spec/Approved mới. Kế hoạch trước không cấp quyền implementation.

Engineering Approved cấp quyền implement exact slice còn mở. Editorial review duyệt immutable content snapshot; local acceptance ghi nghiệm thu toàn CMS. Ba quyết định độc lập; không tự suy approval từ review passed.

## 2. Cơ sở thực tế và giả định

Nguồn đọc: `AGENTS.md`, `docs/PROJECT-STATE.md`, `DESIGN.md`, `dist/index.html`, `dist/content.js`, `dist/app.js` trong baseline `pinky-lamb-codex-handoff-2026-10-10/pinky-lamb`. Các số liệu sau là từ snapshot bàn giao, không phải audit runtime mới:

| Hạng mục | Baseline đã đọc | Hệ quả CMS |
|---|---|---|
| Public baseline | Historical URL `https://pinky-lamb.web.app`, project/site `pinky-lamb`, observed 10/10/2026 | Read-only source context; local CMS không dùng target/account này |
| Stack | `dist/` là editable source, HTML/CSS/vanilla JS; chưa build/backend/Auth/Firestore/CMS | Publisher mới là bước xuất nội dung; public vẫn tĩnh; migration có approval riêng |
| Collections | 6 dịch vụ, 8 case | Seed đầy đủ, giữ stable ID; số lượng/count tự sinh từ data |
| Section | Header, Hero, client strip, selected work, services, about/reel, IP, contact, footer | Editor dựa đúng section thật, không tạo page builder tổng quát |
| Asset | 39 file public, 30.844.037 byte; PDF 17.349.548 byte và MP4 11.403.830 byte | Giữ asset hiện có; upload lớn/PDF/video phải có quota và quy trình riêng |
| Provenance | `source-content.json` là hồ sơ riêng, `content.js` sửa tay, chưa tự đồng bộ | Snapshot thống nhất public data + provenance private; không phát hành toàn bộ hồ sơ nguồn |
| Brief | `mailto` + copy, chưa delivery/store lead | CMS không âm thầm thêm backend lead hoặc lưu PII khách truy cập |
| SEO | Metadata HTML có sẵn; case/service chèn JS | Publisher sinh dịch vụ/case trong HTML; JS nâng cấp filter/dialog, không phải nguồn SEO duy nhất |

Giả định đề xuất, chờ người dùng chỉnh khi review: CMS vận hành cho **một thương hiệu/một website**, tiếng Việt cho admin; nội dung public có trường tiếng Anh/Việt như hiện tại nhưng chưa có hệ thống đa ngôn ngữ. Tài khoản dùng theo người, không dùng chung password. Client cần chỉnh copy, asset, order/visibility và biến thể layout đã thiết kế; không cần tự viết HTML/CSS/JS. Mặc định editor không tự duyệt nội dung mình sửa; có reviewer/publisher được chỉ định. Người dùng có thể chọn người giữ nhiều vai trò khi đội rất nhỏ, nhưng mọi override phải rõ trong policy.

Skill engineering thực tế đã đọc tại commit `1be8e34187e34647bb83adc3a1323b26ae6f6abe`: `using-agent-skills`, `spec-driven-development`, `planning-and-task-breakdown`, `api-and-interface-design`, `security-and-hardening`, cùng `definition-of-done` và `security-checklist`. Theo yêu cầu người dùng, capability map + spec + plan + tasks được đưa cùng một **bản nháp chưa duyệt**; không coi checkpoint giữa các phần là approval, không dừng trước khi hoàn thành proposal reviewable. Checkpoint BUILD/SHIP vẫn đóng cho tới `Approved`; quyền đọc/spec/plan/docs hiện đã được cấp.

## 3. Capability map

| Module ID ổn định | Trách nhiệm | Phụ thuộc |
|---|---|---|
| `cms-identity` | Email/Password, membership UID, role, disable/revoke | — |
| `cms-content` | Typed section/settings/service/case và provenance, revision | `cms-identity` |
| `cms-media` | Catalog, private originals, validation, optimized derivatives | `cms-identity` |
| `cms-preview` | Cùng renderer với public, xem nháp trong phiên authenticated | `cms-content`, `cms-media` |
| `cms-review` | Submit immutable snapshot, approve/reject exact revision | `cms-content`, `cms-media` |
| `cms-publish` | Validate/build/version/release/reconcile/rollback | `cms-review`, `cms-preview` |

Thứ tự: identity → content/media → preview/review → publish. M1 dùng catalog media có sẵn, không phụ thuộc upload thật; reviewer/publish contract được xác định từ đầu, nhưng job publisher thật thuộc milestone riêng.

## 4. Kiến trúc local đã chọn

Admin vanilla ESM + Vite, Auth/Firestore/Functions/Hosting emulators ở loopback cùng `demo-pinky-lamb-cms`. Browser không direct-write private content; API `cmsApi` v2 HTTP onRequest kiểm ACL và validators. M3 bổ sung Storage emulator trong cùng demo project sau detailed approval; M4 chỉ filesystem local exporter/current pointer/history. Website baseline read-only, public artifact không tải Firebase SDK/private provenance. Không cần login hoặc account Firebase thật.

Dependency/docs/JDK/emulator/Playwright downloads là tooling setup được phép sau Approved tương ứng; không đồng nghĩa cloud runtime traffic permission.

## 5. Sản phẩm mà client sẽ thao tác

### 5.1 Editor và thông tin phản hồi

Sidebar: Tổng quan; Trang chủ; Dự án; Dịch vụ; Media; SEO & liên hệ; Chờ duyệt; Lịch sử xuất bản. Tài khoản chỉ xuất hiện với quyền owner. Form có nhãn tiếng Việt, giới hạn ký tự, bản xem trước desktop/mobile, save status và lỗi gắn vào đúng field. Media picker hiển thị tên, thumbnail, alt, quyền sử dụng và chỗ đang dùng. Reorder dùng nút lên/xuống và drag option; thao tác keyboard phải hoàn thành được.

Hành trình chuẩn: **Chọn mục → sửa → Lưu nháp → Xem trước → Gửi duyệt → reviewer xem diff/bản cụ thể → Duyệt → publisher Xuất bản → thấy bản đang phục vụ local**. Không ghi “Đã xuất bản” chỉ vì lưu Firestore hoặc gửi job thành công. Autosave có debounce, một request đang xử lý, không overwrite khi revision xung đột; dirty local edits giữ trong memory và cảnh báo trước rời trang. Không hỗ trợ silent offline publish.

### 5.2 Chính xác phần nào được chỉnh

| Section/data hiện có | Field client | Chốt an toàn/template |
|---|---|---|
| Header/nav | Label, thứ tự link tới section đã bật, logo catalog | Anchor ID ổn định; không nhập script/HTML, không xóa brand logo master |
| Hero | Eyebrow, các dòng heading, emphasis, description, CTA label/target, ảnh/alt, artwork note | `hero-split` hiện có; `hero-centered` chỉ có sau thiết kế+QA riêng; một h1 duy nhất |
| Clients | Danh sách/logo/alt, order, visibility | Cần bằng chứng/quyền dùng logo; không gọi là endorsement mới |
| Work | Heading, intro, featured IDs, thứ tự case, filter labels | Category enum hiện tại; count tự sinh; stable case ID |
| Service | Title/Vi, summary, scope, order, visibility | 6 dịch vụ seed; chọn `accordion` mặc định; `cards` là biến thể review trước |
| About/reel | Heading/copy, fact label/value/source, video/poster/duration/caption | Fact `15+` không tự suy năm thành lập; duration phải phản ánh media |
| IP | Heading/copy, disciplines, artwork/alt, CTA | Không tạo launched IP/franchise mà chưa có nguồn |
| Contact | Email, phone, display name/address, Facebook, heading/form intro | Đồng bộ href/label/form recipient; mailto behavior giữ nguyên |
| Footer | CTA/copy, approved social links, copyright | Wordmark artwork và font licence giữ; không cho external arbitrary script |
| Global SEO | Title, description, OG image/alt, social copy | Canonical/base URL/robots policy là trường quản trị có quyền; metadata publish vào HTML |

Template editing nghĩa là **chọn section variant có schema và điều khiển được review**, không phải sửa tùy ý theme source. M1 chỉ `hero-split`. Thêm variant cần engineering proposal/approval mới, accessibility/responsive QA và templateVersion mới. Section visibility/reorder v1 chỉ trong vùng được phép: Header/Hero/Contact/Footer cố định; Work/Services/About/IP có thể sắp xếp trong vùng body khi biến thể tương ứng đã QA. Clients optional; tắt Services phải đồng bộ nav và interest options; tắt contact không nằm trong v1.

Không trong scope: blog, multilingual routing, analytics tracking, lead CRM, payment, customer portal, arbitrary rich HTML, AI tạo claim, scheduled publish, multi-tenant, marketplace themes, tự ý thay mascot hoặc stock portfolio.

## 6. Data contract dự kiến

Tách **input client** khỏi field server. Chuẩn lưu: camelCase, enum UPPER_SNAKE, ID opaque/slug ổn định, server timestamps, schemaVersion số nguyên, revision tăng đơn điệu. Hợp đồng TypeScript bên dưới được viết để review, sẽ cần validator runtime tương ứng khi M1 được Approved.

```ts
type UID = string; type AssetId = string; type RevisionId = string;
type Role = 'EDITOR' | 'REVIEWER' | 'PUBLISHER' | 'OWNER';
type Member = {
  uid: UID; role: Role; isActive: boolean; expectedEmail: string;
  authzVersion: number; invitedBy: UID; createdAt: string;
};
type PlainText = string; // Encode khi xuất HTML, không phải HTML đã tin cậy.
type TextRun = { text: PlainText; emphasis?: 'NONE' | 'STRONG' | 'ACCENT' };
type Heading = { lines: Array<Array<TextRun>> };
type Action =
  | { kind: 'SECTION'; sectionId: 'work' | 'services' | 'about' | 'ip-studio' | 'contact'; label: string }
  | { kind: 'SHOWREEL'; label: string }
  | { kind: 'CREDENTIAL'; assetId: AssetId; label: string };
type AssetUse = { assetId: AssetId; alt: string; isDecorative: boolean;
  focalPoint?: { x: number; y: number } };
type Hero = { kind: 'HERO'; variant: 'hero-split'; heading: Heading;
  eyebrow: string; description: TextRun[]; image: AssetUse;
  primaryAction: Action; secondaryAction?: Action;
  footnote: string; note: string };
type Service = { id: string; title: string; titleVi: string; summary: string;
  scope: string[]; isVisible: boolean; sourceRefs: string[] };
type CaseStudy = { id: string; slug: string; title: string; client: string;
  year: number; category: 'EVENTS' | 'FILM' | 'COMMUNICATIONS';
  eyebrow: string; summary: string; scope: string[];
  cover: AssetUse; gallery: AssetUse[]; serviceIds: string[];
  isVisible: boolean; sourceRefs: string[] };
type SourceReference = { id: string; kind: 'CREDENTIAL' | 'CLIENT_APPROVAL' | 'SUPPLIED_FILE';
  privateDocumentId: string; pages?: number[]; notes?: string;
  claimBindings: Array<{ path: string; claimHash: string }>;
  verification: 'UNVERIFIED' | 'SOURCE_CHECKED' | 'CLIENT_CONFIRMED';
  checkedBy?: UID; checkedAt?: string };
type MediaRecord = { id: AssetId; kind: 'IMAGE' | 'VIDEO' | 'PDF';
  originalObject?: { path: string; generation: string; sha256: string };
  legacyPath?: string; mimeType: string; sizeBytes: number;
  width?: number; height?: number; durationSeconds?: number;
  status: 'LEGACY_READY' | 'QUARANTINED' | 'PROCESSING' | 'READY' | 'REJECTED' | 'ARCHIVED';
  derivatives: Array<{ key: string; path: string; sha256: string;
    width?: number; height?: number; mimeType: string }>;
  rights: { basis: 'CLIENT_SUPPLIED' | 'LICENSED' | 'WRITTEN_APPROVAL'; evidenceRef: string };
  sourceRefs: string[]; createdBy: UID; createdAt: string };
type Seo = { title: string; description: string; ogTitle: string;
  ogDescription: string; ogImage: AssetUse };
type SectionId = 'clients' | 'work' | 'services' | 'about' | 'ip-studio' | 'contact';
type NavItem = { sectionId: SectionId; label: string };
type SiteSettings = {
  brand: { name: 'Pinky Lamb'; logo: AssetUse; tagline: string };
  credential: { assetId: AssetId; label: string; edition: string };
  showreel: { assetId: AssetId; poster: AssetUse; title: string;
    durationSeconds: number; originalSourceUrl?: string };
  contact: { email: string; personName: string; personPhoneE164: string;
    personPhoneLabel: string; officePhoneE164: string;
    officePhoneLabel: string; addressLines: string[];
    facebookUrl: string };
  nav: NavItem[];
  clientLogos: Array<{ id: string; clientName: string; image: AssetUse;
    sourceRefs: string[]; isVisible: boolean }>;
  copyright: { startYear?: number; label: string };
  // baseUrl là owner/system field, editor không PATCH được.
  localBaseUrl: string; // system configuration validated HTTP loopback only
};
type SectionSettings =
  | { kind: 'CLIENTS'; sectionId: 'clients'; isVisible: boolean; heading: TextRun[] }
  | { kind: 'WORK'; sectionId: 'work'; isVisible: boolean;
      variant: 'work-grid'; heading: Heading; intro: string;
      featuredIds: string[]; initialVisibleCount: number;
      filterLabels: { all: string; EVENTS: string; FILM: string; COMMUNICATIONS: string } }
  | { kind: 'SERVICES'; sectionId: 'services'; isVisible: boolean;
      variant: 'services-accordion'; heading: Heading; intro: string;
      serviceOrder: string[]; action: Action }
  | { kind: 'ABOUT'; sectionId: 'about'; isVisible: boolean;
      variant: 'about-split'; heading: Heading; lead: string; paragraphs: string[];
      experienceFact: { value: string; label: string; sourceRefs: string[] };
      reelHeading: Heading; reelCaption: string }
  | { kind: 'IP'; sectionId: 'ip-studio'; isVisible: boolean;
      variant: 'ip-split'; heading: Heading; description: string;
      image: AssetUse; disciplines: string[]; action: Action }
  | { kind: 'CONTACT'; sectionId: 'contact'; isVisible: true;
      variant: 'contact-form'; heading: Heading; intro: string;
      formMode: 'MAILTO_COPY'; serviceOptionIds: string[] }
  | { kind: 'FOOTER'; sectionId: 'footer'; variant: 'footer-wordmark';
      heading: Heading; descriptor: string; backToTopLabel: string };
type SiteContent = { schemaVersion: 1; locale: 'vi-VN'; hero: Hero;
  seo: Seo; sectionOrder: SectionId[]; services: Service[]; projects: CaseStudy[];
  settings: SiteSettings; sections: SectionSettings[] };
type Draft = { content: SiteContent; revision: number; updatedBy: UID;
  updatedAt: string; lastEventId: string };
type Snapshot = { id: RevisionId; content: SiteContent; contentHash: string;
  mediaManifestHash: string; schemaVersion: number; templateVersion: string;
  sourceRefs: SourceReference[]; submittedBy: UID; submittedAt: string;
  draftRevision: number };
type Review = { snapshotId: RevisionId; outcome: 'APPROVED' | 'CHANGES_REQUESTED';
  contentHash: string; reviewedBy: UID; reviewedAt: string; note?: string };
type ReviewState = { snapshotId: RevisionId;
  status: 'IN_REVIEW' | 'APPROVED' | 'CHANGES_REQUESTED' | 'CANCELLED';
  revision: number; activeReviewId: string | null; updatedAt: string };
// M4 roadmap notation only; requires detailed spec/Approved, outside M1 validators.
type PublishJob = { id: string; snapshotId: RevisionId; requestHash: string;
  expectedCurrentReleaseId: string | null; target: 'LOCAL_FILESYSTEM';
  state: 'QUEUED' | 'BUILDING' | 'VALIDATING' | 'ARTIFACT_READY' |
    'SWITCHING_POINTER' | 'SUCCEEDED' | 'FAILED' | 'RECOVERY_REQUIRED';
  artifactHash?: string; artifactDirectory?: string; currentPointerVersion?: number;
  requestedBy: UID; createdAt: string; correlationId: string };
type ReleaseRecord = { id: string; snapshotId: RevisionId; contentHash: string;
  artifactHash: string; templateVersion: string; artifactDirectory: string;
  currentPointerVersion: number; previousReleaseId: string | null;
  publishedBy: UID; publishedAt: string; isRollback: boolean };
```

Các type full-site/media/publication là contract notation dự kiến M2–M4, không yêu cầu implement validators toàn bộ trong M1. M1 chỉ Hero/SEO + envelope/ACL/revision/snapshot/review trong allowlist đã chốt. Các type trên mô tả variant đang có; `hero-centered`, service cards hoặc layout khác chỉ được thêm sau engineering approval, không chỉ nhập một string mới vào database. Schema validator còn kiểm section uniqueness, required fixed sections, reference order, URL email/tel/social allowlist và bounds số. Source URL showreel chỉ cho host nguồn đã duyệt; không server fetch. Không phát minh generic block engine trong v1.

Giới hạn đề xuất: title 1–120; SEO title tối đa 80, description tối đa 200; summary tối đa 1.000; long copy tổng mỗi section 4.000; scope tối đa 12, mỗi dòng 160; gallery tối đa 12; heading tối đa 3 dòng, mỗi dòng 100. Giới hạn SEO là editorial guardrail, không bảo đảm search engine hiển thị nguyên vẹn. Year 1990–năm hiện tại+2; category/variant/CTA chỉ enum; focal point 0..1; unique ID và slug; tất cả asset/source/service reference phải tồn tại. `scope: []` hợp lệ, không tự điền để đạt validator.

Firestore đề xuất cho một site nhỏ:

- `cmsMembers/{uid}`: ACL, browser không được ghi; UID là identity chuẩn, email chỉ đối chiếu bổ sung.
- `cmsDrafts/home`: envelope + content; M1 chỉ Hero/SEO và metadata revision. Full site dùng một document có cap đề xuất 256 KiB, giúp save/review nguyên tử; không lưu binary/base64 trong Firestore.
- `cmsSnapshots/{revisionId}`: bất biến; private. `cmsReviews/{reviewId}` bất biến, bound snapshot ID/hash. `cmsReviewStates/{revisionId}` là current decision envelope có optimistic revision, chỉ reviewer/owner qua trusted API hoặc Rules tương ứng; không nhét mutable status vào snapshot.
- `cmsMedia/{assetId}`, `cmsSources/{sourceId}`: metadata/private provenance, không tự xem là quyền sử dụng được xác nhận.
- `cmsPublishJobs/{jobId}`, `cmsReleases/{releaseId}`, `cmsState/currentLocal`, `cmsState/publishGate`, `cmsAudit/{eventId}`: chỉ trusted API/publisher ghi.

Snapshot gồm nội dung + resolved media manifest + provenance đã chọn, không chỉ reference tới draft còn sửa được. Full document vượt cap sẽ bị từ chối; nếu portfolio mở rộng cần proposal schema migration riêng để split thành manifest + immutable chunks. Giới hạn Firestore thực 1 MiB/document ([quotas](https://firebase.google.com/docs/firestore/quotas)); cap 256 KiB là policy chủ động để giữ headroom, không phải Firebase limit.

Public projection loại UID, email admin, review note, private document path, license evidence, source notes, audit và job data. Credential link public được giữ khi nguồn được phép; provenance nội bộ không hiển thị UI visitor. Contact information hiện đã public không biến thành danh sách admin hay lead data.

**Provenance policy của full publish:** mọi factual field mới/đổi (client role/scope, thời điểm, con số, kết quả, testimony, IP đã launch) phải có nguồn SOURCE_CHECKED hoặc CLIENT_CONFIRMED do reviewer/owner xác nhận qua protected action. `claimHash` bind tới normalized giá trị tại claim path trong snapshot, nên sửa số/câu không được dùng lại chứng nhận của giá trị cũ. Editor có thể đính nguồn nhưng không ghi checkedBy/verification thành verified. Copy sáng tạo của website được reviewer duyệt như editorial copy, không gán là trích credential; không yêu cầu credential cho mọi slogan tự viết. Không nguồn factual claim → block full publish, không chỉ warning. M1 seed provenance baseline read-only; full source-verification UI/API thuộc milestone M2/M3.

## 7. Identity, quyền và trust boundaries

### 7.1 Membership và signup loophole

Login Email/Password chỉ xác minh **ai đang đăng nhập**. Quyền CMS cần active membership đã cấp bởi owner/operator trusted. Không có nút signup trên admin; **ẩn signup không chặn người khác gọi Auth API để tạo tài khoản**. Một tài khoản tự tạo, email giống domain công ty hoặc UID mới không có membership luôn nhận 403, không đọc được draft/media và không được tự ghi member/role. Email chưa verified không cấp quyền.

Tài khoản tạo qua Console/Admin SDK trên môi trường thật ở milestone onboarding được duyệt; owner nhập đúng UID sau khi xác nhận người nhận, không lưu password vào Firestore/docs. Đổi email yêu cầu onboarding xác nhận lại, membership không theo email text. Emulator self-signup vẫn không tạo membership hoặc CMS quyền; basic login không phải invite-only registration.

M1 fixtures gồm editor, reviewer, publisher, owner, người đăng nhập không allowlisted, member inactive và email unverified; chỉ user emulator. Bootstrap là privileged local fixture script có guard demo project, browser không có bootstrap account/secret.

| Hành động | Editor | Reviewer | Publisher | Owner |
|---|---|---|---|---|
| Read draft/catalog/private preview | Có | Có | Có | Có |
| Save draft / submit snapshot | Có | Chỉ khi có thêm quyền editor theo policy | Không mặc định | Có |
| Approve/reject snapshot | Không | Có, không tự approve snapshot của mình | Không mặc định | Có; M1 không được tự approve snapshot của mình |
| Publish/rollback đã được duyệt | Không | Không | Có | Có |
| Assign/deactivate membership | Không | Không | Không | Có qua trusted administration |
| Code/template/engineering changes | Không | Không | Không | Vẫn ngoài content workflow, cần engineering approval |

Role có thể là tập permission hoặc danh sách role sau này; v1 giữ enum đơn và quy tắc owner rõ để tránh phức tạp. Nếu một người cần editor+publisher, phải quyết định policy trước local role policy, không giả vờ single enum hỗ trợ role kép.

**Policy M1 đã chọn:** self-review bị cấm với mọi role kể cả OWNER, xác định bằng `reviewedBy !== submittedBy` của immutable snapshot. Owner override chưa có trong M1; nếu đội một người cần override, phải có đề xuất/phê duyệt policy mới, lý do audit bắt buộc và acceptance riêng trước mốc local tương ứng. Không chờ tới code để tự chọn policy.

### 7.2 Server và Rules

Local CMS: UI dùng Auth emulator SDK; mọi content mutation qua trusted Functions emulator API. Backend verify emulator token/project/expiry, lấy active/verified membership, kiểm action/resource, validate body; không tin UID/role client gửi. Browser direct Firestore writes bị deny. Server SDK bypass Rules nên API authorization bắt buộc và có integration abuse tests ([Rules conditions](https://firebase.google.com/docs/firestore/security/rules-conditions)).


Khuyến nghị admin dùng `inMemoryPersistence`, không local persistence, không tự lưu token vào localStorage. Firebase mặc định web local persistence; phải đặt mode rõ ([Auth persistence](https://firebase.google.com/docs/auth/web/auth-state-persistence)). Full backend có thể dùng secure/httpOnly/sameSite session cookie với CSRF protection; đó là lựa chọn session adapter cần review trước mốc local tương ứng, không trộn ID token/cookie tùy endpoint. M1 memory-token session đủ để kiểm quy trình local. Không bật offline Firestore persistence cho private CMS. Deactivate ACL có hiệu lực trong lần kiểm quyền tiếp theo, bên cạnh revoke refresh token; token cũ có thể còn hạn nên không chỉ dựa custom claims ([session revocation](https://firebase.google.com/docs/auth/admin/manage-sessions)). Nếu dùng claims để hiển thị UI, server/Rules vẫn kiểm ACL; claims chỉ set bằng privileged Admin SDK ([custom claims](https://firebase.google.com/docs/auth/admin/custom-claims)).

### 7.3 Threat model nhỏ nhưng thực tế

| Ranh giới / tài sản | Abuse case | Control và bằng chứng cần |
|---|---|---|
| Browser → Auth/ACL | Tự signup rồi tự cấp owner | Member deny-write; API policy; test unknown UID |
| Editor → API/Firestore | Set role, state=PUBLISHED, createdBy giả | Allowlist/protected server fields; role action tests |
| Draft → renderer | XSS/script URL/arbitrary template path | Plain text encoding, CTA enum, template registry fixed; malicious fixture |
| Private snapshot → preview/public | Share URL lộ nháp, full provenance trong public bundle | Private in-app preview; no unauth read; public projection assertions |
| Upload → Storage/processor | SVG script, polyglot, bomb, oversize, forged MIME | Quarantine, magic byte/decode/size/pixel caps, allowlist, no SVG uploads v1 |
| Publisher → local filesystem | Duplicate/stale jobs, path escape, partial artifact/current pointer conflict | Fixed isolated path/containment, immutable hashes, serializer, expected-current guard, local recovery |
| Session → admin actions | Stolen token/role revoked | Memory persistence, CSP, current ACL, revoke, short reauth policy |
| Logs/export → người khác | Token, email/password, source tài liệu nhạy cảm | Redaction, least privilege, retention, sanitized QA artifact |

Public/admin tách build output/script bundle và loopback serving boundaries trong local preview/export; public không nạp Firebase SDK hoặc private content. Admin shell có thể public tải được nhưng data private bằng Auth/Rules/API; `robots noindex` chỉ là indexing policy, không phải bảo mật. CSP/headers/CORS cho admin và public cấu hình riêng, origin allowlist, không CORS `*` với credentials. Không server fetch arbitrary media URL/import-from-URL trong v1; giảm SSRF.

## 8. API và boundary contract

Full API dùng `/api/cms/...`; **M1 chọn REST HTTP** qua Firebase Functions v2 `onRequest`, function tên `cmsApi`, chạy Functions emulator. Vanilla ESM request handler dispatch route/method tới service typed, không thêm Express/router framework, không callable transport song song. Vite proxy `/api/cms` tới loopback emulator function URL, giữ same-origin browser API requests. Semantic HTTP contract dưới đây là lựa chọn cần duyệt trong proposal, không trì hoãn lựa chọn adapter sau approval.

| Method/resource | Input typed | Output / quyền / tác động |
|---|---|---|
| `GET /api/cms/session` | Auth credential | `{uid, role, isActive, authzVersion}`; không password/token response echo |
| `GET /api/cms/drafts/home` | — | `Draft`; member active |
| `PATCH /api/cms/drafts/home` | `{expectedRevision, patch: HeroSeoPatch}` ở M1; full typed patch later | `{revision, updatedAt}`; editor/owner; version conflict 409 |
| `POST /api/cms/snapshots` | `{draftRevision, message?}` | `SnapshotSummary`; API capture từ đúng draft revision, hash + immutable data |
| `GET /api/cms/snapshots/{id}` | ID | `{snapshot, reviewState}`; active member; preview dùng đúng revision |
| `POST /api/cms/reviews` | `{snapshotId, contentHash, expectedReviewRevision, outcome, note?}` | `Review`; reviewer/owner, check self-review policy |
| `GET /api/cms/media` | `{cursor?,pageSize<=50,kind?,status?}` | `{data: MediaSummary[],nextCursor}` |
| `POST /api/cms/media` | `{name,declaredType,sizeBytes,rights,sourceRefs}` | Upload intent + private object target; full media phase |
| `POST /api/cms/media/{id}/completions` | `{generation,clientChecksum?}` | `{status}`; processor tự kiểm bytes, không tin checksum client |
| `POST /api/cms/publish-jobs` | `{snapshotId,contentHash,expectedCurrentReleaseId}` + Idempotency-Key | 202 `{jobId,statusUrl}`; publisher/owner, review APPROVED |
| `GET /api/cms/publish-jobs/{id}` | ID | `PublishJobSummary`; private member |
| `GET /api/cms/releases` | `{cursor?,pageSize<=50}` | `{data: ReleaseSummary[],nextCursor}` |
| `POST /api/cms/rollback-jobs` | `{releaseId,expectedCurrentReleaseId,reason}` + key | 202 job; same publisher lock/policy |

M1 scope API **bắt buộc** session GET, draft GET/PATCH, snapshot POST/GET và review POST/current decision theo chính sách ở §9; không implement dummy publish button gọi cloud, không giả báo upload/Published. UI giải thích “Bản thử local — chưa xuất bản”.

`HeroSeoPatch` cho phép hero/seo field cụ thể, không merge arbitrary path, không field server. Stable mutation key được tạo **một lần cho một ý định**, dùng lại khi retry; hash body canonical hóa exclude transport metadata. Transaction claim doc `cmsIdempotency/{uid+operation+keyHash}` và request hash, không read-then-write hai lần rời nhau. Same key/different body → 422 `IDEMPOTENCY_PAYLOAD_MISMATCH`; pending → 202 cho job dài/409 cho mutation ngắn; completed replay same result. Giữ publish intent/idempotency record gắn release lâu dài, không TTL ngắn hơn retry/reconciliation window. Crash/timeout khi đổi local pointer có trạng thái RECOVERY_REQUIRED, không auto coi FAILED.

Response lỗi thống nhất: `{error:{code,message,fieldErrors?,correlationId}}`; 401 auth thiếu/hỏng, 403 không quyền, 404 không resource, 409 revision/current-local conflict, 422 semantic schema, 429 rate limit, 500 generic. Không trả stack, bucket private paths, UID của người khác hoặc private environment detail. Read list cursor-based, page cap; draft whole-site chỉ một resource không cần pagination. Validation tại boundary input, local filesystem response, config và publisher snapshot ingest; internal functions nhận typed parsed value.

## 9. Save, review, concurrency và private preview

Draft save trong transaction kiểm `expectedRevision === current.revision`, chỉ update patch cho phép, tăng revision+1, server timestamp/actor; audit event cùng transaction. Hai editor sửa cùng revision chỉ một save thành công; người còn lại nhận diff/conflict UI, không silent last-write-wins. Autosave retry không tự đổi expectedRevision để overwrite.

Submit capture draft tại revision yêu cầu trong transaction, tạo immutable snapshot và audit. Snapshot hash bao gồm content canonical JSON, media manifest hash, schemaVersion và templateVersion; đổi renderer/template invalidate preview/approval cũ cho phát hành mới. Reviewer xem snapshot cố định, diff với bản đang phục vụ local và warnings về source/asset; APPROVED ghi đúng hash. Editor có thể tiếp tục draft sau submit, nhưng điều đó tạo revision khác chưa được duyệt. Publisher dùng snapshot đã approved, không “lấy draft mới nhất”.

Review lifecycle là `IN_REVIEW → APPROVED | CHANGES_REQUESTED | CANCELLED`. Một quyết định là append-only Review record; current ReviewState chỉ đến record effective bằng transaction và expected review revision, tránh hai reviewer quyết định đồng thời. CHANGES_REQUESTED cần snapshot mới sau sửa; không sửa lại snapshot cũ. CANCELLED trước publish vô hiệu quyền phát hành; một job chưa switch pointer sẽ bị dừng. Khi job đã SWITCHING_POINTER/RECOVERY_REQUIRED, cancel phải báo đang phục hồi và xác minh current pointer, không giả rằng artifact chưa current. Sau local publication, thu hồi content là local rollback/new reviewed version; ledger không bị xóa. Editor không được ghi decision/current-state để tự approve.

Private preview: render tại admin sau Auth + ACL read; share chỉ cho account member, không export blob chứa private media thành public URL. Frame sandbox không script arbitrary và không truyền token; shared renderer produce encoded HTML projection. M1 preview từ Hero/SEO mới kết hợp baseline read-only; không gọi đó là toàn site được CMS quản lý. Full media preview tải private bytes qua authorization, cache trong memory, clear khi logout, no-store khi backend serve. CSP kiểm chặt sources/blob dùng cho media.

Private preview local nằm trong admin authenticated; không public-share draft URL. Logout clear private state.

## 10. Media library và quyền sử dụng

V1 image upload allowlist JPEG/PNG/WebP, cap đề xuất 10 MiB/file và 40 MP decode pixels; server kiểm signature, decode/re-encode, bỏ EXIF, derive thumbnail và responsive WebP. PDF/video xử lý riêng: PDF credential đề xuất cap 25 MiB (file baseline ~17.35 MB), MP4 cap 30 MiB (baseline ~11.4 MB); kiểm file type, container metadata, duration/size, quét malware khi có worker đủ năng lực. Không gọi kiểm MIME là malware scan. Không auto dùng PDF/video vừa upload khi chưa qua review; video transcoding tự động nằm ngoài v1 nếu không cần.

Flow full: register intent → upload private Storage-emulator quarantine path giới hạn UID/object/size → processor trusted kiểm bytes → READY derivative immutable hash → editor chọn asset → snapshot pin object generation/hash → local publication copy **chỉ public derivative cần dùng** vào local static artifact. Private originals, copyright evidence và source docs không vào bundle. Không dùng Firebase download token public cho confidential originals; URL có token là bearer access và dễ lộ khi chia sẻ.

M1 catalog-only: nhập metadata catalog từ asset baseline và chọn file tồn tại; không có fake upload. Tên gốc/legacy path mapping không cho client quyết định output path. Tên output dựa digest hoặc allowlisted ID, containment check và không `../`. Logo/mascot supplied không vẽ lại. Asset rights status chưa xác nhận phải warning/block publish theo rule đã thống nhất.

Archive mềm, không xóa bytes được snapshot/current local/retained rollback tham chiếu. usageCount chỉ cache; trusted manifest scan trước cleanup. Chốt retention/backup/deletion policy local ở M3/M4 và kiểm restore.

## 11. Publish tĩnh, tính nguyên tử và rollback

### 11.1 Artifact và SEO

Renderer registry version-pinned xuất HTML hoàn chỉnh từ immutable snapshot. Public app.js giữ menu/filter/dialog/showreel/mailto/copy, nâng cấp DOM đã có nội dung. Services/case cards/heading/contact đều đọc được khi tắt JS. Toàn bộ SEO title, description, OG và canonical có trong response HTML; share metadata không phải JS update sau fetch. Khi thêm case URLs ở milestone SEO, sinh `/work/{slug}/index.html` theo static template, link từ cards, canonical riêng/sitemap; dialog là enhancement, không mất permalink. Đây là scope roadmap cần approval riêng, không làm trong M1.

Publish output: `index.html`, stylesheet/script version, public-only JSON cho interactions nếu cần, hashed media derivatives, sitemap/robots khi có routes, release marker chứa public release ID/hash **không PII**. Không còn hai file public content/provenance sửa tay độc lập; snapshot/exporter là source of truth. Giữ font local/licences, no preload PDF/video, image dimensions/lazy nonhero, hero priority. Tránh injection cả HTML text/attribute/JSON-in-script; test `</script>` payload. Khi xuất inline JSON ưu tiên file JSON riêng hoặc safe serialization với CSP rõ.

### 11.2 Local publication (M4, chưa được duyệt)

1. API emulator kiểm active publisher, APPROVED snapshot/hash, schema/template pin và expected current release; stable idempotency key phải bind payload hash. Same key/different payload bị từ chối.
2. Serialize per-site local job; render full artifact vào temporary directory riêng, validate public-only data/HTML/assets/links/metadata và compute manifest/hash trước publish.
3. Freeze retained artifact path/hash; cùng filesystem, ghi current-pointer file tạm rồi atomic rename sau recheck gate/ACL/expected current. Không expose partial artifact như published current.
4. Ghi job/history/audit durable local và verify current artifact/marker; failure giữa artifact, pointer và ledger chuyển trạng thái local cần reconciliation, chặn job kế tiếp tới khi resolved. Không retry blindly hoặc steal gate vì timeout.
5. Serving adapter loopback phục vụ exact current artifact; verify HTML/assets/marker đúng version. Detailed M4 spec chốt adapter và paths, không mở rộng M1.
6. UI phân biệt đang xử lý, local artifact hoàn tất, và current local version đã verify. Không gọi local publication là live website release.

Giữ immutable artifact/version history và referenced asset bytes đủ retention policy local. Failure injection trước/sau pointer switch, concurrency hai publisher, stable retry, payload mismatch và backup/restore là tests M4. Đây là filesystem protocol cần spec paths/state machine/AC riêng trước implementation, không Hosting REST hoặc provider mock.

### 11.3 Local rollback

Publisher chọn retained local version, ghi reason/diff; same gate/expected current/idempotency, switch atomic pointer tới exact artifact và tạo rollback history record mới. Không sửa history/snapshot hoặc reset draft đang edit; clone old snapshot thành draft mới phải có expectedRevision. Template/schema pin và backup restore phải giữ content+assets+provenance consistency. Số liệu latency/SLO chỉ ghi sau đo local thật.



## 12. M1 LOCAL + EMULATORS — scope cụ thể

M1 chứng minh đường đi **member login → Hero/SEO edit → save revision → private preview → immutable submit/review** tại localhost, không phát hành. Functions emulator là API adapter đã chọn; Auth emulator quản lý identity giả, Firestore emulator quản lý private content/ACL; mọi mutation qua API, browser direct Firestore writes bị deny. Full `SiteContent` được đặc tả trước nhưng implementation M1 chỉ `HeroSeoContent`; asset picker chỉ catalog legacy.

**Stack local cụ thể:** vanilla JavaScript ESM (`.mjs`) với JSDoc + Zod runtime validators; Vite cho admin development/build, không React và không public framework migration. TypeScript snippets ở §6 là notation hợp đồng để review, không có yêu cầu mở thêm TypeScript transpilation toolchain. Node.js 22, tối thiểu 22.12 theo compatibility Vite; Firebase Functions có Node22 runtime và hỗ trợ ESM ([Firebase runtime docs](https://firebase.google.com/docs/functions/manage-functions), [Vite requirements](https://vite.dev/guide/)). Node patch và npm exact version chốt/pin trong task setup sau kiểm tooling thực tế.

Runtime packages đã chọn: `firebase` (Auth browser), `firebase-admin` (Auth token/membership/Firestore emulator API), `firebase-functions` (`onRequest` local), `zod` (boundary schema). Dev packages: `vite`, `firebase-tools`, `@firebase/rules-unit-testing`, `@playwright/test`, `eslint`; unit runner là Node built-in `node --test`. Schema Zod có parsing và runtime type validation ([Zod docs](https://zod.dev/)); không thêm validator thứ hai. Exact package releases và engine compatibility ghi trong lockfile/ADR ở M1-01a; nếu version đã pin không tương thích, pause task và đề xuất sửa dependency version, không đổi framework tùy ý. Một npm workspace/root lockfile quản lý admin+API, không tạo competing lockfiles.



**Tooling preflight M1-01a:** Node22 ≥22.12/npm và **JDK 21+** (đề nghị Java21 LTS, exact patch ghi lại); kiểm `java -version` và compatibility chosen pinned CLI/emulator binaries trước start. Root đối chiếu CLI firebase-tools 15.33.0 local có `MIN_SUPPORTED_JAVA_MAJOR_VERSION=21` tại `lib/emulator/commandUtils.js`; không chỉ dựa generic webdocs về transition Java21. Không cài Java/tooling trong lượt handoff.

`cms-api/package.json` là npm workspace member và Functions source metadata: main/type=module/engines Node22, runtime dependencies firebase-admin/firebase-functions/zod; **chỉ root package-lock.json**, không tạo API lockfile khác. Lint dùng `eslint.config.mjs` được viết trong CMS-M1-02 và source allowlist, với ESM/browser/Node contexts đúng thực tế. Malicious synthetic fixture thuộc CMS-M1-02; approved Hero fixture thuộc CMS-M1-09 để mỗi task ≤5 files. Fixture JSON đã commit là input có nguồn synthetic, không generated-output permission.

Sandbox implementation dự kiến ở checkout/copy riêng `pinky-lamb-cms/`, **không sửa `/workspace/sites/pinky-lamb-agency`**. `public-baseline/` read-only; `admin/` UI; `contracts/` schema; `cms-api/` local handlers; `infra-local/` emulator config/rules; `tests/`; `docs/`. Không biến `dist/` baseline hiện tại thành CMS output trước migration approval.

Lệnh dự kiến cho spec; task setup phải viết manifest + tạo `package-lock.json` với package releases đã chọn/kiểm compatibility và scripts disabled **trước khi** có thể chạy `npm ci`. Pin npm version trong packageManager; lần bootstrap dùng install lock-only/ignore-scripts phù hợp npm đã pin, rồi dependency audit trước execution. Những lệnh dưới đây dành cho checkout M1 đã có lockfile; không phải lệnh đã chạy:

```bash
npm ci --ignore-scripts
npm run lint
npm run test:unit
npm run test:emulators
npm run test:e2e:local
npm run dev:local
npm run build:admin
npm run export:local -- --snapshot tests/fixtures/approved-hero.json --out .preview-output
```

`test:emulators`/`dev:local` wrapper gọi Firebase CLI **đã pin** với `--project demo-pinky-lamb-cms --only auth,firestore,functions,hosting`; cả bốn emulator bắt buộc được cấu hình, binding loopback. Mặc định Auth 9099, Firestore 8080, Functions 5001, Hosting 5000, Emulator UI 4000, Vite 5173; nếu port bận phải chọn/ghi đồng bộ port local mới, không đổi host/cloud target. API base emulator: `http://127.0.0.1:5001/demo-pinky-lamb-cms/us-central1/cmsApi`; `/api/cms/...` route suffix được giữ qua Vite proxy. `us-central1` là tên local function URL, chưa quyết định vùng cloud.

`export:local` chỉ artifact QA local, không Hosting REST endpoint/credential. `demo-` project, emulator host vars, Auth connector và guard runtime đều bắt buộc; SDK initialize/connect emulator trước mọi read/token operation. Server kiểm `FIREBASE_AUTH_EMULATOR_HOST`, `FIRESTORE_EMULATOR_HOST`, project demo; thiếu/khác host → fail closed; không ADC/service-account thật. Emulator Suite có thể gọi production khi dùng real project và thiếu emulator ([Emulator docs](https://firebase.google.com/docs/emulator-suite)); demo project không có live resources ([demo project docs](https://firebase.google.com/docs/emulator-suite/connect_functions)). Network allowlist local và test missing-emulator fail là acceptance bắt buộc. Không dùng emulator làm server production.

### 12.1 Task index

Danh sách task canonical duy nhất ở [tasks/todo](../tasks/todo.md); milestone plan ở [tasks/plan](../tasks/plan.md). Không duplicate task table tại spec.

### 12.2 M1 success và rollback

M1 đạt khi: fixture member login; editor sửa/lưu Hero và SEO; reopen giữ đúng revision; desktop/mobile preview đúng; anonymous/unlisted/inactive không đọc hoặc mutate; client không tự cấp reviewer/owner; snapshot không đổi sau submit; self-review bị cấm cả owner; XSS/script URL bị chặn/encode; hai editor không overwrite; mọi Firebase request chỉ emulator; baseline public và checkout cũ không thay đổi. Report phải phân biệt unit, Rules, API integration và browser QA; không gọi local pass là production readiness.

M1 rollback: dừng dev/emulator processes, discard isolated implementation branch/copy khi user yêu cầu; trước discard bảo toàn user edits và evidence. Không có cloud data/schema/IAM cần rollback vì M1 không cloud writes. Fixture reset/export chứa user giả, không thông tin thật. Nếu guard phát hiện attempt gọi cloud thì dừng, ghi finding và không tiếp tục tới milestone khác.

## 13. Roadmap

Roadmap canonical ở [tasks/plan](../tasks/plan.md); chỉ M1 đang xin duyệt, mỗi mốc sau cần Approved mới.

## 14. Migration, QA và Definition of Done

Import mapping nguồn: six service IDs giữ nguyên; eight case IDs `wayfair`, `sony`, `diag`, `vifa`, `petrosetco`, `varna`, `samsung`, `psd`. Category old lowercase sang enum bằng mapping rõ; old filename stem sang asset ID/legacy path; sourcePage sang sourceRefs/page array; source metadata private. Gallery đầu trùng cover được normalise, không thêm ảnh mới. Giữ `scope: []` cho Wayfair/Petrosetco/PSD. `15+` lưu dưới fact với credential reference và note giới hạn, không thêm foundingYear. Showreel/PDF/font notice/local logo giữ hashes và mapping.

Baseline HTML copy sang typed fields qua manifest review; không coi text caption website tự sáng tác là quote credential. Import report gồm count, fields chưa map, orphan assets, claim không nguồn, ID/slug collisions, normalized category, diff public text. Không auto publish import chỉ vì validator pass. Baseline public release và full source+hash cần checkpoint before local publication.

QA quan trọng:

- **Security/authorization:** anonymous, unlisted signup, wrong role, inactive/changed email/unverified, IDOR, member writes, approve own snapshot, client write published status, backend direct SDK ACL, CSP and no token in logs/storage.
- **Data/workflow:** invalid/empty lists, valid scope empty, duplicate ID/slug, missing refs, concurrency two clients, schema/template mismatch, edited draft after approval, idempotency payload mismatch, job failure/RECOVERY_REQUIRED/local recovery và pending deletion.
- **Static/public:** HTML no-JS content, title/OG/canonical static; all asset/link/credential pages exist; counts/filter from data; dialog/gallery/video/menu; brief still mailto/copy truthful; service interest stable IDs map correct after label changes.
- **UI/accessibility:** desktop/mobile narrow widths, long Vietnamese/English headings, zoom/text scaling, keyboard reorder/media/preview/dialog, focus trap/restore, labels/errors/status aria, reduced motion, color contrast, alt/decorative logic. Không chỉ screenshot happy path.
- **Operations:** local setup repeatable; frozen lockfile/native dependency audit; no reachable unmitigated critical/high; dependency scripts reviewed trước execution; config/version not secret; sanitized evidence; source/template/content release traceability.

DoD theo skill: task AC đạt, behavior runtime verified, meaningful tests pass, relevant regression absent, schema/migration/backcompat handled, security reviewed, docs current, observability critical path và rollback tồn tại; trước implementation có đúng approval. Không tăng test breadth chỉ để “nhiều test”; tập trung rủi ro thực tế của Auth, XSS, concurrency, private drafts và release side effects.

## 15. Quyết định local còn mở

Variant ưu tiên, media cap/retention/backup format và role policy mở rộng được chốt trong proposal local tương ứng. M1 cấm self-review kể cả OWNER; không tự bật override. Không hỏi account, Firebase login, billing, IAM hoặc vùng cloud như điều kiện local.

## LOCAL_COMPLETE và nghiệm thu

LOCAL_COMPLETE chỉ được ghi khi toàn CMS local đã đạt:

- Editor quản lý toàn bộ section và variant đã engineered/Approved; schema, nguồn claim và asset refs đúng, không arbitrary theme/code.
- Media local có quarantine, MIME/size/decode validation, derivatives, rights/provenance; original/private metadata không lọt public projection.
- Authenticated full-site preview đúng revision; logout xóa private preview/token; ACL chặn anonymous/unknown/inactive/unverified, role tamper và self-review kể cả OWNER.
- Save có revision conflict/idempotency; immutable snapshot và exact-hash review; local publication tạo full-site static artifact, history/current pointer và rollback giữ draft hiện tại.
- Unit, Rules/ACL, API integration, browser desktop/mobile và static SEO/XSS/workflow/rollback regressions có evidence thật; runbook setup/backup/restore lặp lại được; usability và limitations được báo rõ.

High technical review đạt và LOCAL_COMPLETE kỹ thuật chưa phải nghiệm thu người dùng. Ghi user local acceptance riêng bằng lời/reference thực tế; không tự điền vào ledger. M1 closed không cho phép tự implement M2–M4.

## 16. Evidence/source index

Primary sources cho emulator/contracts/identity (kiểm chosen versions trong setup được Approved):

- https://firebase.google.com/docs/emulator-suite
- https://firebase.google.com/docs/emulator-suite/connect_functions
- https://firebase.google.com/docs/auth/web/password-auth
- https://firebase.google.com/docs/auth/web/auth-state-persistence
- https://firebase.google.com/docs/firestore/security/rules-conditions
- https://firebase.google.com/docs/functions/manage-functions
- https://vite.dev/guide/
- https://zod.dev/



Nghiên cứu nguồn giúp xác nhận constraint dịch vụ; các schema, cap, role policy, SLO và phase plan là **đề xuất thiết kế của tài liệu**, không phải Firebase bảo đảm. Baseline đã đọc không tương đương QA production mới. Trạng thái cuối: **đặc tả đề xuất CMS-001 v2 hoàn chỉnh để review; chưa Approved; không implementation/deploy**.
