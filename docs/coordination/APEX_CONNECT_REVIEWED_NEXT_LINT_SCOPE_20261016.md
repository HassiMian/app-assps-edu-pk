# APEX Connect — reviewed Next lint-scope recovery (16 October 2026)

**Scope:** Connect-owned, isolated source/QA handoff only. No production changes, no database access, no staff credential use, no signed security certification, and no Core release authorization.

## Evidence-based issue and fix

The existing exact Next source `9fcca4320bdbeb834f6494d1af82d82f1d9b818f` had a reviewed local ESLint fix (`520ddbd1a0d347a8e3d12e2fce14c4a2ca8b700cb87cf93be3c65efb449b8b83`) for explicit React plugin registration and narrowly permitted `.cjs` requires. A fresh whole-tree `npm run lint -- --quiet` against that recovered source returned **47 real errors**: legacy `require()` use in five explicit root/Prisma CommonJS maintenance scripts, plus archived `src-backup-*` React source. The snapshot is already excluded from active `tsconfig.json` compilation; it is not the deployed app.

A new isolated standalone Next worktree `/root/workspace/apex-connect-reviewed-eslint-20261016`, branch `fix/connect-reviewed-eslint-20261016`, now carries local-only commits `c1007201f900140023e939e8e95428b8abc4ab05` and `2de3c39224b12385be0ab46a1e6c53328a7eeafc`. The scoped follow-on commit exempts **only five enumerated maintenance files** from TypeScript's `no-require-imports` rule and aligns ESLint's archive ignore with `tsconfig.json`. Active `.ts`/`.tsx` files retain `no-require-imports` enforcement, and React plugin/other source warnings remain enabled. No wholesale lint disable was performed.

Exact portable reviewed ESLint config: `ops/connect/recovery/reviewed-next-eslint-active-scope-20261016.mjs`, SHA256 `b064360d718fdfbfcdb177dfdf30884505cddabc757d2c155c37dadc22648aff`. Preserve previously pinned original config and its historical optimized build acceptance separately; this new file does **not** imply a fresh completed optimized build or deployment.

## Actual checks

- Syntax `node --check`, Git whitespace checks and focused ESLint on config + five named legacy scripts: PASS.
- Actual ESLint calculated config: active `src/app/page.tsx` `@typescript-eslint/no-require-imports=[2]`; named CommonJS tool `[0]`; archived snapshot `isPathIgnored=true`: PASS.
- On isolated Connect source/QA handoff, complete Python `unittest discover` suite: **126/126 PASS**, including five new integrity tests guarding exact config SHA, React, active import restrictions and narrow ignores.
- Full-project `npm run lint -- --quiet` after narrowly scoped fixes: **real exit code 0, PASS** (quiet mode: 0 reported errors). Original uncorrected whole-tree run genuinely failed with 47 errors. Captured from a detached in-session shell wrapper instead of treating a 50-second command timeout as success. Restricted evidence `/root/assps-release-evidence/connect-reviewed-eslint-20261016/full-lint.rc` (`0`, SHA256 `9a271f2a916b0b6ee6cecb2426f0b3206ef074578be55d9bc94f6f3fe3ab86aa`) and `full-lint.log` (SHA256 `e7a40a8e5cb051e01afce3597c96a8bd26aed6335286c40d3b92fd62b4976869`), both mode0600.

## Integration and non-go

Current Core anchor inspected: `integration/core-paper-diary-browser-guard-20261016@e1264a181e2854d771c0b1c6602370ba43f18148`. Existing private optimized Next Build ID `SAsg3cC_el5cq2_nN2a46` was previously built with the *original* reviewed lint SHA, not this subsequent scope refinement. Existing staged cross-owner compatibility **13/15** does not certify current public Lesson Planner/Early Years recovery. The official live production security gate was **HOLD 6/13**; independent signed off-host recovery and real peer-school denial, restricted signed transport, separately authenticated reviewed live worker and Core-approved fresh pinned ACL backup remain requirements. Never manufacture independent institutional attestations or change protected school marks, zero values, Diary records, passwords or deployed Nginx/PM2 to force a PASS.

**Next Core-coordinated actions:** review/forward-port this narrow Next lint config only on a verified canonical source, rerun exact optimized build and Chromium/role tests, certify restricted live worker with actual authenticated school/subject denials and genuine signed offsite evidence, then gate the joint production release and verified rollback. Source QA **must not** be interpreted as release GO.
