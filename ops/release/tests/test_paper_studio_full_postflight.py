"""Hermetic failure-mode tests: no Nginx reload, DB or live files."""
import importlib.util
from pathlib import Path
from types import SimpleNamespace
import unittest

REPO = Path(__file__).resolve().parents[3]
SOURCE = REPO / 'ops/release/guarded-lesson-planner-rollout.py'
spec = importlib.util.spec_from_file_location('full_postflight', SOURCE)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class Checker:
    def __init__(self, result):
        self.result = result
    def validate(self, *args):
        return self.result
    def evaluate(self, *args):
        return self.result


class FullPostflightTests(unittest.TestCase):
    def run_gate(self, lesson, companions, diary_exit):
        return mod.verify_full_paper_studio_postflight(
            Path('/synthetic/immutable'), Path('/synthetic/repo'),
            Checker(lesson), {}, Checker(companions), {},
            Path('/synthetic/guard.cjs'),
            runner=lambda args: SimpleNamespace(returncode=diary_exit))

    def test_all_three_pass(self):
        self.assertTrue(self.run_gate({'pass': True}, {'result': 'PASS'}, 0))

    def test_missing_lesson_fails(self):
        with self.assertRaisesRegex(RuntimeError, 'Lesson Planner V5'):
            self.run_gate({'pass': False}, {'result': 'PASS'}, 0)

    def test_missing_early_years_fails(self):
        with self.assertRaisesRegex(RuntimeError, 'Early Years'):
            self.run_gate({'pass': True}, {'result': 'HOLD'}, 0)

    def test_missing_diary_controller_fails(self):
        with self.assertRaisesRegex(RuntimeError, 'Diary controller'):
            self.run_gate({'pass': True}, {'result': 'PASS'}, 2)


if __name__ == '__main__':
    unittest.main()
