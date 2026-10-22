#!/usr/bin/env python3
"""Fail-closed LIVE backend listener and JS parser check. Does not restart services or alter data."""
import json
from pathlib import Path
import socket
import subprocess

LIVE_WHATSAPP = Path('/var/www/apex-backend/src/services/whatsapp/jarvisCognitiveCore.js')

def inspect(*, connector=None, checker=None):
    connector = connector or socket.create_connection
    checker = checker or subprocess.run
    tcp_ok = False
    syntax_ok = False
    try:
        conn = connector(('127.0.0.1', 5000), timeout=2.5)
        conn.close()
        tcp_ok = True
    except (OSError, TimeoutError):
        pass
    try:
        result = checker(['node', '--check', str(LIVE_WHATSAPP)],
                         capture_output=True, text=True, timeout=8)
        syntax_ok = result.returncode == 0
    except (OSError, subprocess.TimeoutExpired):
        pass
    return {'pass': tcp_ok and syntax_ok,
            'backend_tcp_listener_5000':tcp_ok,
            'whatsapp_service_syntax_ok':syntax_ok,
            'read_only':True}

if __name__ == '__main__':
    result = inspect()
    print(json.dumps(result, sort_keys=True))
    raise SystemExit(0 if result['pass'] else 3)
