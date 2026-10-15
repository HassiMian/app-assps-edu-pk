# ASSPS Connect + Paper Studio + SaaS Core — latest canonical frontend rebuild and full release handoff
**Verified 15 October 2026 08:44 UTC. Production: HOLD, fail-closed.** GitHub coordination issue #4.

## Latest actual authority, not stale chat/source branches

- Current canonical Paper Studio+Grade IX-X integration branch
  `integration/paper-term-grade910-current-live-20261015` remote HEAD
  `1d9291b3c6d55d008f225a1fc6593c97bc1117e3`, checked against
  exact remote and independent **clean detached Git worktree** at
  `/root/workspace/assps-connect-review-paper-contract-1d929-20261015`.
  It includes the new V3 reachable Lesson Planner release contract,
  GitHub workflow and Core-owned guarded rollout; it is newer than the
  previously staged `5f360a36...` and earlier 2e14c2 source. No Paper
  owner shared branch, dirty worktree, or release was overwritten.
- Connect reviewed source `ops/connect-current-live-role-neutral-ingress-20261015`
  at `98f6dfcff72fbe9d46d227d5c1200d388300d3d5`; private Next
  build `rc1vIlE6prAQ8pHrw7ohX` with previously real strict-TLS
  synthetic Chromium acceptance, NOT authenticated teacher acceptance.
- SaaS Core reviewed worker ancestor `2782179f6ed0d3658ed8d7025cd5a7908b7ebdd0`.
  Latest combined source gate `c55922b2120232be1a392f203a35f4e9b683dfa5`
  enforces nonzero production HOLD exit.
- Actual live Connect Next BUILD_ID `ONDwxEIZlx5onDIKY7wYf`.
  Actual SaaS Grade static HTML SHA256
  `0af53ae824340f2ddc0b91e848163f8bddad4263d1bb7a7cf92a2bcda923325a`.
  Neither is the latest private reviewed candidate.

## Newly executed clean-source proof — canonical latest HEAD

1. Created an isolated clean Git worktree at **exact remote 1d9291b**;
   used preinstalled existing Vite dependencies for build, no secret .env
   copied or production files modified.
2. Independently executed real `npm run build` with Vite — **exit 0**,
   optimized bundle complete; build log SHA256
   `f247e4f1591e4d1ca99e2b4307868569970b7199e608be8aa15d67dfb4a86be6`.
   Clean Git state reverified. No live app publication or user/database writes.
3. Compared independently built `dist` to canonical owner's already
   archived verified recovered distribution: identical filename set
   **91/91**, byte-identical **89/91**. Two JavaScript files differ
   (`index-CWPx5tgg.js` and `EarlyYearsStudio-BByBlLX8.js`), with
   first observed differences in dynamic import/dependency-preload ordering.
   Therefore do **not** claim complete byte-for-byte binary reproduction
   or infer exact semantic equivalence from this comparison.
   Both `index.html` files SHA256
   `c94c6fdfdcf4519abe47c4220ca239e5460e52bbd8907ca41b4c5bd9148eebe2`.
   The critical reachable `LessonPlanModule-DhHP1vdi.js` is byte-identical,
   SHA256 `9f2384bb2e372ec3dbe5539259007ca48b1d06dd704ee3b84d7376adc48f12cc`.
4. Official owner `check-lesson-planner-ui.py` against FRESH CLEAN rebuild:
   **PASS**, reachable exact PaperGenerator `PaperGenerator-KNYCAi-Q.js`,
   Lesson `LessonPlanModule-DhHP1vdi.js` (100,523 bytes),
   all missing assets = 0, and all V3 required UI markers including
   `Term Syllabus`, `Weekly Notebook`, `Assessment`, `Date`,
   `Save Week`, `Save Term`, `Server Saved Weeks` and printing PASS.
5. The SAME owner source guard against ACTUAL live static frontend:
   **FAIL**, because reachable live `LessonPlanModule-D149cpax.js`
   (24,440 bytes) lacks Term and Weekly save/print controls. Presence
   of unreachable newer JS assets does not count as live functionality.
   This is the real-world Lesson Planner regression the user reported.
6. Authoritative owner `guarded-lesson-planner-rollout.py` **NON-APPLY**
   against clean source and exact current live index: returned
   `READY_FOR_CORE_GATE`, `ui_contract=PASS`,
   `candidate_git_sha=1d9291b...`, `production_changed=false`.
   **NOT a successful release** or proof that official Core is READY.
   No `--apply` invoked.
7. Owner regression tests run on clean rebuilt source: V3 contract
   **5/5 PASS**, guarded release plan **3/3 PASS**. Existing other Paper
   browser/print evidence is synthetic and separate from this run.
8. Additional independent root-private QA build archived under
   `/root/assps-release-candidates/assps-connect-crossowner-lesson-1d929-test-20261015/rebuilt-from-canonical-source.tar.zst`,
   SHA256 `2c452d7b36a619a46fed5e33ed19f3f36f91ae908fb092a2006de09cef332b41`,
   checksum PASS. This is **on-VPS technical evidence only**, not
   offsite recovery or an approved public deployment package.

## Latest genuine Core production gate — still HOLD

Official Core `verify-connect-login-only-core-20261014.py` rerun with
Connect private build `rc1vIlE6prAQ8pHrw7ohX`, pinned proxy
`7978b360f2ccc235a086283463851f0c5a8c98390efd57b17476cc32b21fd015`,
release `ASSPS_CONNECT_LOGIN_ONLY_20261015`:
**HOLD** with six explicit blockers:
- independently human-certified current offhost recovery;
- signed tenant transport in running production;
- exact restricted worker adapter deployed and genuinely executing;
- global separated worker identity, grants and inherited privileges;
- real independently authenticated peer-school/unassigned-subject denial;
- institutional signing and accountable actor receipts.

Current running backend has neither
`src/services/ai/aiQueueWorkerDatabase.js` nor
`src/services/lessonPlanningPublicationGuard.js`.
The Core+Paper staged source overlay passed source-only compatibility
(6 reviewed changes), but **running academic backend protection is not live**.
Paper owner guarded frontend release refuses to promote while its production
backend guard is absent. Running live Lesson Plans routes remain unchanged.

Current Grade HTML maps to a different untracked matching local build
at `/root/workspace/assps-resultcards-core-review-20261012/al-siddique-frontend/dist`,
from a Git worktree containing eight noncommitted changes; independently
verifying 89/89 matching artifact files did not certify a reviewed release.
That dirty worktree and current live static rollback archive remain preserved;
never overwrite them or silently reset its Git changes.

## Operational safety and final owner action

Real School1 Exam9 marks baseline: 1762 rows, 213 real numeric zeroes,
0 NULL and 301-row digest `bcdc098a3e6cabb6f4c31736b14e39b9`,
previously verified read-only. Database/roles Blue recovery checksums and
Nginx configuration pass; user credentials, canonical assessment records,
role assignments and original papers remain untouched.

**FULL RELEASE HOLD** until genuine existing teacher Muhammad Imran personally
completes temporary-password change/new signed login, independent School2
actor and School1 reviewer provide real signed cross-tenant/subject denial
evidence, authorized owners attest current frontend source, independent
reviewers approve current offsite recovery and restricted worker, and SaaS
Core certifies/installs exact running backend guard + worker and executes
one rollback-ready joint Next+Nginx/Grade release with real postflight.
The user cannot obtain these actor-bound facts from mock sessions, archived
bundles, model-generated signatures or source-only checks.

No PM2 restart, Nginx reload, production DB/marks write, teacher password
retrieval/reset, unauthorized acceptance, or live frontend promotion was
performed in this mission.
