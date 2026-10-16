"""Hermetic academic QA for 13 original Grade X Chemistry Urdu conceptual drafts."""
from __future__ import annotations
import copy,hashlib,importlib.util,json
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[2]
p=ROOT/'ops/qbank/author-grade10-urdu-chemistry-ten-safe-conceptual-answers-20261016.py'
sp=importlib.util.spec_from_file_location('chem_urdu_13',p)
m=importlib.util.module_from_spec(sp);sp.loader.exec_module(m)
class ChemistryUrduTenStandaloneTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.packet=json.loads(m.OUT.read_text())
  cls.items=cls.packet['drafts']
 def test_exactly_ten_conceptual_three_specialist_held_and_no_duplicate_ids(self):
  self.assertEqual(len(self.items),10)
  self.assertEqual(len(set(z['questionId'] for z in self.items)),10)
  self.assertEqual(self.packet['candidateCount'],10)
 def test_specialist_hold_contains_exact_three_not_auto_drafted(self):
  held=set(self.packet['specialistHeldNoAIExplanatoryAnswerQuestionIds'])
  self.assertEqual(len(held),3)
  self.assertTrue(held.isdisjoint({z['questionId'] for z in self.items}))
  self.assertEqual(len(self.items)+len(held),13)
 def test_frozen_original_chemistry_source_sha_match(self):
  self.assertEqual(hashlib.sha256(m.SOURCE.read_bytes()).hexdigest(),m.SOURCE_SHA)
  self.assertEqual(self.packet['sourceFrozenResearchSha256'],m.SOURCE_SHA)
 def test_original_question_stems_answers_not_mutated(self):
  frozen={z['id']:z for z in json.loads(m.SOURCE.read_text())['drafts']}
  for z in self.items:
   old=frozen[z['questionId']]
   self.assertEqual(old['type'],'long')
   self.assertEqual(old['marks'],5)
   self.assertNotEqual(old['content']['ur']['answer'],z['originalConceptualExplanationCandidateUrdu'])
   self.assertTrue(old['content']['ur']['stem'])
 def test_actual_urdu_text_and_5mark_completeness(self):
  for z in self.items:
   with self.subTest(id=z['questionId']):
    s=z['originalConceptualExplanationCandidateUrdu']
    self.assertGreaterEqual(len(s.split()),65)
    self.assertGreater(sum('\u0600'<=c<='\u06ff' for c in s),130)
    self.assertEqual(z['marks'],5)
    self.assertEqual(len(set(z['proposedFiveIndependentAssessmentPointsUrdu'])),5)
 def test_background_reference_is_not_assps_page_claim(self):
  for z in self.items:
   self.assertTrue(z['nonSchoolOfficialBackgroundScienceReference'].startswith('https://'))
   self.assertFalse(z['actualSourceExercisePageVerified'])
   self.assertFalse(z['school2026To2027BookAdoptionVerified'])
 def test_independent_teacher_and_release_remain_denied(self):
  self.assertFalse(self.packet['academicApproval'])
  self.assertFalse(self.packet['published'])
  self.assertFalse(self.packet['paperStudioVerifiedSelectable'])
  self.assertEqual(self.packet['productionDatabaseWrites'],0)
  for z in self.items:
   for k in ('independentChemistryTeacherReviewed','independentUrduLanguageReviewed',
             'approved','published','paperStudioVerifiedSelectable'):
    self.assertIs(z[k],False)
 def test_no_operational_lab_instructions_flag(self):
  self.assertTrue(self.packet['originalConceptualAnswersNotOperationalPreparationGuides'])
  self.assertTrue(all(z['operationalHazardousLabInstructionsProvided'] is False for z in self.items))
 def test_reproduce_entire_manifest_with_hermetic_current_revision_fixtures(self):
  sample={z['questionId']:{'grade':'10th','subject':'Chemistry','medium':'Urdu',
          'type':'long','marks':5,'chapter':str(z['storedChapterNumberNotVerifiedTextbookEdition'])} for z in self.items}
  hashes={z['questionId']:z['liveFullQuestionContentRevisionSha256'] for z in self.items}
  priority={id:{'priority':'HIGH','currentLiveContentRevisionSha256':h} for id,h in hashes.items()}
  self.assertEqual(m.build(sample,hashes,priority),self.packet)
 def test_wrong_revision_denied(self):
  sample={z['questionId']:{'grade':'10th','subject':'Chemistry','medium':'Urdu',
          'type':'long','marks':5,'chapter':str(z['storedChapterNumberNotVerifiedTextbookEdition'])} for z in self.items}
  hashes={z['questionId']:z['liveFullQuestionContentRevisionSha256'] for z in self.items}
  priority={id:{'priority':'HIGH','currentLiveContentRevisionSha256':h} for id,h in hashes.items()}
  priority[next(iter(priority))]['currentLiveContentRevisionSha256']='b'*64
  with self.assertRaisesRegex(ValueError,'NOT_VALID_HIGH_CURRENT_REVISION'):
   m.build(sample,hashes,priority)
 def test_not_all_chemistry_is_experimental_manipulation(self):
  for z in self.items:
   text=z['originalConceptualExplanationCandidateUrdu']
   self.assertNotIn(' grams of ',text)
   self.assertNotIn('heat to ',text)
   self.assertNotIn('mix together',text)
if __name__=='__main__':unittest.main()
