# ASSPS Grade IX-X Academic Master — integrated real faculty-to-school signed evidence chain and session applicability

**Academic Master checkpoint date:** 12 October 2026. **Source recovery:** descendant of clean SHA 1e00b8f261b375adae68d06f9b1e2b4fdaad332b, branch feat/grade910-syllabus-depth-provenance-audit-20261012. **Release decision: HOLD.** This engineering mission preserves all existing 2,581 SHA-frozen original question/answer revisions, 73 source files, old 43 finished exam papers, 2,580 secure editable faculty forms, 501 private HTML print sheets, approved-only publication rules, and Paper Studio, SaaS Core, Connect and school tenant data. No production database writes, releases or scheduled tasks.

## Checkpoint I — Actual PECTAA session 2026–27 vs board year and school adoption

The original Grade IX/X academic source ledger was independently cross-checked against the current PECTAA official e-book list and Downloads page. Both Class IX and Class X have different textbook edition years, and the PECTAA Downloads listing includes publishing/session 2026–27 materials; no such listing is itself an ASSPS-adopted textbook certificate.

Existing **111** source catalogue records with **2,581** exact frozen original question references were reclassified BY their **original issuer-provided edition label**, not by guessing school session:

- **599 research questions** refer to source editions explicitly labelled **2026–27**. This is a publication label, **not** proof ASSPS uses this book.
- **844 Grade IX research questions** refer to source editions labelled **2025–26**. They are **not automatically invalid or outdated**, but applicability to ASSPS session 2026–27/Annual Examination 2027 requires actual school and board verification.
- **70 shared-grade original Urdu writing questions** reference a cross-grade catalogue entry and require independent school class mapping.
- Other edition labels include specific 2026 book-date labels, historical years and ambiguous CURRENT/VERIFY labels. Grade, subject, medium, physical exercise page, actual board year and signed adoption are zero school-certified for this scope.
- PECTAA revised 7 November 2025 Grade IX ALP is explicitly for **Annual Examination 2026**. Do not apply it automatically to **Annual Examination 2027**.

New machine-readable full 111-record school applicability audit: docs/question-bank/ASSPS_GRADE910_2026_27_CATALOG_EDITION_APPLICABILITY_QUEUE_20261012.json and summary .md. All 2,581 original candidate source/edition references, zero real approvals, and no original question or answer text copied.

Official sources independently checked on October 12: https://pectaa.edu.pk/curriculum-compliance/ , https://pectaa.edu.pk/downloads-2-2/ , https://pectaa.edu.pk/books-and-publications/ . No school selection is inferred from these public webpages.

## Checkpoint II — Independent teacher response bound to actual signed school academic review

Previous components already supported the separate private teacher answer/decision intake and the school-pinned Ed25519 reviewer/approver signature verification with SHA-backed original/printed reference evidence. There remained a **distinct missing chain of custody**: a real teacher's unsigned independent answer and eight reviewed criterion digests were not directly cross-validated against the later signed school review packet's exact question, final answer, reviewer and edition/exam-year claims.

New offline module ops/qbank/reconcile-grade910-teacher-response-to-signed-school-packet.cjs:

- Requires that an independently submitted real subject-review record binds to the exact frozen original question revision SHA256, original authoring source file SHA256, original question ID, academic school session, and the exact qualified subject-reviewer actor ID in the later signed school packet.
- Requires the research teacher response's status be a completed recommendation and the timestamp not later than the signed academic review. Verifies **all eight evidence hashes** against their exact corresponding signed criterion, final QUESTION SHA, final ANSWER SHA, source book edition, school book-adoption-evidence hash and board examination year.
- Fails closed on duplicate/replayed original question IDs, duplicate responses, missing responses, different reviewer ID, stale original question/source SHA, missing/broken criterion evidence, altered book/adoption/board year, and any client-supplied approved/published status.
- For real signed external records, it **first** calls the already independently pinned SCHOOL Ed25519 signature verifier and its protected actual backing evidence-object byte check; it validates the exact signed-bundle bytes match the digest that was cryptographically checked, and that independently submitted source-bound private teacher records still match their original SHA256 bytes at the final read. It cannot create private keys, fake real reviewers or approved content.
- When school trust-root credentials or a signed school review bundle are **not supplied**, a real empty private submissions folder results in an explicit **0 authenticated review receipts and publication HOLD**, never source-count-based approval.
- **Even a genuinely valid signed review evidence packet is NOT automatically production published**; Paper Studio owner still needs server-side approved-only tenant-scoped picker/release acceptance and SaaS Core controls production.

New tests use **synthetic-only fixtures** to demonstrate exact normal record matching plus negative cases covering spoofed teacher identities, stale original/final revision, cross-session and board-year drift, evidence substitution, submitted-after-signed chronology, false approval, replay and missing real-school inputs. Synthetic fixtures never represent authentic ASSPS qualified subject teachers.

## Checkpoint III — Paper Studio immutable approved-only teacher-picking contract

The Academic Owner's 2,581-record Paper Studio handoff has been extended with:

- A mandatory **actual independent faculty source-to-final signed packet revision chain** requirement. Each original research row explicitly reports this cryptographically authenticated bridge **FALSE**.
- Source edition/date evidence classification (2025–26 Grade IX, 2026–27 published catalogue labels, other/ambiguous) **per original question's catalog**, not inferred school use.
- Source catalog linked vs archive-recovered identities, original course/chapter/medium research-only risks, and requirement for actual school-adopted textbook, qualified independent subject/Urdu reviewer checks and final question+answer SHA signed school acceptance.
- Publisher picker remains **strictly denied** for all provisional source candidates; no Paper Studio runtime, teacher papers, print/PDF/DOCX, live database or teacher selection integration was modified.

Existing numerical/MCQ auditing is **preserved rather than duplicated**: the earlier 91-authored numerical automated math QA, original 875 MCQ structure and original 785=A key-bias review docket, 50 medium metadata research proposals and 24 English legacy option-position proposals remain separate evidence, not academically approved facts.

## Genuine remaining institutional blockers

Real school coordinator must certify actual ASSPS book/edition/subject/medium and relevant BISE examination year and print exercise/page when a question claims textbook exercise origin. Real qualified independent teachers and Urdu specialist must review correct final content, MCQs, rubrics, numerical units, semantic equivalence and three possible original overlaps (one separately held Chemistry original). Actual subject review, academic approver signature, real trust anchor and supporting private evidence object files must be supplied before the new authenticated bridge could return nonzero receipts. Paper Studio and SaaS Core independently own signed approved-only RLS/picker integration and production release certification.

**All original 2,581 question/answer options untouched. Academically approved: 0. Verified published: 0. Paper Studio verified selectable: 0. Production deployed: NO.** Nothing scheduled.
