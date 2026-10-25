# ASSPS Lesson Planning — original assessment provenance lock
Date: 2026-10-25. Scope: isolated source-only Lesson Planning correction, NO LIVE DEPLOYMENT.

## Exact parent and invariant
Parent: fix/assps-lesson-planning-term-safe-20261025 at fca2724f258e86fb43b241e9b68173dc3592613b.
Original academic assessment dates/names/origin/source IDs must remain unchanged even if a historical browser/server draft supplies an override keyed by its original source identity. Manual or proposed dates remain editable but never become ORIGINAL_SOURCE.

## Reproduced negative control
Synthetic original event src:english|2026-10-17|source-1|ORIGINAL_SOURCE originally on 2026-10-17, with replayed MANUAL_PROPOSAL overriding the same key to 2026-10-19. Prior code silently rendered 2026-10-19, losing immutable event origin. Negative control exit 7. Source-provenance integrity issue; NOT observed live School1 exploitation.

## Correction
Term model now excludes locked original-source IDs from manual override application/date reservations. It does not change persisted drafts, delete historical entries, auto-publish academic events, remap tenant/class/teacher identity, or reinterpret source-proposed events as approved. Independent manual proposals remain available for legitimately new school-planned dates.

## Verified source checks
- Node Term model tests: 13/13 PASS, including source-ID replay regression and allowed proposed-date edit.
- Existing teacher delivery readiness: 13/13 PASS; backend lesson publication/static/teacher-delivery audit/HTTP fixture: 22/22 PASS.
- Chromium synthetic Term planner: POST to PUT server revision 1 to 2, reopen/reload, A4 PDF PASS; localhost mock only.
- Chromium synthetic A4 density: 2, 3, 4 cards/sheet PASS; five fictional students, no school PII.
- Scoped ESLint PASS, Vite optimized frontend production build PASS.
- Only isolated branch files changed. No production DB DML/DDL, Nginx/PM2 reload, API write, real teacher login, academic approval or deployment.

## Read-only live observations, 2026-10-25
- School1 PostgreSQL apexos.public.lesson_plans: 3 saved; sent_to_portal=true: 0.
- School1 public.teacher_class_assignments: 54 total, 54 active. Not a substitute for genuine recipient role/session/tenant delivery acceptance.
- Pinned school source candidates: 59/59 publication BLOCKED, 59/59 review AWAITING_SUBJECT_OWNER_AND_ACADEMIC_QA.
- Public backend health HTTP 200; anonymous lesson-plans HTTP 401. Neither verifies real teacher write/sharing.

## Explicit remaining release gates
1. Review 59 academic source candidates independently and sign revision/evidence before broad teacher delivery. First/Third Term missing sources remain unsourced, not filled from Second Term.
2. Test genuine school-scoped Principal/Teacher/School2 authorization, password change, delivery recipients, Save/Reopen/Edit/Publish with signed identities and cross-tenant denial; retain revision conflict safety.
3. Prove exact deployed frontend/backend ancestry, row-level security, protected backups, independent off-host restore, signed rollback and safe cutover in SaaS Core.
4. Authenticated real-browser Urdu/Jameel A4 physical printing, private media/CDN purge certification, Diary Save/Reopen/Print and related release gates.
5. Maintain G11/G12 RELEASE_HOLD; Core sole production owner. Synthetic Chromium success is not live acceptance.
