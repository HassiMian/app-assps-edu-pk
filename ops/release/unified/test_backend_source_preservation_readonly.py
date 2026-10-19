import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import verify_backend_source_preservation_readonly as preservation

class ReadonlyBackendPreservation(unittest.TestCase):
    def test_exact_tree_is_consistent(self):
        with tempfile.TemporaryDirectory() as t:
            x=Path(t)/'source';y=Path(t)/'live';x.mkdir();y.mkdir()
            (x/'route.js').write_text('safe')
            (y/'route.js').write_text('safe')
            report=preservation.compare(y,x)
            self.assertTrue(report['can_replace_live_tree_wholesale'])
            self.assertEqual(report['byte_identical'],1)
    def test_missing_runtime_owned_asset_blocks_whole_tree_release(self):
        with tempfile.TemporaryDirectory() as t:
            x=Path(t)/'source';y=Path(t)/'live';x.mkdir();y.mkdir()
            (x/'route.js').write_text('safe')
            (y/'route.js').write_text('safe')
            (y/'shared').mkdir();(y/'shared'/'independent.mjs').write_text('preserved')
            report=preservation.compare(y,x)
            self.assertEqual(report['live_only_count'],1)
            self.assertEqual(report['independently_owned_live_only_count'],1)
            self.assertFalse(report['can_replace_live_tree_wholesale'])
    def test_source_diff_blocks_implicit_backward_overwrite(self):
        with tempfile.TemporaryDirectory() as t:
            x=Path(t)/'source';y=Path(t)/'live';x.mkdir();y.mkdir()
            (x/'route.js').write_text('older')
            (y/'route.js').write_text('newer')
            report=preservation.compare(y,x)
            self.assertEqual(report['different_paths'],['route.js'])
            self.assertTrue(report['source_review_required'])
    def test_unsupported_noncode_file_is_not_counted(self):
        with tempfile.TemporaryDirectory() as t:
            x=Path(t)/'source';y=Path(t)/'live';x.mkdir();y.mkdir()
            (y/'image.png').write_bytes(b'protected')
            report=preservation.compare(y,x)
            self.assertFalse(report['source_review_required'])
            self.assertEqual(report['live_files'],0)
    def test_symlink_fails_closed_without_reading_outside_tree(self):
        with tempfile.TemporaryDirectory() as t:
            x=Path(t)/'source';y=Path(t)/'live';x.mkdir();y.mkdir()
            secret=Path(t)/'outside.js';secret.write_text('restricted')
            (y/'sensitive.js').symlink_to(secret)
            with self.assertRaises(RuntimeError):
                preservation.compare(y,x)
    def test_files_are_not_modified(self):
        with tempfile.TemporaryDirectory() as t:
            x=Path(t)/'source';y=Path(t)/'live';x.mkdir();y.mkdir()
            a=x/'core.js';b=y/'core.js';a.write_text('expected');b.write_text('other')
            preservation.compare(y,x)
            self.assertEqual(a.read_text(),'expected')
            self.assertEqual(b.read_text(),'other')

if __name__=='__main__':unittest.main()
