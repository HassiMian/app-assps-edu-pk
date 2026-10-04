# Apex Connect identity reconciliation release — 2026-10-04

## Deployed school roster checkpoint (ASSPS school 1)

- Active student records: 318
- Missing linked student portal users: 0
- Missing teacher portal users: 0
- Missing parent portal links: 5, intentionally withheld for guardian verification
- Pending private activation handoffs: 58. Each pending user has an unpredictable hashed initial password, not distributed or stored in plaintext.
- Five parent exceptions: one missing guardian contact and four ambiguous mappings where a phone appears on student records with conflicting guardian names. **Do not auto-merge them by phone.**

## Private handoff procedure

Open `https://api.assps.edu.pk/admin/users` as an authorized school admin. The *Verified credential handoff* section lists pending student, parent and teacher users. Independently verify the correct individual/guardian; tick the verification checkbox; issue exactly one temporary credential; hand it to that individual privately; only then confirm delivery. An interrupted response can be explicitly reissued with a documented reason while the user remains in pre-change-password state. Delivered handoffs are locked against silent reissue.

The five unresolved parent links appear in *Portal login reconciliation*. For the missing contact, verify the number from admission records or the guardian directly and save it. For ambiguous guardian names, correct any proven typo in the authoritative student record, or after independently verifying a truly separate guardian, use *Create verified separate guardian*. This creates an isolated parent account with its own later handoff rather than sharing a phone-derived account. No identity data or phone number should be invented.

## Release implementation and validation

- Handoff migration: `migrations/20261004_portal_identity_handoffs.sql`
- Reconciliation: `ops/prepare-portal-identity-handoffs.js` (dry-run default; `--apply` only after approved snapshot)
- Independent remaining student-login recovery: `ops/prepare-unlinked-student-logins.js`
- Admin APIs: `/api/auth/users/{reconciliation,missing-portal-links,pending-activation}` plus guarded issue/confirm/guardian-resolution actions.
- No bulk plaintext password export. Cache-control `private, no-store` on issuance; browser origin checks in Next proxy; actual portal role verified server-side.
- Eight synthetic/backend regression suites passed, including cross-tenant isolation, role separation, guardian collision, issuance, forged-cookie and attendance checks. Synthetic test records were cleaned up.
- Before-write production DB snapshots are restricted to root under `/root/secure-archive/apex-identity-live-20261004/` (never commit or share the dumps).

**Handoff status is not the same as first-login adoption.** Pending activation cannot be marked delivered without authentic human verification and private delivery. Real contact/SMS/WhatsApp configuration was not fabricated.
