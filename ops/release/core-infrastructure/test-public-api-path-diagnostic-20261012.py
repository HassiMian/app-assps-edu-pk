#!/usr/bin/env python3
import importlib.util
from pathlib import Path
import unittest
p=Path(__file__).with_name('public-api-path-diagnostic-20261012.py')
spec=importlib.util.spec_from_file_location('public_api_path_diag',p)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

def sample(http=200, seconds=0.08, curl_exit=0):
    return {'http':http,'seconds':seconds,'curl_exit':curl_exit}

def healthy():
    return {'edge_ipv4':[sample()], 'edge_ipv6':[sample()],
            'local_tls':[sample()], 'local_upstream':[sample()]}

class ApiPathTests(unittest.TestCase):
    def test_all_fast_green(self):
        self.assertEqual(m.assess(healthy())['verdict'],'PASS')
    def test_external_timeout_with_local_health_still_hold(self):
        checks=healthy();checks['edge_ipv4']=[sample(0,6,28)]
        res=m.assess(checks)
        self.assertEqual(res['verdict'],'HOLD')
        self.assertEqual(res['path_differential'],'PUBLIC_PATH_SUSPECTED')
    def test_local_upstream_failed_not_misclassified_as_external_only(self):
        checks=healthy();checks['edge_ipv4']=[sample(0,6,28)];checks['local_upstream']=[sample(503)]
        self.assertEqual(m.assess(checks)['path_differential'],'NOT_PROVEN')
    def test_excessive_latency_blocks_even_with_http200(self):
        checks=healthy();checks['edge_ipv6']=[sample(200,3.5)]
        self.assertEqual(m.assess(checks)['verdict'],'HOLD')
    def test_missing_family_samples_denied(self):
        checks=healthy();checks['edge_ipv6']=[]
        self.assertEqual(m.assess(checks)['verdict'],'HOLD')


    def test_valid_curl_phase_fields_are_parsed(self):
        a=m.parse_curl_timings('200|5.665828|0.02|0.16|0.37|5.665754',0)
        self.assertEqual(a['http'],200)
        self.assertEqual(a['seconds'],5.666)
        self.assertEqual(a['tls_s'],0.37)
        self.assertEqual(a['ttfb_s'],5.666)
    def test_malformed_curl_timing_fields_fail_closed(self):
        a=m.parse_curl_timings('200|missing',28)
        self.assertEqual(a['http'],0)
        self.assertIsNone(a['seconds'])

if __name__=='__main__':unittest.main()
