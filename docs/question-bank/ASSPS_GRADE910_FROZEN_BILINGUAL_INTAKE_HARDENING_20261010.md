# Grade IX-X Academic review intake — frozen-language integrity checkpoint

Date: 10 October 2026. Owner: Academic Master only. No production or Paper Studio code modified.

## Source and authority
- Continuation parent `0cbe8791d4432f88ba1752c1587e737afa93c37a`, clean pushed independent review contract.
- Existing 73 SHA-frozen original authored source files / 2,581 unchanged question revisions; original freeze must validate before inspection. No candidate can become academically approved from a data import or a reviewer string.
- Current official PECTAA publications/catalog: https://pectaa.edu.pk/curriculum-compliance/ and https://pectaa.edu.pk/books-and-publications/ . These show published textbooks, including some explicitly marked 2026-27. Official publication is not evidence of the school's adopted edition. The 2025-11-07 revised Grade IX ALP notified Annual Examination 2026 only: https://pectaa.edu.pk/uploads/Revised%20ALP%20Notification%2007.11.2025.pdf . Do NOT project that notification onto 2027 without subsequent competent-authority confirmation.

## Newly hardened academic-only contract
- Review intake reads the original question source *from the same source files validated by the immutable 2,581 original question/bytes hash freeze*, then derives bilingual language-review requirements from original `medium=dual` and/or substantial English+Urdu stem presence.
- A reviewer packet with `medium=english` cannot silently downgrade a SHA-frozen bilingual original. A genuine bilingual source requires a separate Urdu review identity and evidence reference. This remains an **untrusted shape check**, never a live authenticated faculty signature or bilingual accuracy decision.
- Invalid/null review-check structures now fail with the stable `ACADEMIC_REVIEW_INTAKE_REQUIRED_SIGNED_REVISION_SPECIFIC_CHECKS_INCOMPLETE` denial instead of a generic runtime property-access exception.
- All result rows continue to set reviewerIdentityCryptographicallyAuthenticated=false, schoolAcademicApprovalAuthenticated=false, publisherSelectable=false. Run-level `authenticatedAcademicApprovals=0`, `verifiedPublished=0`; verified Question Bank picker is EMPTY/HOLD.

## External evidence still genuinely necessary
1. ASSPS academic-session and board-affiliation proof with adopted title, actual edition/version, both mediums where applicable and real printed chapter/exercise pages.
2. Independent authenticated subject teacher review against exact final question and answer revisions, separate qualified Urdu parity signoff, independent verified answers/MCQ option/distractor review, and school approval signature.
3. Authoritative school actor/role and tenant authorization with immutably versioned academic approval snapshot and server-side publication auditing owned by the integration/release authority.

Frozen original SHA proves *which* research question was inspected. It never proves printed-book adoption, authorizations, answer correctness or academic approval. Older 43 completed papers are historical reference content, not new academic publication prerequisites. Production deployment remains SaaS Core-owned.

## Executed source verification and QA

All changes in three Academic-owned paths only: this report, the intake validator and its adversarial tests.

| Execution | Observed result |
| --- | --- |
| Dedicated revision-bound intake checks | 10/10 PASS, exit 0 |
| Paper Studio curriculum adapter + approved-only publication boundary | 18/18 PASS, exit 0 |
| Academic disjoint group 1 | 55/55 PASS, exit 0 |
| Academic disjoint group 2 | 46/46 PASS, exit 0 |
| Academic disjoint group 3 | 55/55 PASS, exit 0 |
| Academic group 4a | 38/38 PASS, exit 0 |
| Academic disjoint group 6 | 42/42 PASS, exit 0 |
| Academic disjoint group 7 | 27/27 PASS, exit 0 |
| Full unbatched suite, group 4/4b and group 5 | TIMED OUT / INCOMPLETE; do not count as passing |

The six completed disjoint academic groups represent **263 passing tests**. Two incomplete disjoint sets are not certified. Some dedicated/publisher tests overlap the disjoint group coverage, so do not add their totals to the 263 as independent tests. Tool command timeouts are not evidence of academic defects or of successful tests; isolate expensive suites in a capable CI/runner before final green claim.

No physical school adoption, qualified faculty signatures, actual 2027 ALP adoption, verified printable exercise refs, authorized production data or deployment observed. Approval and paper selection HOLD.
