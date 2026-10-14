# ASSPS Core — Six global tables isolated least-privilege remediation

14 October 2026. **SOURCE AND DISPOSABLE QA ONLY; NO LIVE PRODUCTION CHANGE.**

## Actual security finding

Six global public tables have RLS disabled while the assps_core_green_runtime
inherits full SELECT/INSERT/UPDATE/DELETE through apex_app_runtime:

admin_block_audit_log, ai_jobs, ai_queue_events, ai_queue_state, campuses,
organizations.

None has an explicit school_id/tenant_id field. Blanket copying the other
77 signed tenant RLS policies would be incorrect. These tables have real
background-worker dependencies (AI queue, school settings, operations).

## Completed engineering implementation

Added THREE isolated QA-only source files:
- ops/release/signed-bluegreen/qa-green-global-rls-stage-20261014.sql
- ops/release/signed-bluegreen/qa-green-global-rls-rollback-20261014.sql
- ops/release/signed-bluegreen/run-six-global-qa-20261014.sh

Added static QA fail-closed tests:
- ops/release/signed-bluegreen/test_qa_green_global_policy_source_20261014.py

The runner verifies root-private SHA256 full-ACL backup, creates an entirely
disposable PostgreSQL16 Unix-socket-only cluster at QA port55483, restores
full table ownership and grants with placeholder NOLOGIN roles and without
copying passwords, and stages six RLS policies with QA port guard.
For the green runtime it applies restrictive USING false and WITH CHECK false
plus FORCE ROW LEVEL SECURITY; it preserves existing legacy runtime access
inside QA using a separate PERMISSIVE policy.

## Actual executed tests

- Full-ACL database restore PASS.
- All six green read-denial checks PASS.
- Existing legacy and table-owner read access preserved PASS.
- Actual restored AI event table had 250 rows visible to legacy but ZERO
  visible to green.
- Synthetic green AI queue insert rejected PASS.
- Synthetic legacy queue INSERT+ROLLBACK PASS, with no remaining test record.
- Exact inverse SQL transaction PASS; all six restored original disabled
  RLS and no-policy state.
- Restored ExamID9 genuine scores remained 1762 and numeric zeros 213.
- Original QA cluster stopped, removed, no production SQL stage or role
  changes.
- Nine static source guard tests PASS.

A first isolated QA attempt failed when PostgreSQL could not read a SQL file
under a private root directory; corrected to stream file as root through
stdin. A second attempt showed pg_restore -O changes owner semantics;
corrected runner restores actual original table ownership. Both earlier
runs cleaned QA resources and made no production changes.

## Independent release boundaries

This QA concept **is not deployable as-is**. Green runtime would lose
access to all six global functions. SaaS Core must first design a separate
reviewed global worker role/service boundary and certify AI queues,
organization/campus settings and audit contracts under real traffic.

Do not copy QA-only policies into production or revoke inherited grants
without worker dependency assessment. The existing live release checker
must continue to HOLD until a complete tested integration is certified.

Existing teacher login source and Nginx+Next blue/green repair were previously
validated on staging, but the live Next BUILD_ID and Nginx double dashboard
redirect remain stale. Authentication, real signed school actors, peer-tenant
HTTP negative evidence, independent recovery and Core live rollback gates
cannot be replaced with synthetic approvals or signatures.

Academic official result publication remains separate, with genuine school
maximum-mark/subject approvals required; never change real marks or convert
missing marks to zero.

The user requested no routine approval interruptions. Source implementation,
safe isolated checks and coordination can continue autonomously. Real staff
sessions and formal Core release authority cannot be impersonated.

## Dedicated global AI worker QA contract extension

The isolated staged SQL now defines assps_qa_global_job_worker, a NOLOGIN,
NOINHERIT, NOSUPERUSER, NOBYPASSRLS role. Its explicit grants cover exactly
the three AI queue relations and the event sequence, not school organization,
campus or global audit relations. Scoped permissive policies permit required
AI worker actions, while restrictive green-specific policies continue to
deny all six school-unsafe global accesses. Existing legacy access is retained
only in this disposable QA rehearsal.

New runtime acceptance on exact restored PostgreSQL source:
- Worker SELECT access on ai_jobs, ai_queue_events, ai_queue_state PASS.
- Worker transactional INSERT into ai_queue_state and ai_queue_events PASS,
  then rolled back; no QA test rows retained.
- Worker SELECT of organizations DENIED.
- Worker role is removed in the exact inverse QA transaction.
- Six-table green denial, legacy access, schema rollback and real marks
  restore invariants all PASS.
- Additional static contract tests assert no-login worker scope and exact
  worker removal on rollback.

A production worker login/service principal and application transport
binding have NOT been provisioned. This is a source-ready tested pattern
for SaaS Core to integrate under authenticated least-privilege rollout,
not proof that live global worker segregation is installed.
