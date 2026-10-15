# APEX Connect Master — canonical source and exact CURRENT SaaS static restore rehearsal

**15 October 2026, coordination GitHub issue #4. No production deployment. Official release: HOLD.**

## Authoritative latest candidates (no stale sibling promotion)

- This isolated release-rehearsal branch descends from canonical Connect handoff
  `ops/connect-canonical-paper-rebuild-release-gates-20261015`,
  source `79f37292278bef53a40f9f165f58a40b362cf2af`.
- Latest integrated Paper/Grade source owner `integration/paper-term-grade910-current-live-20261015`
  is `1d9291b3c6d55d008f225a1fc6593c97bc1117e3`, newer than
  historical `5f360a36...`. Its Vite frontend release contract and
  clean-source build were already independently verified by Connect/Paper agents.
  Do not overwrite it with an older private source tree.
- Latest reviewed Connect private production BUILD_ID `rc1vIlE6prAQ8pHrw7ohX`,
  associated with auth/security patch `98f6dfcff72fbe9d46d227d5c1200d388300d3d5`.
  Synthetic Chromium and isolated login tests previously passed, but this is NOT
  a public deployment or genuine Muhammad Imran staff first-login acceptance.
- Running public Connect remains `ONDwxEIZlx5onDIKY7wYf`.
- Running Grade SaaS frontend index remains SHA256
  `0af53ae824340f2ddc0b91e848163f8bddad4263d1bb7a7cf92a2bcda923325a`;
  its reachable JS imports still load **legacy**
  `LessonPlanModule-D149cpax.js`, not reviewed recovered
  `LessonPlanModule-DhHP1vdi.js`.
  Merely restoring the CURRENT snapshot is **not** recovery of the improved UI.

## Actual new read-only, isolated technical restore performed

From the existing VPS snapshot archive:
`/root/assps-release-backups/grade-live-origin-forensics-20261015/current-live-grade-root.tar.zst`.
Pinned archive SHA256
`2cfa671d73aebd2120e5c911b1ec668c31faa1b5c2db7b3cb6f794844d2701c1`
verified by SHA256SUMS.

Restored separately into root-private
`/root/assps-release-candidates/grade-live-current-restoration-rehearsal-20261015/`
with `tar --zstd --no-same-owner`. Verified restored and running trees contain
exactly **290 files each, 290/290 byte-identical, no missing/extra files or
symlinks**, including matching current live `index.html` SHA256.

Launched an isolated **127.0.0.1:3119** static HTTP server serving ONLY restored
files (never changing live Nginx). Real HTTP GET of restored `/index.html`
returned 200 and the original SHA. GET of **all eight** direct script/style
asset references from that restored index returned HTTP 200 and exact file SHA.
Stopped temporary server using trap, verified port 3119 closed.
This is a genuine current static archive **technical local restore+HTTP exercise**,
not actual production traffic rollback, database restore, off-VPS recovery,
safety certification or a corrected Lesson Planner deployment.

New repeatable source:
`ops/release/signed-bluegreen/verify-live-grade-snapshot-restoration-20261015.py`.
It validates 7 independent archive/live/restored-file/entry checks, returns
source-only status PASS, and explicitly **HOLD/exit2** for `--release-gate`
without ever attempting public deployment or inventing reviewer signatures.
New disposable file-fixture regression tests:
`test_verify_live_grade_snapshot_restoration_20261015.py` **11/11 PASS**,
including archive corruption, mismatch/missing files, symlinks, wrong HTML,
missing entry asset and false human-signature/production clearance.

## Final live integrity check (read-only)

- School1 Exam9 actual official score entries **1762**, numeric zeros **213**,
  NULL values **0**. Original 301-row MD5
  `bcdc098a3e6cabb6f4c31736b14e39b9` remains unchanged.
- Full-ACL PostgreSQL recovery dump/roles SHA256SUMS both PASS, nginx -t PASS.
- Running Lesson Plans route SHA256
  `435cf755904dcd7fdf74189d5a99d267b8ace98a6627c9180a2375e9dfaaf74f`
  remains unchanged; academic publication guard and reviewed worker adapter
  are not installed in running Core backend.
- CYBERSPACE browser navigated read-only to `app.assps.edu.pk`; it is at
  the school login page and did not supply an existing authenticated session.
  No stored passwords, cookies or sessions were extracted or imitated.

## Genuine production cutover blockers

Current Grade build source can be associated with a byte-identical local
untracked `dist` tree but NOT with independently approved clean source.
Paper Studio/Grade and SaaS Core must review exact ancestry and recovered
Lesson Planner release contract. Existing Muhammad Imran must personally
complete school-issued temporary-password challenge and fresh signed login;
authorized independent School2 / School1 reviewer must genuinely verify
cross-tenant and unassigned-subject HTTP denial without writing school
records; Core must install/certify the signed worker plus guarded academic
Lesson API; approved independent human signers must attest SHA-bound offsite
recovery/rollback/worker runtime and Core must execute monitored atomic public
Next+Nginx/SaaS transaction with tested real postflight.

**Production remains HOLD.** Neither byte-identical backup restoration nor
synthetic browser QA substitutes for authenticated real actors. No marks,
results, passwords, live SaaS files, services, Nginx configs or GitHub owners'
existing branches were overwritten.
