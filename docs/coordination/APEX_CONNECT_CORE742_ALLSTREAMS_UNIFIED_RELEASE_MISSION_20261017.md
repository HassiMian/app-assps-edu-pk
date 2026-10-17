# APEX Connect MASTER — ONE cluster, full source-to-release mission, 17 October 2026

**Final decision: HOLD_NO_PRODUCTION_CUTOVER.** This continues the existing source from verified checkpoints. No live code, student result, staff access, RLS or release write was attempted.

## Phase 1 — Review exact joined sources, preserve workstreams

- Reviewed merged Core/Paper/Results source: integration/assps-master-core-paper-result-20261017 at SHA 742e277a00cddadae9e82251e8147863c989dadd. Verified exact two parents 246a0c936f581ad9c629c7cbad6cc7ef5bcb1f1f and 2c1588bf4e3063987524782e97a8b2c193cdab60, both reviewed ancestors. Previous Core2324 also an ancestor.
- Relative to approved Core2324, exactly SIX paths changed: 3 CI workflow files, one Results safety report, the updated production-safety-check.js and a 12-case selected-exam/grade-policy test. Every changed file path and SHA256 is byte-pinned in the new Connect gate. No new Core application runtime change in this merge.
- Current separately reviewed standalone Connect application remains 20ebae71ca438ad1590720ac93ff1ed9d59fedd7. Reviewed Green startup source remains 659b01fcef34ade4e7052b436fb62e083845cc3a. No duplicate canonical school database was created.
- Parallel Connect QA developer's reviewed f16049144655c9549d1e17e42ece0a17cd54e1f8 nonroot/hosted private-stage test-only fix was preserved by conflict-free cherry-pick -x as d5cfc6141 on THIS isolated Connect handoff branch. No other owner's worktree was edited.
- Separate newer Core Notice/Diary source is outside this exact two-parent Core742 candidate. It is not blindly merged. Core owner must reconcile approved successor source before actual promotion.

## Phase 2 — Actual build, HTTP, browser and regression evidence

- Created detached isolated Core742 QA worktree. Locked npm ci and actual npm run build exit0, compiled Vite index SHA256 48d3e2076c3d56cd8a41ec5c4a2689a998449c1c9801a80736b2e1ea5f2e41bb (matches reviewed source-equivalent build). Log SHA256 512494f1725ad19ded17ffd59865cf97a7b7d86f3aa388e744c01421964e6d20.
- Exact merged Core742 node ops/production-safety-check.js actual RC0, log SHA256 d76f5bcc67bde55c8065dc3f1fb3f791377eb6b9f8fdd6f65fa1662c4f171f1a.
- Exact Core742 selected-exam ResultCards/grade-policy regression 12/12 PASS RC0, log SHA256 5a4e60193afe57f540da4828ca487bb531287145e4e513e6640fac34e5452ed7. The selected-exam boundary and configured-only saved-grade semantics remain protected.
- Exact Core742 synthetic student/teacher print privacy domain and real loopback Express HTTP regression 12/12 PASS RC0, log SHA256 ade019b35ea62830924a97d1e5b2aa4f1ce17b448a46832cad78ba8d4d7d2b97. Synthetic School2 denials are not signed independent live School2 evidence.
- Current unchanged standalone Connect Next full tests 128/128 PASS with explicitly captured process exit0 (protected log SHA256 3ecbd2871cd772dc1b4c65132ef0be672c601cd44f72cdb4685f68e616fd4e4e).
- Official Connect coordination Python tests 377/377 PASS after merging the newer hosted-CI test-only guard and four new exact Core742 negative-path checks. Process exit0 and protected log SHA256 eaa2bf92fe986e3e11cb31288d41479b88d681f3635aba28bc73066e88e67658.
- Real headless Chromium loaded the actual fresh PRIVATE Vite preview on a temporary localhost OS-assigned port. Root-only screenshots validated PNG magic, expected geometry and nontrivial bytes: 375x812 mobile SHA f6bf2f774ad4da0d88c76a763abf2bb6025a18194c8cb98f7b964a7682210f95; 768x1024 tablet 1ea8b7ad689955a9e1849a4a7e663638e8a6570a72e11eaa4f29abaef9904ea3; 1440x900 desktop fd9d297c64e5aa3c3d7d1efe2f8b89ff1af2e04bab30b1069e3018f9894d9c9e. Preview server was terminated; these only prove render existence, NOT human or real staff acceptance.

