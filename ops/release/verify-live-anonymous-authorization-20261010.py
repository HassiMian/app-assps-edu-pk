#!/usr/bin/env python3
"""Read-only anonymous access smoke: no cookies, tokens or school records."""
import subprocess,sys
HOST='api.assps.edu.pk'
PATHS=(
 '/api/exams',
 '/api/exams/results',
 '/api/exams/results/all',
 '/api/students',
 '/api/attendance',
 '/api/fees/summary',
 '/api/portal/paper-studio/papers',
)
def main():
 for path in PATHS:
  proc=subprocess.run(['curl','-sS','--connect-timeout','2','--max-time','5',
    '--resolve',HOST+':443:127.0.0.1','-o','/dev/null','-w','%{http_code}',
    'https://'+HOST+path],text=True,capture_output=True)
  status=proc.stdout.strip()
  if proc.returncode or status!='401':
   raise RuntimeError('ANONYMOUS_BOUNDARY_FAIL '+path+' status='+status+' exit='+str(proc.returncode))
  print('LIVE_ANONYMOUS_AUTH_DENIED_PASS '+path+' 401',flush=True)
 print('LIVE_ANONYMOUS_PROTECTED_ENDPOINTS_PASS '+str(len(PATHS))+'/'+str(len(PATHS)),flush=True)
if __name__=='__main__':
 try:main()
 except Exception as err:
  print(str(err),file=sys.stderr)
  sys.exit(2)
