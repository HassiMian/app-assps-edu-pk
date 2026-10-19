#!/usr/bin/env python3
"""Pure fake/synthetic unprivileged test cases for unified preflight decision logic."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

path=Path(__file__).with_name("unified_readonly_release_preflight.py")
spec=importlib.util.spec_from_file_location("unified",path)
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)

class DecisionTests(unittest.TestCase):
    def sample(self, **overrides):
        return {**mod.LOCKED,**mod.GLOBAL_MINIMUMS,
                "null_marks":0,"total_students":326,"school1_lesson_plans":3,**overrides}

    def test_known_historical_db_snapshot_pass(self):
        self.assertTrue(mod.validate_counts(self.sample()))
    def test_single_zero_score_removed_causes_hold(self):
        self.assertFalse(mod.validate_counts(self.sample(true_zero_marks=223)))
    def test_first_term_regression_causes_hold(self):
        self.assertFalse(mod.validate_counts(self.sample(firstterm_exam9_rows=1852)))
    def test_future_term_unmarked_placeholder_is_not_firstterm_corruption(self):
        self.assertTrue(mod.validate_counts(self.sample(exam_results=1855,null_marks=1)))
    def test_firstterm_null_change_causes_hold(self):
        self.assertFalse(mod.validate_counts(self.sample(firstterm_exam9_nulls=1)))
    def test_new_term_real_zero_preserved_without_global_baseline_change(self):
        self.assertTrue(mod.validate_counts(self.sample(exam_results=1855,true_zero_marks=225)))
    def test_integer_counts_only(self):
        self.assertFalse(mod.validate_counts(self.sample(exam_results="1854")))
    def test_explicit_source_hold_prevents_global_pass(self):
        g=[mod.make_gate("first_term_sha",True,"data","PASS"),mod.make_gate("source",False,"provenance","HOLD","drift")]
        d=mod.evaluate(g)
        self.assertFalse(d["all_implemented_preflight_pass"])
        self.assertEqual(d["hold_gate_ids"],["source"])
    def test_no_hold_does_not_mean_full_certification(self):
        x=mod.evaluate([mod.make_gate("history",True,"data","PASS")])
        self.assertTrue(x["all_implemented_preflight_pass"])
        self.assertEqual(x["production_full_certification"],"NOT_CERTIFIED")
    def test_duplicate_gate_rejected(self):
        x=mod.make_gate("same",True,"data","ok")
        with self.assertRaises(ValueError):
            mod.evaluate([x,x])
    def test_receipt_exclusive_create_never_overwrites(self):
        with tempfile.TemporaryDirectory() as root:
            p=Path(root)/"receipt.json"
            report={"private":"synthetic"}
            original=mod.create_receipt(p,report)
            self.assertEqual(len(original),64)
            before=p.read_bytes()
            with self.assertRaises(FileExistsError):
                mod.create_receipt(p,report)
            self.assertEqual(p.read_bytes(),before)
            self.assertEqual(p.stat().st_mode&0o777,0o600)
    def test_parse_db_json_single_record(self):
        raw="BEGIN\n"+json.dumps(self.sample())+"\nCOMMIT\n"
        self.assertEqual(mod.parse_db_json(raw)["exam_results"],1854)
        with self.assertRaises(ValueError):
            mod.parse_db_json("{}\n{}\n")
if __name__=="__main__":
    unittest.main()
