# ASSPS A205 - Daily Diary reliable print grid

Date: 2026-11-05
Live: https://app.assps.edu.pk/paper-generator
Current release: /var/www/assps-releases/assps-diary-a205-grid-visibility-20261105
Rollback release: /var/www/assps-releases/assps-diary-a204-premium-footer-20261105
Backup config: /root/secure-archive/assps-a205-grid-visibility-20261105/apex-app-ssl.before-a205

## Root cause

Chrome printed 1 CSS pixel pastel borders as 0.75 PDF point paths, which are subpixel in the reduced Chrome Print preview. Some lines became invisible due to rasterization and fractional positions. A test with fractional width 1.8px also snapped to 1px in Chromium, so the solution uses exact 2px borders for print-safe physical strokes. The source inline print stylesheet was also out of sync with the previous production border ink. Both source and print styles are now synchronized.

## Surgical scope

Only the premium Studio 8-up internal table grid: 2px subject/task divider, 2px row separators, 2px heading and in-table footer boundary. Color comes from existing selected palette, 78 percent accent mixed with 22 percent line. No black or slate borders, full redesign, typography changes, school branding changes, student layout changes or backend modifications. A203/A204 premium design remains intact.

## Raster evidence

Real Chromium PDF, 25 Flyer Pink synthetic students, 4 A4 sheets. At 0.75 PDF display zoom:
Before: 25 of 75 weak horizontal dividers, 52 of 100 weak vertical dividers.
After: ZERO of 75 weak horizontal dividers, ZERO of 100 weak vertical dividers.
Minimum pixel contrast improved from 13 to 36 horizontally and 16 to 41 vertically.
PDF path width improved from 0.75 to 1.5 PDF points.

## Tests

25 cards in four A4 pages 8+8+8+1: PASS.
Eight original premium Studio designs using Pink palette: 8/8 PASS.
Long student names, one-line metadata and GK footer: PASS.
A195 Diary and Lesson Planner regression: PASS.
Low-zoom PDF pixel-level guard: PASS.
Staging and live actual compiled module import with external CSS: PASS.
Actual computed inner grid width: 2 CSS px. Zero JavaScript errors.
Nginx test and reload: PASS. Login and Paper Generator 200.
All non-Diary assets and existing production records untouched.
New release changes only index.html plus versioned DailyDiaryWorkspace JS and CSS.

Physical school-printer acceptance is still pending. Do not deploy rejected A201/A202 heavy-border variants. Future canonical builds must forward-port A205.
