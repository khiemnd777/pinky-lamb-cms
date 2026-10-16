# UI-APPLY-001 v2 — CMS LOCAL UI correction

## Authority and scope

Status: **Integrated / Ready for human review — v2 source and inspected UI complete; explicit data/test limits remain.** Direct current approval: **Approve `UI-APPLY-001 v2`**, human message in this chat following the concrete replacement proposal. Historical v1 remains HUMAN_UI_REJECTED / FAIL_TEMPLATE_PARITY. Its old syntax/build/source-review results retain source/static meaning only. Full repository lint has nine pre-existing protected backend/contracts findings; this task is not closed or runtime-Verified. Original v1 approval was **Duyệt `UI-APPLY-001 v1`**. Template v4 remains the accepted design source with SHA256 `4965bcf130d7ac800c390a026c48786ffdbbc159cb8e1264d94072abe128a0e8`.

## Current v2 correction contract and ownership

Scope from approved proposal: rebuild product composition against v4, bind real controllers, apply shared UI to all four real groups, and compare authenticated CMS screenshots/interaction at desktop/mobile before handoff. No backend/contracts/permissions/CSP/guard/data/service lifecycle change. Current frontend server is retained; normal frontend HMR is expected. No seed/fixture, save/review/upload/archive mutation, emulator restart, new dependency, global config/Git/deploy action. Read-only authenticated UI inspection and capture are authorized for this design correction; credentials remain user-owned and are not read/logged.

Baseline: [v2 before source SHA](../.local/test-outputs/ui-apply-001/v2/source-before.json). Evidence only under the v2 evidence directory. v1 receipts/screenshots/rejection stay unchanged.

Shared contracts:
- Real editor and workflow elements declare `data-cms-pane="edit"` / `"review"`; shell switches visibility without destroying/remounting data/controllers. Resource canLeave/destroy/mount remains unchanged. Nested editor wrappers must not hide a workflow ancestor.
- Shell owns work tabs Biên tập/Gửi và duyệt, compact actual-role/status/action topbar and mobile actual-save action bar. Default edit. Library has no fake draft/workflow actions. Gửi duyệt header shortcut opens the review pane and focuses the real message; it never submits a request.
- Keep real control IDs/enums/value/disabled facade/role/fieldset locks. Header/mobile proxies invoke native controller buttons without moving controls out of locked fieldsets. Actual disabled/busy/dirty states govern all actions.
- Content modules own editor groups/accordions. Hero groups: Hero/Nút hành động/Ảnh/SEO. Switch groups without requests, dirty changes or value loss. Preserve selected group through structural redraw. Validation reveals the affected group/accordion/pane before focus.
- UI-only document event `cms:show-work` with detail `{pane:'edit'|'review',view?:'edit'|'preview'}` requests work-pane visibility. The optional view hint makes ReturnDraft show the actual saved preview on mobile. Use real shell tabs for user interactions. Snapshot markers retain immutable real preview; no simulated website renderer or state controls are imported.
- SiteV2/V3 keep every real section and workflow/source/QA function. Their fields are edit pane and workflow is review pane; shared shell/tokens match v4. Library uses real list/filter/upload cards, not v4 placeholders.
- Reference product tokens/spacing/type/grid/card/tabs/preview chrome are transferred from v4, excluding artifact/device/state controls and placeholder claims. Desktop fixed sidebar240 at1024+, max content width and56/44 editor/preview proportion; mobile drawer/edit-preview toggle/sticky48px real-save bar; paired columns180/160 and controls48.

