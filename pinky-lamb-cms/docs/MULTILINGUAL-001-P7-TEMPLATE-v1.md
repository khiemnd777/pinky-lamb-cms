# MULTILINGUAL-001 — P7-00a · Template lock v1

## Trạng thái hiện hành — đã hoàn tất theo xác nhận của Khiêm

**ĐÃ HOÀN TẤT / CLOSED_BY_HUMAN_CONFIRMATION — 17/10/2026 (Asia/Ho_Chi_Minh).** Xem [xác nhận trực tiếp, phạm vi đóng và bảng trạng thái hiện hành](../../tasks/plan.md). Khiêm xác nhận các plan đã xong và giao chỉ đồng bộ tài liệu, không sửa code hoặc chạy lại kiểm thử.

Các trạng thái chờ duyệt/chưa hoàn tất, checkbox và bước tiếp theo trong phần bên dưới thuộc lịch sử trước xác nhận đóng; không tự mở lại plan/task từ các ghi nhận đó. Giữ nguyên bằng chứng PASS/FAIL/NOT_RUN, cờ kỹ thuật và giới hạn đã ghi nhận. Lần đồng bộ này không xác minh runtime, không ghi nhận release hoặc cấp quyền thực thi mới.

## Nội dung lịch sử trước xác nhận đóng


Ngày 16/10/2026. **SOURCE_IDENTITY_LOCKED / MAPPING_RECORDED**. Đây là reference cho consumers P3/P4, không cấp quyền implementation hoặc activation. Checklist thực thi duy nhất: [canonical tasks](../tasks/MULTILINGUAL-001-v2.md). [Plan §10](MULTILINGUAL-001-v2.md), [exact resource pins](../../approvals/MULTILINGUAL-001-P7-template-v1.pins.json).

## 1. Source có thẩm quyền

Template toàn website là website tĩnh 10/10/2026: `dist/index.html`, `styles.css`, `content.js`, `app.js` và toàn bộ 35 assets. Cả 39 file khớp từng byte với `pinky-lamb-cms/public-baseline/`; Hosting có thêm `FONT-NOTICES.txt`, phải giữ thông báo giấy phép này. Không sửa hai cây baseline. Inventory SHA256: `f00d523b1c4a3cfc8d84eacee73df955018c19a6e2e89d14ac35fdf2fee7512c` (canonical sorted compact JSON của mảng baseline trong pins).

| Source | SHA256 |
| --- | --- |
| `dist/index.html` | `4de13ed9a2b513458574b16fdaf9410422eb311ea23a0c4bce45b50a5d4630de` |
| `dist/styles.css` | `511db2c926152e819f267fe187b47a9fba32b8bdc39877969157504d04dfa65e` |
| `dist/content.js` | `0140b31e91742d75387860a565c8082f3e34d5dc4b79c3b92b69cc0dd2484a63` |
| `dist/app.js` | `3a0d2d5466f21f662c61870a851b10b7848c880ea90f75bcb3483d89d49fda32` |

`DESIGN.md` và cascade cuối của stylesheet là nguồn typography/spacing/responsive. Pinned source là chuẩn cấu trúc và hành vi; mixed-language copy cũ chỉ là nguồn inventory P6, không phải nội dung đúng cho bản EN.

Hai overlay đã duyệt được giữ đúng phạm vi: [Hero workspace/rendering v2](../../approvals/MULTILINGUAL-001-v2.design.json), [switch/navigation P2](../../approvals/MULTILINGUAL-001-P2-v1.scope.json). Sáu file mockup và các consumer hiện tại được pin riêng trong manifest. Hero overlay chỉ tác động Hero; switch đặt sau desktop nav/trước CTA, ngoài hamburger ở mobile và ba lựa chọn tên bản địa trong footer. Không lấy font/layout Hero áp cho các sections khác. Không dùng shell `CASE1` của P2 làm template toàn website.

## 2. Identity dữ liệu và renderer ownership

Mỗi output phải mang `kind + entityId/sectionId + locale + draft/snapshot revision + contentHash + dependencyHash + media manifest hash + template version`. `QA_SAVED` đọc bản đã lưu; `APPROVED_RELEASE` chỉ đọc snapshots đủ điều kiện P5. Không lấy query parameter làm quyền chuyển mode. Không dùng mockup fixtures hoặc raw Home v3 làm fallback cho bản dịch thiếu.

