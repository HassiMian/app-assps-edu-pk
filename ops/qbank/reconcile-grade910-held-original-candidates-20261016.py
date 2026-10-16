#!/usr/bin/env python3
"""Read-only question-ID crosswalk and existing private faculty form resolver.

NEVER writes school DB, never imports candidates or fabricates academic signoffs.
"""
import argparse, collections, datetime, hashlib, json, os, pathlib, subprocess, tempfile
BASE=pathlib.Path(__file__).resolve().parents[2]
CROSS=BASE/'docs/question-bank/ASSPS_GRADE910_2581_PUBLIC_SAFE_REVIEW_CROSSWALK_20261015.json'
PRIVATE=pathlib.Path('/root/secure-archive/assps-grade910-review-delivery-20261015')
INDEX=PRIVATE/'PRIVATE_HANDOFF_GROUP_CROSSWALK.json'
FORMDIR=PRIVATE/'faculty-intake/grade910-20261015-full'
OUT=pathlib.Path('/root/secure-archive/assps-grade910-live-source-evidence-20261016/held170.json')
def live_ids():
 sql="BEGIN TRANSACTION READ ONLY; SELECT json_agg(metadata->>'seed_id') FROM question_bank WHERE school_id=1 AND class_level IN ('9th','10th'); COMMIT;"
 p=subprocess.run(['runuser','-u','postgres','--','psql','-X','-At','-v','ON_ERROR_STOP=1','-d','apexos','-c',sql],
                  capture_output=True,text=True,timeout=45)
 if p.returncode:raise RuntimeError('READONLY_QBANK_ID_RETRIEVAL_FAILED')
 lines=[x for x in p.stdout.splitlines() if x.startswith('[')]
 if len(lines)!=1:raise RuntimeError('QUESTION_ID_AGGREGATION_FAILED')
 return json.loads(lines[0])
def reconcile(original,live,index,forms=FORMDIR):
 if len(original)!=2581:raise ValueError('SOURCE_UNIVERSE_NOT_2581')
 orig={q['questionId']:q for q in original}
 if len(orig)!=len(original):raise ValueError('DUPLICATED_ORIGINAL_RESEARCH_ID')
 if len(live)!=len(set(live)) or len(live)!=2411:raise ValueError('LIVE_RESEARCH_IDENTIFIER_DRIFT')
 non_original=sorted(set(live)-set(orig))
 if non_original:raise ValueError('UNRECOGNIZED_LIVE_SEED_ID')
 refs={q['id']:q for g in index['groups'] for q in g['refs']}
 if len(refs)!=2580:raise ValueError('PRIVATE_FACULTY_CROSSWALK_DRIFT')
 held=sorted(set(orig)-set(live))
 if len(held)!=170:raise ValueError('HELD_COHORT_COUNT_DRIFT')
 data=[]
 for ident in held:
  question=orig[ident]
  entry=refs.get(ident)
  if not entry:raise ValueError('UNROUTED_HELD_QUESTION_'+ident)
  if entry['originalRevisionSha256']!=question['originalRevisionSha256']:
   raise ValueError('HELD_REVISION_SHA_MISMATCH_'+ident)
  name=entry['facultyTemplate']
  path=forms/name
  if path.parent!=forms or path.is_symlink() or not path.is_file():
   raise ValueError('PRIVATE_UNSIGNED_TEACHER_FORM_MISSING_'+ident)
  data.append({'questionId':ident,'sourceFile':question['sourceFile'],
               'grade':question['originalGradeClaim'],'subject':question['originalSubjectClaim'],
               'medium':question['originalMediumClaim'],'questionType':question['questionType'],
               'originalRevisionSha256':question['originalRevisionSha256'],
               'existingUnsignedFacultyForm':str(path),
               'independentFacultyDecision':'NOT_RECEIVED',
               'schoolAdoption':'NOT_INDEPENDENTLY_ESTABLISHED',
               'approved':False,'paperStudioAcademicallyVerifiedSelectable':False,
               'liveImportAllowed':False})
 def count(k):return dict(sorted(collections.Counter('UNSPECIFIED_ORIGINAL' if x[k] is None else str(x[k]) for x in data).items()))
 return {'schema':'ASSPS_GRADE910_170_HELD_RESEARCH_CROSSWALK_V1',
         'observedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),
         'sourceResearchCount':len(original),'existingLiveCount':len(live),
         'sourceIdsNotInLive':len(held),'liveUnknownIds':0,
         'existingUnsignedFacultyFormsVerified':len(data),
         'newReviewSignatures':0,'newApprovedQuestions':0,
         'databaseWrites':0,'publishedQuestions':0,
         'missingBySourceFile':count('sourceFile'),
         'missingByGrade':count('grade'),'missingByType':count('questionType'),
         'originalResearchCandidateRecords':data}
def save(path,data):
 path.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
 if path.parent.stat().st_mode&0o077:raise RuntimeError('UNSAFE_EVIDENCE_FOLDER')
 fd,tmp=tempfile.mkstemp(dir=path.parent,prefix='.held170-')
 try:
  os.fchmod(fd,0o600)
  with os.fdopen(fd,'w') as f:json.dump(data,f,indent=2,sort_keys=True);f.write('\n')
  os.replace(tmp,path)
 finally:
  if os.path.exists(tmp):os.unlink(tmp)
if __name__=='__main__':
 ap=argparse.ArgumentParser()
 ap.add_argument('--crosswalk',type=pathlib.Path,default=CROSS)
 ap.add_argument('--out',type=pathlib.Path,default=OUT)
 args=ap.parse_args()
 original=json.loads(args.crosswalk.read_text())['rows']
 index=json.loads(INDEX.read_text())
 report=reconcile(original,live_ids(),index)
 save(args.out,report)
 print(json.dumps({'decision':'ALL_170_HELD_RECONCILED_NO_PRODUCTION_CHANGE',
                   'research':report['sourceResearchCount'],'live':report['existingLiveCount'],
                   'held':report['sourceIdsNotInLive'],
                   'existingUnsignedFacultyForms':report['existingUnsignedFacultyFormsVerified'],
                   'bySourceFile':report['missingBySourceFile'],
                   'privateReceiptSHA256':hashlib.sha256(args.out.read_bytes()).hexdigest()}))
