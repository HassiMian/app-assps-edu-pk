# ASSPS Core — 19 October signed-85 and immutable live artifact follow-up

## Authenticated source and deployment distinction
This commit is isolated source QA, NOT a production backend promotion.
Live service continues to run an independently assembled historical
/var/www/apex-backend/src tree, without proven Git source ancestry.
The newer live Nginx frontend root is
/var/www/assps-resultcard-nazra-purged-20261019, not 8d2d2315.

The served frontend index was SHA256
3c74d3be652b41549ef2129eaacec4c341c05c2118597e308edffd17a33726a9
at 2026-10-19 16:01 UTC. Its sidecar
assps-release-attestation.json claims index SHA
8fdadfe46cc2c84357b819d11cee79b68c7a2ff663b3b2f2e630d6efbf571c54
and unavailable candidate commit
575438b839d73b5c03f9721380231a44363f593b.
The new read-only frontend provenance gate correctly exits 2/HOLD.
Do not repin a moving public artifact or overwrite it with an older candidate.

A complete root-only immutable snapshot of 296 active frontend files was
preserved at
/root/secure-archive/assps-unified-20261019/frontend-immutable-snapshot-20261019T1600Z.
Original pre-copy, post-copy and copied SHA256 maps are IDENTICAL; manifest
is root-only with full per-file digests. Snapshotting has NO live write impact.

## Live Core DB signed catalog source reconciliation (READ-ONLY)
The reviewed candidate helper used to hardcode 82 FORCE RLS tables.
The current live excluded-historical-audit catalog has 85:
- 85 FORCE RLS and 85 ENABLE RLS tables,
- 77 original restrictive signed core policies (73 school, 4 tenant),
- five approved academic policy identities,
- three additional document policy identities.

ops/release/security/verify_signed85_catalog_live_readonly_20261019.py
executes the precise source-candidate queries against apexos in
BEGIN TRANSACTION READ ONLY and checks all core+academic+document counts.
Live result PASS 85/85/77/73/4 + 5 + 3. It neither migrates policies nor
asserts that real signed HMAC actor sessions are certified.

The candidate school document guard is now exact deparsed predicate and
WITH CHECK matching, not only LIKE-based string checks. In disposable PG16
the exact three policies PASS; intentionally weakening one restrictive
document policy with OR TRUE makes the attestation drop from 3 to 2.
The negative test PASS confirms this candidate refuses that weakness.
The disposable PG16 cluster is discarded after tests.
Source unit suite 17/17 PASS and synthetic frontend attestation suite 1/1 PASS.

## Remaining hard release gates
Live front-end artifact source commit/attested metadata mismatch; live backend
source mismatches; principal/teacher and genuine School2 auth acceptance;
signed runtime HMAC identity and privilege separation; protected timetable
editing (legacy POST ingress HTTP403, candidate draft route not deployed);
held 59 academic sources; separate recipient-key offsite decrypt and real
two-cluster restore; witnessed physical Urdu A4 laser printing.

Post-assignment backup data, rollback preflight, student/exam/zero/54-staff
invariants must be rechecked before any later release promotion. These gates
cannot be overruled by user general approval or mock tests.
