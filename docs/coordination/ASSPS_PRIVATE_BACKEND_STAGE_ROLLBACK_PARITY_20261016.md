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
