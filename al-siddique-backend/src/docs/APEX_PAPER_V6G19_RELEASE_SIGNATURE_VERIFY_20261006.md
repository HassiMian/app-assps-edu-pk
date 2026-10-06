# APEX Paper Studio V6-G19 — G17 Release Detached-Signature Verification

V6-G19 verifies a real externally-created Ed25519 detached signature over the exact canonical V6-G17 publisher release envelope. It does not create signatures, authenticate a human signer identity, approve curriculum, approve a publisher, persist evidence, or enable canonical writes.

## Endpoint
`POST /api/portal/paper-studio/publisher-review/release-signature-verify`

Access is restricted to signed `super_admin`, `admin`, and `principal` sessions. The endpoint is verification-only.

Request shape:
- `releaseBundle`: the same G17 bundle containing operational-review, custody and academic/publication evidence plus the custody-reviewed public key;
- `signatureRecord.signatureBase64`: external Ed25519 signature bytes encoded as canonical base64;
- `signatureRecord.envelopeSha256`: exact G17 release-envelope SHA-256;
- `signatureRecord.publicKeyFingerprintSha256`: exact public-key fingerprint bound into G17;
- optional `signedAt` and `signerId` are retained only as untrusted metadata. G19 does not authenticate them.

## Fail-closed rules
- G17 release envelope must validate first;
- private-key material or private-key fields are rejected before G17 processing;
- public key must be Ed25519;
- public-key SPKI SHA-256 must equal the fingerprint already bound into G17;
- signature record must bind the exact current G17 envelope SHA-256;
- detached signature must be canonical base64 and exactly 64 bytes;
- cryptographic verification must pass over the exact canonical G17 envelope bytes.

## Security invariants
- private key accepted: false;
- private key accessed: false;
- signature created: false;
- signer identity authenticated: false;
- persisted: false;
- academic approval changed: false;
- publisher approval changed: false;
- canonical write changed: false;
- self approval allowed: false.

A cryptographically valid signature is only evidence for a later governed publisher-approval review. It is not itself an academic, publisher, or canonical-write approval.
