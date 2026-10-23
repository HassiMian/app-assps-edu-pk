#!/usr/bin/env python3
from pathlib import Path
import json,subprocess
LIVE=Path('/var/www/apex-backend/src/routes/authRoutes.js')
def inspect(*,source=None,syntax_ok=None):
 try:
  text=source if source is not None else LIVE.read_text()
  secure_create=('allowedNewRoles' in text and
   'PRIVILEGED_ACCOUNT_PROVISIONING_DENIED' in text and
   "['admin','school_admin','principal','teacher','accountant','parent','student']" in text)
  secure_reset=('passwordRoleScope' in text and
   "AND role IN ('teacher','accountant','parent','student')" in text)
  parser_ok=syntax_ok
  if parser_ok is None:
   p=subprocess.run(['node','--check',str(LIVE)],capture_output=True,text=True,timeout=10)
   parser_ok=p.returncode==0
  return {'pass':secure_create and secure_reset and parser_ok,
   'creation_guard_source_present':secure_create,
   'privileged_account_reset_guard_source_present':secure_reset,
   'javascript_syntax_ok':parser_ok,
   'read_only':True,'authenticated_user_test_verified':False}
 except (OSError,subprocess.TimeoutExpired):
  return {'pass':False,'read_only':True,'error_type':'SOURCE_PROBE_UNAVAILABLE'}
if __name__=='__main__':
 result=inspect()
 print(json.dumps(result,sort_keys=True))
 raise SystemExit(0 if result['pass'] else 3)
