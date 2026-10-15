"""Regression tests enforce preservation without a permanent SHA lock."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[3]
path=ROOT/'ops/release/check-preserved-companion-features.py'
spec=importlib.util.spec_from_file_location('companion_gate',path)
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
contract=json.loads((ROOT/'ops/release/preserved-companions-v1.json').read_text())

class CompanionTests(unittest.TestCase):
    def test_actual_older_recovered_candidate_must_not_claim_live_parity(self):
        evidence=module.evaluate(ROOT,contract)
        self.assertEqual(evidence['result'],'HOLD')
        self.assertFalse(evidence['public_release_authorized'])
        self.assertIn('globalSubjectFontSize',evidence['missing'][next(x for x in contract['required_files'] if x.endswith('DailyDiaryWorkspace.jsx'))])

    def test_reviewed_compatible_newer_design_can_pass_without_a_sha_lock(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            for p,markers in contract['required_files'].items():
                f=root/p;f.parent.mkdir(parents=True,exist_ok=True)
                f.write_text('\n'.join(markers)+'\n// simulated reviewed improvements\n')
            evidence=module.evaluate(root,contract)
            self.assertEqual(evidence['result'],'PASS')
            self.assertFalse(evidence['public_release_authorized'])

    def test_missing_early_years_print_module_is_denied(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            for p,markers in contract['required_files'].items():
                if p.endswith('/printEarlyYearsPaper.js'):continue
                f=root/p;f.parent.mkdir(parents=True,exist_ok=True)
                f.write_text('\n'.join(markers))
            self.assertEqual(module.evaluate(root,contract)['result'],'HOLD')

    def test_valid_marker_list_but_broken_path_is_denied(self):
        with tempfile.TemporaryDirectory() as td:
            e=module.evaluate(td,contract)
            self.assertTrue(any(not v for v in e['checks'].values()))

if __name__=='__main__': unittest.main()
