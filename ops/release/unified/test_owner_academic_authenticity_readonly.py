import unittest
import sys
from pathlib import Path
from subprocess import CompletedProcess
sys.path.insert(0,str(Path(__file__).resolve().parent))
from verify_owner_academic_authenticity_readonly import inspect
def fake(metrics):
 def run(*args,**kwargs):
  return CompletedProcess(args[0],0,'\n'.join(k+'|'+str(v) for k,v in metrics.items())+'\n','')
 return run
N={'owner_roles':0,'principal_roles':0,'verified_owner_contacts':0,'firstterm_pending':81,
   'firstterm_approved':0,'firstterm_missing_maxima':81,'grade_bands':6,
   'perfect_score_d':6,'marks_revision_ledger':0,'grade_revision_ledger':0}
class GatedTests(unittest.TestCase):
 def test_live_like_school_state_stays_hard_hold(self):
  r=inspect(run=fake(N))
  self.assertFalse(r['pass'])
  self.assertTrue(r['checks']['grade_policy_present'])
  self.assertFalse(r['checks']['real_owner_account_bound'])
  self.assertFalse(r['checks']['official_firstterm_approvals_complete'])
 def test_entirely_proven_case_can_clear_preflight_only(self):
  n={**N,'owner_roles':1,'verified_owner_contacts':1,'firstterm_pending':0,
      'firstterm_approved':81,'firstterm_missing_maxima':0,'perfect_score_d':0,
      'marks_revision_ledger':1,'grade_revision_ledger':1}
  self.assertTrue(inspect(run=fake(n))['pass'])
 def test_missing_row_from_db_never_becomes_success(self):
  n={k:v for k,v in N.items() if k!='grade_bands'}
  self.assertFalse(inspect(run=fake(n))['pass'])
