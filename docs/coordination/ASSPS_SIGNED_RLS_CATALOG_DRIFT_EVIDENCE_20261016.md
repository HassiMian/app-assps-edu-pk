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

## Fresh full PostgreSQL local restore acceptance — same mission

- Source **separate Connect-produced private backup** `/root/assps-release-backups/core-acl-fresh-candidate-20261016/apexos-full-fresh-20261016.dump`, mode 0600, 2,706,585 bytes, SHA256 `e4564c8228994c4b395d43e73ca02c3d308cefad55b5b241f2d4a7becd17e277`.
- Confirmed full `pg_restore -l` catalog, source database `apexos` size 34 MB and available VPS disk 16 GB before restoring.
- Created **new, separate** `assps_rls_restore_audit_20261016` with owner `postgres`, `TEMPLATE template0`, and revoked PUBLIC database CONNECT. Did not drop/modify any pre-existing database.
- First `pg_restore` failed because a non-root postgres OS account cannot open the protected `/root/...` backup. Recovered **without weakening file permissions or making another sensitive backup copy** by opening the file as root and piping its existing input FD to the `postgres` process.
- `pg_restore --exit-on-error --single-transaction --no-owner -d assps_rls_restore_audit_20261016` **SUCCESS**; new private isolated DB size 28 MB.
- Live = restored: 1,763 `exam_results`, 213 genuine zeros, zero NULL `marks_obtained`, **identical full results row-content hash** `75d6f6e04b196e3fc23b5988f305dcd5`; 379 policies, 83 FORCE RLS tables, 87 RLS enabled tables, 77 signed guards and 77 signed allows.
- Clone read-only unsigned `assps_marks_signed_runtime` denied result visibility (0 rows), ROLLBACK.
- Postflight public root `/var/www/assps-resultcards-owner-accepted-20261016` index SHA256 `760b232b493c300fe78908704aef4989c24c25028faac1821dd41f6480210f3c`; app 200, API health 200, live result count 1,763. Existing one-shot restricted worker still Result=success/ExecMainStatus=0 (inactive expected).
- The restored clone is retained as a **private local audit artifact**, not promoted to application configuration or exposed to public access.
- Local same-host restoration is **not** a signed/offhost restore trial, a physically independent backup, or a substitute for official 13/13 trusted release certification. Production cutover **HOLD**.
