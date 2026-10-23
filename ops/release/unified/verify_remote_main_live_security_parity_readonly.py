#!/usr/bin/env python3
"""Non-mutating three-way parity gate: stale GitHub main must not auto-deploy.
Never reads credentials, writes to academic database, or merges/pushes branches.
"""
from pathlib import Path
import subprocess,json
ROOT=Path('/root/workspace/assps-unified-core-owner-20261022')
LIVE=Path('/var/www/apex-backend/src/routes/authRoutes.js')
FILE='al-siddique-backend/src/routes/authRoutes.js'
BRIDGE='security/assps-main-privileged-role-reconciliation-20261023'
def examine(text):
    return {'provision_deny': 'PRIVILEGED_ACCOUNT_PROVISIONING_DENIED' in text,
            'password_reset_scoped': ('AND role = ANY($3::text[])' in text or
              'PRIVILEGED_PASSWORD_RESET_DENIED' in text or
              'canResetSchoolUserPassword' in text or
              'passwordRoleScope' in text and 'AND role IN' in text),
            'tenant_required':('SCHOOL_TENANT_SCHEMA_REQUIRED' in text or
              'USER_TENANT_SCHEMA_REQUIRED' in text)}
def read_git(ref):
    r=subprocess.run(['git','-C',str(ROOT),'show',ref+':'+FILE],
                     capture_output=True,text=True,timeout=14)
    if r.returncode:raise RuntimeError('git ref or source unavailable')
    return r.stdout
def inspect(*,remote=None,bridge=None,live=None):
    try:
        remote=examine(read_git('origin/main') if remote is None else remote)
        bridge=examine(read_git(BRIDGE) if bridge is None else bridge)
        live=examine(LIVE.read_text() if live is None else live)
        bridge_ready=all(bridge.values())
        live_ready=live['provision_deny'] and live['password_reset_scoped']
        main_ready=all(remote.values())
        return {'pass':bridge_ready and live_ready and main_ready,
                'bridge_ready':bridge_ready,'live_runtime_source_guard_present':live_ready,
                'remote_main_security_parity':main_ready,
                'main_missing_controls':[k for k,v in remote.items() if not v],
                'on_main_push_performed':False,'production_deployment_performed':False,
                'read_only':True}
    except (OSError,RuntimeError,subprocess.TimeoutExpired):
        return {'pass':False,'bridge_ready':False,'read_only':True,
                'code':'REMOTE_PARITY_CANNOT_BE_CERTIFIED'}
if __name__=='__main__':
    result=inspect()
    print(json.dumps(result,sort_keys=True))
    raise SystemExit(0 if result['pass'] else 3)
