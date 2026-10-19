#!/usr/bin/env python3
"""Read-only release gate; fails closed on mismatched metadata or Nginx roots."""
import argparse
import hashlib
import json
import re
from pathlib import Path

def verify(config: Path):
    body = config.read_text()
    roots = re.findall(r'^\s*root\s+(/var/www/assps-[^;\s]+);\s*$', body, re.M)
    if len(roots) != 1:
        return False, "HOLD: expected exactly one current ASSPS frontend Nginx root"
    root = Path(roots[0])
    if root.is_symlink() or not root.is_dir():
        return False, "HOLD: frontend root missing or symlinked"
    html = root / "index.html"
    sidecar = root / "assps-release-attestation.json"
    if not html.is_file() or not sidecar.is_file():
        return False, "HOLD: frontend index or release attestation unavailable"
    digest = hashlib.sha256(html.read_bytes()).hexdigest()
    try:
        meta = json.loads(sidecar.read_text())
    except (ValueError, UnicodeError):
        return False, "HOLD: release attestation is invalid JSON"
    expected = meta.get("frontend_index_sha256")
    if not isinstance(expected, str) or not re.fullmatch(r'[a-f0-9]{64}', expected):
        return False, "HOLD: invalid attested index SHA256"
    commit = meta.get("candidate_commit")
    if not isinstance(commit, str) or not re.fullmatch(r'[a-f0-9]{40}', commit):
        return False, "HOLD: no immutable candidate commit SHA"
    if digest != expected:
        return False, f"HOLD: release artifact differs from attestation live={digest} claimed={expected}"
    return True, f"ARTIFACT_ATTESTATION_MATCH (source commit ancestry still requires independent proof): {digest}"

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--nginx", type=Path, default=Path("/etc/nginx/sites-enabled/apex-app-ssl"))
    options = p.parse_args()
    success, message = verify(options.nginx)
    print(message)
    raise SystemExit(0 if success else 2)
