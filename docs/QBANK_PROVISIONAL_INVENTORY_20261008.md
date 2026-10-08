# ASSPS Grade IX/X Question Bank — provisional starter inventory (2026-10-08)

This checkpoint is **staging-only**, not a publication or import certificate. Branch: `feat/qbank-crossfile-audit-20261008`, forked from `0414424e635391c03ca3683ae4afca343ff8a2eb`.

## Reproducible inventory
Run `node al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/provisionalBankInventory.mjs --strict` from repository root. The command only reads `*Starter2026.json` / `*Starters2026.json` in staging, prints JSON, and fails on duplicate IDs, same-language academic stem duplicates, incomplete core metadata, or publication-allowed provisional files.

Snapshot (2026-10-08): **51 starter JSON files**, **1,988 provisional draft records**, **52 subject/grade/medium cohorts**, **0 duplicate IDs**, **0 same-language normalized-stem duplicates**, **0 missing core metadata**, **0 missing draft answers under the structural heuristic**, **0 files authorizing live import**, **0 academically approved questions**. All 1,988 records contain syntactically valid source SHA-256 fields; a separate direct manifest cross-check found **0 unknown catalog IDs**, **0 manifest hash mismatches**, and **0 missing manifest hashes**. **1,144 records have no verified page number** (null/missing): do not invent pages.

The SHA-256 presence/match does **not** certify page-level grounding, textbook edition parity, answer correctness, or human academic review. The 51 starter files exclude separate chapter-specific authoring queues, so the figures are *not* full-book coverage. The duplicate check is exact normalized same-language stem matching, not a semantic paraphrase detector. Some papers, textbooks, and grade/subject medium combinations remain source-gated. **No production data, protected papers, or Paper Workspace files were changed.**

## Validation
Staging `node --test *.test.mjs`: **500/500 PASS**, including 5 inventory-specific tests, on this isolated worktree.

## Next evidence gates
1. Extend this inventory to a machine-readable official chapter/exercise coverage matrix and to independent authoring queues, without guessing official chapter counts.
2. Acquire authentic actual-board paper PDFs and record PDF SHA-256, page count, board/year/group and *visually verified* objective/subjective page numbers before promoting their hierarchy.
3. Resolve page/source gaps and complete original questions, answer/rubric review and dual-medium checks by subject.
4. Run academic review, source-index integrity, import dry-run and full Paper Generator regression before considering release.

No official 2026 actual-paper stems, passages or answer keys were copied into the Question Bank.

