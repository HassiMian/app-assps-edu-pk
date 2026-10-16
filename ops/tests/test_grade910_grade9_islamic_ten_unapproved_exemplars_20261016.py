"""Ten original Grade IX Islamiat/Tarjuma answers; research, never tafsir signoff."""
import copy,importlib.util,json,hashlib,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('islamic10',ROOT/'ops/qbank/author-grade9-ten-islamic-urdu-ethical-exemplars-20261016.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class HermeticIslamicTen(unittest.TestCase):
 def test_exact_unique_ten(self):
  self.assertEqual(len(m.ANS),10)
  self.assertEqual(len(set(m.ANS)),10)
 def test_grade9_original_islamic_subject_ids_only(self):
  self.assertEqual(sum(x.startswith('IX-ISL-') for x in m.ANS),4)
  self.assertEqual(sum(x.startswith('IX-TTQ-') for x in m.ANS),6)
 def test_urdu_substantive_explanations(self):
  self.assertTrue(all(70<=len(ans.split())<=160 for ans,_ in m.ANS.values()))
 def test_each_research_essay_has_five_criteria(self):
  self.assertTrue(all(len(rubric)==5 and all(len(x)>=12 for x in rubric) for _,rubric in m.ANS.values()))
 def test_not_copied_literal_hadith_or_quran_verse(self):
  self.assertTrue(all('عربی آیت کا ترجمہ:' not in ans and 'حدیث نمبر:' not in ans for ans,_ in m.ANS.values()))
 def test_six_surah_background_references_not_school_edition_approval(self):
  self.assertEqual(len(m.REFERENCES),6)
  self.assertTrue(all(row[0].startswith('https://') for row in m.REFERENCES.values()))
 def test_no_authoring_of_chemistry_or_technical_stream(self):
  self.assertFalse(any('CHEM' in id or 'TECH' in id for id in m.ANS))
 def test_all_exact_sura_themes_distinct(self):
  bodies=[a for id,(a,r) in m.ANS.items() if id.startswith('IX-TTQ-')]
  self.assertEqual(len(set(bodies)),6)
class ProtectedSchoolCurrentRevisionTest(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  if not (m.STATE/'live-question-revisions.json').exists():
   raise unittest.SkipTest('Current actual School1 content SHA ledger is private VPS evidence')
  cls.result=m.run()
 def test_ten_actual_live_question_stems_and_original_source_sha(self):
  self.assertEqual(self.result['candidateCount'],10)
  self.assertEqual(self.result['liveSchool1ReadOnlyCurrentRevisionCount'],2411)
 def test_all_ten_answers_are_explicitly_unapproved(self):
  for row in self.result['answers']:
   self.assertFalse(row['academicallyApproved'])
   self.assertFalse(row['paperStudioVerifiedSelectable'])
   self.assertFalse(row['independentIslamicStudiesTeacherApproved'])
   self.assertFalse(row['independentUrduReviewerApproved'])
   self.assertFalse(row['actualASSPSAdopted2026To2027BookVerified'])
   self.assertFalse(row['actualPrintedExercisePageVerified'])
   self.assertEqual(row['productionDatabaseWrites'],0)
 def test_both_qualified_reviewer_approvals_zero(self):
  self.assertEqual(self.result['qualifiedIslamicAndUrduReviewerApprovals'],0)
  self.assertFalse(self.result['publishedVerified'])
 def test_immutable_frozen_source_files_same_hash(self):
  for x in self.result['answers']:
   f=m.SEED/x['originalResearchFile']
   self.assertEqual(hashlib.sha256(f.read_bytes()).hexdigest(),x['originalResearchFileSHA256'])
 def test_original_outputs_can_be_reconstructed(self):
  self.assertEqual(self.result,json.loads(m.OUT.read_text()))
 def test_current_revision_tampering_blocks_new_research(self):
  live=m.original_module().read_live()
  rev={r['questionId']:r['revisionSha256'] for r in json.loads((m.STATE/'live-question-revisions.json').read_text())['records']}
  risk={r['questionId']:r for r in json.loads((m.STATE/'subjective-answer-depth-risk-20261016.json').read_text())['records']}
  queue={r['questionId']:r for r in json.loads((m.STATE/'live-existing-answer-proposal-crosswalk-20261016.json').read_text())['unlinkedCurrentRevisionResearchQueue']}
  original={r['questionId']:r for r in json.loads(m.PUB.read_text())['rows']}
  # The historical HIGH risk is immutable even after linking the new sample.
  for id in m.ANS:
   if id not in queue:
    queue[id]={'questionId':id,'priority':'HIGH','currentLiveRevisionSha256':rev[id],
     'academicallySelectable':False,'schoolStreamApplicability':'SUBJECT_BOOK_EDITION_ADOPTION_EVIDENCE_REQUIRED'}
  broken=copy.deepcopy(rev)
  broken[next(iter(m.ANS))]='f'*64
  with self.assertRaisesRegex(ValueError,'INVALID_CURRENT_SHA|SOURCE|DRIFT|RISK|MISMATCH'):
   m.build(live,broken,risk,queue,original)
if __name__=='__main__':unittest.main()
