# ASSPS Grade IX–X Academic Master — Immutable revision JSON/SHA-256 independent reattestation (9 October 2026)

## Exact source of truth and scope

Resumed the isolated Academic branch `feat/grade910-academic-master-evidence-20261008` at clean local + origin SHA `73d3f45fefc053e0512d1d1a8efa587369647e72` after refreshing GitHub coordination issue #4. This is a genuinely new immutable revision integrity check, not a reimplementation of earlier topic/board/source parity, original author identity, reviewer revocation, source-page, duplicate flag, MCQ consistency or minimum answer requirements.

## Newly reproduced defect

`questionBankGovernance.js` creates immutable `question_revisions.content_hash` using canonical recursively sorted JSON via `sha256(buildQuestionRevisionPayload(input))`. But `recordIndependentAcademicReview()` and `assertIndependentReviewReady()` previously treated `question_revisions.content_hash` as an intact assertion without recomputing it over the ACTUAL persisted `question_revisions.content_json`. If both original school question and governed JSON were modified to the same answer or other content while the saved hash remained stale, ordinary source↔revision parity and signed review mapping still did not detect the contradiction at the content-hash boundary.

This is a synthetic integrity demonstration; there is **no evidence** that an actual production question was tampered with or approved. It is not a claim of compromised database credentials, a cryptographic signature, or a real academic review.

## Safe, shared-source implementation

- Extracted the **identical** original pure `stable()` and `sha256()` logic, byte-for-byte algorithm, into `al-siddique-backend/src/services/questionGovernanceHash.js`. Existing question governance authoring imports this same dependency-free helper and continues exporting `stable` and `sha256` as before. No change to question revision hash format, fingerprint logic, database schema, authors, or data.
- The Grade IX–X approval gate imports the same shared helper and adds `assertGrade910ImmutableRevisionHash(revision)`: content must be a JSON object (not null, a string, boolean or array), recorded value must be a 64-character hex SHA-256, and recalculated `sha256(revision.content_json)` MUST match the recorded value. Fail closed with `ACADEMIC_REVISION_HASH_CONTENT_DRIFT` 409; no attempt to repair an existing record by rewriting hash/content.
- Review capture verifies the current JSON/hash pair after pinning the exact revision and verifying Grade IX/X applicability, **before** a human academic signoff mapping can be recorded or replayed.
- The final publisher rechecks this invariant independently for Grade IX/X after determining the target grade/school source, **before** relying on a saved revision-hash mapping. Non-Grade IX/X workflow preserves the previous pass-through/unsupported-grade behavior (separate negative-to-green controls).
- Preserved all previous textbook edition/page, original author/signature/current active reviewer, source content, topic, duplicate status, answer/marks and tenant-bound authorization gates. No production release or controlled migration.

## Reproducible failure and correction

- First introduced four synthetic tests executing the real review-recording and final review gate. With a dependency-free extraction of the existing hash algorithm but **before implementing verification**, four cases were RED (**38/42 PASS, 4 FAIL**): original+revision mutated together while stored hash unchanged during review; same case at final publication; canonical key-order SHA verification API missing; unsupported/nonobject JSON not rejected.
- After implementing verification and updating stale test-only fixture hashes (which had previously intentionally changed revision content without recomputing SHA even while testing unrelated parity checks), the expanded service tests were **43/43 PASS**. Canonical SHA-256 `abc` test uses known digest, verifies sorted JSON order, Urdu/math content and changed marks.
- Two separate negative tests caught initial scope error: Grade VIII was accidentally subject to Grade IX/X hash verification (**43/45 PASS, 2 FAIL**); moved check behind grade-specific applicability and restored proper unsupported-grade behavior, resulting in **45/45 PASS**. All changes confined to academic scope.
- A test-harness setup initially attempted to import the full `questionBankGovernance` service, failing due unavailable `dotenv` in the isolated checkout; instead established one pure shared hash module and made no dependency installation or production changes. This is **not** misreported as an academic-code RED or PASS.
- Full final-source focused and original staging regression suites run sequentially using independent explicit `.tap` and process `.exit` files; results must be verified before commit and GitHub issue checkpoint.

## Academic reality and release hold

Original 2,581 authored Grade IX/X research/draft candidates remain **unchanged**. Independently human source/page verified **0**, independently academically reviewed **0**, approved **0**, verified published **0**. SHA content consistency alone does NOT prove textbook source/session/edition, scientific correctness, exam scheme, approved chapter/topic or Urdu/English semantic equivalence. Independent school-selected curriculum/adoption records and physical textbook page/exercise images, subject specialist answer check and current authorized reviewer signoff remain genuine blockers.

**Only** Academic-owned service utility, source capture/release review services, synthetic tests and report are touched. No seeded question, source file/PDF, official paper, Core signed session/RLS/tenant DB, Paper Studio/Connect source, live service, database migration or deployment is changed. Release certification and production deployment belong exclusively to SaaS Core.

## Final independently executed evidence on exact current source

- Original prepatch, after pure canonical algorithm extraction but before approval verification: **38/42 targeted PASS, 4 FAIL** (four independently reproduced SHA/content integrity counterexamples).
- Added scope regression: initial implementation **43/45 targeted PASS, 2 FAIL** for unintended Grade VIII handling, followed by grade-specific placement correction. **Final targeted 45/45 PASS**, 0 fail/skip/cancel; canonical fixture hashes now recomputed except deliberate old-hash tamper cases. No old validation gates bypassed.
- **Focused Grade IX/X academic/source/book-page/review/MCQ/Urdu/physics/numerical/provenance regression: 172/172 PASS**, no fail/skip/cancel, independent runner **exit 0**, duration 53.47 seconds; `/tmp/assps-grade910-sha-integrity-final-focused-20261009.tap` and `.exit`.
- **Full original Grade IX/X research/staging contract regression: 510/510 PASS**, no fail/skip/cancel, independent runner **exit 0**, duration 39.08 seconds; `/tmp/assps-grade910-sha-integrity-final-staging-20261009.tap` and `.exit`.
- JS syntax for both academic services, shared authoring service and new pure helper, test syntax, staged whitespace verification, and git exact remote match are separately checked. No live PostgreSQL test with restricted production roles, migration, source-page physical school proof, human academic review or release certification is claimed.
