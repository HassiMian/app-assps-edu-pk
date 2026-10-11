# ASSPS Grade IX–X — complete private teacher-review handoff mission

Date: **12 October 2026**. Owner: Grade IX–X Academic Master. Status: **Full provisional original content prepared for independent qualified subject-teacher assessment, not approved for Paper Studio**.

## Continuation without rebuilding, no production deployment

Based on isolated clean Academic branch `feat/grade910-content-quality-academic-mission-20261011` at `6a32b80d6c87881f5251d26cfa54de54a6d96fb5`. All 2,581 authored provisional original candidate question, answer and option SHA256 revisions from 73 source files preserved. Existing full academic answer/editorial triage, textbook-edition source ledgers, three overlap-pair research dossiers, Ed25519 qualified institutional signature verification and prepublication gates remain untouched. 43 historical completed school exam papers and all Core, Paper Studio, tenant/student, assessment/marks, printing and production are outside this Academic Master mission and not modified.

## What was made operational, rather than another status report

Previous worklists were metadata only; a real teacher could not actually read each question and answer independently from them. The new **restricted offline teacher-review packet generator** is implemented in `ops/qbank/build-grade910-blind-faculty-packets.cjs`, with actual source-identity and publisher-denial tests in `ops/tests/grade910-blind-faculty-handoff.test.cjs`.

- Re-reads and SHA-checks every original question and file; cross-joins all 2,581 original question IDs to earlier source edition/grade/language/page and response-content editorial priorities.
- Creates **two-phase independent academic review**: `.blind.json` contains actual question text and MCQ option text but hides the answer and correct option ID; `.answer-review.json` contains the **unverified original** answer only after the blind first-pass teacher decision. No automatic option reshuffling or scientific correctness assumption.
- Supplies `.unsigned-decisions.json` with eight **unreviewed** academic criteria, independently authored answer field, adopted edition, exam-year and verified topic/printed-page fields, teacher identity and final question+answer revision SHA fields. **All signatures/reviewer decisions are empty** and `academicApproved=false`, `published=false`.
- Splits by original grade/subject/editorial priority with small reviewer batches; uses source revision SHA256 and file source hashes on every item, exact deterministic cross-batch unique ID checks.
- Does NOT create a public/GitHub copy of question/answer content. Private review exports require an explicit `--explicit-private-export` flag and an existing POSIX owner-only (0700) non-symlink directory **outside the repository**. Created files are owner-readable only (0600); duplicate run names cannot overwrite packets.
- On demand, a separate read-only `--verify-private` operation independently rechecks the entire private export's every question/source revision, original record identity, file permissions, file hash, count/duplicates, SHA256 index and **absence of correct answers from the blind stage**. Any tampering fails closed.
- One provisional Grade X Chemistry long-answer original (`X-CHEM-C23-L01`) is **held entirely outside the exported question and answer text**, for restricted qualified faculty handling. Export population is therefore **2,580** safely presented original candidates + **1** deliberately not exported; it is NOT deleted or approved.

## Actual private artifacts created on ASSPS VPS

These files are for appropriately authorized ASSPS teaching staff ONLY. **Do not publish the directory to GitHub or expose it to students.**

- Private directory: `/root/secure-archive/grade910-academic-review-packets/assps-full-faculty-stage-20261012`
- Protected owner-only `INDEX.json` SHA256: `48b3dc0ec4beffba05b770934096b1eed6cafddd449e0f1f121d410dd9c2aabd`
- **167** small reviewer batches (original grade, claimed subject and original editorial priority).
- **2,580 distinct actual original candidate questions** staged in question-first, answer-reference and unsigned-decision documents (3 files per batch), plus protected index and instructions: **503 private files**, approximately **18 MB**.
- **1 deliberately faculty-held Chemistry original excluded**; all original 2,581 retained, untouched, in the SHA-frozen source registry.
- Actual `--verify-private` against the entire real private directory succeeded: **2,580 exact original question/revision SHA matches; 167 complete private batches; zero stale/missing/duplicated public questions; 0 academic approvals and 0 published questions**.

## School teacher workflow and approval boundary

1. ASSPS must authorize actual academic subject/medium teacher reviewers and the adopted **2026–27 edition/exam-year** applicable to each student's grade. The online PECTAA catalogue alone is not a signed school adoption record. The 7 November 2025 Grade IX revised ALP was for **Annual Examination 2026**; it cannot automatically certify Exam 2027.
2. A qualified independent reviewer reads only the blind packet first; records their own correct answer and marks/difficulty assessment; does NOT see old key position, avoiding the original 785-of-875 option-A skew bias.
3. Reviewer may then open the corresponding source-answer packet and compare the existing draft with their independent answer, check MCQ distractors/Urdu equivalence, exact chapter/topic and page if claiming a textbook exercise. For independently authored conceptual questions, do not invent an exercise reference.
4. Any changed incorrect or inadequate original provisional answer/question becomes a **new revision**, and every qualified review/signature must bind to that final question AND answer revision. Reviewers independently resolve the three possible original conceptual overlap pairs; don't delete or label duplicates based merely on machine flags.
5. Formal school school-authorized adoption/independent subject/Urdu/approver signed evidence must go through the separately developed offline Ed25519 school trust-root gate and the canonical published-only integration. All signatories must be real and their identities/qualifications verified out of band; the AI agent cannot sign as a teacher.
6. Only an independently approved revision snapshot can be considered by Paper Studio for its academically VERIFIED picker, after tenant RLS/security/Core release certification and isolated integration tests. SaaS Core exclusively owns actual production deployment.

### Controlled offline commands (not a scheduled task)

```bash
# No question text is printed; this checks full source and family of teacher groups.
node ops/qbank/build-grade910-blind-faculty-packets.cjs

# Optional authorized PRIVATE teacher material handoff, ONLY in a restricted new directory.
node ops/qbank/build-grade910-blind-faculty-packets.cjs \
  --generate --explicit-private-export \
  --base /root/secure-archive/grade910-academic-review-packets \
  --run-id unique-faculty-review-run --per-pack 20

# Independent source-locked verifier of that run before giving private access to teacher.
node ops/qbank/build-grade910-blind-faculty-packets.cjs \
  --verify-private \
  --base /root/secure-archive/grade910-academic-review-packets \
  --run-id unique-faculty-review-run
```

## Academic release verdict

**Prepared for real teachers' independent review, not academically completed**. This work closes the missing practical secure full-bank review-material delivery path. Actual authorized textbook adoption, physical page/exercise proof where appropriate, independently qualified teacher answer correctness/marks/equivalence signatures and ASSPS institutional review are still **unverified**. **Approved=0, verified published=0, verified teacher-selectable=0**. Paper Studio and SaaS Core publication/deployment remain HOLD. Code/test passing or packet delivery cannot manufacture actual school authority signatures.
