"""Protect independent persisted daily lesson plans across every future frontend cutover."""
import importlib.util
import json
import shutil
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
  # Reproduce the old 'Term only; no Save Day' failure hermetically.
  # Never depend on another agent's /root/workspace archived build in CI.
  original=gate.validate(dist,contract)
  self.assertTrue(original['pass'],original)
  active=original['details']['active_lesson_modules']
  self.assertEqual(len(active),1,original)
  missing='Save Day to School Server'
  self.assertTrue(original['details']['runtime_markers'][missing])
  with tempfile.TemporaryDirectory(prefix='assps-lesson-legacy-negative-') as d:
   prior=Path(d)/'dist'
   shutil.copytree(dist,prior)
   module=prior/'assets'/active[0]
   content=module.read_text(encoding='utf-8')
   self.assertIn(missing,content)
   module.write_text(content.replace(missing,'ARCHIVED_TERM_ONLY_NO_DAILY_SAVE'),encoding='utf-8')
   report=gate.validate(prior,contract)
   self.assertFalse(report['pass'],report)
   self.assertFalse(report['checks']['all_runtime_ui_markers'])
   self.assertFalse(report['details']['runtime_markers'][missing])
   self.assertTrue(all(value for key,value in report['checks'].items()
                       if key!='all_runtime_ui_markers'),report)

 def test_daily_button_removal_alone_fails_closed(self):
  mutated={**contract,'required_lesson_module_markers':
    [*contract['required_lesson_module_markers'],'UNIMPLEMENTED_SENTINEL_DAY_PRINT']}
  report=gate.validate(dist,mutated,ROOT)
  self.assertFalse(report['pass'])
  self.assertFalse(report['details']['runtime_markers']['UNIMPLEMENTED_SENTINEL_DAY_PRINT'])

if __name__=='__main__':unittest.main()
