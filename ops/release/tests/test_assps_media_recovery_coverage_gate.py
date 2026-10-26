from importlib.util import spec_from_file_location,module_from_spec
from pathlib import Path
from io import BytesIO
import tarfile,tempfile,unittest
p=Path(__file__).resolve().parents[1]/'assps_media_recovery_coverage_gate.py'
s=spec_from_file_location('media',p); m=module_from_spec(s);s.loader.exec_module(m)
class MediaGate(unittest.TestCase):
 def setUp(self):
  self.t=tempfile.TemporaryDirectory();self.addCleanup(self.t.cleanup)
  self.root=Path(self.t.name);self.arc=self.root/'file.tar.gz'
 def make(self,name='uploads/branding/example.png',item_type=tarfile.REGTYPE):
  with tarfile.open(self.arc,'w:gz') as tar:
   v=tarfile.TarInfo(name);v.type=item_type;v.size=4 if item_type==tarfile.REGTYPE else 0
   tar.addfile(v,BytesIO(b'fake') if v.size else None)
 def test_ordinary_archive(self):
  self.make();self.assertEqual(m.archive_inventory(self.arc),(1,4))
 def test_outside_upload_root_denied(self):
  self.make('etc/shadow')
  with self.assertRaises(ValueError):m.archive_inventory(self.arc)
 def test_dotdot_denied(self):
  self.make('uploads/../unsafe')
  with self.assertRaises(ValueError):m.archive_inventory(self.arc)
 def test_absolute_denied(self):
  self.make('/uploads/private.txt')
  with self.assertRaises(ValueError):m.archive_inventory(self.arc)
 def test_symlink_denied(self):
  self.make('uploads/external',tarfile.SYMTYPE)
  with self.assertRaises(ValueError):m.archive_inventory(self.arc)
 def test_empty_archive_denied(self):
  with tarfile.open(self.arc,'w:gz'):pass
  with self.assertRaises(ValueError):m.archive_inventory(self.arc)
 def test_missing_ciphertext_blocks(self):
  self.make()
  mf=self.root/'SHA256SUMS'
  mf.write_text(m.checksum(self.arc)+'  uploads.tar.gz\n')
  with self.assertRaises(ValueError):m.review(self.arc,self.root/'no.p7m',mf)
 def test_corrupted_archive_manifest_blocks(self):
  self.make()
  mf=self.root/'SHA256SUMS';mf.write_text('0'*64+'  uploads.tar.gz\n')
  cipher=self.root/'fake.p7m';cipher.write_bytes(b'a')
  with self.assertRaises(ValueError):m.review(self.arc,cipher,mf)
if __name__=='__main__':unittest.main()
