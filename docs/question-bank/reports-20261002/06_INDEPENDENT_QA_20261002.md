# Independent QA workstream — 2026-10-02
## COMPLETED
- Baseline foundation tests BEFORE edits: 15/15 pass.
- Companion baseline selection (Paper Store + Early Years + Workspace + print snapshot): 46/47 pass; sole failed-to-run file imports missing local 'playwright' dependency.
- Added isolated release-gate, catalog-link and nine-board queue tests; final staging total: 27/27 pass.
- Recorded no live seed, no production update, no modification to existing paper datasets or current print/editor modules.
## VERIFIED
- 27 unique PECTAA label-to-URL matches and two ambiguous repeated labels; one PDF binary SHA-256 recorded with edition audit explicitly pending.
- Validation rejects missing Urdu review, source checksum mismatch, invalid exercise reference and wrong-edition textbook.
- Synthetic dry-run distinguishes would-insert, duplicate, conflict and rejected without mutating existing input.
## PENDING
- Install existing project test dependencies safely in isolated workspace; rerun 43-paper visual/print regression.
- Chapter coverage, real question academic accuracy, nine-board/subject evidence, A4 three-mode acceptance, live snapshot dry-run.
## BLOCKED
- Full curriculum-bank acceptance cannot be claimed; the source and pattern corpus is not yet independently verified.
- The missing Playwright package is an environment/test-readiness blocker, NOT a proven renderer defect.
