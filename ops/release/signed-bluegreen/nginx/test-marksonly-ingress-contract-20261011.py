#!/usr/bin/env python3
"""Static exact-scope checks; not proof of a live Nginx installation."""
import re,unittest
from pathlib import Path
from urllib.parse import urlsplit
ROOT=Path(__file__).resolve().parent
FRONT=ROOT.parents[3]/'al-siddique-frontend/src/Modules/examination'
MAPS=(ROOT/'assps-marks-http-maps.conf').read_text()
LOC=(ROOT/'assps-marks-only-locations.conf').read_text()

def target(path,method):
 path=urlsplit(path).path
 if path in ('/api/exams','/api/exams/grade-settings'):
  return 'legacy'
 if path=='/api/exams/results':return 'green' if method=='POST' else 'legacy'
 if re.fullmatch(r'/api/exams/results/[1-9][0-9]*',path):return 'legacy'
 if path=='/api/students/bulk-class-assignment':return 'green' if method=='POST' else 'deny'
 return 'legacy'
class Contract(unittest.TestCase):
 def test_exact_whitelist(self):
  self.assertEqual(LOC.count('location = /api/exams'),3)
  self.assertIn('location ~ ^/api/exams/results/[1-9][0-9]*$',LOC)
  self.assertNotIn('location /api/',LOC)
  self.assertEqual(MAPS.count('127.0.0.1:5091'),1)
  self.assertEqual(MAPS.count('GET     $assps_marks_legacy_upstream;'),3)
 def test_exact_audited_student_movement_only(self):
  self.assertIn('location = /api/students/bulk-class-assignment {',LOC)
  self.assertIn('if ($request_method != POST) { return 405; }',LOC)
  self.assertEqual(target('/api/students/bulk-class-assignment','POST'),'green')
  self.assertEqual(target('/api/students/bulk-class-assignment','GET'),'deny')
  for u in ['/api/students','/api/students/123','/api/fees','/api/auth/login','/api/paper']:
   self.assertEqual(target(u,'POST'),'legacy')
 def test_app_only_no_connect_ingress_override(self):
  self.assertIn('ONLY inside `app.assps.edu.pk`',LOC)
  self.assertIn('Connect host MUST remain entirely unchanged',LOC)
  self.assertNotIn('INSIDE both',LOC)
 def test_host_specific_legacy_upstream_is_preserved(self):
  # Inspected live on 11 October: API host uses 3000, app host uses 5000.
  self.assertIn('map $host $assps_marks_legacy_upstream',MAPS)
  self.assertIn('api.assps.edu.pk http://127.0.0.1:3000;',MAPS)
  self.assertIn('app.assps.edu.pk http://127.0.0.1:5000;',MAPS)
  self.assertEqual(MAPS.count('default $assps_marks_legacy_upstream;'),3)
  self.assertNotIn('default http://127.0.0.1:5000;',MAPS)
 def test_authenticated_reads_use_same_backend_as_login(self):
  for path,method in [('/api/exams','GET'),('/api/exams/results','GET'),('/api/exams/results/9','GET'),('/api/exams/grade-settings','GET')]:
   self.assertEqual(target(path,method),'legacy')
  self.assertEqual(target('/api/exams/results','POST'),'green')
 def test_legacy_and_mutations_stay_old(self):
  for path,method in [('/api/auth/login','POST'),('/api/students','GET'),('/api/paper/save','POST'),('/api/fees','GET'),('/api/exams','POST'),('/api/exams/9','DELETE'),('/api/exams/grade-settings','PUT'),('/api/exams/results/9','POST'),('/api/exams/results/x','GET')]:
   self.assertEqual(target(path,method),'legacy')
 def test_actual_marks_and_result_card_requests_follow_split_contract(self):
  expected={
   'MarksSheet.jsx':{('GET','/api/exams'),('GET','/api/students'),('GET','/api/exams/results/9'),('POST','/api/exams/results')},
   'ResultCards.jsx':{('GET','/api/exams'),('GET','/api/exams/grade-settings'),('GET','/api/exams/results/9'),('GET','/api/exams/results')},
  }
  for name,wanted in expected.items():
   source=(FRONT/name).read_text()
   found=set()
   for method,path in re.findall(r"api\.(get|post|put|patch|delete)\(\s*['\"`](/api/[^'\"`]+)['\"`]",source):
    fixed=re.sub(r'\$\{[^}]+\}','9',path)
    fixed=fixed.split('?',1)[0]
    found.add((method.upper(),fixed))
   self.assertEqual(found,wanted,f'Unexpected Marks/Results API drift: {name}')
   for method,path in found:
    self.assertIn(target(path,method),('legacy','green'))
 def test_upstream_never_public_host(self):
  self.assertNotIn('0.0.0.0:5091',MAPS)
  self.assertNotIn('https://',MAPS)
if __name__=='__main__':unittest.main()
