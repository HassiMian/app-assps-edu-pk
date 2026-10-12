#!/usr/bin/env python3
"""Policy unit tests: no network, no production DB, no mutations."""
import importlib.util
from pathlib import Path
import unittest
p=Path(__file__).with_name('readiness-audit-20261012.py')
spec=importlib.util.spec_from_file_location('core_readiness',p)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

def fixtures():
 return {
  'disk_percent':75.0,'disk_free_gib':10.0,
  'git_equal':True,'git_clean':True,'app_root_exists':True,'meta_source_valid':True,'nginx_syntax':True,
  'connect_sha_ok':True,'public_app':200,'connect':200,'green':200,
  'listeners':{'5432':['127.0.0.1','::1'],'55432':['127.0.0.1','::1'],'5091':['127.0.0.1'],
               '3000':['127.0.0.1'],'5000':['127.0.0.1']},
  'host_firewall_active':True,'node_direct_ports_v4_restricted':True,'node_direct_ports_v6_restricted':True, 'policy_count':368,'eight_count':11,'pre_nine_count':0,
  'backup_ok':True,'upload_codes':{'payment':404,'private':404,'identity':404}
 }

def status(rows,key):
 return next(x['status'] for x in rows if x['name']==key)

class AuditTests(unittest.TestCase):
 def test_safe_baseline_all_pass(self):
  self.assertTrue(all(c['status']=='PASS' for c in m.evaluate(fixtures())))
 def test_disk_warning_and_critical(self):
  f=fixtures();f.update(disk_percent=93.0,disk_free_gib=3.5)
  self.assertEqual(status(m.evaluate(f),'filesystem_capacity'),'WARN')
  f['disk_free_gib']=1.1
  self.assertEqual(status(m.evaluate(f),'filesystem_capacity'),'HOLD')
 def test_low_absolute_headroom_warns_even_before_90_percent(self):
  f=fixtures();f.update(disk_percent=89.2,disk_free_gib=5.0)
  self.assertEqual(status(m.evaluate(f),'filesystem_capacity'),'WARN')
 def test_direct_ports_warn_when_no_local_firewall(self):
  f=fixtures();f['listeners']['5000']=['0.0.0.0'];f['host_firewall_active']=False;f['node_direct_ports_v4_restricted']=False;f['node_direct_ports_v6_restricted']=False
  self.assertEqual(status(m.evaluate(f),'legacy_direct_listener_exposure'),'HOLD')
 def test_legacy_ports_need_both_firewall_families_even_when_ufw_active(self):
  f=fixtures();f['listeners']['5000']=['0.0.0.0']
  f['listeners']['3000']=['::']
  f['node_direct_ports_v4_restricted']=True
  f['node_direct_ports_v6_restricted']=False
  f['host_firewall_active']=True
  self.assertEqual(status(m.evaluate(f),'legacy_direct_listener_exposure'),'HOLD')
  f['node_direct_ports_v6_restricted']=True
  self.assertEqual(status(m.evaluate(f),'legacy_direct_listener_exposure'),'PASS')
 def test_green_all_interfaces_fails_closed(self):
  f=fixtures();f['listeners']['5091']=['0.0.0.0']
  self.assertEqual(status(m.evaluate(f),'signed_green'),'HOLD')
 def test_green_missing_socket_fails_closed(self):
  f=fixtures();f['listeners']['5091']=[]
  self.assertEqual(status(m.evaluate(f),'signed_green'),'HOLD')
 def test_postgres_ipv6_external_fails_closed(self):
  f=fixtures();f['listeners']['5432']=['::']
  self.assertEqual(status(m.evaluate(f),'postgres_loopback'),'HOLD')
 def test_tenant_and_rls_drift_detected(self):
  f=fixtures();f['policy_count']=367;f['pre_nine_count']=1
  self.assertEqual(status(m.evaluate(f),'signed_policy_counts'),'HOLD')
  self.assertEqual(status(m.evaluate(f),'eight_roster_preserved'),'HOLD')
 def test_unverified_backup_or_leak_fail(self):
  f=fixtures();f['backup_ok']=False;f['upload_codes']['private']=200
  self.assertEqual(status(m.evaluate(f),'post_audit_backup_integrity'),'HOLD')
  self.assertEqual(status(m.evaluate(f),'private_upload_paths'),'HOLD')
 def test_release_source_or_connect_drift(self):
  f=fixtures();f['git_equal']=False;f['connect_sha_ok']=False
  self.assertEqual(status(m.evaluate(f),'canonical_release_source'),'HOLD')
  self.assertEqual(status(m.evaluate(f),'nginx_connect_preservation'),'HOLD')
 def test_shared_dirty_source_fails_even_when_git_sha_matches_remote(self):
  f=fixtures();f['git_clean']=False
  self.assertEqual(status(m.evaluate(f),'canonical_release_source'),'HOLD')
 def test_which_public_https_endpoint_failed_is_reported(self):
  f=fixtures();f['public_app']=200;f['connect']=None
  rows=m.evaluate(f)
  self.assertEqual(status(rows,'tls_app_and_connect'),'HOLD')
  detail=next(x['detail'] for x in rows if x['name']=='tls_app_and_connect')
  self.assertIn('app status=200',detail)
  self.assertIn('Connect /health status=None',detail)
 def test_socket_parsing_loopback_and_public(self):
  info=m.parse_ss('LISTEN 0 511 0.0.0.0:5000 0.0.0.0:*\nLISTEN 0 200 127.0.0.1:5432 0.0.0.0:*\nLISTEN 0 200 [::1]:5432 [::]:*')
  self.assertEqual(info['5000'],['0.0.0.0'])
  self.assertEqual(info['5432'],['127.0.0.1','::1'])
  self.assertTrue(m.public_bind(info['5000']))
  self.assertTrue(m.loopback_only(info['5432']))

if __name__=='__main__':unittest.main()
