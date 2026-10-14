# M1 local dependency and tooling record

CMS-M1-01a, 2026-10-11. Approved CMS-001 v2 — M1 local/emulators only. Runtime implementation selected GPT-6.1 Sol Medium. This setup is not CMS completion, emulator QA, cloud verification or production readiness.

## Verified toolchain and exact pins

| Component | Selected version | Compatibility evidence |
| --- | --- | --- |
| Node | 22.23.3, official Darwin ARM64 archive | Executed `node -v`; official release index identifies npm10.9.9; archive SHA25623b25245dcfb9af7262f8ff142e9e2e0af025368117329e7a7458a51e5922f53 matches official SHASUMS |
| npm | 10.9.9 bundled with selected Node | Executed npm CLI version; root packageManager and engines exact pin |
| Java | OpenJDK24.0.1, Homebrew build24.0.1 | Existing runtime, `java -version`; no global changes. Selected CLI requires Java21+. Firestore1.22.0 base class files max major65(Java21), compatible with24 |
| firebase | 12.19.0 | Matches Rules5 peer `^12.0.0`; latest Firebase13/Rules6 would force Node24.12+ and conflicts approved Node22 |
| firebase-admin | 14.5.0 | npm engine>=22; API runtime dependency |
| firebase-functions | 7.4.0 | npm engine>=18; peer accepts Admin14; optional GraphQL/Apollo peers not required |
| zod | 4.6.5 | Root/browser contract and API workspace dependency |
| vite | 8.3.4 | npm engine^20.19 or>=22.12; admin tooling only |
| firebase-tools | 15.33.0 | Released npm/GitHub version; engine accepts Node22. Installed `lib/emulator/commandUtils.js` minimum Java constant21 |
| @firebase/rules-unit-testing | 5.0.2 | Node>=20 and Firebase^12; compatible alternative to latest6.0.0(Node>=24.12) |
| @playwright/test | 1.64.0 | Node>=20; browser binaries not downloaded/run in01a |
| eslint | 10.12.0 | Node^22.13 supported; flat configuration deferred to02 |
| @grpc/grpc-js override | 1.14.6 | Same major1, engine>=12.10. Explicit remediation of vulnerable Firestore pinned~1.9; official1.14.6 release and TLS/error-disclosure advisories checked. SDK imports pass; emulator integration still required |

PATH before setup had Node23.11.0/npm11.4.2. That runtime was not selected for installation. Isolated runtime resides at `.local/cache/node/node-v22.23.3-darwin-arm64/`. No Node/npm/JDK/plugin/global config was installed or changed.

Firestore tooling artifact `.local/cache/emulators/cloud-firestore-emulator-v1.22.0.jar` has136707194bytes and SHA256`9b6498b7f62714d67f48f59b3818883cd682dbcd46b9f59511de81c97bb5166c`, matching installed CLI download metadata. Base class versions49,50,51,52,55,65 were inspected without starting the emulator. Auth/Functions/Hosting are supplied by selected CLI; runtime compatibility and startup remain NOT_RUN until01b fail-closed guards exist.

## Installation boundary and policy

Root `package.json` is a private npm workspace; `cms-api/package.json` is the only member, `type:module`, `main:index.mjs`, Node22 engines and Admin/Functions/Zod dependencies. Sole root `package-lock.json` is authoritative. No API lockfile. Exact direct pins and security override avoid floating manifest versions. No framework/extra app dependency was added.

From isolated root, prepend the selected runtime bin directory to PATH for every npm invocation. Verified sequence:

```sh
export PATH="$PWD/.local/cache/node/node-v22.23.3-darwin-arm64/bin:$PATH"
npm install --package-lock-only --ignore-scripts --engine-strict --cache .local/npm-cache --userconfig /dev/null --no-fund --no-audit
npm ci --ignore-scripts --engine-strict --cache .local/npm-cache --userconfig /dev/null --no-fund --no-audit
npm audit --json --cache .local/npm-cache --userconfig /dev/null
```

First frozen install882packages. After inspected exact grpc override, repeated lock-only/frozen install879packages passed strict engines. Scoped `get-uri > basic-ftp6.2.3` and `gaxios > uuid11.1.1` overrides were source/release reviewed and final frozen install879packages passed. FTP Client access/lastMod/list/downloadTo/close methods match installed get-uri use; CommonJS get-uri import and gaxios-scoped uuid.v4 smoke passed without network. FTP release6.2.1 fixes parser advisory;6.2.3 adds control-character/password-error fixes. UUID11 retains CommonJS v4 and matches CLI published override intent. Full real FTP/cloud path tests are outside M1. Root lock SHA256`6f116655a61641393ecad84c64eff7e72c7c81a3aa9d7f957d9cb8f81ee023ea`. Lifecycle scripts remain disabled; no npm rebuild, forced fixes or blanket permission. Module smoke imported firebase/auth, Admin app, Functions v2 HTTPS, Zod, Rules, Vite, ESLint and Playwright without SDK initialization; all eight passed. This proves package entry compatibility, not API/database/browser behavior.

