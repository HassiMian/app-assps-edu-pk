"""Hermetic adversarial suite: all 80 machine proofs must never be academic approvals."""
from __future__ import annotations
import copy,importlib.util
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[2]
sp=importlib.util.spec_from_file_location('grade910_machine80_source',(ROOT/'ops/qbank/reconcile-grade910-80-live-numerical-machine-proof-20261016.py'))
m=importlib.util.module_from_spec(sp);sp.loader.exec_module(m)
def fixture():
 live={'schema':'ASSPS_IX_X_LIVE_CONTENT_REVISION_HASH_LEDGER_V1',
  'revisions':2411,'actualLiveAcademicRevisionContentHashed':True,
  'academicallyApprovedRevisions':0,'databaseWrites':0,'records':[]}
 old={'schema':'ASSPS_GRADE910_LIVE_NUMERICAL_REVISION_EVIDENCE_V1',
  'records':[],'liveNumericals':80,'academicApprovals':0,'productionDatabaseWrites':0}
 priority={'schema':'ASSPS_GRADE910_21_NUMERIC_RECOMPUTATION_QUEUE_V1',
  'stillNeedCurrentRevisionIndependentRecomputation':21,'records':[],
  'qualifiedReviewerApprovals':0,'publicationEligibleFromThisEvidence':0}
 deep={'schema':'ASSPS_GRADE910_21_NUMERICAL_DEEP_RECOMPUTATION_SOURCE_V1',
  'records':[],'sourceOriginalsIndependentlyRecomputed':21,
  'currentLiveStemsAndAnswersMatched':21,
  'prior59FullLiveRevisionAndStemReauthenticated':59,
  'combined80NumericalReadOnlyProof':True,'liveTextComparisonFailures':0,
  'currentLiveFullRevisionSha256Verified':True,
  'schoolAdoptedTextbookEditionCertified':False,
  'qualifiedFacultyApprovalsCreated':0,'paperStudioPublicationEnabled':False,'productionDatabaseWrites':0}
 receipt={'schema':'ASSPS_GRADE910_21_NUMERICAL_DEEP_RECOMPUTATION_SOURCE_V1',
  'combined80NumericalReadOnlyProof':True,'sourceOriginalsIndependentlyRecomputed':21,
  'prior59FullLiveRevisionAndStemReauthenticated':59,'productionDatabaseWrites':0,
  'qualifiedFacultyApprovalsCreated':0}
 for i in range(2411):
  key=f'TEST-SCHOOL1-REV-{i:04d}'
  live['records'].append({'questionId':key,'type':'short','revisionSha256':f'{i:064x}'})
 for i in range(80):
  key=f'IX-ORIGINAL-NUM-{i:03d}'
  sha=f'{(3000+i):064x}'
  frozen=f'{(4000+i):064x}'
  live['records'][i]={'questionId':key,'type':'numerical','revisionSha256':sha}
  old['records'].append({'questionId':key,'currentLiveRevisionSha256':sha,
   'sourceFrozenOriginalRevisionSha256':frozen,'grade':'9th','subject':'Physics',
   'category':('LEGACY_MACHINE_QA_ONLY_LIVE_REVISION_NEEDS_DEEP_RECOMPUTATION'
    if i<21 else 'LIVE_STEM_ANSWER_MATCH_DEEP_RECOMPUTED_ORIGINAL'),
   'qualifiedReviewerApproved':False,'paperStudioVerifiedSelectable':False,
   'exactBookExercisePageVerified':False})
  if i<21:
   priority['records'].append({'questionId':key,'currentRevisionSha256':sha})
   deep['records'].append({'questionId':key,'previousLiveRevisionSha256':sha,
    'frozenRevisionSha256':frozen,
    'liveExactStemAndAnswerMatch':True,
    'liveFullRevisionSha256MatchesPinned':True,
    'independentArithmeticFromLockedSource':True,
    'academicPublicationApproved':False,'qualifiedFacultyApproved':False})
 return live,old,priority,deep,receipt
