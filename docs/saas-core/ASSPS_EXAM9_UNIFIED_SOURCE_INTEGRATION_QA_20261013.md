# ASSPS P0 — Exam 9 signed subject policy, strict maxima and AB result QA

Date 13 Oct 2026 UTC. Isolated source and disposable QA ONLY. Not institutional approval and not production cutover.

## Verified source chain
- Original protected Core+Paper green integration cef192a67a47e499903fbf6332b4599ec369127b.
- Integrated existing independently reviewed teacher permission commit 9e6b5def74d7e58fa98503d68047c6706c533c78, and approved class/section/subject policy endpoint commit 290d7ad1.
- Integrated Paper/Core Exam9 absence and marks-integrity candidate 02a54cdb7444197ba7d82e2a44a9c4223e25e0e7, resolving one actual examRoutes content conflict without reverting restrictions.
- New isolated worktree /root/workspace/assps-core-paper-exam9-unified-integration-20261013. Original worktrees untouched.

## Completed source changes
Teacher role can write scoped results, not create/delete exams or alter grading scheme. Teaching-options deny school-wide fallback for teachers. Read-only reviewer-approved subject maximum endpoint validates real school/teacher/exam/class/section/subject/revision and authorized reviewer account. Transactional writer independently revalidates exact school-bound and reviewer-approved paper maximum, not generic exam max; denies unapproved, ambiguous, absent mappings. Numeric scored zero is distinct from blank and AB; scored booleans, nonnumeric, missing and out-of-range values denied. SCORED, ABSENT, PENDING, EXCUSED status semantics enforced, EX requires principal/admin; status-bearing marks nullable with no numeric zero coercion. Canonical premium Result Cards render AB/EX/Pending with incomplete overall grade; unsafe old-template printing blocked without modifying protected old templates.

## Fresh scoped tests and disposable database
- Six backend focused suites 18/18 PASS including real Express routing with synthetic signed-scope substitutes, pending/forged policy negative cases, peer denial and numeric status rules. These tests do not constitute actual real staff authentication.
- Premium Paper result-status tests 3/3 PASS.
- Isolated Vite optimized build exited 0; log /tmp/assps-core-paper-exam9-unified-build.log, exit receipt /tmp/assps-core-paper-exam9-unified-build.exit.
- Local PG QA port 55432 clone assps_exam9_acceptance_qa_20261013, not production 5432. Source was existing Core unified recovery QA with two original result records, not production 301. Core subject approval and nullable exam status migrations applied ONLY on this QA clone; 2/2 rows retained, both status CHECK constraints subsequently validated. Temporary QA check confirms SCORED 0, AB null, PENDING null and EXCUSED null are valid, while AB numeric zero is rejected.
- Unapplied release source under ops/release/core-subject-policy and ops/release/exam9-status-20261013. No live database migration, official scores mutation, credential, PM2/Nginx restart, or production deployment.

## Release gates still HOLD
Live authoritative Exam ID 9 is school 1 First Term 2026-27. Read-only verified live exam has 301 rows and 36 genuine scored zeros; 87 students, mixed subject maximum 25/50/100. Production teacher_class_assignments 0; Exam9 published subject offerings 0 and class enrollments 0. Teacher-role accounts 25, active 19. Active app-runtime signed RLS guard count 0, separate green role 77. Current public Connect build XI7EvxpUMkKOxK5ByM2BH online.

These institutional and live production prerequisites CANNOT be met by developer source tests: real affected teacher secure credential rotation + signed sessions; authentic principal-reviewed teacher/class/section/subject IDs and school-approved subject maximums; exact real Exam9 Save-Reload-Print, peer-school HTTP deny, QA full fresh 301-row backup-restore/ACL/RLS rollback rehearsal, connected physical print review, and SaaS Core-only green release authority. Do not fabricate signatures or school data, do not convert existing zeros into absent, and do not promote pending approval as passed. No automatic release authorization granted.
