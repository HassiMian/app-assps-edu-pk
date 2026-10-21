"""Pure source-order tests, no tenant data, network or provider."""
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import verify_school_whatsapp_phone_scope_readonly as mod

VALID="""validateSignature(rawBody, signature, appSecret)
inspectSchoolWebhookChanges(payload, PHONE_ID)
if (!schoolScope.ok) { return res.status(403) }
for (const changes of schoolScope.values) {
 recordIdempotentEvent(msgId,'message')
}
"""
HELPER="""reason:'SCHOOL_PHONE_SCOPE_MISMATCH'
value.metadata?.phone_number_id
values:[]
SCHOOL_PHONE_SCOPE_NOT_CONFIGURED
(Array.isArray(value.statuses)
"""

class PhoneScopeAudit(unittest.TestCase):
 def test_full_preflight_before_persist_is_candidate_static_pass(self):
  self.assertTrue(mod.analyze(VALID,HELPER))
 def test_missing_or_late_tenant_gate_rejected(self):
  for value in (VALID.replace('inspectSchoolWebhookChanges(payload, PHONE_ID)',''),
     VALID.replace('if (!schoolScope.ok)','if (schoolScope.ok)'),
     VALID.replace('if (!schoolScope.ok) { return res.status(403) }',
       'recordIdempotentEvent(msgId,foo)\nif (!schoolScope.ok) { return res.status(403) }'),
     VALID.replace('for (const changes of schoolScope.values)','for (const changes of entry.changes)')):
   self.assertFalse(mod.analyze(value,HELPER))
 def test_single_event_phone_and_status_check_must_not_be_removed(self):
  for marker in ('value.metadata?.phone_number_id','(Array.isArray(value.statuses)',
                 'SCHOOL_PHONE_SCOPE_NOT_CONFIGURED','SCHOOL_PHONE_SCOPE_MISMATCH'):
   self.assertFalse(mod.analyze(VALID,HELPER.replace(marker,'')))
 def test_missing_sources_fail_closed(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d)
   with self.assertRaises(RuntimeError):mod.inspect(root/'notfound',root/'nope',root/'missing')
 def test_live_and_candidate_are_separate_in_report(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d)
   for name,contents in [('live','recordIdempotentEvent(msgId,)'),('candidate',VALID),('helper',HELPER)]:
    (root/name).write_text(contents)
   result=mod.inspect(root/'live',root/'candidate',root/'helper')
   self.assertTrue(result['live_school_phone_scope_hold'])
   self.assertTrue(result['candidate_school_phone_scope_static_pass'])
   self.assertFalse(result['whole_system_tenant_isolation_certified'])

if __name__=='__main__': unittest.main()