| Slice | Sole writer | Exact initial files | Verification |
|---|---|---|---|
| V2-SHELL | v2_shell / Medium | admin/index.html, admin/admin.css, admin/cms-shell.mjs, admin/auth.mjs only if mounting markers needed, preview/preview.css | Syntax, real contracts, rendered chrome; sole shared CSS owner |
| V2-HERO | v2_content / Medium | admin/hero-editor.mjs, admin/review.mjs, admin/preview.mjs | Real grouping/workflow/preview; own validation/focus/lifecycle |
| V2-SITE | v2_content / observed Medium, follow-on after Hero freeze | admin/site-editor.mjs, admin/site-fields.mjs, admin/site-media-editor.mjs, admin/site-media-preview.mjs; preview.mjs reopened only for real preview identity marker | Preserve all sections/source/role/CAS, new pane markers |
| V2-QA | v2_qa / kit-implementer Medium, pending route confirmation | tests/helpers/pinky-select-ui.mjs and eight affected existing UI suites, bounded sequential batches | Real visible work/group/details interactions; no API/fixture/guard changes or mutation suite execution |
| V2-LIB | v2_shell / observed Medium, after shell freeze | admin/media-library.mjs, admin/media-upload.mjs; shared admin.css remains sole owner | No pipeline changes; real list/filter/upload controls |
| V2-REVIEW | independent kit-reviewer High | Read-only frozen changes/reference/evidence | Design composition and contract regressions; real image review |
| V2-INTEGRATION | root Coordinator | Canonical task, shared indices, evidence | Source preservation/build/syntax/scoped lint and actual UI comparison |

One writer/file; child cannot delegate or rewrite shared records. Verify current Medium before code writes. Transfer follow-on ownership through coordinator. Do not call source PASS design PASS. Current runtime/E2E guard holds are not bypassed; real read-only browser inspection is distinct from mutation suites.

## V2 verification and human review checklist

Approval14/10/2026; handoff15/10/2026. V2 source is integrated and ready for human review. Three native-observed Medium writers and an independent High reviewer followed ownership. Eleven findings were repaired and independently checked in their affected source/visual scope: logout at intermediate widths, navigation focus, ReturnDraft view, three QA navigation cases, preview availability, duplicate brand, actual status subtitle, Hero spacing and Library workflow hint. [Final independent review](../.local/test-outputs/ui-apply-001/v2/review-final.json), [native routes](../.local/test-outputs/ui-apply-001/v2/routes-final.json). No finding remains open in the inspected results. Human acceptance and the unrun cases below are separate.

[Final source](../.local/test-outputs/ui-apply-001/v2/source-final.json):143 known files;22 scoped changes (13 product/style/markup +9 QA),0 missing.107 known protected files and auth.mjs unchanged. Node22 syntax19/19 PASS. [Final guarded build](../.local/test-outputs/ui-apply-001/v2/build-final.json) PASS158 modules. [Guarded lint](../.local/test-outputs/ui-apply-001/v2/guard-checks-final.json) FAIL9 in byte-unchanged protected backend/contracts, no UI/test finding reported. Mutation suites/E2E NOT_RUN: existing producer/runtime guard boundary was not bypassed.

Final evidence is actual authenticated OWNER CMS, not mockup data. [UI observations](../.local/test-outputs/ui-apply-001/v2/ui-final.json), [JPEG dimensions/hashes](../.local/test-outputs/ui-apply-001/v2/images-final.json). Final frames are1440×700 desktop and390×700 mobile. Accepted v4 reference frames have different heights and artifact banner; no pixel-exact or human-acceptance claim. Earlier PNG-named/scaled/transient captures are excluded. At final Hero top, card y261.98, first field y531.45, line-card gap16, status in card heading, duplicate header brand hidden. Temporary viewport was reset; Edge remains authenticated on Hero159/edit with no dirty data.

