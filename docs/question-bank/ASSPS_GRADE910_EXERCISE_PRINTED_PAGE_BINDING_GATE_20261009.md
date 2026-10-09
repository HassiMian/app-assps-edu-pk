# Grade IX–X Academic Master — Exercise printed-page evidence fail-closed fix (9 Oct 2026 UTC)

Source checkpoint: branch `feat/grade910-academic-master-evidence-20261008`, direct continuation from `a23083875598a3c22136b4ce2b20882b54f37cac`. GitHub issue #4 is coordination authority.

## New defect reproduced and fixed
The academic gate `grade910PhysicalPageGate.js` required an exercise page's `row.sourcePrintedPage` to match caller-provided `evidence.sourcePrintedPage`, a positive PDF physical page, source PDF SHA, and an independent reviewer ID. However it **did not require the server-owned exercise certificate to contain the independently recorded `bookPrintedPage`**, leaving an unverified page value able to satisfy the exercise binding. A new negative test first **FAILED** against the old gate using a synthetic human-verified-looking record with absent `bookPrintedPage`.

The isolated fix **requires** `Number.isInteger(row.bookPrintedPage)`, its positivity, integer user page, and exact equality between:
- server-owned `row.bookPrintedPage`
- existing server-owned `row.sourcePrintedPage`
- review request `evidence.sourcePrintedPage`

Negative fixtures now reject missing, inconsistent, string and zero printed-page values. The synthetic positive fixture explicitly provides `bookPrintedPage:19` and passes. Existing independent source identity, PDF physical page, image SHA, exercise reference, independent reviewer and school edition checks remain unchanged.

**This is NOT actual human verification of any textbook page.** All production academic-page registries remain empty and uncertified. No seeds, school rows, migrations, Core signed tenant/RLS source, Paper Studio, official paper documents, cached PDF, or production services changed.

Evidence: targeted original page gate 9/9 PASS after fix (prepatch 8/9 with the new negative failing); focused academic regression 120/120 PASS. Grade IX–X staging regression is a separate process with its own exit evidence and is recorded in issue #4 at publication.

## Remaining blockers
The actual ASSPS-adopted edition, academic session and board cohort for each subject/medium must still be certified; physical printed+PDF page images/exercise indexes must be independently inspected; 2,581 authored questions remain provisional; 0 source-verified human physical pages, 0 independently reviewed, 0 approved, 0 published verified. SaaS Core exclusively certifies restricted signed roles, RLS, production release and rollback. Paper Studio must not select unapproved candidate questions.
