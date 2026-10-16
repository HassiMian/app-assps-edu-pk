#!/usr/bin/env python3
"""Negative QA for the immutable reviewed Next source delta."""
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

SOURCE=Path(__file__).with_name('verify_recovered_next_source_20261016.py')
spec=importlib.util.spec_from_file_location('next_source_recovery',SOURCE)
r=importlib.util.module_from_spec(spec)
spec.loader.exec_module(r)


class NextRecoveryNegativeTests(unittest.TestCase):
    def setUp(self):
        self.manifest=json.loads(r.MANIFEST.read_text())
        self.patch=r.PATCH.read_bytes()

    def test_reviewed_exact_delta_manifest_valid(self):
        self.assertTrue(r.valid_manifest(self.manifest,self.patch))

    def test_modified_patch_rejected(self):
        self.assertFalse(r.valid_manifest(self.manifest,self.patch+b'\n'))

    def test_no_fake_release_authority(self):
        m=copy.deepcopy(self.manifest)
        m['independent_security_certified']=True
        self.assertFalse(r.valid_manifest(m,self.patch))

    def test_no_fake_production_change(self):
        m=copy.deepcopy(self.manifest)
        m['production_modified']=True
        self.assertFalse(r.valid_manifest(m,self.patch))

    def test_wrong_source_commit_rejected(self):
        m=copy.deepcopy(self.manifest)
        m['reviewed_commit']='unsafe-commit'
        self.assertFalse(r.valid_manifest(m,self.patch))

    def test_path_traversal_rejected(self):
        m=copy.deepcopy(self.manifest)
        data=m['files'].pop(next(iter(m['files'])))
        m['files']['src/../../.env']=data
        self.assertFalse(r.valid_manifest(m,self.patch))

    def test_missing_patch_file_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            result=r.run(Path(folder),patch_path=Path(folder)/'absent.patch')
        self.assertEqual(result['source_recovery'],'HOLD')
        self.assertFalse(result['full_release_certified'])

    def test_unapproved_repository_fails_closed(self):
        with tempfile.TemporaryDirectory() as folder:
            result=r.run(Path(folder))
        self.assertEqual(result['source_recovery'],'HOLD')
        self.assertFalse(result['production_changed'])


if __name__=='__main__':
    unittest.main()
