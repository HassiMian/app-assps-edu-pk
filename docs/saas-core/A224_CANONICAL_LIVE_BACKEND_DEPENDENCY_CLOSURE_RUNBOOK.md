# A224 — Canonical live-backend dependency closure

**REVIEW ONLY. Not merged, not built, not deployed, no production mutation.**

## Source custody

- Canonical GitHub main base: b47941ac7867af1b96664c53fd4428a59ccd5055.
- Actual VPS attendance route on-disk SHA-256: 13a15287442c3db5ed7494e1f448cff402232cdc8196a222b918f78945bb81fd.
- Staged review attendance route SHA-256: 9ea239d871a735283858e63d2b36f4fa5743ff5b98818caf0a8cd22fd1fd1f27.
- Relative to exact live on-disk route, candidate applies only the A223 20-line marker-attribution surgical patch. It does NOT overwrite the production file.
- Actual in-memory PM2 module byte identity is not independently proven.
- VPS root free disk remains under the 16 GiB release reserve. Never run production build/restore on critical free disk.

## Source reconciliation reason

The GitHub main attendance route was 805 lines versus 1049 live, with 43 source differences (29 keyword-classified as security-sensitive). Running source includes teacher-assignment restrictions, combined school/tenant filters, same-school inactive-student skip, persistable student authorization, atomic writes, notifications and rollback. Direct replacement with the older main-based source would lose safeguards.

A live-route-only copy would also leave five missing dependency imports. A224 staged the full reviewed relative import closure:

| Relative module | Main state |
|---|---|
| routes/attendanceRoutes.js | Existing but different |
| config/database.js | Existing but different |
| middleware/auth.js | Existing but different |
| middleware/tenant.js | Existing but different |
| services/teacherAssignmentService.js | Missing |
| services/academicClassKey.js | Missing |
| services/whatsapp/whatsappSender.js | Missing |
| services/security/coreSignedTenantContext.js | Missing |
| services/security/strictSchoolIdentity.js | Missing |
| services/twilioSettings.js | Already byte-identical |
| routes/attendanceMarkerIdentity.js | New A223 reviewed pure helper |

All 11 modules are SHA-pinned in A224_ATTENDANCE_MODULE_SHA_MANIFEST.json; 16 relative require edges and all allowlisted package dependencies are verified. Source secret-pattern checks detected no simple hardcoded credentials, but cannot substitute for a full independent security scan. No .env files or actual live passwords were copied.

## A223 actor spoofing fix retained

For the bulk attendance POST handler only, ignore the client-supplied marked_by field and attribute writes to the authenticated actor. Invalid actor ID returns HTTP 403 after transaction rollback. Real delegation requires a separate approved actor/delegate audit contract rather than blindly trusting a client marker.

## Reproducible offline source checks

- Run node --check on all reviewed JavaScript modules.
- Run node ops/production-safety-check.js (static checks only).
- Run python3 ops/release/a224_verify_complete_attendance_closure.py (SHA/import/allowlist verification).
- Run node --test ops/release/tests/a224_canonical_tenant_teacher_closure.test.cjs (fake tenant/teacher services).
- Run node --test ops/release/tests/a224_database_rls_source_guard.test.cjs (inert Postgres pool and Paper guards).
- Run node --test ops/release/tests/a224_runtime_module_dependency_loader.test.cjs (real source imports under VM, fake dependencies).
- Run the a224_mocked_reconciled_live_route.test.cjs suite with A223_REVIEW_ROUTE_PATH pointing to this branch's backend attendanceRoutes.js. Uses only fake students, fake DB, fake Twilio.
- Run python3 -m unittest discover -s ops/release/tests -p test_a223_live_attendance_forwardport.py -q to confirm original SHA-bound A223 delta.

DO NOT run historical backend tenant-isolation-adversarial.test.js or attendance-integrity.test.js on the live database; they create and mutate synthetic rows. A separately restored isolated PostgreSQL copy is required for real integration tests.

## Required release closure

1. Build and test the entire backend plus current frontend under adequate disk reserves; all source imports and business routes must be review compatible.
2. Independently restore full DB data, globals/role passwords, ownership, ACLs and RLS policies to an external host; prove negative tenant isolation, rollback and credentials.
3. Complete Principal/teacher authenticated acceptance for Pre Nine Blue, Nine Fatima and Nine Usman with actual date, save and refresh; all four currently unsafe published AttendanceModule import chunks must be replaced.
4. Identify and resolve runtime CREATE privileges and 73 app-owned FORCE RLS tables through reviewed least-privilege migration, not an audit agent privilege change.
5. Preserve the First Term 1854-row history digest; reconcile original Papers 58 IDs/7 conflicting versions and 220 missing teacher-scope authorizations.
6. Review all 43 live-vs-main source hunks and every cross-module change. Existing live source bytes do not imply that canonical main is production-ready.
7. Only SaaS Core GitHub Issue #4 release authority may authorize a signed rollback-backed deploy.

A224 contains no production writes, service restart, GitHub main merge, backup destruction, or file cleanup. Final disposition is HOLD regardless of offline test passes.
