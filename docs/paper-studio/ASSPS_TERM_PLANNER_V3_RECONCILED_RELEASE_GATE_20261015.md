# ASSPS Paper Studio — Term Planner V3, reconciled current-live release gate

**Engineering date:** 2026-10-15 PKT. **Verdict:** SOURCE QA PASS; PUBLIC DEPLOYMENT AND ACADEMIC PUBLICATION HOLD.

## Canonical history and collision recovery

The actual public Nginx frontend advanced to grade IX–X branch fix/grade910-draft-save-print-20261015, exact commit b18a8aae1a5d60c0ed8086ac56d313b67f750f21, root /var/www/assps-grade910-draft-save-print-b18a8aae, HTML SHA256 92283fc8eec1d5fe1562abfe26f75b731c0b9eeb5f1883802b3e2a2cabc330ff.

Earlier Weekly Notebook branch integration/paper-weekly-current-live-20261015 was 2e14c2ded97d303edc08c83dd79f0396b8f8f3d4. Both derive from 6531e42839fff7f4c56d332e833037e697895723, but neither descends from the other. The public b18a8aa build omitted the newer Weekly Notebook source, while 2e14 did not include the separate later Grade IX–X draft/save/print corrections.

This integrated branch starts on actual live b18a8aae and merges independent completed Paper Studio source commit 3282ca7c9543f4b858fb09ce852e88f537495981. Four protected current-live Grade IX–X changed source paths are bit-for-bit identical to b18a8aa after the merge. No dirty concurrent worktree or shared history was reset.

## Delivered source

- Full Term-wise editor: selected class, class subjects, editable topics/chapters, separate page-from and page-to, verified/proposed/source-review labels, source-bound school term.
- Assessment rows at the bottom of term/weekly document after all subject rows. Separate Assessment N and Date columns, assessment add/remove and source-date restore. Teacher-modified dates are proposals, not silently adopted source facts.
- Standalone term server draft format LessonPlanDocument schema V3 (compatible with older V2 and legacy reading). Contains full source-grounded subject coverage, assessment identities, layout settings and revision-safe Save/Reopen/Edit through the existing scoped API; local fallbacks are tenant/account/source-SHA bound, not equivalent to school server persistence.
- Formatting: English and Nastaleeq Urdu fonts, school name and section heading sizes, subject font, body size, row min-height, subject/assessment column widths, printable A4 layout. Silent shrinking of user-selected sizes removed. Overflow fails visibly rather than clipping.
- Long weekly source-derived statements no longer shortened in the planner, and the full statement is preserved alongside compact existing legacy lesson fields.
- Backend candidate guard: unapproved original-source weekly/term drafts and three specific source-uncertain Miss Adiba legacy review records cannot be generic-shared, deleted or have their source identity or publication hold stripped via editing. Tenant scope and prior generic legacy permissions remain separate.
- Original school source: 59 private subject/class groups and 18 Class One transcribed weeks, with existing source SHA verification; unverified textbook titles, dates and teacher assignments are never fabricated.

## Current merged-source QA

- Frontend pure term/weekly + Grade IX–X Bridge unit regression: 41/41 PASS, no skip or fail. /tmp/assps-term-merged-source-tests.log
- Backend static/engine, Principal source bundle, protected source HTTP denial and academic guard: 19/19 PASS, no skip or fail. /tmp/assps-term-merged-backend-tests.log
- Changed-module ESLint exit0 with zero warnings. /tmp/assps-term-merged-eslint.log
- Optimized Vite release build exit0. /tmp/assps-term-merged-build.log
- Headless private Chromium synthetic Term Save→Reopen→revision2 Edit, six class subjects, source date edit/restore, assessment add/remove, typography and A4 PDF: PASS. /tmp/assps-term-merged-browser-term.log
- Headless synthetic Weekly original-source review, scoped roster, server Save→Reopen, overflow rejection and one-card A4 PDF: PASS. /tmp/assps-term-merged-browser-weekly.log
- Current live Grade IX–X owner four changed file SHAs preserved exactly 4/4.
- All school actor accounts and students used by browser/http tests are synthetic. No real staff sign-in, no live multi-tenant JWT acceptance, no physical printer acceptance is claimed.
- No production SQL data writes, staff password change, school notifications, marks/results changes, PM2/Nginx restarts or production frontend/back-end deployments in this mission.

## Mandatory independent deployment gates

1. SaaS Core production owner must pin the CURRENT Nginx root, backend runtime artifact, latest remote source and current release lock again before promotion. Running backend lessonPlanRoutes.js SHA256 was 435cf755904dcd7fdf74189d5a99d267b8ace98a6627c9180a2375e9dfaaf74f at last inspection. The staged backend guard is not yet present in running backend.
2. Authentic teacher/Principal signed login, school-server Save→Reopen/Edit, A4 Urdu physical print and authorized class/subject assignments must be genuinely accepted and independently reviewed. Source mock browser tests are not substitute evidence.
3. Actual independent peer-school and subject-denied authenticated HTTP, signed least-privilege runtime RLS, current backup/recovery and protected existing marks must be verified.
4. Exact current frontend/backend artifacts, preflight/backup, release candidate checksums, controlled atomic promotion, real postflight smoke and executable traffic rollback must all pass. Never replace newer production with an old branch.
5. Any original syllabus page/date and academic approval must be confirmed institutionally before school/student/parent publication. Academic publication remains blocked.

Full historical chat transcripts were not byte-accessible in this mission; canonical repository handoff and current GitHub issue #4 were reviewed instead. Any academic source files remain root-private and no source WhatsApp contents or student data were added to Git.

## Rollback boundary

No production deployment occurred, therefore no production rollback is claimed. For a future approved promotion: protect current frontend directory and backend route bytes, preserve PostgreSQL records/roles and newest backup, rehearse recovery outside production, then switch only reviewed frontend/backend release candidates with independent signed postflight and rollback.
