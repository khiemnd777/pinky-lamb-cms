# P3–P6 quality repairs — 17/10/2026

Scope: the four source-review findings, one agent. No retained import, activation,
P7 changes, account changes or runtime restart. Implementation precedes one final
verification batch. Authenticated runtime/UI acceptance remains separate.

## Shared editing

Each normal Home v3 group retains its localized workspace and exposes the existing
shared editor through “Dữ liệu dùng chung”. Project/Service creation, ordering,
visibility, media, relations and contact settings use the established working Home
model and “Lưu website”. Locale saves still accept translated fields only. Dirty
localized input must be resolved before changing modes. Shared validation reveals
the shared panel and existing field/dialog; role and pending-state locks remain.

## Atomic import source pin

Selected-import and corrective-recovery commands include `expectedSourceHash`, the
canonical hash of the retained Home content frozen in the plan. Every target save
checks this hash inside its database transaction before any write, and reads it
again on a transaction retry. Hero uses its trusted full-Home base hash; other
resources use the trusted Home reader in the same transaction. The pin belongs to
the idempotent request hash. A committed replay returns its original receipt;
changing the pin with the same key is refused. CLI source/mapping validation and
target revision/dependency checks remain in place.

Old private journal intents without this pin fail the immutable-body check. They
must not be rewritten or silently retried with a different payload/key. Preserve
such a journal for a separately authorized reconciliation. No journal/data was
migrated during this repair.

## Hero freshness

Hero base/read/draft/receipt accept an additive `dependencyHash`; save accepts
`expectedDependencyHash`, and reads return `sourceStale`. Editor, normal save, QA
and editorial review share the same dependency/freshness implementation. Normal
saves and explicit rebases retain the relevant dependency in every new revision.
Full Home revision/hash remain provenance and the P6 source pin, not the default
translation-drift criterion. Hero text, CTA, selected resources, presentation,
relevant source bindings and source records affect the dependency; unrelated
Contact/Footer changes do not. Legacy records keep conservative full-Home checks
unless their existing explicit-rebase association provides the dependency.
Historical records and snapshots are not rewritten.

## Review form accessibility

Visible captions use explicit label/control associations. IDs stay stable for a
mounted form and are unique across form instances and repeated source-page fields.
Filter focus is restored after redraw when the control is available.

## Verification

Final batch, pinned Node 22.23.3 and the existing guarded child environment:

- 43 affected test files, 243/243 tests PASS; no skips/cancellations. Coverage
  includes source changes before commit and across transaction retries, immutable
  request replay, Hero freshness across editor/save/QA/P5 and shared-mode guards.
- The five UI regression cases also PASS after strengthening the focus assertion
  to require the current control node, not just a matching ID on a detached node.
- ESLint on all 26 changed application/contract/test files: PASS.
- Admin Vite build: PASS.
- Full-repository ESLint: FAIL, nine errors in five untouched tracked files:
  `cms-api/media-worker.mjs`, `cms-api/site-v3-context.mjs`,
  `cms-api/site-v3-drafts.mjs`, `cms-api/site-v3-snapshots.mjs`, and
  `contracts/media-v3-toolset-v2.mjs`. These are outside the four repairs; no rule,
  assertion or quality gate was disabled to obtain a pass.

Local logs: `/private/tmp/pinky-p3-p6-final-tests.log`,
`/private/tmp/pinky-p3-p6-final-ui-focus.log`,
`/private/tmp/pinky-p3-p6-final-scoped-lint.log`,
`/private/tmp/pinky-p3-p6-final-lint.log`,
`/private/tmp/pinky-p3-p6-final-build.log`.

Status: repaired source plus local regression evidence. Authenticated rendered UI,
real emulator transaction behavior and human acceptance remain NOT_RUN. No retained
import, activation, production action or P7 implementation was performed.
