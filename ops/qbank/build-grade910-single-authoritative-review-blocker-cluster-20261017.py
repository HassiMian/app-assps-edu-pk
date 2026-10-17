#!/usr/bin/env python3
"""Unified ASSPS Grade IX–X 4-lane question review backlog; RESEARCH ONLY.

Never treats machine corroboration or catalog hash as official edition adoption,
qualified reviewer approval, textbook-exercise proof, or Paper Studio release.
Private question-ID/hash metadata only. No question text, scores or PDF excerpts.
"""
from __future__ import annotations
import collections, json, os, pathlib, sys, tempfile

ROOT=pathlib.Path(__file__).resolve().parents[2]
STATE=pathlib.Path('/var/lib/assps-grade910-sourceclaims')
OUT=STATE/'grade910-1305-distinct-live-review-blocker-cluster-20261017.json'
FILES={'source': '998-text-and-ocr-question-page-review-routing-20261016.json',
       'answer': 'live-existing-answer-proposal-crosswalk-20261016.json',
       'numerical': 'grade910-80-live-numericals-current-machine-arithmetic-20261016.json',
       'tech': 'tech-137-school-adoption-source-ledger-20261017.json',
       'revision': 'live-question-revisions.json',
       'phase': 'autonomous-six-phase-checkpoint.json'}
DIMENSIONS=('curriculumSessionApplicable','schoolTextbookEditionAdopted',
            'chapterAndExactExerciseLocationVerified','answerCorrectnessTeacherReviewed',
            'marksDifficultyAndObjectiveReviewed','languageEquivalenceReviewedWhenApplicable',
            'provenanceAndDuplicationIndependentlyChecked','qualifiedRevisionApprovalSigned')
