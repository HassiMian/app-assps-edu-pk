# APEX Paper Studio V6-G8 — Independent Review Validation

V6-G8 turns the prepared reviewer evidence into a mechanically verifiable, read-only intake workflow. It does not persist reviews and does not grant publication or canonical-write approval.

## Admin/Principal API
`POST /api/portal/paper-studio/publisher-review/validate`

Security:
- signed portal session required;
- roles limited to `super_admin`, `admin`, `principal`;
- teacher access is denied;
- caller user id is rejected as an independent reviewer id;
- response is `Cache-Control: private, no-store` through the protected Paper Studio surface;
- no review record is persisted;
- no publisher approval flag is changed;
- no canonical write flag is changed.

The response policy explicitly returns:
- `validationOnly: true`
- `persisted: false`
- `approvalChanged: false`
- `canonicalWriteChanged: false`

## Offline CLI
`node scripts/validate-independent-review-v6g8.js <review-bundle.json> [forbidden-reviewer-id ...]`

Exit codes:
- `0`: bundle structurally valid;
- `3`: bundle read successfully but fails independent-review validation;
- `2`: file/usage error.

## Reviewer package
Sealed evidence is stored under:
`/root/secure-archive/apex-paper-v6g3-review-pack-20261006/`

The pack includes one immutable review-artifact manifest per technical review plus:
`independent-review-submission-template-v6g8.json`.

The independent subject/live-source technical dossier is complete, but its manifest deliberately remains `TECHNICAL_DOSSIER_COMPLETE_EXTERNAL_GRANT_PENDING`; this is not approval.

## Verification
- G8 signed-session HTTP flow: 4/4 PASS.
- G8 offline CLI: 3/3 PASS.
- G4-G7 regression with G8 development: 22/22 PASS.
- Live production signed-session G8 flow: 4/4 PASS.

No human/reviewer identity, academic decision, publisher signature, or approval result is fabricated by this workflow.

## Final technical checkpoint
- Live backend runtime release: `1febac2cc37b4426b9704ad380e6215e856f765b`.
- Branch reviewer-tooling head: `c84fc7d65d5a401858082bfe718463bc72e603d3`.
- Final runtime-aligned publisher evidence snapshot: `/root/secure-archive/apex-paper-v6g8c-20261006/curriculum-publisher-evidence.json`.
- Evidence SHA-256: `e33bc6f28aeb3dac1cdd4fdbace44804b095097b1b232a663288468fb8b3abc9`.
- Sealed operational review pack: 28 artifacts.
- Fresh production-clone full regression: 61/61 PASS (`full-regression-fresh-clone-c84fc7d.tap`, SHA-256 `60b7c523e8ae63848ec651fda730a41c82377d250fb993de09cab3f7dc2572a7`).
- Reused-DB rerun is preserved separately as a negative harness artifact and is not counted as a product failure.
- Canonical registry remains empty: 0 documents / 0 revisions.
- Production Question Bank remains empty: 0 questions.
- Publisher production approval remains false.
- Canonical registry write enablement remains false.

At this checkpoint, remaining progression requires real independent academic/publisher review evidence; no further technical step is allowed to synthesize or self-approve those decisions.

## Deterministic full-regression runner
`./scripts/run-paper-studio-full-regression-v6g8.sh` now creates a fresh timestamped test database, launches a backend on an isolated test port, verifies the protected Paper Studio router, runs the 61-test suite once, and automatically destroys the synthetic DB/process on exit.

A harness bug found during development is explicitly fixed: sourcing the live `.env` overwrote the shell variable `PORT` with production `5000`, causing tests to hit production while the isolated server listened elsewhere. The runner now uses immutable `TEST_RUN_PORT` for server and test targeting. Proof run: 61/61 PASS on isolated port 5038.
