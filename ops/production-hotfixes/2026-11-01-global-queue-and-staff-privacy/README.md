# ASSPS Security Hardening Handoff — 1 Nov 2026

DEPLOYED on active apex-backend; GitHub source is review-only, not merged.

Root causes:
- opsRoutes.js: authenticated school Principal/Admin formerly saw global AI queue event messages and cross-school queue counts despite missing school IDs. Now global telemetry is available only to platform super_admin; school-scoped DB stats retained.
- paperRoute.js: school Principal/Admin could pause/resume a global queue affecting every school. Now only platform super_admin may pause/resume; school job lists, retry, cancel remain separately scoped.
- employeeRoutes.js: employee list/detail and create/update responses formerly carried legacy portal_password from SELECT/RETURNING star. Projection removes it. Employee write whitelist no longer includes portal_password.
- Outstanding: 14 employees contain short-format legacy portal_password at rest. All have separately linked bcrypt-format users account passwords; historical raw values were NEVER copied to this branch. Controlled legacy cleanup / genuine staff login certification required. The at-rest issue is not marked resolved.

Verified:
- Ops role-boundary synthetic HTTP 4/4 PASS.
- Global queue role contract 3/3 PASS.
- Staff projection contract 4/4 PASS.
- Staff synthetic HTTP contract 3/3 PASS.
- Latest academic/assessment regression 69/69 PASS.
- Public API health, login page OK, school academic config and marks unchanged.

Patches were tested against exact active source before each change and reproduced the live file byte-for-byte. The historical canonical GitHub source differs; do not blindly apply these patches to main or claim official school academic release. Tests use VPS-specific paths and may need adaptation in source review.

Restricted rollback copies are in /root/secure-archive/assps-security-mission-20261101/ with *.before.js names. No private staff values included.

Academic release remains HOLD (7 of 16 gates passed). No student results, fees, vouchers or signed approvals were modified.

Final staff API hardening addition: employee POST/PUT now actively rejects portal_password input with HTTP422 LEGACY_PORTAL_PASSWORD_FIELD_FORBIDDEN; no silent acceptance or credential write. The updated employeeRoutes.patch was replayed byte-identically against the exact pre-fix active runtime. Synthetic employee HTTP boundary now passes 5/5 tests, core academic regressions 69/69. Existing legacy values at rest are STILL pending separately controlled cleanup, not claimed removed.
