"""Disposable synthetic regression for the source-exact Nginx private-upload gate."""
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

MODULE = Path(__file__).resolve().parents[1] / 'verify-upload-cutover-source-parity-20261010.py'
spec = importlib.util.spec_from_file_location('upload_parity_gate', MODULE)
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)

def sha(data):
    return hashlib.sha256(data).hexdigest()

class ExactPrivateUploadParity(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='assps-nginx-fixture-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.enabled = self.root/'enabled'
        self.available = self.root/'available'
        self.candidate = self.root/'candidate'
        self.snapshot = self.root/'snapshot'
        self.policy = self.root/'policy.conf'
        self.globalconf = self.root/'nginx.conf'
        for p in (self.enabled,self.available,self.candidate/'sites',self.snapshot/'resolved'):
            p.mkdir(parents=True)
        self.policy.write_text(
            'location ^~ /uploads/branding/ {\n'
            '    alias /var/uploads/branding/;\n'
            '}\nlocation ^~ /uploads/ {\n'
            '    return 404;\n}\n'
        )
        self.globalconf.write_text('events {}\nhttp {\ninclude /etc/nginx/sites-enabled/*;\n}\n')
        self.names=['apex-api','apex-api-ssl','apex-app','apex-app-ssl',
                    'apex-gateway','apex-web','apex-web-ssl']
        meta={'global_sha256':sha(self.globalconf.read_bytes()),'sites':{}}
        for name in self.names:
            n=gate.EXPECT.get(name,0)
            loc='    location /uploads/ { alias /var/uploads/; try_files $uri =404; }\n'
            source='server {\n    listen 8080;\n'+(loc*n)+'}\n'
            target=self.available/name
            target.write_text(source)
            enabled=self.enabled/name
            enabled.symlink_to(target)
            meta['sites'][name]={'link':str(target),'resolved':str(target),
                                  'sha256':sha(source.encode())}
            (self.snapshot/'resolved'/name).write_text(source)
            planned=gate.GENERIC.sub(
                lambda m:'\n'.join(m.group(1)+line if line else '' for line in self.policy.read_text().splitlines()),source
            )
            (self.candidate/'sites'/name).write_text(planned)
        (self.candidate/'nginx.conf').write_text(
            self.globalconf.read_text().replace(gate.OLD_INCLUDE,
                    'include '+str(self.candidate/'sites')+'/*;'))
        self.manifest=self.snapshot/'manifest.json'
        self.manifest.write_text(json.dumps(meta,sort_keys=True))
        self.previous=gate.BASELINE
        gate.BASELINE=sha(self.manifest.read_bytes())
        self.addCleanup(lambda: setattr(gate,'BASELINE',self.previous))

    def run_gate(self):
        return gate.verify(self.enabled,self.globalconf,self.candidate,self.snapshot,self.policy)

    def test_exact_baseline_and_five_rewrites_pass(self):
        self.assertTrue(self.run_gate())

    def test_extra_staged_config_change_rejected(self):
        p=self.candidate/'sites'/'apex-gateway'
        p.write_text(p.read_text().replace('listen 8080','listen 9090'))
        with self.assertRaisesRegex(ValueError,'staged site differs'):
            self.run_gate()

    def test_original_source_drift_rejected(self):
        p=self.available/'apex-web-ssl'
        p.write_text(p.read_text()+'# unexpected change\n')
        with self.assertRaisesRegex(ValueError,'site baseline bytes drift'):
            self.run_gate()

    def test_symlink_target_drift_rejected(self):
        p=self.enabled/'apex-api'
        p.unlink()
        p.write_text('server {}\n')
        with self.assertRaisesRegex(ValueError,'site link/source drift'):
            self.run_gate()

    def test_policy_tamper_rejected(self):
        self.policy.write_text(self.policy.read_text()+'add_header Unexpected 1;\n')
        with self.assertRaisesRegex(ValueError,'staged site differs'):
            self.run_gate()

    def test_global_nginx_conf_drift_rejected(self):
        self.globalconf.write_text(self.globalconf.read_text()+'# changed\n')
        with self.assertRaisesRegex(ValueError,'current global configuration drift'):
            self.run_gate()

    def test_snapshot_manifest_tamper_rejected(self):
        self.manifest.write_text(self.manifest.read_text()+' ')
        with self.assertRaisesRegex(ValueError,'independent rollback manifest mismatch'):
            self.run_gate()

    def test_missing_enabled_site_rejected(self):
        (self.enabled/'apex-web').unlink()
        with self.assertRaisesRegex(ValueError,'current enabled-sites count'):
            self.run_gate()

if __name__=='__main__':
    unittest.main()
