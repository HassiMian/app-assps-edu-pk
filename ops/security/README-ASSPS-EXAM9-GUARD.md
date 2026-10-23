# ASSPS Exam9 PostgreSQL DBA-Owned Immutable Mark Controls
23 October 2026. Main-derived, independently reviewable P0 security patch.

This package is SOURCE ONLY, not an automatic migration on the stale main branch.
Verified event triggers were separately installed on active live apexos via trusted DBA.
Reviewed function source is stored in assps_exam9_postgres_dba_event_guards.sql.
Applying it to any database requires verified backups, original four immutability triggers, FORCE RLS, role/grant validation and a privileged DBA release window.
Unsafe attempts to disable Results/Exams immutable triggers, drop Results policies, protected tables and public CASCADE are blocked.
Separate DBA-owned guardian schema prevents app-login from removing the event trigger functions via DROP SCHEMA public CASCADE.

QA: 15/15 adversarial attempts passed on a restored same-host scratch copy of 1854 School1 Exam9 rows; 213 current genuine zeros preserved. Actual live negative tests for DISABLE original results trigger and DROP results RLS policy were also denied, with original academic data untouched.

IMPORTANT LIMITATIONS:
- This is COMPENSATING DDL protection, NOT a complete DB/schema/table owner separation.
- Application login still owns the database and can drop a database it owns by accessing a different maintenance database. Independently demonstrated only on a disposable scratch DB.
- Original academic awards and 12 unexplained result changes remain unapproved.
- This branch is main-derived and DOES NOT include all later live SaaS fixes, academic modules, principal-signature privacy changes, or frontend release parity.
- Do not deploy stale main or run this SQL automatically.
- Root-only emergency rollback/proof receipts are held on the authorized VPS, not uploaded here, and must not be shared publicly.

## Additional same-day live owner-custody hardening
An independent NOLOGIN role assps_immutable_data_owner_20261023 has now been verified as actual LIVE owner of the apexos database, public schema and both protected exams/exam_results tables. The app login is no longer able to disable protected triggers by table ownership or DROP its database merely by owner privileges. The app's ordinary schema CREATE, table DML and two owned ID sequence USAGE grants remain intentionally preserved.
Source of reviewed transfer SQL (NOT auto-runnable as it already created the live guardian role): assps_exam9_nonlogin_custody_review.sql. Before any new cluster deployment a DBA must verify roles, previous ownership, four original triggers, two DBA event guards, archive checksums, off-host rollback and signed approval. Never autoapply this to the old GitHub main.
Same-host full 1854-result restored-copy migration + rollback rehearsal passed, with 213 zero marks unchanged. Live full-row original-result digest was byte-equivalent before/after transfer, public school website and backend/API remained healthy, and app TRIGGER privilege was removed from both protected tables.
The independent no-runtime-CREATE-at-all strict zero-DDL condition remains intentionally unresolved because app CREATE on the database/public namespace is needed for existing SaaS dynamic schema operations; this hardening is NOT proof of total general-runtime SQL-DDL isolation. Historical result changes and official academic approvals remain unresolved.
