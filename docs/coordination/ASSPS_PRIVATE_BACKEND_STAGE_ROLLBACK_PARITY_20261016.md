# ASSPS Core private backend staging and rollback parity — 16 October 2026

Core owner: SaaS release/security. Scope: **read-only audit**; all student marks/results/papers/fees and live backend unchanged.

## Fresh genuine VPS verification
- Active baseline source: clean Core `audit/core-worker-peer-scope-20261016@04425dbf40ae75e7f326c62b778fb13c4866efb1`. Reviewed immutable backend stage `/root/assps-release-candidates/phase1-backend-green-bfd7a35eb514` records feeder commit `bfd7a35eb514a67e06705ae57b028c2eb5119488`.
- Entire stage directory root-owned mode 0700; manifest/three-file original archive root-owned mode 0600; archive SHA256 matches the immutable manifest `2218e33e7471d1462bad8064022c5db64f068874b2727a745e7eedec107286e0`.
- Five scoped overlays from stage SHA256 match exact current Core reviewed source SHA256 and stage manifest individually: AI worker DB adapter, Paper AI queue, Lesson Planning academic publication guard, lesson routes, ops routes.
- Three original files in archive match **currently running live backend originals** exactly: Paper AI queue, lesson routes, ops routes; archive has no unexpected entry, link or directory.
- Stage status `PRIVATE_STAGE_ROLLBACK_PARITY_PASS_NOT_RELEASE`, `reviewedOverlayCount=5`, `rollbackArchivedOriginalCount=3`, `liveBackendAdapterDeployed=false`, `releaseAuthorized=false`, `signedProductionTransportCertified=false`, `independentOffhostRecoveryCertified=false`.
- Fail-before/fix-after actual verifier result: first attempt ran with wrong parents[] source-root resolution, `HOLD` with exit2. Corrected to `parents[2]`; genuine live data check then PASS. Source-root path regression is covered by 15th unit test.
- 15/15 hermetic tests PASS. They fail closed on archived hash drift, extra archive entry, source/live mismatch, changed stage SHA, wrong source feeder SHA, foreign overlay, privileged file mode, secret copy, missing rollback or running adapter unexpectedly differing.
- The live PostgreSQL true marks state remains protected; this audit never connects to the database or loads any private backup bytes into a remote connector.

## Boundaries
- The staged three-file rollback protects exactly the named source files and is not a full independently signed off-host disaster recovery. The old pre-existing candidate is still private and cannot be promoted without final Core release gate.
- No production PM2/Nginx restart, backend source replacement, tenant RLS migration, secret handling, student record writes, printer job or academic question publication.
- Production still remains trusted-gate HOLD 6/13 per latest actual Core signed-check run; real signed off-host restore, reviewed current full-ACL backup adoption, installed worker signed transport, and independent peer-school authenticated denial remain necessary.

## Additional actual runtime and latest signed gate — same mission

- The installed **read-only** phase-1 worker script was reviewed for SELECT-only operations, then actually invoked under Unix OS identity `assps_ai_worker_login` using the pinned restricted peer-socket PostgreSQL connection, reviewed worker adapter, queue role and non-secret peer socket configuration. Actual **Node.js runtime returned exit0/PASS** with `sensitive_acl_denied=5`, `protected_sql_denied=2`, `queue_read_verified=3`, `production_data_modified=false`, `backend_cutover_performed=false`, `signed_tenant_or_offsite_receipt_issued=false`. This is real Node adapter execution rather than catalog-only proof; production backend worker still not installed.
- Verified **newer** Connect hardened cross-owner `integration/connect-phase-gate-lint-20261016@602ae2035bc3fb0055b15d4d7dc3044d960b6ad8` with **24/24** release decision/security tests PASS. Ran its authenticated-signature-exit-aware four-phase gate against its exact allowlisted current reviewed Core `017d51060349e39150ebd508d0d670c10eb15f5f` and actual deployed public frontend/Next provenance; phase1/2 PASS, phase3/4 HOLD, official status `HOLD` **6/13** (7 signed transport/offhost/worker/live/tenant blockers). No source/production files changed, no false PASS for exit2.
- This stage parity branch contains 15 source tests and inherits 67 previous Core regression tests (**82 distinct Core tests**); newer Connect runner contributed a further 24 (**106 combined tests in the inspected suites**). Private Next optimized-build provenance verifier also PASS, but this is not 13/13 live deployment acceptance.
- This report cannot replace independent signed offhost recovery, current officially pinned ACL backup acceptance, genuine separate signed production worker installation and authenticated School2/unassigned subject refusal; no mutable deployment flag changes.
