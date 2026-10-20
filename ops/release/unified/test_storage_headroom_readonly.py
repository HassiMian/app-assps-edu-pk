"""Pure no-database/no-network tests for disk headroom safety gate."""
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
sys.path.insert(0,str(Path(__file__).resolve().parent))
import assps_storage_headroom_readonly as storage

G=1073741824

class StorageHeadroomTests(unittest.TestCase):
    def test_good_capacity_can_be_staged(self):
        x=storage.evaluate(100*G,25*G)
        self.assertTrue(x['release_headroom_ok'])
    def test_low_bytes_rejected_despite_high_ratio(self):
        self.assertFalse(storage.evaluate(20*G,10*G)['release_headroom_ok'])
    def test_low_ratio_rejected_despite_high_bytes(self):
        self.assertFalse(storage.evaluate(200*G,15*G)['release_headroom_ok'])
    def test_garbage_disk_values_fail_closed(self):
        for total,free in [(0,0),(-1,0),(100,-1),(100,101),('bad',1),(10,1.5)]:
            with self.assertRaises(ValueError):storage.evaluate(total,free)
    def test_all_three_locations_observed_without_mutation(self):
        observed=[]
        def synthetic(path):
            observed.append(path)
            return SimpleNamespace(f_blocks=100,f_bavail=(7 if path=='/var/backups' else 20),f_frsize=G)
        report=storage.inspect(synthetic)
        self.assertEqual(tuple(observed),storage.PATHS)
        self.assertFalse(report['headroom_ok'])
        self.assertTrue(report['pass'])
    def test_missing_mount_is_error_not_success(self):
        def missing(path):raise OSError('unavailable')
        with self.assertRaises(OSError):storage.inspect(missing)

if __name__=='__main__': unittest.main()
