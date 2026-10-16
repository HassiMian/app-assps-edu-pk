"""Offline academic QA: 8 original Grade IX Chemistry Urdu research explanations."""
from __future__ import annotations
import hashlib,importlib.util,json
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('chem9',ROOT/'ops/qbank/author-grade9-urdu-chemistry-eight-conceptual-20261016.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Chemistry9UrduEight(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.packet=json.loads(m.OUT.read_text())
  cls.items=cls.packet['rows']
 def test_8_current_unapproved_ids(self):
  self.assertEqual(len(self.items),8)
  self.assertEqual(len(set(r['questionId'] for r in self.items)),8)
  self.assertEqual(self.packet['candidateCount'],8)
 def test_original_source_sha_exact(self):
  self.assertEqual(hashlib.sha256(m.SRC.read_bytes()).hexdigest(),m.SRC_SHA)
 def test_expanded_original_explanations(self):
  old={r['id']:r for r in json.loads(m.SRC.read_text())['drafts']}
  for r in self.items:
   q=old[r['questionId']]
   self.assertEqual(q['type'],'long')
   self.assertEqual(q['marks'],5)
   self.assertNotEqual(q['content']['ur']['answer'],r['newOriginalUrduConceptualExplanation'])
   self.assertGreaterEqual(len(r['newOriginalUrduConceptualExplanation'].split()),75)
   self.assertEqual(len(set(r['proposedFivePointReviewRubric'])),5)
 def test_all_eight_are_urdu_and_original_science(self):
  for r in self.items:
   s=r['newOriginalUrduConceptualExplanation']
   self.assertGreater(sum('\u0600'<=c<='\u06ff' for c in s),150)
 def test_not_auto_approved_or_source_pages_proven(self):
  self.assertFalse(self.packet['academicApproved'])
  self.assertFalse(self.packet['published'])
  self.assertFalse(self.packet['officialSchoolTextbookAdoptionVerified'])
  self.assertEqual(self.packet['productionDatabaseWrites'],0)
  for r in self.items:
   for name in ('academicallyApproved','published','paperStudioVerifiedSelectable',
                'independentQualifiedChemistryReviewed','independentUrduReviewed',
                'sourcePrintedExercisePageVerified','schoolSessionTextbookEditionAuthenticated',
                'hazardousPreparationProcedureIncluded'):
    self.assertFalse(r[name])
 def test_hermetic_8_current_sha_packet_reproduction(self):
  live={r['questionId']:{'grade':'9th','subject':'Chemistry','medium':'Urdu','type':'long',
    'marks':5,'chapter':str(r['storedChapterClaimNotVerifiedSchoolEdition'])} for r in self.items}
  hash_={r['questionId']:r['currentFullQuestionRevisionSha256'] for r in self.items}
  pri={id:{'priority':'HIGH','currentLiveContentRevisionSha256':hash_[id]} for id in hash_}
  self.assertEqual(m.build(live,hash_,pri),self.packet)
 def test_mismatched_question_sha_fails_closed(self):
  live={r['questionId']:{'grade':'9th','subject':'Chemistry','medium':'Urdu','type':'long',
    'marks':5,'chapter':str(r['storedChapterClaimNotVerifiedSchoolEdition'])} for r in self.items}
  hash_={r['questionId']:r['currentFullQuestionRevisionSha256'] for r in self.items}
  pri={id:{'priority':'HIGH','currentLiveContentRevisionSha256':'z'*64} for id in hash_}
  with self.assertRaisesRegex(ValueError,'NOT_CURRENT_HIGH_LONG_REVISION'):
   m.build(live,hash_,pri)
if __name__=='__main__':unittest.main()
