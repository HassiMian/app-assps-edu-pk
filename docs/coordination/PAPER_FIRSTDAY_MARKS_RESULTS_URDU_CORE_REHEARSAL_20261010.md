# ASSPS Paper Studio + First Term Marks/Results — owner-safe integration rehearsal

Date: 2026-10-10. Release authority: **SaaS Core only**. This branch is a NON-PRODUCTION, NOT-CERTIFIED integration rehearsal, not a replacement for Core's release branch.

## Verified source ancestry

- Current Core Marks + nine Result Cards + authorized teacher backend staging predecessor `test/marks-results-firstday-combined-20261010` exact Git head `97d7815f78acac817d6ee38bce6d22774abf1e84`, remote matched and worktree clean before reconciliation. It is NOT live deployed.
- Original Paper Studio owner isolated branch `test/paper-diary-core-reconcile-20261010` SHA `a0dbc523c2e19dfdca03e5637a7621e29d1bf636`, exact remote matched, isolated and clean; its Core predecessor `b5df66a7` was not the Marks/Results branch. Common ancestor with Core Marks/Results `d7b38c6c` had overlapping Result Card paths; copying or deploying the whole Paper branch directly would risk stale Result Card regression.
- New, isolated Core-derived integration candidate branch `test/paper-firstday-core-reconcile-20261010` created from **`97d7815f`**. Applied ONLY the distinct Paper-owned fix commits: `a1c9117a`, `9212c7f3`, `db0a88c2`, `b40ab854`, `a4d7e6f8`, `a9ac347f`, `8c86c554`, `385b5cd1`, `19ba22f0` (each selectively cherry-picked with source provenance). Resolved one scope-specific Diary conflict by retaining the newer initial-state hydration and declining to reinstate an obsolete mount-time draft overwrite effect.
- NEW material omission detected in prior Core Marks/Results candidate: independent Urdu MCQ inline-option/Elite print-preview fix **`73909cdf524c738db2635b980f852e406e760b3b`** was not ancestral and its two source regression tests were absent. It was selectively cherry-picked here as `a3a9ae0c`, retaining the newer Diary hydration, and preserves Result Cards/Marks source from the Core base. Production was not modified.

## Fresh actual tests on integrated source

- `npm ci --ignore-scripts --no-audit --no-fund --prefer-offline` exit0, exact integrated `npm run build` exit0 `/tmp/assps-paper-core-firstday-urdu-build.log`, six protected Result Card legacy template checksums PASS `/tmp/assps-paper-firstday-core-templates.log` (before separate Urdu cherry-pick; no protected templates in Urdu patch).
- Paper marks/legacy migration/Daily Diary late-save/English+Urdu DOCX source model: **26/26 exit0**, `/tmp/assps-paper-core-firstday-model.tap`.
- Urdu inline MCQ and Elite source tests: **3/3 exit0**, `/tmp/assps-paper-core-firstday-urdu-fix.tap`; focused ESLint Diary+Urdu MCQ parser+regression test **0 findings exit0** `/tmp/assps-paper-core-firstday-urdu-lint.log`.
- Real Chromium Urdu canonical Workspace **9/9 exit0** AFTER Urdu integration `/tmp/assps-paper-core-firstday-urdu-postfix.tap`; Early Years + vertical A4 print **13/13 exit0** `/tmp/assps-paper-core-firstday-print-early.tap`; Diary Workspace **1/1 exit0** `/tmp/assps-paper-core-firstday-diary-browser.tap` (prior to Urdu patch; conflict resolved conservatively).
- Exact Core First Term Marks frontend: source-level zero/blank and secure print test PASS 16 cases `/tmp/assps-paper-firstday-markzero.log`; first-term roster, 75 official subjects, incomplete save/fail-closed check PASS `/tmp/assps-paper-firstday-recovery.log`; real browser First Term exam ID9, role-scoped roster alias union, zero vs blank, edit-only save PASS `/tmp/assps-paper-core-firstday-marks-posturdu.log`; all nine Results styles zero vs missing, graded progress and blocked empty print PASS `/tmp/assps-paper-firstday-ninecards-browser.log` (before Urdu patch). All browser API scenarios use synthetic fixtures; they are NOT real production actor sign-off.
- `git diff --check` PASS, isolated rehearsal worktree clean after publication, remote SHA must match signed handoff HEAD.

## Remaining true release gates (do not waive)

1. Paper-owned wider ESLint: last separately audited Paper source **187 errors, 12 warnings** over 286 files; newly integrated source must not be declared full lint green. Nested dynamic React components and effect timing are highest-risk; no rules suppressed. Core must repeat full-tree lint and source QA on its final candidate.
2. Core production `apexos_user` is still the observed BYPASSRLS active login. Disposable non-BYPASS signed Postgres clone actor 13/13 and live private-media Nginx seven-site PASS are not proof of real authorized teacher tenant/role signed production runtime. Do not change production credentials, roles or SQL under Paper ownership.
3. Actual signed teacher save/reopen/print and Results/Paper HTTP test clone fixtures were previously SKIPPED/failed/timed out; missing authenticated fixtures and backend grants must be closed by Core. No real marks/attendance/school records were written in this rehearsal.
4. Core-only deployment promotion, original artifact+DB restore rehearsal and printer/browser acceptance. Ricoh physical basic A4 test sheet was confirmed by school; full Urdu Nastaleeq multi-page PDF/DOCX glyph/position/cut-off and any attached OS-selected printer require physical sign-off. Grade IX/X bank content separately requires actual faculty-approved revision; zero approved school records presently claimed.
5. VPS disk around 90% used: preserve source, owner branches, databases and backups; no destructive cleanup.

**VERDICT**: COMBINED MARKS+RESULTS+PAPER+URDU SOURCE REHEARSAL BUILD/BROWSER PASS; `RELEASE_CERTIFIED=FALSE`, application deployment = HOLD. SaaS Core must adopt by review and independently certify newest source, security and rollback, never deploy this rehearsal branch directly.
