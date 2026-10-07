# APEX Paper Studio V4 security boundary — 2026-10-04

Paper Studio reuses the mature assessment/editor engine but changes persistence and permissions. `paper_vault` is canonical; browser localStorage is not a saved-paper authority.

## Paper Vault
- Teacher: create only for a class/section/subject authorized by `teacher_class_assignments`; list/update/delete only rows with `owner_user_id = signed user` in the same school.
- Admin/Principal: school-wide paper library visibility and lifecycle status authority.
- Updates use optional `expectedRevision`; stale writes return 409. Delete is soft-delete.
- Payload is a structured PaperDocument JSON snapshot; metadata is separately indexed by school/owner/class/subject.
- All access is school-scoped; cross-teacher lookups return not-found semantics rather than leaking existence.

Regression `tests/paper-vault-scope-http.test.js`: teacher assigned save, unassigned 403, own list, cross-teacher list/edit denial, admin school list, revision increment/conflict and soft delete. Synthetic school data is removed in finally.

## Question Bank
- Teacher reads approved rows only where active teacher assignment matches question class/subject.
- Teacher cannot POST/PUT/DELETE or approve imports.
- Admin/Principal/Super Admin retain management governance.
- UI hides teacher mutation controls, but backend is the actual security boundary.

Regression `tests/question-bank-teacher-scope.test.js`: assigned approved read, foreign class exclusion, unapproved exclusion, teacher mutation denial and admin school-wide read. Synthetic fixtures are removed in finally.

## Release rule
Do not treat CSS or hidden buttons as access control. Any future Paper Studio/Question Bank route must preserve signed user, tenant and teacher-assignment scope before rollout.
