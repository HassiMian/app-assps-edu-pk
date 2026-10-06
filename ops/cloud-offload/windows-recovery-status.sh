#!/usr/bin/env bash
set -euo pipefail
DB="${ASSPS_CLOUD_AGENT_DB:-/opt/cloud-agent/data/agent.db}"
LOG_UNIT="${ASSPS_CLOUD_AGENT_UNIT:-cloud-agent}"

echo "ASSPS WINDOWS REMOTE RECOVERY STATUS"
date -Is

systemctl is-active "$LOG_UNIT" >/dev/null && echo "cloud_agent=active" || echo "cloud_agent=inactive"

python3 - "$DB" <<'PY'
import os, sqlite3, sys, time
p=sys.argv[1]
if not os.path.exists(p):
    print('windows_queue_db=missing')
    raise SystemExit(0)
con=sqlite3.connect(p)
cur=con.cursor()
rows=cur.execute("select job_id,status,created_at,coalesce(exit_code,''),substr(coalesce(output,''),1,180) from windows_jobs order by created_at desc limit 12").fetchall()
print('recent_windows_jobs=')
for job,status,created,code,out in rows:
    age=max(0,int(time.time()-created))
    clean=' '.join(out.split())
    print(f"  {job} status={status} age_s={age} exit={code} output={clean}")
queued=cur.execute("select count(*) from windows_jobs where status='QUEUED'").fetchone()[0]
dispatched=cur.execute("select count(*) from windows_jobs where status='DISPATCHED'").fetchone()[0]
print(f"queued={queued}")
print(f"dispatched={dispatched}")
PY

echo "recent_windows_polls="
journalctl -u "$LOG_UNIT" --since '3 minutes ago' --no-pager 2>/dev/null | grep '/windows/pending-job' | tail -5 || true

echo "RECOVERY_GUIDANCE"
echo "1. If polls are current, Windows relay is online; queued jobs should drain automatically."
echo "2. If polls are stale, use the authorized Remote Desktop Commander path when connected."
echo "3. Keep VPS/GitHub work running; never modify production main to recover the relay."
echo "4. Never use paid cloud resources merely to restore Windows access."
