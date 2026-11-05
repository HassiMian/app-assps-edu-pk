# ASSPS A203 — Premium Daily Diary preservation, minor print repairs

Date: 2026-11-05
Live: https://app.assps.edu.pk/paper-generator
Current release: /var/www/assps-releases/assps-diary-a203-premium-minor-20261105
Rollback: /var/www/assps-releases/assps-diary-safeprint-failclosed-20261105
Nginx rollback: /root/secure-archive/assps-a203-premium-preserving-release-20261105/apex-app-ssl.before-a203

## User requirement: restore the actual premium layout

The user rejected prior A201/A202 oversized black/slate grid treatment. Those production roots were rolled back, and A203 starts from the earlier A200 premium and safe-print module (not from A201/A202). All eight premium designs, pastel palettes, school branding, typography and original table width/margins remain intact.

## Root-cause observations

1. The premium table header and its body outer boundary were already aligned. The previous A202 assumption that each inner row's natural ~1px border inset was a 9px offset was wrong and caused unnecessary structural rewriting.
2. Some original row dividers measured only 0.6px in the print CSS, potentially falling below print raster visibility. Eight editions intentionally differ: some use each next row's top border, while Nordic/Letterpress use the preceding row's bottom border. Preserve those edition differences; do not force a new border frame.
3. Original roll metadata printed ROLL: Roll MIG26-001 rather than a single ROLL: MIG26-001.
4. Latin text "URDU" was classified as Urdu-script by the old rendered subject classifier, so it received a different font family.
5. Some footer decorative top lines were redundant next to table endings and could look like duplicated strokes.
6. Monogram edition's original 2mm accent left BORDER offset the heading divider from the body. Replaced border with same-color 2mm inset stripe to preserve the visual design and align the two columns.

## Surgical changes

- Add a density marker to the printed diary card; only premium Studio 8-up activates A203 CSS.
- Reduce calendar width from 17.5mm to 16mm and min height from 16mm to 14.5mm at scale, trimming internal padding/margins but preserving its font sizes and colors.
- Allocate slightly more roll-column width and prevent value wrapping; remove duplicated "Roll" within the value.
- Only apply Urdu font to actual Urdu/Arabic-script subject labels, not to the English word "URDU". No homework font-size reductions.
- Raise existing separators to a minimum 1px WIDTH without replacing their per-design var(--line)/var(--accent) colors. Keep original table body border and margin. Avoid drawing both a first-row top line and the heading's bottom line.
- Remove redundant footer top-border width in 8-up; retain footer position and premium styling.
- Preserve the Monogram edition's colored spine using an inset accent stripe instead of offsetting a content grid.

The patch adds 13 narrow CSS rules, with NO artificial #657689 slate or black table frames, NO new table structure and NO changes to saved student records or printer settings.

## Verified tests

- Source browser Print-to-PDF: 8 cards, 4 homework subjects, one A4, 0 task overflow, 0 fake Roll prefixes, uniform font for Latin subject names: PASS.
- 8 premium Studio layouts 31–38 in blush/pink palette: 8/8 PASS in Chromium print media, with correct per-design row separators, footer, colors and vertical columns.
- 25 synthetic students: 4 A4 pages, card counts [8,8,8,1], no pair of student diary cards overlapping: PASS.
- Real PDF-file geometry: 1/4 A4 pages respectively, no text spans outside page, Jameel Noori Nastaleeq embedded, pastel border inks retained.
- Compared on identical realistic MIG26-001 roll fixture: original A200 print header 57.95px vs A203 53.64px; calendar 45.95px vs 41.64px; student strip both 29.14px; homework table height 127.86px vs 134.17px.
- Existing A195 Daily Diary full workspace browser regression PASS after changing the obsolete test expectation from "Roll 01" to "ROLL:01".
- Node parser for versioned minified component: PASS.
- Isolated staging Chromium module import and CSS: PASS.
- Actual live Chromium module import and CSS: PASS, 0 JavaScript page errors.
- Nginx configuration PASS, login/Paper Generator HTTP200; anonymous auth/me appropriately HTTP401.
- Live release file diff is limited to index.html + a new versioned Diary JS + a new versioned A203 CSS; all other modules identical to A200.
- Scoped ESLint finds two pre-existing react-hooks/refs errors in A200 Diary source, unrelated to this patch. Do not declare entire lint clean.

## Operating note

Do not deploy older A201/A202 variants or overwrite A203 with an old general frontend build. A202's heavy border reset is incompatible with the user's requirement. Use the A203 branch and coordinate source forward-port through SaaS Core. Real principal's final physical paper appearance has not been independently verified; tests are synthetic print-media and generated PDFs only. No physical printer page was sent.
