# ASSPS Exam 9 — Live 40%-pass policy and uploaded marks audit
Date/time: 2026-10-14 08:30–08:40 UTC. Scoped to school_id=1, exam_id=9.

## Live uploaded marks — independently counted
- 1,588 saved result rows; 273 distinct students; 203 genuine numeric-zero marks; all scores non-null, nonnegative, <= their stored denominator; no duplicate student+exam+subject and no orphan student/exam ownership.
- 1,287 rows were created on 14 Oct; 300 on 13 Oct; one older.
- **Ten** class/section cohorts have any entries: Eight/Blue 55 (11 students), Five/Blue 138 (23), Flyer/Pink 168 (24), Four/Blue 102 (17), Mover/Purple 253 (42), One/Yellow 152 (38), Seven/Blue 132 (22), Six/Blue 118 (20), Starter/Blue 315 (45), Two/Orange 155 (31).
- 81 active exam offerings, **23 without matching saved marks**: Eight/Blue Science and Quran/Nazra; Five/Blue Quran/Nazra; Four/Blue Quran/Nazra; Mover/Purple General Knowledge Oral; One/Blue all six subjects; One/Yellow Quran/Nazra + Urdu; Seven/Blue Quran/Nazra; Six/Blue Quran/Nazra; Three/Red all seven; Two/Orange Quran/Nazra.
- **One out-of-schedule record**: Mover/Purple Computer, stored 100 maximum. Preserve original pending reconciliation with the examination/teacher; do not silently delete, repurpose or publicize this item.
- 8/Blue Science is **0 marks entries** while five other subjects have 11 entries each. Do not misrepresent as scored zero.
- *Material original-paper ambiguity:* 6/Blue Science stored total100, 5/Blue Science total60 while historical Paper Studio source summaries may state different values; Mover/Purple Mathematics Oral stored total100, while Starter/Flyer Oral use25. Treat maxima as requiring original paper review, not automatically approved.
- Teacher assignments intentionally HOLD pending revised timetable (instruction recorded in coordination issue #4); production active assignments0. Exam9 subject maxima remain null 81/81 because uploads are not evidence of authorized paper maximum.

## User-directed 40% passing policy — ACTUALLY DEPLOYED
- Fresh backup before change, root-only: /root/assps-release-backups/core-live-1588-marks-20261014T0835Z/ (database Fc, role globals, SHA256SUMS). Live baseline 1588, saved 203 true zeros, 0 school-grade-settings.
- Atomic transaction with preconditions on exact dataset, no impossible scores and empty grade settings. Installed six existing letter bands: A+ 90–100; A80–89; B70–79; C60–69; D40–59; F0–39. **40% is passing**; per paper pass marks = ceil(maximum × 40/100). Examples 25→10,50→20,60→24,75→30,100→40.
- Audited 112 grade-label revisions (105 false F labels corrected to D; six previously blank letters derived from real numeric scores; one A+ corrected to A). Before-grade values are preserved in DBA-only public.assps_grade_revision_audit_20261014 (RLS enabled, NO application SELECT grants; NO FORCE so the existing exact-77 signed runtime remains operational); user instruction is the policy source, no forged Principal JWT or signoff. Numeric obtained marks, paper denominators, student identities and existing result rows unchanged.
- Exact numeric marks+total digest live vs independently restored original QA snapshot MATCH: b2be12a36ab9784c3303bfb59f788d6f. Student count322, attendance12817 at verification, fee challans901 unchanged. 1253 scored per-subject results mathematically meet >=40%, 335 are below; these are mark-row counts, not number of passed/failed students or published results.
- QA PostgreSQL55432 clone from fresh production 1588 source: apply transaction PASS; QA-only rollback UPDATE112 DELETE6 DROP audit PASS; QA revert left grade settings empty and 105 old F labels exactly. Never execute QA-only rollback script against live.
- New isolated Core approval endpoint automatically computes required passMarks for each verified exact subject maximum, rejects mismatching caller-provided pass marks. Tests 25/50/60/75/100 ceilings all pass; no source maxima were invented.

## Remaining release gates
- Backend source candidate must be independently integrated and deployed: current live frontend metadata 24cbcae3 / backend16ab8f34; new Principal approval POST returns404.
- Genuine school-admin signed approval of each current paper and exact employee assignment from amended school timetable; no fake session, no mass import of 75 mismatched staged grants.
- Actual authenticated staff Save–Reload–real Result Card browser print; independent authenticated school2 denial; restricted signed app-main traffic and ingress rollback certification.
- Until passes: **academic full publication HOLD.** Do not turn pending science into zero or treat grade-label remediation as Principal exam publication.

Security and audit details on GitHub issue #4.
