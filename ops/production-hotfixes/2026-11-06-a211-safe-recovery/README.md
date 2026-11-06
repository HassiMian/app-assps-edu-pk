# A211 — Original Saved Papers Safe Browser Recovery (ISOLATED SOURCE REVIEW)

## Verified limitation
The existing `SavedPapersTab` uses `usePaperStore`, which reads current tenant-scoped browser local/session storage. `getTenantStorageItem(STORE_KEY, { migrateLegacy:true })` passes a migration option that the reader does not implement. Old papers in an unscoped key may be hidden when the session later switches to a school/tenant key, while a new scoped store seeds official First Term papers. No original browser profile or the reported 49 papers were accessible from the VPS; **data loss, restoration and the exact historical paper count are NOT verified**.

## A211 candidate fix — verified admin, read only, encrypted local preservation
- `LegacyPaperRecoveryPanel` is displayed only for Principal/Admin/School Admin accounts inside `SavedPapersTab` and does not modify existing paper editor, rename, delete, tenant storage, or backend persistence.
- Before each inspect or encrypted-export action the existing AuthContext `refreshUser` requires an actual authenticated server `/api/auth/me` request and compares active user ID + school + tenant scope; school switch invalidates consent and current inventory. Failure locks all recovery actions.
- Only four explicitly named browser keys are inspected: legacy unscoped local, legacy unscoped emergency session, current school-scope local and current school-scope emergency session. No enumeration or import of other-tenant keys. Preview displays counts and parse status only, never paper contents. Corrupt files remain untouched.
- Actual export requires an explicit ownership declaration and passphrase of at least 14 characters. `crypto.subtle` applies PBKDF2-SHA256 (210,000 iterations) + AES-256-GCM, random salt and IV, with SHA-256 content integrity; returns downloadable local JSON encryption envelope. Only `savedPapers` and minimal provenance are exported; no store settings, tokens, cookies or account secrets. There is **no automatic import or upload**.
- An optional local encrypted-backup verifier decrypts the user-selected file strictly in the user's browser and checks school identity, integrity hash, authenticated cipher and source count, returning count-only. It never returns papers to the UI or server.

## Tested
- 17/17 focused Node unit tests for roles, source keys, no-write inventory, AES encryption/decryption, random salts, wrong password, tamper, source/tenant mismatch and export safety.
- 6/6 genuine headless Chromium isolated UI tests using simulated browser data, including browser download+cryptographic re-verification, teacher denied and server-school-switch denied.
- A210 backend source/academic regressions and isolated frontend build pass. Full-duration read-only monitor runs separately; repeated cycles do not create or approve school records.
- A211 test fixture's verifyActor is explicitly mocked; a real logged-in Principal on the live site has NOT undergone positive acceptance.

## Release and recovery gates
- Candidate code is NOT deployed or pushed. Original browser-local papers have NOT been uploaded, migrated, merged, deleted or verified on the actual school browser.
- Human authorization for original paper ownership, staging migration with deduplication and paper-editor/print round trips, off-host PostgreSQL full roles/ACL recovery, 73 RLS owner remediation, 220-student academic source gaps and official subject approvals remain outstanding.

**Production decision: HOLD.**
