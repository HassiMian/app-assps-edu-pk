"""Pure adversarial catalog tests; no database or network access."""
import importlib.util
from pathlib import Path
import unittest

P=Path(__file__).with_name('audit-current-signed-catalog-20261014.py')
S=importlib.util.spec_from_file_location('catalog_qa',P)
M=importlib.util.module_from_spec(S)
S.loader.exec_module(M)

def fixture():
    roles=[{'name':n,'can_login':n in ('apexos_user','assps_marks_signed_login'),
            'bypass':False,'super':False} for n in M.EXPECTED_ROLES]
    names=['schools','invoices','payments','subscription_requests','tenant_branding']
    names += ['table_'+str(i) for i in range(72)]
    guards=[];allows=[]
    for name in names:
        pred=M.expected_predicate(name)
        guards.append({'table':name,'permissive':'RESTRICTIVE',
                       'roles':list(M.SIGNED_ROLES),'qual':pred,'with_check':pred,
                       'rls':True,'force':True})
        allows.append({'table':name,'roles':['assps_marks_signed_runtime'],
                       'qual':pred,'with_check':pred})
    return {'database':'apexos','port':'5432','roles':roles,'guards':guards,
            'allows':allows,'unforced_granted':[],'policy_total':375}

class SignedCatalogFailClosed(unittest.TestCase):
    def test_real_signed_variants_allowed_only_when_exact(self):
        a=M.evaluate(fixture())
        self.assertEqual(a['issues'],[])
        self.assertEqual(a['catalog_preflight'],
                         'PASS_WITH_INDEPENDENT_LIVE_ACCEPTANCE_REQUIRED')
        self.assertFalse(a['production_release_certified'])
    def test_missing_guard_fails(self):
        f=fixture();f['guards'].pop()
        self.assertIn('INSUFFICIENT_SIGNED_GUARD_COVERAGE',M.evaluate(f)['issues'])
    def test_wrong_school_key_denied(self):
        f=fixture();f['guards'][0]['qual']=M.GUARD_EXPR
        self.assertIn('GUARD_MISSING_SIGNED_PREDICATE:schools',M.evaluate(f)['issues'])
    def test_missing_core_role_denied(self):
        f=fixture();f['guards'][0]['roles']=['assps_marks_signed_runtime']
        self.assertIn('GUARD_ROLE_INCOMPLETE:schools',M.evaluate(f)['issues'])
    def test_bypass_role_denied(self):
        f=fixture();f['roles'][0]['bypass']=True
        self.assertIn('MISSING_OR_PRIVILEGED_ROLE:apex_app_runtime',M.evaluate(f)['issues'])
    def test_missing_allow_denied(self):
        f=fixture();f['allows'].pop()
        self.assertIn('SIGNED_ALLOW_MISSING:table_71',M.evaluate(f)['issues'])
    def test_unforced_table_without_rls_denied(self):
        f=fixture();f['unforced_granted']=[
            {'table':'ai_jobs','owner':'apexos_user','rls':False,'force':False,'policies':[]}]
        self.assertIn('UNFORCED_ACCESS_HIGH_RISK:ai_jobs',M.evaluate(f)['issues'])
    def test_unforced_table_without_signed_policy_denied(self):
        f=fixture();f['unforced_granted']=[
            {'table':'school_academic_approval_events','owner':'postgres','rls':True,
             'force':False,'policies':[{'qual':'true','with_check':'true'}]}]
        self.assertIn('UNFORCED_SIGNED_POLICY_MISSING:school_academic_approval_events',
                      M.evaluate(f)['issues'])
    def test_unforced_reviewer_policy_requires_real_acceptance(self):
        f=fixture();f['unforced_granted']=[
            {'table':'school_academic_approval_events','owner':'postgres','rls':True,
             'force':False,'any_write':False,'policies':[{'qual':M.GUARD_EXPR,'with_check':None}]}]
        result=M.evaluate(f)
        self.assertEqual(result['issues'],[])
        self.assertFalse(result['production_release_certified'])
        self.assertEqual(result['unforced_granted_tables_review'],
                         ['school_academic_approval_events'])
    def test_unforced_write_requires_reviewer_clause(self):
        f=fixture();f['unforced_granted']=[
            {'table':'school_academic_approval_events','owner':'postgres','rls':True,
             'force':False,'any_write':True,
             'policies':[{'qual':M.GUARD_EXPR,'with_check':M.GUARD_EXPR}]}]
        self.assertIn('UNFORCED_SIGNED_POLICY_MISSING:school_academic_approval_events',
                      M.evaluate(f)['issues'])
    def test_unforced_signed_reviewer_write_still_not_production_certification(self):
        f=fixture();f['unforced_granted']=[
            {'table':'school_academic_approval_events','owner':'postgres','rls':True,
             'force':False,'any_write':True,
             'policies':[{'qual':M.GUARD_EXPR,'with_check':
                '('+M.GUARD_EXPR+' AND assps_academic_reviewer_authorized(school_id, actor_user_id))'}]}]
        result=M.evaluate(f)
        self.assertEqual(result['issues'],[])
        self.assertFalse(result['production_release_certified'])
    def test_unexpected_db_denied(self):
        f=fixture();f['port']='55432'
        self.assertIn('UNEXPECTED_DATABASE_OR_PORT',M.evaluate(f)['issues'])

if __name__=='__main__':
    unittest.main()
