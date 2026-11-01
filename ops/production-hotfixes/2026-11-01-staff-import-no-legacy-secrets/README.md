# Staff importer future-credential reinsertion protection — 1 Nov 2026

A live one-off import script had two paths that would store or retain readable staff credentials in employees.portal_password. The dedicated users account already uses bcrypt hashing. Change new employee insert to NULL and duplicate employee update to NULL. Existing hashed user-account logic is unchanged. Production source and this review branch have different overall file digests; these two SQL statements are identical at matching anchors. The full importer MUST NOT be executed automatically against production and has not been run to create/update staff. Existing 14 legacy stored rows are still present and need an independent, controlled cleanup.

Review gate: node --test ops/production-hotfixes/2026-11-01-staff-import-no-legacy-secrets/staff-import-no-secret.test.cjs

This is NOT a Principal approval or real staff login acceptance. No student records or vouchers are changed.
