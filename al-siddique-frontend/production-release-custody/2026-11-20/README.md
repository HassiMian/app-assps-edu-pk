# ASSPS — A335 production release custody (20 November 2026)

## What was captured

This is immutable, read-only evidence of the deployed ASSPS frontend. Included are the original index.html, all 40 directly referenced assets from the active HTML (import-map targets, script tags, stylesheets), SHA-256 hashes for all 1,081 files in the full live static tree, and a Python verifier.

A private full static backup named assps-a335-static-production-20261120T1640Z.tar.gz resides only in Hostinger VPS /root/secure-archive. It was independently restored into a scratch directory and all 1,081 file hashes verified. Its checksum and exact byte size are in manifest.json.

## Verification

- Run: python3 verify_release.py --snapshot .
- Full live comparison: python3 verify_release.py --snapshot . --live /path/to/deployed/site
- Full archive verification without extraction: python3 verify_release.py --snapshot . --archive /root/secure-archive/assps-a335-static-production-20261120T1640Z.tar.gz

## Boundaries

- This does NOT constitute editable-source reconstruction or a claim that a Vite build emits byte-identical current production assets.
- Canonical Git main was five commits ahead of origin/main at capture; this custody branch is based on that commit and does not change main.
- Live includes accumulated hotfixes, hashed base bundles and import-map overrides. Rebuilding without source reconciliation risks replacing the paper generator, diary and navigation fixes.
- A336 unified navigation already exists with 61/61 browser route tests in prior evidence. No duplicate navigation overlay was introduced in A335.
- The owner already regularly edits, saves, reopens and prints papers and daily diaries; do not disrupt or rewrite working operational workflows.
- No production frontend writes, backend restarts, database mutations or staff credentials were used in A335.

## Release gate

Full source parity remains HOLD. Only promote a newly compiled release after the static assets and behavior have been reconciled and tested. Until then, retain current live release, archive and source-custody evidence. Always reverify Urdu/English typography, numbering, original-paper save identity, printing, navigation and diary behavior.

## New A335 deployment guard

The included release_guard.py requires all 26 direct script/style references, all 14 active import-map mappings, and the 40 referenced asset hashes to match this verified snapshot. Test with --self-test to confirm it refuses a missing navigation script. A clean Git source build compiled successfully in an isolated Vite preview, but was rejected by the strict release gate with 80 blockers. This is deliberate: the source build omitted live overlays. It must not be deployed over the existing working frontend.\n