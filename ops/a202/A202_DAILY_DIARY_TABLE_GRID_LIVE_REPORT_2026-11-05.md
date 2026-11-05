# ASSPS A202 — SaaS Daily Diary continuous table-grid repair

Date: 2026-11-05
User screenshot: existing Paper Generator > Daily Diary, 8-up A4, pink Flyer template.
Live route: https://app.assps.edu.pk/paper-generator
Status: DEPLOYED and verified by headless Chromium and real PDF rendering.

## Confirmed actual defect (prior A201 release)
The heading and table body were different widths due to inherited premium-print
margins/padding plus A201 partial overrides:
- Table header left: 428.33 px
- Body wrapper left: 432.11 px
- First actual homework row left: 437.64 px
- Subject/header vertical divider: 530.33 px
- First row subject/homework divider: 534.42 px
- Footer top border: 1 px, visually duplicating table closure.

Therefore the two columns did not form a continuous printed table; the user's
reported broken lines are reproduced by geometry, not a printer-driver issue.

## Code fix — only 8-up Studio print/preview
1. Heading and all rows use the same 1.2mm side margins.
2. Remove residual outer wrapper border and horizontal padding from rows.
3. Each row has full left, right, and bottom 1px slate borders, and its subject
   column has an explicit 1px vertical separator.
4. Remove redundant footer top border while preserving the GK last-row bottom.
5. Preserve compact calendar, single-line roll, school logo/name and all A201
   typography; NO HOMEWORK FONT SIZE REDUCTION.
6. Apply matching CSS in the React workspace preview AND isolated iframe print.
7. Preserve A200 fail-closed isolated-print behavior (never print editor UI).
No API routes, live student data, assessments, fees, or other modules changed.

## Measured after repair
- Heading left = body left = first row left = 428.33 px.
- Header divider = first row column divider = 530.33 px.
- Footer top border = 0px.
- All 8 student slips, 4 homework subjects, 1 portrait A4 PDF: PASS.
- All 8 Studio design structures (31–38) with blush/pink color: 8/8 PASS.
- No gaps between subject rows, no missing grid borders, no task-cell overflow.
- Actual A4 PDF: 1 page, 144 medium-slate #657689 vector-filled border segments,
  no text spans outside page bounds, Jameel Noori Nastaleeq embedded.
- Existing A195 Daily Diary full workspace browser test: PASS.
- Staging module import and linked CSS: PASS.
- Post-deploy actual live module import and stylesheet: PASS, 0 JS page errors.
- Login and Paper Generator HTTP200. Anonymous /api/auth/me HTTP401 as expected.

## Production release boundaries
Live root: /var/www/assps-releases/assps-diary-a202-table-integrity-20261105
Prior root/rollback: /var/www/assps-releases/assps-diary-a201-gridink-v2-20261105
Nginx rollback backup:
  /root/secure-archive/assps-diary-a202-table-integrity-20261105/apex-app-ssl.pre-a202
Changed only: index.html, versioned A202 Diary JS, and versioned A202 Diary CSS.
The other production assets and backend are unchanged.

## Remaining owner acceptance
Hard-refresh Paper Generator > Daily Diary, select 8-up, then use its Print / PDF
action. Inspect preview and physical output for real Flyer Pink students.
No paper was printed by this test suite. Real printer visual quality has not yet
been independently verified.

Warning: this is a versioned live hotfix plus isolated source branch. Do not
overwrite it by blindly deploying an older canonical main frontend.
