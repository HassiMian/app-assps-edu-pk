# ASSPS Core — first-day actual HTTP+JWT+restricted signed PostgreSQL Marks read acceptance
Date: 2026-10-10. **Not** production authentication, real school marks or release certification.

Parent integrated tested Core Results candidate: 97d7815f78acac817d6ee38bce6d22774abf1e84.
Branch: test/core-firstterm-signed-http-clone-20261010.
New test: al-siddique-backend/src/tests/saas-core-marks-signed-http-clone.test.js (test ONLY).

## Safety boundaries and genuine execution
- Existing clone: 127.0.0.1:55432 / assps_core_signed_p7_20261008. Existing synthetic login assps_core_test_login is NOBYPASS and application role apex_app_runtime is NOBYPASS.
- Existing Core operations ephemeral credential runner is extended with 'marks' suite. Checks exact DB/port/test actor roles, generates temporary random password and retrieves disposable signing key only inside process. Temporarily grants SELECT **only** exams, exam_results, teacher_class_assignments and grade_settings where clone lacks the production runtime role SELECT grants. Runtime code (actual mounted Express examRoutes, actual auth/JWT verification, actual PostgreSQL pg pool/signed tenant context) runs against this restricted role. The runner revokes these clone-only grants, restores original NULL password and leaves no fixture rows.
- Actual signed JWT actor A: existing synthetic active teacher from school 900001; actor B: school 900002. JWT signing secret is a clearly labelled synthetic isolated test value, not a school login credential.
- Three actual mounted routes: /api/exams/results/9, /api/exams/results?exam_ids=9 and /api/exams/student-results/999999. Every anonymous request 401; both legitimate school actors 200 success=true data=[] (no existing results, no invented zero); mismatched school, mismatched tenant and missing school JWT claims 401. Invalid/nonexistent exam/student marks POST denied (400/403), no marks written.
- Verified suite node --test PASS 1/1, real HTTP and real PostgreSQL actor context; independently verified password NULL, clone-only grants COUNT0, temporary legacy role COUNT0, synthetic fixture results COUNT0. No production database connection or test user changes.
- Note: This tests read and deny/no-record path, not legitimate teacher POST for an existing class assignment; the latter remains source-covered by actual Express with database doubles and direct restricted PostgreSQL signed marks transaction ROLLBACK. Real production principal/teacher role and School ID acceptance remains unverified.

## Source/release boundaries
No runtime code changes, no Paper Studio / Academic / APEX code changes, no PM2/Nginx or school data changes. Combined first-day Marks→9 premium Results integration remains a separate release integration candidate, not production, and must be reconciled with component-specific live-ancestry candidates before promotion.

Verdict: ISOLATED_SIGNED_REAL_HTTP_MARKS_EMPTY_READ=PASS; JWT_CROSS_SCHOOL_SPOOF_DENIAL=PASS; PROD_ACTOR_ACCEPTANCE=NOT_CERTIFIED; APPLICATION_DEPLOYMENT=HOLD.