| ID | Owner | Expected/manual review | Source/static | Real CMS observed | Human |
|---|---|---|---|---|---|
| V2-01 | Shell | Fixed240 icon menu, compact actual role/status/save header; login independent | PASS | OWNER header/menu; login observed; logout visible1024–1279. Logout action NOT_RUN | Pending |
| V2-02 | Hero | Default edit;4 groups; accordion; Đoạn/Kiểu chữ paired | PASS |4 groups one visible; saved159 unchanged; notes collapsed; paired48px, style160px mobile; bounded popup | Pending |
| V2-03 | Workflow | Separate review cards; shortcut to real form; permission guards | PASS | Hero/Site/V3 review panes;2 cards; Hero shortcut focuses message. No snapshot loaded; decisions/self-review NOT_RUN | Pending |
| V2-04 | Preview | Compact chrome, actual viewports, saved/snapshot identity | PASS | Hero saved159 rendered;1440×900 and390×844 intrinsic, inner390 checked; fit within host. Snapshot/ReturnDraft runtime NOT_RUN | Pending |
| V2-05 | Site | All8 real groups, references/workflow/errors reachable | PASS | All8 groups visited at390; proper focus, one visible, saved778 unchanged; desktop/mobile capture | Pending |
| V2-06 | Site Media | All8 populated groups/source/QA/media preview | PASS source | Shell/review/empty state inspected desktop/mobile. Runtime says “Không tìm thấy nội dung”; populated fields NOT_RUN; storage/eligibility cause Unknown | Pending / data boundary |
| V2-07 | Library | Real upload/filter/list/cursor20 cards, no fake draft actions | PASS source | Upload and filters/empty state captured desktop/mobile; IMAGE/ALL empty, pagination disabled, no Save/work tabs/hint. Nonempty records/upload/archive NOT_RUN | Pending |
| V2-08 | Responsive | Mobile drawer/bar; intermediate logout; desktop grid | PASS |320/390/768/1024/1279/1280/1440 no horizontal overflow; drawer trap/Escape/inert restore; bar bottom700.200% zoom/full keyboard NOT_RUN | Pending |
| V2-09 | Boundary/QA | Protected source unchanged; actual business assertions retained | PASS107/syntax19/build; lint9 old failures | Read-only inspection only; other roles and mutation suites NOT_RUN; retained-data inventory NOT_RUN | Pending |

Review images: [Hero desktop](../.local/test-outputs/ui-apply-001/v2/hero-desktop.jpg), [Hero mobile](../.local/test-outputs/ui-apply-001/v2/hero-mobile.jpg), [paired PinkySelect](../.local/test-outputs/ui-apply-001/v2/pinkyselect-mobile.jpg), [mobile menu](../.local/test-outputs/ui-apply-001/v2/mobile-menu.jpg), [review](../.local/test-outputs/ui-apply-001/v2/review-desktop.jpg), [Site desktop](../.local/test-outputs/ui-apply-001/v2/site-desktop.jpg), [Site mobile](../.local/test-outputs/ui-apply-001/v2/site-mobile.jpg), [Site Media desktop](../.local/test-outputs/ui-apply-001/v2/site-media-desktop.jpg), [Site Media mobile](../.local/test-outputs/ui-apply-001/v2/site-media-mobile.jpg), [Library desktop](../.local/test-outputs/ui-apply-001/v2/library-desktop.jpg), [Library mobile](../.local/test-outputs/ui-apply-001/v2/library-mobile.jpg), [Library filters](../.local/test-outputs/ui-apply-001/v2/library-filters-mobile.jpg).

Next action: human review of actual UI and this checklist. The current task does not authorize import/seed/data creation to make V3 or Library fixtures appear. No field edit/save/review/upload/archive/import/fixture or emulator lifecycle action occurred. M3/M4/LOCAL_COMPLETE, historical recovery receipts and original approved v4 remain unchanged. This is a scoped UI handoff with verified read-only surfaces and explicit unverified cases, not whole-CMS acceptance.

Coordinator: root, sole writer of this canonical task/checklist and shared indices. Existing team-policy, team-workflow, coordination templates and role routing apply. This checkout has no .git; use source SHA256 baseline, not an invented branch/commit. Children cannot delegate. One writer per file. Actual Medium is required for application implementation/tests; High for exploration/review.

Deliverable: apply fixed-left icon menu and PinkySelect to the four real CMS groups, preserve all current business functions, review source and provide a checklist for human review. Integrated, Verified and Accepted are separate. No whole-CMS LOCAL_COMPLETE/acceptance claim.

