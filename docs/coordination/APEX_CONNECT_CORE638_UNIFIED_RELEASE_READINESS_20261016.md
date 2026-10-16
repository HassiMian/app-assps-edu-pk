# APEX Connect MASTER — single phase-gated mission / current Core638 joint release verdict

**Date:** 16 October 2026 (Pakistan time). **Decision:** `HOLD_NO_PRODUCTION_CUTOVER`.
**Owner:** APEX Connect MASTER. SaaS Core retains exclusive production deployment, database, signed-RLS, worker and recovery authority.

## Phase 1 — Recovered and reconciled, not restarted (PASS)

- Re-read GitHub coordination issue #4 and historical Connect/four-stream governance; full byte-for-byte old chat export remains inaccessible.
- Latest exact reviewed **Core** source and clean worktree: `integration/core503-privacy-expectedanswer-diary-port-20261016@638025c86a949b9768e5005966724e5d3e834e68`. Its isolated compiled Vite frontend index SHA256 is `db0ef46c9922c049f0b150a1a2b00323c15c67967483cd02ccdafa48d0134237`, byte-pinned in the new verifier.
- Latest exact reviewed **Connect** standalone Next branch (no GitHub remote): `fix/connect-legacy-proxy-guard-20261016@20ebae71ca438ad1590720ac93ff1ed9d59fedd7`, strict descendant of prior email HTML safety commit `e776d8f15350f62708ed55f6b7cd9fbdfc636ec3`. Existing admin-leads reliability, SMTP credentials-safe fallback, payment HTML escaping and legacy proxy bounded/no-store fixes preserved. Next private optimized Build ID `91l6KJsI2x_oOVXPQjUd5`; exact compiled server files exist, reviewed changed source hashes pinned.
- Public deployed Next Build ID observed on VPS: `ONDwxEIZlx5onDIKY7wYf`. It is **not** equal to private candidate; no accidental or claimed Connect cutover. Nginx/Core live remained unchanged by this mission.

## Phase 2 — Technical build and security evidence (PASS, not live role certification)

- Exact previous Connect Node regression on current source independently re-executed **128/128 PASS**, real RC0; protected private log SHA256 `5fb6041ebe03d78ff8b1b742cf4ad2da8c106ff03d9696a90fbbf5c1e194e94c`.
- New central standalone Python contracts on source branch (including 12 new adversarial self-signature/fail-closed tests) **321/321 PASS**, rerun again after the final CI nonroot portability adjustment; the new 12 focused checks all PASS. The new checker includes no direct database SQL and refuses arbitrary export paths.
- New combined CLI `ops/connect/verify_core638_connect_release_20261016.py` verifies exact clean Git SHA/ancestry, Core frontend digest, Connect source bytes/build ID/private compiled server, unchanged live Build ID, root-only SHA-pinned prior 11/11 private HTTP acceptance receipt and live public anonymous login200 / eight protected API401 probes. **10/10 technical facts PASS** on the current actual host.
- Root-only canonical private HTTP receipt SHA256 `68e4a6de75d459ef1cf8192291d81ce124065c6e733ebfc686e27d608fa44fc0` derives from an actual temporary Next listener that has been terminated; not a real teacher/school2 sign-in. Prior private Chromium login PNGs across mobile, tablet and desktop verify render existence, not full role acceptance.

## Phase 3 — Genuine independent signed Core security (HOLD 6/13)

Executed **actual official SaaS Core signed pre-cutover verifier**, `verify-connect-login-only-core-20261014.py`, under the current reviewed candidate with no authorization bypass, no marks write and no password retrieval. Its real process **RC=2**, response status **HOLD**, six true/13 required keys, `signed_runtime_security_certified:false`. The seven remaining independent missing facts are:

1. Isolated owner-reviewed **full ACL** backup certification (new same-host data restore was performed by Core but uses `--no-owner --no-acl` and does not satisfy this signer).
2. Independently signed, current **off-host** complete recovery.
3. Restricted signed production worker transport enabled.
4. Exact deployed production reviewed AI worker adapter parity.
5. Separately authenticated global worker.
6. Effective live worker inherited grants independently verified.
7. Genuine independently signed separate School2 and unassigned-subject denial.

Existing PASS checks: trusted external owner key, exact pinned release identity, original marks integrity, production Nginx, signed catalog, preserved rollback archive. No signed status is manufactured by a source test or JSON receipt.

**Security hardening in new checker:** Even a synthetic/fake root-only receipt claiming all thirteen checks and exit0 is **not** deemed authentically signed. Receipt-only data never sets independently verified authority. All release reports are explicitly `production_mutation_performed:false` and `deployment_executed:false`. A real independent trusted verifier must grant authority outside this source-only handoff.

## Phase 4 — Joint release eligibility (HOLD, actual execution)

Exact CLI:
```bash
python3 ops/connect/verify_core638_connect_release_20261016.py \
  --core /root/workspace/assps-core-privacy-expectedanswer-diary-port-20261016 \
  --connect /root/workspace/apex-connect-legacy-proxy-guard-20261016 \
  --signed-core-receipt /root/assps-release-evidence/connect-unified-gate-20261016/current-core-signed-gate.json \
  --signed-core-exit-receipt /root/assps-release-evidence/connect-unified-gate-20261016/current-core-signed-gate.rc \
  --private-http-receipt /root/assps-release-evidence/connect-mail-html-20261016/proxy-private-http.json \
  --output /root/assps-release-evidence/connect-unified-gate-20261016/core638-connect20eb-unified-release.json
```
**Actually executed:** technical **10/10 PASS**, public anonymous boundary 9/9 expected statuses, Core **6/13 HOLD**, program **RC2**, `HOLD_NO_PRODUCTION_CUTOVER`. Final root-private deterministic report SHA256 `bdc75cc9ef10c5f031c4d9851cf6f43f70b33e28bfae45c2393449193b07f703`, unchanged after the final receipt-only fail-closed guard; final 321-case Python receipt SHA256 `a8edc86ab28bb25b332ca31869cc652b56820ec5f19bf75bda515688bd015f20`. No personal student records were copied into public evidence. Hosted GitHub Actions: **not independently green**.

A genuine authorized teacher Marks POST `success:true` + exact `savedCount` → read-after-save GET, original Class One failed-POST payload recovery, genuine cross-school role witness, physical Urdu A4 Daily Diary Save→Reopen→Print, independent offhost ACL/owner restore and reviewed rollback/postflight remain incomplete. Historical Class One **152 saved First Term marks / six real zero** and total 1,763 marks/213 zero, per SaaS Core's separately recorded read-only evidence, were **not modified** by Connect. Missing unsaved marks must not be fabricated.

## Phase 5 — Production deployment (HOLD, deliberately not executed)

The user authorized routine autonomous engineering, not a signed security bypass. After *independent* SaaS Core certification, the responsible owner may forward-port the exact reviewed Connect patches onto a verified latest deployable descendant, prove real auth/tenant isolation and approved API integration, then perform a rollback-ready production promotion and separate postflight. A private Next build and synthetic tests do **not** grant permission to deploy over live scores, RLS or official papers.

**Absolutely no production code switch, Nginx/PM2 restart, PostgreSQL DML/DDL, canonical student/paper/result record write, SMTP send, genuine account credential access or physical print was done in this APEX Connect cycle.** All scope-isolated source and evidence checkpoints were preserved; no scheduling or promised background activity.
