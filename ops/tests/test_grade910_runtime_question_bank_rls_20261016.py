import importlib.util
import tempfile
import unittest
from pathlib import Path

P=Path(__file__).resolve().parents[1]/'qbank/audit-grade910-runtime-question-bank-rls-20261016.py'
sp=importlib.util.spec_from_file_location('qb_rls',P)
m=importlib.util.module_from_spec(sp);sp.loader.exec_module(m)
trusted=(5190,2470,2720)
rls={'enabled':True,'forced':True}
role={'rolsuper':False,'rolbypassrls':False}
class RLSReadOnlyAcceptance(unittest.TestCase):
 def test_actual_role_bound_per_school_counts_prove_no_peer_rows(self):
  r=m.validate(trusted,(0,0,0),(2470,2470,0),(2720,0,2720),rls,role)
  self.assertEqual(r['crossTenantLeakCount'],0)
  self.assertFalse(r['authenticatedRealTeacherLoginVerified'])
  self.assertFalse(r['independentPeerSchoolRealLoginVerified'])
  self.assertFalse(r['CoreProductionSecurityCertificationGranted'])
 def test_no_tenant_context_leak_is_rejected(self):
  with self.assertRaises(ValueError):
   m.validate(trusted,(1,1,0),(2470,2470,0),(2720,0,2720),rls,role)
 def test_school_one_cannot_see_peer_school_rows(self):
  with self.assertRaises(ValueError):
   m.validate(trusted,(0,0,0),(2471,2470,1),(2720,0,2720),rls,role)
 def test_school_five_cannot_see_school_one_rows(self):
  with self.assertRaises(ValueError):
   m.validate(trusted,(0,0,0),(2470,2470,0),(2721,1,2720),rls,role)
 def test_force_rls_required(self):
  with self.assertRaises(ValueError):
   m.validate(trusted,(0,0,0),(2470,2470,0),(2720,0,2720),
              {'enabled':True,'forced':False},role)
 def test_restricted_role_must_not_bypass_rls(self):
  with self.assertRaises(ValueError):
   m.validate(trusted,(0,0,0),(2470,2470,0),(2720,0,2720),
              rls,{'rolsuper':False,'rolbypassrls':True})
 def test_additional_future_school_does_not_count_as_cross_school_leak(self):
  r=m.validate((5195,2470,2720),(0,0,0),(2470,2470,0),(2720,0,2720),rls,role)
  self.assertEqual(r['untestedOtherSchoolRows'],5)
 def test_private_receipt_is_0600(self):
  with tempfile.TemporaryDirectory() as d:
   f=Path(d)/'private'/'rls.json'
   m.save(f,{'isolationPass':True})
   self.assertEqual(f.stat().st_mode&0o777,0o600)
if __name__=='__main__':unittest.main()
