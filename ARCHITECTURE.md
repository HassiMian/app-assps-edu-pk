# Architecture Notes

## Purpose

This repository contains the SaaS application served on:

- `https://app.assps.edu.pk`

## Main Parts

- `al-siddique-frontend/`
  - Vite/React frontend
  - built output is deployed to `/var/www/apex-os`
- `al-siddique-backend/`
  - backend source and routes
  - live API is reached through `/api/` via Nginx proxy to `127.0.0.1:5000`

## Production Mapping

- frontend source on server: `/var/www/al-siddique-os/al-siddique-frontend`
- frontend live static root: `/var/www/apex-os`
- backend runtime target: `127.0.0.1:5000`

## Repository Rule

- application code stays under frontend/backend folders
- deployment helpers and migrations do not belong at root long-term
- credentials must come from environment variables, not committed literals

## Current Cleanup Direction

1. keep root small and readable
2. centralize old maintenance scripts under `ops/legacy/`
3. preserve product code paths
4. avoid any production mutation unless explicitly deploying

