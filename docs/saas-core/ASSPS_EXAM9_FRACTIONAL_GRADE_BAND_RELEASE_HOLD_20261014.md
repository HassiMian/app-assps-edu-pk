# 14 October 2026 — Core Grade Band Percent Coverage Defect / Safe Isolated Candidate

Status: **SOURCE FIX QA PASS; PRODUCTION GRADING / ACADEMIC RELEASE HOLD**. APEX Connect discovered this discrepancy while verifying a user-supplied final release report, not while processing or modifying actual student records.

## Read-only actual PG5432 school1 observations
- `exam_subjects` Exam9: 81 rows, **0/81** with an approved `total_marks`. The report's claim that a 100-mark blanket core paper maximum is already canonical is unsupported by this table. Historical result denominators differ by class/subject and must not be mass-replaced.
- `teacher_class_assignments` school1 active: **0**. `school_academic_approval_events` school1: **0**.
- `grade_settings` school1 six bands stored as whole percentage endpoints: A+90–100, A80–89, B70–79, C60–69, D40–59, F0–39. **40% PASS threshold configured.**
- `exam_results` Exam9: **1,762 saved results, 213 genuine zeros**. Seven saved scored percentages are strictly between integer band maximum and next band minimum: two at **69.333%**, five at **89.333%**. Stored grade letters: 69.333% C (two), 89.333% A (three), 89.333% **blank (two)**. No student identifying information needs to be recorded in this QA artifact.
- Existing backend `gradeFromBands` compared raw fractional percentages using `pct<=band.to`, causing future valid marks to receive an empty grade across these gaps. This report is a real source vs live policy discrepancy; it cannot be solved by claiming all institutional gates green.

## Narrow forward-only source candidate

`al-siddique-backend/src/services/gradeBandAssignment.js` implements **integer endpoint as whole percentage point** semantics: a band stored as 80–89 covers all percentages from 80 (inclusive) to 90 (exclusive); D40–59 covers [40,60), F0–39 covers [0,40). A different decimal-authored policy uses its literal fractional boundaries rather than being floored. Overlaps, gaps, malformed rows and out-of-range percentages fail closed (no invented grade). Existing `gradeFromBands` calls the pure matcher.

### Evidence and safety

- Focused tests: `node --test .../grade-band-assignment-20261014.test.js .../exam-result-status-20261013.test.js .../exam-marks-subject-maximum.test.js` **9/9 PASS**.
- JS syntax PASS; `git diff --check` PASS.
- **No production deployment, marks write, grade-label mass repair, MAXIMA defaulting, teacher permission or reviewer role/auth mutation.** Existing two blank grade-label rows require review through a real signed Principal/Admin academic moderation path, not an unaudited UPDATE.
- This source must be integrated by SaaS Core on its latest live descendant and tested for all school-specific policies before deployment; scoped 40% institutional decision remains intact.

## Independent report-claims discrepancies needing canonical owner attention
- Timetable `007` read-only verifier now PASS for 58 records, 43 reference IDs and 32 Blue sections; it explicitly says `full_academic_release_certified=false` and `staff_identity_reviewed=0`. Reference-only link never grants marks access.
- PostgreSQL `apex_app_runtime` has 154 *installed* policy mentions (77 restrictive and 77 permissive), is `NOBYPASSRLS` but `NOLOGIN`; policy presence is **not** authentication or evidence that full live HTTP backend traffic is using signed runtime role. The independent active traffic verifier still says `PASS_RESTRICTED_SHADOW_NOT_TRAFFIC`.
- APEX Connect genuine report-card URL redirects to login 302 without a real staff session, so source `window.print()` existence does not satisfy true browser/OS print dialog acceptance.
- Source report says full technical 41/41 and only human signoff left, but actual official subject maxima0/81, assignments0, admin approval events0 and real staff/peer-school signed release receipts remain missing.

**Retain HOLD** for school academic publication and full backend signed traffic cutover. Preserve all 1,762 real marks, 213 numeric zeros, Class Eight's promotion/print gate and Grade Nine's no-First-Term rule. No fake credentials, school approvals or data.
