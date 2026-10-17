# P7 v3 — PDF output allocation v1

Status: APPROVED on 17 October 2026 by direct user reply: “Duyệt WebP 64 MiB trong tổng 96 MiB; tiếp tục P7 v3 (đề nghị)”. Only this output allocation change is authorized.

## Actual result

The approved native-runtime recovery is implemented and its exact runtime custody verification passed. Historical PDF job `5a4c6354-3173-4b27-b60e-f9b35122aa25` was retired through an authenticated OWNER recovery, with an immutable audit, retained originals/parts and unchanged retained-byte/version accounting. Its state remains RECOVERY_REQUIRED. The global slot was released through the canonical domain plan.

The new normal upload created job `259047bb-f62d-4bed-ac48-8c80bc01b182` under `M3-PDF-LOCAL-1`. The 17,349,548-byte credential has 48 pages. Native conversion wrote 38 page WebPs (32,597,900 bytes). Page 39 would exceed the profile's aggregate WebP cap of 33,554,432 bytes. The worker refused with PDF_WEBP_LIMIT after 63,385 ms. Its private receipt records exit 1, close=true, reaped=true and remainingPids=[]. Peak observed RSS was 561,774,592 bytes; scratch was 51,524,682 bytes. No READY was written.

Evidence: `.local/test-outputs/p7-v3-final/pdf-local-output-limit.json` and `.local/media-scratch/m3/worker-348d98b0-6826-4525-a2c0-f73ef094d9ad/attempt/receipt.json`.

Seed remains BLOCKED at 5/28 READY media, 0/72 newly imported locale records. No new Publish or CMS website activation ran. :4189 retains the prior QA artifact. No repeat attempt will run with the same 32 MiB cap.

## Proposed correction

Register a separate immutable `M3-PDF-LOCAL-2` PROGRAM/profile. Increase only aggregate page-WebP allowance from 32 MiB to 64 MiB. Preserve 48 pages, 1600px raster edge, 4,000,000 pixels per page, lossless sRGB/RGBA, raster-only reconstructed PDF, pixel verification, 64 MiB PDF-download cap, **96 MiB combined derivatives**, 256 MiB scratch, 768 MiB RSS, 120-second deadline, two threads and all existing upload/quota/version caps. This reallocates output capacity inside the existing combined budget; it does not promise that the credential will fit until the actual bounded attempt completes.

Preserve R0, LOCAL-1, their native inventories, programs, history and failed attempts. Do not change the hash or recipe on a frozen job. Using the completed native-attempt quiescence fact and retained-storage readback, retire only the LOCAL-1 failed credential job through the audited application service and canonical slot/reservation plans. Keep all retained bytes/history. Create one new normal upload with explicit lineage and LOCAL-2 bindings, then resume the existing seed.

Complete the remaining media/content, normal local Publish, immutable CMS release on :4189 and the remaining single UI/lifecycle campaign. Do not rerun unrelated checks or historical harnesses. If any original combined/quota/RAM/time limit is reached, keep the criterion open and report the exact evidence instead of increasing another bound.

Boundary: solo, repository-local; no :5010 activation, no cloud, no original-backup changes, no auth/role changes and no quota reset.

## Decision

Approve the separate profile and this bounded correction, or retain the current limits and keep credential/seed blocked. No source truncation, lossy substitute or raw-PDF public fallback is proposed.

## v2 — resolution decision after actual 48-page conversion

Status: APPROVED by direct user reply on 17 October 2026: “Duyệt raster 1280px, giữ mọi trần hiện tại (đề nghị)”. LOCAL-2 ran once with approved 64 MiB WebPs and unchanged 96 MiB combined cap. All 48 pages converted to 39,528,268 WebP bytes. The native process then refused PDF_OUTPUT_LIMIT and exited/reaped fully. Read-only size reconstruction from those existing lossless WebPs, without native reexecution, measured a 78,299,784-byte raster PDF and 117,828,052 combined bytes. Both the 64 MiB PDF-download cap and 96 MiB combined cap are exceeded. Exact size evidence: `.local/test-outputs/p7-v3-final/pdf-output-sizes.json`; native attempt: `.local/media-scratch/m3/worker-965451dc-5532-4732-8cc3-57cd3fcb7706/attempt/receipt.json`. No READY, new content import or publication followed.

Proposed separate LOCAL-3 profile: reduce the raster edge from 1600px to 1280px (20 percent fewer pixels per edge), keep all 48 pages, lossless WebP, fresh raster-only PDF, per-page/full-output pixel verification and all current byte/RAM/scratch/time/quota caps. The private original remains unchanged. Public page images and the raster PDF have lower resolution; text at high zoom may be less sharp. No claim that the new size fits until one actual bounded processing attempt completes.

Retire the failed LOCAL-2 job only using its persisted worker quiescence and pinned native receipt, through the same audited canonical domain plans. Preserve its history and retained bytes. Process the 27 independent media while credential is held. Do not publish a partial release. After approval, bind a new normal credential upload to LOCAL-3, finish all seed records and the remaining local publication/UI acceptance path. Preserve LOCAL-1/LOCAL-2/R0 records and pins.

Decision: approve the 1280px public raster profile within existing caps, or preserve 1600px and leave credential blocked. No further cap increase or source truncation is proposed.
