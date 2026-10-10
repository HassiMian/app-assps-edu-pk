# ASSPS Result Cards — Phase 6 real student class/section from scoped exam results

Date: 2026-10-10. Isolated source-only; production HOLD and pending Core release.

## Actual visual/data regression
Class/Section on result cards could say `All Classes` (the exam filter), because single-exam result API returned only name/roll/GR/father/photo; UI student aggregation discarded class/section even from all-exams endpoint. This is a student-identity correctness defect, not a style adjustment.

## Scoped correction
- The already-authenticated, school and portal-tenant-scoped GET `/api/exams/results/:exam_id` now SELECTs `s.class AS student_class, s.section AS student_section` with the existing tenant JOIN and authorization, no new public API.
- Pure `buildResultStudents` maps real class and section for single/class/all-school printing, prefers student identifiers, preserves data appearing in later subject rows and refuses `All Classes` as an individual grade. The premium card fallback now renders `—` instead of misrepresenting an aggregate exam scope as the student's class.
- Original result tables, marks, official paper artifacts, approved template hashes and school logo sources remain unchanged. APEX login and deferred reset code unchanged.

## Evidence
- 15 synthetic student identity + SSR checks PASS, `/tmp/assps-result-p6-identity.log`.
- Backend route JavaScript parser EXIT0 (single read-only SELECT expansion).
- Real Chromium Designer interaction with mixed 3-card batch, missing/broken SaaS-logo print-denial PASS, `/tmp/assps-result-p6-designer.log`.
- Real Chromium **25 PDF pages / 25 synthetic students** PASS, `/tmp/assps-result-p6-batch.log`.
- Protected six source SHA hashes unchanged, `npm run verify:templates` EXIT0.
- New module/test focused ESLint EXIT0. Optimized Vite build EXIT0 (8.82s). No real teacher creds or student records accessed.

## Release ownership
Before production, forward-port ONLY results changes onto current Core-authorized canonical descendant and certify actual authenticated school/tenant results. Phase5/Phase6 original history includes deferred Phase4 password recovery; do not merge that history as-is. SaaS Core owns RLS/HTTPS/release and rollback. 10 October printing from live site must use only currently certified workflow until signed promotion.
