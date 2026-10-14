# APEX Connect — independent login-only production certification (14 October 2026)

**Coordination:** [ASSPS issue #4](https://github.com/HassiMian/app-assps-edu-pk/issues/4).
**Authority:** SaaS Core exclusively owns release promotion and rollback; Paper Studio/Connect provides reviewed source and independent evidence. This does not replace Core's signed tenant-security checks or approve First Term marks publication.

## Verified source line, current release drift

Standalone Connect Next.js source `fix/connect-browser-auth-challenge-bounce-20261014`, commit `a67e29ca8c3956e4fbc250f82c7e572294a2a84a`, includes functional browser 401 bounce correction `5bd6124` and previous integrated login/report-card privacy `1db504e`. Reviewed auth proxy SHA256 `2d4d9be579952c780d09f8ed66f9981a6c6fef40af4042fb842ca9aa38414193`; compiled QA build ID `ONDwxEIZlx5onDIKY7wYf`. Restored production-schema synthetic QA Chromium flow (including signed-school isolation and teacher denied admin inventory) was **12/12 PASS** and test-only incremental source patch is in existing coordination branch `fix/connect-browser-auth-redirect-handoff-20261014`.

The production online Next.js server on `api.assps.edu.pk` was read-only probed: stored `src/proxy.ts` has the SAME SHA256 as the reviewed proxy, but **running/deployed build ID is still `XI7EvxpUMkKOxK5ByM2BH`**, which is different from the reviewed compiled candidate. Its `/dashboard` still 307-redirects to `/admin`, preempting canonical anonymous `/login?next=/admin`. This is a **source/build release artifact mismatch**, not proof a teacher credential is wrong. Do not fix this by blindly patching source or restarting a stale build.

## Dedicated read-only gate

`scripts/connect/verify-login-only-production-release-20261014.cjs` does NOT deploy, restart, modify credentials, query or update student records, sign evidence or publish results. It compares the **deployed** auth proxy SHA and Next BUILD_ID to an explicitly reviewed candidate, sends six anonymous HTTPS route probes and verifies **three independently signed production receipts** using the SaaS Core owner-pinned Ed25519 key at `/etc/assps/release-evidence-ed25519.pub`.

Exact command after Core has reviewed/approved the candidate and supplied the legitimate build ID, release ID, and signed receipts:

```bash
node scripts/connect/verify-login-only-production-release-20261014.cjs \
  --deployed-root /var/www/apex-connect \
  --origin https://api.assps.edu.pk \
  --approved-proxy-sha256 <REVIEWED_64_CHAR_SHA256> \
  --approved-build-id <REVIEWED_NEXT_BUILD_ID> \
  --approved-release-id <SAAS_CORE_APPROVED_RELEASE_ID> \
  --signed-receipts /etc/assps/connect-login-release-receipts.json
```

The supported real receipts are *authorized_teacher_live_browser*, *signed_peer_tenant_denial*, and *live_traffic_rollback*. Each must be independently signed by the already-pinned SaaS Core Ed25519 attestor, be less than 24 hours old, and bind to the exact origin, build ID, auth proxy SHA, Core release ID, production school ID1, login-only scope and original evidence SHA. The teacher receipt must prove a **real authorized existing teacher**, temporary-password challenge and HttpOnly session; security reviewer must attest other-school and unassigned-subject denial; Core release owner must attest real traffic rollback drill, original build restorability and unchanged records. The receipt rejects `academic_results_published:true`: login-only cannot silently publish First Term results. No self-created trust key or synthetic teacher acceptance may be substituted for genuine receipts.

An independently executed read-only preview using the candidate build ID and a clearly **unapproved placeholder release ID** found exactly **six passing and six blocked checks**; final exit code `2/HOLD`. Six blocked:
1. Deployed Next BUILD_ID mismatches reviewed candidate.
2. Actual live anonymous `/dashboard` redirect is incorrect.
3. Owner-pinned Ed25519 release trust root is absent.
4. Real staff browser acceptance receipt absent.
5. Independent production peer-school tenant and unassigned-subject signed denial absent.
6. Production rollback signed evidence absent.

The deployed auth proxy SOURCE sha **matches**; five other anonymous HTTPS routes PASS. Baseline school marks remain separate from the Connect login-only release: live Core Exam9 school1 snapshot count 1,762 with 213 genuine numeric zero marks; no auto-generated missing zeroes, teacher permissions, paper maxima, Principal approvals or school data mutations are permitted.

## Mandatory deployment transaction (Core ownership; not executed in this checkpoint)

1. Re-verify latest active Core and standalone Connect Git heads, current deployed PM2 cwd, Nginx ingress, exact build artifact hash, working trees and concurrent issue #4 commits. Do not forward-port a stale source tree over a newer live release.
2. Use fresh read-only exam/results fingerprint plus encrypted/root-restricted current PostgreSQL backup, and rehearse **actual** isolated restore. Freeze deployment scope to APEX Connect login UI and session, not full academic marks or SaaS DB migrations.
3. Stage integrated corrected Connect build with role-aware `/dashboard` proxy first. Repeat source/compiled auth matrix, real Chromium 12/12 with synthetic cloned school and negative role/tenant checks. Test both anonymous and authenticated flows on same exact build.
4. Have genuine already-authorized school teacher complete their own temporary-password change and session in secure browser. Accept no password extraction, synthetic live account, impersonation, cookie fabrication or old password reuse. Test assigned vs unassigned subjects and cross-tenant denial under Core-signed server policy.
5. Independently certify rollback on the exact staged candidate; have SaaS Core's genuine owner-issued/pinned attestations signed; promote with atomic traffic switch ONLY when scoped source/runtime evidence is complete. Run above read-only gate on live after cutover. If any failure, restore previously proven build and verify saved mark fingerprint unchanged.
6. Run First Term academic paper maxima, outstanding score coverage and academic institutional approval as a **different** release. Neither this script nor its evidence authorizes publication.

## Negative verification

`node scripts/connect/test-login-only-production-release-gate-20261014.cjs`: **10/10 PASS**. Unit keys are **synthetic transient test fixtures**, never written to `/etc/assps` and never accepted by production gate. Tests reject unsigned/stale/wrong signer, wrong teacher/tenant, wrong source/Next build/release, wrong scope and fake academic publication. Production GO is explicitly NOT asserted by a test.
