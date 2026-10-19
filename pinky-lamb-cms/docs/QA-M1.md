# M1 local QA evidence

Status: M1 technical REVIEW_READY, with High source/visual review passed and user acceptance pending. The complete automated gate passed locally on2026-10-11. M1 remains open; this is not LOCAL_COMPLETE, cloud verification or deployment approval.

## Verified evidence

| Slice | Actual evidence | Result |
| --- | --- | --- |
| Draft/API05 | `.local/cache/task05-final.tap` |12 guard +10 Auth/Rules/API +8 draft groups passed; safe transport, CAS, replay, storage and catalog projection |
| Editor06 | Independent12 browser groups | Full Hero/SEO edits, linked errors, keyboard picker focus, conflict retention, same-key lost response, logout races and no private persistence passed |
| Renderer/preview07 | `.local/cache/task07-checks.log`, `.local/cache/task07-runtime-proof.json` |6 pure renderer +12 guard groups/build; exact public HTML CORS, baseline/font/image SHA and API200 proved |
| Preview07 independent |16 browser groups +5 targeted keyboard/preview groups | Actual1440/390 frame sizes, computed fonts/style/focal position, static metadata, malicious copy, sandbox restrictions and natural keyboard scroll passed; High Checkpoint B passed |
| Review08 | `.local/cache/task08-final-checks.log` |14 guard +8 draft +12 review groups passed, with build; immutable submit/read/review, current roles, self-review before keyed replay, two-client terminal CAS, direct SDK mutation denial and corrupt cross-record/replay rejection |
| Auth generation repair08 | `.local/cache/task08-auth-race-repair.log` | Focused lint/build passed; generation checked after JSON parsing before403 side effects. Independent09 and final37 browser groups prove the held JSON-body race does not sign out a new session |
| Corruption oracle correction08 | `.local/cache/task08-corruption-oracle.tap` |12 review groups passed; compare complete canonical documents after installing corruption and before fixture restoration |
| Offline export09 focused | `.local/cache/task09-source-checks.log`, `.local/cache/task09-offline-smoke.log` | Focused lint/build/guarded export passed; direct pure import loaded no SDK, forbidden fetch unused, tampered fixture and outside output refused before write, all40 public hashes matched and private fixture metadata absent; independent9 and final37 browser groups passed, including adversarial export and rendered desktop/mobile QA |

Checkpoint A and B are recorded separately in their High-owned documents. Earlier pending-route503 evidence describes an earlier lifecycle stage; current snapshot/read/review routes are implemented and tested. Current missing snapshot returns404 and invalid submission returns422.

The deny-all Firestore Rules apply to all browser identities, including memberships. Actual08 tests deny update/delete of a created immutable Snapshot, ReviewState and Review for all four roles. Admin API authorization verifies current Auth and membership in transactions. Historical reviewer membership changes do not invalidate an already captured valid review.

## Limits and remaining gate

The synthetic `tests/fixtures/approved-hero.json` is an offline QA input, not proof of live review approval. Snapshot integrity hashes are not signatures or verified legal/claim rights. Source-reference projection remains UNVERIFIED with empty claim bindings. Catalog byte identity does not establish new licensing or factual claims.

Independent09 verified authenticated submit/load/review UI, independently computed snapshot/source-reference hashes, exact selected immutable preview after later draft edits, both self-review outcome denials, stable retry through lost response/follow-up GET failure, pending locks and the delayed403 JSON-body logout/new-login race. It also proved whole CMS390 layout, private child/public artifact390 width, static JavaScript-off Hero/SEO, baseline JavaScript menu/filter/dialog/showreel interactions, public manifest/resources/private leakage boundaries and tamper/output/symlink rejection with unknown-file preservation.

## Final sequential gate

The actual selected Node22.23.3 guarded run from2026-10-11T07:17:57Z to07:18:50Z completed each stage before starting the next. No source changed during the run. All95 tests passed; none failed or skipped.

