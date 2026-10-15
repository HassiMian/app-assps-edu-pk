#!/usr/bin/env python3
"""Fail-closed negative tests for current Core+Connect candidate technical parity."""
import importlib.util
import tempfile
import unittest
from pathlib import Path

HERE=Path(__file__).resolve().parent
SPEC=importlib.util.spec_from_file_location("joint_verifier",HERE/"verify-joint-current-candidates-20261015.py")
m=importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(m)

class CombinedCandidateTests(unittest.TestCase):
    def setUp(self):
        t=tempfile.TemporaryDirectory()
        self.addCleanup(t.cleanup)
        base=Path(t.name)
        self.src=base/"core"
        self.stage=base/"stage"
        self.live=base/"live"
        self.nxt=base/"connect"
        for f in m.REVIEWED:
            for p in [self.src/f,self.stage/"src"/f]:
                p.parent.mkdir(parents=True,exist_ok=True)
                p.write_text("REVIEWED "+f)
        for f in m.PRESERVE:
            for p in [self.live/"src"/f,self.stage/"src"/f]:
                p.parent.mkdir(parents=True,exist_ok=True)
                p.write_text("PRESERVED "+f)
        (self.nxt/".next").mkdir(parents=True)
        (self.nxt/".next"/"BUILD_ID").write_text("QA_BUILD")
        (self.nxt/"src").mkdir(parents=True)
        (self.nxt/"src"/"proxy.ts").write_text("qa_proxy")
        self.hash=m.sha(self.stage/"src"/m.REVIEWED[0])
        self.proxy=m.sha(self.nxt/"src"/"proxy.ts")

    def probe(self):
        return m.artifacts(self.src,self.stage,self.live,self.nxt,self.hash,"QA_BUILD",self.proxy)

    def test_good_readonly_fixture(self):
        self.assertTrue(all(self.probe().values()))
    def test_stale_adapter_fails(self):
        (self.stage/"src"/m.REVIEWED[0]).write_text("WRONG ADAPTER")
        a=self.probe()
        self.assertFalse(a["exact_hardened_worker_sha"])
        self.assertFalse(a["reviewed_services_ai_aiQueueWorkerDatabase.js"])
    def test_worker_route_stale_fails(self):
        (self.stage/"src/routes/opsRoutes.js").write_text("OTHER OPS")
        self.assertFalse(self.probe()["reviewed_routes_opsRoutes.js"])
    def test_worker_queue_stale_fails(self):
        (self.stage/"src/services/ai/paperAiQueue.js").write_text("WRONG QUEUE")
        self.assertFalse(self.probe()["reviewed_services_ai_paperAiQueue.js"])
    def test_concurrent_lesson_plan_change_fails(self):
        (self.live/"src/routes/lessonPlanRoutes.js").write_text("CONCURRENT CHANGE")
        self.assertFalse(self.probe()["live_preserved_routes_lessonPlanRoutes.js"])
    def test_live_server_change_fails(self):
        (self.live/"src/server.js").write_text("CONCURRENT SERVER CHANGE")
        self.assertFalse(self.probe()["live_preserved_server.js"])
    def test_backend_env_exfiltration_blocked(self):
        (self.stage/".env").write_text("SECRET")
        self.assertFalse(self.probe()["no_private_backend_env_in_stage"])
    def test_next_env_exfiltration_blocked(self):
        (self.nxt/".env").write_text("SECRET")
        self.assertFalse(self.probe()["no_private_next_env_in_stage"])
    def test_wrong_connect_compiled_build_fails(self):
        (self.nxt/".next/BUILD_ID").write_text("STALE")
        self.assertFalse(self.probe()["new_next_compiled_build_id"])
    def test_wrong_proxy_fails(self):
        (self.nxt/"src/proxy.ts").write_text("ADMIN BIAS")
        self.assertFalse(self.probe()["new_next_proxy_matches_review"])
    def test_missing_compiled_binary_fails(self):
        (self.nxt/".next/BUILD_ID").unlink()
        self.assertFalse(self.probe()["new_next_compiled_build_id"])

if __name__=="__main__":
    unittest.main(verbosity=2)
