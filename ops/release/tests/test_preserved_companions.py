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

    def test_compiled_graph_allows_a_complete_newer_release_without_fixed_sha(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            for filename,markers in contract['required_files'].items():
                f=root/filename;f.parent.mkdir(parents=True,exist_ok=True)
                f.write_text('\n'.join(markers)+'\n// newer independently reviewed design')
            dist=root/'dist';assets=dist/'assets';assets.mkdir(parents=True)
            (dist/'index.html').write_text('<script type="module" src="/assets/index-FUTURE11.js"></script>')
            (assets/'index-FUTURE11.js').write_text('''const diary="./DailyDiaryWorkspace-FUTURE11.js";
                const ey="./EarlyYearsWorksheetEditor-FUTURE11.js";''')
            (assets/'DailyDiaryWorkspace-FUTURE11.js').write_text(' '.join(contract['required_files'][next(x for x in contract['required_files'] if x.endswith('/DailyDiaryWorkspace.jsx'))]))
            (assets/'EarlyYearsWorksheetEditor-FUTURE11.js').write_text('printEarlyYearsPaper;"./printEarlyYearsPaper-FUTURE11.js"')
            (assets/'printEarlyYearsPaper-FUTURE11.js').write_text('early-years-sheet-a4 iframe 4mm')
            good=module.evaluate(root,contract,dist)
            self.assertEqual(good['result'],'PASS',good)
            # A newly included but UNREACHABLE correct chunk must not hide
            # a legacy active Diary module.
            (assets/'index-FUTURE11.js').write_text('''const diary="./DailyDiaryWorkspace-OLDVERS1.js";
                const ey="./EarlyYearsWorksheetEditor-FUTURE11.js";''')
            (assets/'DailyDiaryWorkspace-OLDVERS1.js').write_text('legacy diary only')
            bad=module.evaluate(root,contract,dist)
            self.assertEqual(bad['result'],'HOLD')
            self.assertFalse(bad['checks']['runtime_rich_diary_feature_proof'])

    def test_valid_marker_list_but_broken_path_is_denied(self):
        with tempfile.TemporaryDirectory() as td:
            e=module.evaluate(td,contract)
            self.assertTrue(any(not v for v in e['checks'].values()))

if __name__=='__main__': unittest.main()
