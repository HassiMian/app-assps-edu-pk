# ASSPS Unified Largest Mission — Production execution receipt, 31 October 2026

One master engineering workstream with a planned 60+ minute scope. Do not claim a timed background job, independent Principal browser acceptance or unmeasured release success. Preserve First Term records, 19 October printing and 20 October PTM, original marks, authorized manually adjusted fees, and prior November invoice IDs.

## Production changes completed and independently verified

- Active students 329. The original eleven Class Eight pupils were already in Pre Nine/Blue. One separate owner-directed historical correction moved a pending pupil from Nine/Fatima to Pre Nine/Blue, after a real backup, transaction rollback rehearsal, COMMIT and movement-audit entry. Now 12 Pre Nine/Blue, zero Eight/Blue. No invented Principal digital signoff.
- That pupil's November-inclusive FINAL payable Rs 6,000 was entered through school-scoped RLS with historical cumulative October balance explicitly NOT added on top; no payment marked paid. Actual November 2026 ledger now 323 distinct student vouchers, Rs 2,100,030 billed, zero duplicate student/month and zero nonzero paid amounts.
- Fee Studio V3 preview now holds missing intermediate months and invalid prior balances, uses latest genuine prior invoice balance once, and preserves owner manual corrections. Focused tests 16/16 PASS; 329 November preview yields 323 existing, 6 held, zero ready. December preview was read only; no December vouchers were created. Code review commit 60624b89.
- Assessment 1-4 were actually created as four school 1 exams (IDs 14-17) for 2026-2027, type Assessment, scope All Classes, 20 total marks and 8 passing marks. No synthetic student scores, saved old exam results remain 1,854 rows. All-class marks selection model tested for Starter to Seven and Pre Nine.
- Exam POST now requires real authenticated creator ID, SERIALIZABLE school-scoped transaction and advisory lock. Duplicate class/session/exam definitions return 409 without an insert. Focused mock HTTP/static tests 4/4 PASS. A proposed unique-index DDL was rejected by the existing protected Exam9 DBA gate and deliberately not bypassed. Database schema and old marks unchanged. Review commit a7c48002.
- Lesson Planning now enforces ASSPS policy: Class Eight has no Second Term; Pre Nine syllabus/plans held until separately approved. Generation, create, edit, sharing are guarded; historical First Term plans remain readable. 15/15 policy tests PASS; four existing plans preserved. Review commit e60eb7c3.
- Attendance has saved records through Oct30: daily record counts Oct26 325, Oct27 328, Oct28 329, Oct29 329, Oct30 328. Independent authenticated role-based save testing remains pending.
- Fresh full production PostgreSQL custom backup created, checksum validated, actually restored to a temporary isolated DB; five table counts matched source (students, exams, official exam results, attendance, fee challans). Restored November totals 323 / Rs 2,100,030 and Pre Nine 12 matched. Temp DB removed. Secure source Git bundle and production route/boot archive also checksum-verified. Offsite disaster recovery is a separate gate.
- Nginx syntax PASS; public /health and /health/ready HTTP 200; anonymous fee, lesson and exam writes rejected 401. TLS certificate expires Dec 14, 2026; certbot.timer enabled. 90/100 public tables RLS on and 86/100 FORCE; core academic and billing tables FORCE. Other exceptions require per-table review, not a blanket policy change.

## Remaining exceptions — evidence cannot be fabricated

1. Six November invoices are withheld: one unclear Mover paper-fund amount, one late-October admission without October fee history, and four same-name students in two identity groups. The latter have differing historical attendance/fee records, so neither random student selection nor automatic merge is acceptable. No historical paid receipt invented.
2. Authenticated Principal and Teacher marks Save/Reopen/View Marks workflow, and attendance role-by-role UI acceptance. Tests passing is not a substitute for an actual signed-in operational test.
3. Paper Studio Saved Papers assessment edit/print acceptance and Lesson Planning original-source page-range approvals.
4. Independent offsite restore and VPS-wide continuity checks.
5. The earlier owner-directed 11-student movement remains distinctly labeled as administrative correction, NOT digitally certified Principal academic approval.

## Safe continuation

Print November invoices from authenticated Fees -> View Challans. Do NOT recreate 323 already-posted November vouchers; the six remaining students stay HOLD until identity and financial components are legitimately reconciled. For Assessment marks, choose saved Assessment 1-4 records and enter genuine student scores. Restrict Second Term lesson planning to Starter through Class Seven. Reuse the single GitHub review branch review/assps-unified-exam-attendance-20261030 for code and all acceptance reports.

## Follow-up acceptance evidence — 31 October

- Marks Register real headless browser tests: 3/3 PASS. Verify zero and
  absent states, denial prevents print, and switching to denied exam
  removes stale results before a 403. This is synthetic UI acceptance,
  not the Principal's authenticated production browser.
- Five isolated lesson schema/engine tests PASS in addition to the 15
  scoped Second Term policy tests. An older integration test expects a
  disposable PostgreSQL target and was not reported PASS; no production
  secrets were copied into that test environment.
- Oct30 attendance readback: 328/329 active children recorded, with one
  Starter record unmarked. No attendance status was invented or changed.
- The official exam/result and attendance review CI must pass for the
  latest consolidated GitHub commit before it is considered source-reviewed.
