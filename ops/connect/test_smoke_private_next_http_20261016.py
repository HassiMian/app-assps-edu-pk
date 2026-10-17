#!/usr/bin/env python3
"""Adversarial unit tests for private role-neutral Connect HTTP acceptance."""
import importlib.util
import hashlib
import json
import subprocess
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).with_name("smoke_private_next_http_20261016.py")
spec = importlib.util.spec_from_file_location("private_smoke", SCRIPT)
smoke = importlib.util.module_from_spec(spec)
spec.loader.exec_module(smoke)


def original_private_stage_available(stage):
    # Hosted runners cannot traverse /root; absence is not QA certification.
    try:
        return stage.is_dir()
    except OSError:
        return False


def synthetic_stage(stage, files=None):
    """Build disposable inert source; never run Next or contact production."""
    stage.mkdir()
    lint=b'export default [];\n'
    (stage/'eslint.config.mjs').write_bytes(lint)
    build='SYNTHETIC_REVIEWED_QA_ONLY'
    (stage/'.next/server').mkdir(parents=True)
    (stage/'.next/BUILD_ID').write_text(build)
    binary=stage/'node_modules/.bin/next'
    binary.parent.mkdir(parents=True)
    binary.write_text('#!/bin/sh\nexit 1\n')
    binary.chmod(0o700)
    for rel,contents in (files or {}).items():
        path=stage/rel
        path.parent.mkdir(parents=True,exist_ok=True)
        path.write_bytes(contents)
    def git(*args):
        return subprocess.run(['git','-C',str(stage),*args],check=True,
                              capture_output=True,text=True).stdout.strip()
    git('init','-q')
    git('add','.')
    git('-c','user.name=ASSPS QA','-c','user.email=qa@example.invalid',
        'commit','-q','-m','synthetic QA-only fixture')
    return build,git('rev-parse','HEAD'),hashlib.sha256(lint).hexdigest()


