# CMS-UX-003 v6 — Rework CMS theo template đã duyệt

## TEST-REPAIR-001 v1 — Scoped repair verified local, 16/10/2026

**Git delivery approved — 16/10/2026:** người dùng yêu cầu “Commit, push phần sửa 6 test và cập nhật task.” Chỉ bàn giao hai file `tests/home-v3-recovery-ui.test.mjs` và task này trên nhánh `main`; quyền này thay giới hạn chưa commit/push của lượt sửa bên dưới. Tái sử dụng kết quả 171/171 PASS, lint/build/sensitivity và preservation vì source test/ứng dụng không đổi từ lần kiểm chứng; kiểm staged whitespace và phạm vi trước commit. Không deploy hoặc thay trạng thái nghiệm thu/LOCAL_COMPLETE.

Direct human approval: **“Approved CMS-UX-003 TEST-REPAIR-001 v1. Triển khai sửa 6 test FAIL theo kế hoạch, giữ nguyên CMS đã nghiệm thu. Chạy kiểm thử và báo kết quả; chưa commit/push.”**

Baseline `84792e29066be222e9be7216450be746281a4176`, clean worktree. Một agent tuần tự theo Recovery v2; chỉ sửa `tests/home-v3-recovery-ui.test.mjs` và task này. Bổ sung dependency/event bindings tường minh, bỏ fallback che import thiếu, giữ hành vi recovery và cập nhật nhãn đã được duyệt. Kiểm cả sáu ca, cleanup/async completion và sensitivity trong bản sao tạm. Không sửa application/backend/contracts/runtime controls, không ghi emulator hoặc dữ liệu giữ lại, không commit/push/deploy. Preview delta HOLD và LOCAL_COMPLETE=false.

Evidence: `.local/test-outputs/cms-ux-003/test-repair-001-v1/` (`baseline.json`, `red.log`, `green.log`, `regression.log`, `lint.log`, `build.log`, `sensitivity.json`, `preservation.json`, `summary.json`). Historical FAIL của Git delivery giữ nguyên; kết quả mới bên dưới thay trạng thái còn mở của sáu test đó.

**Cause/fix:** harness thiếu factory resolver nhưng fallback `bindings[name] ?? noop` che dependency thiếu; còn thiếu event environment và kỳ vọng nhãn Home v3 cũ. Đã khai báo resolver/get/clear/destroy tường minh, dùng `siteDirtyGroups` thật, bổ sung CustomEvent/EventTarget và báo thiếu binding ngay tại module link. Boundary ngoài recovery fail rõ nếu bị gọi; không giả thành công. Đổi đúng nhãn Toàn website đã nghiệm thu; không giảm assertion. Chờ idle theo requests/control state có timeout 1s và diagnostics, cleanup try/finally; giữ quyền, safe-error, revision, receipt/readback và idempotency checks.

**Verification:** pinned Node22.23.3 `--experimental-vm-modules --test tests/home-v3-recovery-ui.test.mjs`: RED 0/6 PASS trước sửa → GREEN **6/6 PASS**. `--experimental-vm-modules --test tests/cms-ux*.test.mjs tests/home-v3-recovery-*.test.mjs`: **171/171 PASS**, không skip, không unhandled rejection hoặc async activity sau test. `node node_modules/eslint/bin/eslint.js tests/home-v3-recovery-ui.test.mjs` PASS; `node scripts/local-guard.mjs build` PASS; whitespace PASS.

**Sensitivity:** ba bản sao tạm: bỏ OWNER guard → test non-OWNER FAIL vì request ngoài ý muốn; đảo import lineage/receipt identity check → test import thành công FAIL; bỏ resolver binding → FAIL lúc link với tên dependency. Cả **3/3 mutations được phát hiện**, không sửa source ứng dụng. Bộ chọn mutation đầu tiên quá rộng (hai matches) đã bị assertion chặn trước khi ghi bản sao; sau đó dùng đúng guard trong importCurrent.

**Preservation/limits:** baseline hash đối chiếu mọi tracked file: chỉ test và task này đổi, toàn bộ source CMS/backend/contracts/config giữ nguyên. Unit/VM controller với DOM/components/preview giả lập; không phải browser/HTTP E2E, không chứng minh runtime import thực. Không gọi SDK/emulator, không ghi dữ liệu giữ lại, không restart, không commit/push. Nghiệm thu CMS UX giữ nguyên; Preview delta HOLD, LOCAL_COMPLETE=false. Đây là scoped repair đã kiểm chứng, không tự nghiệm thu một milestone mới.

## Git delivery — 16/10/2026

Direct human instruction sau nghiệm thu: **“Commit, push”**. Cho phép bàn giao các thay đổi tích hợp hiện có trên nhánh `main` của repository CMS, bao gồm source UI, Lucide/PinkySelect, recovery home-v3 đã được duyệt trước đó, tests và task/review docs. Quyền Git này thay giới hạn không commit/push trong các snapshot lịch sử bên dưới; không cấp quyền triển khai S04 mới, Preview controls, deploy hoặc đổi dữ liệu/runtime.

Pre-commit checks trên source hiện hành: admin ESLint PASS; guarded admin build PASS; whitespace PASS. Bộ CMS UX riêng **157/157 PASS**. Unit/VM CMS UX + home-v3 recovery: **165 PASS / 6 FAIL / 171 tests**. Cả 6 FAIL ở `tests/home-v3-recovery-ui.test.mjs`, cùng lỗi `Cannot read properties of undefined (reading 'clear')` tại `load` khi chạy editor bằng synthetic component bindings; recovery UI harness chưa cung cấp đầy đủ dependency của editor hiện hành. Đây là giới hạn test còn mở, không phải full-suite PASS; không sửa source/test trong lượt Git delivery. Không chạy lại mutation HTTP E2E hoặc emulator fixtures.

Chỉ source/tests/docs/dependency lock được bàn giao; `.local/`, dữ liệu emulator, ảnh/log/receipts local và build outputs tiếp tục bị Git ignore. Nghiệm thu CMS UX đã ghi ở dưới giữ nguyên; Preview navigation/control delta HOLD và LOCAL_COMPLETE=false.

## Nghiệm thu phần CMS UX — 16/10/2026

**Human accepted — 16/10/2026.** Người dùng xác nhận trực tiếp: “Nhìn tốt rồi, nghiệm thu.” Phạm vi nghiệm thu là phần CMS UX vừa sửa và review theo hồ sơ này, gồm đủ 8 nhóm và các routine repairs follow-up. Preview navigation/control delta vẫn HOLD, chờ quyết định riêng; LOCAL_COMPLETE=false và trạng thái M3/M4 giữ nguyên. Các giới hạn kiểm thử bên dưới vẫn có hiệu lực.

## Follow-up 16/10/2026 — routine repairs verified local

