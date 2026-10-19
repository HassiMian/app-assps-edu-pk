#!/usr/bin/env python3
"""Synthetic-only release-fence tests; no production side effects."""
import importlib.util
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

src=Path(__file__).with_name("verify_live_artifact_fence.py")
spec=importlib.util.spec_from_file_location("fence",src)
fence=importlib.util.module_from_spec(spec)
spec.loader.exec_module(fence)

class ReleaseFenceTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name)/"active"
        self.root.mkdir()
        self.nginx=Path(self.tmp.name)/"nginx.conf"
        self.nginx.write_text("server {\n    root "+str(self.root)+";\n}\n")
        self.html=self.root/"index.html"
        self.html.write_text("<h1>test</h1>")
        self.commit="a"*40
        self.meta=self.root/"assps-release-attestation.json"
        self.write_meta(hashlib.sha256(self.html.read_bytes()).hexdigest())
        self.repo=Path(self.tmp.name)

    def write_meta(self,digest):
        self.meta.write_text(json.dumps({"frontend_index_sha256":digest,"candidate_commit":self.commit}))

    def test_consistent_attestation_and_known_commit(self):
        with patch.object(fence,"known_commit",return_value=True):
            self.assertEqual(fence.check(self.nginx,self.repo)["status"],"PASS")

    def test_modified_index_fails_closed(self):
        self.html.write_text("changed")
        with patch.object(fence,"known_commit",return_value=True):
            result=fence.check(self.nginx,self.repo)
            self.assertEqual(result["status"],"HOLD")
            self.assertFalse(result["checks"]["sha_attested"])

    def test_missing_github_source_object_fails_closed(self):
        with patch.object(fence,"known_commit",return_value=False):
            self.assertEqual(fence.check(self.nginx,self.repo)["status"],"HOLD")

    def test_missing_attestation_fails_closed(self):
        self.meta.unlink()
        self.assertEqual(fence.check(self.nginx,self.repo)["reason"],"MISSING_LIVE_INDEX_OR_ATTESTATION")

    def test_multiple_nginx_roots_fails_closed(self):
        self.nginx.write_text("root "+str(self.root)+";\nroot /var/www/another;\n")
        self.assertEqual(fence.check(self.nginx,self.repo)["reason"],"AMBIGUOUS_NGINX_ROOT")

    def test_non_hex_sha_fails_closed(self):
        self.write_meta("not_sha")
        with patch.object(fence,"known_commit",return_value=True):
            self.assertEqual(fence.check(self.nginx,self.repo)["status"],"HOLD")

if __name__=="__main__":
    unittest.main()
