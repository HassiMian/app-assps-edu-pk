# ASSPS Examination Result Cards V2 — Final P0 Production Acceptance

**Date:** 15 October 2026, before 23:00 PKT. **Active public URL:** https://app.assps.edu.pk/exams/results (navigate through Examination → Result Cards).

## Prior failure and protected scope

Previously the result workflow selected the first student automatically. The preview modal only displayed the first card, and the All Classes fallback could combine records from different exam terms. School-owned 1,763 saved exam-result rows, including 213 authentic zeros, were protected; Grade Setup and Paper/Daily Diary/Login fixes must remain intact.

## Delivered

- First Term exam starts with Whole Class mode, chooses the first real class with saved records after async load, offers class, optional section, and **optional individual student**. Selecting no student prints the full selected class/section. A selected student prints only that student.
- All Classes means all verified students of **the selected examination only**, never other terms/exams. The batch has one A4 card per student. Preview modal shows card count with Previous/Next and opens one all-cards document for Print/Save PDF.
- Existing nine premium themes preserved: Signature Editorial, Swiss Grid, Data Atelier, Regal Linework, Young Scholars, Academic Heritage, Airframe Geometry, Corporate Ledger and Examination Dossier. Added a genuinely separate tenth, Scholars Archive, with elegant navy-teal archive design.
- Shared typography polish across premium designs: stronger subject label 9.1pt and marks 8.8pt on A4 print, more readable column headings and student identity, restrained palette, consistent alignment and page-break rules.
- Pre-existing printReadyScript kept unchanged: verifies school logos, font readiness, printable A4 bounds and actual print service before auto-printing. Whole-document preview does not auto-print until the authorized operator clicks Print.
- Smoke Test Exam 123 (school=1, exam=6) had zero references in nine exam-related tables including actual marks; its exact database record was privately snapshotted to the protected release-backup location then precisely one row deleted in a transaction. First Term and Assessment exam retained; original total mark rows/true zeros remained **1763/213**, both school tenants unchanged.

## Browser QA and isolation evidence

- Synthetic browser acceptance PASS: Class One/Section A returns exactly **2 student cards in one popup**, excludes Class One/Section B and Class Two; chromium output A4 PDF contained exactly two Page objects. Optional Student 101 changes scope to exactly **one** card; All Classes switches to exactly **four** cards in a full document with all four synthetic students.
- Ten premium selector tiles presented; new Scholars Archive preview selected successfully; actual numeric zero remained **0**, not blank/absent. The live-only source build passed Vite.
- Production staging: exact previous live static root `/var/www/assps-marks-loginloop-recovery-20261015` index SHA256 `ddb923aaa3157b90a53b9c2aa94b12e612d911c02bcb1baaf683100fb8de1b33`. New current root `/var/www/assps-resultcards-premium-v2-20261015` index SHA256 `dc5d20ad39a52a69519214af0dbd6eadc682a0e43cb21fd35f67952f1f3bacbb`. Existing 542/542 public files preserved byte-identical except versioned index; 62 additive hashed assets; no static deletions. App/API 200.
- Active compiled Result Cards V2 guard PASS, 10 premium template identifiers reachable from the live entry module; Marks Review active graph PASS; Daily Diary controller graph 11/11 PASS; login-compatible GET routing 3/3 PASS.
- Protected apply/rollback scripts staged. Previous full static root archived in `/root/assps-release-backups/resultcards-premium-v2-20261015/live-frontend.tar.gz`, SHA256 `ca1a622a1dedf52085e8ade9c5b9c1619a9fd672f9cf97411391e61c90bc8f9e`, plus original app Nginx config; dry-run rollback PASS.

## Accuracy boundary

Production frontend deployed and health verified; live authenticated Principal session → actual school printer physical acceptance cannot be independently asserted without operator credentials/printing. Full-stack SaaS Core signed-worker certification and independent school tenant pen-testing remain separate; this was a static-only frontend UI release and one authorized zero-reference smoke-test exam removal, not any bulk marks import or grade recalculation.