Current result: form compaction, service note và featured fixture PASS; hai focus regressions (pointer click jump, summary dưới mobile bar) đã tái hiện/đỏ→xanh và sửa.157unit/admin lint/build/whitespace PASS; S01–S12 12/12, S13 11/11,8group/tabs/dialog EDITOR1440/390 + REVIEWER locks PASS. Mọi completed fixture receipt có exact cleanup/retained/source stability PASS. [Current review](../docs/CMS-UX-003-REVIEW.md), [photos/boundaries](../docs/CMS-UX-003-PHOTO-REVIEW.md). Preview navigation/control delta HOLD riêng; Human acceptance ACCEPTED cho phần CMS UX vừa review theo xác nhận ở trên; LOCAL_COMPLETE=false. Không đóng milestone toàn CMS.

### Yêu cầu và thứ tự thực hiện đã duyệt

Human yêu cầu tiếp tục phần thiếu, không bàn giao khi còn lỗi: F06 density, chú thích Dịch vụ, F18 featured và fixture/screenshots. Giữ Recovery v2 solo canonical/High exception; không agent, không đổi controls preview. Baseline delta: `.local/test-outputs/cms-ux-003/v7/followup/baseline.json`.

1. Truy nguyên featured ở scratch → Apply → toàn bộ chuỗi CAS Save → readback; phân biệt lỗi UI với harness đọc sau PATCH đầu tiên. Tái dùng fixture/runner hiện có, giữ assertions full-content và cleanup.
2. Form: bỏ khung/label/spacing lặp, giữ typed AST/PinkySelect/S01–S13 và mọi thao tác; kiểm geometry desktop/mobile và thao tác trong fixture.
3. Thêm chú thích Dịch vụ đúng template. Rerun checks bị ảnh hưởng, chụp source mới, cập nhật kết quả thực tế. Preview navigation/control delta giữ HOLD riêng.

## Current Recovery v2 — solo High resume

15/10/2026: control chat01a13fe7-6dc5-7532-8803-959e5826b9b8 relays direct human **“Approved CMS-UX-003 Recovery v2.”** Recovery v2 supersedes the previous parallel/publisher/QA operating plan after HUMAN STOP. Current agent works sequentially on the existing canonical checkout, High for implementation/tests by explicit human exception, without subagents or new source copies. Agent inventory confirms all old writers completed before recovery writes; none resumed. Preserve integrated dirty work and all data/permission/history/protected/backend/infra/Git/deploy boundaries. No reset/seed/reimport/emulator restart/commit/push/deploy.

Priority hiện hành: hoàn thiện UI và đối chiếu trực tiếp template theo steering mới nhất; không mở thêm runner/adapter/framework/gallery/photo pack/large report. Giữ FAIL fixture đã quan sát, không dùng kiểm unit để xóa proof thiếu. Solo sequential trên canonical checkout; không resume agent cũ. Sau lần đăng nhập được human xác nhận, giữ nguyên trang và chỉ chụp/navigate/open/Cancel; không reload hoặc ghi dữ liệu giữ lại. F24 section navigation riêng với saved-preview modal; material renderer/CSP/sandbox/contract/control changes tiếp tục HOLD. Human acceptance PENDING, LOCAL_COMPLETE=false; M3/M4 unchanged.

Recovery snapshot: source có các sửa UI và152unit PASS/admin lint PASS/build PASS/protected179 PASS. Ảnh8group×1440/390 và template references đã lưu. **F06 density, chú thích Dịch vụ và featured đã được sửa/kiểm ở follow-up16/10; F24 section navigation vẫn HOLD riêng**; runtime boundary chưa chạy vẫn NOT_RUN. Xem [review hiện hành](../docs/CMS-UX-003-REVIEW.md), [ảnh/boundaries](../docs/CMS-UX-003-PHOTO-REVIEW.md). Không đóng task hoặc tự nghiệm thu.


## Current execution amendment v7 — human approved F01–F28 / R0–R10

Observed15/10/2026 in current conversation: human approved the immediately preceding full component audit and R0–R10 repair plan with **“Duyệt, triển khai.”** This supersedes the planning-only stop for that plan. v6 receipts below remain historical, not a new acceptance claim. Status **APPROVED / IN_PROGRESS**, Human acceptance PENDING, LOCAL_COMPLETEfalse. Coordinator owns this amendment and integration; no Git delivery/deploy authority.

Baseline before worker edits: `.local/test-outputs/cms-ux-003/v7/baseline.json`, independent source copies base/representative/fixture/integration. Preserve all current dirty source and protected179, retained14collection scope, media/provenance/permissions/history. Same approved mockup hash a7dc480fa8bd7a0faa6d75f022f3578fc4d4b617290131791d0d60fb10f36256. No retained reset/seed/reimport, emulator restart, guard/backend/infra edits, commit/push/deploy. Every write test uses owned fixture namespace, synthetic Auth/member and exact cleanup. Do not call adapter browser writes HTTP handler E2E.

Approved findings: F01 sidebar mascot/subtitle; F02 template Lucide mapping/active rail; F03 per-group dirty markers; F04 mobile action duplication; F05 scoped design tokens; F06 compact typed editors/sort toolbars/PinkySelect; F07 horizontal media fields; F08 source disclosure; F09 menu row hierarchy; F10 Hero illustration; F11 search/social cards; F12 visual focal control; F13 logo grid/handle; F14 client dialog consistency; F15 collection filters/empty/reorder feedback; F16 service row identity; F17 project dialog hierarchy; F18 new project/service sources/visibility/featured; F19 readonly project Credential/closing context; F20 About experience/duration/Credential usage; F21 rich context runs; F22 contact input semantics; F23 footer context; F24 preview section navigation/container; F25 fixed structure rows; F26 responsive boundaries; F27 actual media picker UI; F28 component-specific acceptance matrix.

Execution: R0 baseline/matrix; R1 shell and R2 shared controls; R3 representative Projects completed and rendered/behavior checked before dependent rollout; R4 settings/clients; R5 services; R6 About/IP; R7 Contact/Footer; R8 media picker (preserve real service/eligibility/binary controls; explicit select/confirm UI approved by plan, no API changes); R9 preview bounded design proof first, stop affected work if control/contract changes required; R10 matched component QA and before/after screenshots. Use at most3child agents, actual Medium implementation/testing and High review. Own source copies from same baseline, single writer per lane/file, three-way incremental integration by integration owner after code-review-and-quality/git-workflow. No recursive delegation.

Completion criteria: every finding has granular expected element/state/viewport and PASS/FAIL/NOT_RUN proof. Representative includes logo/sidebar + Project list/content/all dialog tabs/create/cancel/apply/save/reload and rights/metadata/source preservation. Retain Lucide official registry, full PinkySelect, S01–S13 and11S13callers; compact layout never deletes controls/model fields. Actual typed data/readonly strings/source binding differences retained. Tests/build/source only prove their layers; native HTTP E2E/session/touch/history limits remain explicit. No Human accepted/LOCAL_COMPLETE without human review.

