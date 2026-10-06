# APEX Paper Studio V6-G15 — Official Edition Review Preflight

V6-G15 validates independent English/Urdu source-edition review proposals against the exact publisher evidence manifest, PDF hashes and pinned G2 evidence ledgers. It does not mutate the manifest or release academic questions.

## Read-only endpoint
`POST /api/portal/paper-studio/publisher-review/edition-review-precheck`

Access:
- signed portal session required;
- `super_admin`, `admin`, or `principal` only;
- caller cannot be reused as an independent reviewer.

## Source binding
For Grade 9 Biology, the proposal must bind exactly to the current official source records:
- English `recordId` and PDF SHA-256;
- Urdu `recordId` and PDF SHA-256;
- exact SHA-256 of the current English G2 evidence ledger;
- exact SHA-256 of the current Urdu G2 evidence ledger.

Each medium review must supply:
- `INDEPENDENTLY_APPROVED` status;
- stable evidence id;
- real independent reviewer id/date;
- approved edition label;
- approved download status;
- independently verified chapter-index status;
- independently verified exercise-index status;
- substantive rationale.

## Bilingual equivalence
A separate independent equivalence review must bind to both exact PDF hashes and both exact ledger hashes.

## Deliberate release separation
Even a valid G15 proposal does **not** change `questionGenerationStatus`. The returned proposed manifest patch preserves the existing question-release status from the source manifest.

V6-G15 also guarantees:
- no live seed change;
- no Question Bank write;
- no manifest mutation;
- no publisher approval mutation;
- no canonical-write mutation.

## Verification
- G15 unit gate: 4/4 PASS.
- G15 signed-session HTTP gate: 2/2 PASS.
- Signed-session HTTP proof confirms zero Question Bank row-count delta.
- Deterministic full regression including G15: 95/95 PASS on a fresh synthetic database and isolated port.
