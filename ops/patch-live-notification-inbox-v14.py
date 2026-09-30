#!/usr/bin/env python3
"""V14 guarded, surgical production patch. Runs on production; never exports live route bytes."""
import argparse
import datetime
import hashlib
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

EXPECTED_SHA = "1ffbde6abdf987807730e2f46b0698991c72a8b81f482abecfa22b3f1482210e"
ROOT = Path("/var/www/apex-backend/routes/notifyRoutes.js")
SRC = Path("/var/www/apex-backend/src/routes/notifyRoutes.js")
TICK = chr(96)
DOLLAR = chr(36)

def digest(data):
    return hashlib.sha256(data).hexdigest()

def patch_route(data):
    """Edit only the GET /inbox region; preserve all other bytes and mixed original line endings."""
    text = data.decode("utf-8")
    first = "// GET /api/notify/inbox"
    last = "// PUT /api/notify/read-all"
    if text.count(first) != 1 or text.count(last) != 1:
        raise ValueError("Expected unique inbox/read-all markers")
    head, remaining = text.split(first, 1)
    handler, tail = remaining.split(last, 1)
    if "ORDER BY COALESCE(read_at, sent_at) DESC" not in handler:
        raise ValueError("Live handler differs from approved V13 query; refusing patch")
    scope = "    const params = scopedNotificationParams(schoolId, recipientRole, req.user?.id, scope)"
    if handler.count(scope) != 1:
        raise ValueError("Scoped predicate/parameter anchor absent or repeated")
    m_scope = re.search(re.escape(scope) + r"(?P<nl>\r?\n)", handler)
    if not m_scope:
        raise ValueError("Cannot determine scoped parameter newline")
    nl = m_scope.group("nl")
    extra = [
        "    const view = req.query.view === 'history' ? 'history' : 'recent'",
        "    const maxRows = view === 'history' ? 200 : 50",
        "    const parsedLimit = Number.parseInt(req.query.limit, 10)",
        "    const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(maxRows, parsedLimit)) : maxRows",
        "    const recentClause = view === 'recent' ? \"AND n.sent_at >= NOW() - INTERVAL '30 days'\" : ''",
    ]
    handler = handler.replace(scope + nl, scope + nl + nl.join(extra) + nl, 1)
    old_order = (
        r"(?m)^      ORDER BY COALESCE\(read_at, sent_at\) DESC"
        r"(?P<nl>\r?\n)      LIMIT 50\r?\n    " + re.escape(TICK) + r", params\)"
    )
    m_order = re.search(old_order, handler)
    if not m_order or len(re.findall(old_order, handler)) != 1:
        raise ValueError("Expected one exact original inbox ORDER/LIMIT block")
    replacement = [
        "        " + DOLLAR + "{recentClause}",
        "      ORDER BY n.sent_at DESC, n.id DESC",
        "      LIMIT " + DOLLAR + DOLLAR + "{params.length + 1}",
        "    " + TICK + ", [...params, limit])",
    ]
    handler = handler[:m_order.start()] + m_order.group("nl").join(replacement) + handler[m_order.end():]
    result = (head + first + handler + last + tail).encode("utf-8")
    if result == data or b"COALESCE(read_at, sent_at)" in result[result.find(first.encode()):result.find(last.encode())]:
        raise ValueError("No valid patch produced")
    return result

def atomically_write(path, value):
    info = path.stat()
    temp = path.with_name("." + path.name + ".assps-v14-stage.js")
    try:
        temp.write_bytes(value)
        os.chmod(temp, info.st_mode)
        os.chown(temp, info.st_uid, info.st_gid)
        checked = subprocess.run(["node", "--check", str(temp)], capture_output=True, text=True)
        if checked.returncode:
            raise RuntimeError("Node syntax failed: " + checked.stderr.strip()[:300])
        os.replace(temp, path)
    finally:
        if temp.exists():
            temp.unlink()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Apply guarded patch after preview")
    args = parser.parse_args()
    inputs = [ROOT, SRC]
    values = [p.read_bytes() for p in inputs]
    actual = [digest(value) for value in values]
    if actual != [EXPECTED_SHA, EXPECTED_SHA]:
        raise RuntimeError("Live route baseline hash mismatch; no files modified: " + str(actual))
    patched = [patch_route(value) for value in values]
    if patched[0] != patched[1]:
        raise RuntimeError("Root/src results differ; refusing")
    print("PRECHECK_OK identical root/src; approved baseline " + EXPECTED_SHA)
    print("SCOPE_ONLY=GET_/api/notify/inbox; untouched=all_other_routes")
    print("NEW_SHA256=" + digest(patched[0]))
    print("MODE=" + ("APPLY" if args.apply else "CHECK_ONLY"))
    if not args.apply:
        return
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup = Path("/var/backups") / ("assps-lightos-v14-notify-" + stamp)
    backup.mkdir(parents=True, mode=0o700, exist_ok=False)
    backup_names = ["notifyRoutes-root.js", "notifyRoutes-src.js"]
    for path, name in zip(inputs, backup_names):
        shutil.copy2(path, backup / name)
        if digest((backup / name).read_bytes()) != EXPECTED_SHA:
            raise RuntimeError("Backup verification failed; no production modification")
    applied = []
    try:
        for path, value in zip(inputs, patched):
            atomically_write(path, value)
            applied.append(path)
        if [digest(p.read_bytes()) for p in inputs] != [digest(patched[0])]*2:
            raise RuntimeError("Post-patch integrity mismatch")
    except Exception:
        for path, name in zip(inputs, backup_names):
            if path in applied:
                atomically_write(path, (backup / name).read_bytes())
        raise
    print("APPLY_OK")
    print("BACKUP_DIRECTORY=" + str(backup))
    print("POST_PATCH_SHA256=" + digest(patched[0]))
    print("NEXT=separately verify PM2 restart, health and 401 for unauthenticated inbox")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print("ABORTED=" + str(exc), file=sys.stderr)
        sys.exit(1)