Status: **APPROVED / SOURCE_INTEGRATED / VERIFIED_LOCAL_SCOPED / OPEN_TEMPLATE_GAPS**. Human acceptance **PENDING**. Local only. This record owns v6 and supersedes chat proposals v1–v5. It does not close M3/M4, LOCAL_COMPLETE or historical holds. Known template failures now include missing sidebar mascot/subtitle and absent preview selected-section navigation. Earlier52-row/gallery snapshot did not inventory sidebar branding and is not an exhaustive current acceptance result; see correction below.

## Direct human approval

Current chat, observed 15/10/2026, human Khiêm:

> Approved CMS-UX-003 v6. Triển khai local toàn bộ kế hoạch v6, bao gồm cách ly workspace source, chạy song song và tích hợp từng slice.

The same message explicitly requires all eight groups, accepted mockup, Lucide, PinkySelect, S01–S13, data/history/permission preservation, isolated write fixtures, at most three children, three-way incremental integration, meaningful rendered checks, routine repairs without per-file approval, and no retained reset/seed/reimport, emulator restart, guard/backend/infra changes, commit/push or deployment. Material approach/control/contract changes require a revised human decision.

Source: `../../mockups/toan-website-v1.html`; SHA256 `a7dc480fa8bd7a0faa6d75f022f3578fc4d4b617290131791d0d60fb10f36256`. Existing PinkySelect baseline SHA256 `676c99ae0e25ecc9bfd69fa3ab4f621b622deaa0e95c4f7ec4baccb14b45b336`.

Evidence: `.local/test-outputs/cms-ux-003/v6/`. Source baseline captured **before worker writes**, including current dirty/untracked sources; do not substitute HEAD. Baseline HEAD is provenance only. Source copies are isolated; no Git mutation is authorized. Prior CMS-UX-002 source/build/service checks remain historical limited evidence. Human rejected its template application; that result is not acceptance of this rework.

## Product and navigation contract

- One working copy and saved draft `home-v3`; eight direct sidebar entries: **Đầu trang, Hero và SEO; Khách hàng; Dự án; Dịch vụ; Giới thiệu; IP Studio; Liên hệ; Chân trang**.
- Remove clickable parent Toàn website from normal navigation. Move the actual eight-group navigation into the sidebar DOM, not fixed-position content disguised as navigation.
- Resources: **Thư viện media**. Management: **Cấu trúc website**, **Gửi và duyệt**.
- Remove independent Hero và SEO from normal editing. Preserve independent `home` data and existing permitted workflows through **Gửi và duyệt → Lịch sử và nội dung cũ**. Keep v2/v3 histories and version-specific handling separate. No implicit merge, fallback, import or migration.
- One top action cluster: **Xem trước / Lưu website / Gửi duyệt** with truthful state. Mobile actions share the same controller.
- Remove repeated wrapper headings/cards; retain useful warning and source states. Technical metadata is secondary.
- Group/tab navigation preserves working data and appropriate UI state. Resource exit handles dirty and staged-dialog state. No autosave or reorder-triggered save.
- Dialog edits use scratch; Apply changes working copy; Cancel discards scratch; global Save uses existing API. Validation reveals the right group/tab/dialog/field.
- Preserve pending, unknown result, retry intent, CAS/idempotency, partial-save and session rules.

## Eight groups and template structure

| ID | Group | Required content/layout |
| --- | --- | --- |
| G01 | Đầu trang, Hero và SEO | Tabs Đầu trang / Hero / SEO & chia sẻ. Brand/logo/descriptor/CTA/tagline/menu. Hero eyebrow/heading lines and runs/description/image/primary and optional secondary actions/footnote/note. SEO title/description/share text/image. Template form and contextual illustration. |
| G02 | Khách hàng | Compact heading/section visibility, logo grid with name/visibility/edit/handle directly on card, add/edit dialog; stable ID, image metadata and sources remain. |
| G03 | Dự án | Tabs Danh sách / Nội dung mục. Thumbnail/name/client/year/category/visible/featured/actions table; search, category/status filters, all/featured modes. Section heading/intro/initial count/filter labels remain editable. |
| G04 | Dịch vụ | Tabs Danh sách / Nội dung mục. Name/titleVi/related projects/visibility/actions table; search/filter/add/edit. Section visibility/heading/intro/action retained. |
| G05 | Giới thiệu | Exactly four tabs Nội dung / Kinh nghiệm & chữ ký / Showreel / Hồ sơ năng lực. All heading/lead/paragraphs/experience/location/signature image and copy/reel heading and caption/video/poster/PDF/source fields retained. |
| G06 | IP Studio | Template two-column content/artwork/action layout, no arbitrary three-tab replacement. Visibility/heading/description/disciplines/image/action and sources retained. |
| G07 | Liên hệ | Tabs Nội dung hiển thị / Thông tin liên hệ / Form brief. Heading/intro/illustration/email/person/phone values and labels/address/Facebook/service options retained. MAILTO_COPY only. |
| G08 | Chân trang | Compact fields/contextual illustration. Heading/descriptor/back-to-top/optional copyright start year/label/brand link/fact and creative sources retained. |

Project dialog tabs: **Thông tin / Hình ảnh / Liên kết & hiển thị / Nguồn**. Service dialog tabs: **Thông tin / Phạm vi công việc / Hiển thị & nguồn**. Record name/context in title; remove repeated generic Chi tiết; grouped columns; sticky reachable Cancel/Apply footer; dirty-close guard, keyboard/Escape/focus return. Row controls/drag must not accidentally open detail. Required actual IDs/slugs/relationships/sources/caps remain reachable even where prototype simplified them. No invented service media field or fake pagination/count.

## Component contract

- Official installed Lucide through one icon registry. No handmade SVG paths, glyph/emoji/CSS icon substitutes. Accessible labels and text where needed.
- Existing PinkySelect button-combobox/listbox API; **not native select backing**. Cover every selection dropdown in forms, tables, dialogs, dynamic fields, sort positions and affected media/preview/review.
- Preserve unknown values, no auto-first selection, silent programmatic updates, real user change only, VI typeahead, keyboard, disabled/error, popup containment in dialog, focus and destroy/cleanup. Visible native selects in scope fail acceptance.
- Preserve actual typed heading/run model, emphasis, caps, hidden references, stable IDs and source/media validators.
- Source-only separation of helpers/scoped CSS is allowed when it resolves actual ownership/coupling; no unrelated architecture rewrite or dependency upgrade.

## Sortable inventory — required individually

