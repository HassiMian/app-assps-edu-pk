"""No user messages, phone numbers, DB writes or network in these tests."""
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import verify_school_whatsapp_log_privacy_readonly as check

class SchoolWhatsAppPrivacyTests(unittest.TestCase):
 def test_raw_phone_and_message_body_logs_are_detected(self):
  js="console.log(`[WhatsApp Inbound] ${msgId} from +${from}: ${text.slice(0,80)}`)"
  self.assertTrue(check.inspect_source(js)['sensitive_logging_detected'])
 def test_raw_provider_message_identifiers_and_errors_are_detected(self):
  js="console.error(JSON.stringify(data.error)); console.log(`sent ${cleanTo}`)\nconsole.error(err.message)"
  self.assertEqual(check.inspect_source(js)['direct_sensitive_log_lines'],2)
 def test_generic_non_identifying_logs_are_allowed(self):
  js="console.log('[School inbound event accepted')\nconsole.error('storage unavailable')"
  self.assertFalse(check.inspect_source(js)['sensitive_logging_detected'])
 def test_separate_live_and_candidate_evidence(self):
  with tempfile.TemporaryDirectory() as d:
   a=Path(d)/'live.js';b=Path(d)/'candidate.js'
   a.write_text('console.log(`from +${from}`)')
   b.write_text("console.log('received event')")
   result=check.inspect(a,b)
   self.assertTrue(result['pass'])
   self.assertTrue(result['live_sensitive_log_hold'])
   self.assertTrue(result['candidate_log_scope_pass'])
   self.assertIn('SOURCE_LINE_RISK_SCAN_ONLY',result['interpretation'])
 def test_unavailable_source_fails_closed(self):
  with tempfile.TemporaryDirectory() as d:
   with self.assertRaises(RuntimeError):check.inspect(Path(d)/'missing',Path(d)/'absent')
 def test_symlink_is_untrusted_source(self):
  with tempfile.TemporaryDirectory() as d:
   real=Path(d)/'real';real.write_text('clean')
   link=Path(d)/'link';link.symlink_to(real)
   with self.assertRaises(RuntimeError):check.inspect(link,real)

if __name__=='__main__':unittest.main()
