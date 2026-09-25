# ASSPS Production System Audit - 2026-09-01

## Immediate Production Repairs Completed

### app.assps.edu.pk blank page

Root cause:

- `/var/www/apex-os/assets` had mode `700`.
- Nginx could serve `index.html`, but could not read JS assets.
- Cloudflare cached the first `404` for the main JS file.

Repair:

- Normalized web root permissions:
  - directories: `755`
  - files: `644`
  - owner/group: `www-data:www-data`
- Rebuilt and redeployed frontend.
- Confirmed main JS asset loads with HTTP `200`.

### Student Records module crash

Root cause:

- `StudentModule.jsx` used `DonutChart`, `ChartLegend`, and `BarChart` without importing them.

Repair:

- Added the missing import from `../../components/Charts`.
- Rebuilt frontend.
- Deployed to `/var/www/apex-os`.

Verification:

- Browser smoke for `/students` passes.
- Student Management page renders.
- Console errors: `0`.

### api.assps.edu.pk Cloudflare 526

Root cause:

- API Nginx vhost used expired Let's Encrypt certificate:
  - `/etc/letsencrypt/live/assps.edu.pk`
  - expired: 2026-08-27
- A valid certificate already existed:
  - `/etc/letsencrypt/live/www.assps.edu.pk`
  - covers `api.assps.edu.pk`, `app.assps.edu.pk`, `www.assps.edu.pk`

Repair:

- Updated `apex-api-ssl` certificate paths to the valid cert.
- Ran `nginx -t`.
- Reloaded Nginx.

Verification:

- `https://api.assps.edu.pk` now returns HTTP `302` instead of Cloudflare `526`.

## September 2026 Challan Audit

Status: clean after previous repair.

- Active students with September challans: complete.
- Missing September challans: `0`.
- Duplicate September challans: `0`.
- Wrong arrears/outstanding samples: `0`.

Classes verified:

- Starter: 40 / 40
- Mover: 42 / 42
- Flyer: 28 / 28
- One: 34 / 34
- Two: 34 / 34
- Three: 33 / 33
- Four: 20 / 20
- Five: 23 / 23
- Six: 22 / 22
- Seven: 20 / 20
- Eight: 13 / 13
- Pre Nine: 18 / 18
- Hifaz Class: 4 / 4

Inactive-name note:

- `Muhammad Haseeb Arshad` exact inactive records found.
- `Muhammad Shoaib Arshad` exact inactive record found.
- Several `Abdul Hadi` records exist; some active, some inactive. No automatic inactivation was done because the name is not unique.
- `Fida ur Rehman Siyal` was not found in the fuzzy audit sample.

## Current Technology Map

### app.assps.edu.pk

- Frontend: Vite + React.
- Backend: Express + PostgreSQL.
- Runtime: PM2 process `apex-backend`.
- Static root: `/var/www/apex-os`.
- API proxy: `app.assps.edu.pk/api/* -> 127.0.0.1:5000`.

### api.assps.edu.pk

- Public/API platform: Next.js project in local source tree.
- Production Nginx path currently proxies several routes to localhost services.
- TLS issue fixed for the current vhost.

## Production Risks Found

1. Frontend deployment can break assets if permissions are not normalized after upload.
2. Cloudflare caches asset 404s, so failed asset deploys can keep pages broken until a new asset hash or purge is used.
3. Repo has many uncommitted changes across backend and frontend. This makes production deploys risky because unrelated work can ride along with urgent fixes.
4. Demo sandbox login is visible on production login screen. If real production data is present, this should be disabled or strictly isolated.
5. `/health` on `app.assps.edu.pk` returns frontend HTML, not backend health. Backend health is available behind the API/proxy design and should be documented clearly.
6. Certificate renewal monitoring is missing or not enforced, because `api.assps.edu.pk` reached an expired-origin 526 state.

## Safe Improvement Plan

### Phase 1 - Stabilize production operations

- Add a deploy script that always:
  - builds frontend
  - uploads to temp release directory
  - runs asset existence checks
  - applies permissions
  - switches release atomically
  - verifies main routes with browser smoke
- Add a one-command rollback using timestamped `/var/www/apex-os.bak-*` backups.
- Add TLS expiry check for all domains.

### Phase 2 - Git/repo cleanup

- Do not clean by deleting random files.
- First split current dirty work into:
  - production hotfixes
  - fee/challan fixes
  - JARVIS integration work
  - experimental UI/features
- Commit or archive each group separately.
- Add `.gitignore` coverage for generated runtime files, builds, logs, backups, and temp audit output.

### Phase 3 - Data safety

- Add read-only challan audit command as an npm script.
- Add pre-generation preview for arrears before challans are created.
- Add post-generation reconciliation:
  - active students count
  - challan count
  - duplicate count
  - arrears mismatch count

### Phase 4 - UX reliability

- Keep module recovery boundary, but add developer-visible route/module error reporting.
- Add automated smoke checks for:
  - dashboard
  - students
  - fees/create
  - fees/view
  - print menu
  - login/logout

## Current Final State

- `app.assps.edu.pk`: online.
- `api.assps.edu.pk`: TLS route repaired, returns redirect instead of 526.
- `apex-backend`: online in PM2.
- Student Records module: render smoke pass.
- September challans: audit clean.
- No real-data destructive changes performed during Student module repair.
