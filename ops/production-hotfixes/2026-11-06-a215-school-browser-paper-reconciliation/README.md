# A215 — Original school-browser paper reconciliation, evidence-only

This is a review candidate, not a production migration or database write.

## Source preservation and school identity

School 1 must be verified by a live Principal/Admin server identity before using LegacyPaperRecoveryPanel. The inspected source must be bound to BOTH user.id and user.school_id, not merely a reusable tenant code. A SHA256 attestation of the exact browser Local Storage bytes must remain unchanged until reconciliation. tenant-default and unknown generic tenant keys are not silently swept as same-school records; these require supervised provenance proof. The inspector cannot traverse other Chrome/Edge profiles automatically.

The read-only comparator shows paper counts, distinct IDs, overlap, and body-level revision conflicts across the currently authorized sources. It never merges, imports, deletes, or sends paper contents to the backend. Conflicting paper bodies or missing IDs require manual owner decisions, and each original source should be separately encrypted with a strong passphrase before any authorized migration.

## Tests

    node --test al-siddique-frontend/src/Modules/Paper-Generator/legacyPaperRecovery.test.mjs al-siddique-frontend/src/Modules/Paper-Generator/paperRecoveryReconciliation.test.mjs

Expected: Principal and school bound; changed snapshot SHA fails closed even if count unchanged; duplicates and invalid IDs reject; 49 versus 58 snapshots correctly show nine extra IDs and revision conflict; no auto merge; unknown tenant-default is never automatically imported.

## Release authority

Do not treat the 49/58 synthetic test fixtures as proof of production records. The original Windows forensic inventory and DPAPI backup evidence live outside this Git source tree and were verified separately. DPAPI CurrentUser ciphertext is same-user local restoration only, not an independently certified portable or off-host restore.

A214 academic gate and all four published attendance shells still block production. SaaS Core sole release owner must approve repository ancestry, test artifacts, signed Academic subject catalog, source-provenance reconciliation, full off-host DB restore, disk headroom and rollback before any release. NEVER bypass A214 HOLD or copy original paper plaintext to GitHub.
