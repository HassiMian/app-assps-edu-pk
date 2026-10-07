# APEX Paper Studio V6-G14 — Publisher Key Custody Preflight

V6-G14 validates external publisher public-key and key-custody evidence without persisting any key or changing approval flags.

## Read-only endpoint
`POST /api/portal/paper-studio/publisher-review/key-custody-precheck`

Access:
- signed portal session required;
- `super_admin`, `admin`, or `principal` only;
- caller cannot be the independent reviewer.

## Public-key rules
- only an Ed25519 public key is accepted;
- the SPKI public-key fingerprint is derived with SHA-256;
- submitted custody evidence must bind to that exact fingerprint;
- any PEM containing private-key material is rejected before parsing;
- the application server never accepts, reads, stores or generates the publisher private key.

## Required external custody evidence
The independent record must include:
- `INDEPENDENTLY_APPROVED` status;
- stable evidence id;
- real independent reviewer id and review date;
- Grade 9 Biology scope;
- key type `Ed25519`;
- exact public-key fingerprint;
- private-key custody mode `EXTERNAL_OFFLINE` or `EXTERNAL_HSM`;
- `privateKeyStoredOnApplicationServer=false`;
- approved rotation procedure;
- approved revocation procedure;
- SHA-256 of the externally reviewed custody artifact;
- substantive rationale.

## No mutation
V6-G14 does not:
- persist the public key;
- accept private key material;
- alter `.env`;
- create a signature;
- create a reviewer identity;
- set publisher production approval;
- enable canonical writes.

A valid result only advances the evidence to the next governed step: seal the external custody evidence as the G9 `signedPublisherKeyCustody` review artifact and configure the public key only.

## Verification
- G14 unit gate: 4/4 PASS.
- G14 signed-session HTTP gate: 2/2 PASS.
- Deterministic full regression including G14: 90/90 PASS on a fresh synthetic database and isolated port.
