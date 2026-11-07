#!/usr/bin/env python3
"""Produce *review-only* surgical delta against exact live backend route SHA.

This tool NEVER changes live files, never deploys and never connects to a DB.
"""
import argparse
from datetime import datetime, timezone
import difflib
import hashlib
import json
import os
from pathlib import Path
import sys

LIVE_ROUTE=Path('/var/www/apex-backend/src/routes/attendanceRoutes.js')
PRIVATE_DIR=Path('/root/workspace/assps-mission-20261107-a223-private')
PINNED_SHA='13a15287442c3db5ed7494e1f448cff402232cdc8196a222b918f78945bb81fd'
IMPORT_ANCHOR="const { tenantClause, currentSchoolId, currentTenantId, hasColumn } = require('../middleware/tenant')"
NEW_IMPORT="const { resolveAuthenticatedAttendanceMarker } = require('./attendanceMarkerIdentity')"
ORIGINAL_MARKER="""    const authenticatedActorId = Number.isInteger(Number(req.user?.id)) ? Number(req.user.id) : null
    const markedByUserId = actorRole === 'teacher'
      ? authenticatedActorId
      : (Number.isInteger(Number(marked_by)) ? Number(marked_by) : authenticatedActorId)"""
NEW_MARKER="""    // All roles: record the authenticated caller, never a client-supplied marked_by.
    // Legacy administrative delegation must have a distinct approved audit contract.
    const markedByUserId = resolveAuthenticatedAttendanceMarker(req.user)
    if (markedByUserId === null) {
      await client.query('ROLLBACK')
      return res.status(403).json({
        success: false,
        error: 'ATTENDANCE_MARKER_NOT_AUTHENTICATED',
        saved: 0,
      })
    }"""
SCOPING_GUARDS=(
 'teacherStudentScopeClause',
 'requireTeacherAssignmentsForAttendance(req, res)',
 'skippedInactiveIds',
 'persistableRecords',
 'currentSchoolId(req)',
 'currentTenantId(req)',
 "await client.query('BEGIN')",
 "await client.query('COMMIT')",
 "await client.query('ROLLBACK')",
 "router.post('/mark-by-gr'",
 "router.get('/',",
)

def sha256(value):
    if isinstance(value,str):value=value.encode('utf-8')
    return hashlib.sha256(value).hexdigest()

def check_text(source,expected_sha):
    if not isinstance(source,str):raise TypeError('Text source required')
    if sha256(source)!=expected_sha:raise ValueError('LIVE_ROUTE_SHA256_NOT_PINNED')
    if source.count(IMPORT_ANCHOR)!=1:raise ValueError('IMPORT_ANCHOR_NOT_UNIQUE')
    if source.count("  const { records, marked_by } = req.body")!=1:
        raise ValueError('BULK_RECORDS_ANCHOR_NOT_UNIQUE')
    if source.count(ORIGINAL_MARKER)!=1:raise ValueError('MARKER_ANCHOR_NOT_UNIQUE')
    for signature in SCOPING_GUARDS:
        if signature not in source:raise ValueError('MISSING_LIVE_GUARD_'+signature[:60])
    mark=source.index("router.post('/mark',")
    scan=source.index("router.post('/mark-by-gr',",mark)
    if not mark<source.index(ORIGINAL_MARKER)<scan:
        raise ValueError('MARKER_OUTSIDE_BULK_HANDLER')
    return mark,scan

def forwardport(source,expected_sha):
    check_text(source,expected_sha)
    newer=source.replace(IMPORT_ANCHOR,IMPORT_ANCHOR+'\n'+NEW_IMPORT,1)
    newer=newer.replace("  const { records, marked_by } = req.body","  const { records } = req.body",1)
    newer=newer.replace(ORIGINAL_MARKER,NEW_MARKER,1)
    assert source!=newer
    assert newer.count("  const { records } = req.body")==1
    assert newer.count(NEW_IMPORT)==1
    assert NEW_MARKER in newer
    for signature in SCOPING_GUARDS:
        assert signature in newer
    # Ensure no authenticated mark-by-GR or other handlers changed.
    marker="router.post('/mark-by-gr',"
    assert source.split(marker,1)[1]==newer.split(marker,1)[1]
    return newer

