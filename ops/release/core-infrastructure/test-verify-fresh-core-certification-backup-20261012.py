#!/usr/bin/env python3
import importlib.util
from pathlib import Path
import unittest
p=Path(__file__).with_name('verify-fresh-core-certification-backup-20261012.py')
spec=importlib.util.spec_from_file_location('backup_cert_gate',p)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def fixture():
 return {name:True for name in ('directory_secure','files_secure','digest_valid',
   'restore_catalogue_valid','archive_db_apexos','policy_count_matches','table_data_present','fresh')}
class BackupGateTests(unittest.TestCase):
 def test_fully_verified_still_not_rollback(self):
  result=m.evaluate(fixture());self.assertEqual(result['status'],'PASS_BACKUP_READINESS_ONLY')
  self.assertFalse(result['rollback_drill_completed'])
  self.assertFalse(result['full_release_certified'])
 def test_every_incomplete_condition_causes_hold(self):
  for name in fixture():
   f=fixture();f[name]=False
   self.assertEqual(m.evaluate(f)['status'],'HOLD',name)
 def test_missing_manifest_entry_holds(self):
  f=fixture();del f['digest_valid']
  self.assertEqual(m.evaluate(f)['status'],'HOLD')
 def test_backup_root_and_age_are_pinned(self):
  self.assertEqual(m.BACKUP.parent,Path('/root/assps-release-backups'))
  self.assertEqual(m.MAX_AGE_SECONDS,24*3600)
if __name__=='__main__':unittest.main()
