# ASSPS Paper Studio — Phase 24 canonical Daily Diary saved-record identity scope

9 October 2026, owner isolated development; **NOT deployed**.

## Source authority and branches

- Latest issue #4 reviewed: Paper Studio Phase23 `a8f27460ffd0eba85f4c4479a0f3186f6122bcd3`, clean origin and VPS. SaaS Core Phase28 `8fe6324f55d6789946e4c196ba0dc6c6c25845a5` (newest independently checked issue #4 comment ~05:50 UTC) has adopted Phase23 month-end scheduler onto its Phase27 parent `da77e18c7ad9ebf8ad5a84605af07798e894009e`; Core remains sole integration and production authority.
- This owner change was isolated in `/root/workspace/assps-paper-studio-master-phase24-20261009`, branch `feat/paper-studio-phase24-diary-save-identity-20261009`, exact child of prior owner Phase23. Live production deployment metadata remained frontend `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92`, backend `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9` at start.
- Scope is only canonical `DailyDiaryWorkspace.jsx` save-target identity, one brand-new controlled HTTP Chromium acceptance, this report. All protected First Term source papers, saved school papers, Grade IX/X academic review, student names/IDs/data, curriculum, printer, PDFs, DOCX, Urdu RTL/fonts, signed Core privileged backend/RLS/JWT/media uploads, SaaS Connect and prod untouched. Historical full chat transcripts, original signed Phase3AE source ZIP and PG18 production-source DB cannot be independently read.

## Genuine new wrong-record overwrite, unlike Phase20–23 date input/generation fixes

- Canonical teacher Diary Workspace stored one `savedDiaryId` in component state, originally null, filled by successful POST. Subsequent saves unconditionally used **PUT `/api/daily-diary/${savedDiaryId}`** regardless of changed `classLevel`, `section` or `date`. Hence a teacher creating a new day, class or section could send an UPDATE for yesterday's or another class's saved diary. There is no claim this caused a real production incident or that backend RLS grants unauthorized tenant access.
- Added actual Vite+Chromium browser test using a strictly synthetic class Seven/Eight, Blue/Green roster and HTTP capture of `/api/daily-diary` POST/PUT with fake local authentication/tenant. Browser loads real canonical Diary Workspace, selects Class Eight/Blue on `2026-10-09`, **POST creates ID201**, same scope **PUT /201**, changes date to `2026-10-10`. **Actual PREPATCH RED:** issued **PUT /201** instead of expected independent **POST**; process exit1. `/tmp/paper-p24-diary-save-red3.log`. First test harness attempts erroneously received HTTP401 because the synthetic auth seed and PUT path matcher were missing; corrected the isolated fixture before attributing failing request semantics. `red3` explicitly confirms status HTTP200 and wrong PUT; no privileged production credentials were used.

## Minimal fix and identity invariant

- Replace loose `savedDiaryId` state with scoped `{id,scopeKey}` where the key is the exact serialized tuple `[classLevel, section, date]`. `saveDiary` uses PUT only when the current teacher-selected class, section and school date match the ID's captured scope. Any changed tuple must POST, so a previous day's or section's ID cannot silently overwrite a different teacher diary. Capture new `{id,scopeKey}` only on successful server response with a returned ID. Same tuple remains editable, and rows/palette/diary content within it can be revised.
- **POSTPATCH GREEN real Vite/Chromium HTTP calls:** `POST (Eight/Blue/Oct9)` → `PUT /201` same tuple → `POST (Eight/Blue/Oct10)` → `POST (Eight/Green/Oct10)` → `POST (Seven/Blue/Oct10)` → `PUT /204` same new tuple. **1/1 PASS exit0** `/tmp/paper-p24-diary-save-green.log`. No full calendar refactor, database migration, logout, new API, record deletion or school configuration changes.
- **Known boundary:** Current Workspace tracks only the last saved identity in memory. Switching back to an earlier already-saved scope creates a fresh draft rather than transparently reopening that saved record; canonical server-side saved-record discovery/version/review and tenant RLS remain separate Core certification/Diary UX work. This fix prevents wrong-record cross-scope PUT but does not prove cross-school DB authorization, prevent duplicate records, or physically print pages.

## Real acceptance gates and exceptions

| Gate | Actual result |
|---|---|
| NEW genuine browser RED→GREEN | Before HTTP200 wrong PUT on new date, exit1; after exact tuple-scoped HTTP paths **1/1 PASS exit0**. `/tmp/paper-p24-diary-save-red3.log`, `/tmp/paper-p24-diary-save-green.log` |
| New test file scoped ESLint | **PASS exit0**, `/tmp/paper-p24-new-eslint.log`; do not claim whole legacy UI lint clean |
| Canonical DOCX source model and mathematical assets | **4/4 PASS exit0**, 43 original paper models / 1027 nodes / 315 tables / 612 RTL constructs / 4 vertical math. `/tmp/paper-p24-docx-model.log` |
| All 43 protected ORIGINAL First Term papers actual Chromium render+print text parity | **43/43 protected original papers PASS, process exit0**, browser render and cloned print-text parity, case 291.43s / full TAP 304.57s, 0 failed/skipped; `/tmp/paper-p24-all43.log/.rc` |
| Previously completed Daily Diary personal cards/A4, old Lesson Plans, Cognitive planning, date defaults, scheduling browser acceptance | **20/20 PASS, process exit0**, all 8 prior Diary A4/lesson/date/scheduling browser+pure unit test files, run AFTER original corpus to avoid earlier concurrent CPU pagination timing false-red; 48.05s TAP, `/tmp/paper-p24-prior-browser.log/.rc` |
| Six original protected paper template integrity | **PASS exit0**, `/tmp/paper-p24-templates.log/.rc` |
| Frontend Vite optimized build | **PASS 2,519 Vite modules, 45.95s, process exit0**, `/tmp/paper-p24-build.log/.rc` |
| Commit, GitHub independent fetch, issue #4 comment | Final git diff --check/staged whitespace and GitHub remote SHA/issue #4 readback to complete after all above tests; no release authorized |

## Mandatory Core release gates and rollback

- SaaS Core only: selectively apply tiny owner `DailyDiaryWorkspace.jsx` identity patch plus synthetic browser regression to newest signed non-BYPASS Core descendant, preserving stronger Core tenant auth/RLS, Nginx private-media gate, schools/role/teacher memberships, rollback plan, backup and release lineage. Do not merge stale owner branches wholesale; actual production commits must be re-read before ANY deployment.
- Signed real teacher/student role HTTP Save→GET→Reopen (both same/cross tenant, cross class and changed school date) against isolated disposable RLS clone, correct database update/unique constraints, stored draft version checks, 77-table grants, physical Windows attached printer A4 + Urdu Jameel Noori and PDF/DOCX, private media Nginx, principal approval and rollback remain **NOT certified**. Independent Grade IX/X textbook/source human validation remains Academic-owned. Original historical chats and Phase3AE source bundle inaccessible. **PRODUCTION HOLD until SaaS Core certification.**
