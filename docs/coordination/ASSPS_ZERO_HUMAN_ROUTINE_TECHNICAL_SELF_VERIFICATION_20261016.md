# ASSPS Unattended Technical Self-Verification — 16 October 2026

## Intent and limits

Run unattended, read-only operational evidence checks without asking Principal to keep RICOH MP C307 on, repeat institutional school approval, or supply credentials. NEVER create a teacher signature, a Principal account session, a school-to-school denial receipt, or an academic question approval. This work remains an **operations/technical acceptance tool**, not a qualified independent faculty reviewer.

On every cycle it checks: HTTPS app/API; active V3 Result Cards hash graph (10 premium themes, school subject reconciliation, DRAFT labels, font/logo/A4 shared print preflight); existing Marks View build; 11 Diary typography controllers; First Term academic configuration evidence from the school-scoped dataset; 1,763 original results and 213 genuine numeric zeros as baseline (actual counts may legitimately change with future marks entry). Grading provenance is never fabricated. It reports **64/81 exact-maxima single-valued subject configurations machine-checkable, 17/81 without matching scored subject evidence**. It does not fill missing scores or approve the configuration rows.

The First Term subject configuration columns `total_marks` and `pass_marks` were null in all 81 records when audited. A qualified reviewer signature on an individual question revision is a distinct event. For approved school operations, the existing institution-level school-owner and Ricoh hardware acceptance are carried forward and **not re-requested**.

## Durable automation

Files:
- `ops/release/assps-technical-self-verification-20261016.py`: zero-credential, read-only SQL evidence and live active JS assertions; aggregates only, no personal student identifiers
- `ops/tests/test_assps_technical_self_verification_20261016.py`: unit tests with regression, numeric-zero, tenant, invalid-score, status schema and atomic receipt guards
- `ops/release/assps-technical-self-verification.service` and `.timer`: hourly systemd one-shot with least-needed filesystem write path and no printer dispatch
- `ops/release/install-assps-technical-self-verification-20261016.sh --check|--apply`: exact source linked isolated install after pure unit/read-only checks
- `ops/release/rollback-assps-technical-self-verification-20261016.sh --check|--apply`: disables timer without touching SaaS or marks

The timer has `OnCalendar=hourly`, a small jitter, and runs even when the Principal is away. Receipts at `/var/lib/assps-technical-self-verification/latest.json` are permission-restricted. Unhealthy conditions produce a failing service with an exact machine-readable reason, rather than automatic dangerous production rewriting or arbitrary full-stack cutovers.

## Important boundaries

- No stored real student information is copied to offsite or GitHub. Only aggregate counts and technical hashes are recorded.
- No physical print is re-triggered. RICOH MP C307 hardware acceptance is carried forward; Samsung M2070 remains optional backup.
- No database writes, grade policy edits, artificial zeros, edited teacher notes, or production app/Nginx restarts.
- If critical drift is detected, preserve the current state and fail closed. High-risk releases and independently signed faculty approvals still cannot be completed by a nonhuman agent simply by relabeling fields.
