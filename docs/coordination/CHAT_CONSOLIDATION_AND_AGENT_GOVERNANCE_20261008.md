# ASSPS: Chat Consolidation, Workstream Ownership, and Agent Coordination

**Audit date:** 2026-10-08 UTC. **Status:** GOVERNANCE/HANDOFF ONLY; no production deployment, chat deletion, or branch cleanup authorized.

## 1. Scope, limitations, and authority

This consolidation reconstructs the named ChatGPT conversation streams from available historical summaries and recoverable checkpoints, current repository worktrees, GitHub issues, and VPS runtime release metadata. This is **not** a complete byte-for-byte audit of all ChatGPT conversation transcripts; missing full transcripts, chat identifiers and ambiguous titles are explicitly unresolved. ChatGPT conversation histories must be archived rather than deleted until independently exported/checked. This repository record cannot physically merge ChatGPT message histories.

Authority precedence: (1) live frontend/backend release metadata and artifact verification; (2) immutable repo commit/remote branch and actual source; (3) reproducible automated/browser/security evidence; (4) source-ledgers and academic signoff; (5) ChatGPT chat summaries. Chat claims never override runtime facts.

## 2. Exactly FOUR active development conversations

| Active chat | Owns | Merge/retire chat titles into this category |
| --- | --- | --- |
| `ASSPS PAPER STUDIO — MASTER` | PaperDocument, Canonical Paper Workspace, Official Papers, new paper authoring, saved papers, exam Results, QR/marks, Urdu RTL, Print/PDF/DOCX, Early Years, LessonPlanDocument, Lesson Planning and Daily Diary, Question Bank *consumption* | `ASSPS Paper Studio Sprint` (all duplicates), `SaaS Paper Generator`, `Paper Generator System`, `Verify Examination Workflow`, `Browser Test Past/Passed` (title unverified), Paper Studio Part 05; relevant paper-only elements of `Resume ASSPS Checkpoint` |
| `ASSPS GRADE IX–X QUESTION BANK — MASTER` | source acquisition/ledger, actual official edition applicability, chapter/topic/page/exercise anchors, original MCQ/short/long content, bilingual equivalence, independent approval, versioned approved snapshots | `Complete Grade 9 to 10 Question Bank`, `Resume Grade Project`, Grade IX–X source verification and academic evidence threads |
| `ASSPS SAAS CORE & PRODUCTION — MASTER` | admissions, attendance, fee ledger, people/roles, authentication, tenant isolation, DB/RLS, VPS, canonical release branch/history, backups, operational audit, production deployment owner | `Resume SaaS Audit`, `Resume ASSPS Checkpoint` (core-only elements), SaaS audit/repair/stability, phase-4 platform/security/fees certification |
| `APEX CONNECT — MASTER` | Connect-specific app and role-aware authorized projection of SaaS data, identity and portal permissions, teacher/student access, saved-paper projection, mobile/client UX | Apex Connect / Super App / Connect V6-C–F/G37 threads; Connect-only segments of older Paper Studio streams |

Name spelling variants `ASSPS`, `ASHPS`, `KSHPS` in conversational references should be resolved to **AL SIDDIQUE SCHOLARS PUBLIC SCHOOL** before creating any new program. Never create multiple products due only to a chat title typo.

**Outside scope:** independent AEGIS security product, JARVIS assistant, Antigravity laptop setup, printer hardware support and creative school posts retain their own separate projects/conversations as needed. JARVIS and AEGIS must not be folded into ASSPS Paper Studio or into each other.

## 3. Chat disposition — preserve before archiving

1. Create four ChatGPT Projects (same names above), each with ONE designated active MASTER chat and the accompanying project-specific handoff file in this directory.
2. Export or inspect the full histories of older similarly named chats, including attachments, screenshots, generated test evidence, unresolved decisions, prior assistant actions and chat links. Compare against the source commits, reports and active GitHub issues. Flag anything genuinely unique or unported.
3. Move eligible older conversations into the appropriate ChatGPT Project when useful. This **groups** conversations; it does not combine their messages into one chat.
4. Keep only the four MASTER chats active in the sidebar; archive older chats after the unique-work inventory is complete. Archiving is reversible; deletion is not. Do not auto-delete ChatGPT histories, worktrees, production backups or Git branches.
5. For future context-window limits, create `MASTER — Continuation NN` only after making a signed/checksummed checkpoint and archive the retired master. Never allow two live masters for the same scope.

## 4. Verified repositories and runtime at audit

- Canonical historical release branch: `release/saas-canonical-production-20261007` at remote `68a158e067e8bbcb0f35514abaff8d580a6435be` (stable anchor, **not** automatically the newest live source).
- Live deployed frontend metadata as observed 2026-10-08 13:08 UTC: `9fe7b560f879a8193171e7588abf1f744256298e`.
- Live deployed backend metadata: `16ab8f346ba27aa6b2e29a8f03c68db32a326cb9`.
- Grade 9–10 research completion branch: `feat/grade910-completion-reconcile-20261008` at `1b29218a8dbe7136f131302b3532195f723543c9`, clean in its examined worktree. These remain provisional research/authoring, **NOT approved question inventory**.
- Cognitive Lesson Planning / Daily Diary forward-port candidate: `feat/lesson-diary-live-forward-20261008` at `2b10eab357c6756059cebb7e9e7628eefc4dbddf`, isolated/not production deployed. Has passing Chromium and isolated unit/security checks but database clone, privileged-RLS, full physical print and release gate still on HOLD; see `docs/LESSON_DIARY_PART05_RELEASE_GATE_20261008.md` on that branch.
- Recovered 54 Git worktrees (registration count, **not** 54 verified active agents). Multiple Paper Studio, architecture RLS, Grade 9–10, Results and scoring branches coexist; no wholesale deletion/reset.
- Connect PM2 process was online; its independently versioned deploy/ref and scope need source-specific verification. Do **not** infer Connect source commit from the SaaS repo's frontend hash.

