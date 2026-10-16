#!/usr/bin/env python3
"""Persistent revision-change evidence; no content, signatures, approvals or DB writes.

The academic source service persists this SHA-only history BEFORE replacing its
latest live-revision snapshot, so a crash/retry does not lose a detected edit.
"""
import datetime as dt
import hashlib
import json
import re
from pathlib import Path

PATH=Path('/var/lib/assps-grade910-sourceclaims/live-revision-history.json')
SHA=re.compile(r'^[a-f0-9]{64}$')
SCHEMA='ASSPS_GRADE910_LIVE_SHA_REVISION_CHANGE_HISTORY_V1'

def digest(data):
    return hashlib.sha256(json.dumps(data,sort_keys=True,ensure_ascii=False,
                        separators=(',',':')).encode('utf8')).hexdigest()

def indexed(receipt):
    if receipt is None:return None
    if receipt.get('schema')!='ASSPS_IX_X_LIVE_CONTENT_REVISION_HASH_LEDGER_V1':
        raise ValueError('UNTRUSTED_LIVE_REVISION_RECEIPT')
    if receipt.get('revisions')!=2411 or receipt.get('academicallyApprovedRevisions')!=0:
        raise ValueError('REVISION_COUNT_OR_APPROVAL_DRIFT')
    rows=receipt.get('records')
    if not isinstance(rows,list) or len(rows)!=2411:
        raise ValueError('REVISION_ROWS_MISSING')
    result={}
    for row in rows:
        qid=row.get('questionId')
        sha=row.get('revisionSha256')
        if not isinstance(qid,str) or not qid or qid in result or not isinstance(sha,str) or not SHA.fullmatch(sha):
            raise ValueError('DUPLICATED_OR_INVALID_ID_REVISION_SHA')
        result[qid]=sha
    return result

def build(previous,current,history=None,observed=None):
    cur=indexed(current)
    old=indexed(previous)
    when=observed or dt.datetime.now(dt.timezone.utc).isoformat()
    if history is None:
        if old is None:raise ValueError('HISTORICAL_REVISION_BASELINE_MISSING')
        # First installation anchors the pre-existing live SHA receipt, not an
        # invented historical revision or an academic review signature.
        history={'schema':SCHEMA,'initialBaselineSha256':digest(old),
                 'initialBaselineIdRevisionSha256':dict(old),
                 'currentSnapshotSha256':digest(old),
                 'lastSeenIdRevisionSha256':old,'events':[],
                 'contentChangesObserved':0,'academicReviewApprovalsFromJournal':0,
                 'publishedQuestionsFromJournal':0,'questionTextsPersisted':False,
                 'databaseWrites':0}
    else:
        if history.get('schema')!=SCHEMA or history.get('questionTextsPersisted') is not False:
            raise ValueError('REVISION_HISTORY_INVALID')
        if history.get('academicReviewApprovalsFromJournal')!=0 or history.get('publishedQuestionsFromJournal')!=0:
            raise ValueError('FALSE_ACADEMIC_APPROVAL_IN_CHANGE_HISTORY')
        prior=history.get('lastSeenIdRevisionSha256')
        if not isinstance(prior,dict) or len(prior)!=2411 or history.get('currentSnapshotSha256')!=digest(prior):
            raise ValueError('REVISION_HISTORY_CURRENT_SHA_MISMATCH')
        if not isinstance(history.get('events'),list) or history.get('contentChangesObserved')!=len(history['events']):
            raise ValueError('REVISION_HISTORY_EVENT_COUNT_MISMATCH')
        chain=history['initialBaselineSha256']
        original=history.get('initialBaselineIdRevisionSha256')
        if not isinstance(original,dict) or len(original)!=2411 or digest(original)!=chain:
            raise ValueError('REVISION_HISTORY_ORIGINAL_BASELINE_INVALID')
        replay=dict(original)
        if not isinstance(chain,str) or not SHA.fullmatch(chain):
            raise ValueError('REVISION_HISTORY_INITIAL_BASELINE_INVALID')
        for e in history['events']:
            expected=digest({k:e[k] for k in ('id','fromSha256','toSha256','observedUTC','previousEventHash')})
            if e.get('previousEventHash')!=chain or e.get('eventHash')!=expected:
                raise ValueError('REVISION_HISTORY_EVENT_CHAIN_BROKEN')
            if (e.get('id') not in replay or e.get('fromSha256')!=replay[e['id']]
                or not isinstance(e.get('toSha256'),str)
                or not SHA.fullmatch(e['toSha256'])):
                raise ValueError('REVISION_HISTORY_EVENT_NOT_BOUND_TO_LIVE_REVISION')
            replay[e['id']]=e['toSha256']
            chain=expected
        if replay!=prior:raise ValueError('REVISION_HISTORY_REPLAY_MISMATCH')
        history=dict(history)
        history['events']=list(history['events'])
        history['lastSeenIdRevisionSha256']=dict(prior)
    baseline=history['lastSeenIdRevisionSha256']
    if set(cur)!=set(baseline):
        raise ValueError('LIVE_QUESTION_ID_SET_CHANGED_MUST_PRESERVE_HISTORY')
    if old is not None and old!=baseline and old!=cur:
        # Journal may have committed but the latest receipt update may have
        # crashed. This must replay without generating a duplicate event.
        if not (cur==baseline and history.get('lastTransitionFromSnapshotSha256')==digest(old)):
            raise ValueError('PREVIOUS_SNAPSHOT_NOT_IN_RECOVERY_SEQUENCE')
    if cur!=baseline:
        history['lastTransitionFromSnapshotSha256']=digest(baseline)
    chain=history['events'][-1]['eventHash'] if history['events'] else history['initialBaselineSha256']
    for qid in sorted(cur):
        if cur[qid]==baseline[qid]:continue
        e={'id':qid,'fromSha256':baseline[qid],'toSha256':cur[qid],
           'observedUTC':when,'previousEventHash':chain}
        e['eventHash']=digest(e)
        history['events'].append(e)
        chain=e['eventHash']
    history['lastSeenIdRevisionSha256']=cur
    history['currentSnapshotSha256']=digest(cur)
    history['contentChangesObserved']=len(history['events'])
    history['mostRecentObservedUTC']=when
    history['everyChangedQuestionNeedsNewIndependentReview']=True
    history['academicReviewApprovalsFromJournal']=0
    history['publishedQuestionsFromJournal']=0
    history['databaseWrites']=0
    return history
