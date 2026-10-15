"""Hermetic release postflight regression: no production traffic or credentials."""
from pathlib import Path
from types import SimpleNamespace
import textwrap
import unittest

ROLLOUT = Path(__file__).resolve().parents[1] / "release/guarded-lesson-planner-rollout.py"
MARK = "            # Verify ALL protected teacher-facing routes on the staged, now-live"
END = "            plan.update(decision='FRONTEND_ONLY_PROMOTED_CORE_VERIFIED',"
EXPECTED = (
    "Marks GET tenant/session routing",
    "Saved Marks View/Print",
    "Ten premium Result Cards templates",
    "Result Cards V3 roster/grade/print integrity",
    "Owner-accepted Result Cards and Employees local source",
    "Daily Diary 11-controller preservation",
)


def exercise(*, failed_label=None, lesson_ok=True, companion_ok=True):
    source = ROLLOUT.read_text()
    assert source.count(MARK) == 1 and source.count(END) == 1
    selected = source.split(MARK, 1)[1].split(END, 1)[0]
    assert "success=True" in selected and "check_core(args)" in source
    fn_source = "def synthetic_postflight():\n    success=False\n" + textwrap.indent(
        textwrap.dedent(selected), "    "
    ) + "\n    return success\n"
    calls = []
    def fake_run(argv):
        label = next((x for x in EXPECTED if (
            "test-marksonly-ingress" in str(argv) and x == EXPECTED[0]
            or "verify-marks-register-ui" in str(argv) and x == EXPECTED[1]
            or "verify-resultcards-v2" in str(argv) and x == EXPECTED[2]
            or "verify-resultcards-v3" in str(argv) and x == EXPECTED[3]
            or "resultcards-owner-acceptance-and-employee-source" in str(argv) and x == EXPECTED[4]
            or "verify-diary-controls" in str(argv) and x == EXPECTED[5]
        )), None)
        if label is None:
            raise AssertionError(f"Unexpected postflight command: {argv}")
        calls.append(label)
        return SimpleNamespace(returncode=int(label == failed_label),
                               stderr="synthetic guard rejection", stdout="")
    ns = dict(
        mod=SimpleNamespace(validate=lambda *_: {"pass": lesson_ok}),
        companion_module=SimpleNamespace(
            evaluate=lambda *_: {"result": "PASS" if companion_ok else "HOLD"}
        ),
        repo=Path("/synthetic/repo"), newroot=Path("/synthetic/not-live"),
        contract={}, companions_contract={},
        ingress=Path("/synthetic/test-marksonly-ingress-contract-20261011.py"),
        marks_guard=Path("/synthetic/verify-marks-register-ui-20261015.cjs"),
        results_guard=Path("/synthetic/verify-resultcards-v2-active-20261015.cjs"),
        academic_v3_guard=Path("/synthetic/verify-resultcards-v3-active-20261015.cjs"),
        owner_acceptance_contract=Path("/synthetic/resultcards-owner-acceptance-and-employee-source-20261016.test.cjs"),
        diary_guard=Path("/synthetic/verify-diary-controls-in-active-bundle-20261015.cjs"),
        run=fake_run,
    )
    exec(compile(fn_source, "<synthetic-postflight>", "exec"), ns)
    return ns["synthetic_postflight"](), calls


class PostflightGate(unittest.TestCase):
    def test_all_five_postflight_guards_must_pass(self):
        ok, calls = exercise()
        self.assertTrue(ok)
        self.assertEqual(calls, list(EXPECTED))

    def test_each_guard_failure_blocks_success_and_rollback_is_not_skipped(self):
        for label in EXPECTED:
            with self.subTest(failed_guard=label):
                with self.assertRaisesRegex(RuntimeError, "FAIL_CLOSED: .*postflight failed"):
                    exercise(failed_label=label)

    def test_lesson_planner_failure_blocks_before_any_module_checks(self):
        with self.assertRaisesRegex(RuntimeError, "Lesson Planner V5 postflight failed"):
            exercise(lesson_ok=False)

    def test_early_years_failure_blocks_before_any_module_checks(self):
        with self.assertRaisesRegex(RuntimeError, "Early Years printer postflight failed"):
            exercise(companion_ok=False)

    def test_real_release_gate_precedes_every_production_write(self):
        source=ROLLOUT.read_text()
        self.assertLess(source.index("    check_core(args)"),
                        source.index("    with LOCK.open('a+')"))
        self.assertLess(source.index("    check_running_backend_provenance(repo)"),
                        source.index("    with LOCK.open('a+')"))
        self.assertLess(source.index(MARK),
                        source.index("            success=True", source.index(MARK)))
        self.assertIn("            if not success:",source)
        self.assertIn("                run(['systemctl','reload','nginx'])",source)


if __name__=="__main__":
    unittest.main()
