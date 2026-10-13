# ASSPS Paper Studio and SaaS Core - Exam ID9 Maximum and Absent Isolated QA

13 Oct 2026 UTC. Source QA only, no production migration or release.
Base commit: cef192a67a47e499903fbf6332b4599ec369127b
Isolated worktree: /root/workspace/assps-exam9-status-qa-20261013
Core owns migration, DB/RLS and production; Paper owns canonical report cards. Do not overwrite other dirty worktrees.

Verified read-only: First Term Exam ID9 school1 session 2026-27 has 301 preserved stored results across 87 students, 36 legitimate numeric zeros, 6 subjects. 25 teacher-role accounts, 19 active; teacher_class_assignments 0, timetable 0, exam_subjects for exam9 0, exam_class_enrollments for exam9 0. Existing paper totals are English Oral 25, English Written 100, Mathematics Oral 100, Mathematics Written 50, Urdu Written 50 and Computer 100. Parent exam total 100 is not sufficient maximum-mark authority.

Implemented: backend bulk /api/exams/results rejects blank score instead of coercing zero, enforces unique approved class/section/subject maximum from official exam_subjects for teacher and Exam9 writes, scoped within transaction. Status domain SCORED, ABSENT, PENDING, EXCUSED: scored 0 is numeric, other statuses require NULL mark and grade NULL, EXCUSED restricted to school principal/admin. Proposed policy only; NOT institutionally approved. Added guard-only unapplied SQL in ops/release/exam9-status-20261013/001_exam_results_status_additive.sql. Do not run without isolated restore, source data audit, no-loss rollback and Core signed approval. No saved rows overwritten. Canonical premium result card supports AB/EX/Pending, preserves numeric 0 and legacy term-field-only scored records, and withholds aggregate grade when incomplete. Protected old template source untouched; unsafe legacy template print blocked on status-bearing results.

QA: focused backend 10/10 PASS including synthetic Express HTTP route, maximum, missing/zero/status/role cases; pure Paper status tests 3/3 PASS; targeted source lint/syntax and git diff check PASS. Larger backend suite timed out beyond 60 seconds; own leftover QA runner was terminated. This is NOT a full-suite pass. No optimized frontend build, no physical print and no authentic teacher login/save/readback evidence.

HOLD gates: authorized principal teacher/password and source mapping, official subject maxima/catalog publishing, school AB scoring policy approval, tenant/RLS positive and peer negative authenticated HTTP, schema/ACL rollback, genuine Exam9 marks Save-Reload and premium/legacy A4/A5 print review. Never fabricate teacher assignments, credentials, student grades or production certification.
