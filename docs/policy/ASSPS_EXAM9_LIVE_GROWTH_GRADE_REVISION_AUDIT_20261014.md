# ASSPS Exam 9 — rolling results preservation and 40% grade acceptance
**Date:** 2026-10-14. **Decision:** Keep official school publication HOLD until genuine signed release gates pass.
**Worktree:** `fix/assps-exam9-live-growing-results-verifier-20261014` (isolated descendant of SaaS Core school-admin approval source `904d6af`).
**Method:** PostgreSQL SELECT/read-only, no production data or identity writes.

## Live school snapshot (08:34 UTC, results can grow)
- Exam 9, school 1: **1,588 saved result rows**, **273 students**, **203 numeric zeros**, 0 missing, 0 invalid bounds, 0 duplicate exam/student/subject keys.
- Earlier baseline (13 October) had **301** rows and **36** scored zeros. Those original rows remain present under id <=306.
- The 301 old rows' **numeric marks, total marks, student IDs and subject keys** match an untouched restored backup. Score-only fingerprint: `bcdc098a3e6cabb6f4c31736b14e39b9` on current and restored QA.
- However grades on old rows have **changed**. Combined old 301 score-plus-grade fingerprint is currently `0e0115e1bdafa8c56edb174da6241f3a`, versus historical `0376ec1d25555b0dfc963857564b36aa`; the 301 numeric score fingerprint is stable. Do **not** describe this as loss of marks or silently claim actor-approved grade revision.

## Grade changes during review
- At first pass, 105 full Exam9 score rows in the 40–49% bracket carried an 'F' label; 42 were in original 301-row subset.
- During the same safe read-only audit, school 1 grade_settings changed from 0 rows to six explicit bands: A+90–100, A80–89, B70–79, C60–69, D40–59, F0–39. A fresh query found **0** grade-F/40–49% conflicts after this concurrent change.
- User separately specifies **passing threshold 40%**, not a universal per-subject maximum. No historical score/denominator was rewritten by this branch.
- The concurrent live table `assps_grade_revision_audit_20261014` contains **112 grade change rows** (105 F→D, 1 A+→A, six previously blank grades now A/C/D), all **112/112 match** current numeric marks, totals and stored new grades. Every row has a textual `policy_source` reference and timestamp, but the table has **no authenticated school actor/reviewer ID, signed session receipt or independent approval revision**. Therefore change provenance is traceable but not credential-backed school acceptance; gate remains HOLD.

## Engineering fix
`ops/release/exam9-status-20261013/verify_exam9_release_gate_20261014.py` now distinguishes:
1. **Legacy score preservation**, by 301-row ID-bounded score-only hash and zero count; current Exam9 rows can grow.
2. **Legacy grade-revision provenance**, separately comparing score+grade hash; if a historical grade changed, it does not silently count as actor-approved moderation.
3. **Current result integrity**, valid score bounds and unique composite keys.
4. **40% pass threshold vs 'F'** count requiring review.
5. Existing genuine teacher/admin school approval, signed current app-role, staff/peer authenticated browser and rollback gates, which remain FAIL CLOSED without actual proof.

Run only against explicitly named ASSPS PostgreSQL databases with psql read-only. Tests include old-301 QA, growing 1,588/live snapshot, altered marks and F/40–49% conflicts.

## Remaining gates
- The newest official teacher timetable is still pending school confirmation; QA's 75 assignments contradict source examples and omit Grade IX cohorts. **No live assignment imports**.
- 81 live Exam9 offering rows still have NULL maxima and no authenticated reviewer-linked academic approval.
- Admin approval route is in owner source only; confirm real live deployment before browser acceptance.
- Genuine password-backed teacher session, authorized official Save → Reload → browser Print Window, real second-school authenticated HTTP negative and active full-app signed RLS remain uncertified.
- Full SaaS Core rollback/traffic certification and result-publication acceptance remain separate. Preserve all official scores and receipts.

**Never insert synthetic results into official Exam9 to manufacture acceptance.**
