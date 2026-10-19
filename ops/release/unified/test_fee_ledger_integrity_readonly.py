import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import assps_fee_ledger_integrity_readonly as m

class FinanceReadonly(unittest.TestCase):
    def fixture(self):return dict(m.BASELINE_MINIMUMS,**{key:0 for key in m.NO_ANOMALIES})
    def test_original_protected_finance_snapshot_passes(self):
        self.assertTrue(m.assess(self.fixture()))
    def test_future_month_challans_and_payments_may_grow(self):
        x=self.fixture()
        x['challans_total']+=150
        x['challans_school1']+=130
        x['payment_transactions_total']+=230
        self.assertTrue(m.assess(x))
    def test_missing_historic_records_fails(self):
        for key in m.BASELINE_MINIMUMS:
            x=self.fixture()
            x[key]-=1
            self.assertFalse(m.assess(x),key)
    def test_bad_money_and_cross_school_access_fails(self):
        for key in m.NO_ANOMALIES:
            x=self.fixture();x[key]=1
            self.assertFalse(m.assess(x),key)
    def test_duplicate_or_missing_aggregates_rejected(self):
        x=self.fixture()
        lines='\n'.join(f'{k}|{v}' for k,v in x.items())
        self.assertEqual(m.parse(lines),x)
        with self.assertRaises(ValueError):m.parse(lines+'\nchallans_total|905')
        with self.assertRaises(ValueError):m.parse('challans_total|905')
    def test_only_read_only_sql(self):
        sql=m.SQL.upper()
        self.assertIn('BEGIN TRANSACTION READ ONLY',sql)
        self.assertIn('CROSS_SCHOOL_TRANSACTIONS',sql)
        for fragment in ('INSERT INTO','UPDATE PUBLIC.','DELETE FROM','TRUNCATE ','CREATE ROLE'):
            self.assertNotIn(fragment,sql)
if __name__=='__main__':unittest.main()
