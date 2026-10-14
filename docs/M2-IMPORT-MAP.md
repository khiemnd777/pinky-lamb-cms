# M2 — bản đồ import baseline

Được tạo offline từ10 input cố định, không thực thi content.js, không fetch nguồn ngoài. Bản đồ không phải editorial approval. M1 Hero/SEO current sẽ được OWNER import rõ ràng ở task03; factual baseline và non-Hero copy ở đây độc lập với Draft M1 mutable.

- baselineManifestHash: `65fb8d571118ee0cbf8a2e26295219d763691c1af08c82d03d5b3909a7b8535b` = SHA256 canonical JSON của exact input pinset.
- baselineContentHash: `9f226967f64059c4c6a0ae10d1768999a046d94aae839a9e488c0dfe9a248d33` = SHA256 canonical JSON của full mapped baseline content.
- importReportHash/reportHash: `7b32f334708f58336566be32376d42c7fa8f6923d03b4974f185cd2057fa7b84` = SHA256 canonical JSON structured report; không phải hash file Markdown này. Evidence pin Markdown bytes riêng.
- SourceCatalog gồm2 identities UNVERIFIED; excerpts là selected existing text ≤1000, không cắt full evidence rồi coi là đã kiểm nguồn. Credential48pages; Diag private pages7–8, publiccasepage7.
- Converter context.importLineage là conservative synthetic budget reservation only; task03 tạo immutable lineage thật từ transaction. Không lưu reservation vào content/provenance như một import receipt.
- Asset bytes của30 catalog records được so với dist và public-baseline trước output. Văn phòng prefix đã nằm trong officePhoneLabel; renderer không thêm lần nữa.

## Input pins

- dist/index.html: `4de13ed9a2b513458574b16fdaf9410422eb311ea23a0c4bce45b50a5d4630de`
- dist/content.js: `0140b31e91742d75387860a565c8082f3e34d5dc4b79c3b92b69cc0dd2484a63`
- dist/app.js: `3a0d2d5466f21f662c61870a851b10b7848c880ea90f75bcb3483d89d49fda32`
- dist/styles.css: `511db2c926152e819f267fe187b47a9fba32b8bdc39877969157504d04dfa65e`
- source-content.json: `ef34d3263d709dd18eb88ed19fbb65d49153a98f7797c2ed1ecdf5d16a46bbaa`
- pinky-lamb-cms/contracts/legacy-assets.json: `26ae46ffbd72bb6a4d3f001f9e7e5601f25eb29db93360a86ec91549f1016b5e`
- references/asset-manifest.json: `fd439907da1ea852be8ba578567f654a006d449d536f7ecbb90aa3114ff83c8e`
- references/credential-provenance/selected-object-provenance.json: `b5e1eb9690a7c91a8df1511d0bcfcc2c7be705d9d13c8a09511e4335469b5b3f`
- references/credential-provenance/path-map.json: `c2aac669b032894a4bbf39ccdd752c0886b2e6f0f1c317708c0a225f6f37efc6`
- dist/assets/Pinky-Lamb-Credential-2026.pdf: `6087d6465ad55ae8451e2f7f3df1512e1427b987c220d9358f8fc899abe2dcce`

## Explicit service links

| Project | Service IDs | Scope basis |
|---|---|---|
| wayfair | [] | [] — không tự suy diễn vai trò |
| sony | film-content | Concept & ý tưởng; Sản xuất video |
| diag | brand-creative, film-content, integrated-communications | Thiết kế nhân vật Lab Bot; Sản xuất video doanh nghiệp; PR advertorial; Social & group seeding; Booking và quản lý KOL/KOC trên TikTok; Chuỗi video trong giai đoạn COVID-19 |
| vifa | exhibition-activation | Lễ khai mạc; Dịch vụ đăng ký |
| petrosetco | [] | [] — không tự suy diễn vai trò |
| varna | brand-creative, integrated-communications | Concept & ý tưởng; Booking KOL; Photoshoot; Social media |
| samsung | film-content | Concept & ý tưởng; Sản xuất video |
| psd | [] | [] — không tự suy diễn vai trò |

VIFA chỉ exhibition-activation theo lễ khai mạc/dịch vụ đăng ký, không thêm events chỉ vì category. Ba scopes rỗng giữ [] và serviceIds[]. Galleries bỏ cover và giữ supplemental order; slug=id; initialVisibleCount4, featuredIds[]. Logo chỉ5ảnh đang hiển thị, không suy endorsement.

## Derived fields

- services[*].isVisible: Initial true for all six baseline services; runtime has no visibility property. (dist/content.js)
- projects[*].isVisible: Initial true for all eight baseline projects; runtime has no visibility property. (dist/content.js)
- settings.clientLogos[*].isVisible: Initial true for the five displayed logos. (dist/index.html)
- sections[*].isVisible: Initial true for all existing optional baseline sections; Footer remains required without visibility. (dist/index.html)
- settings.clientLogos[*].id: Displayed asset stable ID with client- prefix removed; image.assetId remains unchanged. (dist/index.html)
- projects[*].gallery: Remove cover once, unique supplementals in source order; existing dialog alt numbering. (dist/app.js)
- projects[*].slug: Equal stable project ID. (dist/content.js)
- settings.showreel.durationSeconds: 65.344 actual measured duration; baseline01:05/65giây are display rounding, not stored duration. (pinky-lamb-cms/contracts/legacy-assets.json)
- sections.work.initialVisibleCount: 4; featuredIds[] preserves baseline source order. (dist/app.js)
- settings.contact: Vietnamese name/address/display labels from HTML; email/E164/social identity from supplied JSON. Office label already includes Văn phòng prefix. (dist/index.html + source-content.json)
- settings.brand.tagline: Existing two visual lines stored single-line; fixed wrap remains template presentation. (dist/index.html .hero-art-label)

## Fixed functional/template strings

