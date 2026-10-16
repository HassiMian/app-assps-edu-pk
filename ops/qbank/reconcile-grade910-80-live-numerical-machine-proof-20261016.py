#!/usr/bin/env python3
"""Unify 59 old + 21 newer *machine* numeral proofs without changing review history.

No question text, answers, textbook pages, student info or faculty identities
written; question IDs and exact current School1 full-content SHA only.
Qualified independent academic review and school adoption remain false.
"""
from __future__ import annotations
from collections import Counter
import importlib.util
import json
import os
from pathlib import Path
import re
import sys
import tempfile

ROOT=Path(__file__).resolve().parents[2]
STATE=Path('/var/lib/assps-grade910-sourceclaims')
OUT=STATE/'grade910-80-live-numericals-current-machine-arithmetic-20261016.json'
PIN_RE=re.compile(r'^[0-9a-f]{64}$')

def proof(live, old, priority, deep, receipt):
    if (live.get('schema')!='ASSPS_IX_X_LIVE_CONTENT_REVISION_HASH_LEDGER_V1'
        or live.get('revisions')!=2411
        or len(live.get('records',[]))!=2411
        or live.get('actualLiveAcademicRevisionContentHashed') is not True
        or live.get('academicallyApprovedRevisions')!=0
        or live.get('databaseWrites')!=0):
        raise ValueError('AUTHENTIC_LIVE_FULL_REVISION_LEDGER_REQUIRED')
    if (old.get('schema')!='ASSPS_GRADE910_LIVE_NUMERICAL_REVISION_EVIDENCE_V1'
        or len(old.get('records',[]))!=80
        or old.get('liveNumericals')!=80
        or old.get('academicApprovals')!=0
        or old.get('productionDatabaseWrites')!=0):
        raise ValueError('PREVIOUS_80_LIVE_NUMERICAL_EVIDENCE_INCOMPLETE')
    if (priority.get('schema')!='ASSPS_GRADE910_21_NUMERIC_RECOMPUTATION_QUEUE_V1'
        or priority.get('stillNeedCurrentRevisionIndependentRecomputation')!=21
        or len(priority.get('records',[]))!=21
        or priority.get('qualifiedReviewerApprovals')!=0
        or priority.get('publicationEligibleFromThisEvidence')!=0):
        raise ValueError('FROZEN_21_HISTORICAL_RECOMPUTATION_QUEUE_CHANGED')
    if (deep.get('schema')!='ASSPS_GRADE910_21_NUMERICAL_DEEP_RECOMPUTATION_SOURCE_V1'
        or len(deep.get('records',[]))!=21
        or deep.get('sourceOriginalsIndependentlyRecomputed')!=21
        or deep.get('currentLiveStemsAndAnswersMatched')!=21
        or deep.get('prior59FullLiveRevisionAndStemReauthenticated')!=59
        or deep.get('combined80NumericalReadOnlyProof') is not True
        or deep.get('liveTextComparisonFailures')!=0
        or deep.get('currentLiveFullRevisionSha256Verified') is not True
        or deep.get('schoolAdoptedTextbookEditionCertified') is not False
        or deep.get('qualifiedFacultyApprovalsCreated')!=0
        or deep.get('paperStudioPublicationEnabled') is not False
        or deep.get('productionDatabaseWrites')!=0):
        raise ValueError('AUTHORITATIVE_80_LIVE_MACHINE_RECOMPUTATION_NOT_COMPLETE')
    if (receipt.get('schema')!='ASSPS_GRADE910_21_NUMERICAL_DEEP_RECOMPUTATION_SOURCE_V1'
        or receipt.get('combined80NumericalReadOnlyProof') is not True
        or receipt.get('sourceOriginalsIndependentlyRecomputed')!=21
        or receipt.get('prior59FullLiveRevisionAndStemReauthenticated')!=59
        or receipt.get('productionDatabaseWrites')!=0
        or receipt.get('qualifiedFacultyApprovalsCreated')!=0):
        raise ValueError('PREVIOUS_SOURCE21_RECEIPT_STALE_OR_UNAUTHORIZED')
    idx={x['questionId']:x for x in live['records']}
    if len(idx)!=2411: raise ValueError('DUPLICATE_LIVE_QUESTION_CONTENT_IDS')
    historic={x['questionId']:x for x in priority['records']}
    fresh={x['questionId']:x for x in deep['records']}
    if len(historic)!=21 or len(fresh)!=21 or set(historic)!=set(fresh):
        raise ValueError('21_FROZEN_AND_NEW_INDEPENDENT_NUMERICAL_IDS_DIFFER')
    older={x['questionId']:x for x in old['records']}
    if len(older)!=80 or set(historic)-set(older):
        raise ValueError('LEGACY_LIVE_80_IDS_NOT_UNIQUE_OR_MISSING')
    result=[]
    stats=Counter()
    for qid in sorted(older):
        q=older[qid]
        l=idx.get(qid)
        if (l is None or l.get('type')!='numerical'
            or not PIN_RE.fullmatch(str(l.get('revisionSha256')))
            or q.get('currentLiveRevisionSha256')!=l['revisionSha256']
            or q.get('qualifiedReviewerApproved') is not False
            or q.get('paperStudioVerifiedSelectable') is not False
            or q.get('exactBookExercisePageVerified') is not False
            or q.get('sourceFrozenOriginalRevisionSha256') is None):
            raise ValueError('NUMERICAL_CURRENT_LIVE_FULL_SHA_OR_FACULTY_APPROVAL_DRIFT')
        if qid in historic:
            older_priority=historic[qid]
            completed=fresh[qid]
            if (q.get('category')!='LEGACY_MACHINE_QA_ONLY_LIVE_REVISION_NEEDS_DEEP_RECOMPUTATION'
                or older_priority.get('currentRevisionSha256')!=l['revisionSha256']
                or completed.get('previousLiveRevisionSha256')!=l['revisionSha256']
                or completed.get('frozenRevisionSha256')!=q['sourceFrozenOriginalRevisionSha256']
                or completed.get('liveExactStemAndAnswerMatch') is not True
                or completed.get('liveFullRevisionSha256MatchesPinned') is not True
                or completed.get('independentArithmeticFromLockedSource') is not True
                or completed.get('academicPublicationApproved') is not False
                or completed.get('qualifiedFacultyApproved') is not False):
                raise ValueError('LEGACY_21_NOT_AUTHENTICATED_AT_CURRENT_LIVE_REVISION')
            lane='OLDER_QUEUE_RECOMPUTED_AND_CURRENT_REVISION_REAUTHENTICATED'
            stats['previouslyHistorical21NowMechanicallyRecomputed']+=1
        else:
            if q.get('category')!='LIVE_STEM_ANSWER_MATCH_DEEP_RECOMPUTED_ORIGINAL':
                raise ValueError('OLDER_59_NO_AUTHENTIC_DEEP_MACHINE_PROOF')
            lane='PRIOR_DEEP_ORIGINAL_REFERENCE_REAUTHENTICATED_CURRENT_SHA'
            stats['prior59MachineRecomputedAndReauthenticated']+=1
        result.append({
            'questionId':qid,
            'grade':q['grade'],'subject':q['subject'],
            'currentLiveFullRevisionSha256':l['revisionSha256'],
            'immutableOriginalRevisionSha256':q['sourceFrozenOriginalRevisionSha256'],
            'mechanicalEvidence':lane,
            'sourceTextbookEditionAdoptedByASSPS':False,
            'printedTextbookExercisePageAuthenticated':False,
            'qualifiedIndependentSubjectReviewerAuthenticated':False,
            'academicallyApproved':False,
            'paperStudioVerifiedSelectable':False})
    if (len(result)!=80 or stats['previouslyHistorical21NowMechanicallyRecomputed']!=21
        or stats['prior59MachineRecomputedAndReauthenticated']!=59):
        raise ValueError('ALL_80_NUMERICAL_MACHINE_PROOFS_NOT_RECONCILED')
    return {
        'schema':'ASSPS_GRADE910_80_LIVE_NUMERICAL_MACHINE_CORROBORATION_NOT_ACADEMIC_APPROVAL_V1',
        'actualSchool1LiveFullRevisionHashedQuestions':2411,
        'machineArithmeticCoverageCurrentRevision':80,
        'previouslyDeepRecomputedNumericals':59,
        'historical21SourceRecomputedCurrent':21,
        'historical21PriorityQueueKeptAsReadOnlyHistory':True,
        'oldMissingMachineRecomputationFlagsSupersededInNewEvidenceReceipt':21,
        'remainingNumericalsWithoutReadOnlyCurrentMachineRecomputation':0,
        'numericalsAwaitingAuthenticIndependentFacultyReview':80,
        'schoolAdoptionVerified':False,'questionTextbookExercisePageVerified':False,
        'academicApprovedQuestions':0,'paperStudioPublishedVerifiedQuestions':0,
        'productionDatabaseWrites':0,'copyrightedSourceTextOrStudentDataPersisted':False,
        'mechanicalEvidenceDistribution':dict(sorted(stats.items())),
        'records':result}

