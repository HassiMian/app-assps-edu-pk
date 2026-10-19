#!/usr/bin/env bash
set -euo pipefail
TS=$(date -u +%Y%m%dT%H%M%SZ)
OUT=/var/backups/assps-critical-$TS
LOG=/var/log/assps/critical-backup.log
mkdir -p "$OUT" /var/log/assps
chmod 0700 "$OUT"
echo "$(date -u +%FT%TZ) start $OUT" >> "$LOG"
sudo -u postgres pg_dumpall -h /var/run/postgresql -p 5432 | gzip -9 > "$OUT/postgres-all.sql.gz"
sudo -u postgres pg_dumpall -h /var/run/postgresql -p 55432 | gzip -9 > "$OUT/postgres-asspssigned-55432-all.sql.gz"
# Capture the currently served frontend, not only the older /var/www/apex-os root.
ACTIVE_FRONTEND_ROOT="$(awk '$1=="root" && $2 ~ /^\/var\/www\/assps-/ {gsub(/;$/, "", $2); print $2}' /etc/nginx/sites-enabled/apex-app-ssl)"
[[ "$ACTIVE_FRONTEND_ROOT" == /var/www/assps-* && -d "$ACTIVE_FRONTEND_ROOT" ]] || { echo 'Active frontend root not verified' >&2; exit 8; }
[[ "$(readlink -f "$ACTIVE_FRONTEND_ROOT")" == "$ACTIVE_FRONTEND_ROOT" ]] || { echo 'Frontend root must not be a symlink' >&2; exit 8; }
tar -czf "$OUT/live-apps-and-configs.tar.gz" \
  --exclude='node_modules' --exclude='.next*' --exclude='*.log' \
  /var/www/apex-backend /var/www/apex-os /var/www/apex-connect /var/www/apex-web "$ACTIVE_FRONTEND_ROOT" \
  /etc/nginx /etc/letsencrypt /etc/systemd/system /root/.pm2/dump.pm2 2>/dev/null
/usr/local/sbin/assps-worktree-vault > "$OUT/worktree-vault-result.txt"
find "$OUT" -maxdepth 1 -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 sha256sum > "$OUT/SHA256SUMS"
gzip -t "$OUT/postgres-all.sql.gz"
gzip -t "$OUT/postgres-asspssigned-55432-all.sql.gz"
tar -tzf "$OUT/live-apps-and-configs.tar.gz" >/dev/null
(cd "$OUT" && sha256sum -c SHA256SUMS >/dev/null)
echo "$OUT" > /var/backups/assps-critical-LATEST
# ASSPS Fortress: historical critical backup retention is MANUAL/HOLD, never auto-delete.
echo "$(date -u +%FT%TZ) retention-protected: critical backups preserved" >> "$LOG"
# ASSPS Fortress: historical worktree vaults are protected; no automatic removal.
echo "$(date -u +%FT%TZ) success $OUT size=$(du -sh "$OUT" | cut -f1)" >> "$LOG"
