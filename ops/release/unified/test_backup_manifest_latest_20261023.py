import unittest,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from assps_unified_readiness_readonly import validate_backup_manifest
L=Path('/var/backups/assps-critical-20261023T013552Z')
FILES=['live-apps-and-configs.tar.gz','postgres-all.sql.gz',
 'postgres-asspssigned-55432-all.sql.gz','worktree-vault-result.txt']
def lines(filenames,absolute=True):
 return ['f'*64+'  '+(str(L)+'/' if absolute else '')+name for name in filenames]
class LatestArchiveManifestTests(unittest.TestCase):
 def test_four_entries_absolute_names_are_accepted(self):
  self.assertEqual(len(validate_backup_manifest(lines(FILES),L)),4)
 def test_five_entry_backup_recovery_is_accepted(self):
  self.assertEqual(len(validate_backup_manifest(lines(FILES+['current-served-frontend-root.tar.gz'],False),L)),5)
 def test_other_backup_snapshot_is_rejected(self):
  a=lines(FILES)
  a[0]=a[0].replace(L.name,'assps-critical-20261021T013643Z')
  with self.assertRaises(RuntimeError):validate_backup_manifest(a,L)
 def test_manifest_duplicate_rejected(self):
  with self.assertRaises(RuntimeError):validate_backup_manifest(lines(FILES+FILES[:1]),L)
 def test_manifest_missing_secondary_pg_backup_rejected(self):
  with self.assertRaises(RuntimeError):validate_backup_manifest(lines(FILES[0:2]+FILES[3:]),L)
 def test_unreviewed_archive_rejected(self):
  with self.assertRaises(RuntimeError):validate_backup_manifest(lines(FILES+['arbitrary.zip']),L)
