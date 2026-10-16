#!/usr/bin/env python3
"""School-1 IX/X read-only live duplicate/template risk screening.

Reuse existing original-document cross-file QA without equating numerical,
scientific charges, chapter context, or Urdu/English translation.
"""
import collections
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import unicodedata

OUT=Path('/var/lib/assps-grade910-sourceclaims/live-stem-collisions.json')
SQL="""BEGIN TRANSACTION READ ONLY;
SELECT json_agg(json_build_object('id',metadata->>'seed_id',
 'grade',class_level,'subject',subject,'chapter',chapter_no,
 'type',question_type,'medium',medium,'stem',question_text,'answer',answer,
 'approved',is_approved))
FROM question_bank WHERE school_id=1 AND class_level IN ('9th','10th');
COMMIT;"""
CONTRAST=(frozenset(('positive','negative','zero')),
          frozenset(('true','false')),frozenset(('increase','decrease')),
          frozenset(('greater','less')),frozenset(('correct','incorrect')),
          frozenset(('before','after')))
SPECIAL=re.compile(r'(?<!\w)(?:\d+(?:\.\d+)?|\+|-|=|×|÷|/|\^)(?!\w)')
TOKEN=re.compile(r'[\w]+|[+\-=×÷/^]',re.U)

def normalized(t):
    s=unicodedata.normalize('NFKC',str(t or '')).casefold()
    return ' '.join(TOKEN.findall(s.replace('−','-').replace('–','-')))

def tokens(t):
    return set(normalized(t).split())

def changes_meaning(a,b):
    ta,tb=tokens(a),tokens(b)
    na={x for x in ta if any(c.isdigit() for c in x)}
    nb={x for x in tb if any(c.isdigit() for c in x)}
    if na!=nb:return True
    ops={'+' ,'-','=','×','÷','/','^'}
    if (ta&ops)!=(tb&ops):return True
    return any((ta&g) and (tb&g) and (ta&g)!=(tb&g) for g in CONTRAST)

def jaccard(a,b):
    a,b=tokens(a),tokens(b)
    if min(len(a),len(b))<7:return 0.
    return len(a&b)/len(a|b)

def read_live():
    p=subprocess.run(['runuser','-u','postgres','--','psql','-X','-At','-v','ON_ERROR_STOP=1',
                      '-d','apexos','-c',SQL],capture_output=True,text=True,timeout=45)
    if p.returncode:raise RuntimeError('READ_ONLY_LIVE_DUPLICATE_QUERY_FAILED')
    lines=[x for x in p.stdout.splitlines() if x.startswith('[')]
    if len(lines)!=1:raise RuntimeError('LIVE_QBANK_JSON_UNEXPECTED')
    return json.loads(lines[0])

def audit(rows):
    if len(rows)!=2411:raise ValueError('LIVE_BANK_BASELINE_CHANGED_REBASELINE_WITH_SOURCE')
    keys=[r.get('id') for r in rows]
    if any(not k for k in keys) or len(set(keys))!=len(keys):
        raise ValueError('DUPLICATE_OR_NULL_QUESTION_SOURCE_IDS')
    buckets=collections.defaultdict(list)
    for r in rows:
        if not isinstance(r.get('stem'),str) or not r['stem'].strip():
            raise ValueError('EMPTY_QUESTION_STEM')
        bucket=(str(r['grade']),str(r['subject']).casefold().strip(),
                str(r['chapter']),str(r['type']).casefold().strip(),
                str(r['medium']).casefold().strip())
        buckets[bucket].append(r)
    duplicate=[]
    exact_conflict=[]
    near=[]
    protected_contrast=0
    for bucket,items in sorted(buckets.items()):
        groups=collections.defaultdict(list)
        for r in items:groups[normalized(r['stem'])].append(r)
        for norm, same in groups.items():
            if len(same)<2:continue
            ids=sorted(r['id'] for r in same)
            duplicate.append({'ids':ids,'sameGradeSubjectChapterTypeMedium':True,
                              'confirmedEditorialDuplicate':False,
                              'automaticallyPublished':False})
            answers={normalized(r.get('answer')) for r in same}
            if len(answers)>1:exact_conflict.append(ids)
        # Compare only within equivalent subject+chapter+type+medium.
        for i in range(len(items)):
            ai=items[i]
            for bi in items[i+1:]:
                if normalized(ai['stem'])==normalized(bi['stem']):continue
                score=jaccard(ai['stem'],bi['stem'])
                if score<0.78:continue
                if changes_meaning(ai['stem'],bi['stem']):
                    protected_contrast+=1
                    continue
                near.append({'ids':sorted((ai['id'],bi['id'])),
                             'tokenJaccard':round(score,5),
                             'confirmedEditorialDuplicate':False,
                             'independentReviewerApproved':False})
    near.sort(key=lambda x:(-x['tokenJaccard'],x['ids']))
    answer_letter=collections.defaultdict(collections.Counter)
    for r in rows:
        if r.get('type')=='mcq':
            # Only structure/count is measured. Never rearrange answer keys.
            answer_letter[(r['grade'],r['subject'])][r.get('correct','unknown')]+=1
    return {
        'schema':'ASSPS_IX_X_LIVE_SAME_CONTEXT_SIMILARITY_V1',
        'observedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'schoolId':1,'grade9And10Candidates':len(rows),
        'comparedGradeSubjectChapterTypeMediumBuckets':len(buckets),
        'exactStemCollisionGroups':len(duplicate),
        'exactStemDifferentAnswerGroups':len(exact_conflict),
        'possibleNearStemReviewPairs':len(near),
        'meaningfulNumericOrQualifierContrastPairsExcluded':protected_contrast,
        'sourceOriginalSimilarityResultsNotReplaced':True,
        'approvedQuestions':sum(bool(r['approved']) for r in rows),
        'academicallyConfirmedDuplicates':0,
        'questionTextOrAnswersPersisted':False,
        'sourceDatabaseWrites':0,'questionsDeleted':0,'questionsPublished':0,
        'exactCollisionGroupsIdOnly':duplicate,
        'differentAnswerSameStemIdOnly':exact_conflict,
        'nearStemIdsAndScoresOnly':near
    }

def save(dst,result):
    dst.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
    if dst.parent.stat().st_mode&0o077:raise RuntimeError('PRIVATE_DUPLICATE_EVIDENCE_DIR_REQUIRED')
    fd,tmp=tempfile.mkstemp(dir=dst.parent,prefix='.stem-')
    try:
        os.fchmod(fd,0o600)
        with os.fdopen(fd,'w') as f:
            json.dump(result,f,sort_keys=True,indent=2);f.write('\n');f.flush();os.fsync(f.fileno())
        os.replace(tmp,dst)
    finally:
        if os.path.exists(tmp):os.unlink(tmp)

if __name__=='__main__':
    x=audit(read_live())
    save(OUT,x)
    print(json.dumps({k:v for k,v in x.items() if not k.endswith('IdOnly') and k!='nearStemIdsAndScoresOnly'},sort_keys=True))
    if x['exactStemCollisionGroups'] or x['exactStemDifferentAnswerGroups'] or x['approvedQuestions']:
        raise SystemExit('LIVE_QBANK_DUPLICATE_OR_UNTRUSTED_APPROVAL_HOLD')
