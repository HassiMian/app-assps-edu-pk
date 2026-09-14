# Ops Folder

This folder contains operational and historical helper scripts related to the SaaS application repository.

## Layout

- `legacy/` - old one-off deployment, patch, and migration helpers preserved for reference
- `production-safety-check.js` - static production guard check for known high-risk source patterns
- `release-candidate-manifest.js` - dirty tree inventory with deploy-impact categories
- `live-route-contract-check.js` - read-only public/protected route contract check
- `verify-local.js` - local verification runner for safety, syntax, ops tests, PowerShell parse, and frontend build
- `tests/` - ops and safety regression tests

## Safety

- treat these scripts as manual-use tools, not automated production truth
- review every script before running it
- provide secrets through environment variables only
- do not assume these scripts are the current deployment standard
- dry-run is safe to run locally; apply mode is not approved unless the release candidate is reviewed
- never commit `.env`, SSH keys, tokens, database dumps, or production snapshots

## Common Commands

```powershell
npm run verify:local
npm run live:contract
npm run release:manifest
npm run deploy:production:dry-run
```

## Production Apply Requirements

Apply mode requires:

- `ASSPS_DEPLOY_HOST`
- `ASSPS_DEPLOY_SSH_KEY`
- `ASSPS_DEPLOY_KNOWN_HOSTS`
- `-ConfirmProduction`
- reviewed release candidate
- rollback plan
- backend `.env` containing `NODE_ENV=production`
- backend `.env` containing `AUTO_MIGRATE_ON_BOOT=false`

