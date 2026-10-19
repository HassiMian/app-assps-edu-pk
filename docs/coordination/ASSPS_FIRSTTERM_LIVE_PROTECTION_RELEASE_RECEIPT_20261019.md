# ASSPS Production Receipt — First Term Exam9 Immutability / 19 October 2026

## Explicit owner authority
First Term examinations are completed; all Result Cards have already been printed. Protect them historically forever. No repeat marks entry, reprint assignment, or routine owner/teacher/staff action is requested.

## Exact source and scope
Production schema migration sourced from branch
fix/core-firstterm-db-immutable-20261019 at commit
c6321935fc7c02657bbe42c805e3f8596ef260e6.
School1 First Term is exams.id=9 (2026-2027), NOT Exam8.
Exam8 is a historical School2 Demo Monthly Test, whose one row was not
modified and whose normal future edits are not subject to Exam9 lock.

## Independently verified protective release
Pre-release SQL query: Exam9=1,853 marks, 224 genuine zeros, 0 NULL,
all 1,853 school_id=1; no preexisting first-term triggers.
Disposable PostgreSQL 16 test passed nine denied operations, future
Exam10 and School2 Exam8 permitted, schema rollback preserved without
data removal. Source production-safety check passed.

The versioned guarded production migration committed a single transaction:
BEGIN, snapshot/metadata checks, four CREATE TRIGGER, COMMIT (exit 0).
It did not run data UPDATE, DELETE, INSERT, or modify historical mark values.
Independent read-only checker subsequently confirmed four enabled
first-term triggers, 1,853 rows, 224 zeros, 0 NULL, metadata School1 and
preserved School2 demo. Existing historic SHA256 baseline watcher again PASS.
This is an ACTUAL LIVE DB schema release, not simply a source candidate.

## Recovery, encryption and independent limitation
Fresh pre-DDL Hostinger dual-PostgreSQL backup:
  /var/backups/assps-critical-20261019T163135Z
Fresh post-DDL backup including the protected schema:
  /var/backups/assps-critical-20261019T163621Z
Both verified all 4/4 SHA256 checksums, both PG gzip dumps and active
application configuration archives. No historical backups deleted.
Exact migration and schema-only rollback, with checksum manifest:
  /root/secure-archive/assps-firstterm-retention-20261019/guard-release-20261019T1634Z
Post-release backups were independently CMS AES-256-GCM encrypted with
the existing authorized recovery recipient PUBLIC certificate into three
root-private archives, 3/3 ciphertext SHA PASS:
  /root/secure-archive/assps-postguard-encrypted-20261019T1640Z
  Ciphertext total 100,663,799 bytes; manifest SHA256
  d9d5c1620d71eb3d90d5e399eb292ecdd98243571b2e7b77d334c8901451e7d6.
OFFHOST laptop transfer, recipient-key decryption and independent full
two-cluster restore NOT CERTIFIED; do not confuse protected local encryption
with off-host disaster recovery.

## Other service regression
Nginx app root remains assps-resultcard-nazra-purged-20261019, public
index SHA256 3c74d3be652b41549ef2129eaacec4c341c05c2118597e308edffd17a33726a9.
Backend PM2 PID1118433 remains online and was NOT restarted.
Public site/login/API root HTTP200; deliberately unsafe legacy timetable
write ingress403; anonymous lesson plans401. RLS read-only scope tests PASS:
0 unscoped, 0 peer School2, 54 authorized School1 staff grants.
Front-end/backend exact Git release ancestry and real authenticated end-to-end
Principal/Teacher/School2 + signed actor runtime remain HOLD.

## Security and remaining work
Owner's zero-routine-human workflow is honored. The first-term closed
Result Cards are not an uncompleted physical print acceptance task.
Separate future Urdu Lesson/Diary A4 physical laser print tests cannot be
represented as witnessed when no trusted hardware signal exists.
Current public GitHub source contains non-code confidential media in
recently recovered source history; site-side unauthenticated asset denial
is not a remediation of public Git history. Do not link or expose personal
signature material in public coordination reports; visibility/historical
purge requires genuine repository administration authority and coordination.
Do not force-push/delete another agent's branch.

Remaining SaaS release gates: immutable attested current frontend/backend,
safe authenticated timetable Save & Lesson delivery, signed HMAC roles,
independent offsite PG restore, academic provenance for held groups, protected
Paper Studio results/editor and other SaaS regressions.
