# JARVIS WhatsApp backend provenance and admission atomicity audit

Date: 8 October 2026 (UTC). This is distinct from the ASSPS Paper Studio product.

## Observed production state
Production backend metadata points to commit 05443786b580d8d200dcb16b5d9c034fcf5475ab, but two files on disk had different content by 07:24 UTC:
- src/services/whatsapp/jarvisCognitiveCore.js
- src/services/whatsapp/jarvisCognitiveTools.js

Both modified files were captured byte-for-byte into audit source commit 0501f6909bdbae05d24c2558021d834271e0578b; original production files have not been overwritten by this audit. Existing Phase 3 predeploy backup preserves the exact before-state plus SHA-256 hashes.

## Safety finding
New WhatsApp owner/admin admission workflow performed multiple independent SQL transactions (students, student fee profile, fee challan, admission). Controlled failure injection on a disposable production clone produced one student record despite an unsuccessful admission, creating partial data. The initial public-role admission call was denied correctly.

## Source-only correction
- Entire admission workflow now executes in one tenant-scoped PostgreSQL transaction.
- A per-school transactional advisory lock serializes this channel's GR-number assignment and duplicate B-Form check.
- Student, fee profile, challan and admissions entries all roll back on any failure.
- GR assignment derives from numeric maximum rather than ordering by a possibly unrelated row ID.
- Challan number is derived from global student ID; duplicate conflicts fail the transaction rather than silently omitting the challan.
- Month/year/due date are derived from Asia/Karachi time instead of hardcoded October 2026.
- Invalid or negative monthly fees fail before database mutation.
- Owner/Admin authorization remains enforced; public-role student mutations remain forbidden.

## Isolated evidence
Disposable clone: assps_jarvis_provenance_qa_20261008. No school production data was inserted or mutated.
- Before fix: injected challan failure -> student +1, admissions +0, challans +0 (unsafe partial write).
- After fix: same injected challan failure -> student +0, admissions +0, challans +0.
- Normal authorized admission -> one student, one admission, one challan.
- Concurrent authorized admissions -> distinct GR and challan identifiers, both successful.
- Unauthorized public admission -> denied; invalid negative fee -> denied.
- Regression: tests/jarvis-student-admission-atomicity.test.js PASS.

## Release boundary
This branch is a preservation/audit source, not an assertion that a new backend binary or physical printer has been deployed. Backend deployment requires a fresh production snapshot, current app backend SHA and Git lineage, isolated database migration, JARVIS role/tenant tests, deterministic runtime inventory, monitored PM2 restart, live smoke and rollback procedure. Do not deploy this older branch over newer frontend or unrelated concurrent work.
