# ASSPS Grade IX–X Academic Master — Single Unified 1,305-Question Review Mission

**17 October 2026 | ONE authoritative review/backlog cluster | Research-only; no fabricated approvals or deployment**

## Problem: avoid double-counting and false closure

The previously separate valid source-audit and academic review streams refer to overlapping *existing* School 1 provisional question IDs. Their gross summed queue **998 source-page research claims + 358 unlinked answer-depth risks + 80 current machine-verified numericals = 1,436 lane entries**. A live protected revision-SHA join proves **131 overlapping lane entries**, giving **exactly 1,305 distinct currently affected live School 1 question revisions**. The **137 HIGH Matric-Tech-labelled answer-depth risks are a subset of the 358**, not an additional 137 questions; 29 overlap source-page research claims. Do not add or publish counts as independent inventories.

| Original research lane | Records | Academic status |
|---|---:|---|
| Claimed original textbook PDF/question page needing real exercise proof | 998 | Source-page claim research only, not authenticated printed question location |
| Unlinked long-answer answer-depth research risks | 358 | No linked supplemental example yet; 137 HIGH Matric-Tech adoption unverified, 221 REVIEW |
| Numerical items mechanically recomputed against current question revision | 80 | Machine arithmetic provenance only; **80 independent qualified faculty reviews outstanding** |
| Matric-Tech HIGH subcohort within the answer-depth lane | 137 | Official catalog referenced, ASSPS programme/edition/medium adoption unconfirmed |
| **Unique existing School 1 question IDs in combined three primary lanes** | **1,305** | **All remain provisional/unapproved** |

The protected `grade910-1305-distinct-live-review-blocker-cluster-20261017.json` receipt encodes **exact current question-revision SHA256 per unique ID**, tagged with each contributing lane, source catalog/page-research status where present, editorial priority and original machine arithmetic evidence. This packet stores **NO** school question/answer text, copyrighted textbook content, child/student names/marks or passwords. It is root private, mode `0600`.

The seven actual disjoint lane patterns are: source only 867; answer only 167; answer+source 54; answer+Tech 108; answer+source+Tech 29; numerical only 32; numerical+source 48. Tech labels do not independently add IDs. All 137 Tech-labelled HIGH records stay **on hold** until authentic school programme adoption, not automatically discarded.

## Eight non-bypassable academic completion requirements

Each unique current question revision must be evaluated for:

1. **Curriculum session and board applicability** (never infer from general PECTAA catalog or unverified ALP).
2. **ASSPS school-adopted textbook edition, medium and Tech-programme scope**, tied to authoritative school evidence.
3. **Exact printed textbook question/exercise/page, chapter and topic** if claiming exercise origin; independent conceptual authoring must be labelled as such.
4. **Correctness of question and answer**, including independently verified MCQ options, units and numerical response; machine checks alone do not represent qualified faculty approval.
5. **Marks, difficulty, learning outcome, examination relevance and appropriate rubric** as independently reviewed.
6. **English/Urdu equivalence when applicable**, including 53 *unapproved same-chapter candidate bilingual pairs*, not accepted translations.
7. **Source provenance, copyright permissions and duplicate detection** with immutable current-content fingerprints.
8. **Authentic independent qualified reviewer decision/signature bound to the exact current question revision**, approval history and valid school authorization.

Never mark `Source Verified`, `Academically Reviewed`, `Approved`, `Published` from a convenient research/candidate count. Research Candidate → Draft → Source Verified → Academically Reviewed → Approved → Published are distinct review states. A changed approved question must return for review before release.

## Safe master release architecture

- **Source authority:** protected official catalog and PDF SHA/page evidence, real school-adopted textbook decisions, question revision hashes, independent qualified academic review.
- **Academic Master:** `ops/qbank/build-grade910-single-authoritative-review-blocker-cluster-20261017.py` joins the four existing immutable technical evidence receipts against exactly 2,411 current School 1 hashed revisions, 1305 unique targeted records, and zero false approval indicators.
- **Fail-closed tests:** `ops/tests/test_grade910_master_1305_distinct_blocker_cluster_20261017.py` checks true union cardinality, duplicate overlap, fake school edition, fake signed faculty review, changed source/numeric/Tech hashes and fake Paper Studio selectability.
- **One audit entrypoint:** existing `assps-grade910-live-source-claims.service` timer only. The guarded academic postcheck is read-only and must never enable another overlapping timer, write School 1 DB data, import provisional questions, change student results or relax Core health gates.
- **Paper Studio:** consumes **only** authenticated Approved/Published revision-specific immutable snapshots with mutually verified canonical chapter/topic IDs, never this report as teacher-selectable verified answers.
- **SaaS Core & Production:** sole authority for tenant/RLS isolation, cross-school denial, app/backend deploy, rollback-ready cutover and production certification.

## Verified remaining dependencies

The whole-bank release remains held by (a) ASSPS's actual 2026–27 approved textbook/adopted Tech subject and medium decisions, (b) exact school-session/printed exercise-page provenance for all questions claiming exercise origin, (c) qualified independent academic/Urdu reviewer decisions, (d) authentic Paper Studio approved-only integration acceptance, (e) Core security/RLS and production release certification. These institutional facts cannot be fabricated by zero-human automation. Separate non-HIGH editorial flags do not magically become safe or published when their priority reduces.

The **previously certified machine status is 4/6**. Verified academic publication, authentic qualified faculty approvals, approved school source adoption, and production database changes are **ZERO**. Full source-page evidence claims and the existing original 2,581 research / 2,411 live / 170 held records are preserved. Paper-print/export workflows and school examination results remain the separate Paper Studio/SaaS Core responsibility.

## Primary coordination

- Canonical GitHub issue [#1 — curriculum ↔ Paper Studio source contract](https://github.com/HassiMian/app-assps-edu-pk/issues/1).
- Central [#4 — four-workstream release governance](https://github.com/HassiMian/app-assps-edu-pk/issues/4).
- Official PECTAA curriculum list is a *catalog source*, not school adoption: https://pectaa.edu.pk/curriculum-compliance/.

**Completion criterion:** independently evidence-backed, reviewed, approved revision-level content safely consumed by Paper Studio with SaaS Core certification—not 1,305 merely catalogued blocker records.
