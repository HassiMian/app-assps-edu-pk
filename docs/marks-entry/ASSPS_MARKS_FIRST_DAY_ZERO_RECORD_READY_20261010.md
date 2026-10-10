# ASSPS Marks Entry — first-day zero-record acceptance (10 Oct 2026)

**Goal:** Finish product source before teachers enter any real marks tomorrow. No teacher is required to enter actual marks to test this workflow. No production school marks were read or written; entirely synthetic First Term data.

## Source ancestry / ownership
- Based exactly on clean tested production-frontend descendant `39ee8270442f6728f5a2c09c3a75bd8d4eea804e` (`release/marks-firstterm-frontend-livebase-20261010`), itself a verified descendant of live frontend `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92`.
- This change updates only Marks Entry UI, pure no-data/print-sanitization helper files and test scripts. Official First Term 2026–27 source lists for 11 classes / 75 actual paper subjects remain unchanged. No backend, teacher permissions, exams, finance, Paper Studio, 9 premium Result Cards, protected original templates, RLS, migrations or production deployment changed.

## User workflow before marks exist
1. Load existing **First Term Exam** saved in the authenticated tenant-scoped exams API, select the class and one actual official subject (Class One: English/Mathematics/Urdu/Science/Islamiyat/Quran-Nazra). Do not create fake/double exams or extrapolate to other years.
2. Fetch only exact authorized class aliases with existing class-scoped roster API. Even if the saved results API returns **zero records**, render the full student roster with **blank** editable mark fields, display `0 saved / N pending / 0 unsaved edits`.
3. Clicking Save without an entered value MUST NOT POST any mark; `''` is never 0. Enter actual 0 only if teacher types 0. Validate `0 <= mark <= total`, teacher's real exam ID, enrolled class, subject and student IDs.
4. Save *only newly edited rows* and require `savedCount` acknowledgement. Update saved-status counts only **after** server success. Preserve subsequent edits made while a previous async Save was pending; remove only values equal to the earlier posted value.
5. Search/reopen exact same exam/subject: server's saved mark `0` is restored as `0`; unentered students remain blank and pending. Failure to read pre-existing marks keeps roster visible but disables Save (no blind overwrite).
6. Blank mark sheet can print before any marks exist. All Subjects sheet enumerates the **actual configured/official First Term subject list**, not invented `Subject 1/Subject 2`. Any exam/subject with no authoritative list blocks print instead of inventing columns. Headers repeat across pages and table rows avoid split.
7. Every student/school/subject/phone/title string interpolated into print-only HTML is HTML-escaped. Only original SaaS `paperSettings.logo` on approved branding image URL or vetted raster data/blob is used; if absent, show neutral `Logo not configured`, never a fabricated crest. Pop-up blockers display an actionable notice.

## Evidence (all fixtures synthetic, zero real student marks)
- `node scripts/test-marks-zero-state-and-blank-print.mjs`: 16 assertions: no marks, real 0 vs absent, pending edits, success merging, async save race, escaping HTML event injection, refusing javascript: or off-tenant private-media logo, accepting approved branding images, exit0.
- `node scripts/test-marks-entry-first-term-recovery.mjs`: existing exact official 75 papers/11 classes, First Term chosen by saved ID, roster aliases, invalid 101, empty and cross-class denial, exit0.
- `MARKS_BROWSER_PORT=5991 MARKS_BROWSER_REUSE=1 node scripts/test-marks-entry-firstterm-browser.mjs`: genuine Vite/Chromium browser. Mock API intentionally denies unfiltered `/api/students`; Class One roster combines canonical and legacy aliases, saved synthetic 76 restored. Invalid 101 blocked; edited-only 0 sent without rewriting 76; failed GET disables Save. **NEW** fresh load with *zero saved result rows* renders 2 students/`0 saved 2 pending`; empty Save posts nothing; Print Blank Subject opens with two rows and zero invented logo; Print Blank All Subjects has exactly real six official Class One subjects; entered zero persists when reopening while second student's blank stays blank. Browser exit0, log `/tmp/assps-marks-zero-browser-final.log`.
- `npm run verify:templates`: all 6 original protected template source hashes unchanged, exit0.
- `npm run build`: Vite optimized frontend build exit0 (3.45s).
- Focused ESLint changed frontend/tests: 0 errors exit0 after removing dead unused legacy display helper.

## Actual release status
This is complete **source + synthetic browser acceptance**, NOT currently deployed. School may enter marks tomorrow only through **certified deployed** Marks Entry version; the currently live production frontend metadata remains the older source until an authorized controlled release. Real signed privileged/non-BYPASS PostgreSQL production tenant-role verification, live full-scope student results/first-term grading, and current release branch/rollback must be separately confirmed before a GO. The Nginx private-media fix and disposable clone signed actor 13/13 are recorded as separately completed Core checkpoints, **not** evidence the full Marks Entry production release has occurred.
