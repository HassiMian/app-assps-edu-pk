import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("paper_readiness", HERE / "verify_full_feature_readiness_20261016.py")
guard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guard)

def accepted(name):
    return {
        "resultCardsV3": {"status": "PASS", "distinctPremiumTemplates": 10},
        "savedMarks": {"status": "PASS"},
        "dailyDiary": {"prePromotionDecision": "PASS_DIARY_ACTIVE_CONTROLLER_PRESERVATION_ONLY"},
        "lessonPlannerV5": {"pass": True, "result": "PASS"},
        "earlyYearsPrint": {"result": "PASS", "checks": {"editor": True, "printer": True}}
    }[name]

class ReadinessTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        root = Path(self.temp.name)
        self.repo = root / "repo"
        release = self.repo / guard.RELEASE
        release.mkdir(parents=True)
        for _, _, name in guard.PROBES:
            (release / name).write_text("fixture")
        self.dist = root / "dist"
        self.dist.mkdir()
        (self.dist / "index.html").write_text("<html>fixture</html>")

    def runner(self, fail=(), invalid=(), nonzero=()):
        def run(argv, **kwargs):
            self.assertFalse(kwargs.get("shell"))
            self.assertTrue(kwargs.get("check") is False)
            name = next(n for n, _, file in guard.PROBES if file == Path(argv[1]).name)
            payload = accepted(name) if name not in fail else {"result": "HOLD", "pass": False}
            return subprocess.CompletedProcess(argv, 2 if name in nonzero else 0,
                "{invalid" if name in invalid else json.dumps(payload), "")
        return run

    def test_all_static_pass_never_approves_deployment(self):
        r = guard.run_matrix(self.repo, self.dist, self.runner())
        self.assertEqual(r["fullFeatureReadiness"], "STATIC_FEATURES_PASS")
        self.assertFalse(r["productionReleaseAuthorized"])
        self.assertFalse(r["studentRecordsChanged"])

    def test_diary_pass_cannot_hide_lesson_failure(self):
        r = guard.run_matrix(self.repo, self.dist, self.runner(fail=("lessonPlannerV5",)))
        self.assertEqual(r["checks"]["dailyDiary"]["status"], "PASS")
        self.assertEqual(r["fullFeatureReadiness"], "HOLD")

    def test_early_years_fail_blocks_readiness(self):
        r = guard.run_matrix(self.repo, self.dist, self.runner(fail=("earlyYearsPrint",)))
        self.assertEqual(r["checks"]["earlyYearsPrint"]["status"], "HOLD")

    def test_non_json_or_nonzero_blocks_readiness(self):
        r = guard.run_matrix(self.repo, self.dist,
                             self.runner(invalid=("savedMarks",), nonzero=("resultCardsV3",)))
        self.assertEqual(r["fullFeatureReadiness"], "HOLD")
        self.assertEqual(r["checks"]["savedMarks"]["reason"], "NON_JSON_VERIFIER_OUTPUT")

    def test_missing_guard_blocks_readiness(self):
        (self.repo / guard.RELEASE / "check-lesson-planner-ui.py").unlink()
        r = guard.run_matrix(self.repo, self.dist, self.runner())
        self.assertEqual(r["checks"]["lessonPlannerV5"]["reason"], "MISSING_REVIEWED_VERIFIER")

    def test_symlink_and_missing_index_rejected(self):
        link = Path(self.temp.name) / "linked"
        link.symlink_to(self.dist, target_is_directory=True)
        with self.assertRaises(ValueError):
            guard.run_matrix(self.repo, link, self.runner())
        (self.dist / "index.html").unlink()
        with self.assertRaises(ValueError):
            guard.run_matrix(self.repo, self.dist, self.runner())

    def test_timeout_is_fail_closed(self):
        def broken(argv, **kwargs):
            raise subprocess.TimeoutExpired(argv, kwargs["timeout"])
        r = guard.run_matrix(self.repo, self.dist, broken)
        self.assertEqual(r["fullFeatureReadiness"], "HOLD")
        self.assertTrue(all(x["status"] == "HOLD" for x in r["checks"].values()))

    def test_partial_or_fake_evidence_rejected(self):
        self.assertFalse(guard.verdict("earlyYearsPrint", {"result": "PASS", "checks": {}}, 0))
        self.assertFalse(guard.verdict("lessonPlannerV5", {"pass": False, "result": "PASS"}, 0))
        self.assertFalse(guard.verdict("resultCardsV3",
            {"status": "PASS", "distinctPremiumTemplates": 9}, 0))


if __name__ == "__main__":
    unittest.main()