Permitted: scoped admin UI modules/styles/markup, preview host sizing CSS, affected existing UI test suites and one non-test helper, task/evidence docs. Source syntax, applicable guarded lint/build/focused checks and safe UI inspection when current runtime/fixture authority allows. Evidence only under `pinky-lamb-cms/.local/test-outputs/ui-apply-001/`.

Excluded: backend/contracts/schema/RPC/ACL, recovery/config/guard changes, current persisted data, emulator lifecycle/start/restart/reseed/reset, downloads/install/global configuration, original public baseline, Git/deploy. No fixture mutations on retained runtime. Held runtime gates stay held; failed guard is reported, not bypassed. Read-only availability inspection does not authorize recovery or mutation.

## Decisions and shared contracts

- Four exact resource keys remain home, home-v2, home-v3, media. Real editors remain; mockup placeholders, simulated save/review, prototype notices/device controls are not product code.
- Keep CMS canLeave -> destroy -> mount behavior. Cancel keeps current selection/draft; confirmed leave follows existing discard behavior. No cross-resource draft cache.
- Sidebar 240px fixed at >=1024; body right. >=1280 editor/preview can share body; 1024-1279 view toggle; <1024 accessible left drawer. Keep login outside authenticated shell offset.
- Header/actions derive from the active real controller; no generic draft save for media library.
- PinkySelect is one external ES module/CSS, compatible with existing CSP, labels/data-validation-path/IDs and business enum values (including empty values), not mockup labels-as-values.
- Component factory `createPinkySelect(document, config)` returns a BUTTON trigger type=button with role=combobox and stable id. Public `.pinkySelect` controller provides setOptions, setValue, setDisabled, setError, close, destroy; module exports closePinkySelects and disposePinkySelects(root). Trigger .value remains a silent get/set facade for current callers. Trigger .disabled remains native, with component state observing/reading actual disabled/fieldset state (never overwriting caller locks).
- Options are {value,label,disabled}; string values are preserved. Programmatic loads/option refresh are silent and never dirty; user commit emits one bubbling change only when the value changes. Disabled/hidden selected references and unknown/empty values are retained visibly without silently changing content.
- Errors/hints and focus target remain attached to the visible stable trigger. Popup uses a bounded portal, closes across drawer/modal/resource/render/logout boundaries. Explicit disposal before replacement, with bounded cleanup for detached controls; no global stale registry/listeners.
- Text/Kind run rows remain adjacent, 180px style desktop /160px mobile, 48px default height, delete in label row.
- Preserve immutable snapshots, saved-only preview, CAS/idempotency/partial-save errors, role/self-review/source rules, library cursor/pageSize20, upload busy/retry intents, media slot/version/READY filtering, sandbox/CSP and binary budgets.
- No new Rights approval/proof gate. Preview fits host while preserving actual 1440/390 iframe viewport and saved/snapshot identity.

## Ownership and task order

| Slice | Functional team / sole writer | Product files | Dependencies |
|---|---|---|---|
| F0 | UI Foundation / ui_foundation | new admin/pinky-select.mjs, new admin/pinky-select.css | Contract above; parent ROUTE_GO |
| F1 | UI Foundation Shell / ui_shell | admin/index.html, admin/admin.css, admin/auth.mjs, new admin/cms-shell.mjs | F0 API frozen; preserve auth/recovery guards |
| F2 | Shared fields / ui_foundation | admin/site-settings-editor.mjs | F0; lifecycle adapter contract |
| H1 | Hero and shared preview / ui_content | admin/hero-editor.mjs, admin/preview.mjs | F0/F1; no renderer/transport changes |
| S1 | Full Website composition / ui_shell | admin/site-fields.mjs, admin/site-editor.mjs, preview/preview.css | F1/F2/H1; shared navigation/layout host |
| S2 | Full Website consumers / ui_foundation Medium | admin/site-work-editor.mjs, admin/site-services-editor.mjs, admin/site-about-ip-editor.mjs, admin/site-contact-footer-editor.mjs | F2; canonical CSS owner ui_shell |
| W1 | Workflow / ui_content Medium | admin/review.mjs, admin/source-review.mjs | F0/F2; always-disabled source-view preserved |
| M1 | Full Website Media / ui_foundation Medium | admin/site-media-editor.mjs; admin/site-media-preview.mjs UI host hooks only | F0/F2/S1/W1; actual 8 sections remain |
| L1 | Media Library / ui_content Medium | admin/media-library.mjs, admin/media-upload.mjs | F0/F1; pipeline/API unchanged |
| Q1 | QA implementers Medium / ui_shell first slice, ui_foundation second slice | eight affected existing registered UI local/e2e suites, new tests/helpers/pinky-select-ui.mjs; media-tools unchanged | Integrated contracts; no guard registration edits |
| R1 | independent ui_apply_review / kit-reviewer High | read-only source and evidence | Relevant frozen slices; findings repaired by code owner |
| I1 | root Coordinator | this task/checklist, UI evidence, shared index links | Final integration/preservation and evidence |

