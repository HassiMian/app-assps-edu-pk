"""Hermetic content, source-hash, language and hold controls for 14 Urdu drafts."""
import copy,hashlib,importlib.util,json
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[2]
sp=importlib.util.spec_from_file_location('assps_second_urdu_original_author',
  ROOT/'ops/qbank/author-grade9-biology8-grade10-computer6-urdu-research-20261016.py')
m=importlib.util.module_from_spec(sp);sp.loader.exec_module(m)
class OriginalFourteenAuthoringTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.data=json.loads(m.OUTPUT.read_text())
 def test_fourteen_unique_grade_subject_ids(self):
  self.assertEqual(len(m.DRAFTS),14)
  self.assertEqual(len({r['questionId'] for r in self.data['drafts']}),14)
  self.assertEqual(self.data['grade9BiologyUrduCount'],8)
  self.assertEqual(self.data['grade10ComputerUrduCount'],6)
 def test_frozen_two_original_sources_sha256(self):
  for grade,fn,hash_,catalog in m.FROZEN.values():
   self.assertEqual(hashlib.sha256((m.SOURCE_ROOT/fn).read_bytes()).hexdigest(),hash_)
 def test_exact_original_frozen_stems_still_present(self):
  for subject,(grade,fn,hash_,cat) in m.FROZEN.items():
   src={x['id']:x for x in json.loads((m.SOURCE_ROOT/fn).read_text())['drafts']}
   for r in self.data['drafts']:
    if r['subject']!=subject:continue
    x=src[r['questionId']]
    self.assertEqual(x['type'],'long')
    self.assertEqual(x['marks'],5)
    self.assertTrue(x['content']['ur']['stem'])
    self.assertNotEqual(x['content']['ur']['answer'],r['independentlyAuthoredUrduExplanationCandidate'])
 def test_thorough_urdu_content_rubric_criteria(self):
  for r in self.data['drafts']:
   with self.subTest(id=r['questionId']):
    v=r['independentlyAuthoredUrduExplanationCandidate']
    self.assertGreaterEqual(len(v.split()),70)
    self.assertGreater(sum(0x600<=ord(c)<=0x6ff for c in v),180)
    self.assertEqual(r['marks'],5)
    self.assertEqual(len(set(r['proposedFivePointMarkingCriteriaUrdu'])),5)
 def test_credible_referenced_background_not_fabricated_punjab_page(self):
  for row in self.data['drafts']:
   self.assertTrue(row['backgroundSubjectLearningReferenceUrl'].startswith('https://'))
   self.assertFalse(row['sourcePrintedTextbookPageOrExerciseVerified'])
   self.assertFalse(row['actualSchoolAdoptedEditionFor2026_27Verified'])
   self.assertTrue(len(row['currentLiveFullContentRevisionSha256'])==64)
 def test_all_review_and_publication_statuses_stay_false(self):
  for r in self.data['drafts']:
   for f in ['academicallyApproved','publishedVerified','paperStudioApprovedSelectable',
             'independentlyQualifiedSubjectReviewed','independentUrduLanguageReviewerApproved']:
    self.assertIs(r[f],False)
  self.assertFalse(self.data['academicallyApproved'])
  self.assertFalse(self.data['published'])
  self.assertEqual(self.data['productionDatabaseWrites'],0)
 def test_fully_hermetic_authored_packet_reproduction(self):
  fake={r['questionId']:{'grade':r['grade'],'subject':r['subject'],
    'medium':r['medium'],'type':'long','marks':5,'chapter':r['storedChapterClassificationUnverified']}
      for r in self.data['drafts']}
  hashes={r['questionId']:r['currentLiveFullContentRevisionSha256'] for r in self.data['drafts']}
  risks={id:{'priority':'HIGH','currentLiveContentRevisionSha256':hashes[id]} for id in hashes}
  self.assertEqual(m.build(fake,hashes,risks),self.data)
 def test_underdetailed_rubric_mutation_fails_closed(self):
  id=next(iter(m.DRAFTS)); old=m.DRAFTS[id]
  try:
   m.DRAFTS[id]=(old[0],old[1][:4],old[2])
   fake={r['questionId']:{'grade':r['grade'],'subject':r['subject'],
    'medium':r['medium'],'type':'long','marks':5,'chapter':r['storedChapterClassificationUnverified']}
      for r in self.data['drafts']}
   h={r['questionId']:r['currentLiveFullContentRevisionSha256'] for r in self.data['drafts']}
   with self.assertRaisesRegex(ValueError,'ANSWER_DEPTH_OR_MARKS_INCOMPLETE'):
    m.build(fake,h,{id:{'priority':'HIGH','currentLiveContentRevisionSha256':h[id]} for id in h})
  finally:m.DRAFTS[id]=old
 def test_risk_sha_mutation_denied(self):
  fake={r['questionId']:{'grade':r['grade'],'subject':r['subject'],
    'medium':r['medium'],'type':'long','marks':5,'chapter':r['storedChapterClassificationUnverified']}
      for r in self.data['drafts']}
  h={r['questionId']:r['currentLiveFullContentRevisionSha256'] for r in self.data['drafts']}
  eligible={id:{'priority':'HIGH','currentLiveContentRevisionSha256':h[id]} for id in h}
  eligible[next(iter(h))]['currentLiveContentRevisionSha256']='f'*64
  with self.assertRaisesRegex(ValueError,'NOT_HIGH_CURRENT_LONG'):
   m.build(fake,h,eligible)
if __name__=='__main__':unittest.main()
