# app.assps.edu.pk

ASSPS SaaS / APEX OS application repository.

## Domain

- Production: `https://app.assps.edu.pk`

## Local Snapshot Source

- Original workspace source: `c:\projects\My SAas\al-siddique-os`

## Contents

- `al-siddique-frontend/` - SaaS frontend
- `al-siddique-backend/` - backend used by SaaS
- `ops/` - legacy deployment and maintenance helpers

## Live Server Mapping

- Frontend live web root: `/var/www/apex-os`
- Frontend source on server: `/var/www/al-siddique-os/al-siddique-frontend`
- Backend API proxy target: `127.0.0.1:5000`

## Notes

- This repo is a safe split snapshot from the shared workspace.
- GitHub activity here does not affect production until a separate deployment is run.

## Useful Commands

```bash
npm run dev:frontend
npm run build:frontend
npm run dev:backend
npm run migrate:backend
npm run smoke:paper-ai
```

## Repository Shape

- product code lives inside `al-siddique-frontend/` and `al-siddique-backend/`
- old helper scripts are kept under `ops/legacy/`
- secrets should never be committed; legacy scripts now expect environment variables