class PrivateConnectSmokeTests(unittest.TestCase):
    def test_good_dashboard(self):
        self.assertTrue(smoke.assess("/dashboard", 307, "/login"))

    def test_good_dashboard_history(self):
        self.assertTrue(smoke.assess("/dashboard/history", 307, "/login"))

    def test_good_teacher(self):
        self.assertTrue(smoke.assess("/teacher", 302, "/login?next=%2Fteacher"))

    def test_private_apis_all_require_401(self):
        self.assertEqual(len(smoke.PRIVATE_API_PATHS), 6)
        for path in smoke.PRIVATE_API_PATHS:
            self.assertTrue(smoke.assess(path, 401, None), path)

    def test_private_apis_never_allow_200_or_redirect(self):
        for path in smoke.PRIVATE_API_PATHS:
            for status, location in ((200, None), (302, "/login"),
                                     (403, None), (500, None),
                                     (401, "https://attacker.example")):
                self.assertFalse(smoke.assess(path, status, location), path)

    def test_good_login(self):
        self.assertTrue(smoke.assess("/login", 200, None))

    def test_good_anon_auth_denial(self):
        self.assertTrue(smoke.assess("/api/auth/me", 401, None))

    def test_admin_fallback_rejected(self):
        self.assertFalse(smoke.assess("/dashboard", 307, "/login?next=%2Fadmin"))

    def test_history_admin_fallback_rejected(self):
        self.assertFalse(smoke.assess("/dashboard/history", 307, "/login?next=%2Fadmin"))

    def test_admin_teacher_rejected(self):
        self.assertFalse(smoke.assess("/teacher", 302, "/login?next=%2Fadmin"))

    def test_teacher_without_next_rejected(self):
        self.assertFalse(smoke.assess("/teacher", 302, "/login"))

    def test_teacher_external_redirect_rejected(self):
        self.assertFalse(smoke.assess("/teacher", 302, "https://attacker.example/login?next=/teacher"))

    def test_dashboard_redirect_chain_rejected(self):
        self.assertFalse(smoke.assess("/dashboard", 302, "/login?next=%2Fdashboard"))

    def test_auth_leak_rejected(self):
        self.assertFalse(smoke.assess("/api/auth/me", 200, None))

    def test_protected_dashboard_200_rejected(self):
        self.assertFalse(smoke.assess("/dashboard", 200, None))

    def test_login_redirect_loop_rejected(self):
        self.assertFalse(smoke.assess("/login", 302, "/login"))

    def test_missing_redirect_rejected(self):
        self.assertFalse(smoke.assess("/teacher", 302, None))

    def test_javascript_redirect_rejected(self):
        self.assertFalse(smoke.assess("/dashboard", 307, "javascript:alert(1)"))

    def test_exact_compiled_worktree_allowlisted(self):
        stage = smoke.REVIEWED_BUILD_STAGE
        if not original_private_stage_available(smoke.REVIEWED_BUILD_STAGE):
            self.skipTest("VPS-private stage unavailable; hermetic adversarial stage checks remain required")
        self.assertTrue(smoke.safe_stage(stage, smoke.REVIEWED_BUILD_ID))

    def test_exact_hardened_export_stage_qa_only_permit(self):
        if not original_private_stage_available(smoke.EXPORT_QA_STAGE):
            self.skipTest("VPS-private stage unavailable; hermetic adversarial stage checks remain required")
        self.assertTrue(smoke.safe_stage(smoke.EXPORT_QA_STAGE, smoke.EXPORT_QA_BUILD))
        self.assertFalse(smoke.safe_stage(smoke.EXPORT_QA_STAGE, smoke.REVIEWED_BUILD_ID))

    def test_export_stage_source_drift_rejected(self):
        from unittest.mock import patch
        if not original_private_stage_available(smoke.EXPORT_QA_STAGE):
            self.skipTest("VPS-private stage unavailable; hermetic adversarial stage checks remain required")
        with patch.dict(smoke.EXPORT_QA_SOURCE_DIGESTS, {
            "src/app/api/saas-admin/apex-leads/export/route.ts": "0" * 64
        }):
            self.assertFalse(smoke.safe_stage(smoke.EXPORT_QA_STAGE, smoke.EXPORT_QA_BUILD))

    def test_admin_private_stage_byte_pinned_qa_only(self):
        if not original_private_stage_available(smoke.ADMIN_QA_STAGE):
            self.skipTest("VPS-private stage unavailable; hermetic adversarial stage checks remain required")
        self.assertTrue(smoke.safe_stage(smoke.ADMIN_QA_STAGE, smoke.ADMIN_QA_BUILD))
        self.assertFalse(smoke.safe_stage(smoke.ADMIN_QA_STAGE, smoke.EXPORT_QA_BUILD))

    def test_admin_stage_manifest_tamper_rejected(self):
        from unittest.mock import patch
        if not original_private_stage_available(smoke.ADMIN_QA_STAGE):
            self.skipTest("VPS-private stage unavailable; hermetic adversarial stage checks remain required")
        with patch.object(smoke, "ADMIN_QA_MANIFEST_SHA", "0"*64):
            self.assertFalse(smoke.safe_stage(smoke.ADMIN_QA_STAGE, smoke.ADMIN_QA_BUILD))

    def test_mail_html_private_stage_rejects_wrong_build(self):
        self.assertFalse(smoke.safe_stage(smoke.MAIL_HTML_QA_STAGE,
                                          "WRONG_BUILD_NOT_REVIEWED"))

    def test_mail_html_build_cannot_authorize_other_workspace(self):
        self.assertFalse(smoke.safe_stage(
            Path("/root/workspace/apex-connect-mail-html-NOT-APPROVED"),
            smoke.MAIL_HTML_QA_BUILD))

    def test_legacy_proxy_private_stage_wrong_build_rejected(self):
        self.assertFalse(smoke.safe_stage(smoke.LEGACY_PROXY_QA_STAGE,
                                          smoke.MAIL_HTML_QA_BUILD))

    def test_legacy_proxy_private_stage_wrong_path_rejected(self):
        self.assertFalse(smoke.safe_stage(
            Path("/root/workspace/apex-connect-legacy-proxy-NOT-APPROVED"),
            smoke.LEGACY_PROXY_QA_BUILD))

    def test_stale_compiled_id_rejected(self):
        self.assertFalse(smoke.safe_stage(smoke.REVIEWED_BUILD_STAGE, "EvBJH9KRqqtM5ldAhJKtT"))

    def test_other_workspace_still_rejected(self):
        self.assertFalse(smoke.safe_stage(Path("/root/workspace/assps-connect-private-http-qa-20261016"), smoke.REVIEWED_BUILD_ID))

    def test_unapproved_stage_rejected(self):
        self.assertFalse(smoke.safe_stage(Path("/var/www/apex-connect"), "ONDwxEIZlx5onDIKY7wYf"))

    def test_missing_stage_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            self.assertFalse(smoke.safe_stage(Path(folder), "rc1vIlE6prAQ8pHrw7ohX"))


    def test_hermetic_compiled_exact_pin_and_tamper(self):
        with tempfile.TemporaryDirectory() as tmp:
            stage=Path(tmp)/'compiled'
            build,rev,sha=synthetic_stage(stage)
            with patch.multiple(smoke,REVIEWED_BUILD_STAGE=stage,
                                REVIEWED_BUILD_ID=build,REVIEWED_SOURCE=rev,
                                REVIEWED_LINT_SHA=sha):
                self.assertTrue(smoke.safe_stage(stage,build))
                self.assertFalse(smoke.safe_stage(stage,'UNREVIEWED_BUILD'))
                with patch.object(smoke,'REVIEWED_SOURCE','0'*40):
                    self.assertFalse(smoke.safe_stage(stage,build))
                (stage/'eslint.config.mjs').write_text('tampered')
                self.assertFalse(smoke.safe_stage(stage,build))

    def test_hermetic_export_exact_pins_and_drift(self):
        with tempfile.TemporaryDirectory() as tmp:
            stage=Path(tmp)/'export'
            files={'src/app/api/saas-admin/apex-leads/export/route.ts':b'allowed',
                   'src/app/api/saas-admin/subscription-requests/export/route.ts':b'allowed2',
                   'tests/admin-export-route-security.test.cjs':b'synthetic'}
            build,rev,sha=synthetic_stage(stage,files)
            pinned={k:hashlib.sha256(v).hexdigest() for k,v in files.items()}
            with patch.multiple(smoke,EXPORT_QA_STAGE=stage,EXPORT_QA_BUILD=build,
                                EXPORT_QA_SOURCE=rev,EXPORT_QA_LINT_SHA=sha,
                                EXPORT_QA_SOURCE_DIGESTS=pinned):
                self.assertTrue(smoke.safe_stage(stage,build))
                self.assertFalse(smoke.safe_stage(stage,'OTHER_BUILD'))
                with patch.dict(smoke.EXPORT_QA_SOURCE_DIGESTS,
                                {next(iter(files)):'0'*64}):
                    self.assertFalse(smoke.safe_stage(stage,build))
                (stage/next(iter(files))).write_bytes(b'tampered')
                self.assertFalse(smoke.safe_stage(stage,build))

    def test_hermetic_admin_manifest_and_content_tampering(self):
        with tempfile.TemporaryDirectory() as tmp:
            stage=Path(tmp)/'admin'
            files={f'src/protected-{i}.ts':f'original-{i}'.encode()
                   for i in range(10)}
            build,rev,sha=synthetic_stage(stage,files)
            manifest={'fixCommit':rev,'privateBuildId':build,
                      'releaseAuthorized':False,'productionModified':False,
                      'optimizedBuildExit':0,'sourceFileSha256':
                      {k:hashlib.sha256(v).hexdigest() for k,v in files.items()}}
            receipt=Path(tmp)/'qa-manifest.json'
            receipt.write_text(json.dumps(manifest,sort_keys=True))
            digest=hashlib.sha256(receipt.read_bytes()).hexdigest()
            with patch.multiple(smoke,ADMIN_QA_STAGE=stage,ADMIN_QA_BUILD=build,
                                ADMIN_QA_SOURCE=rev,ADMIN_QA_LINT_SHA=sha,
                                ADMIN_QA_MANIFEST=receipt,ADMIN_QA_MANIFEST_SHA=digest):
                self.assertTrue(smoke.safe_stage(stage,build))
                self.assertFalse(smoke.safe_stage(stage,'OTHER_BUILD'))
                (stage/next(iter(files))).write_bytes(b'tampered')
                self.assertFalse(smoke.safe_stage(stage,build))
                (stage/next(iter(files))).write_bytes(files[next(iter(files))])
                receipt.write_text(receipt.read_text()+' ')
                self.assertFalse(smoke.safe_stage(stage,build))


if __name__ == "__main__":
    unittest.main()
