# ASSPS Production Canonical Release — 2026-10-07

## Source of truth

- Canonical release branch: `release/saas-canonical-production-20261007`
- Backend production base: reconciled G21/Audit backend (`af90bc4`) plus preserved forward migration history.
- Frontend production base: audited SaaS frontend plus structured Paper Workspace and the attendance/dashboard hydration fixes.
- Full next-generation Paper Studio remains a separate development stream and must not replace production until its own release gates are green.

## Production invariants

1. `/var/www/apex-backend` is a deployed artifact, not the development source of truth.
2. `/var/www/apex-os` is the deployed frontend artifact, not the development source of truth.
3. PM2 `apex-backend` must run on port `5000`; never inherit the Cloud/Desktop Commander shell port.
4. `AUTO_MIGRATE_ON_BOOT=false` in production. Schema changes are versioned and applied before process restart.
5. Applied migrations are never deleted from source history.
6. Protected printable templates must pass `npm --prefix al-siddique-frontend run verify:templates` before frontend deployment.
7. Run `npm run production:safety`, `npm run verify:local`, and `npm run smoke:production-school` before/after a production release as applicable.
8. Missing data is never replaced with guessed/demo data; unmarked attendance is never treated as present.

## Current operational recovery

- School 1 academic setup was reconstructed only from the existing 317-student roster and its recorded class/section values.
- Dashboard render loop was fixed by stabilizing the academic class dependency used by dashboard hydration.
- Attendance now selects the first real hydrated class after Academic Setup loads.
- Production Paper Generator temporarily uses the verified structured workspace with Paper Workspace, Saved Papers, Question Bank, Pre Classes Papers, Daily Diary, and Lesson Plans.

## Backups retained

Operational backups under `/var/www/apex-os.bak-*` and `/var/www/apex-backend.bak-*` are retained until a later deliberate retention cleanup. Do not delete them as part of routine releases.
