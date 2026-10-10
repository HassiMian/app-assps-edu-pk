# SaaS Core first-day Marks → premium Result Card result identity projection
Date 2026-10-10. Scope: exactly one response-field change to existing authenticated GET /api/exams/results/:exam_id and one test assertion.

## Source provenance
Live backend base 16ab8f346ba27aa6b2e29a8f03c68db32a326cb9.
Scoped backend authorization/tenant test candidate parent d54183a815b30b6d7ad09cb2cedaee556774294d.
Latest integrated nine premium Result Cards source 97d7815f78acac817d6ee38bce6d22774abf1e84 already expects student_class and student_section on each result row, but the separately staged backend production-base candidate was missing those two projections. That mismatch was detected by an actual frontend test. Core now applies exactly the two columns required by the integrated model.

## Change and security boundary
In teacher-/tenant-restricted GET /api/exams/results/:exam_id, add s.class AS student_class and s.section AS student_section. Existing SQL joins on student/exam same school, the signed actor school scope, active teacher assignment class/section/subject EXISTS, roles and RLS stay unchanged. It does not expose students outside the already authorized result rows and does not change save/marks or database schema. No hidden browser data, school records, teacher assignments or Paper Studio content accessed or changed.

Test assertions added to real Express router mock-DB transport contract, alongside previously authorized/unauthorized GET/POST. Source 4 backend targeted suites / 14 tests PASS, exit0. Nine-result frontend test when pointed at this exact companion backend source now validates real class/section, roll numbers and render model; eight other card tests PASS independently. No real production deploy; source candidate only.
