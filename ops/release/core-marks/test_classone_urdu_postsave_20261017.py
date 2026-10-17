import hashlib,json,sys,unittest
from decimal import Decimal
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
from verify_classone_urdu_postsave_20261017 import validate_stage,verify_response,build_sql

def data():
 p={'results':[dict(exam_id=9,student_id=i+1,subject='Urdu',total_marks=50,marks_obtained=20) for i in range(38)]}
 h=hashlib.sha256(json.dumps(p,separators=(',',':')).encode()).hexdigest()
 return p,dict(payload_sha256=h,photo_rows=38,exam_id=9,school_id=1,total_marks=50,pass_marks=20,score_sum=760),dict(source_payload_sha256=h)

def facts():
 p,r,a=data();d={k:dict(saved_rows=38,genuine_zero_rows=1,integrity_sha256=k.lower()) for k in ('English','Islamiyat','Mathematics','Science')}
 rows=[f'URDU|{i}|20|50' for i in range(1,39)]
 rows += [f'ORIGINAL|{k}|38|1|{v["integrity_sha256"]}' for k,v in d.items()]
 rows += ['OFFERING|38|1|pending|NULL|NULL']
 return dict(subjects=d), '\n'.join(rows), validate_stage(p,r,a)[0]

class PostSave(unittest.TestCase):
 def test_stage_exact(self):
  p,r,a=data();self.assertEqual(len(validate_stage(p,r,a)[0]),38)
 def test_tampered_source_hash(self):
  p,r,a=data();p['results'][0]['marks_obtained']=21
  with self.assertRaises(ValueError):validate_stage(p,r,a)
 def test_duplicate_source_after_resign(self):
  p,r,a=data();p['results'][0]['student_id']=2
  h=hashlib.sha256(json.dumps(p,separators=(',',':')).encode()).hexdigest();r['payload_sha256']=a['source_payload_sha256']=h
  with self.assertRaises(ValueError):validate_stage(p,r,a)
 def test_valid_postsave(self):
  b,s,t=facts();self.assertEqual(verify_response(s,t,b)['urdu_saved'],38)
 def test_urdu_missing_or_wrong_score(self):
  b,s,t=facts()
  for corrupted in (s.replace('URDU|1|20|50','URDU|1|21|50'),s.replace('URDU|1|20|50\n','')):
   with self.assertRaises(ValueError):verify_response(corrupted,t,b)
 def test_original_fingerprint_drift(self):
  b,s,t=facts()
  with self.assertRaises(ValueError):verify_response(s.replace('ORIGINAL|Science|38|1|science','ORIGINAL|Science|38|1|tampered'),t,b)
 def test_offering_only_pending_or_approved_valid(self):
  b,s,t=facts()
  self.assertEqual(verify_response(s.replace('OFFERING|38|1|pending|NULL|NULL','OFFERING|38|2|approved|50|20'),t,b)['subject_offering_status'],'approved')
  with self.assertRaises(ValueError):verify_response(s.replace('OFFERING|38|1|pending|NULL|NULL','OFFERING|38|1|approved|50|10'),t,b)
 def test_duplicate_offering_rejected(self):
  b,s,t=facts()
  with self.assertRaises(ValueError):verify_response(s+'\nOFFERING|38|1|pending|NULL|NULL',t,b)
 def test_sql_injection_scope_fails(self):
  with self.assertRaises(ValueError):build_sql([1]*38)
  with self.assertRaises(ValueError):build_sql(list(range(1,38))+['1); DROP TABLE students;--'])
 def test_sql_query_is_read_only(self):
  sql=build_sql(list(range(1,39)))
  for word in ('DELETE','UPDATE','INSERT','ALTER','DROP','TRUNCATE'):
   self.assertNotIn(word+' ',sql.upper())
  self.assertIn("r.subject IN ('English','Islamiyat','Mathematics','Science')",sql)
if __name__=='__main__':unittest.main()
