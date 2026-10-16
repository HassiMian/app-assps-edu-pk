#!/usr/bin/env bash
# ONLY pg_virtualenv throwaway PG16, root-private schema-only dump.
# Never claims genuine signer, offhost restore, live tenant-RLS certification.
set -euo pipefail
umask 077
if [[ "$(id -u)" != 0 || "$PG_CLUSTER_CONF_ROOT" != /tmp/pg_virtualenv.*/postgresql ||
      "$PGHOST" != localhost || ! "$PGPORT" =~ ^[0-9]{4,5}$ ||
      "$PGPORT" == 5432 || "$PGPORT" == 55432 ]]; then
  echo 'HOLD: NOT_A_DISPOSABLE_PG_VIRTUALENV' >&2; exit 2
fi
schema="$ASSPS_PHASE3_SCHEMA_ONLY_DUMP"
if [[ -z "$schema" || ! -f "$schema" || -L "$schema" ||
      "$(stat -c %u:%a "$schema")" != '0:600' ]]; then
  echo 'HOLD: EXPLICIT_ROOT_PRIVATE_SCHEMA_ONLY_DUMP_REQUIRED' >&2; exit 2
fi
base="$(cd "$(dirname "$0")/../.." && pwd)"
if [[ ! -f "$base/al-siddique-frontend/dist/index.html" ||
      ! -d "$base/al-siddique-backend/node_modules/pg" ]]; then
  echo 'HOLD: COMPILED_FRONTEND_OR_BACKEND_PACKAGES_MISSING' >&2; exit 2
fi
export DB_HOST=127.0.0.1 DB_PORT="$PGPORT"
export DB_NAME=assps_phase3_teacher_e2e_autonomous_oct16 DB_USER=qa_phase3_login
export DB_PASSWORD="$(openssl rand -hex 24)" JWT_SECRET="$(openssl rand -hex 40)"
export JWT_REFRESH_SECRET="$(openssl rand -hex 40)"
export DB_POOL_MAX=5 DB_POOL_IDLE_TIMEOUT=30000 DB_POOL_CONNECTION_TIMEOUT=2000
export AUTO_MIGRATE_ON_BOOT=false DB_STARTUP_PROBE=false NODE_ENV=production
export ASSPS_PHASE3_BACKEND_PORT=5410 ASSPS_PHASE3_FRONTEND_PORT=5411
echo 'QA_PHASE1_THROWAWAY_DB_CREATE'
psql -X -v ON_ERROR_STOP=1 -d postgres -v password="$DB_PASSWORD" <<'SQL'
-- NOLOGIN role names only: no live user accounts, credentials or signer keys.
CREATE ROLE apex_app_runtime NOLOGIN;
CREATE ROLE apex_paper_runtime NOLOGIN;
CREATE ROLE assps_core_green_runtime NOLOGIN;
CREATE ROLE assps_marks_signed_runtime NOLOGIN;
-- BYPASSRLS ONLY in disposable clone to permit synthetic school setup.
-- This suite cannot substitute live RLS/independent School2 security signoff.
CREATE ROLE qa_phase3_login WITH LOGIN BYPASSRLS PASSWORD :'password';
CREATE DATABASE assps_phase3_teacher_e2e_autonomous_oct16 OWNER qa_phase3_login;
SQL
echo 'QA_PHASE2_SCHEMA_ONLY_RESTORE'
pg_restore --no-owner --no-acl --role=qa_phase3_login -d "$DB_NAME" "$schema"
echo 'QA_PHASE3_REAL_ISOLATED_TEACHER_HTTP_AND_CHROMIUM'
cd "$base/al-siddique-frontend"
node --test src/Modules/Paper-Generator/PaperEditor/tests/teacherSaveReopenPrintIsolatedBrowserAcceptance.test.js
echo 'QA_DISPOSABLE_TEACHER_LOGIN_SAVE_REOPEN_PRINT_PERMISSION_PASS'
