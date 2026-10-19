# SPEC-cms-identity — M1 local identity and authorization

Date: 2026-10-11. Task: `CMS-M1-00`. Module: `cms-identity`.

**Verified:** the [approval register](../../approvals/APPROVAL-REGISTER.json) records the user's exact `Approved CMS-001 v2 — M1 local/emulators`, with M1 open and `IN_PROGRESS`. The frozen [scope](../../approvals/CMS-001-v2.scope.json), [architecture](../../docs/CMS-ARCHITECTURE.md) and [tasks](../../tasks/todo.md) define the boundary. Their historical `AWAITING_APPROVAL` labels describe the handoff snapshot, not the current register. This file refines approved task 00; it does not approve M2–M4.

**Proposed implementation contract:** requirements below are normative for the Medium workers. **Unknown / NOT_RUN:** runtime authorization, browser behavior and emulator tests have not been verified by writing this specification.

## Objective and boundary

An individual fixture member logs in, reads private M1 content, and performs only the actions assigned to that member. Login proves identity. Current UID membership supplies authorization. User-controlled email, role claims, hidden UI controls and email domain do not grant membership.

Use only `demo-pinky-lamb-cms`. Required Auth, Firestore, Functions and Hosting emulators bind to loopback. Defaults are Auth 9099, Firestore 8080, Functions 5001 and Hosting 5000; Vite 5173 also binds to loopback. The approved implementation disables Emulator UI. An alternate port is allowed only when all corresponding configuration and evidence use the same port. `us-central1` is the local function URL segment. It is not approval for a cloud region or deployment.

