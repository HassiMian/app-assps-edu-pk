# ASSPS SaaS Core — correct outdated tenant-context test contract
Date: 2026-10-10. SaaS Core test-only change.

Production frontend base: 24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92.
Production backend base: 16ab8f346ba27aa6b2e29a8f03c68db32a326cb9.
Existing backend Marks Entry candidate parent: 8f4814b67695bfd231a5d70ad67536684d05f843.

The original database-tenant-context.test.js from the deployed backend expected literal booleans in SQL query text and zero params for superadmin blank tenant. The existing runtime implementation safely uses parameterized queries and binds explicit empty tenant and tenant key for superadmins. Those two initial test failures are PRE-EXISTING assertion drift, not evidence the marks guard regressed; both source paths were unchanged versus the exact deployed backend base.

Corrected test-only assertions verify bound values for app.is_super_admin, app.tenant_id and app.tenant_key; added missing/nonpositive/invalid tenant negative cases asserting TENANT_CONTEXT_REQUIRED and zero SQL queries. No runtime source, production schema, roles, RLS, existing school records, marks or services modified.

Executed on the exact backend production-descendant tree with read-only NODE_PATH pointing to already-installed Core dependencies: real Express synthetic marks HTTP, teacher assignment guard, official First Term schedule and database tenant context 14/14 PASS exit0; log /tmp/assps-marks-context-parity-targeted-20261010.tap. Initial isolated checkout lacked node_modules; first attempt failed module resolution, subsequently repaired and full suite rerun green.

Disposable signed PostgreSQL RLS actor suite and Marks Entry transaction checks are independently executed but do not establish signed actual production principal/teacher login acceptance. Marks Entry release not deployed.
