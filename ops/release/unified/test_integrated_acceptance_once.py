"""Hermetic policy tests for the single non-deploying ASSPS acceptance runner."""
import unittest
from run_integrated_acceptance_once import node_summary, suite_success, BROWSER_TESTS, CORE_TESTS, INTEGRATION_TESTS

class OneRunAcceptanceContract(unittest.TestCase):
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
    def test_browser_tests_are_explicit_suite(self):
        self.assertEqual(len(BROWSER_TESTS),15)
        self.assertIn('dailyDiaryNewDraftScopeBrowser.test.js',BROWSER_TESTS)
        self.assertIn('dailyDiaryLateSuccessScopeBrowser.test.js',BROWSER_TESTS)

if __name__=='__main__':unittest.main()
