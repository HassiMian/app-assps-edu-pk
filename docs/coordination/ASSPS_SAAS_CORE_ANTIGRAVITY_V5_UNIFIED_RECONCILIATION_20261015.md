# ASSPS SaaS Core — independent Antigravity draft/print + Diary V5 reconciliation (15 Oct 2026)

## Provenance and conflict avoidance

Antigravity's legitimate remote `516880678832188104661a64e8a9be3bcbdfb849` is a direct child of `b18a8aae1a5d60c0ed8086ac56d313b67f750f21`, **not** a descendant of complete canonical Diary V5 `08951be996312c6577c8641f19a6b71b9a4fdc3a` or Core active-bundle guard `396c43cbbca5a07d366f729e8a77a7ca957a1451`. GitHub compare reports diverged. It must not be treated as sole canonical head for an integrated deployment.

An isolated Core worktree `/root/workspace/assps-core-paper-draft-diary-v5-unified-20261015` was created from verified clean Core commit `396c43cbbca5a07d366f729e8a77a7ca957a1451`. Its seven-file Antigravity patch was cherry-picked without conflict as `a82f33e684b48e96ff44f9938294e0d47fed2d7d`. Independent worktrees and production data were left untouched. No force-push or production cutover.

## Test and build evidence independently reproduced

- Institutional draft backend contract `node al-siddique-backend/src/tests/grade910-institutional-draft-validation-contract.test.js`: **7/7 PASS**.
- Print marks ledger `node al-siddique-frontend/src/Modules/Paper-Generator/tests/printMarksLedgerParity.test.mjs`: **3/3 PASS**.
- Grade 9/10 Paper Workspace verified bridge `.test.mjs`: **26/26 PASS**.
- Active Diary bundle regression suite `node --test ops/tests/paper-diary-active-controller-immutable-release-gate-20261015.test.cjs`: **9/9 PASS**.
- Optimized `vite build` of the integrated frontend: **PASS**. Newly built active route chain verified **11/11 Diary controller signals PASS**.
- Integrated frontend index SHA256: `9d0d07585831504c82a4d37c39354ff5ccc9c006447ac5d15335abe4b7f40255`.
- Candidate Diary JS SHA256: `d03b0de5a71355771300e5cb4284f9d28c6357cceda730a0a8b0648c720b81c7`; CSS SHA256 `7c6b5a3725b698602e298622b7a9d72d4e6a7e4bafddf3827b99b9de895519ec`.
- These are isolated SOURCE / BUILD / SYNTHETIC test results; they are not physical print or authenticated live end-to-end security certification.

## Actual live state independently observed

- Public `app.assps.edu.pk/` and `api.assps.edu.pk/health`: **HTTP 200**. `nginx -t` PASS.
- Active production Nginx Grade frontend root `/var/www/assps-grade910-draft-save-print-b18a8aae`, index SHA256 `ed6d77130aae12c1a72087d3a4854b9ffc7f42488e81b8c6f67066e7ac35e2c0`, **different** from integrated candidate.
- Actual active frontend Diary import graph **FAIL (exit 2)**: nine required signals absent: SUBJECT_BOLD, ROW_HEIGHT, DIARY_FONT_SIZE, FOOTER_FONT_SIZE, LOGO_SIZE, SUBJECT_FONT_SETTING, ROW_HEIGHT_SETTING, LOGO_SIZE_SETTING, FOOTER_SIZE_SETTING. Orphan legacy assets cannot count as active UI.
- Running backend `grade910PaperWorkspaceReleaseGuard.js` SHA256 `5dbe12839a75912a8b80e49494688c15502f337f983c0f4664e64e19b11b6e56` and `assessmentStudioRoutes.js` SHA256 `2918093afdab2c86fc5de8568538bb2ce85bd9b81aa5f227ba8d4b7575960b61` are byte-for-byte equal to Antigravity's fixed source. This independently corroborates a specific live backend patch; it does **not** certify the whole combined frontend or its release process.
- Reviewed worker adapter `src/services/ai/aiQueueWorkerDatabase.js` and lesson publication guard **absent** from currently running backend.
- Core Ed25519 pinned public key exists but `/etc/assps/connect-login-precutover-core-receipts.json` **missing**. Latest available official read-only Core gate evidence remains `status:HOLD` with six unverified independent recovery/worker/worker grants/School-2 denial checks. No real signed certification is present.
- Authentic teacher first-login/password change and independently inspected physical Urdu printed output are **not** established by source tests or account flags.

