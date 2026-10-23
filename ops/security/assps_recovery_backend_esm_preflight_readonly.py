#!/usr/bin/env python3
"""Fail-closed LIVE backend socket + ALL active school WhatsApp ESM/CJS parse dependencies.
Does not import code, restart server, open external network, or mutate academic records.
"""
import json
from pathlib import Path
import socket
import subprocess

SRC=Path('/var/www/apex-backend/src')
REQUIRED_SOURCES=(
    SRC/'routes/whatsappRoutes.js',
    SRC/'services/whatsapp/jarvisCognitiveCore.js',
    SRC/'services/whatsapp/schoolChannelGuard.cjs',
    SRC/'services/whatsapp/schoolWebhookChannelScope.cjs',
    SRC/'shared/argus-market-engine.mjs',
    SRC/'shared/argus-mt5-orchestrator.mjs',
    SRC/'shared/argus-broker-truth.mjs',
)

def inspect(*, connector=None, checker=None):
    connector=connector or socket.create_connection
    checker=checker or subprocess.run
    tcp_ok=False
    try:
        conn=connector(('127.0.0.1',5000),timeout=2.5)
        conn.close()
        tcp_ok=True
    except (OSError,TimeoutError):
        pass
    parsed=0
    failed=[]
    for candidate in REQUIRED_SOURCES:
        if not candidate.is_file() or candidate.is_symlink():
            failed.append(candidate.name)
            continue
        try:
            result=checker(['node','--check',str(candidate)],
              capture_output=True,text=True,timeout=9)
            if result.returncode==0:parsed+=1
            else:failed.append(candidate.name)
        except (OSError,subprocess.TimeoutExpired):
            failed.append(candidate.name)
    ok=tcp_ok and not failed and parsed==len(REQUIRED_SOURCES)
    return {'pass':bool(ok),'backend_tcp_listener_5000':tcp_ok,
       'whatsapp_service_syntax_ok':bool(parsed==len(REQUIRED_SOURCES) and not failed),
       'required_es_module_and_cjs_sources':len(REQUIRED_SOURCES),
       'syntax_verified_source_count':parsed,
       'failed_source_filenames_only':failed,'read_only':True}

if __name__=='__main__':
    r=inspect()
    print(json.dumps(r,sort_keys=True))
    raise SystemExit(0 if r['pass'] else 3)
