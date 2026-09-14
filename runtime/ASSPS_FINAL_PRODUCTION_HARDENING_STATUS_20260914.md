# ASSPS Final Production Hardening Status

Date: 2026-09-14

## Scope

This status covers the safe production hardening/deployment work completed for the existing ASSPS SaaS stack. No broad redesign was performed.

## Production Access

```text
Provider: Hostinger VPS
Server: srv1769723.hstgr.cloud
SSH host: 187.127.121.221
SSH user: root
SSH auth: dedicated local deploy key
App URL: https://app.assps.edu.pk
API URL: https://api.assps.edu.pk
```

## Changes Applied

```text
Targeted backend RC2 hardening deployed.
Full frontend tree was not redeployed.
Production source authority and auth guard changes are active.
AUTO_MIGRATE_ON_BOOT=false is active.
JARVIS machine-to-machine service identity is configured with hashed token on server.
Notification inbox route was restored to the current 395-line production source after an older route copy was detected.
```

## Backups

```text
Targeted backend backup:
/var/www/apex-backend.rc2-selected-bak-20260914-014027

Notification route backup before final restore:
/var/www/apex-backend.notify-current-route-restore-bak-20260914-132421

Environment backups:
/var/www/apex-backend/.env.bak-rc2-20260914-014027
/var/www/apex-backend/.env.bak-service-token-20260914-015209
```

## Verification

```text
Production API health: PASS
Production app frontend: PASS
PM2 apex-backend: online
PM2 apex-connect: online
Notification inbox authenticated test: PASS
Notification inbox authenticated status: 200
Notification inbox authenticated count: 18
Live route contract: PASS
Production safety check: PASS
JARVIS service-token read-only test: PASS
JARVIS service-token HTTP status: 200
JARVIS service-token response shape: array
```

## Current Confirmed State

```text
https://app.assps.edu.pk = 200
https://api.assps.edu.pk/health = ok
Protected no-token routes = 401
Protected mock-token routes = 401
JARVIS service identity = accepted for scoped read-only School API access
Server token storage = hash only
Local JARVIS token storage = local runtime .env only
```

## Remaining Caution

```text
The working tree is still intentionally dirty with broader local improvements and reports.
Do not run a broad production deploy from this tree until a fresh release candidate is reviewed.
Use targeted deploys only for urgent isolated production fixes.
```
