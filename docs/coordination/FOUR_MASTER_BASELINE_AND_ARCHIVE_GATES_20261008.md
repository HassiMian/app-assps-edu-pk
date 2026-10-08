# ASSPS four MASTER baseline reconciliation and chat archival gates

Audit date: 2026-10-08. **Governance / no deployment authorization.**

## State of all four master conversations

Four independent read-only initial MASTER reports were recovered or posted to GitHub issue #4. Their factual assertions are tied to checkpoints and observation times, not permanent release authority. At 2026-10-08 15:04 UTC, the VPS metadata still reported frontend `24cbcae33b96f1bb058ad9b005f0eb8bfe5eac92` and backend `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9`. Historical release anchor `68a158e` is **not** a current deployment instruction.

| Master | Authority / next move | Evidence and release gate |
|---|---|---|
| SaaS Core & Production | Owns VPS/DB/Auth/RLS/fees/releases; immediate security perimeter and least-privilege DB assessment | `apexos_user` has `BYPASSRLS` in observed configuration despite 77 FORCE-RLS tables; effective runtime RLS acceptance **HOLD**; wildcard listeners/firewall ingress need upstream reachability audit; active deployed backend provenance only partial |
| Paper Studio | Owns newer Paper Workspace (not simple/legacy editor), Saved Papers, Official Papers, Results, Early Years, Lesson Planning/Diary, print/DOCX and approved bank consumption | Lesson/Diary isolated forward port `2b10eab` diverges from live `24cbcae3`; requires forward integration onto fresh descendant, clone-based restricted-role HTTP/RLS, authorized teacher, protected 43-paper print/DOCX and overflow/browser/physical print tests; no independent release authority |
| Grade IX–X Academic | Owns curriculum edition applicability, source-page/exercise evidence, original questions, independent reviewer approval and revision-bound APPROVED snapshots | Clean academic research branch `1b29218`; 2,581 authored drafts, 2,411 research/generated candidates (non-additive), 110/111 PDFs hash-matched, 0/111 independently verified exercise indexes, **0 questions approved**, **0 published selectable**. No production import for provisional questions |
| APEX Connect | Owns independently versioned Connect client, role/tenant scoped SaaS projection, Connect auth/UI, no duplicate paper DB | `apex-connect` process online; build ID `ihxf6PSQr3JOIx7RqddR1`, full source commit **unattested** due missing Git/worktree metadata; `.active-release` green marker does not match running base process; inspect provenance, permissions, recovery and API contracts before any release |

## Prioritized collision and dependency matrix

| Risk | Owner | Collaborator | Correct handling | Gate |
|---|---|---|---|---|
| Frontend release newer than handoffs (`24cbcae3` vs `9fe7b56`) | SaaS Core | Paper Studio | Fresh source ancestry and selective forward-port, not stale branch promotion | P0 release serialization |
| Privileged runtime database login vs expected FORCE RLS | SaaS Core | Paper Studio, Connect | Isolated real-schema clone with non-bypass role; verify all privileged paths, cross-tenant and teacher/student scopes; then controlled deploy | P0 security hold |
| Wildcard-bound private services + inactive UFW | SaaS Core | Connect | Verify actual Hostinger/cloud ingress ACL first. No ad-hoc firewall enable/rebind without rollback | P0 perimeter review |
| Grade IX–X provisional data vs teacher Paper Workspace selection | Academic Master | Paper Studio, SaaS Core | Only independent reviewer-approved, source-revision-bound snapshots can be marked verified/selectable; keep provisional rows quarantined | P0 academic approval hold |
| LessonPlanDocument context and curriculum/question bank inputs | Paper Studio | Academic, SaaS Core | One canonical plan model; mark missing evidence, avoid generated unverified pages/holidays, role-safe DB reads, editable multi-subject plans | P1 product/DB acceptance |
| Connect saved paper/student/teacher projection | Connect | SaaS Core, Paper Studio | Narrow authorized read APIs, tenant/role filtering, no second paper authority/answer leak, full source provenance | P1 contract+security |
| Shared modified files in multiple worktrees (`migrate.js`, `PTSPaperGenerator.jsx`) | SaaS Core release coordinator | All owners | Detect owner/path collisions, preserve dirty worktrees, compare diffs and integrate only unique patches | P0 no overwrite |
| Historical UI editing selection/RTL and Phase3AE | Paper Studio | SaaS Core | Issues #2/#3 remain open until targeted authenticated, data-isolation and print regression evidence exists | P1 dedicated acceptance |

## Old chats — preserve, then archive only when earned

1. Keep ONE working MASTER conversation per Project: `Paper Studio Master`, `Grade IX–X Academic Master`, `SaaS Core & Production Master`, `APEX Connect Master`. These project names are user-provided and the active chat names can differ.
2. Keep the previous **SaaS Paper Generator**, all **ASSPS Paper Studio Sprint** duplicates, **Browser Tests Passed**, **Resume SaaS Audit**, **Resume ASSPS Checkpoint**, **Complete Grade 9 to 10 Question Bank**, **Resume Grade Project**, and **APEX Connect(Super App)** inside their respective ChatGPT Projects as historic evidence. A mixed old chat may be assigned to one Project while its unique relevant facts are indexed in two master handoffs.
3. Before archiving any given older chat, check that its **full accessible transcript, uploads, screenshot references, unique instructions, uncommitted patches, tests, user decisions and links** have a durable pointer in its Master or GitHub. Verify no unresolved agent task relies on an unindexed chat artifact.
4. Old chat content is NOT physically concatenated by moving chats into Projects. No automatic ChatGPT merge or history deletion is claimed. Archive is user/UI action; **never delete** while unique content cannot be confirmed.
5. If an earlier chat contains missing or inaccessible historical material, record it in an explicit recovery gap register, keep that chat reachable, and do not claim 100% recovery.
6. GitHub branches, worktrees, backups and database revision history are **not** chat clutter. No force-push, removal or destructive cleanup during this workflow.

## Recommended next execution (not deployment)

- SaaS Core: certify current DB/ingress/security findings in read-only + disposable infrastructure; identify safe runtime-role migration sequence and rollback requirements.
- Grade IX–X: verify ASSPS textbook editions/current session/medium, physical book pages and exercise indices, answer correctness and independent reviewer signoffs; no automatic approval.
- Paper Studio: reconcile `2b10eab` against *latest frontend* and verify required clone/role and authentic teacher workflows, protected papers and print fidelity without altering production.
- APEX Connect: restore immutable source provenance, classify currently running release marker mismatch, and draft role/tenant/API matrix; do not infer student permissions from UI.
- SaaS Core alone schedules eventual gated production integration after all owners have posted exact SHAs, tests, dependency ownership and rollback evidence in issue #4.

**Closure verdict:** Four project baseline reports are present; repo/production projects are still operating independently. Chat categories can now be organized, but old conversations cannot yet be safely classified as comprehensively audited because full original transcripts and attachments have not all been independently accessed. Technical release certification remains HOLD.
