# M3 dependency and native-tool evidence

CMS-M3-01 setup identity is complete pending final High review; **PDF security is HOLD**. The exact JavaScript dependency additions and bundled Poppler identity audit are complete. The isolated OpenPGP setup and actual detached signature verification pass. Independent High checkpoint V passed and the FFmpeg 9.0.2 local build completed. This document does not authorize task 02 or media processing.

## Approved dependency additions

The root workspace and `cms-api` declare exactly `sharp: 0.35.5` and `pdf-lib: 1.17.1`. The npm lock adds 34 entries; macOS arm64 installs 11 packages. All existing package versions, resolved URLs and integrity values remain unchanged. Existing `detect-libc` 2.1.2 changes from development-only to a production dependency because Sharp uses it.

Both package tarballs match the registry SHA512 integrity and SHA1 metadata. Archive inspection found no path traversal or links. Neither package declares preinstall, install, postinstall or prepare scripts. Lock resolution and installation use pinned Node 22.23.3/npm 10.9.9, scripts disabled, an isolated npm cache, `/dev/null` userconfig and an owned empty globalconfig. No global install, upgrade or audit fix ran.

Sharp native identity is 0.35.5 with libvips 8.18.7. Its installed formats and linked library versions are recorded in `.local/cache/m3/task01-npm/native-identity-final.json`. Sharp is Apache-2.0; pdf-lib is MIT. The installed file inventory pins package license texts and native binaries. No image/PDF processing test ran: task 02 owns those tests.

Fresh npm audit reports 0 critical, 3 high and 2 moderate findings. Audit exit 1 indicates those findings, not a clean audit. Exact advisory paths and metadata are retained in `.local/cache/m3/task01-npm/audit.json`. No recommendation or permission to upgrade follows from this audit.

## Bundled Poppler

The existing Codex native runtime 26.1009.11318 supplies Poppler 26.05.0, package specification `poppler=26.05.0=hd83632c_3`. Both bundled `pdfinfo -v` and `pdftoppm -v` report 26.05.0. The audit pins 4,713 regular files and 1,268 symbolic links, including wrapper scripts, binaries, libraries, configuration, resources and existing license texts. The linkage report covers 93 regular dylib/binary paths. All `otool -L` commands succeeded; no non-system absolute dylib reference was found.

The bundled core Poppler license text is absent. The official `poppler-26.05.0` source-tag COPYING text was retrieved read-only into the generated evidence cache and its bytes are pinned in the tool lock. Four other dependency license texts exist in the bundle. This is an evidence/distribution limitation; no claim of complete license compliance is made. The bundle remains read-only. Its pkgconfig files contain the original build prefix. Default fontconfig references system and user font directories. Task 02 must configure isolated font/font-cache paths before processing untrusted PDFs; this identity audit does not prove resource isolation or safe PDF processing.

## FFmpeg signature and build gate

