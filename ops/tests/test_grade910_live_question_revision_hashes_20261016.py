import copy, importlib.util, tempfile, unittest
from pathlib import Path
P=Path(__file__).resolve().parents[1]/'qbank/audit-grade910-live-question-revisions-20261016.py'
s=importlib.util.spec_from_file_location('qrev',P)
m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
def row(i):
 return {'id':f'Q{i}','grade':'9th','subject':'Physics','medium':'English','type':'mcq',
 'chapter':2,'topic':'Force','questionText':'What is the force?',
 'englishText':'What is the force?','urduText':None,
 'options':[{'id':'A','text':'Two Newtons'},{'id':'B','text':'Three Newtons'}],
 'correctOption':'A','answer':'Two Newtons','marks':1,'difficulty':'easy'}
class RevisionTests(unittest.TestCase):
 def test_stability_and_identity_not_in_content_hash(self):
  x=row(1);y=copy.deepcopy(x);y['id']='Q2'
  self.assertEqual(m.revision_sha(x),m.revision_sha(y))
 def test_changes_in_answer_question_marks_language_options_invalidate(self):
  x=row(1);baseline=m.revision_sha(x)
  for key,v in [('questionText','Change'),('answer','Three Newtons'),
                ('marks',2),('medium','Urdu'),('chapter',3),('correctOption','B')]:
   y=copy.deepcopy(x);y[key]=v
   self.assertNotEqual(m.revision_sha(y),baseline)
  y=copy.deepcopy(x);y['options'][0]['text']='Four Newtons'
  self.assertNotEqual(m.revision_sha(y),baseline)
 def test_order_of_option_object_keys_does_not_change_hash(self):
  x=row(1);y=copy.deepcopy(x)
  y['options']=[{'text':o['text'],'id':o['id']} for o in x['options']]
  self.assertEqual(m.revision_sha(x),m.revision_sha(y))
 def test_order_of_options_does_change_hash(self):
  x=row(1);y=copy.deepcopy(x);y['options']=list(reversed(y['options']))
  self.assertNotEqual(m.revision_sha(x),m.revision_sha(y))
 def test_missing_question_fields_fail(self):
  x=row(1);del x['marks']
  with self.assertRaises(ValueError):m.revision_sha(x)
 def test_duplicate_live_id_fails(self):
  rows=[row(i) for i in range(2411)];rows[-1]['id']=rows[0]['id']
  with self.assertRaises(ValueError):m.build(rows)
 def test_hashed_receipt_is_id_only(self):
  a=m.build([row(i) for i in range(2411)])
  self.assertEqual(len(a['records']),2411)
  self.assertEqual(set(a['records'][0]),{'questionId','revisionSha256','grade','type'})
  self.assertFalse(a['questionTextPersisted'])
 def test_root_private_permissions(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'private'/'revisions.json';m.save(p,{'academicApproved':False})
   self.assertEqual(p.stat().st_mode&0o777,0o600)
if __name__=='__main__':unittest.main()
