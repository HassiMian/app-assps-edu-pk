#!/usr/bin/env python3
"""Create or verify a separate, root-private SOURCE OVERLAY stage, never a live deployment."""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import sys
import tarfile
import time

PIN = "3b7f6b24a6b3ea935105f4eba95afef1fb1179b1"
REPO = Path(__file__).resolve().parents[2]
ROOT = Path("/root/assps-release-candidates/core-ai-worker-sensitive-dml-3b7f6b24-20261016")
OLD = Path("/root/assps-release-candidates/phase1-backend-green-bfd7a35eb514")
LIVE = Path("/var/www/apex-backend/src")
FILES = (
    "services/ai/aiQueueWorkerDatabase.js",
    "services/ai/paperAiQueue.js",
    "services/lessonPlanningPublicationGuard.js",
    "routes/lessonPlanRoutes.js",
    "routes/opsRoutes.js",
)
ORIGINALS = ("services/ai/paperAiQueue.js","routes/lessonPlanRoutes.js","routes/opsRoutes.js")


def digest(data:bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def safe_file(path:Path,private=False):
    st=path.lstat()
    return (stat.S_ISREG(st.st_mode) and not path.is_symlink()
            and (not private or (st.st_uid==0 and stat.S_IMODE(st.st_mode)==0o600)))


def original_integrity():
    """Verify rollback bytes still match running backend, using only existing protected originals."""
    old_manifest_path=OLD/"stage-manifest.json"
    old_archive=OLD/"live-original-three-files.tar.gz"
    if not safe_file(old_manifest_path,True) or not safe_file(old_archive,True):
        raise ValueError("PREVIOUS_ROLLBACK_ARCHIVE_NOT_PRIVATE")
    old=json.loads(old_manifest_path.read_text())
    blob=old_archive.read_bytes()
    if digest(blob)!=old["originals_archive_sha256"]:
        raise ValueError("PREVIOUS_ROLLBACK_ARCHIVE_CHANGED")
    with tarfile.open(fileobj=__import__('io').BytesIO(blob),mode="r:gz") as arc:
        entries=arc.getmembers()
        if len(entries)!=len(ORIGINALS) or set(a.name for a in entries)!=set(ORIGINALS):
            raise ValueError("ORIGINAL_ROLLBACK_ENTRY_SET_CHANGED")
        if any(not a.isfile() or a.issym() or a.islnk() for a in entries):
            raise ValueError("ORIGINAL_ROLLBACK_UNSAFE_TYPE")
        original_hashes={a.name:digest(arc.extractfile(a).read()) for a in entries}
    for name in ORIGINALS:
        path=LIVE/name
        if not safe_file(path) or original_hashes[name]!=digest(path.read_bytes()):
            raise ValueError("LIVE_ROLLBACK_ORIGINAL_DRIFT")
        if old.get("original_live_hashes",{}).get(name)!=original_hashes[name]:
            raise ValueError("PREVIOUS_MANIFEST_ORIGINAL_MISMATCH")
    return blob,original_hashes


def pinned_sources():
    source_shas={}
    contents={}
    for name in FILES:
        path=REPO/"al-siddique-backend/src"/name
        if not safe_file(path):
            raise ValueError("UNSAFE_SOURCE_FILE")
        out=subprocess.run(["git","-C",str(REPO),"show",
                            PIN+":al-siddique-backend/src/"+name],
                           stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=True,timeout=10).stdout
        # Check working source remains exact pinned; don't stage dirty/unreviewed bytes.
        if digest(out)!=digest(path.read_bytes()):
            raise ValueError("UNREVIEWED_SOURCE_DIFF")
        source_shas[name]=digest(out)
        contents[name]=out
    return contents,source_shas


def check_snapshot(manifest,sha_map,actual_originals,archive_sha,private_ok):
    """Pure guard to make independent mutation-negative tests possible."""
    failures=[]
    if not private_ok:
        failures.append("PRIVATE_PERMISSIONS")
    if manifest.get("source_commit")!=PIN or manifest.get("stage")!=str(ROOT):
        failures.append("SOURCE_PIN_OR_STAGE_PATH")
    if manifest.get("schema")!="ASSPS_CORE_WORKER_DML_PRIVATE_OVERLAY_V1":
        failures.append("SCHEMA")
    if manifest.get("decision")!="REVIEW_OVERLAY_NOT_DEPLOYED" or any(
      manifest.get(k) is not False for k in
      ("production_changed","database_changed","runtime_secrets_copied","release_authorized","signed_certified")
    ):
        failures.append("RELEASE_SAFETY_FLAGS")
    if set(manifest.get("overlays",{}))!=set(FILES) or set(sha_map)!=set(FILES):
        failures.append("OVERLAY_SET")
    if any(manifest.get("overlays",{}).get(name)!=sha_map.get(name) for name in FILES):
        failures.append("OVERLAY_SHA")
    if set(actual_originals)!=set(ORIGINALS) or manifest.get("original_live_hashes")!=actual_originals:
        failures.append("ORIGINAL_SHA")
    if manifest.get("original_archive_sha256")!=archive_sha:
        failures.append("ORIGINAL_ARCHIVE_SHA")
    return sorted(set(failures))


def verify():
    _,orig=original_integrity()
    _,sources=pinned_sources()
    manifest_path=ROOT/"manifest.json"
    rollback_path=ROOT/"live-original-three-files.tar.gz"
    if not ROOT.is_dir() or ROOT.is_symlink():
        raise ValueError("PRIVATE_STAGE_ABSENT")
    files_expected={"manifest.json","live-original-three-files.tar.gz"} | {"src/"+x for x in FILES}
    files_seen=set()
    for path in ROOT.rglob("*"):
        if path.is_symlink():
            raise ValueError("SYMLINK_IN_PRIVATE_STAGE")
        if path.is_file(): files_seen.add(str(path.relative_to(ROOT)))
    if files_seen!=files_expected:
        raise ValueError("STAGE_UNEXPECTED_OR_MISSING_FILES")
    rootstat=ROOT.stat()
    private_ok=(rootstat.st_uid==0 and stat.S_IMODE(rootstat.st_mode)==0o700
                and all(safe_file(ROOT/"src"/n,True) for n in FILES)
                and safe_file(manifest_path,True) and safe_file(rollback_path,True))
    manifest=json.loads(manifest_path.read_text())
    stage_sha={name:digest((ROOT/"src"/name).read_bytes()) for name in FILES}
    expected_orig_blob,_=original_integrity()
    failures=check_snapshot(manifest,stage_sha,orig,digest(expected_orig_blob),private_ok)
    if sources!=stage_sha:
        failures.append("CURRENT_SOURCE_PIN_DRIFT")
    if digest(rollback_path.read_bytes())!=digest(expected_orig_blob):
        failures.append("ARCHIVE_STAGE_ROLLBACK_MISMATCH")
    return {"schema":"ASSPS_CORE_WORKER_DML_PRIVATE_OVERLAY_V1",
            "status":"PRIVATE_WORKER_DML_OVERLAY_PASS_NOT_RELEASE" if not failures else "HOLD",
            "failures":failures,"source_commit":PIN,"overlays":len(FILES),
            "rollback_originals":len(ORIGINALS),"productionChanged":False,
            "databaseChanged":False,"liveAdapterDeployed":False,
            "signedExternalEvidenceVerified":False,"releaseAuthorized":False}


def create():
    blobs,shas=pinned_sources()
    archive,original_hashes=original_integrity()
    if ROOT.exists() or ROOT.is_symlink():
        raise ValueError("STAGE_ALREADY_EXISTS_NO_OVERWRITE")
    ROOT.mkdir(mode=0o700)
    for name,content in blobs.items():
        p=ROOT/"src"/name
        p.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
        p.write_bytes(content)
        p.chmod(0o600)
    backup=ROOT/"live-original-three-files.tar.gz"
    backup.write_bytes(archive)
    backup.chmod(0o600)
    manifest={
      "schema":"ASSPS_CORE_WORKER_DML_PRIVATE_OVERLAY_V1",
      "decision":"REVIEW_OVERLAY_NOT_DEPLOYED",
      "source_commit":PIN,"stage":str(ROOT),
      "created_at_epoch":int(time.time()),
      "overlays":shas,"original_live_hashes":original_hashes,
      "original_archive_sha256":digest(archive),
      "production_changed":False,"database_changed":False,
      "runtime_secrets_copied":False,"release_authorized":False,
      "signed_certified":False,
    }
    path=ROOT/"manifest.json"
    path.write_text(json.dumps(manifest,sort_keys=True,indent=2)+"\n")
    path.chmod(0o600)
    result=verify()
    if result["status"]!="PRIVATE_WORKER_DML_OVERLAY_PASS_NOT_RELEASE":
        raise ValueError("CREATED_STAGE_FAILED_VERIFICATION")
    return result


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--create",action="store_true",help="create new private overlay if absent")
    args=parser.parse_args()
    try:
        r=create() if args.create else verify()
    except (OSError,ValueError,KeyError,tarfile.TarError,subprocess.SubprocessError):
        r={"schema":"ASSPS_CORE_WORKER_DML_PRIVATE_OVERLAY_V1",
           "status":"HOLD","failures":["PROBE_OR_STAGE_INTEGRITY_ERROR"],
           "productionChanged":False,"databaseChanged":False,"releaseAuthorized":False}
    print(json.dumps(r,sort_keys=True))
    return 0 if r["status"]=="PRIVATE_WORKER_DML_OVERLAY_PASS_NOT_RELEASE" else 2


if __name__=="__main__":
    sys.exit(main())
