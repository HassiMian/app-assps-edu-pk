# A206 — Daily Diary All-Template Print-Grid Hotfix (2026-11-09)

Scope: exactly eight existing Studio designs, all seven A4 densities (2/3/4/5/6/8/10), all eight light palettes. Keep school branding, student data, content, template frames and unrelated assets unchanged.

- Source correction: DailyDiaryWorkspace.css and standalone iframe-print CSS embedded in DailyDiaryWorkspace.jsx. Restore 2px non-fractional header, subject/diary, row and footer separators, with zero inter-row gap.
- Vite production build: PASS.
- 56 design × density print media checks: PASS (56/56).
- 448 design × palette × density layout checks: zero overflow warnings. Legacy test final 'Roll 01' assertion fails because current UI uses 'ROLL:01' (pre-existing stale assertion).
- 55-student scenario × 8 designs × 10-up × 5 subjects: PASS (55 cards, 6 A4 pages, no card or page overflow, consistent 2px subject divider).
- Source verify:templates gate: pre-existing resultCardTemplates.jsx hash mismatch; candidate does not modify result-card templates.
- Staged candidate: /var/www/assps-releases/assps-diary-a206-all-template-grid-20261109
- Rollback release: /var/www/assps-releases/assps-diary-a205-grid-visibility-20261105
- Candidate is asset-only relative to live: existing asset dependency names untouched, new JS/stylesheet and index reference only.

## Production outcome
A206 activated on 2026-11-09 at 16:48:30 UTC, after successful Nginx syntax check and atomic root change. Public Cloudflare index returns A206 JS + CSS references; new stylesheet HTTP 200; origin JS/CSS HTTP 200. A205 remains intact for immediate rollback. Backend and stored diary data untouched.

Physical Epson print output is not independently verified; automated Chromium print-medium and 55-student page-fit checks passed.
