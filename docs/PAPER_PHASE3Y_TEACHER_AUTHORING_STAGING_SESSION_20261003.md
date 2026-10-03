# Phase 3Y — Authenticated Teacher Authoring Session (3 October 2026)

Parent Phase3X: `3b5a8cc07226c69beb46d8fbaa3b77d43c33468b`.
Development-only branch: `feat/paper-authoring-session-phase3y-20261003`.

## What is now connected (without a live route)
New backend `teacherAuthoringSessionPhase3Y.js` orchestrates the signed Phase3X teacher
projection and Phase3S draft staging boundary through trusted injected server ports.
Prepare returns the full teacher-only Phase3P read model and an unpredictable one-use
authoring intent. It binds the independently authenticated actor ID, school ID, tenant ID,
role, exact source publication ID, approved revision, signed records digest, cohort,
Full/ALP selection, both official book identities/hashes, and full projection fingerprint.
Intent is private process memory, valid for 10 minutes, max 64 globally and 3 per actor.
Only one in-flight save may consume a given intent. Cancellation and expiration are checked.
No browser-supplied token can approve Question Bank records or independently authorize saving.

## Save, read and revise
At save, the server independently authenticates the actor and retrieves the CURRENT
Phase3X teacher projection (which itself requires independently verified Phase3V publication
and a same-school subject enrolment grant). Any publication revocation, revision rollover,
changed record digest, subject enrolment removal or original academic source drift refuses.
The complete selected source ledger must match original published bilingual records;
each question type/chapter/topic must match the approved source. The bridge invokes Phase3S
with the same independently authenticated scope, and Phase3S reauthenticates and rechecks
the signed provider/current source before handing any write to its injected repository.
Phase3S was tightened to compare the expected backend actor/school/tenant/role on create,
read and revise. It also now rejects independently relabelling a signed question type
(for example, changing an approved Short to Long without source approval).

After a save attempt, its intent is consumed even if the database acknowledgment is
uncertain: no blind duplicate retry. Use a separately authenticated scoped read to
establish whether the original draft exists. Reopen and CAS revision independently recheck
current teacher enrolment, the publication pin, and immutable academic original records.
All existing print, publication and legacy bank update flags remain FALSE.

## Synthetic test coverage
16 focused tests verify: signed original Curriculum → Phase3V → authenticated Phase3X
→ Phase3Q/Phase3P preview → Phase3R draft → Phase3Y one-use intent → Phase3S fake
staging create/read/CAS. Verified errors include cross-school/other-teacher intent,
TTL expiry, publication rollover, revocation, teacher enrolment loss, forged original
source/record/pin, mismatched actor between two gateways, concurrent duplicate save,
unknown commit outcome, revoked feature, and direct question-type relabelling bypass.
Actual Ed25519 signatures are produced by temporary in-test keys for synthetic
bilingual academic records. These are NOT government-issued or Curriculum-authorized records.

## Not activated / remaining release gate
This module is dormant, nonproduction-only, and contains no HTTP route, DB connector,
external fetch, automated print, or persistent session storage. It will not survive
a server restart and is not multi-instance compatible. The fake repository is for
unit/integration tests only. Phase3U's REAL PostgreSQL 18 smoke test separately verified
the physical disposable SQL schema, but the actual Phase3S → Phase3T node-postgres
connector against a real PG server has NOT been exercised.
The Curriculum worktree has independent Urdu IX Biology verification in progress;
there is still no confirmed genuine PUBLISHED_APPROVED bilingual release at this boundary.
Before even isolated live staging activation: complete Curriculum Issue #1 and edition
evidence, independent subject-grant resolver, operator-reviewed publication key custody,
durable/scalable intent management, per-school database credentials, actual connector
transaction and revocation-race tests, backup/restore proof, tenant checks and
Urdu/English paper/print parity. Historical V13/Canonical V2 corpus stays locked.

## Final targeted acceptance
Phase3Y: **16/16 PASS**. Full serial Phase3O–Phase3Y regression: **118/118 PASS**,
zero failed/skipped, process exit code 0. The physical Phase3U disposable PostgreSQL
smoke remains a separate completed synthetic SQL check; no real `pg` adapter was used
in Phase3Y. Full frontend production build was intentionally not run on the low-memory PC.