Root scripts route exclusively through `scripts/local-guard.mjs`: dev, emulators, build, lint, unit, integration, e2e, seed and export. Wrapper implementation belongs to01b; scripts intentionally cannot run before it exists. Units use Node native test runner. No emulator was started in01a.

## Pending lifecycle scripts inspected

Evidence `.local/cache/dependency-lifecycle-scripts.json` records exact installed paths/versions. All remain blocked:

- `@firebase/util1.15.3 postinstall.js`: reads FIREBASE_WEBAPP_CONFIG, may fetch Firebase webConfig for a non-demo project, writes package defaults. Never execute; explicit guarded demo browser config will replace automatic defaults. Existing packaged fallback defaults permit import.
- `protobufjs7.6.6 scripts/postinstall.js`: version-scheme warning only; not required.
- `fsevents2.3.3`: implicit native-build marker; no explicit install command; packaged optional native binary present. No build required for smoke.
- `re2 1.27.0`: artifact downloader or node-gyp build; not executed. Node engine^22.22.2 accepts selected patch. No app dependency on RE2; a later CLI path that actually requires the absent native binding must be diagnosed/source-reviewed before minimal execution. Do not enable all install scripts to repair it.

## Native audit and reachability

Initial audit:16 findings(12high,4moderate,0critical). Exact grpc1.14.6 override removed five propagated high entries from Firebase/Firestore/Rules. Intermediate audit11 findings(7high,4moderate). Final authoritative audit after scoped FTP/uuid remediation:5 findings(3high,2moderate,0critical), exit1. Do not report audit as clean. JSON includes advisory IDs, exact nodes/ranges/fix proposals. npm suggested major downgrades are not applied.

| Residual root cause and propagation | Reachability and disposition | Review |
| --- | --- | --- |
| braces<=3.0.3, GHSA-vfj7-8cjw-p6xm; chokidar/firebase-tools high propagation | Stack exhaustion requires deeply nested attacker-controlled glob. Latest registry braces remains3.0.3, no patched compatible version. CLI watches trusted fixed source/baseline paths; M1 has no uploads or caller-supplied filesystem/glob input. Runtime startup stays blocked until01b hardcodes allowlisted commands/paths and rejects arguments that introduce glob/config targets. Conditional local mitigation, not claim of safe public service | 2026-10-18 and before M1 close |
| @opentelemetry/core<2.8, GHSA-8988-4f7v-96qf; @google-cloud/pubsub moderate propagation | Unbounded W3C Baggage extraction. Pub/Sub is outside four-emulator allowlist; no pubsub runtime/client or incoming baggage extraction in M1. CLI package loads are not proof of reachability. Do not activate Pub/Sub/telemetry path; patched core2 crosses parent^1 range | 2026-10-18 and before any new integration |

These residual findings do not authorize cloud deployment. If a supposedly excluded path becomes reachable during01b/integration, stop it and remediate before continuing. High reviews the reachability/guard evidence. Dependency audit detects known advisories only; it is not malware/provenance certification.

## Evidence and preservation

Evidence lives under `.local/cache/`: `toolchain-evidence.json`, `npm-audit.json`, `npm-audit-final.json`, `dependency-lifecycle-scripts.json`, `baseline-copy-sha256.json`, official Node SHASUMS/archive and verified emulator jar. Local caches/modules/build/test outputs are ignored; private env/key material is ignored. This handoff has no Git repository, so commit/diff status is unavailable; no Git initialization performed.

One authorized faithful setup copy created `public-baseline/`: all39dist files plus FONT-NOTICES match source SHA256 individually and copied files have mode0444. Original dist/references/root firebase/source-content/font/vendor are untouched. No real credentials, Firebase login, account, billing/IAM or Firebase app/cloud API was used.

## Task01b guarded startup evidence

Native Node22 guard tests pass12/12 (`.local/cache/local-guard-tests.tap`). Tests reject wrong/demo-missing project aliases, absent/non-loopback emulator hosts, unknown config/hooks/routes, attacker-controlled watcher globs, proxy/credential/loader inheritance, arbitrary commands, private output symlinks including dangling links, remote fetch/TCP/HTTP/HTTPS before DNS, and unapproved Config paths. Server mode accepts CLI-discovery environment only with demo+Auth+Firestore and all four validated config endpoints; launcher mode additionally requires both project aliases and Functions/Hosting environment endpoints.

CLI children use task-owned XDG config/cache/data, usage=false, CI=1 and NO_UPDATE_NOTIFIER=1 before imports. HOME stays unchanged. Java uses existing Homebrew JAVA_HOME and its bin directory; the macOS /usr/bin/java stub did not resolve this installed JDK in the sanitized environment. Logs remain under .local by cwd and FIREBASE_DEBUG_PATH. Hosting5010 avoids the user's existing AirPlay listener5000.

