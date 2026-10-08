# ASSPS Phase 5 — Governed academic review workspace and safe source evidence

**Base live release:** 16ab8f346ba27aa6b2e29a8f03c68db32a326cb9, paired frontend and backend.
**Branch:** feat/phase5-academic-review-workspace-forward-20261008
**Status:** Isolated production-style verification; promotion is subject to a new guarded release.

## Teacher/admin workflow

- Authenticated principal/admin/authorized reviewer opens the Grade 9–10 **Academic Review Workspace** from Question Bank.
- Provisional questions may be linked into governed immutable revisions without being approved.
- Source registry lists independent textbook identity records; the reviewer sees source/edition/exercise fields and seven **unchecked-by-default** attestations.
- Original author cannot independently attest and approve their revision. Reviewer may send a substantive reason for correction without publication.
- Author can apply revision-bound changes to question, independently editable MCQ alternatives, correct option, answer, explanation, Urdu/English text and marks. The legacy source row and immutable question revision update atomically.
- Independent review and final publication remain distinct server-side permissions and transitions. No academic attestation is filled, guessed or auto-signed.
- Grade 9–10 provisional content remains ineligible for automatic papers until source-page evidence and academic reviewer checks have been completed.

## Navigation defect fixed

A question can disappear from the first 30 queue rows after its lifecycle/updated timestamp changes or when a different reviewer uses another pagination filter. The workspace now exposes **Open question ID** for direct tenant-scoped fetch, and queue items expose their exact stable question IDs. This avoids reselecting the wrong question by truncated stem text. The backend enforces school and role restrictions for that lookup.

## Automated data evidence

An independent live read-only audit of Grade 9–10 question_bank source records found **5,023 unapproved rows** across tenant ID 1 and tenant ID 5. Source-page column and academic session are missing on all 5,023. Catalog ID registry and answer-key review flags are recorded in the private VPS queues, not blindly repaired. This is a different population from the earlier 4,253 narrower source-linked readiness sample.

Source report: docs/question-bank/ASSPS_GRADE910_LIVE_5023_SOURCE_AUDIT_20261008.md
Private reviewer manifests: /root/secure-archive/assps-academic-review-20261008/review-v2

## Isolated tests completed

- Client schema and direct ID lookup: 10/10 PASS.
- Real authenticated HTTP intake/correction suite: 2/2 PASS against a disposable database.
- Genuine headless Chromium author + independent reviewer + correction + saved revision: PASS. No fake academic checkbox attestations or final publication occurred in this browser proof.
- Existing tenant-scoped API: own admin lookup 200; foreign school record 404; teacher provisional question 404; anonymous and forged token 401.
- OPS/security regression: 101/101 PASS.
- Production safety: PASS.
- Vite production build: PASS.
- Official paper render/print and protected template checks are mandatory release gates.
- Production data changes: NONE from isolated test activity.

## Operational release rules

This is an independent forward integration. Do not deploy dirty Phase 5 feeder worktree directly, and do not override concurrent development streams. A release must prove exact remote source SHA, latest live frontend/backend ancestry, protected paper corpus, tenant RLS, rollback database restore, staging authenticated review browser, and postdeploy health/route/print parity.

**Academic completion requires human independent teacher review.** An automated source hash or AI-generated sentence cannot sign an actual source-page/answer/edition attestation. Until human checks are completed, automatic Grade 9–10 paper eligibility stays HOLD while manual Paper Workspace and printer-neutral PDF workflow stay available.
