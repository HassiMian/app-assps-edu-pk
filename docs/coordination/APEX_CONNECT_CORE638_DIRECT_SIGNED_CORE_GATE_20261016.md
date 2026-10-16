# APEX Connect MASTER — single-mission direct signed Core gate, 16 October 2026

**Release verdict: HOLD_NO_PRODUCTION_CUTOVER.** Production unchanged. No school records, teacher credentials, student marks, role permissions, printer, SMTP, database or deployment changes.

## Phase 1 — Actual reviewed source lineage

Existing canonical Core/Paper reviewed candidate: integration/core503-privacy-expectedanswer-diary-port-20261016, exact SHA 638025c86a949b9768e5005966724e5d3e834e68. Compiled Vite index SHA256 db0ef46c9922c049f0b150a1a2b00323c15c67967483cd02ccdafa48d0134237.

Connect standalone application: fix/connect-legacy-proxy-guard-20261016 at 20ebae71ca438ad1590720ac93ff1ed9d59fedd7, reviewed parent e776d8f. Private Next optimized Build ID 91l6KJsI2x_oOVXPQjUd5; live public unchanged Build ID ONDwxEIZlx5onDIKY7wYf. Standalone Next checkout has no GitHub remote, so official handoff only publishes source-specific reviewed patches. This branch descends directly from reviewed GitHub Connect coordinator 71bd3cd073f4590f95f52a7b8842f23e755eb893.

## Phase 2 — Independent security authority cannot be invented

Earlier unified verifier correctly treated a copied JSON Core signed receipt as informational, never independent release approval, but lacked a way to trust future genuine approval. The new optional --direct-official-recheck invokes the exact existing SaaS Core signed release verifier directly after verifying:

- Exact root-owned regular non-symlinked trusted executable SHA256 534d2a7cd14925f8b6cbdc40f1a8bed8c205983ababd42ac67a6bc265e0470bf, not group/world writable.
- Exact root-owned non-symlinked Nginx release config SHA256 298f4156fa12d8fc055f98be38961382e4ee6df17048f8d424112cc2408e8919.
- Fixed release ID connect-unified-20261016, exact private Build ID 91l6KJsI2x_oOVXPQjUd5; never accepts client-provided signing keys, sign-offs or worker sessions.
- Verifier must execute with process RC0, produce the actual signed READY Core status with exactly all thirteen true requirements, and return independently certified runtime security. Execution alone is not proof of signatures.
- Even with all sign-offs, technical owner review is only ELIGIBLE_FOR_CORE_OWNER_REVIEW_NOT_DEPLOYED, never automatic production modification.

The existing official Core verifier implements Ed25519 independent witness receipt checking. Its expected protected witness receipt file was absent at the checked configured VPS path. Neither an all-green synthetic JSON nor a successful build creates genuine independent certification.

## Phase 3 — Genuine executed direct verification and tests

The exact official signed Core verifier was invoked from the new source with immutable source and Nginx hashes, via source-owned code. Actual process exit code 2, signed status HOLD, six of thirteen requirements true, seven missing. New unified technical facts 10/10 PASS, public no-cookie login HTTP200 plus eight protected API HTTP401. Unified result exit2 HOLD_NO_PRODUCTION_CUTOVER, unchanged public Connect Build ID and no deployment executed.

Root-only 0600 actual result SHA256 26c790676cad513805cbaf8bfb574934a1a28bf1c4e40ebadf5d7c4de622b41. The first outer remote command exceeded the transport window, but the actual Core and unified verifier had written final protected JSON and RC2, subsequently independently read and checked.

Six new adversarial tests cover wrong source/NGINX SHA, symlinks and writeable files, fake all-13 signed input, invalid JSON/crashes/timeouts, exact command arguments and fail-closed behavior. Total focused new Core638 release tests 18/18 PASS. Entire Connect coordinator Python contract suite 327/327 PASS, true exit0, log SHA256 ab4d3a8da726363d35fa71d80370f77cffa6abd613dfc503940aac8f03efa1f1. CI YAML parses locally; GitHub hosted CI success is not claimed. Earlier unchanged Next node 128/128, Next optimized build, private HTTP 11/11 and Chromium login-render evidence remain valid as previously verified, not falsely claimed fresh this time.

## Phase 4 — Seven real missing Core security gates, still HOLD

Full independently reviewed ACL/ownership backup; independent current offhost recovery witness; restricted signed production worker transport; exact deployed approved worker adapter; separate authenticated worker; effective inherited worker role grants; genuine independently signed peer School2 and unassigned-subject denials.

SaaS Core separately performed a genuine same-host full custom PostgreSQL dump and disposable PostgreSQL 16 restore, but deliberately used --no-acl and --no-owner; it does not fulfill independent ACL-preserving offhost witness requirements. User-supplied Class One Yellow Urdu 38 photographed original scores have been staged privately under SaaS Core's separate authority and are not uploaded by Connect. Authentic staff Marks Save success plus savedCount/read-after-write GET, physical Urdu Diary Save-Reopen-Print, rollback and owner-signed postflight also remain incomplete.

## Phase 5 — Production cutover prohibited until genuine authorization

No Connect/SaaS/Paper production cutover, SMTP send, Nginx/PM2 restart, real login impersonation, physical printer job, marks/diary/paper/database migration, ACL/RLS grant change or student data mutation in this cycle. No fake signoffs, false success or scheduled background task.

Precise further action: Core owner must certify the seven missing real signed authority gates, then run genuine teacher/School2 auth acceptance and physical printing/rollback; only verified correctly descended app source may be reviewed for promotion with coordinated recovery. The full APEX Connect mission remains a single phase-gated workflow under GitHub Issue #4.
