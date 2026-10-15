"""Deterministic private-fixture regression tests, no real school records."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[3]
script = ROOT / 'ops/release/check-lesson-planner-ui.py'
spec = importlib.util.spec_from_file_location('lesson_ui', script)
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)
contract = json.loads((ROOT/'ops/release/lesson-planner-ui-contract-v3.json').read_text())
dist = ROOT/'al-siddique-frontend/dist'

class LessonUiReleaseTests(unittest.TestCase):
    def test_candidate_build_passes(self):
        result=gate.validate(dist,contract,ROOT)
        self.assertTrue(result['pass'],result)
        self.assertTrue(result['details']['active_lesson_modules'])

    def test_stale_chunks_cannot_mask_an_active_old_module(self):
        with tempfile.TemporaryDirectory() as temp:
            d=Path(temp)
            (d/'assets').mkdir()
            (d/'index.html').write_text(
              '<script type="module" src="/assets/index-ORIGINAL1.js"></script>')
            (d/'assets/index-ORIGINAL1.js').write_text(
              'const route="./PaperGenerator-ORIGINAL1.js";')
            (d/'assets/PaperGenerator-ORIGINAL1.js').write_text(
              'const lesson="./LessonPlanModule-OLDVERS1.js";')
            (d/'assets/LessonPlanModule-OLDVERS1.js').write_text('Old lesson editor only')
            (d/'assets/LessonPlanModule-NEWVERS1.js').write_text(
              ' '.join(contract['required_lesson_module_markers']))
            result=gate.validate(d,contract)
            self.assertFalse(result['pass'])
            self.assertEqual(result['details']['active_lesson_modules'],
                             ['LessonPlanModule-OLDVERS1.js'])

    def test_absent_html_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            self.assertFalse(gate.validate(temp,contract)['pass'])

    def test_entry_asset_missing_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            d=Path(temp)
            (d/'assets').mkdir()
            (d/'index.html').write_text(
              '<script type="module" src="/assets/index-ABSENT01.js"></script>')
            result=gate.validate(d,contract)
            self.assertFalse(result['pass'])
            self.assertFalse(result['checks']['no_missing_reachable_assets'])

    def test_missing_reproducible_source_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            result=gate.validate(dist,contract,temp)
            self.assertFalse(result['pass'])
            self.assertFalse(result['checks']['all_source_module_files'])

if __name__=='__main__':
    unittest.main()
