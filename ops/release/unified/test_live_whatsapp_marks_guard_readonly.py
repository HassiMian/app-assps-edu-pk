import unittest,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from verify_live_whatsapp_marks_guard_readonly import inspect
def mock(body):
 return "async function enterExamMarks({}={}) { "+body+" }\nasync function getOrPrintResultCards({}={}) {}"
SAFE="return {success: false, code: 'SIGNED_MARKS_ACTOR_REQUIRED', processed: 0, inserted: []}"
class LiveWhatsAppMarksSafety(unittest.TestCase):
 def test_safe_disabled_writer_is_accepted(self):
  self.assertTrue(inspect(source=mock(SAFE),syntax=True)['pass'])
 def test_write_to_results_always_fails(self):
  self.assertFalse(inspect(source=mock(SAFE+" queryDb('INSERT INTO exam_results');"),syntax=True)['pass'])
 def test_missing_actor_enforcement_fails(self):
  self.assertFalse(inspect(source=mock('return {success:true};'),syntax=True)['pass'])
 def test_missing_syntax_proof_fails(self):
  self.assertFalse(inspect(source=mock(SAFE),syntax=False)['pass'])
 def test_unverifiable_files_fail_closed(self):
  self.assertFalse(inspect(source='',syntax=True)['pass'])
