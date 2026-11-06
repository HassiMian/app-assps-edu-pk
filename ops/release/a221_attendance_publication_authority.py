#!/usr/bin/env python3
"""A221 strict attendance publication and human acceptance contract.

This module never deploys, changes attendance, or accepts CLI self-signoff.
"""
import hashlib
import json
import math
from pathlib import Path

EXPECTED_BRANCHES=4
MIN_HEADROOM_GIB=16
SHA_HEX=set('0123456789abcdef')

def canonical_sha(value):
    return isinstance(value,str) and len(value)==64 and set(value)<=SHA_HEX

def evaluate(snapshot, *, disk_free_gib, independent_offhost_dr=False,
             principal_authorization=False, teacher_nine_prenine_acceptance=False,
             real_browser_tenant_tests=False, exact_build_index_parity=False,
             rollback_proven=False, lesson_planner_preserved=False,
             source_branch_reviewed=False):
    if not isinstance(snapshot,dict):
        raise ValueError('Published graph evidence required')
    if not isinstance(disk_free_gib,(int,float)) or isinstance(disk_free_gib,bool) or not math.isfinite(disk_free_gib) or disk_free_gib<0:
        raise ValueError('Invalid root disk capacity measurement')
    branches=snapshot.get('entryEvidence')
    if not isinstance(branches,list):
        raise ValueError('Untrusted or incomplete graph evidence')
    blockers=[]
    if snapshot.get('entryModulesConfirmed')!=EXPECTED_BRANCHES or len(branches)!=EXPECTED_BRANCHES:
        blockers.append('FOUR_PUBLISHED_BRANCHES_NOT_VERIFIED')
    if not canonical_sha(snapshot.get('rootIndexSHA256')) or not canonical_sha(snapshot.get('bootAssetSHA256')):
        blockers.append('PUBLISHED_ASSET_HASHES_NOT_VERIFIED')
    if snapshot.get('markAttendanceImportMapSafeReplacements')!=EXPECTED_BRANCHES:
        blockers.append('MARK_ATTENDANCE_SAFE_OVERRIDES_MISSING')
    ids=[]
    for i,entry in enumerate(branches):
        if not isinstance(entry,dict):
            blockers.append('ENTRY_NOT_A_STRUCTURED_EVIDENCE_OBJECT')
            continue
        ident=entry.get('bootEntry')
        if not isinstance(ident,str) or not ident or not ident.startswith('index-') or not ident.endswith('.js'):
            blockers.append('INVALID_PUBLISHED_ENTRY_ID')
        else:
            ids.append(ident)
        if entry.get('replacementPreservesPreNineIdentity') is not True:
            blockers.append('MARK_ATTENDANCE_PRE_NINE_SAFE_IDENTITY_UNVERIFIED')
        if not canonical_sha(entry.get('replacementSHA256')):
            blockers.append('MARK_ATTENDANCE_REPLACEMENT_HASH_MISSING')
        # Even if importmap is present, A213 did not independently verify
        # effective attendance module's runtime class/section scope.
        if entry.get('nineToPreNineSectionFallbackPresent') is True:
            blockers.append('UNSAFE_ATTENDANCE_FALLBACK_LIVE')
        if entry.get('attendanceModuleHasImportMapReplacement') is not True:
            blockers.append('ATTENDANCE_MODULE_REPLACEMENT_MISSING')
        if entry.get('safeEffectiveAttendanceModuleVerified') is not True:
            blockers.append('EFFECTIVE_ATTENDANCE_MODULE_NOT_CERTIFIED')
    if len(ids)!=len(set(ids)):
        blockers.append('DUPLICATE_ENTRY_MODULE_ID')
    if disk_free_gib<MIN_HEADROOM_GIB:blockers.append('DISK_RESERVE_BELOW_16_GIB')
    if not independent_offhost_dr:blockers.append('INDEPENDENT_OFFHOST_FULL_RESTORE_MISSING')
    if not principal_authorization:blockers.append('PRINCIPAL_POSITIVE_ROLE_ACCEPTANCE_MISSING')
    if not teacher_nine_prenine_acceptance:blockers.append('TEACHER_NINE_PRENINE_ACCEPTANCE_MISSING')
    if not real_browser_tenant_tests:blockers.append('ACTUAL_PUBLISHED_BROWSER_TENANT_TESTS_MISSING')
    if not exact_build_index_parity:blockers.append('PUBLISHED_BUILD_GRAPH_AND_INDEX_PARITY_MISSING')
    if not rollback_proven:blockers.append('ROLLBACK_NOT_PROVEN')
    if not lesson_planner_preserved:blockers.append('LESSON_PLANNER_EXACT_BUILD_NOT_CERTIFIED')
    if not source_branch_reviewed:blockers.append('SAA_CORE_SOURCE_REVIEW_MISSING')
    return {'release':'HOLD' if blockers else 'READY_FOR_INDEPENDENT_SAAS_CORE_REVIEW_ONLY',
            'blockers':list(dict.fromkeys(blockers)),
            'actualApprovedRelease':False,
            'canDeploy':False,
            'canDeleteOriginals':False,
            'sourceOfTruthIsObservedPublishedGraph':True,
            'principalApprovalCannotBeProvidedViaCli':True,
            'requiredApprovedBranches':EXPECTED_BRANCHES}

def audit_live(a213_graph, free_gib):
    if not isinstance(a213_graph,dict):
        raise ValueError('A213 read-only graph is required')
    verdict=evaluate(a213_graph,disk_free_gib=free_gib)
    return {'baselineFormat':'A213_CURRENT_ACTIVE_INDEX_IMPORTMAP_PARITY',
            'readOnlyGraph':a213_graph,
            'releaseDecision':verdict,
            'productionWrites':0,
            'livePublish':False,
            'credentialsStored':False}
