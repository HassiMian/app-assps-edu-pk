# APEX Connect MASTER — unified mission / latest Core E301 security release gate

Date: 16 October 2026 PKT. Verdict: HOLD_NO_PRODUCTION_CUTOVER.

## Phase 1 — exact current source reconciliation, no restart

Latest canonical Core/Paper reviewed candidate is integration/core503-truefalse-http-marks-release-20261016 at e301273e0d055667dc7b0787593839a006fb97f7, an independently verified three-commit strict descendant of previously reviewed Core 638025c86a949b9768e5005966724e5d3e834e68, with clean worktree.

Core e301 Vite compiled frontend index SHA256 db0ef46c9922c049f0b150a1a2b00323c15c67967483cd02ccdafa48d0134237 is unchanged relative to earlier approved candidate. This alone is insufficient to verify student-print backend privacy, so the new Connect gate pins exact Core-owned assessmentPrintJobs.js and two student print / Express synthetic HTTP test source SHA values. New student-print handling strips numerical finalAnswer and markingRubric, preserving options/formulas and authorized staff keys as independently reviewed by Core/Paper. Connect modifies NONE of those owner files.

Current standalone Next source remains fix/connect-legacy-proxy-guard-20261016 at 20ebae71ca438ad1590720ac93ff1ed9d59fedd7, previously built private Next Build ID 91l6KJsI2x_oOVXPQjUd5. Public running Connect Next Build ID remains ONDwxEIZlx5onDIKY7wYf.

## Phase 2 — security code and source tests

Three exact Core e301 file SHA256 values:
- al-siddique-backend/src/services/assessmentPrintJobs.js = f28b0f570dfcd29b4613553b1fd33b37ba5485a425c3c29552d91dc9f131dfa9.
- al-siddique-backend/src/tests/assessment-print-jobs-domain.test.js = 5685096b5408b0420ed8b815cb5b2a3e67909e19aa31d212b8385c8cb0770ad8.
- al-siddique-backend/src/tests/assessment-truefalse-student-projection-http-isolated.test.cjs = 08cbc63b106461ec92f7d2cf593844422ff8416570827bb3ece3425412d2b5d6.

Real re-execution on unchanged Core e301 of assessment-print-jobs-domain and synthetic Express HTTP teacher/student/School2 projection tests: 12/12 PASS, real RC0, synthetic test actors and in-memory SQL only. Protected private evidence SHA256 adec0bfd425b775b0814182bf4d46a3232591eaf13e01f29c5a906300596e86e. Production-installed Express dependency loaded read-only; no live database or service modified.

New unified Connect audit expands from ten to TWELVE fail-closed facts: exact approved Core e301 clean SHA, required previously reviewed parent ancestry, Core student print privacy exact file hashes, compiled frontend byte identity, exact Connect source and immutable private built Next, preserved public Build ID, anonymous private route denials, and private HTTP acceptance. Four new negative tests cover stale Core, altered/missing critical Core privacy source and reviewed predecessor. Focused test 22/22 PASS; complete Connect Python coordinator suite 331/331 PASS RC0; protected private full-suite SHA256 042413124d4f4284145d2cf4cdb5594eed849d347e1069824cdf204a5865cefb.

## Phase 3 — direct authentic Core signing verifier, actual decision

Read-only direct source-SHA-pinned invocation of actual independently signed Core pre-cutover verifier completed, with Nginx and original verifier byte checks. Source and technical integration 12/12 PASS, current public login HTTP200 and eight sensitive APIs HTTP401. Official signed Core release authority still 6/13 PASS, RC2 HOLD. Unified process exit2 and verdict HOLD_NO_PRODUCTION_CUTOVER. Root-private current signed result SHA256 0ef38422d4582f2f7cf1b227d49cdbeff1b108f9727d1d6eb13d4d367627acc1.

Unresolved independent signed gates: full reviewed ACL/ownership backup, witnessed current offhost recovery, restricted production signed transport, exact reviewed live worker adapter, separately authenticated worker, effective inherited role-grant witness, genuine School2 / unassigned-subject signed denial. Same-host PostgreSQL backup+disposable data restoration previously performed by Core using --no-owner --no-acl is not ACL/owner-preserving independent offhost replay.

## Phases 4 and 5 — certification and release remain HOLD

Real staff Marks Save success/savedCount read-after-write GET, independently authenticated peer-school denial, physical Urdu A4 Diary Save/Reopen/Print, tested rollback and production postflight remain incomplete. Core separately staged real photograph-backed 38 Class One Yellow Urdu marks, not uploaded by Connect. Never alter original saved 152 Class One First Term rows, genuine zeros, or fabricate pending academic scores.

Live Connect not deployed to private source; no Nginx/PM2 restart, real student/result/paper/diary record change, SQL DML/DDL, auth token misuse, official paper change, SMTP send or physical print by Connect. No scheduled future task. Latest Core owner must certify all genuine signed gates before an approved rollback-ready release.

Legacy script filename ops/connect/verify_core638_connect_release_20261016.py intentionally preserved for backwards-compatible older handoff invocations, but executable code strictly pins newer Core e301 and reports scope CURRENT_READ_ONLY_CONNECT_CORE_E301_CANDIDATE. Source only; never silently fall back to obsolete Core638.
