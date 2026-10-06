# APEX Paper Studio V6-G17 — Publisher Release Envelope

V6-G17 closes the cross-chain binding gap between operational review approval, publisher key custody, and academic/publication evidence.

## Purpose
G10 binds the sealed operational-review evidence. G14 independently validates the external Ed25519 public key and custody record. G16 validates edition review, academic conflict decisions, exact-page approved-question provenance, and signed publication records. Before V6-G17 those three results were not represented in one deterministic release hash.

V6-G17 builds one canonical release envelope containing:
- G10 promotion-envelope SHA-256;
- publisher evidence SHA-256 and source commit;
- G14 Ed25519 public-key fingerprint and independent custody evidence coordinates;
- G16 edition evidence;
- pinned Chapter 1 conflict artifact SHA and conflict ids;
- exact-page approved-question binding;
- signed-publication records digest and record count.

The canonical JSON is hashed with SHA-256 to produce `envelopeSha256`.

## Security invariants
- no private key is accepted or accessed;
- no signature is created;
- no envelope is persisted;
- no publisher approval flag is changed;
- no canonical-write flag is changed;
- no self approval is allowed.

A valid result only advances to a real external signature over the V6-G17 release envelope, followed by governed approval.

## Endpoint
`POST /api/portal/paper-studio/publisher-review/release-envelope`

The endpoint is Admin/Principal/Super Admin only and is validation-only.

## Verification
- G17 deterministic unit gate: 3/3 PASS.
- route module syntax: PASS.
- production deployment is intentionally withheld until candidate/runtime verification can be executed through the hardened deployment path.
