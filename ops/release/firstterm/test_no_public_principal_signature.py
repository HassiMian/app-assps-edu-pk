#!/usr/bin/env python3
"""Offline synthetic privacy denial checks, no live website access."""
import importlib.util
from pathlib import Path
import unittest
import urllib.error
from unittest.mock import patch
from email.message import Message

file=Path(__file__).with_name("verify_no_public_principal_signature.py")
spec=importlib.util.spec_from_file_location("privacy_guard",file)
guard=importlib.util.module_from_spec(spec)
spec.loader.exec_module(guard)

def error(code,cache):
    h=Message()
    if cache is not None:
        h["Cache-Control"]=cache
    return urllib.error.HTTPError("https://example.test/asset",code,"Synthetic",h,None)

class PrivacyProbeTests(unittest.TestCase):
    def test_denied_and_noncacheable_pass(self):
        with patch.object(guard.urllib.request,"urlopen",side_effect=error(403,"no-store")):
            self.assertEqual(guard.check()["status"],"PASS")
    def test_forbidden_without_no_store_hold(self):
        with patch.object(guard.urllib.request,"urlopen",side_effect=error(403,None)):
            self.assertEqual(guard.check()["status"],"HOLD")
    def test_public_success_is_security_hold(self):
        with patch.object(guard.urllib.request,"urlopen",side_effect=error(200,"public,max-age=3600")):
            self.assertEqual(guard.check()["status"],"HOLD")
    def test_network_failure_is_hold(self):
        with patch.object(guard.urllib.request,"urlopen",side_effect=OSError("simulated connection")):
            self.assertEqual(guard.check()["status"],"HOLD")
if __name__=="__main__":
    unittest.main()
