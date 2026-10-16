#!/usr/bin/env python3
"""School1 Grade IX/X live MCQ choice uniqueness and numeric equivalence safety audit.

Read-only mechanical test. Never claims that a distractor or answer is academically correct.
"""
from __future__ import annotations
from collections import Counter
from decimal import Decimal, InvalidOperation
from fractions import Fraction
import importlib.util
import json
import os
from pathlib import Path
import re
import tempfile
import unicodedata

ROOT=Path(__file__).resolve().parents[2]
STATE=Path('/var/lib/assps-grade910-sourceclaims')
OUT=STATE/'live-mcq-choice-equivalence.json'
REV='ASSPS_IX_X_LIVE_CONTENT_REVISION_HASH_LEDGER_V1'
SCHEMA='ASSPS_GRADE910_LIVE_MCQ_CHOICE_EQUIVALENCE_V1'
TRAIL='.!?;:،۔؛'
def normalize(text):
 if not isinstance(text,str):return ''
 return re.sub(r'\s+',' ',unicodedata.normalize('NFKC',text).casefold().strip()).rstrip(TRAIL+' ')
def pure_number(text):
 v=normalize(text).replace('−','-')
 if re.fullmatch(r'[+-]?\d+(?:\.\d+)?\s*%',v):
  return Fraction(Decimal(v[:-1].strip()))/100
 if re.fullmatch(r'[+-]?\d+(?:\.\d+)?',v):
  return Fraction(Decimal(v))
 if re.fullmatch(r'[+-]?\d+\s*/\s*\d+',v):
  a,b=map(int,v.replace(' ','').split('/'))
  return Fraction(a,b) if b else None
 return None
def analyze(rows, pinned):
 if (not isinstance(rows,list) or len(rows)!=2411
     or pinned.get('schema')!=REV or pinned.get('revisions')!=2411):
  raise ValueError('LIVE_MCQ_SOURCE_OR_REVISION_LEDGER_DRIFT')
 spec=importlib.util.spec_from_file_location(
  'assps_current_live_revision',ROOT/'ops/qbank/audit-grade910-live-question-revisions-20261016.py')
 mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
 prior={r['questionId']:r['revisionSha256'] for r in pinned['records']}
 if len(prior)!=2411:raise ValueError('UNIQUE_REVISION_LEDGER_REQUIRED')
 seen=set()
 collisions=[]
 mcq_count=0
 numeric_comparable=0
 options_checked=0
 for row in rows:
  id=row.get('id')
  if not id or id in seen:raise ValueError('DUPLICATE_OR_NULL_STABLE_ID')
  seen.add(id)
  if mod.revision_sha(row)!=prior.get(id):
   raise ValueError('LIVE_MCQ_CURRENT_CONTENT_SHA_DRIFT')
  if row['type']!='mcq':continue
  mcq_count+=1
  opts=row.get('options')
  if not isinstance(opts,list) or len(opts)!=4:raise ValueError('MCQ_HAS_NOT_EXACTLY_FOUR_OPTIONS')
  ids=[x.get('id') for x in opts if isinstance(x,dict)]
  if len(ids)!=4 or set(ids)!={'A','B','C','D'}:raise ValueError('INVALID_OPTION_IDS')
  texts=[normalize(x.get('text')) for x in opts]
  if any(not t for t in texts):raise ValueError('EMPTY_MCQ_OPTION')
  options_checked+=len(texts)
  if len(set(texts))!=4:collisions.append({'id':id,'reason':'EQUIVALENT_NORMALIZED_OPTIONS','currentRevisionSha256':prior[id]})
  nums=[pure_number(x.get('text')) for x in opts]
  numbers=[v for v in nums if v is not None]
  if len(numbers)>=2:
   numeric_comparable+=1
   if len(numbers)!=len(set(numbers)):
    collisions.append({'id':id,'reason':'EQUIVALENT_PURE_NUMERIC_OPTIONS','currentRevisionSha256':prior[id]})
 if len(seen)!=2411 or mcq_count!=809 or options_checked!=3236:
  raise ValueError('MCQ_809_CORPUS_SCOPE_CHANGED')
 return {'schema':SCHEMA,'candidateQuestionsSeen':len(seen),'mcqsChecked':mcq_count,
  'optionTextsChecked':options_checked,'numericComparableMCQs':numeric_comparable,
  'normalizedDuplicateOptionGroups':sum(c['reason']=='EQUIVALENT_NORMALIZED_OPTIONS' for c in collisions),
  'pureNumericEquivalentOptionGroups':sum(c['reason']=='EQUIVALENT_PURE_NUMERIC_OPTIONS' for c in collisions),
  'mechanicalChoiceConflicts':len(collisions),
  'publicationApprovedByThisAudit':False,'qualifiedAcademicReviewerApprovals':0,
  'databaseWrites':0,'rawStemsAnswersOrOptionsPersisted':False,'issues':collisions}
def save_private(path,data):
 path.parent.mkdir(parents=True,exist_ok=True,mode=0o700)
 if path.parent.stat().st_mode & 0o077:raise ValueError('MCQ_RECEIPT_DIR_MUST_BE_PRIVATE')
 fd,tmp=tempfile.mkstemp(dir=path.parent,prefix='.mcqchoice-')
 try:
  os.fchmod(fd,0o600)
  with os.fdopen(fd,'w',encoding='utf8') as f:
   json.dump(data,f,sort_keys=True,ensure_ascii=False,indent=2);f.write('\n');f.flush();os.fsync(f.fileno())
  os.replace(tmp,path)
 finally:
  if os.path.exists(tmp):os.unlink(tmp)
def run_live():
 spec=importlib.util.spec_from_file_location(
  'assps_full_live_revision',ROOT/'ops/qbank/audit-grade910-live-question-revisions-20261016.py')
 mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
 pinned=json.loads((STATE/'live-question-revisions.json').read_text())
 return analyze(mod.read_live(),pinned)
if __name__=='__main__':
 result=run_live()
 save_private(OUT,result)
 print(json.dumps({k:v for k,v in result.items() if k!='issues'},sort_keys=True))
 if result['mechanicalChoiceConflicts']:raise SystemExit('LIVE_MCQ_CHOICE_AMBIGUITY_HOLD')
