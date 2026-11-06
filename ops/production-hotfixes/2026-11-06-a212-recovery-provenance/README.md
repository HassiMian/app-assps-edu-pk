# ASSPS A212 — Same-School Historical Storage + Cryptographic Source-Snapshot Binding

**Scope: isolated engineering source review only. No production deployment, database/role modification, or automated browser data migration.**

## Why

A211's human-authorized, encrypted browser backup could inspect generic unscoped or current-scoped paper stores. If the authenticated user originally saved under `al_siddique_paper_store__school-1`, and the same account later acquired `tenant_id=Alpha`, the current scoped key becomes `...__tenant-alpha`. A211 did not include the prior same-school key. More importantly, the selected source could be modified by another browser tab after inspection and before export: a fresh user/role recheck alone cannot prove the exact paper bytes are unchanged.

## A212 fixes

1. Search **only** a previously valid numeric school ID from the server-verified principal account, adding `prior-school-local` and `prior-school-session` when its current tenant namespace differs. Never enumerate arbitrary tenant-scoped keys or other schools. Deduplicate identical scope+storage references; original keys remain read only.
2. Attach SHA-256 byte fingerprints to each present, valid source snapshot in memory using WebCrypto, not UI or localStorage. Actual AES-256-GCM backup is allowed only when the source bytes hash exactly matches the inspected snapshot. Stale or modified data fails closed; the original browser storage is left untouched.
3. Reject malformed/noncanonical school IDs, oversized paper stores before allocating huge UTF-8 buffers, oversized backup payloads, and mismatch between encrypted payload and envelope capture timestamps. Preserve authenticated user/role/school matching, no-upload/no-import restrictions, and encrypted offline backup re-verification.
4. Confirm source is wired through the **actual** `SavedPapersTab` + `AuthProvider` with mocked authorized server response. Principals see read-only controls; Teachers do not; role downgrade locks access. These are actual rendered Chromium tests, not genuine school login receipts.

## Verification

- 28/28 low-level recovery unit tests PASS.
- 8/8 recovery-panel Chromium browser tests PASS, including same-school prior key, AES backup, download, verify and TOCTOU mutation rejection.
- 3/3 real SavedPapersTab + AuthProvider Chromium integration tests PASS.
- 39/39 combined new regression cases PASS.
- Isolated Vite frontend production build PASS. A208–A211 academic/marks regression suite and uninterrupted full-duration read-only monitor run separately.

## Direct-source limitations

- The actual school Windows workstation was in power-saving standby; original browser profile and previously reported 49 editable papers could NOT be counted or exported through VPS. Original legacy source status is **unknown**, not deleted and not recovered.
- An unscoped generic legacy store cannot automatically prove which school's papers it contains. Human ownership verification is mandatory before any encrypted export; no cross-school merges/imports.
- Disk safety target 16 GiB, 73 generic-owned RLS tables, official Assessment approvals and off-host DB data+role+ACL restore remain release blockers. Historical source cache and backup directories were assessed read only; no evidence files were deleted.

**RELEASE: HOLD.** Reviewed source must not be mistaken for a published fix or completed real browser recovery.
