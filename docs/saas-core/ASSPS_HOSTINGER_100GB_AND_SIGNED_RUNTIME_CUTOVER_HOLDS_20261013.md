# ASSPS SaaS Core — Hostinger 100 GB Expansion and Signed Runtime Cutover

**Observed:** 13 October 2026, ~01:00 UTC / 06:00 PKT. **Authority:** SaaS Core & Production Master. **Coordination:** GitHub Issue #4. **Release state:** HOLD for full backend; existing green signed Marks Entry scoped GO.

## Exact sources and live safeguards

- Verified isolated Core branch `fix/core-rls-clone-candidate-and-ops-20261012` SHA `f64c031233d26f22976ce4ce7d5dc78a4601799c` before this checkpoint. Canonical remote `release/firstterm-core-security-unified-20261011` SHA `00da1e296c3116086a1d1e98c272eb0534e4ee8e` remains unchanged.
- Latest separately owned Paper Studio integrated candidate observed during this mission is `test/paper-core-f64-urdu-acceptance-20261012` SHA `cc0af16b0319702eacabd6907dac56c7d5383f11`, a checked descendant of Core `f64c0312`. This Paper-owned candidate records a post-font-fix regression checkpoint but is NOT automatically approved for deployment; Paper owner must independently attest any remaining Jameel Noori/PDF font and print acceptance gates. No Paper-owned worktree modifications.
- Deployed frontend metadata SHA `8b5d370e0a91e86f5c7c136bbf49521ab1e15147`; legacy backend metadata SHA `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9`; separately deployed signed Marks green SHA `1b0541af75526b2840e7403bc8193cd1c540a811` from prior attested service evidence. All three endpoints HTTP200 at mission start.
- Live PostgreSQL5432 `apexos`: 368 RLS policies, 322 students, 12,181 attendance, 901 challans, 129 payment transactions and exactly 2 existing `exam_results`. No production writes or migrations were executed in this checkpoint.

## Checkpoint 1 — Exact Hostinger capacity and what is actually blocked

An independent `lsblk -b -J` plus `statvfs` inventory established `/dev/sda` **53,687,091,200 bytes (50 GiB)** provider virtual disk, `/dev/sda1` **52,612,283,904 bytes** root partition, ext4 root filesystem **50,884,108,288 bytes**, free at measurement **4,531,834,880 bytes (~4.22 GiB)**. VPS has not been allocated 100 GB. `hostinger-100gb-capacity-preflight-20261013.py` independently holds on each of: provider disk <100,000,000,000 bytes, partition/filesystem not grown, free space <6GiB. Test suite eight cases PASS. This is a read-only disk gate; it never triggers partition or filesystem changes and never claims a provider payment.

Hostinger documents that VPS disk is **not individually upgradable**: to obtain the 100 GB resource tier, the hPanel VPS plan must be upgraded from KVM 1 (50GB) to KVM 2 (100GB), with provider checkout/payment. Hostinger self-service panel URL `https://hpanel.hostinger.com/` opened in the available cloud browser but returned only the panel title, no verifiably authenticated VPS billing/plan detail or checkout. The available VPS SSH/PM2/Nginx command tools have no provider account billing/storage-upgrade capability. Plugin discovery found no authorized Hostinger VPS billing connector (Hostinger Mail != provider control). **No payment, plan order, 100 GB allocation or filesystem expansion was performed.** Only the authorized Hostinger account owner/connected provider billing workflow can complete that missing external act.

After the provider actually increases the virtual disk, **do not blindly run** `growpart`, `resize2fs`, or restart production before re-inspecting block-device topology, provider operation status, fresh backup and approved recovery window. Independent first-time post-upgrade preflight must confirm physical disk -> root partition -> ext4 filesystem -> at least 6GiB available, along with system health and rollback evidence.

## Checkpoint 2 — Legacy BYPASSRLS and Paper-owner role dependency

