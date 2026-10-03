# Phase 3Z — Real Phase3S → Phase3T PostgreSQL 18 Integration

Date: 3 October 2026. Parent: Phase3Y `d33cd446adfac20597a2d04200bea195e4299ebe`.
Branch: `feat/paper-real-pg-adapter-phase3z-20261003`.

## What was actually tested
An exact-target guarded, new, synthetic-only PG18 cluster was initialized at
`127.0.0.1:55443`, database `assps_paper_phase3u_ci`, using the previously reviewed
Phase3U DISPOSABLE-ONLY SQL. Separate per-school SCRAM logins 51 and 52 and unique
random passwords were generated solely inside a temporary runner-owned directory.
Existing PostgreSQL servers, port 5432, production, and real school databases were untouched.
`pg@8.20.0` and its 13 transitive packages were installed from **offline npm cache**
into the disposable temporary directory (no network, no project or JARVIS package edits).

The new `newAuthoringRealPostgresPhase3Z.test.js` exercised actual `pg.Pool` connections
with genuine Phase3T `createRoleBoundNewAuthoringRepository`, Phase3S gateway and
Phase3Y one-use teacher-authoring session. Synthetic Ed25519 publication checks passed
through Phase3V; signed bilingual chapter/topic records were projected via Phase3X;
the existing Phase3Q selection and Phase3R document constructor supplied native UTF-8
content. The mock signed academic source was seeded as a synthetic publisher row only
in the newly created disposable database; this is NOT genuine Curriculum approval.

## Results — second hardened verification run
**8/8 tests PASS, 0 failed, 0 skipped**, executable returned exit code zero.
1. Independent password-authenticated session-user/school/tenant mapping; forged GUC ineffective.
2. Synthetic source → correct published revision and source-preserving new-authoring document.
3. Real PG atomic first create and immutable initial audit through 3Y→3S→3T.
4. Cross-school RLS denial, authorized reopen, exact Urdu UTF-8 source bytes preserved.
5. Real serializable CAS revision 1→2 with matching append-only prior SHA chain.
6. Forced audit failure correctly rolled back a real PostgreSQL CAS transaction.
7. Revocation in physical publisher table blocked Phase3T write even while the fake
   signed-source registry had not yet been updated; provider revocation also denied read.
8. Exactly **1 synthetic draft / 2 revisions / 1 revoked publisher** remained; FORCE RLS
   enabled on all three isolated relations.

Before test execution, Node additionally verified exact database, admin session, port,
loopback bind address, marker file text, and PostgreSQL's real `data_directory` matching
the runner's uniquely created marker-owned folder. This prevents accidental reuse of
an existing same-port server or database. The guarded schema likewise checks pristine tables.

## Independent synthetic archive/restore and cleanup
On completion the runner took a custom `pg_dump -Fc`, listed its catalog, restored to a
second fresh isolated database, and verified **1 draft and 2 revision rows**.
Final archive SHA-256:
`31413d14d1e4a470d40990cfde5e3ca18acb35340fa61e13b0c821789e57d3`.
Proof manifest and synthetic-only archive were retained in its unique temporary evidence
folder; test database files and offline node_modules were removed after stopping only its
own PostgreSQL cluster. No listener remained on port 55443.

## Production release boundary (NOT complete)
Real Curriculum independently reviewed bilingual publication and correct IX Urdu edition
approval still required. Synthetic P3V source/key fixture must never become live material.
Actual institutional backup, independent DB/schema/RLS review and credential/key custody
remain separate approval gates. Additional staging checks: concurrent physical CAS conflict
and publisher revocation races, multi-instance durable authoring-intent storage, subject
enrolment resolver, student/teacher endpoint privacy, full cohort coverage, ALP verification,
print/PDF/Word Urdu/English parity and canary rollback. The tests performed no live route
mounting, no source Question Bank mutation, no production deployment and no existing
paper/archived V13/Canonical V2 changes.

### Final regression and artifact evidence
Second hardened Phase3Z real PG18 run: 8/8 PASS, exit 0. Earlier Phase3O–Phase3Y
serial regression: 118/118 PASS, exit 0 (126 targeted checks in total across both runs).
Self-created cluster archive: 36,656 bytes; SHA-256 shown above. Final manifest verified
real Phase3S→Phase3T=PASS, synthetic archive restore=PASS, offline dependencies removed,
marker-owned database data removed, port 55443 listener count=0. Source worktrees remain clean.
