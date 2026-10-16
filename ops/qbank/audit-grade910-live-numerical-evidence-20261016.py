#!/usr/bin/env python3
"""Read-only live numerical evidence map: distinguish old machine QA vs current revision."""
from __future__ import annotations
from pathlib import Path
import datetime as dt
import hashlib
import json
import os
import re
import subprocess
import tempfile
import unicodedata

BASE=Path('/root/workspace/assps-grade910-metadata-source-claim-20261016/docs/question-bank')
STATE=Path('/var/lib/assps-grade910-sourceclaims')
OUT=STATE/'live-numerical-evidence.json'
FILES={
 'legacy91':BASE/'ASSPS_GRADE910_ALL_NUMERICAL_QA_CERTIFICATE_CANDIDATE_20261008.json',
 'deeper61':BASE/'ASSPS_GRADE910_61_NUMERICAL_INDEPENDENT_RECOMPUTATION_20261014.json',
 'frozen2581':BASE/'ASSPS_GRADE910_2581_PUBLIC_SAFE_REVIEW_CROSSWALK_20261015.json',
 'liveRevisions':STATE/'live-question-revisions.json',
}
SQL="""BEGIN TRANSACTION READ ONLY;
SELECT json_agg(json_build_object('id',metadata->>'seed_id','stem',question_text,
'answer',answer,'grade',class_level,'subject',subject))
FROM question_bank WHERE school_id=1 AND class_level IN ('9th','10th')
AND question_type='numerical';
COMMIT;"""
def n(v):
    return re.sub(r'\s+',' ',unicodedata.normalize('NFKC',str(v or '')).strip())
def index(items,key):
    d={}
    for a in items:
        q=a.get(key)
        if not isinstance(q,str) or not q or q in d:
            raise ValueError('BAD_OR_DUPLICATE_NUMERICAL_ID')
        d[q]=a
    return d
