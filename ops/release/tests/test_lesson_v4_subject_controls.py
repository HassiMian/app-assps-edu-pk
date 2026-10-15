"""V4 source+compiled reachable contract; future reviewed upgrades may change version."""
import importlib.util
import json
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[3]
checker_path=ROOT/'ops/release/check-lesson-planner-ui.py'
spec=importlib.util.spec_from_file_location('assps_lesson_v4_contract',checker_path)
checker=importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)
contract=json.loads((ROOT/'ops/release/lesson-planner-ui-contract-v4.json').read_text())
dist=ROOT/'al-siddique-frontend/dist'

class LessonV4ContractTests(unittest.TestCase):
    def test_v4_product_and_active_controls(self):
        actual=checker.validate(dist,contract,ROOT)
        self.assertEqual(actual['result'],'PASS',actual)
        self.assertEqual(actual['contract_version'],4)
        for marker in ('Increase planner subject size','Decrease planner subject size',
                       'Toggle planner subject bold','Increase term subject size',
                       'Decrease term subject size','Toggle term subject bold',
                       '3. Daily Lesson Plan'):
            self.assertTrue(actual['details']['runtime_markers'][marker])

    def test_missing_any_one_visible_control_denies_release(self):
        mutated={**contract,'required_lesson_module_markers':[
            *contract['required_lesson_module_markers'],
            'Invisible controller intentionally absent in current UI']}
        report=checker.validate(dist,mutated,ROOT)
        self.assertEqual(report['result'],'FAIL')
        self.assertFalse(report['checks']['all_runtime_ui_markers'])

    def test_no_version_ever_counts_unreachable_legacy_chunk_as_restoration(self):
        live=Path('/var/www/assps-grade910-draft-save-print-b18a8aae')
        if not live.exists():self.skipTest('read-only live VPS artifact unavailable')
        result=checker.validate(live,contract)
        self.assertEqual(result['result'],'FAIL')
        self.assertNotEqual(result['details']['active_lesson_modules'],
                            checker.validate(dist,contract)['details']['active_lesson_modules'])

if __name__=='__main__':unittest.main()
