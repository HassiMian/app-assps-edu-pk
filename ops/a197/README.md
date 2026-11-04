# ASSPS A197 — Daily Diary Release Continuity Gate

This narrowly scoped deployment preflight protects the live **A195 Daily Diary Studio** against regression to an older frontend build. It is intentionally separate from the 857-commit feature branch.

The guard is applied to frontend and combined deployments in `ops/deploy-production.ps1`; backend-only releases are unaffected.

**Two checks:** source features must exist before build; after a real build the `DailyDiaryWorkspace` JS/CSS output must exist, contain critical controller/print markers, and be imported by another reachable app chunk. It does not hard-code a particular file hash or template color.

**Important:** The current `origin/main` is missing `DailyDiaryWorkspace.jsx`, and the gate intentionally blocks promoting that older frontend until the SaaS Core owner reconciles the deployed A195 Daily Diary source with the canonical frontend. Do **not** remove this gate to force a release.

### Verification

```sh
node --test ops/a197/test-diary-release-continuity.mjs
node ops/a197/check-diary-release-continuity.mjs
node ops/a197/check-diary-release-continuity.mjs --dist
```

The synthetic test proves success on preserved source and failure on both legacy-route and orphaned-chunk cases. The full production process still requires SaaS Core signed release evidence, separate Lesson Planner / attendance / academic tests, rollback verification, and owner-authenticated print acceptance.

This PR does not change active production code or database records.
