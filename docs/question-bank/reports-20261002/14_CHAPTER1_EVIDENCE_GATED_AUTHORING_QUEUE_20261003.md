# Grade IX Biology Chapter 1 — evidence-gated authoring queue — 2026-10-03

## COMPLETED
- Derived a deterministic authoring/evidence queue directly from the 33 open units in the committed Chapter 1 coverage audit.
- Created `biology9Chapter1AuthoringQueue.json` with 33 permanent queue IDs; every audit gap appears exactly once.
- The queue is pinned to the exact coverage-audit bytes by SHA-256: `df208959796a848666d0e8de173b4618ddac71597eec3b8b919be7062ce0e54e`.
- Every item carries topic ID, English evidence pages, source-risk flags and explicit pre-authoring/pre-release requirements.
- Queue records contain no question stems, answers, options or copied textbook wording.

## FAIL-CLOSED POLICY
- All 33 items have `safeToAuthorNow=false` and `publicationAllowed=false`.
- Normal units require exact Urdu source pages, a Urdu anchor and source-concept equivalence before bilingual authoring.
- Topic 1.4 sensitive units additionally require religious/editorial review before authoring.
- Release additionally requires formal bilingual edition equivalence plus independent academic, answer and bilingual editorial review.
- Malaria source-risk flags are preserved so historical material cannot silently become an unsafe or disputed answer key.

## VERIFIED
- Authoring-queue focused tests: **6/6 PASS**; complete staging regression after queue addition: **98/98 PASS** across 17 test files.
- Queue set equals the 33-gap coverage-audit set exactly; IDs are unique and the audit SHA binding is verified.

## CURRENT BOUNDARY
This queue is planning/evidence infrastructure, not an academic-question release. It deliberately prevents the project from filling gaps with guessed Urdu citations or declaring a topic complete because it already has some questions.

Next academic action is to obtain exact Urdu evidence for queued units, then author original bilingual questions against those verified sources and send them through independent review. Exercise-origin authoring remains separately blocked by the unresolved Urdu A-item page map and formal edition/cohort equivalence.

Approved questions remain zero; production imports, school-data writes and deployment remain zero.
