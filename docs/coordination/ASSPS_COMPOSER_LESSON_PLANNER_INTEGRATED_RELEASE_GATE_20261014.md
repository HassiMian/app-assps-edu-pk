ASSPS Composer Lesson Planner integrated source gate — 2026-10-14

SCOPE: 59 source-review groups in 12 classes, with one classless Islamiyat source on review hold. Miss Adiba is the composer/forwarder, not necessarily the assigned teacher.

INTEGRATED SOURCE: Core+Grade IX-X source 7492ff11527d6054085345f0129e7631752570cb merged with isolated Core+Paper composer candidate 52587e6a8474f761fc30e6e22bd45baf4399f62e. No production release.

QA: integrated backend 59/59 PASS; class review unit 5/5 PASS; synthetic browser source import, reopen, proposed correction and class/all-class A4 preview PASS; Vite build PASS. Genuine Principal session and physical printer unverified.

LIVE FACTS (READ ONLY): 3 original staged unshared lesson plans. No new imported plans or marks writes. Active school1 teacher class assignments 0, identity-reviewed timetable 0. Two active school admins have Principal designation, none have literal principal role. No authenticated Principal browser session was available. Unverified timetable suggestions must never grant access.

RESTORE: Private custom dump of live lesson_plans SHA256 10ab9f8992988f0cbc7f72f3c2cd2e93b5d50e0c0706cc67894fcb85256a9bd0. Isolated PostgreSQL restore 3/3 rows and 0 shared; live/restore digest 97f380274f46a9d4a101f289410e7249. Disposable restore DB cleaned. Scoped module restoration does not certify traffic rollback.

FEATURE GATES: composer private import, proposed corrections and Principal source inspection remain OFF in deployed production. Genuine teacher assignment, academic/source adoption review, true staff HTTP/RLS acceptance, physical Urdu/A4 print, full regression and rollback remain mandatory.

RELEASE DECISION: SOURCE READY FOR INTEGRATION REVIEW; PRODUCTION HOLD. Do not fabricate staff signatures, teacher roles, or academic approvals.


## Follow-up mission — release-readiness dashboard and source re-attestation

The new manager-only, tenant-bound GET `/api/lesson-plans/planner/composer-review-readiness` returns a fail-closed 59-source academic checklist. It does **not** return WhatsApp verbatim excerpts, does not assign teachers, does not initiate an approval, and does not publish. The UI shows total private imports, missing sources, verified teacher evidence and Principal inspection receipts with an explicit HOLD label.

The readiness service recomputes each stored record's original source digest from exact SHA256 of each source and original WhatsApp excerpt line triples. It compares those to the separately pinned 59-candidate source hashes. A database-side modification of the original Urdu/English excerpts is detected and marked NOT VERIFIED, even if the stored declared digest was not changed. An unregistered or cross-school candidate cannot be admitted into the verified matrix. All 59 untouched private source candidate digests were independently recomputed and matched the originals.

Independent approval remains a hard requirement even if an active teacher identity, Principal inspection and textbook adoption become available. Genuine signed Principal HTTPS session, teacher assignments and student/parent publication approval are not synthesized or granted. Feature flags for private import, correction proposal and source inspection remain OFF on production.

Coordinator: Other ongoing APEX/Core workstream is investigating Next+Nginx login and six global PostgreSQL tables with separate QA-only migrations. Never apply those experimental SQL scripts or overwrite the owner's worktree. Integrate only clean, verified source-only release gates onto the latest appropriate canonical ancestry, test the result, and preserve all Exam9 marks including numeric-zero vs blank.

Acceptance: source-unit tests, negative HTTP actor tests, isolated Chromium source browse/print, frontend build and source-only Core release gate. These cannot replace genuine live signed RLS/HTTP or institutional academic approvals.
