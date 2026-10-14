# Grade IX Biology Urdu source + persistent topic draft library — 2026-10-02
## COMPLETED
- Resumed from committed checkpoint ab699d0430b3c93cb1ced5836a3b7127d586dc7d and audited an uncommitted continuation already present in the same isolated worktree before editing it.
- Verified the official-catalog Urdu Biology binary at cache path IX/biology9_um_catalog010.pdf: 84,697,797 bytes, 212 pages, SHA-256 7f325fd04a1291949a39d4bb18e60d9d1daef4d18535f7b2189971c514a344dd.
- Added/validated biology9UrduEvidenceLedger.json: all 11 chapter openings, glossary start, Chapter 1 eight topic ranges, and Chapter 1 A/B/C/D exercise section counts (10/6/7/2) as first-pass visual evidence. No textbook exercise wording is committed.
- Cross-edition evidence records that the Urdu Chapter 1 seven-item long-answer block is visibly labelled C, while the English counterpart still has no visible heading; English evidence remains unlabelled rather than silently rewritten.
- Added a tenant-scoped, revisioned topic draft library with optimistic concurrency, 20-revision history cap, rollback-as-new-revision, block-reference validation and rejection of approved/wrong-checksum records.
- Fixed the browser staging namespace so each curriculum has its own base key before tenant scoping; Biology and future Chemistry/Physics draft libraries cannot collide under one tenant key.
- Topic workspace now persists user drafts and preview blocks through the tenant storage wrapper, supports reload/delete/rollback, and keeps the six research examples read-only.
- Urdu authoring now requires its own Urdu ledger, Urdu physical source page and checksum-bound source.languages.ur evidence. Urdu/Dual filters do not expose legacy demo translations that lack Urdu page provenance.
- Added a supervised curriculum adapter which preserves permanent question ID and full structured curriculumQuestion in review output, but explicitly blocks direct legacy commit because the current bank would lose identity/provenance and bilingual answers.
## VERIFIED
- Full isolated staging suite: 62/62 PASS after fixing three obsolete fixtures exposed by the stricter Urdu/topic-page rules.
- Current real research drafts are rejected by the approved supervised adapter, as intended; academically approved synthetic fixtures remain review-only with directCommitAllowed=false.
- Official manifest now records two verified Biology PDF binaries (English + Urdu) while edition equivalence, full chapter/exercise indexing and release eligibility remain unverified.
- No usePaperStore writer, bulkAddQuestions, Gemini generation, raw localStorage call or automatic live import was added to the curriculum workspace.
## PENDING
- Independently verify all Urdu topic boundaries beyond Chapter 1 and all exact exercise-item page mappings; full Urdu/English edition equivalence remains pending.
- Obtain/verify the official exam-year ALP notification binary and checksum, then map included/excluded topics.
- Add a lossless structured Question Bank persistence layer (permanent ID, bilingual answers, source/ALP/review provenance) before supervised commit can be enabled.
- Run full frontend install/build/browser acceptance and A4 English/Urdu/Dual print tests in an isolated environment.
## BLOCKED
- Approved IX/X academic-question count remains ZERO; production Question Bank writes remain ZERO.
- Exercise-origin authoring is deliberately blocked until each exact exercise item's page is individually verified.
- No deployment to app.assps.edu.pk and no merge into unrelated school feature branches at this checkpoint.
