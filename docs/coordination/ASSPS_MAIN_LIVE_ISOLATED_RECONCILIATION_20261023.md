# ASSPS — three-way GitHub main, live hotfix and isolated source reconciliation
23 October 2026. One synchronous mission; no scheduled automation.

## Confirmed branch topology
- Remote GitHub main: b47941ac7867af1b96664c53fd4428a59ccd5055, originally September 25.
- Fully isolated source: 876d500fc110ae39aeaeec270af357333ace3063 (827 commits and 2414 changed paths ahead of remote main, including one tracked school principal-signature media asset indicator).
- Live serving backend on VPS has guarded account-creation, password reset, employee portal and central portal account-service hotfixes.
- Review bridge created FROM remote main, not from the 827 commits:
  security/assps-main-privileged-role-reconciliation-20261023
  commit 5ce08249f16d169cd40e2a53e90dca0cac3d513d
- Only three changed paths: account-creation/reset route, shared role policy, 28 deterministic role tests. JavaScript syntax valid, 28/28 passed. Branch PUSHED to GitHub and exact policy file read back using GitHub connector.
- Requested GitHub draft PR creation failed with 422 collaborator permission. GitHub CLI gh unavailable on VPS; no permission circumvention attempted. Remote main remains unchanged. Direct merging the 827 source commits or performing direct main push can expose tracked private assets and/or trigger an unsafe stale application deployment.
- Private three-way receipt with byte-digest inventory and source-review constraints:
  /root/secure-archive/assps-remote-main-live-reconciliation-20261023/three_way_git_and_live_source_reconciliation_receipt.json.
  Receipt SHA256: 04c550acf7d96c7b3701778ae9980d8c6f6e8437d67fb3b3498cd1f4fde53c54.

## Runtime security parity outcome
- Live hotfixes: generic Owner/platform creation and privileged password reset blocked; employee portal can only provision teacher/accountant; central service can only provision teacher/accountant/parent/student and refuses existing-account role mismatch.
- New isolated read-only verifier measures remote-main vs verified bridge vs live security controls. It confirms bridge READY, live security source READY, remote main NOT READY; release gate FAILS CLOSED. This is not equivalent to real authenticated Owner + school2 cross-tenant positive/negative login tests.
- New source tests prove stale-main refusal, missing bridge guard, lost live guard, missing SQL target-role restriction: 5/5 PASS. Added as 30th read-only mandatory operational category and source hermetic test coverage.
- No production service or database mutation in this reconciliation mission; original live rollback copies untouched.

## Academic data preservation / evidence escalation
- School1 First Term Exam9: 1854 unchanged record count; CURRENT numeric zeros 214, compared with 215 in the October 23 01:51 UTC checkpoint and 224 in October 22 14:12 UTC backup.
- The read-only baseline comparison now detects ELEVEN unattributed differences: 10 historic zero-to-positive transitions, one grade-only. A private mode0600 per-row HMAC-protected forensic receipt was saved, SHA256 e8849426160f843652cded1a047ba8ecee8416168a0cfbceedee602b7a855479.
- The original forward-HMAC seal (1854 rows, 215 zeros) correctly now FAILS, meaning no silent score drift rebaseline. Zero marks, student positions and grades were NOT modified by this mission; six 50/50 D rows, 81 pending subject authorities, zero verified owner role and missing live marks/grade ledgers remain.
- Two active immutability triggers and FORCE RLS source had been verified. No actor attribution proof is available for these eleven changes. Do not auto-correct, silently approve or fabricate award sources.

## Full readiness
- Focused review-branch role matrix: 28/28 PASS; source canonical integrated acceptance 222 Python + 76 Node PASS in four suites.
- Final source operational readiness: 30 evidence groups, 20 PASS, 10 FAIL, 23 release holds, overall RELEASE_HOLD.
- Failing: production academic aggregate baseline, original forward-HMAC, Oct22 historical diff, frontend attestation, frontend closure/339 extras, Owner authenticity, Owner schema, remote main security parity, catalogue FirstTerm source authority, full rollback.
- Existing on-host isolated dual-cluster restore evidence is a POSITIVE operational group but NOT off-host disaster-recovery signoff.
- No GitHub main merge, PR by unauthorized actor, Nginx cutover, PM2 deployment, academic grade/mark correction, Owner provisioning or scheduled ChatGPT task.

## Release decision / what remains
- Keep the three-file pushed main-derived security bridge ready for a properly authorized reviewed merge, then independently prevent stale-main deployment. Do not promote the older main frontend/backend wholesale.
- Require independently verified Owner identity and real permitted school1 plus denied school2 sessions; current database users-role CHECK still disallows owner and no authenticated Owner account exists.
- Require attributable genuine academic originals for eleven changed results, missing GK award, six anomalous 50/50 D grade corrections and 81 catalogue subject approvals. Do not adjust approved results or current snapshot checksum without authority.
- Require signed 034/035 audit ledger & 036 Owner schema controlled migration with backups; off-host dual-database decrypted restoration and rollback; public-signature asset removal/privacy policy, 339-file frontend closure; Diary Save-Reopen-Print and full Urdu A4/Result Card/Paper Studio witnessed acceptance.
- No ordinary technical/manual tasks assigned to school staff. Original institutional identity/award evidence cannot be fabricated automatically.
