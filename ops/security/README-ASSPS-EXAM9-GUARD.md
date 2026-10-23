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
