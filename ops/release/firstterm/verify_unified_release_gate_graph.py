#!/usr/bin/env python3
"""Pure source-only ASSPS unified release-graph validator. No data or deployment access."""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import sys

REQUIRED_POLICIES={
 "NO_FALSE_PASS","NO_LIVE_DB_WRITES_UNTIL_REVIEWED","NO_HISTORICAL_EXAM_RESET",
 "NO_SIGNATURE_FORGERY","NO_CREDENTIAL_IMPERSONATION","NO_BLIND_SOURCE_DEPLOY",
 "REUSE_EXISTING_SINGLE_AUTOMATION"
}

def validate(g):
    errors=[]
    if not isinstance(g,dict) or g.get("schema")!="ASSPS_UNIFIED_RELEASE_GATES_V1":
        return ["INVALID_SCHEMA"]
    if g.get("programme")!="ASSPS-UNIFIED-20261019":
        errors.append("WRONG_PROGRAMME")
    policies=g.get("policies")
    if not isinstance(policies,dict) or not all(policies.get(k) is True for k in REQUIRED_POLICIES):
        errors.append("MISSING_MANDATORY_SAFETY_POLICY")
    phases=g.get("phases")
    if not isinstance(phases,list):
        return errors+["MISSING_PHASE_LIST"]
    ids=[p.get("id") for p in phases if isinstance(p,dict)]
    if len(ids)!=len(phases) or len(set(ids))!=len(ids) or set(ids)!={f"P{i}" for i in range(9)}:
        errors.append("MISSING_DUPLICATE_OR_INVALID_PHASE")
        return errors
    pmap={p["id"]:p for p in phases}
    for p in phases:
        phase=p["id"]
        dependencies=p.get("depends_on")
        if not isinstance(dependencies,list) or len(dependencies)!=len(set(dependencies)):
            errors.append("MALFORMED_DEPENDENCIES_"+phase)
            continue
        if not dependencies and phase!="P0":
            errors.append("UNCONNECTED_NONROOT_"+phase)
        for parent in dependencies:
            if parent not in pmap or parent==phase:
                errors.append("UNKNOWN_OR_SELF_PARENT_"+phase)
        checks=p.get("checks")
        if not isinstance(checks,list) or not checks or len(checks)!=len(set(checks)) or not all(isinstance(c,str) and c.strip() for c in checks):
            errors.append("MISSING_OR_DUPLICATE_CHECKS_"+phase)
        status=p.get("state")
        if status not in ("hold","partial","pass"):
            errors.append("INVALID_PHASE_STATE_"+phase)
        if status=="pass":
            for parent in dependencies:
                if parent in pmap and pmap[parent].get("state")!="pass":
                    errors.append("PREMATURE_PHASE_PASS_"+phase)
    # Acyclic checked independently from order, to prevent forged all-pass transitions.
    visiting=set();visited=set()
    def visit(phase):
        if phase in visited:return
        if phase in visiting:
            errors.append("DEPENDENCY_CYCLE")
            return
        visiting.add(phase)
        for dep in pmap[phase].get("depends_on",[]):
            if dep in pmap and dep!=phase:visit(dep)
        visiting.remove(phase);visited.add(phase)
    for phase in pmap:visit(phase)
    required={"P1":{"P0"},"P2":{"P0","P1"},"P3":{"P0","P2"},
              "P4":{"P0","P2","P3"},"P5":{"P0","P2"},
              "P6":{"P1","P2","P3","P4","P5"},
              "P7":{"P0","P1","P2","P3","P4","P5","P6"},
              "P8":{"P7"}}
    for phase,parents in required.items():
        if not parents.issubset(set(pmap[phase].get("depends_on",[]))):
            errors.append("MISSING_REQUIRED_DEPENDENCY_"+phase)
    if pmap["P8"].get("state")=="pass" and any(p.get("state")!="pass" for p in phases):
        errors.append("FALSE_FINAL_CERTIFICATION")
    return sorted(set(errors))

def main(argv=None):
    parser=argparse.ArgumentParser()
    parser.add_argument("--graph",required=True)
    args=parser.parse_args(argv)
    try:
        graph=json.loads(Path(args.graph).read_text(encoding="utf-8"))
        problems=validate(graph)
    except (OSError,ValueError,UnicodeError) as e:
        print("HOLD_UNIFIED_GRAPH_INVALID",type(e).__name__)
        return 2
    if problems:
        print("HOLD_UNIFIED_GRAPH_INVALID",",".join(problems))
        return 2
    print("UNIFIED_GRAPH_CONTRACT_PASS","9 phases","29 gates","final",graph["phases"][-1]["state"])
    return 0

if __name__=="__main__":
    sys.exit(main())
