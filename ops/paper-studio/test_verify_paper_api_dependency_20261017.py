import importlib.util
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SCRIPT=Path(__file__).with_name('verify_paper_api_dependency_20261017.py')
spec=importlib.util.spec_from_file_location('paper_api_readiness',SCRIPT)
audit=importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


def pm2(restarts=1,dist='.next',status='online',port='3002',cwd='/var/www/apex-connect'):
    return json.dumps([{'name':audit.PROCESS,'pm2_env':{'NEXT_DIST_DIR':dist,'APP_PORT':port,'pm_cwd':cwd,'status':status,'restart_time':restarts}}])

def ok_statuses():
    return {k:[c]*5 for k,_,c in audit.PROBES}


class FailClosedApiDependencyTest(unittest.TestCase):
    def setUp(self):
        self.a=audit.parse_pm2(pm2())

    def test_only_one_expected_green_process_accepted(self):
        self.assertEqual(self.a['dist_dir'],'.next')
        for value in ('[]','{}','not-json',json.dumps([{'name':'wrong'}]),json.dumps([{'name':'apex-connect-green'}]*2)):
            with self.subTest(value=value),self.assertRaises((ValueError,json.JSONDecodeError)):
                audit.parse_pm2(value)

    def test_pm2_rejects_unreviewed_dist_dir(self):
        for directory in ('../.next','/etc','../.env','',None):
            with self.subTest(d=directory),self.assertRaises(ValueError):audit.parse_pm2(pm2(dist=directory))

    def test_pm2_rejects_wrong_port_and_workdir(self):
        for kwargs in ({'port':'3000'},{'cwd':'/tmp/forged'},{'status':'unknown'}):
            with self.subTest(kwargs=kwargs),self.assertRaises(ValueError):audit.parse_pm2(pm2(**kwargs))

    def test_restart_counter_bool_rejected(self):
        source=json.loads(pm2())
        source[0]['pm2_env']['restart_time']=True
        with self.assertRaises(ValueError):audit.parse_pm2(json.dumps(source))

    def test_missing_candidate_build_id_is_fail_closed(self):
        with tempfile.TemporaryDirectory() as tmp:
            base=Path(tmp)
            (base/'.next-candidate').mkdir()
            self.assertFalse(audit.validate_artifact({'dist_dir':'.next-candidate'},base))

    def test_file_symlink_cannot_fake_build(self):
        with tempfile.TemporaryDirectory() as tmp:
            base=Path(tmp)
            (base/'.next').mkdir()
            (base/'.next'/'required-server-files.json').write_text('{"source":"synthetic"}')
            (base/'elsewhere').write_text('a-safe-build-id-synthetic')
            (base/'.next'/'BUILD_ID').symlink_to(base/'elsewhere')
            self.assertFalse(audit.validate_artifact({'dist_dir':'.next'},base))

    def test_fully_reviewed_artifact_is_synthetically_accepted(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory=Path(tmp)/'.next';directory.mkdir()
            (directory/'BUILD_ID').write_text('synthetic-build-id-012345')
            (directory/'required-server-files.json').write_text('{"source":"synthetic"}')
            self.assertTrue(audit.validate_artifact({'dist_dir':'.next'},Path(tmp)))

    def test_expected_200_and_anonymous_401_not_release_certification(self):
        r=audit.interpret(self.a,self.a,ok_statuses(),True,True)
        self.assertFalse(r['release_authorized'])
        self.assertFalse(r['authenticated_teacher_acceptance_verified'])
        self.assertEqual(r['status'],'TECHNICALLY_HEALTHY_NOT_CORE_SIGNED')

    def test_single_transient_502_causes_hold(self):
        x=ok_statuses();x['public_login'][2]='502'
        self.assertIn('UNSTABLE_OR_UNEXPECTED_PUBLIC_LOGIN',audit.interpret(self.a,self.a,x,True,True)['blockers'])

    def test_unprotected_anonymous_identity_is_denied(self):
        x=ok_statuses();x['public_anonymous_identity_denial'][0]='200'
        self.assertIn('UNSTABLE_OR_UNEXPECTED_PUBLIC_ANONYMOUS_IDENTITY_DENIAL',audit.interpret(self.a,self.a,x,True,True)['blockers'])

    def test_missing_artifact_causes_hold_even_if_http_200(self):
        self.assertIn('REVIEWED_NEXT_ARTIFACT_MISSING',audit.interpret(self.a,self.a,ok_statuses(),True,False)['blockers'])

    def test_nginx_failed_is_hold(self):
        self.assertIn('NGINX_SYNTAX_FAILED',audit.interpret(self.a,self.a,ok_statuses(),False,True)['blockers'])

    def test_high_historical_restart_count_is_hold(self):
        a=audit.parse_pm2(pm2(restarts=30947))
        r=audit.interpret(a,a,ok_statuses(),True,True)
        self.assertIn('HISTORIC_HIGH_RESTART_COUNT_REQUIRES_CORE_REVIEW',r['blockers'])
        self.assertFalse(r['release_authorized'])

    def test_restart_during_window_is_hold(self):
        b=audit.parse_pm2(pm2(restarts=2))
        self.assertIn('NEXT_RESTART_DURING_PROBE_OR_COUNTER_RESET',audit.interpret(self.a,b,ok_statuses(),True,True)['blockers'])

    def test_incomplete_probes_raise_error(self):
        with self.assertRaises(ValueError):audit.interpret(self.a,self.a,{'public_health':['200']},True,True)

    def test_no_secret_pm2_env_serialized(self):
        x=json.loads(pm2());x[0]['pm2_env']['SECRET']='should-never-be-in-report'
        r=audit.parse_pm2(json.dumps(x));self.assertNotIn('SECRET',r)
        self.assertNotIn('should-never-be-in-report',str(r))

    def test_private_receipt_0600_and_no_overwrite(self):
        with tempfile.TemporaryDirectory() as tmp:
            base=Path(tmp);os.chmod(base,0o700)
            with patch.object(audit,'EVIDENCE_DIR',base):
                p=base/'private-readonly.json'
                audit.write_private({'release_authorized':False},str(p))
                self.assertEqual(p.stat().st_mode&0o777,0o600)
                with self.assertRaises(FileExistsError):audit.write_private({},str(p))

    def test_receipts_outside_private_dir_refused(self):
        with self.assertRaises(ValueError):audit.write_private({},'/tmp/public.json')

    def test_main_requires_explicit_opt_in(self):
        # No subprocess here: CLI --live-readonly is required and the live test is off-host CI forbidden.
        self.assertIn("required=True",SCRIPT.read_text())
        self.assertNotIn('pm2 restart',SCRIPT.read_text())
        self.assertNotIn('nginx -s reload',SCRIPT.read_text())

if __name__=='__main__':unittest.main()
