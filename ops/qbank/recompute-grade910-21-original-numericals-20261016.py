#!/usr/bin/env python3
"""Exact-source numerical recalculation. Mechanical research only; never publication approval."""
from __future__ import annotations
import argparse
from collections import Counter
from decimal import Decimal
from fractions import Fraction
import importlib.util
import json
import math
import os
from pathlib import Path
import re
import subprocess
import tempfile
import unicodedata

ROOT = Path(__file__).resolve().parents[2]
STAGING = ROOT / 'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging'
DOCS = ROOT / 'docs/question-bank'
STATE = Path('/var/lib/assps-grade910-sourceclaims')
FILES = {
 'chemistry9Chapter2EnglishDrafts2026.json':'fc2e02d9ff19d2b791a734d8027d2f3c2d50727b',
 'chemistry9Chapter4EnglishDrafts2026.json':'e66e108bdc4ebcc9d3fcb1432ce7510c3fd70208',
 'mathematics10Starter2026.json':'ac587843e2f53d6e52a2cd41ff436f7f43ccebbf',
 'mathematics9Starter2026.json':'42677491bfc69d2a78bb1aa9b67c77c31007c660',
 'mathematics9UrduStarter2026.json':'9940d73c16715aeeef5fe86fd68873c9ff724684',
 'physics10Starter2026.json':'99e2bd0898682930002df1738b0f1d06e5b35196',
 'physics9EnglishStarter2026.json':'20a8b89db4da901ed95c9a352536611b24a9d596',
 'physicsTech10EnglishStarter2026.json':'a8e77ebda5e45e2036479c874aef003065ba9ce8'
}
# Inputs manually transcribed from immutable original questions, NOT from their answers.
# Keep this explicit mapping: inference from answer strings would be circular QA.
SPECS = {
 'X-MATH-C07-N01':('tan',[3,4,20]),
 'X-PHY-C13-N01':('echo',['0.40',340]),
 'X-PHY-C14-N01':('index',['3.0e8','2.0e8']),
 'X-PHY-C18-N01':('transform',[240,100,500]),
 'X-PHY-C20-N01':('half',[800,3]),
 'X-PHY-TECH-C13-X01':('echo',['0.50',340]),
 'X-PHY-TECH-C19-X01':('half',[800,3]),
 'IX-CHEM-2025-C02-T22-N11':('atom',[17,37]),
 'IX-CHEM-2025-C02-T24-N23':('isotope',[20,60,22,40]),
 'IX-CHEM-2025-C04-T01-N03':('formulaAtoms',[2,3,4]),
 'IX-CHEM-2025-C04-T02-N06':('empirical',[4,10]),
 'IX-CHEM-2025-C04-T06-N17':('molecules',['0.50','6.02e23']),
 'IX-CHEM-2025-C04-T07-N20':('moles',['22.0','44.0']),
 'IX-CHEM-2025-C04-T09-N26':('stoich',['4.0','2.0','18.0',2,2]),
 'IX-MATH-C05-N01':('simul',[9,3]),
 'IX-MATH-C09-N01':('similar',[4,10,6]),
 'IX-MATH-C13-N01':('die',[3,6]),
 'IX-MATH-UR-C05-N01':('simul',[10,2]),
 'IX-MATH-UR-C13-N01':('die',[3,6]),
 'IX-PHY-2025-C02-N01':('velocity',[5,2,4]),
 'IX-PHY-2025-C04-N01':('moment',[20,'0.30']),
}
def normalize(s):
 return re.sub(r'\s+',' ',unicodedata.normalize('NFKC',str(s)).strip())
