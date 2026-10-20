#!/usr/bin/env python3
"""Read-only static risk detection for cross-product code in school web runtime.

This is not a runtime access test and cannot prove that financial actions were
executed. Detection does not execute, import, start or message any legacy code.
"""
import json
import re
from pathlib import Path

ROOT=Path('/var/www/apex-backend/src')
MOUNT=re.compile(r"mount\s*\(\s*['\"]\/whatsapp['\"]\s*,\s*['\"]\.\/routes\/whatsappRoutes['\"]\s*\)")
EXECUTOR=re.compile(r'\bargusMt5Orchestrator\s*\.\s*(?:executeTrade|closeAllPositions)\s*\(')
SCANNER=re.compile(r'\bargusContinuousScanner\s*\.\s*start\s*\(')

def analyze(server,route):
    mounted=bool(MOUNT.search(server))
    execution_calls=len(EXECUTOR.findall(route)) if mounted else 0
    scanner_starts=len(SCANNER.findall(route)) if mounted else 0
    return {
      'pass':True,
      'active_school_whatsapp_route_mounted':mounted,
      'legacy_financial_execution_call_sites_in_mounted_route':execution_calls,
      'legacy_automatic_scanner_starts_in_mounted_route':scanner_starts,
      'legacy_boundary_requires_review':mounted and (execution_calls>0 or scanner_starts>0),
      'whole_system_isolation_certified':False,
      'interpretation':'STATIC_RISK_INDICATOR_NOT_EVIDENCE_OF_BROKER_EXECUTION_OR_RUNTIME_ISOLATION',
    }

def inspect(root=ROOT):
    server=root/'server.js'
    route=root/'routes/whatsappRoutes.js'
    if any(p.is_symlink() or not p.is_file() for p in (server,route)):
        raise RuntimeError('Missing or redirected live server/route source')
    result=analyze(server.read_text(encoding='utf-8'),route.read_text(encoding='utf-8'))
    if not result['active_school_whatsapp_route_mounted']:
        # Unmounted is not proof that there are no other financial routes.
        result['interpretation']='WHATSAPP_ROUTE_NOT_MOUNTED_WHOLE_SYSTEM_NOT_CERTIFIED'
    return result

if __name__=='__main__':
    try:print(json.dumps(inspect(),indent=2,sort_keys=True))
    except (OSError,RuntimeError,UnicodeError) as e:
        print(json.dumps({'pass':False,'error_type':type(e).__name__}))
        raise SystemExit(3)
