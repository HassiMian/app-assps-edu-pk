# ASSPS P0 documents FORCE-RLS live migration runbook — 19 Oct 2026
**Narrow emergency hardening only. NOT approval for unified Lesson/Timetable/Paper production deployment.**

## Threat and restriction
Live main PG16 documents, events and revisions are FORCE-RLS tables, but public permissive tenant_fallback permits all without app.rls_enabled, resulting in 18 / 46 / 45 visible counts under restricted app role with missing tenant context. The separate existing tenant-aware app_runtime policy is permissive, and PostgreSQL combines permissive policies with OR. New additional RESTRICTIVE policy on all three tables requires app.rls_enabled=true and an explicit tenant-id match or explicit super-admin context. Changes apply to SELECT, INSERT, UPDATE and DELETE row eligibility, but do not perform DML.

## Prerequisites
1. Fresh dual cluster backup and checksum + both PG ports online; archive live three-table original policy schema.
2. Actual live main DB must be apexos:5432, three tables forced, exactly both preexisting named policies; no already applied guard. Require one explicit session-local authorization value in migration.
3. Disposable PG16 synthetic School101/School202 under restricted apex_app_runtime and apexos_user: baseline default 6, new default 0, each correct scoped 3, wrong school 0, no rls flag 0, explicit superadmin 6, reversible rollback baseline 6. Script rehearse_documents_restrictive_fullrollback_pg16_20261019.sh.
4. Target SQL script 20261019_school_documents_failclosed_restrictive_guard.sql is single transaction; 3s lock timeout and 12s statement timeout. Companion 20261019_school_documents_failclosed_restrictive_rollback.sql drops only three new restrictive policies, never data or old policies.
5. Validate after change with a separate read-only SQL role matrix using missing context, School1 and School2 plus unchanged document counts. Verify live app login, API health, protected docs unauthorized 401, P0 timetable guard 403, both PG clusters, no unintended process restarts.
6. Keep this runbook, exact SQL checksum and revert CLI in restricted /root/secure-archive; do not include backup student PII in Git.

## Limits
Even after success, this is NOT cryptographic signed-RLS, migration of document caller contracts, independently authenticated role acceptance or complete production release. Application GUCs alone are not an immutable identity source; approved SaaS service must continue enforcing trusted verified school context and proper privilege and signing checks.
