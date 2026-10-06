# APEX Paper Studio V6-G6 — Exercise Question Page Coverage

V6-G6 expands exact source-page coverage without inventing question text or guessing pages.

## Evidence rules
- Chapter 1 exact mappings come only from V6-G5 visual verification.
- A later-chapter question ref is mapped automatically only when its source section occupies exactly one physical page in the G2 ledger (`firstPhysicalPage == lastPhysicalPage`).
- Any multi-page section remains unresolved until visual verification assigns an exact page.
- Question text is not copied into this artifact.
- Source ledgers are not mutated.

## Coverage
- English: 320 source refs total; 185 exact mapped; 135 unresolved; 57.81% exact page coverage.
- Urdu: 25 verified Chapter 1 source refs total; 25 exact mapped; 0 unresolved; 100% coverage for the currently reviewed Urdu scope.
- Combined: 345 refs; 210 exact mapped; 135 unresolved.

## Remaining English unresolved buckets
Only multi-page exercise sections remain unresolved:
- Chapter 2 A: 10 MCQs
- Chapter 3 A: 14 MCQs
- Chapter 3 B: 14 shorts
- Chapter 4 A: 10 MCQs
- Chapter 5 A: 10 MCQs
- Chapter 6 A: 11 MCQs
- Chapter 7 A: 10 MCQs
- Chapter 8 A: 10 MCQs
- Chapter 9 A: 11 MCQs
- Chapter 10 A: 15 MCQs
- Chapter 10 B: 10 shorts
- Chapter 11 A: 10 MCQs

## Verification
`paper-v6g6-question-page-coverage.test.js` proves:
1. deterministic mappings originate only from single-page source sections;
2. visually verified mappings resolve to the V6-G5 exact page map;
3. unresolved refs are never assigned a guessed page;
4. every ledger ref is represented exactly once as mapped or unresolved;
5. no question text is copied into the coverage artifact.

Current gate: 3/3 PASS.
