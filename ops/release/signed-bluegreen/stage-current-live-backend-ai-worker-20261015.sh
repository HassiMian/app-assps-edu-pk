#!/usr/bin/env bash
# Isolated release candidate from CURRENT running backend, not old agent snapshot.
# Never edits /var/www, PostgreSQL, PM2 or Nginx. Never copies .env or key files.
set -euo pipefail
[[ $(id -u) -eq 0 ]] || { echo 'ERROR: root-only staging required' >&2; exit 2; }
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
LIVE=/var/www/apex-backend
DEST=${1:?Usage: stage-current-live-backend-ai-worker-20261015.sh /root/assps-release-candidates/NEW_DIR}
[[ "$DEST" == /root/assps-release-candidates/* ]] || { echo 'ERROR: unexpected destination' >&2; exit 2; }
[[ ! -e "$DEST" ]] || { echo 'ERROR: candidate exists; never overwrite' >&2; exit 2; }
for bin in rsync node sha256sum cmp; do command -v "$bin" >/dev/null; done
for f in src/routes/lessonPlanRoutes.js src/routes/opsRoutes.js src/services/ai/paperAiQueue.js server.js release-meta.json; do
  [[ -f "$LIVE/$f" ]] || { echo "ERROR: missing live asset $f" >&2; exit 2; }
done
# Protect the newest live Paper Studio route and release identity during staging.
BEFORE=$(sha256sum "$LIVE/src/routes/lessonPlanRoutes.js" "$LIVE/src/routes/opsRoutes.js" "$LIVE/server.js" "$LIVE/release-meta.json" | cut -d' ' -f1)
install -d -m 700 "$DEST"
rsync -a --exclude='.env' --exclude='.env.*' --exclude='*.pem' --exclude='*.key' --exclude='*.dump' "$LIVE/" "$DEST/"
for f in services/ai/aiQueueWorkerDatabase.js services/ai/paperAiQueue.js routes/opsRoutes.js; do
  install -m 600 "$ROOT/al-siddique-backend/src/$f" "$DEST/src/$f"
  node --check "$DEST/src/$f"
  cmp "$ROOT/al-siddique-backend/src/$f" "$DEST/src/$f"
done
AFTER=$(sha256sum "$LIVE/src/routes/lessonPlanRoutes.js" "$LIVE/src/routes/opsRoutes.js" "$LIVE/server.js" "$LIVE/release-meta.json" | cut -d' ' -f1)
[[ "$BEFORE" == "$AFTER" ]] || { echo 'HOLD: live backend changed mid-stage; candidate uncertified' >&2; exit 2; }
cmp "$LIVE/src/routes/lessonPlanRoutes.js" "$DEST/src/routes/lessonPlanRoutes.js"
cmp "$LIVE/server.js" "$DEST/server.js"
cmp "$LIVE/release-meta.json" "$DEST/release-meta.json"
{
 echo "ASSPS isolated backend candidate, NOT deployed"
 echo "Source Core commit: $(git -C "$ROOT" rev-parse HEAD)"
 echo "Live Paper Studio lessonPlanRoutes checksum:"
 sha256sum "$LIVE/src/routes/lessonPlanRoutes.js"
 echo "Candidate restricted worker checksums:"
 for f in services/ai/aiQueueWorkerDatabase.js services/ai/paperAiQueue.js routes/opsRoutes.js; do sha256sum "$DEST/src/$f"; done
} > "$DEST/CORE_AI_WORKER_CANDIDATE_MANIFEST.txt"
chmod 600 "$DEST/CORE_AI_WORKER_CANDIDATE_MANIFEST.txt"
echo 'PASS: staged current live backend + reviewed isolated worker modules; production untouched.'