Shared CSS is ui_shell only; component CSS is ui_foundation only. Resource teams request CSS via coordinator. Each assignment is bounded by slice; a team name is not permission to write another owner's files. Root may assign subsequent slices to the same Medium runtime and records ownership before writes.

## Verification and handoff

Prioritize Hero first, then expand independent groups after shared contracts. Preserve business assertions when replacing selectOption/native DOM selectors with real combobox/listbox interactions. Add meaningful keyboard/disabled/options/lifecycle cases to registered suites; non-test helper requires no local-guard edit. Do not manufacture runtime proof with mocks or mark unavailable checks PASS. Independent source review covers payload/guard/lifecycle regressions. Source-only checks and fixture/browser checks, if used, are separately labeled from authenticated CMS/API evidence.

Checklist rows use: ID | Owner | Expected/manual steps | source/static | CMS runtime | evidence/limit | human acceptance. All product rows start OPEN/NOT_RUN; approved template evidence does not prove application behavior.

| ID | Owner | Expected/manual steps | Source/static | CMS runtime | Evidence/limit | Human acceptance |
|---|---|---|---|---|---|---|
| UI-01 | Shell | Login without sidebar offset; logout clears private UI | PASS_SOURCE | NOT_RUN | Controller-before-disposal repair independently reviewed | Pending |
| UI-02 | Shell | fixed240 menu/icons/active/body; widths320/390/768/1023/1024/1279/1280/1440 and200% zoom | PASS_SOURCE | NOT_RUN | Responsive rules and real four-key callers integrated; no rendered proof | Pending |
| UI-03 | Shell | Drawer mouse/Enter/focus trap/Escape/backdrop/restore/resize scroll cleanup | PASS_SOURCE | NOT_RUN | Drawer/inert/focus/scroll lifecycle reviewed | Pending |
| UI-04 | Shell | Cancel retains menu/draft; Confirm existing canLeave; pending/recovery/role guards | PASS_SOURCE | NOT_RUN | Auth guards/fences and actual menu test calls reviewed | Pending |
| UI-05 | Component+QA | correct values/labels/empty/dynamic options/disabled/errors; no duplicate listeners | PASS_SOURCE | NOT_RUN | Component + meaningful keyboard/options/fieldset/disposal regression source; suites not executed | Pending |
| UI-06 | Content+Shell | paired run fields; fit preview preserves viewport1440/390, saved/snapshot/sandbox | PASS_SOURCE | NOT_RUN | CSS/fit repairs reviewed; exact intrinsic+rendered bounds assertions written; V3 retains its existing preview sizing | Pending |
| HERO-01 | Hero | edit styles/CTA/SEO -> save/reopen; conflict retains draft; snapshot/self-review guards | PASS_SOURCE | NOT_RUN | Hero selectors/payload reads/real actions and saved-only preview wired | Pending |
| SITE-01 | Full Website | all sections/records/references; add/archive/order/hidden/staged/partial-save/retry | PASS_SOURCE | NOT_RUN | Factory + seven partial/full disposal sites; reference refresh stays silent; business test assertions retained | Pending |
| SITE-MEDIA-01 | Site Media | all8 groups; slot/version/kind/manifest/source/review; no legacy Rights gate | PASS_SOURCE | NOT_RUN | Three direct comboboxes and actual preview host reviewed; no new viewport feature | Pending |
| LIB-01 | Library | kind/status filters/cursor20/loading/empty/error/late-response fence | PASS_SOURCE | NOT_RUN | Two filter comboboxes with defaults ALL/IMAGE; source fences/cursor20 reviewed | Pending |
| LIB-02 | Library | upload/archive/retry only authorized synthetic fixtures; busy/intent/picker-focus guards | PASS_SOURCE | NOT_RUN | Upload kind + native busy lock and idempotent cleanup reviewed; no fixture mutation | Pending |
| BOUNDARY-01 | root+Reviewer | protected source/contracts/API/ACL/guard preservation; sandbox/CSP and data boundary | PASS_SOURCE_HASHES | NOT_RUN |100 known non-admin/preview baseline files unchanged; retained-data inventory NOT_RUN; no data/lifecycle operation | Pending |

