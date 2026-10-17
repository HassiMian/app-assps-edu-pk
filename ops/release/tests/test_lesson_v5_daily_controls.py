"""Protect independent persisted daily lesson plans across every future frontend cutover."""
import importlib.util
import json
import tempfile
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[3]
script=ROOT/'ops/release/check-lesson-planner-ui.py'
spec=importlib.util.spec_from_file_location('lesson_v5',script)
gate=importlib.util.module_from_spec(spec);spec.loader.exec_module(gate)
contract=json.loads((ROOT/'ops/release/lesson-planner-ui-contract-v5.json').read_text())
dist=ROOT/'al-siddique-frontend/dist'
DAILY_MARKERS=(
 'Save Day to School Server','Server Saved Days','Daily lesson statements',
 'Learning objectives','Teacher activities / resources','Homework / follow-up',
 'Daily assessment (optional)'
)

class IndependentDailyControls(unittest.TestCase):
 def test_actual_built_bundle_has_independent_day_and_live_diary(self):
  report=gate.validate(dist,contract,ROOT)
  self.assertEqual(report['result'],'PASS',report)
  for text in DAILY_MARKERS:self.assertTrue(report['details']['runtime_markers'][text])

 def test_old_paper_term_bundle_without_save_day_must_fail(self):
  # Hermetic archived-like bundle: current real built bundle has its own positive test.
  missing='Save Day to School Server'
  self.assertIn(missing,contract['required_lesson_module_markers'])
  with tempfile.TemporaryDirectory() as folder:
   root=Path(folder);assets=root/'assets';assets.mkdir()
   names=['index-negativefixture.js','PaperGenerator-negativefixture.js','LessonPlanModule-negativefixture.js']
   (root/'index.html').write_text('<script type="module" src="/assets/'+names[0]+'"></script>')
   (assets/names[0]).write_text('import "./'+names[1]+'";')
   (assets/names[1]).write_text('import "./'+names[2]+'";')
   (assets/names[2]).write_text('\n'.join(x for x in contract['required_lesson_module_markers'] if x!=missing))
   report=gate.validate(root,contract)
   self.assertFalse(report['pass'],report)
   self.assertTrue(report['checks']['one_active_lesson_planner_module'],report)
   self.assertTrue(report['checks']['no_missing_reachable_assets'],report)
   self.assertFalse(report['checks']['all_runtime_ui_markers'],report)
   self.assertIs(report['details']['runtime_markers'][missing],False)
   self.assertTrue(all(v for k,v in report['details']['runtime_markers'].items() if k!=missing),report)

 def test_daily_button_removal_alone_fails_closed(self):
  mutated={**contract,'required_lesson_module_markers':
    [*contract['required_lesson_module_markers'],'UNIMPLEMENTED_SENTINEL_DAY_PRINT']}
  report=gate.validate(dist,mutated,ROOT)
  self.assertFalse(report['pass'])
  self.assertFalse(report['details']['runtime_markers']['UNIMPLEMENTED_SENTINEL_DAY_PRINT'])

if __name__=='__main__':unittest.main()