def calculation(kind,a):
 d=lambda x:Decimal(str(x))
 if kind=='tan': return d(a[0])*d(a[2])/d(a[1])
 if kind=='echo': return d(a[0])*d(a[1])/2
 if kind=='index': return d(a[0])/d(a[1])
 if kind=='transform': return d(a[0])*d(a[1])/d(a[2])
 if kind=='half': return d(a[0])*(d('0.5')**a[1])
 if kind=='atom': return a[0],a[1]-a[0],a[0]
 if kind=='isotope': return (d(a[0])*d(a[1])+d(a[2])*d(a[3]))/100
 if kind=='formulaAtoms':return a[0]+a[1]+a[2]*a[1]
 if kind=='empirical':
  g=math.gcd(*a);return f'C{a[0]//g}H{a[1]//g}'
 if kind=='molecules':return d(a[0])*d(a[1])
 if kind=='moles':return d(a[0])/d(a[1])
 if kind=='stoich':return (d(a[0])/d(a[1]))*d(a[4])/d(a[3])*d(a[2])
 if kind=='simul':return ((d(a[0])+d(a[1]))/2,(d(a[0])-d(a[1]))/2)
 if kind=='similar':return d(a[1])*d(a[2])/d(a[0])
 if kind=='die':return Fraction(a[0],a[1])
 if kind=='velocity':return d(a[0])+d(a[1])*d(a[2])
 if kind=='moment':return d(a[0])*d(a[1])
 raise ValueError('UNKNOWN_OPERATION')
def answer_value(kind,s):
 s=normalize(s)
 if kind=='atom':
  p=re.search(r'protons\s*=\s*(\d+)',s,re.I)
  n=re.search(r'neutrons[^;]*=\s*(\d+)\s*;',s,re.I)
  e=re.search(r'electrons\s*=\s*(\d+)',s,re.I)
  if not all([p,n,e]):raise ValueError('ATOM_ANSWER_NOT_PARSEABLE')
  return tuple(int(z.group(1)) for z in [p,n,e])
 if kind=='empirical':
  m=re.findall(r'C\d+H\d+',s)
  if not m:raise ValueError('FORMULA_ANSWER_NOT_PARSEABLE')
  return m[-1]
 if kind=='simul':
  x=re.findall(r'\bx\s*=\s*(-?\d+(?:\.\d+)?)',s,re.I)
  y=re.findall(r'\by\s*=\s*(-?\d+(?:\.\d+)?)',s,re.I)
  if not x or not y:raise ValueError('SIMULTANEOUS_ANSWER_NOT_PARSEABLE')
  return Decimal(x[-1]),Decimal(y[-1])
 if kind=='die':
  m=re.findall(r'(\d+)\s*/\s*(\d+)',s)
  if not m:raise ValueError('PROBABILITY_ANSWER_NOT_PARSEABLE')
  return Fraction(*map(int,m[-1]))
 if kind=='molecules':
  m=re.findall(r'(\d+(?:\.\d+)?)\s*[×x]\s*10\s*\^\s*(\d+)',s)
  if not m:raise ValueError('SCIENTIFIC_ANSWER_NOT_PARSEABLE')
  return Decimal(m[-1][0])*(Decimal(10)**int(m[-1][1]))
 # All these expressions conclude with a final scalar before a unit or terminator.
 nums=re.findall(r'(?<![\w])[-+]?\d+(?:\.\d+)?',s)
 if not nums:raise ValueError('NUMERIC_ANSWER_NOT_PARSEABLE')
 return Decimal(nums[-1])
