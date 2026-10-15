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
