# ASSPS Grade IX–X Live Question Bank Independent Mechanical Audit

**Execution date:** 16 October 2026 (PKT); live School 1, read-only SQL, no imports, no personal student data, no question text exported.

## Scope and outcome

**Grade IX:** 1,530 candidate records. **Grade X:** 881 candidate records. **Combined:** 2,411 records, no false `is_approved=true` flags. **Source file IDs present:** 2,411/2,411; **valid printed textbook page locators present:** 0/2,411. The presence of a source-file ID does not prove correctness, applicable textbook edition, accurate page mapping, qualified independent review, or ASSPS textbook adoption.

All **809 MCQ candidates** were machine-audited for exactly four options, distinct A/B/C/D option identifiers, non-empty/distinct option texts, and a correct-option identifier matching exactly one option. **Structurally invalid MCQs: 0**. This confirms **data integrity only**, not whether the chosen answer is scientifically correct.

Across School 1 Grades IX/X, exact same normalized stem within grade + subject + medium: **0 repeated question rows, 0 duplicate groups**. This does not prove near-duplicate or conceptual-equivalence absence.

**Existing source editorial machine QA:** The full 30-batch Grade IX–X source test runner completed with **1,112/1,112 tests PASS** including source SHA review and prepublication contracts. Those results validate an engineering review pipeline, not qualified faculty approvals. Existing question-bank candidates **remain unapproved** for independently academically verified publication.

## Active automation

The hardened hourly `assps-technical-self-verification.service` now adds read-only `grade910QuestionQuality`, `grade910McqQuality` and `grade910DuplicateQuality` to its private receipt. It alerts on newly malformed MCQ keys/options, duplicate exact stems, or falsely approved records missing minimal source/answer evidence. Unresolved textbook pages on pending/draft questions remain a **publication readiness gap**, not a running production outage; it never fabricates page numbers or auto-flips approval status.

**Guardrails:** `NoNewPrivileges=yes`, `ProtectSystem=strict`, PostgreSQL `BEGIN TRANSACTION READ ONLY`, no printer spool use, no teacher/principal impersonation, no real-student-score modification. Ricoh MP C307 hardware acceptance and prior Principal institutional approval continue to be honored without repetitive user requests.

## Honest pending external evidence

For verified Grade IX–X publication, the unresolved items are genuine school-book edition/adoption provenance, textbook page/exercise/source mapping per question, and authenticated **independent qualified faculty correctness review for each question revision**. No agent is authorized to invent these receipts. The zero-human machine readiness process can protect and triage all records without declaring them authenticated faculty-approved.

Coordination: GitHub issues #1/#4. Only the staged and officially versioned approved snapshot may be consumed as academically verified by Paper Studio.
