#!/usr/bin/env python3
import importlib.util
from pathlib import Path
import unittest
p=Path(__file__).with_name('fee-ledger-reconciliation-20261012.py')
spec=importlib.util.spec_from_file_location('fee_ledger_checks',p)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
class TestFeeLedger(unittest.TestCase):
 def test_sql_is_readonly_transaction_scoped(self):
  upper=m.SQL.upper()
  self.assertIn('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY',upper)
  self.assertIn('COMMIT;',upper)
  for banned in ('INSERT INTO ','UPDATE FEE','DELETE FROM ','TRUNCATE','DROP TABLE','ALTER TABLE'):
   self.assertNotIn(banned,upper)
  self.assertGreaterEqual(upper.count('SCHOOL_ID=1'),10)
 def test_ledger_sums_are_not_automatically_repaired(self):
  self.assertIn('SUM(AMOUNT)',m.SQL.upper())
  self.assertIn('CUMULATIVE_PAID',m.SQL.upper())
  self.assertIn('GREATEST(AMOUNT-PAID_AMOUNT,0)',m.SQL.upper())
 def test_full_aggregate_fields_parse(self):
  result='BEGIN\n'+'\n'.join(k+'|0' for k in m.REQUIRED)+'\nCOMMIT'
  self.assertEqual(len(m.parse(result)),len(m.REQUIRED))
 def test_missing_duplicated_or_malformed_counts_fail_closed(self):
  self.assertRaises(ValueError,m.parse,'BEGIN\nCHALLANS_TOTAL|898\nCOMMIT')
  self.assertRaises(ValueError,m.parse,'BEGIN\nCHALLANS_TOTAL|898\nCHALLANS_TOTAL|898\nCOMMIT')
  self.assertRaises(ValueError,m.parse,'BEGIN\nCHALLANS_TOTAL|student_info\nCOMMIT')
 def test_separates_true_ledger_drifts_from_review_signals(self):
  self.assertNotIn('CHALLAN_AMOUNT_PAID_EXCEEDS',m.HARD_FAIL)
  self.assertIn('LEDGER_SUM_DISAGREES_PAID',m.HARD_FAIL)
  self.assertIn('BALANCE_MISMATCH_CLAMPED_AMOUNT',m.REVIEW)
if __name__=='__main__':unittest.main()
