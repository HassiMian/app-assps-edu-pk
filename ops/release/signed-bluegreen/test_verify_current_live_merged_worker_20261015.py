import importlib.util
import tempfile
import unittest
from pathlib import Path
MODPATH=Path(__file__).with_name('verify-current-live-merged-worker-20261015.py')
spec=importlib.util.spec_from_file_location('worker_check',MODPATH)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
class OverlaySafety(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.d=Path(self.tmp.name)
        self.src,self.live,self.stage=(self.d/x for x in ('src','live','stage'))
        for f in m.WORKER_FILES:
            for b in [self.src,self.stage]:
                p=b/f;p.parent.mkdir(parents=True,exist_ok=True);p.write_text('reviewed-'+f)
        for f in m.PRESERVE_FILES:
            for b in [self.live,self.stage]:
                p=b/f;p.parent.mkdir(parents=True,exist_ok=True);p.write_text('live-'+f)
    def audit(self):
        return m.attest_overlay(self.src,self.live,self.stage)
    def test_reviewed_overlay_preserves_concurrent_live_code(self):
        self.assertTrue(all(self.audit().values()))
    def test_stale_lesson_route_fails_closed(self):
        (self.stage/'routes/lessonPlanRoutes.js').write_text('STALE ROUTE')
        self.assertFalse(self.audit()['concurrent_live_preserved_routes/lessonPlanRoutes.js'])
    def test_worker_source_drift_fails_closed(self):
        (self.stage/'services/ai/aiQueueWorkerDatabase.js').write_text('UNREVIEWED CODE')
        self.assertFalse(self.audit()['reviewed_overlay_services/ai/aiQueueWorkerDatabase.js'])
    def test_live_adapter_switch_requires_new_certification(self):
        p=self.live/'services/ai/aiQueueWorkerDatabase.js'
        p.parent.mkdir(parents=True,exist_ok=True);p.write_text('LIVE BUT NOT REVIEWED')
        self.assertFalse(self.audit()['public_running_adapter_not_falsely_promoted'])
if __name__=='__main__':unittest.main()
