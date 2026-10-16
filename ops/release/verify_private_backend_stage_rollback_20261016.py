#!/usr/bin/env python3
"""Read-only signed-Core backend stage/rollback integrity preflight (NOT release authority)."""
from __future__ import annotations
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import sys
import tarfile

OVERLAYS = (
    "services/ai/aiQueueWorkerDatabase.js",
    "services/ai/paperAiQueue.js",
    "services/lessonPlanningPublicationGuard.js",
    "routes/lessonPlanRoutes.js",
    "routes/opsRoutes.js",
)
ORIGINALS = (
    "services/ai/paperAiQueue.js",
    "routes/lessonPlanRoutes.js",
    "routes/opsRoutes.js",
)
STAGE = Path("/root/assps-release-candidates/phase1-backend-green-bfd7a35eb514")
LIVE = Path("/var/www/apex-backend/src")
SOURCE = Path(__file__).resolve().parents[2] / "al-siddique-backend/src"
EXPECTED_STAGE_SOURCE = "bfd7a35eb514a67e06705ae57b028c2eb5119488"
ROOT_STAGE = str(STAGE)

def sha_data(b:bytes) -> str:
    return hashlib.sha256(b).hexdigest()

def sha_file(p:Path) -> str:
    h=hashlib.sha256()
    with p.open("rb") as f:
        for block in iter(lambda:f.read(1048576),b""):
            h.update(block)
    return h.hexdigest()

def private_regular_file(path:Path):
    st=path.lstat()
    return stat.S_ISREG(st.st_mode) and st.st_uid==0 and not (st.st_mode & 0o077)

def check(manifest, stage_hashes, live_hashes, archive_hashes,
          archived_names, private_ok, source_hashes, staged_adapter_present_in_live):
    failures=[]
    if not private_ok: failures.append("PRIVATE_STAGE_OR_ARCHIVE_PERMISSIONS")
    if not isinstance(manifest,dict): manifest={}
    if manifest.get("decision")!="PRIVATE_STAGE_READY_NOT_DEPLOYED" or manifest.get("source_commit")!=EXPECTED_STAGE_SOURCE:
        failures.append("STAGE_ORIGINAL_PROVENANCE")
    if manifest.get("stage")!=ROOT_STAGE or manifest.get("production_backend_changed") is not False or manifest.get("database_changed") is not False or manifest.get("runtime_secrets_copied") is not False:
        failures.append("STAGE_MUTATION_OR_PATH_CONTRACT")
    if manifest.get("reviewed_files") != len(OVERLAYS):
        failures.append("OVERLAY_COUNT")
    if set(manifest.get("stage_shas",{})) != set(OVERLAYS) or set(stage_hashes) != set(OVERLAYS) or set(source_hashes) != set(OVERLAYS):
        failures.append("OVERLAY_SET")
    if any(not (stage_hashes.get(rel)==source_hashes.get(rel)==manifest.get("stage_shas",{}).get(rel)) for rel in OVERLAYS):
        failures.append("STAGE_SOURCE_SHA_DRIFT")
    if set(manifest.get("original_live_hashes",{}))!=set(ORIGINALS) or set(live_hashes)!=set(ORIGINALS):
        failures.append("LIVE_ROLLBACK_SET")
    if sorted(archived_names)!=sorted(ORIGINALS) or set(archive_hashes)!=set(ORIGINALS):
        failures.append("ARCHIVE_CONTENT_SET")
    if any(not (manifest.get("original_live_hashes",{}).get(rel)==live_hashes.get(rel)==archive_hashes.get(rel)) for rel in ORIGINALS):
        failures.append("ARCHIVED_LIVE_SHA_DRIFT")
    if staged_adapter_present_in_live:
        failures.append("RUNNING_BACKEND_STATUS_CHANGED")
    return {
        "status":"PRIVATE_STAGE_ROLLBACK_PARITY_PASS_NOT_RELEASE" if not failures else "HOLD",
        "failedChecks":failures,
        "reviewedOverlayCount":len(OVERLAYS) if not failures else 0,
        "rollbackArchivedOriginalCount":len(ORIGINALS) if not failures else 0,
        "liveBackendAdapterDeployed":staged_adapter_present_in_live,
        "signedProductionTransportCertified":False,
        "independentOffhostRecoveryCertified":False,
        "releaseAuthorized":False,
        "productionChanged":False,
        "readOnly":True,
    }

def main():
    manifest_file=STAGE/"stage-manifest.json"
    archive_file=STAGE/"live-original-three-files.tar.gz"
    private_ok=(
        STAGE.is_dir() and not STAGE.is_symlink() and STAGE.stat().st_uid==0
        and not (STAGE.stat().st_mode & 0o077) and
        private_regular_file(manifest_file) and private_regular_file(archive_file)
    )
    manifest=json.loads(manifest_file.read_text())
    for path in [*map(lambda r:STAGE/"src"/r,OVERLAYS),
                 *map(lambda r:SOURCE/r,OVERLAYS),
                 *map(lambda r:LIVE/r,ORIGINALS)]:
        if path.is_symlink() or not path.is_file():
            raise RuntimeError("MISSING_OR_SYMLINKED_SOURCE_FILE")
    if sha_file(archive_file)!=manifest.get("originals_archive_sha256"):
        raise RuntimeError("ARCHIVE_SHA256_CHANGED")
    with tarfile.open(archive_file,"r:gz") as tar:
        members=tar.getmembers()
        names=[m.name for m in members]
        if len(names)!=len(ORIGINALS) or any(not m.isfile() or m.issym() or m.islnk() for m in members):
            raise RuntimeError("UNSAFE_ARCHIVE_ENTRY")
        archive_hashes={m.name:sha_data(tar.extractfile(m).read()) for m in members}
    verdict=check(manifest,
        {r:sha_file(STAGE/"src"/r) for r in OVERLAYS},
        {r:sha_file(LIVE/r) for r in ORIGINALS},
        archive_hashes,names,private_ok,
        {r:sha_file(SOURCE/r) for r in OVERLAYS},
        (LIVE/"services/ai/aiQueueWorkerDatabase.js").exists())
    print(json.dumps({"schema":"ASSPS_CORE_PRIVATE_BACKEND_STAGE_ROLLBACK_V1",**verdict},sort_keys=True))
    return 0 if verdict["status"]=="PRIVATE_STAGE_ROLLBACK_PARITY_PASS_NOT_RELEASE" else 2

if __name__=="__main__":
    try: sys.exit(main())
    except (OSError,KeyError,ValueError,RuntimeError,tarfile.TarError) as exc:
        print(json.dumps({"schema":"ASSPS_CORE_PRIVATE_BACKEND_STAGE_ROLLBACK_V1",
            "status":"HOLD","failure":"INTEGRITY_EXCEPTION_"+type(exc).__name__,
            "productionChanged":False,"releaseAuthorized":False},sort_keys=True))
        sys.exit(2)