class CompleteNumericalMachineVsHumanReview(unittest.TestCase):
 def runproof(self,modifier=None):
  values=list(fixture())
  if modifier:modifier(*values)
  return m.proof(*values)
 def test_completes_exactly_80_current_live_machine_checks_without_publish(self):
  x=self.runproof()
  self.assertEqual(x['machineArithmeticCoverageCurrentRevision'],80)
  self.assertEqual(x['historical21SourceRecomputedCurrent'],21)
  self.assertEqual(x['previouslyDeepRecomputedNumericals'],59)
  self.assertEqual(x['numericalsAwaitingAuthenticIndependentFacultyReview'],80)
  self.assertEqual(x['remainingNumericalsWithoutReadOnlyCurrentMachineRecomputation'],0)
  self.assertEqual(x['academicApprovedQuestions'],0)
 def test_old_21_queue_not_deleted_or_relabelled_fraudulently(self):
  x=self.runproof()
  self.assertTrue(x['historical21PriorityQueueKeptAsReadOnlyHistory'])
  self.assertEqual(sum(r['mechanicalEvidence'].startswith('OLDER_QUEUE') for r in x['records']),21)
 def test_wrong_live_hash_denied(self):
  with self.assertRaisesRegex(ValueError,'CURRENT_LIVE_FULL_SHA'):
   self.runproof(lambda l,o,p,d,r:l['records'][0].update(revisionSha256='f'*64))
 def test_old_priority_revision_mismatch_denied(self):
  with self.assertRaisesRegex(ValueError,'LEGACY_21_NOT_AUTHENTICATED'):
   self.runproof(lambda l,o,p,d,r:p['records'][0].update(currentRevisionSha256='f'*64))
 def test_changed_frozen_original_sha_denied(self):
  with self.assertRaisesRegex(ValueError,'LEGACY_21_NOT_AUTHENTICATED'):
   self.runproof(lambda l,o,p,d,r:d['records'][0].update(frozenRevisionSha256='f'*64))
 def test_missing_machine_verified_old_59_denied(self):
  with self.assertRaisesRegex(ValueError,'OLDER_59_NO_AUTHENTIC_DEEP_MACHINE_PROOF'):
   self.runproof(lambda l,o,p,d,r:o['records'][78].update(category='NOT_RECOMPUTED'))
 def test_forged_human_approval_denied(self):
  with self.assertRaisesRegex(ValueError,'CURRENT_LIVE_FULL_SHA'):
   self.runproof(lambda l,o,p,d,r:o['records'][0].update(qualifiedReviewerApproved=True))
 def test_forged_paperstudio_publication_denied(self):
  with self.assertRaisesRegex(ValueError,'CURRENT_LIVE_FULL_SHA'):
   self.runproof(lambda l,o,p,d,r:o['records'][0].update(paperStudioVerifiedSelectable=True))
 def test_missing_one_recomputed_item_denied(self):
  with self.assertRaisesRegex(ValueError,'AUTHORITATIVE_80'):
   self.runproof(lambda l,o,p,d,r:d['records'].pop())
 def test_duplicate_live_question_id_denied(self):
  with self.assertRaisesRegex(ValueError,'DUPLICATE_LIVE'):
   self.runproof(lambda l,o,p,d,r:l['records'][81].update(questionId=l['records'][80]['questionId']))
 def test_no_fake_school_adoption_in_deep_receipt(self):
  with self.assertRaisesRegex(ValueError,'AUTHORITATIVE_80'):
   self.runproof(lambda l,o,p,d,r:d.update(schoolAdoptedTextbookEditionCertified=True))
 def test_no_fake_prior21_faculty_approval(self):
  with self.assertRaisesRegex(ValueError,'LEGACY_21_NOT_AUTHENTICATED'):
   self.runproof(lambda l,o,p,d,r:d['records'][0].update(qualifiedFacultyApproved=True))
 def test_no_production_writes_or_paperstudio_marks(self):
  with self.assertRaisesRegex(ValueError,'PREVIOUS_80'):
   self.runproof(lambda l,o,p,d,r:o.update(productionDatabaseWrites=1))
 def test_no_copyrighted_question_or_answer_data_in_private_receipt(self):
  x=self.runproof()
  self.assertFalse(x['copyrightedSourceTextOrStudentDataPersisted'])
  self.assertTrue(all('stem' not in row and 'answer' not in row and
                      not row['academicallyApproved'] for row in x['records']))
 def test_actual_private_vps_80_machine_proof_matches_current_bank(self):
  if not m.STATE.exists() or not (m.STATE/'live-question-revisions.json').exists():
   self.skipTest('VPS-only restricted live database evidence')
  x=m.load()
  self.assertEqual(x['machineArithmeticCoverageCurrentRevision'],80)
  self.assertEqual(x['academicApprovedQuestions'],0)
if __name__=='__main__':unittest.main()
