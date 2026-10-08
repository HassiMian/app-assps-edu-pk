# ASSPS Paper Studio Phase 2: Teacher session and authorization acceptance

Date: 2026-10-08 UTC
Source base: production `68a158e067e8bbcb0f35514abaff8d580a6435be`.
Scope: narrow forward-only release guard plus teacher-facing role-label correction and browser regression.

## Independent, authentic session test

`al-siddique-frontend/src/Modules/Paper-Generator/PaperEditor/tests/teacherRealAuthIsolatedBrowserAcceptance.test.js`

The browser runs against a **production-style Vite build** and an isolated backend on alternate ports. A disposable production-clone PostgreSQL database is mandatory; the test rejects unscoped database names and live ports. It creates synthetic school accounts with an already-completed onboarding state. The authorized teacher receives an explicit `paper_generator` permission, while a second teacher receives none. The test logs in with a real backend-issued session/token; it does not mock authentication or school permissions.

Verified:
- Authenticated `GET /api/auth/me` returns HTTP 200 with teacher role.
- Authorized teacher can access Paper Studio with six tabs, four creation paths, and Early Years workspace.
- Same-role teacher without permission receives an access denied screen and no creation controls.
- Browser page exceptions: none.
- No production school/student/teacher records are inserted or edited.

The test does **not** claim to exercise the initial required-password-change flow, teacher paper server persistence, or a real human teacher's production browser session; those remain distinct operational acceptance checks.

## Corrected role label

Before: a teacher without an explicit designation could be incorrectly labeled `Principal` in the top bar and profile dropdown.
After: explicit designation still wins, otherwise the UI resolves the correct role label (Teacher/Principal/Administrator/etc.), with neutral fallback.
The pure helper has dedicated unit tests, and the isolated authenticated browser confirms the teacher label appears and the principal label does not.

## Release safety

- Verify frontend/backend live SHAs independently; never deploy older worktrees.
- Release consistency/production safety and full OPS regression must pass on the new descendant.
- Protect official papers, canonical PaperDocument, print assets and backend tenant/RLS behavior.
- This branch is not a claim of production deployment. Deployment requires checked rollback snapshot, deterministic frontend build, current remote ancestry and post-release browser checks.
