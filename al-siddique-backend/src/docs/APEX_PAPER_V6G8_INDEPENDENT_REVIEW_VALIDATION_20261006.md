# APEX Paper Studio V6-G8 — Independent Review Validation

V6-G8 turns the prepared reviewer evidence into a mechanically verifiable, read-only intake workflow. It does not persist reviews and does not grant publication or canonical-write approval.

## Admin/Principal API
`POST /api/portal/paper-studio/publisher-review/validate`

Security:
- signed portal session required;
- roles limited to `super_admin`, `admin`, `principal`;
- teacher access is denied;
- caller user id is rejected as an independent reviewer id;
- response is `Cache-Control: private, no-store` through the protected Paper Studio surface;
- no review record is persisted;
- no publisher approval flag is changed;
- no canonical write flag is changed.

The response policy explicitly returns:
- `validationOnly: true`
- `persisted: false`
- `approvalChanged: false`
- `canonicalWriteChanged: false`

## Offline CLI
`node scripts/validate-independent-review-v6g8.js <review-bundle.json> [forbidden-reviewer-id ...]`

Exit codes:
- `0`: bundle structurally valid;
- `3`: bundle read successfully but fails independent-review validation;
- `2`: file/usage error.

## Reviewer package
Sealed evidence is stored under:
`/root/secure-archive/apex-paper-v6g3-review-pack-20261006/`

The pack includes one immutable review-artifact manifest per technical review plus:
`independent-review-submission-template-v6g8.json`.

The independent subject/live-source technical dossier is complete, but its manifest deliberately remains `TECHNICAL_DOSSIER_COMPLETE_EXTERNAL_GRANT_PENDING`; this is not approval.

## Verification
- G8 signed-session HTTP flow: 4/4 PASS.
- G8 offline CLI: 3/3 PASS.
- G4-G7 regression with G8 development: 22/22 PASS.
- Live production signed-session G8 flow: 4/4 PASS.

No human/reviewer identity, academic decision, publisher signature, or approval result is fabricated by this workflow.