## Accurate production authorization decision

**UNIFIED SOURCE READY FOR RELEASE CANDIDATE REVIEW; PRODUCTION NO-GO** under current Core release policy. The owner's Antigravity report that it tested a `POST 201`/`GET 200` may support the narrow draft-save incident, but the claim "ALL ACCEPTANCE GATES PASS" is too broad and contradicted by actual active Diary missing controls and failed signed security gates. A successful QA `POST 201` necessarily creates/updates QA draft persistence; "zero rows modified" cannot be interpreted as zero DB writes of any kind. Protected Exam9 school rows may remain unchanged without proving no QA write occurred.

Future Core-only cutover: intake real independently verifiable SHA-bound recovery and tenant-denial/worker attestations; validate authenticated worker transport and grants; verify physical Urdu hardcopy; run full source+RLS/browser+print regression on candidate; create exact immutable backups and rollback instructions; perform single controlled frontend/backend promotion with postflight active-bundle guard and authentic actor acceptance. No incomplete feature or academic draft gains publication authority from these engineering tests.

## Continued integrated security recovery (15 Oct 2026 ~13:19 UTC onward)

1. **Current encrypted offhost recovery independently re-run on CYBERSPACE**, not merely asserted: 3/3 encrypted assets independently decrypted in memory with recipient key, authenticated ciphertext integrity and plaintext SHA-256 verified; current Next rollback archive 263,192,033 bytes, PostgreSQL backup 2,701,049 bytes, role metadata archive 3,632 bytes. `verify_current_exact_recovery.py` exited zero, offhost verification report updated at 2026-10-15T13:19:12Z. `institutional_attestation_signed=false`: an honest technical recovery PASS is **not** a genuine Ed25519 Core-signed receipt. No private keys or plaintext copied into repository.
2. Reconciled additional owner-reviewed active Diary CI + fail-closed pre/post deploy guard `a6c08b4` as Core cherry-pick `f3984f0257dded9acecd0b9ffce515bc1a203e41`; tests and dry-run verified no production changes. Hardened CI (commit `fe03fa414a20c24ffeb792654dfad2eb0dd70000`) to require draft release boundary 7/7, print marks 3/3, verified Paper Workspace bridge 26/26, besides V5 Diary controller 9/9. New stable candidate active import graph **11/11** controller signals.
3. **Reviewed restricted worker adapter staged SOURCE-ONLY**, not installed in running server: byte-exact `aiQueueWorkerDatabase.js` SHA256 `97090fee75c77283375141e21d572d52a1a9fe58952ff16a4584ca9f308592cc` from reviewed clean Core worker source (`2782179f`). Minimum changes route queue reads to distinct AI worker connector for signed Green, preserving lazy Blue fallback. Reproducible backend dependencies `npm ci` PASS, isolated negative config **5/5**, import boundary **2/2**, including evidence that Green import does not load privileged Blue DB and Blue only loads legacy query at call time. Mandatory CI now includes those worker checks and route/worker change triggers. This does **not** certify real production worker login, DB privileges, peer-school denial or Ed25519 signed transport.
4. Verified CYBERSPACE Ricoh MP C307 `Normal` via `USB001`, queue empty; Jameel Noori Nastaleeq Kasheeda is registered at **user-level Windows Fonts** (not HKLM system-wide). This is readiness metadata, **not** physical A4 Urdu printed hardcopy acceptance. Candidate references local font names and no webfont binaries were found in deployed frontend, so actual browser+printer visual parity must still be confirmed.
5. New read-only actual Exam9 query: **1,762** saved score rows, **213** real zeros, **0** duplicate student/subject pairs, **0** invalid bounds. Current live index SHA256 still `ed6d77130aae12c1a72087d3a4854b9ffc7f42488e81b8c6f67066e7ac35e2c0` with nine missing Diary control signals (active guard exit2). Optimized merged frontend build index SHA256 still `9d0d07585831504c82a4d37c39354ff5ccc9c006447ac5d15335abe4b7f40255`, active 11/11 PASS. Relevant Antigravity live backend bytes match reviewed draft route/guard, but no joint candidate frontend cutover.
6. **Final security position remains fail-closed HOLD:** real signed Core receipt intake absent; reviewed worker module/lesson publication guard absent from actual running backend; production worker signed transport/verified effective role grants and signed School-2/subject denial not established. No fabricated signatures, altered database results, live Nginx mutation, PM2 restart, or live traffic switch occurred. Do not confuse candidate integration with certified deployment.
