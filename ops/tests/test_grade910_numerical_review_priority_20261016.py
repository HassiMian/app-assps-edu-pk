import importlib.util, json, unittest, tempfile
from pathlib import Path
p=Path(__file__).resolve().parents[1]/'qbank/build-grade910-numerical-review-priority-20261016.py'
sp=importlib.util.spec_from_file_location('nq',p);m=importlib.util.module_from_spec(sp);sp.loader.exec_module(m)
class TestNumReview(unittest.TestCase):
 def inputs(self):
  b=Path('/var/lib/assps-grade910-sourceclaims')
  return json.loads((b/'live-numerical-evidence.json').read_text()),json.loads((b/'faculty-source-evidence-delta.json').read_text())
 def test_existing_evidence_21_revision_bound(self):
  a,b=self.inputs();r=m.build(a,b)
  self.assertEqual(len(r['records']),21);self.assertEqual(r['publicationEligibleFromThisEvidence'],0)
  self.assertTrue(all(len(x['currentRevisionSha256'])==64 for x in r['records']))
 def test_missing_review_revision_rejected(self):
  a,b=self.inputs();b['records'][0]['actualLiveContentRevisionSha256']='0'*64
  if b['records'][0]['questionId'] not in [x['questionId'] for x in a['records']]:
   q=a['records'][0]['questionId']
   next(x for x in b['records'] if x['questionId']==q)['actualLiveContentRevisionSha256']='0'*64
  with self.assertRaises(ValueError):m.build(a,b)
 def test_false_academic_baseline_rejected(self):
  a,b=self.inputs();a['liveNumericals']=79
  with self.assertRaises(ValueError):m.build(a,b)
 def test_private_mode(self):
  r=m.build(*self.inputs())
  with tempfile.TemporaryDirectory() as d:
   path=Path(d)/'private'/'receipt.json';m.persist(r,path)
   self.assertEqual(path.stat().st_mode&0o777,0o600)
if __name__=='__main__':unittest.main()
