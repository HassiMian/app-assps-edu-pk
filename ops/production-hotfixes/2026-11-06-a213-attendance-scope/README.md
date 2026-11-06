# A213 — Academic-Class Attendance Separation + Async Roster Verification

**STATUS: ISOLATED REVIEW CANDIDATE ONLY, NOT DEPLOYED, NOT AUTHORIZED FOR LIVE ATTENDANCE WRITES.**

## Evidence and user-visible defect

- Production School 1 currently has **Pre Nine / Blue = 12** active students; **Nine / Fatima = 6**; **Nine / Usman = 9**. These are distinct class-section identities, not aliases. The real published `paper`, `exams`, `fees` and `default` shells each reference `MarkAttendance` assets mapping `Pre Nine` to `Nine` plus an `AttendanceModule` fallback that offers `Pre Nine` sections for Grade Nine. A206 corrected candidate source only; live published binaries remain unsafe.
- The primary `AttendanceModule` had a separate initialization defect: async Academic Setup hydration arrived after its `useState` initializer, leaving `selectedClass` empty without a subsequent update. `MarkAttendance` already had hydration logic.
- Both attendance components accepted late responses for the last-selected class (or conflicting attendance row student IDs) without strongly validating the current grade, section and date. A stale response could overwrite loaded roster/mark state.

## Isolated candidate fixes

1. Preserve official class identity (`Pre Nine` remains distinct from `Nine`); do not reinstate cross-grade section lookup.
2. Initialize `AttendanceModule` class after official Academic Setup hydration. Both screens require selected class and section in official Academic Setup before issuing roster requests.
3. Add `requestSerialRef` and `selectedScopeRef` to both screens. Ignore old, out-of-order responses including errors and loading finalizers when the latest selection does not match the original request's class, section and date.
4. Shared `attendanceRosterGuard.js` verifies each fetched student's class/section (required for Pre Nine and Nine), rejects mixed/duplicate or malformed grade rosters, and restricts returned attendance marks to student IDs inside that already-verified roster. A mismatched grade is visibly refused, never saved.
5. Existing submitted marks remain guarded by loaded class/section/date state, with backend authenticated school/tenant and teacher-scope checks unchanged.

## Verified test matrix

- 13/13 class+section+ID+attendance reconciliation unit tests PASS.
- 9/9 source-safety contract tests PASS, requiring no Nine→Pre Nine fallback.
- 8/8 rendered React browser tests PASS for both attendance screens, Pre Nine Blue, Nine Fatima and Usman, grade-switch responses delayed out of order, mixed-grade roster denial and no write attempted.
- Combined 30/30 targeted attendance source+browser regression PASS.
- Existing 3 broader static source contract files: 6 PASS, 1 **historically obsolete** test expects the unsafe Nine→Pre Nine fallback. Its FAIL evidence is preserved, rather than reinstating unsafe behavior to make it green.
- Isolated modern frontend build PASS, current `index.html` entry references updated, guarded MarkAttendance and AttendanceModule chunks. Source-build parity report includes their SHA-256 hashes. The generated build is **not** proof that four historical production shells have all been updated.
- The A208–A212 assessment, marks, academic acceptance tests and actual live read-only PostgreSQL parity are separately monitored.

## Release gates that remain

- Positive real authenticated Principal and Teacher staged tests must compare all three cohorts by exact school/class/section/date, including POST only against a **disposable staging database**, read-after-write, isolation and rollback. Do not fake approvals or mutate school records.
- Verify complete published multi-entry shell build matrix: paper/exams/fees/default. All 4 current production shells are still unsafe, until explicitly replaced via verified deploy/rollback procedure.
- Independently certify off-host PostgreSQL data, roles and ACL restore, recheck app-owner DDL privilege and backup headroom; 73 generic app-owned tables have FORCE RLS, so **active owner RLS bypass is not demonstrated**, but excessive DDL privileges remain an issue.
- School1 retains 220 students across 6 classes lacking verified teaching/timetable evidence; Assessment 1–4 signed academic subject approvals and original 49 browser-local Saved Papers are not yet proven.

**A213 candidate build and Git review do not authorize production release. RELEASE HOLD.**
