# SaaS Core: grade-policy source release-check reconciliation (17 October 2026)

## Boundary
Source-only Core release validation. Does **not** modify Exam/Assessment routes, grading calculation, marks, result status, RLS, live app or backend, Nginx, PM2, backups or protected papers. Assessment Results remain owned by Paper Studio.

## Root cause
Published source candidate `603075a18efca3c94e02044ab6a2ce9cfd611589` already loads configured grades via `loadGradeBandsForSchool(schoolId, {previewDefaults:false})` and persists no grade when `gradeBands.length === 0`. Old `ops/production-safety-check.js` required the obsolete exact literal `gradeBands = await loadGradeBandsForSchool(schoolId)`, so its guard failed despite the stricter configured-policy behavior.

## Review
Adjust only the safety-check expectations to require `previewDefaults:false` and `gradeBands.length > 0 ? gradeFromBands(...) : null` before any saved grade, while retaining the `calcGrade` bypass denial. The new regression asserts secure source behavior and adversarial cases that would fabricate grades.

## Deployment status
This is an isolated source-only QA candidate. Do not deploy a branch based on older source merely because a safety checker passes. Core should independently merge only missing improvements onto the latest reconciled canonical source after checking cross-agent ownership, full source ancestry, security acceptance and release gates. All previously signed operational cutover states are preserved.
