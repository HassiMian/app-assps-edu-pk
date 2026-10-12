#!/usr/bin/env python3
import importlib.util
from pathlib import Path
import unittest
p=Path(__file__).with_name('tenant-key-consistency-audit-20261012.py')
spec=importlib.util.spec_from_file_location('tenant_key_audit',p)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def fixture():
    return {**{k:(20,0,0,0) for k in m.TABLES},'DUPLICATE_TENANT_KEYS':(0,)}

class TenantKeyAuditorTests(unittest.TestCase):
    def test_read_only_and_no_pii_query(self):
        self.assertIn('REPEATABLE READ READ ONLY',m.SQL)
        self.assertIn('COMMIT;',m.SQL)
        for banned in ('INSERT INTO','UPDATE students','DELETE FROM','TRUNCATE','DROP TABLE'):
            self.assertNotIn(banned,m.SQL.upper())
        self.assertNotIn('gr_number',m.SQL)
    def test_healthy_all_tenants_pass(self):
        self.assertEqual(m.evaluate(fixture())['status'],'PASS')
    def test_mismatch_fail_closed(self):
        rows=fixture();rows['students']=(20,1,0,0)
        self.assertEqual(m.evaluate(rows)['status'],'HOLD')
    def test_orphan_fail_closed(self):
        rows=fixture();rows['fee_challans']=(20,0,2,0)
        self.assertEqual(m.evaluate(rows)['status'],'HOLD')
    def test_duplicate_tenant_key_fail_closed(self):
        rows=fixture();rows['DUPLICATE_TENANT_KEYS']=(1,)
        self.assertEqual(m.evaluate(rows)['status'],'HOLD')
    def test_legacy_null_tenant_is_review_signal(self):
        rows=fixture();rows['attendance']=(20,0,0,4)
        self.assertEqual(m.evaluate(rows)['status'],'WARN')
    def test_exact_result_shape(self):
        payload='BEGIN\n'+'\n'.join(f'{table}|20|0|0|0' for table in m.TABLES)+'\nDUPLICATE_TENANT_KEYS|0\nCOMMIT\n'
        self.assertEqual(m.parse_result(payload),fixture())
    def test_incomplete_or_duplicate_results_denied(self):
        self.assertRaises(ValueError,m.parse_result,'BEGIN\nstudents|2|0|0|0\nCOMMIT\n')
        payload='BEGIN\n'+'\n'.join(f'{table}|20|0|0|0' for table in m.TABLES)+'\nstudents|20|0|0|0\nDUPLICATE_TENANT_KEYS|0\nCOMMIT\n'
        self.assertRaises(ValueError,m.parse_result,payload)

if __name__=='__main__':unittest.main()
