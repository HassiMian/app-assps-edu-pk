import importlib.util
import pathlib
import unittest
from urllib.error import HTTPError

path = pathlib.Path(__file__).with_name("verify_live_unsafe_save_guard_20261019.py")
spec = importlib.util.spec_from_file_location("guard_verifier", path)
guard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guard)

class GuardVerifierTests(unittest.TestCase):
    def test_all_four_domains_required(self):
        all_good = [{"host": h, "guardPass": True, "status": 403} for h in guard.HOSTS]
        self.assertEqual(guard.verdict(all_good)["status"], "P0_INGRESS_DENY_PASS")
        self.assertEqual(guard.verdict(all_good[:3])["status"], "HOLD")
        self.assertEqual(guard.verdict(all_good[:-1] + [all_good[0]])["status"], "HOLD")
    def test_any_401_from_backend_fails(self):
        data = [{"host": h, "guardPass": True, "status": 403} for h in guard.HOSTS]
        data[0]["status"] = 401
        data[0]["guardPass"] = False
        self.assertEqual(guard.verdict(data)["status"], "HOLD")
    def test_anonymous_post_body_has_no_entries_or_identity(self):
        def fake_open(request, timeout):
            self.assertEqual(request.data, b'{}')
            self.assertEqual(request.get_method(), "POST")
            self.assertNotIn("Authorization", request.headers)
            raise HTTPError(request.full_url, 403, "denied", {}, None)
        self.assertTrue(guard.check(guard.HOSTS[0], opener=fake_open)["guardPass"])

if __name__ == "__main__":
    unittest.main()