- section-overlines: SELECTED WORK / WHAT WE DO / A LITTLE ABOUT US / ORIGINAL IP STUDIO / LET'S TALK / A GLIMPSE INTO OUR WORLD — Existing fixed template overlines, not editable claim/layout records.
- hero-decoration: MEET PINKY / OUR CREATIVE SPIRIT / SCROLL TO FEEL THE PINKY — Fixed decorative captions/scroll label; SVG symbols and orbit remain template artwork.
- secondary-credential-actions: Làm quen với Pinky / Credential 2026 · Trang — Existing About and case action wording; page comes from validated publicCredentialPage.
- ip-decoration: HELLO, / IMAGINATION! — Existing sticker; brand-diagonal background and favicon are fixed catalog refs.
- work-controls: Xem thêm dự án / Những ý tưởng khác nhau. Cùng một tinh thần Pinky. / PINKY LAMB / SELECTED WORK / Cùng tạo dự án của bạn — Functional labels remain fixed; counts/service badges derive current validated records.
- form-dialog-menu: Tên của bạn / Email / Thương hiệu / Công ty / Bạn đang cần Pinky hỗ trợ điều gì? / Một chút về ý tưởng của bạn / Soạn email gửi Pinky / Sao chép brief / Nội dung brief / Mở menu / Đóng chi tiết dự án / Đóng video — Existing mailto/copy/dialog/menu controls and accessibility strings stay fixed; no new lead backend.
- wordmark-social: PINKY / LAMB / FACEBOOK ↗ / HOTLINE / GHÉ NHÀ PINKY — Fixed wordmark/UI labels; Footer heading instead maps footer-top slogan.
- manual-send-and-navigation: Mở ứng dụng email với brief đã điền. Thông tin được gửi đến Pinky khi bạn bấm gửi trong email. / Bạn có thể sao chép nội dung này và gửi đến pinkylamb.co@gmail.com. / Đến nội dung chính / Kết nối trên Facebook / Xem video gốc ↗ / Trình duyệt của bạn chưa hỗ trợ video. / Mở video showreel — Existing functional labels and manual-send promise remain fixed. The fallback recipient email derives settings.contact.email; original video URL is private validated context, never fetched.
- functional-attributes: Pinky Lamb — Trang chủ / Điều hướng chính / Mở menu / Điều hướng trên điện thoại / Khám phá thêm / Thương hiệu đã đồng hành / Lọc dự án theo lĩnh vực / Phát showreel Pinky Lamb 2025, thời lượng 1 phút 5 giây / Pinky có thể gọi bạn là... / hello@yourbrand.com / Thương hiệu của bạn / Mục tiêu, dự án, thời gian dự kiến... / Về đầu trang / Pinky Lamb / Đóng chi tiết dự án / Đóng video / Showreel Pinky Lamb 2025 — Reviewed baseline functional/accessibility copy; dynamic record labels and showreel title/duration must derive validated content, not keep stale literal attributes.
- brief-feedback: Đã chuẩn bị brief. Nếu ứng dụng email chưa mở, bạn có thể sao chép nội dung bên dưới. / Đã sao chép brief. Bạn có thể dán vào email gửi đến pinkylamb.co@gmail.com. / Nội dung brief đã được chọn. Hãy sao chép và gửi đến pinkylamb.co@gmail.com. — Existing local mailto/copy feedback. Recipient identity must derive validated contact email; no real lead storage.

## Preserved private/unmapped source metadata

- source-content.json: company.tagline, company.contactHeading, company.internationalStatement, company.collaborationStatement, company.ipStatement, contact.person, contact.address, contact.website, source.driveFileId, assetFiles — Source/provenance preserved privately; existing HTML public copy wins; no additional claims, links or displayed logos inferred.
- references/credential-provenance/selected-object-provenance.json: historical_raw_path, pdf_xref, pdf_bbox_points, image_index_on_page — Pinned local evidence only; historic absolute paths not browser summaries or content.
- dist/index.html: og:url, canonical, theme-color, fonts, form validation attributes, noscript/video fallback/toast — Functional/template constants or derived local URL; no new editable fields. Existing public production URL is not a local runtime endpoint.

## Field mapping