## Historical v1 execution and human rejection

**Historical human review rejection of v1:** the human reports the CMS is “rất tệ” and “hoàn toàn không giống như template đã cùng design trước đó.” Root confirmed this against the unchanged approved v4 source and the actual authenticated OWNER Hero screen in Edge. The implementation/decomposition omitted key v4 composition; root owns this mismatch and the inadequate design-fidelity acceptance criteria. Application edits were held pending the concrete replacement proposal; the direct v2 approval at the top now authorizes that replacement. No service stop/restart or data action is implied.

Current design findings:

| Finding | Approved v4 | Actual CMS | Result |
|---|---|---|---|
| Work tabs | Biên tập / Gửi và duyệt; edit selected initially |0 work tabs; review form visible above editor | FAIL |
| Hero groups | Hero / Nút hành động / Ảnh / SEO; one selected group | Sequential old long form without group switching | FAIL |
| Primary task visibility | Editor field appears on first screen | Review block809px; Hero first field top1413.09px | FAIL |
| Product header/card hierarchy | Compact topbar/status/actions; section tabs; composed cards | Duplicate brand/headings/actions and nested legacy card structure | FAIL |
| Preview chrome | Compact header/version row; refresh icon; grouped size/fit controls | Large stacked controls and blank spacing | FAIL |
| Mobile action area | Sticky actual-save bar pattern | No corresponding action-bar source/DOM | SOURCE_MISSING; mobile render NOT_RUN |

Evidence: [CMS current screenshot](../.local/test-outputs/ui-apply-001/parity-rejection/cms-current.png), [approved v4 screenshot](../.local/test-outputs/ui-apply-001/parity-rejection/template-v4.png), [read-only observations](../.local/test-outputs/ui-apply-001/parity-rejection/observations.json). Both final captures have actual width1874px; CMS height991px/reference height1034px are explicitly recorded, so they are not claimed to be matched1440×1000 or mobile captures. Template SHA still matches approval. Only UI reads/static-heading focus/temporary viewport inspection occurred; fields remained saved revision159. No save/review/upload/fixture/recovery action or application code edit occurred during this audit.

The old task table below is historical source/static evidence. Its PASS_SOURCE cells do not pass the newly verified missing design requirements. Root must replace the v1 wrapper/CSS approximation with a faithful composition and actual rendered parity checks; the replacement proposal is presented in chat, not saved as an approved new plan.

