# Deployment Notes

## Production Mapping

- Domain: `app.assps.edu.pk`
- Frontend root: `/var/www/apex-os`
- Backend API: `127.0.0.1:5000`

## Current Nginx Pattern

- Static frontend files are served from `/var/www/apex-os`
- `/api/` requests are proxied to backend port `5000`
- Uploads are served from `/var/uploads/`

## Safety

- Pushing to GitHub does not deploy automatically.
- Frontend deploys should be done from a tested build artifact.
- Backend deploys should be done separately with extra care because real school data exists in production.

## Canonical Deploy Helper

Use the deploy helper for dry-run review instead of one-off copy commands:

```powershell
npm run deploy:production:dry-run
```

The dry-run prints every local and remote step without changing production.

To deploy after review, the operator must provide explicit deployment identity and confirmation:

```powershell
$env:ASSPS_DEPLOY_HOST='user@host'
$env:ASSPS_DEPLOY_SSH_KEY='C:\path\to\deploy_key'
$env:ASSPS_DEPLOY_KNOWN_HOSTS='C:\Users\Imac\.ssh\known_hosts'
npm run deploy:production -- -Mode Frontend -ConfirmProduction
npm run deploy:production -- -Mode Backend -ConfirmProduction
npm run deploy:production -- -Mode Both -ConfirmProduction
```

The helper:

- runs `npm run production:safety`;
- refuses apply mode without explicit host/key/known-hosts and `-ConfirmProduction`;
- uses strict SSH host key checking;
- checks native command exit codes;
- checks backend `.env` contains `NODE_ENV=production` and `AUTO_MIGRATE_ON_BOOT=false` before backend apply;
- creates timestamped production backups;
- preserves server-side `.env`;
- runs `nginx -t`, PM2 restart, and basic health checks.

## Current Deployment Position

No deployment is approved by the current foundation plan.

Before any production apply, complete these checks:

- Review `npm run release:manifest` and select the exact release candidate files.
- Run `npm run verify:local`.
- Run `npm run live:contract`.
- Confirm the known-host fingerprint for the real production server.
- Confirm backend dependency staging and rollback procedure.
- Confirm route-level readiness, not only `/health`.

The current helper is safer than one-off copying, but it is not a substitute for release review. Backend deployment still needs extra caution because real school data is present.

