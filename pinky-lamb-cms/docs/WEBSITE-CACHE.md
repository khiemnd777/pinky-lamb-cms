# CMS website cache

## Current behavior and scope

- The public website at `127.0.0.1:4189` follows `.local/p7-v3/website-current.json`. A historical release without `cacheVersion: 1` still returns `Cache-Control: no-store`.
- A new approved release stores content-addressed resources at `/assets/cache/<sha256>.<extension>`. Those URLs return `public, max-age=2592000, immutable`. Stable resource aliases and all errors remain `no-store`.
- HTML and `sitemap.xml` return `public, no-cache` with a content ETag. A matching `If-None-Match` returns `304` only after the release bytes are checked. The CMS API and private preview remain `no-store`.
- Publication retains prior artifact identities in the website pointer. The server can resolve old hashed resource URLs after a publish or rollback. The history limit reserves one slot for rollback; reaching the limit blocks another publication until a separate retention plan is approved. Do not delete old release directories while they are referenced.

## Firebase Hosting package

The adapter in `scripts/prepare-firebase-hosting-package.mjs` reads the current approved website pointer and its retained artifacts. It checks manifests and bytes, writes a dedicated package under `.local/exports/firebase-hosting/<run-id>/`, and writes `firebase.json` in that package root. It does not change the repository root `firebase.json`, publish, or deploy.

From the CMS directory, after a versioned approved local release exists:

```sh
.local/cache/node/node-v22.23.3-darwin-arm64/bin/node scripts/prepare-firebase-hosting-package.mjs --run-id <unique-id> --origin https://pinkylamb.com --indexing noindex
```

The generated `firebase.json` uses `public` relative to the package root. Run any later Firebase Hosting command from that root with the exact approved production project and site. Deployment and production project selection need separate authority. The package carries current public files and retained hashed resources; it excludes private manifests and source bundles.

`noindex` is the default. `--indexing index` changes the HTML robots tag and removes the `X-Robots-Tag` block in the generated config. Choose `index` only after production canonical URLs, sitemap, content, and locale routes have been accepted. The adapter replaces exact local canonical URLs with `https://pinkylamb.com/` and rejects local URLs left in public HTML or sitemap.

After an authorized deploy, verify `GET` and conditional `GET` for `/`, `/vi/`, `/ja/`, and `/sitemap.xml`; verify both current and retained `/assets/cache/...` URLs; inspect `Cache-Control`, ETag/304, canonical URLs, and robots behavior over the actual Firebase Hosting domain. Source tests do not prove CDN behavior or production indexing.

## Local publication check — 2026-10-19

Human scope: publish one new local CMS website release, inspect `:4189` with HTTP and a browser, and exercise rollback. The human separately authorized restarting only the `:4189` listener. No Admin, emulator, Git, or production action was authorized.

- The frozen source `cms-mvet72sd-cf5c7e5b-1` had no cache version. A preflight compared its SHA-256 pinned release source and retained media with the new export. The snapshot set hash stayed `9ea072c0934d126b68c6776782030ef8050cf51aa0290505d11d3d32def59022`, and visible text across EN/VI/JA stayed unchanged.
- Published `cache-20261019-a9c65bf9` with manifest SHA-256 `bd2a66b0a8cb3efe367976cf37a97de818f91e130d1f9b44c688b8dbdc5650f6` to the local website pointer. The release has 88 physical files and 66 cache aliases.
- Observed HTTP `200` then conditional `304` with matching ETag for `/`, `/vi/`, `/ja/`, and `/sitemap.xml`. A hashed PNG returned `public, max-age=2592000, immutable`; its stable alias and a missing hash returned `no-store`.
- Rolled back through `previousWebsitePointer` and `writeWebsitePointer`, the same pointer operations used by the CMS rollback command. HTTP body hashes for EN/VI/JA matched the recorded pre-publication hashes; the superseded hashed asset still returned `200`. The browser loaded the old `styles.css` route.
- Restored `cache-20261019-a9c65bf9` as the active local release. HTTP again returned `200`/`304` for all three locales. The browser loaded hashed CSS and JS for EN/VI/JA and showed no broken images. The final browser image is `.local/test-outputs/cache-publication/final-4189.png`.

Human acceptance (2026-10-19): Khiêm reviewed and accepted the active local `:4189` release `cache-20261019-a9c65bf9` (manifest SHA-256 `bd2a66b0a8cb3efe367976cf37a97de818f91e130d1f9b44c688b8dbdc5650f6`). This acceptance covers the local result above; production release and indexing remain separate decisions.

The Admin `:5273` listener was unavailable during rollback, so the Admin UI rollback route was not exercised. The local website listener was started alone with the durable local runtime. This check changes cache URLs and HTML bytes; it does not change editorial copy. Firebase Hosting behavior and production indexing remain unverified.
