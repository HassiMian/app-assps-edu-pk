# ASSPS Paper Studio — authentic institutional acceptance and Core release runbook
2026-10-12. Owner: Paper Studio Master. Coordination: GitHub issue #4.

## Evidence hierarchy and source freeze
- Engineering evidence: the original published Paper 16-gate proof is for source commit `2b020bcb22c8edb0cdbdb23c03e5e1dec1e065dd`, not automatically for newer security-overlay code. The independent offline verifier `ops/paper-studio/verify-paper-offline-evidence-20261012.py` binds exact source SHA, exactly sixteen gate names, complete TAP counts, nonempty independent log bytes and SHA256 checksums. Running all tests on a new source commit needs NEW logs, not the old manifest copied as success.
- Candidate role: Paper owner maintains the canonical Paper Workspace, Early Years, Daily Diary, Lesson Planning and PDF/DOCX fidelity. **SaaS Core owns all production system changes.** Grade IX/X faculty and school evidence are independently owned.
- Original release worktree contains unrelated untracked `argus_mt5_paper_journal.json` and `argus_paper_store.json`. Do not delete, stage, reset or bundle these. Construct any paper release from a clean Git checkout, never raw dirty worktree tar.
- Off-VPS independent network negative smoke and v4/v6 ingress protection have been reported; verify them at release time. Historical live `apexos_user` has BYPASSRLS, while later Core signed guard policy applies to 77 tables on **disposable clone** only. Signed 77/77 on clone **does not mean 77/77 in production**. Review current Core source and production again before final cutover.

## Institutional gate A — authentic First Term Exam 9 marks (School Principal and assigned teachers)
1. Use **the existing authorized accounts** through public HTTPS; never share passwords/cookies with external agents, never impersonate a teacher, and never invent examination marks to obtain a green badge.
2. Record actual exam ID 9 and class/section selection, roster cardinality (no student names in public GitHub), subject entitlement and teacher assignment. Ensure a signed teacher can view only assigned cohorts and a different tenant or unassigned role is denied. Redact any school/student details from public reports.
3. Enter/save only staff-verified official marks. Reopen the same exam after hard refresh. Verify blank means *unentered*, while a genuinely entered numeric zero remains zero. Retain read-only, redacted before/after evidence and server revision IDs privately.
4. Render each of the nine Result Card templates on genuinely scored class/section data. Check roster isolation, class All vs section, totals, ranks where configured, preview/print parity and no unauthorized student leakage. Retain anonymized nine-template checksums or local protected screenshots; do not commit grades or student identities.
5. Mark `HOLD` if teacher session, authentic marks, cross-tenant proof or actual scored print cards are unavailable. Synthetic Chromium fixtures and disposable auth-clone tests remain engineering-only.

## Institutional gate B — connected school hardware print (School operator and Paper Studio)
1. Print a **non-sensitive representative sample** (not a student's private result) from the real teacher browser on the physically attached printer. Record model/driver/paper size and operator/date in a private evidence sheet.
2. Test multipage Urdu Jameel Noori Nastaleeq A4 **and** A5: right-to-left line wraps, MCQ closing bracket and option order, marks alignment, table boundaries, print borders, page breaks and unanswered answer lines.
3. Test English and Mathematics Times New Roman, vertical arithmetic, headers, equation spacing and black-and-white contrast; check all pages, not just first page.
4. Export DOCX and PDF from the same paper, re-open the DOCX in an ordinary school editor and compare the printed output with the Paper Workspace preview. Record specific mismatches and the inspected printer output securely.
5. Do not certify physical printer acceptance from a downloaded PDF, browser screenshot, or simulation. Mark `HOLD` until operator-witnessed physical output exists.

## Academic gate C — qualified Grade IX/X content approvals (Academic Master)
- Adopted school edition, medium, examination board/year, original question+answer revision evidence and independent subject/Urdu reviewers must be authenticated through Academic Master. No provisional `RESEARCH_CANDIDATE` may be promoted as verified question content based on source automation alone. No school/tenant-crossing bank imports.

## Core gate D — effective security and reversible production cutover (SaaS Core)
- Validate actual production non-BYPASSRLS runtime actor and signed RLS on required tables, policy scope and explicit signed HTTP role/tenant negative and positive tests; distinguish reviewed green Marks subset from full legacy management and backend routes.
- Certify direct-node network deny from outside the VPS, loopback upstreams, public HTTPS, and no regression to existing connect/application routes. Use no unauthorized private API probing.
- Confirm deployment source against exact GitHub commits, protected template hashes, live school database backups and restoration, root disk headroom, Nginx/PM2 configs and actual rollback drill. A source-only green unit suite cannot replace live cutover evidence.
- Publish one `GO/NO-GO` with separate engineering, institutional, physical, academic and full Core security gates. Only the SaaS Core Master may deploy. No production change is authorized by this document.

## Explicit current status
`PAPER_BASELINE_16_GATE=PASS`; `REAL_EXAM_9_STAFF_MARKS=PENDING`; `NINE_REAL_SCORED_CARDS=PENDING`; `PHYSICAL_NASTALEEQ_PRINT=PENDING`; `GRADE_IX_X_HUMAN_APPROVAL=PENDING`; `FULL_PRODUCTION_SIGNED_RLS=HOLD`; `PRODUCTION_CUTOVER=HOLD`.
