# ASSPS 2026-27 Exam 9 institutional attestation and release controls
**Status: HOLD — independent authenticated school acceptance NOT proved.**

This record corrects a misleading release interpretation without deleting the existing draft
`ASSPS_EXAMINATION_AND_ASSESSMENT_POLICY_2026_27.md` (v1.0). That draft says
“APPROVED & ADOPTED” and prints a Principal's name, but the versioned source
commit is **not** a school-login attestation or an independently verified academic
signature. Its proposed 40% passing rule, 50/25 maxima, grade bands and retention
terms must not be applied to existing official results solely from the text.

## Current evidence and release blockers

- Production `apexos` Exam ID 9 (school 1) contains 301 saved marks, 36 numeric zeros;
  do not modify or delete them. Its exam header uses 100 total/33 pass marks,
  without a revision-approved subject-specific policy. Some historical English
  Written and Mathematics Oral results have disputed /100 denominators.
- Production has zero published teacher-class-subject assignments; 81 historical
  subject-catalog rows have NULL total marks. Do not turn evidence-based
  assignment or maxima *proposals* into access grants.
- A restored QA example contains 75 *test* assignments and 81 configured maximum
  rows. Its approved_by_user_id is 2373 for all rows, but that user has role
  `teacher` in both QA and production, so the Core principal/admin reviewer
  condition fails **81/81**. Do not promote these staged subject approvals.
- Source branches `9adb690` (strict assignment, immutable existing marks) and
  Connect `2a3aa7a` are isolated candidates, not currently deployed by this
  release. New source is not proof of active live authorization.
- 301-result QA restore parity does not certify live signed RLS, role/ACL
  restoration, authorized real teacher login, authentic cross-school denial,
  browser Save→Reload→Print or Nginx/PM2 traffic rollback.

## Safe certification sequence

1. Recover *original* 2026-27 timetable and authoritative class, section and
   paper maxima; reconcile Grade IX–X separately and do not normalize unknown
   subject aliases automatically.
2. Obtain Principal/authorized academic decision through real logged-in actor,
   with identity, school, subject scope, date/time, policy revision, source paper
   and approval audit ID. “Full access” conversational delegation alone does
   not create per-paper reviewer data or employee consent.
3. Populate exact real teacher mappings and maxima through a reviewed, tenant
   scoped migration with pre/post hash and rollback evidence.
4. Confirm the updated approved-policy API and strict marks write code is
   actually deployed. Test legitimate named teacher session, school A allowed,
   school B denied, school/class/section/subject restrictions, authorized
   saved-result readback, and open browser print preview. Synthetic QA scores
   must never be entered into official Exam 9 production.
5. Independently certify active application runtime signed policies,
   PostgreSQL owner/global ACL recovery, production blue/green canary,
   supported traffic rollback and no data loss.
6. Only SaaS Core may promote release once each genuine gate is evidenced.
   No public result publication without a separate authorized Principal event.

**Read-only reproducible preflight:** `ops/release/exam9-status-20261013/verify_exam9_release_gate_20261014.py`.
It deliberately emits HOLD until authenticated acceptance and release receipts exist.
No test fixture signature, draft policy name, or report paragraph changes that verdict.
