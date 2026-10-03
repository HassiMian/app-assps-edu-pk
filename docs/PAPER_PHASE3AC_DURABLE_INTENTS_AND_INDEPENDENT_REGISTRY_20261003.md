# Phase 3AC — Role-Isolated Registry and Durable One-Use Intents

Date: 3 October 2026. Parent: Phase3AB `3dce0513d7b10b450137b9dd26e4dbc7092e990f`.
Branch: `feat/paper-durable-registry-intents-phase3ac-20261003`.

## Exact scope: disposable staging proof, NOT a real roster integration
Existing school middleware supplies authenticated user/school/tenant context, but
no independently reviewed institutional teacher→class→subject↔edition registry
or production-safe grant connector had been established in this isolated checkout.
Do not guess a real staff assignment table. Phase3AC creates a SELF-CONTAINED
synthetic-only PostgreSQL 18 proof of the missing Phase3AB read-port contract and
a transactional multi-instance one-use intent ledger. No production migration or route.

Files:
- `ops/paper-staging-review/phase3ac-registry-and-intents-DISPOSABLE-ONLY.sql`
- `al-siddique-backend/src/services/papers/disposableRegistryIntentPortsPhase3AC.js`
- `al-siddique-backend/src/tests/disposableRegistryIntentsPhase3AC.test.js`
- `ops/paper-staging-review/phase3ac-run-durable-registry-DISPOSABLE-ONLY.ps1`

## Registry and access model
Prerequisite is a newly initialized **marker-owned** Phase3U synthetic PG18 database
`assps_paper_phase3u_ci`, bound only to `127.0.0.1:55443`, with separate freshly
generated password-protected session users for synthetic school 51/tenant-51 and
school 52/tenant-52. Extension independently refuses wrong database/port/login,
missing Phase3U base tables, or previously created Phase3AC tables.
Four private provenance-bearing synthetic registries (school, staff, assignment,
curriculum binding) are owned by a NOLOGIN schema owner, FORCE RLS protected,
and are NOT directly SELECT/UPDATE/DELETE accessible to school login roles.
Explicit purpose-only SECURITY DEFINER read functions authorize the requesting
`SESSION_USER` mapped by Phase3U private role bindings. No JWT/header/GUC override.
The injected Node adapter validates `session_user`, verified school and tenant
before each read/intent operation and returns exact Phase3AB read-port shapes.
Phase3AB independently rechecks school, human staff, separately reviewed assignment,
class/subject, exact textbook edition, Full-vs-year-specific-ALP evidence before
issuing the advisory Phase3X grant.

## Durable, multi-instance intent CONTRACT (not yet mounted into Phase3Y)
Private `phase3ac_intents_staging` preserves actor ID/role/school/tenant, assignment,
signed-publication ID, independent source binding SHA, positive approved revision,
source question records digest, projection fingerprint, exact source-pin JSON,
database-clock issue/expiry times and READY/CLAIMED/SPENT/CANCELLED state.
Purpose-only functions expose RESERVE, atomic CLAIM, FINISH and CANCEL; application
school logins cannot SELECT or change intent rows directly. Reservation serializes
capacity across connections (max 64 READY intents per school, 3 per actor).
Claim is one-use READY→CLAIMED and independently rechecks live school, active human
staff, valid nonself-reviewed teaching assignment, edition binding, Full/ALP evidence,
and holds a real `FOR SHARE` lock on the STILL PUBLISHED_APPROVED publisher row.
A concurrent revocation cannot overtake that lock; an already revoked publication
causes CLAIM to fail. A CLAIMED intent is never automatically reset to READY,
even after a crashed/unknown-outcome worker: manually inspect scoped draft before
any new attempt. FINISH makes SPENT; CANCEL only applies to an untouched READY intent.
Phase3Y still uses its existing process-local Map until a separate reviewed integration
switches its ports to this DB-backed contract. This phase proves a replacement interface
and concurrent behavior; it does NOT falsely claim that Phase3Y is now multi-instance.

## Real PG18 verification and discovered security repair
First run uncovered a genuine flaw: a previously reserved intent could be claimed
after publisher revocation. Phase3AC CLAIM was corrected to re-resolve and lock
the current PUBLISHED_APPROVED row during the atomic database claim, plus repeated
checks for assignment, school and curriculum binding revocation. After hardening:
**10/10 real PostgreSQL integration tests PASS, 0 failures/skips, exit 0.**
Cases: private SESSION_USER/RLS and no direct access; actual Phase3AB using private
PG registry read ports; two separate Node connectors racing on one claim (exactly
one succeeds); wrong fingerprint/digest/actor/school refused; assignment/publisher
revocation, expiry, cancellation, later school/Full-edition downgrade, concurrent
capacity enforcement, and CLAIMED never automatically becoming reusable.

## Restore, cleanup, independence
Freshly built PG18 was backed up (`pg_dump -Fc`), its archive catalog inspected
and restored into a second new synthetic database. Independently verified:
**0 new-authoring drafts, 0 revisions (no fake paper saved here), 2 school entries,
2 staff entries, 1 class/subject assignment, 1 textbook binding, and 10 durable intents.**
Verified synthetic archive SHA256:
`0cf06be1264637088a75d032923abbb5b7dd2e3f33bb50917bd130ce8d530df0`.
Temporary offline `pg@8.20.0`/dependencies were installed exclusively under the
marker-owned temp directory, without any network download. After runner exit, its
own cluster was stopped, test data/dependencies deleted, and no listener remained
on port 55443. Its archive and sanitized test evidence manifest are retained.
The independent Curriculum worktree, official question data, live school accounts,
existing V13/Canonical V2 papers, exams, and production route configuration were untouched.

## NEXT BLOCKERS — activation expressly prohibited here
1. Independently identify and review the REAL school/staff/teacher-class-subject
   database source, with proper provenance, enrollment, role/tenant constraints;
   the synthetic fixture is not a school authority.
2. Finish actual Curriculum IX EN/UR edition equivalence, chapter/exercise indexing,
   Full/ALP evidence, independently approved academic records and genuine issuer signature;
   current manifest still has `liveSeedCount=0` and Urdu edition VERIFY.
3. Review integration from Phase3Y's Map to the persistent intent adapter. Ensure
   authenticated actor and current Phase3X projection revalidation on prepare/save,
   and use idempotent/manual recovery after unknown DB commit outcomes.
4. Independently review production schema/RLS/key custody, institutional restore,
   student/teacher privacy, Urdu-English PDF/Word/print parity and canary rollback.
All modules remain dormant; real publication, printing, staging rollout and production
activation are explicitly NOT authorized by these tests.

### Final independent regression acceptance
The existing Phase3O–Phase3Y plus Phase3AB targeted suites were rerun serially:
**135/135 PASS, no failures or skips**. Phase3AC separately added **10/10 real PG18
integration passes**, giving 145 targeted passing checks across the two runs.
Phase3AC SQL was applied only to a freshly created Phase3U cluster. The physical
backup/restore recovered its full private registry and exactly 10 durable intent rows.
A first-run failure exposed a claim-time publisher-revocation gap; source-controlled SQL
was corrected and the final hardened run passed. The first failed disposable cluster
was also stopped/cleaned, and is not counted as a successful acceptance run.
