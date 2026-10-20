"""Hermetic security tests: do not invoke broker, scanner, DB or school routes."""
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import verify_school_cross_product_boundary_readonly as checker

MOUNT="mount('/whatsapp', './routes/whatsappRoutes')"

class SchoolCrossProductTests(unittest.TestCase):
 def test_mounted_financial_surface_is_explicitly_held(self):
  s='argusMt5Orchestrator.executeTrade(x);argusMt5Orchestrator.closeAllPositions();argusContinuousScanner.start()'
  r=checker.analyze(MOUNT,s)
  self.assertTrue(r['legacy_boundary_requires_review'])
  self.assertEqual(r['legacy_financial_execution_call_sites_in_mounted_route'],2)
  self.assertEqual(r['legacy_automatic_scanner_starts_in_mounted_route'],1)
  self.assertFalse(r['whole_system_isolation_certified'])
 def test_unmounted_route_is_not_a_cause_to_certify_full_system(self):
  s='argusMt5Orchestrator.executeTrade(x);argusContinuousScanner.start()'
  r=checker.analyze('mount(\'/attendance\',\'./routes/attendanceRoutes\')',s)
  self.assertFalse(r['legacy_boundary_requires_review'])
  self.assertFalse(r['whole_system_isolation_certified'])
 def test_school_only_route_cannot_prove_runtime_isolation(self):
  r=checker.analyze(MOUNT,"router.post('/diary', protect, async () => {})")
  self.assertFalse(r['legacy_boundary_requires_review'])
  self.assertFalse(r['whole_system_isolation_certified'])
 def test_missing_mounted_source_is_error(self):
  with tempfile.TemporaryDirectory() as folder:
   base=Path(folder)
   (base/'server.js').write_text(MOUNT)
   with self.assertRaises(RuntimeError):checker.inspect(base)
 def test_synthetic_live_files_are_inspected_only_as_text(self):
  with tempfile.TemporaryDirectory() as folder:
   base=Path(folder);(base/'routes').mkdir()
   (base/'server.js').write_text(MOUNT)
   (base/'routes'/'whatsappRoutes.js').write_text('argusContinuousScanner.start()')
   x=checker.inspect(base,checker.CANDIDATE)
   self.assertTrue(x['legacy_boundary_requires_review'])
   self.assertEqual(x['legacy_automatic_scanner_starts_in_mounted_route'],1)
 def test_candidate_guard_cannot_certify_without_correct_order(self):
  route="if (isFinancialMarketRequest(text)) { send(formatSchoolScopeRestriction()); continue } jarvisCore.processMessage(from, text); whatsappRouter.processMessage(from, text)"
  guard='function isFinancialMarketRequest(text) { return true }'
  self.assertTrue(checker.candidate_scope_check(route,guard))
  self.assertFalse(checker.candidate_scope_check(route.replace('continue','return'),guard))
  self.assertFalse(checker.candidate_scope_check(route.replace('if (isFinancialMarketRequest(text))','if (false)'),guard))
  self.assertFalse(checker.candidate_scope_check(route, 'no guard'))
  self.assertFalse(checker.candidate_scope_check(route+';argusContinuousScanner.start()',guard))
  self.assertFalse(checker.candidate_scope_check(route+';argusMt5Orchestrator.executeTrade()',guard))
 def test_symlink_source_does_not_get_certified(self):
  with tempfile.TemporaryDirectory() as folder:
   base=Path(folder);(base/'routes').mkdir()
   (base/'server.js').write_text(MOUNT)
   (base/'routes'/'whatsappRoutes.js').symlink_to(base/'server.js')
   with self.assertRaises(RuntimeError):checker.inspect(base)

if __name__=='__main__':unittest.main()
