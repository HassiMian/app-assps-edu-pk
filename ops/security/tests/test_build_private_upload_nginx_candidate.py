"""Synthetic adversarial tests; never read live secrets or modify Nginx."""
import hashlib
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

HERE = Path(__file__).resolve().parents[1]
BUILDER = HERE / 'build-private-upload-nginx-candidate.py'
POLICY = HERE / 'nginx-uploads-public-only.locations.conf'
COUNTS = {'apex-api-ssl':1,'apex-app-ssl':1,'apex-gateway':2,'apex-web-ssl':1}
OTHER = ('apex-api','apex-app','apex-web')
GENERIC = '''
    location /uploads/ {
        alias /var/uploads/;
        try_files $uri =404;
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
    }
'''
class CandidateSafety(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory(prefix='assps-p24-nginx-unit-')
  self.addCleanup(self.temp.cleanup)
  self.root=Path(self.temp.name)
  self.src=self.root/'live_sites'
  self.src.mkdir()
  for site,n in COUNTS.items():
   text='server {\n server_name '+site+';\n'+GENERIC*n+'\n location /other/ { return 200; }\n}\n'
   (self.src/site).write_text(text)
  for site in OTHER:
   (self.src/site).write_text('server { server_name '+site+'; return 200; }\n')
  self.global_conf=self.root/'nginx.conf'
  self.global_conf.write_text('events {}\nhttp { include /etc/nginx/sites-enabled/*; }\n')
  self.out=self.root/'staged'
 def call(self):
  return subprocess.run([sys.executable,str(BUILDER),'--sites',str(self.src),'--global-conf',str(self.global_conf),'--policy',str(POLICY),'--out',str(self.out)],capture_output=True,text=True,timeout=8)
 def test_complete_seven_site_copy_five_replacements_preserves_original_bytes(self):
  before={x.name:hashlib.sha256(x.read_bytes()).digest() for x in self.src.iterdir()}
  proc=self.call()
  self.assertEqual(proc.returncode,0,proc.stdout+proc.stderr)
  self.assertIn('rewritten=5',proc.stdout)
  self.assertEqual(len(list((self.out/'sites').iterdir())),7)
  for site,n in COUNTS.items():
   actual=(self.out/'sites'/site).read_text()
   self.assertEqual(actual.count('alias /var/uploads/branding/;'),n)
   self.assertEqual(actual.count('location ^~ /uploads/ {'),n)
   self.assertNotIn('alias /var/uploads/;',actual)
   self.assertIn('location /other/ { return 200; }',actual)
  for site in OTHER:
   self.assertEqual((self.out/'sites'/site).read_bytes(),(self.src/site).read_bytes())
  self.assertEqual(before,{x.name:hashlib.sha256(x.read_bytes()).digest() for x in self.src.iterdir()})
  self.assertEqual(self.out.stat().st_mode & 0o777,0o700)
  self.assertEqual((self.out/'sites'/'apex-gateway').stat().st_mode & 0o777,0o600)
  self.assertIn(str(self.out/'sites')+'/*;', (self.out/'nginx.conf').read_text())
 def test_second_run_cannot_overwrite_any_candidate(self):
  self.assertEqual(self.call().returncode,0)
  failed=self.call()
  self.assertEqual(failed.returncode,2)
  self.assertIn('already exists',failed.stderr)
 def test_missing_alias_fails_without_creating_output(self):
  target=self.src/'apex-api-ssl'
  target.write_text(target.read_text().replace(GENERIC,''))
  proc=self.call()
  self.assertEqual(proc.returncode,2)
  self.assertFalse(self.out.exists())
 def test_extra_alias_fails_without_creating_output(self):
  target=self.src/'apex-api-ssl'
  target.write_text(target.read_text().replace(GENERIC,GENERIC*2))
  proc=self.call()
  self.assertEqual(proc.returncode,2)
  self.assertFalse(self.out.exists())
 def test_unknown_auth_rewrite_fails_without_creating_output(self):
  target=self.src/'apex-api-ssl'
  target.write_text(target.read_text().replace('try_files $uri =404;', 'try_files $uri =404;\n auth_request /private_check;'))
  proc=self.call()
  self.assertEqual(proc.returncode,2)
  self.assertFalse(self.out.exists())
 def test_changed_main_include_fails_closed(self):
  self.global_conf.write_text('events {}\nhttp { include /new/nginx/sites/*; }\n')
  proc=self.call()
  self.assertEqual(proc.returncode,2)
  self.assertFalse(self.out.exists())
 def test_missing_expected_site_fails(self):
  (self.src/'apex-gateway').unlink()
  proc=self.call()
  self.assertEqual(proc.returncode,2)
  self.assertFalse(self.out.exists())
if __name__=='__main__':
 unittest.main(verbosity=2)