def make(d):
 source=d['source'];answers=d['answer'];num=d['numerical'];tech=d['tech']
 full=d['revision'];six=d['phase']
 if (source['reviewCandidates']!=998 or source['schoolAdoptionAuthenticated'] is not False
     or source['academicallyApprovedQuestions']!=0 or source['publishedQuestions']!=0
     or answers['remainingLiveReviewDepthFlagsWithoutAnyDraft']!=358
     or answers['remainingHighPriorityFlagsWithoutAnyDraft']!=137
     or answers['remainingHighPriorityStreamSpecificSubjectLabelsAwaitSchoolAdoption']!=137
     or answers['academicallySelectableCreated']!=0 or answers['qualifiedAcademicApprovalsCreated']!=0
     or num['machineArithmeticCoverageCurrentRevision']!=80
     or num['numericalsAwaitingAuthenticIndependentFacultyReview']!=80
     or num['remainingNumericalsWithoutReadOnlyCurrentMachineRecomputation']!=0
     or num['academicApprovedQuestions']!=0 or num['paperStudioPublishedVerifiedQuestions']!=0
     or tech['currentQuestionRevisionsPinned']!=137 or tech['realSchoolTechAdoptions']!=0
     or tech['qualifiedAcademicApprovals']!=0 or tech['publishedVerifiedQuestions']!=0
     or full['revisions']!=2411 or full['academicallyApprovedRevisions']!=0
     or full['humanReviewerSignedRevisions']!=0 or full['databaseWrites']!=0
     or six['machinePassedPhases']!=4 or six['academicVerifiedPublicationReady'] is not False
     or six['authenticIndependentAcademicApprovals']!=0):
  raise ValueError('NOT_CURRENT_AUTHENTIC_UNAPPROVED_UNIFIED_RESEARCH_EVIDENCE')
 for origin in ('source','answer','numerical','tech'):
  if d[origin]['productionDatabaseWrites']!=0:
   raise ValueError('PRODUCTION_WRITE_SIGNAL_MUST_BE_ZERO_'+origin)
 raw={'source':source['priorityEvidenceItems'],
      'answer':answers['unlinkedCurrentRevisionResearchQueue'],
      'numerical':num['records'],
      'tech':tech['records']}
 want={'source':998,'answer':358,'numerical':80,'tech':137}
 hashes={x['questionId']:x['revisionSha256'] for x in full['records']}
 if len(hashes)!=2411:raise ValueError('LIVE_QUESTION_ID_DUPLICATE')
 clusters={}
 for origin,records in raw.items():
  if len(records)!=want[origin] or len({z['questionId'] for z in records})!=len(records):
   raise ValueError('LANE_IDENTITY_DUPLICATE_'+origin)
  for x in records:
   id=x['questionId']
   rev={'source':'currentLiveSchool1FullRevisionSha256',
        'answer':'currentLiveRevisionSha256',
        'numerical':'currentLiveFullRevisionSha256',
        'tech':'currentLiveRevisionSHA256'}[origin]
   if not isinstance(hashes.get(id),str) or len(hashes[id])!=64 or hashes[id]!=x[rev]:
    raise ValueError('STALE_OR_MISSING_LIVE_FULL_REVISION_'+origin+'_'+id)
   if origin=='source' and (
       x['academicApproved'] is not False or x['paperStudioVerifiedSelectable'] is not False
       or x['specificTextbookQuestionPageVerified'] is not False
       or x['qualifiedAcademicReviewerAuthenticated'] is not False):
    raise ValueError('INVALID_SOURCE_PAGE_ACADEMIC_APPROVAL_'+id)
   if origin=='answer' and x['academicallySelectable'] is not False:
    raise ValueError('RESEARCH_HIGH_PRIORITY_IS_NOT_APPROVED_'+id)
   if origin=='numerical' and (
       x['academicallyApproved'] is not False or x['paperStudioVerifiedSelectable'] is not False
       or x['qualifiedIndependentSubjectReviewerAuthenticated'] is not False):
    raise ValueError('MACHINE_NUMERIC_CANNOT_APPROVE_'+id)
   if origin=='tech' and (
       x['actualSchoolProgrammeAdoption'] is not False
       or x['actualSchoolBookEditionApproval'] is not False
       or x['bilingualEquivalentApproved'] is not False
       or x['paperStudioVerifiedSelectable'] is not False):
    raise ValueError('TECH_CATALOG_CANNOT_AUTO_ADOPT_'+id)
   row=clusters.setdefault(id,{'questionId':id,'liveFullRevisionSHA256':hashes[id],'lanes':[],
               'curriculumAndAcademicReviewerDimensionsOutstanding':list(DIMENSIONS),
               'academicPublished':False,'paperStudioVerifiedSelectable':False})
   row['lanes'].append(origin)
   if origin=='answer':
    row['answerReviewPriority']=x['priority']
    row['techStreamSchoolAdoptionUnverified']=x['schoolStreamApplicability']=='STREAM_SPECIFIC_ADOPTION_EVIDENCE_REQUIRED'
   if origin=='source':
    row['claimedSourceCatalogId']=x['sourceCatalogId']
    row['sourcePageResearchStatus']=x['routing']
   if origin=='tech':row['techCatalogEditionClaimNotSchoolAdopted']=x['catalogEditionLabel']
   if origin=='numerical':row['arithmeticMachineCorroboratedOnly']=True
 if len(clusters)!=1305:
  raise ValueError('EXPECTED_1305_DISTINCT_NOT_SUM_OF_LANES')
 a={z['questionId'] for z in raw['answer']};s={z['questionId'] for z in raw['source']}
 n={z['questionId'] for z in raw['numerical']};t={z['questionId'] for z in raw['tech']}
 if (len(a&s),len(n&s),len(a&n),len(t&s),len(t&a),len(t-n-a))!=(83,48,0,29,137,0):
  raise ValueError('OVERLAPS_CHANGED_OR_TECH_NOT_A_SUBSET_OF_HIGH_EDITORIAL_QUEUE')
 if {z['questionId'] for z in raw['answer'] if z['priority']=='HIGH'}!=t:
  raise ValueError('ALL_AND_ONLY_137_HIGH_TECH_SOURCE_APPLICATION_UNCERTAIN')
 mult=collections.Counter(tuple(sorted(row['lanes'])) for row in clusters.values())
 distribution={'+'.join(k):v for k,v in sorted(mult.items())}
 return {'schema':'ASSPS_GRADE910_1305_UNIQUE_REVIEW_BLOCKER_CLUSTER_NOT_PUBLICATION_V1',
  'distinctActualSchool1LiveRevisionBlockedQuestionIds':1305,
  'actualSchool1ReadOnlyLiveQuestionCount':2411,
  'sourcePageClaimsNeedingExerciseEvidence':998,
  'unlinkedAnswerResearchFlags':358,'highPriorityTechAdoptionUnverified':137,
  'machineVerifiedNumericalsPendingQualifiedReview':80,
  'duplicateQuestionCountsAvoided':998+358+80-1305,
  'overlapSourceAndAnswer':83,'overlapSourceAndNumerical':48,
  'overlapTechAndSource':29,'overlapTechAndAnswer':137,
  'bilingualSameChapterCandidatePairsNotVerifiedTranslations':tech['bilingualSameChapterCandidatesNotApproved'],
  'actualSchoolBookAdoptionApprovals':0,'authenticQualifiedAcademicReviewerApprovals':0,
  'exactPrintedQuestionExercisePageApprovals':0,'approvedPublishedQuestionCount':0,
  'academicMachinePhasesPassedNotFacultyReview':4,
  'approvalAndReleaseGateStillOnHold':True,'productionDatabaseWrites':0,
  'containsCopyrightedQuestionAnswerOrStudentContent':False,
  'lanePatternDistribution':distribution,
  'blockerDimensionsRequiredPerRevision':list(DIMENSIONS),
  'items':sorted(clusters.values(),key=lambda x:x['questionId'])}
def build():
 d={k:json.loads((STATE/f).read_text()) for k,f in FILES.items()}
 return make(d)
def write(x):
 if STATE.stat().st_mode&0o077:raise ValueError('PRIVATE_SOURCE_EVIDENCE_DIRECTORY_EXPOSED')
 fd,tmp=tempfile.mkstemp(prefix='.master-grade910-1305-',dir=STATE)
 try:
  os.fchmod(fd,0o600)
  with os.fdopen(fd,'w') as f:json.dump(x,f,sort_keys=True,ensure_ascii=False,indent=2);f.write('\n')
  os.replace(tmp,OUT)
 finally:
  if os.path.exists(tmp):os.unlink(tmp)
def main():
 x=build()
 if sys.argv[1:]==['--check']:
  if not OUT.exists() or json.loads(OUT.read_text())!=x:
   raise ValueError('MASTER_1305_BLOCKER_CLUSTER_STALE_OR_NOT_PRESENT')
  print('PASS_1305_DISTINCT_SHA_BOUND_4_LANES_HUMAN_APPROVAL_ZERO_PUBLICATION_HOLD')
 elif not sys.argv[1:]:
  write(x)
  print(json.dumps({k:v for k,v in x.items() if k!='items'},sort_keys=True))
 else:raise ValueError('USE_NO_ARGUMENT_OR_CHECK')
if __name__=='__main__':main()
