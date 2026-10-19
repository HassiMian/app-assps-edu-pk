#!/usr/bin/env python3
import copy
import importlib.util
import json
from pathlib import Path
import unittest

path=Path(__file__).with_name("verify_unified_release_gate_graph.py")
spec=importlib.util.spec_from_file_location("gates",path)
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
ROOT=path.parents[3]
GRAPH=ROOT/"docs/coordination/ASSPS_UNIFIED_RELEASE_GATE_GRAPH_20261019.json"

class GateGraphContractTest(unittest.TestCase):
    def setUp(self):
        self.good=json.loads(GRAPH.read_text(encoding="utf-8"))
    def test_current_unified_architecture_valid(self):
        self.assertEqual(module.validate(self.good),[])
    def test_missing_safety_policy_hold(self):
        x=copy.deepcopy(self.good)
        x["policies"]["NO_HISTORICAL_EXAM_RESET"]=False
        self.assertIn("MISSING_MANDATORY_SAFETY_POLICY",module.validate(x))
    def test_no_duplicate_missions_or_phase_id(self):
        x=copy.deepcopy(self.good)
        x["phases"][-1]["id"]="P0"
        self.assertIn("MISSING_DUPLICATE_OR_INVALID_PHASE",module.validate(x))
    def test_cyclic_dependency_blocks(self):
        x=copy.deepcopy(self.good)
        x["phases"][0]["depends_on"]=["P8"]
        self.assertIn("DEPENDENCY_CYCLE",module.validate(x))
    def test_final_release_cannot_skip_integrated_acceptance(self):
        x=copy.deepcopy(self.good)
        x["phases"][7]["depends_on"]=["P0","P1","P2","P3","P4","P5"]
        self.assertIn("MISSING_REQUIRED_DEPENDENCY_P7",module.validate(x))
    def test_source_hold_prevents_premature_security_pass(self):
        x=copy.deepcopy(self.good)
        x["phases"][2]["state"]="pass"
        self.assertIn("PREMATURE_PHASE_PASS_P2",module.validate(x))
    def test_cannot_publish_full_done_while_any_gate_is_hold(self):
        x=copy.deepcopy(self.good)
        x["phases"][8]["state"]="pass"
        problems=module.validate(x)
        self.assertIn("FALSE_FINAL_CERTIFICATION",problems)
    def test_missing_checks_fail(self):
        x=copy.deepcopy(self.good)
        x["phases"][0]["checks"]=[]
        self.assertIn("MISSING_OR_DUPLICATE_CHECKS_P0",module.validate(x))
    def test_no_new_unconnected_phase(self):
        x=copy.deepcopy(self.good)
        x["phases"][4]["depends_on"]=[]
        self.assertIn("UNCONNECTED_NONROOT_P4",module.validate(x))

if __name__=="__main__":
    unittest.main()
