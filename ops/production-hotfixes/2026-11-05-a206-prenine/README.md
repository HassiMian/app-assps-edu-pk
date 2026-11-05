# A206 — Pre Nine / Nine Attendance Identity (Review Only)

## Baseline
- Modern source: `assps-diary-safeprint-20261105` commit `75c01ba4`.
- **NOT** a patch against stale GitHub `main` or the older A205 review tree.
- Modern `useAcademicStore.js` already keeps `pre-nine`, Grade Nine and Grade Ten independent; **unchanged in A206**.
- Production Academic Setup: Pre Nine / Blue and Nine / Fatima + Usman. Production active rosters: 12 + (6, 9) respectively.
- No active `teacher_class_assignments` rows found for Pre Nine / Blue. Genuine Principal teacher assignment and acceptance remains required for teacher workflows.

## Confirmed bug
- `MarkAttendance.jsx` coerces `Pre Nine` to `Nine` for dropdown label and `/api/students` / `/api/attendance` filters. The live backend filters exact class names, so this breaks Pre Nine roster selection.
- `AttendanceModule.jsx` had an unsafe fallback assigning Grade Nine a Pre Nine section when Nine's own sections were missing.
- The four published app shells still ship the wrong MarkAttendance coercion. Do **not** hotpatch minified deployed bundles.

## Candidate scope
- Change two React attendance modules only to use the exact configured class identity and its own sections.
- Preserve anti-stale roster scope checks, attendance save logic, and the signed academic class store without modification.
- 9 offline Node regression tests cover baseline defect, candidate class isolation and source-code scope.
- No authenticated end-to-end user acceptance, frontend bundle build, real teacher assignment, or source/deployment approval has been carried out.

**RELEASE: HOLD. Production changes: 0.** Reconcile/approve exact modern source and teacher permissions, run authenticated staging acceptance, then deploy with rollback and integrity evidence.
