# ASSPS Grade IX-X — Real Source Claim Recovery, 16 October 2026

**Scope:** live School 1, Grade IX/X **read-only** provisional-question metadata versus existing 111-entry official textbook catalog manifest and offline protected PDF bytes. This does **not** establish the school's current academic-session textbook adoption, exercise/paragraph/page accuracy, qualified faculty review, or authority to publish.

## Independently machine-verified source identity

- **2,411/2,411** current provisional question rows have SHA-256 claims matching manifest source PDF identities, by catalog identifier or unique hash matching.
- **56/56 referenced distinct cached PDF byte files** have SHA-256 matching their source manifest record (and a PDF header). **0 corrupted cached source PDFs** in this run.
- **998** legacy numeric `page N` assertions fall within the matching catalog's reported PDF page count. **These are only importer/author page claims**, NOT physical question page verification.
- **95** references are `toc-page` (table-of-contents pages), and **1,318** have other forms of chapter/general/pending source without an exact question page.
- Grade IX: 1,530 candidates, 555 in-range original page assertions, 95 TOC assertions, 880 without exact page.
- Grade X: 881 candidates, 443 in-range original page assertions, 438 without exact page.
- **0** questions were academically approved, altered or published in this audit. `question_bank.source_page_no` is not silently filled from the author metadata. Real teacher reviewer signatures and ASSPS 2026–27 textbook edition adoption remain separate evidence requirements.

## Official curriculum applicability recheck — 16 October 2026

The publicly accessible **PECTAA Curriculum & Compliance** official catalog at
https://pectaa.edu.pk/curriculum-compliance/ currently lists multiple Grade IX editions
(e.g. 2020, 2025–26 and dated 2026 updates) as well as Grade X textbooks explicitly
labelled **2026–27**. This establishes available authority links and competing
edition choices, **not** which particular set ASSPS has adopted. The site's Grade IX
smart syllabus/ALP resources must not be automatically attached to the school's
2026–27 Full Syllabus or to Annual Examination 2027 without an applicable official
notification and school-specific adoption evidence. The present source manifest
was created on 8 October 2026; this run rehashed its preserved **cached bytes**,
not fresh downloads of every official 16 October catalog URL. Content and paper
publication remain separated from this PDF-identity exercise.

## Stable identity reconciliation with all 2,581 original research questions

A separate **read-only** comparison of each current live `metadata.seed_id`
against the protected original `ASSPS_GRADE910_UNIFIED_2581_FACULTY_CONTENT_REVIEW_PRIORITIES_20261011.json` gives:

- **2,411/2,411** live School 1 question IDs exactly map to a SHA-traceable protected research original ID.
- **0** orphan imported question IDs and **0** duplicate live seed IDs.
- **170** protected original research questions are **not live imported**, and remain preserved in the source corpus. This is not proof that the 170 are approved or that production seeding should be forced.
- The weekly source audit now FAILS CLOSED if a future live import introduces an ID missing from the immutable research-origin catalog. It will never seed those 170 or change `is_approved`.

## Prioritize source-page checks without inventing pages

| Grade | Subject | Without exact page | Recoverable unverified page claim |
|---|---|---:|---:|
| 10th | Urdu | 95 | 0 |
| 9th | Urdu | 92 | 0 |
| 10th | Computer Science | 80 | 0 |
| 9th | Chemistry-Tech | 78 | 0 |
| 9th | General Science-Tech | 66 | 0 |
| 9th | Physics-Tech | 64 | 0 |
| 9th | Agriculture Sciences-Tech | 60 | 0 |
| 9th | Computer Science & Entrepreneurship-Tech | 60 | 0 |
| 9th | Biology-Tech | 54 | 0 |
| 9th | Tarjuma-tul-Quran | 54 | 0 |

This is a **triage ordering**, not a recommendation to avoid other subjects or a proof that the listed questions are incorrect.


## 170 original research revisions absent from the provisional LIVE seed — recovered, not fabricated

A separate read-only “live ↔ original research” reconciliation confirms **2,581 original IDs**, **2,411 live IDs**, **0 orphan live IDs**, and **170 original-only research IDs**. All 170 already have a source-revision SHA256 crosswalk and a private existing **unsigned** qualified teacher review template physically present (170/170). No new question text or copyrighted material is copied to GitHub, no provisional bank import, no signed reviews and no “academically verified” publication.

| Protected original source file | Original-only IDs |
|---|---:|
| `biology9Chapter1TopicDrafts.json` | 48 |
| `biology9TopicResearchDrafts.json` | 6 |
| `english9CompetencyOriginals2026.json` | 44 |
| `mathematics10OriginalReasoningBatch2026.json` | 36 |
| `physics10OriginalApplicationBatch2026.json` | 36 |
| **Total** | **170** |

