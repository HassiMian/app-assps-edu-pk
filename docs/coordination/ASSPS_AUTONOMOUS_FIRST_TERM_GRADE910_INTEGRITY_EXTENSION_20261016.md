# ASSPS unattended First Term and Grade IX–X evidence extension — 16 October 2026

## Unattended live status

The owner's school-level institutional acceptance and Ricoh MP C307 physical A4 hardware acceptance are **carried forward**. Neither acceptance requires further routine user action. The PostgreSQL checks are a real `BEGIN TRANSACTION READ ONLY` and contain **no updates, seeding, auth impersonation or printer dispatch**.

- Preserved live `exam_results` dataset across two schools: **1,763** real rows and **213** actual numeric zeros.
- School 1 First Term, exam 9: **302** students with **1,762** subject result rows. **284** entries expected from the exact current exam/class/section official subject roster are absent, affecting **233** students. **1** saved subject row fails official naming match. These are **informational pending/mapping evidence** and MUST NOT be silently converted to scores, nor constitute production outage alerts.
- **0** duplicate exam9 student+normalized-subject result keys, **0** subject-level and student aggregate grade-setting gaps using the backend-equivalent whole-percentage `floor` rule, **0** invalid scores. Any new duplicates, grade coverage break or invalid scores triggers the operational critical flag.
- **81** active subject config entries: **64** have internally consistent recorded subject maximum evidence, **17** have no matching scored evidence; 81 were stored with null total/pass settings and absent formal per-revision signed approval. Machine-verified maxima != authenticated independent academic decisions.
- School 1 Grade IX/X question_bank: **1,530** Class 9 and **881** Class 10 research/draft rows; **0** rows flagged `is_approved=true`. Do NOT conflate these 2,411 live records with the separate **2,581 SHA-frozen original research question revisions** in offline Grade 9/10 source-ledger archives. A future importer setting an approved flag on a record lacking minimal source identifier/page or any answer is automatically flagged CRITICAL. This flag test still is **not a substitute** for authentic qualified subject content review.

## Automation execution and verification

- The hourly `assps-technical-self-verification.service` and timer were activated with `ProtectSystem=strict`, `ProtectHome=read-only`, `NoNewPrivileges=yes`, strict read/write receipt path, and sandbox-compatible `runuser -u postgres` so SQL runs as the database peer user without elevating an unprivileged actor.
- Monitor receipts contain technical hashes and aggregates, **no student identities**.
- Twelve deterministic monitor tests cover schema, zero-vs-blank, student-score drops, replica/tenant-count drops, login/print/controller regressions, duplicate results, fractional grade coverage, grade IX-X false flag and safe receipt permissions.
- School printer status comes from school owner's previously verified physical Ricoh acceptance and optional Samsung backup; the monitor never sends a new spool job.
- Source CI and guarded production dry-run are separately protected; a live backend worker/release security signature cannot be manufactured and no backend cutover is silently performed.
