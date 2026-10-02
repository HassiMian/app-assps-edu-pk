# ASSPS Paper Generator — Phase 3I least privilege + native original evidence pre-review
Date: 2026-10-02.
Parent checkpoint: pushed/clean Phase3H 8c83a4b84fcc63ae4cf4a9cd93f38da4112abd21.
Feature: feat/paper-least-privilege-preflight-phase3i-20261002.
Status: OFFLINE CODE + REAL THROWAWAY SYNTHETIC PostgreSQL18 acceptance ONLY;
no persistent staging migration, no production change and NO approval of original papers.

## 1. Original native papers are immutable references
The current approved ORIGINAL paper appearance/content is authoritative: exact header/logo,
questions, numbering, marks/choices, tables, answer lines, graphics, Urdu RTL/Jameel
Noori, English Times New Roman/LTR, punctuation/brackets, A4 layout and exact
screen/print/PDF parity. None of Phase 3I modifies Paper Editor, PaperDocument, original
43 V13 papers, nine Early Years V2 sources, original overlays, print CSS, saved source
papers, First Term exams/results/marks, question bank, Daily Diary or Lesson Planning.
Any future separately authored editor remains an opt-in DRAFT working copy without
silently auto-converting original native sources or changing a renderer.
Phase3D actual principal-selected source-native DATA baseline JSON, matching FULL
original PNG, Print-to-PDF and exact visual manifest have still not been supplied
or independently reviewed. No synthetic fixture or self-attested SHA implies approval.

## 2. Why Phase 3I was needed
Phase3H proved bound authenticated per-school LOGIN identities, strict FORCE RLS
and resistance to a tenant forging app.paper_school_id, but its SECURITY DEFINER
function was still owned by the disposable synthetic test admin (superuser).
That ownership provides broader privileges than identity lookup needs.
Phase3I changes only the synthetic security contract to give the function a dedicated
assps_p3i_identity_owner role: NOLOGIN, NOSUPERUSER, NOBYPASSRLS, NO CREATEDB,
NO CREATEROLE, NOINHERIT and no tenant-role memberships. Owner is granted USAGE on
the test public schema plus SELECT of ONLY (login_role,school_id) columns of the
private paper_role_school_bindings table. Whole-table SELECT is not granted;
NO original paper_documents or paper_revisions read/insert/edit privileges are granted.
The SECURITY DEFINER still checks immutable authenticated SESSION_USER against that
private map and retains explicit search_path. PUBLIC function EXECUTE is revoked;
only two fictional school LOGIN principals get EXECUTE.
Original Phase3H role mapping/paper RLS policies, same-school actor composite FKs
and Phase3E/3F serializable DRAFT native JSON TEXT/SHA CAS remain unchanged.

## 3. Exact new source files
ops/paper-staging-review/phase3i-least-privilege-DISPOSABLE-ONLY.sql:
manual-only patch with BEGIN+hard target guard requiring the explicitly new
assps_paper_phase3i_ci on 127.0.0.1:55441, expected previous privileged function
owner and pre-existing pristine role-bound synthetic foundation. It REVOKEs PUBLIC
mapping/function access, adds minimum two-column SELECT to special NOLOGIN owner,
changes the trusted SECURITY DEFINER owner and preserves only the two authorized
fictional school EXECUTE grants. It never imports into config/migrations or server.

ops/paper-staging-review/phase3i-run-least-privilege-DISPOSABLE-ONLY.ps1:
an explicit action RUN_LEAST_PRIVILEGE_SYNTHETIC_ONLY is mandatory. Checks port free,
available C: space (>=2GB), exact PostgreSQL18 binaries, own marker-protected GUID
directory and prior trusted Phase3G/3H test-only source SQL. It initializes a NEW
separate loopback-only PostgreSQL cluster, random SCRAM test credentials and global
NOLOGIN function owner. Copies/adapts the older guarded synthetic SQL only to a
temporary file within its own newly created directory; does NOT mutate Phase3G/H
original source, any active service or production code. Tests real identity, backup
and separate-database restore, retains a fake-only archive and no-secret manifest,
stops its OWN pg_ctl cluster, then removes ONLY its verified stopped marker-owned data.
No npm download: reuses an already locally installed node-postgres module.

al-siddique-backend/src/tests/paperLeastPrivilegeRealPostgresPhase3I.test.js:
Phase3H's real two-school adversarial test contract, adapted solely to this new
dedicated synthetic port/DB; adds independent check of the NOLOGIN function owner,
superuser/bypass/CREATEDB/CREATEROLE flags, column-specific map SELECT but no
whole-table SELECT, no map UPDATE, no paper read or audit INSERT, school-only function
EXECUTE, zero legacy execute/membership. Both real school LOGINs remain unable to
SET ROLE to the owner and cannot access each other's paper even after GUC spoofing.
The base suite still tests school isolation, guarded CAS, real SERIALIZABLE races,
wrong-school actor, immutable native approval and audit.

al-siddique-backend/src/tests/paperLeastPrivilegeRestorePhase3I.test.js:
a real SECOND EMPTY database restore test comparing all synthetic native JSON and
SHA, protected audit triggers, forced role-bound policies, and now the exact
restored NOLOGIN/non-bypass function owner plus minimum column-level lookup grants.

