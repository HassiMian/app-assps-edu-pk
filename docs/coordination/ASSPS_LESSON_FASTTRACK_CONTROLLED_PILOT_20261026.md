# ASSPS Lesson Planning controlled-pilot fast track — independent, fail closed
2026-10-26. Proposed review branch, never an authorization to deploy.

## What was actually confirmed
- Integrated Lesson candidate parent HEAD `b0e3bfab754b`, existing frontend dry run `READY_FOR_CORE_GATE`, not production deployed.
- Contrary to stale previous notes, the *running backend source file* `lessonPlanningPublicationGuard.js` is present and SHA-equal to reviewed candidate; running `lessonPlanRoutes.js` contains publication, deletion, immutable source lock guards. It does NOT contain the new leadership-only readiness endpoint that candidate includes. An on-disk file match alone is not a live authenticated staff acceptance receipt.
- From current 26-Oct local critical backup, disposable Unix-socket restores of both clusters PASS, main 63 and signed 36 databases, application catalogs PASS; latest independent encrypted offhost restore remains unverified.
- Anonymous lesson plans GET responds 401; production public homepage responds 200. This does not establish school-specific tenant access.
- CDN still exposes cached private child/fee branding objects intermittently; Cloudflare authenticated purge is not available. Scoped 29 private URL purge manifest is held locally under root-only access. Do not include it in GitHub.
- 3 existing lesson plans, 54 teacher assignments, 1 canonical class/subject match, 53 unmatched; no student/parent shares. Pilot should first validate existing private editing workflow, not publish any uncertified source content.
- Isolated backend tests 25/25 PASS when referencing installed dependencies through a read-only NODE_PATH; initial missing express package yielded 17/19, NOT an assertion failure. No production code modified.
- A read-only pilot gate with independent missing-evidence detection is included. 9 focused policy test groups PASS. It has no bypass/force/deploy flag.

## Independent staged mission path
1. Obtain verified Cloudflare zone authorization, purge exactly known scoped private media objects, then independently probe full inventory across edge locations and repeats. Do not assume clean on a single cache MISS.
2. Obtain approved independent encrypted offhost recovery proof for current dual PostgreSQL clusters, protected media and rollback assets.
3. Verify actual signed Core release, strong School 1 Principal/Teacher login/revision-bound Save -> Reopen -> Update -> Print, and independent School 2 explicit denial; preserve exam marks, grade and rank semantics.
4. Obtain protected real Urdu Nastaleeq A4 printer witness and owner approval for a **small specific reviewed lesson**. Do not bulk-share draft content, spoof actors or invent page references.
5. Use isolated, session-limited controlled pilot after the feature-only checks are all PASS. Rehearse rollback; keep existing frontend, Nginx config and databases intact. Expand only after documented school acceptance.
6. Grade 9/10 QBank general unapproved items are NOT intrinsically part of this **lesson-only** release, but shared private media, authentication, provenance and recovery remain hard dependencies.

## Explicit approval constraints
NEVER treat this doc, scripted boolean checks, synthetic assertions, SSH push access, source SHA parity, or frontend dry-run output as certification. Genuine independently signed operational evidence is required for every remaining sensitive gate. Pushing this review branch does not update main, public site, Nginx, systemd/PM2 or school database.

## Scoped Cloudflare purge, credential-gated
- The review branch also includes `ops/release/assps_cloudflare_private_scoped_purge.py` (dry-run by default) with 9 isolated validation tests.
- API method: Cloudflare `POST /zones/{zone_id}/purge_cache` with **only** `files`, never purge_everything/prefix/hosts. Needs a zone-scoped `Cache Purge` token in secure environment; no token is stored in git or reports.
- Execute requires the exact manifest SHA, intentional `--authorize-scoped-purge`, and a separate successful independent private-media recheck to finish the gate. At this writing the token and zone authorization are absent; no purge has been sent.