- Human approval received; task and preservation baseline recorded.
- F0/F1/F2/H1/S1/S2/W1/M1/L1 source delivered in the shared checkout. Actual latest turn_context routes were observed as gpt-6.1-sol / medium for all three writers; reviewer was observed as gpt-6.1-sol / high. Inherited root context is not used as the current worker route.
- Q1 delivered: ui_shell owns helper, hero-editor.local, m1.e2e, site-settings.local and site-records.local; ui_foundation owns site-sections.local, site-workflow.local, m2.e2e and m2-recovery.local. Media-tools was inspected and remains unchanged. Test execution and authenticated UI are not proved.
- R1 source review found four routine defects: Library cleanup order P1, preview fit P1, site paired-row CSS specificity/alignment P2 and Hero delete button visual label P2. The owners repaired these within the approved design and boundaries. Independent affected source recheck resolved all four as PASS_SOURCE; rendered/runtime proof remains NOT_RUN.
- Q1 review found two stale native locators (Hero run select and hidden selected nav option); owner migrated both to actual combobox/listbox assertions while retaining staging/focus/dirty/business checks. Final independent affected source review PASS_SOURCE, no new actionable finding.
- V3 uses its existing actual preview behavior and no new device-size feature. The shared Hero/Toàn website preview retains existing 1440/390 inner viewports. No mockup-only controls are introduced.
- Read-only listener inventory did not show CMS ports5173/5175; this does not prove current process ownership or authorize recovery/start. The guard's e2e/integration admission requires an Approved owned producer/attestation that this UI task does not provide.
- Reviewer compared98 protected baseline sources with current SHA256:98/98 unchanged at the first review observation. This is byte preservation of known sources, not retained-data or runtime proof.
- Final guarded build PASS (158 transformed modules). Root pinned Node22 syntax checks PASS27/27. Guarded lint initially reported10 errors; one unused local variable in owned site-media-preview was removed as a routine repair. Final guarded lint FAIL9: media-worker, site-v3-context, site-v3-drafts, site-v3-snapshots and media-v3-toolset-v2 are protected files with unchanged SHA from the UI before baseline. No UI/test lint error was reported. These failures stay outside UI authority and no gate was weakened.
- Guarded M1 e2e admission was attempted exactly once and REFUSED before prepare/child: `LOCAL_GUARD: managed runtime unavailable/unproven; refuse suite before prepare/child`. Product suites/browser/API/login/fixtures were NOT_RUN. No alternate admission, service startup/recovery or seed was performed.
- Read-only comparison of the historical recovery ui-source-release metadata found seven source-pin mismatches. Five are UI-touched sources (auth, site-editor, review, source-review, m2-recovery.local test); local-guard and vite config already differ from that historical metadata while matching this task's frozen before baseline. No release receipt was rewritten. A historical recovery source approval is not a current runtime release for this UI bundle.
- Runtime availability remains Unknown. Existing M1/M2 closed and M3 runtime HOLD/pending records remain unchanged.
- Source implementation, integration, applicable source/static checks and independent source review are complete. Remaining: actual authenticated desktop/mobile/browser/API checks, global pre-existing lint disposition and human review. Do not close runtime criteria or whole-CMS acceptance from this source handoff.

## Final evidence and review entry points

- [Before source SHA](../.local/test-outputs/ui-apply-001/source-before.json) and [final source SHA/syntax](../.local/test-outputs/ui-apply-001/source-after.json):22 product files and9 affected test/helper files,27 module syntax checks PASS. Tests were written/migrated, never executed in this UI task. RED/GREEN is NOT_RUN.
- [Independent source review](../.local/test-outputs/ui-apply-001/independent-review.json): coordinator transcription of the actual native High reviewer returns; six findings resolved source-only, no behavioral approval claim.
- [Final build](../.local/test-outputs/ui-apply-001/build-final.json), [final lint](../.local/test-outputs/ui-apply-001/lint-final.json), [guard admission refusal](../.local/test-outputs/ui-apply-001/e2e-admission.json), [known source preservation](../.local/test-outputs/ui-apply-001/preservation-final.json).
- No service lifecycle, seed/fixture, retained-data operation, cloud/deploy or Git operation was performed. Standard guarded lint/build preparation writes its existing task-local telemetry-disabled configstore; builds generate admin-dist. Historical approval/recovery receipts were not rewritten.

## Human review sequence and prerequisites

