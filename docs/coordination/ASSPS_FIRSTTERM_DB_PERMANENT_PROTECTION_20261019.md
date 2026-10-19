# ASSPS closed First Term 2026-27 — scoped database immutability

OWNER DIRECTIVE: The School1 First Term examinations have ended and all result cards were printed. Preserve school data permanently. Do not reset, delete, reseed or rewrite this exam.

## Exact live identities
The confirmed School1 First Term is Exam9, school_id 1, session 2026-2027. It contains 1853 result rows, including 224 genuine numeric zeros and zero NULL obtained marks. All its results have school_id 1. Exam8 is School2 Demo Monthly Test, NOT First Term, and remains out of scope of the Exam9 write lock. Existing School2 and future separate-term operations must continue.

## Controlled migration
The versioned migration at ops/release/firstterm/001_lock_firstterm_exam9_20261019.sql is strictly additive, guarded by a transaction, a bounded lock timeout, an advisory transaction lock and exact live Exam9 baseline checks. It introduces a SECURITY INVOKER trigger function and four narrowly named triggers. They deny Exam9 result insert/update/delete and reassignment, Exam9 metadata edits/deletion, and table-wide truncate of exams/results. New separate exam and School2 Demo Monthly Test writes remain permitted. It never changes existing result values, students, papers, signatures, fees, printing artifacts or question approvals.

The paired rollback_exam9_history_guards_20261019.sql removes only the four protective triggers and function; it never deletes any exam data. Rollback is an emergency schema-only action requiring documented reason.

## Test and acceptance
The disposable PostgreSQL16 test test_exam9_immutability_disposable_pg16_20261019.sh synthesizes 1853 Exam9 marks with 224 zeros and a separate School2 Exam8 and new Exam10. Nine adversarial Exam9 and global-truncate writes must be rejected, non-First Term writes must work, original marks must remain unchanged, and schema-only rollback must leave historical data intact. Production is NOT used in these adversarial write tests.
The live verifier verify_exam9_history_lock_readonly_20261019.py makes READ ONLY database queries for exact exam metadata, 1853/224 rows, separate School2 Demo row and expected guard catalog.

## Security qualification
PostgreSQL superusers or privileged schema maintainers can disable or drop triggers. This protects against application CRUD, mistakes and normal writers, but does NOT substitute for historical immutable digest, protected backups and tested off-host restoration. No history preservation scheme should falsify teacher approvals, print witnesses, academic questions, or tenant isolation.

Release only with exact existing data check, fresh verified two-cluster backup, no conflicting agent migration, disposable test pass, versioned rollback and post-commit read-only acceptance. Do not redeploy any frontend/backend as part of this database-only protection.
