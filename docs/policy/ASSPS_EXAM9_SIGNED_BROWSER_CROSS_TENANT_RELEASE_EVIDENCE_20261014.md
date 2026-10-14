# ASSPS — Genuine Teacher, Peer-School HTTP and Rollback Evidence Gate
**Status: Engineering implemented in isolated source; NO user/session certificate or production cutover has been issued.**

## Why this exists
Previous Exam9 preflight had three permanent `False` switches for real staff Save → Reload → Print, genuine peer-school HTTP denial, and production rollback. Replacing these with booleans in a report would enable fabricated signoff. New `verify_release_receipts_20261014.py` can set each gate PASS **only from an actual cryptographically signed event** issued by the authorized SaaS Core attestation service. It checks Ed25519 signatures over canonical JSON event/claims, a Core-root-pinned public key, a 24-hour evidence freshness window, exact school1/Exam9 scope, source/release IDs, explicit staff/school and denial conditions. Missing, malformed, stale, tampered, unsigned or untrusted evidence keeps HOLD.

## Trust and issuance
The real SaaS Core release operator must first establish a trusted Ed25519 attestor service with secure actor-authentication verification and a root-controlled pinned **public** key at `/etc/assps/release-evidence-ed25519.pub`. No private key is stored in the repository or generated here. Core must validate genuine school-owned identities, current auth sessions, school-scoped JWT and reviewer records **before signing**. School-approved exact teacher timetable, per-paper maxima and revision approvals remain separate database gates. A signature merely supplied by an arbitrary tester/self-created key is **not** institutional acceptance.

CLI preflight accepts `--receipt-bundle /path/to/private-proof-bundle.json`; it never accepts an arbitrary public key override. The bundle's schema is `assps-school-release-receipts-v1`, with up to 16 `events` each containing `kind`, `claims`, and base64 `signature`. Sign only `json.dumps({'kind':kind,'claims':claims},sort_keys=True,separators=(',',':'))` UTF-8 bytes; issuer must be SaaS Core trusted attestor, not the test fixture. Never paste staff passwords, tokens, student names, raw scores or private keys into reports, GitHub or proof bundles.

## Separate genuine acceptance receipts
- `teacher_save_reload_print`: actual active school1 teacher, verified subject/class/section assignment, authorized idempotent re-save of an **existing unchanged official score** (never synthetic inserted score), subsequent server readback identical, real browser Print Window opened and no numeric marks changed. Sign exact time, current deploy/source receipt and privacy-safe evidence digest.
- `real_peer_school_denial`: actually authenticated staff from a **different approved test tenant**; real school2 signed context denied School1 results by HTTP 403/404 (not a generic unauthenticated 401), School1 positive access in its own authorized session, and no cross-school rows returned. No real other school staff credentials are reset or impersonated.
- `traffic_rollback`: authorized SaaS Core operator actually switches a reversible canary, records live HTTP, signed RLS, Nginx/PM2 state and data digests, executes controlled traffic rollback, verifies both ingress health and original score parity. A QA SQL rollback alone is not this receipt.

All events must include `school_id=1`, `exam_id=9`, production environment, cryptographically validated session flag, current backend commit and Core release ID, 64-character evidence SHA, timestamp and gate-specific conditions. Signer must bind these assertions to actual logs/actor identity. Negative test receipts are only **synthetic ephemeral unit fixtures** and cannot be used for release. Real actor credential-backed session remains unavailable in the current agent browser; its login page is not an authenticated positive.

## Source and QA
- Release module: `ops/release/exam9-status-20261013/verify_release_receipts_20261014.py`.
- Integrated read-only preflight: `ops/release/exam9-status-20261013/verify_exam9_release_gate_20261014.py`.
- Synthetic cryptographic tamper + missing/trust-negative unit tests live beside the module.
- Production public identity proof, on-prem printer or zero-downtime deployment **not** performed. User authorizes safe engineering; that permission is not a substitute for actual employee sessions or school policy data. SaaS Core exclusively controls a subsequent release.

## Historic 112 grade revisions
The fourth event, `grade_revision_authenticated`, handles the confirmed 112
grade label modifications without conflating those with changed numeric marks.
It requires a real Principal/Admin session and Core attestor signature tied to
both historical 301-row grade digests, the unchanged numeric-score digest,
the precise grade change count, and actual audit-ledger evidence. Old/new
textual `policy_source` alone cannot pass. The earlier archived grade digest
can pass the snapshot gate unchanged; if it changed, no legitimate candidate
may permanently bypass the missing moderator signature by editing an
expected hash.
