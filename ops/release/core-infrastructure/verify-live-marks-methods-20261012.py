#!/usr/bin/env python3
"""Read-only exact scoped HTTP method contract for the live Nginx ingress.

Important: some exam-management methods intentionally remain legacy and are
NOT certified as signed-RLS. This verifies only the existing scoped marks GO.
"""
from pathlib import Path
import hashlib
import json
import re
import subprocess
import sys

BASE=Path(__file__).resolve().parents[1]/'signed-bluegreen'/'nginx'
LIVE_MAP=Path('/etc/nginx/conf.d/assps-firstterm-app-maps.conf')
LIVE_LOC=Path('/root/workspace/assps-core-promote-demote-review-20261011/ops/release/signed-bluegreen/nginx/assps-marks-only-locations.conf')
LIVE_APP=Path('/etc/nginx/sites-enabled/apex-app-ssl')

EXPECTED={
 'assps_marks_catalog_upstream':{'GET':'http://127.0.0.1:5091'},
 'assps_marks_results_upstream':{'GET':'http://127.0.0.1:5091','POST':'http://127.0.0.1:5091'},
 'assps_marks_result_detail_upstream':{'GET':'http://127.0.0.1:5091'},
}

def map_blocks(source):
 result={}
 for var,content in re.findall(r'map\s+\$request_method\s+\$(\w+)\s*\{([^{}]*)\}',source,re.S):
  entries=dict(re.findall(r'^\s*(default|GET|POST|PUT|PATCH|DELETE)\s+([^;\s]+)\s*;',content,re.M))
  result[var]=entries
 return result

def classify(maps, maps_hash_matches, loc_hash_matches, app_has_exact_include, nginx_ok):
 issues=[]
 for key,wanted in EXPECTED.items():
  got=maps.get(key,{})
  if {k:v for k,v in got.items() if k!='default'}!=wanted:
   issues.append(key+':signed_method_drift')
  if got.get('default')!='$assps_marks_legacy_upstream':
   issues.append(key+':unexpected_default')
 for key,valid in [('active_maps_match_reviewed_source',maps_hash_matches),
                   ('active_locations_match_reviewed_source',loc_hash_matches),
                   ('canonical_app_includes_exact_locations',app_has_exact_include),
                   ('nginx_syntax',nginx_ok)]:
  if not valid:issues.append(key)
 return {'status':'PASS_SCOPED_METHODS_ONLY' if not issues else 'HOLD',
         'issues':issues,'signed_methods':{'GET /api/exams':'5091',
             'GET /api/exams/grade-settings':'5091','GET /api/exams/results':'5091',
             'POST /api/exams/results':'5091','GET /api/exams/results/:id':'5091'},
         'legacy_management_methods':['POST /api/exams','PUT /api/exams/grade-settings',
                                      'DELETE /api/exams/:id'],
         'read_only':True,'not_full_backend_certification':True}

def main():
 try:
  expected_map=(BASE/'assps-marks-http-maps.conf').read_bytes()
  expected_locations=(BASE/'assps-marks-only-locations.conf').read_bytes()
  app=LIVE_APP.read_text()
  same_map=hashlib.sha256(LIVE_MAP.read_bytes()).digest()==hashlib.sha256(expected_map).digest()
  same_loc=hashlib.sha256(LIVE_LOC.read_bytes()).digest()==hashlib.sha256(expected_locations).digest()
  included=('include '+str(LIVE_LOC)+';') in app
  p=subprocess.run(['nginx','-t'],capture_output=True,timeout=10)
  result=classify(map_blocks(LIVE_MAP.read_text()),same_map,same_loc,included,p.returncode==0)
 except (OSError,subprocess.TimeoutExpired,ValueError) as e:
  result={'status':'HOLD','issues':['inspection_failed:'+type(e).__name__],
          'read_only':True,'not_full_backend_certification':True}
 print(json.dumps(result,sort_keys=True))
 return 0 if result['status']=='PASS_SCOPED_METHODS_ONLY' else 2
if __name__=='__main__':sys.exit(main())
