"""Hermetic private staging tests; never use production source or school media bytes."""
import hashlib
import io
from pathlib import Path
import sys
import tarfile
import tempfile
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parent))
from stage_private_frontend_candidate import private_stage

class PrivateSourceArtifactStageTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        p=Path(self.temp.name)
        self.archive=p/'trusted'
        self.archive.mkdir()
        self.candidate_parent=p/'private'
        self.candidate_parent.mkdir()
        self.fixture={
            'index.html':b'<html><script src="/assets/app.js"></script></html>',
            'assets/app.js':b'const blocked="/principal-signature.png";',
            'principal-signature.png':b'fictional fixture only',
        }
        with tarfile.open(self.archive/'verified-source-build.tar.gz','w:gz') as t:
            for name,body in self.fixture.items():
                info=tarfile.TarInfo('./'+name);info.size=len(body)
                t.addfile(info,io.BytesIO(body))
        src=self.archive/'verified-source-build.tar.gz'
        (self.archive/'ARCHIVE.sha256').write_text(
            f'{hashlib.sha256(src.read_bytes()).hexdigest()}  verified-source-build.tar.gz\n')
        (self.archive/'BUILT_ASSET_SHA256SUMS').write_text(
            ''.join(f"{hashlib.sha256(v).hexdigest()}  ./{k}\n" for k,v in self.fixture.items()))

    def test_private_staging_excludes_sensitive_static_file_but_keeps_bundle_exact(self):
        e=private_stage(self.archive,self.candidate_parent,'verified-clean-front-fixture')
        path=self.candidate_parent/'verified-clean-front-fixture'
        self.assertEqual(e['original_packaged_count'],3)
        self.assertEqual(e['excluded_protected_media_count'],1)
        self.assertEqual(e['staged_public_asset_count'],2)
        self.assertFalse(e['sensitive_static_asset_present'])
        self.assertFalse(e['safe_to_deploy'])
        self.assertTrue((path/'site'/'index.html').is_file())
        self.assertFalse((path/'site'/'principal-signature.png').exists())
        self.assertEqual(e['unresolved_private_static_references'],1)
        self.assertEqual((path/'site'/'index.html').read_bytes(),self.fixture['index.html'])
        self.assertFalse((self.archive/'principal-signature.png').exists())

    def test_cannot_override_a_preexisting_candidate(self):
        private_stage(self.archive,self.candidate_parent,'verified-clean-front-locked')
        with self.assertRaises(ValueError):
            private_stage(self.archive,self.candidate_parent,'verified-clean-front-locked')

    def test_malformed_candidate_name_denied(self):
        with self.assertRaises(ValueError):
            private_stage(self.archive,self.candidate_parent,'../../override')

    def test_modified_original_tar_checksum_denied(self):
        src=self.archive/'verified-source-build.tar.gz'
        with src.open('ab') as f:f.write(b'wrong')
        with self.assertRaises(ValueError):
            private_stage(self.archive,self.candidate_parent,'verified-clean-front-modified')
        self.assertFalse((self.candidate_parent/'verified-clean-front-modified').exists())

    def test_no_sensitive_media_source_to_remove_refuses_unauthorized_stage(self):
        (self.archive/'BUILT_ASSET_SHA256SUMS').write_text(
            ''.join(f"{hashlib.sha256(v).hexdigest()}  ./{k}\n"
                    for k,v in self.fixture.items() if not k.endswith('.png')))
        with self.assertRaises(ValueError):
            private_stage(self.archive,self.candidate_parent,'verified-clean-front-notreviewed')

if __name__=='__main__':
    unittest.main()