Historical reported counts (1,608 provisional live records, 4,253 candidate questions, 2,581 authored + 2,411 generated research candidates) refer to **different snapshots and/or inventories**. They cannot be aggregated or treated as academically approved. Historical checkpoints report **zero approved** until new independently sourced evidence proves otherwise. Verify database and ledger at time of further work.

## 5. Immutable ownership, dependencies, and integration

```text
Academic authority (Grade IX-X) ──reviewed APPROVED snapshot──▶ Paper Studio consumer
                                (never provisional rows)
Paper Studio approved changes ──versioned PR + tests─────────▶ SaaS Core release owner
SaaS Core authenticated APIs ──role/tenant filtered contract─▶ APEX Connect
APEX Connect ────────────────no independent paper DB─────────▶ SaaS canonical data
```

- SaaS backend/SaaS API is the single canonical paper and school-data authority; Connect is a scope-limited projection/client and must not silently fork saved-paper ownership.
- Canonical **PaperDocument** drives paper data → question/layout/language rules → editor → checks → print/PDF/DOCX; protected official papers and legacy document families are not rewritten merely to adopt a new UI. The newer **Paper Workspace** is the only teacher-facing canonical editor; old/simple editors are read/compatibility-only.
- Canonical **LessonPlanDocument** covers daily/weekly/term multi-subject planning and Daily Diary notebook cards; no second competing object model.
- Question Bank writers/reviewers own academic verification; Paper Generator can only publish/select revision-bound approved snapshots. Every page/edition/curriculum claim is provenance-bound.
- Production Core is the ONLY deployment authority. Each frontend/backend release must be separately reconciled against exact deployed source and concurrent branches. Merge only verified missing changes onto latest appropriate descendant; require peer checks, tests, backup and executable rollback.

## 6. Mandatory agent workflow (effective immediately for new work)

1. **Preflight**: Read this file and the one relevant `*_MASTER_HANDOFF.md`; read existing GitHub Issues #1 (Curriculum↔Paper contract), #2 (Phase3AE authoring), #3 (serial+statement selection) before touching overlapping work. Verify active process, production metadata, exact git ancestry and clean/dirty worktrees.
2. **Claim**: One assigned owner and clearly delimited files/paths per change. Identify collisions with other worktrees and chat agents; no guessing that `latest chat` means `latest deployment`.
3. **Isolate**: Create dedicated `feat/`, `fix/`, or `audit/` branch from the verified appropriate ancestor; preserve all uncommitted changes in their original worktrees and do not force-push/reset shared refs.
4. **Implement/validate**: Check source approval, tenant/role/RLS, optional AI fail-closed behavior, Official Paper integrity, Urdu RTL/Jameel Noori, independent PDF/DOCX print, and normal user flows. Tests are reported with exact invocation/output and distinguishing mock vs real database/browser/physical printer.
5. **Handoff**: Publish exact branch/commit, diff, passing/failing/blocked gate matrix, live state, source links, and rollback conditions to the central coordination GitHub issue. No claims of deployment without live metadata/role-authenticated acceptance.
6. **Promote**: SaaS Core release owner alone reconciles later frontend/backend descendants and authorizes production promotion after mandatory gates; separate academic approval remains necessary for Grade 9–10.
7. **Close**: Mark feeder branches and past chats ARCHIVED only when all unique findings are recorded and independently verified. Never replace missing approvals with synthetic counts or invented sources.

## 7. Known outstanding issues/risk register

- `P0` Competing agents/chats potentially deploy older code; gated release owner and latest-live ancestry verification mandatory.
- `P0` Grade 9–10 academic approval is not equivalent to imports/counts; verified textbook page/exercise mapping, independent review and 2026–27 applicability remain unresolved.
- `P0` Tenant RLS/runtime restricted-role testing must use authorized disposable clones before production migration; frontend browser checks alone cannot certify database protection.
- `P1` Lesson Planning/Diary new workflows passed initial browsers but clone-based HTTP, real role access, long-page PDF/print and production acceptance were NOT all verified.
- `P1` Connect role/tenant projection and legacy paper document-family migration must be tested without creating an independent data store or leaking staff/private answer data.
- `P1` Historical selection formatting, Teacher Workspace, Urdu/DOCX, multi-mode scoring and legacy/official papers require ongoing regression; issues #2/#3 cannot be declared solved by unrelated green tests.
- `P2` ChatGPT full transcript export/reconciliation remains needed for an exhaustive 100%-of-chats classification; this report is based on accessible summaries, reported titles and recoverable artifacts only.

## 8. ChatGPT limitation and safe cleanup

The current documented ChatGPT workflow allows **Move to project** and **Archive**, but does not offer automatic concatenation/merging of multiple existing conversation histories into a single chat. Use the four canonical MASTER conversations with one GitHub handoff each; archive duplicate histories after unique-work reconciliation. Never invoke account-wide Delete all chats or rely on unverified UI automation for chat deletion.
