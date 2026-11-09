# A207 — ASSPS Daily Diary A4 Capacity / Narrow Print Audit

## Screenshot-derived defect
- Screenshot shows Epson ET-2800 print paper setting Letter despite the app CSS sized A4 portrait. Website CSS cannot reliably override the user's printer paper dropdown.
- Live Diary supports 2,3,4,5,6,8,10 cards per A4; simply shrinking fonts risks Urdu/Nazra and long homework clipping.
- Eight distinct premium Studio layouts, eight light palettes, saved data, student identity, and A206 2px grid separators are preserved.

## Architecture
- 12-up is opt-in, A4 landscape 3 columns x 4 rows, with card width near 10-up portrait.
- Keeps 10-up font scale (.69), trims redundant metadata: class in student strip, date in calendar, school branding and text remain visible.
- Cross-template CSS uses :has(.dd-density-12); 2..10 page modes unchanged.
- Print iframe @page and page dimensions switch based on density; 12-up A4 landscape, others A4 portrait.
- Guidance appears in the UI. User must select A4 and correct orientation in Chrome/Epson print dropdown.
- Print blocks overflowing cards (no silent truncation); existing save/reopen schema and backend unchanged.

## Verified
- Vite production build PASS.
- 55 synthetic students, 5 subjects, 8 designs, 12-up: 5 landscape sheets, zero card/page overflow; 2px separators.
- Isolated print iframe: 55 cards, zero task/name clipping; PDF with 5 page refs, MediaBox 841.92 x 594.96 pt.
- 64 design x color configurations using Urdu and Nazra script: 64/64 pass, zero clipping.
- Screenshot Letter vs A4 remains a printer setting. Explicit warning rather than false enforcement.
- A206 unrelated legacy test/guard baseline mismatches were previously diagnosed, and are outside scope.
- A206 retained as rollback. Assets isolated with hardlinked staging; no other modules modified.

## Production release
A207 activated on 2026-11-09 17:15:27 UTC; Nginx passed validation and reload. A207 JS/CSS origin HTTP 200. A206 retained as rollback. No database mutations. Chrome/Epson physical printing still needs user verification with A4 selected.
