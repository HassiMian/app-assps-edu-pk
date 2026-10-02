# ASSPS Paper Generator — Phase 3J private school routing and fresh-cluster role recovery

Date: 2026-10-02
Parent: pushed clean Phase 3I e6d5452afd29747fdb356c4bc1e74ccb1578d300.
Branch: feat/paper-trusted-pool-global-restore-phase3j-20261002.
Scope: dormant synthetic-only development, zero production integration/migration.

## Original principal native paper preservation
All original approved papers are LOCKED reference material. Every native question,
content/marks, tables, answer space, Urdu Jameel Noori / RTL punctuation, English
Times New Roman / LTR, overlays, diagrams, logo, screen/editor/print parity, A4
and original print-PDF remain authoritative. Phase3J did not change the original
43 official V13/canonical papers, nine Early Years V2 sources, current browser
frontend, saved paper data, Phase3E/3F transactional module, existing Phase3H
gateway, migrations, active routes, examination/marks, Question Bank, Diary or
Lesson Planning. Protected frontend Git tree stays
209bf6375b9eb57fc269e04309f435bc1270effe.
Only future separately authorized, opt-in independent DRAFTs may be considered.
Actual principal's four native source-evidence files remain NOT SUPPLIED.

## 1 — Previously missing authenticated credential-selection boundary
New standalone dormant paperTrustedSchoolRouterPhase3J.js. A trusted backend
bootstrap injects a PRIVATE server-authenticated actor resolver plus distinct
per-school credentialed connector functions and verified nonproduction gate.
The factory rejects missing/ambiguous mappings, non-integer or duplicate IDs,
wrong or privileged LOGIN names, duplicate roles and shared connector function
identity. The frozen public returned object exposes ONLY revise, NOT raw pools,
connections, credentials or a client-selectable school role. The sole actor
comes from the private trusted resolver, never request school_id/header/body,
client-supplied role, connect or gate. A missing school mapping fails CLOSED.

Every connection starts with SELECT session_user AS authenticated_login and
public.phase3h_session_school_id() AS verified_school_id. Both must independently
equal the privately mapped LOGIN/school before any BEGIN or paper SELECT.
Mismatch releases/quarantines client. Existing Phase3H rechecks the binding,
then unchanged Phase3E/3F DRAFT-only SERIALIZABLE native JSON TEXT/SHA optimistic
CAS and immutable revision audit execute. No active Express route or production
pool import and no credential configuration is added. This does not itself prove
that future application authentication or secret management is correctly wired.

New static/offline tests paperTrustedSchoolRouterPhase3J.test.js: **7/7 PASS**
including forged actor/connection/gate fields, missing server session, wrong
pool LOGIN, spoofed tenant and first-read ordering.

## 2 — Real PG18 source and TWO physically independent new clusters
Standalone one-shot runner phase3j-run-two-INDEPENDENT-disposable-clusters-ONLY.ps1
requires explicit RUN_TWO_NEW_SYNTHETIC_CLUSTERS_ONLY action, C: free space>=2GB,
no existing listeners on its dedicated two loopback ports, locally installed PG18
and owned GUID path marker. Does not load any application .env or live database.

NEW source PostgreSQL cluster:
127.0.0.1:55442, source DB assps_paper_phase3j_ci, bootstrap assps_p3g_admin.
NEW physically separate recovery PostgreSQL cluster (separate initdb/data directory,
distinct bootstrap and random password):
127.0.0.1:55443, DB assps_paper_phase3j_restore_ci,
bootstrap assps_p3j_restore_admin.
The existing Windows PostgreSQL service on 5432 was never connected to, restarted
or modified. Previously verified Phase3G base, Phase3H strict role mapping and
Phase3I limited NOLOGIN SECURITY DEFINER owner SQL are adapted only as disposable
temporary copies with exact source DB/port guard checks. No previous phase SQL changed.
ALL inserted paper, school and actor data are fictional.

Actual restricted-login native router tests, 6/6 PASS (zero fail):
school51/school52 same paper ID separate DRAFT revisions, forged browser role/school
and rogue connect ignored, mismatched physical DB LOGIN caught BEFORE transaction,
unregistered school and unknown auth session rejected before connection, real
SERIALIZABLE two-writer conflict one winner/one loss and one immutable next audit,
protected APPROVED original unmodified, cross-school forged GUC still denied.