def verify_sources(queue, old, crosswalk, *, stage=STAGING):
 if len(queue)!=21 or set(SPECS)!={x['questionId'] for x in queue}:raise ValueError('21_ITEM_PRIORITY_QUEUE_DRIFT')
 oldmap={x['questionId']:x for x in old}
 rows=[]
 for name,sha in FILES.items():
  actual=subprocess.check_output(['git','hash-object',str(stage/name)],text=True).strip()
  if actual!=sha:raise ValueError('FROZEN_SOURCE_FILE_CHANGED:'+name)
 for item in queue:
  id=item['questionId'];reference=oldmap[id]
  if not reference['passed'] or not reference['mathematicalRecomputationPass'] or not reference['storedAnswerPass']:
   raise ValueError('OLD_NUMERIC_QA_FAILED:'+id)
  filename=reference['sourceFile']
  if filename not in FILES:raise ValueError('UNKNOWN_ORIGINAL_SOURCE_FILE')
  drafts=json.loads((stage/filename).read_text(encoding='utf-8'))['drafts']
  arr=[v for v in drafts if v['id']==id]
  if len(arr)!=1 or arr[0]['type']!='numerical':raise ValueError('MISSING_OR_DUPLICATE_SOURCE')
  obj=arr[0];contents=obj['content']
  if len(contents)!=1:raise ValueError('AMBIGUOUS_ORIGINAL_LANGUAGE')
  c=next(iter(contents.values()))
  if not c.get('stem') or not c.get('answer'):raise ValueError('BLANK_STEM_OR_ANSWER')
  kind,args=SPECS[id]
  expected=calculation(kind,args)
  actual=answer_value(kind,c['answer'])
  if expected!=actual:raise ValueError('INDEPENDENT_RECOMPUTATION_DISAGREEMENT:'+id)
  if item['evidenceGap']!='LEGACY_MACHINE_QA_ONLY_LIVE_REVISION_NEEDS_DEEP_RECOMPUTATION':
   raise ValueError('PRIORITY_CATEGORY_CHANGED')
  if len(item['currentRevisionSha256'])!=64 or len(item['frozenRevisionSha256'])!=64:
   raise ValueError('UNBOUND_REVISION')
  review=crosswalk[id]
  if review['actualLiveContentRevisionSha256']!=item['currentRevisionSha256']:
   raise ValueError('FROZEN_QUEUE_FACULTY_REVISION_DRIFT')
  rows.append({'questionId':id,'originalFileGitBlob':FILES[filename],
      'frozenRevisionSha256':item['frozenRevisionSha256'],
      'previousLiveRevisionSha256':item['currentRevisionSha256'],
      'independentArithmeticFromLockedSource':True,
      'liveExactStemAndAnswerMatch':None,
      'qualifiedFacultyApproved':False,'academicPublicationApproved':False})
 return rows
def live_match(rows, *, state=STATE):
 # One fresh SELECT under READ ONLY covers all 2,411 live questions, including
 # stem, bilingual variants, answer, marks, options and chapter/topic metadata.
 # No school content leaves memory or appears in public/private receipts.
 path=ROOT/'ops/qbank/audit-grade910-live-question-revisions-20261016.py'
 spec=importlib.util.spec_from_file_location('assps_current_revision_hasher',path)
 mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
 data=mod.read_live()
 if len(data)!=2411:raise ValueError('CURRENT_LIVE_BANK_SIZE_DRIFT')
 live={x['id']:x for x in data}
 if len(live)!=len(data):raise ValueError('CURRENT_LIVE_DUPLICATE_ID')
 oldmap={x['questionId']:x for x in json.loads((DOCS/'ASSPS_GRADE910_ALL_NUMERICAL_QA_CERTIFICATE_CANDIDATE_20261008.json').read_text())['records']}
 if sum(x.get('type')=='numerical' for x in data)!=80:raise ValueError('CURRENT_LIVE_NUMERIC_COUNT_DRIFT')
 for row in rows:
  id=row['questionId']
  if id not in live:raise ValueError('LIVE_QUESTION_MISSING:'+id)
  actual=live[id]
  filename=oldmap[id]['sourceFile']
  obj=next(x for x in json.loads((STAGING/filename).read_text())['drafts'] if x['id']==id)
  c=next(iter(obj['content'].values()))
  row['liveExactStemAndAnswerMatch']=(actual.get('type')=='numerical'
      and normalize(actual['questionText'])==normalize(c['stem'])
      and normalize(actual['answer'])==normalize(c['answer']))
  row['liveFullRevisionSha256MatchesPinned']=(mod.revision_sha(actual)==row['previousLiveRevisionSha256'])
 # Re-attest the older 59 deep-computed originals against the very same
 # read-only live snapshot. Two independently computed ORIGINAL-ONLY records
 # remain outside the 80 live records and must never be silently imported.
 deep=json.loads((DOCS/'ASSPS_GRADE910_61_NUMERICAL_INDEPENDENT_RECOMPUTATION_20261014.json').read_text())['rows']
 existing=json.loads((STATE/'live-question-revisions.json').read_text())
 if existing['revisions']!=2411:raise ValueError('PREVIOUS_REVISION_LEDGER_INCOMPLETE')
 sha_map={r['questionId']:r['revisionSha256'] for r in existing['records']}
 matched59=[r for r in deep if r['originalId'] in live]
 if len(matched59)!=59 or len(deep)!=61:raise ValueError('PREVIOUS_59_DEEP_REFERENCE_SCOPE_DRIFT')
 for r in matched59:
  q=live[r['originalId']]
  if (q['type']!='numerical'
      or normalize(q['questionText'])!=normalize(r['originalStem'])
      or normalize(q['answer'])!=normalize(r['originalReferenceAnswer'])
      or mod.revision_sha(q)!=sha_map.get(r['originalId'])
      or r.get('independentComputationAgreesWithSourceReference') is not True
      or r.get('qualifiedTeacherReviewed') is not False
      or r.get('academicallyApproved') is not False):
   raise ValueError('EXISTING_59_LIVE_REVISION_OR_ARITHMETIC_DRIFT')
 if set(x['originalId'] for x in matched59)&set(x['questionId'] for x in rows):
  raise ValueError('NUMERICAL_PROOF_DOUBLE_COUNTED')
 return len(matched59)