| Field | Source | Selector | Rule |
|---|---|---|---|
| schemaVersion | contracts/site.mjs | SITE_SCHEMA_VERSION | FIXED_CONTRACT |
| locale | contracts/site.mjs | siteContentSchema.locale | FIXED_CONTRACT |
| hero.kind | dist/index.html | .hero | HTML_COPY_WITH_TYPED_RUNS |
| hero.variant | dist/index.html | .hero | HTML_COPY_WITH_TYPED_RUNS |
| hero.heading.lines.0.0.text | dist/index.html | .hero | HTML_COPY_WITH_TYPED_RUNS |
| hero.heading.lines.1.0.text | dist/index.html | .hero | HTML_COPY_WITH_TYPED_RUNS |
| hero.heading.lines.1.1.text | dist/index.html | .hero | HTML_COPY_WITH_TYPED_RUNS |
| hero.heading.lines.1.1.emphasis | dist/index.html | .hero | HTML_COPY_WITH_TYPED_RUNS |
| hero.eyebrow | dist/index.html | .hero | HTML_COPY_WITH_TYPED_RUNS |
| hero.description.0.text | dist/index.html | .hero | HTML_COPY_WITH_TYPED_RUNS |
| hero.description.1.text | dist/index.html | .hero | HTML_COPY_WITH_TYPED_RUNS |
| hero.description.1.emphasis | dist/index.html | .hero | HTML_COPY_WITH_TYPED_RUNS |
| hero.description.2.text | dist/index.html | .hero | HTML_COPY_WITH_TYPED_RUNS |
| hero.primaryAction.kind | dist/index.html | .hero | HTML_COPY_WITH_TYPED_RUNS |
| hero.primaryAction.sectionId | dist/index.html | .hero | HTML_COPY_WITH_TYPED_RUNS |
| hero.primaryAction.label | dist/index.html | .hero | HTML_COPY_WITH_TYPED_RUNS |
| hero.secondaryAction.kind | dist/index.html | .hero | HTML_COPY_WITH_TYPED_RUNS |
| hero.secondaryAction.label | dist/index.html | .hero | HTML_COPY_WITH_TYPED_RUNS |
| hero.footnote | dist/index.html | .hero | HTML_COPY_WITH_TYPED_RUNS |
| hero.note | dist/index.html | .hero | HTML_COPY_WITH_TYPED_RUNS |
| hero.image.assetId | dist/index.html | .hero | HTML_COPY_WITH_TYPED_RUNS |
| hero.image.alt | dist/index.html | .hero | HTML_COPY_WITH_TYPED_RUNS |
| hero.image.isDecorative | dist/index.html | .hero | HTML_COPY_WITH_TYPED_RUNS |
| seo.title | dist/index.html | head meta/title | META_COPY_AND_HERO_IMAGE_ALT |
| seo.description | dist/index.html | head meta/title | META_COPY_AND_HERO_IMAGE_ALT |
| seo.ogTitle | dist/index.html | head meta/title | META_COPY_AND_HERO_IMAGE_ALT |
| seo.ogDescription | dist/index.html | head meta/title | META_COPY_AND_HERO_IMAGE_ALT |
| seo.ogImage.assetId | dist/index.html | head meta/title | META_COPY_AND_HERO_IMAGE_ALT |
| seo.ogImage.alt | dist/index.html | head meta/title | META_COPY_AND_HERO_IMAGE_ALT |
| seo.ogImage.isDecorative | dist/index.html | head meta/title | META_COPY_AND_HERO_IMAGE_ALT |
| settings.header.descriptor | dist/index.html | .brand-name small | COPY_EXACT |
| settings.header.ctaLabel | dist/index.html | header / contact / footer / .hero-art-label | HTML_COPY |
| settings.brand.name | source-content.json | company.name | COPY_EXACT |
| settings.brand.logo.assetId | dist/index.html | header / contact / footer / .hero-art-label | HTML_COPY |
| settings.brand.logo.alt | dist/index.html | header / contact / footer / .hero-art-label | HTML_COPY |
| settings.brand.logo.isDecorative | dist/index.html | header / contact / footer / .hero-art-label | HTML_COPY |
| settings.brand.tagline | dist/index.html | header / contact / footer / .hero-art-label | HTML_COPY |
| settings.credential.assetId | dist/index.html | header / contact / footer / .hero-art-label | HTML_COPY |
| settings.credential.label | dist/index.html | header / contact / footer / .hero-art-label | HTML_COPY |
| settings.credential.edition | dist/index.html | header / contact / footer / .hero-art-label | HTML_COPY |
| settings.showreel.assetId | dist/index.html | header / contact / footer / .hero-art-label | HTML_COPY |
| settings.showreel.poster.assetId | dist/index.html | header / contact / footer / .hero-art-label | HTML_COPY |
| settings.showreel.poster.alt | dist/index.html | header / contact / footer / .hero-art-label | HTML_COPY |
| settings.showreel.poster.isDecorative | dist/index.html | header / contact / footer / .hero-art-label | HTML_COPY |
| settings.showreel.title | dist/index.html | header / contact / footer / .hero-art-label | HTML_COPY |
| settings.showreel.originalSourceUrl | dist/index.html | .video-caption a[href] | PRIVATE_FIXED_URL_NO_FETCH |
| settings.showreel.durationSeconds | pinky-lamb-cms/contracts/legacy-assets.json | showreel-2025.durationSeconds | ACTUAL_CATALOG_DURATION |
| settings.contact.email | source-content.json | contact.email | IDENTITY_COPY_REMOVE_TEL_SCHEME |
| settings.contact.personName | dist/index.html | .contact-person strong | COPY_EXACT |
| settings.contact.personPhoneE164 | source-content.json | contact.phoneHref | IDENTITY_COPY_REMOVE_TEL_SCHEME |
| settings.contact.personPhoneLabel | dist/index.html | header / contact / footer / .hero-art-label | HTML_COPY |
| settings.contact.officePhoneE164 | source-content.json | contact.officeHref | IDENTITY_COPY_REMOVE_TEL_SCHEME |
| settings.contact.officePhoneLabel | dist/index.html | header / contact / footer / .hero-art-label | HTML_COPY |
| settings.contact.addressLines.0 | dist/index.html | .contact-address p | SPLIT_EXISTING_BR_RETAIN_PUNCTUATION |
| settings.contact.addressLines.1 | dist/index.html | .contact-address p | SPLIT_EXISTING_BR_RETAIN_PUNCTUATION |
| settings.contact.facebookUrl | source-content.json | contact.facebook | IDENTITY_COPY_REMOVE_TEL_SCHEME |
| settings.contact.illustration.assetId | dist/index.html | header / contact / footer / .hero-art-label | HTML_COPY |
| settings.contact.illustration.alt | dist/index.html | header / contact / footer / .hero-art-label | HTML_COPY |
| settings.contact.illustration.isDecorative | dist/index.html | header / contact / footer / .hero-art-label | HTML_COPY |
| settings.nav.0.sectionId | dist/index.html | header / contact / footer / .hero-art-label | HTML_COPY |
| settings.nav.0.label | dist/index.html | header / contact / footer / .hero-art-label | HTML_COPY |
| settings.nav.1.sectionId | dist/index.html | header / contact / footer / .hero-art-label | HTML_COPY |
| settings.nav.1.label | dist/index.html | header / contact / footer / .hero-art-label | HTML_COPY |
| settings.nav.2.sectionId | dist/index.html | header / contact / footer / .hero-art-label | HTML_COPY |
| settings.nav.2.label | dist/index.html | header / contact / footer / .hero-art-label | HTML_COPY |
| settings.nav.3.sectionId | dist/index.html | header / contact / footer / .hero-art-label | HTML_COPY |
| settings.nav.3.label | dist/index.html | header / contact / footer / .hero-art-label | HTML_COPY |
| settings.clientLogos.0.id | dist/index.html | .client-logos img[0] asset ID without client- prefix | STABLE_ID_FROM_DISPLAYED_ASSET |
| settings.clientLogos.0.clientName | dist/index.html | .client-logos img | FIVE_DISPLAYED_LOGOS_NOT_ENDORSEMENT |
| settings.clientLogos.0.image.assetId | dist/index.html | .client-logos img | FIVE_DISPLAYED_LOGOS_NOT_ENDORSEMENT |
| settings.clientLogos.0.image.alt | dist/index.html | .client-logos img | FIVE_DISPLAYED_LOGOS_NOT_ENDORSEMENT |
| settings.clientLogos.0.image.isDecorative | dist/index.html | .client-logos img | FIVE_DISPLAYED_LOGOS_NOT_ENDORSEMENT |
| settings.clientLogos.0.isVisible | dist/index.html | .client-logos img[0] | DERIVED_TRUE_DISPLAYED_LOGO |
| settings.clientLogos.1.id | dist/index.html | .client-logos img[1] asset ID without client- prefix | STABLE_ID_FROM_DISPLAYED_ASSET |
| settings.clientLogos.1.clientName | dist/index.html | .client-logos img | FIVE_DISPLAYED_LOGOS_NOT_ENDORSEMENT |
| settings.clientLogos.1.image.assetId | dist/index.html | .client-logos img | FIVE_DISPLAYED_LOGOS_NOT_ENDORSEMENT |
| settings.clientLogos.1.image.alt | dist/index.html | .client-logos img | FIVE_DISPLAYED_LOGOS_NOT_ENDORSEMENT |
| settings.clientLogos.1.image.isDecorative | dist/index.html | .client-logos img | FIVE_DISPLAYED_LOGOS_NOT_ENDORSEMENT |
| settings.clientLogos.1.isVisible | dist/index.html | .client-logos img[1] | DERIVED_TRUE_DISPLAYED_LOGO |
| settings.clientLogos.2.id | dist/index.html | .client-logos img[2] asset ID without client- prefix | STABLE_ID_FROM_DISPLAYED_ASSET |
| settings.clientLogos.2.clientName | dist/index.html | .client-logos img | FIVE_DISPLAYED_LOGOS_NOT_ENDORSEMENT |
| settings.clientLogos.2.image.assetId | dist/index.html | .client-logos img | FIVE_DISPLAYED_LOGOS_NOT_ENDORSEMENT |
| settings.clientLogos.2.image.alt | dist/index.html | .client-logos img | FIVE_DISPLAYED_LOGOS_NOT_ENDORSEMENT |
| settings.clientLogos.2.image.isDecorative | dist/index.html | .client-logos img | FIVE_DISPLAYED_LOGOS_NOT_ENDORSEMENT |
| settings.clientLogos.2.isVisible | dist/index.html | .client-logos img[2] | DERIVED_TRUE_DISPLAYED_LOGO |
| settings.clientLogos.3.id | dist/index.html | .client-logos img[3] asset ID without client- prefix | STABLE_ID_FROM_DISPLAYED_ASSET |
| settings.clientLogos.3.clientName | dist/index.html | .client-logos img | FIVE_DISPLAYED_LOGOS_NOT_ENDORSEMENT |
| settings.clientLogos.3.image.assetId | dist/index.html | .client-logos img | FIVE_DISPLAYED_LOGOS_NOT_ENDORSEMENT |
| settings.clientLogos.3.image.alt | dist/index.html | .client-logos img | FIVE_DISPLAYED_LOGOS_NOT_ENDORSEMENT |
| settings.clientLogos.3.image.isDecorative | dist/index.html | .client-logos img | FIVE_DISPLAYED_LOGOS_NOT_ENDORSEMENT |
| settings.clientLogos.3.isVisible | dist/index.html | .client-logos img[3] | DERIVED_TRUE_DISPLAYED_LOGO |
| settings.clientLogos.4.id | dist/index.html | .client-logos img[4] asset ID without client- prefix | STABLE_ID_FROM_DISPLAYED_ASSET |
| settings.clientLogos.4.clientName | dist/index.html | .client-logos img | FIVE_DISPLAYED_LOGOS_NOT_ENDORSEMENT |
| settings.clientLogos.4.image.assetId | dist/index.html | .client-logos img | FIVE_DISPLAYED_LOGOS_NOT_ENDORSEMENT |
| settings.clientLogos.4.image.alt | dist/index.html | .client-logos img | FIVE_DISPLAYED_LOGOS_NOT_ENDORSEMENT |
| settings.clientLogos.4.image.isDecorative | dist/index.html | .client-logos img | FIVE_DISPLAYED_LOGOS_NOT_ENDORSEMENT |
| settings.clientLogos.4.isVisible | dist/index.html | .client-logos img[4] | DERIVED_TRUE_DISPLAYED_LOGO |
| settings.copyright.startYear | dist/index.html | header / contact / footer / .hero-art-label | HTML_COPY |
| settings.copyright.label | dist/index.html | header / contact / footer / .hero-art-label | HTML_COPY |
| services.0.id | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.0.title | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.0.titleVi | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.0.summary | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.0.scope.0 | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.0.scope.1 | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.0.scope.2 | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.0.isVisible | dist/content.js | services[0] | DERIVED_TRUE_BASELINE_RECORD |
| services.1.id | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.1.title | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.1.titleVi | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.1.summary | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.1.scope.0 | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.1.scope.1 | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.1.scope.2 | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.1.isVisible | dist/content.js | services[1] | DERIVED_TRUE_BASELINE_RECORD |
| services.2.id | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.2.title | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.2.titleVi | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.2.summary | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.2.scope.0 | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.2.scope.1 | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.2.scope.2 | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.2.isVisible | dist/content.js | services[2] | DERIVED_TRUE_BASELINE_RECORD |
| services.3.id | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.3.title | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.3.titleVi | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.3.summary | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.3.scope.0 | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.3.scope.1 | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.3.scope.2 | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.3.isVisible | dist/content.js | services[3] | DERIVED_TRUE_BASELINE_RECORD |
| services.4.id | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.4.title | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.4.titleVi | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.4.summary | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.4.scope.0 | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.4.scope.1 | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.4.scope.2 | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.4.isVisible | dist/content.js | services[4] | DERIVED_TRUE_BASELINE_RECORD |
| services.5.id | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.5.title | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.5.titleVi | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.5.summary | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.5.scope.0 | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.5.scope.1 | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.5.scope.2 | dist/content.js | services[] | COPY_ALL_SIX_RECORDS_ORDER |
| services.5.isVisible | dist/content.js | services[5] | DERIVED_TRUE_BASELINE_RECORD |
| projects.0.id | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.0.slug | dist/content.js | projects[0].id | SLUG_EQUALS_STABLE_ID |
| projects.0.title | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.0.client | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.0.year | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.0.category | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.0.eyebrow | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.0.summary | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.0.cover.assetId | dist/app.js | case-main-image | CATALOG_ID_AND_TITLE_CLIENT_ALT |
| projects.0.cover.alt | dist/app.js | case-main-image | CATALOG_ID_AND_TITLE_CLIENT_ALT |
| projects.0.cover.isDecorative | dist/app.js | case-main-image | CATALOG_ID_AND_TITLE_CLIENT_ALT |
| projects.0.gallery.0.assetId | dist/app.js | case gallery normalization | EXCLUDE_COVER_DEDUP_PRESERVE_ORDER_AND_EXISTING_ALT_RULE |
| projects.0.gallery.0.alt | dist/app.js | case gallery normalization | EXCLUDE_COVER_DEDUP_PRESERVE_ORDER_AND_EXISTING_ALT_RULE |
| projects.0.gallery.0.isDecorative | dist/app.js | case gallery normalization | EXCLUDE_COVER_DEDUP_PRESERVE_ORDER_AND_EXISTING_ALT_RULE |
| projects.0.gallery.1.assetId | dist/app.js | case gallery normalization | EXCLUDE_COVER_DEDUP_PRESERVE_ORDER_AND_EXISTING_ALT_RULE |
| projects.0.gallery.1.alt | dist/app.js | case gallery normalization | EXCLUDE_COVER_DEDUP_PRESERVE_ORDER_AND_EXISTING_ALT_RULE |
| projects.0.gallery.1.isDecorative | dist/app.js | case gallery normalization | EXCLUDE_COVER_DEDUP_PRESERVE_ORDER_AND_EXISTING_ALT_RULE |
| projects.0.publicCredentialPage | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.0.isVisible | dist/content.js | projects[0] | DERIVED_TRUE_BASELINE_RECORD |
| projects.1.id | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.1.slug | dist/content.js | projects[1].id | SLUG_EQUALS_STABLE_ID |
| projects.1.title | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.1.client | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.1.year | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.1.category | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.1.eyebrow | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.1.summary | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.1.scope.0 | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.1.scope.1 | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.1.cover.assetId | dist/app.js | case-main-image | CATALOG_ID_AND_TITLE_CLIENT_ALT |
| projects.1.cover.alt | dist/app.js | case-main-image | CATALOG_ID_AND_TITLE_CLIENT_ALT |
| projects.1.cover.isDecorative | dist/app.js | case-main-image | CATALOG_ID_AND_TITLE_CLIENT_ALT |
| projects.1.serviceIds.0 | source-content.json | projects[id=sony].scope + explicit serviceLinks | EXPLICIT_SCOPE_MAPPING_NOT_CATEGORY |
| projects.1.publicCredentialPage | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.1.isVisible | dist/content.js | projects[1] | DERIVED_TRUE_BASELINE_RECORD |
| projects.2.id | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.2.slug | dist/content.js | projects[2].id | SLUG_EQUALS_STABLE_ID |
| projects.2.title | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.2.client | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.2.year | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.2.category | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.2.eyebrow | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.2.summary | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.2.scope.0 | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.2.scope.1 | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.2.scope.2 | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.2.scope.3 | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.2.scope.4 | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.2.scope.5 | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.2.cover.assetId | dist/app.js | case-main-image | CATALOG_ID_AND_TITLE_CLIENT_ALT |
| projects.2.cover.alt | dist/app.js | case-main-image | CATALOG_ID_AND_TITLE_CLIENT_ALT |
| projects.2.cover.isDecorative | dist/app.js | case-main-image | CATALOG_ID_AND_TITLE_CLIENT_ALT |
| projects.2.serviceIds.0 | source-content.json | projects[id=diag].scope + explicit serviceLinks | EXPLICIT_SCOPE_MAPPING_NOT_CATEGORY |
| projects.2.serviceIds.1 | source-content.json | projects[id=diag].scope + explicit serviceLinks | EXPLICIT_SCOPE_MAPPING_NOT_CATEGORY |
| projects.2.serviceIds.2 | source-content.json | projects[id=diag].scope + explicit serviceLinks | EXPLICIT_SCOPE_MAPPING_NOT_CATEGORY |
| projects.2.publicCredentialPage | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.2.isVisible | dist/content.js | projects[2] | DERIVED_TRUE_BASELINE_RECORD |
| projects.3.id | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.3.slug | dist/content.js | projects[3].id | SLUG_EQUALS_STABLE_ID |
| projects.3.title | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.3.client | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.3.year | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.3.category | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.3.eyebrow | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.3.summary | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.3.scope.0 | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.3.scope.1 | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.3.cover.assetId | dist/app.js | case-main-image | CATALOG_ID_AND_TITLE_CLIENT_ALT |
| projects.3.cover.alt | dist/app.js | case-main-image | CATALOG_ID_AND_TITLE_CLIENT_ALT |
| projects.3.cover.isDecorative | dist/app.js | case-main-image | CATALOG_ID_AND_TITLE_CLIENT_ALT |
| projects.3.gallery.0.assetId | dist/app.js | case gallery normalization | EXCLUDE_COVER_DEDUP_PRESERVE_ORDER_AND_EXISTING_ALT_RULE |
| projects.3.gallery.0.alt | dist/app.js | case gallery normalization | EXCLUDE_COVER_DEDUP_PRESERVE_ORDER_AND_EXISTING_ALT_RULE |
| projects.3.gallery.0.isDecorative | dist/app.js | case gallery normalization | EXCLUDE_COVER_DEDUP_PRESERVE_ORDER_AND_EXISTING_ALT_RULE |
| projects.3.serviceIds.0 | source-content.json | projects[id=vifa].scope + explicit serviceLinks | EXPLICIT_SCOPE_MAPPING_NOT_CATEGORY |
| projects.3.publicCredentialPage | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.3.isVisible | dist/content.js | projects[3] | DERIVED_TRUE_BASELINE_RECORD |
| projects.4.id | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.4.slug | dist/content.js | projects[4].id | SLUG_EQUALS_STABLE_ID |
| projects.4.title | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.4.client | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.4.year | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.4.category | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.4.eyebrow | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.4.summary | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.4.cover.assetId | dist/app.js | case-main-image | CATALOG_ID_AND_TITLE_CLIENT_ALT |
| projects.4.cover.alt | dist/app.js | case-main-image | CATALOG_ID_AND_TITLE_CLIENT_ALT |
| projects.4.cover.isDecorative | dist/app.js | case-main-image | CATALOG_ID_AND_TITLE_CLIENT_ALT |
| projects.4.gallery.0.assetId | dist/app.js | case gallery normalization | EXCLUDE_COVER_DEDUP_PRESERVE_ORDER_AND_EXISTING_ALT_RULE |
| projects.4.gallery.0.alt | dist/app.js | case gallery normalization | EXCLUDE_COVER_DEDUP_PRESERVE_ORDER_AND_EXISTING_ALT_RULE |
| projects.4.gallery.0.isDecorative | dist/app.js | case gallery normalization | EXCLUDE_COVER_DEDUP_PRESERVE_ORDER_AND_EXISTING_ALT_RULE |
| projects.4.gallery.1.assetId | dist/app.js | case gallery normalization | EXCLUDE_COVER_DEDUP_PRESERVE_ORDER_AND_EXISTING_ALT_RULE |
| projects.4.gallery.1.alt | dist/app.js | case gallery normalization | EXCLUDE_COVER_DEDUP_PRESERVE_ORDER_AND_EXISTING_ALT_RULE |
| projects.4.gallery.1.isDecorative | dist/app.js | case gallery normalization | EXCLUDE_COVER_DEDUP_PRESERVE_ORDER_AND_EXISTING_ALT_RULE |
| projects.4.publicCredentialPage | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.4.isVisible | dist/content.js | projects[4] | DERIVED_TRUE_BASELINE_RECORD |
| projects.5.id | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.5.slug | dist/content.js | projects[5].id | SLUG_EQUALS_STABLE_ID |
| projects.5.title | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.5.client | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.5.year | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.5.category | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.5.eyebrow | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.5.summary | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.5.scope.0 | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.5.scope.1 | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.5.scope.2 | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.5.scope.3 | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.5.cover.assetId | dist/app.js | case-main-image | CATALOG_ID_AND_TITLE_CLIENT_ALT |
| projects.5.cover.alt | dist/app.js | case-main-image | CATALOG_ID_AND_TITLE_CLIENT_ALT |
| projects.5.cover.isDecorative | dist/app.js | case-main-image | CATALOG_ID_AND_TITLE_CLIENT_ALT |
| projects.5.gallery.0.assetId | dist/app.js | case gallery normalization | EXCLUDE_COVER_DEDUP_PRESERVE_ORDER_AND_EXISTING_ALT_RULE |
| projects.5.gallery.0.alt | dist/app.js | case gallery normalization | EXCLUDE_COVER_DEDUP_PRESERVE_ORDER_AND_EXISTING_ALT_RULE |
| projects.5.gallery.0.isDecorative | dist/app.js | case gallery normalization | EXCLUDE_COVER_DEDUP_PRESERVE_ORDER_AND_EXISTING_ALT_RULE |
| projects.5.gallery.1.assetId | dist/app.js | case gallery normalization | EXCLUDE_COVER_DEDUP_PRESERVE_ORDER_AND_EXISTING_ALT_RULE |
| projects.5.gallery.1.alt | dist/app.js | case gallery normalization | EXCLUDE_COVER_DEDUP_PRESERVE_ORDER_AND_EXISTING_ALT_RULE |
| projects.5.gallery.1.isDecorative | dist/app.js | case gallery normalization | EXCLUDE_COVER_DEDUP_PRESERVE_ORDER_AND_EXISTING_ALT_RULE |
| projects.5.serviceIds.0 | source-content.json | projects[id=varna].scope + explicit serviceLinks | EXPLICIT_SCOPE_MAPPING_NOT_CATEGORY |
| projects.5.serviceIds.1 | source-content.json | projects[id=varna].scope + explicit serviceLinks | EXPLICIT_SCOPE_MAPPING_NOT_CATEGORY |
| projects.5.publicCredentialPage | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.5.isVisible | dist/content.js | projects[5] | DERIVED_TRUE_BASELINE_RECORD |
| projects.6.id | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.6.slug | dist/content.js | projects[6].id | SLUG_EQUALS_STABLE_ID |
| projects.6.title | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.6.client | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.6.year | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.6.category | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.6.eyebrow | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.6.summary | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.6.scope.0 | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.6.scope.1 | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.6.cover.assetId | dist/app.js | case-main-image | CATALOG_ID_AND_TITLE_CLIENT_ALT |
| projects.6.cover.alt | dist/app.js | case-main-image | CATALOG_ID_AND_TITLE_CLIENT_ALT |
| projects.6.cover.isDecorative | dist/app.js | case-main-image | CATALOG_ID_AND_TITLE_CLIENT_ALT |
| projects.6.serviceIds.0 | source-content.json | projects[id=samsung].scope + explicit serviceLinks | EXPLICIT_SCOPE_MAPPING_NOT_CATEGORY |
| projects.6.publicCredentialPage | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.6.isVisible | dist/content.js | projects[6] | DERIVED_TRUE_BASELINE_RECORD |
| projects.7.id | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.7.slug | dist/content.js | projects[7].id | SLUG_EQUALS_STABLE_ID |
| projects.7.title | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.7.client | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.7.year | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.7.category | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.7.eyebrow | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.7.summary | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.7.cover.assetId | dist/app.js | case-main-image | CATALOG_ID_AND_TITLE_CLIENT_ALT |
| projects.7.cover.alt | dist/app.js | case-main-image | CATALOG_ID_AND_TITLE_CLIENT_ALT |
| projects.7.cover.isDecorative | dist/app.js | case-main-image | CATALOG_ID_AND_TITLE_CLIENT_ALT |
| projects.7.gallery.0.assetId | dist/app.js | case gallery normalization | EXCLUDE_COVER_DEDUP_PRESERVE_ORDER_AND_EXISTING_ALT_RULE |
| projects.7.gallery.0.alt | dist/app.js | case gallery normalization | EXCLUDE_COVER_DEDUP_PRESERVE_ORDER_AND_EXISTING_ALT_RULE |
| projects.7.gallery.0.isDecorative | dist/app.js | case gallery normalization | EXCLUDE_COVER_DEDUP_PRESERVE_ORDER_AND_EXISTING_ALT_RULE |
| projects.7.gallery.1.assetId | dist/app.js | case gallery normalization | EXCLUDE_COVER_DEDUP_PRESERVE_ORDER_AND_EXISTING_ALT_RULE |
| projects.7.gallery.1.alt | dist/app.js | case gallery normalization | EXCLUDE_COVER_DEDUP_PRESERVE_ORDER_AND_EXISTING_ALT_RULE |
| projects.7.gallery.1.isDecorative | dist/app.js | case gallery normalization | EXCLUDE_COVER_DEDUP_PRESERVE_ORDER_AND_EXISTING_ALT_RULE |
| projects.7.publicCredentialPage | dist/content.js | projects[] | COPY_ALL_EIGHT_RECORDS_ORDER |
| projects.7.isVisible | dist/content.js | projects[7] | DERIVED_TRUE_BASELINE_RECORD |
| sections.0.kind | dist/index.html | #clients | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.0.sectionId | dist/index.html | #clients | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.0.isVisible | dist/index.html | #clients | DERIVED_TRUE_EXISTING_SECTION |
| sections.0.heading.0.text | dist/index.html | #clients .clients-inner p | FLAT_TWO_RUNS_STRONG_FIXED_VISUAL_BREAK |
| sections.0.heading.1.text | dist/index.html | #clients .clients-inner p | FLAT_TWO_RUNS_STRONG_FIXED_VISUAL_BREAK |
| sections.0.heading.1.emphasis | dist/index.html | #clients .clients-inner p | FLAT_TWO_RUNS_STRONG_FIXED_VISUAL_BREAK |
| sections.1.isVisible | dist/index.html | #work | DERIVED_TRUE_EXISTING_SECTION |
| sections.1.heading.lines.0.0.text | dist/index.html | #work | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.1.heading.lines.1.0.text | dist/index.html | #work | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.1.heading.lines.1.0.emphasis | dist/index.html | #work | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.1.kind | dist/index.html | #work | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.1.sectionId | dist/index.html | #work | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.1.variant | dist/index.html | #work | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.1.intro | dist/index.html | #work | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.1.initialVisibleCount | dist/index.html | #work | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.1.filterLabels.all | dist/index.html | #work | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.1.filterLabels.EVENTS | dist/index.html | #work | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.1.filterLabels.FILM | dist/index.html | #work | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.1.filterLabels.COMMUNICATIONS | dist/index.html | #work | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.2.isVisible | dist/index.html | #services | DERIVED_TRUE_EXISTING_SECTION |
| sections.2.heading.lines.0.0.text | dist/index.html | #services | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.2.heading.lines.1.0.text | dist/index.html | #services | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.2.heading.lines.2.0.text | dist/index.html | #services | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.2.heading.lines.2.1.text | dist/index.html | #services | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.2.heading.lines.2.1.emphasis | dist/index.html | #services | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.2.kind | dist/index.html | #services | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.2.sectionId | dist/index.html | #services | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.2.variant | dist/index.html | #services | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.2.intro | dist/index.html | #services | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.2.serviceOrder.0 | dist/index.html | #services | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.2.serviceOrder.1 | dist/index.html | #services | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.2.serviceOrder.2 | dist/index.html | #services | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.2.serviceOrder.3 | dist/index.html | #services | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.2.serviceOrder.4 | dist/index.html | #services | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.2.serviceOrder.5 | dist/index.html | #services | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.2.action.kind | dist/index.html | #services | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.2.action.sectionId | dist/index.html | #services | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.2.action.label | dist/index.html | #services | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.3.isVisible | dist/index.html | #about | DERIVED_TRUE_EXISTING_SECTION |
| sections.3.heading.lines.0.0.text | dist/index.html | #about | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.3.heading.lines.1.0.text | dist/index.html | #about | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.3.heading.lines.1.0.emphasis | dist/index.html | #about | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.3.kind | dist/index.html | #about | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.3.sectionId | dist/index.html | #about | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.3.variant | dist/index.html | #about | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.3.lead | dist/index.html | #about | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.3.paragraphs.0 | dist/index.html | #about | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.3.experienceFact.value | dist/index.html | #about | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.3.experienceFact.label | dist/index.html | #about | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.3.experienceFact.copy | dist/index.html | #about | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.3.experienceFact.location | dist/index.html | #about | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.3.signature.image.assetId | dist/index.html | #about .about-signature | SIGNATURE_ONLY_ARTWORK_COPY |
| sections.3.signature.image.alt | dist/index.html | #about .about-signature | SIGNATURE_ONLY_ARTWORK_COPY |
| sections.3.signature.image.isDecorative | dist/index.html | #about .about-signature | SIGNATURE_ONLY_ARTWORK_COPY |
| sections.3.signature.copy.0.text | dist/index.html | #about .about-signature | SIGNATURE_ONLY_ARTWORK_COPY |
| sections.3.signature.copy.1.text | dist/index.html | #about .about-signature | SIGNATURE_ONLY_ARTWORK_COPY |
| sections.3.signature.copy.2.text | dist/index.html | #about .about-signature | SIGNATURE_ONLY_ARTWORK_COPY |
| sections.3.signature.copy.2.emphasis | dist/index.html | #about .about-signature | SIGNATURE_ONLY_ARTWORK_COPY |
| sections.3.reelHeading.lines.0.0.text | dist/index.html | #about | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.3.reelHeading.lines.1.0.text | dist/index.html | #about | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.3.reelCaption | dist/index.html | .video-caption > span | COPY_EXACT |
| sections.4.isVisible | dist/index.html | #ip-studio | DERIVED_TRUE_EXISTING_SECTION |
| sections.4.heading.lines.0.0.text | dist/index.html | #ip-studio | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.4.heading.lines.1.0.text | dist/index.html | #ip-studio | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.4.heading.lines.1.0.emphasis | dist/index.html | #ip-studio | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.4.kind | dist/index.html | #ip-studio | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.4.sectionId | dist/index.html | #ip-studio | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.4.variant | dist/index.html | #ip-studio | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.4.description | dist/index.html | #ip-studio | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.4.image.assetId | dist/index.html | #ip-studio | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.4.image.alt | dist/index.html | #ip-studio | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.4.image.isDecorative | dist/index.html | #ip-studio | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.4.disciplines.0 | dist/index.html | #ip-studio | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.4.disciplines.1 | dist/index.html | #ip-studio | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.4.disciplines.2 | dist/index.html | #ip-studio | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.4.action.kind | dist/index.html | #ip-studio | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.4.action.sectionId | dist/index.html | #ip-studio | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.4.action.label | dist/index.html | #ip-studio | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.5.isVisible | dist/index.html | #contact | DERIVED_TRUE_EXISTING_SECTION |
| sections.5.heading.lines.0.0.text | dist/index.html | #contact | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.5.heading.lines.1.0.text | dist/index.html | #contact | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.5.heading.lines.1.1.text | dist/index.html | #contact | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.5.heading.lines.1.1.emphasis | dist/index.html | #contact | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.5.kind | dist/index.html | #contact | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.5.sectionId | dist/index.html | #contact | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.5.variant | dist/index.html | #contact | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.5.intro | dist/index.html | #contact | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.5.formMode | dist/index.html | #contact | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.5.serviceOptionIds.0 | dist/index.html | #contact | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.5.serviceOptionIds.1 | dist/index.html | #contact | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.5.serviceOptionIds.2 | dist/index.html | #contact | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.5.serviceOptionIds.3 | dist/index.html | #contact | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.5.serviceOptionIds.4 | dist/index.html | #contact | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.5.serviceOptionIds.5 | dist/index.html | #contact | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.6.kind | dist/index.html | .site-footer | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.6.sectionId | dist/index.html | .site-footer | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.6.variant | dist/index.html | .site-footer | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.6.heading.lines.0.0.text | dist/index.html | .site-footer | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.6.heading.lines.1.0.text | dist/index.html | .site-footer | EXISTING_LAYOUT_TYPED_FIELDS |
| sections.6.descriptor | dist/index.html | .footer-bottom > span:nth-child(2) | COPY_EXACT |
| sections.6.backToTopLabel | dist/index.html | .site-footer | EXISTING_LAYOUT_TYPED_FIELDS |
| sectionOrder.0 | dist/index.html | main > section IDs: work, services, about, ip-studio | EXISTING_HTML_BODY_ORDER |
| sectionOrder.1 | dist/index.html | main > section IDs: work, services, about, ip-studio | EXISTING_HTML_BODY_ORDER |
| sectionOrder.2 | dist/index.html | main > section IDs: work, services, about, ip-studio | EXISTING_HTML_BODY_ORDER |
| sectionOrder.3 | dist/index.html | main > section IDs: work, services, about, ip-studio | EXISTING_HTML_BODY_ORDER |
| claimSources.0.claimPath | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.0.sourceIds.0 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.0.sourceIds.1 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.1.claimPath | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.1.sourceIds.0 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.1.sourceIds.1 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.2.claimPath | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.2.sourceIds.0 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.2.sourceIds.1 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.3.claimPath | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.3.sourceIds.0 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.3.sourceIds.1 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.4.claimPath | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.4.sourceIds.0 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.4.sourceIds.1 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.5.claimPath | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.5.sourceIds.0 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.6.claimPath | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.6.sourceIds.0 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.6.sourceIds.1 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.7.claimPath | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.7.sourceIds.0 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.7.sourceIds.1 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.8.claimPath | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.8.sourceIds.0 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.8.sourceIds.1 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.9.claimPath | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.9.sourceIds.0 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.9.sourceIds.1 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.10.claimPath | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.10.sourceIds.0 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.10.sourceIds.1 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.11.claimPath | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.11.sourceIds.0 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.11.sourceIds.1 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.12.claimPath | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.12.sourceIds.0 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.12.sourceIds.1 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.13.claimPath | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.13.sourceIds.0 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.13.sourceIds.1 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.14.claimPath | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.14.sourceIds.0 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.14.sourceIds.1 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.15.claimPath | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.15.sourceIds.0 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.15.sourceIds.1 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.16.claimPath | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.16.sourceIds.0 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.16.sourceIds.1 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.17.claimPath | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.17.sourceIds.0 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.17.sourceIds.1 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.18.claimPath | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.18.sourceIds.0 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.18.sourceIds.1 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.19.claimPath | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.19.sourceIds.0 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.19.sourceIds.1 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.20.claimPath | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.20.sourceIds.0 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.20.sourceIds.1 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.21.claimPath | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.21.sourceIds.0 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.21.sourceIds.1 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.22.claimPath | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.22.sourceIds.0 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.22.sourceIds.1 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.23.claimPath | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.23.sourceIds.0 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.23.sourceIds.1 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.24.claimPath | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.24.sourceIds.0 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.24.sourceIds.1 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.25.claimPath | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.25.sourceIds.0 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.25.sourceIds.1 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.26.claimPath | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.26.sourceIds.0 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.26.sourceIds.1 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.27.claimPath | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.27.sourceIds.0 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.27.sourceIds.1 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.28.claimPath | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.28.sourceIds.0 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |
| claimSources.28.sourceIds.1 | source-content.json | source identities / project facts | ATTACH_EXISTING_SOURCE_IDS_UNVERIFIED |

Task02 chỉ local converter/contract/privacy checks. Không tạo Draft, source registry, audit hoặc review; không có cloud/production traffic.