| ID | Model | Direct interaction surface |
| --- | --- | --- |
| S01 | sectionOrder: work/services/about/ip-studio only | Cấu trúc website |
| S02 | settings.nav | Menu rows |
| S03 | settings.clientLogos | Logo cards |
| S04 | projects array order | Project table rows |
| S05 | work section featuredIds | Featured-project mode |
| S06 | projects[].gallery | Image cards in project dialog |
| S07 | projects[].scope | Project scope rows |
| S08 | services section serviceOrder | Service table rows |
| S09 | services[].scope | Service scope rows |
| S10 | about.paragraphs | Paragraph blocks |
| S11 | ip-studio.disciplines | Discipline rows |
| S12 | settings.contact.addressLines | Address rows |
| S13 | Supported heading lines and inline runs | Direct line/run blocks |

S13 covers Hero heading/description; clients/work/services/about/showreel/ip/contact/footer headings and signature copy. Do not add persisted ordering to source/permission/history sets or fixed body sections.

Each uses Lucide GripVertical >=44px target, pointer/touch threshold/capture, drop indicator, bounded-container auto-scroll, Escape/pointer cancellation, no accidental row-open, keyboard Alt+Arrows, up/down and **PinkySelect position**, focus/live position feedback. Preserve full object/ID/metadata, transient UI identities for repeated strings, no schema additions. Undo only order and preserve later edits/new items. Sorting is explicit in full-list mode when filtered; featured order independent. Locks cover readonly/pending/unknown intent/session invalidation. No duplicate secondary sort list below editable rows. No implicit API save.

## Media, preview, workflow and approved prototype differences

Keep real authenticated picker, rendition/eligibility, metadata, rights/provenance, integrity/binary queue/sandbox/cleanup controls. Main preview uses saved revision or snapshot, never unsaved content disguised as saved. Context illustration is labeled separately. Preserve snapshot/review/source-check/QA/version-specific history and recovery readonly handling. No publication scope.

Differences: mockup memory Save/review uses real controllers; Showreel duration remains catalog-derived readonly; source text uses real bindings; sample files use real validated assets; required simplified fields remain; reset/demo controls removed. No lead backend, real email sending or prototype claims become product behavior.

## Roles and preservation

Existing four roles retained: EDITOR/OWNER draft edit/save/submit; REVIEWER/OWNER source-check/review under existing state/actor rules; PUBLISHER existing reads only, no invented publish capability. Backend remains authority. Preserve self-review refusal, active member/authzVersion/session invalidation, CAS/retry/idempotency/partial save.

Protected: contracts, cms-api, scripts/guards, infra-local, renderer/public baseline, root dist/firebase, existing approval/history receipts. Preserve IDs/slug/hidden refs/media/sources/history; no retained content/history mutation. Protected-source hashes plus scoped before/after data evidence. Scope limits remain explicit; scoped hashes are not full DB inventory.

## Source isolation, ownership and integration

- root owns this record, shared indices, mapping/contracts, evidence consolidation and task scheduling. It does not write application implementation at High.
- Initial source-copy lanes: shell, collections, fixture. Later P1 settings+clients; P2 services; P3 about+IP then contact+footer. At most three active children, no recursive delegation.
- Source workspaces share frozen baseline B and only dependency symlink; no data/runtime/credentials/Git copied. Canonical runtime stays in the actual project. No new emulator/server per clone or guard changes.
- Requested native route: kit-implementer Medium for implementation/tests/integration; High for review. Provider execution metadata remains Unknown unless independently observed.
- Worker handoff: base/hash, patch/changed files, requirement coverage, contract impact, actual checks/limits. Do not edit another lane or canonical source without integration ownership.
- Integrator uses git-workflow and code-review-and-quality; three-way compare B/worker/current integration, never wholesale overwrite or blind ours/theirs. Integrate completed slices early; no wait for all workers. Re-review conflict resolution and affected consumers. One free slot rotates into integration/review while other independent work proceeds.
- Routine repair continues within approval; material design/data/contract/control/operating changes stop affected work for a revised plan. No per-hunk approval loop.

## Ordered tasks and dependencies

- [x] T00 capture source baseline and isolated source copies before worker edits; direct approval recorded.
- [x] T01 template-to-target mapping: exact element/location/workflow/control/state + evidence owner, fields, prototype removals/differences. See `v6/evidence/template-target-map.md` and companion JSON (8 groups/24 element rows/S01–S13/11 S13 callers).
- [x] T02 isolated fixture harness: actual services/Auth/SDK namespace, owned cleanup, retained-before/after; test-only UI adapter; no canonical mutation forwarding. Isolation/provider unit tests and actual service17-check run PASS; completed browser attempts preserve declared retained scope and clean exact owned resources. Product behavior criteria remain separate.
- [x] T03A shell/sidebar/actions/navigation/mobile/Cấu trúc website, after T01.
- [x] T03B shared dialog/table/fields/PinkySelect/sortable/scoped styling, after T01.
- [x] T04 representative full Dự án slice after T02/T03: actual controller/data path, matched desktop/mobile, interaction/state evidence.
- [x] T05 G01 and T06 G02 sequential in P1, only after relevant T04 criteria pass.
- [x] T07 G04 in P2 after T04.
- [x] T08 G05, T09 G06, T10 G07, T11 G08 sequential in P3 after T04.
- [ ] T12 media/preview/review/history/legacy integration: existing flows integrated and scoped checks PASS; selected-section preview capability remains an explicit template gap. Full legacy history content/binary snapshot limits remain NOT_RUN.
- [x] T13 three-way integration/review at every meaningful slice.
- [x] T14 final criterion evidence, preservation, known limits/manual review/handoff prepared; this does not close T12 or human acceptance.

Representative confirmation is internal verification within this approval, not another human approval. Do not expand dependent screens while representative criteria FAIL/NOT_RUN; unaffected fixture/mapping work may continue.

## Verification and acceptance

Use ../../docs/agent-kit/template-application-acceptance.md. Each row: criterion/template element + target location, screen, role, state, exact viewport WxH, expected result, evidence, PASS/FAIL/NOT_RUN, owner. Source/build, runtime/UI and human acceptance are distinct.

Representative: project table + content tab + add/edit dialog, all four project dialog tabs, saved preview, real read/fixture write wiring, populated/empty/loading/error/denied/busy/dirty. Desktop1440 and mobile390 first; final1440/768/390/320 matched source/template dimensions. Inspect nested clipping/occlusion, not page overflow alone; keyboard/focus/dropdowns/drawer/dialog, row action order, dirty continuity and preview identity required.

Required per G01–G08: structure/tabs, controls/interactions, appropriate state/role, responsive/focus/reachability, field/ID/source preservation and group-specific sorts. Separate evidence per group; representative PASS does not transfer.

PS checks: dynamic controls, options/value stability/events, keyboard/VI typeahead, dialog containment, lock/errors/cleanup; no visible native select.

