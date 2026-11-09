# A208 — Daily Diary Word-style narrow margins (2026-11-09)

## Source of the request
User screenshot, Chrome print panel:
- Printer Epson ET-2800, paper size **Letter**, margins **Default**.
- Live ASSPS diary grid emits A4 portrait (or 12-up landscape) and independently uses a 4 mm print-iframe page inset, 5 mm preview inset, and 3 mm 12-up special case.
- User wants *page-edge whitespace removed*, like a Word Narrow Margins option, not merely smaller fonts or added page-density modes.
- 10 sheets in screenshot is consistent with 56 students at the selected 6-per-A4; margin changes alone cannot halve it.

## Implemented
- Dedicated, visible page-margin options **Normal 5 mm**, **Narrow 3 mm** (default for new local drafts), **Minimum 2 mm** (physical printer clipping caution).
- Options use React state and tenant-scoped draft persistence; selected value is also included in saved diary style_settings and restored on reopening.
- Common page box variable --dd-page-margin-mm used by preview, portrait and landscape. Isolated Print/PDF iframe uses the same state, with variable also copied in each page's inline style.
- Narrow/Minimum also reduce intercard gap to 1.2 / 0.8 mm while preserving branding, subject tables, all entries and A206 divider integrity.
- Clear visible instruction to choose **A4** and **Margins → None** in Chrome print dialog; page JavaScript cannot force hardware printer paper/margins.
- No backend schema migration, academic record change, font scaling, or other modules affected.

## Regression
- Vite production build: PASS.
- Automated browser test covering 8 distinct premium template structures × 3 margin settings × 2 page modes (6-up portrait and 12-up landscape): 48/48 pass, zero detected clipping, accurate computed padding and expected sheet counts.
- Isolated print iframe: 6-up and 12-up confirm computed 3 mm inset and accurate A4 geometry, no card overflow.
- Candidate bundled module import and independent stylesheet smoke: PASS, computed 3mm.
- A207 live preserved for rollback, release staged with new JS/CSS and index reference only.
- Potential printer nonprinting edges: a 2 mm margin is not guaranteed on every physical model; use 3 mm for normal printing. Physical paper output not independently checked.

## Production outcome
A208 promoted at 2026-11-09T17:35:06Z. Nginx syntax and reload PASS, origin JS/CSS HTTP 200, public Cloudflare page references A208 JS/CSS, public stylesheet HTTP 200. A207 preserved for rollback. No backend/database changes. Browser Paper size A4 and Margins None must still be selected manually; Epson nonprinting margins are hardware dependent.