## 3 — Genuine cross-cluster global role recovery rehearsal using fake data
A normal pg_dump -Fc captures a DATABASE but not PostgreSQL global roles.
This runner also captures a source pg_dumpall --globals-only
--no-role-passwords, confirming expected fictional roles and the absence of
source plaintext/SCRAM/MD5 password material. The second independent cluster is
bootstrapped with a DIFFERENT administrator, first receives those password-free
GLOBAL role definitions/memberships, then a fresh database is created and actual
pg_restore --exit-on-error restores schema and data. Target fictional school51
and school52 credentials are both freshly generated/rotated after global recovery.

Actual independent target-cluster verification: **1/1 PASS**, zero fail.
It compared every field/row of synthetic schools, users, paper_role_school_bindings,
paper_documents and paper_revisions including exact native UTF-8 TEXT and SHA;
all five relevant global role flags/memberships, NOLOGIN least-privilege function
owner, private map two-column SELECT but NOT table-wide SELECT, FORCE+ENABLE RLS,
strict policy definitions and both immutable audit triggers. Both fictional
new tenant credentials log in, retain cross-school RLS isolation despite forged
custom tenant GUC. OLD school51 source credential fails to authenticate on target;
restored school51 accepts only its newly rotated credential. Source secrets never
travel inside global dump. Separate source and target initdb were real PG18 runs,
not two databases in one source cluster and not mocked fake Pool tests.

## 4 — Retained fake-only SHA evidence and verified cleanup
External TEMP folder only (NEVER Git):
assps-phase3j-ephemeral-29d780a4d8824343bd2fdef59ec614e0
Synthetic archive: synthetic-source-database.dump
Archive size: 22,657 bytes.
Archive SHA256:
935ed246cbe5e106eaea6360308cec07caf5e00a120fbbdd1a85f22fb6111b26
Non-secret report: two-independent-cluster-evidence.json.
Global role dump SHA saved in manifest; temporary password-free role dump SQL REMOVED.

The source cluster and independent recovery cluster BOTH confirmed pg_ctl STOP;
only the self-created marker-owned stopped DATA directories were removed. Postcheck:
ports 55442 and 55443 have ZERO listeners, original 5432 still has two listener
bindings; source-data REMOVED, target-data REMOVED, temporary globals SQL REMOVED.
Archive SHA, byte count, JSON proof and C: free space independently checked.
The retained archive is fictional and UNENCRYPTED. It does NOT count as an actual
school encrypted backup, real staging restore or principal visual approval.

Default-mode combined Phase3B+3E+3F+3G+3H+3I+3J offline regressions:
86 total, 77 PASS, 0 FAIL and nine intentionally SKIPPED REAL-PG opt-in cases.
The NEW 6 source real and 1 separate-cluster recovery real case ran independently
and PASSED under the own cluster runner. Node and PowerShell syntax checks PASS.
Phase3J static source/safety tests paperGlobalRecoverySafetyPhase3J: 6/6 PASS.

## 5 — Next REAL prerequisites, still not fabricated
A. Principal must select an actual last-approved LIVE original paper and retain
the four authentic Phase3D files from the SAME signed-in browser/editor/source
revision: native source DATA baseline JSON, full original preview PNG, original
native A4 Print-to-PDF, visual evidence manifest JSON. Independently verify ALL
pages, fonts, Urdu marks/brackets, English text, margins, tables, assets/diagrams,
answer lines and printed question numbering. Phase3I hash preflight alone is NOT
principal approval; reviewer provenance and page-by-page signoff remain missing.
B. Verify an authorized PERSISTENT isolated nonproduction staging DB, its actual
schema/user PK types, school permissions, private LOGIN credentials and inventory.
C. Take an actual encrypted authorized school/staging backup and independently
practice fresh-cluster recovery of database, global roles and credential rotation
with documented human approvals, before any persistent migration or cutover.
D. Design and authorize production-ready private authentication resolver, external
secret manager, per-school pool lifecycle/rotation, failure policy and scale limits.
Two fictional roles do not prove production operational readiness.
E. Existing production code, original renderer, legacy RLS migration and real
school data are untouched. No automatic paper conversion, new SQL migration,
live deploy, original source overwrite or implicit teacher-paper approval permitted.

Continue Phase3K from the exact pushed Phase3J HEAD. Do NOT restart any earlier
completed phases. In absence of independently supplied genuine source/staging
artifacts, continue ONLY read-only preparation and source-preserving checks.
