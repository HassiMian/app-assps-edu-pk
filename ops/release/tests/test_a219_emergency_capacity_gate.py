import importlib.util
from pathlib import Path
import json
import tempfile
import unittest
from unittest.mock import patch
S=Path(__file__).resolve().parents[1]/"a219_emergency_capacity_gate.py"
spec=importlib.util.spec_from_file_location("a219_gate",S)
gate=importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)

def params():
 return dict(free_gib=17,io_full_avg10=0,restore_offhost=True,
             role_passwords_acl_verified=True,principal_attendance_approved=True,
             original_papers_authorized=True,staff_subject_approvals=True,
             owner_retention_approved=True)

class A219Tests(unittest.TestCase):
 def test_synthetic_pass_is_not_deploy_permission(self):
  x=gate.evaluate(**params())
  self.assertEqual(x["release"],"READY_FOR_INDEPENDENT_SIGNOFF_ONLY")
  self.assertFalse(x["canAutodeploy"])
  self.assertFalse(x["canDeleteSourceFiles"])
 def test_below_two_is_emergency(self):
  self.assertEqual(gate.disk_severity(1.999),"EMERGENCY")
 def test_exact_two_is_critical(self):
  self.assertEqual(gate.disk_severity(2),"CRITICAL")
 def test_under_four_is_critical(self):
  self.assertEqual(gate.disk_severity(3.999),"CRITICAL")
 def test_exact_four_below_release_reserve(self):
  self.assertEqual(gate.disk_severity(4),"BELOW_RELEASE_RESERVE")
 def test_just_below_sixteen_not_release(self):
  d=params();d["free_gib"]=15.999
  x=gate.evaluate(**d)
  self.assertEqual(x["release"],"HOLD")
  self.assertEqual(x["actualHeadroomShortfallGiB"],0.001)
 def test_exact_sixteen_with_other_approvals(self):
  d=params();d["free_gib"]=16
  self.assertEqual(gate.evaluate(**d)["release"],"READY_FOR_INDEPENDENT_SIGNOFF_ONLY")
 def test_negative_disk_fails(self):
  with self.assertRaises(ValueError):gate.disk_severity(-0.001)
 def test_nan_or_infinite_disk_fails_closed(self):
  for value in (float("nan"),float("inf"),-float("inf")):
   with self.assertRaises(ValueError):gate.disk_severity(value)
 def test_nan_or_infinite_psi_fails_closed(self):
  for value in (float("nan"),float("inf"),-float("inf")):
   with self.assertRaises(ValueError):gate.pressure_severity(value)
 def test_none_disk_fails(self):
  with self.assertRaises(ValueError):gate.disk_severity(None)
 def test_any_capacity_does_not_authorize_delete(self):
  for v in (1,3,7,16,100,9999):
   d=params();d["free_gib"]=v
   self.assertFalse(gate.evaluate(**d)["canDeleteSourceFiles"])
 def test_critical_io_at_twenty(self):
  self.assertEqual(gate.pressure_severity(20),"SEVERE_IO_CONTENTION_HEURISTIC")
 def test_io_below_five(self):
  self.assertEqual(gate.pressure_severity(4.999),"NOT_ELEVATED_BY_THIS_HEURISTIC")
 def test_io_five_is_elevated(self):
  self.assertEqual(gate.pressure_severity(5),"ELEVATED_IO_CONTENTION_HEURISTIC")
 def test_io_too_high_invalid(self):
  for v in (-1,101,None):
   with self.assertRaises(ValueError):gate.pressure_severity(v)
 def test_capacity_does_not_disguise_io_warning(self):
  d=params();d["io_full_avg10"]=40
  self.assertEqual(gate.evaluate(**d)["ioPressureHeuristic"],"SEVERE_IO_CONTENTION_HEURISTIC")
 def test_missing_offhost_blocks(self):
  d=params();d["restore_offhost"]=False
  self.assertIn("INDEPENDENT_OFFHOST_RESTORE_MISSING",gate.evaluate(**d)["blockers"])
 def test_missing_roles_password_blocks(self):
  d=params();d["role_passwords_acl_verified"]=False
  self.assertIn("RECOVERED_ROLES_PASSWORDS_AND_ACL_UNPROVEN",gate.evaluate(**d)["blockers"])
 def test_missing_principal_attendance_blocks(self):
  d=params();d["principal_attendance_approved"]=False
  self.assertIn("LIVE_PRINCIPAL_ATTENDANCE_APPROVAL_MISSING",gate.evaluate(**d)["blockers"])
 def test_missing_original_papers_blocks(self):
  d=params();d["original_papers_authorized"]=False
  self.assertIn("ORIGINAL_PAPERS_PORTABLE_RECOVERY_AND_OWNER_APPROVAL_MISSING",gate.evaluate(**d)["blockers"])
 def test_missing_teacher_subjects_blocks(self):
  d=params();d["staff_subject_approvals"]=False
  self.assertIn("SCHOOL_TEACHER_SUBJECT_AUTHORIZATION_MISSING",gate.evaluate(**d)["blockers"])
 def test_unsigned_retention_blocks_even_with_disk_space(self):
  d=params();d["owner_retention_approved"]=False
  self.assertIn("RETENTION_OWNER_APPROVAL_MISSING",gate.evaluate(**d)["blockers"])
 def test_all_missing_is_hold(self):
  d=dict(free_gib=3,io_full_avg10=65)
  x=gate.evaluate(**d)
  self.assertEqual(x["release"],"HOLD")
  self.assertEqual(x["blockerCount"],7)
 def test_source_certification_must_be_verified(self):
  a={"observedFull40Minutes":True,"release":"HOLD","roleShapeObjectOwnerAndEffectiveAclParity":True,
     "offhostDisasterRestoreCertified":False,"rolePasswordsRestored":False}
  b={"observedFull40Minutes":True,"release":"HOLD"}
  self.assertFalse(gate.certify_inputs(a,b)["independentOffhostFullDrVerified"])
  with self.assertRaises(ValueError):gate.certify_inputs({**a,"observedFull40Minutes":False},b)
  with self.assertRaises(ValueError):gate.certify_inputs(a,{**b,"release":"READY"})
 def test_psi_read_from_fixture(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/"psi";p.write_text("some avg10=2.45 avg60=3.9 avg300=0.01 total=99\nfull avg10=31.50 avg60=6.70 avg300=1.01 total=12\n")
   x=gate.get_psi(str(p))
   self.assertEqual(x["full"]["avg10"],31.5)
   self.assertEqual(x["some"]["avg60"],3.9)
 def test_psi_missing_full_fails(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/"psi";p.write_text("some avg10=0.01 avg60=0 avg300=0 total=0\n")
   with self.assertRaises(ValueError):gate.get_psi(str(p))
 def test_history_two_samples(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/"events"
   p.write_text('{"pass":true,"data":{"freeGiB":4.8}}\n{"pass":true,"data":{"freeGiB":3.1}}\n')
   x=gate.monitor_history(p)
   self.assertTrue(x["validTrend"])
   self.assertEqual(x["netObservedGiB"],-1.7)
   self.assertTrue(x["trendNotAForecast"])
 def test_history_single_sample_not_a_trend(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/"events";p.write_text('{"pass":true,"data":{"freeGiB":3.1}}\n')
   self.assertFalse(gate.monitor_history(p)["validTrend"])
 def test_history_failed_cycle_recorded_not_fabricated(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/"events";p.write_text('{"pass":true,"data":{"freeGiB":4.0}}\n{"pass":false}\n')
   x=gate.monitor_history(p)
   self.assertEqual(x["failedCycles"],1)
   self.assertEqual(x["samples"],1)
 def test_history_negative_free_fails(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/"events";p.write_text('{"pass":true,"data":{"freeGiB":-1.0}}\n')
   with self.assertRaises(ValueError):gate.monitor_history(p)
 def test_history_missing_file_fails_closed(self):
  with tempfile.TemporaryDirectory() as d:
   self.assertFalse(gate.monitor_history(Path(d)/"missing")["validTrend"])
 def test_owner_path_classification_never_deletes(self):
  rows=gate.inspect_owner_paths(["qbank-source-cache"])
  self.assertTrue(all(not x["deletionAuthorized"] for x in rows))
 def test_candidate_source_has_no_cleanup_action(self):
  body=S.read_text()
  for literal in ("shutil.rmtree(", ".unlink(", "rm -rf", "DELETE FROM", "--apply", "resize2fs", "tune2fs"):
   self.assertNotIn(literal,body)
 def test_output_contains_limitations(self):
  self.assertIn("trendNotAForecast",gate.monitor_history(Path("/does/not/exist")))
 def test_sensitive_proc_cmdlines_never_collected(self):
  text=S.read_text()
  self.assertNotIn('read_bytes()',text)
  self.assertNotIn('/cmdline',text)
if __name__=="__main__":unittest.main()
