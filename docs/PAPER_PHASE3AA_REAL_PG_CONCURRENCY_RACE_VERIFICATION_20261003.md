# Phase 3AA — Physical PostgreSQL Concurrency and Publication Revocation Races

Date: 3 October 2026. Parent Phase3Z: `2719c9568ab6a64cc9f8d4b8cf425157bcace2d9`.
Branch: `feat/paper-real-pg-concurrency-phase3aa-20261003`.

## Isolation and explicit guard
`phase3aa-run-real-concurrency-DISPOSABLE-ONLY.ps1` initializes a brand-new
PostgreSQL 18 cluster ONLY at 127.0.0.1 port 55443 in a uniquely generated
marker-owned `%TEMP%/assps-phase3aa-ephemeral-*` directory. Before mutation it
checks existing port occupancy, disk headroom and the existing guarded pristine
Phase3U SQL. It generates fresh admin/school51/school52 SCRAM passwords, creates
only synthetic users, installs `pg@8.20.0` from already-cached npm dependencies
using `--offline`, and executes a separate copied-and-expanded Phase3AA Node suite.
The Node suite checks the marker text, precise directory prefix and live
`data_directory`, exact database/port/loopback bind address and SESSION_USER.
Existing PostgreSQL instances, all real school accounts, historical papers,
Curriculum branch, live database migrations and production routes remain untouched.

## Executed real concurrency findings
**10/10 physical PG18 tests PASS, zero failures, zero skips, runner exit 0.**
The original Phase3Z coverage is carried into this separate Phase3AA suite, plus:

1. **Conflicting initial CREATE:** two separately prepared and authenticated
   Phase3Y authoring intents attempted the SAME draft ID concurrently through
   actual Phase3S and Phase3T; one succeeded, one failed. Physical PostgreSQL
   retained exactly one native JSON draft row and one initial audit row for that ID.
2. **Conflicting CAS update:** two edits began at revision 2 and the same previous
   native SHA via Phase3Y → Phase3S → Phase3T; only one committed revision 3.
   The losing writer was rejected. The winning exact native text/SHA and immutable
   revision 1→2→3 prior-hash chain were re-read from real database rows.
3. **Publication lock versus revocation:** a dedicated school51 SQL transaction
   acquired the purpose-only `phase3t_lock_published_snapshot` (FOR SHARE) on
   the synthetic revision-7 PUBLISHED_APPROVED row. An independent admin
   transaction attempted UPDATE status=REVOKED while the lock remained held;
   PostgreSQL returned lock-timeout SQLSTATE `55P03`, with publication still
   approved. After the school holder committed, admin revocation succeeded;
   subsequent Phase3T CAS aborted at the physical revoked snapshot lock,
   preserving the previously committed native draft revision and audit chain.

The suite additionally rechecks password-authenticated school identity and RLS,
exact synthetic bilingual/Urdu UTF-8 native text, initial-save atomicity,
authorized reopen, forced audit-failure rollback, published source integrity,
and FORCE RLS on all three isolated new-authoring tables.

## Restore, evidence, and destruction of disposable dependencies
Actual `pg_dump -Fc`, catalog read and restore to a second pristine synthetic
database succeeded. Independently restored counts were **2 drafts / 4 revisions**.
Custom archive SHA-256:
`e78144e351257665850f3d531bb72aff8cfa31bcc048524c2dfdbfa35956611d`.
Test evidence is written outside Git in its unique temporary synthetic-evidence.json.
The marker-owned database cluster was stopped, private data directory deleted,
offline node_modules deleted, password environment variables cleared.
The synthetic archive and evidence manifest remain available for independent audit.

## Approval scope and remaining integration gates
All signed academic records, issuer keys, school/tenant records and account IDs
were fabricated for a disposable fixture; this does NOT establish real Curriculum
approval or institutional backup verification. Phase3AA remains deliberately
unmounted from production and does not grant print/PDF/Word release.
Before authorized staging/live rollout: independently publish complete and verified
English/Urdu textbooks including IX technical-term/edition evidence; provision a
durable trusted Curriculum publisher, authentic staff subject grants and controlled
publisher-key custody; complete multi-instance authoring session design, live
schema/RLS and credential review, privacy access review, Urdu and English output
parity, full-corpus validation, backup/restore and canary rollback.