def private_atomic_write(path,data):
 path.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
 if (path.parent.stat().st_mode&0o077):raise ValueError('RECEIPT_DIRECTORY_NOT_PRIVATE')
 fd,tmp=tempfile.mkstemp(dir=path.parent,prefix='.recomputed-')
 try:
  os.fchmod(fd,0o600)
  with os.fdopen(fd,'w',encoding='utf-8') as f:
   json.dump(data,f,sort_keys=True,ensure_ascii=False,indent=2)
   f.write('\n');f.flush();os.fsync(f.fileno())
  os.replace(tmp,path)
 finally:
  if os.path.exists(tmp):os.unlink(tmp)
def run(*, check_live=False, write=False):
 priority=json.loads((STATE/'numerical-review-priority.json').read_text())
 old=json.loads((DOCS/'ASSPS_GRADE910_ALL_NUMERICAL_QA_CERTIFICATE_CANDIDATE_20261008.json').read_text())['records']
 faculty=json.loads((STATE/'faculty-source-evidence-delta.json').read_text())['records']
 crosswalk={x['questionId']:x for x in faculty}
 rows=verify_sources(priority['records'],old,crosswalk)
 prior59=live_match(rows) if check_live else None
 matches=sum(r['liveExactStemAndAnswerMatch'] is True and r.get('liveFullRevisionSha256MatchesPinned') is True for r in rows)
 mismatches=sum(r['liveExactStemAndAnswerMatch'] is False or r.get('liveFullRevisionSha256MatchesPinned') is False for r in rows)
 if mismatches:raise ValueError('CURRENT_LIVE_NUMERICAL_STEM_ANSWER_DRIFT')
 result={
  'schema':'ASSPS_GRADE910_21_NUMERICAL_DEEP_RECOMPUTATION_SOURCE_V1',
  'sourceOriginalsIndependentlyRecomputed':len(rows),
  'currentLiveStemsAndAnswersMatched':matches if check_live else None,
  'checkedAgainstLiveReadOnly':check_live,'currentLiveFullRevisionSha256Verified':check_live and mismatches==0,
  'liveTextComparisonFailures':mismatches if check_live else None,
  'existing59DeepVerifiedOriginalsExcludedFromThese21':59,
  'prior59FullLiveRevisionAndStemReauthenticated':prior59,
  'combined80NumericalReadOnlyProof':check_live and prior59==59 and matches==21 and mismatches==0,
  'qualifiedFacultyApprovalsCreated':0,'schoolAdoptedTextbookEditionCertified':False,
  'productionDatabaseWrites':0,'paperStudioPublicationEnabled':False,
  'sourceQuestionTextOrAnswersStoredInReport':False,
  'records':rows
 }
 if write:private_atomic_write(STATE/'numerical-deep-recomputation-21.json',result)
 return result
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--live-readonly',action='store_true');p.add_argument('--write-private-receipt',action='store_true')
 a=p.parse_args();r=run(check_live=a.live_readonly,write=a.write_private_receipt)
 print(json.dumps({k:v for k,v in r.items() if k!='records'},sort_keys=True))
