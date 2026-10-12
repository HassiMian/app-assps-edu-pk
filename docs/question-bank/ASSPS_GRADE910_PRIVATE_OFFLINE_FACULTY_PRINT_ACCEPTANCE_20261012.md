# ASSPS Grade IX-X Academic Master — private human-readable faculty-review acceptance

Date: 12 October 2026. Owner: Grade IX–X Academic Master. Status: **academic engineering ready, HUMAN academic approval and production publication HOLD**.

## Canonical continuation and content protection

Original clean Academic source checkpoint: 8ae34bbe7c7840aafe2a1dd0732a0e0dea6bb22c, branch feat/grade910-teacher-blind-review-handoff-20261012. All original 2,581 research candidate question/answer/option revisions from the SHA-frozen 73 original authoring source files remain UNCHANGED. The Paper Studio editor/print formatting and 43 completed historical papers, Core, Connect, student marks, attendance, database and tenant data were NOT modified.

The previous private teacher handoff delivered 2,580 real original research questions in 167 small batches with blinded questions, separate reference answers and unsigned decision templates; one sensitive Chemistry long-answer remains restricted and excluded from blind exports while preserved in its original SHA-locked source. However, previous JSON packet format was developer-focused and cumbersome for teachers who need to view, mark or print assessment reviews. This mission implements an offline, human-friendly, independent qualified faculty review facility.

## Implementation and actual private files

- New offline renderer: ops/qbank/render-grade910-private-faculty-review.cjs
- Full rendered-archive verifier: same module with --verify. Independent source and reference/decision revision SHA verification enforced before rendering, and all 501 generated HTML files individually SHA-verified afterward.
- Optional whole-mission fail-closed private school review evidence verification: ops/qbank/attest-grade910-private-offline-faculty-readiness.cjs. It differentiates *source readiness only* from actual externally configured private archive review and fails if only part of an external archive configuration is supplied.
- Full regression tests: ops/tests/grade910-human-review-offline-html.test.cjs and ops/tests/grade910-private-human-readiness.test.cjs.
- Existing all-in-one non-scheduled Academic Master runner now checks source original SHA, content QA, all faculty priorities, previous private handoff and new offline printable archive source/real evidence before executing the full Grade IX-X Academic/Paper Studio QA suite.

**Actual private faculty print directory (restricted to owner, NOT a public web link):**

/root/secure-archive/grade910-academic-review-packets/assps-full-faculty-stage-20261012/faculty-printable-offline-20261012

Actual outputs: **501 A4 offline HTML files**, consisting of 167 blind question sheets, 167 separate provisional answer-reference sheets and 167 unsigned academic decision worksheets, plus protected START_HERE.html and RENDERED_INDEX.json. **2,580 original questions** with original revision SHA, subject, original grade/medium, marks and school-review evidentiary fields. One Chemistry original remains faculty-held and was not reproduced. No actual reviewer signoff claimed.

Private HTML print index SHA256: 6d79deeb231606b1a971e94ae53b4c9cc638301ab9918185032fe4680f120fc0. Existing private original JSON index SHA256: 48b3dc0ec4beffba05b770934096b1eed6cafddd449e0f1f121d410dd9c2aabd.

## Security and teacher experience

All original question text is escaped for HTML. Embedded restrictive CSP disallows script execution, remote network connections, external images and forms. No external CSS, tracking, backend or database dependency. A4 page sizing, readable English LTR and Urdu RTL with Nastaliq fallback. Every provisional page clearly says NOT verified or approved; original answer and MCQ correct key remain hidden in blind document and are shown only in a separately named reference document. Decision forms have blank subject/Urdu reviewer and school-authority fields, actual textbook/exercise/evidence/board-year placeholders, all eight academic checks, and exact final question+answer revision slots.

Original content is only stored in the school VPS secure archive (0700 private directories and 0600 HTML/JSON files), not GitHub or production. Rendering uses explicit admin opt-in and a fresh name and will not overwrite prior copies. Private evidence can be read only through authorized school administration channels. Offline printed sheets do not themselves authenticate or record signatures.

Actual real source archive and 501/501 HTML file SHA checks PASSED. One private offline browser-render smoke test using installed Chromium exited 0 and produced a 1200×1600 screen render in the private QA folder. This is a smoke test, NOT comprehensive print/PDF parity certification.

## Reviewed official textbook/curriculum applicability as of 12 October 2026

PECTAA official Grade IX-X catalogue: https://pectaa.edu.pk/curriculum-compliance/
PECTAA Books and Publications: https://pectaa.edu.pk/books-and-publications/
PECTAA Downloads: https://pectaa.edu.pk/downloads-2-2/
Revised Grade IX Chemistry ALP notification 7 Nov 2025: https://pectaa.edu.pk/uploads/Revised%20ALP%20Notification%2007.11.2025.pdf

Several Grade IX and X textbook editions/media appear on these portals; the published Grade IX ALP explicitly targets the **Annual Exam 2026**, and does not automatically apply to the Annual Exam 2027. These public listings do not prove ASSPS adopted a particular printed textbook edition or board examination schedule. Exact school-certified book adoption, subject, medium, board exam year, independently checked exercise/page location where asserted, qualified teacher answer correctness, Urdu equivalence, marks and actual institutional signed approval remain REQUIRED.

## Actual release status and ownership

- Original provisional candidates: 2,581; 2,580 private teacher-readable; 1 intentionally restricted.
- Original source/question/answer revision bytes: unchanged, including all 43 historic finished exam papers and school platform source.
- Signed school academic approval: **0**. Verified published Question Bank questions: **0**.
- Future Paper Studio verified picker: HOLD. Only reviewed and revision-signed approved snapshots may ever be imported.
- Production seeding, protected school tenant/RLS, printing release, and deployment: NOT attempted, and remain independently owned by Paper Studio and SaaS Core.

Private packets are ready for **actual qualified teachers to review**, not falsely declared independently verified by a machine or a synthetic test credential. No scheduled or delayed task was created.
