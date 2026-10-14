# ASSPS SaaS Core — Current signed-runtime catalog audit (14 October 2026)

**Classification:** APEX Connect Master source-only SaaS Core coordination handoff.
**Live system mutation:** NONE. This supplementary tool cannot certify a release.

## Root cause and source implementation

The older pre-cutover checker assumed exactly 212 legacy policies and
assumed each signed tenant guard named only one restricted role. The current
live catalog has 375 policies, while all 77 core signed restrictive guards
name BOTH assps_core_green_runtime and assps_marks_signed_runtime. It would
be unsafe either to bypass the old gate or treat count drift as a proof of
actual cross-tenant denial.

New independent read-only current-catalog verifier:
ops/release/signed-bluegreen/audit-current-signed-catalog-20261014.py

It binds to apexos/5432 with a read-only repeatable-read transaction and
checks exact signed school/tenant predicates on all 77 guards and allows,
FORCE RLS, role inheritance-sensitive attributes, and granted unforced
public tables. Also tests unsigned academic-events visibility under the
restricted marks role, without creating a signer or reading student records.

## Independently observed live results

- 375 public policies; 77 restrictive signed guards, 77 signed allows.
- School and tenant-key predicate variants are correctly distinguished.
- Academic approval events: 0 rows visible to unsigned restricted marks role.
- Six public tables have **RLS disabled** yet green runtime receives DML:
  admin_block_audit_log, ai_jobs, ai_queue_events, ai_queue_state,
  campuses, organizations.
- Actual schema review: **none of these six tables directly contains
  school_id or tenant_id**. Organization/campus tables expose org_id and
  related owner references; the AI job/state/event tables contain JSONB or
  global queue data. Blindly adding signed_school_allowed(school_id)
  would be invalid and could break all existing AI background jobs.
- Existing backend callers verified: paperAiQueue.js uses ai_jobs,
  ai_queue_events, and ai_queue_state; settingsRoutes.js reads campuses
  and organizations; opsRoutes.js uses ai_queue_events. The global
  admin_block_audit_log has no direct application caller in the inspected
  backend source. These observations are **not** proof that revoking a grant
  is safe; migration ownership remains SaaS Core.
- Four additional granted, unforced tables have signed predicates and
  require independent authenticated acceptance: employee_teaching_subject_evidence,
  school_academic_approval_events, school_class_promotion_plans,
  school_class_promotion_source_roster. The academic-events write policy
  includes the independent reviewer-authorization predicate.
- Verdict: HOLD, not a certified exploit and not a certified release.
- 12/12 synthetic adversarial unit tests PASS; read-only live verifier
  correctly returns exit 2 for real uncovered tables.

## SaaS Core remediation, not permission to bypass protections

1. For each of six RLS-disabled relations, identify original purpose,
   table ownership, tenant/global scope, and actual application/worker
   call sites before writing an isolated migration.
2. In a FULL-ACL disposable restore, prefer minimal role-specific RLS and
   grants or remove demonstrably unneeded restricted DML. Do not blanket
   enable FORCE RLS on global background tables or revoke live grants
   blindly: both could interrupt active school services.
3. Execute signed-vs-unsigned request-time denial, actual authorized
   same-school and peer-school tests, all backend AI/job workflows,
   high-load session races, cross-tenant negatives and rollback on QA.
4. Require SaaS Core release owner review before source forward-port and
   production migration. Keep authentic school identity and independent
   signing receipts; no agent-generated teacher/principal signoff.
5. Confirm backup and independent rollback with current school Exam9
   unchanged, including all real numeric zero scores and absent blanks.

Production runtime signed identity, real teacher signed session, true
peer-school HTTP denial and live-traffic rollback remain NOT CERTIFIED.
Login-only release and academic publication are separate gates.
No official academic maxima, marks or subject approvals are fabricated.

## Safe execution

python3 -m unittest ops/release/signed-bluegreen/test_audit_current_signed_catalog_20261014.py -v
python3 ops/release/signed-bluegreen/audit-current-signed-catalog-20261014.py

Exit 2/HOLD on the live checker is expected until catalog risks are
resolved, and **a diagnostic PASS is never a production release receipt**.
