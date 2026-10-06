# APEX Paper Studio V6-G11 — Detached Publisher Signature Verification

V6-G11 verifies a real external publisher signature over the deterministic V6-G10 promotion envelope. The application does not generate or store the publisher private key and does not create signatures.

## Endpoint
`POST /api/portal/paper-studio/publisher-review/signature-verify`

Access is restricted to signed `super_admin`, `admin`, or `principal` sessions. Teacher access is denied.

## Verification chain
1. Build the current V6-G10 promotion envelope; this already requires a valid V6-G9 cryptographic review precheck.
2. Load the configured publisher public key from `PAPER_CURRICULUM_PUBLISHER_PUBLIC_KEY_PATH`.
3. Require Ed25519 and compute the SPKI SHA-256 public-key fingerprint.
4. Compare the key to `PAPER_CURRICULUM_PUBLISHER_PUBLIC_KEY_FINGERPRINT_SHA256`.
5. Require the submitted signature record to bind the same public-key fingerprint and exact G10 envelope SHA-256.
6. Verify the detached Ed25519 signature over the canonical G10 envelope bytes.
7. Return verification evidence only.

## Safety properties
- no private key access;
- no signature creation;
- no review persistence;
- no publisher-approval mutation;
- no canonical-write mutation;
- no self-approval bypass;
- invalid/tampered signature fails closed;
- wrong key fingerprint fails closed;
- signature bound to another envelope fails closed.

Successful signature verification still requires a separate governed publisher-approval decision. It does not set `PAPER_CURRICULUM_PUBLISHER_PRODUCTION_APPROVED` and does not enable canonical writes.

## Current production state
No publisher public-key path/fingerprint is configured and the real review pack still fails earlier G9/G10 prerequisites. Therefore production cannot prematurely reach a successful G11 signature verification.

## Verification
- G11 detached-signature unit gate: 4/4 PASS using an ephemeral test-only Ed25519 keypair.
- G11 signed-session HTTP gate: teacher blocked; current real pack stops before signature verification.
- Deterministic full regression including G11: 74/74 PASS on a fresh isolated test DB/port.
