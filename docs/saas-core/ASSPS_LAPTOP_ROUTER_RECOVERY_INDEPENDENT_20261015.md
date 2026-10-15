# ASSPS SaaS Core — genuine laptop connector discovery and off-VPS recovery 4/4

**Date:** 2026-10-15 (PKT/UTC run). **Canonical base:** `dad9778e8cd5ea8564e5b9de640204e2f9eb9100`. **Coordination:** GitHub issue #4. **Production release:** HOLD; no public binary, Nginx, PM2, student, user or tenant ACL changes made during this checkpoint.

## Critical connector distinction

`mcp__Cloud___Desktop_Commander__execute_command(target='windows')` targets the **legacy Windows/CYBERSPACE** channel. When that workstation is in power-saving mode, its tool silently falls back to the Hostinger Linux VPS; PowerShell syntax on the Linux fallback fails and `hostname` returns `srv1769723`. **Never claim fallback was a Windows execution success.** VPS `target='vps'` genuinely responds from `srv1769723`.

Separately discovered the ACTUAL LIVE dedicated new-laptop transport on VPS: `assps-laptop-router.service`, active since 13-Oct, with private FastAPI process bound to `127.0.0.1:8899` and Nginx's scoped HTTPS route `/agent/windows-laptop/`. Its independent SQLite registry is under `/opt/assps-laptop-router/data/laptop-device.db`. Device ID `assps-new-laptop` authenticated heartbeats from **`DESKTOP-MUH720M`** every few seconds; Stage4 constrained agent authenticated independently and returned `ASSPS_AGENT_PONG host=DESKTOP-MUH720M agent=5.2.0-autonomous-production status=ONLINE_AUTONOMOUS`, job exit 0. Its constrained software/hardware diagnostics confirmed Windows 11, i7, Python 3.12, Node, Git and Playwright available. Stage3 device-scoped command queue sent `hostname`, which was **actually completed on the separate Windows laptop** as `DESKTOP-MUH720M` exit0; no VPS fallback allowed. Distinct device token is verified by the service; no device token or admin secret printed or copied. Existing laptop SSH identity (never read/exported) successfully ran `ssh -o BatchMode=yes -o ConnectTimeout=8 -o StrictHostKeyChecking=yes root@VPS hostname` and returned `srv1769723` with exit0. This proves Windows-laptop ↔ actual Hostinger VPS authenticated SSH and scoped reverse-agent/result paths.

## Independent owner-laptop cryptographic custody

Via the authorized scoped laptop channel, installed `cryptography` in a standalone Windows Python virtual environment under `Documents/ASSPS-Current-Encrypted-Recovery` with restricted Windows NTFS owner/SYSTEM/admin ACEs. Generated non-overwriting **laptop-only** X25519 private recipient key; only PEM PUBLIC key was pushed by authenticated SSH to `/root/assps-laptop-recovery-public-20261015.pem`. Exact public-key PEM SHA256 on both systems: `b1c8897dcde69d2554cb6d51dfd34a975814589f804c3590ad75b47ce8c52093`. **Private recipient key was never uploaded to VPS, GitHub or chat.** The older CYBERSPACE owner keypairs remain intact and unrelated.

## True laptop-offsite AES-GCM decrypt+SHA parity — four authentic protected artifacts

Actual new laptop recipient X25519/HKDF-SHA256/AES-256-GCM authenticated envelopes generated on VPS from only the public key, transferred over strict verified SSH TO `DESKTOP-MUH720M`. Windows independently used its own PRIVATE key to AEAD-decrypt each artifact **in RAM only**, checking original byte count, manifest ciphertext SHA256 and plaintext SHA256, without writing decrypted database, Nginx files or worker credentials to laptop disk. Recovered verification record retained only locally, explicitly unsigned and not a human/institutional attestation.

| Protected ciphertext | SHA256 of the transferred ciphertext | Windows authenticated decryption |
| --- | --- | --- |
| Current OND Next.js + Nginx (263192490 encrypted bytes) | `7a4c9aae5c106b48ee92ae124dbdc36461bfcac00aa313af60c9d12554105753` | PASS |
| Full-ACL current PostgreSQL dump | `6375d2c23505d6054e37ee1dea76e36b9811bf2f0197c219047b217830362b4b` | PASS |
| Current PostgreSQL roles without passwords | `70b3ddebe484a325db84403c1452e76b111ecb4e4dcabce8ab633577c6031c78` | PASS |
| Separate restricted AI-worker password recovery envelope | `a7194f9d132d97e6ef754a6aa2ada82639a19753504ec49bb3968df0e98086a9` | PASS |

Actual scoped laptop transfer/verify job `lap-4190f10a26fc4c45add1526a9c42a395` COMPLETED exit0, reporting `ACTUAL_OFFVPS_OWNER_LAPTOP_RECOVERY=3/3 PASS` and `NO_PLAINTEXT_ARTIFACTS_STORED=PASS`; separate worker credential job `lap-aa7a4b51bd4442ada95b3a445a58b4d6` COMPLETED exit0, reporting independent `1/1 PASS` and no plaintext credential persistence. The intact restricted original worker credential file never appeared in stdout or Git. Encrypted files and local verification reports now reside in user-restricted laptop folder; source/recovery tool lives in `ops/release/signed-bluegreen/owner_laptop_current_offsite_verify_20261015.py` and has no embedded private key or credential.

The exact current full DB source SHA256 is `a989b0ef674014109f1f30108a56e9fe4555027712ede8aaed9f82a397f7169a`; exact current full Next+Nginx Blue source SHA256 `844430b88e1b12906ef00945f8a382a69905f5a0a05727e35e0729452466947e`. Prior complete private filesystem restore of OND+Nginx and PostgreSQL PG55491 full ACL clone restore had already independently passed; Windows off-VPS archive decryption now also REAL. **Do not confuse a technically verified archive recovery with a genuine independent reviewer-signed disaster recovery release acceptance.** No reviewer signature was forged.

## Pending production release boundary

Current public Connect Next BUILD_ID `ONDwxEIZlx5onDIKY7wYf`; anonymous `/dashboard` still 307 → `/login?next=/admin`. Source-only role-neutral child Next build `aMD_UNZVOSO2lpyRO0-RO` privately passes role tests, not public. Actual production six unscoped global table Green role denies and 75 signed protected RLS reads remain; separate worker production SQL/SCRAM access and reviewed Node read-only tests PASS, but deployed runtime backend still lacks `aiQueueWorkerDatabase.js` and signed transport. Real Muhammad Imran password challenge/relogin, genuinely authenticated independent peer-school and unassigned-subject HTTP negatives, institutional signatory/reviewer signed receipts, tested live traffic rollback and one Core-certified joint Next+Nginx cutover remain unexecuted. **DO NOT bypass actors, invent signatures, reveal credentials, or overwrite concurrent newer frontend/academic deployments.** Existing real student marks and zeros non-destructible.