Đường `content.*` dưới đây là shared Home v3 đã kiểm schema. `localized.*` là typed sidecar cho locale `en|vi|ja`, schema cuối nằm trong bundle của consumer. Chọn entity bằng ID, không dùng vị trí mảng. Đổi thứ tự assets/records không được gắn bản dịch vào đối tượng khác. Mỗi mapping là contract bắt buộc; “planned” có nghĩa chưa có implementation.

| Component / selector chuẩn | Localized fields → locale/entity | Shared authority / invariant | Consumer owner và renderer đích |
| --- | --- | --- | --- |
| Header `.site-header`, desktop/mobile nav, CTA | header descriptor/CTA, brand tagline, nav label theo `sectionId`; alt theo logo slot | `settings.brand.name/logo`, nav target/order, CTA `#contact` | P4 Header → full header adapter; P2 switch chỉ overlay controls |
| Hero `.hero`, `#hero-title`, actions/note/scroll cue | `localizedHero[locale].content`: eyebrow, rich heading/description, labels, footnote/note/alt | Hero image/layout/action kind/targets; source claims | P1 existing `hero-localization-renderer.mjs`; P4/P7 assembly phải reuse approved composition |
| Clients `#clients .client-logos` | heading; `clientLogoId → image.alt` | legal client name, asset/focal/decorative/visibility/order | P4 Clients → full section adapter |
| Work intro `#work`, `#work-title`, filters/counter/load-more | section heading/intro/filterLabels; UI dictionary counter/load/collapse/aria, credential label, work-more copy | section identity/variant/visibility, featured project IDs, initialVisibleCount, credential asset/edition | P3 section + P4 UI dictionary → template Work wrapper + actual interactive buttons |
| Project `.project-card` | `projectId,locale → title`; category label from dictionary by category ID; cover alt by slot (decorative remains empty) | id/slug/client/year/category, selected cover bytes/crop, ordering/visibility/serviceIds | P3 representative → NEW `project-localization-renderer.mjs`, preserving `dist/app.js:projectCard` DOM/classes/index/arrow |
| Project `#case-dialog`, `.case-main-image/.case-body/.case-overview/.case-gallery/.case-footer` | same project title, eyebrow, summary, scope; alt by `cover` and `gallery:assetId`; UI scope/PDF/contact/close labels | cover/gallery identity/order/focal; credential PDF/page; service relation/contact target | P3 representative → same typed renderer, saved inert preview and QA interactive dialog; preserve `dist/app.js:openProject` layout; no `<details>` replacement |
| Services `#services`, `.service-list/.service-item` | section heading/intro/action label; `serviceId,locale → title/summary/scope`; secondary title slot decision below | stable ID/order/visibility; action target and selected interests use ID | P3 Service + section → full template service adapter; one locale at a time |
| About `#about`, `.about-layout/.about-signature/.experience-card` | heading/lead/paragraphs, experience label/copy/location, signature runs/alt, credential CTA label | experience numeric value and factual sources, signature image, PDF target | P4 About → full section adapter |
| Reel `.showreel`, `#video-dialog`, caption/source link | reel heading/caption/title/accessible player labels/source-link label | video/poster/duration/original URL and year; real native controls/preload/pause-on-close | P4 About/shared showreel → template video adapter + UI dictionary |
| IP `#ip-studio`, `.ip-visual/.ip-copy/.ip-disciplines` | heading/description/disciplines/CTA label/image alt; decorative sticker text in dictionary | image/crop/focal/brand, CTA kind/target and service ID | P4 IP → full section adapter; stable `ip-studio`, never P2 `ip/creative` |
| Contact `#contact`, `.contact-details` | heading/intro, contact display labels/social/address rendering/alt | original email/phones/person/address/facebook URL and illustration; translation cannot change legal/contact facts | P4 Contact → full section adapter |
| Brief `#brief-form`, interests/validation/copy/fallback | dictionary labels/placeholders/help/errors/toast/mailto subject/body labels; localized service display names | form fields/mode MAILTO_COPY; service IDs/options and destinations; no lead backend/storage | P4 dictionary/interactions → actual form handlers, preserving focus/clipboard fallback/validation |
| Footer `.site-footer`, wordmark/top-link/social | heading/descriptor/backToTop/copyright/social/switch labels | brand wordmark/artwork/start year and targets | P4 Footer + P2 switch → full footer adapter |
| SEO document/head, canonical/alternate/sitemap | title/description/OG alt per locale | canonical domain from approved release config; OG asset, routes/mode | P4 SEO → typed head/manifest adapter; QA noindex; no guessed Production domain |
| Icons, decorative stars, section numerals, image framing | only accessible labels where semantic | exact SVG/artwork, dimensions, CSS, section numbering rules | P7 full composition; no new icon library or artwork |

