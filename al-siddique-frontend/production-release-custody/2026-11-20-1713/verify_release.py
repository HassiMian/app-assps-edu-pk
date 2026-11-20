#!/usr/bin/env python3
"""Verify ASSPS release evidence without touching running services or data."""
from __future__ import annotations
import argparse
import hashlib
import json
import re
import sys
import tarfile
from pathlib import Path

def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def secure_file(root: Path, relative: str) -> Path:
    if not relative or relative.startswith('/') or '..' in Path(relative).parts:
        raise ValueError("Unsafe path: " + relative)
    path = root / relative
    if not path.is_file() or path.is_symlink():
        raise ValueError("File unavailable or symlink: " + relative)
    return path

def main() -> int:
    cli = argparse.ArgumentParser()
    cli.add_argument("--snapshot", required=True, type=Path)
    cli.add_argument("--live", type=Path, help="Only verify live tree; never change it")
    cli.add_argument("--archive", type=Path, help="Read and verify full static archive, without extracting")
    args = cli.parse_args()
    repo = args.snapshot.resolve(strict=True)
    data = json.loads(secure_file(repo, 'manifest.json').read_text())
    index = secure_file(repo, 'index.html').read_bytes()
    if sha(index) != data['index_sha256']:
        raise ValueError("Release index SHA mismatch")
    match = re.search(rb'<script type="importmap">(.*?)</script>', index, re.S)
    if not match:
        raise ValueError("Import map missing")
    imports = json.loads(match.group(1))['imports']
    if imports != data['importmap']:
        raise ValueError("Import map differs from manifest")
    refs = set(imports.values())
    refs.update(x.decode() for x in re.findall(rb'<(?:script|link)[^>]+(?:src|href)="(/assets/[^"]+)', index))
    if refs != set(data['entrypoints']):
        raise ValueError("Direct reference graph diverged")
    indexed = {row['path']: row for row in data['reference_files']}
    if refs != set(indexed):
        raise ValueError("Referenced file records incomplete")
    for item in indexed.values():
        name = item['path'].lstrip('/')
        path = secure_file(repo, name)
        payload = path.read_bytes()
        if len(payload) != item['bytes'] or sha(payload) != item['sha256']:
            raise ValueError("Altered reference: " + name)
    live_verified = None
    if args.live:
        live = args.live.resolve(strict=True)
        if sha(secure_file(live,'index.html').read_bytes()) != data['index_sha256']:
            raise ValueError("LIVE DRIFT: index changed since snapshot; recapture before release")
        checks = 0
        for item in data['all_live_file_inventory']:
            name = item['path']
            payload = secure_file(live,name).read_bytes()
            if len(payload) != item['bytes'] or sha(payload) != item['sha256']:
                raise ValueError("LIVE DRIFT: " + name)
            checks += 1
        extra = {str(p.relative_to(live)) for p in live.rglob('*') if p.is_file() and not p.is_symlink()} - {x['path'] for x in data['all_live_file_inventory']}
        if extra:
            raise ValueError("LIVE DRIFT: untracked files added: " + repr(sorted(extra)[:5]))
        live_verified = checks
    archive_verified = None
    if args.archive:
        archive = args.archive.resolve(strict=True)
        metadata = data.get("private_vps_archive") or {}
        if archive.name != metadata.get("basename"):
            raise ValueError("Archive filename mismatch")
        archive_bytes = archive.read_bytes()
        if len(archive_bytes) != metadata.get("bytes") or sha(archive_bytes) != metadata.get("sha256"):
            raise ValueError("Archive SHA or length mismatch")
        expected = {x["path"]: x for x in data["all_live_file_inventory"]}
        seen = set()
        with tarfile.open(archive, "r:gz") as tar:
            for member in tar:
                if member.isdir():
                    continue
                if not member.isfile():
                    raise ValueError("Unexpected non-file archive member: " + member.name)
                name = member.name.removeprefix("./")
                if name not in expected or name in seen:
                    raise ValueError("Unknown or duplicate archive entry: " + name)
                size = 0
                checksum = hashlib.sha256()
                with tar.extractfile(member) as stream:
                    for part in iter(lambda: stream.read(262144), b""):
                        checksum.update(part)
                        size += len(part)
                if size != expected[name]["bytes"] or checksum.hexdigest() != expected[name]["sha256"]:
                    raise ValueError("Archive payload mismatch: " + name)
                seen.add(name)
        if seen != set(expected):
            raise ValueError("Archive content count mismatch")
        archive_verified = len(seen)
    print(json.dumps({
        "result": "PASS",
        "release": data["release_id"],
        "direct_dependencies_verified": len(refs),
        "full_inventory_count": len(data["all_live_file_inventory"]),
        "live_files_verified": live_verified,
        "archive_files_verified": archive_verified,
        "index_sha256": sha(index),
        "release_gate": data["release_gate"],
    }, indent=2))
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        print("A335_VERIFICATION_FAILED", str(exc), file=sys.stderr)
        sys.exit(2)
