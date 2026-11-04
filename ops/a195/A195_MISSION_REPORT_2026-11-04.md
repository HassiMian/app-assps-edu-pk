# ASSPS A195 — Daily Diary Typography & Controller Repair

**Date:** 4 November 2026
**Source branch:** feature/a195-diary-typography-controls
**Initial implementation commit:** ad80c365
**Production URL:** https://app.assps.edu.pk/paper-generator
**Live root:** /var/www/assps-releases/diary-a195-controller-cert-20261104
**Backend/database migrations:** None

## Confirmed defects and repairs

| ID | Old behavior | A195 repair and evidence |
|---|---|---|
| DD-01 | Font Style changed selection but diary and print stayed Times New Roman | Dynamic English font works in preview and print using shared styling variables; Inter and Georgia tests pass |
| DD-02 | SUBJECT and HOME TASK headings had no controller | New Table Headings size + / - and Bold controller added |
| DD-03 | Table heading about 5.7px at 8-up, 5.175px at 10-up | Readability floor applied; test measured 9.88px at 8-up, 8.97px at 10-up after sizing adjustment |
| DD-04 | Header Scale appeared ineffective | School branding and calendar now respond together |
| DD-05 | First School Font + could shrink font | Stepper uses visual Auto baseline; monotonic growth verified |
| DD-06 | Row Height + either did nothing or shrank Auto | Current real row height is measured before +/-; 43.98px to 48.62px verified |
| DD-07 | Compact, Standard, Spacious presets shared same height | 32.09px / 43.52px / 63.43px measured |
| DD-08 | Footer was unreadably small in 8/10-up | 7.5px minimum enforced in Studio templates |
| DD-09 | Only five font choices | Ten selectable fonts, default Urdu Jameel Noori priority retained |
| DD-10 | Subject/task body controls confused with table headings | Labels distinguished as Subject Row, Task Text and Table Headings |
| DD-11 | Max row height could silently crop printed diary | Print preflight blocks overflow and shows actionable warning; 210px card vs 306px content reproduced |

## Test evidence

- 448/448 design + color + A4 density configurations passed; zero overflow/overlap warnings with normal test content.
- 14/14 saved-diary scope/identity regression tests passed, including POST/PUT, wrong-school records, stale requests and mismatched saved responses.
- 10/10 font catalog options present; computed CSS font stacks varied and Urdu priority verified.
- Normal Print/PDF iframe path passed for selected English typography and both headings.
- Extreme 10-up row-height print was blocked, not silently clipped.
- Header Compact / Standard / Spacious and logo resize tested and passed.
- Isolated full Vite production build passed. No shared production dependency tree was modified.
- Production-compatible Daily Diary JS parser and browser module import passed.
- Live Nginx config, Paper Generator route, A195 JS and CSS all HTTP 200.
- Live browser imported mapped A195 component with computed typography CSS and zero page errors.
- Binary diff of prior and current static releases: only index.html mapping and two added A195 assets plus manifest differ. Other assets unchanged.

## Operational limitations

Real authenticated school-account printing and a physical printer/PDF check have not been independently performed; automated browser tests use synthetic academic data. Some font families are device-dependent and may require installed fonts or fallback. The feature commit is on a GitHub branch and should be integrated into the canonical release path before a future full redeploy.

## Rollback

Previous root: /var/www/assps-releases/diary-studio8-independent-colors-20261104
Saved Nginx configuration: /root/workspace/assps-diary-a195-typography-20261104/ops/a195/rollback/apex-app-ssl.before-a195
Restore config, validate with nginx -t, then reload Nginx.

## Final manual acceptance

Hard-refresh Paper Generator → Daily Diary Studio; select a Studio design and one of eight colors, change English font, adjust Table Headings, test Header Scale and Row Height, select real class/student/date, inspect Urdu font and A4 Print/PDF, save and explicitly reopen the matching school-day diary. If overflow is shown, reduce Row Height/text size or select fewer diaries per page.

**Stability monitoring:** In progress; results appended after the 20-sample series.
