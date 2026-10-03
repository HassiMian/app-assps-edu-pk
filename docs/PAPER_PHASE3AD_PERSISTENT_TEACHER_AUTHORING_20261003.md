# Phase 3AD — Signed Teacher Authoring with Durable One-Use Intent

Date: 3 October 2026. Parent Phase3AC: `7e14a4f1183f9beee13c5cb57772d6cc63002c44`.
Feature branch: `feat/paper-persistent-authoring-session-phase3ad-20261003`.

## Purpose and exact activation boundary
Phase3Y is a proven but SINGLE-PROCESS Map-backed teacher authoring coordinator;
Phase3AC separately proved an isolated physical PostgreSQL role-scoped persistent
one-use intent registry. Phase3AD now explicitly connects these two reviewed
contracts through NEW dormant `persistentTeacherAuthoringPhase3AD.js`.
The old Phase3Y implementation is not replaced, and its tests/semantics are
unchanged. Its already-tested source-preserving validators are merely exported
for reuse: `checkedProjection`, `sourcePin`, `assertSourceBinding`.
No Express route, live DB credentials, real Curriculum release, automated print,
production deployment or existing-paper migration is introduced.

## Flow — every authority remains server-owned
1. PREPARE: authenticate teacher from trusted injected backend, resolve the current
   Phase3X projection (which independently calls Phase3AB staff/subject assignment
   and Phase3V signed publication). Re-authenticate actor; independently query the
   original staff assignment, checking class/grade/subject, current validity
   interval, reviewer provenance and its relation to the signed projection.
2. RESERVE: compute canonical source pin and a SHA-256 of the full original
   teacher projection. Invoke Phase3AC persistent intent reservation using
   server-resolved actor/assignment only; DB verifies its own current roster,
   edition/Full-versus-ALP binding and approved published row, then atomically
   applies capacity limits (max 3 ready per staff, max 64 ready per school).
   Only the UUID, expiration and UNSAVED/teacher-only projection go to the caller.
3. SAVE: re-authenticate; independently re-fetch CURRENT signed Phase3X source
   from the draft sourceIdentity's academic scope. Compare untouched bilingual
   source ledger, publication revision, both PDF SHA-256s, selection and marks.
   Then call Phase3AC atomic READY→CLAIMED using current publication fingerprint.
   Validate the private claim receipt's complete JSONB source pin (deep equality
   independent of PostgreSQL JSONB key order). Re-authenticate again before
   invoking Phase3S.create with the same trusted scope. Phase3S independently
   re-resolves current Phase3V and Phase3T holds a physical SQL publisher lock
   throughout the draft+initial-audit transaction. A browser UUID alone cannot save.
4. FINISH: a claimed intent is marked SPENT even if Phase3S reports a failed
   or unknown COMMIT result. If finish acknowledgment fails, never claim success;
   leave the intent CLAIMED (non-replayable). Do not automatically attempt
   another insert. Use separately authenticated readVerified(draftId) to discover
   whether a previous database commit persisted.
5. REOPEN/REVISE: Phase3S scoped read/CAS and fresh Phase3X publication/subject
   revalidation still apply. The immutable sourceLedger and independent
   editor's protected section/question structure cannot be rewritten.
6. CANCEL: only the same independently authenticated staff member may cancel
   an untouched READY durable intent. A CLAIMED/SPENT/foreign ticket is refused.

## Trust invariants
Constructor and every operation refuse NODE_ENV=production. Explicit gate:
`PHASE3AD_PERSISTENT_AUTHORED_INTENT_STAGING_ONLY`, confirmedNotProduction,
independent Phase3X+3AB review, disposable Phase3AC SQL CAS verification,
and reviewed Phase3S source/scope revalidation. Exactly injected trusted
`authenticate`, `teacherProjection`, `readAssignment`, `intents` and
`draftGateway` ports required. Neither source nor assignment is taken as an
authoritative value from the browser. Return flags remain
`authorizesPersistence:false` at preparation, `approvedForPrint:false`,
`studentAccessible:false` and `authorizesProduction:false` in the gateway.

## Executed synthetic tests (not government academic records)
13 focused deterministic tests, using real temporary in-test Ed25519 signatures:
first create/read/CAS, two coordinators sharing an atomic fake intent store, signed
revision rollover, source-ledger tampering, unknown DB commit with authenticated
recovery, unknown finalization (CLAIMED never replayable), foreign teacher/school,
expired/cancelled intent, revoked assignment, malformed private claim acknowledgment,
authenticated scope drift after claim, pending-capacity limit, publication revocation
and production/dormant gate.

Physical disposable integration replays Phase3AC's ten role-isolation/assignment/
publication/intent concurrency cases, then adds a signed synthetic
Phase3V → Phase3AB → Phase3X → Phase3Q/3R → Phase3AD (two independent
Node coordinators, two separately acquired per-school PG pools) → Phase3S → Phase3T
create/read/CAS case. Exactly one coordinator saved a native draft; its SQL
audit history contained exact revision 1 and revision 2 with prior SHA linking.
The original Urdu string and English/Urdu source ledger remained identical.
Synthetic school52 login could not see the stored school51 paper.

**FINAL physical PG18 run: 11/11 PASS, 0 failures, 0 skips, exit 0.**
Source-controlled scripts created only a new random marker-owned PG18 cluster
`assps_paper_phase3u_ci` bound to loopback `127.0.0.1:55443`, fresh SCRAM
credentials, Phase3U base SQL + Phase3AC extension, and pg@8.20.0 installed
OFFLINE inside that exact disposable temp directory. Marker, data_directory,
session_user and tenant mapping were independently asserted before any mutation.

### Archive, restore and teardown
Custom `pg_dump -Fc` restored into another independently created synthetic database.
Restored counts: **1 draft, 2 append-only revisions, 2 school rows, 2 staff
rows, 1 class/subject assignment, 1 curriculum binding, 11 durable intent rows.**
Verified backup SHA-256:
`1763de8f59e5fa75fde91b0c9c31389f98d69a852d80f55a37da400c13e818ca`.
Temporary cluster stopped, its private DB data/offline node_modules removed;
the synthetic proof manifest/archive are retained in the unique temporary folder.

## Outstanding approval gates (critical)
This is a staging-only architectural proof and does NOT enroll a real school or
authorize production. The registry entries, academic textbook hashes, reviewers
and Ed25519 private key in tests are intentionally SYNTHETIC. Phase3AB's actual
independently reviewed institutional school roster adapter, true Curriculum
publisher/reviewer release, verified IX Urdu edition/indexes and PECTAA bilingual
evidence remain pending. Additionally review shared intent-recovery operational
runbook, institution backup/restore, school RLS/credential/key-custody privacy
controls, and Urdu/English Word/PDF/print visual parity before any live rollout.

### Final acceptance checkpoint
Phase3O–Phase3AD serial targeted regression: **148/148 PASS, 0 failures/skips**.
Independent real PG18 acceptance: **11/11 PASS, 0 failures/skips**, exit code 0.
The recovered disposable database contained exactly one native draft, two immutable
source-preserving revisions, and 11 durable intent rows. Its source-controlled
archive SHA-256 matched the evidence manifest. Source and PowerShell syntax checks
passed. Temporary cluster data and offline dependencies were removed; PostgreSQL
port 55443 listener count was independently zero. The separate Curriculum worktree
remained clean at `21d8fd5` throughout this milestone.
