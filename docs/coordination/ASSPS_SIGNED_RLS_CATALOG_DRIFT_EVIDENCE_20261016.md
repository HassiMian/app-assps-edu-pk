# ASSPS 16-Oct-2026 — isolated signed RLS catalog drift verification

Owner: SaaS Core. Scope: **read-only catalog auditing only**. Baseline `integration/core-phased-paper-readiness-20261016@97382ccd113679572af0764028ecaf5dd242ab2b`. No application/backend release, DB DDL/DML, role grant, Nginx, PM2, or printer action.

## Fresh VPS evidence (UTC ~02:30)

- Production: Postgres 16 main, port 5432, database `apexos`; Nginx public root remains `/var/www/assps-resultcards-owner-accepted-20261016`.
- Official older `verify-live-signed-precutover-20261011.py` is **HOLD** because its exact old expectations (77 forced, 212 other policies, signed role array exactly one member) do not match an expanded live catalog. The older `full-app-signed-77-policy-gate-20261012.py` additionally tests the old `apex_app_runtime` role; current signed guards use two different runtime roles. **Do not modify or waive those original gates without Security Lead reconciliation.**
- New additive *read-only* `verify_signed_rls_catalog_drift_20261016.py` = `CATALOG_PASS_NOT_RELEASE`: original 77 eligible restrictive guards and 77 permissive allows; zero unpaired; current force-protected count 82 excluding movement audit; all 5 newer academic/evidence tables have FORCE RLS and signed-school-scoped policies; 4 explicitly named non-force-RLS tables are postgres-owned with RLS enabled and signed-school-scoped SELECT policy; zero unscoped matching policies; `apexos_user` has zero direct table privileges on those four; all 3 inspected runtime roles are nonsuperuser/non-BYPASS.
- Adversarial self-tests: **5/5 PASS**, including baseline never implying authorization, all missing/extra catalog counts HOLD, ACL exposure HOLD, no mutation SQL.
- Actual live READ ONLY session with `SET LOCAL ROLE assps_marks_signed_runtime` and **no signed ticket**: count of visible `exam_results` = 0, ROLLBACK.
- Actual live READ ONLY session with `SET LOCAL ROLE assps_core_green_runtime` and **no signed ticket**: visible `employee_teaching_subject_evidence` = 0 and `school_class_promotion_plans` = 0, ROLLBACK.
- These are real *unsigned-context denial* probes but **not** a signed independent peer-school denial, real teacher session, offsite recovery certification, authenticated worker transport or production cutover.
- Current live 4 RLS enabled non-FORCE tables must remain separately tracked until owner/role grants, migration intent and signed school tenant semantics are certified.

## Repro (read-only)

```bash
python3 -m unittest discover -s ops/release/core-infrastructure -p test_verify_signed_rls_catalog_drift_20261016.py -v
python3 ops/release/core-infrastructure/verify_signed_rls_catalog_drift_20261016.py
```

This artifact explicitly reports `releaseAuthorized=false` and `securityCertification=false` even if its catalog verification succeeds. All original Core gates remain mandatory. Production cutover **HOLD**.
