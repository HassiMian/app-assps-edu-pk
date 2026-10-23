import unittest,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from seal_firstterm_snapshot_readonly import inspect,canonical
ROW={'id':1,'school_id':1,'exam_id':9,'student_id':12,'subject':'English',
'marks_obtained':'0.00','total_marks':'50','grade':'F','result_status':'SCORED'}
class SnapshotSealTests(unittest.TestCase):
 def test_identical_records_have_same_hmac(self):
  self.assertEqual(inspect(rows=[ROW],key=b'x'*32)['hmac_sha256'],
   inspect(rows=[ROW.copy()],key=b'x'*32)['hmac_sha256'])
 def test_zero_change_detected(self):
  changed={**ROW,'marks_obtained':'30.00'}
  self.assertNotEqual(inspect(rows=[ROW],key=b'x'*32)['hmac_sha256'],
   inspect(rows=[changed],key=b'x'*32)['hmac_sha256'])
 def test_wrong_school_cannot_be_sealed(self):
  with self.assertRaises(ValueError):inspect(rows=[{**ROW,'school_id':2}],key=b'x'*32)
 def test_duplicate_row_prevented(self):
  with self.assertRaises(ValueError):inspect(rows=[ROW,ROW],key=b'x'*32)
