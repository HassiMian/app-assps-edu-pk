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

## Actual complete one-command QA certificate — final clean source on October 12, 2026

Implementation was committed as `80dc87c6db773de6615ce7113b286b0fc8eb63aa`. First full mission attempt caught a real operational edge case: the previous secure review workflow provided the **physical evidence-object directory** but supplied **no actual independently signed school-review packet or school trust-root**. The new reconciliation stage incorrectly treated the standalone preconfigured private evidence directory as if a partially configured signing authority existed and failed closed. This was NOT a teacher approval and NOT a regression of original question content. The behavior was corrected so an absent signed school authority yields explicit zero authenticated receipts and HOLD, while a truly partially supplied signer configuration **continues to fail closed**. The exact regression was added and rerun, then separately committed/pushed as `e0161dc3dec63f99e0c0a5fc6b7b30b8dd36c7ac`.

**FINAL full actual one-command mission on code commit `e0161dc3dec63f99e0c0a5fc6b7b30b8dd36c7ac`, local HEAD=remote SHA and clean worktree, exited 0.** The machine audit verifies `qualityGatesPassed:true`, `academicallyApproved:0`, `verifiedPublished:0`, `deployment:false`, with all **27/27 execution stages PASS** and complete process exit 0 for every source/evidence/test gate. New signed-teacher-chain readiness plus actual source/PDF hashes, all 2,580 private teacher original forms, 501 private HTML print review sheets and the empty real institutional signing/evidence store were checked from their external protected school VPS folders. This is an **in-session** non-scheduled QA mission, not autonomous background execution after the reply.

The 16 independent source/academic integrity gates all completed with shell exit 0. Three disjoint Paper Studio IX–X staging batches: 168+175+167 = **510/510 PASS**, 0 fail, 0 skipped. Eight Academic test batches: 80+46+83+58+71+26+43+63 = **470/470 PASS**, 0 fail, 0 skipped. **TOTAL 980/980 automated test cases PASS, 0 failed and 0 skipped, 27/27 gates.** Full per-step logs, TAP and machine `mission-audit.json` are present in the secure school VPS directory `/tmp/assps910-20261012-signed-faculty-chain-fixed-full-qa`.

Original authoring corpus exactly preserved (2,581 originals/73 authoring files). All provisional, unreviewed research candidates **remain not academically verified**. Real teacher signed-review bundles received = 0, real independently authenticated teacher academic approvals = 0, verified published = 0, Paper Studio verified teacher selectable = 0. No school adopted-book certification was fabricated and no production records, prior 43 completed exams, student marks, tenant RLS or SaaS Core/Paper Studio/Connect release-owner worktrees were changed.

**NEXT external acceptance gates:** real school-approved 2026–27 Grade IX/X books, medium/edition and 2027 scheme; qualified independent subject and Urdu teacher verification of actual correct answers/rubrics/MCQs and exercise references; signed school-root trust anchor, distinct coordinator/reviewer/principal roles and SHA-matched supporting evidence bytes to use the bridge in a *real* nonzero accepted receipt; Paper Studio owner signed snapshot integration and isolated SaaS Core tenant/RLS release certification. Engineering verification is complete for this source checkpoint, but authentic institutional academic completion and production deployment remain HOLD.
