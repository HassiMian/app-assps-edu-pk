# ASSPS A196 — Independent Daily Diary Production Certification

**Date:** 2026-11-04
**Mission:** Verify current live A195 Daily Diary typography/controller repair, without overwriting it.
**Status:** Automated certification PASS; real owner-authenticated physical print acceptance pending.

## Production state
- URL: https://app.assps.edu.pk/paper-generator
- Active Nginx root: /var/www/assps-releases/diary-a195-controller-cert-20261104
- Live mapped module: DailyDiaryWorkspace-ASSPS-A195-CONTROLS-20261104.js
- Manifest JS SHA-256 matched deployed module: 45cc9c17432b3131...
- Browser dynamic module import passed, 213 CSS rules read, zero JavaScript page errors.
- Production release diff against prior Studio8: index.html changed; JS, CSS and manifest added. All other 957 baseline files were retained.
- Nginx configuration syntax passed.
- Twenty local HTTPS requests to /paper-generator: 20/20 HTTP 200; median 7.02 ms, max 12.42 ms. These timings measure loopback responsiveness, not user internet performance.

## Independent sequential browser acceptance
| Test | Result |
|---|---|
| dailyDiaryA195ControlsAcceptance | PASS (1/1) |
| dailyDiaryA195ExhaustiveMatrix | PASS (1/1; 448 configurations, 0 warnings) |
| dailyDiaryA195FontCatalog | PASS (1/1; 10 fonts) |
| dailyDiaryA195HeaderPresets | PASS (1/1) |
| dailyDiaryA195OverflowStress | PASS (1/1) |

Tests were run sequentially to avoid shared Vite port 5295 collisions. All exited with status 0.

## Reproducible key measurements
- Header presets: Compact 32.09 px, Standard 43.52 px, Spacious 63.43 px.
- Table heading at 8-up: 9.88 px; 10-up: 8.97 px (readable size improved from old version but still compact).
- Footer: 7.50 px minimum in 8/10-up tests.
- Row Height adjusted from 43.98 px to 48.62 px.
- English Inter font loaded as computed family in both preview and isolated print iframe.
- 10-up extreme row height produced 210 px card bounding vs 306 px scroll demand; print guard blocked unsafe clipping.

## Safety and unresolved limits
- No database writes, migrations, attendance/voucher/exam records, or application files were changed in this independent verification.
- Tests used mocked authenticated student/academic data. They do NOT constitute proof that a real principal login, live save/reopen, real Urdu font installed on every client, or physical printer PDF succeeds.
- The A195 branch is not the canonical mainline; future deployments must reconcile versioned diary fixes carefully, otherwise they may be lost.
- Do not assert the user-requested 40 minutes elapsed; this report records work actually completed and observed, not simulated time.

## Next operational acceptance
1. On owner account, hard-refresh Paper Generator > Daily Diary.
2. Select a real class and date, test Times/Inter + Urdu Jameel Noori, and verify table headings 8-up and 6-up.
3. Save a diary, reopen the same school-day record, verify typography/color/palette settings.
4. Print to PDF and inspect line breaks, Urdu glyph shaping, borders, footer, student names, and whether pagination clips.
5. If any issue remains, record class/section, template, card density and a redacted screenshot; amend only the matching component, not the whole SaaS.

**Conclusion:** Current A195 version is safe to retain and passed independent automated tests. Full owner-account print certification remains pending.
