import importlib.util,pathlib,tempfile,unittest,json
P=pathlib.Path(__file__).resolve().parents[1]/'qbank/assps-grade910-held170-near-duplicate-screen-20261016.py'
spec=importlib.util.spec_from_file_location('screen_held170',P)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Held170NearStemSafety(unittest.TestCase):
 def test_nearly_same_gerund_is_candidate_not_confirmed_duplicate(self):
  score,num,contrast=m.similarity("Identify the gerund in 'Reading regularly improves concentration.'",
     "Identify the gerund in: Reading improves concentration.")
  self.assertGreaterEqual(score,0.87)
  self.assertFalse(num);self.assertFalse(contrast)
 def test_positive_vs_zero_discriminant_not_collapsed(self):
  score,num,contrast=m.similarity("What does a zero discriminant mean for a real quadratic equation?",
      "What does a positive discriminant indicate for a real quadratic equation?")
  self.assertGreater(score,0.72);self.assertTrue(contrast)
 def test_changed_numerical_input_cannot_be_silently_duplicate(self):
  score,num,contrast=m.similarity("Calculate the energy at 20 joules.","Calculate the energy at 30 joules.")
  self.assertTrue(num)
 def test_normalized_punctuation_and_whitespace(self):
  a=m.normal("  READing:  improves  concentration!")
  b=m.normal("reading improves concentration")
  self.assertEqual(a,b)
 def test_case_insensitive_urdu_stem_tokenization_does_not_strip_urdu(self):
  self.assertIn("سوال",m.normal("سوال؟ جواب"))
 def test_missing_corpus_fails_not_green(self):
  with self.assertRaises(ValueError):m.screen([],[],[])
 def test_private_receipt_permissions(self):
  with tempfile.TemporaryDirectory() as root:
   p=pathlib.Path(root)/'private'/'near.json'
   m.save(p,{'confirmedDuplicateCount':0})
   self.assertEqual(p.stat().st_mode&0o777,0o600)
 def test_fixture_cannot_issue_approvals_or_imports(self):
  source=json.loads(m.CROSS.read_text())['rows']
  files={'biology9Chapter1TopicDrafts.json','biology9TopicResearchDrafts.json',
         'english9CompetencyOriginals2026.json','mathematics10OriginalReasoningBatch2026.json',
         'physics10OriginalApplicationBatch2026.json'}
  subset=[r for r in source if r['sourceFile'] in files]
  self.assertEqual(len(subset),170)
  held=[{'questionId':r['questionId'],'originalRevisionSha256':r['originalRevisionSha256']} for r in subset]
  live=[{'id':'MOCK-'+str(i),'grade':'9th','subject':'Biology','medium':'english',
          'stem':'Mock distinct question number '+str(i)} for i in range(2411)]
  screened=m.screen(held,source,live)
  self.assertEqual(screened['sourceOriginalOnly'],170)
  self.assertEqual(screened['newApprovals'],0)
  self.assertEqual(screened['automaticImports'],0)
  self.assertEqual(screened['confirmedDuplicateCount'],0)
  self.assertTrue(all(x['importBlockedUntilProvenSafe'] for x in screened['rows']))
if __name__=='__main__':unittest.main()
