import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import patch

src=Path(__file__).with_name('owner_upload_intake_20261016.py')
spec=importlib.util.spec_from_file_location('owner_intake',src)
g=importlib.util.module_from_spec(spec)
spec.loader.exec_module(g)
DIGEST='a'*64

def fake_core(recovery=True,worker=True,peer=True):
    return SimpleNamespace(
        verified_owner_key=lambda:object(),
        verify_signed_recovery_receipt=lambda *a:recovery,
        verify_signed_worker_receipt=lambda *a:worker,
        verify_signed_peer_tenant_receipt=lambda *a:peer,
        APPROVED_BACKUP_SHA256='b'*64,
        APPROVED_BLUE_ARCHIVE_SHA256='c'*64)

class TestOwnerEvidenceIntake(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.base=Path(self.tmp.name)
        self.source=self.base/'bundle.json'
        self.source.write_text(json.dumps({'receipts':[
            {'payload_b64':'eA==','signature_b64':'eQ=='}]*3}))

    def inspect(self,core=None):
        return g.inspect_bundle(self.source,'core-current-20261016',DIGEST,
                                'ONDwxEIZlx5onDIKY7wYf',core or fake_core())

    def test_owner_upload_can_only_be_private_staged(self):
        _,r=self.inspect()
        self.assertEqual(r['decision'],'VALIDATED_FOR_PRIVATE_STAGING')
        self.assertFalse(r['installedInOfficialCoreIntake'])
        self.assertFalse(r['productionChanged'])

    def test_all_three_independent_checks_required(self):
        for args in ({'recovery':False},{'worker':False},{'peer':False}):
            _,r=self.inspect(fake_core(**args))
            self.assertEqual(r['decision'],'HOLD_MISSING_OR_INVALID_SIGNED_EVIDENCE')

    def test_malformed_and_oversized_uploads_fail_closed(self):
        self.source.write_text(json.dumps({'receipts':[{'unexpected':'not verified'}]}))
        with self.assertRaises(ValueError):
            self.inspect()
        self.source.write_bytes(b'X'*70000)
        with self.assertRaises(ValueError):
            self.inspect()

    def test_stage_no_overwrite(self):
        dest=self.base/'private';dest.mkdir(mode=0o700)
        with patch.object(g.os,'geteuid',return_value=0):
            saved=g.private_stage(b'fixture',DIGEST,dest)
            self.assertEqual(saved.stat().st_mode&0o777,0o600)
            with self.assertRaises(FileExistsError):
                g.private_stage(b'another',DIGEST,dest)
            self.assertEqual(saved.read_bytes(),b'fixture')

    def test_invalid_hash_and_stage_directory_fail_closed(self):
        with self.assertRaises(ValueError):
            g.inspect_bundle(self.source,'core-current-20261016','nohash',
                             'ONDwxEIZlx5onDIKY7wYf',fake_core())
        dest=self.base/'private';dest.mkdir()
        dest.chmod(0o755)
        with patch.object(g.os,'geteuid',return_value=0):
            with self.assertRaises(ValueError):
                g.private_stage(b'fixture',DIGEST,dest)

    def test_symlink_bundle_rejected(self):
        link=self.base/'linked.json'
        link.symlink_to(self.source)
        with self.assertRaises(ValueError):
            g.inspect_bundle(link,'core-current-20261016',DIGEST,
                             'ONDwxEIZlx5onDIKY7wYf',fake_core())

    def test_pinned_original_core_verifier_available(self):
        if not g.TRUSTED_CORE.is_file():
            self.skipTest("pinned verifier only installed on Core VPS")
        official=g.load_trusted_core()
        self.assertTrue(callable(official.verify_signed_worker_receipt))
        self.assertTrue(callable(official.verify_signed_peer_tenant_receipt))
        self.assertTrue(callable(official.verify_signed_recovery_receipt))

if __name__=='__main__':
    unittest.main()
