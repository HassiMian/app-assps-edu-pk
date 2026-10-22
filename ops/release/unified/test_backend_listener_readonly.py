"""Synthetic read-only backend readiness guard tests."""
import subprocess
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from verify_backend_listener_readonly import inspect

class Connection:
    def close(self): pass

def reachable(addr, timeout):
    assert addr == ('127.0.0.1',5000)
    return Connection()

def down(addr, timeout):
    raise ConnectionRefusedError

def syntax_pass(args, **kwargs):
    assert args[0:2] == ['node','--check']
    return subprocess.CompletedProcess(args,0)

def syntax_fail(args, **kwargs):
    return subprocess.CompletedProcess(args,1)

class BackendReadOnlyTests(unittest.TestCase):
    def test_available_backend_and_valid_dependency(self):
        self.assertTrue(inspect(connector=reachable,checker=syntax_pass)['pass'])
    def test_pm2_online_without_listener_fails_closed(self):
        e=inspect(connector=down,checker=syntax_pass)
        self.assertFalse(e['pass'])
        self.assertFalse(e['backend_tcp_listener_5000'])
    def test_whatsapp_syntax_failure_blocks_release_even_with_open_port(self):
        e=inspect(connector=reachable,checker=syntax_fail)
        self.assertFalse(e['pass'])
        self.assertFalse(e['whatsapp_service_syntax_ok'])