S01–S13 checks: drag→keyboard/up-down→position→Undo, full objects, duplicate strings, add/remove/later edits, empty/one item, bounds, aborted drag, filtered and featured modes, dialog scratch/cancel, permission/pending/session locks, fixture roundtrip where relevant.

Source checks: pinned Node syntax, focused behavior unit tests, scoped ESLint and guarded isolated build, protected hashes. Reuse evidence only while relevant inputs remain valid. No generic legacy mutation suites that write canonical drafts then restore.

Write proof: actual services/authorize/SDK in unique namespace and exact owned synthetic Auth/member resources. UI test adapter belongs only to tests, denies unhandled mutation, routes permitted changes to isolated real services. Report **UI through fixture adapter + service/emulator**, not native HTTP-handler/browser Save E2E. Native HTTP write E2E remains NOT_RUN unless separately proven in the approved isolation boundary. Do not weaken backend/guard to create that proof.

Cleanup only exact owned namespace/UID resources; compare permitted retained content/envelope/source/history evidence before/after. Evidence is scoped, not full DB inventory. Do not restart emulators. Frontend canonical dev start is allowed if absent; preserve existing controls.

On harness/API/UI/library failure: pause affected flow, capture evidence, focused repair plan before edits; bounded diagnosis and explicit missing proof/owner/next step. Continue unaffected work. Routine repairs within valid scope do not require another approval.

## Current observations and progress

- Source baseline: 222 source files and 179 declared protected files frozen; existing dirty/untracked work retained. Source copies created; no Git writes.
- Existing emulator listeners observed9099/8080/9199. Frontend5173 absent at preflight. No lifecycle mutation performed yet.
- Retained data baseline, representative, runtime/UI, new harness, child invocation and all product acceptance checks: **NOT_RUN** at initial record.
- Source changes integrated: **none** at initial record.

### T02 and initial source review progress

- Frontend initial start failed sandbox listen EPERM; exact unchanged pinned-Node/local-guard dev command succeeded through managed scoped escalation. Vite ready127.0.0.1:5173, session89683. Existing emulators not restarted. Receipt `frontend-start.json`.
- Guarded read-only retained baseline PASS:14collections/4441documents, including all three drafts and declared legacy/v3 history collections. Stored IDs/hashes only, no content payload in evidence. `fixture/retained-before.json`.
- Actual service/Auth/SDK fixture attempt1 PASS17checks: four roles, CAS/replay/payload mismatch, order/object roundtrips, self-review refusal and independent review. Cleanup47namespace docs/4members/4Auth, remaining0. `fixture/service-attempt1.json`. S13 service coverage is Hero representative only; this is not HTTP/browser E2E or all UI coverage.
- Independent source review found required repairs: missing contextual reload/import/retry under hidden action wrapper, missing direct S02/S03 row bindings, nested drop target ownership and duplicate-scope removal identity. Integrator owns focused repairs and meaningful regression tests before representative UI; no broad rollout yet.
- Browser file protocol was denied by browser policy; no alternate file/CDP workaround used. Existing approved HTTP template52110 was selected successfully in the same IAB for a safer allowed-protocol comparison. Browser harness reference updated to HTTP only. Edge automation initially unavailable due an extension UI; own isolated browser fixture avoids reading retained browser credentials.
- Representative rendered fidelity and browser fixture checks remain NOT_RUN until canonical initial integration.

### Initial integration and representative progress

- Three-way integration published the shell, shared fields/dialog/table/sortable helpers and Dự án slice. Focused source checks after the representative repair:62/62 tests PASS, affected lint PASS, isolated guarded build PASS (2064 modules/27 outputs). Protected179 source hashes unchanged. Receipts under `workspaces/integration/evidence/`; these checks do not establish template fidelity.
- Actual browser fixture attempt3 verified PinkySelect filtering/keyboard, populated/empty list, inline controls, scratch Cancel/Apply, direct pointer/keyboard/position/Undo sorting, pending Save, namespace readback/reload, saved preview identity, REVIEWER readonly and injected read-failure recovery. No page errors observed. Cleanup16 owned namespace documents/4 synthetic members/4 Auth users PASS; retained comparison PASS. Proof is UI adapter + actual Auth/services/emulator, not HTTP mutation E2E.
- The thumbnail test initially expected iframe although the validated renderer creates img. Attempt3 diagnostics show eight loaded images. The correction in attempt4 still reports a bounded-image assertion failure; the fixture owner is diagnosing the exact assertion before further edits. Thumbnail acceptance remains FAIL, not inferred from load success alone. Attempt4 cleanup12 namespace documents/4 members/4 Auth users PASS, retained comparison PASS.
- Preview size selector converted to actual PinkySelect in a separate source workspace and integrated by the sole integrator:2 new tests +6 manifest tests PASS; lint/syntax PASS; protected179 hashes unchanged. Responsive preview toolbar remains to inspect.
- Approved HTTP reference52110 is cached in the user's IAB, but the server is unavailable. The browser denied file protocol; no workaround/new reference server is used. Cached mobile reference observed494x853. Exact1440/390 cached HTTP reference was subsequently observed through native browser screenshots; network reference fetch remains NOT_RUN. T04 is not confirmed and dependent group implementation has not expanded.
- T01 source mapping identified remaining implementation gaps:About five tabs vs approved four, IP three tabs vs approved two-column layout, Contact tab label, and missing source-edit callers. These are required rework, not accepted differences.
- Coordinator records the prototype/schema boundary D09:the prototype About CTA editor has no matching protected About schema field. Preserve actual schema and rendering; do not create a persisted CTA, fake-save control or backend change. This follows the approved preservation constraint. About's required four tabs and all actual fields remain in scope.
- Representative visual inspection found concrete template mismatches in tabs, additive gaps, media-field layout, mobile image/title alignment, dialog width and missing list context/counts. A focused source repair is assigned to the integrator; broad group implementation remains held until representative confirmation.
- That focused repair and token alignment are now integrated. The template's embedded400 font and existing CMS400 font have identical bytes. Strict thumbnail/dialog-cover bounds passed at1874/494/1440/390 in attempt7; exact current-CSS pair captures remain to refresh. The latest CSS build is NOT_RUN; an integrator receipt's premature guarded-build wording is explicitly excluded from PASS evidence.
- Cached HTTP reference control is now available after closing the agent's unused temporary CMS tab. Coordinator observed the reference list/content and all four project dialog tabs at1440x900 and390x844 using CUA; no reload/file workaround or new reference server. These are native inline screenshots/DOM observations, not local reference files or a successful new HTTP fetch. Viewport override reset after capture.
- Coverage audit found missing postconditions in prior tests. R01 behavior1 now proves exact pointer/key/position/Undo order and cancellation steps, but stopped before Save because its filter selector included hidden heading sort controls. A focused corrected R01-filter passed with nonzero disabled table controls, unchanged IDs, no mutation and unchanged saved content. Full R01 roundtrip is still open. R02 stopped on an unseeded fixture precondition (retained baseline has no featured IDs); no application defect inferred. All runs preserved retained scope and cleaned owned resources.
- Compact gallery patch is prepared in a fresh232-file source workspace. Metadata stays in a disclosure and validation reveals it. Only the integrator may publish it after the active fixture run ends; no dependent group expansion yet.
- Gallery patch subsequently integrated by the sole writer;36 affected tests, syntax/lint and protected179 PASS. Current source frozen for expanded representative checks. Root's new template/schema audit is `v6/evidence/template-schema-differences.md` (128 rows/70 literal bindings plus dynamic fields).
- Coordinator resolves schema-preservation presentations from that audit:Work CTA uses the actual shared Credential label/PDF and must refer to its canonical editor; Work closing and About CTA labels are renderer constants and may only be shown as readonly references/context illustrations; PDF/video filenames are actual selected-asset metadata with the real picker, never independent editable filenames. Shared Footer Facebook remains Contact's value. Use readonly reference displays and canonical-editor navigation where surfaced, without new persisted fields, renderer edits or duplicate state. These are derived UI interpretations of the approved preservation constraint, not new human-approved business capabilities.
- Expanded representative runs now PASS R01 complete-project order/object roundtrip, R02 independent featured sequence, R03 gallery Cancel/Apply/add/remove/full metadata roundtrip and strict image bounds1440/390, R04 duplicate scope/remove/Undo/string roundtrip, R06 tab/group/dirty/resource-exit continuity and Escape/focus return, R07 pending and actual REVIEWER mutating-control locks. Each completed run reports retained preservation, exact owned cleanup and source stability PASS. See `v6/evidence/representative-checklist.md` for individual receipts/proof limits.
- R05 pointer onto nested input and R08 focus/close remain FAIL with fixture owner diagnosing precise assertions. Independent visual inspection identified a real shared S13 layout defect:toolbar insertion shifts run text fields into a narrow right column. Integrator owns a scoped layout repair before dependent rollout; no data/event/model change is authorized by that repair.