| Guarded command | Actual result | Artifact |
| --- | --- | --- |
| `npm run lint` / guard `lint` | Exit0 | `.local/cache/m1-final-lint.log` |
| `npm run test:unit` / guard `unit` |28/28:14 guard +8 Hero contract +6 renderer;0 skipped | `.local/cache/m1-final-unit.log` |
| `npm run test:emulators` / guard `integration` |30/30:10 Auth/Rules +8 draft +12 review;0 skipped | `.local/cache/m1-final-integration.log` |
| `npm run build:admin` / guard `build` | Exit0 | `.local/cache/m1-final-build.log` |
| `npm run test:e2e:local` / guard `e2e` |37/37:11 login +17 editor/preview +9 workflow/export;29.7s | `.local/cache/m1-final-e2e.log` |

The latest nine independent M1 evidence JSONs from the full37-browser run contain641 response records, allnine status passed, errors0 and blocked0. Recorded origins are only127.0.0.1 ports4173/5010/5173/9099. These are the current artifacts; earlier focused-run counts are historical.

The run executed `node scripts/local-guard.mjs <mode>`, the exact package-script target, through the isolated runtime and sanitized child environment. Combined evidence `.local/cache/m1-final-gates.log` SHA256 `0a0a576b680ea592954b68f2a95060563a95d461b300f563dc8d277ca43e97eb`; sequential exit/timing summary `.local/cache/m1-final-gates-summary.json` SHA256 `09d58a5cca0c9cb44dc34183ed4af4e711c7ba8918e778ba706d15eb98c2f7b7`.

## QA shell refinements

Actual baseline5010 at390px already had document width395px from the decorative hero orbit. Both generated adapters initially inherited it. Body-only clipping failed the unchanged browser oracle. The read-only DOM matrix `.local/cache/task09-containment-matrix.json` demonstrated that fixed `main#main` horizontal clipping gives document/body width390, retains nondecorative bounds, page height6181 and vertical scrollY200. Clipping hero-visual would have hidden the note and was rejected.

Both adapters now require exactly one reviewed `<main id="main">` and add only trusted `overflow-x:clip` to that local QA shell. The static artifact also has the fixed plain **Bản thử local — chưa xuất bản** notice. Baseline HTML/CSS/assets, shared renderer and template version remain unchanged. Fresh independent9 and the final37 browser groups verified the resolved bounds, uncropped content and preserved interactions; no width assertion was weakened. Export desktop/mobile screenshots passed High visual review. High also passed the actual selected Snapshot visual review on normal painted CMS desktop/mobile captures, the same child's full1440x900/390x844 images and the mobile Review panel. Normal shell captures preserve the actual scroll-container view; full-child captures changed only parent capture layout, then restored it. Child srcdoc/sandbox/dimensions and source stayed unchanged. The existing keyboard-scroll proof covers the intentionally scrollable desktop frame.

Read-only capture proof `.local/cache/task09-visible-snapshot-proof.json` SHA256 `26baac22454b99c681a5034236d4d979dbe2d7064843ce98b5afad1ff035c23b` records57 loopback response records, errors0, blocked0, editorial mutations0 and logout clear. Images are under `.local/test-outputs/m1-e2e/snapshot-preview-visible-shell-{desktop,mobile}.png`, `snapshot-preview-visible-{desktop,mobile}.png` and `snapshot-review-visible-{desktop,mobile}.png`. Earlier blank offscreen full-page screenshots are not paint evidence; a capture-timing cause is inferred, not a proved rendering defect. No application change or test rerun was needed after the successful95-test gate.

Tests retain immutable snapshots/reviews/audit and advancing draft revisions. CAS restoration refuses to overwrite a draft with an intervening event. Synthetic corruption bytes and temporary membership alterations are restored in finally. A fixture export is not publication.

## Runtime retained for acceptance

`.local/cache/m1-live-owned-listeners.txt` records owned VitePID62367 on127.0.0.1:5173, Firebase CLIPID65777 on127.0.0.1 Auth9099/Functions5001/Hosting5010 and Firestore JavaPID65804 on127.0.0.1:8080. Auxiliary listeners in that artifact are literal loopback. These owned processes remain running for user review; the independent QA4173 server is test-owned and stops after tests. PIDs are an observed2026-10-11 snapshot, not persistent configuration. No unrelated process was stopped.

Dependency audit retains conditional local advisory mitigations in DEPENDENCIES. There is no claim of zero advisories or production readiness. The local JavaScript network fence does not cover Java at the operating-system boundary.
