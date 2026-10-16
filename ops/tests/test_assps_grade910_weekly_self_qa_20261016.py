from pathlib import Path
import importlib.util,json,tempfile,unittest
modpath=Path(__file__).resolve().parents[1]/'qbank'/'assps-grade910-weekly-self-qa-20261016.py'
spec=importlib.util.spec_from_file_location('assps_weekly_qa',modpath)
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
class TestAcademicAutoQAGuards(unittest.TestCase):
 def test_passed_30_batches_without_published_signature(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'a.json'
   p.write_text(json.dumps({'batches':[{'passedGate':True,'tests':2,'passed':2,'failed':0}]*30,
     'allSourceTestsCompleted':True,'qualityGatesPassed':True,
     'academicallyApproved':0,'verifiedPublished':0,
     'releaseDecision':'BLOCK_PUBLICATION_PENDING_AUTHENTICATED_SCHOOL_ADOPTION_AND_HUMAN_REVIEW'}))
   a=mod.inspect_audit(p);self.assertTrue(a['qualityVerified']);self.assertEqual(a['academicallyApproved'],0)
 def test_one_failed_gate_never_passes(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'a.json'
   a=[{'passedGate':True,'tests':1,'passed':1,'failed':0}]*29 + [{'passedGate':False,'tests':1,'passed':0,'failed':1}]
   p.write_text(json.dumps({'batches':a,'allSourceTestsCompleted':True,'qualityGatesPassed':True}))
   self.assertFalse(mod.inspect_audit(p)['qualityVerified'])
 def test_atomic_receipt_permissions(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'latest.json';mod.receipt_write(p,{'decision':'hold'})
   self.assertEqual(p.stat().st_mode & 0o777,0o600)
if __name__=='__main__':unittest.main()
