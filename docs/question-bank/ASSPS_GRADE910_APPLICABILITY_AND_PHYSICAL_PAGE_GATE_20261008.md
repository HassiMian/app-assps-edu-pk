# Grade IX–X Academic Master — Academic applicability and independent physical-page gate (2026-10-08)

**Status:** isolated source/reviewer protection update; **zero human textbook adoption certificates and zero verified physical exercise pages**. This document does not authorize any Question Bank publication or SaaS production deployment.

## Newly resolved implementation gaps

1. The existing Grade 9–10 candidate review normalization previously checked a PDF source-identity hash, edition-looking string, chapter label and seven reviewer-supplied Boolean attestations, but did **not** enforce a separately trusted ASSPS textbook-adoption certificate or actual page-image proof. It is now **fail-closed**. The revised schema `assps-grade910-independent-review-v2` requires BOTH server-owned evidence registries, and pre-existing `v1` submissions cannot be silently treated as certified.
2. `asspsGrade910SchoolAdoptions.json` is the **school-owned applicability registry** with school 1 (`assps`), observed general teaching-session 2026–27, and explicitly **zero certified book/grade/subject/medium/exam-year adoptions**. Its authoritative adoption check requires the exact school, source SHA-256, book edition, medium, grade, subject, session, exam year, adoption document SHA, independent verifier and distinct school approver. Even fully checked client flags cannot bypass missing server-owned adoption evidence. School timetable alone supports only the broad session, not textbook adoption.
3. `asspsGrade910PhysicalPageEvidence.json` is the independently certified **physical-page and exercise registry**, currently empty. For both original/conceptual and exercise-derived questions, v2 requires exact independently reviewed chapter physical page, printed page, page-image SHA and chapter/source identity. Textbook-exercise claims additionally require a distinct exact exercise-index/page anchor. OCR-derived chapter offsets or hashes alone cannot certify pages. All existing research items remain provisional, and there are no claimed human signoffs.
4. Source identity coverage: the previous backend candidate registry had **22/111** identities from the current official-source manifest. An isolated deterministic reconciler now retains all previous 22 identities, matches the entire manifest against its original 111-row source hash ledger, confirms **110 existing cache-relative file references**, and adds **88 more source identities**. `pectaa-catalog-037` stays explicitly quarantined with missing source SHA/PDF. All 110 entries are **identity-only**, `academicApproval:false`, `editionAdoptionCertification:false`, `questionPageExerciseVerification:false`. The builder **did not recompute all 5.4 GB of cached PDF hashes**; it checks against previously established ledger hashes and actual filesystem presence and marks this limitation directly. No textbook/page/question is approved by this extension.

## Official curriculum context — not school adoption

- PECTAA official books and publications: https://pectaa.edu.pk/books-and-publications/
- PECTAA curriculum compliance and Grade IX source listing: https://pectaa.edu.pk/curriculum-compliance/
- PECTAA 2026–27 official procurement document (book-title planning evidence only): https://pectaa.edu.pk/img/Final-SBD%20PJTS%202026-27.pdf
- PECTAA *Computer Science & Entrepreneurship Grade IX* revised ALP (explicitly **Session 2025–26**, not a 2027 examination-year approval): https://pectaa.edu.pk/uploads/Revised%20ALP%20Notification%2007.11.2025.pdf

The official listing contains different historical and 2026–27 editions; their presence in the catalogue does **not** establish that ASSPS adopted any one of them. The missing catalog-037 legacy Computer-Tech Urdu PDF must not be swapped for the new Computer Science & Entrepreneurship Tech UM edition.

## Gate behavior and validation

- `normalizeEvidence` and the stored independent-review revalidation both receive **trusted tenant ID** from the enclosing tenant transaction, rather than trusting arbitrary client-submitted `schoolId`.
- Rejection cases explicitly include missing school adoption, mismatched grade/medium/subject/source hash/edition/board exam year, missing distinct human approvers, absent physical-page image review, wrong chapter, wrong exercise page/number, untrusted tenant and legacy v1 evidence.
- Synthetic positive-control fixtures exist **only inside unit tests** to show a future properly verified registry can pass all checks; **none is written to the real ASSPS registry**, and none constitutes a real signoff.
- Source identity ledger upgrade is not academic verification. The 2,581 original authored questions and Biology IX revision-2 remain intact; no question content or correct answer is rewritten in this checkpoint.

## Critical remaining owner actions

- ASSPS academic authority independently confirms actual adopted Grade IX and Grade X textbook titles, editions, mediums and exam-year/board scope, with traceable school evidence.
- Human source specialist records exact PDF bytes/printed page/physical page and exercise image proof, including independent reviewer and page-image digest, without reproducing copyrighted chapters.
- Independent subject academic reviewers assess each exact question revision, answer/MCQ distractors, marks, conceptual scope and English/Urdu meaning; separate approver signs same revision. **Approved and Published remain 0.**
- Paper Studio owner receives only a genuinely approved immutable snapshot through issue #1. SaaS Core alone handles tenant/RLS, runtime credentials, final integration, production deployment and rollback certification under issue #4. Deployment remains HOLD.

## Verification commands

`node ops/qbank/reconcile-grade910-source-identity-registry.cjs --identity-only` (read-only repeat)
`node --test al-siddique-backend/src/tests/grade910-school-adoption-page-gate.test.js`
`node --test al-siddique-backend/src/tests/grade910-academic-review-gate.test.js`
`node --test ops/tests/grade910-source-identity-registry.test.cjs`

This is a **candidate guardrail implementation** in an isolated development branch. Do not deploy or merge shared SaaS backend paths without SaaS Core review and its signed tenant-authorization certification.