## Handoff requirements

Complete callers/routes/source, exact local URL/prerequisites/manual steps, per-criterion evidence, matched screenshots, PS/S01–S13 results, rights/workflow and preservation/cleanup reports, FAIL/NOT_RUN/Unknown + owner/next action. Code integrated != Behavior/UI verified != Human accepted. No fake parity percentage or acceptance from build/worker completion. Human acceptance remains pending until the human confirms.

### Representative focused repair update

- Cached approved HTTP reference has been inspected at1440x900 and390x844 without reload. Comparison attempt8 captures canonical project list/content/all four dialog tabs at1440/390 and1874/494:14 product checks PASS, reference-network row NOT_RUN; retained preservation and exact cleanup PASS. Native cached-reference inspection is separate evidence.
- R05 now proves real held-pointer edge autoscroll and drop on a nested input, with exact outer-line permutation. It exposed a real remount defect: nested run sorter retains its original validation path after the outer line moves. Scoped current-record path repair and regression are owned by integrator.
- R08 now proves full27-control keyboard coverage within the dialog. Its later timeout is a test locator error after the dialog has closed; fixture author preserves the same dialog node to verify closed state and opener focus. No assertion relaxed. Both cases remain open until complete runs PASS.

- R08 latest run passes12 desktop/mobile keyboard, close/focus, popup containment and dynamic-control groups. Final Save-validation case found a real UI defect: existing contract error sanitization drops project/gallery paths. Focused frontend-only repair uses the already exported unchanged V3 content schema to retain bounded local validation paths before save planning, then reveals the owning dialog/tab/metadata. Contracts/backend/guard and actual save authority stay unchanged. Root classified this as required routine UI repair inside v6; no permission/data/contract change. Runtime criterion remains open.

### T04 Coordinator confirmation — dependent rollout open

- R01–R08 representative cases now PASS: R01 final-r01; R02 final-r02; R03 r03-lazy; R04 final-r04; R05 r05-undo; R06 final-r06; R07 final-r07; R08 r08-validation. Each completed receipt reports exact cleanup, retained preservation and source stability PASS. R08 includes14 desktop/mobile checks, invalid title/gallery alt reveal to correct dialog/tab/disclosure/control and no invalid PATCH.
- Current paired visual review uses comparison attempt9 (1440x900/390x844, additional1874x991/494x853) and cached approved HTTP reference observed natively. Template table/dialog hierarchy, underline tabs, toolbar grouping, horizontal cover, compact gallery and responsive stacking preserved; actual-only image metadata/IDs/sources remain per approved differences. Source/control strict geometry and hit/focus checks PASS. Reference-network fetch remains NOT_RUN; no file-protocol workaround/new reference server.
- Coordinator confirms the representative slice for dependent rollout only. This is not Human acceptance or overall completion. New groups retain independent UI/sort/role evidence requirements. Native HTTP mutation E2E remains NOT_RUN.
- Fresh common rollout baseline contains236 source/config/test files, copied identically to workspaces/rollout-base, p1-settings, p2-services, p3-content. No Git/runtime/data/credentials copied; dependency symlink only. stage-base.json per lane was captured before worker edits.

### Parallel rollout and early integration progress

- Three Medium source-copy lanes completed G01/G02, G04, G05/G06 and G07/G08 immutable candidates against236-file common baseline. Child own turn_context observations report gpt-6.1-sol/medium for P1/P2/P3. Root rotated P1 at G01 handoff to free the third child slot for early integration; no more than3 active children.
- G01 published first with26 focused tests PASS and protected179 unchanged. S02 actual menu order/Undo/later edit/full-content Save-reload PASS; S13 Hero heading H01 and description H02 likewise PASS, retained preservation/source stability/exact cleanup PASS.
- G01 desktop3tabs/controls PASS. Initial390 scan encountered fixed-footer occlusion after Playwright scrollIntoViewIfNeeded; harness lacked vertical/occluder diagnostics and tested hit before focus. Focused real Tab/wheel reveal retains strict final hit/focus assertions; actual accessibility defect remains unconfirmed pending numeric evidence.
- Independent High rollout source review found P3 context thumbnail remount per keystroke and missing inner paired fields versus approved template. Integrator owns keyed media lifecycle, exact pairedDOM/scoped responsive layout and focused regressions before publish. Root exact-template audit also requires all8page contexts, underline form tabs and G01 flat surface/horizontal media controls. These are UI fidelity/lifecycle repairs within v6; no data/contract/control change.
- P2/P3 and G02 integration candidates remain source-only pending canonical publish and independent runtime UI/sort proof. Final build and complete group QA still NOT_RUN.