The [official FFmpeg download page](https://ffmpeg.org/download.html) provides version 9.0.2 source and detached PGP signature. Source, signature and release public key were downloaded into the owned M3 cache. The expected official release signer fingerprint is `FCF986EA15E6E293A5644F10B4322F04D67658D8`.

Before M3-TOOL-01 approval, no existing maintained verifier was found in the approved standard binary locations, GPGSuite locations, bundled native/bin directories or workspace/bundled Node module trees. The exact searches are retained. No user keyring or account configuration was read. At that historical pre-amendment stage, the source had not been extracted, configured, compiled or executed. Download SHA256 pins prove retained bytes only; they do not replace signature verification.

The direct human Approved M3-TOOL-01 amendment supplies the isolated maintained library and bounded task 01Vb adapter; signature and negative tests now pass under default policy. A custom OpenPGP parser, skipped signature check, third-party FFmpeg binary or alternate FFmpeg version is not permitted. The bounded maintained adapter now verifies the exact retained official source signature. The planned build remains exact 9.0.2 with Apple VideoToolbox and no automatic third-party codec discovery. The subsequent native build and identity audit are recorded below; media fixtures remain **NOT_RUN**.

## Evidence and limits

`contracts/media-tool-lock.json` records setup identity completion with PDF security HOLD. The preimplementation archive is `.local/cache/m3/task01-preimplementation/relocation-index.json`. Package, native inventory, download and audit files remain under `.local/cache/m3/`.

An initial identity harness tried the unexported `sharp/package.json` package subpath and failed with `ERR_PACKAGE_PATH_NOT_EXPORTED`. The corrected identity harness reads that installed JSON file directly and succeeds. An initial archive-path oracle rejected the tar root directory `package`; the corrected oracle permits only that root and its descendants and passes. Neither harness failure changed package bytes or executed lifecycle scripts.

No emulator reset, reseed, source baseline change, cloud operation or media-pipeline application change occurred. This is local setup evidence only. It is not M3 acceptance or LOCAL_COMPLETE.

## Approved M3-TOOL-01 — task 01Va

OpenPGP.js `openpgp` 6.3.2 is installed only under `.local/tools/m3/source-verifier/`. Its independent nested package/lock is outside the application workspace membership. Explicit npm prefix, `--workspaces=false`, owned npm config/cache and scripts-disabled install/frozen `ci` preserve that boundary. No application package declaration or lock changes occurred in this amendment.

The exact approved tarball matches SHA512 integrity and contains 43 files. Inspection rejects traversal, links and special files. The package's `prepare` command would build JavaScript/types, but it was not run. No runtime/optional dependency exists. The actual optional peer is `@openpgp/web-stream-tools` ~0.3.0 for TypeScript types; `--omit=peer --omit=optional` leaves exactly one installed package and does not install TypeScript or the peer.

The installed inventory pins 43 byte-identical package files plus npm's hidden lock file, with exact directories and no symlink/hardlink. The inventory is retained at `.local/cache/m3/verifier-setup/installed-package-inventory.json`, SHA256 `d7bf54e896c7935fe176899bd68d592bc27bf689c824462e2077efe3209962e1`. Task 01Vb must verify this trusted prior-stage digest and every installed byte/path before dynamic import. Recomputing an inventory from modified package files is not an integrity check.

The package includes its LGPL-3.0+ LICENSE text. The [maintainer release](https://github.com/openpgpjs/openpgpjs/releases/tag/v6.3.2) identifies exact 6.3.2. [GHSA-8qff-qr5q-5pr8](https://github.com/openpgpjs/openpgpjs/security/advisories/GHSA-8qff-qr5q-5pr8) affects up to 6.1.0 and was patched in 6.1.1; it describes an inline-signature issue and states detached verification is unaffected. This narrow advisory review is not a claim that all vulnerabilities are absent.

Fresh isolated `npm audit --json` exits 0 with no known advisories. `npm audit signatures --json` exits 1 with “found no dependencies to audit that were installed from a supported registry”; the output is retained and registry signature verification is **not verified**. Registry metadata signatures are retained but are not relabelled as successfully verified. No audit fix, upgrade or additional dependency ran.

Task 01Va did not import OpenPGP or run verification. Task 01Vb subsequently ran verification only. Independent High checkpoint V subsequently passed before source extraction and the original task 01 build resumed.

## Task 01Vb — actual signature verification

`scripts/verify-ffmpeg-source.mjs` checks the prior trusted inventory SHA256, both isolated package manifest pins and every one of the 44 installed file paths/bytes before dynamic import. Unknown files, links, hardlinks, wrong manifests and modified bytes refuse. The trusted digest is a source constant from reviewed task 01Va; the verifier does not regenerate authority from current installed bytes.

The fixed CLI reads only the original SHA-pinned source/signature/public key. Every path ancestor is checked; regular single-link files and no-follow opens are required. File size is checked before reading: source 32 MiB, key/signature 64 KiB each. The parent runs a fixed IPC child with 256 MiB Node old-space, a 30-second timeout and 64 KiB limit per output stream. Direct internal-worker invocation and arbitrary CLI arguments refuse. These are process controls, not an OS sandbox or a proof of total RSS.

The maintained [detached-signature API](https://github.com/openpgpjs/openpgpjs#verify-detached-signatures) receives unchanged binary source bytes. It reads the armored key/signature, requires primary fingerprint `FCF986EA15E6E293A5644F10B4322F04D67658D8`, and verifies exactly one signature from that key. Every returned verification promise is consumed. No date or cryptographic configuration override is supplied. Actual official verification returns signer key ID `b4322f04d67658d8` and matches all three approved download digests.

Nine standalone Node test groups pass. They cover the official signature, a one-byte source alteration failing actual detached crypto with the original valid signature/key, altered/truncated signature, a different valid ephemeral public key and fingerprint, missing/directory/outside/oversized inputs, symlink/dangling/ancestor links, a copied tampered package containing an executable sentinel blocked before import, an unknown extra installed file, CLI argument/internal bypass refusal, and two genuine signature packets failing the exact-one policy. The ephemeral negative key is not persisted and uses no account/keyring. The source/hash-pin check is distinct from the actual cryptographic alteration test.

The initial missing-module test failed as expected before implementation. The initial eight groups passed; the final nine groups and focused lint pass after the additional wrong-valid-key/exact-one oracles and manifest checks. The final fixed CLI also exits 0. Actual command times, retained logs, original downloads, trusted installed inventory and source pins are bound by the task 01Vb evidence index. Verification performs no downloads or external network operations and does not extract/build/execute FFmpeg. Vite remains stopped after the independent private setup audit; this slice does not repair or restart Vite.

## Original task 01 resumed — signed-source native build

The fixed verifier passed immediately before extraction. Archive inspection found 10,525 members: 10,399 regular files and 126 directories, with no traversal, links or special files. All 10,399 original signed-source file hashes still match after building. The prebuild archive preserves exact prior lock/document/Vb/High observation bytes.

Final configure, make -j2 and make install exited 0. Compilation took 29.489 seconds; installation took 0.521 seconds. Apple clang 21.0.0 (clang-2100.0.123.102) and SDK 26.4 built static FFmpeg/ffprobe 9.0.2. Network and autodetection are disabled. Both binaries list only file/pipe protocols and H.264/AAC input decoders. VideoToolbox H.264, AAC and built-in null output are enabled. The initial configuration was archived before adding null muxer and its wrapped_avframe/pcm_s16le output requirements. No extra external dependency was installed.

The installed inventory pins 193 regular single-link files, including two binaries and seven static libraries. Signed-source license files, generated configuration, compiler identity and command logs are pinned. Linkage references only Apple system frameworks, libSystem and system zlib. System dyld-cache bytes are not independently pinned; linkage identities and SDK version are recorded. Configuration is LGPL 2.1 or later without GPL/version3/nonfree flags. No complete distribution-license compliance claim is made.

Retained warnings include missing pkg-config (explicit system zlib/framework detection succeeded), unused static functions, empty-symbol ranlib notices and restricted-environment Xcode cache warnings. Ten identity/capability-list commands exited 0. No media input was decoded or encoded. Listed h264_videotoolbox is not operational hardware-encoding proof; that belongs to task 02.

## PDF security HOLD

[Ubuntu CVE-2026-102621](https://ubuntu.com/security/CVE-2026-102621) identifies SplashClip::clipToPath integer overflow through Poppler 26.08.0, fixed upstream in 26.09.0 (patch 323c91036d99926a8b90dc14329f7b40aece22f8). The exact bundled 26.05.0 hd83632c_3 build has no available patch manifest/source cache proving this backport. Its identity remains unchanged. Untrusted PDF processing is HOLD pending approved proof or revision. No attack PDF or automatic upgrade/fallback ran. Overall native security PASS is not claimed.

Vite remains stopped after the private tool-lock exposure audit; Auth/Firestore were not reset or altered. Historical partial, Va, Vb and High checkpoint indices remain immutable. The final task 01 index supersedes only current owned lock/document status and does not authorize task 02.

## Scoped task 01 correction — trusted lavfi fixture decoders

Task 02's first actual fixture failed with exit 234: the lavfi color stream uses wrapped_avframe but that built-in decoder was not compiled. The same approved task 01 build configuration now adds only wrapped_avframe and pcm_s16le decoders for trusted generated lavfi fixtures. Configure/build/install and ten identity/capability lists passed again. No external library, version, source or application dependency changed. Accepted upload input policy remains forced MOV with h264,aac codec whitelist, file/pipe protocols and disabled external data references/absolute paths. Compiled internal fixture decoders are not an accepted upload format.

Before any overwrite, the relocation archive copied all original 267 pins plus their index (268 files), including the entire 193-file installed tree, old binaries/static libraries, generated configuration and lock/document bytes. Original signed source still matches all 10,399 pins. New build evidence is unique under .local/cache/m3/task01-fixture-rebuild/. Historical indices retain their original bytes and refer to recoverable archive copies for overwritten tool/configuration paths. No media fixture was run in this correction; task 02 resumes only after review. PDF security remains HOLD.


## Approved M3-PDF-02 — task 01Ph selective headers

Exact development artifacts `freetype-2.14.3-hce30654_0.conda` (173,313 bytes) and `zlib-1.3.2-h8088a28_2.conda` (81,123 bytes) match the approved SHA256 pins. TLS verification stayed enabled. Initial normal DNS resolution failed; exact reviewed native curl downloads succeeded. Publisher cryptographic signatures remain **NOT_VERIFIED**.

Existing pinned Zstandard 1.5.7 decoded both info/payload streams under a 30-second timeout, 32 MB memory-window cap, 32 MiB output cap and 64 KiB stderr cap. Existing Python 3.13 standard ZIP/TAR readers inspect raw members; no new reader/codec was installed. System libarchive native Zstandard support returned WARN and was not used as an external-helper fallback. Safe inventories reject actual TAR hardlinks/special/traversal/duplicates/escape/cycles; skipped dylib-alias symlinks are inspected lexically without materializing or dereferencing their targets.

The fresh isolated prefix `.local/tools/m3/pdf-tools/headers-01Ph/` contains 55 byte-identical FreeType headers, two byte-identical zlib headers and two relocated `.pc` files and three byte-identical original license notices only. Runtime metadata matches exact existing libfreetype 2.14.3 hce30654_0, libfreetype6 2.14.3 hdfa99f5_0 and libzlib 1.3.2 h8088a28_2. No static library, dylib, executable, package script or symlink was installed. The payload TARs contain three original `info/licenses` notices outside `info/paths.json`: FreeType GPLv2/FTL and zlib LICENSE. These regular notice bytes are copied unchanged; complete original info/payload archives and recipe notices remain retained. The initial info-only license oracle was corrected with an immutable addendum. No complete distribution-license compliance claim is made.

The `.pc` changes only prefix/include/library locations. Missing unversioned linker aliases are replaced by exact existing absolute `libfreetype.6.dylib` and `libz.1.3.2.dylib` locations; no host `-l` fallback or new alias is allowed. Actual isolated pkgconf `--cflags`, `--libs`, `--static --libs` and variable outputs match the fixed owned headers and pinned existing dylibs. FreeType's original pkgconfig version **26.6.20** is preserved; actual header macros identify library version **2.14.3**. Requires/private libs remain empty and unchanged.

Installed byte inventory, all-member metadata equivalence, original-to-transformed PC receipts, actual parser results and runtime preservation evidence are under `.local/cache/m3/pdf-tools/01Ph-headers/`. Status is **SELECTIVE_HEADERS_INSTALLED_PENDING_INDEPENDENT_HIGH_HEADER_GATE**. Original01Pa compiler/configure/build, implicit-root correction, closed linkage/font/security gates and01Pb native PDF fixtures have **NOT_RUN** in this task. Independent High header PASS must precede resumed01Pa. No emulator/Auth/Firestore/Vite mutation, M4, production or Git operation occurred.


## Original 01Pa resumed after High header PASS

Independent High `PASS_HEADER_ONLY` released the original approved 01Pa setup. The prior 01Ph lock/document bytes are archived in `.local/cache/m3/pdf-tools/01Pa-resume-headers/preimplementation/`; `source-relocation-index.json` maps historical mutable-source pins to those unchanged copies. Old 01Pa/01Ph indices, source archives and evidence remain immutable.

Before configure, actual C/C++ `-E -v` searches and `-M` dependency probes use `-nostdinc` / `-nostdinc++`, exact clang21 builtin headers and SDK26.4 includes, including SDK `usr/include/c++/v1`. The unapproved Xcode toolchain `usr/include` is excluded. Final CMake implicit include records and generated command paths agree. After building, all 131 actual `.o.d` files contain 1,466 distinct dependency paths within source/build/pinned bundle/owned headers/approved builtin+SDK roots. No expat development header or unapproved implicit root is consumed.

The existing Fontconfig/Cairo private pkgconfig graph lacks expat metadata. No expat PC/header was invented, Requires field removed, dependency downloaded or source patched. The upstream-supported direct FindCairo cached-location branch and FindFontconfig header-derived version path resolve exact pinned headers/libraries; actual Cairo header version1.18.4 and Fontconfig2.18.0 satisfy the required minima. A narrow owned LCMS-only PC root performs verified location relocation. Missing private metadata is not relabelled as a fully resolved PC graph. Existing libexpat remains a pinned dynamic runtime dependency. `POPPLER_DATADIR` uses the supported CMake variable bound to the exact existing pinned bundle resources; no resource copy/download occurs.

Final configure exits0. The fixed build runs only `pdfinfo` and `pdftocairo` targets with a static core and parallel2; it exits0 in33.383seconds. No install-all runs. A new isolated prefix `.local/tools/m3/pdf-tools/poppler-26.10.0-cairo/` contains two byte-pinned utilities, the static core, original COPYING/COPYING3/COPYING-CMAKE-SCRIPTS notices and a private fontconfig/cache. Both utility `-v` commands report26.10.0. Recursive otool covers14 non-system nodes; identity-only DYLD loader traces show no outside bundled/owned/Apple system paths. Apple system dyld-cache bytes are not independently pinned. Actual private fc-list/fc-match report31 existing bundled font files only. These checks do not prove all OS filesystem access or native PDF font behavior.

Mandatory PNG/JPEG/JPX/LCMS/Fontconfig/FreeType/Cairo features stay enabled. Brotli/HarfBuzz/network/TIFF/NSS/GPG/wrappers/tests and all approved exclusions remain unchanged. Compiler sprintf deprecation warnings, absent upstream test data and optional Gettext metadata warnings are retained; no source patch or decoder-diagnostic suppression was used. Original source864 regular files and previous bundled/Sharp/FFmpeg/verifier/report/custody byte pins remain unchanged.

Fresh advisory/source-control evidence preserves retained SplashBitmap/shared-core limits and CVE-2026-107705 caller-password/R6 caveats. The future fixed job supplies no caller password/API; encrypted/R6 empty-password refusal and warning-exit0/Brotli/adversarial/resource cases still require01Pb. SHA pins are not publisher signature verification. Setup is **REVIEW_READY_PENDING_INDEPENDENT_FULL_HIGH_SETUP_GATE**; no PDF input was rendered, no01Pb/test03 graph was opened and no PDF capability/security/M3 acceptance claim follows. All emulator/Vite/data actions, M4/production/Git remain untouched.


## 01Pa correction — ordinary read-only font cache policy

The initial private font cache and XML were owner-writable; rescan0 did not prohibit writes. The cache/config byte hashes remain unchanged. Exact owned single-link XML/cache files now use0400; their private config/cache directories use0500. No bundled/root/baseline/other-owner permission changed. Exact existing cache name, ancestor ownership/types, no symlink, no extra/missing files and before/after modes are recorded in the unique `.local/cache/m3/pdf-tools/01Pa-readonly-cache/` supplement.

Fixed trusted `fc-list` and `fc-match` run again under the same private config after policy enforcement. Both exit0 with zero stderr under bounded30second/64KiB logs; no native diagnostics are suppressed. XML/cache bytes and filenames remain unchanged after execution; all reported font paths remain in the pinned bundle. This establishes ordinary native read-only cache behavior, not a hard OS sandbox, protection against every malicious process, or native PDF behavior. No PDF input, rebuild,01Pb or emulator/Vite/data operation ran. Prior Pa/Ph source bytes and indices remain immutable via explicit custody/relocation maps. Independent High full setup gate is still required before01Pb.
