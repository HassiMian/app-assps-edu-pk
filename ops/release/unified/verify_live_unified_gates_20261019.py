#!/usr/bin/env python3
"""ASSPS production gate matrix: READ ONLY. Exit 2 on HOLD; never mutates school data."""
import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path

SITE = Path("/etc/nginx/sites-enabled/apex-app-ssl")
LATEST = Path("/var/backups/assps-critical-LATEST")
ARCHIVES = Path("/var/backups")
HISTORY = Path("/root/secure-archive/assps-firstterm-retention-20261019/verify_firstterm_integrity.py")
PROOF = Path("/root/secure-archive/assps-postguard-encrypted-20261019T1640Z")

def process(args, timeout=20):
    try:
        p = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
        return p.returncode, p.stdout.strip(), p.stderr.strip()
    except (OSError, subprocess.TimeoutExpired):
        return 98, "", "command unavailable or timeout"

def query(sql):
    wrapped = "BEGIN TRANSACTION READ ONLY; " + sql.rstrip("; ") + "; ROLLBACK;"
    status, stdout, _ = process([
        "sudo", "-u", "postgres", "psql", "-X", "-v", "ON_ERROR_STOP=1",
        "-d", "apexos", "-Atq", "-c", wrapped])
    if status != 0:
        return None
    rows = stdout.splitlines()
    return rows[0] if len(rows) == 1 else None

def http_status(url):
    # Same non-mutating curl probe used by the operational Hostinger smoke gates.
    # Python urllib may receive Cloudflare bot-policy 403 while real app stays HTTP200.
    status, output, _ = process([
        "curl", "-sS", "--max-time", "8", "--output", "/dev/null",
        "--write-out", "%{http_code}", url], timeout=12)
    if status != 0 or not output.isdigit():
        return None
    return int(output)

def sha256(path):
    h = hashlib.sha256()
    with path.open("rb") as f:
        while data := f.read(262144):
            h.update(data)
    return h.hexdigest()