def atomic(path,obj):
    if path.parent.stat().st_mode&0o077:raise ValueError('RESEARCH_PRIVATE_DIRECTORY_EXPOSED')
    fd,tmp=tempfile.mkstemp(prefix='.grade910-all80-numeric-',dir=path.parent)
    try:
        os.fchmod(fd,0o600)
        with os.fdopen(fd,'w',encoding='utf8') as f:
            json.dump(obj,f,ensure_ascii=False,sort_keys=True,indent=2);f.write('\n')
        os.replace(tmp,path)
    finally:
        if os.path.exists(tmp):os.unlink(tmp)

def load():
    live=json.loads((STATE/'live-question-revisions.json').read_text())
    old=json.loads((STATE/'live-numerical-evidence.json').read_text())
    priority=json.loads((STATE/'numerical-review-priority.json').read_text())
    previous=json.loads((STATE/'numerical-deep-recomputation-21.json').read_text())
    src=ROOT/'ops/qbank/recompute-grade910-21-original-numericals-20261016.py'
    spec=importlib.util.spec_from_file_location('live_grade910_21_numeric_recompute_current_recheck',src)
    m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
    return proof(live,old,priority,m.run(check_live=True),previous)

def main():
    result=load()
    if sys.argv[1:]==['--check']:
        if not OUT.exists() or json.loads(OUT.read_text())!=result:
            raise ValueError('PRIVATE_80_CURRENT_NUMERICAL_SOURCE_MACHINE_PROOF_MISSING_OR_STALE')
        print('80_OF_80_LIVE_NUMERICAL_MACHINE_PROOF_VALID; INDEPENDENT_FACULTY_REVIEWS_STILL_ZERO')
    elif len(sys.argv)==1:
        atomic(OUT,result)
        print(json.dumps({k:v for k,v in result.items() if k!='records'},sort_keys=True))
    else:raise ValueError('ONLY_APPLY_OR_CHECK')
if __name__=='__main__':main()
