from importlib.util import module_from_spec,spec_from_file_location
from pathlib import Path
import tempfile,unittest
FILE=Path(__file__).resolve().parents[1]/'assps_legacy_static_asset_overlay.py'
s=spec_from_file_location('static_overlay',FILE)
m=module_from_spec(s);s.loader.exec_module(m)
class Safety(unittest.TestCase):
 def setUp(self):
  self.t=tempfile.TemporaryDirectory();self.addCleanup(self.t.cleanup)
  p=Path(self.t.name);self.old=p/'old';self.new=p/'new'
  for x in (self.old,self.new):(x/'assets').mkdir(parents=True)
  (self.old/'index.html').write_text('<script src="/assets/app-ABCDEFGH.js"></script>')
  (self.new/'index.html').write_text('<script src="/assets/app-ZYXWVUTS.js"></script>')
  (self.old/'assets/app-ABCDEFGH.js').write_bytes(b'old')
  (self.new/'assets/app-ZYXWVUTS.js').write_bytes(b'new')
  self.a=m.sha(self.old/'index.html');self.b=m.sha(self.new/'index.html')
 def run_gate(self):return m.assess(self.old,self.new,self.a,self.b)
 def test_cached_old_index_asset_is_included(self):
  self.assertEqual(len(self.run_gate()['fallback']),1)
 def test_stale_signed_index_blocks(self):
  with self.assertRaises(ValueError):m.assess(self.old,self.new,'0'*64,self.b)
 def test_collision_with_different_bytes_fails(self):
  (self.new/'assets/app-ABCDEFGH.js').write_bytes(b'changed')
  with self.assertRaises(ValueError):self.run_gate()
 def test_symlink_fails(self):
  (self.old/'assets/ref.js').symlink_to(self.old/'assets/app-ABCDEFGH.js')
  with self.assertRaises(ValueError):self.run_gate()
 def test_backup_artifact_never_copied(self):
  (self.old/'assets/backup-ABCD1234.js.bak_pos_20261023').write_bytes(b'bad')
  self.assertEqual(len(self.run_gate()['fallback']),1)
 def test_dryrun_does_not_create_output(self):
  out=Path('/root/workspace/assps-lesson-fasttrack-preview-unit-20261026-'+self.t.name.split('-')[-1])
  r=m.execute(self.old,self.new,out,self.a,self.b,False)
  self.assertFalse(out.exists());self.assertFalse(r['staged'])
 def test_bad_file_hash_suffix_is_not_allowlisted(self):
  (self.old/'assets/sneaky.js').write_bytes(b'a')
  self.assertEqual(len(self.run_gate()['fallback']),1)
 def test_unavailable_cached_reference_fails(self):
  (self.old/'index.html').write_text('<script src="/assets/missing.js"></script>')
  self.a=m.sha(self.old/'index.html')
  with self.assertRaises(ValueError):self.run_gate()
 def test_never_stage_to_production(self):
  with self.assertRaises(ValueError):m.execute(self.old,self.new,Path('/var/www/assps-test-new-release'),self.a,self.b,True)
if __name__=='__main__':unittest.main()
