# APEX Connect — canonical GitHub handoff for PRE/POST signed login-only release

**Date:** 14 October 2026. **Status:** SOURCE AND QA VERIFIED, LIVE CUTOVER HOLD.
**Owner:** Connect source / SaaS Core sole production release authority.

## Exact standalone Connect source identity

Functional Next.js standalone baseline commit:
c9de089362c3d170d0da3a84140069cf6402014b

New reviewed source child including a strictly PRE-cutover owner-signed gate:
f45539f5dd7572a89dd7e95a71b174dc0e000293

IMPORTANT: standalone Next repository remotes are LOCAL workspace repositories,
not GitHub. Do not claim that f45539f5 exists as the canonical public monorepo
remote branch or that it has reached public users. The owner receives the
**exact incremental standalone source patch** below published through the
canonical GitHub coordination branch instead.

Exact source patch:
docs/coordination/APEX_CONNECT_SIGNED_PRE_POSTCUTOVER_20261014.patch
SHA256: 586284a2c34846fc483d2a1d66407444780f2ecbaea5a2cd74a58790fe6590a7
Contains exactly three standalone source changes: read-only signing verifier,
15 adversarial negative tests, and separate PRE/POST runbook. Patch applied
with git apply --check PASS against exact standalone parent c9de089.

## Implemented behavior and tests

- Read-only PRE verifier checks reviewed source SHA, real compiled Next BUILD_ID,
  actual Blue Nginx source hash, private Green Nginx intercept removal and
  upstream, full backup SHA and independent genuinely signed Core release
  owner preflight rooted at /etc/assps/release-evidence-ed25519.pub.
- Core release acceptance JSON is pinned by SHA and must be a separately
  verified REAL login-only Core actor/tenant/worker/recovery gate. This
  expressly does not require unrelated academic maximum-marks approvals.
- PRE result can be READY_FOR_SAAS_CORE_CONTROLLED_SWITCH but is NEVER a
  certificate of production deployment or genuine staff postflight.
- The original existing POST signed verifier remains mandatory for genuine
  authorized staff password rotation/relogin, independent peer-school and
  unauthorized-subject denial, plus actual completed public traffic rollback.
- PRE source negative tests 15/15 PASS; earlier owner-signed receipt tests
  10/10, Nginx source policy9/9, role/login routing19/19, query path12/12,
  cross-host verified role tests9/9 PASS. The previously recorded complete
  private HTTPS Chromium/password challenge on restored schema 15/15 PASS
  with QA synthetic teacher, NOT a live real employee acceptance.

## Actual latest read-only full-chain PRE verifier on VPS

The live Blue Nginx source was read, its two known dashboard overrides
removed ONLY inside an ephemeral root-private Green config copy, and a
loopback stage upstream set. No Nginx public edit or reload occurred.

The REAL previously compiled reviewed candidate exists on disk with BUILD_ID
ONDwxEIZlx5onDIKY7wYf, compared with currently live public old Next build
XI7EvxpUMkKOxK5ByM2BH.

**Actual PRE checks:** reviewed proxy SHA, reviewed compiled build, Blue
routing checksum, corrected private Green routing and backup SHA all PASS;
authentic signed Core production acceptance, trusted pinned owner Ed25519
key and genuine owner receipt all FAIL/ABSENT. PRE STATUS=HOLD (exit2),
production deployment performed FALSE.

The complementary Core login-only true runtime gate is independently
implemented/published on Core integration candidate
integration/core-connect-six-global-worker-20261014 at commit
f288878b6344babb973701d63aa44f69b17791d8.
That genuine Core gate also exits 2/HOLD for live six-table grants, signed
DB transport, separate worker authenticated production identity, owner
trust, peer school denial and encrypted off-VPS recovery evidence.

## Required exact release transaction, without institutional impersonation

1. SaaS Core merges/reconciles reviewed Core least-privilege source onto
   CURRENT canonical Core head, provisions actually authorized separate
   AI worker DB login and validates restricted role/HTTP school isolation.
2. Core verifies signed genuine peer-school denial and independent secure
   off-host backup/rollback, and pins genuinely controlled attestation root.
   NO fake identity, backdoor, self-invented teacher or Principal signature.
3. Build and attest the exact standalone reviewed Next application artifact
   and corrected Nginx source TOGETHER. Run signed PRE verification first.
4. Only upon real Core-certified PRE READY may SaaS Core coordinate an atomic
   Next build/Nginx traffic switch with instantly available Blue recovery.
5. After traffic cutover verify genuine existing teacher browser session,
   temp-password rotation/relogin, independent signed school/subject HTTP
   denial and Core-owned actual rollback. Execute original POST verifier.
6. Any failed gate restores Blue and rechecks original school1 ExamID9
   results and genuine numeric zeroes. Do not publish academic results.

Never apply the standalone patch directly to the monorepo Vite frontend.
This patch belongs only to the standalone Next.js source. No fake receipts,
credentials, student information or source signing keys are included.