### Explicit migration gaps: resolve in the owning design/bundle, not a silent renderer shortcut

1. **Services secondary line.** Baseline `<strong>title</strong><small>titleVi</small>` contains two languages. New editor has one active locale, not simultaneous EN/VI fields. D3-SERVICE proposes `title` plus a distinct localized subtitle for the existing secondary slot. This is a proposed content contract, not approval to delete the secondary line or show EN fallback. The D3 design review must confirm that contract before Service code; P3 Project scope does not touch it.
2. Several baseline strings have no editable Home v3 field: section eyebrow labels, work-more sentence, scope/PDF/contact labels, IP sticker, player/fallback/brief strings. P4 must enumerate these in the closed dictionary or typed group schema; no hardcoded Vietnamese remains in an English/Japanese artifact. Keep the visual slots. Dictionary strings must not invent factual claims.
3. Baseline Project card category is a category dictionary label; modal eyebrow comes from project copy. Existing `site-sections.mjs` uses eyebrow on the card and `<details>` for project details, and its Work wrapper lacks the baseline load-more button. These consumers are **not** the design authority. New adapter preserves baseline button/native dialog and card/modal distinction.
4. Source `scope:[]` legitimately omits the case-scope subcomponent using baseline `no-scope`; that is distinct from hiding a whole enabled section to mask missing translation. Optional untranslated records can only be excluded under the approved release contract, with relationships/counters pruned consistently. Required copy missing blocks release; no sample/English fallback.
5. Japanese glyphs and long text require actual viewport checks using the approved fallback. Never compensate by shrinking fonts, ellipsis, fixed-height clipping, removing content or changing the grid. If valid content requires a design change, present the exact HTML delta before implementation.

## 3. Preserved structure, interactions and comparison rules

Keep Header → Hero → Clients → Work → Services → About/Reel → IP → Contact/Brief → Footer; all enabled configured sections and shared order are explicit inputs. Keep heading levels, max-width/grid, breakpoints, section rhythm, art crop/focal/aspect, Montserrat/Abril roles and control sizes from the pinned cascade. Source typography is not replaced by P2 sample styles.

Keep Project filter/count/show-more-collapse, card keyboard activation, native modal/scroll/close/backdrop/Escape/focus return, gallery and credential page; Service accordion; native video controls/pause; menu/focus; contact interest selection; brief validation/mailto/copy/fallback; reduced motion. Private saved preview remains script-free/inert by security contract, visibly distinguished from the public interactive QA. Script-free preview is not evidence that public interactions work.

Representative P3 must compare Project list/card + open detail at 1440×900 and 390×844, zoom 100%, same record/locale/data/state separately against the reference. Add 768/320 for container controls/long copy, inspect nested scrolling/focus; screenshots alone are insufficient for saving, Auth or CAS. P4/P7 extend section × locale × viewport × state evidence rather than infer whole-site parity from Hero/Project.

## 4. Evidence and limits

Observed public Hosting reference `http://127.0.0.1:5010/` serves the original full website. A fresh read-only browser tab showed all sections, native Project detail and service accordion. Desktop 1440×900 and mobile390×844 reference images: [desktop](../.local/test-outputs/multilingual-001/p3-design-v1/preparation-20261016/template-desktop.png), [mobile](../.local/test-outputs/multilingual-001/p3-design-v1/preparation-20261016/template-mobile.png), [Project desktop](../.local/test-outputs/multilingual-001/p3-design-v1/preparation-20261016/template-project-desktop.png), [Project mobile](../.local/test-outputs/multilingual-001/p3-design-v1/preparation-20261016/template-project-mobile.png).

This establishes the reference, not implemented multilingual parity. Runtime CMS saves, Project localization API, new renderer, language acceptance, full-site QA, P6 import and P7 activation are **NOT_RUN / NOT_IMPLEMENTED** in this preparation. No Auth tab was refreshed; no retained data or emulator process was changed. All 363 protected source files captured before preparation must remain byte-identical in final verification.