## Static cached-browser compatibility (new read-only finding)
- The currently serving legacy static release contains 575 files and the reviewed b0e3 candidate static build contains 94 files. Merely switching Nginx roots would make 4/8 current index asset references unavailable to browsers using cached old index HTML.
- The new **offline-only** `assps_legacy_static_asset_overlay.py` composes a *NEW* isolated preview root and verifies live index SHA, reviewed candidate index SHA, all copied hashed JS/CSS checksums and old index bootstrap asset closure. Current verified inputs yield 548 hashed legacy fallback assets, 5 non-hashed / backup-suffix legacy assets excluded, candidate index unchanged.
- The script refuses source drift, symlinks, path-collisions, unbounded assets, missing cached-index bootstrap references and every output path that does not belong to the expressly isolated private preview prefix. It never writes to live Nginx static roots.
- This improves stale-browser asset compatibility only; it is not proof of source provenance/signatures, content authority, privacy, active user sessions, dynamic dependency stability across releases, or release authorization. The existing official Core signed gate still must approve a future cutover.
- Actual live database records, frontend Nginx root, PM2 state, and private branding assets remain untouched.

## Cloudflare 26-Oct private inventory drift and safe auth handoff
- Current private cache-protected origin inventory changed **29 to 30** (one newly created birthday/private asset). Existing 29-URL purge manifest is stale; purging it alone would leave newly created content uncovered. Original 29 URL list is preserved under root-only storage, and a new root-only 30 URL manifest is generated/pinned with fresh checksum; no private filenames are in this Git repository.
- Dynamic private inventory is strictly bounded to 1–100 allowed private branding images, with SHA-pinned reviewed manifest and on-disk exact matching; any new or missing private asset fails closed. 11/11 scoped-purge validation tests PASS.
- Root-only, TTY-required Hostinger VPS one-time command: /root/workspace/assps-lesson-certification-20261026/assps_cloudflare_secure_one_time_purge_20261026.py. It checks exact on-disk private inventory and all 30 origin HEAD/GET denials, then prompts for 32-hex Cloudflare Zone ID and hides zone-scoped Cache Purge API token with getpass. Never pass the token via chat, command arguments, shell history, or Git; explicitly confirm "PURGE 30 PRIVATE URLS". It executes the reviewed file-only API helper and performs 5 independent post-purge verifier rounds before recording root-only receipt.
- A Cloudflare API 200/success only proves request accepted. It does NOT certify private CDN denial; real multi-edge HEAD+GET checks and no recache must pass. In this checkpoint authenticated Cloudflare credentials were NOT delegated, web dashboard navigation 403, no API purge was called and the private CDN remains HOLD.

## Critical recurring-backup coverage gap uncovered 26 October
- Existing daily `/usr/local/sbin/assps-critical-backup` captures PG databases and current app/config assets but **omits `/var/uploads`**. This contains important live branding, receipts and payment screenshots. The existing 26-Oct archive is valid for what it contains, not a full media-inclusive disaster recovery package.
- Created separate local dated 26-Oct root-only media snapshot for `/var/uploads`: 528 regular files, 216,969,364 original bytes, gzip+SHA256 checked. A disposable isolated restoration reproduced 528/528 regular files, exact total byte size and zero links. No production file was modified.
- Prepared one additional CMS RSA-recipient AES-256-GCM encrypted ciphertext media archive, with root-only hash. Ciphertext envelope and local source snapshot verified. **This is staged on the same VPS, NOT transferred or decrypted with the independent Windows recovery key**.
- New `ops/release/assps_media_recovery_coverage_gate.py` and eight fail-closed tests independently reject missing/corrupt archives, traversal, absolute paths and symlinks. Never log private names and never claim remote recovery.
- **Do not silently modify the live nightly backup service:** enabling regular media-inclusive snapshots requires tested storage-capacity/retention policy and reviewed production change. VPS remains above 86% disk used, beneath its 16 GiB capacity safety threshold.
