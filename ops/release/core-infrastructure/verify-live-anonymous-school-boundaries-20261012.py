#!/usr/bin/env python3
"""Read-only unauthenticated live route isolation probe; never sends school data.

GET only. No credentials, write bodies, cookies, tracking IDs or PII output.
Passing is perimeter negative evidence only, not signed teacher/principal E2E.
"""
import json
import urllib.error
import urllib.request
import sys

ORIGIN='https://app.assps.edu.pk'
PROTECTED={
  '/api/exams':'signed_catalog',
  '/api/exams/grade-settings':'signed_grade_settings',
  '/api/exams/results':'signed_results_collection',
  '/api/exams/results/9':'signed_results_detail',
  '/api/exams/student-results/1':'legacy_student_results',
  '/api/students':'legacy_student_roster',
  '/api/fees':'legacy_fee_ledger',
  '/api/attendance':'legacy_attendance',
}

def evaluate(statuses):
  problems=[]
  for path in PROTECTED:
    code=statuses.get(path)
    if code!=401:
      problems.append({'path':path,'required':401,'actual':code})
  if len(statuses)!=len(PROTECTED):
    problems.append({'path':'probe_set','issue':'incomplete_or_unexpected_probes'})
  return {'verdict':'PASS_ANONYMOUS_DENIAL_ONLY' if not problems else 'HOLD',
          'problems':problems,'read_only':True,'signed_user_acceptance':False}

def run():
  codes={}
  for path in PROTECTED:
    req=urllib.request.Request(ORIGIN+path,method='GET',
       headers={'User-Agent':'ASSPS-Core-ReadOnly-Anonymous-Gate',
                'Accept':'application/json'})
    try:
      with urllib.request.urlopen(req, timeout=6) as res:codes[path]=res.status
    except urllib.error.HTTPError as ex:
      codes[path]=ex.code
    except (urllib.error.URLError,TimeoutError,OSError):
      codes[path]=None
  result=evaluate(codes)
  print(json.dumps({'checks':len(codes),'status_codes':codes,**result},sort_keys=True))
  return 0 if result['verdict']=='PASS_ANONYMOUS_DENIAL_ONLY' else 2
if __name__=='__main__':sys.exit(run())
