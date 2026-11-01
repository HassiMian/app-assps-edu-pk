# ASSPS Exam Mutation Safety — 1 Nov 2026

Status: DEPLOYED on live apex-backend, review-only source handoff.

## Changes

- New sequential all-class Assessment exams must match school F-band passing policy. At 40 percent for 20 marks the requirement is 8. Invalid future inputs return HTTP422; absent grade policy returns HTTP409. Historical grades and exams remain untouched.
- Original school1 First Term exam ID9 cannot be deleted through standard exam manager (HTTP409).
- Any exam with saved student results cannot be deleted through standard exam manager (HTTP409). Deletion SQL is explicitly school-ID scoped.
- Staff creation remains JWT authenticated, school-scoped, serializable, school-advisory locked. No auto-approvals.

## Verified evidence

- 59/59 backend academic contract tests PASS after restart.
- 4/4 targeted synthetic source/policy tests PASS.
- Live apex-backend online, API health HTTP200, result counts and marks digest unchanged.
- School1 Assessment5 still absent; authentic Principal create and subject approval remain pending.
- Original frozen First Term integrity remains HOLD and academic release is 7/16.

## Source handoff caveat

The active runtime source is NOT identical to the older canonical GitHub examRoutes.js in al-siddique-backend. DO NOT apply examRoutes.patch to the old canonical file without first reconciling its imports, permissions, and route structure. This unified patch targets the exact pre-fix active runtime source. New examMutationSafety.js belongs in src/services. The synthetic test is not real human Save-Reopen-Edit-Print acceptance.

Live rollback source on restricted VPS:
/root/secure-archive/assps-resume-20261101/EXAM_ROUTES_BEFORE_MUTATION_SAFETY_20261101.js

This branch is review-only; source-of-truth merge is BLOCKED until canonical runtime parity is independently approved. Private students are not included.

## Final additional retention protection
Approved academic subject offerings now also independently block normal exam deletion (HTTP409 APPROVED_EXAM_SCOPE_RETENTION_REQUIRED), even when no marks have yet been entered. Post-restart 59/59 core and 4/4 focused tests PASS. The unified diff was replayed against the exact pre-fix runtime source and matched deployed examRoutes.js byte for byte.
