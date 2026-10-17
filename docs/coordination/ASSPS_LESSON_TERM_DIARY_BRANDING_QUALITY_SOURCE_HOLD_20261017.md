# ASSPS Lesson Planning, Term, Diary, branding repair — source-only candidate

Date: 17 October 2026. Owner: Paper Studio review; SaaS Core final production integration.
Base: candidate/1cedcd4d-loginloop-forwardport at 603075a18efca3c94e02044ab6a2ce9cfd611589.
Branch: fix/paper-lesson-unified-quality-20261017.
NO production deploy, no DDL/DML, no user impersonation and no academic publication.

## Changes
- Original pages, unit numbers, week boundaries and source assessment dates are preserved. Fixed page notation Pg#22:23, Pages 38–40 and Urdu page spans.
- Derive concise subject-language teaching statements; preserve unmodified source teacher instructions separately for audit. English B applications/essays and Urdu B applications/essays receive proper subject-language wording. Ambiguous Roman Urdu stays flagged, never guessed.
- Term syllabus displays first-to-last source page boundaries in a single concise subject row, not weekly copy-pasted paragraphs. Sourced pages and original dates locked, old conflicting manual page edits flagged for source correction. Unsourced terms remain blank pending teacher evidence.
- Weekly and Term use one common calendar. Owner-specified proposed 17 and 24 October; later dates twice a month on teaching weeks, with original source dates prior to proposals. Assessment-only weeks do not become fabricated homework.
- Term student selection now reuses the authenticated weekly roster. Vector A4 HTML print with narrow margins, three professional Term templates and student/subject/assessment/row/line/page controllers. Weekly has independent student/assessment/line controls. No raster screenshot conversion.
- Login obtains minimal school name/logo/colors by validated public school code, no private settings or tenant information. Authenticated Week, Term and Diary use the canonical branding context. A fallback SVG remains if source unavailable.
- Diary navy quick-controls become neutral light styling; their existing functions and print logic remain untouched.

## Existing and remaining gates
Local tests cover representative Class One image-derived English Pages 22–40 and Urdu A Pages 28–52, source preservation, weekday calculations, negative public-branding cases, malformed identifiers, immutable Diary controllers and protected paper templates. These are isolated/synthetic tests and are NOT a full review of the private real 59-subject school corpus.
Current 603075a source already FAILS the global production safety check because the unrelated grading-policy contract in examRoutes.js is not applied. Verified newer Core742 + Notice/Diary source c303edc does PASS this static check but is a different lineage. Do not promote this branch directly to live.
Owner paper/textbook provenance, real auth+tenant test, named student acceptance, printer proof, official assessment approval, exact build-source reconciliation, signed backup/rollback and SaaS Core DR 13/13 release gates remain pending. Central GitHub Issue #4 stays OPEN. No marks, genuine zeros, papers, stored diaries, roles or student records were altered.

## Fresh Core742+Notice/Diary isolated integration rehearsal
A new dedicated worktree integration/assps-core742-lesson-quality-forward-20261017 was created from independently verified c303edc05f7a90050838c8bf5ec358831b1b5c63. Only reviewed source candidate commit 89360e7a09f54efe3adc826091fa94aa6be75f63 was cherry-picked without committing; Git reports zero textual conflicts across 18 files. Core source static production-safety check PASS, and 21/21 compact academic/branding tests PASS. This is an independent release **candidate only**. The older original source baseline failure is NOT inherited into this integrated source. Paper Studio content and physical print approval, tenant/RLS signature, live acceptance, and SaaS Core production certification remain HOLD.
