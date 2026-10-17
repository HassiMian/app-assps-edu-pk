# ASSPS SaaS Core + Paper Studio integration: Notices and Diary-format Lesson Planning
Date: 17 October 2026
Status: **SOURCE CANDIDATE READY FOR REVIEW, NOT DEPLOYED.**
Source base: clean verified `fix/core78-hermetic-ci-gates-20261017@2324bcb9d8f27e8032b1bddfeb8b09133c4df7bc`.
Coordination: GitHub issue #4. No application production database or services modified.

## Discovery: user requirement was ALREADY designed and partly implemented
Previously reviewed source commits were located in a distinct older local worktree, not the currently deployed or current canonical Core tree:
- `d522cf43f99b6398721e75dae5ebf808d348fe72` — School Document Studio architecture.
- `fb47ca19351e652af1f4fb5ac53b0c6317716d4c` — initial Notice Studio, school document backend, security migration, templates, React printable UI, old period timing integration.
- `cd2b0ee83` — immutable school-wide bell schedule source; its domain adapter was ported without adopting obsolete timetable/Student Portal source edits.
The other APEX Connect branding fix `d78659b` is a separate Connect-owned commit, **not present in this Core repository** and was not blindly applied.

## One integrated Notice Studio (no parallel/duplicate notice database replacement)
- Existing historical `/api/notices` and `notices` table remain untouched.
- New isolated API `/api/school-documents` backed by additive `school_documents`, `school_document_events`, `school_document_revisions` revisioned schema. The migration SQL is *only staged* in `ops/release/document-studio/001_school_document_drafts.sql`; it must be tested on disposable PostgreSQL with verified owner and ACL/RLS before promotion. There has been NO live migration, zero records deleted, zero default teacher permissions changed.
- Ten documented document types: notice, circular, office order, memo, class-only general date sheet, academic timetable, bell schedule, consent, staff acknowledgement and custom.
- Eighteen ready-to-edit official notices/presets; four A4 presentation skins: Prism, Executive Authority, Academic Ledger and Ink-Saving Classic. Separate date-sheet class/section scope, student-specific personalized pages remain in their original protected workflow, never sourced into general notices.
- Strong requirements: authenticated same-school actor, no user-submitted school authority, teacher may draft/submit but cannot approve/publish, independent principal must approve (self-approval forbidden), revision concurrency guard, dated document events, immutable source constraints, plain-text XSS protection, source-reference attestation, no student names/IDs/results in general date sheets.
- Branding must come from current authenticated SaaS tenant branding/logo, not user-agent hardcoded ASSPS shield. Urdu print uses RTL and authorised Nastaleeq rendering, English academic text serif, A4 consistent logo ratios, no false signature imprint. Saving a draft does not send to students/parents or certify a physical print. Published recipient delivery/acknowledgement and offsite snapshot remain separate future owner scope; do not conflate preview with delivery.
- The original bell schedule is school1-only and not extrapolated to peer tenant; timetable academic allocations stay preserved. No historical regular timetable rows, class assignments or teacher privileges were overwritten.
- Existing initial source & restored route now mapped through `App.jsx` and academicStaff permission `school_documents`, with separate Operations sidebar item. No data migration or production feature flag switch performed.

## Lesson Planning: EXACT shared Daily Diary UI rather than a second lookalike
- Root cause: `DailyDiaryWorkspace.jsx` ALREADY implements its real `initialMode="lesson"` branch, subject width/font +/- controllers, save/reopen, localized Urdu/RTL, personalized A4 cards, common school header/logo and print layouts; its lesson path persists to lessonPlan API and is NOT Diary record storage.
- Current Lesson Planning screen's default was a DIFFERENT `WeeklyNotebookStudio` component, so users never saw the Diary parity that existed. The isolated integration changes `LessonPlanningWorkspace.jsx` to open `DailyDiaryWorkspace initialMode="lesson"` by default. Two explicit existing tabs preserve Weekly/Term Notebook and Advanced Editor, without rewriting their draft IDs, revisions, user notes, legacy A/B split provenance or selected classes.
- Embedded lesson path hides Diary-only saved-diary navigation and the switch into operational Daily Diary editing; the lesson mode retains its own Existing Plan selector and lesson persistence. Normal standalone Daily Diary keeps both modes and its original library, save controllers, print acceptance, size settings and existing records.
- No new cloned editor. The two roles reuse the one underlying renderer, CSS and actual A4 print engine. Lesson planning academic publication remains approval-gated.
- Paper Studio Master OWNS final Lesson Planning acceptance, source review and release signoff. SaaS Core provides this independent integration candidate and preserves Paper Studio's active worktrees and freeze constraints. Never claim its standalone/physical printing acceptance on the strength of static source checks.

## Actual isolated checks and barriers
- Newly restored original Notice contract and immutable school1 bell contract: **10/10 PASS**, plus actual localhost Express synthetic school-context/teacher/student/anonymous/cross-tenant/general-date-sheet/self-approval negative test: **1/1 PASS**, combined **11/11 PASS**, private log SHA256 `9d7df18fe269cd08024ae974990b8fcfba5e6f998488d0f25abf50a38761ad98`.
- Lesson/Daily Diary genuine shared renderer source regression: **3/3 PASS**, independently validates default Lesson mode and unchanged other planning modes, persisted subject-size controls and historical notices compatibility.
- Vite production build from this candidate: **PASS**, protected 5-feature static suite **PASS**, `dist/index.html` SHA256 `ca1029938795e1d6832a89852eae64942a1c83fc8640824d618c881e82dab840`. This is candidate output, NOT serving public frontend. No app/server/DNS/Nginx/PM2 restart or live SQL DML.
- Existing Diary full 15 Chromium suite was started on isolated source. The remote terminal timed out after 50sec but the underlying test continued and emitted incremental PASS logs. The exact final RC and 15/15 must be verified and recorded separately; do not claim PASS before completed result.
- Source-only integration is protected by dedicated additive Core CI test steps for Notice backend + exact renderer reuse, and by upstream daily/lesson feature guards. Hosted GitHub Action results must be obtained after pushing, not assumed.
- The broader latest signed SaaS Core security was still **6/13 HOLD**: offhost full owner/ACL restoration, restricted signed adapter/worker/tenant grant and separate authentic School2 denial absent. Formal teacher identities (43 unreviewed links, 0 active explicit assignments), Urdu subject official offering, actual Ricoh A4 physical print, release backup and rollback need genuine owners; no approver impersonation.
- Separate current Results batch/grading candidate exists in its own dirty worktree: DO NOT overwrite, cherry-pick or deploy it without fresh owner reconciliation. This Notice/Diary branch comes from independently clean Core `2324...` and is not a newer production release.

## Safe next delivery steps
Review source ancestry and integration worktree; run full hosted QA; validate synthetic PostgreSQL 16 same-school vs peer-school RLS, role grants and revisions on a disposable clone; run real Paper owner Chrome Diary-format Lesson A4 acceptance with no production students; validate notice templates across English/Urdu and portrait/landscape; receive genuine staff/principal identity and off-host recovery certification; only then coordinate latest-canonical frontend/backend source merge, exact backup, rollback, controlled deploy and live acceptance. Never present code build as production.
