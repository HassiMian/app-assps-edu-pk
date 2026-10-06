# APEX Paper Studio V6-G12 — Governed Publisher Approval Decision Validation

V6-G12 validates a separate governed human approval decision after V6-G11 has verified the externally signed V6-G10 promotion envelope. It does not itself enable production approval or canonical writes.

## Endpoint
`POST /api/portal/paper-studio/publisher-review/approval-decision-validate`

Access is restricted to signed `super_admin`, `admin`, or `principal` sessions. Teacher access is denied.

## Required approval binding
A valid approval decision must contain:
- `status = GOVERNED_PRODUCTION_APPROVAL`;
- `decision = APPROVE_FOR_PRODUCTION`;
- stable approval id;
- real numeric approver user id, excluding the requesting caller;
- real approval date;
- Grade 9 Biology scope;
- exact V6-G10 envelope SHA-256;
- exact V6-G11 detached-signature SHA-256;
- exact governed publisher public-key fingerprint;
- substantive rationale;
- stable release-ticket id.

The envelope, signature and key fingerprint must match the independently verified V6-G11 result exactly.

## Safety properties
- validation only;
- no approval persistence;
- no automatic environment/feature-flag mutation;
- no canonical-write mutation;
- no signature creation;
- no private-key access;
- self-approver rejected when the caller id is supplied as forbidden.

Even a valid V6-G12 record returns `EXPLICIT_PRODUCTION_APPROVAL_FLAG_CHANGE_REVIEW_REQUIRED`. The actual production approval flag change remains a separate governed action.

## Current production behavior
The real production pack still cannot pass V6-G9/G10/G11 because independent publisher-key evidence and the real external signature are absent. V6-G12 therefore cannot be reached successfully with current real evidence.

## Verification
- G12 unit gate: 4/4 PASS.
- G12 HTTP fail-closed gate: teacher blocked; current pack stops before approval decision validation.
- Deterministic full regression including G12: 79/79 PASS.