`apexos_user` remains an active production LOGIN with `BYPASSRLS=true`, also a member of `apex_app_runtime`, `apex_paper_owner` and `apex_paper_runtime` in live PG5432. `apex_paper_owner` is an independent NOLOGIN/non-BYPASSRLS/non-SUPERUSER owner of **14 relations + 3 functions**. Live full-app `core_signed_tenant_guard` membership is **0 of 77** tables, despite the independent signed Marks runtime remaining protected. PG55432 recovery test cluster lacks exact global ACL owners `apexos_user` and `apex_paper_owner` from the protected archive; existing 176 ACL/default ACL entries cannot be treated as faithfully restored. Test-cluster restricted runtime roles remain NOLOGIN/NOBYPASS.

New independent read-only `verify-legacy-role-paper-boundary-20261013.py` reports the exact role ownership and membership conflicts, always requires Paper-owner signoff and authentic actor HTTP acceptance, and refuses to certify if the live privileged login remains active, if Paper ownership changes unexpectedly, if required QA global-role mapping is absent, or if 77 signed Core guards are missing. Its nine negative/positive tests PASS, but the actual production gate result is **HOLD**. A direct production `ALTER ROLE apexos_user NOBYPASSRLS`, `REVOKE` of role memberships, or blind creation of privileged legacy global users could interrupt attendance, admissions, fees and Paper Studio. They were not executed.

Existing **isolated recovery candidate** `assps_core_signed_recovery_candidate_20261012` on private PG55432 genuinely passed its read-only 77 signed restrictive policies (`USING=WITH CHECK`), 75 permitted Core CRUD tables per runtime, 78 sequence ACL comparison, protected Paper tables zero runtime grants and operator-signed positive/unsigned negative aggregate tests. This does **not** certify production database roles or authentic principal/teacher browser sessions.

An attempt to provision an **independent synthetic-only restricted PostgreSQL LOGIN** for real HTTP authentication tests was blocked by execution safety checks **before the command ran**. It was not reissued in another form to evade that control; no new QA login, credential or actual authenticated teacher/principal HTTP acceptance was certified.

## Checkpoint 3 — Required reviewed release sequence (not executed)

1. Provider completes 100 GB Hostinger plan upgrade through an authorized hPanel billing session; confirm source block-device capacity and capacity gate PASS, then separately reviewed filesystem growth if necessary. Neither cost nor checkout confirmation may be invented.
2. SaaS Core and Paper Studio agree an exact immutable integrated frontend/backend HEAD, 14 relation/3 function Paper-owner authorization contract, safe NOLOGIN/NOBYPASS global-role recovery mapping and reversible SQL grants/policies without production data rewriting.
3. Dedicated privately accessible non-BYPASS PostgreSQL LOGIN and signed transaction binding are proven on synthetic-only tenant A/B fixtures using actual JWT principal and teacher role routes. Must demonstrate allowed tenant A reads/controlled writes, tenant B denied (including forged role/GUC/header/query), Paper owner access and teacher/class/section exclusions; no live school marks in tests.
4. Verify full protected module regressions, official Marks Entry genuine Principal/Teacher save→reload→Result Card print via authorized school session and Paper Urdu PDF font parity. Existing scoped green Marks Entry and unrelated school modules must remain unbroken.
5. Fresh protected production DB backup + verified restore/ACL/global-role mapping; exact release-base ancestry, frontend/backend build, migrations/RLS and load tests; documented rollback owner; controlled off-peak cutover only after independently signed acceptance. Explicit production smoke with real authorization required before full GO.

## Actual authorization and next dependency

**Source preflight and test-suite changes completed; full production cutover blocked.** Hostinger KVM 2 purchase was not made because no authenticated provider billing account/checkout tool was available. No legitimate school-login session was available for principal/teacher E2E, and QA synthetic LOGIN provisioning was explicitly blocked by tool safety. Global Paper ACL mapping requires the separate Paper owner to certify. Do not equate synthetic browser screenshots, protected backup hash or signed operator simulation with live school publication authorization.

**Zero production changes:** No database writes, `ALTER ROLE`, privileged grants, Nginx or PM2 edits, firewall changes, provider purchases, source force push, student score mutation or scheduled automations.
