from importlib.util import spec_from_file_location, module_from_spec
from pathlib import Path
import hashlib
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "ops" / "patch-live-notification-inbox-v14.py"
ORIGINAL = subprocess.check_output(["git", "-C", str(ROOT), "show", "f5a0b96:al-siddique-backend/src/routes/notifyRoutes.js"])
spec = spec_from_file_location("assps_v14_notify_patch", str(SCRIPT))
module = module_from_spec(spec)
spec.loader.exec_module(module)
START = b"// GET /api/notify/inbox"
END = b"// PUT /api/notify/read-all"

class GuardedPatchTests(unittest.TestCase):
    def test_patch_preserves_every_byte_outside_target(self):
        original = ORIGINAL
        before, rest = original.split(START, 1)
        _, after = rest.split(END, 1)
        patched = module.patch_route(original)
        self.assertEqual(patched.split(START,1)[0], before)
        self.assertEqual(patched.split(END,1)[1], after)
        changed = patched.split(START,1)[1].split(END,1)[0]
        for expected in (b"recentClause", b"30 days", b"req.query.view", b"n.sent_at DESC", b"params.length + 1"):
            self.assertIn(expected, changed)
        self.assertEqual(module.digest(patched), hashlib.sha256(patched).hexdigest())
    def test_mixed_newlines_and_unique_scope(self):
        original = ORIGINAL
        sample = original.replace(b"\r\n",b"\n")
        sample = sample.replace(b"// GET /api/notify/inbox\n",b"// GET /api/notify/inbox\r\n",1)
        updated = module.patch_route(sample)
        self.assertIn(b"LIMIT "+b"$$"+b"{params.length + 1}",updated)
        self.assertEqual(updated[:updated.find(START)],sample[:sample.find(START)])
        self.assertEqual(updated[updated.find(END):],sample[sample.find(END):])
    def test_refuses_already_patched_or_unrecognized_handler(self):
        original = ORIGINAL
        updated = module.patch_route(original)
        with self.assertRaises(ValueError):
            module.patch_route(updated)
        with self.assertRaises(ValueError):
            module.patch_route(original.replace(b"ORDER BY COALESCE(read_at, sent_at) DESC",b"ORDER BY n.id ASC",1))
    def test_no_generated_delete_or_bulk_send_in_patch_scope(self):
        original = ORIGINAL
        updated = module.patch_route(original)
        chunk = updated.split(START,1)[1].split(END,1)[0]
        self.assertNotIn(b"DELETE FROM",chunk)
        self.assertNotIn(b"UPDATE notification_log",chunk)

if __name__=="__main__":
    unittest.main()