The original grade field is unspecified for some English records, so the report retains `UNSPECIFIED_ORIGINAL` rather than fabricating the original grade claim. The original frozen research revision SHA256 and the live provisional database record SHA256 are **different hashing domains**; raw string mismatch between them is **not** evidence of academic edits. Verified identity is by unique `metadata.seed_id` and original source crosswalk, while original revision SHA is checked against the existing unsigned private teacher intake form crosswalk.

A reusable exact revision/unsigned-review resolver lives in `ops/qbank/reconcile-grade910-held-original-candidates-20261016.py`, with six independent real-source/negative tests (no unknown live IDs, no lost unsigned forms, no false signatures, no count drift). Machine-only private receipt is `/root/secure-archive/assps-grade910-live-source-evidence-20261016/held170.json`. The existing Sunday 03:35 PKT source-integrity systemd service now also executes this reconciliation in `ExecStartPost`, protected by systemd and the revised installer.

## New: cross-corpus near-duplicate risk screen for all 170 original-only questions

The full original-only corpus was compared **read-only** to 2,411 current School-1 live provisional question stems. Scope is same provisional grade and subject using the original English stem where bilingual authored source exists; it does not compare translations, and score thresholds do not establish conceptual identity.

- **170/170 original-only research questions screened** with live subject-level comparison candidates present for all 170.
- **1 high-similarity candidate**: English Grade IX gerund skill, original `IX-ENG-ORIG-20261008-M017` versus live `IX-ENG-2025-U04-G01` (~0.92 lexical similarity). It is a **potential rephrasing**, not confirmed identical approved material.
- **1 additional potentially similar candidate**: Grade X mathematical tangent construction, original `X-MATH-C10-L02` versus live `X-MATH-C10-L01` (~0.73). Review whether differences in construction language are academically material.
- **1 separate meaningful-qualifier contrast**: Grade X mathematics discriminant, original `X-MATH-C02-S03` versus live `X-MATH-C02-S01` (~0.79 lexical overlap), but **zero versus positive discriminant** ask different mathematics. This pair is EXCLUDED from duplicate candidates by qualifier safety logic.
- Numeric-token changes and oppositional scientific qualifiers (`positive/negative/zero`, `increase/decrease`, etc.) are never silently deduplicated. Near-stem similarity is advisory and is not an independent examination answer-key verification.
- No confirmed duplicates, deleted records, approvals, automatic imports, student-score changes, or Paper Studio publishing occurred. Existing 170 unsigned faculty review forms remain unsigned.

Executable read-only script `ops/qbank/assps-grade910-held170-near-duplicate-screen-20261016.py` with **8 deterministic local tests**. Its full **ID-only / similarity-metric private receipt** is `/var/lib/assps-grade910-sourceclaims/held170-near-duplicate.json` (0600). It is added as an additional step after original-to-live source/reviewer-form reconciliation in the existing Sunday 03:35 PKT service, with locally staged source files under a root-only directory. GitHub tracks implementation, checks and aggregate evidence only—not full question text.

## Reproducible and autonomous execution

- Source parser: `ops/qbank/audit-live-grade910-source-claims-20261016.py`, schema `assps-live-source-claim-audit-v1`. Reads PostgreSQL under an explicit `BEGIN TRANSACTION READ ONLY` using the existing peer-authenticated Postgres identity.
- Every original catalog claim is checked against the **actual official manifest hash** and locally available PDF hash; TOC, chapter-only, shared-authority, uncertain page boundary, hash mismatch, grade mismatch and out-of-range claims fail appropriate provenance or remain clearly provisional.
- 15 hermetic tests PASS (including malformed/null hash, page overflow, old TOC, fake approved, PDF byte hash tampering, path traversal and 0600 private evidence permissions).
- Root-only complete ID-level private evidence: `/root/secure-archive/assps-grade910-live-source-evidence-20261016/claims.json`, SHA-256 `159f749e4ef81eb1e5e3283f5b93feec7c55dc8a325e55c05bfe538579034d61`.
- Source-controlled systemd timer is designed for Sunday 03:35 PKT, **after** the separately installed full academic source QA at Sunday 02:30 PKT. Public app/student marks/Nginx and any real printer remain untouched.
- Official publication remains blocked when genuine source page content, edition adoption and revision-specific qualified review are not authenticated. This is not the same as re-requesting general institution-level Principal consent, which has already been acknowledged.

**Source branch:** `audit/grade910-live-source-claim-ledger-20261016`, derived from authoritative Academic Master `c6b74980f4007217d2694a85b4fb266d46ec9e52`. GitHub issues #1 and #4 coordinate Core/Paper consumers; no direct cutover or provisional-question approved flag performed.
