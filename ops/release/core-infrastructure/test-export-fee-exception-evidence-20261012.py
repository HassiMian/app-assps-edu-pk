#!/usr/bin/env python3
import importlib.util
from pathlib import Path
import unittest
p=Path(__file__).with_name('export-fee-exception-evidence-20261012.py')
s=importlib.util.spec_from_file_location('fee_exc',p)
m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
class TestPrivateFinancialEvidence(unittest.TestCase):
 def test_readonly_sql_only(self):
  sql=m.SQL.upper()
  self.assertIn('READ ONLY',sql)
  self.assertIn('WHERE SCHOOL_ID=1',sql)
  for x in ('INSERT INTO ','UPDATE FEE','DELETE FROM','DROP TABLE','ALTER TABLE','TRUNCATE'):
   self.assertNotIn(x,sql)
 def test_private_mode_file_and_no_overwrite(self):
  src=p.read_text()
  self.assertIn('0o600',src)
  self.assertIn('0o700',src)
  self.assertIn('O_EXCL',src)
 def test_case_signals_can_overlap(self):
  r={'challan_id':15,'nominal_overpaid':True,'nominal_balance_mismatch':True,
     'gross_balance_mismatch':False,'gross_amount_mismatch':True}
  self.assertEqual(m.aggregate([r])['exception_rows'],1)
  self.assertEqual(m.aggregate([r])['nominal_balance_mismatch'],1)
 def test_incomplete_or_duplicate_rows_denied(self):
  self.assertRaises(ValueError,m.parse,'BEGIN\n{}\n')
  row='{"challan_id":15,"nominal_overpaid":true}'
  self.assertRaises(ValueError,m.parse,'BEGIN\n'+row+'\n'+row+'\nCOMMIT')
if __name__=='__main__':unittest.main()
