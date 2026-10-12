# ASSPS Paper Studio — font and Core restore reconciliation (12 October 2026)

Owner: Paper Studio for PDF/print and QA; SaaS Core for production database, security and deployment; Academic Master for Grade IX–X approvals. Coordinate via GitHub Issue #4.

## Checkpoint 1: genuine Core recovery progress
Uploaded report listed Core 0cddd2c9 and an earlier restored-app-ACL HOLD. Read-only current verifiers on VPS actually return:
- verify-fresh-restore-data-parity-20261012.py => EXIT 0 PASS_RESTORE_PARITY_ONLY. Live and isolated restore match: 322 students, 12,181 attendance, 901 challans, 129 payments, 2 exam results, 88 public tables, 368 policies, 78 FORCE tables, policy-definition digest.
- verify-fresh-restore-acl-parity-20261012.py => EXIT 0 PASS_ROLE_GRANT_PARITY_ONLY. Both permitted Core runtime roles now match 75/75 SELECT, INSERT, UPDATE, DELETE grants between live and restored catalogue. This is NEW progress compared with the older uploaded report; it is not authenticated HTTP acceptance.
- verify-fresh-restore-global-roles-20261012.py => EXIT 2 HOLD. Target does not contain cluster-global source owners apexos_user and apex_paper_owner; 176 ACL/default ACL archive items and the privileged legacy owner require a reviewed SAFE non-BYPASS mapping. No complete production rollback has been certified.
- Latest Core ops-only restore code 0cddd2c9 was applied in an isolated Paper source branch with no source conflict; four Core restore/readiness unit suites 6+8+8+12 = 34/34 PASS. No production database, service, role or printer writes.

## Checkpoint 2: actual Urdu PDF typeface fidelity issue
Two preexisting samples /tmp/Starter_Urdu_A4_Print.pdf and /tmp/Starter_Urdu_RealProduct_A4.pdf were inspected read-only. Both have PDF font dictionaries listing NotoNastaliqUrdu, DejaVuSans and Liberation fonts but NO visible Jameel Noori Nastaleeq PDF font. Exact two-sample preflight returned HOLD_FONT_PARITY, exit 2.

Canonical Editor V2 typography uses @font-face with local-only Jameel Noori Nastaleeq and a Noto Nastaliq fallback. PTS print iframe also references local font names. Consequently an endpoint without locally installed Jameel can silently print using fallback, even when A4/PDF layout and RTL geometry tests are green.

NEW read-only guard ops/paper-studio/verify-urdu-pdf-font-20261012.py verifies guarded file type, PDF header/trailer, and actual visible /FontName and /BaseFont token metadata. It refuses substituted Noto-only PDFs; 8/8 synthetic adversarial/positive tests PASS. This preflight does NOT prove the shape of printed glyphs, actual browser availability, or connected printer output. The samples are historic files, not proved to originate from the new release candidate. Do not silently count this font gate as part of the previous green 16/16.

Windows workstation queue observations remain conflicting across earlier agents: Ricoh MP C307 and Samsung M2070 were once listed on USB and offline; another later report listed virtual PDF only. Latest workstation standby prevented fresh printer proof. No hardware print was executed or witnessed.

## Checkpoint 3: exact ownership and NO-GO conditions
Paper Studio 16/16 automated code QA remains valid on byte-identical tested frontend/backend. Genuine signed teacher/Principal First Term Exam9 marks Save-to-reload, actual zero vs blank, scoped nine scored Result Cards and cross-tenant denial are PENDING and must use genuine school staff records, never test marks.
Physical A4/A5 multipage Jameel Noori Nastaleeq output, option brackets, borders, English/maths and PDF/DOCX print parity require licensed school-installed font where necessary and a witnessed connected printer. Font metadata alone is a preflight, not hardware acceptance.
Grade IX–X unapproved questions remain research-only until school textbook/year, faculty and Urdu signoffs under Academic Master. VPS capacity is below 6 GiB headroom threshold; preserve backups and worktrees.
SaaS Core must remove live BYPASSRLS runtime reliance and independently certify full signed 77-table production RLS, authenticated principals and peer tenants, complete global-owner role recovery and reversible service rollback before any cutover.

Release: PAPER_SOURCE_QA=PASS; RESTORE_DATA=PASS; RESTORE_ACL=PASS_NEW; RESTORE_GLOBAL_ROLES=HOLD; JAMEEL_PDF_SAMPLES=HOLD; PHYSICAL_PRINT=HOLD; REAL_EXAM9_MARKS=PENDING; FULL_PRODUCTION_RLS=HOLD; DEPLOYMENT=NO_GO.

## Agent-execution handoff
SaaS Core DBA: on a disposable restore clone only, reconcile missing source-owner/global roles and ownership-dependent ACLs with explicit safe non-BYPASS mapping; verify correct grants, RLS and real signed allowed/denied HTTP flows before requesting release approval. Do not migrate production or retry privileged actions without approved Core gate.
School print operator and Paper engineer: recheck current attached printer queue/USB/driver; verify institutionally licensed Jameel Noori in actual browser and print path; export non-PII Urdu A4/A5 and English/maths samples, run font preflight, inspect full pages on physical printer, record private signoff. No substitute-font claim.
Principal/teachers: use existing authorized school sessions and genuine Exam9 marks, verify Save/Reload and all nine Results Cards, record redacted evidence. Academic Master separately certifies eligible Grade IX/X content.
All owners: publish exact source, tests, errors and pending human approvals on GitHub Issue #4. Do not schedule or claim deployment without all mandatory gates passing.
