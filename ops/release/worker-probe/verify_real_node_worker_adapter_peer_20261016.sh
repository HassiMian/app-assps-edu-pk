#!/usr/bin/env bash
# ASSPS Core — ephemeral, read-only real OS peer acceptance of exact reviewed Node worker.
# NEVER starts, installs, or authorizes a persistent backend worker or production release.
set -euo pipefail
umask 077

BASE="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
ADAPTER="$BASE/al-siddique-backend/src/services/ai/aiQueueWorkerDatabase.js"
PIN="3b7f6b24a6b3ea935105f4eba95afef1fb1179b1"
MODULE_PATH="/var/www/apex-backend/node_modules"

hold() { echo 'WORKER_NODE_PEER_HOLD_NOT_RELEASE' >&2; exit 2; }
if [[ "$(id -u)" != 0 || ! -f "$ADAPTER" ||
      ! -f "$MODULE_PATH/pg/package.json" ||
      ! -S /var/run/postgresql/.s.PGSQL.5432 ]]; then
  hold
fi
# This must be the exact reviewed source, not an unreviewed modified worker.
REVIEWED="$(git -C "$BASE" show "$PIN:al-siddique-backend/src/services/ai/aiQueueWorkerDatabase.js" 2>/dev/null | sha256sum | cut -d' ' -f1)" || hold
CURRENT="$(sha256sum "$ADAPTER" | cut -d' ' -f1)" || hold
[[ "$CURRENT" == "$REVIEWED" ]] || hold

# Source bytes only are streamed into Node as STDIN (worker OS account cannot read /root).
# PGOPTIONS enforces server-side default_transaction_read_only even for queue queries.
# The only statements executed by this script are static SELECT and SELECT ... LIMIT 0.
{
  cat "$ADAPTER"
  cat <<'JS'
;(async () => {
  const status = await module.exports.query(
    "SELECT current_user AS actor, current_setting('transaction_read_only') AS readonly_mode");
  const actor = status.rows[0] || {};
  if (actor.actor !== 'assps_ai_worker_login' || actor.readonly_mode !== 'on') {
    throw Error('WRONG_READ_ONLY_WORKER_ACTOR');
  }
  let denied=0;
  for (const statement of [
    "SELECT 1 FROM public.students LIMIT 0",
    "SELECT 1 FROM public.exam_results LIMIT 0",
    "SELECT 1 FROM public.organizations LIMIT 0",
    "SELECT 1 FROM public.campuses LIMIT 0",
    "SELECT 1 FROM public.admin_block_audit_log LIMIT 0"
  ]) {
    try { await module.exports.query(statement); }
    catch (error) { if (error?.code==='42501') denied += 1; else throw error; }
  }
  if (denied!==5) throw Error('SENSITIVE_TABLES_NOT_DENIED');
  console.log('REAL_NODE_WORKER_PEER_READONLY_PASS_NOT_RELEASE', JSON.stringify({
    actor:actor.actor,readonlyTransaction:true,realSensitiveSqlDenials:denied,
    dataModified:false,persistentWorkerInstalled:false,signedReleaseAuthorized:false
  }));
  process.exit(0);
})().catch(err=>{console.error('REAL_NODE_WORKER_PEER_HOLD_NOT_RELEASE',err.code||err.message);process.exit(2)});
JS
} | timeout -k 3 22 runuser -u assps_ai_worker_login -- env \
    NODE_PATH="$MODULE_PATH" NODE_ENV=production \
    DB_SIGNED_TENANT_RLS_ENABLED=true \
    DB_AI_WORKER_HOST=/var/run/postgresql DB_AI_WORKER_PORT=5432 \
    DB_AI_WORKER_NAME=apexos DB_AI_WORKER_USER=assps_ai_worker_login \
    DB_AI_WORKER_PASSWORD=peer-transport-not-used \
    DB_AI_WORKER_ROLE=assps_core_ai_worker DB_USER=assps_core_green_login \
    PGOPTIONS='-c default_transaction_read_only=on -c statement_timeout=7000' \
    node -

echo 'PRODUCTION_CHANGED_FALSE_RELEASE_AUTHORIZED_FALSE'
