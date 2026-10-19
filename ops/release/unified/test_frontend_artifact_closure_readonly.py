"""All tests run on synthetic isolated files; production and network untouched."""
import io
import hashlib
from pathlib import Path
import sys
import tarfile
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parent))
import verify_frontend_artifact_closure_readonly as gate
import assps_unified_readiness_readonly as unified

class ExactFrontendSourcePackageTests(unittest.TestCase):
    def setUp(self):
        self.t=tempfile.TemporaryDirectory()
        self.addCleanup(self.t.cleanup)
        base=Path(self.t.name)
        self.package=base/'package'
        self.package.mkdir()
        self.live=base/'active'
        self.live.mkdir()
        self.files={'index.html':b'<html><script src="/assets/current-12345678.js"></script></html>',
                    'assets/current-12345678.js':b'(()=>{window.current=1})()'}
        (self.live/'assets').mkdir()
        for name,data in self.files.items():
            p=self.live/name
            p.parent.mkdir(parents=True,exist_ok=True)
            p.write_bytes(data)
        self.manifest={name:hashlib.sha256(data).hexdigest() for name,data in self.files.items()}
        (self.package/'BUILT_ASSET_SHA256SUMS').write_text(
            ''.join(f'{hashval}  ./{name}\n' for name,hashval in self.manifest.items()))
        archive=self.package/'verified-source-build.tar.gz'
        with tarfile.open(archive,'w:gz') as tar:
            for name,data in self.files.items():
                info=tarfile.TarInfo('./'+name)
                info.size=len(data)
                tar.addfile(info,io.BytesIO(data))
        (self.package/'ARCHIVE.sha256').write_text(
            f'{hashlib.sha256(archive.read_bytes()).hexdigest()}  verified-source-build.tar.gz\n')
        self.p=patch.object(gate,'TARGET_SHA',self.manifest['index.html'])
        self.p.start();self.addCleanup(self.p.stop)

    def test_two_file_manifest_matches_exact_live_rebuild(self):
        evidence=gate.audit(self.package,self.live)
        self.assertTrue(evidence['trusted_packaged_source_build_pass'])
        self.assertTrue(evidence['immutable_artifact_go'])
        self.assertEqual(evidence['active_extra_file_count'],0)
        self.assertEqual(evidence['active_matching_file_count'],2)

    def test_unreferenced_old_public_chunk_blocks_immutable_release(self):
        (self.live/'assets'/'old-AAAABBBB.js').write_text('old code')
        evidence=gate.audit(self.package,self.live)
        self.assertTrue(evidence['trusted_packaged_source_build_pass'])
        self.assertFalse(evidence['immutable_artifact_go'])
        self.assertEqual(evidence['active_extra_file_count'],1)

    def test_unrecognized_extra_sensitive_media_never_logs_filename(self):
        (self.live/'principal-signature.png').write_bytes(b'\x89PNG')
        evidence=gate.audit(self.package,self.live)
        self.assertEqual(evidence['active_extra_sensitive_filename_indicators'],1)
        self.assertNotIn('principal-signature',repr(evidence))

    def test_corrupt_index_is_failed_artifact_not_an_extra(self):
        (self.live/'index.html').write_bytes(b'outdated')
        e=gate.audit(self.package,self.live)
        self.assertFalse(e['trusted_packaged_source_build_pass'])
        self.assertEqual(e['active_mismatched_file_count'],1)

    def test_missing_file_is_not_accepted(self):
        (self.live/'assets/current-12345678.js').unlink()
        e=gate.audit(self.package,self.live)
        self.assertFalse(e['trusted_packaged_source_build_pass'])
        self.assertEqual(e['active_missing_file_count'],1)

    def test_tampered_archive_is_refused_by_checksum(self):
        with (self.package/'verified-source-build.tar.gz').open('ab') as f:
            f.write(b'additional bytes')
        with self.assertRaises(ValueError):
            gate.audit(self.package,self.live)

    def test_unsafe_tar_traversal_is_refused(self):
        with self.assertRaises(ValueError):
            gate.safe_member_name('./../../credentials')
        with self.assertRaises(ValueError):
            gate.safe_member_name('/private/file')
        with self.assertRaises(ValueError):
            gate.safe_member_name('C:\\somewhere\\secret')

    def test_manifest_duplicate_and_malformed_hash_refused(self):
        path=self.package/'BUILT_ASSET_SHA256SUMS'
        with path.open('a') as f:
            f.write(f"{self.manifest['index.html']}  ./index.html\n")
        with self.assertRaises(ValueError):
            gate.read_manifest(path)

    def test_non_regular_symlink_is_refused(self):
        (self.live/'assets'/'external-12345678.js').symlink_to(self.live/'index.html')
        with self.assertRaises(ValueError):
            gate.audit(self.package,self.live)

    def test_unified_release_has_independent_orphan_gate(self):
        fixture={x:{'pass':True} for x in (
            'database','backup','frontend','rollback','http',
            'restricted_catalog_and_firstterm','source_privacy_inventory',
            'backend_source_inventory','attendance_roster_coverage','fee_ledger_integrity',
            'frontend_artifact_closure')}
        fixture['frontend']['sidecar_matches']=True
        fixture['backend_source_inventory']['whole_tree_safe']=True
        fixture['frontend_artifact_closure']['immutable_artifact_go']=False
        result=unified.classify(fixture)
        self.assertIn('active_frontend_has_public_legacy_or_extra_artifacts',result['unresolved_release_gates'])

if __name__=='__main__':
    unittest.main()
