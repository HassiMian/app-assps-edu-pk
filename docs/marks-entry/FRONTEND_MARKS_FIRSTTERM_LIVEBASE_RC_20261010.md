# ASSPS First Term Marks Entry — production-ancestry isolated frontend candidate (2026-10-10)

**Production source BASE:** `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92` (independently verified deployed `/var/www/apex-os/release-meta.json`).
**Carry-forward reviewed source:** Core `0076279e7ff893ae0cf9654125f7418cd3e3b3b6` (descendant of official First Term marks recovery `54121d7f93012c27cb7fe0491a53ccd56d6990c3`).
**Branch:** `release/marks-firstterm-frontend-livebase-20261010`, isolated worktree `/root/workspace/assps-marks-frontend-livebase-20261010`.
**Scope:** ONLY the existing `MarksSheet.jsx`, two new pure First Term/class subject modules, and three frontend tests/fixture. No unrelated newer Paper Studio, Result Card, Academic or Connect owner source cherry-picked. No backend, database, Nginx, PM2 or production changes.

**Bug fixed in staged frontend:** Live user Chrome Marks Sheet showed Term Exam, First Term Exam and Class One but a Subject selector containing only 'Select subject'. The new scoped frontend has an explicit saved exam ID/name/session/class selector, strictly canonical 2026-2027 First Term 75 paper/11 class subject fallback, class-identity-aware school-authorized student retrieval, saved marks restoration, edited-only POST, explicit zero/blank handling, invalid student/exam/cross-class prevention, stale response safeguards and honest errors. No duplicate exam auto-creation.

**Tests performed on this exact production-base patch (all exit0):** `npm ci --ignore-scripts`; First Term source-model script compares **75** items and **11** class subject lists to the original backend canonical source; real Vite/Chromium UI source acceptance (synthetic API/student/mark fixtures) PASS, including no academic subjects response, First Term exam selector, canonical/legacy class student lists, restored saved 76 and newly edited 0 only; focused ESLint PASS; optimized Vite `npm run build` PASS (3.57s); `npm run verify:templates` PASS 6 protected files. No real school mark written or authenticated production record read.

**Rollback:** Restore original independently preserved frontend production artifact and metadata matching exact base commit `24cbcae3...` with source-preserving/reversible controlled artifact swap. Verify app and API independently, browser/print regression and authenticated Marks Entry. Do not use a backend service restart to recover frontend-only routing.

**RELEASE HOLD:** Exact deployed backend `16ab8f34...` needs its independently scoped matching teacher-authorized API guard (separate candidate). Existing live Nginx private uploads have five unsafe aliases; authenticated restricted non-BYPASS PostgreSQL/JWT/RLS acceptance still blocked by approved test credentials. No live deployment or release certification.
