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
  # Hermetic prior-style bundle: well-formed entry, route and lesson assets,
  # all required markers EXCEPT Save Day. No private /root archive dependency.
  with tempfile.TemporaryDirectory() as directory:
   prior=Path(directory); assets=prior/'assets';assets.mkdir()
   entry='index-fixture-v4-20261017.js'
   route=contract.get('protected_route_entry','PaperGenerator')+'-fixture-v4-20261017.js'
   lesson=contract['protected_runtime_entry']+'-fixture-v4-20261017.js'
   (prior/'index.html').write_text('<script type="module" src="/assets/'+entry+'"></script>')
   (assets/entry).write_text('import("./'+route+'");import("./'+lesson+'");')
   (assets/route).write_text('/* synthetic prior paper route */')
   missing='Save Day to School Server'
   self.assertIn(missing,contract['required_lesson_module_markers'])
   (assets/lesson).write_text('\n'.join(m for m in contract['required_lesson_module_markers'] if m!=missing))
   report=gate.validate(prior,contract)
   self.assertFalse(report['pass'],report)
   for key in ('html_module_entry','no_missing_reachable_assets',
               'one_active_paper_generator_route','one_active_lesson_planner_module'):
    self.assertTrue(report['checks'][key],(key,report))
   self.assertFalse(report['checks']['all_runtime_ui_markers'])
   self.assertFalse(report['details']['runtime_markers'][missing])
   self.assertTrue(all(value for key,value in report['details']['runtime_markers'].items() if key!=missing))

 def test_daily_button_removal_alone_fails_closed(self):
  mutated={**contract,'required_lesson_module_markers':
    [*contract['required_lesson_module_markers'],'UNIMPLEMENTED_SENTINEL_DAY_PRINT']}
  report=gate.validate(dist,mutated,ROOT)
  self.assertFalse(report['pass'])
  self.assertFalse(report['details']['runtime_markers']['UNIMPLEMENTED_SENTINEL_DAY_PRINT'])

if __name__=='__main__':unittest.main()
