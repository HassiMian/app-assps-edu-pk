"""No production writes: synthetic immutable artifact checks."""
import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from verify_live_frontend_provenance_20261019 import verify

class ReleaseGateTests(unittest.TestCase):
    def test_attested_artifact_only(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)/"assps-fake";root.mkdir()
            html=b"verified static release";(root/"index.html").write_bytes(html)
            digest=hashlib.sha256(html).hexdigest()
            sidecar=root/"assps-release-attestation.json"
            data={"candidate_commit":"f"*40,"frontend_index_sha256":digest}
            sidecar.write_text(json.dumps(data))
            nginx=Path(td)/"site.conf"
            nginx.write_text("root /var/www/assps-fake;\n")
            with patch("verify_live_frontend_provenance_20261019.Path", wraps=Path) as mock_path:
                # Preserve real Path behavior while redirecting fake /var/www root.
                mock_path.side_effect=lambda p: root if p=="/var/www/assps-fake" else Path(p)
                self.assertTrue(verify(nginx)[0])
                sidecar.write_text(json.dumps({**data,"frontend_index_sha256":"0"*64}))
                self.assertFalse(verify(nginx)[0])
                sidecar.write_text(json.dumps({**data,"candidate_commit":"not-a-commit"}))
                self.assertFalse(verify(nginx)[0])

if __name__=="__main__":
    unittest.main()
