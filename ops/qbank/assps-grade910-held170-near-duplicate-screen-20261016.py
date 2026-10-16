#!/usr/bin/env python3
"""Advisory near-stem screen of 170 ORIGINAL-ONLY questions vs 2411 LIVE.

Text stays on VPS and is NOT copied to GitHub. Grade/subject must match.
Numbers remain significant. No AI/human academic approvals from similarities.
"""
import argparse, collections, datetime, hashlib, json, math, os, pathlib, re, subprocess, tempfile, unicodedata
BASE=pathlib.Path(__file__).resolve().parents[2]
CROSS=BASE/'docs/question-bank/ASSPS_GRADE910_2581_PUBLIC_SAFE_REVIEW_CROSSWALK_20261015.json'
SEED=BASE/'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging'
HELD=pathlib.Path('/var/lib/assps-grade910-sourceclaims/held170.json')
OUTPUT=pathlib.Path('/var/lib/assps-grade910-sourceclaims/held170-near-duplicate.json')
SQL="""BEGIN TRANSACTION READ ONLY;
SELECT json_agg(json_build_object('id',metadata->>'seed_id','grade',class_level,
 'subject',subject,'medium',medium,'stem',question_text))
FROM question_bank WHERE school_id=1 AND class_level IN ('9th','10th');
COMMIT;"""
def get_live():
 p=subprocess.run(['runuser','-u','postgres','--','psql','-X','-At','-v','ON_ERROR_STOP=1','-d','apexos','-c',SQL],
                  capture_output=True,text=True,timeout=50)
 if p.returncode:raise RuntimeError('READONLY_LIVE_STEM_SQL_FAILED')
 d=[json.loads(x) for x in p.stdout.splitlines() if x.startswith('[')]
 if len(d)!=1 or len(d[0])!=2411:raise RuntimeError('LIVE_CORPUS_DRIFT')
 return d[0]
def normal(s):
 s=unicodedata.normalize('NFKC',str(s or '')).casefold()
 return re.sub(r'\s+',' ',re.sub(r'[^\w\s]',' ',s,flags=re.UNICODE)).strip()
def features(text):
 x=normal(text)
 toks=x.split()
 if not toks:return set(),set(),{}
 # retain digits and scientific symbols as tokens (no paraphrase generation)
 token_set=set(toks)
 tri={x[i:i+3] for i in range(max(0,len(x)-2)) if x[i:i+3].strip()}
 counts=collections.Counter(toks)
 return token_set,tri,counts
def dice(a,b):
 return 0 if not a or not b else 2*len(a&b)/(len(a)+len(b))
def weighted_f1(a,b):
 if not a or not b:return 0
 overlap=sum(min(a[k],b[k]) for k in a.keys()&b.keys())
 return 2*overlap/(sum(a.values())+sum(b.values()))
CONTRAST_SETS=({'positive','negative','zero'}, {'greater','less'}, {'increase','decrease'}, {'before','after'})
def qualifier_contrast(a,b):
 left=set(normal(a).split());right=set(normal(b).split())
 return any(left&group and right&group and (left&group)!=(right&group) for group in CONTRAST_SETS)
def similarity(stem_a,stem_b):
 aa,ac,at=features(stem_a);ba,bc,bt=features(stem_b)
 # Numeric changes must never be hidden by generic stem similarity.
 nums_a=set(re.findall(r'\b\d+(?:\.\d+)?\b',normal(stem_a)))
 nums_b=set(re.findall(r'\b\d+(?:\.\d+)?\b',normal(stem_b)))
 if nums_a!=nums_b and (nums_a or nums_b):numerical_drift=True
 else:numerical_drift=False
 token=weighted_f1(at,bt);chars=dice(ac,bc)
 confidence=0.6*token+0.4*chars
 return round(confidence,5),numerical_drift,qualifier_contrast(stem_a,stem_b)
def parse_original(n,ids):
 d=json.loads((SEED/n).read_text())
 entries=d.get('drafts',d.get('items',[]))
 items=[]
 for q in entries:
  if q['id'] not in ids:continue
  c=q.get('content') or {}
  en=c.get('en',{}) if isinstance(c,dict) else {}
  stem=(q.get('stem') or (en.get('stem') if isinstance(en,dict) else None) or '')
  if not isinstance(stem,str) or len(stem.strip())<8:raise ValueError('ORIGINAL_STEM_MISSING_'+q['id'])
  items.append((q['id'],stem))
 return items
