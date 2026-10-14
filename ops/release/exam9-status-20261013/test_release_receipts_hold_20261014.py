import tempfile
from pathlib import Path
from unittest import TestCase, main
from verify_release_receipts_20261014 import verified_receipt_gates, KINDS
class TestUnsignedFailsClosed(TestCase):
    def test_missing_bundle(self):
        self.assertEqual(verified_receipt_gates(None),dict.fromkeys(KINDS,False))
    def test_invalid_key_and_unsigned_bundle(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)
            (p/'key.pem').write_text('not a pinned Ed25519 key')
            (p/'evidence.json').write_text('{"schema":"assps-school-release-receipts-v1","events":[]}')
            self.assertEqual(verified_receipt_gates(p/'evidence.json',public_key=p/'key.pem'),dict.fromkeys(KINDS,False))
    def test_symlink_bundle_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)
            (p/'raw.json').write_text('{}')
            (p/'alias.json').symlink_to(p/'raw.json')
            self.assertFalse(any(verified_receipt_gates(p/'alias.json').values()))
if __name__=='__main__':
    main()
