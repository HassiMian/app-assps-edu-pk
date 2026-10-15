import importlib.util, pathlib, tempfile, unittest
S=pathlib.Path(__file__).with_name('verify-live-restricted-ai-worker-20261015.py')
spec=importlib.util.spec_from_file_location('verified_worker',S)
v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
class WorkerAcceptance(unittest.TestCase):
 def test_refuses_world_readable_credentials(self):
  with tempfile.TemporaryDirectory() as root:
   p=pathlib.Path(root)/'creds';p.write_text('x');p.chmod(0o644)
   self.assertFalse(v.worker_file_safe(p.stat()))
 def test_accepts_owner_private_file_permissions(self):
  with tempfile.TemporaryDirectory() as root:
   p=pathlib.Path(root)/'creds';p.write_text('x');p.chmod(0o600)
   self.assertEqual(v.worker_file_safe(p.stat()),p.stat().st_uid==0)
 def test_refuses_oversized_credentials(self):
  with tempfile.TemporaryDirectory() as root:
   p=pathlib.Path(root)/'creds';p.write_bytes(b'x'*4096);p.chmod(0o600)
   self.assertFalse(v.worker_file_safe(p.stat()))
 def test_exact_source_parity_not_merely_presence(self):
  with tempfile.TemporaryDirectory() as root:
   base=pathlib.Path(root)
   for rel in v.FILES:
    f=base/rel;f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes((v.SRC/rel).read_bytes())
   self.assertTrue(v.source_parity(base))
   (base/v.FILES[0]).write_bytes(b'evil')
   self.assertFalse(v.source_parity(base))
 def test_missing_file_blocks_parity(self):
  with tempfile.TemporaryDirectory() as root:
   self.assertFalse(v.source_parity(pathlib.Path(root)))
 def test_six_global_contract(self):
  self.assertEqual(len(set(v.SIX)),6)
  self.assertEqual(set(v.SIX),{'ai_jobs','ai_queue_events','ai_queue_state','organizations','campuses','admin_block_audit_log'})
 def test_never_assumes_production_release(self):
  src=S.read_text()
  self.assertIn("'production_release_certified':False",src)
  self.assertIn("'authenticated_staff_or_peer_tenant_certified':False",src)
if __name__=='__main__':unittest.main(verbosity=2)
