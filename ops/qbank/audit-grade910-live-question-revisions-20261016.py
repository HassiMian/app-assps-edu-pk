#!/usr/bin/env python3
"""Stable SHA256 of actual LIVE IX/X question content for REVISION-BOUND review.

Never confuse frozen original research hash with current live content hash.
All raw student/teacher/question content discarded after in-memory hashing.
Read-only PostgreSQL, root-only private ID-to-revision SHA output.
"""
from __future__ import annotations
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile

OUT=Path('/var/lib/assps-grade910-sourceclaims/live-question-revisions.json')
SQL="""BEGIN TRANSACTION READ ONLY;
SELECT json_agg(json_build_object(
'id',metadata->>'seed_id',
'grade',class_level,'subject',subject,'medium',medium,'type',question_type,
'chapter',chapter_no,'topic',topic_name,'questionText',question_text,
'englishText',question_text_english,'urduText',question_text_urdu,
'options',options,'correctOption',correct_option,'answer',answer,
'marks',marks,'difficulty',difficulty
)) FROM question_bank WHERE school_id=1 AND class_level IN ('9th','10th');
COMMIT;"""
FIELDS=('grade','subject','medium','type','chapter','topic','questionText',
        'englishText','urduText','options','correctOption','answer','marks','difficulty')

def revision_sha(row):
    if not isinstance(row,dict) or any(f not in row for f in FIELDS):
        raise ValueError('REVISION_SOURCE_FIELDS_MISSING')
    if not row.get('id'):raise ValueError('MISSING_STABLE_QUESTION_ID')
    canonical={f:row[f] for f in FIELDS}
    # No whitespace, case, or punctuation simplification: every authorized edit
    # must receive a different SHA and thus a fresh independent review.
    data=json.dumps(canonical,sort_keys=True,ensure_ascii=False,
                    separators=(',',':'),allow_nan=False).encode('utf8')
    return hashlib.sha256(b'ASSPS_IX_X_LIVE_QUESTION_REVISION_V1\x00'+data).hexdigest()

def build(rows):
    if len(rows)!=2411:raise ValueError('LIVE_BANK_COUNT_CHANGED_REBASELINE_REQUIRED')
    known=set()
    values=[]
    for r in rows:
        if not isinstance(r.get('id'),str) or not r['id'] or r['id'] in known:
            raise ValueError('MISSING_OR_DUPLICATE_LIVE_SEED_ID')
        known.add(r['id'])
        values.append({'questionId':r['id'],'revisionSha256':revision_sha(r),
                       'grade':r['grade'],'type':r['type']})
    values.sort(key=lambda x:x['questionId'])
    return {'schema':'ASSPS_IX_X_LIVE_CONTENT_REVISION_HASH_LEDGER_V1',
            'observedUTC':dt.datetime.now(dt.timezone.utc).isoformat(),
            'schoolId':1,'revisions':len(values),
            'actualLiveAcademicRevisionContentHashed':True,
            'originalResearchRevisionHashInterchangeable':False,
            'humanReviewerSignedRevisions':0,
            'academicallyApprovedRevisions':0,
            'databaseWrites':0,'questionTextPersisted':False,
            'records':values}

def read_live():
    p=subprocess.run(['runuser','-u','postgres','--','psql','-X','-At','-v','ON_ERROR_STOP=1',
                      '-d','apexos','-c',SQL],capture_output=True,text=True,timeout=45)
    if p.returncode:raise RuntimeError('READ_ONLY_REVISION_SQL_ERROR')
    lines=[x for x in p.stdout.splitlines() if x.startswith('[')]
    if len(lines)!=1:raise RuntimeError('LIVE_REVISION_JSON_MISSING')
    return json.loads(lines[0])

def save(path,data):
    path.parent.mkdir(parents=True,mode=0o700,exist_ok=True)
    if path.parent.stat().st_mode&0o077:raise ValueError('PRIVATE_REVISION_LEDGER_DIR_REQUIRED')
    fd,tmp=tempfile.mkstemp(dir=path.parent,prefix='.live-revisions-')
    try:
        os.fchmod(fd,0o600)
        with os.fdopen(fd,'w') as f:
            json.dump(data,f,sort_keys=True,indent=2,ensure_ascii=False)
            f.write('\n');f.flush();os.fsync(f.fileno())
        os.replace(tmp,path)
    finally:
        if os.path.exists(tmp):os.unlink(tmp)

if __name__=='__main__':
    from grade910_live_revision_history_20261016 import PATH as HISTORY, build as build_history
    report=build(read_live())
    if not OUT.exists():
        raise SystemExit('NO_PREEXISTING_LIVE_REVISION_BASELINE_PROTECT_ORIGINAL_HISTORY')
    previous=json.loads(OUT.read_text())
    history=json.loads(HISTORY.read_text()) if HISTORY.exists() else None
    journal=build_history(previous,report,history)
    # Journal before current state. If the process crashes between the two,
    # recovery recognises the legitimate old-current pair without duplicate events.
    save(HISTORY,journal)
    save(OUT,report)
    print(json.dumps({**{k:v for k,v in report.items() if k!='records'},
       'revisionHistoryEvents':journal['contentChangesObserved'],
       'allChangedRevisionsRequireIndependentRereview':True},sort_keys=True))
