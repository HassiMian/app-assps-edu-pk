# ASSPS Paper Generator — Phase 3H Real Role-Bound Tenant Identity
Date: 2026-10-02
Exact parent: d7ec65f2b84ba5b353667bb94dc00ec5c83f3a43 (Phase3G pushed and clean).
Branch: feat/paper-role-bound-tenant-identity-phase3h-20261002
Status: isolated synthetic PostgreSQL18 proof ONLY. No persistent staging or production deployment.

## Non-negotiable original-school-paper contract
Preserve the principal-approved original question order/text, marks, options, tables,
answer space, Urdu Jameel Noori/RTL, English LTR, logo, images, overlays, A4 page breaks,
native screen/print/PDF and approved source bytes exactly. Phase3H does not change the
frontend/renderer, protected 101 paper source references, nine Early Years V2 originals,
43 canonical V13 papers, approved user edits, backend active DB pool/route, migrations,
exams, marks entry, or production. Any future new editor is an opt-in independent DRAFT.
Actual principal-approved browser DATA JSON + full native PNG + original native PDF
and Phase3D manifest remain missing and must have separate HUMAN visual acceptance.
Artificial tests, signatures and synthetic evidence NEVER confer paper approval.

## Problem solved in the bounded synthetic test
The earlier strict app.paper_school_id transaction-local custom PostgreSQL setting (GUC)
can be changed by any app database principal capable of running arbitrary SQL.
Phase3H tests an independent role-bound identity boundary to resist this spoofing.
Two restricted, separate fictional LOGIN roles, assps_p3h_school51 and
assps_p3h_school52, are created with distinct randomly generated SCRAM credentials.
Neither is SUPERUSER/BYPASSRLS/CREATEROLE/CREATEDB, nor a member of the other role.

Private admin-owned paper_role_school_bindings maps original authenticated LOGIN name
uniquely to school_id. Tenant login roles get NO table SELECT/INSERT/UPDATE/DELETE grants.
phase3h_session_school_id() is a stable SECURITY DEFINER SQL function with an explicit
search_path and qualified private binding table; it resolves SESSION_USER, not
CURRENT_USER, request headers or a client-set custom setting. PUBLIC function EXECUTE
is revoked; only the two distinct school login roles have EXECUTE grants.

Both synthetic paper_documents and paper_revisions use ENABLE + FORCE RLS and one
policy for exactly these two school roles: USING school_id equals the role-bound function,
WITH CHECK school_id equals the same role-bound function. No fallback from disabled
app.rls_enabled, no app.is_super_admin bypass, no app.paper_school_id dependency.
The old Phase3G GUC-only app role is NOLOGIN and its test paper grants/policies revoked.
Extra composite same-school foreign keys bind created_by, updated_by and audit actor_id
to users(school_id,id), preventing cross-school actor attribution. Native JSON TEXT
SHA CHECK, composite paper FK, DRAFT-only CAS and immutable revision triggers remain.

## New dormant backend gateway
al-siddique-backend/src/services/papers/paperRoleBoundStagingGateway.js adds
appendRoleBoundStagingDraftRevision with NO Express route, credential import, app
startup/migration hook or production pool. The future trusted backend chooses a
separately credentialed school connector based ONLY on independently authenticated
actor context. Its first query, BEFORE BEGIN or any native paper SELECT, calls
phase3h_session_school_id and requires an exact match with the authenticated actor's
school. Missing, ambiguous or mismatched mapping releases/quarantines the connector
and cannot access a paper. Student/super-admin shortcut actors are not admitted to
the gateway. On correct binding it invokes the unchanged Phase3E/3F draft CAS,
source-protection and append-only audit transaction; no automatic approval.

## Actual REAL independent PostgreSQL18 execution
On CYBERSPACE, a NEW GUID-named, ownership-marker-protected disposable cluster was
initialized with locally installed PostgreSQL18 at 127.0.0.1:55440. Existing PostgreSQL
service on port 5432 was never accessed, restarted, changed or used as a source.
A pristine synthetic Phase3G schema with its hard port+database guard adapted to
55440 / assps_paper_phase3h_ci was applied, then a separately guarded role-binding
patch. It contains ONLY fictional school IDs 51 and 52, actor IDs 11 and 12, colliding
native DRAFT paper IDs, one synthetic protected APPROVED source and racing draft.
No actual student data or principal-approved paper was queried or copied.

