#!/usr/bin/env python3
"""Read-only Grade IX/X current-revision subjective model-answer depth risk triage.

Conservative flags are triage, not verdicts on truth, marks, or teacher review.
"""
from __future__ import annotations
import collections
import importlib.util
import json
import os
from pathlib import Path
import re
import tempfile
import unicodedata

ROOT = Path(__file__).resolve().parents[2]
STATE = Path('/var/lib/assps-grade910-sourceclaims')
OUT = STATE/'subjective-answer-depth-risk-20261016.json'
SCHEMA='ASSPS_GRADE910_SUBJECTIVE_ANSWER_DEPTH_TRIAGE_V1'
SUBJECTIVE={'short','long','essay','comprehension','application','letter','grammar'}
PRIORITY={'SHORT_2_MARK_AT_MOST_6_WORDS':'REVIEW',
          'LONG_4PLUS_MARK_AT_MOST_25_WORDS':'HIGH',
          'LONG_4PLUS_MARK_AT_MOST_40_WORDS':'REVIEW',
          'ESSAY_5PLUS_MARK_AT_MOST_25_WORDS':'HIGH',
          'COMPREHENSION_3PLUS_MARK_AT_MOST_12_WORDS':'REVIEW',
          'FORMAL_WRITING_5PLUS_MARK_AT_MOST_25_WORDS':'REVIEW'}
def words(value):
    if not isinstance(value,str):return []
    return re.findall(r'\S+',unicodedata.normalize('NFKC',value).strip())
def classify(row):
    t=row['type'];marks=int(row['marks']);n=len(words(row.get('answer')))
    if t=='long' and marks>=4 and n<=25:return 'LONG_4PLUS_MARK_AT_MOST_25_WORDS'
    if t=='long' and marks>=4 and n<=40:return 'LONG_4PLUS_MARK_AT_MOST_40_WORDS'
    if t=='essay' and marks>=5 and n<=25:return 'ESSAY_5PLUS_MARK_AT_MOST_25_WORDS'
    if t in ('application','letter') and marks>=5 and n<=25:return 'FORMAL_WRITING_5PLUS_MARK_AT_MOST_25_WORDS'
    if t=='comprehension' and marks>=3 and n<=12:return 'COMPREHENSION_3PLUS_MARK_AT_MOST_12_WORDS'
    if t=='short' and marks>=2 and n<=6:return 'SHORT_2_MARK_AT_MOST_6_WORDS'
    return None
def source():
    p=ROOT/'ops/qbank/audit-grade910-live-question-revisions-20261016.py'
    spec=importlib.util.spec_from_file_location('grade910_live_revision_existing',p)
    mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
    return mod
def assess(rows,pinned,sha):
    if (len(rows)!=2411 or pinned.get('schema')!='ASSPS_IX_X_LIVE_CONTENT_REVISION_HASH_LEDGER_V1'
        or pinned.get('revisions')!=2411):
        raise ValueError('SUBJECTIVE_CORPUS_REVISION_SCOPE_DRIFT')
    hashes={r['questionId']:r['revisionSha256'] for r in pinned['records']}
    if len(hashes)!=2411:raise ValueError('SUBJECTIVE_DUPLICATE_PINNED_REVISION')
    actual_types=collections.Counter()
    risk_types=collections.Counter()
    risk_by_subject=collections.Counter()
    seen=set()
    risks=[]
    for r in rows:
        id=r.get('id')
        if not isinstance(id,str) or not id or id in seen:raise ValueError('SUBJECTIVE_MISSING_OR_DUPLICATE_ID')
        seen.add(id)
        if sha(r)!=hashes.get(id):raise ValueError('SUBJECTIVE_LIVE_REVISION_HASH_DRIFT')
        t=r['type']
        actual_types[t]+=1
        if t not in SUBJECTIVE:continue
        flag=classify(r)
        if not flag:continue
        risk_types[flag]+=1
        risk_by_subject[(str(r['grade']),str(r['subject']),t)]+=1
        risks.append({'questionId':id,'currentLiveContentRevisionSha256':hashes[id],
                      'category':flag,'priority':PRIORITY[flag],
                      'grade':r['grade'],'subject':r['subject'],'type':t,
                      'medium':r['medium'],'marks':r['marks'],
                      'answerWordTokens':len(words(r['answer'])),
                      'qualifiedSubjectApproval':False,'paperStudioAcademicallySelectable':False})
    expected={'short':854,'long':545,'essay':25,'comprehension':21,
              'application':4,'letter':2,'grammar':71,'mcq':809,'numerical':80}
    if dict(actual_types)!=expected:raise ValueError('SUBJECTIVE_LIVE_TYPE_DISTRIBUTION_DRIFT')
    if any(int(r['marks'])<1 for r in rows):raise ValueError('INVALID_MARKS_PRESENT')
    risks.sort(key=lambda r:(0 if r['priority']=='HIGH' else 1,r['grade'],r['subject'],r['questionId']))
    return {
     'schema':SCHEMA,'currentLiveQuestionRevisionsChecked':len(rows),
     'types':dict(sorted(actual_types.items())),
     'subjectiveItemsChecked':sum(actual_types.get(t,0) for t in SUBJECTIVE),
     'longQuestionsTotal':actual_types['long'],
     'longAtMost25Words':risk_types['LONG_4PLUS_MARK_AT_MOST_25_WORDS'],
     'longAtMost40Words':risk_types['LONG_4PLUS_MARK_AT_MOST_25_WORDS']+risk_types['LONG_4PLUS_MARK_AT_MOST_40_WORDS'],
     'essayAtMost25Words':risk_types['ESSAY_5PLUS_MARK_AT_MOST_25_WORDS'],
     'subjectiveRiskReviewCandidates':len(risks),
     'highPriorityReviewCandidates':sum(r['priority']=='HIGH' for r in risks),
     'riskReasons':dict(sorted(risk_types.items())),
     'byGradeSubjectType':[{'grade':k[0],'subject':k[1],'type':k[2],'flagged':v}
             for k,v in sorted(risk_by_subject.items())],
     'readingLimitation':'Whitespace-delimited word tokens; Urdu, scientific notation, equations and diagrams need independent review.',
     'riskFlagsAreEditorialAdvisoryNotIncorrectAnswerProof':True,
     'qualifiedAcademicApprovalsCreated':0,'publishedVerifiedQuestionsCreated':0,
     'sourcePdfOrEditionAuthenticatedByThisAudit':False,
     'productionDatabaseWrites':0,'questionTextOrAnswerStoredInReceipt':False,
     'records':risks
    }
def save_private(path,data):
    path.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
    if path.parent.stat().st_mode&0o077:raise ValueError('SUBJECTIVE_RECEIPT_DIRECTORY_NOT_PRIVATE')
    fd,tmp=tempfile.mkstemp(dir=path.parent,prefix='.subjective-risk-')
    try:
        os.fchmod(fd,0o600)
        with os.fdopen(fd,'w',encoding='utf8') as f:
            json.dump(data,f,indent=2,sort_keys=True,ensure_ascii=False)
            f.write('\n');f.flush();os.fsync(f.fileno())
        os.replace(tmp,path)
    finally:
        if os.path.exists(tmp):os.unlink(tmp)
def run():
    mod=source()
    rows=mod.read_live()
    pinned=json.loads((STATE/'live-question-revisions.json').read_text())
    result=assess(rows,pinned,mod.revision_sha)
    save_private(OUT,result)
    return result
if __name__=='__main__':
    d=run()
    print(json.dumps({k:v for k,v in d.items() if k not in ('records','byGradeSubjectType')},sort_keys=True))
