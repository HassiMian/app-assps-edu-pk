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

