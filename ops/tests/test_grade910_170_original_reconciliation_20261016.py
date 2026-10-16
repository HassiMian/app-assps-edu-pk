import importlib.util,pathlib,tempfile,unittest
P=pathlib.Path(__file__).resolve().parents[1]/'qbank/reconcile-grade910-held-original-candidates-20261016.py'
spec=importlib.util.spec_from_file_location('held_review',P)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class ReconciliationGuards(unittest.TestCase):
 def test_source_reconciliation_does_not_expose_database_mutator(self):
  self.assertFalse(hasattr(m,'write_question_bank'))
 def test_private_unsigned_review_forms_remain_not_approved(self):
  import json
  original=json.loads(m.CROSS.read_text())['rows']
  idx=json.loads(m.INDEX.read_text())
  live=json.loads(pathlib.Path('/tmp/assps-ixx-live-ids.json').read_text())
  x=m.reconcile(original,live,idx)
  self.assertEqual(x['sourceIdsNotInLive'],170)
  self.assertEqual(x['existingUnsignedFacultyFormsVerified'],170)
  self.assertEqual(x['newReviewSignatures'],0)
  self.assertEqual(x['newApprovedQuestions'],0)
  self.assertEqual(x['databaseWrites'],0)
  self.assertFalse(any(p['liveImportAllowed'] for p in x['originalResearchCandidateRecords']))
 def test_orphan_live_seed_id_fails(self):
  import json
  original=json.loads(m.CROSS.read_text())['rows']
  idx=json.loads(m.INDEX.read_text())
  live=json.loads(pathlib.Path('/tmp/assps-ixx-live-ids.json').read_text())
  with self.assertRaises(ValueError):
   m.reconcile(original,live[:-1]+['UNKNOWN-NOT-IN-ORIGINAL'],idx)
 def test_held_cohort_count_drift_fails(self):
  import json
  original=json.loads(m.CROSS.read_text())['rows']
  idx=json.loads(m.INDEX.read_text())
  live=json.loads(pathlib.Path('/tmp/assps-ixx-live-ids.json').read_text())
  with self.assertRaises(ValueError):
   m.reconcile(original,live[:-1],idx)
 def test_unsigned_review_form_not_auto_authenticated(self):
  import json
  p=m.FORMDIR/'IX-ENG-ORIG-20261008-G009.faculty-review.json'
  r=json.loads(p.read_text())
  self.assertFalse(r['signatureAuthenticated'])
  self.assertFalse(r['academicallyApproved'])
 def test_output_private_permissions(self):
  with tempfile.TemporaryDirectory() as d:
   dest=pathlib.Path(d)/'private'/'saved.json'
   m.save(dest,{'approved':False})
   self.assertEqual(dest.stat().st_mode&0o777,0o600)
if __name__=='__main__':unittest.main()
