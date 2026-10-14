# ASSPS Grade IX-X — Original source PDF page claim vs printed exercise verification boundary

10 October 2026. Academic Master isolated read-only research, NOT licensed physical textbook certification or teacher academic approval. Production HOLD.

## Recovered actual owner checkpoint
- Previous Academic owner issue #4 checkpoint 6093546086 on branch fix/grade910-grade-medium-edition-claim-gate-20261010 exact origin-matched clean SHA 1c81be90768992afcde9ee4c2a07bfe16933fe68.
- New isolated worktree /root/workspace/assps-grade910-page-evidence-20261010, branch fix/grade910-page-exercise-evidence-hold-20261010. Original 73 authored source files, all 2,581 original question records, all prior MCQ/key/answer revisions, teacher papers and Core/Paper Studio modules UNCHANGED.
- Existing signed-school physical evidence registry al-siddique-backend/src/data/asspsGrade910PhysicalPageEvidence.json raw SHA256 291493041690df2a18d6f161087bfd340a0b10b189e15f9c421511a88a720a49, with academicPageEvidenceCertified=false, verifiedChapterAnchors=[] and verifiedExerciseAnchors=[].

## Actual original provenance facts
- Exactly **2,581 distinct** original authored research question IDs in 73 source files.
- **1,393 original questions** carry a positive integer source PDF page locator CLAIM. None has a separately signed school physical/printed page or exercise verifier.
- **1,188 original questions** lack a source PDF page CLAIM (1,144 explicit null, 44 missing field entirely); do not invent page 1, assumed exercise positions, or infer printed page indices from PDF locator numbers.
- **0 original questions** carry an actual exerciseRef claim (2,537 explicit null plus 44 missing fields). As a result a school-approved "actual textbook exercise question" cannot be certified merely from question origin/topic status.
- **48 bilingual original Biology IX MCQs** include separate English and Urdu source-language PDF page, claimed pages list, source IDs and PDF hash identities. These are structurally consistent in original data, but still NOT qualified human translation/printed-page verification.

## New isolated read-only gate
- New ops/qbank/attest-grade910-original-page-exercise-evidence.cjs requires unchanged original 2,581-source SHA-bound packet AND previous 1,135 grade/medium/edition applicability packet. Original raw school physical evidence registry is separately pinned.
- Original page null/absent becomes explicit NOT PROVIDED; positive integer page is a SOURCE CLAIM, NOT a printed-book page proof. Nonpositive/fractional/string page claims rejected. Fabricated exerciseRef without page rejected. Bilingual page arrays and primary English page alignment checked. No source or old answers/options modified.
- Immutable 2,581 question-ID/source-revision-linked JSON/Markdown review queue ASSPS_GRADE910_2581_ORIGINAL_PRINTED_PAGE_EXERCISE_REVIEW_20261010; original source file SHA, original full question SHA, optional source PDF page claim, distinct Urdu/English page identity and actual physical reviewer/approval fields all recorded. No copyrighted original stems, option text, answer material copied to dossier.
- Original saved queue JSON SHA256 7177179eb13ed0b2cc9f9aa99a3f1db42871814bd462c31b11ec70c1884d4248 literally pinned in code. Existing cumulative Grade IX/X research answer reconciliation now REQUIRES this source/page evidence packet, and still denies verified publication.
- Original school physical registry, candidate research rows, original question sources, Paper Studio, SaaS Core/Connect, official papers, DB migrations, production and old caches untouched.

## Actual tests
- New 15 tests on source-page validity, bilingual page pairs, missing exercise refs, adversarial imaginary exercise, fake physical signoff, source revision tamper, immutable whole-file SHA, no copyrighted answer copies: 15/15 PASS EXIT0 /tmp/assps-grade910-page-source-targeted-20261010.tap.
- Complete prior + new Grade IX-X Academic focused regression split into five disjoint captured-exit-zero runs: 102/102 /tmp/assps-grade910-page-focus-a.tap; 78/78 /tmp/assps-grade910-page-focus-b.tap; 43/43 /tmp/assps-grade910-page-focus-c1.tap; 42/42 /tmp/assps-grade910-page-focus-c2.tap; 71/71 /tmp/assps-grade910-page-focus-d.tap. **336/336 PASS**, all process EXIT0. The initial eight-file third run reached complete 85/85 TAP after external command timeout and was independently rerun as 43+42 with captured EXIT0.
- Original staging 111 test files in disjoint groups 219/219 /tmp/assps-grade910-page-staging-a.tap and 291/291 /tmp/assps-grade910-page-staging-b.tap; **510/510 PASS EXIT0**.
- Publisher approval-only selection + adoption evidence + new page hold **24/24 PASS EXIT0**, /tmp/assps-grade910-page-publisher.tap.
- JS syntax, staged whitespace and final remote SHA equality/clean worktree required at push. No claim of live teacher browser, real printed textbook inspection or school signed independent expert signoffs.

## Real remaining qualifications and owners
- Actual ASSPS-adopted 2026-27 subject textbooks, edition/language and board exam cohort must be supplied/verified from school primary evidence. Independent qualified faculty must map actual original printed exercise/book page to edition-specific source PDF with source hashes and approve exact authored question/answer, marks/English-Urdu parity and originality.
- Other Academic master queues remain open: 2,581 original provisional candidates, 1,135 metadata applicability review candidates, 53 MCQ original source key-pattern editorial files, 161 UNAPPROVED separate long answer drafts/823 proposed marks, five original Chemistry long IDs, three possible overlapping pairs, and four standalone unapproved Biology Urdu translations. Prior 43 completed historical papers are not active release-content blockers; Paper Workspace UI, marks and Urdu RTL/print/PDF/Word fidelity preserved.
- Academically approved 0, verified published 0, academically VERIFIED selection EMPTY/HOLD. Production deployment exclusively SaaS Core.