def screen(held_records,crosswalk,live):
 index={x['questionId']:x for x in crosswalk}
 if len(held_records)!=170 or len(live)!=2411:raise ValueError('COHORT_EXPECTED_COUNTS')
 held_ids={x['questionId'] for x in held_records}
 sources=sorted({index[i]['sourceFile'] for i in held_ids})
 text={}
 for file in sources:
  for qid,stem in parse_original(file,held_ids):
   if qid in text:raise RuntimeError('HELD_QUESTION_MULTIPLE_SOURCE_TEXTS')
   text[qid]=stem
 if len(text)!=170:raise RuntimeError('HELD_SOURCE_STEMS_NOT_170')
 grouped=collections.defaultdict(list)
 for q in live:
  subject=normal(q['subject'])
  grade={'9th':9,'10th':10}[q['grade']]
  grouped[(grade,subject)].append(q)
 results=[]
 for q in held_records:
  qid=q['questionId'];c=index[qid]
  grade=int(c['provisionalReviewGrade'])
  subject=normal(c['provisionalReviewSubject'])
  options=grouped.get((grade,subject),[])
  scored=[]
  for target in options:
   conf,numeric,contrast=similarity(text[qid],target['stem'])
   if conf>=0.60:
    scored.append((conf,numeric,contrast,target['id']))
  scored.sort(key=lambda v:(-v[0],v[3]))
  high=[x for x in scored if x[0]>=0.87 and not x[1] and not x[2]]
  potential=[x for x in scored if x[0]>=0.73 and not x[1] and not x[2]]
  results.append({'originalId':qid,'originalRevisionSha256':q['originalRevisionSha256'],
                  'grade':grade,'subject':subject,'liveComparableRows':len(options),
                  'highSimilarityCount':len(high),'potentialSimilarCount':len(potential),
                  'contrastingQualifierPairs':sum(x[2] for x in scored if x[0]>=0.73),
                  'nearestMatches':[{'liveSeedId':ident,'similarity':conf,
                                     'numericTokenDrift':num,'meaningChangingQualifierMismatch':contrast}
                                    for conf,num,contrast,ident in scored[:4]],
                  'confirmedDuplicate':False,'independentAcademicReviewerApproved':False,
                  'importBlockedUntilProvenSafe':True})
 return {
  'schema':'ASSPS_GRADE910_HELD170_LIVE_NEAR_STEM_SCREEN_V1',
  'observedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),
  'sourceOriginalOnly':170,'liveComparisonRows':len(live),
  'highSimilarityCandidateOriginals':sum(x['highSimilarityCount']>0 for x in results),
  'potentiallySimilarCandidateOriginals':sum(x['potentialSimilarCount']>0 for x in results),
  'contrastingQualifierOriginals':sum(x['contrastingQualifierPairs']>0 for x in results),
  'noSameGradeSubjectComparison':sum(x['liveComparableRows']==0 for x in results),
  'screenedWithSameGradeSubject':sum(x['liveComparableRows']>0 for x in results),
  'confirmedDuplicateCount':0,'productionWrites':0,'newApprovals':0,'automaticImports':0,
  'rows':results}
def save(path,result):
 path.parent.mkdir(parents=True,exist_ok=True,mode=0o700)
 if path.parent.stat().st_mode&0o077:raise RuntimeError('EVIDENCE_PERMISSIONS_TOO_OPEN')
 fd,tmp=tempfile.mkstemp(prefix='.held170-near-',dir=path.parent)
 try:
  os.fchmod(fd,0o600)
  with os.fdopen(fd,'w') as f:json.dump(result,f,sort_keys=True,indent=2);f.write('\n')
  os.replace(tmp,path)
 finally:
  if os.path.exists(tmp):os.unlink(tmp)
if __name__=='__main__':
 cli=argparse.ArgumentParser()
 cli.add_argument('--crosswalk',type=pathlib.Path,default=CROSS)
 cli.add_argument('--seed-dir',type=pathlib.Path,default=SEED)
 cli.add_argument('--held',type=pathlib.Path,default=HELD)
 cli.add_argument('--out',type=pathlib.Path,default=OUTPUT)
 opt=cli.parse_args()
 SEED=opt.seed_dir
 held=json.loads(opt.held.read_text())['originalResearchCandidateRecords']
 orig=json.loads(opt.crosswalk.read_text())['rows']
 result=screen(held,orig,get_live())
 save(opt.out,result)
 print(json.dumps({'decision':'NEAR_STEM_ADVISORY_ONLY_NO_AUTO_IMPORT',
                   'screened':result['sourceOriginalOnly'],
                   'highSimilarityCandidateOriginals':result['highSimilarityCandidateOriginals'],
                   'potentiallySimilarCandidateOriginals':result['potentiallySimilarCandidateOriginals'],
                   'noSameGradeSubjectComparison':result['noSameGradeSubjectComparison'],
                   'evidenceSHA256':hashlib.sha256(opt.out.read_bytes()).hexdigest()}))
