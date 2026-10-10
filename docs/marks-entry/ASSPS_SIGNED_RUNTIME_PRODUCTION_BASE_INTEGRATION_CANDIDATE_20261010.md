# ASSPS Core signed-tenant runtime source — production-base integration candidate
Date 10 October 2026. Owner SaaS Core. **ISOLATED SOURCE CANDIDATE, NOT PRODUCTION DEPLOYED**.

Exact live backend 16ab8f346ba27aa6b2e29a8f03c68db32a326cb9; companion checked Core Marks/Result Cards backend release candidate 322c8262dbad947df8b54b0145d431b65983aad8, preserving real teacher school/class/section/subject guards and student identity projection.

The existing exact live-base backend source did NOT contain the proven Core signed JWT/PostgreSQL runtime layer, even though a later Core security/RLS branch had completed it on a different ancestry. Isolated forward-port only the Core-owned src/config/database.js, src/middleware/auth.js and src/services/security/coreSignedTenantContext.js files from the previously tested Core security worktree onto the exact release candidate. No other Paper Studio, Academic/Question Bank, APEX Connect source modules are copied; file contracts consumed by independent Paper services remain subject to owner regression.

Mode OFF compatibility: database source defaults DB_SIGNED_TENANT_RLS_ENABLED OFF, so original API tests remain covered. The signed tenant gate requires strict JWT pre-binding, explicit non-BYPASS PostgreSQL runtime login, explicit runtime role and verified HMAC secret, and refuses missing ENABLE/FORCE RLS or invalid signed policies. No auto-enable; no backwards-fallback from a failed security check.

Real execution:
- Node syntax PASS on all three runtime files and signed source tests.
- Existing tenant context, teacher assigned HTTP authorization, official First Term exam and marks suites PASS 14/14 using exact copied runtime in default mode.
- Added original Core security unit tests (signed envelope, tenant identity strictness, signed FORCE-RLS catalog) and independently tested 10/10 PASS.
- Included signed test files for later real disposable PostgreSQL authenticated acceptance: real HTTP/JWT Marks reading and direct non-BYPASS DB actor tests, requiring isolated test runner ephemeral credentials.

Critical NO-GO: actual production apexos backend uses BYPASSRLS apexos_user; strict signed mode switches and core_security schema/functions missing. Do not point this candidate at production until reviewed production-safe 77-policy signed migration, protected secret and non-BYPASS restricted SCRAM account provisioned and authenticated cross-tenant role/HTTP checks run. Existing signed clone-only SQL is NOT a production migration. This candidate is independent until SaaS Core release certification.
