# Credential provenance

Paths in this folder are relative to the handoff root `pinky-lamb/` unless stated otherwise.

- `dist/assets/Pinky-Lamb-Credential-2026.pdf` is the sole PDF copy. It matches the existing downloaded PDF byte-for-byte.
- `references/credential-provenance/credential-extracted.txt` preserves the original text-layer extraction. Rasterized titles, logos, and some content are missing from this text; inspect the PDF for complete page content.
- `references/credential-provenance/selected-manifest.original.json` preserves the historical selected-image manifest byte-for-byte. Its absolute `path` values describe the original workspace and are not portable links.
- `references/credential-provenance/path-map.json` maps those historical paths to files included in this handoff.
- `references/credential-provenance/selected-object-provenance.json` includes only the selected image objects and their recorded page placements. `historical_raw_path` is evidence, not a path expected to exist in the handoff.
- `references/asset-manifest.json` is the current inventory. It records hashes, dimensions, source categories and uncertainty for every packaged reference and reused runtime asset.
- `source-content.json` is a provenance and source-content record. Its `assetFiles` keys refer to selected extraction basenames; resolve them through `path-map.json`. Runtime content in `dist/content.js` is maintained manually. There is no build or generation linkage from `source-content.json` to `dist/content.js`. The website uses WebP derivatives from `dist/assets/`.

## Exact source categories

Supplied original files are existing downloaded brand PNGs, the uploaded mascot PNG, and the original 1080p showreel. Credential images are full-size embedded PDF extracts, not camera originals or editable design masters. Some PNGs had their PDF alpha masks restored during the earlier extraction. JPEG video frames are extraction derivatives. WebP images, favicon, 720p video, and WOFF fonts are existing runtime assets.

## Selection and known omissions

All 35 preselected credential image files are represented: 34 are in `references/credential-selected/`; the small round badge is in `references/brand/`. Their combined size is 4,325,616 bytes. All 35 match the previous raw extraction outputs by SHA-256, and their dimensions and page/xref mappings agree with the saved manifests.

The 48 rendered pages, bulk raw extraction pool, contact sheets, deployment/account screenshots, archives and duplicate web-ready assets are excluded. `showreel-poster.jpg` is byte-identical to `poster-38.jpg`; only `references/video/showreel-frame-38s.jpg` is included.

No official HEX palette, font mandate, or logo clear-space specification is established by these raster references alone. Website design tokens and font choices must remain labeled as implementation decisions.
