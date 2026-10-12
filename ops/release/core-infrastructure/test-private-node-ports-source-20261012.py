#!/usr/bin/env python3
"""Static, mutation-free contract checks for a separately authorized host firewall change."""
import subprocess
import unittest
from pathlib import Path
HERE=Path(__file__).resolve().parent
SCRIPT=HERE/'assps-private-node-ports-20261012.sh'
UNIT=HERE/'assps-private-node-ports.service'
class Tests(unittest.TestCase):
 def test_shell_is_valid(self):
  self.assertEqual(subprocess.run(['bash','-n',str(SCRIPT)],capture_output=True).returncode,0)
 def test_exact_external_interface_and_two_app_ports_only(self):
  src=SCRIPT.read_text()
  self.assertIn('IFACE="eth0"',src)
  self.assertIn('--dports 3000,5000 -j REJECT --reject-with tcp-reset',src)
  self.assertIn('RULE=(-i "$IFACE"',src)
 def test_never_drops_ssh_https_or_localhost(self):
  src=SCRIPT.read_text()
  for bad in ('-P INPUT DROP','-F INPUT','--dports 22,','--dports 80,','--dports 443,','-i lo -j REJECT'):
   self.assertNotIn(bad,src)
 def test_both_ipv4_ipv6_verify_and_rollback(self):
  src=SCRIPT.read_text()
  self.assertIn('for family in iptables ip6tables; do',src)
  self.assertIn('"$family" -w -C INPUT "${RULE[@]}"',src)
  self.assertIn('"$family" -w -D INPUT "${RULE[@]}"',src)
  self.assertIn('--rollback)',src)
  self.assertIn('--verify)',src)
 def test_plan_does_not_mutate(self):
  src=SCRIPT.read_text()
  plan=src.split('\n --plan)')[1].split(';;')[0]
  self.assertIn('NO_FIREWALL_MUTATION',plan)
  self.assertNotIn('-I INPUT',plan)
 def test_boot_unit_persists_rule_and_recovers_on_stop(self):
  unit=UNIT.read_text()
  self.assertIn('RemainAfterExit=yes',unit)
  self.assertIn('ExecStart=/usr/local/sbin/assps-private-node-ports --apply',unit)
  self.assertIn('ExecStop=/usr/local/sbin/assps-private-node-ports --rollback',unit)
  self.assertIn('Before=network.target',unit)
 def test_does_not_install_or_enable_itself(self):
  source=SCRIPT.read_text()+UNIT.read_text()
  for forbidden in ('systemctl enable','systemctl restart','npm install','apt install','DROP TABLE'):
   self.assertNotIn(forbidden,source)
if __name__=='__main__':unittest.main()
