"""Hermetic rollback/source-ancestry tests for non-public Phase 1 backend staging."""
import contextlib
import hashlib
import importlib.util
import io
import json
import pathlib
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

HERE = pathlib.Path(__file__).resolve().parents[1]
TOOL = HERE / 'release/phase1-backend-isolated-stage-20261016.py'
spec = importlib.util.spec_from_file_location('phase1_stage_module', TOOL)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class Phase1StagingGuard(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='assps-phase1-hermetic-')
        self.addCleanup(self.tmp.cleanup)
        base = pathlib.Path(self.tmp.name)
        self.repo, self.live, self.private = base/'repo', base/'live/src', base/'private'
        self.repo.mkdir()
        self.live.mkdir(parents=True)
        self.private.mkdir(mode=0o700)
        subprocess.run(['git', '-C', str(self.repo), 'init', '-q'], check=True)
        subprocess.run(['git', '-C', str(self.repo), 'config', 'user.email', 'qa@invalid.example'], check=True)
        subprocess.run(['git', '-C', str(self.repo), 'config', 'user.name', 'ASSPS Hermetic QA'], check=True)
        reviewed = self.repo/'al-siddique-backend/src'
        for rel in module.OVERLAYS:
            src = reviewed/rel
            src.parent.mkdir(parents=True,exist_ok=True)
            src.write_text("'use strict'; module.exports = { protected: true };\n")
        for rel in module.ORIGINALS:
            src = self.live/rel
            src.parent.mkdir(parents=True,exist_ok=True)
            src.write_text("'use strict'; module.exports = { oldBlue: true };\n")
        (self.live/'.env').write_text('NEVER_COPY_PRODUCTION_SECRET=synthetic-test-value\n')
        (self.live/'.env.production').write_text('OTHER_SECRET=synthetic-only\n')
        (self.live/'node_modules').symlink_to(self.private)
        subprocess.run(['git','-C',str(self.repo),'add','.'],check=True)
        subprocess.run(['git','-C',str(self.repo),'commit','-qm','isolated fake fixture'],check=True)
        self.base = subprocess.check_output(['git','-C',str(self.repo),'rev-parse','HEAD'],text=True).strip()
        self.sha = {rel:hashlib.sha256((self.live/rel).read_bytes()).hexdigest() for rel in module.ORIGINALS}
        self.patchers = [mock.patch.object(module,'DEFAULT_LIVE',self.live),
                         mock.patch.object(module,'PRIVATE_ROOT',self.private),
                         mock.patch.object(module,'BASE_COMMIT',self.base)]
        for patcher in self.patchers:
            patcher.start()
            self.addCleanup(patcher.stop)

    def invoke(self, *, stage=True, incorrect=False):
        args=['phase1-backend-isolated-stage-20261016.py','--repo',str(self.repo),
              '--live-src',str(self.live),
              '--expected-live-lessons',('0'*64 if incorrect else self.sha['routes/lessonPlanRoutes.js']),
              '--expected-live-ops',self.sha['routes/opsRoutes.js'],
              '--expected-live-queue',self.sha['services/ai/paperAiQueue.js']]
        if stage: args.append('--stage')
        sink=io.StringIO()
        with mock.patch.object(sys,'argv',args),contextlib.redirect_stdout(sink):
            result=module.main()
        return result,json.loads(sink.getvalue())

    def test_staging_copies_only_reviewed_code_and_protects_originals(self):
        before={r:(self.live/r).read_bytes() for r in module.ORIGINALS}
        rc,report=self.invoke()
        self.assertEqual(rc,0)
        self.assertEqual(report['decision'],'PRIVATE_STAGE_READY_NOT_DEPLOYED')
        root=pathlib.Path(report['stage'])
        self.assertTrue(root.is_dir())
        self.assertEqual(len(report['stage_shas']),5)
        self.assertFalse((root/'src/.env').exists())
        self.assertFalse((root/'src/.env.production').exists())
        self.assertFalse((root/'src/node_modules').exists())
        self.assertTrue((root/'live-original-three-files.tar.gz').is_file())
        self.assertEqual({r:(self.live/r).read_bytes() for r in module.ORIGINALS},before)
        self.assertFalse(report['production_backend_changed'])
        self.assertFalse(report['signed_core_security_certified'])

    def test_old_sha_blocks_release_before_any_staging(self):
        with self.assertRaisesRegex(RuntimeError,'Live source SHA changed'):
            self.invoke(incorrect=True)
        self.assertEqual(list(self.private.iterdir()),[])

    def test_immutable_stage_rejects_overwrite(self):
        self.invoke()
        with self.assertRaisesRegex(RuntimeError,'Immutable stage already exists'):
            self.invoke()

    def test_dirty_source_and_unrequested_stage_are_safe(self):
        rc,report=self.invoke(stage=False)
        self.assertEqual(rc,0)
        self.assertEqual(report['decision'],'SAFE_TO_STAGE_SOURCE_ONLY')
        self.assertEqual(list(self.private.iterdir()),[])
        (self.repo/'unreviewed').write_text('in-flight agent file')
        with self.assertRaisesRegex(RuntimeError,'Candidate source worktree is dirty'):
            self.invoke()
        self.assertEqual(list(self.private.iterdir()),[])

if __name__=='__main__':unittest.main()
