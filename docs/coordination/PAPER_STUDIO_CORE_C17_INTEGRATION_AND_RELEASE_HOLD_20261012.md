# ASSPS Paper Studio — latest Core c17 integrated source and release boundary

**School:** AL SIDDIQUE SCHOLARS PUBLIC SCHOOL
**Governance:** GitHub issue #4, Paper Studio Master owns editor/print. SaaS Core alone controls production, RLS, deployment and rollback. Academic Master alone approves Grade IX/X research content.

## Checkpoint 1 — Source integrity and full QA transfer

- Reverified on 12 October 2026: Core branch `fix/core-rls-clone-candidate-and-ops-20261012` currently at `c17d4eadff5eae70afee58eb2a4742e28bbcea2f` (descendant of `e3030c1c`); latest published Paper integration before this mission `test/paper-core-rls77-forwardport-20261012` was `921acf05e523665e132fe2f0cc4a398724789903`.
- Created **new isolated** worktree `/root/workspace/assps-paper-c17-core-merge-20261012` based directly on Core `c17d4ead` and integrated five previous Paper-owned commits without conflicts. Existing source branches, protected templates, previous first-term paper patterns, other owners' worktrees and live school records untouched.
- The exact Paper+Core runtime tree hashes match the previous fully tested Paper source `a74d13e04458eb74c91e9e17956ba8bd35e8c9a6`:
  - `al-siddique-frontend`: `a54d5d1d4b0216b18511d58e481a2544b0b1a0c3`
  - `al-siddique-backend`: `7c5bd1801517632b2ae0dbb49037971a70205608`
- Original actual complete 16-gate source runner on `a74d13e0` finished exit `0`, source logs `/tmp/assps-paper-core-rls77-forwardport-qa-20261012`. The fail-closed `verify-paper-offline-evidence-20261012.py` established 16 actual logs, TAP expectations and per-log SHA-256, with 8/8 tamper tests. **This is runtime-identical evidence transfer, not a new 16-gate execution on a changed runtime.** The latest Core only added release/ops tests and source provenance controls, not frontend/backend modules.
- Added `ops/paper-studio/verify-c17-core-paper-integration-20261012.py`: compares current remote Core HEAD with explicit pinned parent, validates Core ancestry, exact own GitHub remote HEAD, clean worktree, actual frontend/backend trees against `a74d13e0`, and rechecks all original 16 independent gate logs; fails exit2 on any drift. Pure adversarial/positive unit tests **8/8 PASS**, including source, remote, dirty tree, wrong SHA and evidence drift checks.
- Latest Core's current source release-boundary/policy contract tests run on combined branch: `test-verify-paper-core-forwardport-boundary` 8/8, `test-core-mission-release-hold-contract` 11/11, `test-dual-runtime-clone-crud-sql-contract` 7/7, `test-verify-dual-runtime-crud-boundary` 10/10 — **36/36 PASS**. These are pure tests, not proof of production signed runtime.
- Copying tested source onto the newer Core base was done without merge conflict. **No production server, Nginx, PG, PM2, firewall, printer settings or school marks were modified.**

## Checkpoint 2 — Genuine operational and security holds

1. Latest SaaS Core current source still reports full app production signed RLS absent on all 77 tables and the deployed legacy login `apexos_user` has privileged BYPASSRLS; guarded CLONE 77/77 and operator-scoped grants do **not** fix live runtime. Live scoped green Marks Entry only is a separate limited path. SaaS Core must use its reviewed reversible security cutover and retest real authorized and cross-tenant sessions. Its reported read-only release gate remains NO-GO.
2. Public `https://app.assps.edu.pk/release-meta.json` still advertises frontend `8b5d370e...`, `release_certified:false`, `real_marks_acceptance:pending school marks entry`. Genuine First Term Exam9 teachers have NOT furnished actual scored Save→Reload plus all nine scored Result Card signoffs within this mission; never substitute synthetic grades.
3. Previous Windows check found Ricoh MP C307 and Samsung M2070 registered, but both `WorkOffline=True`. A follow-up Windows call in this mission was **queued and did not return live printer data**; do not claim the printer recovered or that any physical page was printed. Real on-site Nastaleeq A4/A5, Urdu/English, mathematical formatting and editable DOCX vs PDF print parity are pending operator witness.
4. Academic Master controls school-adopted year/edition, qualified teacher review, original question+answer signed revisions and Urdu parity. No provisional Grade IX/X item gets verified selectable based on code QA.
5. VPS root was ~48G, ~91% full (~4.3GiB free). Disk cleanup/deployment storage changes require the proper service owner and no protected cache/backup deletion.

## Checkpoint 3 — SaaS Core and school execution brief (one coordinated release mission)

**SaaS Core release/security operator:** Reverify current Core and Paper git SHAs and exact source ancestry; run the new source-proof script with pinned latest Core SHA and `--evidence-dir /tmp/assps-paper-core-rls77-forwardport-qa-20261012`. If it returns HOLD, do not promote. Independently establish correct production NOLOGIN/non-BYPASS RLS signed runtime actor, signed FORCED 77-policy production coverage and real principal/teacher/peer-tenant HTTP isolation; then verify Nginx route methods and external ingress/HTTPS. Confirm recent protected backup, actually executable rollback, disk headroom and restored service health. Only Core may stage, cut over and roll back after release checklist green; clone catalogue QA alone cannot authorize production.

**School Principal/subject teachers:** Via existing authorized sessions, confirm actual First Term Exam ID9 school-roster cohort, submit only genuine staff assessed marks, independently hard refresh and verify stored zero-versus-blank, scoped totals and nine class/section Result Cards. Keep redacted evidence in private school storage, not GitHub.

**School print operator:** Connect/bring online Ricoh or Samsung, validate driver/USB status and Urdu font embedding or local font registration. Physically inspect all pages of non-sensitive A4/A5 Urdu Nastaleeq/English/Math samples, MCQ brackets, totals, table borders, answer lines, vertical equations; export and re-open corresponding PDF/DOCX. Record operator, machine, driver, paper size, actual page output evidence and defects privately. Do not claim hardware PASS from browser preview or driver enumeration.

**Academic Master:** Issue only school-revision signed, textbook/source-evidenced and tenant-scoped reviewed Grade IX/X question+answer records to the approved-only Paper selector; all research candidates remain non-selectable until genuine faculty signoff.

**Publication / status contract:** `PAPER_INTEGRATED_RUNTIME_EQUIVALENCE=PASS_SOURCE_ONLY`; `PAPER_16_GATE_CODE_QA=PASS_PRIOR_EXACT_RUNTIME`; `CORE_CURRENT_PURE_CONTRACT_QA=PASS`; `AUTHENTIC_EXAM9_SCORES=PENDING`; `REAL_PRINTER_OUTPUT=PENDING`; `FULL_PROD_SIGNED_RLS=HOLD`; `PRODUCTION_DEPLOYMENT=HOLD`. Never restart development, force push, fabricate user evidence or schedule continued work.
