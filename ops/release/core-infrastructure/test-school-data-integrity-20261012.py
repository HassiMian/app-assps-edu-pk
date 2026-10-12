#!/usr/bin/env python3
import importlib.util
from pathlib import Path
import unittest
p=Path(__file__).with_name('school-data-integrity-20261012.py')
spec=importlib.util.spec_from_file_location('integrity',p)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
class Tests(unittest.TestCase):
 def test_query_transaction_and_scope(self):
  self.assertIn('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;',m.SQL)
  self.assertIn('COMMIT;',m.SQL)
  self.assertGreaterEqual(m.SQL.count('school_id=1'),7)
  for banned in ('INSERT INTO','UPDATE students','DELETE FROM','DROP TABLE','ALTER TABLE','TRUNCATE'):
   self.assertNotIn(banned.upper(),m.SQL.upper())
 def test_complete_result_parses(self):
  sample='BEGIN\n'+'\n'.join(f'{k}|0' for k in sorted(m.COUNT_NAMES|m.GUARD_NAMES))+'\nCOMMIT\n'
  self.assertEqual(len(m.parse_result(sample)),13)
 def test_missing_or_duplicate_guard_fails_closed(self):
  self.assertRaises(ValueError,m.parse_result,'BEGIN\nSTUDENTS|318\nCOMMIT')
  self.assertRaises(ValueError,m.parse_result,'BEGIN\nSTUDENTS|318\nSTUDENTS|319\nCOMMIT')
 def test_no_personal_names_or_free_text_selected(self):
  self.assertNotIn('s.name',m.SQL)
  self.assertNotIn('gr_number',m.SQL)
  self.assertEqual(len(m.GUARD_NAMES),7)
if __name__=='__main__':unittest.main()
