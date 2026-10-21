"""Hermetic policy tests for the single non-deploying ASSPS acceptance runner."""
import unittest
import tempfile
from pathlib import Path
from unittest.mock import patch
import run_integrated_acceptance_once as runner
from run_integrated_acceptance_once import node_summary, suite_success, BROWSER_TESTS, CORE_TESTS, INTEGRATION_TESTS

class OneRunAcceptanceContract(unittest.TestCase):
    def test_runner_attests_this_checkout_not_stale_worktree(self):
        self.assertEqual(runner.ROOT, Path(__file__).resolve().parents[3])
        self.assertTrue((runner.ROOT / 'al-siddique-frontend' / 'package-lock.json').is_file())
    def test_node_test_success_requires_real_counts(self):
        self.assertFalse(suite_success(0, {}))
        self.assertFalse(suite_success(0, {'tests':0,'pass':0,'fail':0}))
        self.assertTrue(suite_success(0, {'tests':2,'pass':2,'fail':0,'cancelled':0}))
    def test_node_failures_cannot_be_labeled_green(self):
        self.assertFalse(suite_success(0, {'tests':3,'pass':2,'fail':1}))
        self.assertFalse(suite_success(1, {'tests':2,'pass':2,'fail':0}))
        self.assertFalse(suite_success(0, {'tests':2,'pass':1,'fail':0,'cancelled':1}))
    def test_parse_only_tap_summary(self):
        text='noise\n# tests 7\n# pass 6\n# fail 1\n# cancelled 0\n'
        self.assertEqual(node_summary(text),{'tests':7,'pass':6,'fail':1,'cancelled':0})
    def test_fabricated_logs_not_accepted(self):
        self.assertFalse(suite_success(0, node_summary('PASS all 100\nOK\n')))
    def test_no_real_db_or_synthetic_attendance_backfill_in_suite_list(self):
        for item in CORE_TESTS + INTEGRATION_TESTS:
            self.assertIn('.test.', item)
            self.assertNotIn('attendance-active-roster-hotfix',item)
            self.assertNotIn('fixture-insert',item)
    def test_two_receipts_are_immutable_and_latest_is_index_only(self):
        with tempfile.TemporaryDirectory(prefix='assps-mock-receipts-') as directory:
            with patch.object(runner, 'PRIVATE_RECEIPTS', Path(directory)):
                a = runner.record_receipt({'schema':'synthetic', 'run':'one'})
                b = runner.record_receipt({'schema':'synthetic', 'run':'two'})
                self.assertNotEqual(a['sha256'], b['sha256'])
                self.assertEqual(len(list(Path(directory).glob('integrated-*.json'))), 2)
                self.assertEqual((Path(directory)/('integrated-'+a['sha256']+'.json')).read_text().find('one')>=0,True)
                self.assertEqual((Path(directory)/('integrated-'+b['sha256']+'.json')).read_text().find('two')>=0,True)
                self.assertIn('two',(Path(directory)/'latest-integrated-readonly-acceptance.json').read_text())
                self.assertEqual((Path(directory)/('integrated-'+a['sha256']+'.json')).stat().st_mode & 0o777,0o600)
    def test_teacher_gr_attendance_negative_boundary_is_mandatory(self):
        self.assertIn('attendance-gr-teacher-scope-http.test.cjs', runner.CORE_TESTS)
        self.assertEqual(runner.CORE_TESTS.count('attendance-gr-teacher-scope-http.test.cjs'), 1)

    def test_browser_tests_are_explicit_suite(self):
        self.assertEqual(len(BROWSER_TESTS),15)
        self.assertIn('dailyDiaryNewDraftScopeBrowser.test.js',BROWSER_TESTS)
        self.assertIn('dailyDiaryLateSuccessScopeBrowser.test.js',BROWSER_TESTS)

if __name__=='__main__':unittest.main()
