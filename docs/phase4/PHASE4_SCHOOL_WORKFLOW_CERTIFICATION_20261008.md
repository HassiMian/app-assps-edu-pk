# ASSPS Phase 4 — Examination, Printer, Question Bank and School Workflow Certification

**Verification:** 8 October 2026 UTC
**Forward source base:** Paper Results V1 production commit `25536200ff1d891fedf1adb0c7155e943d3372e1`.
**Deployment policy:** preserve Grade 9–10 intake safeguards, Paper Results V1, canonical Paper Workspace, Urdu RTL/Jameel Noori, teacher permissions, RLS and all unrelated SaaS modules.

## 1. Printer destination policy

- Paper Workspace uses the browser's **native operating-system print dialog**; it is not bound to any printer name, port, browser profile or specific PC.
- Users may choose any USB/Wi-Fi/network/shared printer installed and currently available **on the computer from which they print**.
- If the printer is absent or offline, teachers can choose **Save as PDF** and print on the connected PC later.
- Ricoh MP C307 is attached to another PC. Its absence from this laptop must **not** stop PDF creation, Question Bank editorial work or examination workflow.
- Frontend printer destination guidance and manual browser Print/Save PDF regression added. **Physical sheet output remains unverified**, because printing on the separate Ricoh-connected PC was not performed. A website cannot silently enumerate or select local print devices without the browser/OS dialog.

## 2. Examination workflow

- Real isolated teacher login: authenticated canonical Paper Studio access; unauthorized teacher blocked.
- Blank science paper -> question/marks edit -> server revision saved -> Saved Papers reopen -> actual print iframe -> valid A4 Chromium PDF **PASS**.
- Official First Term corpus screen/print text parity: **43/43 PASS**.
- Manual paper authoring remains independent of Question Bank approval.
- Newly deployed Paper Results V1 domain/authorization/HTTP tests **PASS** in a disposable clone. The checker/release results module is preserved.

## 3. Grade 9–10 Question Bank — honest status

Question Bank records are **candidate inventory, not teacher-approved exam content**. Restricted-role read-only audit found:

| Tenant | Candidate questions | Inspected chapters | Academically approved | Ready chapters |
|---|---:|---:|---:|---:|
| school 1: `assps` | 1,608 | 221 | 0 | 0 |
| school 5: `al-siddique` | 2,645 | 382 | 0 | 0 |
| **Separate tenant totals** | **4,253** | **603** | **0** | **0** |

The two tenants have the same displayed school name but distinct legal RLS identities. **No merge or cross-school promotion is authorized.**

All 4,253 candidates lack confirmed source-page/academic-review approval. Tenant 5 source audit additionally flags **272 catalog PDF hash mismatches**; those require source provenance review, not automatic correction. Tenant 1 MCQ option distribution was **485/520 A**, a substantial editorial bias flag, not grounds to falsify answer keys.

A machine-readable, 603-chapter editorial queue and two separately scoped source-evidence reports are in this directory. Academic reviewers must check textbook edition, source PDF checksum and page/chapter, correct answers, duplicate status, Urdu/English medium and curriculum coverage before approving any chapter for automatic generation.

**Exam-ready certification remains BLOCKED for auto-generated Grade 9–10 papers.** Manual papers, editing, saved papers and printing are not blocked.

## 4. Attendance certification

Executed against an isolated production-style PostgreSQL clone and alternate-port backend, with no live-data writes:
- **16/16** full attendance integrity assertions PASS: save, reload persistence, inactive student rejection, cross-tenant rejection, time-zone boundary and atomic rollback.
- **4/4** active roster/hotfix scenarios PASS for unmarked list, active-class roster and invalid/cross-tenant save rejection.

## 5. Fee-payment correction

A genuine failure was reproduced: frontend allows **Bank** payments and the route allowlist accepts Bank, but deployed PostgreSQL `fee_challans_payment_mode_check` rejects it, returning HTTP 500.

Added idempotent, transactional migration `011_fee_payment_modes_v1.js` so the database and backend both allow `cash, online, bank, jazzcash, easypaisa, card, other`. This only expands supported payment modes; it does not fabricate or modify fee amounts.

On disposable clone:
- Migration run twice **PASS**, without changing existing payment data.
- Real authenticated cumulative Cash/Bank payment, payment ledger and replay idempotency **PASS**.
- Invalid/negative/overpayment/reduced cumulative amounts: HTTP 422.
- Cross-tenant challan payment: HTTP 404.
- Production fee records were not changed during this test.

Migration must pass a fresh DB clone/restore/forward-release gate before any production deployment.

## 6. Regression and release safety

- OPS + academic backlog tests: **97/97 PASS** at initial checkpoint; payment-modes contract regression added subsequently.
- Source and teacher-facing Print / Save PDF production build: **PASS**.
- Question Bank candidate/import/legacy governance HTTP: **26 checks PASS**.
- Isolated Assessment Results V1 tests: PASS.
- RLS and production API health must be re-verified **after** guarded deployment.
- Pre-existing minimal Paper Results V1 release metadata is incompatible with the previous canonical release-consistency checker. Treat that as a release gate to repair, not a reason to deploy an older build or claim a false PASS.

**No physical printer was used; no academic candidate was automatically approved; no other tenant or protected First Term papers were rewritten by this phase.**