**Later direct human startup instruction:** “Start server cho tôi” authorizes the existing canonical CMS frontend start and basic read-only readiness checks. Root started pinned Node22/local-guard dev on127.0.0.1:5173, session92331, observed listener PID34164. Initial sandbox bind refused EPERM; the exact same command succeeded through the environment escalation mechanism. GET/login200, GET/auth.mjs200 and anonymous GET/api/cms/session401. [Startup receipt](../.local/test-outputs/ui-apply-001/server-start.json) records the observation. No emulator lifecycle, fixture/seed or retained-data mutation was performed. This frontend liveness result does not release held E2E/recovery gates or prove authenticated UI/acceptance. Server is left running for human review; future liveness must be observed again.

The canonical configured CMS URL is `http://127.0.0.1:5173/login`. Its documented UI command is `npm run dev:local` from `pinky-lamb-cms/` with the pinned Node22.23.3 on PATH. The later direct human instruction above covers the frontend start; emulator/recovery/seed actions require their own valid scope and are not performed. The historical read-only M2 profile is `http://127.0.0.1:5175/login`, limited to home-v2; it cannot prove the other three groups or save/upload. Canonical frontend readiness is now observed as above; authenticated login and backend workflow readiness remain Unknown. Do not use the standalone template v4 server as CMS evidence. [LOCAL-RUNBOOK](../docs/LOCAL-RUNBOOK.md) describes historical runtime prerequisites; its old commands/receipts do not grant a fresh runtime release.

Once a valid runtime is available, use assigned local identities without exposing credentials. Begin with read-only inspection. EDITOR/OWNER cover editing; REVIEWER/PUBLISHER cover lock checks; another eligible reviewer must cover self-review refusal. Any save/upload/archive/source/review mutation requires task-owned synthetic fixtures and current runtime authority; do not run existing seed/restore suites against retained data.

1. Login; inspect all four icon menu items, active label, role and real header actions. Library has no draft-save action.
2. At1440 and1280 check editor/preview side by side. At1279/1024 check edit/preview toggle. At1023/768/390/320 check the drawer, focus trap, Escape/backdrop and restored focus. Repeat at200% zoom; no horizontal page overflow.
3. In Hero and Toàn website, check Đoạn/Kiểu chữ controls on the same row, style160px mobile/180px desktop, default48px control heights, full accessible delete label and44px delete target. Open a long list near viewport edges; inspect placement and scroll.
4. Use mouse and keyboard Enter/Space/Arrow/Home/End/typeahead/Escape/Tab; inspect single actual changes, retained empty value, disabled options, inherited fieldset locks, error descriptions and dynamic references. Repeated redraw/navigation must not retain popups or handlers.
5. For authorized synthetic editing, change a field and switch resources: Cancel keeps the draft/menu; Confirm follows the existing discard rule. Then cover save/reopen/CAS/partial-save/snapshot/self-review/source cases in the rows above.
6. Verify preview fits the host at desktop/mobile, retains actual intrinsic1440×900/390×844 for the shared preview, reads saved/Snapshot content, and clears after logout. V3 uses its existing actual preview behavior.
7. Inspect all eight Toàn website — media sections and Library filters/cursor/loading/empty/error. With separately authorized fixtures only, cover upload busy/retry/archive/picker-focus behavior. Logout from each group and verify late responses do not restore private content.

## Coordinator checklist (nine items)

- [x] Read current named human approval and latest stop; scoped actions were covered.
- [x] Preserve approved approach, boundaries, ownership and component contract; routine repairs did not change authority.
- [x] Define acceptance/counterexamples/checks and send opening/progress reports; early real flow was refused by the existing guard, recorded without bypass.
- [x] Inspect actual source/static output, evidence limits and observed writer/reviewer routes.
- [x] Integrate scoped work, repair supported defects and reuse independent review across affected deltas.
- [x] Resolve earlier source feedback across actual consumers; runtime proof remains pending.
- [x] Update canonical task, source evidence and shared index links; retain historical holds/records.
- [x] Prepare closing handoff with material evidence, limits and concrete manual review sequence.
- [x] Finish independently authorized routine work; keep runtime/data/lifecycle expansion outside this approval. No human stop arrived during execution.
