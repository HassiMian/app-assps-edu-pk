"""Private release guard tests. No live Nginx, PM2, credentials or databases."""
import importlib.util
from pathlib import Path
import tempfile
import unittest

REPO=Path(__file__).resolve().parents[3]
PATH=REPO/'ops/release/guarded-lesson-planner-rollout.py'
spec=importlib.util.spec_from_file_location('guarded_lesson_rollout',PATH)
gate=importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


class ReleaseGuardTests(unittest.TestCase):
    def test_running_backend_must_match_reviewed_academic_guard(self):
        with tempfile.TemporaryDirectory(prefix='assps-ui-test-repo-') as root:
            repo=Path(root)/'repo'
            runtime=Path(root)/'runtime'
            review=repo/'al-siddique-backend/src/services'
            actual=runtime/'src/services'
            route=runtime/'src/routes'
            review.mkdir(parents=True)
            actual.mkdir(parents=True)
            route.mkdir(parents=True)
            (review/'lessonPlanningPublicationGuard.js').write_text('synthetic guarded module')
            (actual/'lessonPlanningPublicationGuard.js').write_text('synthetic guarded module')
            (route/'lessonPlanRoutes.js').write_text(
                'lessonPlanningPublicationGuard '
                'mustHoldLessonPublication privateLessonMutationAllowed '
                'LESSON_PLAN_ACADEMIC_APPROVAL_REQUIRED LESSON_PLAN_ACADEMIC_SOURCE_LOCKED')
            self.assertTrue(gate.check_running_backend_provenance(repo,runtime))
            (actual/'lessonPlanningPublicationGuard.js').write_text('synthetic stale unreviewed copy')
            with self.assertRaisesRegex(RuntimeError,'differs'):
                gate.check_running_backend_provenance(repo,runtime)

    def test_old_backend_missing_source_lock_rejected(self):
        with tempfile.TemporaryDirectory(prefix='assps-ui-test-guard-') as root:
            repo=Path(root)/'repo'
            runtime=Path(root)/'runtime'
            review=repo/'al-siddique-backend/src/services'
            actual=runtime/'src/services'
            route=runtime/'src/routes'
            review.mkdir(parents=True)
            actual.mkdir(parents=True)
            route.mkdir(parents=True)
            for p in (review,actual):
                (p/'lessonPlanningPublicationGuard.js').write_text('same verified module')
            (route/'lessonPlanRoutes.js').write_text('mustHoldLessonPublication')
            with self.assertRaisesRegex(RuntimeError,'lacks'):
                gate.check_running_backend_provenance(repo,runtime)

    def test_backend_guard_missing_never_grants_approval(self):
        with tempfile.TemporaryDirectory(prefix='assps-ui-test-missing-') as root:
            with self.assertRaisesRegex(RuntimeError,'NOT live'):
                gate.check_running_backend_provenance(Path(root),Path(root))

if __name__=='__main__':
    unittest.main()
