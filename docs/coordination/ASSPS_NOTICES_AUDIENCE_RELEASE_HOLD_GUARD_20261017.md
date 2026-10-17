# ASSPS unified source mission — school notices audience release hold guard

**Date:** 17 October 2026. **Status:** SOURCE TESTS GREEN, NOTICE READ-AUDIENCE
POLICY STILL HOLD. NO DEPLOYMENT.

This independent audit branch is a direct descendant of published notices
candidate fix/assps-unified-school-notices-auth-20261017@63d5baa253fb3ff578dda16b7f2f065e519e7149,
itself built on verified unified Core/Paper/Results master 742e277a.
The original notices changes preserve issuer, admin-only writes and tenant SQL.
THIS BRANCH DOES NOT FIX GET AUTHORIZATION.

The school database has a notices table with school_id, recipient_type,
teacher_ids, issued_by and is_pinned columns, but a real read-only query showed
0 existing notice records. This does not prove an existing data disclosure. The
GET route as coded would select all notices of a signed school for an ordinary
teacher, without recipient/audience and verified teacher identity scoping.
User identities cannot be guessed from 43 unreviewed timetable links or
zero active explicit teacher print assignments.

New source-only verifier ops/notices/verify-notice-audience-source-20261017.cjs
emits HOLD_NOTICE_READ_AUDIENCE with exit code 2 while teacher reader policy
is absent. It checks admin-write and tenant guards, issuer integrity, and
scoped update/delete. Eleven hermetic mutation adversarial tests prove omission
of auth/tenant/service scope/issuer remains rejected. Existing 12 mocked
Express route tests remain unchanged.

The separate GitHub workflow deliberately passes when it successfully detects
a HOLD; it explicitly logs DO_NOT_DEPLOY. That workflow status is not a GO.
The checker does not attest real user, independent School2 denial, live RLS,
physical Ricoh A4 or signed rollback.

Next release gate: Core owner must approve school-notice audience contract tied
to independently verified identities, implement the real privacy control, test
disposable two-school denial, obtain signed full 13/13 Core security and
academic/hardware approval before any production deployment.

No school data, notices, messages, grades, teachers, students, RLS grants,
paper originals, PM2/Nginx or public service changed.