def verify(live,old91,deep61,original,revision):
    a=index(old91,'questionId')
    b=index(deep61,'originalId')
    c=index(original,'questionId')
    d=index(revision['records'],'questionId')
    e=index(live,'id')
    if len(e)!=80 or len(a)!=91 or len(b)!=61 or len(c)!=2581 or len(d)!=2411:
        raise ValueError('NUMERICAL_OR_ORIGINAL_SOURCE_COVERAGE_DRIFT')
    if not set(e)<=set(a)&set(c)&set(d):
        raise ValueError('LIVE_NUMERICAL_MISSING_FROZEN_MACHINE_REFERENCE')
    if not set(b)<=set(c):
        raise ValueError('DEEP_RECOMPUTATION_ID_NOT_IN_FROZEN_ORIGINALS')
    for q,x in b.items():
        if (x.get('originalRevisionSha256')!=c[q]['originalRevisionSha256']
            or x.get('independentComputationAgreesWithSourceReference') is not True
            or x.get('qualifiedTeacherReviewed') is not False
            or x.get('academicallyApproved') is not False
            or x.get('published') is not False):
            raise ValueError('UNTRUSTED_OR_UNREVIEWED_DEEP_ARITHMETIC_REFERENCE')
    details=[]
    for q,r in sorted(e.items()):
        old=a[q]
        if (old.get('passed') is not True or
            old.get('mathematicalRecomputationPass') is not True or
            old.get('storedAnswerPass') is not True):
            raise ValueError('FAILED_LEGACY_NUMERICAL_EVIDENCE')
        olddeep=b.get(q)
        exact=bool(olddeep and n(r['stem'])==n(olddeep['originalStem'])
                   and n(r['answer'])==n(olddeep['originalReferenceAnswer']))
        if exact:
            category='LIVE_STEM_ANSWER_MATCH_DEEP_RECOMPUTED_ORIGINAL'
        elif olddeep:
            category='LIVE_CONTENT_CHANGED_DEEP_RECOMPUTATION_INVALIDATED'
        else:
            category='LEGACY_MACHINE_QA_ONLY_LIVE_REVISION_NEEDS_DEEP_RECOMPUTATION'
        details.append({'questionId':q,'grade':r['grade'],'subject':r['subject'],
            'currentLiveRevisionSha256':d[q]['revisionSha256'],
            'sourceFrozenOriginalRevisionSha256':c[q]['originalRevisionSha256'],
            'category':category,'qualifiedReviewerApproved':False,
            'exactBookExercisePageVerified':False,
            'paperStudioVerifiedSelectable':False})
    from collections import Counter
    totals=Counter(x['category'] for x in details)
    if totals['LIVE_STEM_ANSWER_MATCH_DEEP_RECOMPUTED_ORIGINAL']!=59:
        raise ValueError('DEEP_RECOMPUTATION_EXACT_LIVE_CONTENT_COVERAGE_CHANGED')
    return {'schema':'ASSPS_GRADE910_LIVE_NUMERICAL_REVISION_EVIDENCE_V1',
      'observedUTC':dt.datetime.now(dt.timezone.utc).isoformat(),
      'liveNumericals':len(e),'olderOriginalNumericalQARecords':len(a),
      'deeplyRecomputedOriginalRecords':len(b),
      'deeplyRecomputedOriginalsInLive':len(set(b)&set(e)),
      'liveNumericStemAndAnswerIdenticalToDeepOriginal':totals['LIVE_STEM_ANSWER_MATCH_DEEP_RECOMPUTED_ORIGINAL'],
      'liveNumericalCurrentRevisionMissingDeepComputation':
         totals['LEGACY_MACHINE_QA_ONLY_LIVE_REVISION_NEEDS_DEEP_RECOMPUTATION']+
         totals['LIVE_CONTENT_CHANGED_DEEP_RECOMPUTATION_INVALIDATED'],
      'numericalMachineQAResultsBoundToLiveAcademicFacultyApproval':0,
      'actualTextbookExercisePagesVerified':0,
      'teacherReviewedNumericalRevisions':0,'academicApprovals':0,
      'productionDatabaseWrites':0,'rawQuestionsOrAnswersStored':False,
      'byEvidenceType':dict(sorted(totals.items())),'records':details}
def sql():
    p=subprocess.run(['runuser','-u','postgres','--','psql','-X','-At',
      '-v','ON_ERROR_STOP=1','-d','apexos','-c',SQL],
      capture_output=True,text=True,timeout=40)
    if p.returncode:raise RuntimeError('READ_ONLY_NUMERICAL_SQL_FAILED')
    xs=[s for s in p.stdout.splitlines() if s.startswith('[')]
    if len(xs)!=1:raise ValueError('NUMERICAL_SQL_JSON_MISSING')
    return json.loads(xs[0])
def save(path,data):
    path.parent.mkdir(parents=True,exist_ok=True,mode=0o700)
    if path.parent.stat().st_mode&0o077:raise RuntimeError('NUMERICAL_RECEIPT_NOT_PRIVATE')
    fd,tmp=tempfile.mkstemp(prefix='.numerical-',dir=path.parent)
    try:
        os.fchmod(fd,0o600)
        with os.fdopen(fd,'w') as f:
            json.dump(data,f,sort_keys=True,indent=2,ensure_ascii=False)
            f.write('\n');f.flush();os.fsync(f.fileno())
        os.replace(tmp,path)
    finally:
        if os.path.exists(tmp):os.unlink(tmp)
if __name__=='__main__':
    sources={k:json.loads(p.read_text()) for k,p in FILES.items()}
    result=verify(sql(),sources['legacy91']['records'],
      sources['deeper61']['rows'],sources['frozen2581']['rows'],
      sources['liveRevisions'])
    save(OUT,result)
    print(json.dumps({k:v for k,v in result.items() if k!='records'},sort_keys=True))
