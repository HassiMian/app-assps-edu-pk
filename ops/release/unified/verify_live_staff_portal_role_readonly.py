#!/usr/bin/env python3
# Live source guard: no credentials, no student data, never invokes POST.
from pathlib import Path
import json,subprocess
ROOT=Path('/var/www/apex-backend/src')
def inspect(*,portal_code=None,employee_code=None,syntax_pass=None):
 try:
  portal=portal_code if portal_code is not None else (ROOT/'services/portalAccountService.js').read_text()
  employee=employee_code if employee_code is not None else (ROOT/'routes/employeeRoutes.js').read_text()
  low_level=('PORTAL_ROLE_NOT_ELIGIBLE_FOR_SELF_SERVICE' in portal and
    "new Set(['teacher','accountant','student','parent'])" in portal and
    'PORTAL_EXISTING_ROLE_MISMATCH' in portal)
  employee_route=('STAFF_ROLE_ESCALATION_DENIED' in employee and
    "['teacher','accountant'].includes(role)" in employee)
  syntax=syntax_pass
  if syntax is None:
   statuses=[subprocess.run(['node','--check',str(ROOT/f)],capture_output=True,timeout=10).returncode
     for f in ['services/portalAccountService.js','routes/employeeRoutes.js']]
   syntax=all(x==0 for x in statuses)
  return {'pass':low_level and employee_route and syntax,'read_only':True,
   'low_level_nonprivileged_role_guard':low_level,'employee_route_role_guard':employee_route,
   'syntax_pass':syntax,'authenticated_live_actor_test':False}
 except (OSError,subprocess.TimeoutExpired) as e:
  return {'pass':False,'read_only':True,'error_type':type(e).__name__}
if __name__=='__main__':
 out=inspect()
 print(json.dumps(out,sort_keys=True))
 raise SystemExit(0 if out['pass'] else 3)
