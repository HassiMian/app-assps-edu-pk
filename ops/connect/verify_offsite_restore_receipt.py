#!/usr/bin/env python3
"""Off-VPS Connect restore *technical* receipt verifier. Never an institutional release signer.

A Windows machine-generated receipt is unsigned and cannot prove independent reviewer
approval. This script validates byte-integrity evidence only. Release mode always
fails closed until the separate, official SaaS Core signed gate certifies release.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import sys


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def validate_receipt(*, evidence_root: Path, live_build_file: Path, core_gate_json: Path | None = None, receipt_file: Path | None = None) -> dict:
    issues: list[str] = []
    try:
        receipt = json.loads((receipt_file or (evidence_root / "OFFHOST_RESTORE_VERIFY_RESULT_20261015.json")).read_text())
        manifest = json.loads((evidence_root / "offsite-regular-file-manifest.json").read_text())
        live_build = live_build_file.read_text().strip()
        expected_archive = {
            "connect-runtime.tar.gz": "connect-runtime.tar.gz.sha256",
            "connect-dependencies.tar.gz": "connect-dependencies.tar.gz.sha256",
        }

        if receipt.get("machine") != "CYBERSPACE":
            issues.append("UNRECOGNIZED_OFFSITE_MACHINE")
        if not live_build or manifest.get("build_id") != live_build or receipt.get("build_id") != live_build:
            issues.append("LIVE_BUILD_PROVENANCE_MISMATCH")

        files = manifest.get("regular_files")
        if not isinstance(files, list) or len(files) < 1 or manifest.get("file_count") != len(files):
            issues.append("INVALID_SOURCE_MANIFEST_COUNT")
        else:
            paths = [item.get("path") for item in files if isinstance(item, dict)]
            if len(paths) != len(files) or len(set(paths)) != len(paths) or any(
                not isinstance(p, str) or not p or p.startswith("/") or
                ".." in Path(p).parts or "\\" in p for p in paths
            ):
                issues.append("UNSAFE_SOURCE_MANIFEST_PATHS")
            if any(not isinstance(item.get("sha256"), str) or
                   len(item["sha256"]) != 64 for item in files if isinstance(item, dict)):
                issues.append("INVALID_SOURCE_FILE_DIGESTS")

        if digest(evidence_root / "offsite-regular-file-manifest.json") != receipt.get("manifest_sha256"):
            issues.append("OFFSITE_MANIFEST_DIGEST_MISMATCH")

        if not isinstance(receipt.get("matched"), int) or receipt.get("matched") != manifest.get("file_count") or receipt.get("expected") != manifest.get("file_count") or receipt.get("error_count") != 0 or receipt.get("failures") != []:
            issues.append("OFFSITE_FILE_RESTORE_NOT_EXACT")

        for archive_name, checksum_name in expected_archive.items():
            line = (evidence_root / checksum_name).read_text().strip()
            fields = line.split()
            if len(fields) != 2 or fields[1] not in (archive_name, str(evidence_root / archive_name)):
                issues.append(f"INVALID_CHECKSUM_FILE_{archive_name}")
            elif digest(evidence_root / archive_name) != fields[0].lower():
                issues.append(f"ARCHIVE_HASH_MISMATCH_{archive_name}")

        official = None
        if core_gate_json is not None:
            official = json.loads(core_gate_json.read_text())
            if official.get("overall_production_release") != "HOLD" or official.get("core_official_gate", {}).get("status") != "HOLD" or official.get("core_official_gate", {}).get("exit_code") != 2:
                issues.append("UNVERIFIED_OR_TAMPERED_OFFICIAL_CORE_STATUS")

        result = {
            "schema": "assps-connect-offsite-technical-receipt-v1",
            "current_build": live_build,
            "restored_regular_files": receipt.get("matched"),
            "offsite_machine": receipt.get("machine"),
            "source_archive_hashes_verified": not any(i.startswith(("ARCHIVE_", "INVALID_CHECKSUM_")) for i in issues),
            "technical_status": "PASS" if not issues else "FAIL",
            "offsite_machine_receipt_cryptographically_signed": False,
            "independent_human_reviewer_signed": False,
            "independent_linux_runtime_restoration_verified_by_this_tool": False,
            "school_staff_authentication_verified_by_this_tool": False,
            "production_worker_deployed_verified_by_this_tool": False,
            "official_core_status": official.get("core_official_gate", {}).get("status") if official else "NOT_RUN",
            "production_release_authorized": False,
            "issues": sorted(set(issues)),
        }
    except (OSError, ValueError, TypeError, KeyError, AttributeError) as exc:
        result = {
            "schema": "assps-connect-offsite-technical-receipt-v1",
            "technical_status": "FAIL",
            "production_release_authorized": False,
            "independent_human_reviewer_signed": False,
            "issues": ["MISSING_OR_INVALID_EVIDENCE:" + type(exc).__name__],
        }
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--evidence-root", required=True, type=Path)
    parser.add_argument("--live-build-file", required=True, type=Path)
    parser.add_argument("--official-core-report", type=Path)
    parser.add_argument("--offsite-receipt", type=Path)
    parser.add_argument("--production-release-gate", action="store_true",
                        help="fail-closed: unsigned machine proof cannot authorize a production release")
    args = parser.parse_args()
    report = validate_receipt(evidence_root=args.evidence_root,
                              live_build_file=args.live_build_file,
                              core_gate_json=args.official_core_report, receipt_file=args.offsite_receipt)
    print(json.dumps(report, sort_keys=True, indent=2))
    if args.production_release_gate:
        return 2
    return 0 if report["technical_status"] == "PASS" else 2


if __name__ == "__main__":
    sys.exit(main())
