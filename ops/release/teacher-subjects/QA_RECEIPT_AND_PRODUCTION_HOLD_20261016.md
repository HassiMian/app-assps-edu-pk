# Teacher Subject/Profile and Class In-charge QA Receipt — 16 October 2026

Status: ISOLATED CANDIDATE. NO PRODUCTION DEPLOYMENT OR TEACHER CLASS GRANTS.

## Exact customer requirement
A teacher can have multiple subjects in one official profile. Islamiyat and Nazra
are separate subjects which can both be taught by the same instructor. Class-wise
authorization is distinct; showing a staff profile subject is NOT access to
marks, paper editing, another class's students or payroll.

## Live read-only findings
School1 staff employees: 18 active employees linked to active teacher accounts
in previous verified audit. Active authorized teacher_class_assignments: ZERO.
School1 saved timetable: 58 Regular rows = 56 teaching/reference + 2 assembly/break;
7 class/section reference groups vs 13 class/section groups with active students.
Exam-subject offering tables school1 empty; official teacher assignment POST
currently rejects without exact enrolled subject offering. Do not bypass.
Qari Imran displayed at timetable Four, Five, Six and Seven/Blue as Nazra;
active employee account MUHAMMAD Imran currently lists Islamiyat. Candidate
identity crosswalk to be genuinely reviewed, not implicitly granted.

Student login identity risk: 369 active student users, 37 linked by entity_id,
332 without entity_id. 280 GR/username exact candidate pairs among missing
links; 278 also have an exact normalized name match, but these are READ ONLY
reconciliation candidates, NOT certified student identities.
Student self-class API deliberately fails closed without verified entity_id.
No production student login mapping was changed.

## Synthetic QA migration evidence
Isolated PostgreSQL cluster port 55432, disposable database
assps_teacher_profile_qa_20261016 (NOT live production port 5432).
- Migration up: PASS (tables, 4 FORCE RLS policies, signed-school predicate
  hooked to a synthetic test-only current_setting helper).
- School1 teacher 65: two distinct subject profiles Islamiyat, Nazra, PASS.
- School2 signed-scope test visible one own subject, school1 teacher profile
  count zero: PASS under synthetic predicate.
- Exactly one primary in-charge for Six/Blue; duplicate approved primary
  rejected by unique constraint: PASS.
- This is ONLY synthetic RLS behavior; the current_setting helper is not the
  actual production signed context/HMAC and is NOT a production security certificate.
- Disposable QA DB must be dropped after verification, and independently
  refreshed consistent production-copy RLS testing performed before cutover.

## Code candidate
Core proposed new teacherMultiSubjectRoutes:
  School subject catalog: GET + admin POST;
  profiles: teacher GET own, admin GET; admin POST proposed; principal/admin
  approve profile tag. Always grantIssued=false.
  admin class incharge proposed/approved, scoped to existing class with
  active students, exact active employee/user link, unique primary per group.
  student GET /class-incharge/my-class only through user.entity_id -> active
  students school_id; no query-provided class or student identity.
  GET class-sections and timetable-reference are scoped and read only.
SaaS UI proposed: Teacher Subjects & In-charge management, learner
Class In-charge panel. Academic year normalized from '2026-2027' to '2026–27'.

## Required production blockers / actual cutover gate
1. Verify canonical current Core and Connect production heads and secure backups.
2. Resolve genuine teacher display-name/employee identity crosswalk (Qari Imran etc).
3. Verify and approve complete class/section offering records, preserving all
   existing student exam marks/results and zero-versus-blank semantics.
4. Authorize exact teacher_class_assignments via official academic approval
   route and real logged-in school principal (not via direct DB bypass).
5. Prepare verified student login -> student entity_id mapping migration with
   full uniqueness, name, account ownership, no misbinding, rollback receipts.
6. Run all migration scripts on current QA copy using real signed runtime,
   isolate peer-school, student, teacher and admin JWT sessions; run authorized
   Qari Imran teacher login and a separate student ID login with class incharge.
7. Confirm SaaS + APEX Connect independent student/teacher consumers, and
   CASC/Git provenance. Roll back only candidate code on regression.
8. No academic subject profile display may be interpreted as a teacher-grant
   or teacher qualification credential without principal evidence.
