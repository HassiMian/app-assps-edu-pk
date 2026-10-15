#!/usr/bin/env python3
"""No production calls. Synthetic fail-closed cross-owner release matrix tests."""
import hashlib
import importlib.util
from pathlib import Path
from types import SimpleNamespace
import tempfile
import unittest
from unittest.mock import patch

TARGET=Path(__file__).with_name("verify_joint_frontend_connect_core_20261015.py")
spec=importlib.util.spec_from_file_location("joint",TARGET)
joint=importlib.util.module_from_spec(spec);spec.loader.exec_module(joint)


class JointTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        r=Path(self.temp.name)
        self.paper=r/'paper'
        self.dist=self.paper/'dist'
        self.ops=r/'ops'
        self.next=r/'next'
        self.live=r/'live'
        for p in (self.dist,self.ops,self.next/'.next',self.live):p.mkdir(parents=True)
        (self.dist/'index.html').write_bytes(b'candidate-synthetic')
        (self.live/'index.html').write_bytes(b'live-synthetic')
        (self.next/'.next/BUILD_ID').write_text('NEXT-QA')
        self.args=SimpleNamespace(
            paper_repo=self.paper,paper_dist=self.dist,connect_ops=self.ops,
            next_stage=self.next,live_grade_root=self.live,core_verifier=r/'official.py',
            expected_live_html_sha=joint.sha(self.live/'index.html'))
        self.diary={'prePromotionDecision':'PASS_DIARY_ACTIVE_CONTROLLER_PRESERVATION_ONLY',
                    'verifiedControllerSignals':['test']*11,'activeDiaryModule':'assets/DailyDiaryWorkspace-SYNTHETIC.js'}
        self.planner={'result':'PASS','pass':True}
        self.companion={'result':'PASS','public_release_authorized':False}
        self.rollout={'decision':'READY_FOR_CORE_GATE','production_changed':False,
                      'new_html_sha':joint.sha(self.dist/'index.html')}
        self.core={'checks':{f'gate_{k}':True for k in range(20)},
                   'overall_production_release':'HOLD',
                   'core_official_gate':{'status':'HOLD','blocked':['independent_signatures'],'exit_code':2}}
        self.fail=set()

    def fake_json(self, command,**kwargs):
        s=' '.join(command)
        if 'verify-diary-controls' in s:
            if str(self.live) in s:
                return self.diary,0
            return self.diary,0
        if 'check-lesson-planner-ui' in s:return self.planner,0
        if 'check-preserved-companion' in s:return self.companion,0
        if 'guarded-lesson-planner' in s:return self.rollout,0
        if '--with-core-gate' in s:return self.core,2
        raise AssertionError('Unknown synthetic subprocess '+s)

    def fake_run(self, *args,**kwargs):
        return SimpleNamespace(returncode=0,stdout='PASS synthetic\n'*10,stderr='')

    def check(self):
        with patch.object(joint,'run_json',side_effect=self.fake_json):
            with patch.object(joint,'run_source_test',return_value=(True,13)):
                with patch.object(joint.subprocess,'run',side_effect=self.fake_run):
                    return joint.check(self.args)

    def test_integrated_candidate_pass_does_not_authorize_release(self):
        r=self.check()
        self.assertEqual(r['technical_candidate_status'],'PASS')
        self.assertFalse(r['production_release_authorized'])
        self.assertEqual(r['official_core_release_status'],'HOLD')

    def test_unhealthy_live_diary_is_reported_not_hidden(self):
        def f(command,**kwargs):
            s=' '.join(command)
            if 'verify-diary-controls' in s and str(self.live) in s:
                raise ValueError('ACTIVE_DIARY_REGRESSION')
            return self.fake_json(command,**kwargs)
        with patch.object(joint,'run_json',side_effect=f):
            with patch.object(joint,'run_source_test',return_value=(True,13)):
                with patch.object(joint.subprocess,'run',side_effect=self.fake_run):
                    r=joint.check(self.args)
        self.assertEqual(r['public_diary_active_graph_status'],'FAIL')
        self.assertEqual(r['technical_candidate_status'],'PASS')
        self.assertIn('public_diary_healthy',r['failure_reasons'])

    def test_diary_only_public_fix_is_not_full_recovery(self):
        def partial_public(command, **kwargs):
            string = ' '.join(command)
            if str(self.live) in string and 'check-lesson-planner-ui' in string:
                return {'result':'FAIL','pass':False}, 2
            if str(self.live) in string and 'check-preserved-companion' in string:
                return {'result':'HOLD','public_release_authorized':False}, 2
            return self.fake_json(command, **kwargs)
        with patch.object(joint, 'run_json', side_effect=partial_public):
            with patch.object(joint, 'run_source_test', return_value=(True,13)):
                with patch.object(joint.subprocess, 'run', side_effect=self.fake_run):
                    r=joint.check(self.args)
        self.assertTrue(r['checks']['public_diary_healthy'])
        self.assertFalse(r['checks']['public_lesson_planner_healthy'])
        self.assertFalse(r['checks']['public_early_years_companion_healthy'])
        self.assertFalse(r['public_frontend_fully_recovered'])
        self.assertEqual(r['technical_candidate_status'], 'PASS')
        self.assertFalse(r['production_release_authorized'])

    def test_wrong_active_nginx_root_fails_closed(self):
        config = Path(self.temp.name) / 'nginx-site.conf'
        config.write_text('server { root /var/www/stale-release; }\n'
                          'root /var/www/other-stale;\n')
        self.args.nginx_site_config = config
        r = self.check()
        self.assertFalse(r['checks']['real_nginx_root_matches_exact_live_target'])
        self.assertEqual(r['technical_candidate_status'], 'HOLD')

    def test_missing_nginx_site_file_fails_closed(self):
        self.args.nginx_site_config = Path(self.temp.name) / 'nonexistent.conf'
        r = self.check()
        self.assertEqual(r['technical_candidate_status'], 'HOLD')

    def test_live_root_hash_drift_blocks_technical(self):
        (self.live/'index.html').write_text('sneaky changed')
        self.assertEqual(self.check()['technical_candidate_status'],'HOLD')

    def test_missing_candidate_build_blocks(self):
        (self.next/'.next/BUILD_ID').unlink()
        self.assertEqual(self.check()['technical_candidate_status'],'HOLD')

    def test_recovered_diary_missing_controller_blocks(self):
        self.diary['verifiedControllerSignals'].pop()
        self.assertEqual(self.check()['technical_candidate_status'],'HOLD')

    def test_missing_lesson_planner_blocks(self):
        self.planner['pass']=False
        self.assertEqual(self.check()['technical_candidate_status'],'HOLD')

    def test_early_years_companion_blocks(self):
        self.companion['result']='FAIL'
        self.assertEqual(self.check()['technical_candidate_status'],'HOLD')

    def test_rollout_with_live_mutation_claim_blocks(self):
        self.rollout['production_changed']=True
        self.assertEqual(self.check()['technical_candidate_status'],'HOLD')

    def test_rollout_sha_mismatch_blocks(self):
        self.rollout['new_html_sha']='f'*64
        self.assertEqual(self.check()['technical_candidate_status'],'HOLD')

    def test_official_incomplete_checks_blocks(self):
        self.core['checks']['gate_0']=False
        self.assertEqual(self.check()['technical_candidate_status'],'HOLD')

    def test_official_wrong_verdict_blocks(self):
        self.core['overall_production_release']='GO'
        self.assertEqual(self.check()['technical_candidate_status'],'HOLD')

    def test_no_release_signer_even_with_fake_go(self):
        self.core['overall_production_release']='GO'
        self.core['core_official_gate']['status']='GO'
        r=self.check()
        self.assertFalse(r['production_release_authorized'])
        self.assertFalse(r['signed_human_release_certified'])
        self.assertFalse(r['staff_or_peer_credential_verified'])

    def test_source_stage_role_test_failure_blocks(self):
        with patch.object(joint,'run_json',side_effect=self.fake_json):
            with patch.object(joint,'run_source_test',return_value=(False,0)):
                with patch.object(joint.subprocess,'run',side_effect=self.fake_run):
                    self.assertEqual(joint.check(self.args)['technical_candidate_status'],'HOLD')

    def test_public_guard_adversarial_failure_blocks(self):
        with patch.object(joint,'run_json',side_effect=self.fake_json):
            with patch.object(joint,'run_source_test',return_value=(True,13)):
                with patch.object(joint.subprocess,'run',
                                  return_value=SimpleNamespace(returncode=1,stdout='',stderr='')):
                    self.assertEqual(joint.check(self.args)['technical_candidate_status'],'HOLD')

    def test_credentials_never_in_report(self):
        result=self.check()
        self.assertNotIn('PGPASSWORD',str(result))
        self.assertFalse(result['production_modified'])

if __name__=='__main__':
    unittest.main()
