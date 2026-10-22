# ASSPS Production Release Safety Contract — 22 October 2026

## Verified topology
- Public frontend: https://app.assps.edu.pk
- Nginx TLS config: /etc/nginx/sites-enabled/apex-app-ssl
- Immutable release directory: /var/www/assps-releases/
- Active verified baseline: baseline-20261022-1404 (identical files to previous active frontend, not a new feature release)
- The previous root /var/www/assps-resultcard-nazra-purged-20261019 is preserved as a rollback.
- Backend: /var/www/apex-backend/src/server.js; separate from frontend rollout.
- Original /var/www/apex-os directory is NOT the live Nginx root and must not be used as a deploy-success indicator.

## Verified technical controls
1. ops/verify-frontend-release.mjs validates the built asset graph.
2. al-siddique-frontend/scripts/verify-production-shell.mjs checks real browser login rendering, dashboard redirect and mismatched React AuthProvider context.
3. .github/workflows/frontend-release-integrity.yml builds and browser-smokes a candidate in isolation.
4. ops/deploy-frontend-atomic.ps1 builds from a clean, detached Git worktree using the committed lockfile. It requires pinned SSH transport and tests before and after promotion.
5. ops/assps-frontend-atomic.sh stages immutable releases, protects the current Nginx root, checks readable filesystem path, runs nginx -t, checks direct-origin entry and database readiness and supports rollback.
6. ops/deploy-production.ps1 routes frontend deployments to the new controller. Legacy/backend and combined production deployments are fail-closed.
7. VPS rollback and re-promotion drills passed using an identical copy, preserving all existing data.

## CURRENT RELEASE BLOCKER: source/runtime drift
Candidate candidate-a6992ff-20261022 passed JS build, immutable-graph test and isolated browser smoke, but lacks critical active frontend modules:
- DailyDiaryWorkspace
- EarlyYearsStudio
- LessonPlanModule
- MarksRegister
- PaperEditorRouter
- BellSchedulePanel
- SavedPapersTab
- Grade910HumanSignoff

Promotion was explicitly tested and rejected with exit code 79 *before* touching Nginx. The candidate MUST NOT be promoted until an updated reviewed source tree reproduces these functions and authenticated tests pass. A green compile/build check is not sufficient. Do not copy isolated minified chunks between releases.

## Remaining pre-production acceptance
- Recover/reconcile the actual production-equivalent editable frontend source with GitHub.
- Run signed school-authorized attendance save/reopen, including new admissions and struck-off students; preserve tenant isolation.
- Run daily diary Save -> Reopen -> Print, papers and result marks non-destructive checks; test zero-vs-blank marks.
- Run authorized school A and independent school B denial and regression for fees, exams and student information on a disposable test database.
- Confirm complete snapshot/digest, rollback, published login and backend readiness.
- Only then promote via ops/deploy-frontend-atomic.ps1; do not promote a candidate just because the release path has a hashed JS entry.

## Operator commands (read only unless promotion expressly executed)
- bash /root/assps-release-tools/assps-frontend-atomic.sh status
- bash /root/assps-release-tools/assps-frontend-atomic.sh rollback <release_id>
- npm run release:frontend:validate
- node al-siddique-frontend/scripts/verify-production-shell.mjs

The actual backend database and its authentic marks, fees and student records are never disposable test fixtures.