- G01 real-reveal run overall pointer/final-focus scan PASS, but separate numeric keyboard audit is FAIL: at390x844 real Tab focuses logo-alt at y795–843 while fixed action bar starts y745; focus stays obscured until mouse wheel. Do not interpret helper overall PASS as keyboard-obscuration PASS. Integrator owns bounded focusin visibility repair for home-v3 edit controls, excluding dialogs/sidebar/workflow; strict keyboard-after-Tab criterion will be rerun without wheel credit.

### Integrated eight-group source and final verification in progress

- All eight groups are integrated from independent common-baseline source copies through incremental three-way comparison. G02 uses independent selected-logo/source scratch, G04 actual service relationships, G05 four approved tabs, G06 combined form/context, G07 three approved tabs and MAILTO_COPY, G08 actual shared-brand/Facebook links. Source/helper ownership and published hashes are in `workspaces/integration/evidence/`.
- Independent source review required keyed media-host lifecycle, real paired fields and Contact field order, heading focus, bounded control focus visibility and template density corrections. These repairs are published. Subsequent independent reviews report PASS_SOURCE only, with runtime proof explicitly separate.
- Final responsive correction aligns drawer/sidebar JS and CSS at720/721, restores tablet actions hidden by legacy1023 rules, and measures wrapped-header height for sticky/focus offsets with cleanup. Frozen21paths manifest SHA256 `8b67fa92d066b37ec69b90a5a53ee96246b0eebd3da07afb1b41ca66153ce523`. No backend/contract/guard/runtime-control changes.
- Latest source checks:19 frontend suites117/117 PASS; scoped15-file lint/syntax PASS; whitespace/protected179 PASS; fresh guarded isolated build27outputs PASS; frozen source unchanged before/after build. Exact commands/results: `workspaces/integration/evidence/responsive-final-verification-result.json` and referenced receipts. Independent High review reports no new source findings in the responsive delta; it did not rerun tests or claim UI acceptance.
- Post-responsive UI: `fixture/full-groups/responsive-visual`16/16 cases PASS at768x1024 and320x844 across all eight groups. `responsive-groups`7/8 PASS at1440x900/390x844; G06 still FAIL pending bounded diagnosis of a zero-size control reference after dynamic visibility. No PASS is inferred for that row. Every completed run reports exact owned cleanup, retained comparison and source stability PASS.
- `fixture/client-sources/client-sources-1` PASS for G02 source Cancel/discard, Apply-only working-copy change, actual Save/reload and complete unrelated metadata/binding preservation. `fixture/resources/resources-1`10/10 PASS for picker Cancel, real library reads/filtering, four saved-preview sizes/revision, shared Footer links and legacy entry routing at1440/390. Actual legacy history content is not proven by the fixture allowlist.
- H04/H05 full-content caller roundtrips PASS. H06 completed three content assertions but process crashed at adapter response handling before final cleanup; original receipt remains incomplete, not whole-run PASS. Exact owned recovery `fixture/recovery/recover-final-h06-1.json` subsequently removed16 namespace documents/4 members/4 synthetic Auth users with retained comparison PASS. Fixture owner is repairing one-response transport lifecycle with red/green regression and pending-dispatch cleanup; no production adapter or API behavior changes.
- Coverage audit explicitly found missing real-pointer/up/down browser proof for S01/S02/S03/S05/S06/S07/S08/S09/S10/S11/S12 and remaining S13 callers. Existing key/position/Undo/full-content receipts are valid only for those assertions. Expanded per-model/caller pointer checks are being authored; do not mark the sortable matrix wholly PASS from generic controller tests.
- Coordinator inspected cached approved HTTP reference at768/320 and720/721 through native CUA, without reload or file-protocol workaround; reference sidebar exists at721 and drawer at720. Source/template comparison preserves the actual typed heading/run model and all required media/source fields. Native inline reference observations are not local reference image files or a new successful HTTP fetch. Temporary viewport override reset.

### Final exact-parity and sortable verification

- Final exact template audit added two concrete assertions missing from the earlier broad checks:sidebar248px desktop/220px tablet with matching main offset, and G01 logo/media metadata before paired descriptor/CTA and tagline. Existing fields/nodes/events/models and legacy non-siteUx order are preserved. Four-file source-copy correction published, focused30tests PASS; current19frontend suites118/118 PASS, lint/CSS parse/whitespace/protected179 PASS, fresh guarded exact-sidebar-header-build27outputs PASS. App freeze21 SHA256 `7ebe48bbc647dab40a52aff5791e682cc538a1231487bebe02db996c7d7c8fbe`. Independent High source review PASS_SOURCE; exact-width and actual DOM-order regressions added. No further application changes pending.
- G06 stable ElementHandle inventory succeeds at1440/390 with actual REVIEWER locks, unchanged relevant app hashes. Old live nth-index enumeration could rebind as thumbnail DOM changes; the exact hidden zero-size button identity was not retained and remains Unknown. This is a harness identity repair, not evidence of an app layout repair. `fixture/full-groups/final-g06-identity` PASS. G01 rerun after final source `exact-header-g01` PASS.
- Browser pointer-v1 failures retained. Pointer delivery crossed the autoscroll boundary during a multi-step final movement; the v3 runner reacquires geometry and asserts actual owned drop indicator, pointer capture and dragging state before release, then requires the original exact permutation. No forced DOM order or changed expected order. Test adapter v3 records only same-origin classified `preview-read` GET/exact path/native ERR_ABORTED as EXPECTED_READ_ABORT; unknown/mutation/foreign-origin failures remain FAIL. Actual pending requests are drained around harness navigation. Single-fulfill and denied-origin red regressions preserved; canonical expanded+old transport10/10 PASS. No production transport or runtime control changed. Independent High reviewed this fail-closed boundary.
- `fixture/full-groups/pointer-sorts-3` **12/12 PASS**, individually S01–S12. Each has real pointer, Up/Down exact permutation, AltDown, PinkySelect position, Undo preserving later edits, and whole-content namespace Save/readback. `pointer-headings-3` **11/11 PASS** across all S13 callers, outer sort where applicable plus inner runs, text/emphasis/full content preservation. Each run has cleanup, retained preservation and source stability PASS. These receipts supersede earlier pointer/H06 incomplete runs for current criteria; old receipts remain unchanged.
- Per-model/browser edge cross-products are not inferred. S04/R01 separately proves Escape/synthetic pointercancel/outside-drop/filter locks; S06/R03 proves gallery scratch Cancel/add/remove/metadata; S07/R04 proves duplicate remove/add/edit/Undo; R07 proves project pending/REVIEWER. Shared unit/controller evidence covers additional state rules at its own layer. Physical touch/native HTTP mutation E2E remain NOT_RUN. Final matched8group captures and bounded unknown-intent/session checks are in progress; [review guide](../docs/CMS-UX-003-REVIEW.md) carries current links and limits.

