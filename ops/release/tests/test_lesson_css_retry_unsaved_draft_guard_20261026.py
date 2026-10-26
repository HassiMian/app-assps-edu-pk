import pathlib,unittest
root=pathlib.Path(__file__).resolve().parents[3]
module=root/'al-siddique-frontend/src/Modules/Paper-Generator'
class RetryGuard(unittest.TestCase):
 def test_explicit_warning_before_reload(self):
  x=(module/'LessonAssetLoadBoundary.jsx').read_text()
  self.assertIn('Any unsaved changes in this browser tab may be lost',x)
  self.assertIn('Retry this page',x)
 def test_manual_not_auto_refresh(self):
  x=(module/'LessonAssetLoadBoundary.jsx').read_text()
  self.assertIn('onClick={() => window.location.replace',x)
  self.assertNotIn('componentDidMount(',x)
 def test_single_retry_never_retries_academic_writes(self):
  x=(module/'lessonStaticAssetRetry.js').read_text()
  self.assertIn('Runs ONLY for lesson module import',x)
  self.assertIn('return importer()',x)
 def test_fail_closed_business_data_preservation_text(self):
  x=(module/'LessonAssetLoadBoundary.jsx').read_text()
  self.assertIn('We did not save, publish, or change any school records',x)
if __name__=='__main__':unittest.main()
