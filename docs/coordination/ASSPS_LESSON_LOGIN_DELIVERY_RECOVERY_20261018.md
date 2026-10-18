# ASSPS SaaS Core — Lesson Login + Teacher Delivery Recovery

Date: 18 Oct 2026. Owner communication: Roman Urdu (Latin letters).
Status: **SOURCE QA PASS, RELEASE HOLD. NO PRODUCTION DEPLOYMENT**.

## Isolation and provenance

Branch: `feature/core-lesson-auth-school-scope-20261018`.
Worktree: `/root/workspace/assps-core-lesson-auth-recovery-20261018`.
Exact base: `7ae9d6f724390785db3091453509bf636381ffac`, a descendant of protected Lesson source `41b71d8e3b0cb1501eebf40a4c99d7c75733a20d`.
No other owner dirty worktree touched; no destructive database queries, teacher grants, academic publication, PM2/Nginx restarts or protected documents modified.

## Production facts — read-only

Hostinger `app.assps.edu.pk/login` HTTP200, `api.assps.edu.pk/health` HTTP200,
`/api/school/public-branding?school_code=assps` HTTP404, source public branding implementation and isolated tests exist but are not live.

School1 has 19 active teacher users, 17 with `must_change_password=true`.
Mandatory `/change-password` frontend and `/api/auth/change-password` route exist; real teacher credential/session/redirect acceptance NOT performed.
Previous snapshots of 58 timetable rows are obsolete; now 405, including 347 newer weekday-specific rows inserted by an unverified concurrent actor.
Teacher timetable IDs refer to **user IDs**, not employee row IDs.
12 of 12 scheduled distinct user IDs match active same-school teacher accounts and active linked employees. However `teacher_class_assignments` has ZERO active assignments.
54 distinct class/section/subject/teacher combinations cover all six weekdays, with 54 valid user+employee links. 12 teacher-period overlap instances represent 2 repeating patterns requiring combined-class review. Daywise source hash corresponds to 14-Oct source (prefix `263941c69d939a6d`) rather than verified final 16-Oct print PDF SHA256 `9ac81002d2bc67cc748ece72b637c6cc081c8e1f23d1551d594031deea7e70c4`.
3 saved Lesson Plans, zero shared to portal; 59 original academic source candidates unapproved.
Read-only School1/global counting must not be confused; historical global protected baseline 322 students / 1854 exam records, while School1-scoped counts can be lower.

## Source-only improvements

1. `src/services/explicitSchoolLoginScope.js` used by `authRoutes.js` login AND password reset. Any explicit unknown, conflicting, blank or mismatched school identifier rejects BEFORE account lookup, without revealing other school accounts. Legacy no-school selection remains unchanged. Does not bypass temporary password change or grant school access.
2. `src/services/teacherLessonDeliveryReadiness.js`: conservative proof contract requiring authenticated teacher/user, active linked employee, active class/section/subject assignment, real plan, independent academic source approval. A successful evidence check still grants NO permission or publication.
3. `ops/release/lesson-planning/audit_teacher_delivery_readonly.py`: read-only aggregated 12 verified scheduled teacher accounts, zero assigned teacher accounts and zero shared plans; no personal identifiers returned.
4. `ops/release/lesson-planning/reconcile_verified_teacher_assignments.py`: read-only aggregate 54 candidate, 54 six-day complete and verified identity links, 12 collision slots, zero source-PDF-verified teaching slots; always release HOLD, no auto assignment.
5. `src/services/teacherLessonDeliveryAudit.js` and `GET /api/lesson-plans/planner/delivery-readiness`: role-scoped principal/management-only authenticated school aggregate route, uses existing tenant-context transaction, private no-store, never shares lessons. School2 separate counts, teacher/anonymous denied in synthetic HTTP acceptance.

## Exact test evidence

- Combined native Node test suite **81/81 PASS, zero skipped** (mocked actual login+password reset, branding, authorized readiness route and School2 isolation, lesson engine, source provenance/publication and protected release gates).
- Python read-only audit policy tests **14/14 PASS**.
- `node ops/production-safety-check.js` PASS, Node syntax/patch whitespace checks PASS.
- Genuine Principal/Teacher/School2 browser login → password change → Save → Reopen → Urdu A4 Print acceptance **NOT certified**.
- No runtime SHA proof connecting compiled live frontend to current source. Strict signed RLS catalog mismatch and role privileges remain separate HOLD.
- Academic 59/59 review required and 0 signed. Never auto-approve or distribute.

## Release sequence / blocked next actions

Confirm newest canonical ancestry and separate Paper Studio ownership; resolve timetable provenance + combined-class overlaps; require independent signed tenant/actor and employee/class links and authorized academic release; certify frontend error handling via Paper Studio; verify teacher role login/password-change without using real credentials in tests; genuine School2 denial; genuine Principal→Teacher delivery and save/reopen/Urdu A4 print; reviewed CI, dual-cluster backup offsite restoration and rollback; only then independent frontend/backend controlled release.

**NO DEPLOY.** Existing production student/marks/diary/fee/paper records, signed DB workstreams and service releases remain preserved.
