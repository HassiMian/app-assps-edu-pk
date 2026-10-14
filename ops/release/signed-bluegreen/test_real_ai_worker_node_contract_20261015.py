"""Adversarial static constraints for real SCRAM Node/PG disposable QA."""
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
RUN=(ROOT/'ops/release/signed-bluegreen/replay-real-ai-worker-node-55477-20261015.sh').read_text()
NODE=(ROOT/'al-siddique-backend/src/services/ai/qa-ai-worker-real-socket-20261015.js').read_text()
class QaWorkerNodeContract(unittest.TestCase):
 def test_isolated_db_port_only(self):
  self.assertIn("PORT=55477",RUN)
  self.assertIn("DB_AI_WORKER_PORT=\"$PORT\"",RUN)
  self.assertIn("process.env.DB_AI_WORKER_PORT, '55477'",NODE)
  self.assertNotIn("-p5432 -d apexos",RUN)
 def test_source_restore_uses_all_acls_and_owners(self):
  self.assertIn("pg_restore -p\"$PORT\" -d apexos --exit-on-error",RUN)
  self.assertNotIn("pg_restore -O",RUN)
  self.assertNotIn("pg_restore -x",RUN)
 def test_ephemeral_scram_and_no_password_exposure(self):
  self.assertIn("scram-sha-256",RUN)
  self.assertIn("openssl rand -hex 32",RUN)
  self.assertNotIn("echo \"$password\"",RUN)
  self.assertNotIn("pg_dumpall",RUN)
 def test_disposable_clone_cleanup(self):
  self.assertIn("trap cleanup EXIT",RUN)
  self.assertIn("pg_ctl -D \"$Q\" -m immediate stop",RUN)
  self.assertIn("rm -rf -- \"$Q\"",RUN)
 def test_worker_never_trusts_prod_port(self):
  self.assertIn("process.env.ASSPS_ISOLATED_QA, 'yes'",NODE)
  self.assertIn("process.env.DB_AI_WORKER_HOST, '/var/run/postgresql'",NODE)
  self.assertIn("process.env.DB_SIGNED_TENANT_RLS_ENABLED, 'true'",NODE)
 def test_forbidden_global_tables_negatives(self):
  for name in ('organizations','campuses','admin_block_audit_log'):
   self.assertIn("'"+name+"'",NODE)
  self.assertIn("err.code === '42501'",NODE)
 def test_positive_real_worker_api_write(self):
  for name in ('ai_jobs','ai_queue_events','ai_queue_state'):
   self.assertIn("'"+name+"'",NODE)
  self.assertIn("UPDATE public.ai_queue_state",NODE)
  self.assertIn("INSERT INTO public.ai_queue_state",NODE)
 def test_school_marks_never_changed(self):
  self.assertIn("1762:213",RUN)
  self.assertIn("QA_OFFICIAL_MARKS_ZERO_DATA_LOSS",RUN)
  self.assertNotIn("UPDATE exam_results",RUN)
if __name__=='__main__':unittest.main()
