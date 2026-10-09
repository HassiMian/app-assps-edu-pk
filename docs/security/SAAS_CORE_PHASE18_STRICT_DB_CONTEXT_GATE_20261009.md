# ASSPS SaaS Core Phase18 — strict authenticated database scope normalization

**2026-10-09 UTC. Isolated fix. Production RELEASE HOLD.**

## Exact source, control and ownership
- Parent exact clean, pushed SaaS Core Phase17: `93cd1ac3ebc98a886f06cbc56fc5db1da053052e`. New isolated branch `feat/saas-core-phase18-strict-db-scope-20261009`, worktree `/root/workspace/assps-core-phase18-strict-db-scope-20261009`.
- Core owns backend authenticated PostgreSQL boundary. No Paper Studio, Connect or Academic Master-owned source is modified; prior five multilingual/RTL print layouts, official 43-paper corpora and six locked templates remain byte-unchanged. The 26 dirty ARCHV1 live-source paths remain untouched.
- Last independently verified **deployed** commits at start of this phase: frontend `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92`, backend `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9`; this candidate not in production.

## New fail-closed defect (not a Phase10/11/13 cleanup repeat)
The existing Core `normalizedRuntimeContext()` accepted caller-supplied `isSuperAdmin` using `Boolean(...)`, where **`Boolean("false") === true`**. In legacy authenticated database role mode, that would create `app.is_super_admin=true`, clear the school ID, and permit privileged database context if the upstream ALS context provided such a malformed flag. Separately, `parseInt("900001suffix",10)` and `parseInt("9e5",10)` silently accepted numeric prefixes instead of rejecting malformed school scope. Non-boolean `rlsEnabled` could activate implicit role context through JavaScript truthiness. The actual auth middleware currently assigns boolean flags from the verified session, so this identifies a **defense-in-depth signed-context trust boundary**, **not proof of a live exploit or tenant data leak**.

The scoped fix on `al-siddique-backend/src/config/database.js`:
1. RLS must be an **explicit boolean true** to opt in. `false`/null stay intentional bootstrap/off contexts; truthy nonboolean inputs throw `DB_RLS_FLAG_INVALID` rather than fall back to privileged raw DB queries.
2. `isSuperAdmin` accepts **only boolean flags**. When present but nonboolean it throws `DB_SUPERADMIN_SCOPE_INVALID`; exactly `true` remains compatible with pre-existing trusted superadmin mode only when feature gates allow it.
3. School scope accepts positive safe-integer number or a complete positive decimal string; rejects numeric suffixes, fractions, scientific notation, NaN/Infinity, overflow and missing/zero/negative identifiers with the established `TENANT_CONTEXT_REQUIRED`. Valid `900001` numeric and string normalize identically.
4. Validation occurs before SQL tenant/GUC assignment. Separate Paper signed role authorization, HMAC, reset/eviction handling and public APIs remain unchanged. No migrations or schema writes.

## Actually executed evidence
- **Genuine prepatch RED**: 5-case new synthetic negative suite against exact Phase17 source: **1/5 PASS, 4 FAIL**, concretely proving string false privileged scope, numeric-prefix tenant acceptance and truthy flag laxness. Postpatch identical suite **5/5 PASS**, no SQL calls on rejected contexts, valid numeric/string and trusted boolean superadmin compatible.
- **NEW 2/2 PASS on disposable PostgreSQL16 signed clone** (127.0.0.1:55432, `assps_core_signed_p7_20261008`): 11 malformed school/boolean context variants rejected on real `apex_app_runtime` non-BYPASSRLS login before protected `students` query; valid signed scopes separately see only synthetic school A or B rows. Real school data not used.
- Existing general signed non-BYPASS SaaS RLS/HTTP/session cleanup/lessons **17/17 PASS**, Paper feature OFF; dedicated real separate signed Paper LOGIN + Assessment HTTP/teacher/heading/session **7/7 PASS**; signed-feature-OFF compatibility, teacher, governance, DOCX/lesson planning **35/35 PASS**; focused static/synthetic regression including 5 new negative cases **27/27 PASS**. Test groups overlap in historical tests; counts must not be blindly summed for total coverage.
- **261/261 backend JavaScript `node --check` PASS**. Exact same frontend lock SHA as Phase17, reused prior isolated `node_modules` via symlink; isolated frontend Vite build **PASS, exit 0, `✓ built in 24.14s`**. Protected templates **6/6 unchanged PASS**, git diff check PASS. No Phase18 new frontend `npm ci`, full 43-paper browser parity or whole-frontend lint rerun: frontend source unchanged and parent Phase17 had actual 43/43, all five browser print/PDF layouts and build PASS on its exact SHA.
- Full frontend lint remains a separately confirmed failure on Phase16: **707 errors, 46 warnings**. This phase does not conceal or weaken that production gate.
- All clone roles are non-superuser/non-BYPASS; Phase18 uses synthetic IDs/papers and no privileged login to live school database.

## Unresolved production release gates
- Effective signed Core and separate Paper login migrations/77 FORCE-RLS table production-equivalent policy+GRANT tests; independent parent/guardian/student/service/superadmin/finance/attendance read/write denial and signed key rotation; DB backups/restore and tested rollback.
- User-authenticated Paper Studio teacher Save→GET→Workspace reopen→DOCX/PDF and physical school printer Jameel Noori Nastaleeq page+glyph visual UAT; integrate only verified owner CSS on the latest Core descendant.
- Hostinger perimeter/cloud firewall, SSH recovery, source vs release artifact ancestry, full repo lint, controlled canary/production smoke, Connect's local-only repository source/publishing and signed upload/session integration.
- Academic Grade IX–X source-page and independent human approvals remain **zero**, no auto-publish/seed. Historic complete chat transcripts and original Phase3AE/PG18 review archive not independently accessible.

**Release: HOLD.** Development and test evidence only; do not deploy or modify production services/config/database/roles.
