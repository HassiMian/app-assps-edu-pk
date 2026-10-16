import copy
import importlib.util
import tempfile
import unittest
from pathlib import Path
P=Path(__file__).resolve().parents[1]/'qbank/audit-grade910-live-numerical-evidence-20261016.py'
spec=importlib.util.spec_from_file_location('num',P)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def inputs():
 orig=[{'questionId':f'Q-{i:03d}','originalRevisionSha256':'a'*64} for i in range(2581)]
 qa=[{'questionId':f'Q-{i:03d}','passed':True,
      'mathematicalRecomputationPass':True,'storedAnswerPass':True} for i in range(91)]
 deep=[{'originalId':f'Q-{i:03d}','originalRevisionSha256':'a'*64,
       'independentComputationAgreesWithSourceReference':True,
       'qualifiedTeacherReviewed':False,'academicallyApproved':False,
       'published':False,'originalStem':'Compute exact 5+3','originalReferenceAnswer':'8'}
      for i in list(range(59))+[100,101]]
 live=[{'id':f'Q-{i:03d}','stem':'Compute exact 5+3','answer':'8',
        'grade':'9th','subject':'Mathematics'} for i in range(80)]
 rev={'records':[{'questionId':f'Q-{i:03d}','revisionSha256':'b'*64} for i in range(2411)]}
 return [live,qa,deep,orig,rev]
class NumericalBoundaries(unittest.TestCase):
 def test_80_live_and_59_exact_reference_21_unbound(self):
    x=m.verify(*inputs());self.assertEqual(x['liveNumericals'],80)
    self.assertEqual(x['liveNumericStemAndAnswerIdenticalToDeepOriginal'],59)
    self.assertEqual(x['liveNumericalCurrentRevisionMissingDeepComputation'],21)
    self.assertEqual(x['academicApprovals'],0)
 def test_changed_legacy_answer_invalidates_deep_reuse(self):
    a=inputs();a[0][0]['answer']='9'
    with self.assertRaises(ValueError):m.verify(*a)
 def test_changed_numerical_stem_invalidates_deep_reuse(self):
    a=inputs();a[0][0]['stem']='Compute exact 5-3'
    with self.assertRaises(ValueError):m.verify(*a)
 def test_forged_deep_faculty_review_is_denied(self):
    a=inputs();a[2][0]['qualifiedTeacherReviewed']=True
    with self.assertRaises(ValueError):m.verify(*a)
 def test_wrong_original_revision_identity_is_denied(self):
    a=inputs();a[2][0]['originalRevisionSha256']='f'*64
    with self.assertRaises(ValueError):m.verify(*a)
 def test_failed_original_recomputation_is_denied(self):
    a=inputs();a[1][0]['mathematicalRecomputationPass']=False
    with self.assertRaises(ValueError):m.verify(*a)
 def test_no_duplicate_source_ids_and_question_content_leak(self):
    a=inputs();a[0][1]['id']=a[0][0]['id']
    with self.assertRaises(ValueError):m.verify(*a)
    out=m.verify(*inputs())
    self.assertNotIn('stem',out['records'][0])
    self.assertNotIn('answer',out['records'][0])
 def test_private_evidence_file(self):
    with tempfile.TemporaryDirectory() as d:
        file=Path(d)/'evidence'/'numerical.json'
        m.save(file,{'academicApproved':False})
        self.assertEqual(file.stat().st_mode&0o777,0o600)
if __name__=='__main__':unittest.main()