def patch_string(before,after):
    return ''.join(difflib.unified_diff(before.splitlines(keepends=True),
             after.splitlines(keepends=True),
             fromfile='live-attendanceRoutes.js@pinned',
             tofile='review-attendanceRoutes.js@a223'))

def path_guard(path):
    p=Path(path).absolute()
    if p.parent!=PRIVATE_DIR or p.is_symlink() or not p.name.startswith('A223_'):
        raise ValueError('A223 evidence directory only')
    return p

def write_private(path,data):
    p=path_guard(path)
    tmp=p.with_name(p.name+'.tmp')
    tmp.write_text(data,encoding='utf-8')
    os.chmod(tmp,0o600)
    os.replace(tmp,p)

def main():
    a=argparse.ArgumentParser()
    a.add_argument('--out-prefix',required=True,
                   help='Absolute private evidence path starting A223_')
    opt=a.parse_args()
    prefix=path_guard(opt.out_prefix)
    if not LIVE_ROUTE.is_file() or LIVE_ROUTE.is_symlink():
        raise ValueError('LIVE_BACKEND_ROUTE_MISSING_OR_SYMLINK')
    raw=LIVE_ROUTE.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=PINNED_SHA:
        raise ValueError('SOURCE_CHANGED_SINCE_A223_PIN')
    text=raw.decode('utf-8')
    updated=forwardport(text,PINNED_SHA)
    patch=patch_string(text,updated)
    if patch.count('@@')<2:raise ValueError('NOT_A_VALID_REVIEW_PATCH')
    changed=[line for line in patch.splitlines() if line.startswith('+') or line.startswith('-')]
    if len(changed)>40:raise ValueError('PATCH_WOULD_BE_TOO_BROAD')
    write_private(prefix.with_name(prefix.name+'_ROUTE.js'),updated)
    write_private(prefix.with_name(prefix.name+'_SURGICAL.patch'),patch)
    report={
       'mission':'A223_LIVE_BACKEND_MARKER_SURGICAL_SOURCE_FORWARDPORT',
       'checkedUtc':datetime.now(timezone.utc).isoformat(),
       'expectedLiveRouteSHA256':PINNED_SHA,
       'observedLiveRouteSHA256':hashlib.sha256(raw).hexdigest(),
       'stagedReviewRouteSHA256':sha256(updated),
       'changedPatchLines':len(changed),
       'preservedGuards':list(SCOPING_GUARDS),
       'allLiveTeacherScopeAndInactiveSkipPatternsPreserved':True,
       'bulkClientMarkerOverrideRemoved':True,
       'liveSourceChanged':False,
       'runtimeNodeProcessRestarted':False,
       'realDatabaseIntegrationCertified':False,
       'principalTeacherAuthenticatedAcceptanceCertified':False,
       'productionDeploymentAuthorized':False,
       'productionWrites':0,
       'release':'HOLD',
    }
    write_private(prefix.with_name(prefix.name+'_REPORT.json'),json.dumps(report,indent=2)+'\n')
    print(json.dumps({k:report[k] for k in ('changedPatchLines',
        'allLiveTeacherScopeAndInactiveSkipPatternsPreserved',
        'bulkClientMarkerOverrideRemoved','productionDeploymentAuthorized','release')}))

if __name__=='__main__':
    try:sys.exit(main())
    except (OSError,ValueError,UnicodeDecodeError,TypeError) as ex:
        print('A223 fail-closed: '+type(ex).__name__+': '+str(ex),file=sys.stderr)
        sys.exit(2)
