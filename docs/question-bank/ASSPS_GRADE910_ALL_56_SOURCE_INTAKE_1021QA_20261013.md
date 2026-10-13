# ASSPS Grade IX–X — Fully covered 56-source adoption intake and academic release evidence (13 Oct 2026)

## Exact source and code-only change
- Parent verified Academic owner SHA: de8a976091f085ef14ba47393dde855d89754469.
- New isolated Academic-owned branch: fix/grade910-recovered-source-adoption-20261013.
- No original question texts, MCQ options, source answer keys or 73 authoring files modified; no historical 43 papers changed; no Paper Studio / SaaS Core / Connect source or production DB, PM2/Nginx, student records or RLS touched.
- Found and repaired a real bug in the prior school book-adoption claim intake: filename regex allowed only pectaa-catalog-NNN. Four source IDs recovered from the official/archive research lineage use pectaa-recovered-*; they represent **204 of the immutable 2,581 original candidate question references** and were previously rejected before source review.
- The revised filename parser now extracts the entire canonical source ID by removing only the fixed ".school-adoption-claim.json" suffix and validates it against the immutable existing 56-item referenced catalog whitelist. Unknown IDs, traversal-shaped names, source-ID swaps, symlinks, forged approved fields, tampered evidence, mismatched original source SHA/revision set and unsafe file permissions still fail closed.
- Source-intake verification of 56 synthetic "needs-evidence" claims now succeeds **only as UNAUTHENTICATED RESEARCH CLAIMS**, covering all 2,581 original candidates (including four recovered source IDs), with zero real approvals and Paper Studio picker false.

## Owner-friendly actual school decision register
- Separate ASSPS Grade IX-X Adoption & Review Register 2026-27.xlsx generated in current ChatGPT session as a teacher/principal-editable spreadsheet: 56 original catalog metadata rows, 2,581 reference total, adoption/not-adoption/undecided fields, actual printed edition, board exam year, book evidence, qualified reviewer and authority signoff reference.
- It is a decision-gathering convenience, not a cryptographically authenticated school certificate or a database import. Fields are blank; no fabricated grades/answers or school signatures.
- Protected private JSON source templates and student/academic content are never copied into the workbook; it includes only metadata and school decision entry fields.
- Private school adoption claims inbox is currently empty; 56 existing unsigned adoption templates remain protected in owner-only archive; real staff/Urdu decisions and school signatures absent.

## Real post-change QA and evidence
- Targeted 16/16 positive/negative tests PASS, including all 56 original and four recovered catalogs, original 2,581 references, fake source-ID rejection and unknown filename rejection.
- Full integrated current source mission: **30/30 process-exit-certified stages PASS**:
  - 19/19 source/provenance/physical evidence/human authentication and Paper Studio integration gate processes PASS.
  - 111 Paper Studio Grade IX–X staging test files: **510/510 PASS**.
  - 67 Academic tests: **511/511 PASS**.
  - **TOTAL 1,021 / 1,021 PASS, zero fail, zero skip.**
- Actual private audit: /tmp/assps-grade910-recovered-56-intake-20261013/mission-audit.json
- SHA256 9cf3f1fa25cfe2b1690cb5ce7bdbf7fa409ef9a489fd1be33c327108b6e3ad8c. Fully completed exact test logs have recorded exit 0.
- Synthetic private evidence tests do not establish real staff identity, actual book adoption, answer correctness or a live production release certificate.

## External official-source applicability
- Official PECTAA publications and ebooks: https://pectaa.edu.pk/books-and-publications/ and https://pectaa.edu.pk/curriculum-compliance/ (research source inventory only).
- The 7 November 2025 PECTAA revised Grade IX ALP explicitly applied to **Annual Examination 2026**; never assume 2027 automatically.
- A PECTAA published source hash identifies a candidate textbook, not the ASSPS selected school edition or printed physical exercise proof. Four archive-recovered source records require independent authoritative-source URL attribution, not silent certification.

## Truthful remaining human and cross-owner requirements
- Institution adopts only actual books: 56 records are **catalog-source decisions, not proof of 56 adopted textbooks**. ASSPS coordinator/principal needs actual 2026-27 printed edition and board-year evidence, approved book choice and authentic signature. School decision count verified 0.
- Actual independent qualified subject and Urdu faculty review, 875 MCQ keys/24 original legacy option mappings, original answers and marks, original textbook page/exercise evidence and source/medium equivalence: authenticated actual teacher submissions verified 0.
- All **2,581 original questions remain RESEARCH_CANDIDATE**; independent approved revisions 0, published 0, Paper Studio teacher verified picker 0.
- Paper Studio owner alone signs off approved-only tenant-scoped immutable revisions and authenticated teacher Save/Open/Print/Urdu acceptance after REAL human academic approvals exist.
- SaaS Core owner alone certifies active production signed restricted login/RLS, real user JWT and cross-tenant isolation, safe rollback and live production cutover. Prior signed Marks-only scope does not certify the full SaaS backend.
- **RELEASE DECISION: HOLD**. No legitimate way to manufacture qualified independent human judgement or school signatures; engineering QA green is not academic certification. No production deployment or forced import performed.
