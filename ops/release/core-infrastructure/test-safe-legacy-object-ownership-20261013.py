#!/usr/bin/env python3
import importlib.util
from pathlib import Path
import re,unittest
p=Path(__file__).with_name('rehearse-safe-legacy-object-ownership-20261013.py')
spec=importlib.util.spec_from_file_location('safe_legacy_owner',p)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def fixture():
 tables={('public',f'example_table_{i}','r'):'apexos_user' for i in range(80)}
 tables.update({('migration_backups',f'backup_table_{i}','r'):'apexos_user' for i in range(11)})
 tables.update({('public',f'example_seq_{i}','S'):'apexos_user' for i in range(72)})
 funcs={f'guard_func_{i}':'apexos_user' for i in range(6)}
 schema={'public':'apexos_user','migration_backups':'apexos_user'}
 src=(tables,funcs,schema,'apexos_user')
 dst=({k:'postgres' for k in tables},{k:'postgres' for k in funcs},
      {'public':'pg_database_owner','migration_backups':'postgres'},'postgres')
 return src,dst
class OwnerTests(unittest.TestCase):
 def test_expected_owner_inventory_passes(self):
  s,d=fixture();a=m.choose(s,d)
  self.assertEqual(a['issues'],[])
  self.assertEqual(len(a['owned_tables']),91)
  self.assertEqual(len(a['owned_sequences']),72)
  self.assertEqual(len(a['owned_functions']),6)
 def test_unexpected_paper_owner_conflict_holds(self):
  s,d=fixture();d[0][('public','example_table_0','r')]='apex_paper_owner'
  self.assertTrue(m.choose(s,d)['issues'])
 def test_missing_table_holds(self):
  s,d=fixture();del d[0][('public','example_table_0','r')]
  self.assertTrue(m.choose(s,d)['issues'])
 def test_missing_original_function_holds(self):
  s,d=fixture();del s[1]['guard_func_0']
  self.assertTrue(m.choose(s,d)['issues'])
 def test_qa_script_contains_hard_port_database_and_non_login_checks(self):
  s,d=fixture();sql=m.plan_sql(m.choose(s,d))
  self.assertIn("current_database()<>'assps_core_acl_replay_qa_20261013'",sql)
  self.assertIn("current_setting('port')<>'55432'",sql)
  self.assertIn('NOT rolcanlogin AND NOT rolbypassrls',sql)
  self.assertTrue(sql.startswith('BEGIN;'))
  self.assertTrue(sql.rstrip().endswith('COMMIT;'))
  self.assertNotRegex(sql,re.compile(r'\b(?:DROP|DELETE FROM|TRUNCATE|CREATE ROLE|GRANT ALL)\b',re.I))
 def test_identifier_injection_rejected(self):
  s,d=fixture();a=m.choose(s,d)
  a['owned_tables'].append(('public','bad;DROP','r'))
  with self.assertRaises(ValueError):m.plan_sql(a)
if __name__=='__main__':unittest.main()
