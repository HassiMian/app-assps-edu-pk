"""Offline tests: 21 original English essays are examples, not unique answer keys."""
from __future__ import annotations
import hashlib,importlib.util,json
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[2]
s=importlib.util.spec_from_file_location('en21',ROOT/'ops/qbank/author-grade910-english-21-essay-exemplars-20261016.py')
m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
class Grade910English21Essays(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.packet=json.loads(m.OUT.read_text())
  cls.items=cls.packet['rows']
 def test_unique_grade_subject_and_exactly_21(self):
  self.assertEqual(len(self.items),21)
  self.assertEqual(len(set(z['questionId'] for z in self.items)),21)
  self.assertEqual(sum(z['grade']=='9th' for z in self.items),11)
  self.assertEqual(sum(z['grade']=='10th' for z in self.items),10)
 def test_immutable_source_fingerprints_match(self):
  for grade,(name,hash_,catalog) in m.FROZEN.items():
   self.assertEqual(hashlib.sha256((m.DATA/name).read_bytes()).hexdigest(),hash_)
 def test_each_original_exemplar_has_usable_length(self):
  for x in self.items:
   with self.subTest(id=x['questionId']):
    w=len(x['originalIllustrativeParagraphNotUniqueAnswer'].split())
    self.assertGreaterEqual(w,75)
    self.assertLessEqual(w,145)
    self.assertEqual(x['marks'],5)
 def test_human_accepts_alternative_good_essays(self):
  self.assertTrue(self.packet['answersAreExamplesNotTheOnlyValidAnswers'])
  for x in self.items:
   self.assertTrue(x['thisIsAnIllustrativeExemplarNotAnAnswerKey'])
   self.assertTrue(x['alternateCorrectStudentAnswersPermitted'])
   self.assertEqual(len(x['flexibleFiveCriterionMarkingGuide']),5)
 def test_not_published_or_independent_teacher_reviewed(self):
  self.assertFalse(self.packet['academicApproved'])
  self.assertFalse(self.packet['published'])
  self.assertFalse(self.packet['paperStudioSelectable'])
  self.assertEqual(self.packet['productionDatabaseWrites'],0)
  for x in self.items:
   self.assertFalse(x['independentEnglishTeacherReviewed'])
   self.assertFalse(x['academicApproved'])
   self.assertFalse(x['published'])
   self.assertFalse(x['paperStudioVerifiedSelectable'])
   self.assertFalse(x['authenticASSPSAdoptedEditionEvidence'])
 def test_not_copyrighted_textbook_or_past_paper_excerpt(self):
  for x in self.items:self.assertFalse(x['textbookExtractOrPastPaperTextReproduced'])
 def test_can_reproduce_packet_without_production_access(self):
  current={x['questionId']:{'grade':x['grade'],'subject':'English',
   'medium':'english','type':'essay','marks':5,'chapter':str(x['storedResearchUnitNotVerifiedEdition'])} for x in self.items}
  hashes={x['questionId']:x['currentLiveFullQuestionRevisionSha256'] for x in self.items}
  risks={id:{'priority':'HIGH','currentLiveContentRevisionSha256':hashes[id]} for id in hashes}
  self.assertEqual(m.build(current,hashes,risks),self.packet)
 def test_old_original_stems_and_rubrics_preserved(self):
  for grade,(fn,_,__) in m.FROZEN.items():
   data={q['id']:q for q in json.loads((m.DATA/fn).read_text())['drafts']}
   for r in self.items:
    if r['grade']!=grade:continue
    old=data[r['questionId']]
    self.assertEqual(old['type'],'essay')
    self.assertEqual(old['marks'],5)
    self.assertTrue(old['content']['en']['stem'])
    self.assertNotEqual(old['content']['en']['answer'],r['originalIllustrativeParagraphNotUniqueAnswer'])
 def test_distinct_original_paragraphs(self):
  self.assertEqual(len({r['originalIllustrativeParagraphNotUniqueAnswer'] for r in self.items}),21)
 def test_no_question_revision_sha_duplicates_across_distinct_questions(self):
  self.assertEqual(len({r['currentLiveFullQuestionRevisionSha256'] for r in self.items}),21)
if __name__=='__main__':unittest.main()
