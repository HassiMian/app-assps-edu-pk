# ASSPS Academic Master — Genuine MCQ editorial-risk discrepancy, independent source snapshot and release HOLD

10 October 2026. Only Grade IX–X Academic-owned read-only research QA. No production release.

## Exact recovered baseline and independently reproduced defect
- GitHub issue #4 read at 225 comments. Previous latest Academic checkpoint comment 6092195255, clean remote-matched Academic commit ac1d31e742a52fcf9fd01c38f800ad0280c65ea6 on audit/grade910-three-overlap-source-review-20261010.
- Fresh isolated worktree /root/workspace/assps-grade910-mcq-editorial-gate-20261010, branch fix/grade910-mcq-editorial-pattern-risk-gate-20261010 directly from the same SHA; other agents' branches and worktrees untouched.
- Executed existing auditor BEFORE fix: original Grade IX–X 875 provisional MCQs, correct options A=785, B=50, C=33, D=7, and 53 original source files with predictable key sequences, yet auditor's aggregate flagCount was **0**. This falsely undercounted already-detected editorial concerns and could make an editorial QA summary appear green.
- This is statistical/editorial review evidence, NOT proof any particular MCQ answer is factually incorrect. It never changes a correct answer or proves textbook adoption.

## New actual changes
- Modified existing ops/qbank/audit-mcq-authoring-structure.cjs to elevate every already-identified correct-key sequence to its own first-class finding in the SAME aggregated flagCount and flagSamples rather than leaving it as uncounted per-file metadata.
- Added thresholded corpus-level A/B/C/D key concentration warning for >65% dominant key in a source collection with >=40 MCQs. Report now accurately reports **54 editorial warnings**: 53 file-level predictable-sequence flags + 1 overall concentration concern. Observed key A share is 785/875 = 89.7%. For a balanced four-MCQ synthetic sample, no flags are invented; for 8 all-A, one sequence concern; for 40 all-A, sequence and global concerns.
- NEW read-only ops/qbank/attest-grade910-mcq-editorial-hold.cjs creates separately sealed file SHA256s for each of the **53** original flagged source files across both existing drafts and items array formats. It independently re-reads bytes and compares original parsed snapshots, requiring unchanged 875 input MCQs and exact editorial risk counts. No copyrighted question text copied into JSON. Saved research-only manifest ASSPS_GRADE910_MCQ_EDITORIAL_PATTERN_HOLD_20261010.json literal SHA256 a4908d694b683fd330631268f18f288fe0f7787a48a7c93f29b4114cff402f9f is pinned in code.
- Existing cumulative Grade IX–X 161-answer research-only reconciler gains a required read-only MCQ editorial source snapshot assertion. All old original provisional MCQ question texts, keys, options, exercise claims, prior research answers/161 manifest and academic review status are UNMODIFIED.
- New independent MCQ editorial staff intake warns that editing or reordering options would create a NEW academic question revision requiring full original answer+medium review. **Do not auto-reorder or falsely publish any MCQ.**

## Actual test evidence and initial blocker resolved
- First new source report failed because some original authoring cohorts use items[] rather than drafts[]. Updated read-only new gate to accept either preexisting container type; source bytes unchanged.
- New 14 source/tamper/false-green/baseline/known-good synthetic suite **14/14 PASS exit 0**: /tmp/assps-grade910-mcq-risk-targeted-first-20261010.tap.
- Complete Grade IX–X Academic new+inherited focused suite **299/299 PASS exit 0**: /tmp/assps-grade910-mcq-risk-focused-20261010.tap.
- Whole original staging suite one-run TAP reported **510/510 PASS 0 failed** but host command timed out after ~50s before shell exit was captured. Re-ran **all 111 same original staging test files** split deterministically in two nonoverlapping batches: **219/219 PASS EXIT0** /tmp/assps-grade910-mcq-staging-half-a-20261010.tap and **291/291 PASS EXIT0** /tmp/assps-grade910-mcq-staging-half-b-20261010.tap; combined **510/510** with actual captured exit codes both zero.
- Publisher-approved-only boundary plus Chemistry and prior/new source QA **195/195 PASS EXIT0** /tmp/assps-grade910-mcq-risk-publisher-20261010.tap.
- Node syntax, exact staged git whitespace, local/remote commit equality and clean worktree to verify at commit checkpoint. No real school physical textbook inspection, qualified teacher answer review, non-BYPASS RLS/teacher browser or PDF/DOCX acceptance claimed by these offline tests.

## Protected original research counts and remaining human blockers
- **875** original provisional MCQs unchanged; 53 candidate source files flagged for QUALIFIED MCQ editorial, scientific answer and distractor review. Key imbalance can be a layout/editorial pattern, not proof of wrong answers.
- Existing original Grade IX–X 2,581 provisional question records unchanged, 166 original rubric-only long fields unchanged. Supplemental unapproved research explanations: 161 DISTINCT original IDs / 823 proposed marking criteria across 20 source cohorts, remaining five original IDs, three conceptual overlap pairs awaiting independent faculty decisions.
- Actual adopted ASSPS 2026–27 textbook title/edition/medium/exam year, printed exercise page and relevant board applicability not certified. Human reviewer identity, qualified MCQ correctness, originality, Urdu equivalence, revision-specific independent signoff and academic approval MISSING.
- Academically approved **0**, published verified **0**, Paper Studio verified picker **EMPTY/HOLD**. Only SaaS Core may certify/deploy production. NO production migration, seed, import, service changes or official paper edits.
