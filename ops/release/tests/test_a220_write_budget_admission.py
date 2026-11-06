"""A220 disk-write budget adversarial suites. Synthetic fixtures are not approvals."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
M=Path(__file__).resolve().parents[1]/"a220_write_budget_admission.py"
spec=importlib.util.spec_from_file_location("a220admission",M)
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
def complete(**changes):
 args=dict(operation="frontend-build",disk_free_bytes=32*mod.GiB,
    planned_bytes=2*mod.GiB,staging_bytes=mod.GiB,rollback_bytes=mod.GiB,
    wal_growth_bytes=0,scratch_bytes=0,independently_restored_offhost=True,
    authorized_source_owner=True,authenticated_release_owner=True,
    proven_rollback=True,observed_io_full_avg10=0)
 args.update(changes);return args
def blockers(**changes):
 return mod.evaluate_admission(**complete(**changes))["blockingEvidence"]
class A220Adversarial(unittest.TestCase):
 def test_all_proofs_hypothetically_reviewable_not_executable(self):
  obj=mod.evaluate_admission(**complete())
  self.assertEqual(obj["releaseReviewState"],"ELIGIBLE_FOR_SEPARATE_HUMAN_REVIEW_ONLY")
  self.assertFalse(obj["productionExecutionAuthorized"])
  self.assertFalse(obj["deletionAuthorized"])
 def test_live_like_2gib_denies_any_write(self):
  self.assertIn("ACTUAL_DISK_FREE_BELOW_RELEASE_RESERVE",blockers(disk_free_bytes=2*mod.GiB))
 def test_dry_run_not_execution_with_free_space(self):
  self.assertTrue(mod.evaluate_admission(**complete())["scriptPerformsNoPlannedOperation"])
 def test_empty_operation_rejected(self):
  with self.assertRaises(ValueError):mod.evaluate_admission(**complete(operation=""))
 def test_unknown_delete_operation_rejected(self):
  with self.assertRaises(ValueError):mod.evaluate_admission(**complete(operation="delete"))
 def test_unknown_resize_operation_rejected(self):
  with self.assertRaises(ValueError):mod.evaluate_admission(**complete(operation="resize2fs"))
 def test_all_operation_categories_named(self):
  self.assertEqual(len(mod.OPERATIONS),7)
  for name in mod.OPERATIONS:
   self.assertEqual(mod.evaluate_admission(**complete(operation=name))["operation"],name)
 def test_four_gib_critical_boundary(self):
  self.assertEqual(mod.classify_capacity(4*mod.GiB-1),"CRITICAL")
 def test_below_two_emergency(self):
  self.assertEqual(mod.classify_capacity(2*mod.GiB-1),"EMERGENCY")
 def test_exact_two_critical(self):
  self.assertEqual(mod.classify_capacity(2*mod.GiB),"CRITICAL")
 def test_exact_four_insufficient_reserve(self):
  self.assertEqual(mod.classify_capacity(4*mod.GiB),"INSUFFICIENT_RELEASE_RESERVE")
 def test_exact_sixteen_reserve_met_without_budget(self):
  self.assertEqual(mod.classify_capacity(16*mod.GiB),"RESERVE_MET_WITHOUT_OPERATION_BUDGET")
 def test_exact_sixteen_plus_nonzero_budget_denied(self):
  self.assertIn("WORST_CASE_WRITE_BUDGET_NOT_AVAILABLE",blockers(disk_free_bytes=16*mod.GiB))
 def test_exact_required_boundary_is_reviewable_with_evidence(self):
  x=mod.evaluate_admission(**complete(disk_free_bytes=20*mod.GiB))
  self.assertEqual(x["shortfallBytes"],0)
  self.assertEqual(x["releaseReviewState"],"ELIGIBLE_FOR_SEPARATE_HUMAN_REVIEW_ONLY")
 def test_one_byte_below_required_blocks(self):
  self.assertIn("WORST_CASE_WRITE_BUDGET_NOT_AVAILABLE",blockers(disk_free_bytes=20*mod.GiB-1))
 def test_no_offhost_dr_denied(self):
  self.assertIn("OFFHOST_FULL_RESTORE_NOT_PROVEN",blockers(independently_restored_offhost=False))
 def test_no_source_owner_denied(self):
  self.assertIn("SOURCE_OWNER_NOT_AUTHENTICATED",blockers(authorized_source_owner=False))
 def test_no_release_owner_denied(self):
  self.assertIn("CORE_RELEASE_OWNER_NOT_AUTHENTICATED",blockers(authenticated_release_owner=False))
 def test_no_rollback_denied(self):
  self.assertIn("INDEPENDENT_ROLLBACK_NOT_PROVEN",blockers(proven_rollback=False))
 def test_all_authority_missing_denies(self):
  for key in ("independently_restored_offhost","authorized_source_owner","authenticated_release_owner","proven_rollback"):
   self.assertNotEqual(mod.evaluate_admission(**complete(**{key:False}))["releaseReviewState"],
                      "ELIGIBLE_FOR_SEPARATE_HUMAN_REVIEW_ONLY")
 def test_io_exact_twenty_denied(self):
  self.assertIn("SEVERE_IO_PRESSURE",blockers(observed_io_full_avg10=20))
 def test_io_just_below_twenty_does_not_block(self):
  self.assertNotIn("SEVERE_IO_PRESSURE",blockers(observed_io_full_avg10=19.999))
 def test_negative_io_rejected(self):
  with self.assertRaises(ValueError):mod.evaluate_admission(**complete(observed_io_full_avg10=-0.1))
 def test_io_above_hundred_rejected(self):
  with self.assertRaises(ValueError):mod.evaluate_admission(**complete(observed_io_full_avg10=100.1))
 def test_io_nan_rejected(self):
  with self.assertRaises(ValueError):mod.evaluate_admission(**complete(observed_io_full_avg10=float("nan")))
 def test_io_positive_infinite_rejected(self):
  with self.assertRaises(ValueError):mod.evaluate_admission(**complete(observed_io_full_avg10=float("inf")))
 def test_io_boolean_rejected(self):
  with self.assertRaises(ValueError):mod.evaluate_admission(**complete(observed_io_full_avg10=True))
 def test_boolean_disk_free_rejected(self):
  with self.assertRaises(ValueError):mod.evaluate_admission(**complete(disk_free_bytes=True))
 def test_floating_disk_free_rejected(self):
  with self.assertRaises(ValueError):mod.evaluate_admission(**complete(disk_free_bytes=20.0))
 def test_negative_disk_free_rejected(self):
  with self.assertRaises(ValueError):mod.evaluate_admission(**complete(disk_free_bytes=-1))
 def test_negative_planned_rejected(self):
  with self.assertRaises(ValueError):mod.evaluate_admission(**complete(planned_bytes=-1))
 def test_negative_rollback_rejected(self):
  with self.assertRaises(ValueError):mod.evaluate_admission(**complete(rollback_bytes=-1))
 def test_fractional_scratch_rejected(self):
  with self.assertRaises(ValueError):mod.evaluate_admission(**complete(scratch_bytes=1.5))
 def test_bool_wal_rejected(self):
  with self.assertRaises(ValueError):mod.evaluate_admission(**complete(wal_growth_bytes=True))
 def test_large_integer_overflow_rejected(self):
  with self.assertRaises(OverflowError):mod.evaluate_admission(**complete(planned_bytes=2**63-1))
 def test_individual_budget_overflow_rejected(self):
  with self.assertRaises(ValueError):mod.evaluate_admission(**complete(scratch_bytes=2**63))
 def test_sum_exact_values_included(self):
  x=mod.evaluate_admission(**complete())
  self.assertEqual(x["operationEstimatedPeakBytes"],4*mod.GiB)
  self.assertEqual(x["minimumActualFreeBytesBeforeOperation"],20*mod.GiB)
 def test_wal_growth_included(self):
  x=mod.evaluate_admission(**complete(wal_growth_bytes=2*mod.GiB))
  self.assertEqual(x["operationEstimatedPeakBytes"],6*mod.GiB)
 def test_staging_included(self):
  x=mod.evaluate_admission(**complete(staging_bytes=3*mod.GiB))
  self.assertEqual(x["minimumActualFreeBytesBeforeOperation"],22*mod.GiB)
 def test_scratch_included(self):
  x=mod.evaluate_admission(**complete(scratch_bytes=4*mod.GiB))
  self.assertEqual(x["minimumActualFreeBytesBeforeOperation"],24*mod.GiB)
 def test_no_negative_shortfall(self):
  x=mod.evaluate_admission(**complete(disk_free_bytes=60*mod.GiB))
  self.assertEqual(x["shortfallBytes"],0)
 def test_actual_zero_capacity_denied(self):
  x=mod.evaluate_admission(**complete(disk_free_bytes=0))
  self.assertEqual(x["diskCapacityState"],"EMERGENCY")
  self.assertIn("WORST_CASE_WRITE_BUDGET_NOT_AVAILABLE",x["blockingEvidence"])
 def test_mib_negative_rejected(self):
  with self.assertRaises(ValueError):mod.parse_mib(-1)
 def test_mib_boolean_rejected(self):
  with self.assertRaises(ValueError):mod.parse_mib(True)
 def test_mib_fractional_rejected(self):
  with self.assertRaises(ValueError):mod.parse_mib(1.5)
 def test_mib_overflow_rejected(self):
  with self.assertRaises(OverflowError):mod.parse_mib(2**63)
 def test_mib_exact_conversion(self):
  self.assertEqual(mod.parse_mib(512),512*mod.MiB)
 def test_missing_io_data_rejected(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/"psi";p.write_text("some avg10=1.0 avg60=0.4\n")
   with self.assertRaises(ValueError):mod.parse_io(p)
 def test_io_psi_fixture(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/"psi";p.write_text("some avg10=1.0 avg60=0.4\nfull avg10=32.8 avg60=1.0 avg300=1.0 total=100\n")
   self.assertEqual(mod.parse_io(p),32.8)
 def test_invalid_psi_nan(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/"psi";p.write_text("full avg10=nan avg60=0\n")
   with self.assertRaises(ValueError):mod.parse_io(p)
 def test_no_cleanup_or_deployment_execution(self):
  source=M.read_text()
  for expr in ("shutil.rmtree(", ".unlink(", "rm -rf", "DELETE FROM", "os.system(", "subprocess.run(", "resize2fs", "os.exec"):
   self.assertNotIn(expr,source)
 def test_cli_does_not_accept_role_approval_flags(self):
  source=M.read_text()
  for expr in ('parser.add_argument("--signed','parser.add_argument("--offhost','parser.add_argument("--approve','parser.add_argument("--delete'):
   self.assertNotIn(expr,source)
if __name__=="__main__":unittest.main()
