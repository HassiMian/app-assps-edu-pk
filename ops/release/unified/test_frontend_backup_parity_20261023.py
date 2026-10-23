import unittest,sys,tarfile,tempfile,io
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from assps_unified_readiness_readonly import verify_frontend_archive_file_parity
class AssetParityTests(unittest.TestCase):
 def create(self,dir,name='active',content=b'ok',member='active/index.html'):
  root=Path(dir)/name;root.mkdir();(root/'index.html').write_bytes(content)
  arc=Path(dir)/'archive.tar.gz'
  with tarfile.open(arc,'w:gz') as t:
   info=tarfile.TarInfo(member);info.size=len(content)
   t.addfile(info,io.BytesIO(content))
  return root,arc
 def test_exact_restored_file_bytes_pass(self):
  with tempfile.TemporaryDirectory() as d:
   root,arc=self.create(d)
   self.assertEqual(verify_frontend_archive_file_parity(arc,root),1)
 def test_live_file_drift_refused(self):
  with tempfile.TemporaryDirectory() as d:
   root,arc=self.create(d)
   (root/'index.html').write_bytes(b'changed')
   with self.assertRaises(RuntimeError):verify_frontend_archive_file_parity(arc,root)
 def test_other_root_path_refused(self):
  with tempfile.TemporaryDirectory() as d:
   root,arc=self.create(d,member='other/index.html')
   with self.assertRaises(RuntimeError):verify_frontend_archive_file_parity(arc,root)
 def test_backup_omission_refused(self):
  with tempfile.TemporaryDirectory() as d:
   root,arc=self.create(d)
   (root/'other.js').write_bytes(b'extra')
   with self.assertRaises(RuntimeError):verify_frontend_archive_file_parity(arc,root)
