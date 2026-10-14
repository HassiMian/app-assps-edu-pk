# Full textbook default and optional ALP selection — 2026-10-02
## COMPLETED
- User scope correction: the bank covers the complete prescribed textbook; ALP is an optional selection filter, never the authoring/release prerequisite for full-book content.
- Resumed the clean isolated branch at 3f2bf5e6107eac913a9c0a3d47cf3aeca1b92abb.
- Added one shared syllabus policy for approved selection, topic projection, preview blocks, release dry-run and supervised review adapter.
- Full mode preserves reviewed textbook questions whose ALP status is included, excluded, unverified or not-applicable.
- ALP mode requires an explicit matching examination year, included status, HTTPS evidence URL, SHA-256 evidence and matching named syllabus review.
- Added Full textbook (default) / ALP selector and examination-year input to the existing topic-first pilot.
- ALP filtering operates per question; it never assumes every question within a partly included topic is eligible.
- Switching modes keeps persisted drafts and blocks. Ineligible block members invalidate the preview total; switching back restores full-book validation.
- Draft export retains the entire full-book library and includes the selected scope plus validation results.
- Full-book publication retains source, edition, exact topic/exercise mapping, academic, answer, bilingual, named reviewer, duplicate and syllabus checks.
- The existing no-commit supervised adapter remains disabled for lossy legacy storage.
## VERIFIED
- Before edits: staging regression baseline 62/62 PASS.
- After edits: staging regression 72/72 PASS, zero failures/skips.
- Six changed implementation modules including the JSX workspace parsed successfully using the existing temporary Babel parser.
- git diff --check passed.
- Synthetic tests cover full content outside ALP, positive/negative ALP evidence, year mismatch, unchanged records/blocks, source-check failures, unapproved selection rejection and review-only adapter behavior.
## PENDING
- Independent textbook evidence review and exact exercise-item page mapping; these are still required before academic release.
- Continue full-book, topic-by-topic authoring: EXERCISE, ADDITIONAL and CONCEPTUAL separately; Traditional and Important remain independent tags.
- Chapter 1 authoring proceeds from verified textbook evidence without waiting for an ALP notification.
- Verify/map official ALP evidence in parallel as optional eligibility metadata; no real question is presently ALP-verified.
- Browser interaction, complete frontend build and A4 English/Urdu/Dual print acceptance remain pending.
## BLOCKED
- Approved real IX/X academic questions remain zero; this checkpoint does not populate a completed full-book bank.
- Production Question Bank imports, deployment and unrelated branch merges remain zero.
- Lossless structured persistence and reviewed academic records are required before live supervised import.
