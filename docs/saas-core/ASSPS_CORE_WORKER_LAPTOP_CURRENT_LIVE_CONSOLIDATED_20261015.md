# ASSPS Core P0 — scoped worker, current-live backend, laptop recovery

**Date:** 15 October 2026. **Coordination:** issue #4. **Release: HOLD.** No production application, PM2, Nginx, PostgreSQL, staff, marks or results mutations by this integration.

## Immutable source integration

- Clean source base: `085d49c93abad6ce2854a57cf9b551b657d46f82` (Core laptop 4/4 technical offsite recovery branch). Descends from `dad9778e8cd5ea8564e5b9de640204e2f9eb9100`.
- Other active owner worker commits `e1cc89aa5c0676afe64bfd6df1376d26f18658c4` and `671c19b862698f66d857a7d9efc90a161318a7d3` safely cherry-picked onto the new clean Core integration branch. Blue legacy database import stays lazy so signed Green worker can initialize without broad database credentials or bypass of JWT/HMAC guard.
- Independently useful staging script and fail-closed guard tests forward-ported from `f278e74e73d3f360f817b7e4b71a421b7299495b`; no source code of the other agent overwritten. In particular, the additional script creates a root-only fresh stage from the **actual running backend** and rejects live drift and destination overwrite while excluding .env/private keys.
- Integrated adapter SHA256: `9b76d09747a03dbfb85083acaf0d7facf129b31b3ae53fcaeb8b78acbc17a21f`. Candidate path: `/root/assps-release-candidates/apex-backend-core-laptop-consolidated-20261015`.
- Protected **live current** Paper Studio source `2e14c2ded97d303edc08c83dd79f0396b8f8f3d4`; its separately deployed backend `src/routes/lessonPlanRoutes.js` SHA256 `435cf755904dcd7fdf74189d5a99d267b8ace98a6627c9180a2375e9dfaaf74f` matches staged candidate byte-for-byte. Backend release-meta.json still claims historical 8-Oct commit `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9` even though live route has a newer modification: **exact whole-running-backend source ancestry is NOT certified.**

## Evidence

- Consolidated targeted Python security/release checks: **94/94 PASS**.
- Reviewed Node Green isolated import and Blue fallback: **2/2 PASS** with correctly installed Node dependency.
- Isolated actual production SCRAM authenticated restricted worker queue read and separate organizations denial: **PASS**. Existing reviewed `verify-current-live-merged-worker-20261015.py` produced staging_reconciled=true and read-only technical gate PASS. Running public backend does **not** contain reviewed adapter: production_worker_integration=HOLD.
- Root-private current pre-worker live backend **source** archive `/root/assps-release-backups/current-live-backend-pre-worker-20261015/current-live-backend-source.tar.zst` SHA256 verification and independent extraction of current lesson route PASS. This is source recovery, not independent live rollback signoff.
- Current 4/4 encrypted OND Next+Nginx, full-ACL DB, roles and worker recovery packages were transferred to independently authenticated Windows laptop `DESKTOP-MUH720M` and decrypted/integrity-verified as detailed in Core branch `085d49c9` runbook. This is real technical offsite proof, **not** fabricated independent human reviewer signature.
- Public Connect Next still `ONDwxEIZlx5onDIKY7wYf`: anonymous dashboard redirects to `/login?next=/admin`; private reviewed role-neutral candidate `aMD_UNZVOSO2lpyRO0-RO` is not public. Real teacher and independent peer acceptance remain missing.
- Prior last verified production Exam9 marks: 1762 real values, 213 numeric zeros, original immutable 301-row digest. Source-only work above did not perform SQL writes or reset school records.

## Mandatory remaining HOLD gates

1. Existing Muhammad Imran genuine temporary-password first login, staff-self-change, relogin and assigned teacher dashboard under authorized institutional actor; independently authenticated existing peer-school and unassigned-subject HTTP denial. No fake actor or password retrieval.
2. Institutional and independent signed reviewer receipts properly SHA-bound to current source, verified scoped runtime and actual rollback. Laptop 4/4 technical recovery alone is insufficient.
3. Reverify current Blue/current live Paper Studio owner source, real signed Green backend and Next/Nginx; then, only after (1) and (2), execute ONE rollback-ready public Core-controlled login-only promotion and verify real postflight and actual rollback. Never auto-publish protected academic marks or override another agent's current release.

**Outcome: isolated reviewed implementation and reproducible candidate delivered, full live production release explicitly NOT certified.**