## Phase 3 — Actual direct signed Core release authority; HOLD

- Extended previous combined source, privacy and Green-startup checks to exact TWO reviewed Core742 merge parents and six-path byte-pinned result safety delta. **20/20 technical facts PASS**, including clean Git SHAs, protected Core/Paper/Connect source byte hashes, private build IDs and current public no-cookie login200 plus eight private API401.
- Exact existing immutable SHA/root-owned Core signed pre-cutover verifier really ran against current original Nginx bytes. During first concurrent heavy test load, the rollback archive index validation temporarily failed, producing 5/13 Core checks. This FAILURE was preserved, not rewritten as PASS.
- READ-ONLY independent recovery diagnosis: previous root-private blue archive 263,192,033 bytes, mode0600, original approved SHA256 844430b88e1b12906ef00945f8a382a69905f5a0a05727e35e0729452466947e, compressed tar index successfully read exit0. No archive modified or verification timeout weakened.
- After concurrent heavy tests concluded, the exact UNCHANGED signed Core verifier reran, returned **6/13 Core PASS / RC2 HOLD**, combined **20/20 technical PASS, RC2 HOLD_NO_PRODUCTION_CUTOVER**, protected final report SHA256 c24c1a6be6626f22a07c49cdd9a261e50f5035b42e927276ffdb635a13b91a63.
- Seven genuine externally signed gates remain: approved owner/full ACL backup; independently signed current off-host restore; production signed worker restricted transport; exact deployed reviewed worker adapter; separate authenticated worker; effective inherited SQL grants; genuine independent School2/unassigned subject denial. Local synthetic HTTP or signed-looking JSON cannot replace these.

## Phase 4 — One remaining operational readiness cluster, not fragments

- Owner Core separately reported that genuine original 38 Class One Yellow Urdu marks are already SAVED; Connect did not replay, repair, overwrite or privately export them. Original 152 other First Term rows and numeric zero-vs-blank distinction must remain preserved. Pending Urdu subject administrative approval is still separate from authentic saved marks.
- Prior verified teacher-source review identified 43 teacher timetable identity links still requiring independent confirmation and zero trusted explicit active print assignments. No automatic teacher access granted.
- Physical Ricoh Urdu A4 Jameel Noori print, real teacher Diary Save-Reopen-Print, independently authenticated teacher/School2 protected write/read-after-write acceptance, owner rollback and live postflight remain unverified.
- Separate Core Notice Studio/Diary changes are not in exact merged Core742 and must undergo Core owner-controlled compatibility review. No cross-owner overwrite or assumption that hosted CI authorizes tenant-level release.
- Root drive about 89% full / 12GB available. Backups and rollback archives kept untouched. Existing Green PM2 restart count historical 30947; online service alone is not a clean release.

## Phase 5 — Production deployment state and concrete next gate

Public production Connect remains compiled Next Build ID ONDwxEIZlx5onDIKY7wYf. PM2 Connect, Green, backend and Marks5093 were read-only confirmed online; Nginx syntax valid; public login/API HTTP200, protected unauthenticated endpoint401.

**Release verdict is HOLD** until independent security witnesses, exact newest Core integration, actual approved staff/tenant acceptance, physical Diary print and rollback/postflight are completed under Core authority. No production code switch, Nginx/PM2 restart, DB DML/DDL, RLS/grant change, student marks overwrite, genuine password/session use, external SMTP send, actual school printer job or scheduled task during this mission. Commit/release checks are source-only and root-private.