def audit():
    result = {"mission": "ASSPS-UNIFIED-ZERO-HUMAN-20261019",
              "mode": "READ_ONLY", "gates": {}, "release_certified": False}
    gates = result["gates"]
    def gate(name, status, evidence):
        assert status in ("PASS", "HOLD", "FAIL")
        gates[name] = {"status": status, "evidence": evidence}

    roots = []
    if SITE.is_file():
        roots = re.findall(r"^\s*root\s+(/var/www/assps-[^;\s]+);\s*$",
                           SITE.read_text(), re.M)
    if len(roots) != 1 or not Path(roots[0]).is_dir():
        gate("G0_live_root", "FAIL", "exactly one stable Nginx ASSPS root is required")
    else:
        active = Path(roots[0])
        index = active / "index.html"
        digest = sha256(index) if index.is_file() else None
        result["active_frontend"] = {"directory": str(active), "index_sha256": digest}
        gate("G0_live_root", "PASS" if digest else "FAIL",
             "identified current active frontend, with independent SHA256")

        sidecar = active / "assps-release-attestation.json"
        try:
            doc = json.loads(sidecar.read_text())
            expected = doc.get("frontend_index_sha256")
            if expected == digest and re.fullmatch(r"[0-9a-f]{40}", doc.get("candidate_commit","")):
                gate("G2_frontend_attestation", "HOLD",
                     "artifact hash matches sidecar but independent build and all assets require proof")
            else:
                gate("G2_frontend_attestation", "HOLD",
                     "live artifact and release-sidecar hash/source ancestry are not independently reconciled")
        except (OSError, ValueError):
            gate("G2_frontend_attestation", "HOLD", "missing/invalid frontend release metadata")

    nginx_code, _, _ = process(["nginx", "-t"], timeout=8)
    gate("G0_nginx_syntax", "PASS" if nginx_code == 0 else "FAIL",
         "current Nginx configuration syntax checked without reload")
    backend_code, backend_pid, _ = process(["pm2", "pid", "apex-backend"], timeout=8)
    gate("G0_backend_online", "PASS" if backend_code == 0 and backend_pid.isdigit() else "FAIL",
         "running backend PID checked, exact source SHA/commit still requires attestation")
    result["backend_pid"] = backend_pid if backend_pid.isdigit() else None

    rollback_code, rollback_output, _ = process([
        "bash", "/root/instant_rollback_to_20261016.sh", "--check"], timeout=12)
    gate("G1_rollback_preflight", "PASS" if rollback_code == 0 and
         "ROLLBACK_PREFLIGHT_PASS_NO_MUTATION" in rollback_output else "FAIL",
         "current-versus-recovery artifact preflight only, no rollback executed")

    historic = query(
        "SELECT count(*)::text || ',' || count(*) FILTER (WHERE marks_obtained=0) || ',' ||"
        " count(*) FILTER (WHERE marks_obtained IS NULL) || ',' ||"
        " count(*) FILTER (WHERE school_id IS DISTINCT FROM 1)"
        " FROM public.exam_results WHERE exam_id=9")
    guards = query("SELECT count(*) FROM pg_trigger WHERE tgname LIKE 'assps_firstterm_exam9_%'"
                   " AND NOT tgisinternal AND tgenabled='O'")
    exam_meta = query("SELECT count(*) FROM public.exams WHERE id=9 AND school_id=1"
                      " AND name='First Term Exam' AND session='2026-2027'")
    total_marks = query("SELECT count(*) FROM public.exam_results")
    students = query("SELECT count(*) FROM public.students")
    grants = query("SELECT count(*) FROM public.teacher_class_assignments"
                   " WHERE school_id=1 AND is_active"
                   " AND source='timetable_verified_20261019'")
    wrong_grants = query("SELECT count(*) FROM public.teacher_class_assignments"
                         " WHERE school_id=1 AND is_active"
                         " AND source IS DISTINCT FROM 'timetable_verified_20261019'")
    result["db_counts"] = {"physical_students": students, "all_exam_rows": total_marks,
                           "first_term_exam9": historic, "first_term_guards": guards,
                           "authorized_school1_grants": grants}
    preserved = (historic == "1853,224,0,0" and guards == "4" and exam_meta == "1"
                 and total_marks is not None and int(total_marks) >= 1854
                 and students is not None and int(students) >= 326
                 and grants == "54" and wrong_grants == "0")
    gate("G1_firstterm_data_lock", "PASS" if preserved else "FAIL",
         "Exam9 1853/224/0 protected by 4 triggers; 54 official grants, no extras")

    code, msg, _ = process(["python3", str(HISTORY), "--check"]) if HISTORY.is_file() else (98,"","")
    gate("G1_historical_byte_digest", "PASS" if code == 0 else "FAIL",
         "read-only historical row fingerprint checks passed" if code == 0 else "historical SHA baseline unavailable or drifted")

    backup_id = LATEST.read_text().strip() if LATEST.is_file() else ""
    backup = ARCHIVES / backup_id
    if not backup.is_dir() or not (backup / "SHA256SUMS").is_file():
        # The pointer is not itself a substitute for independent manifest validation.
        gate("G1_dual_cluster_backup", "HOLD", "latest recovery manifest unavailable")
    else:
        # Use the manifest directory, never the caller's cwd, in another process.
        checked = subprocess.run(["sha256sum","-c","SHA256SUMS"],
                    cwd=str(backup),capture_output=True,text=True,timeout=120)
        status = "PASS" if checked.returncode == 0 else "FAIL"
        gate("G1_dual_cluster_backup", status,
             "latest backup manifest verified; independent recovery is separately required")
        result["latest_backup"] = str(backup)

    if PROOF.is_dir() and (PROOF / "SHA256SUMS").exists():
        checked = subprocess.run(["sha256sum","-c","SHA256SUMS"],cwd=str(PROOF),
                   capture_output=True,text=True,timeout=120)
        gate("G1_local_encrypted_archives", "PASS" if checked.returncode == 0 else "FAIL",
             "three root-private encrypted ciphertext archives SHA verified locally")
    else:
        gate("G1_local_encrypted_archives", "HOLD", "encrypted postguard set not found")
    gate("G1_independent_offhost_restore", "HOLD",
         "recipient-host decryption and dual-PG data/role/RLS restoration not witnessed")
    scope_script = Path(__file__).with_name("verify_school_tenant_scopes_readonly_20261019.py")
    scope_code, scope_out, _ = process(["python3", str(scope_script)], timeout=35)
    gate("G3_restricted_role_tenant_scopes",
         "PASS" if scope_code == 0 and "PASS forced-RLS catalog: 85" in scope_out else "FAIL",
         "read-only unscoped and School2 deny checks, School1 grants 54; not signed actor proof")
    gate("G2_backend_exact_source", "HOLD",
         "running backend file provenance and exact linked Git commit unverified")
    gate("G3_signed_actor_live_auth", "HOLD",
         "real signed HMAC actor and independent principal/teacher/School2 sessions not proved")

    observed = {key: http_status("https://app.assps.edu.pk"+key)
                for key in ("/","/login","/api/","/api/lesson-plans")}
    gate("G7_public_http", "PASS" if observed == {"/":200,"/login":200,"/api/":200,"/api/lesson-plans":401}
         else "FAIL", "anonymous GET only, no credentials or data mutation")
    result["http_statuses"] = observed
    gate("G4_secure_timetable_save", "HOLD",
         "legacy POST ingress remains intentionally denied pending real authenticated safe writer")
    gate("G4_lesson_diary_browser_acceptance", "HOLD",
         "authorized real user Save/Reopen/Print not yet witnessed")
    gate("G5_core_module_regression", "HOLD",
         "real authenticated fee, attendance, admission, HR and next-term live acceptance pending")
    gate("G6_academic_publication_approvals", "HOLD",
         "held independent source approvals cannot be fabricated")
    gate("G7_urdu_physical_print", "HOLD",
         "physical output cannot be certified from a browser snapshot alone")
    gate("G8_joint_deployment", "HOLD",
         "new full frontend/backend candidate not promoted; preserve current production")
    gate("G9_full_release_certificate", "HOLD",
         "mandatory identity, frontend/backend provenance and independent restore gates open")
    return result

def main():
    args = argparse.ArgumentParser(description=__doc__)
    args.add_argument("--output", type=Path, help="Optional PRIVATE report path; output path must be preselected by operator")
    opt = args.parse_args()
    report = audit()
    serialized = json.dumps(report, indent=2, sort_keys=True)
    print(serialized)
    if opt.output:
        if opt.output.exists():
            raise SystemExit("HOLD: evidence report overwrite prohibited")
        opt.output.write_text(serialized+"\n")
        opt.output.chmod(0o600)
    return 0 if all(x["status"]=="PASS" for x in report["gates"].values()) else 2

if __name__ == "__main__":
    raise SystemExit(main())
