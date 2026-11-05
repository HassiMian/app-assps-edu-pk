# ASSPS A201 — Daily Diary compact eight-up A4 print layout

**Date:** 2026-11-05
**Live app:** https://app.assps.edu.pk/paper-generator
**Production release:** /var/www/assps-releases/assps-diary-a201-gridink-v2-20261105
**Rollback release:** /var/www/assps-releases/assps-diary-a201-compact8-20261105 (previous release: assps-diary-safeprint-failclosed-20261105)
**Nginx rollback config:** /root/secure-archive/assps-diary-a201-gridink-v2-20261105/apex-app-ssl.before-v2

## User-requested SaaS changes (NOT an image-only mockup)

The actual Paper Generator > Daily Diary eight-up A4 layout has been changed:

1. Calendar enclosure reduced from large Studio preset to 12.5mm width / 12mm height at unit scale, with minimized header padding and gap. School title and logo remain present.
2. Student, class/section, and roll number use one compact three-column metadata strip without duplicated Roll prefix. Example: ROLL: MIG26-086 instead of ROLL: Roll MIG26-086.
3. English subject names URDU, ENGLISH, MATH, GK are handled as Latin labels with one selected font family. Real Urdu-script labels retain Urdu glyph fallback.
4. Subject-table headers and rows have explicit continuous printed borders, with 0.85px lines in printer-visible medium slate (#657689) and print color adjustment. Each row has visible left/right/bottom borders and the first row also a top border.
5. Table margins, row gaps, header padding, and footer padding tightened to allow more homework content without reducing body/homework font sizes.
6. Scoped only to Studio layout density-8 so all other Diary designs and density choices remain unchanged.
7. Preserved A200 fail-closed isolated Diary printing and A195 font readiness and save logic.

## Test outcomes

- Eight synthetic student slips on one A4 page: PASS.
- Four long synthetic homework subjects per slip: PASS, no diary-cell clipping.
- English subject names use identical computed font family: PASS.
- Roll number fits one line, without duplicate prefix: PASS.
- Calendar measured 23.44px in workspace preview and 34.47px in isolated print layout at test configuration.
- Row bottom borders measured at least 0.8px; no out-of-bounds cards: PASS.
- PDF vector drawing check: at least 16 strokes in medium slate ink (RGB approx 0.396/0.463/0.537), correcting light pastel lines that could disappear on physical print.
- Actual A4 Chromium PDF: one page (594.96 × 841.92 points), no text spans outside page, Jameel Noori Nastaleeq embedded, zero Chromium page errors.
- Existing comprehensive A195 Daily Diary workspace browser suite: PASS after updating the old Roll prefix assertion.
- Staging production-compatible module import and A201 stylesheet: PASS (23 CSS rules).
- Live production import, stylesheet, no-global-print fallback, font-ready print rules: PASS, zero JS page errors.
- Live Paper Generator / login: HTTP 200; anonymous auth /me: expected HTTP 401.
- After transient Nginx reload, three repeat HTTP checks for versioned JS and CSS: 200/200/200.
- Changed release files only: index.html, versioned DailyDiaryWorkspace JS and versioned A201 CSS; all other application modules retained unchanged.

## Constraints

No school database mutations and no physical printer test page were sent. User should hard-refresh Ctrl+Shift+R, open Daily Diary, choose 8 per page, use the dedicated Print / PDF button, inspect Chrome preview and verify actual printed paper. If 4 physical sheets appear for 25–32 selected students, that is correct: eight separate student diary slips per A4 sheet. The final physical quality is not claimed verified.
