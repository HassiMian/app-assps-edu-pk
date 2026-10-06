#!/usr/bin/env bash
set -euo pipefail
DB="${ASSPS_CLOUD_AGENT_DB:-/opt/cloud-agent/data/agent.db}"
LOG_UNIT="${ASSPS_CLOUD_AGENT_UNIT:-cloud-agent}"
MAX_LEASE="${ASSPS_WINDOWS_DISPATCH_MAX_AGE:-120}"

echo "ASSPS CONTROL-PLANE WATCHDOG"
date -Is
systemctl is-active "$LOG_UNIT" >/dev/null || systemctl restart "$LOG_UNIT"
python3 - "$DB" "$MAX_LEASE" <<'PY'
import os, sqlite3, sys, time
p=sys.argv[1]; max_age=int(sys.argv[2]); now=time.time()
if not os.path.exists(p):
    print('queue_db=missing'); raise SystemExit(0)
con=sqlite3.connect(p); cur=con.cursor()
rows=cur.execute("select job_id,created_at from windows_jobs where status='DISPATCHED'").fetchall()
cleared=[]
for jid,created in rows:
    if now-created > max_age:
        cur.execute("update windows_jobs set status='FAILED',output='Recovered stale dispatch lease by control-plane watchdog',finished_at=? where job_id=?",(now,jid)); cleared.append(jid)
con.commit()
print('cleared_stale_dispatches='+str(len(cleared)))
for jid in cleared: print('  '+jid)
print('queued='+str(cur.execute("select count(*) from windows_jobs where status='QUEUED'").fetchone()[0]))
print('dispatched='+str(cur.execute("select count(*) from windows_jobs where status='DISPATCHED'").fetchone()[0]))
PY

echo "WATCHDOG_PASS"
