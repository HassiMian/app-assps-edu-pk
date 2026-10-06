# APEX Paper Studio V6-G15 — Academic & Publication Evidence Precheck

V6-G15 closes the remaining machine-verification gap for real academic/publisher evidence. It validates external evidence only; it never creates, approves, persists, or activates that evidence.

## Read-only endpoint
`POST /api/portal/paper-studio/publisher-review/academic-publication-precheck`

Access:
- signed portal session required;
- `super_admin`, `admin`, or `principal` only;
- caller user id is forbidden as an independent reviewer id.

## Verified evidence domains
1. **Bilingual edition evidence**
   - independent reviewer metadata required;
   - English and Urdu PDF SHA-256 values must exactly match the verified official-source manifest;
   - result must explicitly state Grade 9 Biology equivalence;
   - substantive rationale required.

2. **Chapter 1 conflict decisions**
   - both pinned conflict IDs are mandatory;
   - decisions must bind to the exact immutable G2 conflict artifact SHA-256;
   - only governed decisions are accepted: source-as-prescribed, errata clarification required, or question exclusion confirmed;
   - each decision requires a real independent reviewer and rationale.

3. **Signed curriculum publication evidence**
   - status `PUBLISHED_APPROVED`;
   - trust origin `SERVER_INDEPENDENT_AUDIT`;
   - signature verification `PINNED_ED25519_VERIFIED`;
   - stable publication id, positive revision and record count, and valid records digest;
   - synthetic fixtures are forbidden.

4. **Approved real question evidence**
   - independent reviewer metadata required;
   - stable question evidence id;
   - pinned source snapshot SHA-256;
   - Grade 9 Biology scope and supported medium required.

## Fail-closed behavior
Current production evidence intentionally fails because real independent edition approval, both academic conflict decisions, genuine signed publication, and a real approved question do not yet exist. V6-G15 does not synthesize any of them.

## No mutation
V6-G15 returns validation evidence only:
- `persisted: false`
- `academicApprovalChanged: false`
- `publisherApprovalChanged: false`
- `canonicalWriteChanged: false`

## Verification
- G15 unit gate: 4/4 PASS.
- G15 signed-session HTTP gate: 2/2 PASS.
- Deterministic full regression through G15: 95/95 PASS on a fresh synthetic database and isolated port.
