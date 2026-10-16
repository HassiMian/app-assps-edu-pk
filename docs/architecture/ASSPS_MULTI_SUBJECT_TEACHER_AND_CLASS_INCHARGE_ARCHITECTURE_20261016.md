# ASSPS Multi-Subject Teacher Profiles, Official Class Assignments & Student Class In-charge
Date 2026-10-16. Design + isolated source candidate. Live deployment: NOT PERFORMED.

## Product requirements / non-negotiable data separation
1. Academic timetable: observed periods/teachers/subjects, not an authorization grant.
2. Teacher *profile subjects*: one employee may teach multiple subjects, for example Islamiyat and Nazra, Quran and Tarjuma; never overwrite employees.subject and never infer exams authority.
3. Official teacher-class-subject assignment: exact (school, teacher user, employee, class, section, canonical subject), using existing teacher_class_assignments, after verified actor approval and exact offering confirmation. No freeform auto activation.
4. Class in-charge/homeroom: primary (and optionally assistant) teacher for one class/section during an academic session; not deduced by who teaches most periods and not synonymous with Nazra teacher.
5. Student app: students see class in-charge and optionally roster teaching staff, but only from *approved*, tenant-scoped official records; no students names in any teacher preview.
6. Timing schedule remains a separate school-wide bell-profile domain; no conflation of teacher roster and timings.

## Live evidence (read-only, 2026-10-16)
School1 has 18 active employees with linked users (verified count), 0 active or inactive rows in teacher_class_assignments. Historical Regular reference timetable: 56 teaching period rows for seven class/section groups plus assembly+break = 58 rows. Active student rosters: 13 class/section groups (the timetable is not coverage for all). Exam_subjects = 0 and exam_class_enrollments = 0, so official schoolAcademicAssignmentRoutes teacher-assignments exact-offering check currently cannot approve an allocation. Class-incharge is not stored in an official column/table. Qari Imran timetable: Four, Five, Six, Seven/Blue Nazra; linked employee MUHAMMAD Imran profile currently says Islamiyat; NOT an authorization conflict once multi-subject is represented. Exact display alias -> employee identity must be reviewed rather than force matched.

## Domain model
Subject catalog normalized by school and academic session:
  school_subject_catalog: id, school_id, subject_key, name_en, name_ur, category, active, synonyms.
Teacher subject profile:
  teacher_subject_profiles: school_id, employee_id, subject_id, academic_session, status (proposed/reviewed/approved/retired), source_kind, source_hash, approved_by, approved_at.
  Unique active employee/subject/session; multiple rows per teacher are ordinary.
One teacher can have Islamiyat and Nazra, or Urdu + Social Studies, or Computer Science + Mathematics. No arbitrary limit; a profile may have 0 subjects and that must remain distinguishable from missing/unavailable data.
Assignment: existing teacher_class_assignments is authorization source. A profile match alone never grants teacher marks/paper/student access. Exact class/section/subject, verified subject offering, active user/employee and principal approval required, with audit+rollback.
Class in-charge:
  school_class_incharges(school_id, academic_session, class_name, section, employee_id, teacher_user_id, role primary/assistant, approval, source, effective dates, audit). One approved active primary per class/section/session.
Status change and roster revisions are additive, audit logged; never drop active assignments on timetable UI edit.
Student: authenticated JWT user -> users.id, users.entity_type, users.entity_id -> students.id, school_id, class, section. Ignore client submitted class/section/student ID. Read only approved active incharge matching own class. If none exists, show 'Class in-charge: Not yet confirmed' rather than guessing.

## Workflow
Roster ingest -> normalize observed aliases -> teacher identity matching (strong exact school-scoped employee user link) -> review ambiguous aliases including Fida vs Qari Fida, Aqsa vs Ausa, Maryam, Tayyaba, Qari Imran -> map verified (class,section,subject) teaching observations into *proposed* rows -> principal review -> explicit independent authorization only through existing exam/subject offering gate -> signed active teaching access -> teacher portal, attendance, paper, exams, Connect and Student Portal permission smoke tests.
Class incharge is a separate approved selection; no assumption from period counts.
Admin UI teacher profile has a multi-select with explicit tags and a history; can list proposed/approved subjects. Add a 'Classes I Teach' matrix displaying proposed vs approved exact allocations, and 'Class In-charge' separate field with status.
Teachers see their own verified/approved profile, may suggest correction but cannot approve or grant.
Student UI shows verified in-charge only, optional approved teachers for class, no other class or subject approval internals.

## Security / model
Never infer permissions from display names, employee.subject free text, a timetable reference, or class in-charge badge. No subject alias 'Islamiyat= Nazra' in authorization: related field *may be taught by same instructor*, but subjects are distinct canonical keys. Enforce school_id, role, active employee, linked user and signed tenant context on every request. Strong record FK cross-school, RLS FORCE, no unrestricted CORS, no permissive fallback. Versioned status and optimistic concurrency. Teacher subject capabilities are profile metadata, not independent permission to edit examinations.
1EdTech OneRoster 1.2 distinguishes users/classes/enrollment and supports multi-role representation. OWASP authorization: least-privilege and deny-by-default.

## Incremental implementation
Phase A: QA-only read model + source roster reconciliation and proposed candidate list, no grants. Safe GET /api/teacher-subject-profiles/my with active profiles, GET /api/student/class-incharge/self exact student bound.
Phase B: additive signed RLS migrations on disposable school-snapshot copy; test teacher profile multi tags, Qari Imran Islamiyat + Nazra as distinct subjects without conflation, cross-tenant denial, staff status.
Phase C: dual approvals for exact class subject authorization and class-incharge; integrate existing teacher_class_assignments/exam offerings; teacher role cannot self-approve, no impersonation.
Phase D: Connect student & teacher UI consume approved Core API; ensure mobile cache stale behavior, source version and ownership.
Phase E: blue-green with backup, rollback, authenticated teacher Qari Imran session and separate student session, class-incharge, RLS peer-school denial, saved marks/results/Diary unchanged.

## Gates
No production assignment before: authoritative complete current roster for all 13 class groups or explicitly partial deploy, principal identity crosswalk authorization, approved subject offerings and genuine actor workflow, QA DB RLS PASS, backwards-compat tests for marks/0-vs-blank, teacher-scoped paper access, signed gate, rollback. Distinguish "teacher profile subject added" from "teacher class/subject access granted".
