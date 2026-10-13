#!/usr/bin/env python3
"""Fail-closed, offline Paper Studio 16-gate evidence verification.

Does not contact production, create student data or infer real-world signoffs.
"""
import argparse
import hashlib
import json
import pathlib
import re
import stat
import sys

GATES = (
    "protected-templates", "guard-fixtures", "structured-migration",
    "canonical-editor-browser", "early-years-browser",
    "early-years-print-geometry", "selection-identity-browser",
    "urdu-workspace-browser", "docx-binary-export", "docx-browser-export",
    "print-a4-a5", "diary-lesson-browser", "official-print-browser",
    "first-term-marks-browser", "paper-owned-eslint", "vite-build",
)
TAP_COUNTS = {
    "guard-fixtures": 5, "structured-migration": 43,
    "canonical-editor-browser": 20, "early-years-browser": 13,
    "early-years-print-geometry": 8, "selection-identity-browser": 12,
    "urdu-workspace-browser": 10, "docx-binary-export": 4,
    "docx-browser-export": 2, "print-a4-a5": 5,
    "diary-lesson-browser": 2, "official-print-browser": 1,
}


def regular_bytes(path):
    if not path.is_file() or path.is_symlink() or not stat.S_ISREG(path.lstat().st_mode):
        raise ValueError(f"Missing or linked evidence file: {path.name}")
    data = path.read_bytes()
    if not data:
        raise ValueError(f"Empty evidence file: {path.name}")
    return data


def verify(directory, expected_commit, expected_eslint_files=270):
    root = pathlib.Path(directory)
    if not root.is_dir() or root.is_symlink():
        raise ValueError("Evidence directory missing or symlinked")
    if not re.fullmatch(r"[0-9a-f]{40}", expected_commit):
        raise ValueError("Exact 40-character source SHA required")
    provenance = regular_bytes(root / "provenance.txt").decode("utf-8")
    fields = dict(line.split("=", 1) for line in provenance.splitlines() if "=" in line)
    if fields.get("source_commit") != expected_commit:
        raise ValueError("Evidence source SHA differs from the certified code")
    if not fields.get("source_branch") or not fields.get("utc_started"):
        raise ValueError("Missing branch/timestamp provenance")

    summary = regular_bytes(root / "summary.txt").decode("utf-8")
    lines = summary.splitlines()
    passing = [line.removeprefix("PASS ") for line in lines if line.startswith("PASS ")]
    if tuple(passing) != GATES:
        raise ValueError("Missing, reordered or duplicated QA gate completion")
    if lines.count("ALL_AUTOMATED_PAPER_CANDIDATE_GATES_PASS") != 1:
        raise ValueError("Full-suite success sentinel absent or duplicated")
    if "ONLY_SELECTED_GATES_PASS" in summary or "FAIL " in summary:
        raise ValueError("Partial or failed suite cannot certify 16/16")

    entries = []
    for gate in GATES:
        data = regular_bytes(root / f"{gate}.log")
        body = data.decode("utf-8", errors="replace")
        if gate in TAP_COUNTS:
            n = TAP_COUNTS[gate]
            if not re.search(rf"(?m)^# pass {n}$", body) or not re.search(r"(?m)^# fail 0$", body):
                raise ValueError(f"Unexpected test counts in {gate}")
            if not re.search(rf"(?m)^# tests {n}$", body) or re.search(r"(?m)^not ok ", body):
                raise ValueError(f"Unexpected TAP test records in {gate}")
        if gate == "protected-templates" and "PASS protected template integrity (6 files unchanged)" not in body:
            raise ValueError("Protected Result Card templates unverified")
        if gate == "paper-owned-eslint":
            raw = json.loads(body)
            if not isinstance(raw, list) or len(raw) != expected_eslint_files:
                raise ValueError(f"Expected exactly {expected_eslint_files} Paper-owned ESLint file results")
            if sum(it.get("errorCount", 0) for it in raw) or sum(it.get("warningCount", 0) for it in raw) != 4:
                raise ValueError("Paper ESLint must report 0 errors and 4 reviewed warnings")
        if gate == "vite-build" and not re.search(r"(?:built in|✓ built in)\s+[0-9.]+", body):
            raise ValueError("Optimized Vite build completion missing")
        if gate == "first-term-marks-browser":
            count = sum(line.startswith(("MARKS_BROWSER_PASS ", "MARKS_BROWSER_ZERO_PASS ")) for line in body.splitlines())
            if count != 11:
                raise ValueError("Expected exactly 11 synthetic marks-browser checks")
        entries.append({"gate": gate, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()})
    return {
        "status": "OFFLINE_SOURCE_QA_EVIDENCE_VERIFIED",
        "code_commit": expected_commit,
        "branch_at_capture": fields["source_branch"],
        "started_utc": fields["utc_started"],
        "gates": len(entries),
        "eslint_files_expected": expected_eslint_files,
        "log_sha256": entries,
        "limitations": [
            "The original runner exit is evidenced by its completion marker, not an independent signed process receipt",
            "No genuine school-staff marks or tenant-role production acceptance is certified",
            "No actual connected-printer or academic-human approval is certified",
            "No SaaS Core full-app production RLS or deployment authorization is certified",
        ],
    }


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--evidence-dir", required=True)
    p.add_argument("--code-sha", required=True)
    p.add_argument("--output")
    p.add_argument("--eslint-files", type=int, default=270, help="Exact reviewed Paper-owned ESLint file count (default legacy: 270)")
    a = p.parse_args()
    try:
        if a.eslint_files < 270:
            raise ValueError("ESLint audited-file count may not shrink below the protected baseline")
        report = verify(a.evidence_dir, a.code_sha, a.eslint_files)
        content = json.dumps(report, indent=2) + "\n"
        if a.output:
            out = pathlib.Path(a.output)
            if out.exists() or out.is_symlink():
                raise ValueError("Refusing to overwrite existing attestation")
            with out.open("x", encoding="utf-8") as handle:
                handle.write(content)
            out.chmod(0o600)
        print(f"PASS offline evidence {report['gates']}/16, code SHA {report['code_commit']}")
        return 0
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as exc:
        print(f"HOLD offline evidence: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