Real node-postgres adversarial suite: **8/8 PASS, 0 FAIL, exit 0.**
1. Distinct LOGIN/SESSION_USER independently resolve own private school mapping and
   only own paper/audit rows; private mapping SELECT/UPDATE denied to tenant roles.
2. School51 forged app.paper_school_id=52, app.rls_enabled=false and
   app.is_super_admin=true. Real database RLS still exposed ONLY school51 rows.
3. School51 SET ROLE into school52 or admin and SET SESSION AUTHORIZATION into school52
   all fail; pg_has_role verifies no cross membership.
4. Cross-school UPDATE touches zero rows, wrong-school updated_by blocked by composite FK.
5. Wrong-school authenticated actor routed to school51 connector is rejected by the
   gateway BEFORE BEGIN or any paper SELECT.
6. School51 and school52 safely advance own DRAFT sharing the exact same paper ID,
   with correct immutable revision SHA chain; protected APPROVED source is unchanged.
7. Stale update rejected; competing real SERIALIZABLE writers cause exactly one success,
   one rejection and one immutable next revision.
8. Both policies allow only the two bound roles, use no forgeable client GUC, and
   tenant logins cannot alter original audit rows or change paper status to APPROVED.

Separate REAL synthetic backup+restore: **1/1 PASS, 0 FAIL, exit 0.**
A PostgreSQL custom archive was created with pg_dump -Fc, inspected with pg_restore
--list and restored with pg_restore --exit-on-error into a SECOND EMPTY database
assps_paper_phase3h_restore_ci in that independent cluster. Independently verified
every synthetic schools/users/private role-binding/paper_documents/paper_revisions
row and field, exact original native UTF-8 text/SHA, strict policy definitions,
trusted session binding function, forced RLS and both revision triggers. The restored
school51 login STILL cannot see school52 after forging client tenant GUC.

Retained outside Git in TEMP (SYNTHETIC ONLY):
assps-phase3h-ephemeral-b5b8778823dd4c6fb0f0889dd69fa6fc
synthetic-role-bound-PG18-backup.dump (21,974 bytes)
synthetic-role-bound-evidence.json (contains no credentials)
Archive SHA-256:
319ddff432a243e151800ffa33049515c18ffece674858a181df1ef74674975e

After actual acceptance, own pg_ctl STOP succeeded and only the stopped marker-owned
temporary cluster DATA directory was deleted. Port 55440 listeners=0; original
port 5432 service still had two listener bindings. The synthetic archive is NOT
encrypted and does NOT count as a genuine school/staging backup or a cross-cluster
global-role disaster recovery test. Original files and genuine tenant DB stayed untouched.

## Offline and implementation evidence
Default mode combined Phase3B+3E+3F+3G+3H backend contracts: 56 tests total,
51 PASS, zero FAIL, 5 deliberately SKIPPED real PG tests. Phase3H real tests were
separately explicitly enabled ONLY inside its disposable runner and PASS (8 + 1).
New code syntax and PowerShell parser PASS. Initial real run 7/8 had a test-only
PostgreSQL name[] result returned as a text-literal rather than JavaScript array;
normalized the assertion and independently reran all 8 real attacks successfully.
Protected frontend Git tree remains the inherited Phase3D native tree hash.

## Still mandatory before any production/persistent staging
- Actual selected principal-approved DATA/PNG/PDF/manifest, including human visual and
  original font/print parity; no actual live user-approved source evidence captured.
- Reviewed authorized PERSISTENT nonproduction schema and real encrypted school/staging
  backup with a verified independent RESTORE. Fake-only disposable archive is insufficient.
- Production-appropriate per-school pool/secret routing, credential isolation and rotation,
  audited login privilege/membership management, and role scalability.
- Replace disposable function's superuser owner with a reviewed least-privilege
  dedicated NOLOGIN SECURITY DEFINER owner before any persistent staging migration.
  Restore of database-global roles to a different PG cluster needs separate verification.
- Admin/superuser compromise or theft of another school's actual DB login credential can
  defeat this prototype; it proves bounded resistance to arbitrary SQL executed by an
  otherwise restricted school-login identity, not absolute or cryptographic security.
- Legacy 005_rls_policies.js permissive bypass is diagnosed but NOT changed/deployed here.
- No real paper migration, no original source overwrite, no print renderer cutover,
  no production release. The prototype remains entirely OPT-IN/DORMANT.

Phase3I checkpoint: obtain real principal native paper evidence and independent signoff;
design trusted production pool routing / least-privilege function owner and actual
persistent staging backup/restore before proposing reviewed manual migration.
