# APEX Paper V6-G — Curriculum Publisher Evidence Gate (2026-10-05)

## Decision
Canonical PaperDocument storage must remain read-only until a real, independently reviewed curriculum publisher release exists. A boolean environment flag is insufficient. V6-G therefore makes curriculum publisher evidence a cryptographically pinned prerequisite of `canonicalRegistryWriteEnabled`.

## Production state
Live readiness architecture: `v6-g-readiness-1`.

The following storage/infrastructure gates are already green:
- canonical registry tables present;
- dedicated canonical runtime role approved;
- tenant RLS approved;
- canonical write-defense trigger approved;
- canonical payload contracts validated;
- renderer source/build/golden evidence verified;
- renderer parity approval flag set;
- backup/restore drill approved.

The production cutover remains intentionally blocked by:
1. `CURRICULUM_PUBLISHER_EVIDENCE_INVALID`
2. `CURRICULUM_PUBLISHER_NOT_PRODUCTION_APPROVED`
3. `CANONICAL_REGISTRY_WRITE_DISABLED`

No dual-write, destructive migration, fabricated source identity, bypass-role canonical access, or teacher-facing storage internals are permitted.

## Pinned evidence coordinates
The evidence bundle in `/root/secure-archive/apex-paper-v6g-20261005/` is evidence-only and does not self-authorize release. Its manifest SHA is pinned in the production environment, as is source commit `6fb16e5d678d57182c696bbf35f4360db4de7e36`. The commit was independently verified as the GitHub tip of `feat/grade9-10-curriculum-bank-foundation-20261002` in `HassiMian/app-assps-edu-pk` before production configuration. Approval and canonical-write flags remain explicitly false.

Artifacts are path-confined and SHA-256 checked:
- `officialSourceManifest.json` SHA `e20e727720359036a01aeb3b9b2faeeae169f27f6617b0744ddf72c2ad5fc293`
- `dryRunReport_20261002.json` SHA `8eda0b754c5f2a4f58c992ce02ebf8341c9f63933845f1e5a19865ad57867e2a`

## Current objective evidence gaps
Current evidence scope: Grade 9 Biology.
- catalog entries: 29;
- verified PDF hashes: 2;
- chapter indexes ready: 0;
- exercise indexes ready: 0;
- approved question count: 0;
- staged real question count: 0;
- would-insert count: 0.

Missing approvals include official EN/UR PDFs, Urdu edition approval, chapter/exercise indexing, EN/UR academic question release, bilingual edition equivalence, genuine signed curriculum publication, publisher key custody, independent live source grant, isolated DB credential/RLS review, institutional backup/restore review, teacher/student response privacy, multi-instance intent safety, bilingual print/Word/PDF parity and canary rollback approval.

Release-state fields still false: live import authorization, academic signoff, bilingual signoff, tenant-scoped bank snapshot review and publisher key-custody approval. Institution roster binding is the one completed release-state field in the current bundle.

## Newer branch audit
`feat/grade9-10-full-question-bank-goal-20261004` (`dad7a2f`) was independently cloned and audited before considering an evidence re-pin. It is architecturally newer but its own reports still state `approved questions=0` and `production writes/deployment=0`; formal Urdu edition equivalence, bilingual/editorial review and signed publication remain pending. V6-G therefore does **not** relabel old evidence with the new commit. Evidence coordinates always identify the commit that actually produced the bundle.

## Test gates
After V6-G live deployment:
- publisher evidence unit gate: **5/5 PASS**;
- canonical readiness tests: **2/2 PASS**;
- signed portal projection and readiness authorization: **10/10 PASS**;
- Paper Vault owner isolation: **8/8 PASS**;
- Question Bank assignment/admin scope: **6/6 PASS**;
- Connect and backend public health: HTTP 200.

Synthetic fixtures are cleaned after tests. V6-G performs no canonical paper writes.

## What can unlock V6-H / canonical write canary
A new evidence bundle must be produced from the real reviewed curriculum source commit and must have all artifact hashes, independently approved bilingual edition evidence, a genuine signed publication, operational review evidence, at least one approved real question and no open issues. Only after `verifyCurriculumPublisherEvidence().valid === true` may a separate operator approval set `PAPER_CURRICULUM_PUBLISHER_PRODUCTION_APPROVED=true`.

Even then canonical writes remain independently disabled until an explicit canary migration approval sets `PAPER_CANONICAL_REGISTRY_WRITE_ENABLED=true`. Those two approvals MUST NOT be coupled or auto-enabled by evidence verification.
