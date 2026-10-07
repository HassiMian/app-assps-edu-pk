# ASSPS Paper & Assessment Studio — Architecture V1 Release Definition Matrix

Date: 2026-10-07
Status: closure evidence candidate; production deployment requires exact-current-lineage guard.

## Representative workflow gates

| Workflow | Evidence | Status |
|---|---|---|
| Manual weekly assessment without Question Bank | manualAssessmentDocument tests; canonical save/finalize/reopen evidence | PASS |
| Chapter assessment + Question Bank governance | governance HTTP 9/9; legacy governance 8/8; import governance 9/9 | PASS on disposable clone |
| Mixed publisher/resource profile | curriculum-resource model 3/3 | PASS |
| Curriculum version migration preserves historical papers | curriculum-history immutability 7/7 | PASS on disposable DB |
| Urdu/English mixed direction | paperWorkspaceUrduBrowserAcceptance 9/9 | PASS genuine Chromium |
| Table/custom universal assessment modes | universal block browser acceptance 4/4 | PASS genuine Chromium |
| Personalized full-class duplex batch | personalizedPrintDurableBrowserAcceptance | PASS genuine Chromium |
| Save/reopen/conflict/offline recovery | assessment persistence adversarial 2/2 | PASS genuine Chromium |
| Header template reuse + scoped formatting | headerTemplateScopedBrowserAcceptance 6/6; metadata/scoped browser 12/12 | PASS genuine Chromium |
| Official corpus preview/print fidelity | canonical all-43 render/print acceptance 43/43 | PASS genuine Chromium |
| Early Years print geometry | early-years geometry 8/8; 0 clipping/overlap | PASS genuine Chromium/PDF |
| Choice-aware scoring | ScoringPlan + nested scoring browser | PASS genuine Chromium |
| Tenant/role isolation | tenant isolation 8/8; portal role isolation; teacher scope 6/6 | PASS |
| Strict DB RLS authoring coverage | multiline-aware strictTables static gate incl. legacy/governance/print tables | PASS |

## Red-team closure notes

- W81: strict FORCE-RLS list includes question_bank, question_bank_imports, governance and print tables; static proof updated to understand multiline arrays.
- W82: teacher is read-only/scoped; admin/principal mutation boundary remains.
- W83/W84/W87/W88/W89/W90/W92: legacy create/edit/delete converge on immutable governance; Candidate default; revisions; retirement; cryptographic/random-safe IDs/idempotency semantics.
- W85/W86: AI import approval bypass removed. `/import/approve` is now Candidate-only governance intake, requires idempotency, cannot direct-insert approved legacy rows, and returns `requiresReview=true`.
- W100-W104: ScoringPlan/choice-aware maximum-obtainable semantics covered, including nested choices.
- W126-W138: immutable release + durable print-job foundations are present and representative personalized duplex flow is browser-proven; advanced operational policies such as physical-copy reconciliation remain post-V1 hardening, not a blocker for current school workflow.
- W147/W151/W153: server revision authority, conflict/offline recovery, rollback snapshots and canonical render/print convergence are release requirements.

## Non-claims / deferred hardening

Architecture V1 closure does not claim every W01-W159 item is mathematically eliminated. Items involving future QTI/CASE/OneRoster adapters, advanced accessibility metadata, image DPI/asset lifecycle, large-scale queue fairness, AI-provider governance, formal SLOs, and disaster-recovery exercises remain roadmap hardening. They must not be represented as completed unless separately proven.

## Deployment doctrine

Before production: re-read live frontend/backend SHAs; reconcile concurrent changes; create a fresh forward candidate from exact live lineage; deterministic frontend build; disposable-clone backend/security tests; staged alternate-port backend smoke; fresh rollback snapshot; deploy only traceable forward content; post-deploy health/protected-route/browser smoke. Never mutate production with synthetic security fixtures.

## Production closure and post-release drift reconciliation — 2026-10-07

Architecture V1 initially deployed at `6ab7612e713edd666a4bc2d3a2d6596aa8059f56`. Subsequent concurrent releases moved production. Backend remained a true descendant and preserved Question Bank governance; current backend is `55778fffe948cd942a6fed566836a76899425331` with release smoke PASS. Frontend moved to sibling lineage `b87f85d...`, which preserved current SaaS stability work but dropped nested scoring, render-fidelity harness entries, and the scoped header renderer patch. A forward reconciliation was therefore built from exact live frontend `b87f85d...`, restoring only those verified Paper V1 pieces while preserving Academic Setup, Examination, Dashboard, Attendance, fee/data-truth and notification stability changes.

Final post-release reconciled frontend: `afbce30a4af2a790221dc38478a35141545f5f1d`.

Reconciliation gates: production safety PASS; nested scoring browser PASS; header-template scoped browser 6/6 PASS; Urdu/RTL 9/9 PASS; Early Years geometry/print 8/8 PASS; official 43-paper render/print parity 43/43 PASS; frontend build PASS; production school smoke PASS. Rollback snapshot: `/var/backups/assps-archv1-postrelease-front-20261007T142019Z` (frontend tar SHA-256 `3275010c0c386b11d7d7a40c6c04f48066ee4309b61cf5d63829a72c7efdb908`).

Current release doctrine remains: never infer safety from release metadata alone; verify ancestry/content because sibling-lineage forward releases can drop previously validated Paper behavior even when `previousRelease` points at the Architecture release.
