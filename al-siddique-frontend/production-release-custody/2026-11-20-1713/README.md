# ASSPS — A343 refreshed production custody, 20 November 2026

Immutable, read-only point-in-time snapshot captured after the live Paper Generator moved from A342 to A343. This contains the exact live index.html and 40 directly referenced script/style/import-map assets. SHA-256 manifest records all **1,083** static files in the deployed tree.

A private full backup named assps-a335-static-production-A343-20261120T1713Z.tar.gz is held under `/root/secure-archive` on the VPS. Its SHA-256 and byte size are recorded in manifest.json. Previous A342 snapshot remains preserved independently.

## Verification and safe recovery

- Run verify_release.py with --snapshot . and --archive /root/secure-archive/assps-a335-static-production-A343-20261120T1713Z.tar.gz to verify all archive files without extraction.
- Run verify_release.py --snapshot . --live /path/to/live/root to compare each live file against this point-in-time snapshot. Changes introduced by subsequent releases correctly trigger drift, requiring a newly reviewed snapshot.
- Use restore_custody.py only with an empty /root/workspace/assps-a335-restore-<unique> destination. The script rejects production and non-empty paths, verifies archive integrity first and independently verifies all restored files.
- Run release_guard.py --snapshot . --candidate /path/to/new/build to block accidental replacement of essential active scripts. Reconcile canonical editable source with current overlays before changing production.

## Release policy

This is **not** a full editable-source reconstruction or approval to deploy a clean Vite build. The source-level parser duplicate-numbering fix is on the A335 branch with 12 passing unit tests and remains unpromoted until source parity is established. Daily paper and Diary workflows are preserved; no production files, student data, database tables or VPS services were modified by the custody operation.

## Exact A342-to-A343 delta

The compare_static_releases.py tool on the parent folder verifies both immutable snapshots, then identifies exactly which assets and import-map targets changed. A342 -> A343: two new A343 Paper Generator JavaScript assets, no assets removed, and index.html is the only previously present file with changed bytes. This proves what changed in the deployed static tree without assuming functional equivalence or editable source parity.

## Release-gate mutation regression

The `../test_release_custody.py` suite checks positive snapshot parity, negative missing A336 navigation, replaced A343 Paper Generator mapping, altered JS asset hash and exact A342->A343 delta. Five local tests passed; the GitHub workflow runs these independently with no VPS credentials or live writes.

## A336 navigation source reconciliation

The audit branch now includes the active A336 navigation script byte-for-byte in source public/assets, referenced from the Vite source index. verify_source_navigation.py compares source bytes against the immutable A343 production snapshot and checks the bootstrap script tag. This removes one known source omission but **does not** establish full source/release parity; the remaining production overrides require separate migration and must stay protected.

## Canonical Diary style reconciliation

The seven CSS overlays already active in A343 production have been copied unchanged into source public/assets. The Vite source index loads them in precisely the vetted production cascade order after the module script. verify_source_navigation.py checks their exact SHA-256 hashes and order against the immutable snapshot, in addition to A336 navigation. This is source-only and does not edit current Diary or paper data. Other runtime JavaScript overrides remain blocked by the full release parity gate.