The worker must validate demo project and the four emulator settings before initializing Firebase SDKs. Server `FIREBASE_AUTH_EMULATOR_HOST` and `FIRESTORE_EMULATOR_HOST` are required, must use the configured loopback host/port, and must omit a URL scheme. Functions/Hosting addresses are required in validated local configuration. Missing, malformed or non-loopback configuration fails closed. No ADC discovery, service-account file, real Firebase account/login, billing/IAM or cloud fallback is permitted. Use explicit demo project initialization without a cloud credential. Unsigned Auth emulator tokens are acceptable only behind this guarded local boundary; they are unsuitable for production. [Firebase Auth emulator documentation](https://firebase.google.com/docs/emulator-suite/connect_auth)

The launcher/admin guard requires both project environment names (`GCLOUD_PROJECT` and `GOOGLE_CLOUD_PROJECT`) plus the four configured emulator host variables. The Functions emulator's discovery/request worker supplies a smaller documented runtime environment: the API server guard requires `GCLOUD_PROJECT === 'demo-pinky-lamb-cms'`, exact Auth/Firestore host variables and the same validated four-emulator local config. If `GOOGLE_CLOUD_PROJECT` or custom Functions/Hosting environment names are present, they must match; their omission by the emulator does not authorize cloud fallback. This is an explicit server-mode guard, not an automatic fallback for a failed launcher guard. The API installs its Node network fence before SDK imports even when the emulator does not pass launcher `NODE_OPTIONS`. The launcher sets the supported fixed `METADATA_SERVER_DETECTION='none'`; the API also sets it before SDK imports because discovery workers may omit custom environment values. Installed gcp-metadata's isAvailable returns false for this mode before its metadata request path. This disables cloud metadata availability detection; it neither replaces token verification nor supplies a credential. The outbound fence remains active. Each guard mode needs positive and negative tests. Actual configured Hosting port is5010 because default5000 was occupied; other required ports remain unchanged.

The guarded CLI child isolates XDG config/cache/data paths below `.local/` while preserving HOME. Installed CLI15.33.0 probes ADC before Functions startup even with a demo project. The local adapter may replace only its source/version/hash-checked `emulator/env.getCredentialsEnvironment` discovery hook with an empty environment, rejecting an account argument. It does not change Auth verification, GoogleAuth methods, SDK credentials, node_modules bytes or global config. A second source/hash-checked `Config.load` adapter may pass the supported `projectDir:ROOT` option only for exact `infra-local/firebase.json`; original config parsing/validation and path traversal checks remain intact. Installed Hosting independently resolves its cwd from that config directory. The adapter derives the in-memory `hosting.public` value `../public-baseline` from `Config.path('public-baseline')`, and asserts that the resulting target equals the fixed baseline realpath. The source config remains root-relative and unchanged; no caller-controlled traversal is accepted. A third source/version/hash-checked `deploy/functions/runtimes/node/versioning.getLatestSDKVersion` hook returns the setup-verified installed Functions SDK version `7.4.0` instead of spawning an npm registry lookup during local runtime. The original `checkFunctionsSDKVersion` and minimum-version checks remain intact. This does not assert the current remote latest version. These narrowly scoped tooling adapters are not application authorization bypasses.

**Verified setup evidence:** CLI15.33.0 automatically starts Eventarc9299 and Tasks9499 as Functions companions, even with `--only auth,firestore,functions,hosting`. They are tooling dependencies, not added CMS features: no CMS handlers, clients or product actions target them. The required four services, these two companions, hub4400, logging4500 and Firestore websocket9150 are recorded at literal `127.0.0.1` in `.local/cache/emulator-listeners.txt`. Maintain that loopback boundary and report the actual listeners; do not claim exactly four listeners. Setup gate01b records guard tests12/12, Vite private-file requests7/7 denied403, pending API503 and baseline index/font200 with matching served hashes. These checks do not verify application authorization or editorial workflow. The Node network fence covers reviewed Node connection paths; it is not an operating-system firewall or a Java egress proof.

The fourth narrow tooling adapter is request-transport-only: the exact pinned cmsApi HTTP runtime's early JSON factory collects bounded raw bytes so malformed input reaches the required safe JSON error contract. Its process/factory/source checks and transport oracles are defined in [SPEC-cms-content](SPEC-cms-content.md). It never changes the Auth emulator, direct signup/token endpoints, SDK token verifier, CLI/discovery parsers or membership policy. Current Auth/action and strict application parsing remain mandatory. Parser transport errors may return generic400/413 before application Auth without reading or changing private data.

## Actors and exact action matrix

M1 uses one `role` enum: `EDITOR | REVIEWER | PUBLISHER | OWNER`. There are no role arrays, custom permission strings or owner override.

| Action | EDITOR | REVIEWER | PUBLISHER | OWNER |
| --- | --- | --- | --- | --- |
| Read session, draft, catalog, private preview, snapshot and review state | Allow | Allow | Allow | Allow |
| Save Hero/SEO draft | Allow | Deny | Deny | Allow |
| Submit immutable snapshot | Allow | Deny | Deny | Allow |
| Approve / request changes on another member's snapshot | Deny | Allow | Deny | Allow |
| Review own submitted snapshot, either outcome | Deny | Deny | Deny | Deny |
| Browser/direct SDK read or write to any private CMS collection | Deny | Deny | Deny | Deny |
| Membership administration UI/API, publish, rollback or upload | Absent | Absent | Absent | Absent |

API read permission requires every condition below. Browser/direct Firestore reads and writes are denied for every role, including reads of the user's own membership document. The `PUBLISHER` fixture tests the read-only API role; it has no publication feature. Future owner administration and publisher workflows remain outside M1. Engineering changes are outside this editorial role matrix.

## Membership and request authorization

`cmsMembers/{uid}` contains the architecture's `Member`: `uid`, `role`, `isActive`, `expectedEmail`, `authzVersion`, `invitedBy`, `createdAt`. `authzVersion` is a positive safe integer. Timestamp strings use UTC RFC 3339 in HTTP/fixture contracts. Only the guarded seed/operator uses trusted emulator Admin SDK writes; no endpoint accepts client membership edits.

For each private API request, in this order:

1. Validate the local runtime guard. Read one `Authorization: Bearer <ID token>` credential; no token in a query, cookie, request body or URL fragment.
2. Verify the token using the emulator-connected Admin Auth SDK, including expiry, project/audience, issuer and revocation/disabled-user checks. Read the current emulator user record. Invalid, expired, revoked or disabled credentials return 401 `UNAUTHENTICATED`.
3. Use the verified token UID as the member document ID. Require the stored `member.uid` and current Auth user UID to equal that UID. A body/header UID never chooses the member.
4. Require `member.isActive === true`, an allowed role, and a valid `authzVersion`. Require both token `email_verified === true` and current Auth `emailVerified === true`.
5. Require token email and current Auth email to match `expectedEmail` after trim and lowercase comparison. The UID remains the identity key; email is an additional mismatch check. A changed email does not transfer or create membership.
6. Apply the action matrix. For review, also require `actor.uid !== immutableSnapshot.submittedBy` before any write or idempotent result replay.

Missing membership, inactive member, unverified/mismatched email and forbidden role return 403 `FORBIDDEN` with a generic message. Do not reveal which condition failed to an unauthorized client. Read membership on every request; do not cache authorization across requests or trust token custom-role claims. Mutation transactions re-read membership inside the transaction to prevent a concurrent Firestore membership change from being ignored. Current Auth-user checks occur for every request; M1 does not claim that a separate Auth-service change and a Firestore transaction form one atomic operation.

All private responses use `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`. API errors follow the [content specification](SPEC-cms-content.md#http-contract). No response or diagnostic log echoes a bearer token or password. Authorized snapshot responses contain editorial actor UIDs for workflow traceability; public rendering excludes those UIDs.

## Browser session contract

Use Firebase Email/Password Auth emulator with explicit `inMemoryPersistence` set before sign-in. Firebase Web's default local persistence is unsuitable for this private local CMS. [Firebase Auth persistence](https://firebase.google.com/docs/auth/web/auth-state-persistence)

The admin has login and logout controls, no signup or password-reset/email-send UI. A person can still call emulator signup directly; without trusted membership that person receives 403 and cannot read content. Fixture passwords are synthetic local test inputs, never real credentials. Do not display passwords in evidence or store passwords in Firestore.

After sign-in, request `GET /api/cms/session` before fetching/rendering private data. That response is exactly `{uid, role, isActive: true, authzVersion}`. A user may have Auth identity while CMS access is denied; the UI presents a generic access error and no private content.

Keep tokens, loaded content, dirty edits, preview HTML and review selections in memory. Do not enable Firestore offline persistence or write private data to localStorage, sessionStorage, IndexedDB, service workers or browser caches. Reload requires login again. Each API call obtains the current SDK token; a one-time forced token refresh after a 401 may retry a read or the same keyed mutation once. A failed refresh ends the session. Do not silently retry a 403 or replace a mutation's expected revision/key.

The installed Firebase App SDK creates one nonprivate IndexedDB `firebase-heartbeat-database` with the sole store `firebase-heartbeat-store`, independently of inMemoryPersistence. Source inspection confirms its key uses the fixed demo app name/appId, and its write payload contains only SDK platform-agent/date heartbeats and optional lastSentHeartbeatDate. No UID, email, password, bearer token or CMS content participates. This metadata is permitted; the private-storage prohibition remains unchanged. Browser checks separately report this known metadata database, reject all other IndexedDB databases/stores, and require zero localStorage/sessionStorage/cache entries plus login again after reload. Do not claim zero total IndexedDB databases or exclude a database solely by its name without the reviewed SDK/store boundary.

Logout, Auth sign-out, and failed private authorization invalidate the session generation, abort outstanding requests, clear form/private state, remove preview iframe `srcdoc`, and release any object URLs. A response from an earlier session generation must not repopulate UI after logout. Sign-out clears browser state; a previously captured bearer token is not described as revoked solely because the browser signed out. Backend membership and current Auth checks remain mandatory.

The preview iframe receives public projection HTML only, never a token. It has an empty `sandbox` attribute and restrictive CSP; it cannot run scripts, submit forms, access parent state or create a public draft URL. Preview controls live in the authenticated admin. Full details are in the [content specification](SPEC-cms-content.md#renderer-and-local-export-contract).

## Firestore Rules and server boundary

The admin obtains all private data exclusively through the six authenticated HTTP API routes. Browser/direct SDK reads and writes to all CMS collections are denied for every role, including the user's own member document, drafts, snapshots, reviews, review states, audit and idempotency records. Collection queries/listing and unknown collections deny by default. No Rules read path or client role field grants access. Catalog selection uses the fixed local catalog, without a media-write API. `GET /api/cms/drafts/home` adds a sanitized response-only `catalog` array as defined in the content specification; the full catalog stays server/exporter-side. Catalog summaries are held in the same session memory and cleared on logout.

Rules tests must prove denied reads and writes for valid EDITOR/REVIEWER/PUBLISHER/OWNER too, plus anonymous/unknown/inactive/unverified/mismatched users. Valid-member private access is proven through API integration tests. The backend Admin SDK bypasses Firestore Rules; passing Rules tests does not prove API authorization. API integration tests separately attack every endpoint with each role and invalid membership condition. [Firebase Rules conditions](https://firebase.google.com/docs/firestore/security/rules-conditions)

The Vite proxy keeps browser requests same-origin at `/api/cms`. The Functions adapter permits only configured loopback admin origins when an Origin header exists, never wildcard credentialed CORS. Local command-line integration clients may omit Origin but must still supply a valid token. An allowed Origin does not replace authorization. Security headers and admin CSP allow only the explicit configured loopback SDK/API endpoints and local assets; no analytics or external runtime requests.

Vite development serving must explicitly restrict readable roots/files to the admin shell, browser-safe shared schema/renderer modules, installed browser dependencies and the read-only public baseline. Deny `.local/`, `cms-api/`, the full `contracts/legacy-assets.json`, private fixtures/tests, private documents and other server-only source, including `/@fs/` or normalized/encoded-path requests. A blocked source must not be reachable through alternate prefixes or symlink traversal. Vite's default project-root allowance is insufficient for this isolated root. Build dependency review must also prove no private catalog/server import reaches `admin-dist/`; blocking dev HTTP alone does not prevent bundling a private imported JSON file. The same filesystem restriction is checked by direct local HTTP requests without needing a Firebase credential.

## Fixture and verification oracles

Guarded seeding creates separate synthetic editor, reviewer, publisher and owner Auth users plus membership records; unknown UID Auth user without membership; inactive member; unverified member. Use `.test` addresses and stable fixture UIDs. An additional changed-email scenario is created through emulator test setup. Seed is local setup, not an owner onboarding feature. Fixture reset must not delete unrelated user files or use any cloud endpoint.

| Oracle | Required result | Evidence owner |
| --- | --- | --- |
| ID-01: anonymous / bad / expired / revoked / disabled credential | 401 on all six private endpoints; no content leak | Medium API tests |
| ID-02: unknown UID, inactive, unverified, changed email, stored UID mismatch | 403; no draft/snapshot data or writes | Medium API + Rules tests |
| ID-03: role spoof in body/header/token custom claim | Actual membership role governs; protected input rejected | Medium API + Rules tests |
| ID-04: editor / reviewer / publisher / owner matrix | Exact allow/deny table; editor cannot review, reviewer/publisher cannot save | Medium API tests |
| ID-05: owner submit then owner review, either outcome | 403 `SELF_REVIEW_FORBIDDEN`; state/reviews/audit unchanged | Medium review tests |
| ID-06: direct SDK member/draft/snapshot/review read or write | Denied for every role, including OWNER and own membership read | Medium Rules tests |
| ID-07: logout during pending preview request / reload | Content stays cleared; no persistent token/private draft; reload requires login | Medium browser tests |
| ID-08: missing emulator / real project / remote host | Startup/request refused before SDK/runtime network use | Medium guard tests |

High reviews evidence at Checkpoint A and M1 final review. No identity oracle is PASS until the Medium worker records the actual result.

## Commands, files and conventions

Commands are planned scripts, not execution evidence: from `pinky-lamb-cms/`, `npm run lint`, `npm run test:unit`, `npm run test:emulators`, `npm run test:e2e:local`, `npm run dev:local`, `npm run build:admin`. Setup must create and audit the pinned root lockfile before `npm ci --ignore-scripts`.

Identity owns `cms-api/authorization.mjs`, `admin/auth.mjs`, `admin/config-local.mjs`, guarded seed and `infra-local/firestore.rules` under the canonical task ownership. ESM `.mjs` + JSDoc is the source convention; Zod validates inputs. A conceptual provider interface is `authorize(request, action, transaction?) -> Promise<Actor>` where `Actor` supplies verified `{uid, role, authzVersion}`. It is notation, not permission to add another source file or generic service locator.

Always: validate UID/resource/action, deny by default, preserve independent API and Rules evidence. New approval: new role/session adapter, membership administration, external integration or M2+ behavior. Never: cloud credentials/runtime, self-review override, token logging, browser membership writes or changing frozen baseline/vendor/config policy.
