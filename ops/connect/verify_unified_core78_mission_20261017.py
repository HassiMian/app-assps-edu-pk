#!/usr/bin/env python3
"""Unified Connect/Core78 read-only evidence aggregator, never a release approver.

Consumes only exact root-private schema-known witness summaries made by
separate source-owner read-only validators. No student names/IDs/marks, raw SQL,
tokens, user credential, deployment or write capability.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path
import stat
import sys
import time

EVIDENCE = Path('/root/assps-release-evidence/connect-core78-cluster-20261017')
SOURCE = {
    "core": "742e277a00cddadae9e82251e8147863c989dadd",
    "connect": "20ebae71ca438ad1590720ac93ff1ed9d59fedd7",
    "green": "659b01fcef34ade4e7052b436fb62e083845cc3a",
}
EXPECTED = {
    "joint": "joint-report.json",
    "marks": "marks-postsave-private.json",
    "boot": "core-boot-readonly.json",
    "api": "api-dependency-readonly.json",
    "teachers": "teacher-source-readonly.json",
}
REQUIRED_TRUE = (
    "current_blue_rollback_archive_verified",
    "exact_reviewed_ai_worker_adapter_deployed",
    "global_worker_separated_and_authenticated",
    "independent_offhost_current_recovery_certified",
    "isolated_previously_reviewed_full_acl_backup",
    "live_worker_role_and_inherited_grants_verified",
    "original_school_marks_integrity_preserved",
    "production_nginx_configuration_valid",
    "production_restricted_signed_transport_enabled",
    "production_signed_catalog_safe",
    "real_signed_peer_school_and_subject_denial",
    "release_id_pinned",
    "trusted_external_owner_pinned_key",
)
ALLOWED_API_BLOCKERS = {"HISTORIC_HIGH_RESTART_COUNT_REQUIRES_CORE_REVIEW"}
ALLOWED_TEACHER_BLOCKERS = {
    "TIMETABLE_TEACHER_IDS_NOT_INDEPENDENTLY_REVIEWED",
    "NO_ACTIVE_EXPLICIT_TEACHER_PRINT_ASSIGNMENTS",
}

def read_private_receipt(name: str, evidence_dir: Path = EVIDENCE, now: float | None = None) -> tuple[dict, str]:
    if name not in EXPECTED:
        return {}, "UNKNOWN_EVIDENCE_TYPE"
    folder = evidence_dir
    path = folder / EXPECTED[name]
    try:
        fst = folder.lstat()
        st = path.lstat()
        if (not stat.S_ISDIR(fst.st_mode) or fst.st_uid != 0 or stat.S_IMODE(fst.st_mode)&0o077
            or not stat.S_ISREG(st.st_mode) or st.st_uid != 0 or stat.S_IMODE(st.st_mode)&0o077
            or st.st_size < 10 or st.st_size > 32_768):
            return {}, "UNTRUSTED_PRIVATE_FILE_METADATA"
        ref_time = time.time() if now is None else now
        if ref_time < st.st_mtime or ref_time - st.st_mtime > 3600:
            return {}, "EXPIRED_OR_FUTURE_EVIDENCE"
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            return {}, "EVIDENCE_NOT_AN_OBJECT"
        return data, hashlib.sha256(path.read_bytes()).hexdigest()
    except (OSError, ValueError, TypeError, UnicodeError):
        return {}, "EVIDENCE_UNREADABLE"

def evaluate(evidence: dict[str, dict], evidence_hashes: dict[str, str]) -> dict:
    checks: dict[str, bool] = {}
    joint = evidence.get("joint", {})
    technical = joint.get("technical", {})
    core = joint.get("signed_core", {})
    statuses = joint.get("anonymous_http_statuses", {})
    checks["crossstream_technical_18_exact"] = (
        isinstance(technical, dict) and len(technical) == 18
        and all(item is True for item in technical.values())
        and joint.get("core_commit") == SOURCE["core"]
        and joint.get("connect_commit") == SOURCE["connect"])
    checks["current_anonymous_boundary"] = (
        isinstance(statuses, dict) and len(statuses) == 9
        and statuses.get("/login") == 200
        and all(code == 401 for name, code in statuses.items() if name != "/login"))
    checks["direct_real_core_verifier_executed"] = (
        joint.get("direct_official_verifier_executed") is True
        and joint.get("official_core_process_exit") in (0, 2))
    checks["no_cutover_no_live_mutation"] = (
        joint.get("production_mutation_performed") is False
        and joint.get("deployment_executed") is False
        and joint.get("live_build") == "ONDwxEIZlx5onDIKY7wYf")

    marks = evidence.get("marks", {})
    checks["urdu_38_saved_exact_and_old_zeros_preserved"] = (
        marks.get("status") in (
            "SAVED_38_EXACT_SUBJECT_APPROVAL_PENDING",
            "SAVED_38_EXACT_POLICY_APPROVED_FULL_RELEASE_HOLD",
        )
        and marks.get("verified_exact_rows") == 38
        and marks.get("mismatch_count") == 0
        and marks.get("original_four_subject_rows") == 152
        and marks.get("original_genuine_zeros") == 6
        and marks.get("production_write_performed_by_this_check") is False)
    checks["urdu_offering_approval_witnessed"] = (
        marks.get("subject_approved") is True
        and marks.get("subject_approval_performed") is False)

    boot = evidence.get("boot", {})
    checks["live_green_startup_recipe_consistent"] = (
        boot.get("status") == "STARTUP_RECIPE_CONSISTENT_NOT_SIGNED_RELEASE"
        and boot.get("approved_stable_build_exists") is True
        and boot.get("fallback_backup_valid") is True
        and boot.get("live_and_persisted_dist") == ".next"
        and boot.get("production_modified") is False
        and boot.get("full_release_authorized") is False)
    api = evidence.get("api", {})
    api_blocks = api.get("blockers", [])
    checks["api_dependency_operational_not_signed"] = (
        api.get("status") == "HOLD_API_DEPENDENCY_NOT_CERTIFIED"
        and api.get("production_mutation_performed") is False
        and api.get("nginx_config_valid") is True
        and type(api.get("green_restart_count_start")) is int
        and api.get("green_restart_count_start") == api.get("green_restart_count_end")
        and isinstance(api_blocks, list) and len(api_blocks) > 0
        and set(api_blocks).issubset(ALLOWED_API_BLOCKERS)
        and api.get("release_authorized") is False)
    teachers = evidence.get("teachers", {})
    assignments = teachers.get("counts", {})
    teacher_blocks = teachers.get("blockers", [])
    checks["teacher_acl_not_implicitly_granted"] = (
        teachers.get("status") == "HOLD_TEACHER_PRINT_ROLLOUT"
        and teachers.get("database_mutation_performed") is False
        and teachers.get("timetable_automatically_grants_print_access") is False
        and assignments.get("timetable_rows") == 58
        and assignments.get("timetable_unreviewed_linked_identity") == 43
        and assignments.get("teacher_assignment_active_rows") == 0
        and isinstance(teacher_blocks, list)
        and set(teacher_blocks) == ALLOWED_TEACHER_BLOCKERS)
    checks["real_authenticated_teacher_acceptance_signed"] = (
        teachers.get("authenticated_teacher_acl_verified") is True
        and teachers.get("independent_school2_denial_verified") is True
        and api.get("authenticated_teacher_acceptance_verified") is True)

    expected_set = set(REQUIRED_TRUE)
    signed_checks = core.get("blocked", [])
    keys_are_known = (isinstance(signed_checks, list)
                      and set(signed_checks).issubset(expected_set)
                      and len(signed_checks) == len(set(signed_checks)))
    passed = core.get("passed")
    total = core.get("total")
    checks["independent_core_security_certified"] = (
        keys_are_known and type(passed) is int and passed == 13
        and total == 13 and not signed_checks
        and core.get("authentic_core_release") is True
        and joint.get("official_core_process_exit") == 0
        and joint.get("decision") == "ELIGIBLE_FOR_CORE_OWNER_REVIEW_NOT_DEPLOYED")
    expected_holds = [
        "independent signed offhost full ACL and ownership restore",
        "signed production transport, reviewed worker adapter and separate worker login",
        "effective inherited worker grants and independent School2 subject denial",
        "reviewed staff timetable identity plus explicit authorized print assignments",
        "formal Urdu subject offering academic approval",
        "stable incident review, rollback rehearsal and sustained API dependency confidence",
        "genuine teacher browser Save/Get/print and physical Urdu A4 printer witness",
    ]
    # No input is ever treated as signed merely because it contains 13/13
    # self-reported numbers; source owner's actual cryptographic verifier decides.
    reasons = []
    if not checks["crossstream_technical_18_exact"]:
        reasons.append("SOURCE_OR_18_FACT_TECHNICAL_DRIFT")
    if not checks["urdu_38_saved_exact_and_old_zeros_preserved"]:
        reasons.append("MARKS_OR_ZERO_PRESERVATION_NOT_VERIFIED")
    if not checks["live_green_startup_recipe_consistent"]:
        reasons.append("CONNECT_GREEN_STARTUP_RUNTIME_UNVERIFIED")
    if not checks["api_dependency_operational_not_signed"]:
        reasons.append("API_RUNTIME_DEPENDENCY_UNVERIFIED")
    if not checks["teacher_acl_not_implicitly_granted"]:
        reasons.append("TEACHER_PERMISSION_SOURCE_UNVERIFIED")
    if not checks["independent_core_security_certified"]:
        reasons.append("INDEPENDENT_CORE_RELEASE_SIGNED_HOLD")
    if not checks["urdu_offering_approval_witnessed"]:
        reasons.append("URDU_OFFERING_ACADEMIC_APPROVAL_HOLD")
    if not checks["real_authenticated_teacher_acceptance_signed"]:
        reasons.append("AUTHENTIC_STAFF_AND_PEER_SCHOOL_WITNESS_HOLD")
    if not all(checks[k] for k in ("current_anonymous_boundary",
                                  "direct_real_core_verifier_executed",
                                  "no_cutover_no_live_mutation")):
        reasons.append("LIVE_READONLY_BOUNDARY_UNVERIFIED")
    return {
        "schema": "apex-connect-core78-unified-mission-20261017-v1",
        "scope": "READ_ONLY_CROSS_OWNER_NO_RELEASE_AUTHORITY",
        "current_sources": SOURCE,
        "phase_technical": {"passed": sum(checks.values()), "total": len(checks)},
        "checks": checks,
        "signed_core_passed": passed if type(passed) is int else None,
        "signed_core_required": 13,
        "independent_core_signed": checks["independent_core_security_certified"],
        "urdu_original_38_saved": checks["urdu_38_saved_exact_and_old_zeros_preserved"],
        "urdu_offering_approved": checks["urdu_offering_approval_witnessed"],
        "green_restart_historic": boot.get("runtime_green_restarts_historical"),
        "teacher_unreviewed_timetable_links": assignments.get("timetable_unreviewed_linked_identity"),
        "explicit_active_teacher_assignments": assignments.get("teacher_assignment_active_rows"),
        "exact_evidence_sha256": evidence_hashes,
        "mission_cluster_pending": expected_holds,
        "hold_reasons": reasons,
        "decision": "HOLD_NO_PRODUCTION_CUTOVER",
        "production_modified": False,
        "source_automated_approval": False,
        "physical_print_verified": False,
    }

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--live-readonly-evidence", action="store_true", required=True)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    observed = {}
    hashes = {}
    for key in EXPECTED:
        observed[key], hashes[key] = read_private_receipt(key)
    result = evaluate(observed, hashes)
    # Refuse to emit personal raw receipt data. Only emit controlled metadata.
    text = json.dumps(result,sort_keys=True,indent=2) + "\n"
    if args.output is not None:
        out = args.output.absolute()
        if (out.parent != EVIDENCE or out.name != "consolidated-cluster-readiness.json"):
            raise SystemExit("REFUSING_OUTPUT_OUTSIDE_PRIVATE_FIXED_RECEIPT")
        fd = os.open(out,os.O_WRONLY|os.O_CREAT|os.O_TRUNC|getattr(os,"O_NOFOLLOW",0),0o600)
        with os.fdopen(fd,"w") as dst:
            dst.write(text)
        os.chmod(out,0o600)
    print(text)
    return 2

if __name__ == "__main__":
    sys.exit(main())