### Final handoff — scoped evidence complete, preview delta held

- Current final source:19frontend suites **118/118 PASS**; scoped lint/syntax/CSS parse/whitespace, protected179 and appfreeze21 PASS; current guarded build27outputs PASS. Independent High source reviews found no remaining finding in the integrated group/responsive/fixture adapter deltas. Exact commands and hashes are under `workspaces/integration/evidence/latest-final19-result.json`, `exact-sidebar-header-verification.json`, `adapter-v3-published.json` and `rollout-freeze.json`.
- Final rendered/control evidence on this freeze: `fixture/full-groups/handoff-groups` **8/8 PASS** at1440x900/390x844, EDITOR/REVIEWER; `handoff-visual` **16/16 PASS** at768x1024/320x844; `fixture/responsive-boundary/handoff-boundary` **3/3 PASS**720/721/1023. Coordinator inspected all8desktop captures and matched cached-template observations; typed-model/media/source and actual-controller differences stay explicit. This does not establish pixel identity or every state/role combination.
- Final sortable evidence remains `pointer-sorts-3`12/12 and `pointer-headings-3`11/11 PASS. `fixture/last-edge/last-edge-1` **3/3 PASS**: actual namespace commit then fixture-injected503 response loss; UI unknown-intent locks and same-key/body Retry produce exactly one revision effect; service duplicate remove/add/later-edit/Undo/full-content roundtrip and scratch empty/one Cancel; actual REVIEWER service table/scope mutations locked. Browser session revocation remains NOT_RUN; existing source/VM session tests are a different layer.
- Final read-only retained inventory `fixture/retained-handoff-after.json` equals `retained-before.json`:14collections/4441documents, IDs/content hashes unchanged. All final runs report exact namespace/member/Auth cleanup, remaining0, and source stability PASS. H06 orphan recovery is separately recorded. This is not a full database or Storage binary inventory.
- **Open template gap / FAIL:** mockup has Xem mục này, preview section picker and auto-jump. Current CMS preview has no target/jump API: global action opens the truthful whole saved document in a sandboxed srcdoc frame; private renderer forbids scripts and omits href. T01/D08 did not explicitly dispose this capability. Do not silently call it an approved difference or whole-template PASS. Independent High source audit confirms absence. The affected slice is HOLD under the user's material contract/runtime-control instruction; [Preview navigation delta v1](../docs/CMS-UX-003-PREVIEW-NAVIGATION-DELTA.md) proposes separate design/proof without weakening sandbox/CSP, or explicit acceptance of this difference. No preview controls/renderer/backend were changed to bypass this boundary.
- Consolidated evidence: `v6/evidence/final-summary.json`, `acceptance-matrix.json` (**51 scoped PASS rows +1 explicit FAIL capability row**), `final-source-preservation.json`. [Review guide](../docs/CMS-UX-003-REVIEW.md) contains local URL, exact manual steps, all8screens and limits. Source/callers remain integrated; no commit/push/deploy, retained reset/seed/reimport or emulator restart. Human acceptance PENDING, M3/M4/historical holds and LOCAL_COMPLETEfalse unchanged. Wait for the human's review and preview-delta decision.

### Human Logo finding — sidebar branding FAIL

User reports template Logo omitted. Read-only comparison confirms mockup `updateChrome()` (`../../mockups/toan-website-v1.html:127`) creates mascot image + PINKY LAMB + CONTENT STUDIO. Actual `admin/index.html:19` retains text-only brand, confirmed by acceptance photo37 (`images/0037-0001-G01.png`). Actual G01 website brand picker/thumbnail remains present at `admin/site-settings-editor.mjs:146`; that separate field does not satisfy the sidebar requirement. No approved omission found. Owner: root. Mapping and shell checks covered navigation/actions/breakpoints but failed to include the sidebar brand asset/subtitle as an exact template criterion. Earlier claim of one remaining template gap is withdrawn: at least two known failures now. Historical52-row matrix, gallery and ZIP remain immutable and must be read with this correction. No application/data/runtime change in this audit. Required repair: restore the template's sidebar brand block using the existing authorized artwork, preserve separate website logo data, check desktop and mobile drawer and add an explicit brand criterion before claiming parity.

### Human-requested photo review pack — 15/10/2026

Direct request: “Tôi có việc bận, hãy giúp tôi nghiệm thu bằng cách chụp hình từng phần ứng với các boundary checklist. Tôi sẽ về review sau.” This authorizes capture/evidence preparation for later human review, not automatic acceptance or the held preview-navigation delta.

Scope: photo-only local review pack mapping the canonical ten boundary categories and52task criteria. Capture all eight groups/all tabs/full scroll coverage and client/project/service dialogs at1440/390; sort sequences S01–S13, dropdowns, permission/dirty/pending/error/recovery and resource/preview states. Reuse current-source evidence only where valid; label reused images and missing proof explicitly. Actual interaction sequences remain separate from a screenshot of one state. Source freeze21 and protected179 remain unchanged; all write interactions use owned fixtures with exact cleanup and retained comparison. No retained writes, app/contract/control changes, emulator lifecycle, Git or publication.

Output prepared for human review: [photo guide](../docs/CMS-UX-003-PHOTO-REVIEW.md), [interactive gallery](../.local/test-outputs/cms-ux-003/v6/acceptance-photos/index.html), [portable ZIP](../.local/test-outputs/cms-ux-003/v6/acceptance-photos/CMS-UX-003-v6-review-photos.zip).519photos =446successful-case fresh captures +73reused current-source images; all8groups/tabs and client/project/service dialog tabs1440/390, S01–S12 and11S13callers, dropdowns and bounded edge/resource states. Each of9capture runs reports exact cleanup remaining0/retained comparison/source stability PASS. Mixed initial groups receipt keeps G07wheel failure;16failed-case images excluded, separate strict-gutter G07rerun PASS. Original receipts remain unchanged.

Gallery maps52criteria/10boundary categories; behavior51scoped PASS +1explicit FAIL is separate from photo coverage. AC52 has only related current-state images, not proof of absent preview navigation. Offline gallery verifier v2 PASS1440/390 for all4filters, zoom/Next/Previous/Escape, AC52related image while preserving FAIL, no horizontal overflow/JS errors. Portable paths519/hashes519/ZIP522entries audit PASS. ZIP SHA256 `10a2d1d9b49c4054448b3b655279340461752f0a420de14dc0b5edfc556c32ac`. Root inspected desktop/mobile gallery renders and rechecked appfreeze21 unchanged. No source/control delta. Existing native HTTP/session/touch/history limits remain. **Human review PENDING; LOCAL_COMPLETEfalse.** Coordinator owns this record; Medium fixture lane authored scripts/artifacts only.
