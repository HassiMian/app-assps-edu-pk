"""Read-only grade/subject/chapter coverage report: no inferred syllabus adoption."""
from pathlib import Path
import importlib.util
import unittest

ROOT=Path(__file__).resolve().parents[2]
sp=importlib.util.spec_from_file_location('coverage',ROOT/'ops/qbank/build-grade910-live-subject-chapter-coverage-20261016.py')
m=importlib.util.module_from_spec(sp);sp.loader.exec_module(m)
def demo():
  a=[]
  for i in range(2411):
    grade='9th' if i<1530 else '10th'
    a.append({'id':'SYNT'+str(i),'grade':grade,'subject':'Synthetic Science',
       'medium':'english','chapter':1+i%5,'topic':'Test topic','type':'mcq' if i%2 else 'short'})
  pinned={'revisions':2411,
   'records':[{'questionId':r['id'],'revisionSha256':r['id']+'/'+str(r['chapter'])} for r in a]}
  return a,pinned
class CoverageGuardTests(unittest.TestCase):
 def test_actual_grade_counts_and_review_holds_not_approvals(self):
  a,p=demo();text,g,c=m.build(a,p,lambda x:x['id']+'/'+str(x['chapter']))
  self.assertEqual((g,c),(2,10))
  self.assertIn('1,530 provisional candidates',text)
  self.assertIn('881 provisional candidates',text)
  self.assertIn('independently reviewed/approved/published items established by this inventory: **0**',text)
  self.assertNotIn('Synthetic question answer',text)
 def test_changed_chapter_invalidates_source_fingerprint(self):
  a,p=demo();a[0]['chapter']=6
  with self.assertRaisesRegex(ValueError,'LIVE_CHAPTER_COVERAGE_REVISION_DRIFT'):
   m.build(a,p,lambda x:x['id']+'/'+str(x['chapter']))
 def test_duplicate_stable_id_blocked(self):
  a,p=demo();a[0]=dict(a[1])
  with self.assertRaisesRegex(ValueError,'DUPLICATE_OR_MISSING_SOURCE_ID'):
   m.build(a,p,lambda x:x['id']+'/'+str(x['chapter']))
 def test_missing_row_blocked(self):
  a,p=demo()
  with self.assertRaisesRegex(ValueError,'LIVE_SUBJECT_COVERAGE_SCOPE_CHANGED'):
   m.build(a[:-1],p,lambda x:x['id']+'/'+str(x['chapter']))
if __name__=='__main__':unittest.main()
