"""Static release-boundary tests; never stages or changes production."""
import pathlib
import unittest
ROOT=pathlib.Path(__file__).resolve().parents[3]
SH=(ROOT/'ops/release/signed-bluegreen/stage-current-live-backend-ai-worker-20261015.sh').read_text()
class StageSafety(unittest.TestCase):
 def test_no_live_overwrite(self):
  self.assertIn('rsync -a --exclude=',SH)
  self.assertIn('"$LIVE/" "$DEST/"',SH)
  self.assertNotIn('"$DEST/" "$LIVE/"',SH)
  self.assertIn('candidate exists; never overwrite',SH)
 def test_live_lesson_plan_guard(self):
  self.assertIn('cmp "$LIVE/src/routes/lessonPlanRoutes.js" "$DEST/src/routes/lessonPlanRoutes.js"',SH)
  self.assertIn('live backend changed mid-stage',SH)
 def test_encrypted_secrets_excluded(self):
  for x in ("--exclude='.env'", "--exclude='.env.*'","--exclude='*.key'","--exclude='*.pem'"):
   self.assertIn(x,SH)
 def test_core_only_three_modules(self):
  self.assertIn('services/ai/aiQueueWorkerDatabase.js services/ai/paperAiQueue.js routes/opsRoutes.js',SH)
  self.assertNotIn('pm2 restart',SH.lower())
  self.assertNotIn('nginx -s reload',SH.lower())
if __name__=='__main__':unittest.main()