Three narrow CLI adaptations are checked against15.33.0 and installed source hashes before loading the CLI; no node_modules files are edited:

- `emulator/env.js` SHA25667d2b363b2335f122193cf1a678a7b516f08321d19b8f415ca5b18bb3cf86a3b: exported getCredentialsEnvironment returns{} and rejects account input, preventing the unconditional ADC discovery probe. GoogleAuth, credential verification and CMS authorization are intact.
- `config.js` SHA256e0ffd09b3d65c180bd3e0a342801c8a014b211c47893566a6a64874b38480c04: Config.load accepts only the exact approved config file and supported projectDir ROOT. Its original read/validation/path traversal checks remain. Hosting independently uses config directory as cwd, so loaded hosting.public is derived from Config.path("public-baseline") and made relative to the exact config directory in memory. The fixed result ../public-baseline is required because Superstatic joins cwd+public; its target is the already verified absolute baseline, never caller traversal. No config source is rewritten.
- `deploy/functions/runtimes/node/versioning.js` SHA256d313a7a309f46329fbfc3b8e6bce18733693e30d1119d7ddaa3b508436d4a376: the exported getLatestSDKVersion lookup returns the setup-verified installed7.4.0 instead of spawning npm registry lookup during runtime. Export shape is asserted; checkFunctionsSDKVersion and supported minimum checks remain. This adapter does not establish the current remote latest version. Initial registry runtime attempt was blocked by the network fence.

Functions server validates the local boundary and installs its own network fence before createRequire loads Functions SDK. The actual CLI Node22 require(ESM) runtime cannot load top-level-await modules; deferred createRequire resolves this compatibility issue without early SDK loading. Future authorization/routes imports remain inside the async handler.

Residual braces reachability mitigation is now exercised: source/rules/public paths and ignore patterns are fixed allowlists; unknown keys/arguments fail closed. Proxy variables are excluded before CLI child startup. The Java process is not covered by the JavaScript fence; its configured/listened interfaces are loopback. Do not describe this as an OS-wide egress firewall.

Actual startup evidence: `.local/cache/emulator-startup.log`, `emulator-list.json`, `emulator-listeners.txt`, `api-smoke.json`, `vite-private-http-smoke.json`, `public-asset-smoke.txt`, and `task01b-sha256.txt`. Functions HTTP503 LOCAL_RUNTIME_UNAVAILABLE is the correct pending03 authorization result. Vite denied seven actual private requests403, including plain/raw/import/encoded workspace alias paths. Firebase CLI also starts Functions companion Eventarc9299 and Tasks9499 listeners on127.0.0.1 automatically despite --only four; no CMS handlers/client operations target those services. Hub4400, logging4500 and Firestore websocket9150 are loopback auxiliaries. UI remains disabled. Authorization, Rules integration, authenticated browser behavior and content success are not verified in01b.

Follow-up task03 wiring repair switches config to the committed deny-all infra-local/firestore.rules; missing bearer now returns401 and active fixtures receive exact session200. The installed gcp-metadata supported METADATA_SERVER_DETECTION=none returnsfalse before metadata probes; launcher and server set it before SDK loading. No GoogleAuth/credential verification override was added. Playwright browser path is fixed to .local/cache/playwright and test output to .local/test-results. Guarded combined task03 evidence in .local/cache/task03-combined.tap records10 actual Auth/Firestore/Rules/API groups plus12 guards and8 contract groups. Firestore rejects nested arrays, so validated seed Hero content uses storage-only contentJson under the actual256KiB persisted-envelope check; API/domain contracts remain content objects. Later05 codec must decode and strict-validate before use. Task04 browser QA remains separately reported, and authorized draft reads remain503 until05.

## Official sources checked

- https://nodejs.org/dist/index.json and https://nodejs.org/dist/v22.23.3/SHASUMS256.txt
- https://registry.npmjs.org/ exact package metadata (versions, engines, peers)
- https://docs.npmjs.com/cli/v10/commands/npm-ci/ and https://docs.npmjs.com/cli/v10/commands/npm-audit/
- https://firebase.google.com/docs/functions/manage-functions and https://firebase.google.com/docs/emulator-suite/install_and_configure
- https://github.com/firebase/firebase-tools/releases/tag/v15.33.0 ; installed npm artifact supplies actual Java/download constants
- https://vite.dev/guide/
- https://github.com/grpc/grpc-node/releases/tag/@grpc%2Fgrpc-js@1.14.6 and https://github.com/grpc/grpc-node/security/advisories/GHSA-m9gg-hp2v-232j

Additional remediation sources: https://github.com/patrickjuchli/basic-ftp/releases/tag/v6.2.1 ; https://github.com/patrickjuchli/basic-ftp/releases/tag/v6.2.3 ; https://github.com/uuidjs/uuid/blob/v11.1.1/CHANGELOG.md . Keep proxy sanitization even after FTP remediation.
