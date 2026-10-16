#!/usr/bin/env python3
"""Read-only FRONTEND snapshot disk-headroom evidence for APEX Connect.

Not a database/off-host backup, not a source/deployment permission or a signed
release receipt. Only checks free bytes on the shared filesystem against
three copies of four specific already-built frontend artifacts + 3GiB reserve.
"""
from __future__ import annotations
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess

GIB = 1024 ** 3
RESERVE_BYTES = 3 * GIB
REPLICAS = 3
ROOT = Path("/")
LIVE_NEXT = Path("/var/www/apex-connect/.next-candidate")
LIVE_CORE = Path("/var/www/assps-resultcards-owner-accepted-20261016")


def assess(free: int, artifact_sizes: list[int], reserve: int = RESERVE_BYTES) -> dict:
    if (type(free) is not int or free < 0 or type(reserve) is not int or
        reserve < 0 or not artifact_sizes or any(type(x) is not int or x <= 0 for x in artifact_sizes)):
        return {"decision": "HOLD_INVALID_CAPACITY_EVIDENCE", "ready": False}
    required = REPLICAS * sum(artifact_sizes) + reserve
    return {
        "decision": "FRONTEND_SNAPSHOT_HEADROOM_PASS_NOT_RELEASE"
                    if free >= required else "HOLD_FRONTEND_SNAPSHOT_HEADROOM",
        "ready": free >= required,
        "free_bytes": free,
        "snapshot_bytes": sum(artifact_sizes),
        "replicas": REPLICAS,
        "reserve_bytes": reserve,
        "required_bytes": required,
        "margin_bytes": free - required,
    }


def allocated_bytes(folder: Path) -> int:
    result = subprocess.run(["du", "-s", "-B1", "--", str(folder)],
                            capture_output=True, text=True, timeout=20, check=True)
    return int(result.stdout.split()[0])


def run(core: Path, next_stage: Path) -> dict:
    report = {
        "scope": "READ_ONLY_COMPILED_FRONTEND_ROLLBACK_HEADROOM_ONLY",
        "production_modified": False,
        "signed_recovery_certified": False,
        "production_release_authorized": False,
        "backup_created": False,
    }
    candidates = [LIVE_NEXT, LIVE_CORE, core / "al-siddique-frontend/dist", next_stage / ".next"]
    try:
        # Prevent mixing unrelated filesystems in a misleading capacity result.
        disk = shutil.disk_usage(ROOT)
        if any(not p.is_dir() or p.stat().st_dev != ROOT.stat().st_dev for p in candidates):
            raise ValueError("missing candidate or mismatched filesystem")
        sizes = [allocated_bytes(p) for p in candidates]
        result = assess(disk.free, sizes)
        report.update(result)
        report["disk_total_bytes"] = disk.total
        report["disk_used_bytes"] = disk.used
        report["warning_high_utilization"] = disk.used * 100 >= 90 * disk.total
        report["artifacts_measured"] = len(candidates)
    except (OSError, ValueError, OverflowError, subprocess.SubprocessError, IndexError):
        report.update({"decision": "HOLD_CAPACITY_PROBE_UNAVAILABLE", "ready": False})
    return report


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--core", type=Path, required=True)
    p.add_argument("--next-stage", type=Path, required=True)
    x = p.parse_args()
    report = run(x.core.resolve(), x.next_stage.resolve())
    print(json.dumps(report, sort_keys=True, indent=2))
    return 0 if report.get("ready") is True else 2


if __name__ == "__main__":
    raise SystemExit(main())
