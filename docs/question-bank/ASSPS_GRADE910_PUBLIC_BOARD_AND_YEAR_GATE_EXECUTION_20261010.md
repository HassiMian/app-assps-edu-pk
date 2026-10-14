# ASSPS Academic Master — Official public source, board jurisdiction and annual-exam applicability checkpoint

Date: 10 October 2026. Isolated Academic-only work; production and publication HOLD.

## Exact recovered checkpoint

- Latest coordination issue #4 (at preflight: 246 comments), preceding Academic owner checkpoint 6092752272.
- Parent isolated Academic branch fix/grade910-complete-2581-source-revision-gate-20261010, exact SHA 3a69fb517f43b610320b8fdf3b77e2c141ebb779. Parent local and independent GitHub remote matched; worktree clean.
- New Academic-only worktree /root/workspace/assps-grade910-board-applicability-20261010, branch audit/grade910-board-applicability-20261010.
- Existing 2,581 original question candidates, 875 MCQ candidate source SHA pins, previous 161 unapproved model-answer proposal revision freezes, 43 historical papers and the canonical Paper Workspace unchanged. No database/production writes.

## Specific public authority research, dated and narrowly interpreted

1. BISE Gujranwala official board portal https://www.bisegrw.online/ is active; Punjab Government official district/division page https://lgcd.punjab.gov.pk/node/629 lists Narowal under Gujranwala Division. This supports a **BISE Gujranwala school board research route**, NOT independently authenticated school affiliation.
2. PECTAA official book listing https://pectaa.edu.pk/books-and-publications/ contains separate Grade IX/X textbook titles with multiple edition labels. PECTAA downloads https://pectaa.edu.pk/downloads-2-2/ includes notices for academic session 2026-27. Neither establishes that ASSPS adopted a specific book edition for a specific grade/medium or approved a question.
3. Official PECTAA notification https://pectaa.edu.pk/uploads/Revised%20ALP%20Notification%2007.11.2025.pdf is dated 7 November 2025 and explicitly references **Grade IX forthcoming Annual Examination 2026**, NOT blanket Grade IX Exam 2027/2028 validity. Source available through public-index result; PDF raw byte SHA or physical page location was NOT independently certified in this work.
4. BISE Lahore notification index https://biselahore.com/notifications includes session-specific documents but is **not BISE Gujranwala** and cannot automatically certify the syllabus for ASSPS Narowal. School board affiliation and exact Grade IX/X exam-year evidence require real signed school/board records.
5. AsspsGrade910SchoolAdoptions.json records teaching session 2026-27 but zero real verified adoptions and schoolBookAndExamYearApplicabilityCertified false. AsspsGrade910PhysicalPageEvidence.json contains zero verified chapter/exercise anchors and physical certification false. Verified human subject review remains zero.

## Actual Academic-only guard implementation

- New ops/qbank/attest-grade910-board-and-session-applicability.cjs: 6 referenced public authority metadata sources with explicit NOT school-adoption, NOT verified PDF bytes, NOT independently signed board affiliation.
- Reuses full original 2,581-candidate source revision attestation and current signed-adoption/physical-page evidence registries. Rejects any fabricated school adoption, changed session, invented exercise anchors, false document certification.
- The policy decision for Grade IX PECTAA ALP and examination year 2026 is PUBLIC_NOTIFICATION_YEAR_MATCH_ONLY_SCHOOL_APPLICABILITY_UNVERIFIED. The same ALP in 2027 or 2028, or for Grade X 2026, returns DENY_WRONG_GRADE_OR_EXAM_YEAR_AUTO_APPLICATION. A BISE Lahore record returns DENY_CROSS_BOARD_AUTO_APPLICABILITY for the Narowal context.
- Removes untrusted caller-supplied authority-record overrides; even an attempted injected policy record cannot launder a 2026 notice into an approved 2027 session.
- New public-source/evidence JSON + staff-readable Markdown are whole-byte SHA pinned: c304b0920b58c989f25a9b786be639c64c9cb8f89f652e671094f858c2bc1d6b.
- Existing cumulative Academic 161-proposal reconciliation must execute this new evidence check before accepting an unchanged research revision state. No question is automatically approved, copied from a commercial guide or published.

## Test evidence and limits

- New source/ALP year/board impersonation/adoption/page spoof and in-memory evidence tamper suite 21/21 PASS exit0, /tmp/assps-grade910-board-applicability-final.tap.
- Inherited original Academic tests: batch A 151/151 PASS with complete zero-fail TAP, although external host returned timeout before shell exit; remaining original test groups 56/56 PASS exit0 and 50/50 PASS exit0, /tmp/assps-grade910-board-focused-b1-20261010.tap and /tmp/assps-grade910-board-focused-b2-20261010.tap.
- Full original staging 111 files in 2 groups: 219/219 PASS exit0 (/tmp/assps-grade910-board-staging-a-20261010.tap), 291/291 PASS exit0 (/tmp/assps-board-staging-2.tap) = 510/510 PASS.
- Publisher academic-only selection boundary + source identity/adoption checks 44/44 PASS with full zero-fail TAP, although remote process was longer than host command capture window: /tmp/assps-board-publisher-boundary.tap.
- Current work is **source metadata/board-year applicability** not an independent examination scheme approval, live school textbook adoption, direct PDF page verification, licensed textbook question reproduction, school teacher signature, real authenticated role/RLS or Paper Studio browser/print acceptance.

## Remaining external decisions

- Exact ASSPS adopted Grade IX/X textbooks, author/title/edition/language and signed session/examination-year register.
- Actual original printed-book chapter/exercise/page-to-PDF page proof by an authorized reviewer and edition-specific source URL/file hash.
- Independent qualified Biology/Chemistry/Mathematics/etc. academic reviewers reviewing exact question revision and answer/key/difficulty/marks, English/Urdu semantic parity and provenance, including 53 MCQ-source editorial pattern files, five original Chemistry long IDs and three possible originality overlaps.
- Original 2,581 research candidate IDs remain provisional. Existing 161 research answer drafts and 823 proposed grading criteria are unapproved. Human academically approved = 0 and verified published = 0.
- The old 43 completed historical papers are not future question-content blockers; retain structural Paper Workspace/section/scoring/RTL/print/Word/PDF contracts. SaaS Core exclusively certifies/deploys production.
