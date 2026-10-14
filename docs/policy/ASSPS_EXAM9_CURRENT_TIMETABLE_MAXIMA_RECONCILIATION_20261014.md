# ASSPS live school Exam9 and Regular timetable evidence — 14 Oct 2026
Release status: HOLD. Read-only source reconciliation, no data/permissions changed.

The original timetable is now stored in live public.timetable with 56 class teaching slots, including 16 for Class Nine. Exam ID 9 is a school-wide exam ID and NOT Grade Nine. Class Nine did not sit this First Term exam. Pre-Nine is separate.

Current live school1 Exam9 has 81 subject-offering rows, 81 NULL official maxima, 17 offerings with no matching saved scores, and six One/Blue offerings with no active student cohort. There is a single saved Mover/Purple Computer result without matching offering. None may be automatically created, deleted or inferred as an approved paper maximum from a historical score denominator.

The 56 teaching slots have no authenticated staff identity linkage. Forty slots lack section. Seven slot occurrences have one employee-name and active linked-teacher-role match, but name equality is not identity authorization. Teacher permissions must stay inactive pending authentic employee/class/subject confirmation. Exact teacher assignments remain zero.

Read-only reproducible command:
python3 ops/release/exam9-status-20261013/exam9_school_evidence_matrix_20261014.py --port 5432 --database apexos

The output provides detailed offering/section, unapproved historical denominators and teacher timetable exceptions. It always returns release_safe=false; results cannot be used as an authorization or import manifest. Existing actual marks, including numeric zeros, must not be changed.

SaaS Core owns authentic staff actor-bound approval, live signed RLS and controlled production rollout. Paper Studio owns the canonical result-card/print acceptance. Real teacher Save/Reload/Print and real peer-school authenticated denial remain pending; synthetic browser tests do not certify them. Class Eight to Pre-Nine promotion remains independently protected until results, printing and per-student school reviews pass.

Use authenticated school reviewer sessions and physical paper source evidence. Do not issue forged signatures or approve provisional subject maxima.
