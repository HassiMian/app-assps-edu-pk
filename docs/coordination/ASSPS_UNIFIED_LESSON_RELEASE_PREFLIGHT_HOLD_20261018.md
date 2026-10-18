# ASSPS unified Lesson Planning — staged release integrity HOLD (18 October 2026)

Source-only deployment-protection gate for integrated Core/Paper Lesson Term Diary candidate; no live changes.

Canonical verified parent 41b71d8e3b0cb1501eebf40a4c99d7c75733a20d.

Live Hostinger production frontend /var/www/assps-lesson-planner-2ce6653e2163, index SHA256 2aa5a1b56a81c550b7fadfd028884503aa454740d68e5255212ce26ab2719408. Backend /var/www/apex-backend; manager-only Notices GET and Diary route match candidate by SHA256. Candidate examRoutes.js differs from deployed examRoutes.js and adds principal marks correction requiring a signed ledger service and migration 034 NOT installed in production. Do not replace whole backend for a login-logo fix.

Candidate branding SQL verified on main PostgreSQL in READ ONLY transaction. Isolated localhost Express router against real application DB proved ASSPS 200 with only name/logo/two colors, unknown 404, malformed and missing code 400, authentication-required settings 401. No database writes and no runtime replacements.

Live new public-branding route still HTTP 404. Real signed-out browser still shows APEX Education Gateway rather than ASSPS. New frontend and backend have not been deployed. Current guarded rollback script SHA256 56b67e70f77f63574fbde970752710b415114f86e5d77a5974e96c1eea12aba9 intact; --check PASS NO MUTATION.

Latest integrated source tested for original page/chapter refs, two-per-month proposed assessments, student class isolation, Weekly and Term Save/Reopen and A4 printed PDFs using synthetic fixtures; source QA is not a real authenticated / physical print certification.

Run: node ops/release/verify-unified-lesson-live-preflight-20261018.cjs CANDIDATE_BACKEND LIVE_BACKEND CANDIDATE_DIST LIVE_FRONTEND_ROOT
It returns JSON and code 2 on deployment HOLD. It cannot independently authorize production release.

Outstanding: genuine signed school user and peer-school denial, physical Urdu/Nastaliq A4 witness, signed Core security gates, offsite recovery/restore, current production artifact ancestry and controlled rollback certification.

No automation, deployment, DB writes, migration, privilege changes or PM2/Nginx restart in this checkpoint.