## 4. Real acceptance run (not a fake database connector)
A truly separate PostgreSQL18 127.0.0.1:55441 cluster was created. The installed
Windows PostgreSQL service already listening on 5432 was never queried, restarted
or used. Fictional school IDs 51/52 and actors 11/12 with colliding draft paper IDs
were the ONLY data used. Phase3I strict owner patch ran only in new
assps_paper_phase3i_ci after both independent SQL guards passed.
Actual adversarial PostgreSQL tests: **9 / 9 PASS**, including the NEW owner-privilege
test and inherited eight role-binding/RLS/append-only/optimistic-CAS cases.
Actual pg_dump -Fc from the fake-only DB and pg_restore into DIFFERENT FRESH EMPTY
assps_paper_phase3i_restore_ci: **1 / 1 PASS**, including function owner and grants,
exact fake native UTF-8 TEXT and SHA, policies, restricted login role behavior,
two immutable audit triggers and private identity-map bytes.

First test run 8/9 exposed a *test expectation error*: granting SELECT of the two
specific map columns correctly makes has_column_privilege true but PostgreSQL
has_table_privilege(SELECT) false. Assertion was corrected to require BOTH narrow
column grants true and whole-table SELECT false. The final full REAL suite was
rerun and passed 9/9, and separate DB restore passed 1/1.

Fake-only archive retained OUTSIDE Git in:
%TEMP%\assps-phase3i-ephemeral-8e5dc35260cb4aa6b7cccc7666fcca27\
synthetic-least-privilege-PG18-backup.dump
synthetic-least-privilege-evidence.json
Archive bytes: 22,596
Archive SHA256:
25aa677fd9872f992b13403343cad05761467bd1c5efadcf831d5d5a685d3eca
Actual independent hash and no-secret manifest were re-verified. Cluster STOP
succeeded, marker-owned temporary DB data was removed; port 55441 listeners=0
and original Windows PG5432 service still had two listening bindings.
This fictional archive is NOT encrypted, is NOT a real school/staging backup and
does NOT prove recovery of PostgreSQL global roles into a wholly new cluster.

## 5. Separate Phase3D four-file pre-review (NOT a release/approval mechanism)
al-siddique-backend/src/services/papers/paperPrincipalEvidencePreflight.js is a
pure UNMOUNTED, read-only helper for the principal's actual native baseline JSON +
Phase3D evidence manifest JSON + full preview PNG bytes + original Print/A4 PDF bytes.
It follows the existing Phase3D v1 envelope and checks baseline/manifest payload SHA,
SAVED_PAPER and EARLY_YEARS_REFERENCE family/tenant/paper identity, source/text-overlay
hashes, original renderer and source revision, PNG bytes/geometry and PDF magic/EOF,
declared A4 MediaBox if available (unknown remains explicitly NOT MACHINE VERIFIED),
the matching SHA/size and evidence geometry across all four retained files.
Any missing/substituted/forged/relabeled source, PDF, PNG, paper/scope mismatch,
false APPROVED/cutover flags or a recomputed unsigned forged approval fails CLOSED.
The only successful result remains:
FOUR_FILE_IDENTITY_VERIFIED_HUMAN_VISUAL_REVIEW_PENDING,
with independentlyApproved=false, productionCutoverAllowed=false and
sourceMutationAllowed=false, even if every machine-checkable fingerprint matches.
This helper cannot determine if PNG content equals all PDF pages, whether the principal
selected the true last-approved LIVE browser source, if fonts/rendering/RTL/marks/MCQs
visually match, or whether it is a genuine screenshot. The existing original Phase3D
family-specific authoritative validator and HUMAN page-by-page visual review are STILL
mandatory after this supplemental pre-review; this is not a browser replacement.

al-siddique-backend/src/tests/paperPrincipalEvidencePreflightPhase3I.test.js:
synthetic 4-file Saved Paper and Early Years fixture families, corruption/missing
files, mismatched school/paper, tampering, forged manual approval even with recomputed
unsigned digest, non-A4 pages and absent PDF page-size metadata. **8/8 PASS**.
al-siddique-backend/src/tests/paperLeastPrivilegeSafetyPhase3I.test.js:
checks manual-only SQL guards/owner/grants, explicit own isolated runner and no
auto-migration/live DB imports, strict opt-in tests, and pre-review never grants
production/source changes. **5/5 PASS**.

## 6. Remaining hard BLOCKERS before authentic staging/release
1. Genuine principal-approved actual selected native paper baseline, full screenshot,
   native A4 Print/PDF, Phase3D manifest and independent reviewer comparing each page
   (including font availability/Urdu bracket placement/marks/tables/visual assets).
2. Reviewed authorized PERSISTENT nonproduction PostgreSQL inventory/tenant schema,
   actual school/user PK types, grants, indexes, role membership/secret routing.
3. Genuine encrypted backup AND tested restore of that authorized persistent staging
   source before a separately approved manual migration. Synthetic-only backup does
   not satisfy this prerequisite; actual production remains off-limits.
4. Production credential handling/pool mapping from authenticated school only, tenant
   lifecycle and rotation, and independent cross-cluster global-role restoration proof.
5. Security function owner in synthetic now least-privilege, but admin/superuser compromise
   and theft of another login credential remain out of scope. Review grant-option
   limitations, safe search_path, function definitions, role creation and RLS behavior
   under exact future real schema. No permission to deploy this test SQL to production.
6. Old legacy config/migrations/005_rls_policies.js permissive condition is untouched,
   and MUST NOT be copied to new paper tables.

Continue exact Phase3J from pushed Phase3I HEAD, preserving original approved native
paper appearance; only start authenticated real persistent staging work after those
external permissions and principal evidence are independently verified.
