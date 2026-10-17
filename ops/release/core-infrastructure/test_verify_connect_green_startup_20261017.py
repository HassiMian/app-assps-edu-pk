"""Isolated, synthetic contract checks. Never fetch real PM2/env/credentials."""
import hashlib
import json
from pathlib import Path
from types import SimpleNamespace
import os
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parent))
import verify_connect_green_startup_20261017 as m

CONFIG=b"module.exports = {apps: [{name: 'apex-connect',env: { NEXT_DIST_DIR: '.next' }}]};\n"

def state():
 return ([{'name':'apex-connect-green', 'pm2_env':{'status':'online','NEXT_DIST_DIR':'.next','APP_PORT':'3002','pm_cwd':'/var/www/apex-connect','restart_time':30947}}],
         [{'name':'apex-connect-green','NEXT_DIST_DIR':'.next','APP_PORT':'3002','pm_cwd':'/var/www/apex-connect'}])

class GreenBootContract(unittest.TestCase):
 def test_only_pinned_known_good_config_and_manifest(self):
  with patch.object(m,'KNOWN_CONFIG_SHA',hashlib.sha256(CONFIG).hexdigest()):
   self.assertTrue(m.config_is_reviewed(CONFIG,True,True))

 def test_known_bad_candidate_missing_starts_fail_closed(self):
  bad=CONFIG.replace(b"'.next'", b"'.next-candidate'")
  with patch.object(m,'KNOWN_CONFIG_SHA',hashlib.sha256(bad).hexdigest()):
   with self.assertRaisesRegex(ValueError,'CONNECT_CANDIDATE_STARTUP_RISK'):m.config_is_reviewed(bad,True,True)

 def test_changed_config_without_reviewed_sha_rejected(self):
  with patch.object(m,'KNOWN_CONFIG_SHA',hashlib.sha256(CONFIG).hexdigest()):
   with self.assertRaisesRegex(ValueError,'STARTUP_RECIPE_SHA_DRIFT'):m.config_is_reviewed(CONFIG+b'new setting',True,True)

 def test_stable_artifact_requirements(self):
  with patch.object(m,'KNOWN_CONFIG_SHA',hashlib.sha256(CONFIG).hexdigest()):
   for a,b in [(False,True),(True,False),(False,False)]:
    with self.assertRaisesRegex(ValueError,'APPROVED_STABLE_NEXT_BUILD_MISSING'):m.config_is_reviewed(CONFIG,a,b)

 def test_matching_running_and_saved_pm2(self):
  a,b=state()
  self.assertEqual(m.check_pm2(a,b),30947)

 def test_saved_wrong_dist_and_port_rejected(self):
  for key,value in [('NEXT_DIST_DIR','.next-candidate'),('APP_PORT','3000'),('pm_cwd','/tmp/unsafe')]:
   a,b=state();b[0][key]=value
   with self.assertRaises(ValueError):m.check_pm2(a,b)

 def test_running_wrong_dist_port_or_cwd_rejected(self):
  for key,value in [('NEXT_DIST_DIR','.next-candidate'),('APP_PORT','3000'),('pm_cwd','/tmp'),('status','errored')]:
   a,b=state();a[0]['pm2_env'][key]=value
   with self.assertRaises(ValueError):m.check_pm2(a,b)

 def test_missing_duplicate_or_negative_restart_green(self):
  a,b=state()
  with self.assertRaises(ValueError):m.check_pm2([],b)
  with self.assertRaises(ValueError):m.check_pm2(a+a,b)
  with self.assertRaises(ValueError):m.check_pm2(a,b+b)
  a[0]['pm2_env']['restart_time']=-1
  with self.assertRaises(ValueError):m.check_pm2(a,b)

 def test_reject_symlink_and_weak_mode_metadata(self):
  # Hosted CI is not root. Simulate only stat owner for this synthetic file,
  # keeping the real production root-owned file requirement untouched.
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'protected.cjs';p.write_bytes(CONFIG)
   os.chmod(p,0o600)
   actual_lstat=Path.lstat

   def fixture_stat(path,denied=None):
    st=actual_lstat(path)
    return SimpleNamespace(st_mode=st.st_mode,st_uid=42 if path==denied else 0)

   with patch.object(Path,'lstat',autospec=True,
                     side_effect=lambda path:fixture_stat(path,p)):
    with self.assertRaisesRegex(ValueError,'UNTRUSTED_STARTUP_FILE'):
     m.safe_regular_file(p,private=True)
   with patch.object(Path,'lstat',autospec=True,side_effect=fixture_stat):
    self.assertEqual(m.safe_regular_file(p,private=True),CONFIG)
    os.chmod(p,0o644)
    with self.assertRaisesRegex(ValueError,'UNSAFE_PRIVATE_BACKUP_PERMISSIONS'):
     m.safe_regular_file(p,private=True)
    l=Path(d)/'link.cjs';l.symlink_to(p)
    with self.assertRaisesRegex(ValueError,'UNTRUSTED_STARTUP_FILE'):
     m.safe_regular_file(l)

 def test_no_live_readwithout_explicit_optin(self):
  self.assertEqual(m.main([]),2)

 def test_even_valid_runtime_does_not_certify_or_mutate_release(self):
  with patch.object(m,'read_live_status',return_value={'runtime_green_restarts_historical':30947}):
   from io import StringIO
   from contextlib import redirect_stdout
   stream=StringIO()
   with redirect_stdout(stream):
    self.assertEqual(m.main(['--live-readonly']),2)
   obj=json.loads(stream.getvalue())
   self.assertIs(obj['production_modified'],False)
   self.assertIs(obj['full_release_authorized'],False)
   self.assertEqual(obj['status'],'STARTUP_RECIPE_CONSISTENT_NOT_SIGNED_RELEASE')

if __name__=='__main__':unittest.main()
