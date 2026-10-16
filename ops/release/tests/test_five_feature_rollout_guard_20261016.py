"""No live writes. Verify that candidate and postflight cannot accept fabricated PASS."""
import importlib.util
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from types import SimpleNamespace

ROOT=Path(__file__).resolve().parents[3]
p=ROOT/'ops/release/guarded-lesson-planner-rollout.py'
spec=importlib.util.spec_from_file_location('guarded_paper_rollout',p)
g=importlib.util.module_from_spec(spec)
spec.loader.exec_module(g)
NAMES=('resultCardsV3','savedMarks','dailyDiary','lessonPlannerV5','earlyYearsPrint')

class TestActualFiveFeatureAcceptance(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory()
  self.addCleanup(self.tmp.cleanup)
  self.repo=Path(self.tmp.name)/'repo'
  tool=self.repo/'ops/paper-studio/verify_full_feature_readiness_20261016.py'
  tool.parent.mkdir(parents=True)
  tool.write_text('# synthetic existing checker')
  self.dist=Path(self.tmp.name)/'dist'
  self.dist.mkdir()
  (self.dist/'index.html').write_text('<html>test</html>')
 def evidence(self):
  return {'fullFeatureReadiness':'STATIC_FEATURES_PASS',
   'indexSha256':hashlib.sha256((self.dist/'index.html').read_bytes()).hexdigest(),
   'productionReleaseAuthorized':False,'studentRecordsChanged':False,
   'printerJobsDispatched':0,
   'checks':{name:{'status':'PASS'} for name in NAMES}}
 def check(self,report,code=0):
  with patch.object(g,'run',return_value=SimpleNamespace(returncode=code,stdout=json.dumps(report))):
   return g.verify_five_feature_release(self.repo,self.dist)
 def test_complete_five_feature_evidence_never_issues_release(self):
  self.assertFalse(self.check(self.evidence())['productionReleaseAuthorized'])
 def test_two_missing_features_fail_closed(self):
  report=self.evidence()
  for name in ('lessonPlannerV5','earlyYearsPrint'):
   broken=json.loads(json.dumps(report))
   broken['checks'][name]['status']='HOLD'
   with self.assertRaisesRegex(RuntimeError,'FAIL_CLOSED'):self.check(broken)
 def test_wrong_artifact_sha_rejected(self):
  report=self.evidence();report['indexSha256']='f'*64
  with self.assertRaisesRegex(RuntimeError,'FAIL_CLOSED'):self.check(report)
 def test_false_live_or_data_mutation_rejected(self):
  for field,value in [('productionReleaseAuthorized',True),('studentRecordsChanged',True),('printerJobsDispatched',1)]:
   report=self.evidence();report[field]=value
   with self.assertRaisesRegex(RuntimeError,'FAIL_CLOSED'):self.check(report)
 def test_json_exit_and_missing_guard_are_not_success(self):
  with self.assertRaisesRegex(RuntimeError,'HOLD'):self.check(self.evidence(),code=2)
  (self.repo/'ops/paper-studio/verify_full_feature_readiness_20261016.py').unlink()
  with self.assertRaisesRegex(RuntimeError,'missing'):self.check(self.evidence())

if __name__=='__main__':unittest.main()
